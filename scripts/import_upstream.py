"""Pinned public CSV intake. Archives/rejects never enter public output."""
import argparse
import base64
import csv
import io
import gzip
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.v2_data import canonical, sha

AUDIT = json.loads((ROOT / 'docs/V2_UPSTREAM_SOURCE_AUDIT.json').read_text())
PIN = AUDIT['commit']
POSTING_HEADERS = ['Posting ID','Title','Company','Ticker','SOC code','SOC group','Job level','Job type','Work arrangement','City','State','Country','Number of locations','Posted','Pay','Minimum degree','Accepts equivalent experience','Years of experience','Skills','Licenses and certifications','Status','Last seen','URL']
COMPANY_HEADERS = ['Rank','Ticker','Company','Sector','Career site','Platform','Status','Last collected','Postings in dashboard','Listed on site','Notes']


def safe_url(value):
    if not value:
        return None
    p = urlparse(value)
    return value if p.scheme in ('http','https') and p.hostname and not p.username and not p.password else None


def valid_date(value):
    if not value:
        return True
    try:
        return datetime.strptime(value, '%Y-%m-%d').strftime('%Y-%m-%d') == value
    except ValueError:
        return False


def parse_rows(content, kind):
    reader = csv.DictReader(io.StringIO(content.decode('utf-8-sig')))
    expected = POSTING_HEADERS if kind == 'postings' else COMPANY_HEADERS
    if reader.fieldnames != expected:
        raise ValueError(f'{kind}: incompatible headers')
    accepted, rejected, seen = [], [], set()
    for line, row in enumerate(reader, 2):
        reasons = []
        if None in row or any(v is None for v in row.values()):
            reasons.append('column_count')
        elif kind == 'postings':
            key = row['Posting ID']
            if not row['Ticker'] or not key.startswith(row['Ticker'] + ':') or not key.split(':',1)[-1]: reasons.append('invalid_id')
            if not row['Title'].strip(): reasons.append('empty_title')
            if row['URL'] and not safe_url(row['URL']): reasons.append('unsafe_url')
            if row['Status'] not in ('Open','Closed','Possibly closed','Unverified'): reasons.append('unknown_status')
            if not valid_date(row['Posted']) or not valid_date(row['Last seen']): reasons.append('invalid_date')
            for field in ('Number of locations','Years of experience'):
                if row[field]:
                    try:
                        number=float(row[field])
                        if not (0 <= number < 1000000): raise ValueError()
                    except ValueError: reasons.append('invalid_'+field)
            if row['Accepts equivalent experience'] not in ('Yes','No','Not specified',''): reasons.append('invalid_equivalence')
        else:
            key=row['Ticker']
            if not key: reasons.append('empty_company')
            if row['Career site'] and not safe_url(row['Career site']): reasons.append('unsafe_url')
            if not valid_date(row['Last collected']): reasons.append('invalid_date')
        key = row.get('Posting ID') if kind == 'postings' else row.get('Ticker')
        if key in seen: reasons.append('duplicate_id')
        if reasons:
            rejected.append({'line':line,'reasons':reasons,'record':row})
        else:
            seen.add(key)
            accepted.append(row)
    return accepted, rejected


TYPED_PIN_SHA='bc6a3b4ec490615c39ea31298deb41ecc925021e0e160afadf2d25e5b947a6d3'


def typed_supplement(content,rows,commit):
    """Accept the audited same-commit payload only; never trust annualized typed pay."""
    if commit!=PIN or sha(content)!=TYPED_PIN_SHA:
        raise ValueError('Typed supplement does not match the audited pinned HTML')
    match=re.search(r'const EMBEDDED = ("[^"\n]+")',content.decode('utf-8'))
    if not match: raise ValueError('No embedded typed supplement')
    data=json.loads(gzip.decompress(base64.b64decode(json.loads(match.group(1)))))
    if len(set(data['fields']))!=len(data['fields']):raise ValueError('Duplicate supplement fields')
    typed={}
    for values in data['rows']:
        if len(values)!=len(data['fields']):raise ValueError('Supplement row width')
        row=dict(zip(data['fields'],values))
        if row['id'] in typed:raise ValueError('Duplicate supplement ID')
        typed[row['id']]=row
    if set(typed)!={r['Posting ID'] for r in rows}:raise ValueError('Supplement ID set mismatch')
    for row in rows:
        extra=typed[row['Posting ID']]
        for csv_key,key in [('Title','title'),('Ticker','co'),('URL','url'),('Posted','posted'),('Last seen','last_seen')]:
            if (row[csv_key] or None)!=(extra[key] or None):raise ValueError('Supplement shared field mismatch: '+csv_key)
        if (row['Status']=='Open')!=extra['open']:raise ValueError('Supplement status mismatch')
    return typed


