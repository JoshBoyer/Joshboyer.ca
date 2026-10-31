'use strict';
const { build } = require('esbuild');
build({
  entryPoints: ['src/handler.ts', 'src/authorizer.ts'],
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'cjs',
  outdir: 'build',
  sourcemap: false,
  legalComments: 'none',
  minify: false
}).catch(() => { process.exitCode = 1; });
