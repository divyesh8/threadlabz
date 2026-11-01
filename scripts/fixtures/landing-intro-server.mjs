import { spawn } from 'node:child_process';
import { isolatedEnvironment } from './isolated-env.mjs';
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', process.argv.includes('--production') ? 'start' : 'dev', '--hostname', '127.0.0.1', '--port', '3110'], {
  windowsHide: true, stdio: 'inherit', env: isolatedEnvironment(),
});
child.on('exit', code => { process.exitCode = code ?? 1; });