def intake(commit=PIN, directory=None, dry_run=False, input_dir=None, supplement=None):
    if not re.fullmatch(r'[0-9a-f]{40}', commit): raise ValueError('A full pinned commit SHA is required')
    directory = Path(directory or ROOT / '.private/upstream' / commit).resolve()
    for blocked in (ROOT/'frontend/public',ROOT/'web'):
        if directory == blocked.resolve() or blocked.resolve() in directory.parents:
            raise ValueError('Intake/reject reports must remain outside public directories')
    directory.mkdir(parents=True,exist_ok=True)
    records, files = {}, {}
    for filename, kind in [('Job postings.csv','postings'),('data source.csv','companies')]:
        cached=directory/filename
        provided=Path(input_dir)/filename if input_dir else None
        if provided and provided.exists(): content=provided.read_bytes()
        elif cached.exists(): content=cached.read_bytes()
        else:
            url=f'https://raw.githubusercontent.com/yimizhao2015/jobmarket-lens/{commit}/data/{filename.replace(" ","%20")}'
            with urlopen(url,timeout=90) as response: content=response.read()
        digest=sha(content)
        if commit==PIN and (digest!=AUDIT['files'][filename]['sha256'] or len(content)!=AUDIT['files'][filename]['bytes']):
            raise ValueError(f'{filename}: audited checksum/length mismatch')
        accepted,rejected=parse_rows(content,kind)
        cached.write_bytes(content)
        records[kind]=accepted
        files[kind]={'sha256':digest,'bytes':len(content),'rows':len(accepted)+len(rejected),'accepted':len(accepted),'rejected':len(rejected)}
        (directory/f'{kind}-rejects.json').write_bytes(canonical(rejected))
        if not dry_run: (directory/f'{kind}.json').write_bytes(canonical(accepted))
    report={'commit':commit,'retrievedAt':datetime.now(timezone.utc).isoformat(),'importVersion':'csv-1','dryRun':dry_run,'files':files}
    if commit==PIN: report['asOf']=AUDIT['commit_date']
    else:
        with urlopen(f'https://api.github.com/repos/yimizhao2015/jobmarket-lens/commits/{commit}',timeout=30) as response:
            report['asOf']=json.load(response)['commit']['committer']['date']
    if supplement:
        content=Path(supplement).read_bytes()
        try:
            typed=typed_supplement(content,records['postings'],commit)
            (directory/'typed-supplement.html').write_bytes(content)
            report['typedSupplement']={'status':'accepted','sha256':sha(content),'rows':len(typed)}
        except (ValueError,KeyError,TypeError) as exc:
            (directory/'typed-supplement-quarantine.html').write_bytes(content)
            report['typedSupplement']={'status':'quarantined','reason':str(exc),'sha256':sha(content)}
    (directory/'report.json').write_bytes(canonical(report))
    return report


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--commit',default=PIN)
    parser.add_argument('--refresh-latest',action='store_true')
    parser.add_argument('--dry-run',action='store_true')
    parser.add_argument('--output-dir')
    parser.add_argument('--input-dir',help='Offline directory containing the two original CSV files')
    parser.add_argument('--typed-supplement',help='Optional audited same-commit HTML; mismatch quarantines supplement')
    args=parser.parse_args()
    commit=args.commit
    if args.refresh_latest:
        with urlopen('https://api.github.com/repos/yimizhao2015/jobmarket-lens/commits/main',timeout=30) as response: commit=json.load(response)['sha']
    print(json.dumps(intake(commit,args.output_dir,args.dry_run,args.input_dir,args.typed_supplement),indent=2))


if __name__=='__main__': main()
