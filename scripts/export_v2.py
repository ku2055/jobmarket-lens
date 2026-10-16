"""Reproducible V2 release export from pinned intake and optional read-only local evidence."""
import argparse
import copy
import json
import math
import sqlite3
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from scripts.v2_data import VERSION, MODES, canonical, sha, validate
from scripts.import_upstream import PIN, safe_url, parse_rows, typed_supplement
from scripts.public_data import PUBLIC_POSTING_FIELDS
from normalize import parse, skills, soc


def text(value):
    return None if value in (None,'','Not specified','Unknown') else str(value)


def stable_id(kind,name): return kind+'-'+sha(name.casefold().encode())[:20]


def public_pay(pay):
    if not pay: return None
    flags=sorted(set(pay.get('flags',[])))
    low=pay.get('min'); high=pay.get('max'); currency=pay.get('currency'); period=pay.get('period')
    annual_low=pay.get('annual_min'); annual_high=pay.get('annual_max')
    numbers=[low,high,annual_low,annual_high]
    def valid_number(v): return v is None or (isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v) and v>=0)
    if not all(valid_number(v) for v in numbers):
        flags.append('invalid_numeric_pay')
        low,high,annual_low,annual_high=[v if valid_number(v) else None for v in numbers]
    if period not in ('hour','month','year'): flags.append('unknown_pay_period')
    if not currency or len(currency)!=3 or not currency.isalpha(): flags.append('unknown_currency')
    if annual_high is not None and annual_high>1000000: flags.append('suspicious_annual_max')
    if low is not None and high is not None and low>high: flags.append('inverted_range')
    if annual_low is not None and annual_high is not None and annual_low>annual_high: flags.append('inverted_annual_range')
    valid=not flags and currency is not None and period is not None and annual_low is not None and annual_high is not None
    return {'low':low,'high':high,'currency':currency,'period':period,'annualLow':annual_low if valid else None,'annualHigh':annual_high if valid else None,'valid':valid,'flags':sorted(set(flags))}


def base_record(identifier,company,title,source,as_of):
    return {'id':identifier,'companyId':company,'title':title,'sourceUrl':None,'occupationId':None,'level':None,'employmentType':None,'arrangement':None,'degree':None,'equivalentExperience':None,'experienceYears':None,'locations':[],'skillIds':[],'licenseIds':[],'pay':None,'sourcePostedDate':None,'dateBasis':'unknown','firstObservedAt':None,'lastObservedAt':None,'hasDescription':None,'availability':'unverified','availabilityAsOf':as_of,'availabilitySourceId':source,'sourceIds':[source],'fieldProvenance':{},'quality':{'completeness':'unknown','flags':[],'conflictGroups':[]},'provenance':{group:source for group in ('status','date','location','pay','skills','qualifications')}}


def location(country,region,city,primary=True):
    country,region,city=map(text,(country,region,city))
    return {'country':country,'region':region,'city':city,'precision':'city' if city else 'region' if region else 'country' if country else 'unknown','primary':primary}


