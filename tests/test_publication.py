import base64
import gzip
import json
import tempfile
import unittest
from pathlib import Path

from scripts.check_publication import check
from scripts.public_data import PUBLIC_POSTING_FIELDS, public_snapshot


class PublicationTests(unittest.TestCase):
    def test_private_evidence_cannot_be_in_public_posting_fields(self):
        for field in ['raw', 'description', 'skill_evidence', 'pay_evidence', 'pay_text', 'collected_at']:
            self.assertNotIn(field, PUBLIC_POSTING_FIELDS)

    def test_snapshot_projection_drops_raw_errors_and_unexpected_values(self):
        projected = public_snapshot({'company': 'TEST', 'collected': 1, 'detail': 'PRIVATE', 'new_private_field': 'PRIVATE'})
        self.assertEqual(projected, {'company': 'TEST', 'collected': 1})

    def test_embedded_private_field_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'web').mkdir()
            data = {'fields': ['description'], 'snapshots': [], 'rows': [['PRIVATE']]}
            payload = json.dumps(base64.b64encode(gzip.compress(json.dumps(data).encode())).decode())
            (root / 'web/index.html').write_text('const EMBEDDED = ' + payload)
            with self.assertRaisesRegex(ValueError, 'Private or unknown posting fields'):
                check(root)
