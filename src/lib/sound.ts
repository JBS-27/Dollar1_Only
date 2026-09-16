/**
 * Soft cosmic drone + a single harmonic when a new $1 lands.
 * Starts only after a user gesture (browser autoplay rules).
 */

let context: AudioContext | null = null;
let master: GainNode | null = null;
let droneOsc: OscillatorNode | null = null;
let droneGain: GainNode | null = null;
let lfo: OscillatorNode | null = null;

function ctx(): AudioContext {
  if (!context) {
    context = new AudioContext();
  }
  return context;
}

export function isSoundReady(): boolean {
  return Boolean(master);
}

export async function startAmbient(): Promise<void> {
  const audio = ctx();
  if (audio.state === "suspended") await audio.resume();
  if (master) {
    master.gain.setTargetAtTime(0.045, audio.currentTime, 0.4);
    return;
  }

  master = audio.createGain();
  master.gain.value = 0.0001;
  master.connect(audio.destination);

  droneOsc = audio.createOscillator();
  droneOsc.type = "sine";
  droneOsc.frequency.value = 73;

  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 420;

  droneGain = audio.createGain();
  droneGain.gain.value = 0.7;

  lfo = audio.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.07;
  const lfoGain = audio.createGain();
  lfoGain.gain.value = 8;
  lfo.connect(lfoGain);
  lfoGain.connect(droneOsc.frequency);

  droneOsc.connect(filter);
  filter.connect(droneGain);
  droneGain.connect(master);

  droneOsc.start();
  lfo.start();
  master.gain.setTargetAtTime(0.045, audio.currentTime, 0.8);
}

export async function stopAmbient(): Promise<void> {
  if (!master || !context) return;
  master.gain.setTargetAtTime(0.0001, context.currentTime, 0.25);
}

export function pulseParticipation(): void {
  if (!master || !context) return;
  const audio = context;
  const now = audio.currentTime;

  const osc = audio.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(392, now);
  osc.frequency.exponentialRampToValueAtTime(784, now + 0.18);
  osc.frequency.exponentialRampToValueAtTime(330, now + 1.1);

  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

  osc.connect(gain);
  gain.connect(master);
  osc.start(now);
  osc.stop(now + 1.5);
}
