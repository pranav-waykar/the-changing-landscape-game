/**
 * The Changing Landscape - Sound Manager
 * 
 * Provides clean, organic Web Audio soundscapes:
 * 1. Gentle grassland wind with subtle natural swell.
 * 2. Clear shepherd call whistle on movement/call.
 * 3. Occasional passing vehicle horn when vehicles pass near sheep.
 * Fully supports instantaneous on/off toggling.
 */

'use strict';

class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isInitialized = false;

    // Audio graph nodes
    this.masterGain = null;
    this.pauseFilter = null;
    this.windGain = null;
    this.windFilter = null;
    this.highwayDroneGain = null;
    this.highwayDroneFilter = null;
    this.trafficIntensity = 0.0;

    // Rate-limiting timers
    this.lastWhistleTime = 0;
    this.lastHornTime = 0;
    this.lastBellTime = 0;
  }

  /**
   * Initializes the Web Audio context upon the first user interaction.
   */
  init() {
    if (this.isInitialized) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this._buildMasterBus();
      this._buildWindSynthesizer();
      this._buildHighwayDrone();
      this.isInitialized = true;
    } catch (err) {
      console.warn('Web Audio API not supported or blocked:', err);
    }
  }

  /**
   * Resumes AudioContext if suspended by browser autoplay policy.
   */
  resumeContext() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Sets up master volume bus and warm filter for deliberation pause.
   * @private
   */
  _buildMasterBus() {
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0.0 : 0.65, this.ctx.currentTime);

    this.pauseFilter = this.ctx.createBiquadFilter();
    this.pauseFilter.type = 'lowpass';
    this.pauseFilter.frequency.setValueAtTime(20000, this.ctx.currentTime);

    this.masterGain.connect(this.pauseFilter);
    this.pauseFilter.connect(this.ctx.destination);
  }

  /**
   * Builds an organic wind synthesizer using filtered noise and a soft swell LFO.
   * @private
   */
  _buildWindSynthesizer() {
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Filtered pink noise algorithm for gentle natural air texture
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.045;
      b1 = 0.99332 * b1 + white * 0.065;
      b2 = 0.96900 * b2 + white * 0.120;
      output[i] = (b0 + b1 + b2) * 0.12;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Warm, gentle bandpass filter
    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
    this.windFilter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    // Soft LFO swell every ~5 seconds
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.18, this.ctx.currentTime);

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(90, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(this.windFilter.frequency);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.28, this.ctx.currentTime);

    noiseSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    lfo.start();
    noiseSource.start();
  }

  /**
   * Builds an ambient low-frequency highway drone for stages with active vehicle traffic.
   * Produces a warm, non-intrusive bed that conveys distant asphalt friction and engine rumble.
   * @private
   */
  _buildHighwayDrone() {
    // 1. Warm sub-bass rumble oscillators
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(64, this.ctx.currentTime);
    osc2.frequency.setValueAtTime(108, this.ctx.currentTime);

    // 2. Continuous asphalt road texture noise
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.15;
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Filter to suppress harshness and isolate warm tire/road hum
    this.highwayDroneFilter = this.ctx.createBiquadFilter();
    this.highwayDroneFilter.type = 'lowpass';
    this.highwayDroneFilter.frequency.setValueAtTime(140, this.ctx.currentTime);
    this.highwayDroneFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    this.highwayDroneGain = this.ctx.createGain();
    this.highwayDroneGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    osc1.connect(this.highwayDroneFilter);
    osc2.connect(this.highwayDroneFilter);
    noiseSource.connect(this.highwayDroneFilter);

    this.highwayDroneFilter.connect(this.highwayDroneGain);
    this.highwayDroneGain.connect(this.masterGain);

    osc1.start();
    osc2.start();
    noiseSource.start();
  }

  /**
   * Updates wind dynamics and highway drone based on development level and pause state.
   * @param {number} developmentLevel
   * @param {boolean} isPaused
   */
  update(developmentLevel, isPaused) {
    if (!this.ctx || !this.isInitialized) return;

    const now = this.ctx.currentTime;

    if (this.isMuted) {
      this.masterGain.gain.setTargetAtTime(0.0, now, 0.05);
      return;
    }

    // Deliberation pause: muffle audio slightly so speech remains completely clear
    if (isPaused) {
      this.pauseFilter.frequency.setTargetAtTime(700, now, 0.1);
      this.masterGain.gain.setTargetAtTime(0.2, now, 0.1);
      if (this.highwayDroneGain) {
        this.highwayDroneGain.gain.setTargetAtTime(0.015, now, 0.15);
      }
      return;
    } else {
      this.pauseFilter.frequency.setTargetAtTime(20000, now, 0.1);
      this.masterGain.gain.setTargetAtTime(0.65, now, 0.1);
    }

    // Wind softly transitions across stages
    const devRatio = MathUtils.clamp(developmentLevel / 6.0, 0, 1);
    const windTargetVolume = Math.max(0.08, 0.28 * (1 - devRatio * 0.5));
    this.windGain.gain.setTargetAtTime(windTargetVolume, now, 0.3);

    // Compute traffic intensity [0, 1] for stages >= 2.0
    this.trafficIntensity = MathUtils.clamp(
      (developmentLevel - CONFIG.TRAFFIC.MIN_DEVELOPMENT_LEVEL) / 4.0,
      0,
      1
    );

    // Dynamic Highway Drone: emerges in Stage 3 and grows with traffic intensity
    if (this.highwayDroneGain) {
      if (developmentLevel < CONFIG.TRAFFIC.MIN_DEVELOPMENT_LEVEL) {
        this.highwayDroneGain.gain.setTargetAtTime(0.0, now, 0.2);
      } else {
        const droneTargetVol = 0.02 + this.trafficIntensity * 0.10;
        this.highwayDroneGain.gain.setTargetAtTime(droneTargetVol, now, 0.3);
        const droneCutoff = MathUtils.lerp(120, 260, this.trafficIntensity);
        this.highwayDroneFilter.frequency.setTargetAtTime(droneCutoff, now, 0.4);
      }
    }
  }

  /**
   * Plays a delicate, soft brass bell chime providing organic auditory feedback when sheep walk.
   * In later highway stages, ambient traffic noise subtly masks and softens the bell sound.
   */
  playSoftSheepBell() {
    if (!this.ctx || !this.isInitialized || this.isMuted) return;

    const now = this.ctx.currentTime;
    if (now - this.lastBellTime < 0.28) return; // Natural walking cadence
    this.lastBellTime = now;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Natural brass bell harmonic pair with subtle pitch variation
    // Acoustic masking: as highway traffic builds, delicate highs are subtly absorbed
    const maskRatio = 1 - this.trafficIntensity * 0.42;
    const baseFreq = (1480 + (Math.random() - 0.5) * 160) * MathUtils.lerp(1.0, 0.90, this.trafficIntensity * 0.25);
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, now);
    osc2.frequency.setValueAtTime(baseFreq * (1.48 - this.trafficIntensity * 0.12), now);

    // Gentle volume attenuated by ambient traffic masking
    const vol = (0.038 + Math.random() * 0.015) * maskRatio;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (0.22 * maskRatio));

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.22);
    osc2.stop(now + 0.22);
  }

  /**
   * Plays a clean, pleasant shepherd call whistle.
   */
  playShepherdWhistle() {
    if (!this.ctx || !this.isInitialized || this.isMuted) return;

    const now = this.ctx.currentTime;
    if (now - this.lastWhistleTime < 0.9) return; // Rate limit whistles
    this.lastWhistleTime = now;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Pure, clear sine whistle sliding gently from 980Hz to 1220Hz
    osc.type = 'sine';
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.exponentialRampToValueAtTime(1220, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(1040, now + 0.28);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.32);
  }

  /**
   * Plays a vehicle horn with frequency and timbre matching the vehicle type.
   * Honking frequency scales dynamically with traffic intensity.
   * @param {number} [trafficIntensity=0.5] [0.0 to 1.0]
   * @param {string} [vehicleType='car'] 'bike' | 'car' | 'truck' | 'bus'
   */
  playVehicleHorn(trafficIntensity = 0.5, vehicleType = 'car') {
    if (!this.ctx || !this.isInitialized || this.isMuted) return;

    const now = this.ctx.currentTime;
    // As traffic intensity increases, honking happens more frequently (from 2.8s down to 0.7s)
    const minInterval = MathUtils.lerp(2.8, 0.7, MathUtils.clamp(trafficIntensity, 0, 1));
    if (now - this.lastHornTime < minInterval) return;
    this.lastHornTime = now;

    const tone1 = this.ctx.createOscillator();
    const tone2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    let f1 = 420;
    let f2 = 525;
    let duration = 0.28;
    let vol = 0.11;

    // Distinct realistic vehicle horn signatures
    if (vehicleType === 'truck' || vehicleType === 'bus') {
      tone1.type = 'triangle';
      tone2.type = 'sine';
      f1 = 285;
      f2 = 356;
      duration = 0.38;
      vol = 0.13;
    } else if (vehicleType === 'bike') {
      tone1.type = 'sine';
      tone2.type = 'sine';
      f1 = 640;
      f2 = 800;
      duration = 0.20;
      vol = 0.08;
    } else {
      // Car
      tone1.type = 'triangle';
      tone2.type = 'sine';
      f1 = 420;
      f2 = 525;
      duration = 0.28;
      vol = 0.11;
    }

    tone1.frequency.setValueAtTime(f1, now);
    tone2.frequency.setValueAtTime(f2, now);

    // Warm double-beep pattern: "peep-peep"
    const halfDur = duration * 0.4;
    const gap = duration * 0.15;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.setValueAtTime(0.001, now + halfDur);
    gain.gain.setValueAtTime(vol, now + halfDur + gap);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    tone1.connect(gain);
    tone2.connect(gain);
    gain.connect(this.masterGain);

    tone1.start(now);
    tone2.start(now);
    tone1.stop(now + duration);
    tone2.stop(now + duration);
  }

  /**
   * Plays a somber collision sound: a low acoustic impact thud followed by a single lingering bell chime that fades away.
   */
  playHitImpact() {
    if (!this.ctx || !this.isInitialized || this.isMuted) return;

    const now = this.ctx.currentTime;

    // 1. Low acoustic impact thud
    const thudOsc = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();

    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(95, now);
    thudOsc.frequency.exponentialRampToValueAtTime(28, now + 0.32);

    thudGain.gain.setValueAtTime(0.24, now);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    thudOsc.connect(thudGain);
    thudGain.connect(this.masterGain);

    thudOsc.start(now);
    thudOsc.stop(now + 0.35);

    // 2. Lingering solitary neck bell chime trailing into silence
    const bellOsc = this.ctx.createOscillator();
    const bellGain = this.ctx.createGain();

    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(1180, now + 0.05);

    bellGain.gain.setValueAtTime(0.001, now);
    bellGain.gain.setValueAtTime(0.09, now + 0.06);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    bellOsc.connect(bellGain);
    bellGain.connect(this.masterGain);

    bellOsc.start(now + 0.05);
    bellOsc.stop(now + 1.2);
  }

  /**
   * Toggles audio mute state.
   * @returns {boolean} New isMuted state
   */
  toggleMute() {
    this.resumeContext();
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0.0 : 0.65, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }
}
