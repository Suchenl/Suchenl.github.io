import {spawn} from 'node:child_process';
import {readFileSync,mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
const base='http://127.0.0.1:4321';
const server=spawn('./node_modules/.bin/astro',['preview','--host','127.0.0.1','--port','4321'],{stdio:'pipe'});
server.stderr.on('data',d=>process.stderr.write(String(d)));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function run(args,env){
 return new Promise((resolve,reject)=>{
  const child=spawn('./node_modules/.bin/lighthouse',args,{stdio:['ignore','pipe','pipe'],env});
  let output='';
  child.stdout.on('data',d=>output+=String(d));
  child.stderr.on('data',d=>output+=String(d));
  child.on('error',reject);
  child.on('exit',code=>code===0?resolve(output):reject(new Error(output+' Lighthouse exit '+code)));
 });
}
try{
 let ready=false;
 for(let i=0;i<90;i++){try{ready=(await fetch(base+'/')).ok;}catch{}if(ready)break;await wait(350);}
 if(!ready)throw Error('Astro preview did not start');
 mkdirSync('lighthouse-results',{recursive:true});
 const chrome=chromium.executablePath();
 const pages=[['home','/'],['research','/research/'],['publications','/publications/']];
 for(const [name,pathname] of pages){
  const file='lighthouse-results/'+name+'.json';
  await run([base+pathname,'--output=json','--output-path='+file,'--only-categories=performance,accessibility,best-practices,seo','--chrome-flags=--headless --no-sandbox --disable-gpu','--quiet'],{...process.env,CHROME_PATH:chrome});
  const report=JSON.parse(readFileSync(file,'utf8'));
  const scores=Object.fromEntries(Object.entries(report.categories || {}).map(([k,c])=>[k,Math.round((c.score || 0)*100)]));
  const metrics=Object.fromEntries(['first-contentful-paint','largest-contentful-paint','cumulative-layout-shift','total-blocking-time'].map(k=>[k,report.audits?.[k]?.displayValue||'N/A']));
  console.log('LIGHTHOUSE',name,JSON.stringify({scores,metrics}));
  const failures = ['accessibility','best-practices','seo'].flatMap(category =>
    (report.categories?.[category]?.auditRefs || [])
      .filter(ref => ref.weight > 0 && report.audits?.[ref.id]?.score != null && report.audits[ref.id].score < 1)
      .map(ref => ({category,id:ref.id,title:report.audits[ref.id].title,score:report.audits[ref.id].score,detail:report.audits[ref.id].displayValue || ''}))
  );
  if(failures.length) {
    console.log('LIGHTHOUSE_ISSUES',name,JSON.stringify(failures));
    const locations=failures.map(issue=>{
      const audit=report.audits?.[issue.id];
      return {id:issue.id,items:(audit?.details?.items || []).slice(0,4).map(item=>({selector:item.node?.selector || '',snippet:item.node?.snippet || '',url:item.url || '',message:item.message || '',source:item.source?.url || ''}))};
    });
    console.log('LIGHTHOUSE_DETAILS',name,JSON.stringify(locations));
  }
 }
 console.log('Lighthouse baseline generated (informational; scores not gated).');
}catch(error){console.error('Lighthouse audit failed:',error);process.exitCode=1;}
finally{server.kill('SIGTERM');}
