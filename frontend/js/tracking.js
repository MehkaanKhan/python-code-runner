const tracking = (() => {
  function getSessionId() {
    let id = sessionStorage.getItem('py_runner_session_id');
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem('py_runner_session_id', id);
    }
    return id;
  }

  function sendEvent(eventType, errorType) {
    fetch(`${API_BASE}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: eventType,
        error_type: errorType ?? null,
        session_id: getSessionId(),
      }),
    }).catch(() => {});
  }

  function logSessionStart() {
    sendEvent('session_start', null);
  }

  function logRunPressed(errorType) {
    sendEvent('run_pressed', errorType);
  }

  return { logSessionStart, logRunPressed };
})();
