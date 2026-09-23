const { spawn, execSync } = require('child_process');

// Helper to kill any process currently occupying a specific port on Windows / Unix
function clearPort(port) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
      const lines = output.split('\n');
      lines.forEach(line => {
        if (line.includes('LISTENING') && (line.includes(`:${port} `) || line.includes(`:${port}\r`))) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0' && pid !== process.pid.toString()) {
            try {
              execSync(`taskkill /F /PID ${pid}`, { stdio: ['pipe', 'pipe', 'ignore'] });
              console.log(`[Orchestrator] Cleared stale process PID ${pid} listening on port ${port}`);
            } catch (e) {}
          }
        }
      });
    }
  } catch (e) {}
}

console.log('Ensuring ports 5050 and 4500 are free...');
clearPort(5050);
clearPort(4500);

const children = [];

function runCommand(command, args, label, restartOnExit = false) {
  const child = spawn(command, args, { shell: true, stdio: 'pipe' });
  children.push(child);

  child.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`[${label}] ${line}`);
      }
    });
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.error(`[${label} LOG] ${line}`);
      }
    });
  });

  child.on('close', (code) => {
    console.log(`[${label}] Exited with code ${code}`);
    if (restartOnExit && code !== 0) {
      console.log(`[${label}] Auto-restarting process in 2 seconds...`);
      setTimeout(() => runCommand(command, args, label, restartOnExit), 2000);
    }
  });

  return child;
}

function cleanup() {
  console.log('Cleaning up all child processes...');
  children.forEach((child) => {
    if (child && !child.killed) {
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', child.pid, '/f', '/t']);
        } else {
          child.kill('SIGTERM');
        }
      } catch (err) {}
    }
  });
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('uncaughtException', (err) => {
  console.error('Orchestrator Uncaught Exception:', err);
});

console.log('Starting PromptForm AI Backend (port 5050) and Frontend (port 4500) concurrently...');
runCommand('npm', ['run', 'dev:backend'], 'Backend', true);
runCommand('npm', ['run', 'dev:frontend'], 'Frontend', true);
