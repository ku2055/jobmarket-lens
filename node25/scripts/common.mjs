import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import Ajv from 'ajv';
export const ROOT=fileURLToPath(new URL('../',import.meta.url));
export const PIN='7e415fe62d0597e9c6c806bf813b30f8e8c88c98';
export const AS_OF='2026-10-16T12:53:22Z';
export const SOURCE_VERSION='9bd992ecffd1bb6fad5a0715ca8c38a75b1bb4416df342c49abbb02a38b8de28';
export const HASHES={'Job postings.csv':'7063958088835db11499eb36858d54329fb003d2dba711565e396a90fa82fba6','data source.csv':'48a6c193b54601dafe9f34c18d7699177e08671e35b526d1cb248a67bcfde02e','index.html':'bc6a3b4ec490615c39ea31298deb41ecc925021e0e160afadf2d25e5b947a6d3'};
export const sha=x=>createHash('sha256').update(x).digest('hex');
export function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';if(typeof value==='number'&&!Number.isFinite(value))throw Error('Nonfinite numeric data');return JSON.stringify(value);}
export const stableId=(kind,name)=>kind+'-'+sha(name.toLowerCase()).slice(0,20);
export const text=v=>v==null||v===''||v==='Not specified'||v==='Unknown'?null:String(v);
export function safeUrl(value){if(!value)return null;try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?value:null;}catch{return null;}}
const schema=JSON.parse(await readFile(new URL('./public-v2.schema.json',import.meta.url),'utf8'));
const ajv=new Ajv({allErrors:true,strict:false});
const checks=new Map();
export function validate(value,kind){if(!checks.has(kind))checks.set(kind,ajv.compile({$defs:schema.$defs,$ref:'#/$defs/'+kind}));const check=checks.get(kind);if(!check(value))throw Error('Public '+kind+' rejected: '+JSON.stringify(check.errors).slice(0,1500));return value;}
export async function readVerified(path,hash){const bytes=await readFile(path);if(sha(bytes)!==hash)throw Error('Checksum mismatch: '+path);return bytes;}

export function validateSeed(seed){
  const keys=['catalog','asOf','methods','limitations','sourceDatasetVersion','localPostings'];
  if(canonical(Object.keys(seed).sort())!==canonical(keys.sort()))throw Error('Unknown/private seed fields');
  if(canonical(Object.keys(seed.catalog).sort())!==canonical(['companies','sources','taxonomy']))throw Error('Unknown/private seed catalog');
  validate(seed.catalog.companies,'companies');validate(seed.catalog.sources,'sources');validate(seed.catalog.taxonomy,'taxonomy');
  if(canonical(Object.keys(seed.methods).sort())!==canonical(['import','merge','pay'])||!Object.values(seed.methods).every(x=>typeof x==='string')||!Array.isArray(seed.limitations)||!seed.limitations.every(x=>typeof x==='string'))throw Error('Unknown/private seed method metadata');
  if(seed.sourceDatasetVersion!==SOURCE_VERSION||seed.asOf!==AS_OF||!Array.isArray(seed.localPostings))throw Error('Invalid public seed lineage');
  for(const row of seed.localPostings)validate(row,'posting');
  return seed;
}
