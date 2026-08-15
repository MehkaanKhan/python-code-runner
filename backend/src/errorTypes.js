const VALID_EVENT_TYPES = ['session_start', 'run_pressed'];

const VALID_ERROR_TYPES = [
  'indentation_error',
  'syntax_error_colon',
  'syntax_error_bracket',
  'syntax_error_quote',
  'syntax_error_other',
  'name_error',
  'type_error_str_int',
  'type_error_other',
  'value_error',
  'index_error',
  'key_error',
  'zero_division_error',
  'attribute_error',
  'import_error',
  'naming_convention',
  'other_error',
];

module.exports = { VALID_EVENT_TYPES, VALID_ERROR_TYPES };
