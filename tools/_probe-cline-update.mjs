import fs from 'node:fs'; import path from 'node:path';
const root='C:/Users/user/AppData/Roaming/npm/node_modules/cline/node_modules/@cline';
let exe=null;
(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.name==='cline.exe')exe=p;}})(root);
console.log('exe:',exe, exe?fs.statSync(exe).size:0);
if(exe){
  const buf=fs.readFileSync(exe);
  const needles=['min-release-age','CLINE_DISABLE','DISABLE_AUTO','NO_UPDATE','disableAutoUpdate','autoUpdate','auto_update','AUTOUPDATE','npm update -g','skipUpdate','updateCheck','CLINE_NO'];
  for(const n of needles){
    let i=buf.indexOf(Buffer.from(n)); let count=0; const hits=[];
    while(i>=0 && count<3){ hits.push(buf.slice(Math.max(0,i-150), i+180).toString('latin1').replace(/[^\x20-\x7e]/g,'.')); count++; i=buf.indexOf(Buffer.from(n), i+1); }
    if(hits.length) { console.log('\n=== '+n+' ('+hits.length+') ==='); hits.forEach(h=>console.log('   '+h)); }
  }
}
