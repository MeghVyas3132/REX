// Minimal bootstrap to run the real TypeScript server
// Uses ts-node to load src/index.ts which mounts all routes and nodes
require('dotenv').config();

// Register ts-node at runtime (no need to rely on shell bin permissions)
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs'
  }
});

// Prefer an alternate port by default to avoid macOS AirPlay on 5000
process.env.PORT = process.env.PORT || '3003';

// Delegate to the actual TypeScript entrypoint
require('./src/index.ts');