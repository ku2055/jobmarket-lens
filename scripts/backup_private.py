"""Back up raw evidence to a private GitHub release using the current gh login."""
import argparse
import gzip
import hashlib
import json
import shutil
import sqlite3
import subprocess
import tarfile
import tempfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def backup(repo):
    metadata = json.loads(subprocess.check_output(['gh', 'repo', 'view', repo, '--json', 'isPrivate,nameWithOwner']))
    if not metadata['isPrivate']:
        raise RuntimeError('Refusing to upload evidence to a public repository')
    if not (ROOT / 'data/lens.db').exists():
        raise RuntimeError('No local evidence database to back up')
    with tempfile.TemporaryDirectory(prefix='jobmarket-private-') as temp:
        temp = Path(temp)
        snapshot = temp / 'lens.db'
        with sqlite3.connect(ROOT / 'data/lens.db') as source, sqlite3.connect(snapshot) as target:
            source.backup(target)
        compressed = temp / 'lens.db.gz'
        with snapshot.open('rb') as source, gzip.open(compressed, 'wb') as target:
            shutil.copyfileobj(source, target)
        raw = temp / 'raw-evidence.tar.gz'
        with tarfile.open(raw, 'w:gz') as tar:
            for name in ['data/raw', 'data/normalized/postings.csv']:
                if (ROOT / name).exists():
                    tar.add(ROOT / name, arcname=name)
        assets = [compressed, raw]
        manifest = temp / 'manifest.json'
        manifest.write_text(json.dumps({
            'created_at': datetime.now(timezone.utc).isoformat(),
            'source_repo': 'liyue2055/jobmarket-lens',
            'assets': {p.name: {'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in assets},
        }, indent=2) + '\n')
        result = subprocess.run(['gh', 'release', 'view', 'data', '-R', repo], capture_output=True)
        if result.returncode:
            subprocess.run(['gh', 'release', 'create', 'data', '-R', repo,
                            '--title', 'Private posting evidence', '--notes',
                            'Private SQLite history, raw descriptions, normalized extraction evidence and integrity manifest.'], check=True)
        subprocess.run(['gh', 'release', 'upload', 'data', '-R', repo, *map(str, assets), str(manifest), '--clobber'], check=True)
        print(f'Private evidence backup uploaded to {repo} (release data).')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--repo', default='liyue2055/jobmarket-lens-data')
    backup(parser.parse_args().repo)
