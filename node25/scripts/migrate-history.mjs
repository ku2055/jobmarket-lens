/** Optional Node-only read-only legacy history archive. Never imported by the public service. */
import {readFile,writeFile,mkdir}from'node:fs/promises';
import{resolve,join}from'node:path';import{pathToFileURL}from'node:url';import{gzipSync}from'node:zlib';
import{ROOT,sha}from'./common.mjs';
export async function migrateHistory({input=resolve(ROOT,'../data/lens.db'),output=resolve(ROOT,'../.private/node25/legacy-history')}={}){
  const privateRoot=resolve(ROOT,'../.private/node25');output=resolve(output);if(!output.startsWith(privateRoot+'/'))throw Error('History archive must stay under private Node storage');
  const before=sha(await readFile(input));const{DatabaseSync}=await import('node:sqlite');const db=new DatabaseSync(input,{readOnly:true});let tables;
  try{db.exec('BEGIN');tables=Object.fromEntries(['postings','posting_versions','observations','snapshots'].map(table=>[table,db.prepare('SELECT * FROM '+table).all()]));db.exec('COMMIT');}finally{db.close();}
  if(sha(await readFile(input))!==before)throw Error('Legacy database changed during migration; retry consistent source snapshot');
  await mkdir(output,{recursive:true});const archive=gzipSync(JSON.stringify({format:'legacy-history-1',sourceSha256:before,tables}));await writeFile(join(output,'history.json.gz'),archive);
  const counts=Object.fromEntries(Object.entries(tables).map(([name,rows])=>[name,rows.length]));const report={format:'legacy-history-1',migratedAt:new Date().toISOString(),sourceSha256:before,archiveSha256:sha(archive),bytes:archive.length,counts,readOnly:true};
  await writeFile(join(output,'manifest.json'),JSON.stringify(report,null,2)+'\n');await writeFile(join(output,'collection-ledger.json'),JSON.stringify({schemaVersion:'2.5',scheduled:false,runs:[],legacyHistory:counts,limitations:['Migration archives existing evidence. No Node collector run is implied.']},null,2)+'\n');return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const args=process.argv.slice(2);const value=k=>args[args.indexOf(k)+1];migrateHistory({input:args.includes('--input')?value('--input'):undefined,output:args.includes('--output')?value('--output'):undefined}).then(report=>console.log(JSON.stringify(report,null,2))).catch(error=>{console.error(error);process.exitCode=1;});}
