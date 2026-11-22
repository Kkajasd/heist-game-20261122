// WebAudio sound effects for The Velvet Vault, one job: every beep and chime
// the game needs, synthesized live, no audio files, no network. The context
// is created on the first user gesture (browsers demand that); shot staging
// never creates one, so screenshots stay silent and deterministic.
export function createAudio() {
  let context = null;
  let muted = false;
  let alarmOscillator = null;
  let alarmGain = null;

  function ensureContext() {
    if (context) return context;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      context = new AC();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = 0) {
    const ctx = ensureContext();
    if (!ctx || muted) return;
    try {
      if (ctx.state === 'suspended') void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + when;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), start + dur);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(vol, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.05);
    } catch {
      /* sound is decoration; a failed beep never breaks the game */
    }
  }

  function startAlarmHum() {
    const ctx = ensureContext();
    if (!ctx || muted || alarmOscillator) return;
    try {
      alarmOscillator = ctx.createOscillator();
      alarmGain = ctx.createGain();
      alarmOscillator.type = 'sawtooth';
      alarmOscillator.frequency.value = 110;
      alarmGain.gain.value = 0.0;
      alarmOscillator.connect(alarmGain).connect(ctx.destination);
      alarmOscillator.start();
    } catch {
      alarmOscillator = null;
      alarmGain = null;
    }
  }

  function stopAlarmHum() {
    if (alarmOscillator) {
      try {
        alarmOscillator.stop();
      } catch {
        /* already stopped */
      }
      alarmOscillator = null;
      alarmGain = null;
    }
  }

  return {
    unlock() {
      ensureContext();
    },
    toggleMute() {
      muted = !muted;
      if (muted) stopAlarmHum();
      return muted;
    },
    isMuted() {
      return muted;
    },
    playPickup() {
      tone(880, 0.09, 'sine', 0.12);
      tone(1318, 0.12, 'sine', 0.1, 0.07);
    },
    playDiamond() {
      tone(1046, 0.1, 'triangle', 0.12);
      tone(1318, 0.1, 'triangle', 0.12, 0.08);
      tone(1568, 0.16, 'triangle', 0.12, 0.16);
    },
    playPebble() {
      tone(300, 0.08, 'square', 0.05, 0, 180);
    },
    playCaught() {
      tone(220, 0.5, 'sawtooth', 0.14, 0, 55);
      tone(110, 0.5, 'square', 0.08, 0.05, 40);
    },
    playWin() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.12, i * 0.11));
    },
    playLevelClear() {
      [659, 784, 988].forEach((f, i) => tone(f, 0.15, 'triangle', 0.11, i * 0.09));
    },
    playClick() {
      tone(660, 0.05, 'sine', 0.07);
    },
    playAlarmTick() {
      tone(1200, 0.06, 'square', 0.05);
    },
    updateAlarmHum(alarmLevel) {
      if (muted || alarmLevel < 30) {
        stopAlarmHum();
        return;
      }
      startAlarmHum();
      if (alarmGain) {
        alarmGain.gain.value = 0.015 + (alarmLevel / 100) * 0.035;
      }
      if (alarmOscillator) {
        alarmOscillator.frequency.value = 110 + alarmLevel * 1.4;
      }
    },
  };
}
