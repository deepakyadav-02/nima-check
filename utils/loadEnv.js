const path = require('path');
const dotenv = require('dotenv');

/**
 * Load environment variables for scripts/server.
 * Order: .env (Atlas) then config.env (local). Does not override existing vars.
 */
function loadEnv(cwd = path.resolve(__dirname, '..')) {
  dotenv.config({ path: path.join(cwd, '.env'), override: false });
  dotenv.config({ path: path.join(cwd, 'config.env'), override: false });
}

module.exports = { loadEnv };

