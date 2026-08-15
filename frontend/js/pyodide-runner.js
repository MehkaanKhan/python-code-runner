const pyodideRunner = (() => {
  let pyodide = null;
  let outputBuffer = '';

  async function initPyodide() {
    pyodide = await loadPyodide();
    pyodide.setStdout({ batched: (msg) => { outputBuffer += msg + '\n'; } });
    pyodide.setStderr({ batched: (msg) => { outputBuffer += msg + '\n'; } });
    return pyodide;
  }

  async function runStudentCode(code) {
    outputBuffer = '';
    const namingIssues = namingChecker.check(code);

    try {
      await pyodide.runPythonAsync(code);
      return { ok: true, stdout: outputBuffer, namingIssues };
    } catch (err) {
      const friendlyError = errorTranslator.translate(err.message || String(err), code);
      return { ok: false, stdout: outputBuffer, friendlyError, namingIssues };
    }
  }

  return { initPyodide, runStudentCode };
})();
