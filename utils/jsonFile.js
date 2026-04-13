const fs = require('fs');

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    const err = new Error(`File not found: ${filePath}`);
    err.code = 'ENOENT';
    throw err;
  }

  let raw = fs.readFileSync(filePath, 'utf8');
  // Strip UTF-8 BOM if present
  if (raw && raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  return JSON.parse(raw);
}

module.exports = { readJsonFile };

