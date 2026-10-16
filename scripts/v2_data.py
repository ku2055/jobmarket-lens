"""Shared strict V2 contracts and deterministic publication helpers (no private I/O)."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / 'frontend/src/data/contracts/release.schema.json'
VERSION = '2.0.0'
MODES = ('combined', 'upstream', 'local')
FORBIDDEN = {'description', 'raw', 'skill_evidence', 'pay_evidence', 'pay_text', 'detail', 'collected_at'}


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False).encode('utf-8')


def sha(value):
    return hashlib.sha256(value).hexdigest()


def validate(value, name):
    """Validate our deliberately bounded JSON Schema subset without optional dependencies."""
    document = json.loads(SCHEMA_PATH.read_text())
    def walk(v, spec, path):
        if '$ref' in spec:
            node = document
            for part in spec['$ref'].removeprefix('#/').split('/'):
                node = node[part]
            return walk(v, node, path)
        if 'anyOf' in spec:
            for choice in spec['anyOf']:
                try:
                    walk(v, choice, path)
                    return
                except ValueError:
                    pass
            raise ValueError(f'{path}: no allowed type')
        types = spec.get('type')
        if types:
            matches = {'null': v is None, 'string': isinstance(v, str), 'boolean': isinstance(v, bool),
                       'object': isinstance(v, dict), 'array': isinstance(v, list),
                       'integer': isinstance(v, int) and not isinstance(v, bool),
                       'number': isinstance(v, (int, float)) and not isinstance(v, bool)}
            if not any(matches[t] for t in ([types] if isinstance(types, str) else types)):
                raise ValueError(f'{path}: invalid type')
        if 'enum' in spec and v not in spec['enum']:
            raise ValueError(f'{path}: invalid enum')
        if 'const' in spec and v != spec['const']:
            raise ValueError(f'{path}: invalid constant')
        if isinstance(v, dict):
            properties = spec.get('properties', {})
            if set(spec.get('required', [])) - set(v):
                raise ValueError(f'{path}: missing fields')
            if spec.get('additionalProperties') is False and set(v) - set(properties):
                raise ValueError(f'{path}: unknown fields {set(v)-set(properties)}')
            for k, item in v.items():
                if k in FORBIDDEN:
                    raise ValueError(f'{path}: private field {k}')
                if k in properties:
                    walk(item, properties[k], path + '.' + k)
                elif isinstance(spec.get('additionalProperties'), dict):
                    walk(item, spec['additionalProperties'], path + '.' + k)
        if isinstance(v, list):
            if len(v) > spec.get('maxItems', float('inf')):
                raise ValueError(f'{path}: too many items')
            if spec.get('uniqueItems') and len({canonical(x) for x in v}) != len(v):
                raise ValueError(f'{path}: duplicate items')
            for i, item in enumerate(v):
                walk(item, spec.get('items', {}), f'{path}[{i}]')
        if isinstance(v, str) and len(v) < spec.get('minLength', 0):
            raise ValueError(f'{path}: empty string')
        if isinstance(v, (int, float)) and not isinstance(v, bool) and v < spec.get('minimum', float('-inf')):
            raise ValueError(f'{path}: below minimum')
    walk(value, document['$defs'][name], name)
    return value
