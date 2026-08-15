const express = require('express');
const { insertEvent } = require('../db');
const { VALID_EVENT_TYPES, VALID_ERROR_TYPES } = require('../errorTypes');

const router = express.Router();

const SESSION_ID_RE = /^[A-Za-z0-9-]{8,64}$/;

router.post('/events', (req, res) => {
  const { event_type, error_type, session_id } = req.body || {};

  if (!VALID_EVENT_TYPES.includes(event_type)) {
    return res.status(400).json({ error: 'invalid event_type' });
  }
  if (error_type !== undefined && error_type !== null && !VALID_ERROR_TYPES.includes(error_type)) {
    return res.status(400).json({ error: 'invalid error_type' });
  }
  if (typeof session_id !== 'string' || !SESSION_ID_RE.test(session_id)) {
    return res.status(400).json({ error: 'invalid session_id' });
  }

  insertEvent(event_type, error_type ?? null, session_id);
  res.status(204).end();
});

module.exports = router;
