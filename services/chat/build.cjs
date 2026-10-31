'use strict';
const path = require('node:path');
const { build } = require('esbuild');
build({
  entryPoints: {
    handler: 'src/handler.ts',
    authorizer: 'src/authorizer.ts',
    mcp: '../portfolio-mcp/src/handler.ts'
  },
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'cjs',
  outdir: 'build',
  nodePaths: [path.resolve(__dirname, 'node_modules')],
  sourcemap: false,
  legalComments: 'none',
  minify: false
}).catch(() => { process.exitCode = 1; });
