/**
 * Microservices startup script.
 * Launches all 4 services (gateway + 3 microservices) as child processes.
 * Provides unified logging with color-coded service names and handles
 * graceful shutdown of all services on SIGTERM/SIGINT.
 *
 * Usage: node start-services.js
 * Or:    npm run services
 */
const { spawn } = require('child_process');
const path = require('path');

// Service definitions — each runs as an independent Node.js process
const services = [
  { name: 'animation', script: 'src/microservices/animation-service.js', color: '\x1b[36m' },   // cyan
  { name: 'interview', script: 'src/microservices/interview-service.js', color: '\x1b[35m' },   // magenta
  { name: 'ai-service', script: 'src/microservices/ai-service.js', color: '\x1b[33m' },         // yellow
  { name: 'gateway', script: 'src/gateway/index.js', color: '\x1b[32m' },                       // green
];

const reset = '\x1b[0m';
const children = [];

console.log('Starting CodeVision AI microservices...\n');

// Launch each service as a child process
services.forEach(({ name, script, color }) => {
  const child = spawn('node', [path.join(__dirname, script)], {
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // Prefix each line of stdout/stderr with service name
  child.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((line) => console.log(`${color}[${name}]${reset} ${line}`));
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((line) => console.error(`${color}[${name}]${reset} \x1b[31m${line}${reset}`));
  });

  child.on('exit', (code) => {
    console.log(`${color}[${name}]${reset} exited with code ${code}`);
  });

  children.push({ name, child });
});

// Graceful shutdown — kill all child processes
function shutdown() {
  console.log('\nShutting down all services...');
  children.forEach(({ name, child }) => {
    console.log(`Stopping ${name}...`);
    child.kill('SIGTERM');
  });
  setTimeout(() => process.exit(0), 3000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