def upstream_record(row,source,as_of,extra=None):
    r=base_record(row['Posting ID'],row['Ticker'],row['Title'],source,as_of)
    r.update(sourceUrl=safe_url(row['URL']),occupationId=text(row['SOC code']),level=text(row['Job level']),employmentType=text(row['Job type']),arrangement=text(row['Work arrangement']),degree=text(row['Minimum degree']),equivalentExperience=True if row['Accepts equivalent experience']=='Yes' else None,experienceYears=float(row['Years of experience']) if row['Years of experience'] else None,sourcePostedDate=text(row['Posted']),dateBasis='upstream_normalized' if text(row['Posted']) else 'unknown')
    r['locations']=[location(row['Country'],row['State'],row['City'])]
    r['skillIds']=sorted({stable_id('skill',s.strip()) for s in row['Skills'].split(';') if s.strip()})
    r['licenseIds']=sorted({stable_id('license',s.strip()) for s in row['Licenses and certifications'].split(';') if s.strip()})
    r['pay']=public_pay(parse.parse_pay(text(row['Pay']),''))
    # Upstream CSV formatter also prints '$' for a missing currency. The symbol cannot prove USD.
    if r['pay'] and '$' in row['Pay']:
        r['pay'].update(currency=None,annualLow=None,annualHigh=None,valid=False)
        r['pay']['flags']=sorted(set(r['pay']['flags']+['ambiguous_csv_currency']))
    if r['pay'] and extra:
        p=r['pay'];digits=2 if p['period']=='hour' else 0
        bounds_match=all(isinstance(extra.get(key),(float,int)) and math.isfinite(extra[key]) and round(extra[key],digits)==p[field] for key,field in [('pay_lo','low'),('pay_hi','high')])
        if bounds_match and extra.get('pay_period')==p['period']:
            currency=extra.get('pay_cur')
            remaining=[flag for flag in p['flags'] if flag not in ('ambiguous_csv_currency','unknown_currency')]
            mult={'hour':2080,'month':12,'year':1}.get(p['period'])
            r['pay']=public_pay({'min':p['low'],'max':p['high'],'currency':currency,'period':p['period'],'annual_min':p['low']*mult if mult else None,'annual_max':p['high']*mult if mult else None,'flags':remaining})
            if not currency:r['pay']['flags']=sorted(set(r['pay']['flags']+['ambiguous_csv_currency']))
            r['quality']['flags'].append('typed_currency_reported')
        else:
            r['pay']['flags']=sorted(set(r['pay']['flags']+['typed_pay_mismatch']))
            r['pay'].update(valid=False,annualLow=None,annualHigh=None)
    r['availability']={'Open':'upstream_reported_open','Closed':'closed','Possibly closed':'possibly_closed','Unverified':'unverified'}[row['Status']]
    if r['arrangement'] not in ('Remote','Hybrid','On-site',None):
        r['arrangement']=None; r['quality']['flags'].append('unknown_arrangement')
    r['quality']['flags'].extend(['upstream_reported','unknown_text_coverage'])
    if r['pay'] and r['pay']['flags']: r['quality']['flags'].extend(r['pay']['flags'])
    return r


def load_local(path):
    """No connect()/migration calls: private evidence opened in SQLite read-only mode."""
    path=Path(path)
    if not path.exists(): return [],[],False
    db=sqlite3.connect(path.resolve().as_uri()+'?mode=ro',uri=True)
    db.row_factory=sqlite3.Row
    try:
        snapshots=[]
        for row in db.execute('SELECT * FROM snapshots ORDER BY run_date'):
            row=dict(row); metadata=json.loads(row.get('metadata') or '{}')
            metadata.update({k:row[k] for k in ('run_date','company','status','collected','site_total')})
            snapshots.append(metadata)
        latest={s['company']:s for s in snapshots}
        observations=set(tuple(r) for r in db.execute('SELECT run_date, company, source_id FROM observations'))
        result=[]
        from scripts.build_dataset import normalize
        for row in db.execute('SELECT * FROM postings'):
            row=dict(row); company=row['company']; sid=row['source_id']; last=row['last_seen']
            missing=[s for s in snapshots if s['company']==company and s['run_date']>last and s.get('completeness')=='complete' and s['status'] in ('ok','empty')]
            status='Closed' if len(missing)>=2 else 'Possibly closed' if missing else 'Open' if company in latest and (latest[company]['run_date'],company,sid) in observations else 'Unverified'
            raw=json.loads(row['raw']); raw.update(first_seen=row['first_seen'],last_seen=last,is_open=status=='Open',posting_status=status)
            normalized=normalize(raw)
            # Evidence fields produced by normalization never cross this projection boundary.
            safe={k:normalized[k] for k in PUBLIC_POSTING_FIELDS}
            safe['skills']=normalized['skills']; safe['lic']=normalized['lic']
            safe['completeness']=latest.get(company,{}).get('completeness','unknown')
            safe['status_as_of']=latest.get(company,{}).get('run_date',last)
            result.append(safe)
        return result,snapshots,True
    finally: db.close()


