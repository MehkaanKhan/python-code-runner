const errorTranslator = (() => {
  const LINE_RE = /File "<exec>",\s*line (\d+)/g;
  const EXC_LINE_RE = /^([A-Za-z_][A-Za-z0-9_.]*):\s?(.*)$/;
  const BLOCK_HEADER_RE = /^\s*(if|elif|else|for|while|def|class|try|except|finally|with)\b/;

  const CLOSE_FOR = { '(': ')', '[': ']', '{': '}' };

  const STR_INT_PATTERNS = [
    /can only concatenate str \(not "(.*?)"\) to str/,
    /unsupported operand type\(s\) for [+\-*/]: '(int|float)' and '(str)'/,
    /unsupported operand type\(s\) for [+\-*/]: '(str)' and '(int|float)'/,
    /must be str, not (int|float)/,
    /must be (int|float), not str/,
  ];

  function extractLine(tracebackText) {
    let match;
    let lastLine = null;
    LINE_RE.lastIndex = 0;
    while ((match = LINE_RE.exec(tracebackText)) !== null) {
      lastLine = parseInt(match[1], 10);
    }
    return lastLine;
  }

  function extractException(tracebackText) {
    const lines = tracebackText.split('\n').map((l) => l.trim()).filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
      const m = EXC_LINE_RE.exec(lines[i]);
      if (m) return { type: m[1], message: m[2] };
    }
    return null;
  }

  function sourceLineAt(source, line) {
    if (!line) return '';
    return (source.split('\n')[line - 1] || '');
  }

  // ---- indentation ----

  function describeIndentationSpacing(line, source) {
    const lines = source.split('\n');
    const cur = lines[line - 1] || '';
    const curIndent = (cur.match(/^[ \t]*/) || [''])[0].length;

    let prevIndent = null;
    for (let i = line - 2; i >= 0; i--) {
      if (lines[i].trim() !== '') {
        prevIndent = (lines[i].match(/^[ \t]*/) || [''])[0].length;
        break;
      }
    }
    if (prevIndent === null) return null;

    const diff = curIndent - prevIndent;
    if (diff === 0) return null;
    if (diff > 0) {
      return `This line has ${diff} extra space${diff === 1 ? '' : 's'} at the front compared to the line above it — remove ${diff === 1 ? 'it' : 'them'} so they line up.`;
    }
    return `This line is missing ${-diff} space${-diff === 1 ? '' : 's'} at the front compared to the line above it — add ${-diff === 1 ? 'it' : 'them'} so they line up.`;
  }

  function buildIndentationMessage(excMessage, line, source) {
    if (/expected an indented block/.test(excMessage)) {
      return 'This line needs to be indented — code inside if/for/while/def must be indented (usually 4 spaces) more than the line above.';
    }
    if (/unexpected indent/.test(excMessage)) {
      return "This line has extra spaces at the front that shouldn't be there — remove them so it lines up with the line above.";
    }
    if (/unindent does not match any outer indentation level/.test(excMessage)) {
      return "This line's spacing doesn't match any of the levels above it — check exactly how many spaces the lines around it use.";
    }
    return describeIndentationSpacing(line, source) || 'Your spacing is off. Make this line line up with the lines around it.';
  }

  // ---- syntax: colon / bracket / quote / other ----

  function isMissingColon(excMessage, line, source) {
    if (/expected ':'/.test(excMessage)) return true;
    if (!line) return false;
    const codeLine = sourceLineAt(source, line).trim();
    return BLOCK_HEADER_RE.test(codeLine) && !codeLine.endsWith(':');
  }

  function bracketDetail(excMessage) {
    let m = /'([([{])' was never closed/.exec(excMessage);
    if (m) return { kind: 'unclosed', open: m[1], close: CLOSE_FOR[m[1]] };

    m = /unmatched '([)\]}])'/.exec(excMessage);
    if (m) return { kind: 'unmatched', close: m[1] };

    m = /closing parenthesis '([)\]}])' does not match opening parenthesis '([([{])'/.exec(excMessage);
    if (m) return { kind: 'mismatch', close: m[1], open: m[2], expectedClose: CLOSE_FOR[m[2]] };

    if (/parenthes|bracket|brace/i.test(excMessage)) return { kind: 'generic' };
    return null;
  }

  function buildBracketMessage(detail) {
    if (detail.kind === 'unclosed') {
      return `You opened with '${detail.open}' but never added the matching '${detail.close}'. Add the missing '${detail.close}'.`;
    }
    if (detail.kind === 'unmatched') {
      return `There's an extra '${detail.close}' here that doesn't have a matching opening bracket. Remove it, or add the missing opener.`;
    }
    if (detail.kind === 'mismatch') {
      return `You opened with '${detail.open}' but closed with '${detail.close}' — they need to match. Use '${detail.expectedClose}' instead.`;
    }
    return 'Check your brackets/parentheses on this line — one might be missing or extra.';
  }

  function detectQuoteChar(sourceLine) {
    const singleCount = (sourceLine.match(/'/g) || []).length;
    const doubleCount = (sourceLine.match(/"/g) || []).length;
    if (singleCount % 2 === 1) return "'";
    if (doubleCount % 2 === 1) return '"';
    return null;
  }

  function buildSyntaxOtherMessage(excMessage) {
    let m = /Perhaps you forgot (.+?)\?/.exec(excMessage);
    if (m) return `Looks like you forgot ${m[1]} on this line.`;

    m = /Maybe you meant (.+?)\?/.exec(excMessage);
    if (m) return `Did you mean ${m[1]} on this line?`;

    m = /invalid character '(.+?)'/.exec(excMessage);
    if (m) return `There's a character on this line Python doesn't understand: '${m[1]}'. It might have been pasted in from somewhere else — try retyping it.`;

    return "There's a small typo or mistake somewhere on this line — read it carefully, character by character.";
  }

  // ---- name errors ----

  function extractSuggestion(excMessage) {
    const m = /Did you mean:? '(.+?)'\??/.exec(excMessage);
    return m ? m[1] : null;
  }

  function buildNameErrorMessage(excMessage) {
    const m = /name '(.+?)' is not defined/.exec(excMessage);
    const name = m ? m[1] : null;
    const suggestion = extractSuggestion(excMessage);

    if (name && suggestion) {
      if (name.toLowerCase() === suggestion.toLowerCase()) {
        return `You wrote '${name}', but Python cares about capital and lowercase letters — they're not the same. Did you mean '${suggestion}' (all lowercase)?`;
      }
      return `You wrote '${name}', but that doesn't exist — it's probably a typo. Did you mean '${suggestion}'?`;
    }
    if (name) {
      return `You used '${name}', but it hasn't been created yet — probably a typo. Check the spelling, or make sure you set ${name} = ... before this line.`;
    }
    return "You used a name that doesn't exist yet — probably a typo. Check your spelling, or make sure you created it first.";
  }

  function buildUnboundLocalMessage(excMessage) {
    const m = /(?:local |cell )?variable '(.+?)' (?:referenced before assignment|where it is not associated with a value)/.exec(excMessage);
    const name = m ? m[1] : null;
    if (name) {
      return `You used '${name}' before giving it a value inside this block. Make sure you set ${name} = ... first.`;
    }
    return 'You used a variable before giving it a value.';
  }

  function article(word) {
    return /^[aeiou]/i.test(word) ? 'an' : 'a';
  }

  function capitalizedArticle(word) {
    return article(word) === 'an' ? 'An' : 'A';
  }

  // ---- type errors ----

  function strIntDetail(excMessage) {
    for (const re of STR_INT_PATTERNS) {
      if (re.test(excMessage)) return true;
    }
    return false;
  }

  function buildTypeOtherMessage(excMessage) {
    let m = /'(.+?)' object is not callable/.exec(excMessage);
    if (m) return `You added () after ${article(m[1])} ${m[1]}, but that isn't something you can 'call' like a function. Check if you meant to use it differently.`;

    m = /missing \d+ required positional argument[s]?: (.+)/.exec(excMessage);
    if (m) return `You called a function but didn't give it everything it needs — missing: ${m[1]}. Check what goes inside the parentheses.`;

    m = /takes (\d+) positional argument[s]? but (\d+) (?:was|were) given/.exec(excMessage);
    if (m) return `This function expects ${m[1]} value(s), but you gave it ${m[2]}. Check what's inside the parentheses.`;

    m = /'(.+?)' object is not subscriptable/.exec(excMessage);
    if (m) return `You used [ ] on ${article(m[1])} ${m[1]}, but that doesn't support it. Check what kind of value you're working with.`;

    m = /object of type '(.+?)' has no len\(\)/.exec(excMessage);
    if (m) return `You used len() on a ${m[1]}, but that doesn't have a length. Check what you're passing to len().`;

    return "Something about how you're combining or using values here doesn't work. Check the types of things you're using (numbers, text, lists).";
  }

  // ---- value / index / key / zero-division / attribute / import ----

  function buildValueErrorMessage(excMessage) {
    let m = /invalid literal for int\(\) with base \d+: '(.*)'/.exec(excMessage);
    if (m) return `You tried to turn '${m[1]}' into a whole number with int(), but it isn't a valid number. Check what's inside int(...).`;

    m = /could not convert string to float: '(.*)'/.exec(excMessage);
    if (m) return `You tried to turn '${m[1]}' into a decimal number with float(), but it isn't a valid number. Check what's inside float(...).`;

    if (/not enough values to unpack/.test(excMessage)) {
      return "You're trying to split something into more variables than it has values for. Check that the number of variables matches the number of items.";
    }
    if (/too many values to unpack/.test(excMessage)) {
      return "You're trying to split something into fewer variables than it has values. Check that the number of variables matches the number of items.";
    }
    return "One of your values isn't in the format Python expected here. Double-check what you're passing in.";
  }

  function buildAttributeErrorMessage(excMessage) {
    const m = /'(.+?)' object has no attribute '(.+?)'/.exec(excMessage);
    if (m) {
      const suggestion = extractSuggestion(excMessage);
      if (suggestion) {
        return `You wrote '.${m[2]}', but that's probably a typo. Did you mean '.${suggestion}'?`;
      }
      return `${capitalizedArticle(m[1])} ${m[1]} doesn't have '.${m[2]}' — that belongs to a different kind of value. Double-check what kind of thing you're working with.`;
    }
    return "You tried to use something (like .append or .upper) that doesn't exist on this kind of value.";
  }

  function buildImportErrorMessage(excMessage) {
    const m = /No module named '(.+?)'/.exec(excMessage);
    if (m) {
      return `Python couldn't find something called '${m[1]}'. Check the spelling — it might also just not be available here.`;
    }
    return "Python couldn't import something on this line. Check the name you're importing.";
  }

  function buildKeyErrorMessage(excMessage) {
    const key = excMessage.trim().replace(/^'(.*)'$/, '$1');
    return `There's no item called '${key}' in that dictionary. Check the spelling, or make sure you added it first.`;
  }

  // ---- main dispatch ----

  function translate(tracebackText, source) {
    const line = extractLine(tracebackText);
    const exc = extractException(tracebackText);
    const codeLine = sourceLineAt(source, line);

    if (!exc) {
      return {
        category: ERROR_TYPES.OTHER,
        line,
        hint: 'Look closely at this part of your code — does anything look off?',
        message: "Something's not right here. Take another look at your code.",
      };
    }

    if (exc.type === 'IndentationError' || exc.type === 'TabError') {
      return {
        category: ERROR_TYPES.INDENTATION,
        line,
        hint: 'Look at the spaces before this line — do they match the lines around it?',
        message: buildIndentationMessage(exc.message, line, source),
      };
    }

    if (exc.type === 'SyntaxError') {
      if (isMissingColon(exc.message, line, source)) {
        return {
          category: ERROR_TYPES.SYNTAX_COLON,
          line,
          hint: 'Check the very end of this line — is something missing?',
          message: "You forgot a ':' at the end of this line.",
        };
      }

      const bracket = bracketDetail(exc.message);
      if (bracket) {
        return {
          category: ERROR_TYPES.SYNTAX_BRACKET,
          line,
          hint: 'Count your brackets/parentheses on this line — does every opening one have a matching closing one?',
          message: buildBracketMessage(bracket),
        };
      }

      if (/unterminated (triple-quoted )?string literal|EOL while scanning string literal/.test(exc.message)) {
        const quote = detectQuoteChar(codeLine) || "' or \"";
        return {
          category: ERROR_TYPES.SYNTAX_QUOTE,
          line,
          hint: 'Check your quotation marks on this line — did you close the one you opened?',
          message: `You started some text with ${quote} but never added the matching closing ${quote}.`,
        };
      }

      return {
        category: ERROR_TYPES.SYNTAX_OTHER,
        line,
        hint: 'Read this line slowly, character by character — something small might be off, like a missing comma or extra symbol.',
        message: buildSyntaxOtherMessage(exc.message),
      };
    }

    if (exc.type === 'NameError') {
      return {
        category: ERROR_TYPES.NAME,
        line,
        hint: 'Check every name on this line — have you used it before, and does it look exactly the same?',
        message: buildNameErrorMessage(exc.message),
      };
    }

    if (exc.type === 'UnboundLocalError') {
      return {
        category: ERROR_TYPES.NAME,
        line,
        hint: 'Check if this variable was given a value earlier in this same block.',
        message: buildUnboundLocalMessage(exc.message),
      };
    }

    if (exc.type === 'TypeError') {
      if (strIntDetail(exc.message)) {
        return {
          category: ERROR_TYPES.TYPE_STR_INT,
          line,
          hint: "You're combining two different kinds of things here — words and numbers don't mix directly.",
          message: 'You mixed words and numbers. Try putting str() around the number, like str(5).',
        };
      }
      return {
        category: ERROR_TYPES.TYPE_OTHER,
        line,
        hint: 'Check how many things you\'re giving here, and what kind of values they are (number, text, list...).',
        message: buildTypeOtherMessage(exc.message),
      };
    }

    if (exc.type === 'ValueError') {
      return {
        category: ERROR_TYPES.VALUE,
        line,
        hint: 'Check the value you\'re trying to convert or use here — is it in the format Python expects?',
        message: buildValueErrorMessage(exc.message),
      };
    }

    if (exc.type === 'IndexError') {
      return {
        category: ERROR_TYPES.INDEX,
        line,
        hint: 'Think about how many items are in your list, and remember counting starts at 0.',
        message: "You tried to grab an item using a position that doesn't exist. Remember lists start counting at 0 — check your number.",
      };
    }

    if (exc.type === 'KeyError') {
      return {
        category: ERROR_TYPES.KEY,
        line,
        hint: "Check the exact name you're looking up — does it match one that's actually there?",
        message: buildKeyErrorMessage(exc.message),
      };
    }

    if (exc.type === 'ZeroDivisionError') {
      return {
        category: ERROR_TYPES.ZERO_DIVISION,
        line,
        hint: "Look at what you're dividing by on this line.",
        message: "You tried to divide by 0, which isn't allowed in math. Check what's on the bottom of your division (or after %).",
      };
    }

    if (exc.type === 'AttributeError') {
      return {
        category: ERROR_TYPES.ATTRIBUTE,
        line,
        hint: 'Check what kind of value you\'re using here — not every kind of value can do the same things.',
        message: buildAttributeErrorMessage(exc.message),
      };
    }

    if (exc.type === 'ModuleNotFoundError' || exc.type === 'ImportError') {
      return {
        category: ERROR_TYPES.IMPORT,
        line,
        hint: "Double-check the name of what you're trying to import.",
        message: buildImportErrorMessage(exc.message),
      };
    }

    return {
      category: ERROR_TYPES.OTHER,
      line,
      hint: "Something on this line didn't work the way Python expected. Try reading it slowly, step by step.",
      message: "Something's not right here. Take another look at this line.",
    };
  }

  return { translate };
})();
