"""Local evidence history; only verified complete inventories imply absence."""
import hashlib
import json
import sqlite3
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS postings (
 company TEXT, source_id TEXT, first_seen TEXT, last_seen TEXT, raw TEXT,
 PRIMARY KEY (company, source_id));
CREATE TABLE IF NOT EXISTS snapshots (
 run_date TEXT, company TEXT, status TEXT, collected INTEGER, site_total INTEGER, detail TEXT,
 PRIMARY KEY (run_date, company));
CREATE TABLE IF NOT EXISTS posting_versions (
 company TEXT, source_id TEXT, content_hash TEXT, first_seen TEXT, last_seen TEXT, raw TEXT,
 PRIMARY KEY (company, source_id, content_hash));
CREATE TABLE IF NOT EXISTS observations (
 run_date TEXT, company TEXT, source_id TEXT,
 PRIMARY KEY (run_date, company, source_id));
"""


def connect(root):
    path = Path(root) / "data/lens.db"
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path)
    db.executescript(SCHEMA)
    if "metadata" not in {r[1] for r in db.execute("PRAGMA table_info(snapshots)")}:
        db.execute("ALTER TABLE snapshots ADD COLUMN metadata TEXT")
    return db


def ingest_run(root, run_date):
    run_dir = Path(root) / "data/raw" / run_date
    log = json.loads((run_dir / "run_log.json").read_text())
    db = connect(root)
    with db:
        for company, entry in log.items():
            db.execute("INSERT OR REPLACE INTO snapshots VALUES (?,?,?,?,?,?,?)",
                       (run_date, company, entry.get("status"), entry.get("collected", 0),
                        entry.get("site_total"), entry.get("detail"), json.dumps(entry)))
            f = run_dir / f"{company}.jsonl"
            if not f.exists():
                continue
            db.execute("DELETE FROM observations WHERE run_date=? AND company=?", (run_date, company))
            for line in f.read_text().splitlines():
                record = json.loads(line)
                sid = record["source_id"]
                raw = json.dumps(record, sort_keys=True, ensure_ascii=False)
                content = {k: v for k, v in record.items() if k != "collected_at"}
                digest = hashlib.sha256(json.dumps(content, sort_keys=True).encode()).hexdigest()
                db.execute("""INSERT INTO postings VALUES (?,?,?,?,?)
                    ON CONFLICT(company, source_id) DO UPDATE SET
                    first_seen=MIN(first_seen, excluded.first_seen),
                    last_seen=MAX(last_seen, excluded.last_seen),
                    raw=CASE WHEN excluded.last_seen >= last_seen THEN excluded.raw ELSE raw END""",
                           (company, sid, run_date, run_date, raw))
                db.execute("""INSERT INTO posting_versions VALUES (?,?,?,?,?,?)
                    ON CONFLICT(company, source_id, content_hash) DO UPDATE SET
                    first_seen=MIN(first_seen, excluded.first_seen), last_seen=MAX(last_seen, excluded.last_seen)""",
                           (company, sid, digest, run_date, run_date, raw))
                db.execute("INSERT OR IGNORE INTO observations VALUES (?,?,?)", (run_date, company, sid))
    db.close()


def load_postings(root):
    db = connect(root)
    snaps = []
    for row in db.execute("SELECT * FROM snapshots ORDER BY run_date"):
        run_date, company, status, collected, site_total, detail, metadata = row
        s = json.loads(metadata or "{}")
        s.update(run_date=run_date, company=company, status=status, collected=collected,
                 site_total=site_total, detail=detail)
        snaps.append(s)
    by_company = {}
    for s in snaps:
        by_company.setdefault(s["company"], []).append(s)
    latest_observed = set(db.execute("""SELECT o.company, o.source_id FROM observations o
        JOIN (SELECT company, MAX(run_date) AS run_date FROM snapshots GROUP BY company) s
        ON o.company=s.company AND o.run_date=s.run_date"""))
    rows = []
    for company, sid, first, last, raw in db.execute("SELECT * FROM postings"):
        history = by_company.get(company, [])
        missing = [s for s in history if s["run_date"] > last and
                   s.get("completeness") == "complete" and s["status"] in ("ok", "empty")]
        if len(missing) >= 2:
            status = "Closed"
        elif missing:
            status = "Possibly closed"
        elif (company, sid) in latest_observed:
            status = "Open"
        else:
            status = "Unverified"
        r = json.loads(raw)
        r.update(first_seen=first, last_seen=last, is_open=status == "Open", posting_status=status)
        rows.append(r)
    db.close()
    return rows, snaps