def local_record(n):
    source='local:'+n['co']; r=base_record(n['id'],n['co'],n['title'],source,n['status_as_of'])
    r.update(sourceUrl=safe_url(n['url']),occupationId=text(n['soc']),level=text(n['lvl']),employmentType=text(n['sched']),arrangement=text(n['arr']),degree=text(n['deg']),equivalentExperience=n['deg_equiv'],experienceYears=n['yrs'],sourcePostedDate=n['posted'],dateBasis=n['date_basis'],firstObservedAt=n['first_seen'],lastObservedAt=n['last_seen'],hasDescription=n['has_text'])
    r['availability']={'Open':'local_observed','Closed':'closed','Possibly closed':'possibly_closed','Unverified':'unverified'}[n['status']]
    r['locations']=[location(l['country'],l['state'],l['city'],i==0) for i,l in enumerate(n['locations'])]
    r['skillIds']=sorted({stable_id('skill',s) for s in n['skills']});r['licenseIds']=sorted({stable_id('license',s) for s in n['lic']})
    r['pay']=public_pay({'min':n['pay_lo'],'max':n['pay_hi'],'currency':n['pay_cur'],'period':n['pay_period'],'annual_min':n['pay_min'],'annual_max':n['pay_max'],'flags':n['pay_flags']}) if n['pay_lo'] is not None else None
    r['quality']['completeness']=n['completeness'];r['quality']['flags']=list(n['pay_flags'])
    if n['future_date']:r['quality']['flags'].append('future_source_date')
    return r


GROUPS={'status':['availability','availabilityAsOf','availabilitySourceId'],'date':['sourcePostedDate','dateBasis'],'location':['locations'],'pay':['pay'],'skills':['skillIds','licenseIds'],'qualifications':['occupationId','level','employmentType','arrangement','degree','equivalentExperience','experienceYears']}


def usable(value):
    if isinstance(value,list) and value and isinstance(value[0],dict) and 'precision' in value[0]:
        return any(any(location.get(k) for k in ('country','region','city')) for location in value)
    return value is not None and value!=[] and value!=''


def merge_records(upstream,local):
    if upstream['id']!=local['id']: raise ValueError('Cannot merge different identities')
    # Date-only local observations and same-day releases tie: prefer local evidence that day.
    local_day=(local['availabilityAsOf'] or '')[:10]; upstream_day=(upstream['availabilityAsOf'] or '')[:10]
    preferred,other=(local,upstream) if local_day>=upstream_day else (upstream,local)
    result=copy.deepcopy(preferred)
    result['sourceIds']=sorted(set(upstream['sourceIds']+local['sourceIds']))
    result['firstObservedAt']=local['firstObservedAt'];result['lastObservedAt']=local['lastObservedAt']
    conflicts=[]
    for group,fields in GROUPS.items():
        selected=preferred
        # Whole groups preserve semantics; fallback only if no usable group content exists.
        content=[f for f in fields if f not in ('dateBasis','availabilityAsOf','availabilitySourceId')]
        if not any(usable(preferred[f]) for f in content) and any(usable(other[f]) for f in content): selected=other
        for f in fields: result[f]=copy.deepcopy(selected[f])
        result['provenance'][group]=selected['provenance'][group]
        if group=='qualifications':
            for f in fields:
                if not usable(result[f]) and usable(other[f]):
                    result[f]=copy.deepcopy(other[f])
                    result['fieldProvenance'][f]=other['provenance'][group]
        if any(usable(upstream[f]) and usable(local[f]) and upstream[f]!=local[f] for f in content): conflicts.append(group)
    # Text denominator follows the skill source, not the presence of local metadata elsewhere.
    skill_source=result['provenance']['skills']
    result['hasDescription']=local['hasDescription'] if skill_source.startswith('local:') else None
    result['quality']={'completeness':local['quality']['completeness'] if result['availabilitySourceId'].startswith('local:') else 'unknown','flags':sorted(set(preferred['quality']['flags']+other['quality']['flags'])),'conflictGroups':conflicts}
    return result


