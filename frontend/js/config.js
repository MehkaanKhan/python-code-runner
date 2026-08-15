const API_BASE = 'http://localhost:3000';

const ERROR_TYPES = {
  INDENTATION: 'indentation_error',
  SYNTAX_COLON: 'syntax_error_colon',
  SYNTAX_BRACKET: 'syntax_error_bracket',
  SYNTAX_QUOTE: 'syntax_error_quote',
  SYNTAX_OTHER: 'syntax_error_other',
  NAME: 'name_error',
  TYPE_STR_INT: 'type_error_str_int',
  TYPE_OTHER: 'type_error_other',
  VALUE: 'value_error',
  INDEX: 'index_error',
  KEY: 'key_error',
  ZERO_DIVISION: 'zero_division_error',
  ATTRIBUTE: 'attribute_error',
  IMPORT: 'import_error',
  NAMING_CONVENTION: 'naming_convention',
  OTHER: 'other_error',
};
