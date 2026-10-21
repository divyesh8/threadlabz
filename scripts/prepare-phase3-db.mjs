// Prepare an isolated local project without changing migration history or data.
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('tmp/phase3-db/supabase');
fs.mkdirSync(path.join(root,'migrations'),{recursive:true});
fs.mkdirSync(path.join(root,'tests'),{recursive:true});
const config=fs.readFileSync('supabase/config.toml','utf8')
  .replace('project_id = "threadlabz_local"','project_id = "threadlabz_phase3_qa"')
  .replace(/\[db.seed\]\s*enabled = true/,'[db.seed]\nenabled = false');
fs.writeFileSync(path.join(root,'config.toml'),config);
// Entire canonical sequence. Refuse stale files rather than silently masking them.
const migrations = fs.readdirSync('supabase/migrations').filter(file=>file.endsWith('.sql')).sort();
for(const file of fs.readdirSync(path.join(root,'migrations'))) {
  if(!migrations.includes(file)) throw Error(`Unexpected local migration ${file}; review the isolated workspace before continuing.`);
}
for(const file of migrations) fs.copyFileSync(`supabase/migrations/${file}`,path.join(root,'migrations',file));
for(const file of fs.readdirSync('supabase/tests').filter(file=>file.endsWith('.sql'))) {
  fs.copyFileSync(`supabase/tests/${file}`,path.join(root,'tests',file));
}
fs.mkdirSync(path.join(root,'templates'),{recursive:true});
fs.copyFileSync('supabase/templates/confirmation.html',path.join(root,'templates','confirmation.html'));
console.log('Prepared tmp/phase3-db with the complete canonical migration sequence. No database started or changed. See docs/DEPLOYMENT-RUNBOOK.md before use.');
