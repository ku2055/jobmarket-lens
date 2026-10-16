#!/usr/bin/env bash
# Fresh local collection. Never pulls, pushes, publishes, or accesses a private repo.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ ! -x .venv/bin/python ]; then
  python3 -m venv --system-site-packages --without-pip .venv
fi
.venv/bin/python -c "import requests, bs4" 2>/dev/null || .venv/bin/python -m pip install -q -r requirements.txt
if [ -f data/lens.db ]; then
  mkdir -p data/backups
  .venv/bin/python - <<'PY'
import sqlite3
from datetime import datetime, timezone
stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
with sqlite3.connect('data/lens.db') as source, sqlite3.connect(f'data/backups/lens-{stamp}.db') as target:
    source.backup(target)
PY
fi
# A bounded pilot by default. Explicit --max 0 requests uncapped collection.
if [ "$#" -eq 0 ]; then
  set -- --only NVDA,V,AMZN --max 10 --workers 3
fi
.venv/bin/python -m collector.run "$@"
.venv/bin/python scripts/build_dataset.py
printf '\nLocal dashboard: %s/web/index.html\n' "$PWD"
