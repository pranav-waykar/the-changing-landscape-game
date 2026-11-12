/**
 * The Changing Landscape - Procedural Sound Manager
 * 
 * Synthesizes an evolving, zero-dependency soundscape via the Web Audio API.
 * Transitions from the open pastoral acoustic space of the grassland (wind, bells, shepherd calls)
 * to the aggressive mechanical soundscape of the highway (asphalt drone, vehicle Doppler whooshes, horns).
 */

'use strict';

class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isInitialized = false;

    // Audio graph nodes
    this.masterGain = null;
    this.windGain = null;
    this.windFilter = null;
    this.roadGain = null;
    this.roadFilter = null;

    // Timers & throttle state
    this.lastWhistleTime = 0;
    this.lastBellTime = 0;
    this.lastHornTime = 0;
  }

  /**
   * Initializes the AudioContext upon the first user gesture.
   */
  init() {
    if (this.isInitialized) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this._buildMasterBus();
      this._buildWindSynthesizer();
      this._buildRoadRumbleSynthesizer();
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
   * Builds the master gain bus and ducking filter for pause states.
   * @private
   */
  _buildMasterBus() {
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);

    this.pauseFilter = this.ctx.createBiquadFilter();
    this.pauseFilter.type = 'lowpass';
    this.pauseFilter.frequency.setValueAtTime(20000, this.ctx.currentTime);

    this.masterGain.connect(this.pauseFilter);
    this.pauseFilter.connect(this.ctx.destination);
  }

  /**
   * Builds a procedural wind generator using filtered noise and an LFO.
   * @private
   */
  _buildWindSynthesizer() {
    // Generate 2 seconds of pink/white noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2) * 0.15;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Resonant bandpass filter to give wind resonance
    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.setValueAtTime(380, this.ctx.currentTime);
    this.windFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

    // LFO to simulate wind gusts
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.22, this.ctx.currentTime); // Gentle swell every ~4.5 seconds

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(140, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(this.windFilter.frequency);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    noiseSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    lfo.start();
    noiseSource.start();
  }

  /**
   * Builds the low-frequency asphalt and tire friction rumble.
   * @private
   */
  _buildRoadRumbleSynthesizer() {
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.2;
    }

    const roadNoise = this.ctx.createBufferSource();
    roadNoise.buffer = noiseBuffer;
    roadNoise.loop = true;

    this.roadFilter = this.ctx.createBiquadFilter();
    this.roadFilter.type = 'lowpass';
    this.roadFilter.frequency.setValueAtTime(90, this.ctx.currentTime);

    this.roadGain = this.ctx.createGain();
    this.roadGain.gain.setValueAtTime(0.0, this.ctx.currentTime); // Silent at start

    roadNoise.connect(this.roadFilter);
    this.roadFilter.connect(this.roadGain);
    this.roadGain.connect(this.masterGain);

    roadNoise.start();
  }

  /**
   * Updates ambient soundscape volumes and filter frequencies based on development level.
   * @param {number} developmentLevel [0.0 to 6.0]
   * @param {boolean} isPaused
   */
  update(developmentLevel, isPaused) {
    if (!this.ctx || !this.isInitialized) return;

    const now = this.ctx.currentTime;

    // Handle pause ducking: reduce volume and muffle high frequencies during deliberation
    if (isPaused) {
      this.pauseFilter.frequency.setTargetAtTime(600, now, 0.1);
      this.masterGain.gain.setTargetAtTime(0.25, now, 0.1);
      return;
    } else {
      this.pauseFilter.frequency.setTargetAtTime(20000, now, 0.1);
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0.0 : 0.7, now, 0.1);
    }

    const devRatio = MathUtils.clamp(developmentLevel / 6.0, 0, 1);

    // Wind gradually diminishes as highway infrastructure takes over
    const windTargetVolume = Math.max(0.04, 0.35 * (1 - devRatio * 0.8));
    this.windGain.gain.setTargetAtTime(windTargetVolume, now, 0.2);

    // Road rumble ramps up starting at stage 2 (devLevel >= 1.0)
    if (developmentLevel >= 1.0) {
      const roadIntensity = MathUtils.clamp((developmentLevel - 1.0) / 4.0, 0, 1);
      const rumbleVolume = 0.45 * Math.pow(roadIntensity, 1.2);
      this.roadGain.gain.setTargetAtTime(rumbleVolume, now, 0.2);
      this.roadFilter.frequency.setTargetAtTime(90 + roadIntensity * 130, now, 0.2);
    } else {
      this.roadGain.gain.setTargetAtTime(0.0, now, 0.2);
    }
  }

  /**
   * Plays a delicate metallic sheep bell chime.
   */
  playSheepBell() {
    if (!this.ctx || !this.isInitialized || this.isMuted) return;

    const now = this.ctx.currentTime;
    if (now - this.lastBellTime < 1.5) return; // Rate limit bells
    this.lastBellTime = now;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(1420 + Math.random() * 80, now);
    osc2.frequency.setValueAtTime(2150 + Math.random() * 100, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);
  }

  /**
   * Plays a shepherd call whistle when commanding the flock.
   */
  playShepherdWhistle() {
    if (!this.ctx || !this.isInitialized || this.isMuted) return;

    const now = this.ctx.currentTime;
    if (now - this.lastWhistleTime < 0.6) return;
    this.lastWhistleTime = now;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Gentle melodic whistle inflection: 950Hz sliding to 1180Hz
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(1180, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.35);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  /**
   * Synthesizes a spatial Doppler whoosh for a vehicle crossing the screen.
   * @param {Vehicle} vehicle
   */
  playVehicleWhoosh(vehicle) {
    if (!this.ctx || !this.isInitialized || this.isMuted) return;

    const now = this.ctx.currentTime;

    // Stereo panning based on X coordinate on 960px canvas (-1.0 to +1.0)
    let panner = null;
    if (typeof this.ctx.createStereoPanner === 'function') {
      panner = this.ctx.createStereoPanner();
      const panX = MathUtils.clamp((vehicle.x / CONFIG.CANVAS.WIDTH) * 2 - 1, -1, 1);
      panner.pan.setValueAtTime(panX, now);
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Base pitch by vehicle type
    let basePitch = 120;
    let volume = 0.08;
    if (vehicle.type === 'truck' || vehicle.type === 'bus') {
      basePitch = 65;
      volume = 0.14;
      osc.type = 'sawtooth';
    } else if (vehicle.type === 'bike') {
      basePitch = 210;
      volume = 0.05;
      osc.type = 'triangle';
    } else {
      basePitch = 110;
      volume = 0.08;
      osc.type = 'triangle';
    }

    osc.frequency.setValueAtTime(basePitch * 1.1, now);
    osc.frequency.exponentialRampToValueAtTime(basePitch * 0.9, now + 0.3);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    if (panner) {
      osc.connect(panner);
      panner.connect(gain);
    } else {
      osc.connect(gain);
    }
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  /**
   * Plays a sharp double-tone vehicle horn when sheep are in peril near the road.
   */
  playVehicleHorn() {
    if (!this.ctx || !this.isInitialized || this.isMuted) return;

    const now = this.ctx.currentTime;
    if (now - this.lastHornTime < 2.0) return; // Don't spam horns
    this.lastHornTime = now;

    const tone1 = this.ctx.createOscillator();
    const tone2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    tone1.type = 'sawtooth';
    tone2.type = 'sawtooth';
    tone1.frequency.setValueAtTime(370, now);
    tone2.frequency.setValueAtTime(465, now);

    // Two rapid horn beeps
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.setValueAtTime(0.0, now + 0.12);
    gain.gain.setValueAtTime(0.12, now + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    tone1.connect(gain);
    tone2.connect(gain);
    gain.connect(this.masterGain);

    tone1.start(now);
    tone2.start(now);
    tone1.stop(now + 0.45);
    tone2.stop(now + 0.45);
  }

  /**
   * Plays a heavy thud sound upon sheep collision.
   */
  playCollisionThud() {
    if (!this.ctx || !this.isInitialized || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  /**
   * Toggles audio mute.
   * @returns {boolean} New mute state
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0.0 : 0.7, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }
}
