(async function () {
  const editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
    mode: 'python',
    theme: 'eclipse',
    lineNumbers: true,
    indentUnit: 4,
    tabSize: 4,
    indentWithTabs: false,
    lineWrapping: true,
  });

  const runBtn = document.getElementById('run-btn');
  const runBtnLabel = runBtn.querySelector('.run-btn-label');
  const outputEl = document.getElementById('output');
  const outputCard = outputEl.closest('.card');
  const editorCard = editor.getWrapperElement().closest('.card');
  const styleTipsEl = document.getElementById('style-tips');

  function renderOutput(stdout) {
    outputEl.textContent = stdout || '';
  }

  function renderNamingTips(namingIssues) {
    if (!namingIssues || namingIssues.length === 0) {
      styleTipsEl.hidden = true;
      styleTipsEl.innerHTML = '';
      return;
    }
    styleTipsEl.hidden = false;
    const items = namingIssues
      .map((issue) => `<li>Line ${issue.line}: ${issue.message}</li>`)
      .join('');
    styleTipsEl.innerHTML = `<div><strong>Style tips</strong><ul>${items}</ul></div>`;
  }

  async function handleRun() {
    errorMarker.clear();
    mascot.hideOops();

    const code = editor.getValue();
    const result = await pyodideRunner.runStudentCode(code);

    renderOutput(result.stdout);
    renderNamingTips(result.namingIssues);

    if (!result.ok) {
      errorMarker.show(editor, result.friendlyError);
      mascot.showOops(editorCard);
    } else {
      mascot.showYay(outputCard);
    }

    let loggedErrorType = null;
    if (!result.ok) {
      loggedErrorType = result.friendlyError.category;
    } else if (result.namingIssues.length > 0) {
      loggedErrorType = ERROR_TYPES.NAMING_CONVENTION;
    }
    tracking.logRunPressed(loggedErrorType);
  }

  runBtn.addEventListener('click', handleRun);
  editor.on('change', () => {
    errorMarker.clear();
    mascot.hideOops();
  });

  runBtn.disabled = true;
  runBtnLabel.textContent = 'Loading Python…';
  await pyodideRunner.initPyodide();
  runBtn.disabled = false;
  runBtnLabel.textContent = 'Run';

  tracking.logSessionStart();
})();
