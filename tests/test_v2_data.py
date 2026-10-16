import copy
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

from scripts.import_upstream import POSTING_HEADERS, COMPANY_HEADERS, parse_rows
from scripts.export_v2 import base_record, merge_records, load_local, public_pay, upstream_record, export_release
from scripts.v2_data import validate, canonical, sha


class V2DataTests(unittest.TestCase):
    def test_source_modes_preserve_conflicts_and_observations(self):
        up=base_record('A:1','A','Role','upstream:sha','2026-10-15T12:00:00Z')
        local=base_record('A:1','A','Role','local:A','2026-10-16')
        up.update(availability='upstream_reported_open',level='Senior')
        local.update(availability='local_observed',level='Entry',firstObservedAt='2026-10-14',lastObservedAt='2026-10-16',hasDescription=True)
        original=copy.deepcopy(up)
        merged=merge_records(up,local)
        self.assertEqual(up,original)
        self.assertEqual(merged['level'],'Entry')
        self.assertIn('qualifications',merged['quality']['conflictGroups'])
        self.assertEqual(merged['firstObservedAt'],'2026-10-14')
        self.assertEqual(merged['sourceIds'],['local:A','upstream:sha'])
        validate(merged,'posting')

    def test_newer_upstream_status_does_not_become_local_observation(self):
        up=base_record('A:1','A','Role','upstream:sha','2026-10-17')
        local=base_record('A:1','A','Role','local:A','2026-10-16')
        up['availability']='upstream_reported_open';local['availability']='closed';local['lastObservedAt']='2026-10-15'
        result=merge_records(up,local)
        self.assertEqual(result['availability'],'upstream_reported_open')
        self.assertEqual(result['lastObservedAt'],'2026-10-15')
        self.assertEqual(result['availabilitySourceId'],'upstream:sha')

    def test_missing_private_database_stays_missing(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'missing.db'
            self.assertEqual(load_local(path),([],[],False))
            self.assertFalse(path.exists())

    def test_corrupt_database_is_not_silently_ignored(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'broken.db';path.write_text('not SQLite')
            with self.assertRaises(sqlite3.DatabaseError):load_local(path)

    def test_strict_nested_schema_rejects_private_and_unknown_fields(self):
        for field in ['description','debug','skill_evidence']:
            value=base_record('A:1','A','Role','local:A',None)
            value['quality'][field]='PRIVATE_SENTINEL'
            with self.assertRaises(ValueError):validate(value,'posting')
        value=base_record('A:1','A','Role','local:A',None)
        value['hasDescription']='PRIVATE_SENTINEL'
        with self.assertRaises(ValueError):validate(value,'posting')

    def test_unknown_salary_and_suspicious_maximum_remain_ineligible(self):
        pay=public_pay({'min':100000,'max':2000000,'currency':'USD','period':'year','annual_min':100000,'annual_max':2000000,'flags':[]})
        self.assertFalse(pay['valid']);self.assertIsNone(pay['annualHigh'])
        self.assertIn('suspicious_annual_max',pay['flags'])

    def test_deterministic_canonical_hash(self):
        self.assertEqual(sha(canonical({'b':2,'a':1})),sha(canonical({'a':1,'b':2})))
        self.assertNotEqual(sha(canonical({'a':1})),sha(canonical({'a':2})))

    def test_bad_headers_are_not_treated_as_empty_inventory(self):
        with self.assertRaisesRegex(ValueError,'headers'):parse_rows(b'id,title\n1,Hi\n','postings')

    def test_import_rejects_unsafe_url_and_duplicate_ids(self):
        import csv,io
        values={key:'' for key in POSTING_HEADERS}
        values.update({'Posting ID':'A:1','Ticker':'A','Title':'Role','URL':'https://example.com/a','Status':'Open','Accepts equivalent experience':'No'})
        output=io.StringIO();writer=csv.DictWriter(output,fieldnames=POSTING_HEADERS);writer.writeheader();writer.writerow(values);writer.writerow(values)
        values['Posting ID']='A:2';values['URL']='javascript:alert(1)';writer.writerow(values)
        accepted,rejects=parse_rows(output.getvalue().encode(),'postings')
        self.assertEqual(len(accepted),1);self.assertEqual(len(rejects),2)
        record=upstream_record(accepted[0],'upstream:sha','2026-10-16')
        self.assertIsNone(record['hasDescription']);self.assertIsNone(record['equivalentExperience']);self.assertIsNone(record['firstObservedAt'])

    def test_fieldwise_fallback_retains_nonnull_and_accurate_provenance(self):
        up=base_record('A:1','A','Role','upstream:x','2026-10-15')
        local=base_record('A:1','A','Role','local:A','2026-10-16')
        up.update(degree='Bachelor',locations=[{'country':'US','region':'CA','city':'SF','precision':'city','primary':True}])
        local.update(level='Senior',locations=[{'country':None,'region':None,'city':None,'precision':'unknown','primary':True}])
        result=merge_records(up,local)
        self.assertEqual(result['degree'],'Bachelor');self.assertEqual(result['level'],'Senior')
        self.assertEqual(result['fieldProvenance']['degree'],'upstream:x')
        self.assertEqual(result['locations'][0]['city'],'SF')
        validate(result,'posting')

    def test_release_without_db_uses_verified_csv_and_is_reproducible(self):
        import csv,io
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);intake=root/'intake';intake.mkdir()
            row={k:'' for k in POSTING_HEADERS}
            row.update({'Posting ID':'A:1','Ticker':'A','Title':'Role','Status':'Open','URL':'https://example.com/job','Accepts equivalent experience':'No'})
            company={k:'' for k in COMPANY_HEADERS}
            company.update({'Ticker':'A','Company':'Company','Notes':'PRIVATE_SENTINEL'})
            files={}
            for filename,kind,headers,record in [('Job postings.csv','postings',POSTING_HEADERS,row),('data source.csv','companies',COMPANY_HEADERS,company)]:
                output=io.StringIO();writer=csv.DictWriter(output,fieldnames=headers);writer.writeheader();writer.writerow(record)
                content=output.getvalue().encode();(intake/filename).write_bytes(content)
                files[kind]={'sha256':sha(content),'accepted':1,'rejected':0}
            (intake/'report.json').write_text(json.dumps({'dryRun':False,'commit':'f'*40,'asOf':'2026-10-16','files':files}))
            (intake/'postings.json').write_text('[{"description":"PRIVATE_SENTINEL"}]')
            one=export_release(intake,root/'missing.db',root/'out')
            two=export_release(intake,root/'missing.db',root/'out')
            self.assertEqual(one['datasetVersion'],two['datasetVersion'])
            self.assertEqual(one['counts']['combined'],1);self.assertEqual(one['counts']['local'],0)
            for entry in one['files']:
                content=(root/'out'/entry['path']).read_bytes()
                self.assertEqual(sha(content),entry['sha256'])
                self.assertNotIn(b'PRIVATE_SENTINEL',content)
            (intake/'Job postings.csv').write_text('tampered')
            with self.assertRaisesRegex(ValueError,'checksum'):export_release(intake,root/'missing.db',root/'out')

    def test_csv_dollar_symbol_does_not_prove_usd(self):
        row={k:'' for k in POSTING_HEADERS}
        row.update({'Posting ID':'A:1','Ticker':'A','Title':'Role','Status':'Open','Pay':'$100,000–$200,000 per year'})
        record=upstream_record(row,'upstream:sha','2026-10-16')
        self.assertIsNone(record['pay']['currency']);self.assertFalse(record['pay']['valid'])
        self.assertIn('ambiguous_csv_currency',record['pay']['flags'])
        self.assertIsNone(record['pay']['annualHigh'])

    def test_audited_currency_recovery_revalidates_native_bounds(self):
        row={k:'' for k in POSTING_HEADERS}
        row.update({'Posting ID':'A:1','Ticker':'A','Title':'Role','Status':'Open','Pay':'$100,000–$200,000 per year'})
        extra={'pay_lo':100000,'pay_hi':200000,'pay_cur':'USD','pay_period':'year','pay_max':999999999}
        record=upstream_record(row,'upstream:sha','2026-10-16',extra)
        self.assertTrue(record['pay']['valid']);self.assertEqual(record['pay']['currency'],'USD')
        self.assertEqual(record['pay']['annualHigh'],200000)
        extra['pay_hi']=300000
        record=upstream_record(row,'upstream:sha','2026-10-16',extra)
        self.assertFalse(record['pay']['valid']);self.assertIn('typed_pay_mismatch',record['pay']['flags'])

    def test_typed_supplement_requires_pinned_hash_and_shared_fields(self):
        import base64,gzip
        from unittest.mock import patch
        from scripts.import_upstream import typed_supplement,PIN
        row={k:'' for k in POSTING_HEADERS}
        row.update({'Posting ID':'A:1','Ticker':'A','Title':'Role','Status':'Open'})
        extra={'id':'A:1','co':'A','title':'Role','url':None,'posted':None,'last_seen':None,'open':True}
        payload={'fields':list(extra),'rows':[list(extra.values())]}
        encoded=json.dumps(base64.b64encode(gzip.compress(json.dumps(payload).encode())).decode())
        content=('const EMBEDDED = '+encoded).encode()
        with patch('scripts.import_upstream.TYPED_PIN_SHA',sha(content)):
            self.assertEqual(len(typed_supplement(content,[row],PIN)),1)
            row['Title']='Different'
            with self.assertRaisesRegex(ValueError,'shared field'):typed_supplement(content,[row],PIN)
        with self.assertRaisesRegex(ValueError,'pinned HTML'):typed_supplement(content,[row],PIN)

    def test_identity_mismatch_never_merges(self):
        a=base_record('A:1','A','Role','upstream:x',None);b=base_record('A:2','A','Role','local:A',None)
        with self.assertRaises(ValueError):merge_records(a,b)


if __name__=='__main__':unittest.main()
