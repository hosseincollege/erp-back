const { writeFileSync } = require('node:fs');
const { join } = require('node:path');

// TypeScript emits the Nest entry point to dist/src/main.js because the API
// adapter under api/ shares the project root. Keep dist/main.js as a stable
// compatibility entry point for local runners that expect the conventional path.
writeFileSync(
  join(__dirname, '..', 'dist', 'main.js'),
  "require('./src/main.js');\n",
  'utf8',
);
