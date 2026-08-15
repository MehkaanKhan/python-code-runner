const fs = require('fs');
const path = require('path');
const express = require('express');
const { getStats } = require('../db');

const router = express.Router();

const ERROR_LABELS = {
  indentation_error: 'Indentation error',
  syntax_error_colon: 'Missing colon',
  syntax_error_bracket: 'Bracket/parenthesis mismatch',
  syntax_error_quote: 'Unclosed quotation mark',
  syntax_error_other: 'Other syntax error',
  name_error: 'Undefined variable (NameError)',
  type_error_str_int: 'Mixed number/text (TypeError)',
  type_error_other: 'Other TypeError',
  value_error: 'Invalid value (ValueError)',
  index_error: 'List index out of range',
  key_error: 'Missing dictionary key',
  zero_division_error: 'Division by zero',
  attribute_error: 'Invalid attribute (AttributeError)',
  import_error: 'Missing module (ImportError)',
  naming_convention: 'Naming convention tip',
  other_error: 'Other error',
};

function renderErrorRows(errorBreakdown) {
  return Object.entries(errorBreakdown)
    .map(
      ([type, count]) =>
        `<tr><td>${ERROR_LABELS[type] || type}</td><td>${count}</td></tr>`
    )
    .join('\n');
}

router.get('/admin', (req, res) => {
  const stats = getStats();
  const templatePath = path.join(__dirname, '..', '..', 'views', 'admin.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  html = html
    .replace('{{TOTAL_SESSIONS}}', stats.total_sessions)
    .replace('{{TOTAL_RUNS}}', stats.total_runs)
    .replace('{{SUCCESSFUL_RUNS}}', stats.successful_runs)
    .replace('{{ERROR_ROWS}}', renderErrorRows(stats.error_breakdown));

  res.type('html').send(html);
});

router.get('/api/stats', (req, res) => {
  res.json(getStats());
});

router.get('/api/export.json', (req, res) => {
  res.json(getStats());
});

router.get('/api/export.csv', (req, res) => {
  const stats = getStats();
  const lines = [
    'metric,value',
    `total_sessions,${stats.total_sessions}`,
    `total_runs,${stats.total_runs}`,
    `successful_runs,${stats.successful_runs}`,
    '',
    'error_type,count',
    ...Object.entries(stats.error_breakdown).map(([type, count]) => `${type},${count}`),
  ];
  const csv = lines.join('\n');

  res.set('Content-Type', 'text/csv');
  res.set('Content-Disposition', 'attachment; filename="usage-stats.csv"');
  res.send(csv);
});

module.exports = router;
