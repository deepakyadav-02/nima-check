/**
 * Very small argv helper for scripts.
 * Supports: --key=value, --key value, and boolean flags: --flag
 */
function parseCliArgs(argv) {
  const args = Array.isArray(argv) ? argv.slice(2) : [];

  const get = (name) => {
    const prefix = `--${name}=`;
    const eq = args.find((a) => typeof a === 'string' && a.startsWith(prefix));
    if (eq) return eq.slice(prefix.length);
    const idx = args.indexOf(`--${name}`);
    if (idx !== -1) return args[idx + 1];
    return undefined;
  };

  const has = (name) => args.includes(`--${name}`);

  return { args, get, has };
}

module.exports = { parseCliArgs };

