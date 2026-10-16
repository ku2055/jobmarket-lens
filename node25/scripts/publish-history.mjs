/** Explicit coordinator-approved historical operational publication, not live collection. */
import{readFile,writeFile,rename}from'node:fs/promises';import{resolve,join}from'node:path';import{pathToFileURL}from'node:url';
import{ROOT,sha}from'./common.mjs';import{HistorySchema}from'./history-contract.mjs';import{ReleaseSchema}from'./release-contract.mjs';
export async function publishHistory(input=resolve(ROOT,'../data/lens.db'),directory=join(ROOT,'store')){
  const before=sha(await readFile(input));const{DatabaseSync}=await import('node:sqlite');const db=new DatabaseSync(input,{readOnly:true});let rows;
  try{rows=db.prepare('SELECT company,run_date,status,collected,site_total,metadata FROM snapshots ORDER BY run_date,company').all();}finally{db.close();}
  if(sha(await readFile(input))!==before)throw Error('Source DB changed during historical projection');
  const history=HistorySchema.parse({schemaVersion:'2.5',kind:'historical-import',engine:'legacy-python',scheduled:false,runs:rows.map(r=>{const complete=JSON.parse(r.metadata||'{}').completeness;return{company:r.company,runDate:r.run_date,status:r.status,collected:r.collected,siteTotal:r.site_total??null,inventoryStatus:['complete','partial'].includes(complete)?complete:'unknown',engine:'legacy-python',kind:'historical-import'};})});
  const release=ReleaseSchema.parse(JSON.parse(await readFile(join(directory,'release.json'),'utf8')));const known=new Set(release.catalog.companies.map(c=>c.id));if(history.runs.some(r=>!known.has(r.company)))throw Error('Historical company outside approved catalog');
  const bytes=Buffer.from(JSON.stringify(history,null,2)+'\n');release.files=release.files.filter(f=>f.path!=='collection-history.json');release.files.push({path:'collection-history.json',sha256:sha(bytes),bytes:bytes.length});release.collection.runs=history.runs;ReleaseSchema.parse(release);
  await writeFile(join(directory,'collection-history.json.tmp'),bytes);await rename(join(directory,'collection-history.json.tmp'),join(directory,'collection-history.json'));await writeFile(join(directory,'release.json.tmp'),JSON.stringify(release,null,2)+'\n');await rename(join(directory,'release.json.tmp'),join(directory,'release.json'));
  return {historicalRuns:history.runs.length,kind:'historical-import',engine:'legacy-python',scheduled:false,privateDbUnchanged:true,datasetVersion:release.datasetVersion};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)publishHistory(process.argv[2]).then(x=>console.log(JSON.stringify(x,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
