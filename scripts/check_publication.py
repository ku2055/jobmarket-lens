"""Validate the actual embedded payload and reject private-data paths in Git."""
import base64
import gzip
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.public_data import PUBLIC_POSTING_FIELDS, PUBLIC_SNAPSHOT_FIELDS


def check(root=ROOT):
    html = (root / 'web/index.html').read_text()
    match = re.search(r'const EMBEDDED = ("[^"\n]+")', html)
    if not match:
        raise ValueError('No embedded dataset found')
    data = json.loads(gzip.decompress(base64.b64decode(json.loads(match.group(1)))))
    allowed = set(PUBLIC_POSTING_FIELDS) | {'skills', 'lic'}
    unexpected = set(data['fields']) - allowed
    if unexpected:
        raise ValueError(f'Private or unknown posting fields: {sorted(unexpected)}')
    for snapshot in data['snapshots']:
        if set(snapshot) - set(PUBLIC_SNAPSHOT_FIELDS):
            raise ValueError('Private or unknown snapshot fields')
    for row in data['rows']:
        if len(row) != len(data['fields']):
            raise ValueError('Posting row does not match its field schema')
    files = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
    private_prefixes = ('data/raw/', 'data/backups/', 'data/normalized/', '.venv/', '.private/')
    private_names = {'data/lens.db', 'data/lens.db.gz', '.env', 'web/data.json', 'web/artifact.html'}
    for name in files:
        if name in private_names or name.startswith(private_prefixes) or name.endswith(('.db', '.sqlite', '.sqlite3')):
            raise ValueError(f'Private data path tracked by Git: {name}')
    print(f'Publication check passed: {len(data["rows"])} postings; private fields and data paths excluded.')
    return data


if __name__ == '__main__':
    check()
