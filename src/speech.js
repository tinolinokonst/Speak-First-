// src/speech.js — shared Web Speech helpers (TTS + recognition).
// Extracted from App.jsx so the main conversation screen and the landing-page
// demo use ONE implementation. The browser owns a single speech engine, so
// module-level state (instead of per-component refs) is correct here.

let pendingSpeak = null; // deferred voiceschanged listener, so it can be cancelled
let speakVersion = 0;    // incremented on every speak(); stale callbacks bail

// Cancels all in-progress and queued speech; any doSpeak callback already
// scheduled (via setTimeout or voiceschanged) sees a stale version and bails.
export function stopAllSpeech() {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  speakVersion++;
  if (pendingSpeak) {
    window.speechSynthesis.removeEventListener("voiceschanged", pendingSpeak);
    pendingSpeak = null;
  }
}

// Hardened Web Speech API wrapper.
// Fixes: (1) voices load async — wait for voiceschanged before speaking;
//        (2) engine stall on backgrounded tabs — resume() if paused;
//        (3) missing Spanish voice — fall back to system default rather than fail silently;
//        (4) Chrome cancel() is async — version guard + 50ms delay prevent stale/overlapping audio.
export function speak(text) {
  if (!window.speechSynthesis) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  if (synth.paused) synth.resume();

  if (pendingSpeak) {
    synth.removeEventListener("voiceschanged", pendingSpeak);
    pendingSpeak = null;
  }

  // Stamp this speak() call; any older doSpeak callbacks will see a mismatch and exit.
  const version = ++speakVersion;

  const doSpeak = () => {
    if (speakVersion !== version) return;
    pendingSpeak = null;
    // Strip pictographic emoji (and their variation selectors / ZWJ sequences) so
    // the browser never reads "cara sonriente" or similar emoji names aloud.
    const spoken = text
      .replace(/\p{Extended_Pictographic}[︀-️‍]*/gu, "")
      .replace(/ {2,}/g, " ")
      .trim();
    const u = new SpeechSynthesisUtterance(spoken);
    u.lang = "es-ES";
    u.rate = 0.95;
    const voices = synth.getVoices();
    const spanish = voices.find((v) => v.lang.startsWith("es"));
    if (spanish) u.voice = spanish;
    synth.speak(u);
  };

  if (synth.getVoices().length > 0) {
    // 50ms lets Chrome's async cancel() take effect before the new utterance
    // starts, preventing the cancelled audio from briefly stacking with it.
    setTimeout(doSpeak, 50);
  } else {
    // Voice list is often empty on first call in Chrome — defer until ready.
    pendingSpeak = doSpeak;
    synth.addEventListener("voiceschanged", doSpeak, { once: true });
  }
}

// True when this browser can do speech recognition at all.
export function recognitionSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// Builds a one-shot Spanish recognizer. Returns null when unsupported.
// onError receives the raw event — check event.error === "not-allowed" /
// "service-not-allowed" to detect denied mic permission.
export function createRecognizer({ onResult, onEnd, onError }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = "es-ES";
  r.interimResults = false;
  r.maxAlternatives = 1;
  r.onresult = (e) => onResult(e.results[0][0].transcript);
  r.onend = () => onEnd && onEnd();
  r.onerror = (e) => onError && onError(e);
  return r;
}
