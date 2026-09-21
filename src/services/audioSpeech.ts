// Web Speech API and Web Audio API synthesizer for accessible senior voiceover and audio feedback

class AudioSpeechService {
  private isEnabled: boolean = true;
  private isSpeaking: boolean = false;
  private audioCtx: AudioContext | null = null;
  private listeners: Set<(speaking: boolean) => void> = new Set();
  private toggleListeners: Set<(enabled: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('saathi_game_voiceover');
      // Default to false so AI voice only speaks when explicitly prompted
      this.isEnabled = stored !== null ? stored === 'true' : false;
    }
  }

  public isVoiceoverEnabled(): boolean {
    return this.isEnabled;
  }

  public setVoiceoverEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('saathi_game_voiceover', enabled ? 'true' : 'false');
    }
    if (!enabled) {
      this.stop();
    }
    this.toggleListeners.forEach((cb) => cb(enabled));
  }

  public onVoiceoverToggle(cb: (enabled: boolean) => void): () => void {
    this.toggleListeners.add(cb);
    return () => this.toggleListeners.delete(cb);
  }

  public onSpeakingChange(cb: (speaking: boolean) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private setSpeaking(val: boolean) {
    this.isSpeaking = val;
    this.listeners.forEach((cb) => cb(val));
  }

  /**
   * Speak a phrase aloud using Web Speech API with gentle pacing for seniors.
   */
  public speak(
    text: string,
    options?: {
      rate?: number;
      pitch?: number;
      force?: boolean;
      lang?: string;
      onEnd?: () => void;
    }
  ): void {
    if (!this.isEnabled && !options?.force) {
      return;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      window.speechSynthesis.cancel();

      // Clean text of emojis or bracketed codes for cleaner pronunciation
      const cleanText = text
        .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
        .replace(/[•×—]/g, ' ')
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = options?.rate ?? 0.9; // Gently relaxed for clarity
      utterance.pitch = options?.pitch ?? 1.0;

      const targetLang = options?.lang;
      if (targetLang) {
        utterance.lang = targetLang === 'hi' ? 'hi-IN' : targetLang === 'as' ? 'as-IN' : targetLang === 'mni' ? 'mni-IN' : targetLang.startsWith('en') ? 'en-IN' : targetLang;
      }

      // Prefer warm natural English or regional voices if available
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        let preferred = undefined;
        if (targetLang === 'hi') {
          preferred = voices.find((v) => v.lang.startsWith('hi'));
        } else if (targetLang === 'as') {
          preferred = voices.find((v) => v.lang.startsWith('as') || v.lang.startsWith('bn'));
        } else if (targetLang === 'mni') {
          preferred = voices.find((v) => v.lang.startsWith('mni') || v.lang.startsWith('bn') || v.lang.startsWith('hi'));
        }

        if (!preferred) {
          preferred =
            voices.find(
              (v) =>
                (v.lang.startsWith('en-IN') || v.lang.startsWith('en-GB') || v.lang.startsWith('en-US')) &&
                (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen'))
            ) ||
            voices.find((v) => v.lang.startsWith('en')) ||
            voices[0];
        }

        if (preferred) {
          utterance.voice = preferred;
        }
      }

      utterance.onstart = () => {
        this.setSpeaking(true);
      };

      utterance.onend = () => {
        this.setSpeaking(false);
        if (options?.onEnd) {
          options.onEnd();
        }
      };

      utterance.onerror = () => {
        this.setSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      this.setSpeaking(false);
    }
  }

  /**
   * Stop any current speech synthesis.
   */
  public stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore cancel errors
      }
    }
    this.setSpeaking(false);
  }

  /**
   * Play soothing acoustic chimes and pleasant instrument tones via Web Audio API.
   */
  public playSound(
    type: 'tap' | 'match' | 'victory' | 'gentle_retry' | 'instrument_dhol' | 'instrument_pepa' | 'instrument_flute' | 'instrument_bell'
  ): void {
    if (typeof window === 'undefined') return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      if (type === 'tap') {
        // Soft wooden click / gentle marimba tap
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.08);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'match') {
        // Ascending harmonic chime (C5 -> E5 -> G5)
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.09);

          gain.gain.setValueAtTime(0.15, now + idx * 0.09);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.28);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.09);
          osc.stop(now + idx * 0.09 + 0.3);
        });
      } else if (type === 'victory') {
        // Celebratory melodic sequence (C5 -> E5 -> G5 -> C6)
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);

          gain.gain.setValueAtTime(0.18, now + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.45);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.5);
        });
      } else if (type === 'gentle_retry') {
        // Soft descending warm tone (no harsh buzzers)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(360, now);
        osc.frequency.exponentialRampToValueAtTime(280, now + 0.25);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'instrument_dhol') {
        // Deep rhythmic drum beat
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(65, now + 0.22);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'instrument_pepa') {
        // High spirited reed tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(554.37, now + 0.28);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.32);
      } else if (type === 'instrument_flute') {
        // Melodic sine breath
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.setValueAtTime(698.46, now + 0.12);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.38);
      } else if (type === 'instrument_bell') {
        // Pure resonant bell metal gong
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.65);
      }
    } catch {
      // Audio context might be restricted before interaction
    }
  }

  /**
   * Play authentic acoustic sound of a specific musical instrument
   * e.g. Guitar (plucked strings), Drum, Bongo, Trumpet, Flute, Piano, Violin, Harp, Xylophone, Bell
   */
  public playInstrument(instrument: string, durationSec: number = 0.6): void {
    if (typeof window === 'undefined') return;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const ctx = this.audioCtx;
      const now = ctx.currentTime;
      const normalizedName = instrument.trim().toLowerCase();

      // Utility to generate a short noise burst (for guitar pick, drum strike, mallet, or breath)
      const playNoiseBurst = (
        durationMs: number,
        filterType: BiquadFilterType,
        filterFreq: number,
        gainVal: number
      ) => {
        const bufferSize = Math.max(128, Math.floor((ctx.sampleRate * durationMs) / 1000));
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.setValueAtTime(filterFreq, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(gainVal, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        noise.start(now);
        noise.stop(now + durationMs / 1000 + 0.02);
      };

      if (normalizedName.includes('guitar')) {
        // ==========================================
        // ACOUSTIC GUITAR: Karplus-Strong Plucked String Physical Modeling
        // Authentic picked acoustic guitar note (G3 ~196Hz) with
        // plectrum attack, string dispersion, and wooden body resonance
        // ==========================================
        const guitarFreq = 196.0; // Open G3 acoustic guitar string
        const dur = Math.max(0.85, durationSec * 1.5);
        const sampleRate = ctx.sampleRate;
        const totalSamples = Math.floor(sampleRate * dur);

        const guitarBuffer = ctx.createBuffer(1, totalSamples, sampleRate);
        const channelData = guitarBuffer.getChannelData(0);

        // Period in samples for G3 note
        const period = Math.max(8, Math.round(sampleRate / guitarFreq));

        // 1. Initial excitation: shaped noise burst simulating plectrum (guitar pick)
        // Triangle-windowed pick excitation gives warm, natural acoustic guitar pluck
        for (let i = 0; i < period; i++) {
          const windowWeight = Math.sin((Math.PI * i) / period);
          const noise = Math.random() * 2 - 1;
          channelData[i] = noise * windowWeight * 0.95;
        }

        // 2. Karplus-Strong feedback string loop with gentle lowpass damping
        // Damping factor: 0.993 ensures long, warm acoustic guitar sustain
        const damping = 0.993;
        for (let i = period; i < totalSamples; i++) {
          const prevSample = channelData[i - period];
          const prevSample2 = channelData[i - period - 1] || 0;
          channelData[i] = (prevSample + prevSample2) * 0.5 * damping;
        }

        // 3. Play buffer through wooden soundbox body filter
        const bufferSource = ctx.createBufferSource();
        bufferSource.buffer = guitarBuffer;

        // Acoustic body resonance filter (~210 Hz soundboard wood cavity)
        const bodyFilter = ctx.createBiquadFilter();
        bodyFilter.type = 'peaking';
        bodyFilter.frequency.setValueAtTime(210, now);
        bodyFilter.Q.setValueAtTime(1.5, now);
        bodyFilter.gain.setValueAtTime(4.0, now);

        // Dynamic high-frequency decay simulating wooden soundboard absorption
        const woodWarmthFilter = ctx.createBiquadFilter();
        woodWarmthFilter.type = 'lowpass';
        woodWarmthFilter.frequency.setValueAtTime(4200, now);
        woodWarmthFilter.frequency.exponentialRampToValueAtTime(1600, now + dur * 0.6);

        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.45, now);
        masterGain.gain.exponentialRampToValueAtTime(0.0005, now + dur);

        bufferSource.connect(bodyFilter);
        bodyFilter.connect(woodWarmthFilter);
        woodWarmthFilter.connect(masterGain);
        masterGain.connect(ctx.destination);

        bufferSource.start(now);
        bufferSource.stop(now + dur + 0.05);

      } else if (normalizedName.includes('drum')) {
        // ==========================================
        // BASS / TOM DRUM: Deep punchy acoustic kick/tom
        // ==========================================
        const dur = Math.max(0.38, durationSec * 0.85);

        // Beater impact click
        playNoiseBurst(18, 'lowpass', 650, 0.28);

        // Resonant pitch drop
        const drumOsc = ctx.createOscillator();
        drumOsc.type = 'triangle';
        drumOsc.frequency.setValueAtTime(155, now);
        drumOsc.frequency.exponentialRampToValueAtTime(46, now + 0.12);

        const drumGain = ctx.createGain();
        drumGain.gain.setValueAtTime(0.42, now);
        drumGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        drumOsc.connect(drumGain);
        drumGain.connect(ctx.destination);

        drumOsc.start(now);
        drumOsc.stop(now + dur + 0.05);

      } else if (normalizedName.includes('bongo')) {
        // ==========================================
        // BONGO: Tuned skin slap with hollow acoustic ring
        // ==========================================
        const dur = 0.26;
        playNoiseBurst(22, 'bandpass', 1250, 0.32);

        const bongoOsc = ctx.createOscillator();
        bongoOsc.type = 'sine';
        bongoOsc.frequency.setValueAtTime(320, now);
        bongoOsc.frequency.exponentialRampToValueAtTime(215, now + 0.06);

        const bongoGain = ctx.createGain();
        bongoGain.gain.setValueAtTime(0.38, now);
        bongoGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        bongoOsc.connect(bongoGain);
        bongoGain.connect(ctx.destination);

        bongoOsc.start(now);
        bongoOsc.stop(now + dur + 0.05);

      } else if (normalizedName.includes('trumpet') || normalizedName.includes('brass')) {
        // ==========================================
        // TRUMPET: Brassy horn with characteristic lip-buzz swell
        // ==========================================
        const dur = Math.max(0.48, durationSec);
        const trumpetFreq = 293.66; // D4

        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(trumpetFreq, now);

        const osc2 = ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(trumpetFreq * 1.004, now); // Chorus detune

        const brassFilter = ctx.createBiquadFilter();
        brassFilter.type = 'lowpass';
        brassFilter.frequency.setValueAtTime(500, now);
        brassFilter.frequency.exponentialRampToValueAtTime(2600, now + 0.045);
        brassFilter.frequency.exponentialRampToValueAtTime(1400, now + 0.18);
        brassFilter.Q.setValueAtTime(3.0, now);

        const vibrato = ctx.createOscillator();
        vibrato.frequency.setValueAtTime(5.4, now);
        const vibratoGain = ctx.createGain();
        vibratoGain.gain.setValueAtTime(0, now);
        vibratoGain.gain.linearRampToValueAtTime(4.5, now + 0.1);
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc1.frequency);
        vibratoGain.connect(osc2.frequency);

        const brassGain = ctx.createGain();
        brassGain.gain.setValueAtTime(0.001, now);
        brassGain.gain.linearRampToValueAtTime(0.24, now + 0.035);
        brassGain.gain.setValueAtTime(0.22, now + dur - 0.08);
        brassGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        osc1.connect(brassFilter);
        osc2.connect(brassFilter);
        brassFilter.connect(brassGain);
        brassGain.connect(ctx.destination);

        vibrato.start(now);
        osc1.start(now);
        osc2.start(now);
        vibrato.stop(now + dur + 0.05);
        osc1.stop(now + dur + 0.05);
        osc2.stop(now + dur + 0.05);

      } else if (normalizedName.includes('flute') || normalizedName.includes('woodwind')) {
        // ==========================================
        // FLUTE: Pure breath woodwind with gentle vibrato
        // ==========================================
        const dur = Math.max(0.5, durationSec);
        const fluteFreq = 587.33; // D5

        // Breath air turbulence
        playNoiseBurst(dur * 1000 * 0.7, 'bandpass', 2400, 0.03);

        const fluteOsc = ctx.createOscillator();
        fluteOsc.type = 'sine';
        fluteOsc.frequency.setValueAtTime(fluteFreq, now);

        const harmOsc = ctx.createOscillator();
        harmOsc.type = 'sine';
        harmOsc.frequency.setValueAtTime(fluteFreq * 2, now);

        const vibrato = ctx.createOscillator();
        vibrato.frequency.setValueAtTime(5.2, now);
        const vibratoGain = ctx.createGain();
        vibratoGain.gain.setValueAtTime(6.0, now);
        vibrato.connect(vibratoGain);
        vibratoGain.connect(fluteOsc.frequency);

        const fluteGain = ctx.createGain();
        fluteGain.gain.setValueAtTime(0.001, now);
        fluteGain.gain.linearRampToValueAtTime(0.22, now + 0.06);
        fluteGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        const harmGain = ctx.createGain();
        harmGain.gain.setValueAtTime(0.001, now);
        harmGain.gain.linearRampToValueAtTime(0.04, now + 0.06);
        harmGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        fluteOsc.connect(fluteGain);
        harmOsc.connect(harmGain);
        fluteGain.connect(ctx.destination);
        harmGain.connect(ctx.destination);

        vibrato.start(now);
        fluteOsc.start(now);
        harmOsc.start(now);
        vibrato.stop(now + dur + 0.05);
        fluteOsc.stop(now + dur + 0.05);
        harmOsc.stop(now + dur + 0.05);

      } else if (normalizedName.includes('piano') || normalizedName.includes('keys')) {
        // ==========================================
        // PIANO: Acoustic grand piano key strike
        // Hammer impact + detuned string chorus + lowpass decay
        // ==========================================
        const dur = Math.max(0.65, durationSec);
        const pianoFreq = 261.63; // Middle C (C4)

        playNoiseBurst(10, 'bandpass', 1500, 0.18);

        const osc1 = ctx.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(pianoFreq, now);

        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(pianoFreq * 1.002, now);

        const osc3 = ctx.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(pianoFreq * 2, now);

        const pianoFilter = ctx.createBiquadFilter();
        pianoFilter.type = 'lowpass';
        pianoFilter.frequency.setValueAtTime(3200, now);
        pianoFilter.frequency.exponentialRampToValueAtTime(450, now + dur * 0.7);

        const pianoGain = ctx.createGain();
        pianoGain.gain.setValueAtTime(0.001, now);
        pianoGain.gain.linearRampToValueAtTime(0.35, now + 0.005);
        pianoGain.gain.exponentialRampToValueAtTime(0.14, now + 0.1);
        pianoGain.gain.exponentialRampToValueAtTime(0.0005, now + dur);

        osc1.connect(pianoFilter);
        osc2.connect(pianoFilter);
        osc3.connect(pianoFilter);
        pianoFilter.connect(pianoGain);
        pianoGain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc3.start(now);
        osc1.stop(now + dur + 0.05);
        osc2.stop(now + dur + 0.05);
        osc3.stop(now + dur + 0.05);

      } else if (normalizedName.includes('violin') || normalizedName.includes('bow')) {
        // ==========================================
        // VIOLIN: Bowed acoustic string with warm vibrato
        // ==========================================
        const dur = Math.max(0.55, durationSec);
        const violinFreq = 440.0; // A4

        const violinOsc = ctx.createOscillator();
        violinOsc.type = 'sawtooth';
        violinOsc.frequency.setValueAtTime(violinFreq, now);

        const vibrato = ctx.createOscillator();
        vibrato.frequency.setValueAtTime(5.8, now);
        const vibratoGain = ctx.createGain();
        vibratoGain.gain.setValueAtTime(0, now);
        vibratoGain.gain.linearRampToValueAtTime(8.5, now + 0.08);
        vibrato.connect(vibratoGain);
        vibratoGain.connect(violinOsc.frequency);

        const violinFilter = ctx.createBiquadFilter();
        violinFilter.type = 'lowpass';
        violinFilter.frequency.setValueAtTime(1600, now);
        violinFilter.Q.setValueAtTime(2.2, now);

        const violinGain = ctx.createGain();
        violinGain.gain.setValueAtTime(0.001, now);
        violinGain.gain.linearRampToValueAtTime(0.25, now + 0.07);
        violinGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        violinOsc.connect(violinFilter);
        violinFilter.connect(violinGain);
        violinGain.connect(ctx.destination);

        vibrato.start(now);
        violinOsc.start(now);
        vibrato.stop(now + dur + 0.05);
        violinOsc.stop(now + dur + 0.05);

      } else if (normalizedName.includes('harp')) {
        // ==========================================
        // HARP: Crystalline plucked string
        // ==========================================
        const dur = Math.max(0.8, durationSec * 1.3);
        const harpFreq = 523.25; // C5

        const osc1 = ctx.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(harpFreq, now);

        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(harpFreq * 2, now);

        const harpGain = ctx.createGain();
        harpGain.gain.setValueAtTime(0.001, now);
        harpGain.gain.linearRampToValueAtTime(0.3, now + 0.003);
        harpGain.gain.exponentialRampToValueAtTime(0.0005, now + dur);

        osc1.connect(harpGain);
        osc2.connect(harpGain);
        harpGain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + dur + 0.05);
        osc2.stop(now + dur + 0.05);

      } else if (normalizedName.includes('xylophone') || normalizedName.includes('mallet')) {
        // ==========================================
        // XYLOPHONE: Wooden bar struck by mallet
        // ==========================================
        const dur = 0.32;
        const xyloFreq = 523.25; // C5

        playNoiseBurst(6, 'highpass', 3500, 0.25);

        const barOsc = ctx.createOscillator();
        barOsc.type = 'sine';
        barOsc.frequency.setValueAtTime(xyloFreq, now);

        const overtoneOsc = ctx.createOscillator();
        overtoneOsc.type = 'sine';
        overtoneOsc.frequency.setValueAtTime(xyloFreq * 3.02, now);

        const barGain = ctx.createGain();
        barGain.gain.setValueAtTime(0.36, now);
        barGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        const overtoneGain = ctx.createGain();
        overtoneGain.gain.setValueAtTime(0.2, now);
        overtoneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        barOsc.connect(barGain);
        overtoneOsc.connect(overtoneGain);
        barGain.connect(ctx.destination);
        overtoneGain.connect(ctx.destination);

        barOsc.start(now);
        overtoneOsc.start(now);
        barOsc.stop(now + dur + 0.05);
        overtoneOsc.stop(now + 0.08);

      } else {
        // ==========================================
        // BELL / CHIME: Metallic chime gong
        // ==========================================
        const dur = Math.max(0.75, durationSec * 1.2);
        const bellF0 = 880.0; // A5

        const partials = [1.0, 2.76, 5.4];
        const gains = [0.25, 0.12, 0.06];

        partials.forEach((mult, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(bellF0 * mult, now);

          gain.gain.setValueAtTime(gains[idx] || 0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.0005, now + dur / (idx + 1));

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + dur + 0.05);
        });
      }
    } catch {
      // Audio context error guard
    }
  }

  /**
   * Play specific musical note for music pattern game (2x2 and 3x3 grids)
   * Maps directly to the authentic instrument sound (Guitar, Drum, Piano, Trumpet, etc.)
   */
  public playMusicNote(
    noteIndex: number,
    mode: '2x2' | '3x3' = '2x2',
    durationSec: number = 0.45
  ): void {
    const instruments2x2 = ['Guitar', 'Drum', 'Flute', 'Bell'];
    const instruments3x3 = [
      'Drum',
      'Bongo',
      'Guitar',
      'Piano',
      'Flute',
      'Violin',
      'Harp',
      'Xylophone',
      'Bell',
    ];

    const list = mode === '2x2' ? instruments2x2 : instruments3x3;
    const instrumentName = list[noteIndex % list.length] || 'Bell';
    this.playInstrument(instrumentName, durationSec);
  }
}

export const speechService = new AudioSpeechService();
