/**
 * Generates a short, clear alert tone using the Web Audio API.
 * No external audio files needed.
 */
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

/** Must be called from a user gesture to unlock audio on mobile browsers. */
export function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    ctx.resume();
  }
  // Play a silent buffer to unlock
  const buf = ctx.createBuffer(1, 1, 22050);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start(0);
}

/** Stop all audio: suspend AudioContext and cancel speech synthesis. */
export function stopAllAudio() {
  if (audioCtx && audioCtx.state === "running") {
    audioCtx.suspend();
  }
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Play a pleasant two-tone chime alert.
 * @param volume 0-1
 */
export function playAlertSound(volume = 0.5) {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") return; // not unlocked yet

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume * 0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
  gain.connect(ctx.destination);

  // First tone
  const osc1 = ctx.createOscillator();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(880, now); // A5
  osc1.connect(gain);
  osc1.start(now);
  osc1.stop(now + 0.3);

  // Second tone (higher, delayed)
  const gain2 = ctx.createGain();
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.setValueAtTime(volume * 0.35, now + 0.15);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
  gain2.connect(ctx.destination);

  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(1108.73, now + 0.15); // C#6
  osc2.connect(gain2);
  osc2.start(now + 0.15);
  osc2.stop(now + 0.5);
}