def mode_summary(records):
    return {'count':len(records),'companies':len({r['companyId'] for r in records}),'availability':{key:sum(r['availability']==key for r in records) for key in ['local_observed','upstream_reported_open','possibly_closed','closed','unverified']},'withValidPay':sum(bool(r['pay'] and r['pay']['valid'] and r['pay']['currency']=='USD') for r in records),'withAnalyzedText':sum(r['hasDescription'] is True for r in records),'unknownText':sum(r['hasDescription'] is None for r in records)}


def export_release(intake_dir=None,local_db=None,output=None):
    intake=Path(intake_dir or ROOT/'.private/upstream'/PIN)
    report=json.loads((intake/'report.json').read_text())
    if report['dryRun']: raise ValueError('Import was dry-run; run accepted intake before export')
    parsed={}
    for filename,kind in [('Job postings.csv','postings'),('data source.csv','companies')]:
        if sha((intake/filename).read_bytes())!=report['files'][kind]['sha256']:raise ValueError('Intake archive checksum mismatch')
        parsed[kind],rejects=parse_rows((intake/filename).read_bytes(),kind)
        if len(parsed[kind])!=report['files'][kind]['accepted'] or len(rejects)!=report['files'][kind]['rejected']:
            raise ValueError('Intake count mismatch')
    upstream_rows=parsed['postings'];company_rows=parsed['companies']
    typed={}
    if report.get('typedSupplement',{}).get('status')=='accepted':
        content=(intake/'typed-supplement.html').read_bytes()
        if sha(content)!=report['typedSupplement']['sha256']:raise ValueError('Typed supplement checksum mismatch')
        typed=typed_supplement(content,upstream_rows,report['commit'])
    source='upstream:'+report['commit']; as_of=report['asOf']
    upstream={r['id']:r for r in (upstream_record(row,source,as_of,typed.get(row['Posting ID'])) for row in upstream_rows)}
    local_rows,snapshots,available=load_local(local_db or ROOT/'data/lens.db')
    local={r['id']:r for r in map(local_record,local_rows)}
    combined={key:merge_records(upstream[key],local[key]) if key in upstream and key in local else (upstream.get(key) or local[key]) for key in set(upstream)|set(local)}
    modes={'combined':[combined[k] for k in sorted(combined)],'upstream':[upstream[k] for k in sorted(upstream)],'local':[local[k] for k in sorted(local)]}
    companies={r['Ticker']:{'id':r['Ticker'],'name':r['Company'],'sector':text(r['Sector']),'careerUrl':safe_url(r['Career site'])} for r in company_rows}
    cfg=json.loads((ROOT/'config/companies.json').read_text())
    for c in cfg['companies']:
        companies.setdefault(c['ticker'],{'id':c['ticker'],'name':c['name'],'sector':text(c.get('sector')),'careerUrl':safe_url(c.get('career_site'))})
    skill_names={s.strip() for r in upstream_rows for s in r['Skills'].split(';') if s.strip()}|{s for r in local_rows for s in r['skills']}
    license_names={s.strip() for r in upstream_rows for s in r['Licenses and certifications'].split(';') if s.strip()}|{s for r in local_rows for s in r['lic']}
    taxonomy={'skills':[{'id':stable_id('skill',s),'name':s,'family':skills.SKILL_FAMILY.get(s,'Other')} for s in sorted(skill_names)],'licenses':[{'id':stable_id('license',s),'name':s} for s in sorted(license_names)],'occupations':[{'id':k,'name':v} for k,v in sorted(soc.SOC_MAJOR.items())]}
    if len({s['id'] for s in taxonomy['skills']})!=len(taxonomy['skills']):raise ValueError('Skill ID collision')
    sources=[{'id':source,'kind':'upstream','asOf':as_of,'commit':report['commit'],'completeness':'unknown'}]
    latest={s['company']:s for s in snapshots}
    sources.extend({'id':'local:'+company,'kind':'local','asOf':s['run_date'],'commit':None,'completeness':s.get('completeness','unknown')} for company,s in sorted(latest.items()))
    summary={'sourceModes':{mode:mode_summary(rows) for mode,rows in modes.items()},'limitations':['Cross-sectional, non-representative employer inventory; not the whole labor market.','Upstream statuses, dates and extracted skills are reported, not independently verified local observations.','No hiring-growth or employee-supply conclusions; one release is not a historical panel.','Unknown upstream text coverage makes skill denominators source-dependent.','Upstream CSV dollar signs also represent missing currencies; ambiguous ranges are excluded from pay comparisons.']+([] if available else ['Local private evidence is unavailable; upstream inventory remains usable.'])}
    artifacts=[]
    def add(name,kind,value,mode=None,count=None):
        validate(value, 'shard' if kind=='postings' else kind)
        content=canonical(value)
        artifacts.append((name,content,{'sha256':sha(content),'bytes':len(content),'recordCount':len(value) if isinstance(value,list) else (count or 1),'kind':kind,'sourceMode':mode}))
    add('companies.json','companies',list(sorted(companies.values(),key=lambda c:c['id'])))
    add('taxonomy.json','taxonomy',taxonomy);add('sources.json','sources',sources);add('summary.json','summary',summary)
    for mode,rows in modes.items():
        for offset in range(0,len(rows),5000): add(f'postings-{mode}-{offset//5000:03}.json','postings',{'sourceMode':mode,'postings':rows[offset:offset+5000]},mode,len(rows[offset:offset+5000]))
    methods={'import':'csv-1','merge':'freshness-groups-1','pay':'csv-audited-typed-currency-1' if typed else 'validated-csv-currency-unknown-1'}
    counts={'upstream':len(upstream),'local':len(local),'combined':len(combined),'overlap':len(set(upstream)&set(local)),'rejected':sum(f['rejected'] for f in report['files'].values())}
    input_releases=[{'id':source,'commit':report['commit'],'asOf':as_of,'sha256':sha(canonical({k:v['sha256'] for k,v in report['files'].items()}))}]
    if typed:
        input_releases[0]['sha256']=sha(canonical({'csv':input_releases[0]['sha256'],'typed':report['typedSupplement']['sha256']}))
    input_releases.extend({'id':'local:'+company,'commit':None,'asOf':snapshot['run_date'],'sha256':sha(canonical(sorted((r for r in local_rows if r['co']==company),key=lambda r:r['id'])))} for company,snapshot in sorted(latest.items()))
    # Include content and source lineage in identity, excluding operational build/retrieval times.
    identity={'schemaVersion':VERSION,'methods':methods,'counts':counts,'inputs':input_releases,'artifacts':{name:meta['sha256'] for name,_,meta in artifacts}}
    version=sha(canonical(identity)); prefix=f'releases/{version}/'
    manifest={'schemaVersion':VERSION,'datasetVersion':version,'builtAt':datetime.now(timezone.utc).isoformat(),'inputReleases':input_releases,'methods':methods,'counts':counts,'localEvidenceAvailable':available,'files':[dict(path=prefix+name,**meta) for name,_,meta in artifacts]}
    validate(manifest,'manifest')
    output=Path(output or ROOT/'frontend/public/data');output.mkdir(parents=True,exist_ok=True)
    for name,content,_ in artifacts:
        target=output/prefix/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(content)
    temporary=output/'manifest.json.tmp';temporary.write_bytes(canonical(manifest));temporary.replace(output/'manifest.json')
    return manifest


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--intake-dir');parser.add_argument('--local-db');parser.add_argument('--output')
    parser.add_argument('--source-mode',choices=MODES,default='combined',help='Compatibility argument only; all three source modes are always exported and app defaults to combined')
    args=parser.parse_args()
    manifest=export_release(args.intake_dir,args.local_db,args.output)
    print(json.dumps({'datasetVersion':manifest['datasetVersion'],'counts':manifest['counts'],'files':len(manifest['files']),'localEvidenceAvailable':manifest['localEvidenceAvailable']},indent=2))


if __name__=='__main__':main()
