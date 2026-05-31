let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

/** Pleasant two-tone chime for incoming notifications. */
export function playNotificationSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    const tones = [
      { freq: 880, start: 0, duration: 0.12 },
      { freq: 1174.66, start: 0.14, duration: 0.18 },
    ];

    for (const tone of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = tone.freq;
      gain.gain.setValueAtTime(0.0001, now + tone.start);
      gain.gain.exponentialRampToValueAtTime(0.25, now + tone.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.start + tone.duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + tone.start);
      osc.stop(now + tone.start + tone.duration + 0.05);
    }
  } catch {
    // Audio may be blocked until user interaction — fail silently
  }
}

/** Call once after a user gesture so later socket sounds can play. */
export function primeNotificationSound(): void {
  try {
    const ctx = getAudioContext();
    if (ctx?.state === 'suspended') {
      void ctx.resume();
    }
  } catch {
    // ignore
  }
}
