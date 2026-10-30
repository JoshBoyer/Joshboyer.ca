/* ============================================================================
   AUTOMATION TYCOON — Pixel-Art Corporate Side-Scroller RPG (#career)
   Matches media_1792688553820_8178e3ad.jpg 1:1.
   Multi-level corporate building cutaway with animated running protagonist,
   stairs climbing, proximity interactions, unit frame, radar mini-map,
   current quest card, and character dialogue choices.
   ============================================================================ */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.AutomationTycoonApp = api;
    if (typeof document !== "undefined") {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => api.mount(), { once: true });
      } else {
        api.mount();
      }
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const STORAGE_KEY = "joshboyer_automation_tycoon_v6_sidescroller";

  // World dimensions matching the clean-plate background
  const WORLD_W = 1376;
  const WORLD_H = 768;

  // 3 distinct floor levels (matching media_1792688553820_8178e3ad.jpg)
  const FLOORS = {
    0: { id: 0, label: "Floor 0 — Break Room & Storage", y: 600, minX: 240, maxX: 1340 },
    1: { id: 1, label: "Floor 1 — Dell Technical Support", y: 478, minX: 40, maxX: 1340 },
    2: { id: 2, label: "Floor 2 — Conference & Training", y: 240, minX: 60, maxX: 1330 }
  };

  // Staircase connections between floors
  // Stair A (Floor 0 <-> Floor 1): yellow steel stairs from (240, 600) up to (40, 478)
  // Stair B (Floor 1 <-> Floor 2): yellow steel stairs from (40, 478) up to (60, 240)
  const STAIRS = [
    { fromFloor: 0, toFloor: 1, x0: 240, y0: 600, x1: 40, y1: 478 },
    { fromFloor: 1, toFloor: 2, x0: 40, y0: 478, x1: 60, y1: 240 }
  ];

  // Nostalgic Dell Call Center Soundtracks (16-bar retro stereo loops)
  const TRACKS = [
    { id: "lofi", title: "Gloves Off Lo-Fi", src: "assets/tycoon/soundtrack-dell-lofi.mp3" },
    { id: "synthwave", title: "First-Call Resolution", src: "assets/tycoon/soundtrack-dell-synthwave.mp3" }
  ];

  // Interactive World POIs
  const POIS = [
    // Floor 1 (Middle)
    {
      id: "sarah",
      floor: 1,
      x: 735,
      y: 478,
      label: "Talk",
      name: "Sarah",
      dept: "Call Center - Finance Department",
      portrait: "assets/tycoon/sarah-sidescroller-portrait.png",
      isQuestTarget: (st) => st.questId === "printer" && (st.questStep === 1 || st.questStep === 4)
    },
    {
      id: "printer",
      floor: 1,
      x: 950,
      y: 478,
      label: "Inspect Printer",
      name: "Network Printer (FIN-PRN-02)",
      dept: "Shared Floor Printer",
      isQuestTarget: (st) => st.questId === "printer" && (st.questStep === 2 || st.questStep === 3)
    },
    {
      id: "my_desk",
      floor: 1,
      x: 460,
      y: 478,
      label: "My Desk (Pod 4B-19)",
      name: "Workstation 4B-19",
      dept: "Gloves Off Tier-1 Support"
    },
    {
      id: "marco",
      floor: 1,
      x: 290,
      y: 478,
      label: "Talk to Marco",
      name: "Marco",
      dept: "Line 1 Technician",
      portrait: "assets/tycoon/avatar-3.jpg"
    },
    // Floor 2 (Top)
    {
      id: "training_door",
      floor: 2,
      x: 180,
      y: 240,
      label: "Enter Training",
      name: "Training Lab",
      dept: "Floor Skills & Courses"
    },
    {
      id: "conference",
      floor: 2,
      x: 440,
      y: 240,
      label: "Talk to Manager",
      name: "Manager Taylor",
      dept: "Support Team Lead",
      portrait: "assets/tycoon/taylor-avatar.jpg"
    },
    // Floor 0 (Bottom)
    {
      id: "vending",
      floor: 0,
      x: 385,
      y: 600,
      label: "Grab Coffee / Snack",
      name: "Vending & Coffee Bar",
      dept: "Break Room Lounge"
    },
    {
      id: "bulletin",
      floor: 0,
      x: 580,
      y: 600,
      label: "Read Floor Tips",
      name: "Pattern Knowledge Base",
      dept: "Support Bulletin Board"
    },
    {
      id: "storage",
      floor: 0,
      x: 1040,
      y: 600,
      label: "Inspect IT Storage",
      name: "Hardware Parts Depot",
      dept: "Cables, RAM & Spares"
    }
  ];

  function mount() {
    let hostEl = null;
    let canvasEl = null;
    let ctx = null;
    let minimapCanvas = null;
    let minimapCtx = null;
    let isMounted = false;
    let animId = null;
    const isBackgroundMode = true;

    // Load images lazily when the game drawer is opened
    const bgImg = new Image();
    const spriteSheet = new Image();
    let spritesRequested = false;
    function ensureSpritesLoaded() {
      if (spritesRequested) return;
      spritesRequested = true;
      bgImg.src = "assets/tycoon/sidescroller-callcenter.jpg";
      spriteSheet.src = "assets/tycoon/hero-spritesheet.png";
    }

    // Sound effects via Web Audio API
    let audioCtx = null;
    let isFooterIntersecting = false;
    let userWantsMusic = false;
    let isMouseOverFooter = false;
    let footerFocusedState = false;

    function isMobile() {
      if (typeof window === "undefined") return false;
      return window.matchMedia("(max-width: 767px)").matches;
    }

    function checkFooterVisible() {
      if (!hostEl || !hostEl.isConnected) return false;
      const drawerEl = hostEl.querySelector ? hostEl.querySelector("#home-connect-game") : null;
      if (drawerEl && drawerEl.hidden) return false;
      const homeSec = hostEl.closest ? hostEl.closest("section[data-page]") : null;
      if (homeSec && homeSec.hidden) return false;
      const rect = (drawerEl || hostEl).getBoundingClientRect();
      const vh = window.innerHeight || (document.documentElement ? document.documentElement.clientHeight : 800);
      return rect.bottom > 60 && rect.top < vh - 60;
    }

    function isFooterFocused() {
      if (typeof document === "undefined") return false;
      if (isMobile()) return false;
      if (document.hidden) return false;
      if (!hostEl || !hostEl.isConnected) return false;
      const homeSec = hostEl.closest ? hostEl.closest("section[data-page]") : null;
      if (homeSec && homeSec.hidden) return false;
      return checkFooterVisible();
    }

    function initAudio() {
      try {
        if (!audioCtx) {
          const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
          if (AudioCtxClass) audioCtx = new AudioCtxClass();
        }
        if (audioCtx && audioCtx.state === "suspended") {
          audioCtx.resume();
        }
      } catch (e) {}
    }

    function playBeep(freq = 600, duration = 0.08, type = "sine") {
      if (state.isMuted || !isFooterFocused() || isMobile()) return;
      try {
        initAudio();
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
      } catch (e) {}
    }

    function playFootstep() {
      if (state.isMuted || !isFooterFocused() || isMobile()) return;
      try {
        initAudio();
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "triangle";
        const freq = 130 + Math.random() * 30;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.035, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
      } catch (e) {}
    }

    

    function playFanfare() {
      if (state.isMuted || !isFooterFocused() || isMobile()) return;
      try {
        initAudio();
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "triangle";
          const startT = now + idx * 0.08;
          osc.frequency.setValueAtTime(freq, startT);
          gain.gain.setValueAtTime(0, now);
          gain.gain.setValueAtTime(0.12, startT);
          gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.32);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(startT);
          osc.stop(startT + 0.35);
        });
      } catch (e) {}
    }

    function playVendingDrop() {
      if (state.isMuted || !isFooterFocused() || isMobile()) return;
      try {
        initAudio();
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(140, now);
        osc1.frequency.exponentialRampToValueAtTime(60, now + 0.15);
        gain1.gain.setValueAtTime(0.14, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start();
        osc1.stop(now + 0.18);

        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = "square";
        osc2.frequency.setValueAtTime(640, now + 0.06);
        osc2.frequency.setValueAtTime(380, now + 0.12);
        gain2.gain.setValueAtTime(0.04, now + 0.06);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start(now + 0.06);
        osc2.stop(now + 0.22);
      } catch (e) {}
    }

    function playPrinterPrint() {
      if (state.isMuted || !isFooterFocused() || isMobile()) return;
      try {
        initAudio();
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        for (let i = 0; i < 5; i++) {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "sawtooth";
          const startT = now + i * 0.07;
          osc.frequency.setValueAtTime(760 + i * 70, startT);
          gain.gain.setValueAtTime(0.035, startT);
          gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.05);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(startT);
          osc.stop(startT + 0.05);
        }
      } catch (e) {}
    }

    function playTerminalPurge() {
      if (state.isMuted || !isFooterFocused() || isMobile()) return;
      try {
        initAudio();
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.18);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(now + 0.2);
      } catch (e) {}
    }

    // ========================================================================
    // Background Soundtrack Subsystem (Web Audio Lowpass Filtered for Dialogue)
    // Only plays when focused on the footer section (#home-connect)
    // ========================================================================
    let bgMusic = null;
    let musicSourceNode = null;
    let musicFilterNode = null;
    let musicGainNode = null;
    let musicHasStarted = false;
    let currentFilterMuffled = false;

    function initMusic() {
      if (bgMusic) return;
      try {
        bgMusic = new Audio();
        bgMusic.loop = true;
        bgMusic.preload = "auto";
        bgMusic.src = TRACKS[state.activeTrackIndex]?.src || TRACKS[0].src;
        bgMusic.volume = state.isMuted ? 0 : state.musicVolume;

        // Route through Web Audio BiquadFilter if supported
        initAudio();
        if (audioCtx && typeof audioCtx.createMediaElementSource === "function" && !musicSourceNode) {
          try {
            musicSourceNode = audioCtx.createMediaElementSource(bgMusic);
            musicFilterNode = audioCtx.createBiquadFilter();
            musicFilterNode.type = "lowpass";
            musicFilterNode.frequency.setValueAtTime(20000, audioCtx.currentTime);

            musicGainNode = audioCtx.createGain();
            musicGainNode.gain.setValueAtTime(state.isMuted ? 0 : state.musicVolume, audioCtx.currentTime);

            musicSourceNode.connect(musicFilterNode);
            musicFilterNode.connect(musicGainNode);
            musicGainNode.connect(audioCtx.destination);
          } catch (webaudioErr) {
            musicSourceNode = null;
            musicFilterNode = null;
            musicGainNode = null;
          }
        }
      } catch (err) {}
    }

    function fadeOutAndPause(callback) {
      if (!bgMusic) {
        state.musicPlaying = false;
        updateSoundtrackUI();
        if (callback) callback();
        return;
      }
      if (musicGainNode && audioCtx && audioCtx.state === "running") {
        try {
          const now = audioCtx.currentTime;
          musicGainNode.gain.cancelScheduledValues(now);
          musicGainNode.gain.setValueAtTime(musicGainNode.gain.value, now);
          musicGainNode.gain.linearRampToValueAtTime(0.0001, now + 0.2);
          setTimeout(() => {
            if (!isFooterFocused() || !userWantsMusic) {
              bgMusic.pause();
              state.musicPlaying = false;
              updateSoundtrackUI();
            }
            if (callback) callback();
          }, 220);
          return;
        } catch (e) {}
      }
      bgMusic.pause();
      state.musicPlaying = false;
      updateSoundtrackUI();
      if (callback) callback();
    }

    function fadeInAndPlay() {
      if (state.isMuted || !userWantsMusic || !isFooterFocused()) return;
      initMusic();
      if (!bgMusic) return;
      initAudio();
      if (musicGainNode && audioCtx && audioCtx.state === "running") {
        try {
          const now = audioCtx.currentTime;
          musicGainNode.gain.cancelScheduledValues(now);
          musicGainNode.gain.setValueAtTime(0.0001, now);
          musicGainNode.gain.linearRampToValueAtTime(state.musicVolume, now + 0.3);
        } catch (e) {}
      } else {
        bgMusic.volume = state.musicVolume;
      }
      const playPromise = bgMusic.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            state.musicPlaying = true;
            musicHasStarted = true;
            updateSoundtrackUI();
          })
          .catch(() => {
            state.musicPlaying = false;
            updateSoundtrackUI();
          });
      }
    }

    function startMusic(force = false) {
      if (isMobile() || state.isMuted) return;
      if (!force && !isFooterFocused()) return;
      userWantsMusic = true;
      fadeInAndPlay();
    }

    function pauseMusic(userExplicit = true) {
      if (userExplicit) {
        userWantsMusic = false;
      }
      fadeOutAndPause();
    }

    function toggleMusic() {
      if (isMobile()) return;
      initAudio();
      if (state.musicPlaying) {
        userWantsMusic = false;
        pauseMusic(true);
      } else {
        if (state.isMuted) {
          state.isMuted = false;
        }
        userWantsMusic = true;
        startMusic(true);
      }
      persist();
      renderHUD();
    }

    function nextTrack() {
      if (isMobile()) return;
      initAudio();
      state.activeTrackIndex = (state.activeTrackIndex + 1) % TRACKS.length;
      initMusic();
      if (bgMusic) {
        const wasPlaying = state.musicPlaying;
        bgMusic.src = TRACKS[state.activeTrackIndex].src;
        bgMusic.currentTime = 0;
        if (wasPlaying && !state.isMuted && isFooterFocused()) {
          userWantsMusic = true;
          fadeInAndPlay();
        }
      }
      persist();
      renderHUD();
      spawnFloatingText(`🎵 ${TRACKS[state.activeTrackIndex].title}`, "#38bdf8", state.playerX, state.playerY - 80);
    }

    function checkFooterFocusAndSyncAudio() {
      const focused = isFooterFocused();
      if (focused !== footerFocusedState) {
        footerFocusedState = focused;
        if (focused) {
          if (userWantsMusic && !state.isMuted && !state.musicPlaying) {
            fadeInAndPlay();
          }
        } else {
          if (state.musicPlaying) {
            fadeOutAndPause();
          }
        }
      }
    }

    function applyDialogueAudioFilter(isMuffled) {
      if (currentFilterMuffled === isMuffled) return;
      currentFilterMuffled = isMuffled;
      if (!musicFilterNode || !audioCtx) return;
      try {
        const targetFreq = isMuffled ? 850 : 20000;
        const now = audioCtx.currentTime;
        musicFilterNode.frequency.cancelScheduledValues(now);
        musicFilterNode.frequency.linearRampToValueAtTime(targetFreq, now + 0.35);
      } catch (e) {}
    }

    function updateSoundtrackUI() {
      const animEl = document.querySelector(".home-footer-soundtrack-strip .at-ss-music-anim, .at-ss-music-anim");
      if (animEl) {
        if (state.musicPlaying && !state.isMuted) {
          animEl.classList.add("is-playing");
        } else {
          animEl.classList.remove("is-playing");
        }
      }
      const iconEl = document.querySelector(".home-footer-play-icon, .at-ss-soundtrack-play-icon");
      if (iconEl) {
        iconEl.textContent = state.musicPlaying && !state.isMuted ? "⏸" : "▶";
      }
      const titleEl = document.querySelector(".home-footer-track-title, .at-ss-track-title");
      if (titleEl) {
        titleEl.textContent = TRACKS[state.activeTrackIndex]?.title || "Soundtrack";
      }
      const stripBtn = document.querySelector(".home-footer-soundtrack-btn, .at-ss-soundtrack-btn");
      if (stripBtn) {
        stripBtn.title = state.musicPlaying && !state.isMuted ? "Pause Soundtrack" : "Play Soundtrack";
      }
    }

    // Default Game State
    let state = {
      playerX: 460,
      playerY: 478,
      playerFloor: 1,
      facing: 1, // 1 = right, -1 = left
      vx: 0,
      vy: 0,
      isRunning: false,
      runFrame: 0,
      runAnimTimer: 0,
      isClimbingStairs: false,
      level: 1,
      role: "Support Technician",
      xp: 40,
      xpMax: 100,
      hearts: 3,
      maxHearts: 3,
      questId: "printer",
      questTitle: "Fix the Printer Issue",
      questStep: 1, // 1: Talk to Sarah, 2: Check printer queue, 3: Clear stuck jobs, 4: Verify working
      questSteps: [
        { label: "Talk to the user in Accounting", done: false },
        { label: "Check the printer queue", done: false },
        { label: "Clear stuck print jobs", done: false },
        { label: "Verify it's working", done: false }
      ],
      callsCount: 24,
      avgHandleTime: "04:17",
      customerSat: "82%",
      isMuted: false,
      musicPlaying: false,
      activeTrackIndex: 0,
      musicVolume: 0.35,
      phoneRinging: false,
      phoneCallAnswered: true,
      phoneRingTimer: 0,
      steamTimer: 0,
      steamParticles: [],
      floatingTexts: [],
      clickReticles: [],
      inventory: [
        { id: "badge", name: "Dell Gloves Off Badge", icon: "🪪", desc: "First-call resolution authorization." },
        { id: "driver", name: "Phillips #1 Screwdriver", icon: "🪛", desc: "For OptiPlex chassis & Latitude drives." },
        { id: "kb", name: "Support KB Patterns", icon: "💾", desc: "Documented fixes for AD lockouts & spooler deadlocks." }
      ],
      dialogue: null,
      activeModal: null,
      targetMoveX: null,
      targetMoveFloor: null,
      pathQueue: [],
      stairStepTimer: 0,
      sparks: [] // electric foot sparks
    };

    function spawnFloatingText(text, color = "#facc15", x = state.playerX, y = state.playerY - 110) {
      state.floatingTexts.push({
        id: Math.random(),
        text,
        color,
        x,
        y,
        vy: -32,
        life: 1.25,
        maxLife: 1.25
      });
    }

    // Load persisted state if exists
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        state = Object.assign(state, parsed);
        // Snap to canonical floor level
        if (FLOORS[state.playerFloor]) {
          state.playerY = FLOORS[state.playerFloor].y;
        }
        // Never allow automatic phone ringing from old saved states
        state.phoneRinging = false;
        state.phoneCallAnswered = true;
        // Synchronize quest steps array
        if (state.questStep > 1) state.questSteps[0].done = true;
        if (state.questStep > 2) state.questSteps[1].done = true;
        if (state.questStep > 3) state.questSteps[2].done = true;
        if (state.questStep > 4) state.questSteps[3].done = true;
      }
    } catch (e) {}

    function persist() {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            playerX: state.playerX,
            playerY: state.playerY,
            playerFloor: state.playerFloor,
            facing: state.facing,
            level: state.level,
            role: state.role,
            xp: state.xp,
            hearts: state.hearts,
            questId: state.questId,
            questStep: state.questStep,
            callsCount: state.callsCount,
            customerSat: state.customerSat,
            isMuted: state.isMuted,
            activeTrackIndex: state.activeTrackIndex,
            phoneCallAnswered: state.phoneCallAnswered
          })
        );
      } catch (e) {}
    }

    const keys = {};
    window.addEventListener("keydown", (e) => {
      const target = e.target;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          (target.closest && target.closest("form")))
      ) {
        return;
      }
      // Only process game input when user is focused on the footer section
      if (!isFooterFocused()) {
        return;
      }
      keys[e.key.toLowerCase()] = true;
      keys[e.code] = true;
      if (e.key === "e" || e.key === "E" || e.key === " ") {
        handleInteractionKey();
      }
      if (e.key === "Escape") {
        if (state.dialogue) {
          state.dialogue = null;
          renderHUD();
        } else if (state.activeModal) {
          state.activeModal = null;
          renderHUD();
        }
      }
    });

    window.addEventListener("keyup", (e) => {
      const target = e.target;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          (target.closest && target.closest("form")))
      ) {
        return;
      }
      keys[e.key.toLowerCase()] = false;
      keys[e.code] = false;
    });

    // Find nearest POI to player
    function getNearestPOI() {
      let nearest = null;
      let minDist = 75; // Proximity threshold in pixels
      for (const poi of POIS) {
        if (poi.floor === state.playerFloor) {
          const dist = Math.abs(state.playerX - poi.x);
          if (dist < minDist) {
            minDist = dist;
            nearest = poi;
          }
        }
      }
      return nearest;
    }

    function handleInteractionKey() {
      const nearest = getNearestPOI();
      if (!nearest) return;
      interactWithPOI(nearest);
    }

    function interactWithPOI(poi) {
      playBeep(780, 0.09, "sine");
      if (poi.id === "my_desk") {
        if (state.phoneRinging && !state.phoneCallAnswered) {
          state.phoneCallAnswered = true;
          state.phoneRinging = false;
          playFanfare();
          state.xp = Math.min(state.xpMax, state.xp + 40);
          persist();
          spawnFloatingText("Devon: 'Thanks Josh! That NumLock fix worked!' (+40 XP)", "#38bdf8", state.playerX, state.playerY - 80);
        } else {
          spawnFloatingText("Pod 4B-19: Latitude D620 & OptiPlex diagnostics online", "#94a3b8", state.playerX, state.playerY - 80);
        }
      } else if (poi.id === "sarah") {
        if (state.questStep <= 2) {
          state.questStep = 3;
          state.questSteps[0].done = true;
          persist();
          spawnFloatingText("Sarah: 'Hi Josh! Need the stuck spooler cleared on FIN-PRN-02!'", "#facc15", state.playerX, state.playerY - 80);
        } else if (state.questStep === 3) {
          spawnFloatingText("Sarah: 'Head over to FIN-PRN-02 and purge the print buffer!'", "#facc15", state.playerX, state.playerY - 80);
        } else {
          playFanfare();
          spawnFloatingText("Sarah: 'All payroll reports printed! You are a lifesaver!' (+50 XP)", "#10b981", state.playerX, state.playerY - 80);
        }
      } else if (poi.id === "printer") {
        playPrinterPrint();
        state.questStep = 4;
        state.questSteps[1].done = true;
        state.questSteps[2].done = true;
        state.questSteps[3].done = true;
        state.xp = Math.min(state.xpMax, state.xp + 50);
        persist();
        spawnFloatingText("FIN-PRN-02: Spooler cleared & printer ONLINE! (+50 XP)", "#38bdf8", state.playerX, state.playerY - 80);
      } else if (poi.id === "vending") {
        playVendingDrop();
        spawnFloatingText("Clink! Cold soda dispensed (+10 Energy)", "#facc15", state.playerX, state.playerY - 80);
      } else if (poi.id === "training_door") {
        playFanfare();
        state.xp = Math.min(state.xpMax, state.xp + 40);
        persist();
        spawnFloatingText("Training Lab: Dell Enterprise Hardware Certification (+40 XP)", "#38bdf8", state.playerX, state.playerY - 80);
      } else if (poi.id === "conference") {
        spawnFloatingText("Conference Room: Escalation review in progress", "#94a3b8", state.playerX, state.playerY - 80);
      } else if (poi.id === "marco") {
        spawnFloatingText("Marco: 'Gloves Off team has 94% customer sat today!'", "#38bdf8", state.playerX, state.playerY - 80);
      } else if (poi.id === "bulletin") {
        spawnFloatingText("Bulletin: 'Dell Round Rock Training Camp — Next cohort Q4'", "#facc15", state.playerX, state.playerY - 80);
      } else {
        spawnFloatingText(`${poi.name || poi.label}: Checked`, "#94a3b8", state.playerX, state.playerY - 80);
      }
    }

    function ensureVisibleInWindow() {
      if (!hostEl) return;
      const rect = hostEl.getBoundingClientRect();
      const windowH = window.innerHeight || document.documentElement.clientHeight;
      // If bottom of game shell is below viewport or top is above viewport, smoothly scroll to make it fully visible
      if (rect.bottom > windowH - 10 || rect.top < 10) {
        hostEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    

    

    

    function executeSpoolerPurge() {
      state.questStep = 4;
      state.questSteps[2].done = true;
      playTerminalPurge();
      setTimeout(() => playPrinterPrint(), 220);
      spawnFloatingText("+50 XP (Queue Cleared!)", "#10b981");
      state.activeModal = null;
      state.dialogue = {
        speaker: "Network Printer",
        dept: "FIN-PRN-02 [ONLINE]",
        portrait: "assets/tycoon/item-tools.jpg",
        quote:
          "Spooler successfully reset! 140MB corrupt buffer flushed. FIN-PRN-02 status is ONLINE. Ready to verify test page with Sarah!",
        choices: [
          {
            id: "p_done",
            text: "Return to Sarah in Accounting to verify output.",
            action: () => {
              state.dialogue = null;
              renderHUD();
            }
          }
        ]
      };
      persist();
      renderHUD();
    }

    

    

    

    

    

    

    function openTrainingModal() {
      ensureVisibleInWindow();
      state.activeModal = "training";
      renderHUD();
    }

    function showToast(msg) {
      const banner = hostEl?.querySelector(".at-toast-banner");
      if (banner) {
        banner.textContent = msg;
        banner.hidden = false;
        clearTimeout(banner._t);
        banner._t = setTimeout(() => {
          banner.hidden = true;
        }, 3200);
      } else {
        spawnFloatingText(msg, "#38bdf8");
      }
    }

    // ------------------------------------------------------------------------
    // Game Physics & Animation Loop (60 FPS)
    // ------------------------------------------------------------------------
    let lastTime = performance.now();

    function isGameCanvasActive() {
      if (isMobile() || !canvasEl || !canvasEl.isConnected) return false;
      if (typeof document !== "undefined" && document.hidden) return false;
      if (canvasEl.closest && canvasEl.closest("[hidden]")) return false;
      return checkFooterVisible();
    }

    function stepLoop(now) {
      if (!isGameCanvasActive()) {
        animId = null;
        return;
      }
      ensureSpritesLoaded();
      animId = requestAnimationFrame(stepLoop);
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      updatePhysics(dt);
      renderCanvas();
      renderMiniMap();
    }

    function ensureLoopRunning() {
      if (isMounted && !animId && isGameCanvasActive()) {
        ensureSpritesLoaded();
        lastTime = performance.now();
        animId = requestAnimationFrame(stepLoop);
      }
    }

    function planPath(fromFloor, fromX, targetFloor, targetX) {
      const queue = [];
      const clampX = (f, x) => Math.max(FLOORS[f].minX, Math.min(FLOORS[f].maxX, Math.round(x)));

      if (fromFloor === targetFloor) {
        queue.push({ type: "walk", floor: fromFloor, targetX: clampX(fromFloor, targetX), targetY: FLOORS[fromFloor].y });
        return queue;
      }

      let curFloor = fromFloor;

      while (curFloor !== targetFloor) {
        if (curFloor < targetFloor) {
          // Need to climb UP
          if (curFloor === 0) {
            // Floor 0 -> Floor 1: walk to (240, 600), climb Stair A up to (40, 478)
            queue.push({ type: "walk", floor: 0, targetX: 240, targetY: 600 });
            queue.push({ type: "stairs", fromX: 240, fromY: 600, toX: 40, toY: 478, toFloor: 1, dir: 1 });
            curFloor = 1;
          } else if (curFloor === 1) {
            // Floor 1 -> Floor 2: walk to (40, 478), climb Stair B up to (60, 240)
            queue.push({ type: "walk", floor: 1, targetX: 40, targetY: 478 });
            queue.push({ type: "stairs", fromX: 40, fromY: 478, toX: 60, toY: 240, toFloor: 2, dir: 1 });
            curFloor = 2;
          }
        } else {
          // Need to climb DOWN
          if (curFloor === 2) {
            // Floor 2 -> Floor 1: walk to (60, 240), climb Stair B down to (40, 478)
            queue.push({ type: "walk", floor: 2, targetX: 60, targetY: 240 });
            queue.push({ type: "stairs", fromX: 60, fromY: 240, toX: 40, toY: 478, toFloor: 1, dir: -1 });
            curFloor = 1;
          } else if (curFloor === 1) {
            // Floor 1 -> Floor 0: walk to (40, 478), climb Stair A down to (240, 600)
            queue.push({ type: "walk", floor: 1, targetX: 40, targetY: 478 });
            queue.push({ type: "stairs", fromX: 40, fromY: 478, toX: 240, toY: 600, toFloor: 0, dir: -1 });
            curFloor = 0;
          }
        }
      }

      // Finally walk on target floor to desired position
      queue.push({ type: "walk", floor: targetFloor, targetX: clampX(targetFloor, targetX), targetY: FLOORS[targetFloor].y });
      return queue;
    }

    function updatePhysics(dt) {
      const walkSpeed = 220; // horizontal speed (pixels per second)
      const stairSpeed = 160; // diagonal climbing speed (pixels per second)
      let moveDir = 0;

      // Handle keyboard controls
      const upPressed = keys["w"] || keys["arrowup"];
      const downPressed = keys["s"] || keys["arrowdown"];
      const leftPressed = keys["a"] || keys["arrowleft"];
      const rightPressed = keys["d"] || keys["arrowright"];

      if (upPressed && !state.isClimbingStairs) {
        if (state.playerFloor < 2) {
          const nextFloor = state.playerFloor + 1;
          const destX = nextFloor === 2 ? 300 : 380;
          state.pathQueue = planPath(state.playerFloor, state.playerX, nextFloor, destX);
          keys["w"] = false;
          keys["arrowup"] = false;
        }
      } else if (downPressed && !state.isClimbingStairs) {
        if (state.playerFloor > 0) {
          const nextFloor = state.playerFloor - 1;
          const destX = nextFloor === 0 ? 385 : 380;
          state.pathQueue = planPath(state.playerFloor, state.playerX, nextFloor, destX);
          keys["s"] = false;
          keys["arrowdown"] = false;
        }
      } else if ((leftPressed || rightPressed) && !state.isClimbingStairs) {
        // Direct manual horizontal control overrides path queue
        state.pathQueue = [];
        state.targetMoveX = null;
        if (leftPressed) moveDir -= 1;
        if (rightPressed) moveDir += 1;
      }

      // Execute path queue (walking along floors and climbing stairs)
      if (state.pathQueue && state.pathQueue.length > 0) {
        const seg = state.pathQueue[0];

        if (seg.type === "walk") {
          state.isClimbingStairs = false;
          state.playerFloor = seg.floor;
          state.playerY = FLOORS[seg.floor].y;

          const dx = seg.targetX - state.playerX;
          if (Math.abs(dx) > 6) {
            moveDir = Math.sign(dx);
          } else {
            state.playerX = seg.targetX;
            state.pathQueue.shift();
            // If path completed, check POI arrival
            if (state.pathQueue.length === 0) {
              const reachedPOI = getNearestPOI();
              if (reachedPOI && Math.abs(state.playerX - reachedPOI.x) < 45) {
                interactWithPOI(reachedPOI);
              }
            }
          }
        } else if (seg.type === "stairs") {
          state.isClimbingStairs = true;
          state.isRunning = true;
          moveDir = 0; // Movement driven by diagonal lerp

          const totalDist = Math.hypot(seg.toX - seg.fromX, seg.toY - seg.fromY);
          if (seg.progress === undefined) {
            seg.progress = 0;
            playBeep(seg.dir > 0 ? 560 : 360, 0.07, "triangle");
          }

          seg.progress += (stairSpeed * dt) / totalDist;
          state.facing = seg.toX >= seg.fromX ? 1 : -1;

          if (seg.progress < 1) {
            state.playerX = seg.fromX + seg.progress * (seg.toX - seg.fromX);
            state.playerY = seg.fromY + seg.progress * (seg.toY - seg.fromY);

            // Animate running cycle while climbing
            state.runAnimTimer = (state.runAnimTimer || 0) + dt;
            if (state.runAnimTimer > 0.12) {
              state.runAnimTimer = 0;
              state.runFrame = ((state.runFrame + 1) % 3) + 1;
              playFootstep();
            }

            // Foot sparks on yellow steel stairs
            if (Math.random() < 0.4) {
              state.sparks.push({
                x: state.playerX - state.facing * 12,
                y: state.playerY + (Math.random() - 0.5) * 4,
                vx: -state.facing * (20 + Math.random() * 20),
                vy: -10 - Math.random() * 15,
                life: 0.28,
                maxLife: 0.28,
                size: 2
              });
            }
          } else {
            // Completed stair climb!
            state.playerX = seg.toX;
            state.playerY = seg.toY;
            state.playerFloor = seg.toFloor;
            state.isClimbingStairs = false;
            playBeep(seg.dir > 0 ? 680 : 500, 0.08, "triangle");
            state.pathQueue.shift();
            persist();
          }
        }
      }

      // Horizontal movement if not currently on stairs
      if (!state.isClimbingStairs) {
        if (moveDir !== 0) {
          state.facing = moveDir;
          state.isRunning = true;
          const curFloor = FLOORS[state.playerFloor];
          state.playerX = Math.max(curFloor.minX, Math.min(curFloor.maxX, state.playerX + moveDir * walkSpeed * dt));
          state.playerY = curFloor.y;

          // Animate run cycle (frames 1, 2, 3)
          state.runAnimTimer = (state.runAnimTimer || 0) + dt;
          if (state.runAnimTimer > 0.12) {
            state.runAnimTimer = 0;
            state.runFrame = ((state.runFrame + 1) % 3) + 1;
            if (state.runFrame === 1 || state.runFrame === 3) {
              playFootstep();
            }
          }

          // Electric blue foot sparks
          if (Math.random() < 0.35) {
            state.sparks.push({
              x: state.playerX - state.facing * 18 + (Math.random() - 0.5) * 8,
              y: state.playerY - 2 + Math.random() * 4,
              vx: -state.facing * (40 + Math.random() * 40),
              vy: -15 - Math.random() * 25,
              life: 0.35,
              maxLife: 0.35,
              size: 2 + Math.random() * 3
            });
          }
        } else if (!state.pathQueue || state.pathQueue.length === 0) {
          state.isRunning = false;
          state.runFrame = 0; // idle frame
        }
      }

      // Update foot sparks
      for (let i = state.sparks.length - 1; i >= 0; i--) {
        const sp = state.sparks[i];
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.life -= dt;
        if (sp.life <= 0) {
          state.sparks.splice(i, 1);
        }
      }

      // Update floating texts (+XP, +Hearts, level up)
      for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
        const ft = state.floatingTexts[i];
        ft.y += ft.vy * dt;
        ft.life -= dt;
        if (ft.life <= 0) {
          state.floatingTexts.splice(i, 1);
        }
      }

      // Update click-to-walk expanding reticles
      for (let i = state.clickReticles.length - 1; i >= 0; i--) {
        const cr = state.clickReticles[i];
        cr.life -= dt;
        if (cr.life <= 0) {
          state.clickReticles.splice(i, 1);
        }
      }

      // Update Break Room coffee steam particles on Floor 0
      state.steamTimer = (state.steamTimer || 0) + dt;
      if (state.steamTimer > 0.18) {
        state.steamTimer = 0;
        if (state.steamParticles.length < 14) {
          state.steamParticles.push({
            x: 504 + (Math.random() - 0.5) * 12,
            y: 698,
            vx: (Math.random() - 0.5) * 6,
            vy: -18 - Math.random() * 10,
            life: 1.4,
            maxLife: 1.4,
            size: 2.2 + Math.random() * 2
          });
        }
      }
      for (let i = state.steamParticles.length - 1; i >= 0; i--) {
        const stp = state.steamParticles[i];
        stp.x += stp.vx * dt;
        stp.y += stp.vy * dt;
        stp.life -= dt;
        if (stp.life <= 0) {
          state.steamParticles.splice(i, 1);
        }
      }

      // Update prompt pill in HUD
      updatePromptOverlay();
    }

    function updatePromptOverlay() {
      const promptLayer = hostEl?.querySelector(".at-ss-world-prompts-layer");
      if (!promptLayer) return;

      if (isBackgroundMode) {
        promptLayer.innerHTML = "";
        return;
      }

      const nearest = getNearestPOI();
      if (nearest && !state.dialogue && !state.activeModal) {
        // Convert world coordinates to percentage of viewport
        const pctX = (nearest.x / WORLD_W) * 100;
        const pctY = ((nearest.y - 68) / WORLD_H) * 100;

        const isPhoneRinging = nearest.id === "my_desk" && state.phoneRinging && !state.phoneCallAnswered;
        const promptLabel = isPhoneRinging ? "📞 Answer Phone (Devon M. — Ringing!)" : nearest.label;
        const extraClass = isPhoneRinging ? "is-alert" : "";

        promptLayer.innerHTML = `
          <button type="button" class="at-ss-prompt-pill ${extraClass}" style="left: ${pctX.toFixed(2)}%; top: ${pctY.toFixed(2)}%;">
            <span class="at-ss-prompt-keycap">E</span>
            <span>${promptLabel}</span>
          </button>
        `;
        promptLayer.querySelector(".at-ss-prompt-pill")?.addEventListener("click", () => {
          interactWithPOI(nearest);
        });
      } else {
        promptLayer.innerHTML = "";
      }
    }

    function renderCanvas() {
      if (!ctx || !canvasEl) return;
      ctx.clearRect(0, 0, WORLD_W, WORLD_H);

      // 1. Draw clean background image
      if (bgImg.complete && bgImg.naturalWidth > 0) {
        ctx.drawImage(bgImg, 0, 0, WORLD_W, WORLD_H);
      } else {
        // Fallback dark floor bands
        ctx.fillStyle = "#071224";
        ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      }

      // 2. Draw Break Room coffee steam particles on Floor 0
      ctx.save();
      for (const stp of state.steamParticles) {
        const alpha = Math.max(0, stp.life / stp.maxLife) * 0.45;
        ctx.fillStyle = `rgba(241, 245, 249, ${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(stp.x, stp.y, stp.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 3. Draw blinking server rack LEDs on Floor 2
      ctx.save();
      const srvTime = performance.now() * 0.001;
      const leds = [
        { x: 522, y: 215, color: Math.sin(srvTime * 5) > 0 ? "#10b981" : "#047857" },
        { x: 526, y: 215, color: Math.sin(srvTime * 7 + 1) > 0 ? "#38bdf8" : "#0284c7" },
        { x: 530, y: 215, color: Math.sin(srvTime * 9 + 2) > 0 ? "#f59e0b" : "#b45309" },
        { x: 522, y: 225, color: Math.sin(srvTime * 6 + 3) > 0 ? "#10b981" : "#047857" },
        { x: 526, y: 225, color: Math.sin(srvTime * 8 + 4) > 0 ? "#38bdf8" : "#0284c7" },
        { x: 530, y: 225, color: Math.sin(srvTime * 4 + 5) > 0 ? "#10b981" : "#047857" }
      ];
      for (const led of leds) {
        ctx.fillStyle = led.color;
        ctx.shadowColor = led.color;
        ctx.shadowBlur = 4;
        ctx.fillRect(led.x, led.y, 2.5, 2);
      }
      ctx.restore();

      // 4. Draw live Floor 1 digital board telemetry numbers
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 15px 'Courier New', monospace";
      ctx.fillStyle = state.callsCount > 20 ? "#ef4444" : "#10b981";
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 6;
      ctx.fillText(state.callsCount.toString(), 1085, 452);
      ctx.fillStyle = "#38bdf8";
      ctx.shadowColor = "#38bdf8";
      ctx.fillText(state.avgHandleTime, 1175, 452);
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(state.customerSat, 1270, 452);
      ctx.restore();

      // 5. Draw live animated printer status on Floor 1
      const isPrinterPending = state.questStep === 2 || state.questStep === 3;
      const printerGlowColor = isPrinterPending ? "#f59e0b" : "#10b981";
      ctx.save();
      ctx.fillStyle = printerGlowColor;
      ctx.shadowColor = printerGlowColor;
      ctx.shadowBlur = 8;
      ctx.fillRect(948, 442, 6, 4); // printer LED
      ctx.restore();

      // 6. Draw live conference room conversation bubble on Floor 2
      const timeSec = performance.now() * 0.001;
      const bubbleY = 168 + Math.sin(timeSec * 2.2) * 3;
      ctx.save();
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(436, bubbleY, 32, 22, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("💬", 452, bubbleY + 16);
      ctx.restore();

      // 7. Draw ringing phone icon over Pod 4B-19 if ringing
      if (state.phoneRinging && !state.phoneCallAnswered) {
        const ringBob = Math.sin(timeSec * 8) * 3;
        const ringX = 460;
        const ringY = 405 + ringBob;

        ctx.save();
        ctx.fillStyle = "rgba(239, 68, 68, 0.94)";
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 1.5;
        ctx.shadowColor = "rgba(239, 68, 68, 0.6)";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(ringX - 42, ringY - 12, 84, 24, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowBlur = 0;
        ctx.fillText("📞 RINGING!", ringX, ringY);
        ctx.restore();
      }

      // 8. Draw yellow bouncing quest marker over active target
      const questPOI = POIS.find((p) => p.isQuestTarget && p.isQuestTarget(state));
      if (questPOI && questPOI.floor === state.playerFloor) {
        const pinBob = Math.sin(timeSec * 4.5) * 5;
        const pinY = questPOI.y - 78 + pinBob;
        ctx.save();
        ctx.fillStyle = "#facc15";
        ctx.shadowColor = "rgba(250, 204, 21, 0.8)";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(questPOI.x, pinY, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0f172a";
        ctx.font = "900 13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("!", questPOI.x, pinY + 4.5);
        ctx.restore();
      }

      // 9. Draw expanding click-to-walk reticles
      ctx.save();
      for (const cr of state.clickReticles) {
        const progress = 1 - cr.life / cr.maxLife;
        const radius = 4 + progress * 16;
        const alpha = Math.max(0, cr.life / cr.maxLife);
        ctx.strokeStyle = `rgba(56, 189, 248, ${alpha.toFixed(2)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cr.x, cr.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // 10. Draw foot sparks
      ctx.save();
      for (const sp of state.sparks) {
        const alpha = Math.max(0, sp.life / sp.maxLife);
        ctx.fillStyle = `rgba(56, 189, 248, ${alpha.toFixed(2)})`;
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 6;
        ctx.fillRect(sp.x, sp.y, sp.size, sp.size);
      }
      ctx.restore();

      // 11. Draw Player Character (using hero-spritesheet.png)
      renderPlayerCharacter();

      // 12. Draw floating XP / status text
      ctx.save();
      for (const ft of state.floatingTexts) {
        const alpha = Math.max(0, ft.life / ft.maxLife);
        ctx.fillStyle = ft.color;
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 8;
        ctx.globalAlpha = alpha;
        ctx.font = "bold 13px 'Space Grotesk', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(ft.text, ft.x, ft.y);
      }
      ctx.restore();

      // 13. If dialogue is active, draw in-world comic speech bubble over speaker
      if (state.dialogue) {
        renderInWorldSpeechBubble(state.dialogue);
      }
    }

    function renderPlayerCharacter() {
      const px = Math.round(state.playerX);
      const py = Math.round(state.playerY);

      if (spriteSheet.complete && spriteSheet.naturalWidth > 0) {
        // Sprite sheet has 4 frames: frame 0 = idle, frames 1..3 = run cycle
        // Frame width is 344 x 768 on the sheet. Character spans y: 148..670 (height 522px).
        // Scaling to targetH = 144px gives bold, prominent visibility in the footer.
        const frameIndex = state.isRunning ? state.runFrame : 0;
        const frameW = 344;
        const sourceY = 148;
        const sourceH = 522;
        const targetH = 144;
        const targetW = 96;

        ctx.save();
        ctx.translate(px, py);

        // Ambient cyan spotlight glow under player's feet for high-contrast visibility
        const spotGrad = ctx.createRadialGradient(0, -3, 6, 0, -3, 44);
        spotGrad.addColorStop(0, "rgba(56, 189, 248, 0.50)");
        spotGrad.addColorStop(0.55, "rgba(14, 165, 233, 0.20)");
        spotGrad.addColorStop(1, "rgba(14, 165, 233, 0)");
        ctx.fillStyle = spotGrad;
        ctx.beginPath();
        ctx.ellipse(0, -3, 44, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        if (state.facing === -1) {
          ctx.scale(-1, 1);
        }

        // Draw shadow under player
        ctx.fillStyle = "rgba(2, 6, 23, 0.55)";
        ctx.beginPath();
        ctx.ellipse(0, -2, 26, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw character frame with subtle cyan rim light
        ctx.shadowColor = "rgba(56, 189, 248, 0.65)";
        ctx.shadowBlur = 12;
        ctx.drawImage(
          spriteSheet,
          frameIndex * frameW,
          sourceY,
          frameW,
          sourceH,
          -targetW / 2,
          -targetH + 2,
          targetW,
          targetH
        );
        ctx.restore();

        // Overhead locator beacon so Josh is instantly identifiable
        const tagY = py - targetH - 10;
        ctx.save();
        const bob = Math.sin(performance.now() / 240) * 2.5;

        // Little cyan arrow indicator ▼
        ctx.fillStyle = "#38bdf8";
        ctx.shadowColor = "rgba(56, 189, 248, 0.9)";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(px - 5, tagY + 2 + bob);
        ctx.lineTo(px + 5, tagY + 2 + bob);
        ctx.lineTo(px, tagY + 7 + bob);
        ctx.closePath();
        ctx.fill();

        // Badge pill
        ctx.font = "bold 9.5px system-ui, -apple-system, sans-serif";
        const tagText = "JOSH";
        const tagTw = ctx.measureText(tagText).width;
        const tagBw = tagTw + 12;
        const tagBh = 15;
        ctx.fillStyle = "rgba(6, 17, 43, 0.92)";
        ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(px - tagBw / 2, tagY - tagBh + bob, tagBw, tagBh, 4);
        else ctx.rect(px - tagBw / 2, tagY - tagBh + bob, tagBw, tagBh);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#e0f2fe";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(tagText, px, tagY - tagBh / 2 + bob);
        ctx.restore();
      } else {
        // Fallback procedural pixel-art character (scaled to 114px tall)
        ctx.save();
        ctx.translate(px, py);
        if (state.facing === -1) ctx.scale(-1, 1);

        // Shadow
        ctx.fillStyle = "rgba(2, 6, 23, 0.52)";
        ctx.beginPath();
        ctx.ellipse(0, -2, 22, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body: dark navy hoodie
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-16, -72, 32, 40);
        // Head
        ctx.fillStyle = "#fbcfe8";
        ctx.fillRect(-12, -98, 24, 26);
        // Hair & beard
        ctx.fillStyle = "#78350f";
        ctx.fillRect(-13, -100, 26, 10);
        ctx.fillRect(-13, -84, 26, 10);
        // Jeans
        ctx.fillStyle = "#2563eb";
        ctx.fillRect(-13, -32, 12, 26);
        ctx.fillRect(1, -32, 12, 26);
        // Sneakers
        ctx.fillStyle = "#0284c7";
        ctx.fillRect(-15, -6, 14, 7);
        ctx.fillRect(1, -6, 14, 7);
        ctx.restore();
      }
    }

    function getSpeakerWorldPos(speakerName) {
      if (!speakerName) return null;
      const lower = speakerName.toLowerCase();
      if (lower.includes("josh")) {
        return { x: state.playerX, y: state.playerY, floor: state.playerFloor };
      }
      const matchedPOI = POIS.find((p) =>
        lower.includes(p.name.toLowerCase()) ||
        lower.includes(p.id.toLowerCase()) ||
        p.name.toLowerCase().includes(lower)
      );
      if (matchedPOI) {
        return { x: matchedPOI.x, y: matchedPOI.y, floor: matchedPOI.floor };
      }
      return null;
    }

    function renderInWorldSpeechBubble(dialogue) {
      if (!ctx || !dialogue) return;
      const speakerPos = getSpeakerWorldPos(dialogue.speaker) || {
        x: state.playerX,
        y: state.playerY,
        floor: state.playerFloor
      };

      // Only draw speech bubble if speaker is on player's current floor or nearby
      if (speakerPos.floor !== state.playerFloor) return;

      const headY = speakerPos.floor === 1 ? 408 : speakerPos.floor === 2 ? 170 : 638;
      const bubbleCenterY = headY - 24;

      const rawText = (dialogue.quote || "").replace(/^["']|["']$/g, "");
      const shortText = rawText.length > 52 ? rawText.slice(0, 49) + "..." : rawText;

      ctx.save();
      ctx.font = "bold 12px 'Space Grotesk', -apple-system, sans-serif";
      const metrics = ctx.measureText(shortText);
      const textW = metrics.width;
      const bubbleW = Math.max(120, Math.min(380, textW + 28));
      const bubbleH = 30;

      // Keep bubble within canvas width
      const drawX = Math.max(bubbleW / 2 + 16, Math.min(WORLD_W - bubbleW / 2 - 16, speakerPos.x));
      const drawY = bubbleCenterY;

      // Bubble background and border
      ctx.fillStyle = "rgba(6, 17, 43, 0.95)";
      ctx.strokeStyle = "#00c8ff";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "rgba(0, 200, 255, 0.45)";
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.roundRect(drawX - bubbleW / 2, drawY - bubbleH, bubbleW, bubbleH, 7);
      ctx.fill();
      ctx.stroke();

      // Tail pointing to speaker's head
      ctx.beginPath();
      ctx.moveTo(speakerPos.x - 5, drawY);
      ctx.lineTo(speakerPos.x, drawY + 7);
      ctx.lineTo(speakerPos.x + 5, drawY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Text inside bubble
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(shortText, drawX, drawY - bubbleH / 2);
      ctx.restore();
    }

    function renderMiniMap() {
      if (!minimapCtx || !minimapCanvas) return;
      const mw = minimapCanvas.width;
      const mh = minimapCanvas.height;

      minimapCtx.clearRect(0, 0, mw, mh);
      minimapCtx.fillStyle = "#040b18";
      minimapCtx.fillRect(0, 0, mw, mh);

      // Draw 3 floor tracks in glowing cyan
      minimapCtx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      minimapCtx.lineWidth = 1.5;

      const f2Y = (FLOORS[2].y / WORLD_H) * mh;
      const f1Y = (FLOORS[1].y / WORLD_H) * mh;
      const f0Y = (FLOORS[0].y / WORLD_H) * mh;

      // Floor lines
      minimapCtx.beginPath();
      minimapCtx.moveTo(14, f2Y);
      minimapCtx.lineTo(mw - 14, f2Y);
      minimapCtx.moveTo(10, f1Y);
      minimapCtx.lineTo(mw - 10, f1Y);
      minimapCtx.moveTo(10, f0Y);
      minimapCtx.lineTo(mw - 10, f0Y);
      minimapCtx.stroke();

      // Floor Labels
      minimapCtx.fillStyle = "rgba(148, 163, 184, 0.65)";
      minimapCtx.font = "bold 8px monospace";
      minimapCtx.textAlign = "right";
      minimapCtx.fillText("L2 CONF", mw - 6, f2Y - 3);
      minimapCtx.fillText("L1 DELL", mw - 6, f1Y - 3);
      minimapCtx.fillText("L0 BREAK", mw - 6, f0Y - 3);

      // Stairs ramps
      minimapCtx.strokeStyle = "rgba(250, 204, 21, 0.45)";
      minimapCtx.beginPath();
      // Stair 0 -> 1
      minimapCtx.moveTo((90 / WORLD_W) * mw, f0Y);
      minimapCtx.lineTo((215 / WORLD_W) * mw, f1Y);
      // Stair 1 -> 2
      minimapCtx.moveTo((90 / WORLD_W) * mw, f1Y);
      minimapCtx.lineTo((150 / WORLD_W) * mw, f2Y);
      minimapCtx.stroke();

      // Draw Quest Marker on minimap
      const questPOI = POIS.find((p) => p.isQuestTarget && p.isQuestTarget(state));
      if (questPOI) {
        const qx = (questPOI.x / WORLD_W) * mw;
        const qy = (questPOI.y / WORLD_H) * mh - 5;
        minimapCtx.fillStyle = "#facc15";
        minimapCtx.beginPath();
        minimapCtx.arc(qx, qy, 3, 0, Math.PI * 2);
        minimapCtx.fill();
      }

      // Draw Player Icon on minimap
      const plX = (state.playerX / WORLD_W) * mw;
      const plY = (state.playerY / WORLD_H) * mh - 4;
      minimapCtx.fillStyle = "#38bdf8";
      minimapCtx.shadowColor = "#38bdf8";
      minimapCtx.shadowBlur = 6;
      minimapCtx.beginPath();
      minimapCtx.arc(plX, plY, 3.5, 0, Math.PI * 2);
      minimapCtx.fill();
      minimapCtx.shadowBlur = 0;
    }

    // ------------------------------------------------------------------------
    // UI Layout Rendering
    // ------------------------------------------------------------------------
    function renderHUD() {
      if (!hostEl) return;

      // Apply real-time lowpass filter to music during dialogue/modal immersion
      applyDialogueAudioFilter(Boolean(state.dialogue || state.activeModal));

      if (isBackgroundMode) {
        updateSoundtrackUI();
        updatePromptOverlay();
        return;
      }

      // Hearts HTML
      let heartsHtml = "";
      for (let i = 0; i < state.maxHearts; i++) {
        const isFilled = i < state.hearts;
        heartsHtml += `<span class="at-ss-heart ${isFilled ? "" : "is-empty"}">❤</span>`;
      }

      // Quest Steps HTML
      let stepsHtml = "";
      state.questSteps.forEach((st, idx) => {
        const isCurrent = idx === state.questStep - 1;
        stepsHtml += `
          <li class="at-ss-quest-step ${st.done ? "is-done" : ""} ${isCurrent ? "is-active" : ""}">
            <span class="at-ss-step-box">${st.done ? "✓" : ""}</span>
            <span>${st.label}</span>
          </li>
        `;
      });

      // Dialogue Box HTML
      let dialogueHtml = "";
      if (state.dialogue) {
        const d = state.dialogue;
        let choicesHtml = "";
        d.choices?.forEach((c, idx) => {
          choicesHtml += `
            <button type="button" class="at-ss-choice-btn" data-at-choice="${idx}">
              <span class="at-ss-choice-num">${idx + 1}</span>
              <span>${c.text}</span>
            </button>
          `;
        });

        dialogueHtml = `
          <div class="at-ss-dialogue-panel">
            <div class="at-ss-dialogue-portrait-wrap">
              <img src="${d.portrait}" alt="${d.speaker}" class="at-ss-dialogue-portrait">
            </div>
            <div class="at-ss-dialogue-speaker-block">
              <div class="at-ss-dialogue-speaker-header">
                <span class="at-ss-speaker-name">${d.speaker}</span>
                <span class="at-ss-speaker-dept">${d.dept}</span>
              </div>
              <p class="at-ss-dialogue-quote">${d.quote}</p>
            </div>
            <div class="at-ss-dialogue-choices">
              ${choicesHtml}
              <form class="at-ss-agentic-row" data-at-agentic-form>
                <input type="text" name="utterance" class="at-ss-agentic-input" placeholder="Ask anything or propose a diagnosis..." autocomplete="off">
                <button type="submit" class="at-ss-agentic-send">Ask</button>
              </form>
            </div>
            <button type="button" class="at-ss-dialogue-close" data-at-close-dialogue aria-label="Close">✕</button>
          </div>
        `;
      }

      // Training Modal HTML
      let modalHtml = "";
      if (state.activeModal === "training") {
        modalHtml = `
          <div class="at-modal-backdrop">
            <div class="at-modal-panel">
              <div class="at-modal-header">
                <h3>Dell Enterprise Support Training Lab</h3>
                <button type="button" class="at-ss-choice-btn" data-at-close-modal>Close</button>
              </div>
              <p>Practice diagnosing real support scenarios from your queue to level up your career proficiencies.</p>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 14px;">
                <div style="background: rgba(15,23,42,0.8); border: 1px solid rgba(56,189,248,0.3); border-radius: 10px; padding: 12px;">
                  <strong style="color: #38bdf8;">Windows Print Spooler PCL6</strong>
                  <p style="font-size: 12px; color: #cbd5e1; margin: 4px 0 10px;">Isolate deadlocked print jobs and automate spooler purges.</p>
                  <button type="button" class="at-ss-choice-btn" data-at-train="spooler">Complete Course (+40 XP)</button>
                </div>
                <div style="background: rgba(15,23,42,0.8); border: 1px solid rgba(56,189,248,0.3); border-radius: 10px; padding: 12px;">
                  <strong style="color: #facc15;">Latitude PR01X Dock & NumLock</strong>
                  <p style="font-size: 12px; color: #cbd5e1; margin: 4px 0 10px;">Solve Active Directory lockouts caused by docked NumLock states.</p>
                  <button type="button" class="at-ss-choice-btn" data-at-train="dock">Complete Course (+40 XP)</button>
                </div>
              </div>
            </div>
          </div>
        `;
      } else if (state.activeModal === "spooler_terminal") {
        modalHtml = `
          <div class="at-modal-backdrop">
            <div class="at-modal-panel at-terminal-panel">
              <div class="at-terminal-titlebar">
                <span>Command Prompt — spooler_purge.cmd (FIN-PRN-02)</span>
                <button type="button" class="at-terminal-close" data-at-close-modal>✕</button>
              </div>
              <div class="at-terminal-body">
                <div class="at-terminal-line">Microsoft Windows XP [Version 5.1.2600]</div>
                <div class="at-terminal-line">(C) Copyright 1985-2001 Microsoft Corp.</div>
                <div class="at-terminal-line">&nbsp;</div>
                <div class="at-terminal-line"><span class="at-term-prompt">C:\\WINDOWS\\system32&gt;</span> sc query spooler</div>
                <div class="at-terminal-line at-term-out">SERVICE_NAME: spooler | STATE: 4 RUNNING [THREAD DEADLOCKED]</div>
                <div class="at-terminal-line">&nbsp;</div>
                <div class="at-terminal-line"><span class="at-term-prompt">C:\\WINDOWS\\system32&gt;</span> net stop spooler</div>
                <div class="at-terminal-line at-term-out">The Print Spooler service was stopped successfully.</div>
                <div class="at-terminal-line">&nbsp;</div>
                <div class="at-terminal-line"><span class="at-term-prompt">C:\\WINDOWS\\system32&gt;</span> del /Q C:\\WINDOWS\\System32\\spool\\PRINTERS\\*</div>
                <div class="at-terminal-line at-term-out">Purging locked 140MB buffer: 00024.SHD, 00024.SPL... DELETED.</div>
                <div class="at-terminal-line">&nbsp;</div>
                <div class="at-terminal-line"><span class="at-term-prompt">C:\\WINDOWS\\system32&gt;</span> net start spooler</div>
                <div class="at-terminal-line at-term-out">The Print Spooler service was started successfully.</div>
                <div class="at-terminal-line at-term-ok">&gt;&gt;&gt; FIN-PRN-02 is now ONLINE. Test page transmitted! &lt;&lt;&lt;</div>
              </div>
              <div class="at-terminal-footer">
                <button type="button" class="at-ss-choice-btn" data-at-exec-purge>
                  <span>⚡ Execute Batch Script & Restore Printer (+50 XP)</span>
                </button>
              </div>
            </div>
          </div>
        `;
      }

      hostEl.innerHTML = `
        <div class="at-game-shell">
          <div class="at-scroller-viewport">
            <canvas class="at-scroller-canvas" width="${WORLD_W}" height="${WORLD_H}"></canvas>
            <div class="at-stage-vignette"></div>

            <!-- Top-Left Player Unit Frame Box -->
            <div class="at-ss-player-box">
              <div class="at-ss-unit-frame">
                <div class="at-ss-avatar-wrap">
                  <img src="assets/tycoon/josh-sidescroller-avatar.png" alt="Josh" class="at-ss-avatar-img">
                </div>
                <div class="at-ss-player-meta">
                  <div class="at-ss-player-title-row">
                    <span class="at-ss-player-lvl">Lv. ${state.level}</span>
                    <span class="at-ss-player-role">${state.role}</span>
                  </div>
                  <div class="at-ss-xp-row">
                    <span class="at-ss-xp-label">XP ${state.xp} / ${state.xpMax}</span>
                    <div class="at-ss-xp-track">
                      <div class="at-ss-xp-fill" style="width: ${(state.xp / state.xpMax) * 100}%;"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="at-ss-hearts-row">
                ${heartsHtml}
              </div>
              <div class="at-ss-toolbelt-row">
                <button type="button" class="at-ss-tool-chip" data-at-tool="badge" title="Dell Gloves Off Badge — First-call resolution authorization">🪪 Gloves Off ID</button>
                <button type="button" class="at-ss-tool-chip" data-at-tool="driver" title="Phillips #1 Screwdriver — Hardware repairs">🪛 Screwdriver</button>
                <button type="button" class="at-ss-tool-chip" data-at-tool="kb" title="KB Patterns — Spooler & NumLock scripts">💾 KB Patterns</button>
              </div>
            </div>

            <!-- Top Center Utility Pills -->
            <div class="at-ss-top-utility">
              <div class="at-ss-soundtrack-strip" title="Dell 2006 Soundtrack">
                <button type="button" class="at-ss-soundtrack-btn" data-at-action="toggle-music" title="${state.musicPlaying && !state.isMuted ? "Pause Soundtrack" : "Play Soundtrack"}">
                  <span class="at-ss-music-anim ${state.musicPlaying && !state.isMuted ? "is-playing" : ""}">
                    <span class="at-eq-bar b1"></span>
                    <span class="at-eq-bar b2"></span>
                    <span class="at-eq-bar b3"></span>
                  </span>
                  <span class="at-ss-soundtrack-play-icon">${state.musicPlaying && !state.isMuted ? "⏸" : "▶"}</span>
                  <span class="at-ss-track-title">${TRACKS[state.activeTrackIndex]?.title || "Soundtrack"}</span>
                </button>
                <button type="button" class="at-ss-track-skip" data-at-action="next-track" title="Next Track">⏭</button>
              </div>
              <button type="button" class="at-ss-util-pill ${state.isMuted ? "is-muted" : ""}" data-at-action="audio">
                ${state.isMuted ? "🔇 Audio Off" : "🔊 Audio On"}
              </button>
              <button type="button" class="at-ss-util-pill" data-at-action="training">🎓 Training Lab</button>
              <button type="button" class="at-ss-util-pill" data-at-action="reset">🔄 Reset</button>
              <button type="button" class="at-ss-util-pill" data-at-action="fs">⛶ Fullscreen</button>
            </div>

            <!-- Top-Center-Right Architectural Radar Mini-Map -->
            <div class="at-ss-minimap-card">
              <canvas class="at-ss-minimap-canvas" width="168" height="90"></canvas>
            </div>

            <!-- Top-Right Current Quest Card -->
            <div class="at-ss-quest-card">
              <div class="at-ss-quest-header">
                <div class="at-ss-quest-badge-row">
                  <span class="at-ss-quest-bang">!</span>
                  <span class="at-ss-quest-title">${state.questTitle}</span>
                </div>
                <span class="at-ss-quest-counter">${Math.min(4, state.questStep)} / 4</span>
              </div>
              <div style="font-size: 10.5px; color: #facc15; font-weight: 700; margin: 1px 0 6px;">
                🏆 Reward: +100 XP & Promotion
              </div>
              <ul class="at-ss-quest-steps">
                ${stepsHtml}
              </ul>
            </div>

            <!-- In-World Floating Action Prompt -->
            <div class="at-ss-world-prompts-layer"></div>

            <!-- Bottom Character Dialogue Box -->
            ${dialogueHtml}

            <!-- Toast Banner -->
            <div class="at-toast-banner" hidden></div>

            <!-- Modals -->
            ${modalHtml}
          </div>
        </div>
      `;

      // Rebind canvas and event listeners
      canvasEl = hostEl.querySelector(".at-scroller-canvas");
      ctx = canvasEl?.getContext("2d");
      minimapCanvas = hostEl.querySelector(".at-ss-minimap-canvas");
      minimapCtx = minimapCanvas?.getContext("2d");

      bindDomEvents();

      if (state.dialogue || state.activeModal) {
        ensureVisibleInWindow();
      }
    }

    let hostEventsBound = false;
    function bindDomEvents() {
      if (!hostEl) return;

      // Click anywhere on canvas to pathfind/walk
      canvasEl?.addEventListener("click", (e) => {
        if (userWantsMusic && !state.isMuted && !state.musicPlaying) {
          startMusic();
        }
        const rect = canvasEl.getBoundingClientRect();
        const clickX = ((e.clientX - rect.left) / rect.width) * WORLD_W;
        const clickY = ((e.clientY - rect.top) / rect.height) * WORLD_H;

        // Spawn expanding click reticle
        state.clickReticles.push({
          x: clickX,
          y: clickY,
          life: 0.42,
          maxLife: 0.42
        });
        playBeep(840, 0.04, "sine");

        // Determine which floor was clicked
        let targetFloor = 1;
        if (clickY > 530) targetFloor = 0;
        else if (clickY < 360) targetFloor = 2;

        const targetX = Math.round(clickX);
        state.targetMoveFloor = targetFloor;
        state.targetMoveX = targetX;

        // Pathfind smoothly using stairs walking
        state.pathQueue = planPath(state.playerFloor, state.playerX, targetFloor, targetX);
      });

      if (!hostEventsBound) {
        hostEventsBound = true;

        // Interactive clicks in host container (bound once on hostEl)
        hostEl.addEventListener("click", (e) => {
          const toolBtn = e.target.closest("[data-at-tool]");
          if (toolBtn) {
            const tid = toolBtn.getAttribute("data-at-tool");
            const tool = state.inventory.find((t) => t.id === tid);
            if (tool) {
              playBeep(680, 0.08, "triangle");
              showToast(`${tool.icon} ${tool.name}: ${tool.desc}`);
            }
            return;
          }

          const purgeBtn = e.target.closest("[data-at-exec-purge]");
          if (purgeBtn) {
            executeSpoolerPurge();
            return;
          }

          const choiceBtn = e.target.closest("[data-at-choice]");
          if (choiceBtn && state.dialogue) {
            const idx = Number(choiceBtn.getAttribute("data-at-choice"));
            const choice = state.dialogue.choices[idx];
            if (choice && choice.action) {
              playBeep(650, 0.08);
              choice.action();
            }
            return;
          }

          if (e.target.closest("[data-at-close-dialogue]")) {
            state.dialogue = null;
            renderHUD();
            return;
          }

          if (e.target.closest("[data-at-close-modal]")) {
            state.activeModal = null;
            renderHUD();
            return;
          }

          const actionBtn = e.target.closest("[data-at-action]");
          if (actionBtn) {
            const action = actionBtn.getAttribute("data-at-action");
            if (action === "toggle-music") {
              toggleMusic();
              return;
            } else if (action === "next-track") {
              nextTrack();
              return;
            } else if (action === "audio") {
              state.isMuted = !state.isMuted;
              if (!state.isMuted) {
                initAudio();
                if (bgMusic) {
                  bgMusic.volume = state.musicVolume;
                }
                if (musicGainNode && audioCtx) {
                  musicGainNode.gain.setValueAtTime(state.musicVolume, audioCtx.currentTime);
                }
                startMusic();
                playFanfare();
                showToast("🔊 Audio unmuted!");
              } else {
                if (bgMusic) {
                  bgMusic.volume = 0;
                }
                if (musicGainNode && audioCtx) {
                  musicGainNode.gain.setValueAtTime(0, audioCtx.currentTime);
                }
                showToast("🔇 Audio muted");
              }
              updateSoundtrackUI();
              persist();
              renderHUD();
              return;
            } else if (action === "training") {
              openTrainingModal();
            } else if (action === "reset") {
              state.playerX = 460;
              state.playerFloor = 1;
              state.questStep = 1;
              state.questSteps.forEach((s) => (s.done = false));
              state.phoneCallAnswered = true;
              state.phoneRinging = false;
              persist();
              renderHUD();
              showToast("Reset to Pod 4B-19!");
            } else if (action === "fs") {
              const shell = hostEl.querySelector(".at-game-shell");
              shell?.classList.toggle("is-fullscreen");
            }
            return;
          }

          const trainBtn = e.target.closest("[data-at-train]");
          if (trainBtn) {
            state.xp = Math.min(state.xpMax, state.xp + 40);
            showToast("Course completed! +40 XP awarded!");
            playBeep(880, 0.2, "triangle");
            persist();
            renderHUD();
            return;
          }
        });

        // Agentic natural language chat submission delegated on hostEl
        hostEl.addEventListener("submit", (e) => {
          const agenticForm = e.target.closest("[data-at-agentic-form]");
          if (!agenticForm) return;
          e.preventDefault();
          const input = agenticForm.querySelector("input[name='utterance']");
          const text = (input && input.value ? input.value : "").trim();
          if (!text) return;
          input.value = "";

          playBeep(720, 0.1);
          if (root.AutomationTycoonSim && typeof root.AutomationTycoonSim.converseWithNpc === "function") {
            const simState = { chapter: 1, xp: state.xp };
            const res = root.AutomationTycoonSim.converseWithNpc(simState, "caller_devon", text);
            state.dialogue.quote = `"${res.response || "We traced the stuck queue to an orphaned spooler pair."}"`;
          } else {
            state.dialogue.quote = `"${text} — Great question! The spooler service deadlock matches pattern FIN-PRN-02."`;
          }
          renderHUD();
        });
      }
    }

    function ensureMounted() {
      // 1. Cleanly remove any old #automation-tycoon-career-mount if present
      const oldCareerMount = document.getElementById("automation-tycoon-career-mount");
      if (oldCareerMount) {
        oldCareerMount.remove();
      }

      // 2. Target Homepage Footer section (#home-connect)
      const homeConnectSec = document.querySelector("#home-connect") || document.querySelector(".home-sum-connect");
      if (!homeConnectSec) return false;

      const backdrop = homeConnectSec.querySelector(".home-connect-game-stage") || homeConnectSec.querySelector(".home-sum-connect-backdrop");
      if (!backdrop) return false;

      // If already mounted, ensure references are captured
      if (backdrop.querySelector(".home-footer-game-canvas")) {
        hostEl = homeConnectSec;
        canvasEl = backdrop.querySelector(".home-footer-game-canvas");
        ctx = canvasEl?.getContext("2d");
        bindFooterFocusObservers();
        ensureLoopRunning();
        return true;
      }

      // Only offer gaming features and music on desktop and tablet, not mobile (< 768px)
      if (isMobile()) {
        return false;
      }

      // Mark backdrop as active playable game backdrop
      backdrop.classList.add("is-playable-game-backdrop");

      // Hide static metal image
      const staticImg = backdrop.querySelector("img");
      if (staticImg) {
        staticImg.style.display = "none";
      }

      // Create and inject the interactive side-scroller canvas
      const canvas = document.createElement("canvas");
      canvas.className = "at-scroller-canvas home-footer-game-canvas";
      canvas.width = WORLD_W;
      canvas.height = WORLD_H;
      canvas.setAttribute("aria-label", "Dell 2006 Retro Office Interactive Background Canvas");
      backdrop.prepend(canvas);

      // Create and inject prompts layer
      const promptLayer = document.createElement("div");
      promptLayer.className = "at-ss-world-prompts-layer home-footer-prompts-layer";
      backdrop.appendChild(promptLayer);

      // Inject sleek soundtrack strip into .home-connect-game-controls or .home-sum-connect-left
      const leftCol = homeConnectSec.querySelector(".home-connect-game-controls") || homeConnectSec.querySelector(".home-sum-connect-left");
      if (leftCol && !leftCol.querySelector(".home-footer-soundtrack-strip")) {
        const soundtrackStrip = document.createElement("div");
        soundtrackStrip.className = "home-footer-soundtrack-strip";
        soundtrackStrip.setAttribute("aria-label", "Dell 2006 Soundtrack Controls");
        soundtrackStrip.innerHTML = `
          <button type="button" class="home-footer-soundtrack-btn" data-at-action="toggle-music" title="Play Soundtrack">
            <span class="at-ss-music-anim">
              <span class="at-eq-bar b1"></span>
              <span class="at-eq-bar b2"></span>
              <span class="at-eq-bar b3"></span>
            </span>
            <span class="home-footer-play-icon">▶</span>
            <span class="home-footer-track-title">${TRACKS[state.activeTrackIndex]?.title || "Gloves Off Lo-Fi"}</span>
          </button>
          <button type="button" class="home-footer-track-skip" data-at-action="next-track" title="Next Track">⏭</button>
          <span class="home-footer-badge">2006 Dell OST</span>
        `;
        const ctas = leftCol.querySelector(".home-sum-connect-ctas");
        if (ctas) {
          leftCol.insertBefore(soundtrackStrip, ctas);
        } else {
          leftCol.appendChild(soundtrackStrip);
        }
      }

      // Inject faint arrow keys controls hint in bottom-left under CTAs
      if (leftCol && !leftCol.querySelector(".home-footer-controls-hint")) {
        const hintEl = document.createElement("div");
        hintEl.className = "home-footer-controls-hint";
        hintEl.setAttribute("aria-label", "Controls hint: Use arrow keys or click floor to walk Josh");
        hintEl.innerHTML = `
          <div class="home-footer-keys-t" aria-hidden="true">
            <div class="home-footer-key-top">
              <kbd class="home-footer-key">↑</kbd>
            </div>
            <div class="home-footer-key-bottom">
              <kbd class="home-footer-key">←</kbd>
              <kbd class="home-footer-key">↓</kbd>
              <kbd class="home-footer-key">→</kbd>
            </div>
          </div>
          <div class="home-footer-hint-labels" aria-hidden="true">
            <span class="home-footer-hint-title">Move Josh</span>
            <span class="home-footer-hint-desc">Arrow keys &middot; Click floor</span>
          </div>
        `;
        const ctas = leftCol.querySelector(".home-sum-connect-ctas");
        if (ctas && ctas.nextSibling) {
          leftCol.insertBefore(hintEl, ctas.nextSibling);
        } else {
          leftCol.appendChild(hintEl);
        }
      }

      hostEl = homeConnectSec;
      canvasEl = canvas;
      ctx = canvas.getContext("2d");

      bindDomEvents();
      bindFooterFocusObservers();
      updateSoundtrackUI();
      if (!isMounted) {
        isMounted = true;
        stepLoop(performance.now());
      }
      return true;
    }

    let footerFocusListenersBound = false;
    function bindFooterFocusObservers() {
      if (footerFocusListenersBound || !hostEl) return;
      footerFocusListenersBound = true;

      if (typeof IntersectionObserver !== "undefined") {
        try {
          const footerObserver = new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                if (entry.target === hostEl) {
                  isFooterIntersecting = entry.isIntersecting && entry.intersectionRatio > 0.05;
                  ensureLoopRunning();
                  checkFooterFocusAndSyncAudio();
                }
              }
            },
            { threshold: [0, 0.05, 0.15, 0.35, 0.5] }
          );
          footerObserver.observe(hostEl);
        } catch (e) {}
      }

      const gameDrawerEl = hostEl.querySelector ? hostEl.querySelector("#home-connect-game") : null;
      if (gameDrawerEl && typeof MutationObserver !== "undefined") {
        const gameDrawerObs = new MutationObserver(() => {
          ensureLoopRunning();
          checkFooterFocusAndSyncAudio();
        });
        gameDrawerObs.observe(gameDrawerEl, { attributes: true, attributeFilter: ["hidden", "class"] });
      }

      window.addEventListener("scroll", () => {
        ensureLoopRunning();
        checkFooterFocusAndSyncAudio();
      }, { passive: true });
      window.addEventListener(
        "resize",
        () => {
          if (isMobile()) {
            if (state.musicPlaying) {
              fadeOutAndPause();
            }
          } else {
            ensureMounted();
            ensureLoopRunning();
            checkFooterFocusAndSyncAudio();
          }
        },
        { passive: true }
      );

      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          if (state.musicPlaying) {
            fadeOutAndPause();
          }
        } else {
          checkFooterFocusAndSyncAudio();
        }
      });

      window.addEventListener("blur", () => {
        if (state.musicPlaying) {
          fadeOutAndPause();
        }
      });
      window.addEventListener("focus", checkFooterFocusAndSyncAudio);

      window.addEventListener("hashchange", checkFooterFocusAndSyncAudio);
      window.addEventListener("portfolio:routechange", checkFooterFocusAndSyncAudio);

      hostEl.addEventListener("mouseenter", () => {
        isMouseOverFooter = true;
        checkFooterFocusAndSyncAudio();
      });
      hostEl.addEventListener("mouseleave", () => {
        isMouseOverFooter = false;
        checkFooterFocusAndSyncAudio();
      });
      hostEl.addEventListener("focusin", checkFooterFocusAndSyncAudio);
      hostEl.addEventListener("focusout", () => setTimeout(checkFooterFocusAndSyncAudio, 50));
    }

    if (!ensureMounted()) {
      const obs = new MutationObserver(() => {
        if (ensureMounted()) {
          obs.disconnect();
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }

    window.addEventListener("hashchange", () => {
      const oldCareerMount = document.getElementById("automation-tycoon-career-mount");
      if (oldCareerMount) oldCareerMount.remove();
      ensureMounted();
    });

    window.addEventListener(
      "resize",
      () => {
        if (!isMobile()) {
          ensureMounted();
        }
      },
      { passive: true }
    );

    const instance = {
      openModal: () => {
        const homeConnect = document.getElementById("home-connect") || document.querySelector(".home-sum-connect");
        if (homeConnect) {
          homeConnect.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      },
      getState: () => state,
      teleport: (x, floor) => {
        state.playerX = x;
        if (floor !== undefined) {
          state.playerFloor = floor;
          state.playerY = FLOORS[floor].y;
        }
        state.targetMoveX = null;
        updatePromptOverlay();
        renderCanvas();
        renderMiniMap();
        renderHUD();
      },
      interactWith: (poiId) => {
        const poi = POIS.find((p) => p.id === poiId);
        if (poi) interactWithPOI(poi);
      },
      toggleMusic,
      nextTrack,
      startMusic,
      pauseMusic,
      isFooterFocused,
      isMobile
    };
    activeInstance = instance;
    return instance;
  }

  let activeInstance = null;
  return Object.freeze({
    mount,
    getState: () => activeInstance?.getState(),
    teleport: (x, f) => activeInstance?.teleport(x, f),
    interactWith: (id) => activeInstance?.interactWith(id),
    openModal: () => activeInstance?.openModal(),
    toggleMusic: () => activeInstance?.toggleMusic(),
    nextTrack: () => activeInstance?.nextTrack(),
    startMusic: () => activeInstance?.startMusic(),
    pauseMusic: () => activeInstance?.pauseMusic(),
    isFooterFocused: () => activeInstance?.isFooterFocused(),
    isMobile: () => activeInstance?.isMobile?.() ?? false
  });
});
