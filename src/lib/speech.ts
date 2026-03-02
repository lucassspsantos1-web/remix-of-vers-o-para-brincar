/**
 * Announces a driver name and bench number via speech synthesis.
 * Does NOT cancel ongoing speech — the caller (processQueue) is responsible
 * for ensuring only one announcement runs at a time.
 */
export function announceDriver(driverName: string, benchNumber: number): Promise<void> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) {
      resolve();
      return;
    }

    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      resolve();
    };

    const utterance = new SpeechSynthesisUtterance(
      `Motorista ${driverName}, dirija-se à bancada ${benchNumber}`
    );
    utterance.lang = "pt-BR";
    utterance.rate = 0.9;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find((v) => v.lang.startsWith("pt"));
    if (ptVoice) utterance.voice = ptVoice;

    utterance.onend = done;
    utterance.onerror = done;

    // Safety timeout in case onend never fires (15s max)
    const timeout = setTimeout(done, 15000);

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Cancels all pending and ongoing speech synthesis immediately.
 * Call this only when the user explicitly disables audio.
 */
export function cancelSpeech() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
