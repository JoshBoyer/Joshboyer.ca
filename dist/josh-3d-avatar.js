/* ============================================================================
   JOSH BOYER — Interactive Stylized 3D Talking Avatar & WebGL Facial/Body Rig
   ----------------------------------------------------------------------------
   Refined Distortion-Free Architecture:
   - Distortion-Free Head & Upper-Body Motion:
     Uses a 4.8% edge-overscanned, C-infinity smooth rigid + perspective-tilt
     transform with wide Gaussian falloff (zero sharp head-cutout seams, zero
     rubber-sheet facial lumps, and zero double-face ghosting).
   - Displacement-Aligned Inner-Mouth Articulation:
     Outside the parted lips and blinking eyelids, 100% of facial/beard pixels
     come from `josh-avatar-3d-rig-base.jpg`. As `uJawOpen` opens (0 -> 1), the
     lower lip, chin, and beard of `uTexBase` translate smoothly downward as a
     single anatomical jaw, while the upper teeth, tongue, and lower lip of
     `uTexTalk` are vertically mapped into the exact live gap between the parted
     lips—eliminating double-lip ghosting and beard shimmering.
   - Phoneme-Accurate Speech & Audio Synchronization:
     1. Grapheme-to-phoneme solver breaks every word into bilabial closures
        (M/B/P -> full lip closure), labiodentals (F/V), sibilants/alveolars
        (S/Z/T/D/N/L), open vowels (AA/AE/EH), rounded vowels (OO/OH/W/R),
        wide vowels (EE/I), and explicit punctuation pauses.
     2. Locks onto `SpeechSynthesisUtterance.onstart` and `onboundary` word
        events with adaptive rate scaling so the mouth tracks the actual voice.
     3. Connects a live Web Audio `AnalyserNode` whenever HTMLAudioElement or
        PCM voice audio plays.
   ============================================================================ */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.Josh3DAvatar = api;
    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => api.mount(), { once: true });
      } else {
        api.mount();
      }
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  const TEXTURE_URLS = Object.freeze({
    base: 'assets/personal/josh-avatar-3d-rig-base.jpg',
    talkSlight: 'assets/personal/josh-avatar-3d-rig-talk-slight.jpg',
    talkRound: 'assets/personal/josh-avatar-3d-rig-talk-round.jpg',
    talk: 'assets/personal/josh-avatar-3d-rig-talk.jpg',
    blink: 'assets/personal/josh-avatar-3d-rig-blink.jpg',
    smile: 'assets/optimized/personal/josh-avatar-3d-smile-144.webp',
    canyon3d: 'assets/personal/josh-avatar-3d-canyon.jpg',
    originalPhoto: 'assets/optimized/personal/barron-canyon-about-1672.webp',
    atlasIdle: 'assets/personal/josh-3d-atlas-idle.jpg',
    atlasTalk: 'assets/personal/josh-3d-atlas-talk.jpg'
  });

  const VIDEO_URLS = Object.freeze({
    idle: 'assets/personal/josh-avatar-idle.mp4?v=v17calm',
    talking: ''
  });

  // Grounded first-person voice scripts strictly aligned with AGENTS.md & JOSH-BOYER-PORTFOLIO-CORPUS.md
  const VOICE_SCRIPTS = Object.freeze([
    {
      id: 'intro',
      label: '👋 30s Intro',
      title: 'Josh Boyer · 20 Years Across Hardware, Systems, Insurance & AI',
      text: "Hi, I'm Josh Boyer. Over the past twenty years, my work has grown from diagnosing Dell hardware on the Gloves Off team in September 2006, to server migrations at Harris, twelve years of infrastructure, insurance rules, and broker integrations at Grenville, and now claims architecture and reporting continuity at Medavie—alongside building NEXUS."
    },
    {
      id: 'foundations',
      label: '🛠️ Hardware to Cloud',
      title: 'Grounded in the Metal · Dell, Harris & Grenville HQ',
      text: "Starting in hardware support at Dell taught me to isolate the real fault on the first call rather than treating symptoms. At Harris and Grenville, that foundation grew into repeatable Small Business Server swing migrations, guiding our headquarters infrastructure from design through the physical move, and transitioning a bare-metal blade centre to VMware ESXi."
    },
    {
      id: 'insurance',
      label: '⚡ Insurance Rules',
      title: 'Shaped by the Business · Rating, Underwriting & Broker Flows',
      text: "At Grenville between 2009 and 2022, I personally designed and implemented P and C rating, underwriting, and renewal rules across SOAP, XML, and REST broker workflows. By classifying eligible standard renewals first and routing exceptions for human review, our renewal automation reached roughly eighty percent in residential, sixty percent in commercial, and forty percent in farm."
    },
    {
      id: 'medavie_nexus',
      label: '📊 Medavie & NEXUS',
      title: 'Solution Design Today · Medavie Claims & NEXUS Capstone',
      text: "At Medavie, I connect provider synchronization requirements, Excel and XML takeover-history tooling, hand-written claims SQL reconciliation, and daily Cognos ETL continuity mapping. Outside work, my independent capstone NEXUS brings those same principles—scoped context, explainable routing, and recoverable execution—into AI-assisted software."
    }
  ]);

  let mounted = false;
  let rafId = 0;
  let texturesLoaded = false;
  const loadedImages = {};
  const instances = [];

  const rigState = {
    mode: 'idle', // 'idle' | 'speaking' | 'listening' | 'gesture'
    gestureName: '',
    gestureUntil: 0,
    pointerX: 0,
    pointerY: 0,
    pointerActive: false,
    dragYaw: 0,
    dragPitch: 0,
    isDragging: false,

    // Smoothed animation channels
    headYaw: 0,
    headPitch: 0,
    headRoll: 0,
    eyeGazeX: 0,
    eyeGazeY: 0,
    blink: 0,
    browLift: 0,
    jawOpen: 0,
    visemeOpen: 0,
    visemeRound: 0,
    mouthWide: 0,
    breath: 0,
    bodySway: 0,
    atlasFrame: -6.0,
    voiceEnergy: 0,
    nowSec: 0,
    activeWordIndex: -1,
    atlasLoaded: false,

    // Blink scheduler
    nextBlinkAt: 1800,
    blinkStartAt: 0,
    blinkDuration: 150,
    doubleBlinkPending: false,

    // Saccade scheduler
    saccadeX: 0,
    saccadeY: 0,
    nextSaccadeAt: 1400,

    // Speech & Phoneme timeline state
    speakingText: '',
    speechStartedAt: 0,
    speechTotalMs: 0,
    speechRateScale: 1.0,
    firstBoundarySeen: false,
    visemeTimeline: [],
    wordAnchors: [],
    activeScriptId: 'intro',
    activeAudioEl: null,

    // Calibrated facial landmark coordinates on the full-body rig (auto-verified on texture load)
    mouthCenterX: 0.558,
    mouthCenterY: 0.214,
    eyeCenterX: 0.562,
    eyeCenterY: 0.176,

    // Web Audio API Analyser for HTMLAudioElement & PCM streams
    audioCtx: null,
    analyser: null,
    audioSourceMap: typeof WeakMap !== 'undefined' ? new WeakMap() : null,
    timeDomainBuf: null,
    freqBuf: null,
    hasLiveAudioElement: false,
    smoothAudioEnv: 0,
    silenceSinceMs: 0,
    pcmEnvelope: 0,
    pcmRound: 0,
    pcmOpen: 0,

    // Discrete 4-stage 3D viseme state machine (0=Closed, 1=Slight, 2=Round, 3=Open)
    // Eliminates 20Hz lip vibration & 50% opacity double-exposure ghosting
    prevVisemeId: 0,
    currVisemeId: 0,
    visemeBlend: 1.0,
    visemeChangedAtMs: 0
  };

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * clamp(t, 0, 1);
  }

  /**
   * Convert an English word into a sequence of phoneme viseme tokens.
   * Each token specifies:
   *  - weight (relative duration weight inside the word)
   *  - jaw: [0..1] physical lower-jaw & beard drop
   *  - open: [0..1] inner mouth cavity visibility (teeth/tongue from uTexTalk)
   *  - round: [0..1] rounded/pursed lip blend (from uTexBlink mouth)
   *  - wide: [-0.4..0.7] horizontal mouth corner spread
   */
  function wordToPhonemeTokens(rawWord) {
    const w = String(rawWord || '').toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return [];

    // Common acronyms / numbers in Josh's scripts
    const specialMap = {
      sql: [
        { weight: 1.1, jaw: 0.48, open: 0.55, round: 0.0, wide: 0.25 }, // eh-s
        { weight: 1.2, jaw: 0.35, open: 0.20, round: 0.85, wide: -0.30 }, // kyoo
        { weight: 1.1, jaw: 0.52, open: 0.60, round: 0.0, wide: 0.15 }  // el
      ],
      xml: [
        { weight: 1.1, jaw: 0.52, open: 0.60, round: 0.0, wide: 0.25 }, // ex
        { weight: 0.6, jaw: 0.0, open: 0.0, round: 0.0, wide: 0.0 },    // m (closed!)
        { weight: 1.1, jaw: 0.50, open: 0.58, round: 0.0, wide: 0.15 }  // el
      ],
      esxi: [
        { weight: 1.0, jaw: 0.36, open: 0.48, round: 0.0, wide: 0.62 }, // ee
        { weight: 1.0, jaw: 0.48, open: 0.55, round: 0.0, wide: 0.25 }, // es
        { weight: 1.0, jaw: 0.52, open: 0.60, round: 0.0, wide: 0.25 }, // ex
        { weight: 1.1, jaw: 0.72, open: 0.82, round: 0.0, wide: 0.30 }  // eye
      ],
      ai: [
        { weight: 1.2, jaw: 0.68, open: 0.78, round: 0.0, wide: 0.38 },
        { weight: 1.2, jaw: 0.72, open: 0.82, round: 0.0, wide: 0.30 }
      ],
      hq: [
        { weight: 1.1, jaw: 0.58, open: 0.68, round: 0.0, wide: 0.35 },
        { weight: 1.2, jaw: 0.36, open: 0.22, round: 0.85, wide: -0.30 }
      ]
    };
    if (specialMap[w]) return specialMap[w];

    const tokens = [];
    let i = 0;
    while (i < w.length) {
      const two = w.slice(i, i + 2);
      const three = w.slice(i, i + 3);

      // Skip silent trailing 'e' on words longer than 3 chars (e.g., "time", "move", "rule", "grenville")
      if (i === w.length - 1 && w[i] === 'e' && w.length > 3 && !/[aeiouy]/.test(w[i - 1])) {
        i += 1;
        continue;
      }

      // Digraph vowels & consonant clusters
      if (three === 'igh' || two === 'ay' || two === 'ai' || two === 'ey') {
        tokens.push({ weight: 1.35, jaw: 0.72, open: 0.84, round: 0.0, wide: 0.38 });
        i += three === 'igh' ? 3 : 2;
        continue;
      }
      if (two === 'oo' || two === 'ou' || two === 'ow' || two === 'oa' || two === 'ew') {
        tokens.push({ weight: 1.35, jaw: 0.44, open: 0.28, round: 0.86, wide: -0.32 });
        i += 2;
        continue;
      }
      if (two === 'ee' || two === 'ea' || two === 'ie') {
        tokens.push({ weight: 1.30, jaw: 0.36, open: 0.48, round: 0.0, wide: 0.65 });
        i += 2;
        continue;
      }
      if (two === 'oy' || two === 'oi') {
        tokens.push({ weight: 0.85, jaw: 0.46, open: 0.32, round: 0.82, wide: -0.25 });
        tokens.push({ weight: 0.75, jaw: 0.34, open: 0.45, round: 0.0, wide: 0.55 });
        i += 2;
        continue;
      }
      if (two === 'ar' || two === 'al' || two === 'au' || two === 'aw') {
        tokens.push({ weight: 1.35, jaw: 0.82, open: 0.90, round: 0.18, wide: 0.12 });
        i += 2;
        continue;
      }
      if (two === 'or') {
        tokens.push({ weight: 1.30, jaw: 0.48, open: 0.35, round: 0.78, wide: -0.22 });
        i += 2;
        continue;
      }
      if (two === 'er' || two === 'ir' || two === 'ur') {
        tokens.push({ weight: 1.20, jaw: 0.42, open: 0.46, round: 0.32, wide: 0.0 });
        i += 2;
        continue;
      }
      if (two === 'sh' || two === 'ch' || two === 'th') {
        tokens.push({ weight: 0.65, jaw: 0.18, open: 0.22, round: 0.22, wide: 0.12 });
        i += 2;
        continue;
      }
      if (two === 'ph') {
        tokens.push({ weight: 0.55, jaw: 0.06, open: 0.04, round: 0.0, wide: 0.10 });
        i += 2;
        continue;
      }
      if (two === 'qu') {
        tokens.push({ weight: 0.75, jaw: 0.32, open: 0.18, round: 0.82, wide: -0.28 });
        i += 2;
        continue;
      }

      // Collapse double consonants (e.g., "dell", "harris", "grenville", "support")
      if (i + 1 < w.length && w[i] === w[i + 1] && !/[aeiou]/.test(w[i])) {
        i += 1;
      }

      const ch = w[i];
      if (ch === 'm' || ch === 'b' || ch === 'p') {
        // Bilabial complete lip closure!
        tokens.push({ weight: 0.62, jaw: 0.0, open: 0.0, round: 0.0, wide: 0.0, isClosure: true });
      } else if (ch === 'f' || ch === 'v') {
        // Labiodental near-closure
        tokens.push({ weight: 0.55, jaw: 0.07, open: 0.05, round: 0.0, wide: 0.12 });
      } else if (ch === 'w') {
        tokens.push({ weight: 0.68, jaw: 0.28, open: 0.16, round: 0.85, wide: -0.32 });
      } else if (ch === 'r') {
        tokens.push({ weight: 0.58, jaw: 0.26, open: 0.24, round: 0.42, wide: -0.10 });
      } else if (ch === 's' || ch === 'z' || ch === 'c' || ch === 'x') {
        tokens.push({ weight: 0.55, jaw: 0.15, open: 0.20, round: 0.0, wide: 0.32 });
      } else if (ch === 't' || ch === 'd' || ch === 'n' || ch === 'l') {
        tokens.push({ weight: 0.52, jaw: 0.22, open: 0.28, round: 0.0, wide: 0.14 });
      } else if (ch === 'k' || ch === 'g' || ch === 'j' || ch === 'h') {
        tokens.push({ weight: 0.50, jaw: 0.28, open: 0.34, round: 0.0, wide: 0.08 });
      } else if (ch === 'a') {
        tokens.push({ weight: 1.28, jaw: 0.80, open: 0.90, round: 0.0, wide: 0.26 });
      } else if (ch === 'e') {
        tokens.push({ weight: 1.18, jaw: 0.56, open: 0.68, round: 0.0, wide: 0.38 });
      } else if (ch === 'i' || ch === 'y') {
        tokens.push({ weight: 1.15, jaw: 0.40, open: 0.50, round: 0.0, wide: 0.56 });
      } else if (ch === 'o') {
        tokens.push({ weight: 1.25, jaw: 0.54, open: 0.42, round: 0.78, wide: -0.22 });
      } else if (ch === 'u') {
        tokens.push({ weight: 1.18, jaw: 0.46, open: 0.48, round: 0.48, wide: -0.12 });
      }
      i += 1;
    }

    return tokens.length ? tokens : [{ weight: 1.0, jaw: 0.45, open: 0.52, round: 0.0, wide: 0.15 }];
  }

  /**
   * Build a phoneme-level viseme timeline + word anchor table from spoken text.
   */
  function buildVisemeTimeline(text) {
    const clean = String(text || '').trim();
    if (!clean) return { events: [], wordAnchors: [], totalMs: 0 };

    const rawTokens = clean.split(/\s+/);
    const events = [];
    const wordAnchors = [];
    let cursorMs = 0;
    let charSearchPos = 0;

    for (let wIdx = 0; wIdx < rawTokens.length; wIdx++) {
      const rawWord = rawTokens[wIdx];
      const wordCharIdx = clean.indexOf(rawWord, charSearchPos);
      if (wordCharIdx >= 0) charSearchPos = wordCharIdx + rawWord.length;

      const hasPeriod = /[.!?]$/.test(rawWord);
      const hasComma = /[,;:—–-]$/.test(rawWord) || rawWord.includes('—');
      const pauseMs = hasPeriod ? 310 : hasComma ? 165 : 22;

      const phonemes = wordToPhonemeTokens(rawWord);
      const totalWeight = phonemes.reduce((acc, p) => acc + p.weight, 0) || 1;
      // Realistic spoken word duration (~210ms for short words up to ~480ms for multi-syllable words)
      const alphaLen = rawWord.replace(/[^a-zA-Z0-9]/g, '').length;
      const wordDurMs = clamp(120 + alphaLen * 38, 145, 520);

      const emphasized = /^(josh|boyer|dell|harris|grenville|medavie|nexus|twenty|eighty|sixty|forty|first|cloud|rules|sql|xml|rest|soap|ai)$/i.test(
        rawWord.replace(/[^a-zA-Z]/g, '')
      );

      wordAnchors.push({
        wordIndex: wIdx,
        charIndex: Math.max(0, wordCharIdx),
        t0: cursorMs,
        t1: cursorMs + wordDurMs
      });

      for (let pIdx = 0; pIdx < phonemes.length; pIdx++) {
        const ph = phonemes[pIdx];
        // Enforce natural syllable-scale minimum phoneme hold (90ms..130ms) so lips never flutter at 20Hz
        const minPhMs = ph.isClosure ? 85 : 105;
        const phDur = Math.max(minPhMs, Math.round((ph.weight / totalWeight) * wordDurMs));
        const boost = emphasized && !ph.isClosure ? 1.12 : 1.0;
        const jawVal = clamp(ph.jaw * boost, 0, 1);
        const openVal = clamp(ph.open * boost, 0, 1);
        const roundVal = clamp(ph.round, 0, 1);

        // Classify into discrete 4-stage 3D viseme ladder (0=Closed, 1=Slight, 2=Round, 3=Open)
        let visemeId;
        if (ph.isClosure || (jawVal < 0.08 && openVal < 0.08)) {
          visemeId = 0;
        } else if (roundVal >= 0.40) {
          visemeId = 2;
        } else if (jawVal >= 0.44 || openVal >= 0.50) {
          visemeId = 3;
        } else {
          visemeId = 1;
        }

        events.push({
          t0: cursorMs,
          t1: cursorMs + phDur,
          wordIndex: wIdx,
          charIndex: Math.max(0, wordCharIdx),
          isClosure: Boolean(ph.isClosure),
          visemeId,
          jaw: jawVal,
          open: openVal,
          round: roundVal,
          wide: clamp(ph.wide, -0.45, 0.75),
          brow: emphasized ? 0.38 : 0.10,
          nod: emphasized && pIdx === 0 ? 0.22 : 0.0
        });
        cursorMs += phDur;
      }

      // Inter-word / punctuation rest state (closes mouth cleanly on pauses!)
      events.push({
        t0: cursorMs,
        t1: cursorMs + pauseMs,
        wordIndex: wIdx,
        charIndex: Math.max(0, wordCharIdx + rawWord.length),
        isClosure: pauseMs >= 140,
        visemeId: pauseMs >= 140 ? 0 : 1,
        jaw: pauseMs >= 140 ? 0.0 : 0.08,
        open: pauseMs >= 140 ? 0.0 : 0.06,
        round: 0.0,
        wide: 0.0,
        brow: 0.04,
        nod: 0.0
      });
      cursorMs += pauseMs;
    }

    return { events, wordAnchors, totalMs: cursorMs };
  }

  // ============================================================================
  // DISTORTION-FREE WEBGL SHADER ENGINE (4-STAGE DISCRETE 3D VISEME LADDER)
  // ============================================================================
  const VERTEX_SHADER_SRC = `
    attribute vec2 aPos;
    varying vec2 vUv;
    void main() {
      vUv = vec2((aPos.x + 1.0) * 0.5, (1.0 - aPos.y) * 0.5);
      gl_Position = vec4(aPos, 0.0, 1.0);
    }
  `;

  const FRAGMENT_SHADER_SRC = `
    precision highp float;
    varying vec2 vUv;

    uniform sampler2D uTexBase;
    uniform sampler2D uTexTalkSlight;
    uniform sampler2D uTexTalkRound;
    uniform sampler2D uTexTalk;
    uniform sampler2D uTexBlink;
    uniform sampler2D uAtlasIdle;
    uniform sampler2D uAtlasTalk;

    uniform float uHeadYaw;
    uniform float uHeadPitch;
    uniform float uHeadRoll;
    uniform vec2 uEyeGaze;
    uniform float uBlink;
    uniform float uBrowLift;
    uniform float uJawOpen;
    uniform float uVisemeOpen;
    uniform float uVisemeRound;
    uniform float uMouthWide;
    uniform float uBreath;
    uniform float uBodySway;
    uniform vec2 uMouthCenter;
    uniform vec2 uEyeCenter;
    uniform float uAtlasFrame;
    uniform float uHasAtlas;
    uniform float uVoiceEnergy;
    uniform float uTime;
    uniform float uMode;
    uniform float uPrevViseme;
    uniform float uCurrViseme;
    uniform float uVisemeBlend;

    // Sample a single discrete 3D viseme render (0=Closed, 1=Slight, 2=Round, 3=Open)
    vec3 sampleViseme3D(float vId, vec2 uv) {
      if (vId < 0.5) return texture2D(uTexBase, uv).rgb;
      if (vId < 1.5) return texture2D(uTexTalkSlight, uv).rgb;
      if (vId < 2.5) return texture2D(uTexTalkRound, uv).rgb;
      return texture2D(uTexTalk, uv).rgb;
    }

    void main() {
      // 1:1 un-warped, un-skewed pixel coordinates — zero UV distortion on face or body
      vec2 fUv = clamp(vUv, vec2(0.001), vec2(0.999));
      vec3 blinkCol = texture2D(uTexBlink, fUv).rgb;

      // Discrete 4-stage 3D viseme stepping with rapid 55ms transition & solid syllable hold
      // Eliminates 50% opacity double-lip ghosting and 20Hz lip vibration
      vec3 prevMouthCol = sampleViseme3D(uPrevViseme, fUv);
      vec3 currMouthCol = sampleViseme3D(uCurrViseme, fUv);
      float stepBlend = smoothstep(0.0, 1.0, clamp(uVisemeBlend, 0.0, 1.0));
      vec3 speechCol = mix(prevMouthCol, currMouthCol, stepBlend);

      // Apply eyelid blink strictly in the upper eye zone (fUv.y < 0.194) so blinking never touches the mouth
      float eyeZone = 1.0 - smoothstep(0.188, 0.198, fUv.y);
      vec3 finalCol = mix(speechCol, blinkCol, clamp(uBlink, 0.0, 1.0) * eyeZone);

      gl_FragColor = vec4(clamp(finalCol, 0.0, 1.0), 1.0);
    }
  `;

  function compileShader(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function createWebGLInstance(canvas) {
    let gl = null;
    try {
      gl = canvas.getContext('webgl', { alpha: false, antialias: true })
        || canvas.getContext('experimental-webgl', { alpha: false, antialias: true });
    } catch {}
    if (!gl) return null;

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
    if (!vs || !fs) return null;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;

    const quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const aPos = gl.getAttribLocation(prog, 'aPos');
    const uniforms = {};
    const uniformNames = [
      'uTexBase', 'uTexTalkSlight', 'uTexTalkRound', 'uTexTalk', 'uTexBlink',
      'uAtlasIdle', 'uAtlasTalk',
      'uHeadYaw', 'uHeadPitch', 'uHeadRoll', 'uEyeGaze',
      'uBlink', 'uBrowLift', 'uJawOpen', 'uVisemeOpen',
      'uVisemeRound', 'uMouthWide', 'uBreath', 'uBodySway',
      'uMouthCenter', 'uEyeCenter',
      'uAtlasFrame', 'uHasAtlas', 'uVoiceEnergy', 'uTime', 'uMode',
      'uPrevViseme', 'uCurrViseme', 'uVisemeBlend'
    ];
    for (const name of uniformNames) {
      uniforms[name] = gl.getUniformLocation(prog, name);
    }

    const glTextures = {};
    function uploadTextures() {
      const keys = ['base', 'talkSlight', 'talkRound', 'talk', 'blink', 'atlasIdle', 'atlasTalk'];
      keys.forEach((k, unitIdx) => {
        const img = loadedImages[k];
        if (!img) return;
        if (!glTextures[k]) glTextures[k] = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + unitIdx);
        gl.bindTexture(gl.TEXTURE_2D, glTextures[k]);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      });
    }

    return {
      type: 'webgl',
      canvas,
      gl,
      prog,
      quadBuf,
      aPos,
      uniforms,
      glTextures,
      texturesUploaded: false,
      uploadTextures
    };
  }

  function renderWebGLInstance(inst) {
    const { gl, prog, quadBuf, aPos, uniforms } = inst;
    if (!texturesLoaded) return;
    if (!inst.texturesUploaded) {
      inst.uploadTextures();
      inst.texturesUploaded = true;
    }

    gl.viewport(0, 0, inst.canvas.width, inst.canvas.height);
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const keys = ['base', 'talkSlight', 'talkRound', 'talk', 'blink', 'atlasIdle', 'atlasTalk'];
    keys.forEach((k, idx) => {
      if (!inst.glTextures[k]) return;
      gl.activeTexture(gl.TEXTURE0 + idx);
      gl.bindTexture(gl.TEXTURE_2D, inst.glTextures[k]);
    });

    gl.uniform1i(uniforms.uTexBase, 0);
    gl.uniform1i(uniforms.uTexTalkSlight, 1);
    gl.uniform1i(uniforms.uTexTalkRound, 2);
    gl.uniform1i(uniforms.uTexTalk, 3);
    gl.uniform1i(uniforms.uTexBlink, 4);
    gl.uniform1i(uniforms.uAtlasIdle, 5);
    gl.uniform1i(uniforms.uAtlasTalk, 6);

    gl.uniform1f(uniforms.uHeadYaw, rigState.headYaw);
    gl.uniform1f(uniforms.uHeadPitch, rigState.headPitch);
    gl.uniform1f(uniforms.uHeadRoll, rigState.headRoll);
    gl.uniform2f(uniforms.uEyeGaze, rigState.eyeGazeX, rigState.eyeGazeY);
    gl.uniform1f(uniforms.uBlink, rigState.blink);
    gl.uniform1f(uniforms.uBrowLift, rigState.browLift);
    gl.uniform1f(uniforms.uJawOpen, rigState.jawOpen);
    gl.uniform1f(uniforms.uVisemeOpen, rigState.visemeOpen);
    gl.uniform1f(uniforms.uVisemeRound, rigState.visemeRound);
    gl.uniform1f(uniforms.uMouthWide, rigState.mouthWide);
    gl.uniform1f(uniforms.uBreath, rigState.breath);
    gl.uniform1f(uniforms.uBodySway, rigState.bodySway);
    gl.uniform2f(uniforms.uMouthCenter, rigState.mouthCenterX, rigState.mouthCenterY);
    gl.uniform2f(uniforms.uEyeCenter, rigState.eyeCenterX, rigState.eyeCenterY);
    gl.uniform1f(uniforms.uAtlasFrame, rigState.atlasFrame);
    gl.uniform1f(uniforms.uHasAtlas, rigState.atlasLoaded ? 1.0 : 0.0);
    gl.uniform1f(uniforms.uVoiceEnergy, rigState.voiceEnergy);
    gl.uniform1f(uniforms.uTime, rigState.nowSec);
    gl.uniform1f(uniforms.uMode, rigState.mode === 'listening' ? 2.0 : (rigState.mode === 'speaking' ? 1.0 : 0.0));
    gl.uniform1f(uniforms.uPrevViseme, rigState.prevVisemeId);
    gl.uniform1f(uniforms.uCurrViseme, rigState.currVisemeId);
    gl.uniform1f(uniforms.uVisemeBlend, rigState.visemeBlend);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function renderCanvas2DFallback(inst) {
    const ctx = inst.ctx2d;
    if (!ctx || !texturesLoaded) return;
    const w = inst.canvas.width;
    const h = inst.canvas.height;
    const baseImg = loadedImages.base;
    if (!baseImg) return;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(baseImg, 0, 0, w, h);
  }

  function registerCanvas(canvas) {
    if (!canvas) return null;
    const webglInst = createWebGLInstance(canvas);
    if (webglInst) {
      instances.push(webglInst);
      return webglInst;
    }
    let ctx2d = null;
    try { ctx2d = canvas.getContext('2d'); } catch {}
    const fallbackInst = { type: 'canvas2d', canvas, ctx2d };
    instances.push(fallbackInst);
    return fallbackInst;
  }

  function autoCalibrateLandmarks() {
    if (typeof document === 'undefined' || !loadedImages.base || !loadedImages.talk || !loadedImages.blink) return;
    try {
      const cw = 128;
      const ch = 228;
      const c = document.createElement('canvas');
      c.width = cw;
      c.height = ch;
      const ctx = c.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(loadedImages.base, 0, 0, cw, ch);
      const dBase = ctx.getImageData(0, 0, cw, ch).data;
      ctx.drawImage(loadedImages.talk, 0, 0, cw, ch);
      const dTalk = ctx.getImageData(0, 0, cw, ch).data;
      ctx.drawImage(loadedImages.blink, 0, 0, cw, ch);
      const dBlink = ctx.getImageData(0, 0, cw, ch).data;

      let mSumX = 0, mSumY = 0, mWeight = 0;
      let eSumX = 0, eSumY = 0, eWeight = 0;
      for (let y = 0; y < ch; y++) {
        const ny = y / ch;
        if (ny > 0.65) continue;
        for (let x = 0; x < cw; x++) {
          const nx = x / cw;
          const idx = (y * cw + x) * 4;
          const dt = Math.abs(dBase[idx] - dTalk[idx]) + Math.abs(dBase[idx + 1] - dTalk[idx + 1]) + Math.abs(dBase[idx + 2] - dTalk[idx + 2]);
          const db = Math.abs(dBase[idx] - dBlink[idx]) + Math.abs(dBase[idx + 1] - dBlink[idx + 1]) + Math.abs(dBase[idx + 2] - dBlink[idx + 2]);
          if (dt > 60) {
            mSumX += nx * dt;
            mSumY += ny * dt;
            mWeight += dt;
          }
          if (db > 45) {
            eSumX += nx * db;
            eSumY += ny * db;
            eWeight += db;
          }
        }
      }
      if (mWeight > 500) {
        rigState.mouthCenterX = mSumX / mWeight;
        rigState.mouthCenterY = mSumY / mWeight;
      }
      if (eWeight > 300) {
        rigState.eyeCenterX = eSumX / eWeight;
        rigState.eyeCenterY = eSumY / eWeight;
      }
    } catch {}
  }

  function loadAllTextures() {
    if (typeof Image === 'undefined') return;
    const keys = ['base', 'talkSlight', 'talkRound', 'talk', 'blink'];
    let remaining = keys.length;
    for (const k of keys) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        loadedImages[k] = img;
        remaining -= 1;
        if (remaining <= 0) {
          autoCalibrateLandmarks();
          texturesLoaded = true;
          for (const inst of instances) {
            if (inst.type === 'webgl') inst.texturesUploaded = false;
          }
        }
      };
      img.src = TEXTURE_URLS[k] + '?v=v17calm';
    }

    // Load 4K 3D Kling Frame Atlases (30 contiguous 1080p 3D frames for idle + phoneme visemes)
    const atlasKeys = ['atlasIdle', 'atlasTalk'];
    let atlasRemaining = atlasKeys.length;
    for (const ak of atlasKeys) {
      const aImg = new Image();
      aImg.crossOrigin = 'anonymous';
      aImg.onload = () => {
        loadedImages[ak] = aImg;
        atlasRemaining -= 1;
        if (atlasRemaining <= 0) {
          rigState.atlasLoaded = true;
          for (const inst of instances) {
            if (inst.type === 'webgl') inst.texturesUploaded = false;
          }
        }
      };
      aImg.src = TEXTURE_URLS[ak] + '?v=v17calm';
    }
  }

  /**
   * Connect an HTMLAudioElement (e.g. ElevenLabs /api/twin/tts) to a Web Audio AnalyserNode
   * so mouth articulation follows the real audio waveform & formants at syllable cadence.
   */
  function attachAudioElementAnalyser(audioEl) {
    if (!audioEl || typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    try {
      if (!rigState.audioCtx) {
        rigState.audioCtx = new AudioCtx();
      }
      if (rigState.audioCtx.state === 'suspended') {
        rigState.audioCtx.resume().catch(() => {});
      }
      if (!rigState.analyser) {
        rigState.analyser = rigState.audioCtx.createAnalyser();
        rigState.analyser.fftSize = 512;
        rigState.analyser.smoothingTimeConstant = 0.82;
        rigState.timeDomainBuf = new Uint8Array(rigState.analyser.fftSize);
        rigState.freqBuf = new Uint8Array(rigState.analyser.frequencyBinCount);
        rigState.analyser.connect(rigState.audioCtx.destination);
      }
      let mediaSrc = rigState.audioSourceMap ? rigState.audioSourceMap.get(audioEl) : null;
      if (!mediaSrc) {
        mediaSrc = rigState.audioCtx.createMediaElementSource(audioEl);
        if (rigState.audioSourceMap) rigState.audioSourceMap.set(audioEl, mediaSrc);
        mediaSrc.connect(rigState.analyser);
      }
      rigState.hasLiveAudioElement = true;
    } catch {
      rigState.hasLiveAudioElement = false;
    }
  }

  function sampleLiveAudioAnalyser(nowMs) {
    if (!rigState.hasLiveAudioElement || !rigState.analyser || !rigState.timeDomainBuf || !rigState.freqBuf) {
      return null;
    }
    try {
      rigState.analyser.getByteTimeDomainData(rigState.timeDomainBuf);
      rigState.analyser.getByteFrequencyData(rigState.freqBuf);

      let sumSq = 0;
      const td = rigState.timeDomainBuf;
      for (let i = 0; i < td.length; i++) {
        const v = (td[i] - 128) / 128;
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / td.length);
      const rawEnv = clamp(rms * 4.5, 0, 1);

      // Syllable-scale asymmetric envelope follower (fast attack, smooth 140ms syllable release)
      // Prevents 20-30Hz glottal-pulse lip vibration while tracking real word boundaries
      const envRate = rawEnv > rigState.smoothAudioEnv ? 0.34 : 0.14;
      rigState.smoothAudioEnv = lerp(rigState.smoothAudioEnv, rawEnv, envRate);
      const env = rigState.smoothAudioEnv;

      if (rawEnv < 0.022) {
        if (rigState.silenceSinceMs === 0) rigState.silenceSinceMs = nowMs || 0;
      } else {
        rigState.silenceSinceMs = 0;
      }
      const sustainedSilence = rigState.silenceSinceMs > 0 && ((nowMs || 0) - rigState.silenceSinceMs > 75);

      // Compute Low (150-550Hz -> round OO/OH) vs Mid (600-2200Hz -> open AA/EH) vs High (2500Hz+ -> wide/sibilant)
      const fb = rigState.freqBuf;
      let lowSum = 0;
      let midSum = 0;
      let highSum = 0;
      for (let b = 2; b <= 8 && b < fb.length; b++) lowSum += fb[b];
      for (let b = 9; b <= 32 && b < fb.length; b++) midSum += fb[b];
      for (let b = 33; b <= 72 && b < fb.length; b++) highSum += fb[b];

      const lowNorm = clamp((lowSum / 7) / 205, 0, 1);
      const midNorm = clamp((midSum / 24) / 170, 0, 1);
      const highNorm = clamp((highSum / 40) / 135, 0, 1);

      return {
        env,
        sustainedSilence,
        jaw: clamp(env * 0.85 + midNorm * 0.25, 0, 1),
        open: clamp(midNorm * 1.05, 0, 1),
        round: clamp(lowNorm * 0.90 * (1.0 - midNorm * 0.55), 0, 1),
        wide: clamp(highNorm * 0.65 - lowNorm * 0.30, -0.35, 0.65)
      };
    } catch {
      return null;
    }
  }

  // ============================================================================
  // REAL-TIME ANIMATION & SYLLABLE-CADENCE 4-VISEME LIP-SYNC STEP (60 FPS)
  // ============================================================================
  let texturesRequested = false;

  function isAvatarStageVisible() {
    if (typeof document === 'undefined' || document.hidden) return false;
    const drawer = document.getElementById('twin-drawer');
    if (drawer && !drawer.hidden) return true;
    for (let i = 0; i < instances.length; i++) {
      const c = instances[i].canvas;
      if (c && c.isConnected && !c.closest('[hidden]')) return true;
    }
    return false;
  }

  function ensureAvatarActive() {
    if (!texturesRequested) {
      texturesRequested = true;
      loadAllTextures();
    }
    if (typeof document !== 'undefined') {
      document.querySelectorAll('video.twin-3d-video-layer[data-deferred-src]').forEach(vid => {
        const src = vid.getAttribute('data-deferred-src');
        if (src && !vid.getAttribute('src')) {
          vid.preload = 'metadata';
          vid.src = src;
        }
      });
    }
    if (typeof requestAnimationFrame === 'function' && !rafId) {
      rafId = requestAnimationFrame(stepPhysics);
    }
  }

  function stepPhysics(nowMs) {
    if (!isAvatarStageVisible() && rigState.mode !== 'speaking') {
      rafId = 0;
      if (typeof document !== 'undefined') {
        document.querySelectorAll('video.twin-3d-video-layer').forEach(vid => {
          if (typeof vid.pause === 'function' && !vid.paused) {
            try { vid.pause(); } catch {}
          }
        });
      }
      return;
    }
    const nowSec = nowMs * 0.001;

    // 1. Gentle Continuous Breathing & Subtle Body Sway
    rigState.breath = Math.sin(nowSec * 1.75) * 0.5 + 0.5;
    const idleSway = Math.sin(nowSec * 0.72) * 0.16 + Math.cos(nowSec * 0.45) * 0.09;

    // 2. Natural Eyelid Blinking
    if (nowMs >= rigState.nextBlinkAt && rigState.blinkStartAt === 0) {
      rigState.blinkStartAt = nowMs;
      rigState.blinkDuration = 145 + (nowMs % 35);
      rigState.doubleBlinkPending = !rigState.doubleBlinkPending && (Math.sin(nowSec * 3.7) > 0.66);
    }

    let targetBlink = 0;
    if (rigState.blinkStartAt > 0) {
      const elapsed = nowMs - rigState.blinkStartAt;
      if (elapsed < rigState.blinkDuration) {
        targetBlink = Math.sin((elapsed / rigState.blinkDuration) * Math.PI);
      } else {
        rigState.blinkStartAt = 0;
        if (rigState.doubleBlinkPending) {
          rigState.doubleBlinkPending = false;
          rigState.nextBlinkAt = nowMs + 95;
        } else {
          rigState.nextBlinkAt = nowMs + 2600 + ((nowMs * 13) % 2200);
        }
      }
    }
    rigState.blink = lerp(rigState.blink, targetBlink, 0.58);

    // 3. Natural Eye Saccades
    if (nowMs >= rigState.nextSaccadeAt) {
      rigState.saccadeX = Math.sin(nowSec * 4.1) * 0.36;
      rigState.saccadeY = Math.cos(nowSec * 2.9) * 0.22;
      rigState.nextSaccadeAt = nowMs + 1300 + ((nowMs * 7) % 1700);
    }

    // 4. Target Head & Mouth Channels
    let targetYaw = (rigState.pointerActive ? rigState.pointerX * 0.48 : rigState.saccadeX * 0.24) + rigState.dragYaw;
    let targetPitch = (rigState.pointerActive ? rigState.pointerY * 0.36 : rigState.saccadeY * 0.18) + rigState.dragPitch;
    let targetRoll = Math.sin(nowSec * 0.62) * 0.12 + targetYaw * 0.16;
    let targetGazeX = rigState.pointerActive ? rigState.pointerX * 0.85 : rigState.saccadeX;
    let targetGazeY = rigState.pointerActive ? rigState.pointerY * 0.75 : rigState.saccadeY;
    let targetBrow = 0.04;
    let targetJaw = 0.0;
    let targetOpen = 0.0;
    let targetRound = 0.0;
    let targetWide = 0.0;
    let targetSway = idleSway;
    let isClosurePhoneme = false;
    let desiredVisemeId;

    // Timed Interactive Gestures
    if (rigState.gestureName && nowMs < rigState.gestureUntil) {
      if (rigState.gestureName === 'wave') {
        targetYaw = Math.sin(nowSec * 4.5) * 0.28;
        targetPitch = -0.14 + Math.sin(nowSec * 8.0) * 0.12;
        targetRoll = Math.sin(nowSec * 4.0) * 0.28;
        targetBrow = 0.55;
        targetWide = 0.35;
      } else if (rigState.gestureName === 'explain') {
        targetYaw = Math.sin(nowSec * 2.6) * 0.32;
        targetPitch = Math.sin(nowSec * 5.2) * 0.20;
        targetRoll = Math.cos(nowSec * 2.6) * 0.24;
        targetBrow = 0.45;
      } else if (rigState.gestureName === 'think') {
        targetYaw = -0.42;
        targetPitch = -0.32;
        targetRoll = -0.35;
        targetGazeX = -0.68;
        targetGazeY = -0.55;
        targetBrow = 0.35;
        targetRound = 0.42;
      } else if (rigState.gestureName === 'smile') {
        targetPitch = -0.12;
        targetRoll = 0.18;
        targetBrow = 0.42;
        targetWide = 0.55;
        targetOpen = 0.35;
        targetJaw = 0.26;
      }
    } else if (rigState.gestureName && nowMs >= rigState.gestureUntil) {
      rigState.gestureName = '';
    }

    // Listening Mode
    if (rigState.mode === 'listening') {
      targetRoll = 0.32 + Math.sin(nowSec * 1.8) * 0.08;
      targetPitch = Math.sin(nowSec * 3.6) * 0.12;
      targetBrow = 0.28;
    }

    // Speaking Mode — Syllable-Cadence 4-Stage Viseme Solver + Acoustic Pause Gate
    rigState.nowSec = nowSec;
    if (rigState.mode === 'speaking') {
      const liveAudio = sampleLiveAudioAnalyser(nowMs);
      // Strict HTMLAudioElement playback gate: never open mouth while waiting for network buffering!
      const waitingForAudioPlayback = Boolean(
        rigState.activeAudioEl &&
        (rigState.activeAudioEl.paused || rigState.activeAudioEl.currentTime < 0.012)
      );

      if (waitingForAudioPlayback) {
        isClosurePhoneme = true;
        desiredVisemeId = 0;
        targetJaw = 0.0;
        targetOpen = 0.0;
        targetRound = 0.0;
        targetWide = 0.0;
      } else {
        const rawElapsed = Math.max(0, nowMs - rigState.speechStartedAt);
        let scaledElapsed = rawElapsed * rigState.speechRateScale;
        if (
          rigState.activeAudioEl &&
          Number.isFinite(rigState.activeAudioEl.duration) &&
          rigState.activeAudioEl.duration > 0.05 &&
          rigState.speechTotalMs > 0
        ) {
          scaledElapsed = (rigState.activeAudioEl.currentTime / rigState.activeAudioEl.duration) * rigState.speechTotalMs;
        }
        const tl = rigState.visemeTimeline;

        let activeEv = null;
        for (let i = 0; i < tl.length; i++) {
          const ev = tl[i];
          if (scaledElapsed >= ev.t0 && scaledElapsed <= ev.t1) {
            activeEv = ev;
            break;
          }
        }

        if (activeEv) {
          rigState.activeWordIndex = typeof activeEv.wordIndex === 'number' ? activeEv.wordIndex : -1;
          const span = Math.max(1, activeEv.t1 - activeEv.t0);
          const localT = clamp((scaledElapsed - activeEv.t0) / span, 0, 1);
          // Steady syllable plateau (no 20Hz sine pumping!)
          isClosurePhoneme = Boolean(activeEv.isClosure);
          desiredVisemeId = typeof activeEv.visemeId === 'number' ? activeEv.visemeId : (isClosurePhoneme ? 0 : 1);

          targetJaw = activeEv.jaw;
          targetOpen = activeEv.open;
          targetRound = activeEv.round;
          targetWide = activeEv.wide;
          targetBrow = activeEv.brow;
          targetPitch += activeEv.nod * Math.sin(localT * Math.PI);

          // If we have a live HTMLAudioElement analyser, gate pauses cleanly while avoiding 60Hz waveform jitter
          if (liveAudio) {
            if (liveAudio.sustainedSilence || liveAudio.env < 0.024) {
              isClosurePhoneme = true;
              desiredVisemeId = 0;
              targetJaw = 0.0;
              targetOpen = 0.0;
              targetRound = 0.0;
            } else if (!isClosurePhoneme) {
              if (liveAudio.round > 0.46 && desiredVisemeId !== 2) {
                desiredVisemeId = 2;
              } else if (liveAudio.env > 0.34 && desiredVisemeId === 1) {
                desiredVisemeId = 3;
              } else if (liveAudio.env < 0.11 && desiredVisemeId === 3) {
                desiredVisemeId = 1;
              }
            }
          }
        } else if (liveAudio && !liveAudio.sustainedSilence && liveAudio.env > 0.03) {
          targetJaw = liveAudio.jaw;
          targetOpen = liveAudio.open;
          targetRound = liveAudio.round;
          targetWide = liveAudio.wide;
          targetBrow = 0.18 + liveAudio.env * 0.30;
          desiredVisemeId = liveAudio.round > 0.42 ? 2 : (liveAudio.env > 0.28 ? 3 : 1);
        } else if (rigState.pcmEnvelope > 0.03) {
          targetJaw = rigState.pcmEnvelope;
          targetOpen = rigState.pcmOpen;
          targetRound = rigState.pcmRound;
          targetBrow = 0.20 + rigState.pcmEnvelope * 0.35;
          desiredVisemeId = rigState.pcmRound > 0.42 ? 2 : (rigState.pcmEnvelope > 0.28 ? 3 : 1);
        } else {
          isClosurePhoneme = true;
          desiredVisemeId = 0;
          targetJaw = 0.0;
          targetOpen = 0.0;
          targetRound = 0.0;
          targetWide = 0.0;
        }
      }

      // Smooth conversational head cadence
      const speechActivity = clamp(targetJaw + targetRound * 0.7, 0.0, 1.0);
      targetYaw += Math.sin(nowSec * 1.35) * 0.16 + Math.cos(nowSec * 0.85) * 0.10;
      targetPitch += Math.sin(nowSec * 2.8) * 0.08 * speechActivity;
      targetRoll += Math.sin(nowSec * 1.15) * 0.14;
      targetSway = Math.sin(nowSec * 1.1) * 0.28;
    } else {
      rigState.activeWordIndex = -1;
      desiredVisemeId = rigState.gestureName === 'smile' && nowMs < rigState.gestureUntil ? 1 : 0;
    }

    // Discrete 4-Viseme Hysteresis Hold State Machine:
    // Holds each mouth shape for at least 120ms (85ms for M/B/P bilabial closures) and completes
    // frame transitions in 55ms -> 100% solid 3D viseme renders with zero lip vibration!
    const holdElapsedMs = Math.max(0, nowMs - rigState.visemeChangedAtMs);
    const minHoldMs = rigState.mode !== 'speaking'
      ? 40
      : (rigState.currVisemeId === 0 ? 85 : (desiredVisemeId === 0 && isClosurePhoneme ? 90 : 125));

    if (desiredVisemeId !== rigState.currVisemeId && holdElapsedMs >= minHoldMs) {
      rigState.prevVisemeId = rigState.currVisemeId;
      rigState.currVisemeId = desiredVisemeId;
      rigState.visemeBlend = 0.0;
      rigState.visemeChangedAtMs = nowMs;
    } else {
      const transitionSpanMs = 55;
      rigState.visemeBlend = clamp((nowMs - rigState.visemeChangedAtMs) / transitionSpanMs, 0.0, 1.0);
      if (rigState.visemeBlend >= 1.0) {
        rigState.prevVisemeId = rigState.currVisemeId;
      }
    }

    // Ultra-smooth head damping + asymmetric phoneme articulation
    rigState.headYaw = lerp(rigState.headYaw, clamp(targetYaw, -0.75, 0.75), 0.075);
    rigState.headPitch = lerp(rigState.headPitch, clamp(targetPitch, -0.65, 0.65), 0.080);
    rigState.headRoll = lerp(rigState.headRoll, clamp(targetRoll, -0.65, 0.65), 0.075);
    rigState.eyeGazeX = lerp(rigState.eyeGazeX, clamp(targetGazeX, -1, 1), 0.18);
    rigState.eyeGazeY = lerp(rigState.eyeGazeY, clamp(targetGazeY, -1, 1), 0.18);
    rigState.browLift = lerp(rigState.browLift, clamp(targetBrow, 0, 1), 0.15);

    const jawLerpRate = isClosurePhoneme || targetJaw < rigState.jawOpen ? 0.36 : 0.24;
    const openLerpRate = isClosurePhoneme || targetOpen < rigState.visemeOpen ? 0.36 : 0.24;
    const roundLerpRate = isClosurePhoneme || targetRound < rigState.visemeRound ? 0.34 : 0.22;

    rigState.jawOpen = lerp(rigState.jawOpen, clamp(targetJaw, 0, 1), jawLerpRate);
    rigState.visemeOpen = lerp(rigState.visemeOpen, clamp(targetOpen, 0, 1), openLerpRate);
    rigState.visemeRound = lerp(rigState.visemeRound, clamp(targetRound, 0, 1), roundLerpRate);
    rigState.mouthWide = lerp(rigState.mouthWide, clamp(targetWide, -0.45, 0.75), 0.22);
    rigState.bodySway = lerp(rigState.bodySway, clamp(targetSway, -1, 1), 0.08);

    if (rigState.mode === 'speaking') {
      const activeEnergy = Math.max(rigState.jawOpen, rigState.visemeOpen, rigState.visemeRound * 0.85);
      rigState.voiceEnergy = lerp(rigState.voiceEnergy, clamp(activeEnergy * 1.25, 0, 1), 0.25);
    } else {
      rigState.voiceEnergy = lerp(rigState.voiceEnergy, rigState.mode === 'listening' ? 0.38 : 0.08, 0.15);
    }

    // Decay live PCM envelope
    rigState.pcmEnvelope *= 0.86;
    rigState.pcmOpen *= 0.86;
    rigState.pcmRound *= 0.86;

    updateWaveBars(nowSec);
    updateHolographicStageHud(nowSec);
    syncVideoPlaybackWithVoice(nowMs);

    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i];
      if (!inst.canvas || !inst.canvas.isConnected) continue;
      if (inst.type === 'webgl') renderWebGLInstance(inst);
      else renderCanvas2DFallback(inst);
    }

    rafId = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(stepPhysics) : 0;
  }

  function syncVideoPlaybackWithVoice(nowMs) {
    if (typeof document === 'undefined') return;
    const idleVid = document.querySelector('video[data-avatar-video="idle"]');
    const talkVid = document.querySelector('video[data-avatar-video="talking"]');

    if (idleVid && idleVid.getAttribute('data-video-ready') === 'true') {
      const waitingForAudioPlayback = Boolean(
        rigState.activeAudioEl &&
        (rigState.activeAudioEl.paused || rigState.activeAudioEl.currentTime < 0.012)
      );
      const showIdleVideo = rigState.mode !== 'speaking' || waitingForAudioPlayback;
      const wasIdleActive = idleVid.classList.contains('is-active');
      if (showIdleVideo !== wasIdleActive) {
        idleVid.classList.toggle('is-active', showIdleVideo);
        if (!showIdleVideo) {
          // Reset to frame 0 (exact match to josh-avatar-3d-rig-base.jpg) so returning to idle has zero jump
          try { idleVid.currentTime = 0; } catch {}
        }
      }
      if (showIdleVideo && idleVid.paused && typeof idleVid.play === 'function') {
        try { idleVid.play().catch(() => {}); } catch {}
      }
    }

    if (talkVid && talkVid.getAttribute('data-video-ready') === 'true') {
      const isSpk = rigState.mode === 'speaking';
      const hasActiveGesture = nowMs < rigState.gestureUntil && (rigState.gestureName === 'wave' || rigState.gestureName === 'explain');
      const showTalking = isSpk || hasActiveGesture;

      const wasActive = talkVid.classList.contains('is-active');
      if (showTalking !== wasActive) {
        talkVid.classList.toggle('is-active', showTalking);
        if (showTalking) {
          try {
            talkVid.playbackRate = 1.0;
            if (talkVid.paused && typeof talkVid.play === 'function') {
              talkVid.play().catch(() => {});
            }
          } catch {}
        }
      }
    }
  }

  function updateWaveBars(nowSec) {
    if (typeof document === 'undefined') return;
    const bars = document.querySelectorAll('.josh-3d-wave-bars i');
    if (!bars.length) return;
    const energy = rigState.mode === 'speaking'
      ? Math.max(0.15, rigState.jawOpen * 0.95 + rigState.visemeRound * 0.65)
      : 0.12;
    for (let i = 0; i < bars.length; i++) {
      const h = rigState.mode === 'speaking'
        ? Math.round(3 + energy * 11 * Math.abs(Math.sin(nowSec * 14 + i * 1.3)))
        : 4;
      bars[i].style.height = `${h}px`;
    }
  }

  // Precomputed 3D Icosahedron vertices & edges for the rotating Holographic Neural Core above Josh's open palm
  const HOLO_PHI = (1 + Math.sqrt(5)) / 2;
  const HOLO_VERTS = [
    [-1, HOLO_PHI, 0], [1, HOLO_PHI, 0], [-1, -HOLO_PHI, 0], [1, -HOLO_PHI, 0],
    [0, -1, HOLO_PHI], [0, 1, HOLO_PHI], [0, -1, -HOLO_PHI], [0, 1, -HOLO_PHI],
    [HOLO_PHI, 0, -1], [HOLO_PHI, 0, 1], [-HOLO_PHI, 0, -1], [-HOLO_PHI, 0, 1]
  ].map(([x, y, z]) => {
    const len = Math.hypot(x, y, z) || 1;
    return [x / len, y / len, z / len];
  });
  const HOLO_EDGES = [];
  for (let i = 0; i < HOLO_VERTS.length; i++) {
    for (let j = i + 1; j < HOLO_VERTS.length; j++) {
      const d = Math.hypot(
        HOLO_VERTS[i][0] - HOLO_VERTS[j][0],
        HOLO_VERTS[i][1] - HOLO_VERTS[j][1],
        HOLO_VERTS[i][2] - HOLO_VERTS[j][2]
      );
      if (d < 1.25) HOLO_EDGES.push([i, j]);
    }
  }

  function renderSpaceshipHoloCanvas(nowSec) {
    if (typeof document === 'undefined') return;
    const fxCanvas = document.querySelector('canvas[data-josh-3d-fx-canvas]');
    if (!fxCanvas) return;
    let ctx = null;
    try { ctx = fxCanvas.getContext('2d'); } catch {}
    if (!ctx) return;

    const W = fxCanvas.width || 768;
    const H = fxCanvas.height || 1376;
    ctx.clearRect(0, 0, W, H);

    const isSpk = rigState.mode === 'speaking';
    const isLst = rigState.mode === 'listening';
    const energy = clamp(rigState.voiceEnergy || (isSpk ? 0.45 : 0.08), 0, 1);
    const primaryRgb = isLst ? '247, 144, 9' : '56, 189, 248';
    const accentRgb = isSpk ? '96, 165, 250' : '14, 165, 233';

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // ------------------------------------------------------------------------
    // 1. 3D PERSPECTIVE COUNTER-ROTATING PEDESTAL RINGS & FLOOR SHOCKWAVES
    // ------------------------------------------------------------------------
    const pedX = W * (0.532 - rigState.headYaw * 0.010);
    const pedY = H * (0.914 - rigState.headPitch * 0.006);
    const rxBase = W * 0.435;
    const ryBase = H * 0.046;

    // Expanding audio-reactive floor ripple rings
    const nRipples = 3;
    for (let r = 0; r < nRipples; r++) {
      const phase = (nowSec * (isSpk ? 0.85 : 0.35) + r / nRipples) % 1;
      const scale = 0.35 + phase * 0.92;
      const alpha = (1 - phase) * (0.18 + energy * 0.42);
      ctx.beginPath();
      ctx.ellipse(pedX, pedY, rxBase * scale, ryBase * scale, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${primaryRgb}, ${alpha.toFixed(3)})`;
      ctx.lineWidth = 1.5 + energy * 2.2;
      ctx.stroke();
    }

    // Counter-rotating segmented 3D cybernetic floor arcs
    for (let ring = 0; ring < 3; ring++) {
      const rScale = 0.68 + ring * 0.19;
      const dir = ring % 2 === 0 ? 1 : -1;
      const rot = nowSec * (0.55 + ring * 0.22) * dir;
      const segs = 6 + ring * 2;
      for (let s = 0; s < segs; s++) {
        const a0 = rot + (s * Math.PI * 2) / segs;
        const a1 = a0 + (Math.PI * 1.15) / segs;
        ctx.beginPath();
        ctx.ellipse(pedX, pedY, rxBase * rScale, ryBase * rScale, 0, a0, a1);
        ctx.strokeStyle = `rgba(${primaryRgb}, ${(0.28 + energy * 0.45).toFixed(3)})`;
        ctx.lineWidth = ring === 1 ? 2.6 : 1.6;
        ctx.stroke();
      }
    }

    // Orbiting 3D glowing floor telemetry nodes
    for (let k = 0; k < 8; k++) {
      const ang = nowSec * 0.75 + (k * Math.PI * 2) / 8;
      const nx = pedX + Math.cos(ang) * rxBase * 0.96;
      const ny = pedY + Math.sin(ang) * ryBase * 0.96;
      const zDepth = 0.65 + 0.35 * Math.sin(ang);
      ctx.beginPath();
      ctx.arc(nx, ny, (2.2 + energy * 2.5) * zDepth, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${(0.55 * zDepth).toFixed(3)})`;
      ctx.fill();
    }

    // ------------------------------------------------------------------------
    // 2. RISING 3D VOLUMETRIC TELEMETRY PARTICLES
    // ------------------------------------------------------------------------
    for (let p = 0; p < 24; p++) {
      const seed = (p * 1.6180339) % 1;
      const speed = 0.08 + (p % 5) * 0.025 + (isSpk ? 0.06 : 0);
      const life = (nowSec * speed + seed) % 1;
      const py = H * (0.91 - life * 0.76);
      const angle = seed * Math.PI * 2 + nowSec * 0.4 * (p % 2 === 0 ? 1 : -1);
      const radiusSpread = W * (0.14 + 0.28 * Math.sin(seed * 17));
      const px = pedX + Math.cos(angle) * radiusSpread;
      const pAlpha = Math.sin(life * Math.PI) * (0.24 + energy * 0.35);
      const pRadius = 1.2 + (p % 3) * 0.8 + energy * 1.2;
      ctx.beginPath();
      ctx.arc(px, py, pRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${primaryRgb}, ${pAlpha.toFixed(3)})`;
      ctx.fill();
    }

    // ------------------------------------------------------------------------
    // 3. 3D ROTATING HOLOGRAPHIC NEURAL CORE FLOATING ABOVE JOSH'S OPEN PALM
    // ------------------------------------------------------------------------
    const palmX = W * (0.852 - rigState.headYaw * 0.012 + rigState.bodySway * 0.008);
    const palmY = H * (0.348 + (rigState.breath - 0.5) * 0.005);
    const floatBob = Math.sin(nowSec * 2.4) * (H * 0.007);
    const orbX = W * (0.832 - rigState.headYaw * 0.016) + Math.cos(nowSec * 1.5) * 4;
    const orbY = H * 0.228 + floatBob;
    const orbRadius = W * (0.082 + energy * 0.024);

    // Volumetric projection cone from open palm up to the 3D Neural Orb
    const coneGrad = ctx.createLinearGradient(palmX, palmY, orbX, orbY - orbRadius * 0.5);
    coneGrad.addColorStop(0, `rgba(${primaryRgb}, ${(0.34 + energy * 0.32).toFixed(3)})`);
    coneGrad.addColorStop(0.65, `rgba(${accentRgb}, ${(0.14 + energy * 0.18).toFixed(3)})`);
    coneGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.beginPath();
    ctx.moveTo(palmX - W * 0.032, palmY);
    ctx.lineTo(orbX - orbRadius * 1.22, orbY);
    ctx.lineTo(orbX + orbRadius * 1.22, orbY);
    ctx.lineTo(palmX + W * 0.032, palmY);
    ctx.closePath();
    ctx.fillStyle = coneGrad;
    ctx.fill();

    // Radial core glow behind the 3D polyhedron
    const coreGlow = ctx.createRadialGradient(orbX, orbY, 2, orbX, orbY, orbRadius * 1.65);
    coreGlow.addColorStop(0, `rgba(255, 255, 255, ${(0.55 + energy * 0.35).toFixed(3)})`);
    coreGlow.addColorStop(0.35, `rgba(${primaryRgb}, ${(0.38 + energy * 0.35).toFixed(3)})`);
    coreGlow.addColorStop(1, 'rgba(7, 85, 255, 0)');
    ctx.beginPath();
    ctx.arc(orbX, orbY, orbRadius * 1.65, 0, Math.PI * 2);
    ctx.fillStyle = coreGlow;
    ctx.fill();

    // Two tilted 3D gyroscopic electron rings around the Neural Core
    for (let g = 0; g < 2; g++) {
      ctx.beginPath();
      const tilt = (g === 0 ? 0.55 : -0.62) + Math.sin(nowSec * 0.9 + g) * 0.22;
      ctx.ellipse(orbX, orbY, orbRadius * 1.36, orbRadius * 0.44, tilt, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${primaryRgb}, ${(0.42 + energy * 0.40).toFixed(3)})`;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    // 3D Perspective Rotation of the Icosahedron Neural Mesh
    const rotY = nowSec * (isSpk ? 1.85 : 0.85) + rigState.headYaw * 1.4;
    const rotX = nowSec * 0.62 + rigState.headPitch * 1.2;
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);

    const projVerts = HOLO_VERTS.map(([vx, vy, vz]) => {
      // Rotate Y then X
      const x1 = vx * cosY - vz * sinY;
      const z1 = vx * sinY + vz * cosY;
      const y2 = vy * cosX - z1 * sinX;
      const z2 = vy * sinX + z1 * cosX;
      const persp = 2.8 / (2.8 - z2 * 0.65);
      return {
        x: orbX + x1 * orbRadius * 0.72 * persp,
        y: orbY + y2 * orbRadius * 0.72 * persp,
        z: z2
      };
    });

    // Draw 3D wireframe edges with depth-shaded alpha
    for (let e = 0; e < HOLO_EDGES.length; e++) {
      const [i, j] = HOLO_EDGES[e];
      const pA = projVerts[i];
      const pB = projVerts[j];
      const depthAlpha = clamp(0.32 + ((pA.z + pB.z) * 0.25 + 0.5) * 0.48 + energy * 0.25, 0.15, 0.95);
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.strokeStyle = `rgba(${primaryRgb}, ${depthAlpha.toFixed(3)})`;
      ctx.lineWidth = 1.35 + energy * 0.9;
      ctx.stroke();
    }

    // Draw glowing 3D vertices
    for (let v = 0; v < projVerts.length; v++) {
      const pv = projVerts[v];
      if (pv.z < -0.25) continue;
      ctx.beginPath();
      ctx.arc(pv.x, pv.y, 2.2 + energy * 1.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.fill();
    }

    ctx.restore();
  }

  function updateHolographicStageHud(nowSec) {
    if (typeof document === 'undefined') return;
    renderSpaceshipHoloCanvas(nowSec);
    // 1. Update 16-band real-time FFT spectrum analyzer on the 3D stage
    const fftBars = document.querySelectorAll('[data-josh-3d-fft-bars] i');
    if (fftBars.length) {
      const isSpk = rigState.mode === 'speaking';
      const isLst = rigState.mode === 'listening';
      const fb = rigState.freqBuf;
      const hasLiveFreq = isSpk && rigState.hasLiveAudioElement && fb && fb.length > 20;
      const fallbackEnergy = isSpk
        ? Math.max(0.12, rigState.jawOpen * 0.9 + rigState.visemeRound * 0.6)
        : (isLst ? 0.35 : 0.08);
      for (let i = 0; i < fftBars.length; i++) {
        let h;
        if (hasLiveFreq) {
          const binIdx = Math.min(fb.length - 1, 2 + i * 2);
          const norm = fb[binIdx] / 255;
          h = Math.round(3 + norm * 22);
        } else if (isSpk || isLst) {
          h = Math.round(3 + fallbackEnergy * 18 * Math.abs(Math.sin(nowSec * 15 + i * 0.85)));
        } else {
          h = Math.round(3 + 3.5 * Math.abs(Math.sin(nowSec * 3.2 + i * 0.55)));
        }
        fftBars[i].style.height = `${h}px`;
      }
    }

    // 2. Highlight active word in the live stage teleprompter
    const prompterBox = document.querySelector('[data-josh-3d-stage-prompter]');
    if (prompterBox) {
      const isSpk = rigState.mode === 'speaking' && Boolean(rigState.speakingText);
      prompterBox.hidden = !isSpk;
      if (isSpk) {
        const wordSpans = prompterBox.querySelectorAll('span[data-widx]');
        for (let i = 0; i < wordSpans.length; i++) {
          const idx = Number(wordSpans[i].getAttribute('data-widx'));
          wordSpans[i].classList.toggle('is-spoken', idx <= rigState.activeWordIndex);
          wordSpans[i].classList.toggle('is-current', idx === rigState.activeWordIndex);
        }
      }
    }

    // 3. Highlight active holographic pillar hotspot
    const holoNodes = document.querySelectorAll('[data-holo-script]');
    holoNodes.forEach(node => {
      const sid = node.getAttribute('data-holo-script');
      node.classList.toggle('is-speaking-node', rigState.mode === 'speaking' && rigState.activeScriptId === sid);
    });
  }

  // ============================================================================
  // SPEECH & VOICE SYNCHRONIZATION HOOKS (Connected to TwinVoice)
  // ============================================================================
  function syncStageStatusDom() {
    if (typeof document === 'undefined') return;
    const cards = document.querySelectorAll('.josh-3d-stage-card, .twin-3d-avatar-stage');
    cards.forEach(c => c.setAttribute('data-avatar-state', rigState.mode));

    const speakBtns = document.querySelectorAll('[data-josh-3d-speak-btn]');
    speakBtns.forEach(btn => {
      const isSpk = rigState.mode === 'speaking';
      btn.classList.toggle('is-speaking', isSpk);
      btn.textContent = isSpk ? '⏹ Stop Speaking' : '▶ Speak Intro';
    });

    const statusLabels = document.querySelectorAll('[data-josh-3d-status-text]');
    statusLabels.forEach(lbl => {
      if (rigState.mode === 'speaking') {
        lbl.textContent = '3D Rig · Speaking Live (Josh Voice)';
      } else if (rigState.mode === 'listening') {
        lbl.textContent = '3D Rig · Listening…';
      } else {
        lbl.textContent = 'Interactive 3D Rig · Move cursor or click to talk';
      }
    });

    const captionBoxes = document.querySelectorAll('[data-josh-3d-caption-box]');
    captionBoxes.forEach(box => {
      if (rigState.mode === 'speaking' && rigState.speakingText) {
        box.hidden = false;
        const textEl = box.querySelector('[data-josh-3d-caption-text]');
        if (textEl) textEl.textContent = rigState.speakingText;
      } else {
        box.hidden = true;
      }
    });

    // Populate word-by-word spans inside the 3D Stage Holographic Teleprompter
    const prompterTextEl = document.querySelector('[data-josh-3d-prompter-words]');
    if (prompterTextEl) {
      if (rigState.mode === 'speaking' && rigState.speakingText) {
        const words = rigState.speakingText.split(/\s+/);
        prompterTextEl.replaceChildren();
        words.forEach((w, idx) => {
          const sp = document.createElement('span');
          sp.setAttribute('data-widx', String(idx));
          sp.textContent = w + ' ';
          prompterTextEl.appendChild(sp);
        });
      } else {
        prompterTextEl.replaceChildren();
      }
    }

    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    syncVideoPlaybackWithVoice(nowMs);
  }

  function notifySpeechStart(text, opts = {}) {
    const clean = String(text || '').trim();
    if (!clean) return;
    ensureAvatarActive();
    const built = buildVisemeTimeline(clean);
    rigState.mode = 'speaking';
    rigState.speakingText = clean;
    rigState.speechStartedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    rigState.speechTotalMs = built.totalMs;
    rigState.speechRateScale = 1.0;
    rigState.firstBoundarySeen = false;
    rigState.visemeTimeline = built.events;
    rigState.wordAnchors = built.wordAnchors;
    rigState.hasLiveAudioElement = false;
    rigState.smoothAudioEnv = 0;
    rigState.silenceSinceMs = 0;
    rigState.activeAudioEl = (opts && opts.audio) ? opts.audio : null;

    if (opts && opts.audio) {
      attachAudioElementAnalyser(opts.audio);
    }
    syncStageStatusDom();
  }

  function notifySpeechActuallyStarted() {
    // Reset timeline clock to the exact moment browser TTS audio output begins
    if (rigState.mode === 'speaking' && !rigState.firstBoundarySeen) {
      rigState.speechStartedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      rigState.speechRateScale = 1.0;
    }
  }

  function notifySpeechBoundary(event) {
    if (!event || typeof event.charIndex !== 'number') return;
    const anchors = rigState.wordAnchors;
    if (!anchors || !anchors.length) return;

    const charIdx = event.charIndex;
    let matchedAnchor = null;
    for (let i = 0; i < anchors.length; i++) {
      if (anchors[i].charIndex >= charIdx) {
        matchedAnchor = anchors[i];
        break;
      }
    }
    if (!matchedAnchor) return;

    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    rigState.firstBoundarySeen = true;

    // Dynamically adapt speechRateScale to match the user's system TTS voice speed,
    // and lock the timeline cursor onto the exact word boundary being spoken right now!
    const actualElapsed = Math.max(1, nowMs - rigState.speechStartedAt);
    if (matchedAnchor.t0 > 180 && actualElapsed > 120) {
      const observedRatio = matchedAnchor.t0 / actualElapsed;
      rigState.speechRateScale = clamp(lerp(rigState.speechRateScale, observedRatio, 0.35), 0.68, 1.48);
    }
    rigState.speechStartedAt = nowMs - (matchedAnchor.t0 / rigState.speechRateScale);
  }

  function notifyPcmChunk(channelData) {
    if (!channelData || !channelData.length) return;
    let sumSq = 0;
    let zeroCrossings = 0;
    const step = Math.max(1, Math.floor(channelData.length / 256));
    let prev = channelData[0];
    let count = 0;
    for (let i = 0; i < channelData.length; i += step) {
      const s = channelData[i];
      sumSq += s * s;
      if ((s >= 0 && prev < 0) || (s < 0 && prev >= 0)) zeroCrossings++;
      prev = s;
      count++;
    }
    const rms = Math.sqrt(sumSq / Math.max(1, count));
    const zcr = zeroCrossings / Math.max(1, count);
    const env = clamp(rms * 4.2, 0, 1);
    rigState.mode = 'speaking';
    rigState.pcmEnvelope = Math.max(rigState.pcmEnvelope, env);
    rigState.pcmOpen = clamp(env * (zcr > 0.18 ? 0.95 : 0.55), 0, 1);
    rigState.pcmRound = clamp(env * (zcr <= 0.18 ? 0.88 : 0.25), 0, 1);
    syncStageStatusDom();
  }

  function notifySpeechEnd() {
    rigState.mode = 'idle';
    rigState.visemeTimeline = [];
    rigState.wordAnchors = [];
    rigState.speechTotalMs = 0;
    rigState.activeAudioEl = null;
    rigState.hasLiveAudioElement = false;
    rigState.smoothAudioEnv = 0;
    rigState.silenceSinceMs = 0;
    rigState.prevVisemeId = 0;
    rigState.currVisemeId = 0;
    rigState.visemeBlend = 1.0;
    syncStageStatusDom();
  }

  function notifyListening(isListening) {
    rigState.mode = isListening ? 'listening' : 'idle';
    syncStageStatusDom();
  }

  function triggerGesture(gestureName, durationMs = 1700) {
    rigState.gestureName = gestureName;
    rigState.gestureUntil = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + durationMs;
  }

  function speakScript(scriptOrText) {
    if (rigState.mode === 'speaking' && !scriptOrText) {
      if (root.TwinVoice) root.TwinVoice.stopSpeaking();
      else notifySpeechEnd();
      return;
    }

    let text;
    if (typeof scriptOrText === 'string') {
      const preset = VOICE_SCRIPTS.find(s => s.id === scriptOrText);
      if (preset) {
        rigState.activeScriptId = preset.id;
        text = preset.text;
      } else {
        text = scriptOrText;
      }
    } else {
      const preset = VOICE_SCRIPTS.find(s => s.id === rigState.activeScriptId) || VOICE_SCRIPTS[0];
      text = preset.text;
    }

    if (!text) return;

    if (typeof document !== 'undefined') {
      document.querySelectorAll('[data-josh-3d-topic]').forEach(btn => {
        btn.classList.toggle('is-active', btn.getAttribute('data-josh-3d-topic') === rigState.activeScriptId);
      });
    }

    if (root.TwinVoice && typeof root.TwinVoice.speak === 'function') {
      root.TwinVoice.speak(text, {
        serverTtsEnabled: true,
        voiceId: '2ccxXaT9cMefjPlK2Pwn'
      });
    } else {
      const built = buildVisemeTimeline(text);
      notifySpeechStart(text, { mode: 'visual-only' });
      setTimeout(() => notifySpeechEnd(), Math.max(2500, built.totalMs + 250));
    }
  }

  // ============================================================================
  // DOM BUILDERS FOR ABOUT PAGE, HOME HERO DOCK, & DIGITAL TWIN DRAWER
  // ============================================================================
  

  

  

  function mountTwinDrawerAvatar() {
    const drawer = document.getElementById('twin-drawer');
    const contextBar = drawer ? drawer.querySelector('.twin-context-bar') : null;
    if (drawer && contextBar && !drawer.querySelector('.twin-3d-avatar-stage')) {
      drawer.classList.add('has-3d-avatar-split');

      // Wrap the existing chat header/context/body/footer into a right-hand column (.twin-chat-column)
      // while placing the full-height 3D character stage (.twin-3d-avatar-stage) on the left!
      const chatCol = document.createElement('div');
      chatCol.className = 'twin-chat-column';
      while (drawer.firstChild) {
        chatCol.appendChild(drawer.firstChild);
      }

      const stage = document.createElement('div');
      stage.className = 'twin-3d-avatar-stage';
      stage.setAttribute('data-avatar-state', rigState.mode);

      const canvasWrap = document.createElement('div');
      canvasWrap.className = 'twin-3d-canvas-wrap';
      canvasWrap.title = 'Full-body 3D Josh · Click ▶ Speak Intro to test voice';
      const twinCanvas = document.createElement('canvas');
      twinCanvas.width = 768;
      twinCanvas.height = 1376;
      twinCanvas.setAttribute('aria-label', 'Interactive full-body stylized 3D animated avatar of Josh Boyer');
      canvasWrap.appendChild(twinCanvas);
      registerCanvas(twinCanvas);

      // Double-buffered 3D video loop players (deferred until #twin-drawer opens)
      ['idle', 'talking'].forEach(vKey => {
        if (!VIDEO_URLS[vKey]) return;
        const vid = document.createElement('video');
        vid.className = 'twin-3d-video-layer';
        vid.setAttribute('data-avatar-video', vKey);
        vid.setAttribute('data-deferred-src', VIDEO_URLS[vKey]);
        vid.muted = true;
        vid.loop = true;
        vid.playsInline = true;
        vid.preload = 'none';
        vid.addEventListener('loadeddata', () => {
          vid.setAttribute('data-video-ready', 'true');
          syncStageStatusDom();
          if (isAvatarStageVisible() && typeof vid.play === 'function') {
            try { vid.play().catch(() => {}); } catch {}
          }
        });
        canvasWrap.appendChild(vid);
      });

      // Floating Holographic Teleprompter & 16-Band Live Spectrum Deck at the bottom of the 3D stage
      const stageDeck = document.createElement('div');
      stageDeck.className = 'twin-3d-holo-deck';

      const prompterBox = document.createElement('div');
      prompterBox.className = 'twin-3d-holo-prompter';
      prompterBox.setAttribute('data-josh-3d-stage-prompter', 'true');
      prompterBox.hidden = true;
      const prompterWords = document.createElement('div');
      prompterWords.className = 'twin-3d-holo-prompter-words';
      prompterWords.setAttribute('data-josh-3d-prompter-words', 'true');
      prompterBox.appendChild(prompterWords);

      const deckBar = document.createElement('div');
      deckBar.className = 'twin-3d-holo-deck-bar';

      const telemetryTag = document.createElement('div');
      telemetryTag.className = 'twin-3d-holo-telemetry';
      const teleDot = document.createElement('span');
      teleDot.className = 'josh-3d-status-dot';
      const teleText = document.createElement('span');
      teleText.setAttribute('data-josh-3d-status-text', 'true');
      teleText.textContent = '3D Avatar Stage · Ready';
      telemetryTag.append(teleDot, teleText);

      const fftWrap = document.createElement('div');
      fftWrap.className = 'twin-3d-fft-bars';
      fftWrap.setAttribute('data-josh-3d-fft-bars', 'true');
      for (let i = 0; i < 16; i++) {
        fftWrap.appendChild(document.createElement('i'));
      }

      deckBar.append(telemetryTag, fftWrap);
      stageDeck.append(prompterBox, deckBar);
      canvasWrap.appendChild(stageDeck);

      let dragStartX = 0;
      let dragStartY = 0;
      canvasWrap.addEventListener('pointerdown', e => {
        rigState.isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
      });
      window.addEventListener('pointerup', () => {
        if (rigState.isDragging) {
          rigState.isDragging = false;
          rigState.dragYaw = 0;
          rigState.dragPitch = 0;
        }
      });
      canvasWrap.addEventListener('pointermove', e => {
        const rect = canvasWrap.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
        rigState.pointerX = clamp(nx, -1, 1);
        rigState.pointerY = clamp(ny, -1, 1);
        rigState.pointerActive = true;
        if (rigState.isDragging) {
          rigState.dragYaw = clamp((e.clientX - dragStartX) / 140, -0.45, 0.45);
          rigState.dragPitch = clamp((e.clientY - dragStartY) / 140, -0.38, 0.38);
        }
      });
      canvasWrap.addEventListener('pointerleave', () => {
        rigState.pointerActive = false;
      });

      const info = document.createElement('div');
      info.className = 'twin-3d-stage-info';

      const statusBadge = document.createElement('div');
      statusBadge.className = 'josh-3d-badge';
      const dot = document.createElement('span');
      dot.className = 'josh-3d-status-dot';
      const statusText = document.createElement('span');
      statusText.setAttribute('data-josh-3d-status-text', 'true');
      statusText.textContent = 'Interactive 3D Rig · Move cursor or click to talk';
      const waveBars = document.createElement('span');
      waveBars.className = 'josh-3d-wave-bars';
      for (let i = 0; i < 5; i++) waveBars.appendChild(document.createElement('i'));
      statusBadge.append(dot, statusText, waveBars);

      const primaryBtns = document.createElement('div');
      primaryBtns.className = 'twin-3d-quick-btns';

      const introBtn = document.createElement('button');
      introBtn.type = 'button';
      introBtn.className = 'josh-3d-speak-btn';
      introBtn.setAttribute('data-josh-3d-speak-btn', 'true');
      introBtn.textContent = '▶ Speak Intro';
      introBtn.addEventListener('click', () => {
        if (rigState.mode === 'speaking') speakScript(null);
        else speakScript(rigState.activeScriptId || 'intro');
      });

      primaryBtns.appendChild(introBtn);

      const gestures = [
        { id: 'wave', label: '👋 Wave' },
        { id: 'explain', label: '💡 Explain' },
        { id: 'think', label: '🤔 Think' },
        { id: 'smile', label: '😄 Smile' }
      ];
      gestures.forEach(g => {
        const gBtn = document.createElement('button');
        gBtn.type = 'button';
        gBtn.className = 'twin-3d-quick-btn';
        gBtn.textContent = g.label;
        gBtn.addEventListener('click', () => triggerGesture(g.id, 1800));
        primaryBtns.appendChild(gBtn);
      });

      const topicRow = document.createElement('div');
      topicRow.className = 'josh-3d-topic-pills';
      VOICE_SCRIPTS.forEach(s => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'josh-3d-topic-pill' + (s.id === rigState.activeScriptId ? ' is-active' : '');
        pill.setAttribute('data-josh-3d-topic', s.id);
        pill.textContent = s.label;
        pill.addEventListener('click', () => speakScript(s.id));
        topicRow.appendChild(pill);
      });

      info.append(statusBadge, primaryBtns, topicRow);
      stage.appendChild(canvasWrap);
      contextBar.insertAdjacentElement('afterend', info);
      drawer.append(stage, chatCol);

      if (typeof MutationObserver !== 'undefined') {
        const drawerObs = new MutationObserver(() => {
          if (!drawer.hidden) ensureAvatarActive();
        });
        drawerObs.observe(drawer, { attributes: true, attributeFilter: ['hidden', 'class'] });
      }
      if (!drawer.hidden) {
        ensureAvatarActive();
      }
    }
  }

  function mount() {
    if (mounted || typeof document === 'undefined' || !document.body) return;
    mounted = true;

    // Only mount the 3D avatar inside the Digital Twin side panel (#twin-drawer)
    mountTwinDrawerAvatar();

    if (typeof MutationObserver !== 'undefined' && !document.getElementById('twin-drawer')) {
      const obs = new MutationObserver(() => {
        if (document.getElementById('twin-drawer')) {
          mountTwinDrawerAvatar();
          obs.disconnect();
        }
      });
      obs.observe(document.body, { childList: true });
    }

    window.addEventListener('pointermove', e => {
      if (rigState.isDragging || !isAvatarStageVisible()) return;
      const w = window.innerWidth || 1024;
      const h = window.innerHeight || 768;
      rigState.pointerX = clamp((e.clientX / w) * 2 - 1, -1, 1);
      rigState.pointerY = clamp((e.clientY / h) * 2 - 1, -1, 1);
      rigState.pointerActive = true;
    }, { passive: true });

    if (isAvatarStageVisible()) {
      ensureAvatarActive();
    }
  }

  return Object.freeze({
    mount,
    speakScript,
    triggerGesture,
    notifySpeechStart,
    notifySpeechActuallyStarted,
    notifySpeechBoundary,
    notifyPcmChunk,
    notifySpeechEnd,
    notifyListening,
    buildVisemeTimeline,
    wordToPhonemeTokens,
    VOICE_SCRIPTS,
    TEXTURE_URLS
  });
});
