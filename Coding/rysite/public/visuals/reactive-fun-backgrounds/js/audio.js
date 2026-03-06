/**
 * Microphone beat-detection helper.
 * Exposes energy (0-1), kick flag, and a rolling-average BPM each frame.
 */

let audioCtx = null;
let analyser = null;
let dataArray = null;
let stream = null;
let enabled = false;

// Smoothed energy + simple onset detection
let energy = 0;
let smoothEnergy = 0;
let kick = false;
const SMOOTH = 0.82;
const KICK_THRESHOLD = 0.35;
const KICK_DECAY = 0.92;
let kickCooldown = 0;

// BPM tracking
const beatTimes = [];
const MAX_BEAT_HISTORY = 8;
let _bpm = 0;

export async function startMic() {
  if (enabled) return true;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    enabled = true;
    return true;
  } catch {
    return false;
  }
}

export function stopMic() {
  if (stream) stream.getTracks().forEach(t => t.stop());
  if (audioCtx) audioCtx.close();
  stream = null;
  audioCtx = null;
  analyser = null;
  enabled = false;
  energy = 0;
  smoothEnergy = 0;
  kick = false;
  beatTimes.length = 0;
  _bpm = 0;
}

/** Call once per frame. Returns { energy: 0-1, kick: bool } */
export function sample() {
  if (!enabled || !analyser) return { energy: 0, kick: false };

  analyser.getByteFrequencyData(dataArray);

  // Focus on low frequencies (bass) for beat detection
  let sum = 0;
  const bassEnd = Math.floor(dataArray.length * 0.25);
  for (let i = 0; i < bassEnd; i++) sum += dataArray[i];
  const raw = sum / (bassEnd * 255);

  energy = raw;
  const prev = smoothEnergy;
  smoothEnergy = SMOOTH * smoothEnergy + (1 - SMOOTH) * raw;

  // Onset = energy jump above smoothed average
  kickCooldown *= KICK_DECAY;
  if (raw - prev > KICK_THRESHOLD && kickCooldown < 0.1) {
    kick = true;
    kickCooldown = 1;

    // Record beat time and update BPM estimate
    const now = performance.now();
    beatTimes.push(now);
    if (beatTimes.length > MAX_BEAT_HISTORY) beatTimes.shift();

    if (beatTimes.length >= 3) {
      const intervals = [];
      for (let i = 1; i < beatTimes.length; i++) {
        const iv = beatTimes[i] - beatTimes[i - 1];
        if (iv > 250 && iv < 2500) intervals.push(iv); // filter outliers
      }
      if (intervals.length >= 2) {
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const rawBpm = 60000 / avg;
        if (rawBpm > 40 && rawBpm < 220) {
          _bpm = _bpm * 0.8 + rawBpm * 0.2; // smooth toward new estimate
        }
      }
    }
  } else {
    kick = false;
  }

  return { energy, kick };
}

/** Returns the smoothed BPM estimate (0 if not enough data yet). */
export function getBPM() { return _bpm; }

export function isEnabled() { return enabled; }
