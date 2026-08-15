const soundEffects = (() => {
  let ctx = null;

  function getContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!ctx) ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(audioCtx, freq, startTime, duration, type, peakGain) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  function playOops() {
    try {
      const audioCtx = getContext();
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      tone(audioCtx, 330, now, 0.16, 'triangle', 0.14);
      tone(audioCtx, 220, now + 0.12, 0.22, 'triangle', 0.14);
    } catch (e) {
      // Sound is decorative — never let it break the app.
    }
  }

  function playYay() {
    try {
      const audioCtx = getContext();
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      tone(audioCtx, 523.25, now, 0.14, 'sine', 0.13);
      tone(audioCtx, 659.25, now + 0.1, 0.14, 'sine', 0.13);
      tone(audioCtx, 783.99, now + 0.2, 0.3, 'sine', 0.15);
    } catch (e) {
      // Sound is decorative — never let it break the app.
    }
  }

  return { playOops, playYay };
})();
