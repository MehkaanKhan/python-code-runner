const errorMarker = (() => {
  let activeMark = null;

  function clear() {
    if (activeMark) {
      activeMark.clear();
      activeMark = null;
    }
  }

  function buildWidget(translatedError) {
    const wrap = document.createElement('span');
    wrap.className = 'inline-error-marker';

    const arrow = document.createElement('span');
    arrow.className = 'inline-error-arrow';
    arrow.textContent = ' <-- ';

    const msg = document.createElement('span');
    msg.className = 'inline-error-msg';
    msg.textContent = 'Oops, you missed something?';

    const hintBtn = document.createElement('button');
    hintBtn.type = 'button';
    hintBtn.className = 'inline-error-btn';
    hintBtn.textContent = 'Hint';

    wrap.appendChild(arrow);
    wrap.appendChild(msg);
    wrap.appendChild(document.createTextNode(' '));
    wrap.appendChild(hintBtn);

    hintBtn.addEventListener('click', () => {
      msg.textContent = translatedError.hint;
      hintBtn.remove();

      const answerBtn = document.createElement('button');
      answerBtn.type = 'button';
      answerBtn.className = 'inline-error-btn';
      answerBtn.textContent = 'Want to see the answer?';
      wrap.appendChild(document.createTextNode(' '));
      wrap.appendChild(answerBtn);

      answerBtn.addEventListener('click', () => {
        msg.textContent = translatedError.message;
        answerBtn.remove();
      });
    });

    return wrap;
  }

  function show(editor, translatedError) {
    clear();

    const lineIndex = translatedError.line ? translatedError.line - 1 : 0;
    const clampedLine = Math.min(Math.max(lineIndex, 0), editor.lineCount() - 1);
    const ch = editor.getLine(clampedLine).length;

    const widget = buildWidget(translatedError);
    activeMark = editor.setBookmark({ line: clampedLine, ch }, { widget, insertLeft: false });
  }

  return { show, clear };
})();
