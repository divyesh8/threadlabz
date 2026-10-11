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
for(const file of ['001_schema.sql','20261011123446_phase_3_catalogue_boundaries.sql']) fs.copyFileSync(`supabase/migrations/${file}`,path.join(root,'migrations',file));
fs.copyFileSync('supabase/tests/phase3_catalogue_test.sql',path.join(root,'tests','phase3_catalogue_test.sql'));
fs.mkdirSync(path.join(root,'templates'),{recursive:true});
fs.copyFileSync('supabase/templates/confirmation.html',path.join(root,'templates','confirmation.html'));
console.log('Prepared tmp/phase3-db. No database started or changed. Use the local-only commands in docs/PHASE-3.md.');
