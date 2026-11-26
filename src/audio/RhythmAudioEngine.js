/**
 * Hi-Fi RUSH Commercial Adaptive Multi-Genre Music Engine!
 * Features:
 * - 4 Complete 16-Bar Song Arrangements (Verse A -> Build -> Chorus B -> Solo C + Auto Drum Fills!):
 *     1. 'funkPunk'        (122 BPM · E Minor) — Bouncy Hi-Fi RUSH Funk-Punk Rock + Clavinet + Guitar Riffs
 *     2. 'cyberSynth'      (132 BPM · C Minor) — High-Energy Cyber Synthwave + Rolling 16th Arp + Supersaw
 *     3. 'industrialMetal' (140 BPM · D Minor) — Aggressive Drop-D Double-Kick Industrial Thrash Metal
 *     4. 'bigBandRock'     (136 BPM · A Minor) — Heroic Anime Big-Band Funk Rock + Synth Brass Horn Stabs!
 * - Vertical Adaptive Layering (Drums+Bass -> +Clavinet/Arp at Rank B -> +Lead Solo/Brass at Rank S/Phase 2-3!)
 * - Optional Custom Local MP3/WAV Track Importer synced directly to the game's BPM beat clock!
 * - Distinct SFX for 3 Musical Instrument Weapons (Flying-V Guitar, Cyber Keytar, Bass Amp Hammer)
 */
export const TRACK_LIST = [
  { id: 'funkPunk',        label: '🎸 FUNK PUNK (122 BPM)',        bpm: 122 },
  { id: 'cyberSynth',      label: '🎹 CYBER SYNTH (132 BPM)',      bpm: 132 },
  { id: 'industrialMetal', label: '🔥 METAL THRASH (140 BPM)',     bpm: 140 },
  { id: 'bigBandRock',     label: '🎺 BIG-BAND ROCK (136 BPM)',    bpm: 136 },
];

export class RhythmAudioEngine {
  constructor(bpm = 122) {
    this.trackId = 'funkPunk';
    this.bpm = bpm;
    this.beatDuration = 60 / bpm;
    this.stepDuration = this.beatDuration / 4; // 16th-note step

    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.distortionCurve = null;
    this.noiseBuffer = null;

    // Optional Custom Imported Audio Track (MP3/WAV/OGG)
    this.customAudioBuffer = null;
    this.customSource = null;
    this.customTrackName = null;
    this.useCustomTrack = false;

    this.running = false;
    this.muted = false;
    this.startTime = 0;
    this.nextStepTime = 0;
    this.currentStep = 0;
    this.phase = 1;
    this.hypeLevel = 0;

    this._timerId = null;
    this._beatListeners = [];
    this._lastDispatchedBeat = -1;
  }

  onBeat(fn) { this._beatListeners.push(fn); }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -13;
    comp.knee.value = 18;
    comp.ratio.value = 6;
    comp.attack.value = 0.004;
    comp.release.value = 0.14;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.74;
    this.masterGain.connect(comp);
    comp.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.62;
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.92;
    this.sfxGain.connect(this.masterGain);

