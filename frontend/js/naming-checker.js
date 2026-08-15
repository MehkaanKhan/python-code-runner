const namingChecker = (() => {
  const ASSIGN_RE = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(?!=)/;
  const DEF_RE = /^\s*def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/;
  const CAMEL_RE = /[a-z][A-Z]/;
  const SKIP_NAMES = new Set(['self', 'cls', 'True', 'False', 'None']);
  const MAX_WARNINGS = 3;

  function classify(name) {
    if (SKIP_NAMES.has(name) || name.startsWith('__')) return null;
    if (/^[A-Z]/.test(name)) {
      return `Try starting '${name}' with a lowercase letter.`;
    }
    if (CAMEL_RE.test(name)) {
      return `Try writing '${name}' with underscores instead, like my_name.`;
    }
    return null;
  }

  function check(source) {
    const lines = source.split('\n');
    const seen = new Set();
    const issues = [];

    for (let i = 0; i < lines.length; i++) {
      if (issues.length >= MAX_WARNINGS) break;

      const line = lines[i];
      const match = ASSIGN_RE.exec(line) || DEF_RE.exec(line);
      if (!match) continue;

      const name = match[1];
      if (seen.has(name)) continue;

      const message = classify(name);
      if (message) {
        seen.add(name);
        issues.push({ name, line: i + 1, message });
      }
    }

    return issues;
  }

  return { check };
})();
