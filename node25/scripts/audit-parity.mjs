/** Explicit offline parity audit; never invoked by Vercel build or query service. */
import {writeFile}from'node:fs/promises';import{resolve}from'node:path';import{createHash}from'node:crypto';
import{ROOT,canonical,SOURCE_VERSION,PIN,HASHES}from'./common.mjs';
import{loadV2,assertPopulations}from'./materialize.mjs';import{loadOriginal}from'./original-source.mjs';
const args=process.argv.slice(2);const value=k=>args[args.indexOf(k)+1];
const actual=await loadOriginal(args.includes('--intake-dir')?resolve(value('--intake-dir')):undefined);
const expected=await loadV2(args.includes('--v2')?resolve(value('--v2')):resolve(ROOT,'../frontend/public/data'));
const modes={};let mismatches=0;
for(const mode of ['combined','upstream','local']){
  const reference=new Map(expected.modes[mode].map(r=>[r.id,r]));const hashes={node:createHash('sha256'),v2:createHash('sha256')};let differences=0;
  for(const r of actual.modes[mode]){const a=canonical(r),b=canonical(reference.get(r.id));if(a!==b)differences++;hashes.node.update(a+'\n');hashes.v2.update((b??'missing')+'\n');}
  differences+=Math.max(0,reference.size-actual.modes[mode].length);mismatches+=differences;
  modes[mode]={records:actual.modes[mode].length,mismatches:differences,nodeCanonicalRowsSha256:hashes.node.digest('hex'),v2CanonicalRowsSha256:hashes.v2.digest('hex')};
}
const populations=assertPopulations(actual);const receipt={audit:'canonical-json-lines-sorted-id-1',checkedAt:new Date().toISOString(),nodeVersion:process.version,sourceCommit:PIN,sourceDatasetVersion:SOURCE_VERSION,originalInputSha256:HASHES,counts:populations.counts,eligiblePayByMode:populations.pay,modes,mismatches};
if(args.includes('--output'))await writeFile(resolve(value('--output')),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));if(mismatches)process.exitCode=1;
