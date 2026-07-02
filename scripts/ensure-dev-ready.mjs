import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');
const nextDir = path.join(frontendRoot, '.next');
const shouldClean = process.argv.includes('--clean');

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function killPort(port) {
  try {
    if (process.platform === 'win32') {
      const output = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
      const pids = new Set();

      for (const line of output.split('\n')) {
        if (!line.includes(`:${port}`) || !line.includes('LISTENING')) continue;
        const pid = line.trim().split(/\s+/).pop();
        if (pid && /^\d+$/.test(pid)) pids.add(pid);
      }

      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        } catch {
          // Process may already have exited.
        }
      }
      return;
    }

    execSync(`lsof -ti:${port} | xargs -r kill -9`, { stdio: 'ignore', shell: true });
  } catch {
    // No process is listening on this port.
  }
}

function removeNextDir() {
  if (!fs.existsSync(nextDir)) return;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      fs.rmSync(nextDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      return;
    } catch (error) {
      if (attempt === 4) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Could not remove ${nextDir}. Close other Next.js terminals and run "npm run dev:clean" again.\n${message}`,
        );
      }
      sleep(500);
    }
  }
}

for (const port of [3000, 3001, 3002, 3003]) {
  killPort(port);
}

if (process.platform === 'win32') {
  sleep(750);
}

if (shouldClean) {
  removeNextDir();
}