    this.distortionCurve = this._makeDistortionCurve(90);
    this.noiseBuffer = this._createNoiseBuffer();
  }

  _makeDistortionCurve(amount = 65) {
    const n = 2048;
    const curve = new Float32Array(n);
    const deg = Math.PI / 180;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  _createNoiseBuffer() {
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, sr * 1.5, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  setTrack(trackId, customBpm = null) {
    const meta = TRACK_LIST.find((t) => t.id === trackId) || TRACK_LIST[0];
    this.trackId = meta.id;
    this.useCustomTrack = false;
    this._stopCustomSource();
    this.setBpm(customBpm || meta.bpm);
  }

  setBpm(newBpm) {
    const clamped = Math.max(85, Math.min(180, Number(newBpm) || 128));
    this.bpm = clamped;
    this.beatDuration = 60 / clamped;
    this.stepDuration = this.beatDuration / 4;
    if (this.running && this.ctx) {
      // Smoothly resync beat anchor on BPM change
      this.startTime = this.ctx.currentTime;
      this.nextStepTime = this.startTime + 0.04;
      this.currentStep = 0;
      this._lastDispatchedBeat = -1;
    }
  }

  /**
   * Load a user's own local MP3/WAV/OGG song to play with beat-synced gameplay!
   */
  async loadCustomAudioFile(file, bpm = 128) {
    this.init();
    const arrayBuf = await file.arrayBuffer();
    const decoded = await this.ctx.decodeAudioData(arrayBuf);
    this.customAudioBuffer = decoded;
    this.customTrackName = file.name.replace(/\.[^.]+$/, '');
    this.useCustomTrack = true;
    this.setBpm(bpm);
    if (this.running) {
      this._startCustomSource();
    }
    return this.customTrackName;
  }

  _startCustomSource() {
    this._stopCustomSource();
    if (!this.ctx || !this.customAudioBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.customAudioBuffer;
    src.loop = true;
    src.connect(this.musicGain);
    this.startTime = this.ctx.currentTime + 0.04;
    this._lastDispatchedBeat = -1;
    src.start(this.startTime);
    this.customSource = src;
  }

  _stopCustomSource() {
    if (this.customSource) {
      try { this.customSource.stop(); } catch (_) {}
      this.customSource = null;
    }
  }

  start() {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.running) {
      if (this.useCustomTrack && !this.customSource) this._startCustomSource();
      return;
    }
    this.running = true;
    this.startTime = this.ctx.currentTime + 0.06;
    this.nextStepTime = this.startTime;
    this.currentStep = 0;
    this._lastDispatchedBeat = -1;

    if (this.useCustomTrack && this.customAudioBuffer) {
      this._startCustomSource();
    }

    this._timerId = setInterval(() => this._scheduler(), 20);
  }

  stop() {
    this.running = false;
    this._stopCustomSource();
    if (this._timerId) {
      clearInterval(this._timerId);
      this._timerId = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.74, this.ctx.currentTime, 0.02);
    }
    return this.muted;
  }

  setPhase(p) { this.phase = Math.max(1, Math.min(3, p)); }
  setHype(level) { this.hypeLevel = Math.max(0, Math.min(3, level)); }

  getBeatFloat() {
    if (!this.ctx || !this.running) return 0;
    return Math.max(0, this.ctx.currentTime - this.startTime) / this.beatDuration;
  }

  getBeatPhase() { return this.getBeatFloat() % 1; }
  getBeatIndex() { return Math.floor(this.getBeatFloat()); }

  judgeTiming() {
    if (!this.running) return { grade: 'GOOD', multiplier: 1.15, errorMs: 0 };
    const phase = this.getBeatPhase();
    const dist = Math.min(phase, 1 - phase);
    const errMs = dist * this.beatDuration * 1000;
    if (errMs <= 108) return { grade: 'PERFECT', multiplier: 1.5, errorMs: errMs };
    if (errMs <= 188) return { grade: 'GOOD', multiplier: 1.2, errorMs: errMs };
    return { grade: 'OFFBEAT', multiplier: 0.85, errorMs: errMs };
  }

  pollVisualBeat() {
    if (!this.running) return false;
    const bi = this.getBeatIndex();
    if (bi > this._lastDispatchedBeat) {
      this._lastDispatchedBeat = bi;
      for (const fn of this._beatListeners) fn(bi);
      return true;
    }
    return false;
  }

  _scheduler() {
    if (!this.running || !this.ctx || this.useCustomTrack) return;
    const lookAhead = 0.12;
    while (this.nextStepTime < this.ctx.currentTime + lookAhead) {
      this._scheduleStep(this.currentStep, this.nextStepTime);
      this.nextStepTime += this.stepDuration;
      this.currentStep++;
    }
  }

  // =========================================================================
  // 16-BAR MULTI-SECTION ARRANGEMENT ENGINE (A -> Pre -> Chorus -> Solo + Fills!)
  // =========================================================================
  _scheduleStep(step, t) {
    const bar = Math.floor(step / 16) % 16; // 16-bar full song structure!
    const s = step % 16;                    // 16th note inside current bar (0..15)
    const section = Math.floor(bar / 4);    // 0: Verse A, 1: Build, 2: CHORUS B, 3: SOLO / BRIDGE!
    const isFillBar = (bar % 4 === 3);      // Bars 3, 7, 11, 15 end with energetic drum fills!
    const isDownbeatCrash = (s === 0 && bar % 4 === 0);

    // Subtle quarter-note pulse tick so rhythm stays crystal clear
    if (s % 4 === 0) this._playBeatTick(t, s === 0 ? 1180 : 880, 0.025);
    if (isDownbeatCrash) this._playCrash(t, 0.24);

    if (this.trackId === 'cyberSynth') {
      this._scheduleCyberSynth(bar, section, s, isFillBar, t);
    } else if (this.trackId === 'industrialMetal') {
      this._scheduleIndustrialMetal(bar, section, s, isFillBar, t);
    } else if (this.trackId === 'bigBandRock') {
      this._scheduleBigBandRock(bar, section, s, isFillBar, t);
    } else {
      this._scheduleFunkPunk(bar, section, s, isFillBar, t);
    }
  }

  // --- TRACK 1: FUNK PUNK ROCK (122 BPM · E Minor · Hi-Fi RUSH Signature!) ---
  _scheduleFunkPunk(bar, section, s, isFillBar, t) {
    // Chord root shifts every bar across 4-bar chord progression:
    // Verse: E - E - G - A  |  Chorus: E - C - G - D  |  Solo: C - D - E - B
    const verseRoots  = [40, 40, 43, 45]; // E2, E2, G2, A2
    const chorusRoots = [40, 48, 43, 50]; // E2, C3, G2, D3
    const soloRoots   = [48, 50, 40, 47]; // C3, D3, E2, B2
    const root = section === 2 ? chorusRoots[bar % 4] : (section === 3 ? soloRoots[bar % 4] : verseRoots[bar % 4]);

    // DRUMS + AUTO FILL ON LAST 4 SIXTEENTHS OF EVERY 4TH BAR!
    if (isFillBar && s >= 12) {
      const tomNotes = [165, 145, 120, 95];
      this._playTom(t, tomNotes[s - 12], 0.55);
      if (s === 12 || s === 14) this._playSnare(t, 0.75);
    } else {
      const kicks = this.phase >= 2 ? [0, 3, 6, 8, 11, 14] : [0, 6, 8, 14];
      if (kicks.includes(s)) this._playKick(t, s === 0 ? 1.0 : 0.82);
      if (s === 4 || s === 12) this._playSnare(t, 0.95);
      else if (s === 15 && section >= 1) this._playSnare(t, 0.42); // Funk ghost snare!
    }
    if (s % 2 === 0 || (section >= 1 && s % 4 === 3)) {
      this._playHiHat(t, s === 10 ? 0.14 : 0.045, s % 4 === 0 ? 0.28 : 0.16);
    }

    // FUNKY SLAP BASS (syncopated octave groove!)
    const bassPattern = { 0: 0, 3: 0, 6: 12, 8: 7, 10: 10, 12: 12, 14: 7 };
    if (bassPattern[s] !== undefined) {
      this._playBass(t, this._midiToHz(root + bassPattern[s]), this.stepDuration * 1.65);
    }

    // CRUNCHY POWER CHORD GUITAR (opens up massively in Chorus & Phase 2+!)
    const gtrHits = section === 2 ? [0, 3, 6, 8, 11, 14] : [0, 6, 12];
    if (gtrHits.includes(s)) {
      this._playPowerChord(t, this._midiToHz(root + 12), this.stepDuration * (section === 2 ? 2.2 : 1.5), 0.16);
    }

    // FUNKY CLAVINET / ORGAN COMPING (unlocks in Section 1+ OR Combo B+!)
    if ((section >= 1 || this.hypeLevel >= 1) && [2, 6, 10, 14].includes(s)) {
      this._playClavChord(t, root + 24, this.stepDuration * 0.9, 0.08);
    }

    // CATCHY LEAD RIFF (Chorus, Solo, OR Rank A/S!)
    if (section >= 2 || this.hypeLevel >= 2 || this.phase === 3) {
      const riffA = { 0: 64, 2: 67, 4: 71, 6: 74, 8: 71, 10: 67, 12: 69, 14: 67 };
      const riffB = { 0: 76, 3: 74, 6: 71, 8: 74, 10: 76, 12: 79, 14: 76 };
      const riff = (bar % 2 === 0) ? riffA : riffB;
      if (riff[s] !== undefined) {
        this._playSynthLead(t, this._midiToHz(riff[s]), this.stepDuration * 1.5, 0.12, 'sawtooth');
      }
    }
  }

  // --- TRACK 2: CYBER SYNTHWAVE ROCK (132 BPM · C Minor · Stage 2 Rooftop!) ---
  _scheduleCyberSynth(bar, section, s, isFillBar, t) {
    // Iconic synthwave progression: Cm -> Ab -> Eb -> Bb (Chorus lifts to Fm -> Ab -> Bb -> G!)
    const progA = [36, 44, 39, 46]; // C2, Ab2, Eb2, Bb2
    const progB = [41, 44, 46, 43]; // F2, Ab2, Bb2, G2
    const root = (section === 2 || section === 3) ? progB[bar % 4] : progA[bar % 4];

    // 4-on-the-floor electro-rock kick + huge gated snare!
    if (isFillBar && s >= 12) {
      this._playSnare(t, 0.65 + (s - 12) * 0.1);
      this._playTom(t, 200 - (s - 12) * 28, 0.45);
    } else {
      if (s % 4 === 0 || (this.phase >= 2 && s === 14)) this._playKick(t, 1.0);
      if (s === 4 || s === 12) this._playSnare(t, 1.0);
    }
    if (s % 2 === 1) this._playHiHat(t, 0.08, 0.24); // Driving offbeat electro hat!

    // Rolling 16th-note Synthwave Bassline (octave bounce!)
    const oct = (s % 2 === 0) ? 0 : 12;
    this._playBass(t, this._midiToHz(root + oct), this.stepDuration * 0.92);

    // Lush Detuned Supersaw Synth Pad Chords on beat 1 & 9
    if (s === 0 || (section >= 2 && s === 8)) {
      this._playSupersawChord(t, root + 24, this.stepDuration * (section >= 2 ? 6.5 : 10), 0.09);
    }

    // Sparkling 16th Neon Arpeggio (intensifies in Chorus / Hype!)
    if (section >= 1 || this.hypeLevel >= 1) {
      const arpOffsets = [0, 3, 7, 12, 7, 3, 10, 12];
      const note = root + 24 + arpOffsets[s % arpOffsets.length];
      this._playSynthLead(t, this._midiToHz(note), this.stepDuration * 0.85, 0.085, 'square');
    }

    // Heroic Neon Lead Melody in Chorus / Solo / Phase 2+
    if (section >= 2 || this.phase >= 2 || this.hypeLevel >= 2) {
      const mel = { 0: 72, 4: 75, 6: 79, 8: 77, 12: 75, 14: 74 };
      if (mel[s] !== undefined) {
        this._playSynthLead(t, this._midiToHz(mel[s] + (bar % 2 === 1 ? 3 : 0)), this.stepDuration * 2.2, 0.13, 'sawtooth');
      }
    }
  }

  // --- TRACK 3: INDUSTRIAL THRASH METAL (140 BPM · Drop-D · Stage 3 Foundry!) ---
  _scheduleIndustrialMetal(bar, section, s, isFillBar, t) {
    // Heavy Drop-D progression: D -> F -> G -> Bb  |  Chorus: D -> C -> Bb -> A!
    const progA = [38, 41, 43, 46];
    const progB = [38, 36, 34, 33];
    const root = section === 2 ? progB[bar % 4] : progA[bar % 4];

    // Double-Kick Thrash Drums!
    if (isFillBar && s >= 10) {
      this._playSnare(t, s % 2 === 0 ? 0.9 : 0.6);
      this._playKick(t, 0.9);
    } else {
      const dblKick = (section >= 2 || this.phase >= 2)
        ? [0, 2, 4, 6, 8, 10, 12, 14]
        : [0, 2, 6, 8, 10, 14];
      if (dblKick.includes(s)) this._playKick(t, 0.98);
      if (s === 4 || s === 12) this._playSnare(t, 1.05);
    }
    if (s % 2 === 0) this._playHiHat(t, 0.07, 0.28);

    // Chugging Palm-Muted Distorted Metal Power Chords!
    const chugSteps = section === 2 ? [0, 2, 3, 6, 8, 10, 12, 14] : [0, 2, 6, 8, 12, 14];
    if (chugSteps.includes(s)) {
      const accent = (s === 0 || s === 6 || s === 12);
      this._playPowerChord(t, this._midiToHz(root + 12), this.stepDuration * (accent ? 2.4 : 1.0), accent ? 0.22 : 0.14);
      this._playBass(t, this._midiToHz(root), this.stepDuration * 1.1);
    }

    // Blazing Shred Metal Guitar Solo in Solo Section / Phase 2+ / High Combo!
    if (section === 3 || this.phase >= 2 || this.hypeLevel >= 2) {
      const shred = [62, 65, 67, 69, 72, 74, 72, 69, 67, 65, 67, 69, 74, 77, 76, 74];
      if (s % 2 === 0 || section === 3) {
        this._playPowerChord(t, this._midiToHz(shred[s]), this.stepDuration * 1.1, 0.11);
      }
    }
  }

  // --- TRACK 4: BIG-BAND FUNK ROCK FINALE (136 BPM · A Minor · Stage 4 Grand Encore!) ---
  _scheduleBigBandRock(bar, section, s, isFillBar, t) {
    // Anime Big-Band Rock progression: Am -> F -> G -> E7!
    const prog = [45, 41, 43, 40];
    const root = prog[bar % 4];

    if (isFillBar && s >= 12) {
      this._playSnare(t, 0.95);
      this._playTom(t, 180 - (s - 12) * 24, 0.6);
    } else {
      if ([0, 3, 6, 8, 10, 14].includes(s)) this._playKick(t, 0.96);
      if (s === 4 || s === 12) this._playSnare(t, 1.0);
    }
    if (s % 2 === 0) this._playHiHat(t, s % 4 === 2 ? 0.12 : 0.045, 0.25);

    // Walking Funk-Rock Bass!
    const walk = { 0: 0, 2: 0, 4: 3, 6: 5, 8: 7, 10: 10, 12: 12, 14: 7 };
    if (walk[s] !== undefined) {
      this._playBass(t, this._midiToHz(root + walk[s]), this.stepDuration * 1.45);
    }

    // Crunchy Rhythm Guitar
    if ([0, 4, 6, 10, 12].includes(s)) {
      this._playPowerChord(t, this._midiToHz(root + 12), this.stepDuration * 1.7, 0.15);
    }

    // PUNCHY BIG-BAND BRASS HORN STABS! (Signature Hi-Fi RUSH Finale energy!)
    if ([0, 3, 6, 12, 14].includes(s)) {
      this._playBrassStab(t, root + 24, this.stepDuration * (s === 6 ? 2.2 : 1.15), section >= 2 ? 0.14 : 0.1);
    }

    // Heroic Finale Melody
    if (section >= 1 || this.hypeLevel >= 1) {
      const heroMel = { 0: 69, 3: 72, 6: 76, 8: 79, 10: 76, 12: 74, 14: 72 };
      if (heroMel[s] !== undefined) {
        this._playSynthLead(t, this._midiToHz(heroMel[s]), this.stepDuration * 1.5, 0.12, 'sawtooth');
      }
    }
  }

  // =========================================================================
  // SYNTHESIZER VOICES
  // =========================================================================
  _midiToHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  _playKick(t, vel = 1.0) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.09);
    g.gain.setValueAtTime(0.76 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(g); g.connect(this.musicGain);
    osc.start(t); osc.stop(t + 0.2);
  }

  _playTom(t, hz, vel = 0.6) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(hz, t);
    osc.frequency.exponentialRampToValueAtTime(hz * 0.52, t + 0.12);
    g.gain.setValueAtTime(0.55 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(g); g.connect(this.musicGain);
    osc.start(t); osc.stop(t + 0.16);
  }

  _playSnare(t, vel = 0.9) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1900, t);
    filter.Q.value = 0.85;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.55 * vel, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    noise.connect(filter); filter.connect(ng); ng.connect(this.musicGain);
    noise.start(t); noise.stop(t + 0.16);

    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(215, t);
    osc.frequency.exponentialRampToValueAtTime(108, t + 0.07);
    og.gain.setValueAtTime(0.36 * vel, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(og); og.connect(this.musicGain);
    osc.start(t); osc.stop(t + 0.1);
  }

  _playHiHat(t, dur = 0.05, vol = 0.22) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 7400;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(hp); hp.connect(g); g.connect(this.musicGain);
    src.start(t); src.stop(t + dur + 0.01);
  }

  _playCrash(t, vol = 0.26) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 4600;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.72);
    src.connect(hp); hp.connect(g); g.connect(this.musicGain);
    src.start(t); src.stop(t + 0.75);
  }

  _playBass(t, hz, dur) {
    const osc = this.ctx.createOscillator();
    const sub = this.ctx.createOscillator();
    const lp = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(hz, t);
    sub.type = 'triangle'; sub.frequency.setValueAtTime(hz * 0.5, t);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1450, t);
    lp.frequency.exponentialRampToValueAtTime(250, t + dur);
    lp.Q.value = 3.5;
    g.gain.setValueAtTime(0.32, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(lp); sub.connect(lp); lp.connect(g); g.connect(this.musicGain);
    osc.start(t); sub.start(t);
    osc.stop(t + dur + 0.02); sub.stop(t + dur + 0.02);
  }

  _playPowerChord(t, rootHz, dur, vol = 0.16, dest = null) {
    const target = dest || this.musicGain;
    const shaper = this.ctx.createWaveShaper();
    shaper.curve = this.distortionCurve;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.setValueAtTime(1180, t); bp.Q.value = 0.7;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    [1, 1.498, 2.0].forEach((mult) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(rootHz * mult, t);
      osc.connect(shaper);
      osc.start(t); osc.stop(t + dur + 0.02);
    });
    shaper.connect(bp); bp.connect(g); g.connect(target);
  }

  _playClavChord(t, rootMidi, dur, vol = 0.08) {
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.setValueAtTime(2200, t); bp.Q.value = 1.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    [0, 3, 7, 10].forEach((semi) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(this._midiToHz(rootMidi + semi), t);
      osc.connect(bp);
      osc.start(t); osc.stop(t + dur + 0.02);
    });
    bp.connect(g); g.connect(this.musicGain);
  }

  _playSupersawChord(t, rootMidi, dur, vol = 0.085) {
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2600, t);
    lp.frequency.exponentialRampToValueAtTime(900, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.01, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    [0, 3, 7].forEach((semi) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(this._midiToHz(rootMidi + semi), t);
      osc.detune.value = (semi - 3) * 7;
      osc.connect(lp);
      osc.start(t); osc.stop(t + dur + 0.03);
    });
    lp.connect(g); g.connect(this.musicGain);
  }

  _playBrassStab(t, rootMidi, dur, vol = 0.12) {
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(600, t);
    lp.frequency.exponentialRampToValueAtTime(3400, t + 0.035);
    lp.frequency.exponentialRampToValueAtTime(1100, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    [0, 4, 7, 12].forEach((semi) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(this._midiToHz(rootMidi + semi), t);
      osc.connect(lp);
      osc.start(t); osc.stop(t + dur + 0.02);
    });
    lp.connect(g); g.connect(this.musicGain);
  }

  _playSynthLead(t, hz, dur, vol = 0.11, wave = 'square') {
    const osc = this.ctx.createOscillator();
    const lp = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(hz, t);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3600, t);
    lp.frequency.exponentialRampToValueAtTime(900, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(lp); lp.connect(g); g.connect(this.musicGain);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  _playBeatTick(t, hz, vol) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(hz, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
    osc.connect(g); g.connect(this.musicGain);
    osc.start(t); osc.stop(t + 0.03);
  }

  // =========================================================================
  // HI-FI RUSH ACTION SFX (3 Instruments + Parry + Voxel Break + Fanfares)
  // =========================================================================
  playInstrumentAttack(weaponId = 'guitar', comboStep = 1, isBeatHit = false, timingGrade = 'GOOD') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const scaleNotes = [52, 55, 57, 64];
    const midi = scaleNotes[(comboStep - 1) % scaleNotes.length];
    const hz = this._midiToHz(midi);

    if (weaponId === 'keytar') {
      [1, 1.25, 1.5, 2].forEach((mult, idx) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(hz * 2 * mult, t + idx * 0.018);
        g.gain.setValueAtTime(isBeatHit ? 0.16 : 0.1, t + idx * 0.018);
        g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.018 + (isBeatHit ? 0.34 : 0.15));
        osc.connect(g); g.connect(this.sfxGain);
        osc.start(t + idx * 0.018); osc.stop(t + idx * 0.018 + 0.36);
      });
    } else if (weaponId === 'bass') {
      const bassHz = this._midiToHz(midi - 12);
      const osc = this.ctx.createOscillator();
      const lp = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(bassHz * 1.04, t);
      osc.frequency.exponentialRampToValueAtTime(bassHz, t + 0.08);
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2200, t);
      lp.frequency.exponentialRampToValueAtTime(220, t + (isBeatHit ? 0.45 : 0.22));
      lp.Q.value = 5.5;
      g.gain.setValueAtTime(isBeatHit ? 0.55 : 0.38, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + (isBeatHit ? 0.48 : 0.24));
      osc.connect(lp); lp.connect(g); g.connect(this.sfxGain);
      osc.start(t); osc.stop(t + 0.5);
    } else {
      this._playPowerChord(t, hz, isBeatHit ? 0.55 : 0.22, isBeatHit ? 0.42 : 0.24, this.sfxGain);
    }

    if (timingGrade === 'PERFECT' || isBeatHit) {
      const bell = this.ctx.createOscillator();
      const bg = this.ctx.createGain();
      bell.type = 'triangle';
      bell.frequency.setValueAtTime(isBeatHit ? 1318.5 : 1046.5, t);
      bell.frequency.exponentialRampToValueAtTime(isBeatHit ? 1975.5 : 1318.5, t + 0.09);
      bg.gain.setValueAtTime(isBeatHit ? 0.34 : 0.18, t);
      bg.gain.exponentialRampToValueAtTime(0.001, t + (isBeatHit ? 0.38 : 0.16));
      bell.connect(bg); bg.connect(this.sfxGain);
      bell.start(t); bell.stop(t + 0.4);
    }

    if (isBeatHit) {
      const sub = this.ctx.createOscillator();
      const sg = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(140, t);
      sub.frequency.exponentialRampToValueAtTime(34, t + 0.32);
      sg.gain.setValueAtTime(0.65, t);
      sg.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      sub.connect(sg); sg.connect(this.sfxGain);
      sub.start(t); sub.stop(t + 0.38);
      this._playHiHat(t, 0.35, 0.4);
    }
  }

  playWeaponSwap(weaponId = 'guitar') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const base = weaponId === 'keytar' ? 76 : (weaponId === 'bass' ? 45 : 64);
    [base, base + 7].forEach((m, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = weaponId === 'keytar' ? 'square' : 'triangle';
      osc.frequency.setValueAtTime(this._midiToHz(m), t + i * 0.045);
      g.gain.setValueAtTime(0.22, t + i * 0.045);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.045 + 0.14);
      osc.connect(g); g.connect(this.sfxGain);
      osc.start(t + i * 0.045); osc.stop(t + i * 0.045 + 0.16);
    });
  }

  playTutorialStepClear() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [64, 68, 71, 76].forEach((m, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(this._midiToHz(m), t + i * 0.055);
      g.gain.setValueAtTime(0.24, t + i * 0.055);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.055 + 0.22);
      osc.connect(g); g.connect(this.sfxGain);
      osc.start(t + i * 0.055); osc.stop(t + i * 0.055 + 0.24);
    });
  }

  playHeavySmash() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._playPowerChord(t, this._midiToHz(40), 0.45, 0.38, this.sfxGain);
    const sub = this.ctx.createOscillator();
    const sg = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(120, t);
    sub.frequency.exponentialRampToValueAtTime(30, t + 0.28);
    sg.gain.setValueAtTime(0.6, t);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    sub.connect(sg); sg.connect(this.sfxGain);
    sub.start(t); sub.stop(t + 0.32);
  }

  playParry(clashStep = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const base = 780 + clashStep * 190;
    [base, base * 1.49, base * 2.32].forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx === 0 ? 'square' : 'triangle';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 1.15, t + 0.14);
      g.gain.setValueAtTime(0.28 / (idx + 1), t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
      osc.connect(g); g.connect(this.sfxGain);
      osc.start(t); osc.stop(t + 0.36);
    });
    this._playPowerChord(t, this._midiToHz(64 + clashStep * 3), 0.3, 0.25, this.sfxGain);
  }

  playVoxelShatter(big = false) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const count = big ? 7 : 4;
    for (let i = 0; i < count; i++) {
      const dt = i * 0.022 + Math.random() * 0.015;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      const freq = 260 + Math.random() * 780;
      osc.frequency.setValueAtTime(freq, t + dt);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.45, t + dt + 0.055);
      g.gain.setValueAtTime(big ? 0.16 : 0.11, t + dt);
      g.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.065);
      osc.connect(g); g.connect(this.sfxGain);
      osc.start(t + dt); osc.stop(t + dt + 0.07);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = big ? 1100 : 1600;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(big ? 0.36 : 0.2, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + (big ? 0.22 : 0.11));
    src.connect(bp); bp.connect(ng); ng.connect(this.sfxGain);
    src.start(t); src.stop(t + 0.24);
  }

  playDash(onBeat = true) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(onBeat ? 520 : 320, t);
    osc.frequency.exponentialRampToValueAtTime(onBeat ? 1120 : 620, t + 0.1);
    g.gain.setValueAtTime(0.14, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(t); osc.stop(t + 0.13);
  }

  playJump() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(640, t + 0.11);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(t); osc.stop(t + 0.14);
  }

  playPlayerHit() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(190, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.22);
    g.gain.setValueAtTime(0.38, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(t); osc.stop(t + 0.25);
  }

  playBossTelegraph(pitch = 440) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(pitch, t);
    osc.frequency.exponentialRampToValueAtTime(pitch * 1.5, t + 0.15);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(t); osc.stop(t + 0.19);
  }

  playBossSlam() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(26, t + 0.42);
    g.gain.setValueAtTime(0.75, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(t); osc.stop(t + 0.46);
    this.playVoxelShatter(true);
  }

  playPhaseShift() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [52, 55, 59, 64].forEach((m, i) => {
      this._playPowerChord(t + i * 0.11, this._midiToHz(m), 0.35, 0.32, this.sfxGain);
    });
  }

  playOverdriveSpecial() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [52, 59, 64, 71, 76].forEach((m, i) => {
      this._playPowerChord(t + i * 0.06, this._midiToHz(m), 0.65, 0.34, this.sfxGain);
    });
  }

  playPickup() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [64, 71, 76].forEach((m, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(this._midiToHz(m), t + i * 0.055);
      g.gain.setValueAtTime(0.22, t + i * 0.055);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.055 + 0.14);
      osc.connect(g); g.connect(this.sfxGain);
      osc.start(t + i * 0.055); osc.stop(t + i * 0.055 + 0.15);
    });
  }

  playVictory() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [52, 56, 59, 64, 68, 71, 76].forEach((m, i) => {
      this._playPowerChord(t + i * 0.075, this._midiToHz(m), 0.9, 0.26, this.sfxGain);
    });
  }
}
