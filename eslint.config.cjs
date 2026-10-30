'use strict';
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  // Vendored libraries and the preserved generated Worker are checked for syntax,
  // credentials and route containment, but should not receive authored-code rewrites.
  { ignores: ['node_modules/**', '.wrangler/**', 'dist/vendor/**', 'legacy/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    languageOptions: { ecmaVersion: 'latest', globals: { ...globals.node } },
    rules: {
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }],
      'no-empty': ['error', { allowEmptyCatch: true }]
    }
  },
  { files: ['dist/**/*.js'], languageOptions: { sourceType: 'script', globals: globals.browser } },
  { files: ['functions/**/*.js', 'worker.mjs'], languageOptions: { sourceType: 'module', globals: globals.worker } }
];
