"""Regression tests for collection evidence and misleading derived values."""
import json
import tempfile
import unittest
from pathlib import Path

from collector import store
from collector.quality import collection_completeness
from normalize.parse import parse_pay
from scripts.build_dataset import normalize


class HistoryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.addCleanup(self.tmp.cleanup)

    def run_snapshot(self, day, records, completeness="complete", status="ok"):
        directory = self.root / 'data/raw' / day
        directory.mkdir(parents=True, exist_ok=True)
        (directory / 'run_log.json').write_text(json.dumps({'TEST': {
            'status': status, 'completeness': completeness, 'collected': len(records)}}))
        (directory / 'TEST.jsonl').write_text(''.join(json.dumps({
            'company': 'TEST', 'source_id': '1', 'title': title, 'collected_at': day}) + '\n'
            for title in records))
        store.ingest_run(self.root, day)

    def status(self):
        return store.load_postings(self.root)[0][0]['posting_status']

    def test_partial_and_failed_runs_never_close_records(self):
        self.run_snapshot('2026-10-01', ['Engineer'])
        self.run_snapshot('2026-10-02', [], 'partial')
        self.run_snapshot('2026-10-03', [], 'unknown', 'blocked')
        self.assertEqual(self.status(), 'Unverified')
        self.run_snapshot('2026-10-04', [], status='empty')
        self.assertEqual(self.status(), 'Possibly closed')
        self.run_snapshot('2026-10-05', [], status='empty')
        self.assertEqual(self.status(), 'Closed')
        self.run_snapshot('2026-10-06', ['Engineer'], 'partial')
        self.assertEqual(self.status(), 'Open')

    def test_same_day_rerun_does_not_claim_old_record_was_observed_again(self):
        self.run_snapshot('2026-10-01', ['Engineer'])
        self.run_snapshot('2026-10-01', [], 'partial')
        self.assertEqual(self.status(), 'Unverified')

    def test_versions_keep_changes_but_ignore_collection_timestamp(self):
        self.run_snapshot('2026-10-01', ['Engineer'])
        self.run_snapshot('2026-10-02', ['Engineer'])
        self.run_snapshot('2026-10-03', ['Senior Engineer'])
        db = store.connect(self.root)
        self.addCleanup(db.close)
        self.assertEqual(db.execute('SELECT COUNT(*) FROM posting_versions').fetchone()[0], 2)
        self.assertEqual(db.execute('SELECT COUNT(*) FROM observations').fetchone()[0], 3)
        self.assertEqual(store.load_postings(self.root)[0][0]['first_seen'], '2026-10-01')

    def test_migrates_old_database_without_assuming_completeness(self):
        db = store.connect(self.root)
        db.execute('ALTER TABLE snapshots DROP COLUMN metadata')
        db.execute("INSERT INTO snapshots VALUES ('2026-10-01','TEST','ok',1,1,NULL)")
        db.commit()
        db.close()
        self.assertNotIn('completeness', store.load_postings(self.root)[1][0])


class QualityTests(unittest.TestCase):
    def test_completeness_requires_matching_unique_inventory_and_exhaustion(self):
        self.assertEqual(collection_completeness(800, 800, {'site_total': 1500}), 'partial')
        self.assertEqual(collection_completeness(800, 1000, {'site_total': 235}), 'partial')
        self.assertEqual(collection_completeness(10, 20, {}), 'unknown')
        self.assertEqual(collection_completeness(10, 20, {'site_total': 10}), 'unknown')
        self.assertEqual(collection_completeness(10, 20, {'site_total': 10, 'exhausted': True}), 'complete')
        self.assertEqual(collection_completeness(0, 20, {'site_total': 0, 'exhausted': True}), 'complete')
        self.assertEqual(collection_completeness(10, 20, {'site_total': 10, 'exhausted': True, 'duplicates': 1}), 'partial')

    def test_salary_does_not_consume_k_from_following_word(self):
        pay = parse_pay('$157,000 - $240,000 knowledge of systems', '')
        self.assertEqual(pay['max'], 240000)
        self.assertIn('inferred_pay_period', pay['flags'])

    def test_suspicious_upper_bound_is_retained_and_flagged(self):
        pay = parse_pay('$157,000 - $240,000,000 per year', '')
        self.assertIn('suspicious_range', pay['flags'])
        self.assertEqual(pay['max'], 240000000)

    def test_explicit_hourly_range_and_thousands_suffix(self):
        pay = parse_pay('$20 - $30 per hour', '')
        self.assertEqual(pay['annual_max'], 62400)
        self.assertEqual(pay['flags'], [])
        self.assertEqual(parse_pay('$100k - $150k per year', '')['max'], 150000)

    def test_workday_stops_at_total_before_repeated_page(self):
        from collector.adapters.workday import collect
        class Response:
            def __init__(self, data): self.data = data
            def json(self): return self.data
        class Http:
            calls = 0
            def post(self, url, **kwargs):
                self.calls += 1
                if self.calls > 1:
                    raise AssertionError("Requested beyond the complete inventory")
                return Response({"total": 2, "jobPostings": [
                    {"externalPath": "/job/1", "title": "Engineer", "bulletFields": ["1"]},
                    {"externalPath": "/job/2", "title": "Analyst", "bulletFields": ["2"]}]})
            def get(self, url): return Response({"jobPostingInfo": {}})
        stats = {}
        records = list(collect('TEST', {'host':'example.org', 'tenant':'test', 'site':'jobs'}, Http(), 100, stats))
        self.assertEqual(len(records), 2)
        self.assertEqual(collection_completeness(len(records), 100, stats), 'complete')

    def test_dates_are_not_fabricated_or_clamped(self):
        record = {'company': 'TEST', 'source_id': '1', 'title': 'Engineer',
                  'first_seen': '2026-10-01', 'posted_date': '2026-11-01'}
        row = normalize(record)
        self.assertEqual(row['posted'], '2026-11-01')
        self.assertTrue(row['future_date'])
        record['posted_date'] = None
        self.assertIsNone(normalize(record)['posted'])
        record['posted_date'] = 'invalid'
        self.assertIsNone(normalize(record)['posted'])


if __name__ == '__main__':
    unittest.main()
