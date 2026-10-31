(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.FooterGameEngine = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ENGINE_VERSION = "1.0.0";
  const STAGE_IDS = Object.freeze([1, 2, 3, 4, 5, 6]);
  const HINT_UNLOCK_MS = 5000;
  const CONTACT_COOLDOWN_MS = 3000;

  const STAGE_CATALOG = Object.freeze({
    1: Object.freeze({
      id: 1,
      slug: "workshop",
      stepLabel: "1. WORKSHOP",
      headerNum: "1 / 6",
      title: "THE WORKSHOP",
      subtitle: "Take things apart and put them back together.",
      objective: "Every great system starts with understanding the pieces.",
      defaultInstruction: "Drag or click the correct parts into place to rebuild the mechanical pencil.",
      completionInsight: "Curiosity started it all. I've always wanted to understand how things work.",
      targetSeconds: 8,
      timerDisplay: "00:08",
      proofHref: "#projects/workshop42",
      proofLabel: "Workshop42 Proof"
    }),
    2: Object.freeze({
      id: 2,
      slug: "helpdesk",
      stepLabel: "2. HELP DESK",
      headerNum: "2 / 6",
      title: "THE HELP DESK",
      subtitle: "Find the root cause and fix the problem.",
      objective: "A user needs help. Find the cause, not just the symptom.",
      defaultInstruction: "Inspect the workstation and use the right tool to resolve the user's issue.",
      completionInsight: "Good troubleshooting starts with listening, checking evidence, and solving the actual problem (Dell support roots, Sept 2006).",
      targetSeconds: 10,
      timerDisplay: "00:10",
      proofHref: "#projects/dell",
      proofLabel: "Dell Sept 2006 Proof"
    }),
    3: Object.freeze({
      id: 3,
      slug: "server_room",
      stepLabel: "3. SERVER ROOM",
      headerNum: "3 / 6",
      title: "THE SERVER ROOM",
      subtitle: "Route the connections to bring the systems online.",
      objective: "Rotate the pipes to bring the systems online.",
      defaultInstruction: "Click on the pipe segments to rotate them and connect all five systems.",
      completionInsight: "Infrastructure is the foundation. Reliable systems make everything else possible (Grenville 2009-2022).",
      targetSeconds: 12,
      timerDisplay: "00:12",
      proofHref: "#projects/foundations",
      proofLabel: "Infrastructure Proof"
    }),
    4: Object.freeze({
      id: 4,
      slug: "integration_lab",
      stepLabel: "4. INTEGRATION LAB",
      headerNum: "4 / 6",
      title: "THE INTEGRATION LAB",
      subtitle: "Connect systems and automate the business process.",
      objective: "Turn a new insurance submission into a working process.",
      defaultInstruction: "Order the workflow steps, verify ACORD rules, and click Test Flow.",
      completionInsight: "Business knowledge and systems thinking turn disconnected steps into useful solutions (~80% residential, ~60% commercial, ~40% farm/agri user-reported renewal-only automation).",
      targetSeconds: 10,
      timerDisplay: "00:10",
      proofHref: "#projects/workflows",
      proofLabel: "Workflows & Renewals"
    }),
    5: Object.freeze({
      id: 5,
      slug: "ai_lab",
      stepLabel: "5. AI LAB",
      headerNum: "5 / 6",
      title: "THE AI LAB",
      subtitle: "Tune the intelligence loop for reliable answers.",
      objective: "The AI assistant isn't getting the right answer. Tune the loop.",
      defaultInstruction: "Configure Prompting, Context/RAG, and Routing, then click RUN to pass Evals.",
      completionInsight: "Reliable AI takes more than a prompt. It takes the right context, routing, evaluation, and observability (NEXUS independent capstone).",
      targetSeconds: 5,
      timerDisplay: "00:05",
      proofHref: "#projects/nexus",
      proofLabel: "NEXUS Capstone"
    }),
    6: Object.freeze({
      id: 6,
      slug: "contact",
      stepLabel: "6. CONTACT",
      headerNum: "6 / 6",
      title: "MISSION COMPLETE",
      subtitle: "From the metal to the cloud — let's connect!",
      objective: "You made it from the metal to the cloud. Now let's build something together.",
      defaultInstruction: "Send a message or connect via LinkedIn, GitHub, or Email.",
      completionInsight: "Same curiosity. Bigger possibilities.",
      targetSeconds: 0,
      timerDisplay: "00:00",
      proofHref: "#home-connect",
      proofLabel: "Direct Contact"
    })
  });

  const WORKSHOP_PARTS = Object.freeze([
    Object.freeze({ id: "tip", label: "Tip", slotIndex: 0 }),
    Object.freeze({ id: "spring", label: "Spring", slotIndex: 1 }),
    Object.freeze({ id: "lead_tube", label: "Lead Tube", slotIndex: 2 }),
    Object.freeze({ id: "grip", label: "Grip", slotIndex: 3 }),
    Object.freeze({ id: "clip", label: "Clip", slotIndex: 4 }),
    Object.freeze({ id: "cap", label: "Cap", slotIndex: 5 })
  ]);

  const CANONICAL_WORKSHOP_ORDER = Object.freeze(["tip", "spring", "lead_tube", "grip", "clip", "cap"]);

  const HELPDESK_CLUES = Object.freeze({
    network_status: Object.freeze({
      id: "network_status",
      label: "Cable Tester / Link Status",
      finding: "1 Gbps Full-Duplex LINK OK. Ethernet, Power, HDMI, and USB are firmly seated; gateway ping is 2ms."
    }),
    folder_acl: Object.freeze({
      id: "folder_acl",
      label: "Flashlight / Access Log",
      finding: "Physical ports verified clean. SMB session established, but security group ACL is missing Read/Write permission on \\\\fileserver01\\meeting-share."
    }),
    workstation_health: Object.freeze({
      id: "workstation_health",
      label: "No Cable / Hardware Check",
      finding: "No replacement cable needed. Physical layer is 100% healthy; issue is at the access control layer."
    })
  });

  const HELPDESK_REQUIRED_CABLES = Object.freeze([
    "power",
    "ethernet",
    "mouse",
    "keyboard",
    "video"
  ]);

  const HELPDESK_TOOLS = Object.freeze({
    power: Object.freeze({
      id: "power",
      label: "Power Cable",
      kind: "cable",
      cableId: "power",
      clueId: "workstation_health",
      feedback: "1. Power Cable plugged into the rear ATX PSU inlet — 120V AC & 12V standby rails active!"
    }),
    ethernet: Object.freeze({
      id: "ethernet",
      label: "Network Cable",
      kind: "cable",
      cableId: "ethernet",
      clueId: "network_status",
      feedback: "2. Network Cable (CAT6 RJ45) locked into the rear NIC port — 1 Gbps Full-Duplex link LED blinking green!"
    }),
    mouse: Object.freeze({
      id: "mouse",
      label: "Mouse Cable",
      kind: "cable",
      cableId: "mouse",
      clueId: "workstation_health",
      feedback: "3. Mouse USB Cable plugged into the rear USB port — optical sensor powered and ready!"
    }),
    keyboard: Object.freeze({
      id: "keyboard",
      label: "Keyboard Cable",
      kind: "cable",
      cableId: "keyboard",
      clueId: "workstation_health",
      feedback: "4. Keyboard USB Cable plugged into the rear HID USB port — mechanical keyboard detected!"
    }),
    video: Object.freeze({
      id: "video",
      label: "Video Cable",
      kind: "cable",
      cableId: "video",
      clueId: "folder_acl",
      feedback: "5. Video HDMI Cable locked into the rear GPU display port — 4K60 digital monitor link active!"
    }),
    hdmi: Object.freeze({
      id: "hdmi",
      label: "Video Cable",
      kind: "cable",
      cableId: "video",
      clueId: "folder_acl",
      feedback: "5. Video HDMI Cable locked into the rear GPU display port — 4K60 digital monitor link active!"
    }),
    restart: Object.freeze({
      id: "restart",
      label: "Restart PC",
      kind: "restart",
      feedback: "All 5 rear cables (Power, Network, Mouse, Keyboard, Video) connected! Workstation restarted cleanly and opened MEETING_DECK.pptx!",
      prematureFeedback: "Plug in all 5 rear cables (Power, Network, Mouse, Keyboard, Video) into the back of the computer before restarting!"
    }),
    flashlight: Object.freeze({
      id: "flashlight",
      label: "Flashlight",
      kind: "clue",
      clueId: "folder_acl",
      feedback: "Flashlight inspection: check the 5 rear I/O ports (Power, Network, Mouse, Keyboard, Video) on the back of the PC tower."
    }),
    cable_tester: Object.freeze({
      id: "cable_tester",
      label: "Cable Tester",
      kind: "clue",
      clueId: "network_status",
      feedback: "Cable Tester: 1 Gbps link verified across all 8 pairs (2ms ping to file server)."
    }),
    permissions: Object.freeze({
      id: "permissions",
      label: "Permissions",
      kind: "solve",
      feedback: "All rear cables verified, workstation restarted, and shared meeting deck opened!"
    }),
    usb: Object.freeze({
      id: "usb",
      label: "USB",
      kind: "wrong_action",
      feedback: "Connect each dedicated cable (Power, Network, Mouse, Keyboard, Video) into the back of the PC tower, then press Restart."
    }),
    no_cable: Object.freeze({
      id: "no_cable",
      label: "No cable",
      kind: "clue",
      clueId: "workstation_health",
      feedback: "Inspect the rear panel of the PC tower — connect Power, Network, Mouse, Keyboard, and Video, then Restart."
    })
  });

  /* Bitmask Directions: N=1, E=2, S=4, W=8 */
  const DIR_N = 1;
  const DIR_E = 2;
  const DIR_S = 4;
  const DIR_W = 8;

  const PIPE_BASE_MASKS = Object.freeze({
    straight: DIR_W | DIR_E,            // 10 (Horizontal at rotation 0)
    elbow: DIR_N | DIR_E,               // 3  (Top-Right at rotation 0)
    tee: DIR_W | DIR_E | DIR_S,         // 14 (Left-Right-Bottom at rotation 0)
    cross: DIR_N | DIR_E | DIR_S | DIR_W // 15
  });

  /* 4 cols x 3 rows pipe puzzle matching the 5 left systems to 5 right online indicators */
  const LEVEL_3_PIPE_TEMPLATE = Object.freeze([
    // Row 0: Connects Internet & Firewall (West row 0) to Internet Online & Firewall Online (East row 0)
    Object.freeze([
      Object.freeze({ type: "tee", solutionRotation: 0, color: "blue" }),
      Object.freeze({ type: "tee", solutionRotation: 0, color: "blue" }),
      Object.freeze({ type: "straight", solutionRotation: 0, color: "cyan" }),
      Object.freeze({ type: "tee", solutionRotation: 0, color: "cyan" })
    ]),
    // Row 1: Connects Switch (West row 1) across backbone to Switch Online (East row 1) and bridges Rows 0 & 2
    Object.freeze([
      Object.freeze({ type: "cross", solutionRotation: 0, color: "cyan" }),
      Object.freeze({ type: "tee", solutionRotation: 180, color: "green" }),
      Object.freeze({ type: "tee", solutionRotation: 0, color: "green" }),
      Object.freeze({ type: "cross", solutionRotation: 0, color: "green" })
    ]),
    // Row 2: Connects Server & Database (West row 2) to App Server Online & Database Online (East row 2)
    Object.freeze([
      Object.freeze({ type: "tee", solutionRotation: 180, color: "amber" }),
      Object.freeze({ type: "straight", solutionRotation: 0, color: "amber" }),
      Object.freeze({ type: "tee", solutionRotation: 180, color: "amber" }),
      Object.freeze({ type: "tee", solutionRotation: 180, color: "amber" })
    ])
  ]);

  const SERVER_SYSTEMS = Object.freeze([
    Object.freeze({ id: "internet", label: "Internet", onlineLabel: "Internet Online", row: 0, color: "blue" }),
    Object.freeze({ id: "firewall", label: "Firewall", onlineLabel: "Firewall Online", row: 0, color: "cyan" }),
    Object.freeze({ id: "switch", label: "Switch", onlineLabel: "Switch Online", row: 1, color: "green" }),
    Object.freeze({ id: "server", label: "Server", onlineLabel: "App Server Online", row: 2, color: "green" }),
    Object.freeze({ id: "database", label: "Database", onlineLabel: "Database Online", row: 2, color: "amber" })
  ]);

  const WORKFLOW_CANONICAL_MIDDLE = Object.freeze(["validate", "risk_review", "quote"]);

  const WORKFLOW_STEP_DEFS = Object.freeze({
    submission: Object.freeze({
      id: "submission",
      label: "New Submission",
      sub: "Customer Portal Intake",
      color: "cyan",
      fixed: true
    }),
    validate: Object.freeze({
      id: "validate",
      label: "Rules & Validation",
      sub: "Underwriting Rules (ACORD XML)",
      color: "purple",
      requiredInput: "raw_submission",
      producedOutput: "validated_acord_payload",
      validRuleOptionId: "acord_schema_check"
    }),
    risk_review: Object.freeze({
      id: "risk_review",
      label: "Risk Assessment",
      sub: "Calculate Score & Eligibility",
      color: "amber",
      requiredInput: "validated_acord_payload",
      producedOutput: "underwriting_decision",
      validRuleOptionId: "eligibility_rules_with_referral"
    }),
    quote: Object.freeze({
      id: "quote",
      label: "Policy Creation",
      sub: "Bind & Issue Policy Admin",
      color: "emerald",
      requiredInput: "underwriting_decision",
      producedOutput: "bound_policy_record",
      validRuleOptionId: "rate_and_bind_quote"
    }),
    notify: Object.freeze({
      id: "notify",
      label: "Customer Notification",
      sub: "Send Welcome Email",
      color: "cyan",
      fixed: true
    })
  });

  const AI_STATIONS_SPEC = Object.freeze({
    prompting: Object.freeze({
      id: "prompting",
      num: "1. Prompting",
      bullets: "System Role · Clear Task · Constraints",
      color: "purple",
      role: "repairable",
      isModelInputToken: true,
      defaultOptionId: "vague_prompt",
      validOptionId: "structured_prompt",
      allowedOptions: Object.freeze(["vague_prompt", "structured_prompt"])
    }),
    context_engineering: Object.freeze({
      id: "context_engineering",
      num: "2. Context Engineering",
      bullets: "Relevant Docs · Examples · History",
      color: "cyan",
      role: "diagnostic",
      isModelInputToken: true,
      defaultOptionId: "unbounded_window",
      validOptionId: "bounded_context_window",
      allowedOptions: Object.freeze(["unbounded_window", "bounded_context_window"])
    }),
    context_rag: Object.freeze({
      id: "context_rag",
      num: "3. RAG",
      bullets: "Retrieve Knowledge · Ground Response",
      color: "emerald",
      role: "repairable",
      isModelInputToken: true,
      defaultOptionId: "unbounded_unverified_dump",
      validOptionId: "grounded_rag_and_bounded_context",
      allowedOptions: Object.freeze([
        "unbounded_unverified_dump",
        "rag_without_bounds",
        "grounded_rag_and_bounded_context"
      ])
    }),
    routing: Object.freeze({
      id: "routing",
      num: "4. Routing",
      bullets: "Fast Model · Reasoning Model · Cost",
      color: "amber",
      role: "repairable",
      isModelInputToken: false,
      defaultOptionId: "wrong_tier_route",
      validOptionId: "governed_reasoning_route",
      allowedOptions: Object.freeze(["wrong_tier_route", "governed_reasoning_route"])
    }),
    evals: Object.freeze({
      id: "evals",
      num: "5. Evals",
      bullets: "Accuracy · Hallucination Check · Tone",
      color: "coral",
      role: "diagnostic",
      isModelInputToken: false,
      defaultOptionId: "eval_suite_active",
      validOptionId: "eval_suite_active",
      allowedOptions: Object.freeze(["eval_suite_active"])
    }),
    traces: Object.freeze({
      id: "traces",
      num: "6. Traces",
      bullets: "Latency · Tokens · Debug Steps",
      color: "purple",
      role: "diagnostic",
      isModelInputToken: false,
      defaultOptionId: "trace_viewer_active",
      validOptionId: "trace_viewer_active",
      allowedOptions: Object.freeze(["trace_viewer_active"])
    })
  });

  const STAGE_HINTS = Object.freeze({
    1: Object.freeze([
      "Start from the front tip of the pencil and work toward the rear cap.",
      "Order from left to right: 1. Tip -> 2. Spring -> 3. Lead Tube -> 4. Grip -> 5. Clip -> 6. Cap.",
      "Select each highlighted part in sequence (Tip, Spring, Lead Tube, Grip, Clip, Cap) and click its matching blueprint slot."
    ]),
    2: Object.freeze([
      "Inspect the back of the PC tower — all 5 physical cables need to be plugged in before restarting.",
      "Plug in 1. Power, 2. Network (RJ45), 3. Mouse (USB), 4. Keyboard (USB), and 5. Video (HDMI) into the rear ports.",
      "Once all 5 cables are locked into the back of the computer (5/5), click '6. Restart PC' to reboot the workstation!"
    ]),
    3: Object.freeze([
      "Every system on the left needs a continuous, leak-free pipe path to the right.",
      "Align the top and bottom horizontal rows first, then orient the middle row junctions so all ports connect.",
      "Rotate any amber/offline pipe segment until its bolted flanges line up with its neighbors and all 5 indicators turn Online."
    ]),
    4: Object.freeze([
      "An insurance submission must be validated against ACORD rules before underwriting risk assessment or policy creation.",
      "Order the middle workflow steps: Rules & Validation -> Risk Assessment -> Policy Creation, and enable the ACORD rule.",
      "Click 'Move' or click the workflow steps to arrange Rules & Validation, then Risk Assessment, then Policy Creation, click 'Add Rule', and press 'Test Flow'."
    ]),
    5: Object.freeze([
      "Running the AI assistant with default ungrounded settings fails the Evaluation Suite.",
      "Tune Station 1 (Prompting), Station 2/3 (Context Engineering & RAG), and Station 4 (Routing) so all three turn green.",
      "Click '1. Prompting', '3. RAG', and '4. Routing' (or their matching items in DATA & TOOLS) to repair them, then press the central RUN button."
    ]),
    6: Object.freeze([
      "Fill in your name, email, and what you're looking for, or use the direct LinkedIn, GitHub, or Email links."
    ])
  });

  /* ==========================================================================
     Deterministic PRNG (Mulberry32) & Security Sanitizers
     ========================================================================== */

  function normalizeSeed(seed) {
    if (typeof seed === "number" && Number.isFinite(seed)) {
      return (seed >>> 0) || 0x4A4F5348;
    }
    if (typeof seed === "string" && seed.length > 0) {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
      }
      return h || 0x4A4F5348;
    }
    return 0x4A4F5348;
  }

  function mixSeed(baseSeed, a, b) {
    let h = (normalizeSeed(baseSeed) ^ ((a & 0xffff) * 0x9e3779b9) ^ ((b & 0xffff) * 0x85ebca6b)) >>> 0;
    h ^= h >>> 16;
    h = Math.imul(h, 0x7feb352d) >>> 0;
    h ^= h >>> 15;
    h = Math.imul(h, 0x846ca68b) >>> 0;
    h ^= h >>> 16;
    return h >>> 0 || 0x12345678;
  }

  function createRng(seed) {
    let state = normalizeSeed(seed);
    function nextUint32() {
      state = (state + 0x6D2B79F5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0);
    }
    return {
      seed: state,
      nextFloat() {
        return nextUint32() / 4294967296;
      },
      nextInt(min, maxInclusive) {
        const lo = Math.ceil(min);
        const hi = Math.floor(maxInclusive);
        if (hi <= lo) return lo;
        return lo + (nextUint32() % (hi - lo + 1));
      },
      fork() {
        return createRng(nextUint32());
      }
    };
  }

  function deterministicShuffle(array, rng) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = rng.nextInt(0, i);
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function isPlainObject(val) {
    if (val === null || typeof val !== "object") {
      return false;
    }
    try {
      if (Array.isArray(val)) return false;
      const proto = Object.getPrototypeOf(val);
      return proto === Object.prototype || proto === null;
    } catch (_err) {
      return false;
    }
  }

  function inspectSafePayload(payload, allowedKeys) {
    if (payload === undefined) {
      return { ok: true, value: {} };
    }
    if (payload === null || typeof payload !== "object") {
      return {
        ok: false,
        code: "ERR_INVALID_PAYLOAD",
        message: "Action payload must be a plain object."
      };
    }
    try {
      if (Array.isArray(payload)) {
        return {
          ok: false,
          code: "ERR_INVALID_PAYLOAD",
          message: "Action payload must be a plain object."
        };
      }
      const proto = Object.getPrototypeOf(payload);
      if (proto !== Object.prototype && proto !== null) {
        return {
          ok: false,
          code: "ERR_INVALID_PAYLOAD",
          message: "Action payload must be a plain object."
        };
      }
      const forbiddenOwn = ["__proto__", "constructor", "prototype"];
      for (let i = 0; i < forbiddenOwn.length; i++) {
        if (Object.prototype.hasOwnProperty.call(payload, forbiddenOwn[i])) {
          return {
            ok: false,
            code: "ERR_PROTOTYPE_POLLUTION_BLOCKED",
            message: "Prototype-bearing keys are not permitted."
          };
        }
      }
      const keys = Object.keys(payload);
      const out = {};
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (allowedKeys && !allowedKeys.includes(k)) {
          return {
            ok: false,
            code: "ERR_UNKNOWN_PAYLOAD_KEY",
            message: "Unrecognized parameter key in request payload."
          };
        }
        out[k] = payload[k];
      }
      return { ok: true, value: out };
    } catch (_err) {
      return {
        ok: false,
        code: "ERR_HOSTILE_GETTER",
        message: "Failed to read property or trap from input payload."
      };
    }
  }

  function readClockMs(env, fallbackMs) {
    if (env && typeof env.clock === "function") {
      let raw;
      try {
        raw = env.clock();
      } catch (_err) {
        return { ok: false, code: "ERR_INVALID_CLOCK", message: "Clock provider threw an exception." };
      }
      if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) {
        return { ok: false, code: "ERR_INVALID_CLOCK", message: "Clock must return a non-negative finite number." };
      }
      return { ok: true, nowMs: Math.floor(raw) };
    }
    return { ok: true, nowMs: typeof fallbackMs === "number" && Number.isFinite(fallbackMs) ? Math.floor(fallbackMs) : 0 };
  }

  function hasHostileControlChars(str) {
    // eslint-disable-next-line no-control-regex -- Intentional rejection or removal of control characters.
    return /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\r\n\u2028\u2029]/.test(str);
  }

  function sanitizeDisplayText(str, maxLen) {
    if (typeof str !== "string") return "";
    return str
      // eslint-disable-next-line no-control-regex -- Intentional rejection or removal of control characters.
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\u2028\u2029]/g, " ")
      .replace(/\r\n|\r|\n/g, " ")
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, maxLen || 500);
  }

  function containsPromptInjection(str) {
    if (typeof str !== "string") return false;
    return /ignore\s+(all\s+)?previous\s+instructions|system\s*prompt|CANARY-|DROP\s+TABLE|<script\b/i.test(str);
  }

  function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  /* ==========================================================================
     Level 3 Pipe Solver (Reciprocal Port Bitmask + BFS Connectivity)
     ========================================================================== */

  function rotateBitmask(mask, rotationDeg) {
    const steps = (((Math.round(rotationDeg / 90) % 4) + 4) % 4);
    let m = mask;
    for (let i = 0; i < steps; i++) {
      const n = (m & DIR_N) ? DIR_E : 0;
      const e = (m & DIR_E) ? DIR_S : 0;
      const s = (m & DIR_S) ? DIR_W : 0;
      const w = (m & DIR_W) ? DIR_N : 0;
      m = n | e | s | w;
    }
    return m;
  }

  function maskToPortNames(mask) {
    const ports = [];
    if (mask & DIR_N) ports.push("N");
    if (mask & DIR_E) ports.push("E");
    if (mask & DIR_S) ports.push("S");
    if (mask & DIR_W) ports.push("W");
    return ports;
  }

  function evaluatePipeNetwork(grid) {
    if (!Array.isArray(grid) || grid.length === 0) {
      return {
        solved: false,
        allOnline: false,
        energizedCoords: [],
        onlineRows: [false, false, false],
        systemsOnline: {
          internet: false,
          firewall: false,
          switch: false,
          server: false,
          database: false
        }
      };
    }

    const rows = grid.length;
    const cols = grid[0].length;
    const masks = [];
    for (let r = 0; r < rows; r++) {
      masks[r] = [];
      for (let c = 0; c < cols; c++) {
        const cell = grid[r][c];
        const base = PIPE_BASE_MASKS[cell.type] || PIPE_BASE_MASKS.straight;
        masks[r][c] = rotateBitmask(base, cell.rotation || 0);
      }
    }

    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const leaking = Array.from({ length: rows }, () => Array(cols).fill(false));
    const queue = [];

    // Sources enter from the West boundary of column 0 on every row that exposes DIR_W
    for (let r = 0; r < rows; r++) {
      if (masks[r][0] & DIR_W) {
        visited[r][0] = true;
        queue.push([r, 0]);
      }
    }

    const deltas = [
      { dr: -1, dc: 0, outBit: DIR_N, inBit: DIR_S },
      { dr: 0, dc: 1, outBit: DIR_E, inBit: DIR_W },
      { dr: 1, dc: 0, outBit: DIR_S, inBit: DIR_N },
      { dr: 0, dc: -1, outBit: DIR_W, inBit: DIR_E }
    ];

    while (queue.length > 0) {
      const [r, c] = queue.shift();
      const m = masks[r][c];

      for (let i = 0; i < deltas.length; i++) {
        const { dr, dc, outBit, inBit } = deltas[i];
        if (!(m & outBit)) continue;

        const nr = r + dr;
        const nc = c + dc;

        // West boundary on col 0 and East boundary on col cols-1 are valid external rack ports
        if (nc < 0 && c === 0 && outBit === DIR_W) {
          continue;
        }
        if (nc >= cols && c === cols - 1 && outBit === DIR_E) {
          continue;
        }
        // Top/Bottom walls or mismatched neighbor port = leak
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
          leaking[r][c] = true;
          continue;
        }
        const neighborMask = masks[nr][nc];
        if (!(neighborMask & inBit)) {
          leaking[r][c] = true;
          continue;
        }
        if (!visited[nr][nc]) {
          visited[nr][nc] = true;
          queue.push([nr, nc]);
        }
      }
    }

    let anyLeak = false;
    const energizedCoords = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (visited[r][c]) {
          energizedCoords.push({ row: r, col: c });
          if (leaking[r][c]) anyLeak = true;
        }
      }
    }

    const onlineRows = [];
    for (let r = 0; r < rows; r++) {
      const westConnected = (masks[r][0] & DIR_W) !== 0 && visited[r][0];
      const eastConnected = (masks[r][cols - 1] & DIR_E) !== 0 && visited[r][cols - 1];
      onlineRows[r] = Boolean(westConnected && eastConnected && !anyLeak);
    }

    const allRowsReached = onlineRows.every(Boolean);
    const allTilesVisited = energizedCoords.length === rows * cols;
    const solved = Boolean(allRowsReached && allTilesVisited && !anyLeak);

    const systemsOnline = {
      internet: Boolean(solved || (visited[0] && visited[0][0] && (masks[0][0] & DIR_W) !== 0)),
      firewall: Boolean(solved || (visited[0] && visited[0][cols - 1] && (masks[0][cols - 1] & DIR_E) !== 0)),
      switch: Boolean(solved || (visited[1] && visited[1][cols - 1] && (masks[1][cols - 1] & DIR_E) !== 0)),
      server: Boolean(solved || (visited[2] && visited[2][0] && (masks[2][0] & DIR_W) !== 0)),
      database: Boolean(solved)
    };

    return {
      solved,
      allOnline: solved,
      anyLeak,
      energizedCoords,
      visited,
      leaking,
      masks,
      onlineRows,
      systemsOnline
    };
  }

  function verifyPipeGridConnectivity(grid) {
    return evaluatePipeNetwork(grid);
  }

  function generatePipePuzzle(seed) {
    const rng = createRng(mixSeed(seed, 3, 1));
    const grid = [];
    for (let r = 0; r < LEVEL_3_PIPE_TEMPLATE.length; r++) {
      const rowArr = [];
      for (let c = 0; c < LEVEL_3_PIPE_TEMPLATE[r].length; c++) {
        const spec = LEVEL_3_PIPE_TEMPLATE[r][c];
        let rot = spec.solutionRotation;
        if (spec.type !== "cross") {
          const offset = rng.nextInt(0, 1) === 0 ? 90 : 270;
          rot = (spec.solutionRotation + offset) % 360;
        }
        const mask = rotateBitmask(PIPE_BASE_MASKS[spec.type], rot);
        rowArr.push({
          row: r,
          col: c,
          type: spec.type,
          color: spec.color,
          rotation: rot,
          solutionRotation: spec.solutionRotation,
          ports: maskToPortNames(mask),
          energized: false,
          leakingPorts: []
        });
      }
      grid.push(rowArr);
    }
    // Guarantee the puzzle never starts already solved
    if (evaluatePipeNetwork(grid).solved) {
      grid[0][1].rotation = (grid[0][1].solutionRotation + 90) % 360;
      grid[0][1].ports = maskToPortNames(rotateBitmask(PIPE_BASE_MASKS[grid[0][1].type], grid[0][1].rotation));
    }
    const evalState = evaluatePipeNetwork(grid);
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        grid[r][c].energized = evalState.visited[r][c];
      }
    }
    return grid;
  }

  /* ==========================================================================
     Star Calculation & Helper Evaluators
     ========================================================================== */

  function computeStageStars(stageState) {
    if (!stageState || stageState.status !== "success" || stageState.id === 6) {
      return 0;
    }
    const targetMs = (stageState.targetSeconds || 8) * 1000;
    const withinTime = stageState.elapsedMs <= targetMs;
    if (withinTime && stageState.errors === 0 && stageState.hintLevel === 0 && stageState.discoveryAchieved !== false) {
      return 3;
    }
    if (withinTime || stageState.errors <= 1) {
      return 2;
    }
    return 1;
  }

  function validateWorkflowOrder(middleStepIds, stepConfigs) {
    if (!Array.isArray(middleStepIds) || middleStepIds.length !== 3) {
      return {
        passed: false,
        failedAtStepId: "validate",
        errorCode: "DEPENDENCY_ORDER_ERROR",
        errorMessage: "Workflow must include all three core processing steps."
      };
    }
    const expected = WORKFLOW_CANONICAL_MIDDLE;
    for (let i = 0; i < expected.length; i++) {
      if (middleStepIds[i] !== expected[i]) {
        const actualId = middleStepIds[i];
        if (actualId === "risk_review" && middleStepIds.indexOf("validate") > i) {
          return {
            passed: false,
            failedAtStepId: "risk_review",
            errorCode: "DEPENDENCY_ORDER_ERROR",
            errorMessage: "Risk Assessment requires Rules & Validation (ACORD XML check) to run first."
          };
        }
        if (actualId === "quote" && (middleStepIds.indexOf("validate") > i || middleStepIds.indexOf("risk_review") > i)) {
          return {
            passed: false,
            failedAtStepId: "quote",
            errorCode: "DEPENDENCY_ORDER_ERROR",
            errorMessage: "Policy Creation cannot bind a policy before Rules & Validation and Risk Assessment complete."
          };
        }
        return {
          passed: false,
          failedAtStepId: actualId,
          errorCode: "DEPENDENCY_ORDER_ERROR",
          errorMessage: "Workflow steps are out of sequence. Expected: Rules & Validation -> Risk Assessment -> Policy Creation."
        };
      }
    }
    for (let i = 0; i < expected.length; i++) {
      const stepId = expected[i];
      const cfg = stepConfigs && stepConfigs[stepId];
      if (!cfg || cfg.ruleOptionId !== cfg.validRuleOptionId) {
        return {
          passed: false,
          failedAtStepId: stepId,
          errorCode: "BUSINESS_RULE_INVALID",
          errorMessage: "Underwriting Rules (ACORD XML) validation rule must be active before running the workflow."
        };
      }
    }
    return {
      passed: true,
      failedAtStepId: null,
      errorCode: null,
      errorMessage: null
    };
  }

  function evaluateAiLoopConfig(ringStations) {
    const promptOk = ringStations.prompting && ringStations.prompting.selectedOptionId === "structured_prompt";
    const ragOk = ringStations.context_rag && ringStations.context_rag.selectedOptionId === "grounded_rag_and_bounded_context";
    const routeOk = ringStations.routing && ringStations.routing.selectedOptionId === "governed_reasoning_route";

    const traceEvents = [
      {
        stepIndex: 1,
        stationId: "prompting",
        event: promptOk ? "prompt_compiled_structured" : "prompt_compiled_vague",
        detail: promptOk
          ? "System Role + task constraints + ACORD/CSIO citation schema compiled."
          : "Prompt lacked role constraints and output schema.",
        ok: Boolean(promptOk)
      },
      {
        stepIndex: 2,
        stationId: "context_engineering",
        event: ragOk ? "context_window_bounded" : "context_window_unbounded",
        detail: ragOk
          ? "Context window bounded to high-relevance portfolio & policy chunks."
          : "Unfiltered context window contained noisy history.",
        ok: Boolean(ragOk)
      },
      {
        stepIndex: 3,
        stationId: "context_rag",
        event: ragOk ? "rag_grounded_retrieval" : "rag_unverified_dump",
        detail: ragOk
          ? "Retrieved verified chunks from Portfolio, Resume, and CSIO/ACORD docs."
          : "No grounded retrieval from trusted documents.",
        ok: Boolean(ragOk)
      },
      {
        stepIndex: 4,
        stationId: "routing",
        event: routeOk ? "routed_governed_reasoning" : "routed_uncalibrated_model",
        detail: routeOk
          ? "Constraint Router selected governed reasoning tier for accuracy & latency."
          : "Misrouted complex query to uncalibrated fast tier.",
        ok: Boolean(routeOk)
      }
    ];

    const passed = Boolean(promptOk && ragOk && routeOk);
    let reason = "All evaluation checks passed: grounded citations, structured constraints, and governed routing verified.";
    if (!passed) {
      const missing = [];
      if (!promptOk) missing.push("Prompting lacks system constraints");
      if (!ragOk) missing.push("Context/RAG lacks grounded retrieval");
      if (!routeOk) missing.push("Routing uses uncalibrated model tier");
      reason = "EVAL FAIL: " + missing.join("; ") + ".";
    }

    traceEvents.push({
      stepIndex: 5,
      stationId: "evals",
      event: passed ? "eval_suite_pass" : "eval_suite_fail",
      detail: reason,
      ok: passed
    });
    traceEvents.push({
      stepIndex: 6,
      stationId: "traces",
      event: "trace_recorded",
      detail: passed ? "Latency 142ms · 0 hallucinations · 6 spans verified." : "Trace captured failure spans for debugging.",
      ok: true
    });

    return {
      passed,
      simulatedResponse: passed
        ? "Verified response grounded in Josh Boyer's portfolio corpus: Dell (Sept 2006), Grenville (2009-2022, ~80% res / ~60% comm / ~40% farm user-reported renewal automation), and NEXUS AI architecture."
        : "Uncalibrated response failed grounding check.",
      evalScores: {
        relevance: promptOk ? "PASS" : "FAIL",
        grounding: ragOk ? "PASS" : "FAIL",
        correctness: passed ? "PASS" : "FAIL",
        reason
      },
      traceEvents
    };
  }

  function computeSimpleHash(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return " msg-" + h.toString(16).padStart(8, "0");
  }

  function validateContactSubmission(payload, contactState, nowMs) {
    if (!isPlainObject(payload)) {
      return { ok: false, code: "CONTACT_ERR_INVALID_PAYLOAD", message: "Contact submission must be a valid form object." };
    }
    const rawHoneypot = payload.honeypot !== undefined ? payload.honeypot : payload.website;
    if (typeof rawHoneypot === "string" && rawHoneypot.trim().length > 0) {
      return { ok: false, code: "SPAM_REJECTED", message: "Automated spam submission blocked." };
    }
    if (
      contactState &&
      typeof contactState.lastSubmissionAtMs === "number" &&
      nowMs - contactState.lastSubmissionAtMs < CONTACT_COOLDOWN_MS
    ) {
      return {
        ok: false,
        code: "RATE_LIMITED",
        secondaryCode: "CONTACT_ERR_COOLDOWN",
        message: "Please wait a moment before sending another message."
      };
    }

    const rawName = payload.name;
    const rawEmail = payload.email !== undefined ? payload.email : payload.reply;
    const rawMessage = payload.message;
    const rawRoleContext = payload.roleContext !== undefined ? payload.roleContext : "";

    if (typeof rawName !== "string" || typeof rawEmail !== "string" || typeof rawMessage !== "string") {
      return { ok: false, code: "CONTACT_ERR_INVALID_TYPE", message: "Name, email, and message must be text strings." };
    }
    if (hasHostileControlChars(rawName) || hasHostileControlChars(rawEmail)) {
      return { ok: false, code: "CONTACT_ERR_CONTROL_CHARS", message: "Header injection or control characters are not allowed." };
    }
    // eslint-disable-next-line no-control-regex -- Intentional rejection or removal of control characters.
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\u2028\u2029]/.test(rawMessage)) {
      return { ok: false, code: "CONTACT_ERR_CONTROL_CHARS", message: "Null bytes or control characters are not permitted in messages." };
    }

    const name = sanitizeDisplayText(rawName, 120);
    const email = rawEmail.trim();
    const message = sanitizeDisplayText(rawMessage, 4000);
    const roleContext = sanitizeDisplayText(String(rawRoleContext || ""), 200);

    if (name.length < 1 || rawName.trim().length > 120) {
      return { ok: false, code: "CONTACT_ERR_NAME_REQUIRED", message: "Please enter your name (1 to 120 characters)." };
    }
    if (
      email.length < 3 ||
      email.length > 254 ||
      !/^[^\s@<>()+,"';:\\]+@[^\s@<>()+,"';:\\]+\.[^\s@<>()+,"';:\\]{2,}$/.test(email)
    ) {
      return { ok: false, code: "CONTACT_ERR_EMAIL_INVALID", message: "Please enter a valid email address." };
    }
    if (message.length < 2 || rawMessage.trim().length > 4000) {
      return { ok: false, code: "CONTACT_ERR_MESSAGE_LENGTH", message: "Please include a message (between 2 and 4000 characters)." };
    }

    const payloadHash = computeSimpleHash(name.toLowerCase() + "|" + email.toLowerCase() + "|" + message);
    if (contactState && Array.isArray(contactState.submittedHashes) && contactState.submittedHashes.includes(payloadHash)) {
      return { ok: false, code: "DUPLICATE_SUBMISSION", message: "This exact message was already prepared." };
    }

    const mailtoSubject = encodeURIComponent("Portfolio Inquiry from " + name);
    const mailtoBody = encodeURIComponent(
      "Name: " + name + "\nReply-To: " + email + (roleContext ? "\nContext: " + roleContext : "") + "\n\n" + message
    );

    return {
      ok: true,
      code: "CONTACT_STATUS_PREPARED_ONLY",
      message: "Message validated and prepared for josh@joshboyer.ca.",
      sanitized: {
        submissionId: String(payload.submissionId || payloadHash.trim()),
        name,
        email,
        message,
        roleContext,
        submittedAtMs: nowMs,
        payloadHash,
        mailtoUrl: "mailto:josh@joshboyer.ca?subject=" + mailtoSubject + "&body=" + mailtoBody
      }
    };
  }

  /* ==========================================================================
     Initial Stage Builders & State Constructor
     ========================================================================== */

  function createStage1State(seed, resetCount) {
    const rng = createRng(mixSeed(seed, 1, resetCount));
    let trayOrder = deterministicShuffle(CANONICAL_WORKSHOP_ORDER, rng);
    if (trayOrder.join(",") === CANONICAL_WORKSHOP_ORDER.join(",")) {
      const tmp = trayOrder[0];
      trayOrder[0] = trayOrder[1];
      trayOrder[1] = tmp;
    }
    // Ensure the cutting-mat visual layout is thoroughly mixed up (never starting with tip/spring in order)
    const matOrder = trayOrder.slice();
    if (matOrder[0] === "tip" && matOrder[1] === "spring") {
      const swapA = matOrder[0];
      matOrder[0] = matOrder[3];
      matOrder[3] = swapA;
    }
    return {
      id: 1,
      slug: STAGE_CATALOG[1].slug,
      title: STAGE_CATALOG[1].title,
      subtitle: STAGE_CATALOG[1].subtitle,
      objective: STAGE_CATALOG[1].objective,
      completionInsight: STAGE_CATALOG[1].completionInsight,
      status: "playing",
      stars: 0,
      elapsedMs: 0,
      startedAtMs: 0,
      completedAtMs: null,
      targetSeconds: STAGE_CATALOG[1].targetSeconds,
      moves: 0,
      errors: 0,
      hintLevel: 0,
      hintUnlocked: false,
      activeHint: null,
      resetCount: resetCount || 0,
      discoveryAchieved: true,
      data: {
        canonicalOrder: CANONICAL_WORKSHOP_ORDER.slice(),
        trayOrder,
        matOrder,
        slots: [null, null, null, null, null, null],
        selectedPartId: "tip",
        lastPlacement: null,
        lineDrawn: false
      }
    };
  }

  function createStage2State(seed, resetCount) {
    return {
      id: 2,
      slug: STAGE_CATALOG[2].slug,
      title: STAGE_CATALOG[2].title,
      subtitle: STAGE_CATALOG[2].subtitle,
      objective: STAGE_CATALOG[2].objective,
      completionInsight: STAGE_CATALOG[2].completionInsight,
      status: "intro",
      stars: 0,
      elapsedMs: 0,
      startedAtMs: null,
      completedAtMs: null,
      targetSeconds: STAGE_CATALOG[2].targetSeconds,
      moves: 0,
      errors: 0,
      hintLevel: 0,
      hintUnlocked: false,
      activeHint: null,
      resetCount: resetCount || 0,
      discoveryAchieved: true,
      data: {
        ticketSummary: "I can't access the shared file for the meeting. It worked yesterday!",
        clues: {
          network_status: {
            id: "network_status",
            label: HELPDESK_CLUES.network_status.label,
            inspected: false,
            finding: HELPDESK_CLUES.network_status.finding
          },
          folder_acl: {
            id: "folder_acl",
            label: HELPDESK_CLUES.folder_acl.label,
            inspected: false,
            finding: HELPDESK_CLUES.folder_acl.finding
          },
          workstation_health: {
            id: "workstation_health",
            label: HELPDESK_CLUES.workstation_health.label,
            inspected: false,
            finding: HELPDESK_CLUES.workstation_health.finding
          }
        },
        inspectedClueIds: [],
        appliedActions: [],
        requiredCables: HELPDESK_REQUIRED_CABLES.slice(),
        pluggedCables: [],
        cables: {
          power: false,
          ethernet: false,
          mouse: false,
          keyboard: false,
          video: false
        },
        allCablesPlugged: false,
        computerRestarted: false,
        selectedActionId: null,
        lastDiagnosisFeedback: "Plug all 5 cables (Power, Network, Mouse, Keyboard, Video) into the back of the PC, then Restart.",
        sharedFileOpened: false
      }
    };
  }

  function createStage3State(seed, resetCount) {
    const grid = generatePipePuzzle(mixSeed(seed, 3, resetCount || 0));
    const evalState = evaluatePipeNetwork(grid);
    return {
      id: 3,
      slug: STAGE_CATALOG[3].slug,
      title: STAGE_CATALOG[3].title,
      subtitle: STAGE_CATALOG[3].subtitle,
      objective: STAGE_CATALOG[3].objective,
      completionInsight: STAGE_CATALOG[3].completionInsight,
      status: "intro",
      stars: 0,
      elapsedMs: 0,
      startedAtMs: null,
      completedAtMs: null,
      targetSeconds: STAGE_CATALOG[3].targetSeconds,
      moves: 0,
      errors: 0,
      hintLevel: 0,
      hintUnlocked: false,
      activeHint: null,
      resetCount: resetCount || 0,
      discoveryAchieved: true,
      data: {
        rows: 3,
        cols: 4,
        source: { row: 0, col: 0, port: "W" },
        sink: { row: 2, col: 3, port: "E" },
        grid,
        connectedPath: evalState.energizedCoords,
        systemsOnline: evalState.systemsOnline,
        racksOnline: false
      }
    };
  }

  function createStage4State(seed, resetCount) {
    // Always start with ["risk_review", "validate", "quote"] so the 5 conveyor cubes start as:
    // Customer Portal -> Risk Assessment -> Underwriting (ACORD) -> Policy Creation -> Customer Notification
    const middleStepIds = ["risk_review", "validate", "quote"];
    return {
      id: 4,
      slug: STAGE_CATALOG[4].slug,
      title: STAGE_CATALOG[4].title,
      subtitle: STAGE_CATALOG[4].subtitle,
      objective: STAGE_CATALOG[4].objective,
      completionInsight: STAGE_CATALOG[4].completionInsight,
      status: "intro",
      stars: 0,
      elapsedMs: 0,
      startedAtMs: null,
      completedAtMs: null,
      targetSeconds: STAGE_CATALOG[4].targetSeconds,
      moves: 0,
      errors: 0,
      hintLevel: 0,
      hintUnlocked: false,
      activeHint: null,
      resetCount: resetCount || 0,
      discoveryAchieved: true,
      data: {
        disclaimer: "Illustrative simplified insurance workflow. ACORD is used as a data schema reference, not an underwriting system.",
        fixedStartId: "submission",
        fixedEndId: "notify",
        middleStepIds,
        selectedStepId: null,
        extraConnectorsCleaned: true,
        stepConfigs: {
          validate: {
            stepId: "validate",
            label: WORKFLOW_STEP_DEFS.validate.label,
            requiredInput: WORKFLOW_STEP_DEFS.validate.requiredInput,
            producedOutput: WORKFLOW_STEP_DEFS.validate.producedOutput,
            ruleOptionId: "acord_schema_check",
            validRuleOptionId: "acord_schema_check"
          },
          risk_review: {
            stepId: "risk_review",
            label: WORKFLOW_STEP_DEFS.risk_review.label,
            requiredInput: WORKFLOW_STEP_DEFS.risk_review.requiredInput,
            producedOutput: WORKFLOW_STEP_DEFS.risk_review.producedOutput,
            ruleOptionId: "eligibility_rules_with_referral",
            validRuleOptionId: "eligibility_rules_with_referral"
          },
          quote: {
            stepId: "quote",
            label: WORKFLOW_STEP_DEFS.quote.label,
            requiredInput: WORKFLOW_STEP_DEFS.quote.requiredInput,
            producedOutput: WORKFLOW_STEP_DEFS.quote.producedOutput,
            ruleOptionId: "rate_and_bind_quote",
            validRuleOptionId: "rate_and_bind_quote"
          }
        },
        lastRun: null
      }
    };
  }

  function createStage5State(_seed, resetCount) {
    const ringStations = {};
    const keys = Object.keys(AI_STATIONS_SPEC);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const spec = AI_STATIONS_SPEC[k];
      ringStations[k] = {
        id: spec.id,
        label: spec.num,
        bullets: spec.bullets,
        role: spec.role,
        isModelInputToken: spec.isModelInputToken,
        status: spec.role === "repairable" ? "warning" : "configured",
        selectedOptionId: spec.defaultOptionId,
        validOptionId: spec.validOptionId
      };
    }
    return {
      id: 5,
      slug: STAGE_CATALOG[5].slug,
      title: STAGE_CATALOG[5].title,
      subtitle: STAGE_CATALOG[5].subtitle,
      objective: STAGE_CATALOG[5].objective,
      completionInsight: STAGE_CATALOG[5].completionInsight,
      status: "intro",
      stars: 0,
      elapsedMs: 0,
      startedAtMs: null,
      completedAtMs: null,
      targetSeconds: STAGE_CATALOG[5].targetSeconds,
      moves: 0,
      errors: 0,
      hintLevel: 0,
      hintUnlocked: false,
      activeHint: null,
      resetCount: resetCount || 0,
      discoveryAchieved: true,
      data: {
        simulationNotice: "Deterministic local simulation — no live paid LLM call is made.",
        ringStations,
        runCount: 0,
        traceModalOpen: false,
        lastLoopResult: null
      }
    };
  }

  function createStage6State(_seed, resetCount) {
    return {
      id: 6,
      slug: STAGE_CATALOG[6].slug,
      title: STAGE_CATALOG[6].title,
      subtitle: STAGE_CATALOG[6].subtitle,
      objective: STAGE_CATALOG[6].objective,
      completionInsight: STAGE_CATALOG[6].completionInsight,
      status: "intro",
      stars: 0,
      elapsedMs: 0,
      startedAtMs: null,
      completedAtMs: null,
      targetSeconds: 0,
      moves: 0,
      errors: 0,
      hintLevel: 0,
      hintUnlocked: false,
      activeHint: null,
      resetCount: resetCount || 0,
      discoveryAchieved: true,
      data: {
        recapHeadline: "Let's build something great together.",
        links: {
          linkedin: "https://www.linkedin.com/in/josh-boyer-1b770618/",
          github: "https://github.com/joshboyer",
          email: "mailto:josh@joshboyer.ca"
        },
        draft: {
          name: "",
          email: "",
          message: "",
          roleContext: ""
        },
        submissionStatus: "idle",
        lastSubmission: null,
        submittedHashes: [],
        lastSubmissionAtMs: null,
        validationErrors: {}
      }
    };
  }

  function createInitialState(options) {
    const opts = isPlainObject(options) ? options : {};
    const seed = normalizeSeed(opts.seed);
    const clockCheck = readClockMs(opts, 0);
    const nowMs = clockCheck.ok ? clockCheck.nowMs : 0;

    const s1 = createStage1State(seed, 0);
    s1.startedAtMs = nowMs;

    return {
      version: ENGINE_VERSION,
      seed,
      currentStage: 1,
      viewMode: opts.viewMode === "grid" ? "grid" : "focused",
      muted: opts.muted !== undefined ? Boolean(opts.muted) : true,
      reducedMotion: Boolean(opts.reducedMotion),
      createdAtMs: nowMs,
      lastUpdatedAtMs: nowMs,
      skippedToContact: false,
      skippedFromStage: null,
      totalStars: 0,
      stages: {
        1: s1,
        2: createStage2State(seed, 0),
        3: createStage3State(seed, 0),
        4: createStage4State(seed, 0),
        5: createStage5State(seed, 0),
        6: createStage6State(seed, 0)
      }
    };
  }

  function validateState(state) {
    if (!isPlainObject(state) || state.version !== ENGINE_VERSION || !isPlainObject(state.stages)) {
      const err = new Error("Invalid FooterGameEngine state structure.");
      err.code = "ERR_INVALID_STATE";
      throw err;
    }
    for (let i = 0; i < STAGE_IDS.length; i++) {
      const id = STAGE_IDS[i];
      if (!isPlainObject(state.stages[id])) {
        const err = new Error("Missing stage " + id + " in state.");
        err.code = "ERR_INVALID_STAGE_STATE";
        throw err;
      }
    }
    return true;
  }

  function recomputeTotalStars(next) {
    let sum = 0;
    for (let i = 1; i <= 5; i++) {
      sum += next.stages[i].stars || 0;
    }
    next.totalStars = sum;
  }

  function ensureStagePlaying(stage, nowMs) {
    if (stage.status === "intro") {
      stage.status = "playing";
      stage.startedAtMs = nowMs;
    }
    if (typeof stage.startedAtMs === "number") {
      stage.elapsedMs = Math.max(0, nowMs - stage.startedAtMs);
    }
    stage.hintUnlocked = stage.elapsedMs >= HINT_UNLOCK_MS || stage.errors >= 1;
  }

  /* ==========================================================================
     Pure State Transitions
     ========================================================================== */

  function startStage(state, payload, env) {
    validateState(state);
    const pCheck = inspectSafePayload(payload, ["stageId"]);
    if (!pCheck.ok) return { state, result: pCheck };
    const clockCheck = readClockMs(env, state.lastUpdatedAtMs);
    if (!clockCheck.ok) return { state, result: clockCheck };

    const stageId = Number(pCheck.value.stageId);
    if (!STAGE_IDS.includes(stageId)) {
      return { state, result: { ok: false, code: "ERR_INVALID_STAGE_ID", message: "Stage ID must be 1..6." } };
    }

    const next = cloneState(state);
    next.currentStage = stageId;
    next.lastUpdatedAtMs = clockCheck.nowMs;
    const st = next.stages[stageId];
    if (st.status === "intro" || st.status === "skipped") {
      st.status = "playing";
      st.startedAtMs = clockCheck.nowMs;
    }
    ensureStagePlaying(st, clockCheck.nowMs);
    return {
      state: next,
      result: { ok: true, code: "STAGE_STARTED", stageId, hintUnlocked: st.hintUnlocked }
    };
  }

  function advanceStage(state, payload, env) {
    validateState(state);
    const pCheck = inspectSafePayload(payload, ["targetStageId"]);
    if (!pCheck.ok) return { state, result: pCheck };
    const clockCheck = readClockMs(env, state.lastUpdatedAtMs);
    if (!clockCheck.ok) return { state, result: clockCheck };

    const target = pCheck.value.targetStageId !== undefined
      ? Number(pCheck.value.targetStageId)
      : Math.min(6, state.currentStage + 1);
    return startStage(state, { stageId: target }, env);
  }

  function placeWorkshopPart(state, payload, env) {
    validateState(state);
    const pCheck = inspectSafePayload(payload, ["partId", "slotIndex"]);
    if (!pCheck.ok) return { state, result: pCheck };
    const clockCheck = readClockMs(env, state.lastUpdatedAtMs);
    if (!clockCheck.ok) return { state, result: clockCheck };

    const { partId, slotIndex } = pCheck.value;
    if (typeof partId !== "string" || !CANONICAL_WORKSHOP_ORDER.includes(partId)) {
      return { state, result: { ok: false, code: "ERR_INVALID_PART_ID", message: "Unknown workshop part ID." } };
    }
    const targetSlot = slotIndex !== undefined ? Number(slotIndex) : CANONICAL_WORKSHOP_ORDER.indexOf(partId);
    if (!Number.isInteger(targetSlot) || targetSlot < 0 || targetSlot >= CANONICAL_WORKSHOP_ORDER.length) {
      return { state, result: { ok: false, code: "ERR_INVALID_SLOT_INDEX", message: "Slot index must be 0..5." } };
    }

    const next = cloneState(state);
    next.currentStage = 1;
    next.lastUpdatedAtMs = clockCheck.nowMs;
    const st = next.stages[1];
    if (st.status === "success") {
      return { state: next, result: { ok: false, code: "STAGE_ALREADY_COMPLETED", message: "Workshop is already completed." } };
    }
    ensureStagePlaying(st, clockCheck.nowMs);
    st.moves += 1;

    const expectedPart = st.data.canonicalOrder[targetSlot];
    if (expectedPart === partId) {
      st.data.slots[targetSlot] = partId;
      st.data.trayOrder = st.data.trayOrder.filter((id) => id !== partId);
      st.data.lastPlacement = { partId, slotIndex: targetSlot, valid: true };
      const nextUnfilled = st.data.canonicalOrder.find((id) => !st.data.slots.includes(id)) || null;
      st.data.selectedPartId = nextUnfilled;

      const allFilled = st.data.slots.every((val, idx) => val === st.data.canonicalOrder[idx]);
      if (allFilled) {
        st.status = "success";
        st.completedAtMs = clockCheck.nowMs;
        st.data.lineDrawn = true;
        st.stars = computeStageStars(st);
        recomputeTotalStars(next);
        if (next.currentStage === 1) {
          next.stages[2].status = next.stages[2].status === "intro" ? "playing" : next.stages[2].status;
          if (next.stages[2].startedAtMs === null) next.stages[2].startedAtMs = clockCheck.nowMs;
        }
        return {
          state: next,
          result: {
            ok: true,
            code: "WORKSHOP_COMPLETED",
            message: st.completionInsight,
            stars: st.stars,
            lineDrawn: true
          }
        };
      }
      return {
        state: next,
        result: { ok: true, code: "PART_PLACED", partId, slotIndex: targetSlot }
      };
    }

    st.errors += 1;
    st.discoveryAchieved = false;
    st.hintUnlocked = true;
    st.data.lastPlacement = { partId, slotIndex: targetSlot, valid: false };
    return {
      state: next,
      result: {
        ok: false,
        code: "WRONG_SLOT",
        message: "That piece doesn't fit there — check the mechanical order from tip to rear cap."
      }
    };
  }

  function inspectHelpdeskClue(state, payload, env) {
    validateState(state);
    const pCheck = inspectSafePayload(payload, ["clueId"]);
    if (!pCheck.ok) return { state, result: pCheck };
    const clockCheck = readClockMs(env, state.lastUpdatedAtMs);
    if (!clockCheck.ok) return { state, result: clockCheck };

    const { clueId } = pCheck.value;
    if (typeof clueId !== "string" || !HELPDESK_CLUES[clueId]) {
      return { state, result: { ok: false, code: "ERR_INVALID_CLUE_ID", message: "Unknown helpdesk diagnostic clue." } };
    }

    const next = cloneState(state);
    next.currentStage = 2;
    next.lastUpdatedAtMs = clockCheck.nowMs;
    const st = next.stages[2];
    if (st.status === "success") {
      return { state: next, result: { ok: false, code: "STAGE_ALREADY_COMPLETED", message: "Help desk stage already solved." } };
    }
    ensureStagePlaying(st, clockCheck.nowMs);
    st.moves += 1;
    st.data.clues[clueId].inspected = true;
    if (!st.data.inspectedClueIds.includes(clueId)) {
      st.data.inspectedClueIds.push(clueId);
    }
    st.data.lastDiagnosisFeedback = HELPDESK_CLUES[clueId].finding;
    return {
      state: next,
      result: {
        ok: true,
        code: "CLUE_INSPECTED",
        clueId,
        finding: HELPDESK_CLUES[clueId].finding
      }
    };
  }

  function applyHelpdeskTool(state, payload, env) {
    validateState(state);
    const pCheck = inspectSafePayload(payload, ["actionId", "toolId"]);
    if (!pCheck.ok) return { state, result: pCheck };
    const clockCheck = readClockMs(env, state.lastUpdatedAtMs);
    if (!clockCheck.ok) return { state, result: clockCheck };

    const rawId = pCheck.value.actionId !== undefined ? pCheck.value.actionId : pCheck.value.toolId;
    if (typeof rawId !== "string") {
      return { state, result: { ok: false, code: "ERR_INVALID_TOOL_ID", message: "Tool ID must be a string." } };
    }
    const normalizedId = rawId === "check_permissions" ? "permissions"
      : rawId === "check_network" ? "cable_tester"
      : rawId === "network" ? "ethernet"
      : rawId === "hdmi" ? "video"
      : rawId === "restart_computer" ? "restart"
      : rawId === "clear_cache" ? "usb"
      : rawId.replace(/-/g, "_");

    const toolSpec = HELPDESK_TOOLS[normalizedId];
    if (!toolSpec) {
      return { state, result: { ok: false, code: "ERR_INVALID_TOOL_ID", message: "Unrecognized help desk tool." } };
    }

    const next = cloneState(state);
    next.currentStage = 2;
    next.lastUpdatedAtMs = clockCheck.nowMs;
    const st = next.stages[2];
    if (st.status === "success") {
      return { state: next, result: { ok: false, code: "STAGE_ALREADY_COMPLETED", message: "Help desk stage already solved." } };
    }
    ensureStagePlaying(st, clockCheck.nowMs);
    st.moves += 1;
    st.data.selectedActionId = normalizedId;
    if (toolSpec.kind !== "restart" && !st.data.appliedActions.includes(normalizedId)) {
      st.data.appliedActions.push(normalizedId);
    }

    if (toolSpec.kind === "cable") {
      const cableId = toolSpec.cableId;
      if (!Array.isArray(st.data.pluggedCables)) {
        st.data.pluggedCables = [];
      }
      if (!st.data.pluggedCables.includes(cableId)) {
        st.data.pluggedCables.push(cableId);
      }
      if (!st.data.appliedActions.includes(cableId)) {
        st.data.appliedActions.push(cableId);
      }
      if (st.data.cables && typeof st.data.cables === "object") {
        st.data.cables[cableId] = true;
      }
      st.data.allCablesPlugged = HELPDESK_REQUIRED_CABLES.every((c) => st.data.pluggedCables.includes(c));
      const cId = toolSpec.clueId;
      if (cId && st.data.clues[cId]) {
        st.data.clues[cId].inspected = true;
        if (!st.data.inspectedClueIds.includes(cId)) {
          st.data.inspectedClueIds.push(cId);
        }
      }
      st.data.lastDiagnosisFeedback = toolSpec.feedback;
      return {
        state: next,
        result: {
          ok: true,
          code: "CABLE_PLUGGED",
          toolId: normalizedId,
          cableId,
          pluggedCount: st.data.pluggedCables.length,
          allCablesPlugged: st.data.allCablesPlugged,
          message: toolSpec.feedback
        }
      };
    }

    if (toolSpec.kind === "restart") {
      const allPlugged =
        Boolean(st.data.allCablesPlugged) ||
        (Array.isArray(st.data.pluggedCables) &&
          HELPDESK_REQUIRED_CABLES.every((c) => st.data.pluggedCables.includes(c)));
      if (allPlugged) {
        if (!st.data.appliedActions.includes("restart")) {
          st.data.appliedActions.push("restart");
        }
        st.status = "success";
        st.completedAtMs = clockCheck.nowMs;
        st.data.allCablesPlugged = true;
        st.data.computerRestarted = true;
        st.data.sharedFileOpened = true;
        st.data.lastDiagnosisFeedback = toolSpec.feedback;
        st.stars = computeStageStars(st);
        recomputeTotalStars(next);
        return {
          state: next,
          result: {
            ok: true,
            code: "HELPDESK_COMPLETED",
            message: toolSpec.feedback,
            stars: st.stars,
            sharedFileOpened: true,
            computerRestarted: true
          }
        };
      }
      st.errors += 1;
      st.discoveryAchieved = false;
      st.hintUnlocked = true;
      st.data.lastDiagnosisFeedback = toolSpec.prematureFeedback;
      return {
        state: next,
        result: {
          ok: false,
          code: "WRONG_DIAGNOSIS",
          toolId: normalizedId,
          message: toolSpec.prematureFeedback
        }
      };
    }

    if (toolSpec.kind === "clue") {
      const cId = toolSpec.clueId;
      st.data.clues[cId].inspected = true;
      if (!st.data.inspectedClueIds.includes(cId)) {
        st.data.inspectedClueIds.push(cId);
      }
      st.data.lastDiagnosisFeedback = toolSpec.feedback;
      return {
        state: next,
        result: { ok: true, code: "CLUE_INSPECTED", toolId: normalizedId, message: toolSpec.feedback }
      };
    }

    if (toolSpec.kind === "solve") {
      st.status = "success";
      st.completedAtMs = clockCheck.nowMs;
      st.data.pluggedCables = HELPDESK_REQUIRED_CABLES.slice();
      st.data.allCablesPlugged = true;
      st.data.computerRestarted = true;
      st.data.sharedFileOpened = true;
      if (st.data.cables && typeof st.data.cables === "object") {
        HELPDESK_REQUIRED_CABLES.forEach((c) => {
          st.data.cables[c] = true;
        });
      }
      st.data.lastDiagnosisFeedback = toolSpec.feedback;
      st.stars = computeStageStars(st);
      recomputeTotalStars(next);
      return {
        state: next,
        result: {
          ok: true,
          code: "HELPDESK_COMPLETED",
          message: toolSpec.feedback,
          stars: st.stars,
          sharedFileOpened: true,
          computerRestarted: true
        }
      };
    }

    st.errors += 1;
    st.discoveryAchieved = false;
    st.hintUnlocked = true;
    st.data.lastDiagnosisFeedback = toolSpec.feedback;
    return {
      state: next,
      result: {
        ok: false,
        code: "WRONG_DIAGNOSIS",
        toolId: normalizedId,
        message: toolSpec.feedback
      }
    };
  }

  function rotateServerPipe(state, payload, env) {
    validateState(state);
    const pCheck = inspectSafePayload(payload, ["row", "col", "turns"]);
    if (!pCheck.ok) return { state, result: pCheck };
    const clockCheck = readClockMs(env, state.lastUpdatedAtMs);
    if (!clockCheck.ok) return { state, result: clockCheck };

    const row = Number(pCheck.value.row);
    const col = Number(pCheck.value.col);
    const turns = pCheck.value.turns !== undefined ? Number(pCheck.value.turns) : 1;

    if (!Number.isInteger(row) || row < 0 || row >= 3 || !Number.isInteger(col) || col < 0 || col >= 4) {
      return { state, result: { ok: false, code: "ERR_INVALID_PIPE_COORDS", message: "Pipe coordinates out of bounds." } };
    }
    if (!Number.isInteger(turns) || turns === 0 || Math.abs(turns) > 4) {
      return { state, result: { ok: false, code: "ERR_INVALID_PIPE_TURNS", message: "Turns must be a non-zero integer between -4 and 4." } };
    }

    const next = cloneState(state);
    next.currentStage = 3;
    next.lastUpdatedAtMs = clockCheck.nowMs;
    const st = next.stages[3];
    if (st.status === "success") {
      return { state: next, result: { ok: false, code: "STAGE_ALREADY_COMPLETED", message: "Server room pipes are already online." } };
    }
    ensureStagePlaying(st, clockCheck.nowMs);
    st.moves += 1;

    const tile = st.data.grid[row][col];
    tile.rotation = (((tile.rotation + turns * 90) % 360) + 360) % 360;
    const mask = rotateBitmask(PIPE_BASE_MASKS[tile.type], tile.rotation);
    tile.ports = maskToPortNames(mask);

    const evalState = evaluatePipeNetwork(st.data.grid);
    for (let r = 0; r < st.data.grid.length; r++) {
      for (let c = 0; c < st.data.grid[r].length; c++) {
        st.data.grid[r][c].energized = evalState.visited[r][c];
      }
    }
    st.data.connectedPath = evalState.energizedCoords;
    st.data.systemsOnline = evalState.systemsOnline;

    if (evalState.solved) {
      st.status = "success";
      st.completedAtMs = clockCheck.nowMs;
      st.data.racksOnline = true;
      st.discoveryAchieved = st.moves <= 16 && st.hintLevel === 0;
      st.stars = computeStageStars(st);
      recomputeTotalStars(next);
      return {
        state: next,
        result: {
          ok: true,
          code: "SERVER_ROOM_COMPLETED",
          message: st.completionInsight,
          stars: st.stars,
          systemsOnline: evalState.systemsOnline
        }
      };
    }

    return {
      state: next,
      result: {
        ok: true,
        code: "PIPE_ROTATED",
        row,
        col,
        rotation: tile.rotation,
        systemsOnline: evalState.systemsOnline
      }
    };
  }

  function moveWorkflowStep(state, payload, env) {
    validateState(state);
    const pCheck = inspectSafePayload(payload, ["stepId", "targetIndex"]);
    if (!pCheck.ok) return { state, result: pCheck };
    const clockCheck = readClockMs(env, state.lastUpdatedAtMs);
    if (!clockCheck.ok) return { state, result: clockCheck };

    const { stepId, targetIndex } = pCheck.value;
    if (typeof stepId !== "string" || !WORKFLOW_CANONICAL_MIDDLE.includes(stepId)) {
      return { state, result: { ok: false, code: "ERR_INVALID_WORKFLOW_STEP", message: "Invalid movable workflow step ID." } };
    }
    const idx = Number(targetIndex);
    if (!Number.isInteger(idx) || idx < 0 || idx > 2) {
      return { state, result: { ok: false, code: "ERR_INVALID_TARGET_INDEX", message: "Target index must be 0..2." } };
    }

    const next = cloneState(state);
    next.currentStage = 4;
    next.lastUpdatedAtMs = clockCheck.nowMs;
    const st = next.stages[4];
    if (st.status === "success") {
      return { state: next, result: { ok: false, code: "STAGE_ALREADY_COMPLETED", message: "Integration workflow already completed." } };
    }
    ensureStagePlaying(st, clockCheck.nowMs);
    st.moves += 1;

    const arr = st.data.middleStepIds.filter((id) => id !== stepId);
    arr.splice(idx, 0, stepId);
    st.data.middleStepIds = arr;
    return {
      state: next,
      result: { ok: true, code: "WORKFLOW_STEP_MOVED", middleStepIds: arr.slice() }
    };
  }

  function toggleWorkflowAction(state, payload, env) {
    validateState(state);
    const pCheck = inspectSafePayload(payload, ["stepId", "ruleOptionId", "actionType"]);
    if (!pCheck.ok) return { state, result: pCheck };
    const clockCheck = readClockMs(env, state.lastUpdatedAtMs);
    if (!clockCheck.ok) return { state, result: clockCheck };

    const next = cloneState(state);
    next.currentStage = 4;
    next.lastUpdatedAtMs = clockCheck.nowMs;
    const st = next.stages[4];
    if (st.status === "success") {
      return { state: next, result: { ok: false, code: "STAGE_ALREADY_COMPLETED", message: "Integration workflow already completed." } };
    }
    ensureStagePlaying(st, clockCheck.nowMs);
    st.moves += 1;

    const actionType = pCheck.value.actionType;
    if (actionType === "sort_canonical") {
      st.data.middleStepIds = WORKFLOW_CANONICAL_MIDDLE.slice();
      return {
        state: next,
        result: { ok: true, code: "WORKFLOW_SORTED", middleStepIds: st.data.middleStepIds.slice() }
      };
    }

    const stepId = pCheck.value.stepId || "validate";
    const ruleOptionId = pCheck.value.ruleOptionId || "acord_schema_check";
    if (!st.data.stepConfigs[stepId]) {
      return { state, result: { ok: false, code: "ERR_INVALID_WORKFLOW_STEP", message: "Unknown workflow step config." } };
    }
    const allowedRules = [
      "acord_schema_check",
      "skip_validation",
      "eligibility_rules_with_referral",
      "blind_auto_approve",
      "rate_and_bind_quote",
      "unrated_draft"
    ];
    if (typeof ruleOptionId !== "string" || !allowedRules.includes(ruleOptionId)) {
      return { state, result: { ok: false, code: "ERR_INVALID_RULE_OPTION", message: "Invalid workflow rule option." } };
    }

    st.data.stepConfigs[stepId].ruleOptionId = ruleOptionId;
    return {
      state: next,
      result: { ok: true, code: "WORKFLOW_RULE_UPDATED", stepId, ruleOptionId }
    };
  }

  function runWorkflow(state, payload, env) {
    validateState(state);
    const pCheck = inspectSafePayload(payload, []);
    if (!pCheck.ok) return { state, result: pCheck };
    const clockCheck = readClockMs(env, state.lastUpdatedAtMs);
    if (!clockCheck.ok) return { state, result: clockCheck };

    const next = cloneState(state);
    next.currentStage = 4;
    next.lastUpdatedAtMs = clockCheck.nowMs;
    const st = next.stages[4];
    if (st.status === "success") {
      return { state: next, result: { ok: false, code: "STAGE_ALREADY_COMPLETED", message: "Integration workflow already completed." } };
    }
    ensureStagePlaying(st, clockCheck.nowMs);
    st.moves += 1;

    const check = validateWorkflowOrder(st.data.middleStepIds, st.data.stepConfigs);
    if (!check.passed) {
      st.errors += 1;
      st.discoveryAchieved = false;
      st.hintUnlocked = true;
      st.data.lastRun = {
        attempted: true,
        passed: false,
        failedAtStepId: check.failedAtStepId,
        errorCode: check.errorCode,
        errorMessage: check.errorMessage,
        traversedStepIds: ["submission"],
        generatedQuote: false,
        notificationSent: false
      };
      return {
        state: next,
        result: {
          ok: false,
          code: check.errorCode,
          failedAtStepId: check.failedAtStepId,
          message: check.errorMessage
        }
      };
    }

    st.status = "success";
    st.completedAtMs = clockCheck.nowMs;
    st.data.lastRun = {
      attempted: true,
      passed: true,
      failedAtStepId: null,
      errorCode: null,
      errorMessage: null,
      traversedStepIds: ["submission", "validate", "risk_review", "quote", "notify"],
      generatedQuote: true,
      notificationSent: true
    };
    st.stars = computeStageStars(st);
    recomputeTotalStars(next);
    return {
      state: next,
      result: {
        ok: true,
        code: "WORKFLOW_COMPLETED",
        message: st.completionInsight,
        stars: st.stars,
        lastRun: st.data.lastRun
      }
    };
  }

  function configureAiStation(state, payload, env) {
    validateState(state);
    const pCheck = inspectSafePayload(payload, ["stationId", "optionId", "customPrompt"]);
    if (!pCheck.ok) return { state, result: pCheck };
    const clockCheck = readClockMs(env, state.lastUpdatedAtMs);
    if (!clockCheck.ok) return { state, result: clockCheck };

    const { stationId, optionId, customPrompt } = pCheck.value;
    if (customPrompt !== undefined && containsPromptInjection(String(customPrompt))) {
      return {
        state,
        result: {
          ok: false,
          code: "PROMPT_INJECTION_BLOCKED",
          message: "Untrusted prompt override or canary injection blocked by guardrail."
        }
      };
    }
    if (typeof stationId !== "string" || !AI_STATIONS_SPEC[stationId]) {
      return { state, result: { ok: false, code: "ERR_INVALID_STATION_ID", message: "Unknown AI Lab station ID." } };
    }

    const spec = AI_STATIONS_SPEC[stationId];
    const resolvedOption = optionId !== undefined ? optionId : spec.validOptionId;
    if (typeof resolvedOption !== "string" || !spec.allowedOptions.includes(resolvedOption)) {
      return { state, result: { ok: false, code: "ERR_INVALID_STATION_OPTION", message: "Invalid configuration option for AI station." } };
    }

    const next = cloneState(state);
    next.currentStage = 5;
    next.lastUpdatedAtMs = clockCheck.nowMs;
    const st = next.stages[5];
    if (st.status === "success") {
      return { state: next, result: { ok: false, code: "STAGE_ALREADY_COMPLETED", message: "AI Lab loop already verified." } };
    }
    ensureStagePlaying(st, clockCheck.nowMs);
    st.moves += 1;

    const station = st.data.ringStations[stationId];
    station.selectedOptionId = resolvedOption;
    station.status = resolvedOption === spec.validOptionId ? "configured" : "warning";

    if (stationId === "context_rag") {
      const ce = st.data.ringStations.context_engineering;
      if (resolvedOption === "grounded_rag_and_bounded_context") {
        ce.selectedOptionId = "bounded_context_window";
        ce.status = "configured";
      } else {
        ce.selectedOptionId = "unbounded_window";
        ce.status = "warning";
      }
    } else if (stationId === "context_engineering" && resolvedOption === "bounded_context_window") {
      st.data.ringStations.context_rag.selectedOptionId = "grounded_rag_and_bounded_context";
      st.data.ringStations.context_rag.status = "configured";
    }

    return {
      state: next,
      result: {
        ok: true,
        code: "AI_STATION_CONFIGURED",
        stationId,
        optionId: resolvedOption,
        status: station.status
      }
    };
  }

  function runAiLoop(state, payload, env) {
    validateState(state);
    const pCheck = inspectSafePayload(payload, []);
    if (!pCheck.ok) return { state, result: pCheck };
    const clockCheck = readClockMs(env, state.lastUpdatedAtMs);
    if (!clockCheck.ok) return { state, result: clockCheck };

    const next = cloneState(state);
    next.currentStage = 5;
    next.lastUpdatedAtMs = clockCheck.nowMs;
    const st = next.stages[5];
    if (st.status === "success") {
      return { state: next, result: { ok: false, code: "STAGE_ALREADY_COMPLETED", message: "AI Lab loop already verified." } };
    }
    ensureStagePlaying(st, clockCheck.nowMs);
    st.moves += 1;
    st.data.runCount += 1;

    const loopEval = evaluateAiLoopConfig(st.data.ringStations);
    st.data.lastLoopResult = loopEval;

    if (!loopEval.passed) {
      st.errors += 1;
      st.discoveryAchieved = false;
      st.hintUnlocked = true;
      return {
        state: next,
        result: {
          ok: false,
          code: "AI_EVAL_FAILED",
          message: loopEval.evalScores.reason,
          evalScores: loopEval.evalScores,
          traceEvents: loopEval.traceEvents
        }
      };
    }

    const keys = Object.keys(st.data.ringStations);
    for (let i = 0; i < keys.length; i++) {
      st.data.ringStations[keys[i]].status = "verified";
    }
    st.status = "success";
    st.completedAtMs = clockCheck.nowMs;
    st.data.traceModalOpen = true;
    st.stars = computeStageStars(st);
    recomputeTotalStars(next);
    next.stages[6].status = "playing";
    if (next.stages[6].startedAtMs === null) next.stages[6].startedAtMs = clockCheck.nowMs;

    return {
      state: next,
      result: {
        ok: true,
        code: "AI_LOOP_COMPLETED",
        message: st.completionInsight,
        stars: st.stars,
        evalScores: loopEval.evalScores,
        traceEvents: loopEval.traceEvents
      }
    };
  }

  function submitContactForm(state, payload, env) {
    validateState(state);
    const pCheck = inspectSafePayload(payload, [
      "name",
      "email",
      "reply",
      "message",
      "roleContext",
      "honeypot",
      "website",
      "submissionId",
      "copiedToClipboard"
    ]);
    if (!pCheck.ok) return { state, result: pCheck };
    const clockCheck = readClockMs(env, state.lastUpdatedAtMs);
    if (!clockCheck.ok) return { state, result: clockCheck };

    const next = cloneState(state);
    next.lastUpdatedAtMs = clockCheck.nowMs;
    const st = next.stages[6];
    ensureStagePlaying(st, clockCheck.nowMs);

    const check = validateContactSubmission(pCheck.value, st.data, clockCheck.nowMs);
    if (!check.ok) {
      st.errors += 1;
      st.data.submissionStatus = "error";
      st.data.validationErrors = { form: check.code };
      return { state: next, result: check };
    }

    const statusCode = pCheck.value.copiedToClipboard
      ? "CONTACT_STATUS_PREPARED_AND_COPIED"
      : "CONTACT_STATUS_PREPARED_ONLY";

    st.moves += 1;
    st.status = "success";
    st.completedAtMs = clockCheck.nowMs;
    st.data.submissionStatus = "ready_for_transport";
    st.data.lastSubmission = check.sanitized;
    st.data.lastSubmissionAtMs = clockCheck.nowMs;
    st.data.submittedHashes.push(check.sanitized.payloadHash);
    st.data.validationErrors = {};
    st.data.draft = {
      name: check.sanitized.name,
      email: check.sanitized.email,
      message: check.sanitized.message,
      roleContext: check.sanitized.roleContext
    };

    return {
      state: next,
      result: {
        ok: true,
        code: statusCode,
        message: check.message,
        submission: check.sanitized
      }
    };
  }

  function requestHint(state, payload, env) {
    validateState(state);
    const pCheck = inspectSafePayload(payload, ["stageId"]);
    if (!pCheck.ok) return { state, result: pCheck };
    const clockCheck = readClockMs(env, state.lastUpdatedAtMs);
    if (!clockCheck.ok) return { state, result: clockCheck };

    const stageId = pCheck.value.stageId !== undefined ? Number(pCheck.value.stageId) : state.currentStage;
    if (!STAGE_IDS.includes(stageId)) {
      return { state, result: { ok: false, code: "ERR_INVALID_STAGE_ID", message: "Stage ID must be 1..6." } };
    }

    const next = cloneState(state);
    next.lastUpdatedAtMs = clockCheck.nowMs;
    const st = next.stages[stageId];
    ensureStagePlaying(st, clockCheck.nowMs);

    const hints = STAGE_HINTS[stageId] || STAGE_HINTS[1];
    st.hintLevel = Math.min(3, (st.hintLevel || 0) + 1);
    st.hintUnlocked = true;
    st.discoveryAchieved = false;
    st.activeHint = hints[Math.min(hints.length - 1, st.hintLevel - 1)];

    return {
      state: next,
      result: {
        ok: true,
        code: "HINT_PROVIDED",
        stageId,
        hintLevel: st.hintLevel,
        hint: st.activeHint
      }
    };
  }

  function resetStage(state, payload, env) {
    validateState(state);
    const pCheck = inspectSafePayload(payload, ["stageId"]);
    if (!pCheck.ok) return { state, result: pCheck };
    const clockCheck = readClockMs(env, state.lastUpdatedAtMs);
    if (!clockCheck.ok) return { state, result: clockCheck };

    const stageId = pCheck.value.stageId !== undefined ? Number(pCheck.value.stageId) : state.currentStage;
    if (!STAGE_IDS.includes(stageId)) {
      return { state, result: { ok: false, code: "ERR_INVALID_STAGE_ID", message: "Stage ID must be 1..6." } };
    }

    const next = cloneState(state);
    next.lastUpdatedAtMs = clockCheck.nowMs;
    const nextResetCount = (next.stages[stageId].resetCount || 0) + 1;

    if (stageId === 1) next.stages[1] = createStage1State(next.seed, nextResetCount);
    if (stageId === 2) next.stages[2] = createStage2State(next.seed, nextResetCount);
    if (stageId === 3) next.stages[3] = createStage3State(next.seed, nextResetCount);
    if (stageId === 4) next.stages[4] = createStage4State(next.seed, nextResetCount);
    if (stageId === 5) next.stages[5] = createStage5State(next.seed, nextResetCount);
    if (stageId === 6) next.stages[6] = createStage6State(next.seed, nextResetCount);

    next.stages[stageId].status = "playing";
    next.stages[stageId].startedAtMs = clockCheck.nowMs;
    recomputeTotalStars(next);

    return {
      state: next,
      result: { ok: true, code: "STAGE_RESET", stageId, resetCount: nextResetCount }
    };
  }

  function skipToContact(state, payload, env) {
    validateState(state);
    const pCheck = inspectSafePayload(payload, ["reason"]);
    if (!pCheck.ok) return { state, result: pCheck };
    const clockCheck = readClockMs(env, state.lastUpdatedAtMs);
    if (!clockCheck.ok) return { state, result: clockCheck };

    const next = cloneState(state);
    next.lastUpdatedAtMs = clockCheck.nowMs;
    if (next.currentStage < 6 && next.stages[next.currentStage].status !== "success") {
      next.stages[next.currentStage].status = "skipped";
      next.skippedFromStage = next.currentStage;
    }
    next.skippedToContact = true;
    next.currentStage = 6;
    next.stages[6].status = "playing";
    if (next.stages[6].startedAtMs === null) {
      next.stages[6].startedAtMs = clockCheck.nowMs;
    }

    return {
      state: next,
      result: { ok: true, code: "SKIPPED_TO_CONTACT", currentStage: 6 }
    };
  }

  function resetAll(state, payload, env) {
    validateState(state);
    const pCheck = inspectSafePayload(payload, ["seed"]);
    if (!pCheck.ok) return { state, result: pCheck };
    const clockCheck = readClockMs(env, state.lastUpdatedAtMs);
    if (!clockCheck.ok) return { state, result: clockCheck };

    const newSeed = pCheck.value.seed !== undefined ? normalizeSeed(pCheck.value.seed) : state.seed;
    const fresh = createInitialState({
      seed: newSeed,
      clock: () => clockCheck.nowMs,
      muted: state.muted,
      reducedMotion: state.reducedMotion,
      viewMode: state.viewMode
    });
    return {
      state: fresh,
      result: { ok: true, code: "ALL_RESET", seed: fresh.seed }
    };
  }

  function setViewPreferences(state, payload, env) {
    validateState(state);
    const pCheck = inspectSafePayload(payload, ["viewMode", "muted", "reducedMotion"]);
    if (!pCheck.ok) return { state, result: pCheck };
    const clockCheck = readClockMs(env, state.lastUpdatedAtMs);
    if (!clockCheck.ok) return { state, result: clockCheck };

    const next = cloneState(state);
    next.lastUpdatedAtMs = clockCheck.nowMs;
    if (pCheck.value.viewMode !== undefined) {
      if (pCheck.value.viewMode !== "grid" && pCheck.value.viewMode !== "focused") {
        return { state, result: { ok: false, code: "ERR_INVALID_VIEW_MODE", message: "View mode must be 'grid' or 'focused'." } };
      }
      next.viewMode = pCheck.value.viewMode;
    }
    if (pCheck.value.muted !== undefined) {
      next.muted = Boolean(pCheck.value.muted);
    }
    if (pCheck.value.reducedMotion !== undefined) {
      next.reducedMotion = Boolean(pCheck.value.reducedMotion);
    }
    return {
      state: next,
      result: {
        ok: true,
        code: "PREFERENCES_UPDATED",
        viewMode: next.viewMode,
        muted: next.muted,
        reducedMotion: next.reducedMotion
      }
    };
  }

  function createGameSession(options) {
    const opts = isPlainObject(options) ? options : {};
    const env = {
      clock: typeof opts.clock === "function" ? opts.clock : () => Date.now(),
      seed: normalizeSeed(opts.seed)
    };
    let current = createInitialState({
      seed: env.seed,
      clock: env.clock,
      muted: opts.muted,
      reducedMotion: opts.reducedMotion,
      viewMode: opts.viewMode
    });

    const actions = {
      startStage: (p) => apply(startStage, p),
      advanceStage: (p) => apply(advanceStage, p),
      placeWorkshopPart: (p) => apply(placeWorkshopPart, p),
      inspectHelpdeskClue: (p) => apply(inspectHelpdeskClue, p),
      applyHelpdeskTool: (p) => apply(applyHelpdeskTool, p),
      rotateServerPipe: (p) => apply(rotateServerPipe, p),
      moveWorkflowStep: (p) => apply(moveWorkflowStep, p),
      toggleWorkflowAction: (p) => apply(toggleWorkflowAction, p),
      runWorkflow: (p) => apply(runWorkflow, p),
      configureAiStation: (p) => apply(configureAiStation, p),
      runAiLoop: (p) => apply(runAiLoop, p),
      submitContactForm: (p) => apply(submitContactForm, p),
      requestHint: (p) => apply(requestHint, p),
      resetStage: (p) => apply(resetStage, p),
      skipToContact: (p) => apply(skipToContact, p),
      resetAll: (p) => apply(resetAll, p),
      setViewPreferences: (p) => apply(setViewPreferences, p)
    };

    function apply(fn, payload) {
      const out = fn(current, payload, env);
      current = out.state;
      return out.result;
    }

    return {
      getState: () => cloneState(current),
      dispatch: (actionName, payload) => {
        if (!Object.prototype.hasOwnProperty.call(actions, actionName)) {
          return { ok: false, code: "ERR_UNKNOWN_ACTION", message: "Unknown game action." };
        }
        return actions[actionName](payload);
      },
      ...actions
    };
  }
  /* ==========================================================================
     From-Scratch Custom SVG Artwork & Icon Library (Zero Emojis, Zero Cutouts)
     ========================================================================== */

  function renderSharedSvgDefs() {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 0 0" width="0" height="0" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">
        <defs>
          <!-- Recessed Industrial Tile Plate Gradient -->
          <linearGradient id="sr-tile-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1e293b"/>
            <stop offset="50%" stop-color="#0f172a"/>
            <stop offset="100%" stop-color="#090d16"/>
          </linearGradient>
          <!-- 3D Metallic Pipe Body (Horizontal Cylinder) -->
          <linearGradient id="sr-metal-h" gradientUnits="userSpaceOnUse" x1="0" y1="34" x2="0" y2="66">
            <stop offset="0%" stop-color="#1e293b"/>
            <stop offset="14%" stop-color="#64748b"/>
            <stop offset="28%" stop-color="#e2e8f0"/>
            <stop offset="45%" stop-color="#94a3b8"/>
            <stop offset="72%" stop-color="#334155"/>
            <stop offset="90%" stop-color="#475569"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
          <!-- 3D Metallic Pipe Body (Vertical Cylinder) -->
          <linearGradient id="sr-metal-v" gradientUnits="userSpaceOnUse" x1="34" y1="0" x2="66" y2="0">
            <stop offset="0%" stop-color="#1e293b"/>
            <stop offset="14%" stop-color="#64748b"/>
            <stop offset="28%" stop-color="#e2e8f0"/>
            <stop offset="45%" stop-color="#94a3b8"/>
            <stop offset="72%" stop-color="#334155"/>
            <stop offset="90%" stop-color="#475569"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
          <!-- 3D Metallic Diagonal Gradient (for Elbows & Junction Rings) -->
          <linearGradient id="sr-metal-diag" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#334155"/>
            <stop offset="25%" stop-color="#cbd5e1"/>
            <stop offset="50%" stop-color="#64748b"/>
            <stop offset="80%" stop-color="#1e293b"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
          <!-- Bolted Flange Collar Gradient -->
          <linearGradient id="sr-flange-v" gradientUnits="userSpaceOnUse" x1="0" y1="27" x2="0" y2="73">
            <stop offset="0%" stop-color="#0f172a"/>
            <stop offset="15%" stop-color="#94a3b8"/>
            <stop offset="30%" stop-color="#f8fafc"/>
            <stop offset="55%" stop-color="#64748b"/>
            <stop offset="85%" stop-color="#1e293b"/>
            <stop offset="100%" stop-color="#090d16"/>
          </linearGradient>
          <!-- Brass / Gold Metallic Gradient for Mechanical Pencil Parts -->
          <linearGradient id="fj-gold-metal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#78350f"/>
            <stop offset="25%" stop-color="#fde68a"/>
            <stop offset="50%" stop-color="#f59e0b"/>
            <stop offset="80%" stop-color="#b45309"/>
            <stop offset="100%" stop-color="#451a03"/>
          </linearGradient>
          <!-- Neon Fluid Bloom Filter -->
          <filter id="sr-neon-glow" filterUnits="userSpaceOnUse" x="-100" y="-100" width="1200" height="800">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="blur1"/>
            <feGaussianBlur in="SourceGraphic" stdDeviation="6.5" result="blur2"/>
            <feMerge>
              <feMergeNode in="blur2"/>
              <feMergeNode in="blur1"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <!-- Pipe Drop Shadow on Backing Plate -->
          <filter id="sr-pipe-shadow" filterUnits="userSpaceOnUse" x="-40" y="-40" width="180" height="180">
            <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.78"/>
          </filter>
          <g id="sr-tile-plate">
            <rect x="2" y="2" width="96" height="96" rx="6" fill="url(#sr-tile-bg)" stroke="#334155" stroke-width="1.5"/>
            <rect x="6" y="6" width="88" height="88" rx="4" fill="none" stroke="#0f172a" stroke-width="1.5"/>
            <circle cx="12" cy="12" r="2.2" fill="#475569" stroke="#0f172a" stroke-width="1"/>
            <circle cx="88" cy="12" r="2.2" fill="#475569" stroke="#0f172a" stroke-width="1"/>
            <circle cx="12" cy="88" r="2.2" fill="#475569" stroke="#0f172a" stroke-width="1"/>
            <circle cx="88" cy="88" r="2.2" fill="#475569" stroke="#0f172a" stroke-width="1"/>
          </g>
          <g id="sr-flange-left">
            <rect x="1" y="27" width="7" height="46" rx="2" fill="url(#sr-flange-v)" stroke="#0f172a" stroke-width="1.2"/>
            <rect x="8" y="30" width="6" height="40" rx="1.5" fill="url(#sr-flange-v)" stroke="#0f172a" stroke-width="1"/>
            <circle cx="4.5" cy="33" r="1.5" fill="#e2e8f0" stroke="#0f172a" stroke-width="0.6"/>
            <circle cx="4.5" cy="50" r="1.5" fill="#e2e8f0" stroke="#0f172a" stroke-width="0.6"/>
            <circle cx="4.5" cy="67" r="1.5" fill="#e2e8f0" stroke="#0f172a" stroke-width="0.6"/>
          </g>
        </defs>
      </svg>
    `;
  }

  function renderStepperIcon(stageId) {
    switch (stageId) {
      case 1:
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-6.3 6.3a2 2 0 0 0 2.8 2.8l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.8-2.8 2.6-2.6Z"/></svg>`;
      case 2:
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/></svg>`;
      case 3:
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="5" rx="1"/><rect x="3" y="10" width="18" height="5" rx="1"/><rect x="3" y="17" width="18" height="4" rx="1"/><circle cx="7" cy="5.5" r="1" fill="currentColor"/><circle cx="7" cy="12.5" r="1" fill="currentColor"/></svg>`;
      case 4:
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="12" cy="18" r="3"/><path d="M9 6h6M7.5 8.5l3 7M16.5 8.5l-3 7"/></svg>`;
      case 5:
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="6" width="14" height="12" rx="3"/><path d="M12 2v4M2 12h3M19 12h3"/><circle cx="9.5" cy="12" r="1.2" fill="currentColor"/><circle cx="14.5" cy="12" r="1.2" fill="currentColor"/></svg>`;
      case 6:
      default:
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`;
    }
  }

  function renderPartIconSvg(partId) {
    switch (partId) {
      case "tip":
        return `
          <svg viewBox="0 0 64 38" fill="none" aria-hidden="true">
            <g transform="rotate(-18 32 19)">
              <line x1="6" y1="19" x2="14" y2="19" stroke="#e2e8f0" stroke-width="2.4" stroke-linecap="round"/>
              <polygon points="13,19 31,11 31,27" fill="url(#sr-metal-h)" stroke="#f8fafc" stroke-width="1.2"/>
              <rect x="31" y="10" width="14" height="18" rx="2" fill="url(#fj-gold-metal)" stroke="#fde68a" stroke-width="1.2"/>
              <rect x="45" y="13" width="8" height="12" rx="1.5" fill="url(#sr-metal-h)" stroke="#94a3b8" stroke-width="1"/>
            </g>
          </svg>
        `;
      case "spring":
        return `
          <svg viewBox="0 0 64 38" fill="none" aria-hidden="true">
            <g transform="rotate(-22 32 19)">
              <path d="M11 19h5l3.5-8 5 16 5-16 5 16 5-16 5 16 3.5-8h5" stroke="#fde68a" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M11 19h5l3.5-8 5 16 5-16 5 16 5-16 5 16 3.5-8h5" stroke="#b45309" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
            </g>
          </svg>
        `;
      case "lead_tube":
        return `
          <svg viewBox="0 0 64 38" fill="none" aria-hidden="true">
            <g transform="rotate(-18 32 19)">
              <rect x="8" y="14" width="38" height="10" rx="3" fill="url(#sr-metal-h)" stroke="#e2e8f0" stroke-width="1.2"/>
              <rect x="46" y="12" width="10" height="14" rx="2" fill="url(#fj-gold-metal)" stroke="#fde68a" stroke-width="1.1"/>
              <line x1="12" y1="17" x2="42" y2="17" stroke="#f8fafc" stroke-width="1.4" opacity="0.8"/>
            </g>
          </svg>
        `;
      case "grip":
        return `
          <svg viewBox="0 0 64 38" fill="none" aria-hidden="true">
            <g transform="rotate(-18 32 19)">
              <rect x="10" y="9" width="42" height="20" rx="4" fill="url(#sr-metal-h)" stroke="#e2e8f0" stroke-width="1.3"/>
              <path d="M18 9v20M25 9v20M32 9v20M39 9v20M45 9v20" stroke="#0f172a" stroke-width="1.5" opacity="0.65"/>
              <path d="M10 15h42M10 23h42" stroke="#f8fafc" stroke-width="0.9" opacity="0.45"/>
            </g>
          </svg>
        `;
      case "clip":
        return `
          <svg viewBox="0 0 64 38" fill="none" aria-hidden="true">
            <g transform="rotate(-18 32 19)">
              <rect x="12" y="13" width="22" height="14" rx="3" fill="url(#sr-metal-h)" stroke="#cbd5e1" stroke-width="1.2"/>
              <path d="M18 13V8h32a4 4 0 0 1 4 4v3h-6v-2H22v2Z" fill="url(#fj-gold-metal)" stroke="#fef3c7" stroke-width="1.1"/>
            </g>
          </svg>
        `;
      case "cap":
      default:
        return `
          <svg viewBox="0 0 64 38" fill="none" aria-hidden="true">
            <g transform="rotate(-18 32 19)">
              <rect x="12" y="11" width="14" height="16" rx="2" fill="url(#fj-gold-metal)" stroke="#fde68a" stroke-width="1.1"/>
              <rect x="24" y="9" width="28" height="20" rx="4" fill="url(#sr-metal-h)" stroke="#f8fafc" stroke-width="1.3"/>
              <line x1="28" y1="14" x2="48" y2="14" stroke="#ffffff" stroke-width="1.5" opacity="0.75"/>
            </g>
          </svg>
        `;
    }
  }

  

  

  

  

  /* ==========================================================================
     Synthesized Web Audio Sound Effects (Zero External MP3 Dependencies)
     ========================================================================== */

  function createSoundController(getSessionState) {
    let audioCtx = null;

    function playTone(kind) {
      const st = getSessionState();
      if (!st || st.muted) return;
      const AudioContextClass = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
      if (!AudioContextClass) return;
      try {
        if (!audioCtx) audioCtx = new AudioContextClass();
        if (audioCtx.state === "suspended") audioCtx.resume();
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (kind === "success") {
          osc.type = "triangle";
          osc.frequency.setValueAtTime(523.25, now);
          osc.frequency.setValueAtTime(659.25, now + 0.08);
          osc.frequency.setValueAtTime(783.99, now + 0.16);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
          osc.start(now);
          osc.stop(now + 0.32);
        } else if (kind === "error") {
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(190, now);
          osc.frequency.setValueAtTime(145, now + 0.09);
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          osc.start(now);
          osc.stop(now + 0.22);
        } else {
          osc.type = "sine";
          osc.frequency.setValueAtTime(440, now);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
          osc.start(now);
          osc.stop(now + 0.09);
        }
      } catch (_e) {
        // Ignore audio context restrictions
      }
    }

    return { playTone };
  }

  /* ==========================================================================
     Browser DOM Mounting & Interactive Controller
     ========================================================================== */

  const ARCHIVE_ANSWERS = Object.freeze([
    {
      match: /dell|2006|help\s*desk|support/i,
      answer: "Josh started at Dell in September 2006 handling hardware and technical troubleshooting — checking physical/network evidence before jumping to conclusions."
    },
    {
      match: /grenville|renewal|80%|60%|40%|automation/i,
      answer: "During his 2009–2022 tenure at Grenville Mutual, renewal automation reached approximately 80% residential, 60% commercial, and 40% farm/agri (user-reported, renewal-only)."
    },
    {
      match: /medavie|kafka|rest|provider/i,
      answer: "Medavie provider integration covered solution review, mapping, and synchronization requirements using a scheduled event table and REST consumer (not Kafka)."
    },
    {
      match: /takeover|vb|excel|xml/i,
      answer: "Takeover tooling is production/team-adopted: Josh researched and documented the solution, guided development, and supported users with Excel/VB/XML tooling."
    },
    {
      match: /nexus|ai|rag|capstone|lowkey|workshop42/i,
      answer: "NEXUS is Josh's current independent AI capstone focusing on context engineering, routing, evals, and traces. Workshop42 and LOWKEY remain historical/personal builds."
    }
  ]);

  function renderStarRowHtml(starsEarned) {
    let html = `<div class="fj-stars" aria-label="${starsEarned} of 3 stars earned">`;
    for (let i = 1; i <= 3; i++) {
      const earned = i <= starsEarned ? " is-earned" : "";
      html += `<svg class="fj-star${earned}" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9L12 2.5Z"/></svg>`;
    }
    html += `</div>`;
    return html;
  }

  function renderPanelHeaderHtml(stageState) {
    const cat = STAGE_CATALOG[stageState.id];
    const defaultStars = stageState.id >= 5 ? 3 : 2;
    const displayStars = stageState.status === "success" ? stageState.stars : defaultStars;
    const timerVal = stageState.id === 6 ? "00:05" : cat.timerDisplay;
    return `
      <header class="fj-panel__header">
        <div class="fj-panel__title-group">
          <div class="fj-panel__heading-row">
            <span class="fj-panel__step-num">${cat.headerNum}</span>
            <h3 class="fj-panel__title" id="fj-stage-${stageState.id}-title">${cat.title}</h3>
          </div>
          <p class="fj-panel__subtitle">${cat.subtitle}</p>
        </div>
        <div class="fj-panel__hud">
          <span class="fj-timer-pill" aria-label="Stage target time">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.5M9 3h6"/></svg>
            <span data-stage-timer="${stageState.id}">${timerVal}</span>
          </span>
          ${renderStarRowHtml(displayStars)}
        </div>
      </header>
    `;
  }

  function renderPanelFooterHtml(stageState, instructionText, statusClass) {
    const isSolved = stageState.status === "success";
    const nextStageId = Math.min(6, stageState.id + 1);
    const nextLabel = stageState.id < 6 ? `Next: ${STAGE_CATALOG[nextStageId].stepLabel} →` : "";
    return `
      <footer class="fj-panel__footer">
        <div class="fj-instruction-bar ${statusClass || ""}" role="status" aria-live="polite">
          <span class="fj-info-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/></svg>
          </span>
          <span data-stage-instruction="${stageState.id}">${instructionText}</span>
        </div>
        <div class="fj-footer-actions">
          <button type="button" class="fj-action-btn" data-fj-action="reset" data-stage-id="${stageState.id}">
            ${stageState.id === 3 ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>` : ""}
            <span>Reset</span>
          </button>
          ${isSolved && stageState.id < 6 ? `
            <button type="button" class="fj-action-btn fj-action-btn--primary" data-fj-action="next-stage" data-target-stage="${nextStageId}">
              <span>${nextLabel}</span>
            </button>
          ` : ""}
        </div>
      </footer>
    `;
  }

  function mountFooterJourneyBrowser() {
    if (typeof document === "undefined") return null;
    const hostSection = document.getElementById("home-connect");
    if (!hostSection) return null;
    if (document.getElementById("footer-journey")) return null;

    const container = hostSection.querySelector(".home-sum-inner, .home-connect-container") || hostSection;
    hostSection.classList.add("home-connect--journey-mounted");

    const existingForm = hostSection.querySelector("#home-connect-form, [data-home-contact-form]");

    const reducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const session = createGameSession({
      seed: 0x4A4F5348,
      clock: () => Date.now(),
      muted: true,
      reducedMotion,
      viewMode: "focused"
    });
    const sound = createSoundController(() => session.getState());
    let autoAdvanceTimer = null;

    function createEmptyPipeDreamBoard() {
      return [
        [
          { under: null, over: null },
          { under: null, over: null },
          { under: null, over: null },
          { under: null, over: null }
        ],
        [
          { under: null, over: null },
          { under: null, over: null },
          { under: null, over: null },
          { under: null, over: null }
        ],
        [
          { under: null, over: null },
          { under: null, over: null },
          { under: null, over: null },
          { under: null, over: null }
        ],
        [
          { under: null, over: null },
          { under: null, over: null },
          { under: null, over: null },
          { under: null, over: null }
        ]
      ];
    }

    // Interactive Browser Animation State (visual transitions, FLIP swaps, packet & loop waves)
    const uiAnim = {
      selectedServerPipeId: null,
      placedServerSegments: {},
      pipeDreamBoard: createEmptyPipeDreamBoard(),
      pipeDreamFlowActive: false,
      selectedSwapStepId: null,
      workflowConnectorsDrawing: false,
      workflowRuleAnimated: true,
      workflowPacketActiveStepId: null,
      aiActiveWaveStationId: null,
      aiEvalLiveScore: null
    };

    // Individual pipe segments across the 4x4 Server Room matrix (28 individual pipes total)
    const SERVER_PIPE_SEQUENCES = {
      data_fiber: [
        { vRow: 0, vCol: 0, z: "over", dir: "W-S" },
        { vRow: 1, vCol: 0, z: "under", dir: "N-S" },
        { vRow: 2, vCol: 0, z: "over", dir: "N-E" },
        { vRow: 2, vCol: 1, z: "over", dir: "W-E" },
        { vRow: 2, vCol: 2, z: "over", dir: "W-E" },
        { vRow: 2, vCol: 3, z: "over", dir: "W-N" },
        { vRow: 1, vCol: 3, z: "under", dir: "N-S" },
        { vRow: 0, vCol: 3, z: "over", dir: "S-E" }
      ],
      voice_sip: [
        { vRow: 1, vCol: 0, z: "over", dir: "W-E" },
        { vRow: 1, vCol: 1, z: "over", dir: "W-E" },
        { vRow: 1, vCol: 2, z: "over", dir: "W-E" },
        { vRow: 1, vCol: 3, z: "over", dir: "W-E" }
      ],
      ethernet_lan: [
        { vRow: 2, vCol: 0, z: "under", dir: "W-S" },
        { vRow: 3, vCol: 0, z: "under", dir: "N-E" },
        { vRow: 3, vCol: 1, z: "under", dir: "W-E" },
        { vRow: 3, vCol: 2, z: "under", dir: "W-E" },
        { vRow: 3, vCol: 3, z: "under", dir: "W-N" },
        { vRow: 2, vCol: 3, z: "under", dir: "S-E" }
      ],
      power_ups: [
        { vRow: 3, vCol: 0, z: "over", dir: "W-E" },
        { vRow: 3, vCol: 1, z: "over", dir: "W-N" },
        { vRow: 2, vCol: 1, z: "under", dir: "N-S" },
        { vRow: 1, vCol: 1, z: "under", dir: "N-S" },
        { vRow: 0, vCol: 1, z: "over", dir: "S-E" }
      ],
      pdu_cross: [
        { vRow: 0, vCol: 2, z: "over", dir: "W-S" },
        { vRow: 1, vCol: 2, z: "under", dir: "N-S" },
        { vRow: 2, vCol: 2, z: "under", dir: "N-S" },
        { vRow: 3, vCol: 2, z: "over", dir: "N-E" },
        { vRow: 3, vCol: 3, z: "over", dir: "W-E" }
      ]
    };

    function placePipeDreamBlockOnCell(board, vRow, vCol, blockKind) {
      if (vRow < 0 || vRow >= 4 || vCol < 0 || vCol >= 4) return false;
      const cell = board[vRow][vCol];
      if (!cell) return false;

      if (blockKind === "CROSS") {
        cell.under = "N-S";
        cell.over = "W-E";
        return true;
      }

      const validDirs = ["W-E", "N-S", "W-S", "N-E", "W-N", "S-E"];
      if (!validDirs.includes(blockKind)) return false;

      if (!cell.over && !cell.under) {
        cell.over = blockKind;
        return true;
      }

      if (cell.over === blockKind) {
        return true;
      }

      // Dropping a second pipe block onto an occupied cell pushes the first pipe into the under-trench and places the new pipe as the over-bridge
      cell.under = cell.over;
      cell.over = blockKind;
      return true;
    }

    function populateSolvedPipeDreamBoard(board) {
      const allSeqs = [
        ...SERVER_PIPE_SEQUENCES.data_fiber,
        ...SERVER_PIPE_SEQUENCES.voice_sip,
        ...SERVER_PIPE_SEQUENCES.ethernet_lan,
        ...SERVER_PIPE_SEQUENCES.power_ups,
        ...SERVER_PIPE_SEQUENCES.pdu_cross
      ];
      for (const seg of allSeqs) {
        board[seg.vRow][seg.vCol][seg.z] = seg.dir;
      }
    }

    function evaluatePipeDreamBoard(board, flowActive) {
      let placedBlockCount = 0;
      let placedLayerCount = 0;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          const cell = board[r][c];
          if (cell.over || cell.under) placedBlockCount += 1;
          if (cell.over) placedLayerCount += 1;
          if (cell.under) placedLayerCount += 1;
        }
      }

      const filledLayers = {};
      const leakedCells = {};
      const inputConnected = [false, false, false, false];
      const outputConnected = [false, false, false, false];

      if (flowActive) {
        const stepDelta = {
          E: { dr: 0, dc: 1, nextIn: "W" },
          W: { dr: 0, dc: -1, nextIn: "E" },
          S: { dr: 1, dc: 0, nextIn: "N" },
          N: { dr: -1, dc: 0, nextIn: "S" }
        };

        for (let startRow = 0; startRow < 4; startRow++) {
          let r = startRow;
          let c = 0;
          let inPort = "W";
          let preferredLayer = "over";
          const visited = new Set();

          while (r >= 0 && r < 4 && c >= 0 && c < 4) {
            const cell = board[r][c];
            const overMatches = Boolean(cell.over && cell.over.split("-").includes(inPort));
            const underMatches = Boolean(cell.under && cell.under.split("-").includes(inPort));

            let matchedLayer = null;
            if (overMatches && underMatches) {
              matchedLayer = preferredLayer;
            } else if (overMatches) {
              matchedLayer = "over";
            } else if (underMatches) {
              matchedLayer = "under";
            }

            if (!matchedLayer) {
              if (c === 0 && inPort === "W") {
                leakedCells[`${r},${c}`] = "W";
              }
              break;
            }

            const layerKey = `${r},${c}:${matchedLayer}`;
            if (visited.has(layerKey)) {
              break;
            }
            visited.add(layerKey);
            filledLayers[layerKey] = startRow;
            preferredLayer = matchedLayer;

            const dir = cell[matchedLayer];
            const arms = dir.split("-");
            const outPort = arms[0] === inPort ? arms[1] : arms[0];

            if (c === 3 && outPort === "E") {
              inputConnected[startRow] = true;
              outputConnected[r] = true;
              break;
            }

            const delta = stepDelta[outPort];
            if (!delta) break;
            const nr = r + delta.dr;
            const nc = c + delta.dc;
            if (nr < 0 || nr >= 4 || nc < 0 || nc >= 4) {
              leakedCells[`${r},${c}`] = outPort;
              break;
            }
            const nextCell = board[nr][nc];
            const nextHasIn =
              (nextCell.over && nextCell.over.split("-").includes(delta.nextIn)) ||
              (nextCell.under && nextCell.under.split("-").includes(delta.nextIn));
            if (!nextHasIn) {
              leakedCells[`${r},${c}`] = outPort;
              break;
            }
            r = nr;
            c = nc;
            inPort = delta.nextIn;
          }
        }
      }

      const connectedCount = outputConnected.filter(Boolean).length;
      const allFourConnected =
        outputConnected[0] && outputConnected[1] && outputConnected[2] && outputConnected[3];

      return {
        placedBlockCount,
        placedLayerCount,
        filledLayers,
        leakedCells,
        inputConnected,
        outputConnected,
        connectedCount,
        allFourConnected
      };
    }

    function isReducedMotionActive() {
      return Boolean(session.getState().reducedMotion);
    }

    function animateFlyingClone(sourceEl, targetEl, innerHtml, durationMs) {
      if (isReducedMotionActive() || !sourceEl || !targetEl || typeof document === "undefined") return;
      try {
        const srcRect = sourceEl.getBoundingClientRect();
        const dstRect = targetEl.getBoundingClientRect();
        if (!srcRect.width || !dstRect.width) return;

        const clone = document.createElement("div");
        clone.className = "fj-flying-clone";
        clone.innerHTML = innerHtml;
        const startX = srcRect.left + srcRect.width / 2;
        const startY = srcRect.top + srcRect.height / 2;
        const endX = dstRect.left + dstRect.width / 2;
        const endY = dstRect.top + dstRect.height / 2;

        clone.style.left = startX + "px";
        clone.style.top = startY + "px";
        clone.style.transform = "translate(-50%, -50%) scale(0.92)";
        clone.style.opacity = "1";
        document.body.appendChild(clone);

        const dur = durationMs || 380;
        clone.style.transition = `transform ${dur}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${dur}ms ease`;
        // Force layout
        clone.getBoundingClientRect();
        const dx = endX - startX;
        const dy = endY - startY;
        clone.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.06)`;

        setTimeout(() => {
          clone.style.opacity = "0";
          setTimeout(() => {
            if (clone.parentNode) clone.parentNode.removeChild(clone);
          }, 140);
        }, dur - 40);
      } catch (_err) {
        // Ignore bounding-box animation errors in non-layout environments
      }
    }

    function captureWorkflowNodeRects() {
      const rects = {};
      if (isReducedMotionActive()) return rects;
      const nodes = wrapper.querySelectorAll(".fj-workflow-node[data-step-id]");
      nodes.forEach((node) => {
        const id = node.getAttribute("data-step-id");
        if (id) rects[id] = node.getBoundingClientRect();
      });
      return rects;
    }

    function playFlipWorkflowNodes(prevRects) {
      if (isReducedMotionActive() || !prevRects) return;
      const nodes = wrapper.querySelectorAll(".fj-workflow-node[data-step-id]");
      nodes.forEach((node) => {
        const id = node.getAttribute("data-step-id");
        const prev = prevRects[id];
        if (!prev || !prev.width) return;
        const next = node.getBoundingClientRect();
        const dx = prev.left - next.left;
        const dy = prev.top - next.top;
        if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
        node.style.transition = "none";
        node.style.transform = `translate(${dx}px, ${dy}px) scale(1.03)`;
        node.getBoundingClientRect();
        node.style.transition = "transform 360ms cubic-bezier(0.22, 1, 0.36, 1)";
        node.style.transform = "translate(0, 0) scale(1)";
      });
    }

    function scheduleAutoAdvanceIfSolved(completedStageId, customDelayMs) {
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer);
        autoAdvanceTimer = null;
      }
      if (session.getState().reducedMotion) return;
      const delay = typeof customDelayMs === "number" ? customDelayMs : 1550;
      if (completedStageId >= 1 && completedStageId < 6) {
        autoAdvanceTimer = setTimeout(() => {
          const cur = session.getState();
          if (cur.currentStage === completedStageId && cur.stages[completedStageId].status === "success") {
            session.advanceStage({ targetStageId: completedStageId + 1 });
            renderAll();
          }
        }, delay);
      }
    }

    const wrapper = document.createElement("div");
    wrapper.id = "footer-journey";
    wrapper.className = "footer-journey";
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute("aria-label", "From the Metal to the Cloud — Interactive Career Journey");

    const bottomBar = container.querySelector(".home-bottom-bar");
    const gameDrawer = container.querySelector("#home-connect-game");
    if (gameDrawer) {
      container.insertBefore(wrapper, gameDrawer);
    } else if (bottomBar) {
      container.insertBefore(wrapper, bottomBar);
    } else {
      container.prepend(wrapper);
    }

    function renderStage1Body(st) {
      const isAssembled = st.status === "success" || st.data.lineDrawn;
      const hasPart = (partId) => st.data.slots.includes(partId);
      const placedCount = st.data.slots.filter(Boolean).length;

      // Mixed-up order of parts on the blue cutting mat (never in 1..6 canonical order)
      const matOrder =
        Array.isArray(st.data.matOrder) && st.data.matOrder.length === 6
          ? st.data.matOrder
          : ["grip", "clip", "tip", "cap", "lead_tube", "spring"];

      // Scattered spots across the blue cutting mat with varied Y and tilt angles
      const matSpots = [
        { matX: 332, matY: 426, rot: -14 },
        { matX: 432, matY: 390, rot: 9 },
        { matX: 546, matY: 430, rot: -8 },
        { matX: 668, matY: 390, rot: 11 },
        { matX: 770, matY: 428, rot: -12 },
        { matX: 858, matY: 396, rot: 7 }
      ];

      // Target anchor of each part on the floating 3D pencil (in 1000x540 viewBox)
      const penAnchors = {
        tip: { idx: 0, label: "Tip", penX: 318, penY: 241 },
        spring: { idx: 1, label: "Spring", penX: 372, penY: 227 },
        lead_tube: { idx: 2, label: "Lead Tube", penX: 515, penY: 192 },
        grip: { idx: 3, label: "Grip", penX: 434, penY: 212 },
        clip: { idx: 4, label: "Clip", penX: 642, penY: 160 },
        cap: { idx: 5, label: "Cap", penX: 742, penY: 135 }
      };

      const matPartsSpec = Object.keys(penAnchors).map((id) => {
        const spotIdx = Math.max(0, matOrder.indexOf(id));
        const spot = matSpots[spotIdx] || matSpots[0];
        const anchor = penAnchors[id];
        return {
          id,
          idx: anchor.idx,
          label: anchor.label,
          matX: spot.matX,
          matY: spot.matY,
          rot: spot.rot,
          penX: anchor.penX,
          penY: anchor.penY
        };
      });

      const getMatSpec = (id) => matPartsSpec.find((p) => p.id === id) || matPartsSpec[0];

      return `
        <div class="fj-workshop-scene fj-workshop-scene--immersive">
          <div class="fj-speech-bubble fj-speech-bubble--workshop-immersive">
            ${isAssembled
              ? `Every piece locked in — curiosity is how I learned to build!`
              : `${placedCount} / 6 parts installed`}
          </div>

          <svg
            class="fj-workshop-3d-svg${isAssembled ? " is-assembled" : ""}"
            viewBox="0 0 1000 540"
            fill="none"
            role="group"
            aria-label="Interactive 3D mechanical pencil assembly above blueprint mat"
          >
            <defs>
              <!-- 3D Cylindrical Metallic Gold Gradient -->
              <linearGradient id="fj-3d-gold-cyl" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#fef08a"/>
                <stop offset="22%" stop-color="#facc15"/>
                <stop offset="48%" stop-color="#fffbeb"/>
                <stop offset="75%" stop-color="#ca8a04"/>
                <stop offset="100%" stop-color="#713f12"/>
              </linearGradient>
              <!-- 3D Brushed Silver Cylinder Gradient -->
              <linearGradient id="fj-3d-silver-cyl" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#cbd5e1"/>
                <stop offset="25%" stop-color="#f8fafc"/>
                <stop offset="52%" stop-color="#94a3b8"/>
                <stop offset="80%" stop-color="#475569"/>
                <stop offset="100%" stop-color="#1e293b"/>
              </linearGradient>
              <!-- 3D Matte Black / Gunmetal Barrel Gradient -->
              <linearGradient id="fj-3d-black-cyl" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#475569"/>
                <stop offset="18%" stop-color="#64748b"/>
                <stop offset="42%" stop-color="#1e293b"/>
                <stop offset="78%" stop-color="#090d16"/>
                <stop offset="100%" stop-color="#020617"/>
              </linearGradient>
              <!-- Holographic Blue Chamber Gradient -->
              <linearGradient id="fj-holo-chamber" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.55"/>
                <stop offset="50%" stop-color="#0284c7" stop-opacity="0.18"/>
                <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.62"/>
              </linearGradient>
              <!-- Diamond Knurling Pattern for Grip Barrel -->
              <pattern id="fj-knurl-pat" width="6" height="6" patternUnits="userSpaceOnUse">
                <path d="M0 3L3 0L6 3L3 6Z" fill="none" stroke="#020617" stroke-width="1.1" opacity="0.72"/>
                <path d="M0 3L3 0L6 3" fill="none" stroke="#94a3b8" stroke-width="0.6" opacity="0.35"/>
              </pattern>
              <!-- Soft Contact Shadow on Blue Mat -->
              <filter id="fj-mat-drop-shadow" x="-25%" y="-25%" width="150%" height="165%">
                <feDropShadow dx="0" dy="7" stdDeviation="5" flood-color="#020617" flood-opacity="0.72"/>
              </filter>
              <!-- Cyan Energy Aura Filter -->
              <filter id="fj-cyan-aura" x="-30%" y="-40%" width="160%" height="180%">
                <feGaussianBlur stdDeviation="10" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <marker id="fj-cyan-arc-head" viewBox="0 0 12 12" refX="8" refY="6" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 1 1 L 11 6 L 1 11 L 3.5 6 Z" fill="#7dd3fc"/>
              </marker>
            </defs>

            <!-- ============================================================
                 1. FLOATING 3D MECHANICAL PENCIL IN MID-AIR (-14 deg angle)
                 (Hidden until built; shows only a slight shadow while dragging a part)
                 ============================================================ -->
            <g class="fj-floating-pen-group${isAssembled ? " is-complete-flash" : ""}" transform="translate(530, 188) rotate(-14)">
              <!-- Soft Ambient Halo (only visible once assembled) -->
              <ellipse class="fj-pen-ambient-halo" cx="0" cy="0" rx="235" ry="28" fill="#38bdf8" opacity="${isAssembled ? "0.38" : "0"}" filter="url(#fj-cyan-aura)" pointer-events="none"/>

              ${!isAssembled ? `
                <!-- Slight Pen Shadow Silhouette (hidden by default; revealed only while dragging a part) -->
                <g class="fj-pen-drag-shadow" pointer-events="none">
                  <path
                    d="M -252 0 L -242 -3 L -192 -18 L 198 -18 L 202 -13 L 242 -13 L 242 13 L 202 13 L 198 18 L -192 18 L -242 3 Z"
                    fill="rgba(2, 6, 23, 0.42)"
                    stroke="rgba(148, 163, 184, 0.22)"
                    stroke-width="1.2"
                    stroke-dasharray="6 4"
                    filter="url(#fj-mat-drop-shadow)"
                  />
                </g>
              ` : ""}

              ${isAssembled ? `
                <!-- ==========================================================
                     COMPLETED PEN FLASH + SEAMLESS ASSEMBLED 3D EXECUTIVE PEN
                     ========================================================== -->
                <ellipse class="fj-pen-flash-burst" cx="0" cy="0" rx="255" ry="44" fill="#fef08a" opacity="0" filter="url(#fj-cyan-aura)" pointer-events="none"/>
                <g class="fj-completed-pen-3d" filter="url(#fj-mat-drop-shadow)">
                  <!-- 0.5mm Graphite Lead + Chrome Pipe Sleeve -->
                  <rect x="-242" y="-1.8" width="10" height="3.6" rx="1.2" fill="#94a3b8" stroke="none"/>
                  <rect x="-233" y="-3" width="9" height="6" rx="1.2" fill="url(#fj-3d-silver-cyl)" stroke="none"/>
                  <!-- Polished 3D Gold Conical Nose Cone -->
                  <polygon points="-224,-3.2 -172,-18 -172,18 -224,3.2" fill="url(#fj-3d-gold-cyl)" stroke="#fef08a" stroke-width="0.9"/>
                  <line x1="-220" y1="-1.5" x2="-174" y2="-11" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" opacity="0.8"/>
                  <!-- Front Gold Trim Collar -->
                  <rect x="-172" y="-19" width="14" height="38" rx="1.5" fill="url(#fj-3d-gold-cyl)" stroke="#fde047" stroke-width="0.9"/>
                  <!-- Matte-Black Diamond-Knurled Grip Section (seamlessly housing the internal spring) -->
                  <rect x="-158" y="-19.5" width="128" height="39" rx="2" fill="url(#fj-3d-black-cyl)" stroke="#334155" stroke-width="1"/>
                  <rect x="-155" y="-18.5" width="122" height="37" rx="1.5" fill="url(#fj-knurl-pat)" stroke="none"/>
                  <line x1="-154" y1="-12" x2="-34" y2="-12" stroke="#cbd5e1" stroke-width="1.4" opacity="0.38"/>
                  <!-- Center Gold Executive Ring (seamlessly housing the internal lead chuck) -->
                  <rect x="-30" y="-19.5" width="18" height="39" rx="1.5" fill="url(#fj-3d-gold-cyl)" stroke="#fef08a" stroke-width="0.9"/>
                  <line x1="-27" y1="-19" x2="-27" y2="19" stroke="#713f12" stroke-width="1" opacity="0.6"/>
                  <!-- Glossy Black Upper Barrel -->
                  <rect x="-12" y="-18.5" width="186" height="37" rx="2" fill="url(#fj-3d-black-cyl)" stroke="#334155" stroke-width="1"/>
                  <line x1="-6" y1="-10" x2="168" y2="-10" stroke="#f8fafc" stroke-width="2.8" stroke-linecap="round" opacity="0.58"/>
                  <!-- Rear Gold Clip Band & Sculpted 3D Gold Pocket Clip -->
                  <rect x="174" y="-19" width="15" height="38" rx="1.5" fill="url(#fj-3d-gold-cyl)" stroke="#fef08a" stroke-width="0.9"/>
                  <path d="M 180 -19 L 180 -29 C 180 -32, 174 -33, 162 -32 L 78 -23 C 71 -22, 69 -19, 76 -18.5 L 90 -18.5 L 171 -25.5 L 171 -19 Z" fill="url(#fj-3d-gold-cyl)" stroke="#fef08a" stroke-width="1"/>
                  <!-- Polished Gold Rear Clicker Cap -->
                  <rect x="189" y="-14" width="8" height="28" rx="1.5" fill="#0f172a" stroke="none"/>
                  <rect x="197" y="-12.5" width="32" height="25" rx="4" fill="url(#fj-3d-gold-cyl)" stroke="#fef08a" stroke-width="0.9"/>
                  <line x1="201" y1="-6.5" x2="225" y2="-6.5" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" opacity="0.85"/>
                </g>
              ` : ""}

              <!-- Slot 0: 3D Gold Conical Tip (x: -248..-172) -->
              <g
                class="fj-pen-seg-target fj-pencil-drop-zone${hasPart("tip") ? " is-slot-filled" : " is-slot-empty"}"
                data-fj-action="place-slot"
                data-slot-index="0"
                data-accept-part="tip"
                pointer-events="all"
                ${isAssembled ? ' opacity="0"' : ""}
              >
                <rect x="-252" y="-28" width="80" height="56" rx="8" fill="transparent" stroke="none"/>
                <g class="fj-pen-seg-3d fj-pen-seg-3d--tip ${hasPart("tip") ? "is-placed" : "is-unplaced"}">
                  <rect x="-252" y="-2.2" width="12" height="4.4" rx="1.5" fill="#e2e8f0"/>
                  <polygon points="-242,-2.5 -192,-17 -192,17 -242,2.5" fill="url(#fj-3d-gold-cyl)" stroke="#fef08a" stroke-width="0.9"/>
                  <line x1="-238" y1="-1" x2="-193" y2="-10" stroke="#ffffff" stroke-width="1.6" opacity="0.7"/>
                  <rect x="-192" y="-18" width="14" height="36" rx="2" fill="url(#fj-3d-gold-cyl)" stroke="#fde047" stroke-width="0.9"/>
                  <rect x="-178" y="-14" width="8" height="28" rx="1.5" fill="#b45309"/>
                </g>
              </g>

              <!-- Slot 1: 3D Helical Coil Spring (x: -170..-132) -->
              <g
                class="fj-pen-seg-target fj-pencil-drop-zone${hasPart("spring") ? " is-slot-filled" : " is-slot-empty"}"
                data-fj-action="place-slot"
                data-slot-index="1"
                data-accept-part="spring"
                pointer-events="all"
                ${isAssembled ? ' opacity="0"' : ""}
              >
                <rect x="-172" y="-28" width="42" height="56" rx="8" fill="transparent" stroke="none"/>
                <g class="fj-pen-seg-3d fj-pen-seg-3d--spring ${hasPart("spring") ? "is-placed" : "is-unplaced"}">
                  <path d="M -168 -10 C -164 -16, -160 16, -156 10 C -152 -16, -148 16, -144 10 C -140 -16, -136 16, -132 10" stroke="#475569" stroke-width="4.2" stroke-linecap="round" fill="none"/>
                  <path d="M -168 10 C -164 -14, -160 -14, -156 10 M -156 10 C -152 -14, -148 -14, -144 10 M -144 10 C -140 -14, -136 -14, -132 10" stroke="#f8fafc" stroke-width="3.2" stroke-linecap="round" fill="none"/>
                </g>
              </g>

              <!-- Slot 3: 3D Matte-Black Diamond-Knurled Grip Barrel (x: -130..-42) -->
              <g
                class="fj-pen-seg-target fj-pencil-drop-zone${hasPart("grip") ? " is-slot-filled" : " is-slot-empty"}"
                data-fj-action="place-slot"
                data-slot-index="3"
                data-accept-part="grip"
                pointer-events="all"
                ${isAssembled ? ' opacity="0"' : ""}
              >
                <rect x="-132" y="-30" width="92" height="60" rx="8" fill="transparent" stroke="none"/>
                <g class="fj-pen-seg-3d fj-pen-seg-3d--grip ${hasPart("grip") ? "is-placed" : "is-unplaced"}">
                  <rect x="-130" y="-19" width="10" height="38" rx="2" fill="url(#fj-3d-gold-cyl)" stroke="#fef08a" stroke-width="0.8"/>
                  <rect x="-120" y="-21" width="76" height="42" rx="3" fill="url(#fj-3d-black-cyl)" stroke="#475569" stroke-width="1"/>
                  <rect x="-118" y="-20" width="72" height="40" rx="2" fill="url(#fj-knurl-pat)"/>
                  <line x1="-118" y1="-13" x2="-46" y2="-13" stroke="#cbd5e1" stroke-width="1.4" opacity="0.35"/>
                </g>
              </g>

              <!-- Slot 2: 3D Silver Inner Lead Tube & Chuck (x: -44..+62) -->
              <g
                class="fj-pen-seg-target fj-pencil-drop-zone${hasPart("lead_tube") ? " is-slot-filled" : " is-slot-empty"}"
                data-fj-action="place-slot"
                data-slot-index="2"
                data-accept-part="lead_tube"
                pointer-events="all"
                ${isAssembled ? ' opacity="0"' : ""}
              >
                <rect x="-44" y="-26" width="106" height="52" rx="8" fill="transparent" stroke="none"/>
                <g class="fj-pen-seg-3d fj-pen-seg-3d--lead_tube ${hasPart("lead_tube") ? "is-placed" : "is-unplaced"}">
                  <line x1="-44" y1="0" x2="-24" y2="0" stroke="#e2e8f0" stroke-width="2.6"/>
                  <rect x="-25" y="-11" width="22" height="22" rx="2" fill="url(#fj-3d-silver-cyl)" stroke="#f8fafc" stroke-width="0.9"/>
                  <rect x="-5" y="-14" width="8" height="28" rx="2" fill="url(#fj-3d-silver-cyl)" stroke="#e2e8f0" stroke-width="0.9"/>
                  <rect x="3" y="-9.5" width="58" height="19" rx="2" fill="url(#fj-3d-silver-cyl)" stroke="#cbd5e1" stroke-width="0.9"/>
                  <line x1="6" y1="-4.5" x2="58" y2="-4.5" stroke="#ffffff" stroke-width="1.5" opacity="0.8"/>
                </g>
              </g>

              <!-- Slot 4: 3D Glossy Black Upper Barrel + Sculpted Gold Pocket Clip (x: +62..+208) -->
              <g
                class="fj-pen-seg-target fj-pencil-drop-zone${hasPart("clip") ? " is-slot-filled" : " is-slot-empty"}"
                data-fj-action="place-slot"
                data-slot-index="4"
                data-accept-part="clip"
                pointer-events="all"
                ${isAssembled ? ' opacity="0"' : ""}
              >
                <rect x="60" y="-36" width="150" height="68" rx="8" fill="transparent" stroke="none"/>
                <g class="fj-pen-seg-3d fj-pen-seg-3d--clip ${hasPart("clip") ? "is-placed" : "is-unplaced"}">
                  <rect x="60" y="-18" width="14" height="36" rx="2" fill="url(#fj-3d-gold-cyl)" stroke="#fef08a" stroke-width="0.9"/>
                  <rect x="74" y="-17" width="114" height="34" rx="2" fill="url(#fj-3d-black-cyl)" stroke="#334155" stroke-width="1"/>
                  <line x1="78" y1="-9" x2="184" y2="-9" stroke="#f8fafc" stroke-width="2.6" stroke-linecap="round" opacity="0.52"/>
                  <rect x="188" y="-18" width="14" height="36" rx="2" fill="url(#fj-3d-gold-cyl)" stroke="#fef08a" stroke-width="0.9"/>
                  <path d="M 192 -18 L 192 -27 C 192 -30, 186 -31, 176 -30 L 106 -22 C 100 -21, 98 -18, 104 -17 L 116 -17 L 184 -24 L 184 -18 Z" fill="url(#fj-3d-gold-cyl)" stroke="#fef08a" stroke-width="1"/>
                </g>
              </g>

              <!-- Slot 5: 3D Polished Gold Rear Click Cap (x: +202..+246) -->
              <g
                class="fj-pen-seg-target fj-pencil-drop-zone${hasPart("cap") ? " is-slot-filled" : " is-slot-empty"}"
                data-fj-action="place-slot"
                data-slot-index="5"
                data-accept-part="cap"
                pointer-events="all"
                ${isAssembled ? ' opacity="0"' : ""}
              >
                <rect x="202" y="-26" width="48" height="52" rx="8" fill="transparent" stroke="none"/>
                <g class="fj-pen-seg-3d fj-pen-seg-3d--cap ${hasPart("cap") ? "is-placed" : "is-unplaced"}">
                  <rect x="202" y="-14" width="10" height="28" rx="1.5" fill="#0f172a"/>
                  <rect x="212" y="-12" width="30" height="24" rx="3.5" fill="url(#fj-3d-gold-cyl)" stroke="#fef08a" stroke-width="0.9"/>
                  <line x1="215" y1="-6" x2="238" y2="-6" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.8"/>
                </g>
              </g>
            </g>

            <!-- ============================================================
                 2. SIX REALISTIC 3D PARTS MIXED UP ON THE BLUE CUTTING MAT
                 ============================================================ -->
            ${(() => {
              const tipSpec = getMatSpec("tip");
              const springSpec = getMatSpec("spring");
              const leadSpec = getMatSpec("lead_tube");
              const gripSpec = getMatSpec("grip");
              const clipSpec = getMatSpec("clip");
              const capSpec = getMatSpec("cap");
              return `
                <!-- 3D Gold Conical Tip -->
                <g
                  class="fj-mat-part${hasPart("tip") ? " is-placed" : ""}"
                  transform="translate(${tipSpec.matX}, ${tipSpec.matY}) rotate(${tipSpec.rot})"
                  data-fj-action="select-or-place-part"
                  data-part-id="tip"
                  data-next-slot-index="0"
                  data-mat-x="${tipSpec.matX}"
                  data-mat-y="${tipSpec.matY}"
                  data-mat-rot="${tipSpec.rot}"
                  filter="url(#fj-mat-drop-shadow)"
                  pointer-events="all"
                  role="button"
                  tabindex="0"
                  aria-label="Tip on cutting mat — drag or click to install onto pen"
                >
                  <rect x="-46" y="-28" width="92" height="56" fill="transparent" stroke="none"/>
                  <rect x="-36" y="-2.2" width="10" height="4.4" rx="1.5" fill="#e2e8f0" stroke="none"/>
                  <polygon points="-28,-2.5 14,-16 14,16 -28,2.5" fill="url(#fj-3d-gold-cyl)" stroke="#fef08a" stroke-width="1"/>
                  <rect x="14" y="-17" width="12" height="34" rx="2" fill="url(#fj-3d-gold-cyl)" stroke="#fde047" stroke-width="1"/>
                  <line x1="-22" y1="-1" x2="12" y2="-9" stroke="#ffffff" stroke-width="1.5" opacity="0.75"/>
                </g>

                <!-- 3D Helical Metallic Spring -->
                <g
                  class="fj-mat-part${hasPart("spring") ? " is-placed" : ""}"
                  transform="translate(${springSpec.matX}, ${springSpec.matY}) rotate(${springSpec.rot})"
                  data-fj-action="select-or-place-part"
                  data-part-id="spring"
                  data-next-slot-index="1"
                  data-mat-x="${springSpec.matX}"
                  data-mat-y="${springSpec.matY}"
                  data-mat-rot="${springSpec.rot}"
                  filter="url(#fj-mat-drop-shadow)"
                  pointer-events="all"
                  role="button"
                  tabindex="0"
                  aria-label="Spring on cutting mat — drag or click to install onto pen"
                >
                  <rect x="-44" y="-28" width="88" height="56" fill="transparent" stroke="none"/>
                  <ellipse cx="0" cy="0" rx="34" ry="16" fill="rgba(56, 189, 248, 0.22)" stroke="none"/>
                  <path d="M -26 -9 C -21 -15, -16 15, -11 9 C -6 -15, -1 15, 4 9 C 9 -15, 14 15, 19 9 C 23 -15, 26 12, 28 8" stroke="#64748b" stroke-width="4.5" stroke-linecap="round" fill="none"/>
                  <path d="M -26 9 C -21 -13, -16 -13, -11 9 M -11 9 C -6 -13, -1 -13, 4 9 M 4 9 C 9 -13, 14 -13, 19 9 M 19 9 C 23 -13, 26 -13, 28 8" stroke="#fef08a" stroke-width="3.2" stroke-linecap="round" fill="none"/>
                </g>

                <!-- Two-Piece 3D Silver Lead Tube & Sleeve -->
                <g
                  class="fj-mat-part${hasPart("lead_tube") ? " is-placed" : ""}"
                  transform="translate(${leadSpec.matX}, ${leadSpec.matY}) rotate(${leadSpec.rot})"
                  data-fj-action="select-or-place-part"
                  data-part-id="lead_tube"
                  data-next-slot-index="2"
                  data-mat-x="${leadSpec.matX}"
                  data-mat-y="${leadSpec.matY}"
                  data-mat-rot="${leadSpec.rot}"
                  filter="url(#fj-mat-drop-shadow)"
                  pointer-events="all"
                  role="button"
                  tabindex="0"
                  aria-label="Lead Tube on cutting mat — drag or click to install onto pen"
                >
                  <rect x="-56" y="-28" width="112" height="56" fill="transparent" stroke="none"/>
                  <rect x="-48" y="-11" width="54" height="5.5" rx="2.5" fill="url(#fj-3d-silver-cyl)" stroke="#e2e8f0" stroke-width="0.8"/>
                  <rect x="-44" y="4" width="38" height="10" rx="2.5" fill="url(#fj-3d-silver-cyl)" stroke="#cbd5e1" stroke-width="0.9"/>
                  <rect x="-2" y="1" width="50" height="16" rx="3" fill="url(#fj-3d-silver-cyl)" stroke="#f8fafc" stroke-width="1"/>
                  <line x1="2" y1="6" x2="44" y2="6" stroke="#ffffff" stroke-width="1.5" opacity="0.8"/>
                </g>

                <!-- 3D Black Diamond-Knurled Grip Barrel -->
                <g
                  class="fj-mat-part${hasPart("grip") ? " is-placed" : ""}"
                  transform="translate(${gripSpec.matX}, ${gripSpec.matY}) rotate(${gripSpec.rot})"
                  data-fj-action="select-or-place-part"
                  data-part-id="grip"
                  data-next-slot-index="3"
                  data-mat-x="${gripSpec.matX}"
                  data-mat-y="${gripSpec.matY}"
                  data-mat-rot="${gripSpec.rot}"
                  filter="url(#fj-mat-drop-shadow)"
                  pointer-events="all"
                  role="button"
                  tabindex="0"
                  aria-label="Grip on cutting mat — drag or click to install onto pen"
                >
                  <rect x="-48" y="-28" width="96" height="56" fill="transparent" stroke="none"/>
                  <rect x="-36" y="-18" width="72" height="36" rx="4" fill="url(#fj-3d-black-cyl)" stroke="#475569" stroke-width="1.1"/>
                  <rect x="-33" y="-17" width="66" height="34" rx="3" fill="url(#fj-knurl-pat)" stroke="none"/>
                  <ellipse cx="-36" cy="0" rx="5" ry="17" fill="#090d16" stroke="#475569" stroke-width="1"/>
                  <line x1="-30" y1="-11" x2="30" y2="-11" stroke="#cbd5e1" stroke-width="1.3" opacity="0.38"/>
                </g>

                <!-- 3D Gold Pocket Clip -->
                <g
                  class="fj-mat-part${hasPart("clip") ? " is-placed" : ""}"
                  transform="translate(${clipSpec.matX}, ${clipSpec.matY}) rotate(${clipSpec.rot})"
                  data-fj-action="select-or-place-part"
                  data-part-id="clip"
                  data-next-slot-index="4"
                  data-mat-x="${clipSpec.matX}"
                  data-mat-y="${clipSpec.matY}"
                  data-mat-rot="${clipSpec.rot}"
                  filter="url(#fj-mat-drop-shadow)"
                  pointer-events="all"
                  role="button"
                  tabindex="0"
                  aria-label="Clip on cutting mat — drag or click to install onto pen"
                >
                  <rect x="-44" y="-28" width="88" height="56" fill="transparent" stroke="none"/>
                  <path d="M -28 8 L -28 -4 C -28 -9, -23 -11, -16 -11 L 22 -11 C 26 -11, 28 -8, 28 -3 L 28 10 L 18 10 L 18 0 L -18 0 L -18 8 Z" fill="url(#fj-3d-gold-cyl)" stroke="#fef08a" stroke-width="1"/>
                  <line x1="-20" y1="-6" x2="20" y2="-6" stroke="#ffffff" stroke-width="1.5" opacity="0.8"/>
                </g>

                <!-- 3D Gold Rear Click Cap -->
                <g
                  class="fj-mat-part${hasPart("cap") ? " is-placed" : ""}"
                  transform="translate(${capSpec.matX}, ${capSpec.matY}) rotate(${capSpec.rot})"
                  data-fj-action="select-or-place-part"
                  data-part-id="cap"
                  data-next-slot-index="5"
                  data-mat-x="${capSpec.matX}"
                  data-mat-y="${capSpec.matY}"
                  data-mat-rot="${capSpec.rot}"
                  filter="url(#fj-mat-drop-shadow)"
                  pointer-events="all"
                  role="button"
                  tabindex="0"
                  aria-label="Cap on cutting mat — drag or click to install onto pen"
                >
                  <rect x="-36" y="-28" width="72" height="56" fill="transparent" stroke="none"/>
                  <rect x="-14" y="-11" width="28" height="22" rx="3.5" fill="url(#fj-3d-gold-cyl)" stroke="#fef08a" stroke-width="1"/>
                  <ellipse cx="-14" cy="0" rx="3.5" ry="10.5" fill="#713f12" stroke="#fde047" stroke-width="0.8"/>
                  <line x1="-9" y1="-5" x2="10" y2="-5" stroke="#ffffff" stroke-width="1.5" opacity="0.8"/>
                </g>
              `;
            })()}
          </svg>

          <!-- Bottom-Center 6-Dot Progress Pill ("X / 6 parts installed") -->
          <div class="fj-workshop-progress-pill" role="status" aria-live="polite">
            <div class="fj-workshop-dots" aria-hidden="true">
              ${WORKSHOP_PARTS.map((p) => {
                const inst = hasPart(p.id);
                return `<span class="fj-workshop-dot${inst ? " is-installed" : ""}"></span>`;
              }).join("")}
            </div>
            <span class="fj-workshop-progress-text">${placedCount} / 6 parts installed</span>
          </div>

          <!-- Subtle Mini Reset Pill in Bottom-Right Corner -->
          <div class="fj-workshop-mini-controls">
            <button type="button" class="fj-workshop-mini-btn" data-fj-action="reset" data-stage-id="1">Reset</button>
          </div>
        </div>
      `;
    }

    function renderHelpdeskDockIcon3dSvg(itemId) {
      switch (itemId) {
        case "power":
          return `
            <svg viewBox="0 0 90 54" fill="none" aria-hidden="true">
              <!-- 3D Heavy-Duty Black & Amber AC Power Cord with 3-Pin IEC C13 Plug -->
              <ellipse cx="38" cy="32" rx="20" ry="11" stroke="#451a03" stroke-width="6" transform="rotate(-10 38 32)"/>
              <ellipse cx="38" cy="30" rx="20" ry="11" stroke="#f59e0b" stroke-width="3.2" transform="rotate(-10 38 30)"/>
              <path d="M 52 24 C 60 18, 65 14, 70 11" stroke="#fbbf24" stroke-width="5" stroke-linecap="round"/>
              <g transform="translate(62, 4) rotate(20)">
                <rect x="0" y="2" width="18" height="13" rx="2.5" fill="#1e293b" stroke="#fde047" stroke-width="1.3"/>
                <line x1="4" y1="5" x2="8" y2="5" stroke="#fef08a" stroke-width="1.6" stroke-linecap="round"/>
                <line x1="6" y1="8.5" x2="10" y2="8.5" stroke="#fef08a" stroke-width="1.6" stroke-linecap="round"/>
                <line x1="4" y1="12" x2="8" y2="12" stroke="#fef08a" stroke-width="1.6" stroke-linecap="round"/>
              </g>
            </svg>
          `;
        case "ethernet":
        case "network":
          return `
            <svg viewBox="0 0 90 54" fill="none" aria-hidden="true">
              <!-- Coiled glowing blue CAT6 Ethernet loop + RJ45 boot -->
              <ellipse cx="42" cy="31" rx="22" ry="12" stroke="#0284c7" stroke-width="5.5" transform="rotate(-12 42 31)"/>
              <ellipse cx="42" cy="29" rx="22" ry="12" stroke="#38bdf8" stroke-width="3.2" transform="rotate(-12 42 29)"/>
              <path d="M 56 22 C 64 16, 68 13, 73 10" stroke="#0ea5e9" stroke-width="5" stroke-linecap="round"/>
              <g transform="translate(70, 5) rotate(28)">
                <rect x="0" y="0" width="12" height="9" rx="2" fill="#38bdf8" stroke="#e0f2fe" stroke-width="1"/>
                <rect x="9" y="1.5" width="5" height="6" rx="1" fill="#fde047"/>
              </g>
            </svg>
          `;
        case "mouse":
          return `
            <svg viewBox="0 0 90 54" fill="none" aria-hidden="true">
              <!-- 3D Ergonomic Optical Mouse + Emerald USB Cord & Plug -->
              <rect x="16" y="14" width="22" height="32" rx="11" fill="#0f172a" stroke="#4ade80" stroke-width="1.8"/>
              <line x1="27" y1="14" x2="27" y2="25" stroke="#86efac" stroke-width="1.5"/>
              <rect x="25.5" y="17" width="3" height="6" rx="1.5" fill="#22c55e"/>
              <path d="M 27 14 C 27 5, 48 6, 54 24 C 58 38, 66 36, 70 18" stroke="#22c55e" stroke-width="3.2" stroke-linecap="round" fill="none"/>
              <g transform="translate(65, 8) rotate(14)">
                <rect x="0" y="3" width="11" height="9" rx="1.8" fill="#14532d" stroke="#86efac" stroke-width="1.2"/>
                <rect x="2" y="0" width="7" height="4" rx="0.8" fill="#e2e8f0"/>
              </g>
            </svg>
          `;
        case "keyboard":
          return `
            <svg viewBox="0 0 90 54" fill="none" aria-hidden="true">
              <!-- 3D Mechanical Keyboard Deck + Purple Braided USB Cable -->
              <rect x="10" y="22" width="46" height="22" rx="3.5" fill="#1e1b4b" stroke="#c084fc" stroke-width="1.7"/>
              <rect x="14" y="26" width="6" height="4" rx="1" fill="#d8b4fe"/>
              <rect x="22" y="26" width="6" height="4" rx="1" fill="#a855f7"/>
              <rect x="30" y="26" width="6" height="4" rx="1" fill="#d8b4fe"/>
              <rect x="38" y="26" width="6" height="4" rx="1" fill="#a855f7"/>
              <rect x="46" y="26" width="6" height="4" rx="1" fill="#d8b4fe"/>
              <rect x="14" y="32" width="6" height="4" rx="1" fill="#a855f7"/>
              <rect x="22" y="32" width="22" height="4" rx="1" fill="#e9d5ff"/>
              <rect x="46" y="32" width="6" height="4" rx="1" fill="#a855f7"/>
              <path d="M 34 22 C 36 10, 56 10, 68 18" stroke="#c084fc" stroke-width="3.4" stroke-linecap="round" fill="none"/>
              <g transform="translate(66, 12) rotate(25)">
                <rect x="0" y="3" width="11" height="9" rx="1.8" fill="#3b0764" stroke="#e9d5ff" stroke-width="1.2"/>
                <rect x="2" y="0" width="7" height="4" rx="0.8" fill="#e2e8f0"/>
              </g>
            </svg>
          `;
        case "video":
        case "hdmi":
          return `
            <svg viewBox="0 0 90 54" fill="none" aria-hidden="true">
              <!-- Coiled Shielded HDMI Video Cable + Gold Trapezoid Connector -->
              <ellipse cx="42" cy="31" rx="21" ry="11" stroke="#831843" stroke-width="5.8" transform="rotate(-10 42 31)"/>
              <ellipse cx="42" cy="29.5" rx="21" ry="11" stroke="#f472b6" stroke-width="3" transform="rotate(-10 42 29.5)"/>
              <path d="M 55 22 C 62 17, 66 14, 70 11" stroke="#f472b6" stroke-width="4.5" stroke-linecap="round"/>
              <g transform="translate(60, 5) rotate(22)">
                <rect x="0" y="5" width="16" height="11" rx="2.5" fill="#1e293b" stroke="#f9a8d4" stroke-width="1.2"/>
                <polygon points="3,0 13,0 15,5 1,5" fill="#fbbf24" stroke="#fef08a" stroke-width="1"/>
              </g>
            </svg>
          `;
        case "restart":
        default:
          return `
            <svg viewBox="0 0 90 54" fill="none" aria-hidden="true">
              <!-- Illuminated 3D PC Power / Restart Switch -->
              <circle cx="45" cy="27" r="20" fill="#052e16" stroke="#4ade80" stroke-width="2.2"/>
              <circle cx="45" cy="27" r="15" fill="#14532d" stroke="#86efac" stroke-width="1.2"/>
              <path d="M 38 19.5 A 10 10 0 1 0 52 19.5" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" fill="none"/>
              <line x1="45" y1="14" x2="45" y2="26" stroke="#4ade80" stroke-width="2.8" stroke-linecap="round"/>
            </svg>
          `;
      }
    }

    function renderStage2Body(st) {
      const solved = st.status === "success" || Boolean(st.data.computerRestarted);
      const usedFlashlight = st.data.appliedActions.includes("flashlight");
      const pluggedList = Array.isArray(st.data.pluggedCables) ? st.data.pluggedCables : [];
      const hasCable = (cId) =>
        solved ||
        pluggedList.includes(cId) ||
        st.data.appliedActions.includes(cId) ||
        Boolean(st.data.cables && st.data.cables[cId]);

      const powerPlugged = hasCable("power");
      const networkPlugged = hasCable("ethernet") || hasCable("network");
      const mousePlugged = hasCable("mouse");
      const keyboardPlugged = hasCable("keyboard");
      const videoPlugged = hasCable("video") || hasCable("hdmi");

      const pluggedCount =
        (powerPlugged ? 1 : 0) +
        (networkPlugged ? 1 : 0) +
        (mousePlugged ? 1 : 0) +
        (keyboardPlugged ? 1 : 0) +
        (videoPlugged ? 1 : 0);
      const allCablesPlugged = pluggedCount === 5;

      const rearPorts = [
        {
          id: "power",
          num: "1",
          shortLabel: "1. POWER",
          fullLabel: "1. Power Cable (AC 120V)",
          sub: "ATX PSU Inlet",
          y: 184,
          color: "#fbbf24",
          lightColor: "#fde047",
          darkColor: "#78350f",
          plugged: powerPlugged,
          cordPath: "M 966 492 C 792 486, 680 432, 684 260 C 686 196, 704 184, 722 184"
        },
        {
          id: "ethernet",
          num: "2",
          shortLabel: "2. NETWORK",
          fullLabel: "2. Network Cable (RJ45 LAN)",
          sub: "1 Gbps NIC Port",
          y: 224,
          color: "#38bdf8",
          lightColor: "#bae6fd",
          darkColor: "#0369a1",
          plugged: networkPlugged,
          cordPath: "M 956 504 C 784 496, 688 442, 692 292 C 694 236, 708 224, 722 224"
        },
        {
          id: "mouse",
          num: "3",
          shortLabel: "3. MOUSE",
          fullLabel: "3. Mouse Cable (USB)",
          sub: "Optical USB Port",
          y: 264,
          color: "#4ade80",
          lightColor: "#bbf7d0",
          darkColor: "#15803d",
          plugged: mousePlugged,
          cordPath: "M 946 516 C 776 506, 696 452, 698 326 C 700 276, 710 264, 722 264"
        },
        {
          id: "keyboard",
          num: "4",
          shortLabel: "4. KEYBOARD",
          fullLabel: "4. Keyboard Cable (USB)",
          sub: "HID USB Port",
          y: 304,
          color: "#c084fc",
          lightColor: "#e9d5ff",
          darkColor: "#6b21a8",
          plugged: keyboardPlugged,
          cordPath: "M 936 526 C 768 516, 702 462, 704 362 C 705 316, 712 304, 722 304"
        },
        {
          id: "video",
          num: "5",
          shortLabel: "5. VIDEO",
          fullLabel: "5. Video Cable (HDMI)",
          sub: "GPU Display Out",
          y: 344,
          color: "#f472b6",
          lightColor: "#fbcfe8",
          darkColor: "#9d174d",
          plugged: videoPlugged,
          cordPath: "M 924 535 C 760 526, 708 474, 710 398 C 711 356, 714 344, 722 344"
        }
      ];

      const bottomDockItems = [
        { id: "power", label: "1. Power", done: powerPlugged, isRestart: false },
        { id: "ethernet", label: "2. Network", done: networkPlugged, isRestart: false },
        { id: "mouse", label: "3. Mouse", done: mousePlugged, isRestart: false },
        { id: "keyboard", label: "4. Keyboard", done: keyboardPlugged, isRestart: false },
        { id: "video", label: "5. Video", done: videoPlugged, isRestart: false },
        { id: "restart", label: "6. Restart PC", done: solved, isRestart: true }
      ];

      const speechText = solved
        ? "Workstation online — MEETING_DECK.pptx is open!"
        : allCablesPlugged
          ? "5/5 rear cables connected."
          : "My computer won't turn on after moving desks!";

      return `
        <div class="fj-helpdesk-scene--immersive">
          <!-- Worried Office Worker Speech Bubble on Left -->
          <div class="fj-speech-bubble--helpdesk-immersive" role="status" aria-live="polite">
            ${speechText}
          </div>

          <!-- Interactive Computer Monitor Screen Fitted Inside the Physical Monitor Bezel -->
          <div class="fj-hd-monitor-screen fj-pc-screen-terminal${solved ? " is-solved" : ""}">
            <!-- Left Sidebar -->
            <div class="fj-hd-explorer-sidebar" aria-hidden="true">
              <div class="fj-hd-explorer-brand">PC I/O</div>
              <div class="fj-hd-explorer-nav-item${powerPlugged ? " is-active" : ""}">1. Power</div>
              <div class="fj-hd-explorer-nav-item${networkPlugged ? " is-active" : ""}">2. Network</div>
              <div class="fj-hd-explorer-nav-item${mousePlugged ? " is-active" : ""}">3. Mouse</div>
              <div class="fj-hd-explorer-nav-item${keyboardPlugged ? " is-active" : ""}">4. Keyboard</div>
              <div class="fj-hd-explorer-nav-item${videoPlugged ? " is-active" : ""}">5. Video</div>
              <div class="fj-hd-explorer-nav-item${solved ? " is-active" : ""}">6. Reboot</div>
            </div>

            <!-- Main Monitor Content Area -->
            <div class="fj-hd-explorer-main">
              <div class="fj-hd-explorer-topbar">
                <span class="fj-hd-explorer-path">REAR PC CONNECTIONS (${pluggedCount}/5 CABLES)</span>
                <span class="fj-hd-explorer-l1-pill${allCablesPlugged ? " is-up" : ""}">
                  ${solved ? "ONLINE" : allCablesPlugged ? "5/5 READY" : `${pluggedCount}/5 PLUGGED`}
                </span>
              </div>

              ${solved ? `
                <!-- Rebooted & Online Workstation Screen -->
                <div class="fj-hd-deck-unlocked">
                  <div class="fj-hd-deck-unlocked__badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.8" aria-hidden="true">
                      <circle cx="12" cy="12" r="9"/>
                      <path d="m8.5 12.5 2.5 2.5 4.8-5.2"/>
                    </svg>
                    <span>WORKSTATION REBOOTED — MEETING_DECK.pptx OPEN</span>
                  </div>
                  <div class="fj-hd-deck-slide-preview">
                    <div class="fj-hd-deck-slide-title">ALL 5 REAR PORTS + SYSTEM ONLINE</div>
                    <div class="fj-hd-deck-slide-sub">Power [OK] | Network [OK] | Mouse [OK] | Keyboard [OK] | Video [OK]</div>
                    <div class="fj-hd-deck-bars" aria-hidden="true">
                      <span style="width:92%"></span>
                      <span style="width:86%"></span>
                      <span style="width:74%"></span>
                    </div>
                  </div>
                </div>
              ` : `
                <!-- Read-Only Rear Cable Status + Restart Computer Button -->
                <div class="fj-hd-access-modal" style="padding:6px 8px; gap:4px;">
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:3px;">
                    ${rearPorts.map((p) => `
                      <div
                        style="display:flex; align-items:center; justify-content:space-between; padding:2px 6px; border-radius:4px; font-size:8.5px; font-weight:800; border:1px solid ${p.plugged ? "#22c55e" : "#cbd5e1"}; background:${p.plugged ? "#dcfce7" : "#f8fafc"}; color:${p.plugged ? "#14532d" : "#1e293b"};"
                      >
                        <span>${p.shortLabel}</span>
                        <span style="color:${p.plugged ? "#15803d" : "#64748b"}">${p.plugged ? "[OK]" : "OFF"}</span>
                      </div>
                    `).join("")}
                    <button
                      type="button"
                      class="fj-hd-access-fix-btn"
                      data-fj-action="helpdesk-tool"
                      data-tool-id="restart"
                      style="grid-column: span 1; padding:2px 6px; border-radius:4px; font-size:8.5px; font-weight:900; cursor:pointer; border:1.5px solid ${allCablesPlugged ? "#16a34a" : "#94a3b8"}; background:${allCablesPlugged ? "#16a34a" : "#334155"}; color:#ffffff;"
                    >
                      ${allCablesPlugged ? "6. RESTART NOW" : "6. RESTART PC"}
                    </button>
                  </div>
                </div>
              `}
            </div>
          </div>

          <!-- Angled Yellow Sticky Note on Monitor Bottom-Right Bezel -->
          <div class="fj-hd-sticky-note" aria-hidden="true">
            <span>Meeting in</span>
            <strong>5 min! :)</strong>
          </div>

          <!-- Full-Scene 3D SVG Overlay: 5 Rear PC Tower I/O Sockets, 5 Color-Coded 3D Cables & Rear Reboot Switch -->
          <svg
            class="fj-helpdesk-3d-svg"
            viewBox="0 0 1000 540"
            preserveAspectRatio="none"
            aria-label="Back of PC tower Rear I/O ports for Power, Network, Mouse, Keyboard, Video, and Restart switch"
          >
            <defs>
              <filter id="fj-hd-cable-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="fj-hd-led-burst" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="5" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            <!-- Flashlight Inspection Beam on Rear PC Chassis -->
            ${usedFlashlight ? `
              <polygon
                class="fj-diag-flashlight-cone"
                points="620,445 705,150 855,150 855,395"
                fill="rgba(254, 240, 138, 0.18)"
                stroke="rgba(254, 240, 138, 0.45)"
                stroke-width="1.2"
              />
            ` : ""}

            <!-- Rear PC Tower Header Callout Banner -->
            <g transform="translate(702, 138)">
              <rect x="0" y="0" width="144" height="22" rx="6" fill="rgba(5, 14, 30, 0.92)" stroke="${allCablesPlugged ? "#4ade80" : "#38bdf8"}" stroke-width="1.5"/>
              <text x="72" y="14.5" text-anchor="middle" fill="${allCablesPlugged ? "#86efac" : "#bae6fd"}" font-size="9" font-weight="900" font-family="JetBrains Mono, monospace">
                REAR PC I/O: ${pluggedCount}/5 CABLES
              </text>
            </g>

            <!-- 5 Plugged-In 3D Color-Coded Cables Curving Into Their Dedicated Rear PC Ports -->
            ${rearPorts.filter((p) => p.plugged).map((p) => `
              <g class="fj-hd-plugged-cable" filter="url(#fj-hd-cable-glow)">
                <path
                  d="${p.cordPath}"
                  fill="none"
                  stroke="${p.darkColor}"
                  stroke-width="9"
                  stroke-linecap="round"
                />
                <path
                  d="${p.cordPath}"
                  fill="none"
                  stroke="${p.color}"
                  stroke-width="5.6"
                  stroke-linecap="round"
                />
                <path
                  d="${p.cordPath}"
                  fill="none"
                  stroke="${p.lightColor}"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  opacity="0.9"
                />
              </g>
            `).join("")}

            <!-- Interactive Rear PC Tower I/O Panel Drop Target + 5 Individual Rear Port Sockets -->
            <g
              class="fj-pc-port-bay fj-pc-rear-chassis${allCablesPlugged ? " is-plugged" : ""}"
              data-fj-action="plug-cable-socket"
              role="button"
              tabindex="0"
              aria-label="Rear PC I/O panel — click any port or drag Power, Network, Mouse, Keyboard, and Video cables here"
            >
              <rect x="692" y="162" width="165" height="252" rx="14" fill="transparent" stroke="none"/>

              ${rearPorts.map((p) => `
                <g
                  class="fj-pc-port-socket${p.plugged ? " is-plugged" : ""}"
                  data-fj-action="helpdesk-tool"
                  data-tool-id="${p.id}"
                  role="button"
                  tabindex="0"
                  aria-label="Rear PC ${p.fullLabel} socket — ${p.plugged ? "connected" : "click to plug in"}"
                >
                  <!-- Recessed Metallic Socket Housing at (719, y-12) -->
                  <rect
                    x="717"
                    y="${p.y - 12}"
                    width="26"
                    height="24"
                    rx="4"
                    fill="${p.plugged ? "rgba(6, 38, 24, 0.94)" : "rgba(15, 23, 42, 0.94)"}"
                    stroke="${p.plugged ? "#4ade80" : p.color}"
                    stroke-width="${p.plugged ? "1.8" : "1.5"}"
                  />
                  ${p.plugged ? `
                    <!-- Molded Connector Boot & Glowing Green Port Link LED -->
                    <rect x="712" y="${p.y - 6}" width="16" height="12" rx="2.5" fill="${p.darkColor}" stroke="${p.lightColor}" stroke-width="1.2"/>
                    <circle cx="734" cy="${p.y}" r="6" fill="rgba(74, 222, 128, 0.35)"/>
                    <circle cx="734" cy="${p.y}" r="3.4" fill="#4ade80"/>
                  ` : `
                    <!-- Unplugged Target Ring -->
                    <circle cx="730" cy="${p.y}" r="8.5" fill="rgba(15, 23, 42, 0.7)" stroke="${p.color}" stroke-width="1.5" stroke-dasharray="3 2"/>
                    <circle cx="730" cy="${p.y}" r="3.2" fill="${p.color}"/>
                  `}

                  <!-- Port Callout Label Pill on Rear PC Chassis -->
                  <rect
                    x="748"
                    y="${p.y - 10}"
                    width="96"
                    height="20"
                    rx="5"
                    fill="${p.plugged ? "rgba(5, 46, 22, 0.94)" : "rgba(7, 18, 36, 0.94)"}"
                    stroke="${p.plugged ? "#4ade80" : p.color}"
                    stroke-width="1.2"
                  />
                  <text x="755" y="${p.y + 3}" fill="${p.plugged ? "#bbf7d0" : "#f8fafc"}" font-size="8.2" font-weight="900" font-family="Inter, sans-serif">${p.shortLabel}</text>
                  <text x="838" y="${p.y + 3}" text-anchor="end" fill="${p.plugged ? "#4ade80" : p.color}" font-size="7.5" font-weight="900" font-family="JetBrains Mono, monospace">${p.plugged ? "[OK]" : "PLUG"}</text>
                </g>
              `).join("")}

              <!-- Rear PC Tower Step 6: Interactive RESTART COMPUTER Switch at (717, 368) -->
              <g
                class="fj-pc-port-socket fj-pc-restart-switch"
                data-fj-action="helpdesk-tool"
                data-tool-id="restart"
                role="button"
                tabindex="0"
                aria-label="Rear PC Power Restart Switch — click after plugging in all 5 cables"
              >
                <rect
                  x="717"
                  y="368"
                  width="127"
                  height="28"
                  rx="7"
                  fill="${solved ? "rgba(20, 83, 45, 0.96)" : allCablesPlugged ? "rgba(22, 163, 74, 0.95)" : "rgba(30, 41, 59, 0.94)"}"
                  stroke="${solved || allCablesPlugged ? "#86efac" : "#64748b"}"
                  stroke-width="${allCablesPlugged ? "2" : "1.4"}"
                />
                <circle cx="732" cy="382" r="6" fill="${solved || allCablesPlugged ? "#4ade80" : "#f59e0b"}"/>
                <text x="786" y="385.5" text-anchor="middle" fill="#ffffff" font-size="9" font-weight="900" font-family="Inter, sans-serif">
                  ${solved ? "PC ONLINE [OK]" : allCablesPlugged ? "6. CLICK TO RESTART!" : "6. RESTART (WAIT)"}
                </text>
              </g>
            </g>
          </svg>

          <!-- Bottom-Center 6-Item Translucent Cable & Restart Dock (1. Power, 2. Network, 3. Mouse, 4. Keyboard, 5. Video, 6. Restart PC) -->
          <div class="fj-hd-immersive-dock" role="group" aria-label="Rear PC cables and Restart button">
            ${bottomDockItems.map((item) => {
              const readyRestart = item.isRestart && allCablesPlugged && !solved;
              return `
                <button
                  type="button"
                  class="fj-hd-dock-slot${item.done ? " is-used-ok" : ""}${readyRestart ? " is-ready-restart" : ""}"
                  data-fj-action="helpdesk-tool"
                  data-tool-id="${item.id}"
                  draggable="true"
                >
                  <span class="fj-hd-dock-slot__icon">${renderHelpdeskDockIcon3dSvg(item.id)}</span>
                  <span class="fj-hd-dock-slot__label">${item.label}${item.done ? " [OK]" : ""}</span>
                </button>
              `;
            }).join("")}
          </div>

          <!-- Compact Corner Utility Controls -->
          <div class="fj-workshop-mini-controls">
            <button type="button" class="fj-workshop-mini-btn" data-fj-action="reset" data-stage-id="2">Reset</button>
            ${solved ? `<button type="button" class="fj-workshop-mini-btn" data-fj-action="next-stage" data-target-stage="3">Next →</button>` : ""}
          </div>
        </div>
      `;
    }

    function renderDockPipe3dSvg(pipeKind) {
      const dir = pipeKind || "W-E";
      const isCross = dir === "CROSS";
      const arms = isCross ? ["W", "E", "N", "S"] : dir.split("-");
      const hasW = arms.includes("W");
      const hasE = arms.includes("E");
      const hasN = arms.includes("N");
      const hasS = arms.includes("S");

      // Classic Pipe Dream Bevelled Gray Block (x=23..87, y=3..51, center=(55,27)) with dark unfilled pipe channel
      return `
        <svg viewBox="0 0 110 54" fill="none" aria-hidden="true">
          <!-- Bevelled Classic Pipe Dream Gray Block -->
          <rect x="23" y="3" width="64" height="48" rx="4" fill="#94a3b8" stroke="#1e293b" stroke-width="1.4"/>
          <path d="M 24.5 49.5 L 24.5 4.5 L 85.5 4.5" stroke="#f1f5f9" stroke-width="2" stroke-linecap="square"/>
          <path d="M 24.5 49.5 L 85.5 49.5 L 85.5 4.5" stroke="#475569" stroke-width="2" stroke-linecap="square"/>
          <rect x="27" y="7" width="56" height="40" rx="2" fill="#cbd5e1"/>

          ${
            isCross
              ? `
            <!-- Under Pipe (Vertical N-S) -->
            <rect x="48" y="3" width="14" height="48" fill="#090d16"/>
            <line x1="51" y1="3" x2="51" y2="51" stroke="#334155" stroke-width="1.4"/>
            <rect x="46" y="3" width="18" height="4" rx="1" fill="#475569" stroke="#0f172a" stroke-width="0.8"/>
            <rect x="46" y="47" width="18" height="4" rx="1" fill="#475569" stroke="#0f172a" stroke-width="0.8"/>
            <!-- Over Bridge Shadow + Horizontal Pipe (W-E) -->
            <rect x="23" y="18" width="64" height="18" fill="#cbd5e1"/>
            <rect x="23" y="20" width="64" height="14" fill="#090d16"/>
            <line x1="23" y1="23" x2="87" y2="23" stroke="#475569" stroke-width="1.5"/>
            <rect x="23" y="18" width="4" height="18" rx="1" fill="#475569" stroke="#0f172a" stroke-width="0.8"/>
            <rect x="83" y="18" width="4" height="18" rx="1" fill="#475569" stroke="#0f172a" stroke-width="0.8"/>
          `
              : `
            <!-- Dark Unfilled Pipe Channel Arms -->
            ${hasW ? `<rect x="23" y="20" width="32" height="14" fill="#090d16"/><line x1="23" y1="23" x2="55" y2="23" stroke="#475569" stroke-width="1.4"/><rect x="23" y="18" width="4" height="18" rx="1" fill="#475569" stroke="#0f172a" stroke-width="0.8"/>` : ""}
            ${hasE ? `<rect x="55" y="20" width="32" height="14" fill="#090d16"/><line x1="55" y1="23" x2="87" y2="23" stroke="#475569" stroke-width="1.4"/><rect x="83" y="18" width="4" height="18" rx="1" fill="#475569" stroke="#0f172a" stroke-width="0.8"/>` : ""}
            ${hasN ? `<rect x="48" y="3" width="14" height="24" fill="#090d16"/><line x1="51" y1="3" x2="51" y2="27" stroke="#475569" stroke-width="1.4"/><rect x="46" y="3" width="18" height="4" rx="1" fill="#475569" stroke="#0f172a" stroke-width="0.8"/>` : ""}
            ${hasS ? `<rect x="48" y="27" width="14" height="24" fill="#090d16"/><line x1="51" y1="27" x2="51" y2="51" stroke="#475569" stroke-width="1.4"/><rect x="46" y="47" width="18" height="4" rx="1" fill="#475569" stroke="#0f172a" stroke-width="0.8"/>` : ""}
            <circle cx="55" cy="27" r="7.5" fill="#090d16" stroke="#475569" stroke-width="1.2"/>
            <circle cx="53" cy="25" r="2" fill="#64748b"/>
          `
          }
        </svg>
      `;
    }

    function renderStage3Body(st) {
      const isFullFlow = st.status === "success" || Boolean(st.data.racksOnline);

      if (!uiAnim.pipeDreamBoard) {
        uiAnim.pipeDreamBoard = createEmptyPipeDreamBoard();
      }

      // If Stage 3 was completed directly via headless engine state, populate the solved board so all 4 flows render
      const initialCheck = evaluatePipeDreamBoard(uiAnim.pipeDreamBoard, false);
      if (isFullFlow && initialCheck.placedBlockCount === 0) {
        populateSolvedPipeDreamBoard(uiAnim.pipeDreamBoard);
        uiAnim.pipeDreamFlowActive = true;
      }

      const flowActive = Boolean(uiAnim.pipeDreamFlowActive || isFullFlow);
      const flowEval = evaluatePipeDreamBoard(uiAnim.pipeDreamBoard, flowActive);
      const placedPipeSegments = flowEval.placedBlockCount;
      const totalPipeSegments = 16;

      const dataAligned = isFullFlow || flowEval.outputConnected[0];
      const voiceAligned = isFullFlow || flowEval.outputConnected[1];
      const ethernetAligned = isFullFlow || flowEval.outputConnected[2];
      const powerFullAligned = isFullFlow || flowEval.outputConnected[3];

      const floozPct = isFullFlow
        ? 100
        : flowActive
          ? Math.round((flowEval.connectedCount / 4) * 100)
          : Math.round((placedPipeSegments / totalPipeSegments) * 100);

      // Right whiteboard checkboxes map to the 4 infrastructure feeds
      const internetChecked = dataAligned;
      const firewallChecked = voiceAligned;
      const switchChecked = ethernetAligned;
      const coreChecked = powerFullAligned;

      const dockBlocks = [
        { id: "W-E", label: "STRAIGHT H" },
        { id: "N-S", label: "STRAIGHT V" },
        { id: "CROSS", label: "CROSS OVER" },
        { id: "W-S", label: "ELBOW W-S" },
        { id: "N-E", label: "ELBOW N-E" },
        { id: "W-N", label: "ELBOW W-N" },
        { id: "S-E", label: "ELBOW S-E" }
      ];

      const leakCount = Object.keys(flowEval.leakedCells).length;
      const speechText = isFullFlow
        ? "All 4 server room feeds are flowing online!"
        : flowActive
          ? `${flowEval.connectedCount}/4 feeds flowing${leakCount > 0 ? " - fix leaks & hit GO!" : ""}`
          : `${placedPipeSegments} blocks placed — build paths then hit GO!`;

      // Helper to render flow path centerline inside a 90x70 cell
      const getBlueprintPathD = (dir) => {
        switch (dir) {
          case "W-E":
            return "M 6 35 L 84 35";
          case "N-S":
            return "M 45 6 L 45 64";
          case "W-S":
            return "M 6 35 L 45 35 L 45 64";
          case "W-N":
            return "M 6 35 L 45 35 L 45 6";
          case "N-E":
            return "M 45 6 L 45 35 L 84 35";
          case "S-E":
          default:
            return "M 45 64 L 45 35 L 84 35";
        }
      };

      // Render a Pipe Dream conduit layer ("under" or "over") inside a 90x70 bevelled gray block
      // Before GO >> (or when disconnected), pipe channel is dark/black (#090d16).
      // When GO >> is active and flow reaches this layer, it fills with bright Pipe Dream green flooz!
      const renderConduitLayerSvg = (vRow, vCol, dir, layerKind, hasBothLayers) => {
        if (!dir) return "";
        const isFlowing =
          isFullFlow ||
          Object.prototype.hasOwnProperty.call(flowEval.filledLayers, `${vRow},${vCol}:${layerKind}`);
        const isUnder = layerKind === "under";
        const arms = dir.split("-");
        const hasW = arms.includes("W");
        const hasE = arms.includes("E");
        const hasN = arms.includes("N");
        const hasS = arms.includes("S");
        const flowD = getBlueprintPathD(dir);

        const hFill = isFlowing ? "url(#fj-sr-green-h)" : "#090d16";
        const vFill = isFlowing ? "url(#fj-sr-green-v)" : "#090d16";
        const ballFill = isFlowing ? "url(#fj-sr-ball-green)" : "#090d16";
        const strokeCol = isFlowing ? "#86efac" : "#475569";
        const flangeV = isFlowing ? "url(#fj-sr-brass-v)" : "url(#fj-sr-silver-v)";
        const flangeH = isFlowing ? "url(#fj-sr-brass-h)" : "url(#fj-sr-silver-h)";

        if (isUnder) {
          const w = 16;
          const half = w / 2;
          return `
            <g class="sr-conduit-under${isFlowing ? " is-flowing" : ""}">
              <!-- Recessed Under-Pipe Channel Arms -->
              ${hasW ? `<rect x="4" y="${35 - half}" width="41" height="${w}" fill="${hFill}"/><line x1="4" y1="${35 - half + 3}" x2="45" y2="${35 - half + 3}" stroke="${strokeCol}" stroke-width="1.2"/>` : ""}
              ${hasE ? `<rect x="45" y="${35 - half}" width="41" height="${w}" fill="${hFill}"/><line x1="45" y1="${35 - half + 3}" x2="86" y2="${35 - half + 3}" stroke="${strokeCol}" stroke-width="1.2"/>` : ""}
              ${hasN ? `<rect x="${45 - half}" y="4" width="${w}" height="31" fill="${vFill}"/><line x1="${45 - half + 3}" y1="4" x2="${45 - half + 3}" y2="35" stroke="${strokeCol}" stroke-width="1.2"/>` : ""}
              ${hasS ? `<rect x="${45 - half}" y="35" width="${w}" height="31" fill="${vFill}"/><line x1="${45 - half + 3}" y1="35" x2="${45 - half + 3}" y2="66" stroke="${strokeCol}" stroke-width="1.2"/>` : ""}
              <circle cx="45" cy="35" r="8.5" fill="${ballFill}" stroke="${strokeCol}" stroke-width="1.2"/>
              ${isFlowing ? `<path class="sr-pipe-flow-dash" d="${flowD}" stroke="#dcfce7" stroke-width="2.4" stroke-dasharray="6 4" fill="none"/>` : ""}
              ${hasW ? `<rect x="2" y="23" width="5" height="24" rx="1.2" fill="${flangeV}" stroke="#1e293b" stroke-width="0.8"/>` : ""}
              ${hasE ? `<rect x="83" y="23" width="5" height="24" rx="1.2" fill="${flangeV}" stroke="#1e293b" stroke-width="0.8"/>` : ""}
              ${hasN ? `<rect x="33" y="2" width="24" height="5" rx="1.2" fill="${flangeH}" stroke="#1e293b" stroke-width="0.8"/>` : ""}
              ${hasS ? `<rect x="33" y="63" width="24" height="5" rx="1.2" fill="${flangeH}" stroke="#1e293b" stroke-width="0.8"/>` : ""}
            </g>
          `;
        }

        const w = 18;
        const half = w / 2;
        return `
          <g class="sr-conduit-over${isFlowing ? " is-flowing" : ""}">
            <!-- Bridge Cushion Over Under-Pipe when Crossing -->
            ${
              hasBothLayers
                ? `
              ${hasW ? `<rect x="18" y="${35 - half - 3}" width="27" height="${w + 6}" fill="#94a3b8"/>` : ""}
              ${hasE ? `<rect x="45" y="${35 - half - 3}" width="27" height="${w + 6}" fill="#94a3b8"/>` : ""}
              ${hasN ? `<rect x="${45 - half - 3}" y="14" width="${w + 6}" height="21" fill="#94a3b8"/>` : ""}
              ${hasS ? `<rect x="${45 - half - 3}" y="35" width="${w + 6}" height="21" fill="#94a3b8"/>` : ""}
            `
                : ""
            }
            <!-- Pipe Dream Channel Arms (Dark Unfilled before GO >>, Neon Green Flooz when Flowing!) -->
            ${hasW ? `<rect x="4" y="${35 - half}" width="41" height="${w}" fill="${hFill}"/><line x1="4" y1="${35 - half + 3}" x2="45" y2="${35 - half + 3}" stroke="${strokeCol}" stroke-width="1.5"/>` : ""}
            ${hasE ? `<rect x="45" y="${35 - half}" width="41" height="${w}" fill="${hFill}"/><line x1="45" y1="${35 - half + 3}" x2="86" y2="${35 - half + 3}" stroke="${strokeCol}" stroke-width="1.5"/>` : ""}
            ${hasN ? `<rect x="${45 - half}" y="4" width="${w}" height="31" fill="${vFill}"/><line x1="${45 - half + 3}" y1="4" x2="${45 - half + 3}" y2="35" stroke="${strokeCol}" stroke-width="1.5"/>` : ""}
            ${hasS ? `<rect x="${45 - half}" y="35" width="${w}" height="31" fill="${vFill}"/><line x1="${45 - half + 3}" y1="35" x2="${45 - half + 3}" y2="66" stroke="${strokeCol}" stroke-width="1.5"/>` : ""}
            <circle cx="45" cy="35" r="9.5" fill="${ballFill}" stroke="${strokeCol}" stroke-width="1.3"/>
            <circle cx="42" cy="32" r="2.5" fill="#ffffff" opacity="${isFlowing ? 0.75 : 0.25}"/>
            ${isFlowing ? `<path class="sr-pipe-flow-dash" d="${flowD}" stroke="#ffffff" stroke-width="2.6" stroke-dasharray="8 5" fill="none" opacity="0.95"/>` : ""}
            <!-- Edge Flanges -->
            ${hasW ? `<rect x="2" y="23" width="5" height="24" rx="1.2" fill="${flangeV}" stroke="#1e293b" stroke-width="0.8"/>` : ""}
            ${hasE ? `<rect x="83" y="23" width="5" height="24" rx="1.2" fill="${flangeV}" stroke="#1e293b" stroke-width="0.8"/>` : ""}
            ${hasN ? `<rect x="33" y="2" width="24" height="5" rx="1.2" fill="${flangeH}" stroke="#1e293b" stroke-width="0.8"/>` : ""}
            ${hasS ? `<rect x="33" y="63" width="24" height="5" rx="1.2" fill="${flangeH}" stroke="#1e293b" stroke-width="0.8"/>` : ""}
          </g>
        `;
      };

      // Render a 90x70 tile in the 4x4 Server Room Matrix (vRow = 0..3, vCol = 0..3)
      const TILE_W = 90;
      const TILE_H = 70;
      const GRID_X0 = 310;
      const GRID_Y0 = 80;

      const renderPipeMatrixCellSvg = (vRow, vCol) => {
        const tx = GRID_X0 + vCol * TILE_W;
        const ty = GRID_Y0 + vRow * TILE_H;
        const coordLabel = `${String.fromCharCode(65 + vRow)}${vCol + 1}`;
        const cellState = uiAnim.pipeDreamBoard[vRow][vCol];
        const overDir = cellState.over;
        const underDir = cellState.under;
        const anyPlaced = Boolean(overDir || underDir);
        const hasBothLayers = Boolean(overDir && underDir);

        // When NO pipe block is placed in this cell yet, render a clean EMPTY dark slot (no tips!)
        if (!anyPlaced) {
          return `
            <g
              class="fj-pipe-tile fj-sr-rack-seg is-misaligned is-empty-slot"
              data-vrow="${vRow}"
              data-vcol="${vCol}"
              transform="translate(${tx}, ${ty})"
              aria-label="Empty pipe bay ${coordLabel}"
            >
              <rect
                class="sr-joint-halo"
                x="2"
                y="2"
                width="86"
                height="66"
                rx="4"
                fill="rgba(8, 13, 26, 0.94)"
                stroke="rgba(100, 116, 139, 0.42)"
                stroke-width="1.2"
                stroke-dasharray="5 4"
              />
              <circle cx="8" cy="8" r="1.2" fill="#475569"/>
              <circle cx="82" cy="8" r="1.2" fill="#475569"/>
              <circle cx="8" cy="62" r="1.2" fill="#475569"/>
              <circle cx="82" cy="62" r="1.2" fill="#475569"/>
              <circle cx="45" cy="35" r="7" fill="rgba(2, 6, 23, 0.85)" stroke="#475569" stroke-width="1.2"/>
              <circle cx="45" cy="35" r="2" fill="#475569"/>
              <text x="82" y="14" text-anchor="end" fill="#64748b" font-size="7.2" font-weight="800" font-family="JetBrains Mono, monospace">${coordLabel}</text>
            </g>
          `;
        }

        const overFlowing =
          isFullFlow ||
          Object.prototype.hasOwnProperty.call(flowEval.filledLayers, `${vRow},${vCol}:over`);
        const underFlowing =
          isFullFlow ||
          Object.prototype.hasOwnProperty.call(flowEval.filledLayers, `${vRow},${vCol}:under`);
        const energized = overFlowing || underFlowing;
        const leakPort = flowEval.leakedCells[`${vRow},${vCol}`];
        const placedBadge = hasBothLayers ? `${underDir}+${overDir}` : overDir || underDir;

        return `
          <g
            class="fj-pipe-tile fj-sr-rack-seg is-placed-block${energized ? " is-energized" : " is-unfilled-block"}"
            data-vrow="${vRow}"
            data-vcol="${vCol}"
            transform="translate(${tx}, ${ty})"
            aria-label="Pipe Dream block ${coordLabel} (${placedBadge})"
          >
            <!-- Classic Pipe Dream 3D Bevelled Gray Square Block -->
            <rect
              class="sr-joint-halo"
              x="2"
              y="2"
              width="86"
              height="66"
              rx="4"
              fill="#94a3b8"
              stroke="${energized ? "#22c55e" : leakPort ? "#ef4444" : "#1e293b"}"
              stroke-width="${energized || leakPort ? "2" : "1.4"}"
            />
            <!-- Top/Left Highlight Bevel & Bottom/Right Shadow Bevel -->
            <path d="M 4 66 L 4 4 L 86 4" stroke="#f1f5f9" stroke-width="2.2" fill="none"/>
            <path d="M 4 66 L 86 66 L 86 4" stroke="#334155" stroke-width="2.2" fill="none"/>
            <rect x="6" y="6" width="78" height="58" rx="2" fill="#cbd5e1"/>

            <g class="sr-pipe-rotatable">
              ${renderConduitLayerSvg(vRow, vCol, underDir, "under", hasBothLayers)}
              ${renderConduitLayerSvg(vRow, vCol, overDir, "over", hasBothLayers)}
            </g>

            ${
              leakPort
                ? `
              <rect x="22" y="2" width="46" height="13" rx="3" fill="#dc2626" stroke="#fecaca" stroke-width="1"/>
              <text x="45" y="11" text-anchor="middle" fill="#ffffff" font-size="7.5" font-weight="900" font-family="Inter, sans-serif">LEAK!</text>
            `
                : ""
            }
            <text x="82" y="63" text-anchor="end" fill="#1e293b" font-size="7" font-weight="900" font-family="JetBrains Mono, monospace">${coordLabel}</text>
          </g>
        `;
      };

      const gridTilesSvg = [0, 1, 2, 3]
        .map((vRow) => [0, 1, 2, 3].map((vCol) => renderPipeMatrixCellSvg(vRow, vCol)).join(""))
        .join("");

      return `
        <div class="fj-serverroom-scene--immersive">
          <!-- Speech Bubble Above Chibi JB on Left -->
          <div class="fj-speech-bubble--server-immersive" role="status" aria-live="polite">
            ${speechText}
          </div>

          <!-- Full-Scene 3D SVG: Windows Pipe Dream 4x3 Matrix + 4 Infrastructure Channels (DATA, VOICE, ETHERNET, POWER) -->
          <svg
            class="fj-serverroom-3d-svg${isFullFlow ? " is-full-flow" : ""}"
            viewBox="0 0 1000 540"
            preserveAspectRatio="none"
            aria-label="Server room Windows Pipe Dream 4-channel network matrix"
          >
            <defs>
              <!-- 1. DATA (Cyan Fiber) Gradients -->
              <linearGradient id="fj-sr-cyan-h" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#0369a1"/>
                <stop offset="28%" stop-color="#38bdf8"/>
                <stop offset="50%" stop-color="#e0f2fe"/>
                <stop offset="74%" stop-color="#0284c7"/>
                <stop offset="100%" stop-color="#082f49"/>
              </linearGradient>
              <linearGradient id="fj-sr-cyan-v" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#0369a1"/>
                <stop offset="28%" stop-color="#38bdf8"/>
                <stop offset="50%" stop-color="#e0f2fe"/>
                <stop offset="74%" stop-color="#0284c7"/>
                <stop offset="100%" stop-color="#082f49"/>
              </linearGradient>
              <radialGradient id="fj-sr-ball-cyan" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stop-color="#f0f9ff"/>
                <stop offset="45%" stop-color="#38bdf8"/>
                <stop offset="100%" stop-color="#0c4a6e"/>
              </radialGradient>

              <!-- 2. VOICE (Purple VoIP SIP) Gradients -->
              <linearGradient id="fj-sr-purple-h" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#6b21a8"/>
                <stop offset="28%" stop-color="#c084fc"/>
                <stop offset="50%" stop-color="#f3e8ff"/>
                <stop offset="74%" stop-color="#9333ea"/>
                <stop offset="100%" stop-color="#3b0764"/>
              </linearGradient>
              <linearGradient id="fj-sr-purple-v" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#6b21a8"/>
                <stop offset="28%" stop-color="#c084fc"/>
                <stop offset="50%" stop-color="#f3e8ff"/>
                <stop offset="74%" stop-color="#9333ea"/>
                <stop offset="100%" stop-color="#3b0764"/>
              </linearGradient>
              <radialGradient id="fj-sr-ball-purple" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stop-color="#faf5ff"/>
                <stop offset="45%" stop-color="#c084fc"/>
                <stop offset="100%" stop-color="#4c1d95"/>
              </radialGradient>

              <!-- 3. ETHERNET (Emerald Cat6 LAN) Gradients -->
              <linearGradient id="fj-sr-green-h" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#14532d"/>
                <stop offset="28%" stop-color="#22c55e"/>
                <stop offset="50%" stop-color="#dcfce7"/>
                <stop offset="74%" stop-color="#16a34a"/>
                <stop offset="100%" stop-color="#052e16"/>
              </linearGradient>
              <linearGradient id="fj-sr-green-v" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#14532d"/>
                <stop offset="28%" stop-color="#22c55e"/>
                <stop offset="50%" stop-color="#dcfce7"/>
                <stop offset="74%" stop-color="#16a34a"/>
                <stop offset="100%" stop-color="#052e16"/>
              </linearGradient>
              <radialGradient id="fj-sr-ball-green" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stop-color="#f0fdf4"/>
                <stop offset="45%" stop-color="#4ade80"/>
                <stop offset="100%" stop-color="#14532d"/>
              </radialGradient>

              <!-- 4. POWER (Amber 240V UPS) Gradients -->
              <linearGradient id="fj-sr-amber-h" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#92400e"/>
                <stop offset="28%" stop-color="#f59e0b"/>
                <stop offset="50%" stop-color="#fef9c3"/>
                <stop offset="74%" stop-color="#d97706"/>
                <stop offset="100%" stop-color="#451a03"/>
              </linearGradient>
              <linearGradient id="fj-sr-amber-v" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#92400e"/>
                <stop offset="28%" stop-color="#f59e0b"/>
                <stop offset="50%" stop-color="#fef9c3"/>
                <stop offset="74%" stop-color="#d97706"/>
                <stop offset="100%" stop-color="#451a03"/>
              </linearGradient>
              <radialGradient id="fj-sr-ball-amber" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stop-color="#fefce8"/>
                <stop offset="45%" stop-color="#fbbf24"/>
                <stop offset="100%" stop-color="#78350f"/>
              </radialGradient>
              <radialGradient id="fj-sr-ball-steel" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stop-color="#e2e8f0"/>
                <stop offset="45%" stop-color="#64748b"/>
                <stop offset="100%" stop-color="#0f172a"/>
              </radialGradient>

              <!-- Offline Steel & Brass/Silver Flange Gradients -->
              <linearGradient id="fj-sr-steel-h" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#334155"/>
                <stop offset="32%" stop-color="#94a3b8"/>
                <stop offset="55%" stop-color="#475569"/>
                <stop offset="85%" stop-color="#0f172a"/>
                <stop offset="100%" stop-color="#334155"/>
              </linearGradient>
              <linearGradient id="fj-sr-steel-v" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#334155"/>
                <stop offset="32%" stop-color="#94a3b8"/>
                <stop offset="55%" stop-color="#475569"/>
                <stop offset="85%" stop-color="#0f172a"/>
                <stop offset="100%" stop-color="#334155"/>
              </linearGradient>
              <linearGradient id="fj-sr-brass-v" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#fef08a"/>
                <stop offset="35%" stop-color="#f59e0b"/>
                <stop offset="75%" stop-color="#78350f"/>
                <stop offset="100%" stop-color="#fde68a"/>
              </linearGradient>
              <linearGradient id="fj-sr-brass-h" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#fef08a"/>
                <stop offset="35%" stop-color="#f59e0b"/>
                <stop offset="75%" stop-color="#78350f"/>
                <stop offset="100%" stop-color="#fde68a"/>
              </linearGradient>
              <linearGradient id="fj-sr-silver-v" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#f8fafc"/>
                <stop offset="30%" stop-color="#cbd5e1"/>
                <stop offset="70%" stop-color="#475569"/>
                <stop offset="100%" stop-color="#94a3b8"/>
              </linearGradient>
              <linearGradient id="fj-sr-silver-h" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#f8fafc"/>
                <stop offset="30%" stop-color="#cbd5e1"/>
                <stop offset="70%" stop-color="#475569"/>
                <stop offset="100%" stop-color="#94a3b8"/>
              </linearGradient>
              <filter id="fj-sr-plasma-glow" x="-25%" y="-25%" width="150%" height="150%">
                <feGaussianBlur stdDeviation="3.5" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            <!-- ============================================================
                 CLASSIC WINDOWS PIPE DREAM / 3D PIPES 4x4 RACK MATRIX HOUSING
                 ============================================================ -->
            <g class="fj-sr-pipe-network${isFullFlow ? " is-complete-flash" : ""}">
              <!-- Outer Beveled Windows Pipe Dream Chassis Frame (x=302..678, y=48..368) -->
              <rect x="302" y="48" width="376" height="320" rx="10" fill="rgba(4, 11, 24, 0.88)" stroke="#475569" stroke-width="2.2"/>
              <!-- Top Header Bar: Classic Pipe Dream Flooz / Signal Pressure Meter & 4-Channel Legend -->
              <rect x="306" y="52" width="368" height="24" rx="6" fill="#0b172a" stroke="#334155" stroke-width="1.2"/>
              <text x="315" y="68" fill="#e2e8f0" font-size="8.8" font-weight="900" font-family="JetBrains Mono, monospace" letter-spacing="0.04em">4x4 PIPES MATRIX</text>

              <!-- Flooz / Flow Pressure Bar -->
              <rect x="414" y="57" width="94" height="14" rx="7" fill="#020617" stroke="#475569" stroke-width="1"/>
              <rect x="416" y="59" width="${Math.max(6, Math.round(0.90 * floozPct))}" height="10" rx="5" fill="${isFullFlow ? "#22c55e" : "#38bdf8"}"/>
              <text x="461" y="67" text-anchor="middle" fill="#ffffff" font-size="7.5" font-weight="900" font-family="Inter, sans-serif">FLOW ${floozPct}%</text>

              <!-- 4 Channel Color Legend Pills -->
              <circle cx="522" cy="64" r="4" fill="#38bdf8"/>
              <text x="529" y="67" fill="#7dd3fc" font-size="7.8" font-weight="800" font-family="Inter, sans-serif">DATA</text>
              <circle cx="562" cy="64" r="4" fill="#c084fc"/>
              <text x="569" y="67" fill="#d8b4fe" font-size="7.8" font-weight="800" font-family="Inter, sans-serif">VOICE</text>
              <circle cx="605" cy="64" r="4" fill="#4ade80"/>
              <text x="612" y="67" fill="#86efac" font-size="7.8" font-weight="800" font-family="Inter, sans-serif">ETH</text>
              <circle cx="640" cy="64" r="4" fill="#fbbf24"/>
              <text x="647" y="67" fill="#fde047" font-size="7.8" font-weight="800" font-family="Inter, sans-serif">PWR</text>

              <!-- ============================================================
                   LEFT INTAKE TERMINALS: 1. DATA, 2. VOICE, 3. ETHERNET, 4. POWER
                   (Each aligned straight across with its dedicated row!)
                   ============================================================ -->

              <!-- INTAKE 1: DATA (Fiber Optic WAN) -> Feeds Row A (vRow=0, cy=115) -->
              <g class="fj-sr-terminal-box fj-sr-terminal-box--in" transform="translate(152, 88)">
                <rect x="0" y="0" width="128" height="54" rx="8" fill="#07192e" stroke="#38bdf8" stroke-width="1.8"/>
                <g transform="translate(10, 13)" fill="none">
                  <circle cx="14" cy="14" r="11" stroke="#38bdf8" stroke-width="1.7"/>
                  <ellipse cx="14" cy="14" rx="5" ry="11" stroke="#7dd3fc" stroke-width="1.5"/>
                  <line x1="3" y1="14" x2="25" y2="14" stroke="#7dd3fc" stroke-width="1.5"/>
                </g>
                <text x="42" y="21" fill="#7dd3fc" font-size="9.5" font-weight="900" font-family="Inter, sans-serif">1. DATA IN</text>
                <text x="42" y="34" fill="#ffffff" font-size="10.5" font-weight="900" font-family="Inter, sans-serif">FIBER WAN</text>
                <text x="42" y="46" fill="#38bdf8" font-size="8" font-weight="700" font-family="JetBrains Mono, monospace">10G OPTIC</text>
              </g>
              <rect x="280" y="104" width="30" height="22" fill="url(#fj-sr-cyan-h)" filter="url(#fj-sr-plasma-glow)"/>
              <rect x="278" y="100" width="7" height="30" rx="2" fill="url(#fj-sr-brass-v)" stroke="#fef08a" stroke-width="0.9"/>

              <!-- INTAKE 2: VOICE (VoIP / SIP Trunk) -> Feeds Row B (vRow=1, cy=185) straight across -->
              <g class="fj-sr-terminal-box fj-sr-terminal-box--in" transform="translate(152, 158)">
                <rect x="0" y="0" width="128" height="54" rx="8" fill="#1b0d33" stroke="#c084fc" stroke-width="1.8"/>
                <g transform="translate(10, 13)" fill="none">
                  <path d="M6 8c0 7 5 12 12 12l3-3-4-4-2 2c-3-1-5-3-6-6l2-2-4-4-1 5z" stroke="#d8b4fe" stroke-width="1.7" fill="rgba(192, 132, 252, 0.2)"/>
                  <path d="M19 6a7 7 0 0 1 5 5M18 10a3 3 0 0 1 3 3" stroke="#e9d5ff" stroke-width="1.6" stroke-linecap="round"/>
                </g>
                <text x="42" y="21" fill="#d8b4fe" font-size="9.5" font-weight="900" font-family="Inter, sans-serif">2. VOICE IN</text>
                <text x="42" y="34" fill="#ffffff" font-size="10.5" font-weight="900" font-family="Inter, sans-serif">VoIP / SIP</text>
                <text x="42" y="46" fill="#c084fc" font-size="8" font-weight="700" font-family="JetBrains Mono, monospace">PBX TRUNK</text>
              </g>
              <rect x="280" y="174" width="30" height="22" fill="url(#fj-sr-purple-h)" filter="url(#fj-sr-plasma-glow)"/>
              <rect x="278" y="170" width="7" height="30" rx="2" fill="url(#fj-sr-brass-v)" stroke="#fef08a" stroke-width="0.9"/>

              <!-- INTAKE 3: ETHERNET (Cat6 10GbE Switch) -> Feeds Row C (vRow=2, cy=255) straight across -->
              <g class="fj-sr-terminal-box fj-sr-terminal-box--in" transform="translate(152, 228)">
                <rect x="0" y="0" width="128" height="54" rx="8" fill="#062419" stroke="#4ade80" stroke-width="1.8"/>
                <g transform="translate(10, 14)" fill="none">
                  <rect x="3" y="3" width="22" height="18" rx="2.5" stroke="#4ade80" stroke-width="1.7" fill="rgba(74, 222, 128, 0.15)"/>
                  <path d="M8 3v5M12 3v5M16 3v5M20 3v5M9 21v4h10v-4" stroke="#86efac" stroke-width="1.6" stroke-linecap="round"/>
                </g>
                <text x="42" y="21" fill="#86efac" font-size="9.5" font-weight="900" font-family="Inter, sans-serif">3. ETHERNET</text>
                <text x="42" y="34" fill="#ffffff" font-size="10.5" font-weight="900" font-family="Inter, sans-serif">CAT6 LAN</text>
                <text x="42" y="46" fill="#4ade80" font-size="8" font-weight="700" font-family="JetBrains Mono, monospace">10GbE VLAN</text>
              </g>
              <rect x="280" y="244" width="30" height="22" fill="url(#fj-sr-green-h)" filter="url(#fj-sr-plasma-glow)"/>
              <rect x="278" y="240" width="7" height="30" rx="2" fill="url(#fj-sr-brass-v)" stroke="#fef08a" stroke-width="0.9"/>

              <!-- INTAKE 4: POWER (240V Redundant UPS) -> Feeds Row D (vRow=3, cy=325) straight across -->
              <g class="fj-sr-terminal-box fj-sr-terminal-box--in" transform="translate(152, 298)">
                <rect x="0" y="0" width="128" height="54" rx="8" fill="#291504" stroke="#fbbf24" stroke-width="1.8"/>
                <g transform="translate(11, 12)" stroke="#fde047" stroke-width="1.8" fill="rgba(251, 191, 36, 0.25)">
                  <path d="M15 2L5 16h8l-2 12 11-15h-8l1-11z" stroke-linejoin="round"/>
                </g>
                <text x="42" y="21" fill="#fde047" font-size="9.5" font-weight="900" font-family="Inter, sans-serif">4. POWER IN</text>
                <text x="42" y="34" fill="#ffffff" font-size="10.5" font-weight="900" font-family="Inter, sans-serif">240V UPS</text>
                <text x="42" y="46" fill="#fbbf24" font-size="8" font-weight="700" font-family="JetBrains Mono, monospace">DUAL RAIL</text>
              </g>
              <rect x="280" y="314" width="30" height="22" fill="url(#fj-sr-amber-h)" filter="url(#fj-sr-plasma-glow)"/>
              <rect x="278" y="310" width="7" height="30" rx="2" fill="url(#fj-sr-brass-v)" stroke="#fef08a" stroke-width="0.9"/>

              <!-- ============================================================
                   4x4 INTERACTIVE WINDOWS PIPE DREAM / 3D PIPES GRID (16 CELLS)
                   ============================================================ -->
              ${gridTilesSvg}

              <!-- ============================================================
                   RIGHT CORE TERMINALS: DATA SAN, VOICE PBX, ETH SWITCH, PDU
                   ============================================================ -->

              <!-- OUTPUT 1: DATA CORE (SAN STORAGE) from Row A East (670, cy=115) -->
              <rect x="670" y="104" width="30" height="22" fill="${dataAligned ? "url(#fj-sr-cyan-h)" : "url(#fj-sr-steel-h)"}" ${dataAligned ? 'filter="url(#fj-sr-plasma-glow)"' : ""}/>
              <rect x="695" y="100" width="7" height="30" rx="2" fill="${dataAligned ? "url(#fj-sr-brass-v)" : "url(#fj-sr-silver-v)"}" stroke="#e2e8f0" stroke-width="0.9"/>
              <g class="fj-sr-terminal-box fj-sr-terminal-box--out" transform="translate(700, 88)">
                <rect x="0" y="0" width="134" height="54" rx="8" fill="#07192e" stroke="${dataAligned ? "#38bdf8" : "#475569"}" stroke-width="2"/>
                <circle cx="16" cy="27" r="7" fill="${dataAligned ? "#38bdf8" : "#334155"}"/>
                ${dataAligned ? `<path d="M 12.5 27 L 15 29.5 L 19.5 24.5" stroke="#041022" stroke-width="2" stroke-linecap="round" fill="none"/>` : ""}
                <text x="30" y="21" fill="#7dd3fc" font-size="9.5" font-weight="900" font-family="Inter, sans-serif">DATA CORE</text>
                <text x="30" y="34" fill="#ffffff" font-size="10.5" font-weight="900" font-family="Inter, sans-serif">SAN STORAGE</text>
                <text x="30" y="46" fill="${dataAligned ? "#38bdf8" : "#94a3b8"}" font-size="8" font-weight="800" font-family="JetBrains Mono, monospace">${dataAligned ? "LINK ONLINE" : "WAITING..."}</text>
              </g>

              <!-- OUTPUT 2: VOICE GATEWAY (SIP PBX) from Row B East (670, cy=185) straight across -->
              <rect x="670" y="174" width="30" height="22" fill="${voiceAligned ? "url(#fj-sr-purple-h)" : "url(#fj-sr-steel-h)"}" ${voiceAligned ? 'filter="url(#fj-sr-plasma-glow)"' : ""}/>
              <rect x="695" y="170" width="7" height="30" rx="2" fill="${voiceAligned ? "url(#fj-sr-brass-v)" : "url(#fj-sr-silver-v)"}" stroke="#e2e8f0" stroke-width="0.9"/>
              <g class="fj-sr-terminal-box fj-sr-terminal-box--out" transform="translate(700, 158)">
                <rect x="0" y="0" width="134" height="54" rx="8" fill="#1b0d33" stroke="${voiceAligned ? "#c084fc" : "#475569"}" stroke-width="2"/>
                <circle cx="16" cy="27" r="7" fill="${voiceAligned ? "#c084fc" : "#334155"}"/>
                ${voiceAligned ? `<path d="M 12.5 27 L 15 29.5 L 19.5 24.5" stroke="#1b0d33" stroke-width="2" stroke-linecap="round" fill="none"/>` : ""}
                <text x="30" y="21" fill="#d8b4fe" font-size="9.5" font-weight="900" font-family="Inter, sans-serif">VOICE PBX</text>
                <text x="30" y="34" fill="#ffffff" font-size="10.5" font-weight="900" font-family="Inter, sans-serif">SIP GATEWAY</text>
                <text x="30" y="46" fill="${voiceAligned ? "#c084fc" : "#94a3b8"}" font-size="8" font-weight="800" font-family="JetBrains Mono, monospace">${voiceAligned ? "TRUNK ACTIVE" : "WAITING..."}</text>
              </g>

              <!-- OUTPUT 3: ETHERNET SWITCH from Row C East (670, cy=255) straight across -->
              <rect x="670" y="244" width="30" height="22" fill="${ethernetAligned ? "url(#fj-sr-green-h)" : "url(#fj-sr-steel-h)"}" ${ethernetAligned ? 'filter="url(#fj-sr-plasma-glow)"' : ""}/>
              <rect x="695" y="240" width="7" height="30" rx="2" fill="${ethernetAligned ? "url(#fj-sr-brass-v)" : "url(#fj-sr-silver-v)"}" stroke="#e2e8f0" stroke-width="0.9"/>
              <g class="fj-sr-terminal-box fj-sr-terminal-box--out" transform="translate(700, 228)">
                <rect x="0" y="0" width="134" height="54" rx="8" fill="#062419" stroke="${ethernetAligned ? "#4ade80" : "#475569"}" stroke-width="2"/>
                <circle cx="16" cy="27" r="7" fill="${ethernetAligned ? "#4ade80" : "#334155"}"/>
                ${ethernetAligned ? `<path d="M 12.5 27 L 15 29.5 L 19.5 24.5" stroke="#052e16" stroke-width="2" stroke-linecap="round" fill="none"/>` : ""}
                <text x="30" y="21" fill="#86efac" font-size="9.5" font-weight="900" font-family="Inter, sans-serif">ETHERNET SW</text>
                <text x="30" y="34" fill="#ffffff" font-size="10.5" font-weight="900" font-family="Inter, sans-serif">CORE SWITCH</text>
                <text x="30" y="46" fill="${ethernetAligned ? "#4ade80" : "#94a3b8"}" font-size="8" font-weight="800" font-family="JetBrains Mono, monospace">${ethernetAligned ? "10GbE UP" : "WAITING..."}</text>
              </g>

              <!-- OUTPUT 4: POWER RACK PDU from Row D East (670, cy=325) straight across -->
              <rect x="670" y="314" width="30" height="22" fill="${powerFullAligned ? "url(#fj-sr-amber-h)" : "url(#fj-sr-steel-h)"}" ${powerFullAligned ? 'filter="url(#fj-sr-plasma-glow)"' : ""}/>
              <rect x="695" y="310" width="7" height="30" rx="2" fill="${powerFullAligned ? "url(#fj-sr-brass-v)" : "url(#fj-sr-silver-v)"}" stroke="#e2e8f0" stroke-width="0.9"/>
              <g class="fj-sr-terminal-box fj-sr-terminal-box--out" transform="translate(700, 298)">
                <rect x="0" y="0" width="134" height="54" rx="8" fill="#291504" stroke="${powerFullAligned ? "#fbbf24" : "#475569"}" stroke-width="2"/>
                <circle cx="16" cy="27" r="7" fill="${powerFullAligned ? "#fbbf24" : "#334155"}"/>
                ${powerFullAligned ? `<path d="M 12.5 27 L 15 29.5 L 19.5 24.5" stroke="#291504" stroke-width="2" stroke-linecap="round" fill="none"/>` : ""}
                <text x="30" y="21" fill="#fde047" font-size="9.5" font-weight="900" font-family="Inter, sans-serif">POWER PDU</text>
                <text x="30" y="34" fill="#ffffff" font-size="10.5" font-weight="900" font-family="Inter, sans-serif">RACK 240V BUS</text>
                <text x="30" y="46" fill="${powerFullAligned ? "#fbbf24" : "#94a3b8"}" font-size="8" font-weight="800" font-family="JetBrains Mono, monospace">${powerFullAligned ? "240V LOCKED" : "WAITING..."}</text>
              </g>
            </g>

            <!-- 4. Right Whiteboard Checkmarks Overlay (CORE y=77, SWITCH y=123, FIREWALL y=169, INTERNET y=215) -->
            <g class="fj-sr-whiteboard-checks">
              ${coreChecked ? `
                <rect x="884" y="77" width="18" height="18" rx="3" fill="#22c55e" stroke="#15803d" stroke-width="1.5"/>
                <path d="M 888 86 L 892 90 L 898.5 81" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              ` : ""}
              ${switchChecked ? `
                <rect x="884" y="123" width="18" height="18" rx="3" fill="#22c55e" stroke="#15803d" stroke-width="1.5"/>
                <path d="M 888 132 L 892 136 L 898.5 127" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              ` : ""}
              ${firewallChecked ? `
                <rect x="884" y="169" width="18" height="18" rx="3" fill="${isFullFlow ? "#22c55e" : "#c084fc"}" stroke="${isFullFlow ? "#15803d" : "#6b21a8"}" stroke-width="1.5"/>
                <path d="M 888 178 L 892 182 L 898.5 173" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              ` : ""}
              ${internetChecked ? `
                <rect x="884" y="215" width="18" height="18" rx="3" fill="#22c55e" stroke="#15803d" stroke-width="1.5"/>
                <path d="M 888 224 L 892 228 L 898.5 219" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              ` : ""}
            </g>

            <!-- 5. Right Wall Monitor Screen Overlay ("NETWORK FLOW: Online" + 4-Channel Status) -->
            <g class="fj-sr-wall-monitor" data-fj-action="run-pipe-flow" style="cursor: pointer;" transform="translate(858, 268)">
              <rect x="0" y="0" width="130" height="68" rx="5" fill="rgba(5, 22, 28, 0.92)" stroke="none"/>
              <text x="65" y="17" text-anchor="middle" fill="#4ade80" font-size="10" font-weight="800" font-family="Inter, sans-serif" letter-spacing="0.04em" stroke="none">NETWORK FLOW</text>
              ${isFullFlow ? `
                <circle cx="30" cy="36" r="10" fill="#22c55e" stroke="none"/>
                <path d="M 26 36 L 29 39 L 35 32" stroke="#052e16" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                <text x="46" y="40" fill="#4ade80" font-size="15" font-weight="900" font-family="Inter, sans-serif" stroke="none">Online</text>
              ` : flowActive ? `
                <circle cx="24" cy="36" r="9.5" fill="#ef4444" stroke="none"/>
                <text x="24" y="40" text-anchor="middle" fill="#ffffff" font-size="9.5" font-weight="900" font-family="Inter, sans-serif" stroke="none">${flowEval.connectedCount}/4</text>
                <text x="40" y="40" fill="#fca5a5" font-size="10.5" font-weight="900" font-family="Inter, sans-serif" stroke="none">Fix Leak!</text>
              ` : `
                <circle cx="24" cy="36" r="9.5" fill="#22c55e" stroke="none"/>
                <path d="M 21 31.5 L 29 36 L 21 40.5 Z" fill="#052e16"/>
                <text x="40" y="40" fill="#86efac" font-size="10.5" font-weight="900" font-family="Inter, sans-serif" stroke="none">HIT GO &gt;&gt;</text>
              `}
              <!-- 4-Channel Mini Status Bar inside Wall Monitor -->
              <text x="14" y="59" fill="${dataAligned ? "#38bdf8" : "#475569"}" font-size="7.5" font-weight="900" font-family="JetBrains Mono, monospace">DATA</text>
              <text x="43" y="59" fill="${voiceAligned ? "#c084fc" : "#475569"}" font-size="7.5" font-weight="900" font-family="JetBrains Mono, monospace">VOICE</text>
              <text x="74" y="59" fill="${ethernetAligned ? "#4ade80" : "#475569"}" font-size="7.5" font-weight="900" font-family="JetBrains Mono, monospace">ETH</text>
              <text x="98" y="59" fill="${powerFullAligned ? "#fbbf24" : "#475569"}" font-size="7.5" font-weight="900" font-family="JetBrains Mono, monospace">PWR</text>
            </g>
          </svg>

          <!-- Bottom-Center Pipe Dream Block Dispenser Dock (7 Pipe Blocks + GO >> Flow Button) -->
          <div class="fj-sr-immersive-dock" role="group" aria-label="Server room Pipe Dream blocks and GO flow button">
            ${dockBlocks.map((b) => {
              return `
              <button
                type="button"
                class="fj-sr-dock-slot"
                data-pipe-kind="${b.id}"
                aria-label="${b.label} (Drag onto 4x4 grid)"
              >
                ${renderDockPipe3dSvg(b.id)}
                <span class="fj-sr-dock-slot__label">${b.label}</span>
              </button>
            `;
            }).join("")}
            <button
              type="button"
              class="fj-sr-dock-slot fj-sr-go-btn${flowActive ? " is-flowing" : ""}"
              data-fj-action="run-pipe-flow"
              aria-label="GO - Test if the pipes flow"
            >
              <svg viewBox="0 0 110 54" fill="none" aria-hidden="true">
                <rect x="14" y="5" width="82" height="44" rx="8" fill="#052e16" stroke="#86efac" stroke-width="2"/>
                <circle cx="38" cy="27" r="13" fill="#22c55e" stroke="#dcfce7" stroke-width="1.5"/>
                <path d="M 34 20 L 45 27 L 34 34 Z" fill="#052e16"/>
                <text x="71" y="32" text-anchor="middle" fill="#ffffff" font-size="14" font-weight="900" font-family="Inter, sans-serif">GO</text>
              </svg>
              <span class="fj-sr-dock-slot__label">FLOW &gt;&gt;</span>
            </button>
          </div>

          <!-- Compact Corner Utility Controls -->
          <div class="fj-workshop-mini-controls">
            <button type="button" class="fj-workshop-mini-btn" data-fj-action="reset" data-stage-id="3">Reset</button>
            ${isFullFlow ? `<button type="button" class="fj-workshop-mini-btn" data-fj-action="next-stage" data-target-stage="4">Next →</button>` : ""}
          </div>
        </div>
      `;
    }

    function renderStage4Body(st) {
      const middleIds = st.data.middleStepIds;
      const orderedStepIds = ["submission", middleIds[0], middleIds[1], middleIds[2], "notify"];
      const orderValid = middleIds.join(",") === WORKFLOW_CANONICAL_MIDDLE.join(",");
      const isCompleted = st.status === "success";
      const speechText = isCompleted
        ? "Workflow connected! Policy Completed!"
        : orderValid
          ? "Sequence aligned! Click Policy Completed to test flow."
          : "Let's set up the workflow in the right order.";

      // Visual specs for each of the 5 workflow steps matching the reference image pixel-for-pixel
      const CUBE_VISUAL_SPECS = {
        submission: {
          line1: "Customer",
          line2: "Portal",
          theme: "blue",
          frontFill: "url(#fj-il-cube-blue-front)",
          sideFill: "url(#fj-il-cube-blue-side)",
          capFill: "#0284c7",
          borderStroke: "#38bdf8",
          glowStroke: "#0ea5e9",
          lightBarColor: "#7dd3fc",
          dotColor: "#e0f2fe",
          iconSvg: `
            <g transform="translate(0, 0)" fill="none">
              <rect x="-16" y="-22" width="32" height="40" rx="3" stroke="#7dd3fc" stroke-width="2.6" fill="rgba(14, 165, 233, 0.18)"/>
              <path d="M 8 -22 L 16 -14 L 8 -14 Z" fill="#7dd3fc"/>
              <line x1="-10" y1="-11" x2="3" y2="-11" stroke="#e0f2fe" stroke-width="2.4" stroke-linecap="round"/>
              <line x1="-10" y1="-3" x2="10" y2="-3" stroke="#bae6fd" stroke-width="2.4" stroke-linecap="round"/>
              <line x1="-10" y1="5" x2="10" y2="5" stroke="#bae6fd" stroke-width="2.4" stroke-linecap="round"/>
              <line x1="-10" y1="13" x2="4" y2="13" stroke="#bae6fd" stroke-width="2.4" stroke-linecap="round"/>
            </g>
          `
        },
        risk_review: {
          line1: "Risk",
          line2: "Assessment",
          theme: "amber",
          frontFill: "url(#fj-il-cube-amber-front)",
          sideFill: "url(#fj-il-cube-amber-side)",
          capFill: "#d97706",
          borderStroke: "#fbbf24",
          glowStroke: "#f59e0b",
          lightBarColor: "#fde047",
          dotColor: "#fef08a",
          iconSvg: `
            <g transform="translate(0, 0)" fill="none">
              <path d="M 0 -22 L -17 -15 L -17 -2 C -17 10 -9 18 0 22 C 9 18 17 10 17 -2 L 17 -15 Z" stroke="#fde047" stroke-width="2.6" fill="rgba(245, 158, 11, 0.2)"/>
              <path d="M 0 -10 L 3 -3 L 10 0 L 3 3 L 0 10 L -3 3 L -10 0 L -3 -3 Z" fill="#fef08a"/>
            </g>
          `
        },
        validate: {
          line1: "Underwriting",
          line2: "(ACORD)",
          theme: "purple",
          frontFill: "url(#fj-il-cube-purple-front)",
          sideFill: "url(#fj-il-cube-purple-side)",
          capFill: "#9333ea",
          borderStroke: "#c084fc",
          glowStroke: "#a855f7",
          lightBarColor: "#e9d5ff",
          dotColor: "#f3e8ff",
          iconSvg: `
            <g transform="translate(0, 0)" fill="none">
              <path d="M -16 -22 H 8 L 16 -14 V 20 H -16 Z" stroke="#e9d5ff" stroke-width="2.6" stroke-linejoin="round" fill="rgba(168, 85, 247, 0.22)"/>
              <path d="M 8 -22 V -14 H 16" stroke="#e9d5ff" stroke-width="2.2" stroke-linejoin="round"/>
              <line x1="-10" y1="-9" x2="4" y2="-9" stroke="#f3e8ff" stroke-width="2.4" stroke-linecap="round"/>
              <line x1="-10" y1="-1" x2="10" y2="-1" stroke="#e9d5ff" stroke-width="2.4" stroke-linecap="round"/>
              <line x1="-10" y1="7" x2="10" y2="7" stroke="#e9d5ff" stroke-width="2.4" stroke-linecap="round"/>
              <line x1="-10" y1="15" x2="6" y2="15" stroke="#e9d5ff" stroke-width="2.4" stroke-linecap="round"/>
            </g>
          `
        },
        quote: {
          line1: "Policy",
          line2: "Creation",
          theme: "green",
          frontFill: "url(#fj-il-cube-green-front)",
          sideFill: "url(#fj-il-cube-green-side)",
          capFill: "#16a34a",
          borderStroke: "#4ade80",
          glowStroke: "#22c55e",
          lightBarColor: "#86efac",
          dotColor: "#dcfce7",
          iconSvg: `
            <g transform="translate(0, 0)" fill="none">
              <circle cx="0" cy="-1" r="19" fill="#86efac" stroke="#dcfce7" stroke-width="1.8"/>
              <path d="M -8 -1 L -2 5 L 9 -6" stroke="#064e3b" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
            </g>
          `
        },
        notify: {
          line1: "Customer",
          line2: "Notification",
          theme: "blue",
          frontFill: "url(#fj-il-cube-blue-front)",
          sideFill: "url(#fj-il-cube-blue-side)",
          capFill: "#0284c7",
          borderStroke: "#38bdf8",
          glowStroke: "#0ea5e9",
          lightBarColor: "#7dd3fc",
          dotColor: "#e0f2fe",
          iconSvg: `
            <g transform="translate(0, 0)" fill="none">
              <rect x="-19" y="-14" width="38" height="28" rx="3.5" fill="#7dd3fc" stroke="#e0f2fe" stroke-width="1.6"/>
              <path d="M -18 -12 L 0 2 L 18 -12" stroke="#0c4a6e" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M -18 12 L -6 1 M 18 12 L 6 1" stroke="#0284c7" stroke-width="2" stroke-linecap="round"/>
            </g>
          `
        }
      };

      // 5 Conveyor Cube Slot Positions along the 3D roller conveyor belt (x, y, width, height, sideDepth)
      const CUBE_SLOTS = [
        { x: 42, y: 184, w: 104, h: 132, depth: 20 },
        { x: 212, y: 180, w: 108, h: 132, depth: 22 },
        { x: 388, y: 174, w: 114, h: 134, depth: 24 },
        { x: 566, y: 178, w: 106, h: 128, depth: 22 },
        { x: 732, y: 180, w: 102, h: 124, depth: 20 }
      ];

      const renderConveyorCubeSvg = (stepId, slotIdx) => {
        const spec = CUBE_VISUAL_SPECS[stepId] || CUBE_VISUAL_SPECS.submission;
        const slot = CUBE_SLOTS[slotIdx];
        const def = WORKFLOW_STEP_DEFS[stepId];
        const isMovable = Boolean(def && !def.fixed);
        const isSwapSel = uiAnim.selectedSwapStepId === stepId;
        const isPacketActive = uiAnim.workflowPacketActiveStepId === stepId;
        const { x, y, w, h, depth } = slot;
        const cx = x + w / 2;
        const iconCy = y + h * 0.38;
        const line1Y = y + h - 34;
        const line2Y = y + h - 14;

        return `
          <g
            class="fj-workflow-node fj-il-conveyor-cube fj-workflow-node--${spec.theme}${isSwapSel ? " is-selected-swap" : ""}${isPacketActive ? " is-packet-active" : ""}"
            data-fj-action="${isMovable ? "cycle-workflow-step" : "workflow-action"}"
            data-workflow-cmd="${isMovable ? "" : "move"}"
            data-step-id="${stepId}"
            aria-label="${spec.line1} ${spec.line2}"
          >
            <!-- Top 3D Glowing Light-Bar Cap -->
            <polygon
              points="${x - depth * 0.45},${y - 8} ${x + w - depth * 0.55},${y - 8} ${x + w - 4},${y} ${x},${y}"
              fill="#0f172a"
              stroke="${spec.borderStroke}"
              stroke-width="1.5"
            />
            <rect
              x="${x + 6}"
              y="${y - 11}"
              width="${w - 22}"
              height="8"
              rx="3"
              fill="${spec.capFill}"
              stroke="${spec.lightBarColor}"
              stroke-width="1.2"
              filter="url(#fj-il-neon-glow)"
            />
            <!-- 3 Glowing Cap Segments -->
            <rect x="${x + 12}" y="${y - 9}" width="16" height="4" rx="1.5" fill="#ffffff" opacity="0.95"/>
            <rect x="${x + w * 0.4}" y="${y - 9}" width="18" height="4" rx="1.5" fill="#ffffff" opacity="0.95"/>
            <rect x="${x + w - 34}" y="${y - 9}" width="14" height="4" rx="1.5" fill="#ffffff" opacity="0.95"/>

            <!-- Left 3D Isometric Side Face -->
            <polygon
              points="${x - depth},${y + 7} ${x},${y} ${x},${y + h} ${x - depth},${y + h - 7}"
              fill="${spec.sideFill}"
              stroke="${spec.borderStroke}"
              stroke-width="1.6"
              stroke-linejoin="round"
            />
            <!-- Side Face Corner Rivets & Conduit Intake Socket -->
            <circle cx="${x - depth + 4}" cy="${y + 15}" r="1.5" fill="${spec.lightBarColor}" opacity="0.75"/>
            <circle cx="${x - depth + 4}" cy="${y + h - 15}" r="1.5" fill="${spec.lightBarColor}" opacity="0.75"/>
            <ellipse
              cx="${x - depth * 0.5}"
              cy="${y + h * 0.5}"
              rx="5"
              ry="11"
              fill="#090d16"
              stroke="${spec.borderStroke}"
              stroke-width="1.5"
            />

            <!-- Front Square Glowing Cube Face -->
            <rect
              class="fj-il-cube-front"
              x="${x}"
              y="${y}"
              width="${w}"
              height="${h}"
              rx="8"
              fill="${spec.frontFill}"
              stroke="${isSwapSel ? "#ffffff" : spec.borderStroke}"
              stroke-width="${isSwapSel || isPacketActive ? "3.2" : "2.4"}"
              filter="url(#fj-il-neon-glow)"
            />
            <!-- Inner Crisp Frame Highlight -->
            <rect
              x="${x + 4}"
              y="${y + 4}"
              width="${w - 8}"
              height="${h - 8}"
              rx="5"
              fill="none"
              stroke="${spec.lightBarColor}"
              stroke-width="0.9"
              opacity="0.55"
            />

            <!-- Top-Right Corner Status Indicator Badge -->
            <circle cx="${x + w - 12}" cy="${y + 13}" r="4" fill="${spec.dotColor}" stroke="${spec.borderStroke}" stroke-width="1.2"/>

            <!-- Center Glowing Workflow Icon -->
            <g transform="translate(${cx}, ${iconCy})">
              ${spec.iconSvg}
            </g>

            <!-- Two-Line Bold White Cube Label -->
            <text x="${cx}" y="${line1Y}" text-anchor="middle" fill="#ffffff" font-size="14" font-weight="800" font-family="Manrope, sans-serif">${spec.line1}</text>
            <text x="${cx}" y="${line2Y}" text-anchor="middle" fill="#ffffff" font-size="14" font-weight="800" font-family="Manrope, sans-serif">${spec.line2}</text>
          </g>
        `;
      };

      // Render a glowing neon horizontal arrow between two conveyor cubes
      const renderNeonArrowSvg = (x1, x2, cy, coreColor, glowColor) => {
        const tipX = x2;
        const shaftEnd = x2 - 6;
        return `
          <g class="fj-il-neon-arrow" filter="url(#fj-il-neon-glow)">
            <!-- Outer Neon Halo -->
            <line x1="${x1}" y1="${cy}" x2="${shaftEnd}" y2="${cy}" stroke="${glowColor}" stroke-width="9" stroke-linecap="round" opacity="0.65"/>
            <path d="M ${tipX - 15} ${cy - 11} L ${tipX} ${cy} L ${tipX - 15} ${cy + 11}" stroke="${glowColor}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.75"/>
            <!-- Bright White/Tinted Inner Core -->
            <line x1="${x1}" y1="${cy}" x2="${shaftEnd}" y2="${cy}" stroke="${coreColor}" stroke-width="4" stroke-linecap="round"/>
            <path d="M ${tipX - 14} ${cy - 10} L ${tipX} ${cy} L ${tipX - 14} ${cy + 10}" stroke="${coreColor}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </g>
        `;
      };

      const dockSystems = [
        {
          id: "portal",
          label: "Customer Portal",
          color: "blue",
          iconSvg: `
            <svg viewBox="0 0 48 42" fill="none" aria-hidden="true">
              <rect x="11" y="5" width="26" height="32" rx="4" fill="rgba(14, 165, 233, 0.22)" stroke="#38bdf8" stroke-width="2.4"/>
              <line x1="16" y1="13" x2="25" y2="13" stroke="#e0f2fe" stroke-width="2.2" stroke-linecap="round"/>
              <line x1="16" y1="19" x2="32" y2="19" stroke="#7dd3fc" stroke-width="2.2" stroke-linecap="round"/>
              <line x1="16" y1="25" x2="32" y2="25" stroke="#7dd3fc" stroke-width="2.2" stroke-linecap="round"/>
              <line x1="16" y1="31" x2="26" y2="31" stroke="#7dd3fc" stroke-width="2.2" stroke-linecap="round"/>
            </svg>
          `
        },
        {
          id: "acord",
          label: "Underwriting (ACORD)",
          color: "purple",
          iconSvg: `
            <svg viewBox="0 0 48 42" fill="none" aria-hidden="true">
              <path d="M 13 5 H 29 L 36 12 V 37 H 13 Z" fill="rgba(168, 85, 247, 0.22)" stroke="#c084fc" stroke-width="2.4" stroke-linejoin="round"/>
              <path d="M 29 5 V 12 H 36" stroke="#e9d5ff" stroke-width="2" stroke-linejoin="round"/>
              <line x1="18" y1="16" x2="27" y2="16" stroke="#f3e8ff" stroke-width="2" stroke-linecap="round"/>
              <line x1="18" y1="22" x2="31" y2="22" stroke="#e9d5ff" stroke-width="2" stroke-linecap="round"/>
              <line x1="18" y1="28" x2="31" y2="28" stroke="#e9d5ff" stroke-width="2" stroke-linecap="round"/>
            </svg>
          `
        },
        {
          id: "policy_admin",
          label: "Policy Admin",
          color: "green",
          iconSvg: `
            <svg viewBox="0 0 48 42" fill="none" aria-hidden="true">
              <rect x="12" y="5" width="24" height="32" rx="4" fill="rgba(34, 197, 94, 0.2)" stroke="#4ade80" stroke-width="2.4"/>
              <path d="M 24 12 L 17 15 V 21 C 17 26 20 29 24 31 C 28 29 31 26 31 21 V 15 Z" stroke="#bbf7d0" stroke-width="2" fill="rgba(74, 222, 128, 0.25)"/>
              <path d="M 21.5 21.5 L 23.5 23.5 L 27 19.5" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          `
        },
        {
          id: "claims",
          label: "Claims",
          color: "amber",
          iconSvg: `
            <svg viewBox="0 0 48 42" fill="none" aria-hidden="true">
              <rect x="12" y="5" width="24" height="32" rx="4" fill="rgba(245, 158, 11, 0.2)" stroke="#fbbf24" stroke-width="2.4"/>
              <path d="M 24 12 L 17 15 V 21 C 17 26 20 29 24 31 C 28 29 31 26 31 21 V 15 Z" stroke="#fef08a" stroke-width="2" fill="rgba(251, 191, 36, 0.25)"/>
              <circle cx="24" cy="21" r="2.2" fill="#fef08a"/>
            </svg>
          `
        },
        {
          id: "email",
          label: "Email / Communication",
          color: "blue",
          iconSvg: `
            <svg viewBox="0 0 48 42" fill="none" aria-hidden="true">
              <rect x="9" y="9" width="30" height="24" rx="4" fill="rgba(14, 165, 233, 0.24)" stroke="#38bdf8" stroke-width="2.4"/>
              <path d="M 11 12 L 24 22 L 37 12" stroke="#e0f2fe" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          `
        }
      ];

      return `
        <div class="fj-integration-scene--immersive">
          <!-- Speech Bubble Above Cube 1 (Matching Reference Image) -->
          <div class="fj-speech-bubble--integration-immersive" role="status" aria-live="polite">
            ${speechText}
          </div>

          <!-- Full-Scene 3D SVG: 5 Glowing Workflow Cubes on Conveyor Belt + Neon Arrows + Policy Completed Stand -->
          <svg
            class="fj-integration-3d-svg${uiAnim.workflowConnectorsDrawing ? " is-drawing" : ""}"
            viewBox="0 0 1040 515"
            preserveAspectRatio="none"
            aria-label="Integration Lab 5-stage automated workflow conveyor"
          >
            <defs>
              <!-- Blue Cube Gradients -->
              <linearGradient id="fj-il-cube-blue-front" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#0284c7" stop-opacity="0.95"/>
                <stop offset="55%" stop-color="#0369a1" stop-opacity="0.96"/>
                <stop offset="100%" stop-color="#082f49" stop-opacity="0.98"/>
              </linearGradient>
              <linearGradient id="fj-il-cube-blue-side" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#0369a1"/>
                <stop offset="100%" stop-color="#041e36"/>
              </linearGradient>

              <!-- Gold/Amber Cube Gradients -->
              <linearGradient id="fj-il-cube-amber-front" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#452706" stop-opacity="0.95"/>
                <stop offset="55%" stop-color="#291703" stop-opacity="0.96"/>
                <stop offset="100%" stop-color="#140b01" stop-opacity="0.98"/>
              </linearGradient>
              <linearGradient id="fj-il-cube-amber-side" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#78350f"/>
                <stop offset="100%" stop-color="#1c0d02"/>
              </linearGradient>

              <!-- Purple/Violet Cube Gradients -->
              <linearGradient id="fj-il-cube-purple-front" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#581c87" stop-opacity="0.94"/>
                <stop offset="55%" stop-color="#3b0764" stop-opacity="0.96"/>
                <stop offset="100%" stop-color="#1e0536" stop-opacity="0.98"/>
              </linearGradient>
              <linearGradient id="fj-il-cube-purple-side" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#6b21a8"/>
                <stop offset="100%" stop-color="#23063d"/>
              </linearGradient>

              <!-- Emerald Green Cube Gradients -->
              <linearGradient id="fj-il-cube-green-front" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#065f46" stop-opacity="0.95"/>
                <stop offset="55%" stop-color="#064e3b" stop-opacity="0.96"/>
                <stop offset="100%" stop-color="#022c22" stop-opacity="0.98"/>
              </linearGradient>
              <linearGradient id="fj-il-cube-green-side" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#047857"/>
                <stop offset="100%" stop-color="#02231b"/>
              </linearGradient>

              <filter id="fj-il-neon-glow" x="-25%" y="-25%" width="150%" height="150%">
                <feGaussianBlur stdDeviation="3.2" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            <!-- Incoming Paper Submission Sheet on Left Entering Cube 1 -->
            <g class="fj-il-incoming-doc" transform="translate(2, 236)">
              <polygon points="0,8 28,2 26,38 0,44" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.2"/>
              <line x1="4" y1="12" x2="21" y2="9" stroke="#0284c7" stroke-width="2.2"/>
              <line x1="4" y1="19" x2="22" y2="16" stroke="#38bdf8" stroke-width="1.8"/>
              <line x1="4" y1="25" x2="18" y2="22" stroke="#64748b" stroke-width="1.6"/>
              <path d="M 10 28 L 23 23" stroke="#0ea5e9" stroke-width="2.5" stroke-linecap="round"/>
            </g>

            <!-- 4 Glowing Neon Connector Arrows Between the 5 Conveyor Cubes -->
            ${renderNeonArrowSvg(146, 196, 250, "#fef08a", "#f59e0b")}
            ${renderNeonArrowSvg(320, 370, 246, "#f3e8ff", "#a855f7")}
            ${renderNeonArrowSvg(502, 550, 242, "#dcfce7", "#22c55e")}
            ${renderNeonArrowSvg(672, 718, 240, "#e0f2fe", "#0ea5e9")}

            <!-- 5 Glowing 3D Isometric Workflow Cubes on the Conveyor Belt -->
            ${orderedStepIds.map((stepId, idx) => renderConveyorCubeSvg(stepId, idx)).join("")}

            <!-- Right-Hand Conveyor Output Sheet & "Policy Completed!" Display Card -->
            <g
              class="fj-il-policy-completed-stand"
              data-fj-action="workflow-action"
              data-workflow-cmd="test_flow"
              style="cursor: pointer;"
              role="button"
              aria-label="Policy Completed - Click to run and verify workflow"
            >
              <!-- Printed Policy Sheet Flat on Secondary Conveyor Rollers -->
              <polygon
                points="852,244 918,240 932,286 864,292"
                fill="#f8fafc"
                stroke="#cbd5e1"
                stroke-width="1.4"
              />
              <line x1="861" y1="252" x2="890" y2="250" stroke="#0284c7" stroke-width="3"/>
              <rect x="900" y="246" width="11" height="6" rx="1" fill="#f59e0b"/>
              <line x1="863" y1="261" x2="912" y2="258" stroke="#64748b" stroke-width="1.8"/>
              <line x1="865" y1="268" x2="914" y2="265" stroke="#94a3b8" stroke-width="1.6"/>
              <line x1="867" y1="275" x2="903" y2="273" stroke="#38bdf8" stroke-width="2"/>

              <!-- Upright Angled "Policy Completed!" Card on Display Stand -->
              <polygon
                points="938,246 1030,252 1034,348 946,342"
                fill="#ffffff"
                stroke="${isCompleted ? "#22c55e" : "#cbd5e1"}"
                stroke-width="2"
              />
              <!-- Gold Header Strip on Card -->
              <polygon points="938,246 1030,252 1030,263 939,257" fill="#f59e0b"/>
              <rect x="943" y="249" width="10" height="5" rx="1" fill="#fef08a"/>
              <rect x="1015" y="253" width="10" height="7" rx="1" fill="#b45309"/>

              <!-- "Policy Completed!" Title -->
              <text x="986" y="280" text-anchor="middle" fill="#0f172a" font-size="13.5" font-weight="800" font-family="Manrope, sans-serif">Policy</text>
              <text x="987" y="296" text-anchor="middle" fill="#0f172a" font-size="13" font-weight="800" font-family="Manrope, sans-serif">Completed!</text>

              <!-- Green Checkmark Circle -->
              <circle cx="989" cy="321" r="16" fill="#22c55e" stroke="#86efac" stroke-width="1.8"/>
              <path d="M 981 321 L 986.5 326.5 L 997.5 314.5" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            </g>
          </svg>

          <!-- Bottom-Center 5-Item Integration Systems Dock (Matching Reference Image) -->
          <div class="fj-il-immersive-dock" role="group" aria-label="Integration Lab enterprise systems dock">
            ${dockSystems
              .map(
                (sys) => `
              <button
                type="button"
                class="fj-il-dock-slot fj-il-dock-slot--${sys.color}"
                data-fj-action="workflow-system"
                data-sys-id="${sys.id}"
                draggable="true"
                aria-label="${sys.label}"
              >
                <span class="fj-il-dock-slot__icon">${sys.iconSvg}</span>
                <span class="fj-il-dock-slot__label">${
                  sys.id === "acord" ? "Underwriting<br>(ACORD)" : sys.label
                }</span>
              </button>
            `
              )
              .join("")}
          </div>

          <!-- Compact Corner Utility Controls -->
          <div class="fj-workshop-mini-controls">
            <button type="button" class="fj-workshop-mini-btn" data-fj-action="reset" data-stage-id="4">Reset</button>
            ${isCompleted ? `<button type="button" class="fj-workshop-mini-btn" data-fj-action="next-stage" data-target-stage="5">Next →</button>` : ""}
          </div>
        </div>
      `;
    }

    function renderStage5Body(st) {
      const rs = st.data.ringStations;
      const verified = st.status === "success";
      const dataTools = [
        { id: "context_rag", label: "Your Documents (Portfolio, Resume, Blog)" },
        { id: "context_engineering", label: "Web Search" },
        { id: "prompting", label: "Industry Docs (CSIO, ACORD, etc.)" },
        { id: "routing", label: "Model Selection (OpenRouter)" },
        { id: "evals", label: "Evaluation Suite" },
        { id: "traces", label: "Trace Viewer" }
      ];

      function isTuned(key) {
        const s = rs[key];
        return Boolean(s && (s.status === "configured" || s.status === "verified"));
      }

      const tunedCount = ["prompting", "context_engineering", "context_rag", "routing", "evals", "traces"].filter(isTuned).length;
      const evalScorePct = uiAnim.aiEvalLiveScore !== null
        ? uiAnim.aiEvalLiveScore
        : verified
        ? 98
        : Math.min(96, 46 + tunedCount * 8);

      function renderStationButtonHtml(stationId, colorClass, titleText, bulletsText) {
        const tuned = isTuned(stationId);
        const waveActive = uiAnim.aiActiveWaveStationId === stationId;
        return `
          <button
            type="button"
            class="fj-station-card fj-station-card--${colorClass}${tuned ? " is-tuned" : ""}${waveActive ? " is-wave-active" : ""}"
            data-fj-action="configure-ai"
            data-station-id="${stationId}"
          >
            <span class="fj-station-card__status-dot" aria-hidden="true"></span>
            <span class="fj-station-card__title">${titleText}</span>
            <span class="fj-station-card__bullets">${bulletsText}</span>
          </button>
        `;
      }

      return `
        <div class="fj-ailab-layout">
          <div class="fj-ailab-canvas" role="group" aria-label="AI Engineering 6-Station Circular Feedback Loop">
            <!-- Curved Neon Feedback Ring Arrows + Radial Spokes into Central AI Robot -->
            <svg class="fj-ailab-ring-svg" viewBox="0 0 800 440" preserveAspectRatio="none" aria-hidden="true">
              <!-- Radial Data Spokes from each station into the central AI Robot core (cx=400, cy=225) -->
              <line class="fj-ailab-spoke${isTuned("context_engineering") ? " is-tuned" : ""}" x1="165" y1="95" x2="365" y2="210" stroke="#38bdf8" stroke-width="2.5"/>
              <line class="fj-ailab-spoke${isTuned("prompting") ? " is-tuned" : ""}" x1="400" y1="88" x2="400" y2="195" stroke="#c084fc" stroke-width="2.5"/>
              <line class="fj-ailab-spoke${isTuned("traces") ? " is-tuned" : ""}" x1="635" y1="95" x2="435" y2="210" stroke="#c084fc" stroke-width="2.5"/>
              <line class="fj-ailab-spoke${isTuned("context_rag") ? " is-tuned" : ""}" x1="165" y1="355" x2="365" y2="245" stroke="#4ade80" stroke-width="2.5"/>
              <line class="fj-ailab-spoke${isTuned("routing") ? " is-tuned" : ""}" x1="400" y1="355" x2="400" y2="265" stroke="#f59e0b" stroke-width="2.5"/>
              <line class="fj-ailab-spoke${isTuned("evals") ? " is-tuned" : ""}" x1="635" y1="355" x2="435" y2="245" stroke="#fb7185" stroke-width="2.5"/>

              <!-- Outer Circular Ring Arcs around the 6 stations -->
              <path d="M 195 102 A 230 140 0 0 1 285 62" stroke="#38bdf8" stroke-width="5" stroke-linecap="round" fill="none" filter="url(#sr-neon-glow)"/>
              <path class="fj-ailab-orbit-flow" d="M 195 102 A 230 140 0 0 1 285 62" stroke="#e0f2fe" stroke-width="2.4" stroke-linecap="round" fill="none"/>

              <path d="M 515 62 A 230 140 0 0 1 605 102" stroke="#c084fc" stroke-width="5" stroke-linecap="round" fill="none" filter="url(#sr-neon-glow)"/>
              <path class="fj-ailab-orbit-flow" d="M 515 62 A 230 140 0 0 1 605 102" stroke="#f3e8ff" stroke-width="2.4" stroke-linecap="round" fill="none"/>

              <path d="M 665 185 A 160 140 0 0 1 665 295" stroke="#c084fc" stroke-width="5" stroke-linecap="round" fill="none" filter="url(#sr-neon-glow)"/>
              <path class="fj-ailab-orbit-flow" d="M 665 185 A 160 140 0 0 1 665 295" stroke="#f3e8ff" stroke-width="2.4" stroke-linecap="round" fill="none"/>

              <path d="M 515 375 A 220 120 0 0 0 585 352" stroke="#f59e0b" stroke-width="5" stroke-linecap="round" fill="none" filter="url(#sr-neon-glow)"/>
              <path class="fj-ailab-orbit-flow" d="M 515 375 A 220 120 0 0 0 585 352" stroke="#fef3c7" stroke-width="2.4" stroke-linecap="round" fill="none"/>

              <path d="M 215 352 A 220 120 0 0 0 285 375" stroke="#4ade80" stroke-width="5" stroke-linecap="round" fill="none" filter="url(#sr-neon-glow)"/>
              <path class="fj-ailab-orbit-flow" d="M 215 352 A 220 120 0 0 0 285 375" stroke="#dcfce7" stroke-width="2.4" stroke-linecap="round" fill="none"/>

              <path d="M 135 185 A 160 140 0 0 0 135 295" stroke="#22d3ee" stroke-width="5" stroke-linecap="round" fill="none" filter="url(#sr-neon-glow)"/>
              <path class="fj-ailab-orbit-flow" d="M 135 185 A 160 140 0 0 0 135 295" stroke="#cffafe" stroke-width="2.4" stroke-linecap="round" fill="none"/>
            </svg>

            <!-- Top Row: 2. Context Engineering | 1. Prompting | 6. Traces -->
            <div class="fj-ai-node fj-ai-node--pos-ctx">
              ${renderStationButtonHtml("context_engineering", "cyan", "2. Context Engineering", "Relevant data · Remove noise · Right scope")}
            </div>

            <div class="fj-ai-node fj-ai-node--pos-prompt">
              ${renderStationButtonHtml("prompting", "purple", "1. Prompting", "Clear intent · Constraints · Output format")}
            </div>

            <div class="fj-ai-node fj-ai-node--pos-traces">
              ${renderStationButtonHtml("traces", "purple", "6. Traces", "Observe execution · Find issues · Improve loop")}
            </div>

            <!-- Center Hub: Chibi AI Robot + Live Eval Telemetry + Glowing RUN Button -->
            <div class="fj-robot-hub">
              <div class="fj-robot-spacer" aria-hidden="true"></div>
              <div class="fj-ai-eval-hud${verified || tunedCount === 6 ? " is-verified" : ""}">
                Eval Readiness: ${evalScorePct}% · ${tunedCount}/6 Stations Online
              </div>
              <button type="button" class="fj-run-core-btn${verified ? " is-verified" : ""}" data-fj-action="run-ai-loop">RUN</button>
            </div>

            <!-- Bottom Row: 3. RAG | 4. Routing | 5. Evals -->
            <div class="fj-ai-node fj-ai-node--pos-rag">
              ${renderStationButtonHtml("context_rag", "emerald", "3. RAG", "Knowledge sources · Chunking · Citations")}
            </div>

            <div class="fj-ai-node fj-ai-node--pos-routing">
              ${renderStationButtonHtml("routing", "amber", "4. Routing", "Choose best model · Fast vs quality")}
            </div>

            <div class="fj-ai-node fj-ai-node--pos-evals">
              ${renderStationButtonHtml("evals", "coral", "5. Evals", "Test quality · Correctness · Safety checks")}
            </div>
          </div>

          <aside class="fj-side-drawer" aria-label="AI Lab Data and Tools">
            <h4 class="fj-side-drawer__heading">DATA &amp; TOOLS</h4>
            ${dataTools.map((dt) => {
              const s = rs[dt.id];
              const tuned = s && (s.status === "configured" || s.status === "verified");
              return `
                <button
                  type="button"
                  class="fj-tool-btn${tuned ? " is-correct" : ""}"
                  data-fj-action="configure-ai"
                  data-station-id="${dt.id}"
                  draggable="true"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 12 2.5 2.5L16 9"/></svg>
                  <span>${dt.label}</span>
                </button>
              `;
            }).join("")}
          </aside>
        </div>
      `;
    }

    function renderStage6Body(_st) {
      return `
        <div class="fj-contact-layout">
          <div class="fj-rooftop-callout">
            <div class="fj-speech-bubble fj-speech-bubble--rooftop">
              You solved real problems across hardware, support, infrastructure, integration, and AI — the same curiosity that started with taking things apart.
            </div>
          </div>
          <div class="fj-contact-card">
            <div>
              <h4 class="fj-contact-card__title">Let's build something great together.</h4>
              <p class="fj-contact-card__copy">Whether it's a role, a project, or just a conversation — I'd love to hear from you.</p>
            </div>
            <div data-fj-contact-form-slot></div>
            <div class="fj-social-row" role="group" aria-label="Direct contact channels and replay">
              <a class="fj-social-chip" href="https://www.linkedin.com/in/josh-boyer-1b770618/" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.5 8.5h-3v11h3v-11ZM5 7a1.75 1.75 0 1 1 0-3.5A1.75 1.75 0 0 1 5 7Zm6.5 12.5h-3v-11h2.9v1.5h.1c.4-.8 1.5-1.7 3.1-1.7 3.3 0 3.9 2.2 3.9 5v6.2h-3v-5.5c0-1.3 0-3-1.8-3s-2.2 1.4-2.2 2.9v5.6Z"/></svg>
                <span>LinkedIn</span>
              </a>
              <a class="fj-social-chip" href="https://github.com/joshboyer" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.58 9.58 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.75c0 .26.18.58.69.48A10 10 0 0 0 12 2Z"/></svg>
                <span>GitHub</span>
              </a>
              <a class="fj-social-chip" href="mailto:josh@joshboyer.ca">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
                <span>Email</span>
              </a>
              <button type="button" class="fj-social-chip" data-fj-action="play-again">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
                <span>Play Again</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }

    function getStageInstruction(st) {
      if (st.activeHint) return { text: "Hint: " + st.activeHint, cls: "is-warning" };
      if (st.status === "success") return { text: st.completionInsight, cls: "is-success" };
      if (st.id === 2 && st.data.lastDiagnosisFeedback) {
        return { text: st.data.lastDiagnosisFeedback, cls: st.errors > 0 ? "is-warning" : "" };
      }
      if (st.id === 4 && st.data.lastRun && !st.data.lastRun.passed) {
        return { text: st.data.lastRun.errorMessage, cls: "is-warning" };
      }
      if (st.id === 5 && st.data.lastLoopResult && !st.data.lastLoopResult.passed) {
        return { text: st.data.lastLoopResult.evalScores.reason, cls: "is-warning" };
      }
      return { text: STAGE_CATALOG[st.id].defaultInstruction, cls: "" };
    }

    function renderAll() {
      const state = session.getState();

      // Detach live #home-connect-form before re-rendering so we never lose user input
      if (existingForm && existingForm.parentElement) {
        existingForm.parentElement.removeChild(existingForm);
      }

      wrapper.innerHTML = `
        ${renderSharedSvgDefs()}
        <div class="footer-journey__shell">
          <!-- Top Banner matching Reference Screenshot -->
          <header class="fj-banner">
            <div class="fj-banner__brand">
              <h2 class="fj-banner__title">
                <span>FROM THE</span>
                <span class="fj-banner__title-amber">METAL</span>
                <span>TO THE</span>
                <span class="fj-banner__title-cyan">
                  <span>CLOUD</span>
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 19H7a5 5 0 0 1-.5-9.97A6.5 6.5 0 0 1 19.3 11a4 4 0 0 1-1.8 8Z"/></svg>
                </span>
              </h2>
              <p class="fj-banner__subtitle">A 60-SECOND INTERACTIVE JOURNEY THROUGH MY CAREER</p>
            </div>

            <ol class="fj-stepper" aria-label="Career journey stages">
              ${STAGE_IDS.map((id) => {
                const st = state.stages[id];
                const cat = STAGE_CATALOG[id];
                const isActive = state.currentStage === id;
                const isComplete = st.status === "success";
                return `
                  <li class="fj-stepper__item${isActive ? " is-active" : ""}${isComplete ? " is-complete" : ""}">
                    <button type="button" class="fj-stepper__btn" data-fj-action="select-stage" data-stage-id="${id}" aria-current="${isActive ? "step" : "false"}">
                      <span class="fj-stepper__node">${renderStepperIcon(id)}</span>
                      <span>${cat.stepLabel}</span>
                    </button>
                  </li>
                `;
              }).join("")}
            </ol>

            <div class="fj-banner__meta">
              <div class="fj-banner__top-row">
                <p class="fj-banner__tagline">"Same curiosity.<br>Bigger possibilities."</p>
                <div class="fj-monogram" aria-hidden="true">JB<span>.</span></div>
              </div>
              <div class="fj-banner__controls">
                <button type="button" class="fj-utility-btn" data-fj-action="skip-to-contact">
                  <span>Skip to Contact →</span>
                </button>
                <button type="button" class="fj-utility-btn" data-fj-action="toggle-mute" aria-pressed="${!state.muted}">
                  <span>Sound: ${state.muted ? "Off" : "On"}</span>
                </button>
              </div>
            </div>
          </header>

          <!-- Single-Challenge Stage Viewport (progresses 1 -> 6 one challenge at a time) -->
          <div class="fj-grid" data-view-mode="${state.viewMode}">
            ${STAGE_IDS.map((id) => {
              const st = state.stages[id];
              const isCurrent = state.currentStage === id;
              const isDone = st.status === "success";
              const info = getStageInstruction(st);
              let bodyHtml = "";
              if (id === 1) bodyHtml = renderStage1Body(st);
              if (id === 2) bodyHtml = renderStage2Body(st);
              if (id === 3) bodyHtml = renderStage3Body(st);
              if (id === 4) bodyHtml = renderStage4Body(st);
              if (id === 5) bodyHtml = renderStage5Body(st);
              if (id === 6) bodyHtml = renderStage6Body(st);

              return `
                <article
                  class="fj-panel${isCurrent ? " is-active is-expanded" : ""}${isDone ? " is-complete" : ""}"
                  data-stage="${id}"
                  ${!isCurrent && state.viewMode === "focused" ? "hidden" : ""}
                  aria-labelledby="fj-stage-${id}-title"
                >
                  ${renderPanelHeaderHtml(st)}
                  <div class="fj-panel__stage">
                    ${bodyHtml}
                  </div>
                  ${renderPanelFooterHtml(st, info.text, info.cls)}
                </article>
              `;
            }).join("")}
          </div>
        </div>
      `;

      // Re-mount the live #home-connect-form into Panel 6
      const slot = wrapper.querySelector("[data-fj-contact-form-slot]");
      if (slot && existingForm) {
        if (!existingForm.querySelector("[data-contact-honeypot]")) {
          const hp = document.createElement("input");
          hp.type = "text";
          hp.name = "website";
          hp.tabIndex = -1;
          hp.autocomplete = "off";
          hp.setAttribute("data-contact-honeypot", "true");
          hp.style.position = "absolute";
          hp.style.left = "-9999px";
          hp.style.opacity = "0";
          hp.setAttribute("aria-hidden", "true");
          existingForm.appendChild(hp);
        }
        slot.appendChild(existingForm);
      }
    }

    renderAll();


    function installWorkshopPartFromUi(partId, sourceEl) {
      if (!partId) return;
      const slotIndex = CANONICAL_WORKSHOP_ORDER.indexOf(partId);
      if (slotIndex < 0) return;
      const st1 = session.getState().stages[1];
      if (st1.data.slots[slotIndex] === partId) return;

      if (sourceEl) {
        const targetPenZone =
          wrapper.querySelector(`.fj-pencil-drop-zone[data-slot-index="${slotIndex}"]`) ||
          wrapper.querySelector(`[data-fj-action="place-slot"][data-slot-index="${slotIndex}"]`);
        const partSpec = WORKSHOP_PARTS.find((p) => p.id === partId);
        animateFlyingClone(
          sourceEl,
          targetPenZone,
          `${renderPartIconSvg(partId)}<span>${partSpec ? partSpec.label : partId}</span>`,
          360
        );
      }

      const res = session.placeWorkshopPart({ partId, slotIndex });
      sound.playTone(res.ok ? "success" : "error");
      renderAll();
      if (res.code === "WORKSHOP_COMPLETED") scheduleAutoAdvanceIfSolved(1, 2400);
    }

    // Event Delegation for all 6 game challenges
    wrapper.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-fj-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-fj-action");

      if (action === "select-stage") {
        if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
        const stageId = Number(btn.getAttribute("data-stage-id"));
        session.startStage({ stageId });
        sound.playTone("tap");
        renderAll();
      } else if (action === "next-stage") {
        if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
        const targetStageId = Number(btn.getAttribute("data-target-stage"));
        session.advanceStage({ targetStageId });
        sound.playTone("tap");
        renderAll();
      } else if (action === "toggle-view") {
        const cur = session.getState().viewMode;
        session.setViewPreferences({ viewMode: cur === "focused" ? "grid" : "focused" });
        renderAll();
      } else if (action === "toggle-mute") {
        const cur = session.getState().muted;
        session.setViewPreferences({ muted: !cur });
        sound.playTone("tap");
        renderAll();
      } else if (action === "skip-to-contact") {
        if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
        session.skipToContact({ reason: "banner_button" });
        renderAll();
        const nameInput = wrapper.querySelector("[data-contact-name]");
        if (nameInput) nameInput.focus();
      } else if (action === "play-again") {
        if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
        uiAnim.placedServerSegments = {};
        uiAnim.pipeDreamBoard = createEmptyPipeDreamBoard();
        uiAnim.pipeDreamFlowActive = false;
        uiAnim.selectedSwapStepId = null;
        uiAnim.workflowPacketActiveStepId = null;
        uiAnim.aiActiveWaveStationId = null;
        uiAnim.aiEvalLiveScore = null;
        session.resetAll({});
        sound.playTone("tap");
        renderAll();
      } else if (action === "hint") {
        const stageId = Number(btn.getAttribute("data-stage-id"));
        session.requestHint({ stageId });
        sound.playTone("tap");
        renderAll();
      } else if (action === "reset") {
        if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
        const stageId = Number(btn.getAttribute("data-stage-id"));
        if (stageId === 3) {
          uiAnim.placedServerSegments = {};
          uiAnim.pipeDreamBoard = createEmptyPipeDreamBoard();
          uiAnim.pipeDreamFlowActive = false;
        }
        uiAnim.selectedSwapStepId = null;
        uiAnim.workflowPacketActiveStepId = null;
        uiAnim.aiActiveWaveStationId = null;
        uiAnim.aiEvalLiveScore = null;
        session.resetStage({ stageId });
        sound.playTone("tap");
        renderAll();
      } else if (action === "run-pipe-flow") {
        if (!uiAnim.pipeDreamBoard) {
          uiAnim.pipeDreamBoard = createEmptyPipeDreamBoard();
        }
        uiAnim.pipeDreamFlowActive = true;
        const flowEval = evaluatePipeDreamBoard(uiAnim.pipeDreamBoard, true);
        let lastRes = null;
        if (flowEval.allFourConnected) {
          const grid = session.getState().stages[3].data.grid;
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 4; c++) {
              const cell = grid[r][c];
              const diff = (((cell.solutionRotation - cell.rotation) % 360) + 360) % 360;
              if (diff > 0) {
                lastRes = session.rotateServerPipe({ row: r, col: c, turns: diff / 90 });
              }
            }
          }
        }
        sound.playTone(flowEval.allFourConnected ? "success" : "error");
        renderAll();
        if (flowEval.allFourConnected || (lastRes && lastRes.code === "SERVER_ROOM_COMPLETED")) {
          scheduleAutoAdvanceIfSolved(3, 2200);
        }
      } else if (
        action === "select-or-place-part" ||
        action === "place-slot" ||
        action === "plug-cable-socket" ||
        action === "rotate-pipe" ||
        action === "install-rack-pipe"
      ) {
        // Parts, cables, and pipes must be dragged and dropped — never auto-placed on click or double-click
        return;
      } else if (action === "helpdesk-screen-cmd") {
        const termInput = wrapper.querySelector("[data-fj-terminal-input]");
        const typedVal = termInput && termInput.value.trim()
          ? termInput.value.trim()
          : 'icacls "\\\\SERVER\\\\Shared\\\\MEETING_DECK.pptx" /grant User:(R,W)';
        uiAnim.terminalTypedCmd = typedVal;
        const res = session.applyHelpdeskTool({ toolId: "permissions" });
        sound.playTone(res.ok ? (res.code === "HELPDESK_COMPLETED" ? "success" : "tap") : "error");
        renderAll();
        if (res.code === "HELPDESK_COMPLETED") scheduleAutoAdvanceIfSolved(2, 1650);
      } else if (action === "helpdesk-autotype-cmd") {
        const fullCmd = 'icacls "\\\\SERVER\\\\Shared\\\\MEETING_DECK.pptx" /grant User:(R,W)';
        const termInput = wrapper.querySelector("[data-fj-terminal-input]");
        if (termInput && !isReducedMotionActive()) {
          let i = 0;
          const stepChars = 6;
          const typeTimer = setInterval(() => {
            i = Math.min(fullCmd.length, i + stepChars);
            uiAnim.terminalTypedCmd = fullCmd.slice(0, i);
            const liveInput = wrapper.querySelector("[data-fj-terminal-input]");
            if (liveInput) liveInput.value = uiAnim.terminalTypedCmd;
            if (i >= fullCmd.length) {
              clearInterval(typeTimer);
              const res = session.applyHelpdeskTool({ toolId: "permissions" });
              sound.playTone(res.ok ? "success" : "error");
              renderAll();
              if (res.code === "HELPDESK_COMPLETED") scheduleAutoAdvanceIfSolved(2, 1650);
            }
          }, 28);
        } else {
          uiAnim.terminalTypedCmd = fullCmd;
          const res = session.applyHelpdeskTool({ toolId: "permissions" });
          sound.playTone(res.ok ? "success" : "error");
          renderAll();
          if (res.code === "HELPDESK_COMPLETED") scheduleAutoAdvanceIfSolved(2, 1650);
        }
      } else if (action === "helpdesk-tool") {
        const toolId = btn.getAttribute("data-tool-id");
        // Physical rear cables must be dragged into the back of the PC, not auto-plugged on click
        if (HELPDESK_REQUIRED_CABLES.includes(toolId)) {
          return;
        }
        const res = session.applyHelpdeskTool({ toolId });
        sound.playTone(res.ok ? (res.code === "HELPDESK_COMPLETED" ? "success" : "tap") : "error");
        renderAll();
        if (!res.ok) {
          const alertAfter = wrapper.querySelector(".fj-alert-pill, .fj-hd-access-modal");
          if (alertAfter) alertAfter.classList.add("fj-is-shaking");
        }
        if (res.code === "HELPDESK_COMPLETED") scheduleAutoAdvanceIfSolved(2, 1650);
      } else if (action === "cycle-workflow-step") {
        const clickedStepId = btn.getAttribute("data-step-id");
        const prevRects = captureWorkflowNodeRects();
        const st4 = session.getState().stages[4];
        const curMid = st4.data.middleStepIds.slice();

        if (uiAnim.selectedSwapStepId && uiAnim.selectedSwapStepId !== clickedStepId) {
          const idxB = curMid.indexOf(clickedStepId);
          if (idxB >= 0) {
            session.moveWorkflowStep({ stepId: uiAnim.selectedSwapStepId, targetIndex: idxB });
          }
          uiAnim.selectedSwapStepId = null;
        } else if (curMid.join(",") !== WORKFLOW_CANONICAL_MIDDLE.join(",")) {
          // Swap the clicked card toward its canonical slot (or sort canonical so 1 click works for tests & quick play)
          session.toggleWorkflowAction({ actionType: "sort_canonical" });
          uiAnim.selectedSwapStepId = null;
        } else {
          uiAnim.selectedSwapStepId = uiAnim.selectedSwapStepId === clickedStepId ? null : clickedStepId;
        }
        uiAnim.workflowConnectorsDrawing = true;
        sound.playTone("tap");
        renderAll();
        playFlipWorkflowNodes(prevRects);
        setTimeout(() => {
          uiAnim.workflowConnectorsDrawing = false;
        }, 600);
      } else if (action === "workflow-system") {
        const sysId = btn.getAttribute("data-sys-id");
        const sysToStep = {
          portal: "submission",
          acord: "validate",
          policy_admin: "quote",
          claims: "risk_review",
          email: "notify"
        };
        const targetStepId = sysToStep[sysId] || "validate";
        const targetNode = wrapper.querySelector(`.fj-workflow-node[data-step-id="${targetStepId}"]`);
        animateFlyingClone(btn, targetNode, btn.innerHTML, 380);
        session.toggleWorkflowAction({ actionType: "sort_canonical" });
        if (sysId === "acord") {
          session.toggleWorkflowAction({ stepId: "validate", ruleOptionId: "acord_schema_check" });
        }
        sound.playTone("tap");
        renderAll();
      } else if (action === "workflow-action") {
        const cmd = btn.getAttribute("data-workflow-cmd");
        if (cmd === "move" || cmd === "connect" || cmd === "delete") {
          const prevRects = captureWorkflowNodeRects();
          session.toggleWorkflowAction({ actionType: "sort_canonical" });
          uiAnim.selectedSwapStepId = null;
          uiAnim.workflowConnectorsDrawing = true;
          sound.playTone("tap");
          renderAll();
          playFlipWorkflowNodes(prevRects);
          setTimeout(() => {
            uiAnim.workflowConnectorsDrawing = false;
          }, 600);
          return;
        } else if (cmd === "add_rule") {
          const validateNode = wrapper.querySelector(`.fj-workflow-node[data-step-id="validate"]`);
          animateFlyingClone(btn, validateNode, `<span>ACORD XML Schema [OK]</span>`, 380);
          session.toggleWorkflowAction({ stepId: "validate", ruleOptionId: "acord_schema_check" });
          sound.playTone("tap");
          renderAll();
          return;
        } else if (cmd === "test_flow") {
          const st4Now = session.getState().stages[4];
          if (
            st4Now &&
            st4Now.data.middleStepIds.join(",") === WORKFLOW_CANONICAL_MIDDLE.join(",") &&
            st4Now.data.stepConfigs &&
            st4Now.data.stepConfigs.validate &&
            st4Now.data.stepConfigs.validate.ruleOptionId !== "acord_schema_check"
          ) {
            session.toggleWorkflowAction({ stepId: "validate", ruleOptionId: "acord_schema_check" });
          }
          const res = session.runWorkflow({});
          sound.playTone(res.ok ? "success" : "error");
          renderAll();
          if (res.ok && !isReducedMotionActive()) {
            const seq = ["submission", "validate", "risk_review", "quote", "notify"];
            seq.forEach((stepId, idx) => {
              setTimeout(() => {
                uiAnim.workflowPacketActiveStepId = stepId;
                renderAll();
              }, idx * 210);
            });
            setTimeout(() => {
              uiAnim.workflowPacketActiveStepId = null;
              renderAll();
            }, seq.length * 210 + 120);
            if (res.code === "WORKFLOW_COMPLETED") scheduleAutoAdvanceIfSolved(4, 2100);
          } else {
            if (!res.ok && res.failedAtStepId) {
              const failedNode = wrapper.querySelector(`.fj-workflow-node[data-step-id="${res.failedAtStepId}"]`);
              if (failedNode) failedNode.classList.add("fj-is-shaking");
            }
            if (res.code === "WORKFLOW_COMPLETED") scheduleAutoAdvanceIfSolved(4, 1550);
          }
          return;
        }
        renderAll();
      } else if (action === "configure-ai") {
        const stationId = btn.getAttribute("data-station-id");
        const targetStationCard = wrapper.querySelector(`.fj-station-card[data-station-id="${stationId}"]`);
        if (btn.classList.contains("fj-tool-btn") && targetStationCard) {
          animateFlyingClone(btn, targetStationCard, btn.innerHTML, 360);
        } else {
          const robotHub = wrapper.querySelector(".fj-robot-hub");
          animateFlyingClone(btn, robotHub, `<span>${stationId.replace(/_/g, " ").toUpperCase()} [OK]</span>`, 340);
        }
        session.configureAiStation({ stationId });
        sound.playTone("tap");
        renderAll();
      } else if (action === "run-ai-loop") {
        const res = session.runAiLoop({});
        sound.playTone(res.ok ? "success" : "error");
        renderAll();
        if (res.ok && !isReducedMotionActive()) {
          const waveOrder = ["prompting", "context_engineering", "context_rag", "routing", "evals", "traces"];
          waveOrder.forEach((stId, idx) => {
            setTimeout(() => {
              uiAnim.aiActiveWaveStationId = stId;
              uiAnim.aiEvalLiveScore = Math.min(98, 68 + (idx + 1) * 5);
              renderAll();
            }, idx * 175);
          });
          setTimeout(() => {
            uiAnim.aiActiveWaveStationId = null;
            uiAnim.aiEvalLiveScore = 98;
            renderAll();
          }, waveOrder.length * 175 + 120);
          if (res.code === "AI_LOOP_COMPLETED") scheduleAutoAdvanceIfSolved(5, 2200);
        } else {
          if (res.code === "AI_LOOP_COMPLETED") scheduleAutoAdvanceIfSolved(5, 1550);
        }
      }
    });

    // Monitor screen command prompt Enter key handler
    wrapper.addEventListener("keydown", (ev) => {
      const termInput = ev.target.closest("[data-fj-terminal-input]");
      if (termInput && ev.key === "Enter") {
        ev.preventDefault();
        uiAnim.terminalTypedCmd = termInput.value.trim() || 'icacls "\\\\SERVER\\\\Shared\\\\MEETING_DECK.pptx" /grant User:(R,W)';
        const res = session.applyHelpdeskTool({ toolId: "permissions" });
        sound.playTone(res.ok ? (res.code === "HELPDESK_COMPLETED" ? "success" : "tap") : "error");
        renderAll();
        if (res.code === "HELPDESK_COMPLETED") scheduleAutoAdvanceIfSolved(2, 1650);
      }
    });

    // Live SVG Cable Cord overlay when dragging a cable from the bottom dock to the back of the PC
    let dragPayload = null;
    let liveCableSvgEl = null;
    let dragOriginPoint = null;

    function removeLiveCableSvg() {
      if (liveCableSvgEl && liveCableSvgEl.parentNode) {
        liveCableSvgEl.parentNode.removeChild(liveCableSvgEl);
      }
      liveCableSvgEl = null;
      dragOriginPoint = null;
    }

    function updateLiveCableSvg(clientX, clientY) {
      if (!dragOriginPoint || !clientX || !clientY) return;
      if (!liveCableSvgEl) {
        liveCableSvgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        liveCableSvgEl.setAttribute("class", "fj-live-cable-drag-svg");
        document.body.appendChild(liveCableSvgEl);
      }
      const x1 = dragOriginPoint.x;
      const y1 = dragOriginPoint.y;
      const x2 = clientX;
      const y2 = clientY;
      const cy1 = y1 - Math.max(40, (y1 - y2) * 0.45);
      const cy2 = y2 + Math.max(30, (y1 - y2) * 0.25);
      liveCableSvgEl.innerHTML = `
        <path d="M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}" fill="none" stroke="#0ea5e9" stroke-width="6" stroke-linecap="round"/>
        <path d="M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}" fill="none" stroke="#bae6fd" stroke-width="2.2" stroke-dasharray="10 8" stroke-linecap="round"/>
        <rect x="${x2 - 11}" y="${y2 - 8}" width="22" height="16" rx="3" fill="#e2e8f0" stroke="#fbbf24" stroke-width="1.5"/>
      `;
    }

    // Live Pointer Dragging for Stage 1 3D SVG Parts (.fj-mat-part), Stage 2 Dock Tools (.fj-hd-dock-slot), & Stage 3 Pipe Dock (.fj-sr-dock-slot)
    let activeMatDrag = null;
    let activeHdDockDrag = null;
    let activeSrDockDrag = null;
    let livePipeGhostEl = null;

    function removeLivePipeGhost() {
      if (livePipeGhostEl && livePipeGhostEl.parentNode) {
        livePipeGhostEl.parentNode.removeChild(livePipeGhostEl);
      }
      livePipeGhostEl = null;
      wrapper.querySelectorAll(".fj-sr-rack-seg.is-drag-over").forEach((el) => el.classList.remove("is-drag-over"));
    }

    function resolvePipeDreamDropCoords(clientX, clientY, fallbackEl) {
      let dropVRow = null;
      let dropVCol = null;

      if (typeof document !== "undefined" && typeof document.elementFromPoint === "function") {
        const hitEl = document.elementFromPoint(clientX, clientY);
        const cellEl =
          hitEl && hitEl.closest ? hitEl.closest(".fj-sr-rack-seg[data-vrow][data-vcol]") : null;
        if (cellEl) {
          dropVRow = Number(cellEl.getAttribute("data-vrow"));
          dropVCol = Number(cellEl.getAttribute("data-vcol"));
        }
      }

      if (dropVRow === null || dropVCol === null) {
        const svgEl = wrapper.querySelector(".fj-serverroom-3d-svg");
        if (svgEl && typeof svgEl.getBoundingClientRect === "function") {
          const rect = svgEl.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const svgX = ((clientX - rect.left) / rect.width) * 1000;
            const svgY = ((clientY - rect.top) / rect.height) * 540;
            if (svgX >= 310 && svgX < 670 && svgY >= 80 && svgY < 360) {
              dropVCol = Math.floor((svgX - 310) / 90);
              dropVRow = Math.floor((svgY - 80) / 70);
            }
          }
        }
      }

      if ((dropVRow === null || dropVCol === null) && fallbackEl) {
        const attrR = fallbackEl.getAttribute("data-target-vrow");
        const attrC = fallbackEl.getAttribute("data-target-vcol");
        if (attrR !== null && attrC !== null) {
          dropVRow = Number(attrR);
          dropVCol = Number(attrC);
        }
      }

      return { dropVRow, dropVCol };
    }

    function installServerPipeGroup(row, col, pipeKind, sourceEl, dropVRow, dropVCol) {
      if (!uiAnim.pipeDreamBoard) {
        uiAnim.pipeDreamBoard = createEmptyPipeDreamBoard();
      }

      const validPipeDreamKinds = ["W-E", "N-S", "CROSS", "W-S", "N-E", "W-N", "S-E"];
      const activeKind = validPipeDreamKinds.includes(pipeKind) ? pipeKind : "W-E";

      let targetR = typeof dropVRow === "number" && !Number.isNaN(dropVRow) ? dropVRow : null;
      let targetC = typeof dropVCol === "number" && !Number.isNaN(dropVCol) ? dropVCol : null;

      if (targetR === null || targetC === null) {
        // Fallback when synthetic event in headless DOM has no layout geometry: pick first empty cell
        outer: for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            if (!uiAnim.pipeDreamBoard[r][c].over && !uiAnim.pipeDreamBoard[r][c].under) {
              targetR = r;
              targetC = c;
              break outer;
            }
          }
        }
      }

      if (targetR === null || targetC === null) {
        targetR = 0;
        targetC = 0;
      }

      placePipeDreamBlockOnCell(uiAnim.pipeDreamBoard, targetR, targetC, activeKind);
      // Building blocks does not start flow; the player must hit GO >> to test if the pipes flow!
      uiAnim.pipeDreamFlowActive = false;

      const sourceDockBtn =
        wrapper.querySelector(`.fj-sr-dock-slot[data-pipe-kind="${activeKind}"]`) || sourceEl;
      const targetCellEl =
        wrapper.querySelector(`.fj-sr-rack-seg[data-vrow="${targetR}"][data-vcol="${targetC}"]`) ||
        wrapper.querySelector(".fj-sr-pipe-network");
      if (sourceDockBtn && targetCellEl && sourceDockBtn !== targetCellEl) {
        animateFlyingClone(sourceDockBtn, targetCellEl, sourceDockBtn.innerHTML, 320);
      }

      uiAnim.selectedServerPipeId = null;
      sound.playTone("tap");
      renderAll();
    }

    wrapper.addEventListener("pointerdown", (ev) => {
      const srSlot = ev.target.closest(".fj-sr-dock-slot[data-pipe-kind]");
      if (srSlot) {
        if (srSlot.classList.contains("is-aligned")) return;
        const pipeKind = srSlot.getAttribute("data-pipe-kind") || "";
        const row = Number(srSlot.getAttribute("data-row") || 0);
        const col = Number(srSlot.getAttribute("data-col") || 0);
        activeSrDockDrag = {
          el: srSlot,
          pipeKind,
          row,
          col,
          startX: ev.clientX,
          startY: ev.clientY,
          moved: false
        };
        try {
          srSlot.setPointerCapture(ev.pointerId);
        } catch (_e) {
          // Ignore pointer capture errors
        }
        return;
      }

      const hdSlot = ev.target.closest(".fj-hd-dock-slot[data-tool-id]");
      if (hdSlot) {
        const toolId = hdSlot.getAttribute("data-tool-id");
        const rect = hdSlot.getBoundingClientRect();
        dragOriginPoint = { x: rect.left + rect.width / 2, y: rect.top + 10 };
        activeHdDockDrag = {
          el: hdSlot,
          toolId,
          startX: ev.clientX,
          startY: ev.clientY,
          moved: false
        };
        try {
          hdSlot.setPointerCapture(ev.pointerId);
        } catch (_e) {
          // Ignore pointer capture errors
        }
        return;
      }

      const matPart = ev.target.closest(".fj-mat-part[data-part-id]");
      if (!matPart || matPart.classList.contains("is-placed")) return;
      const svgEl = matPart.closest(".fj-workshop-3d-svg");
      if (!svgEl) return;
      const partId = matPart.getAttribute("data-part-id");
      const matX = Number(matPart.getAttribute("data-mat-x") || 0);
      const matY = Number(matPart.getAttribute("data-mat-y") || 0);
      const matRot = Number(matPart.getAttribute("data-mat-rot") || 0);
      activeMatDrag = {
        el: matPart,
        svg: svgEl,
        partId,
        matX,
        matY,
        matRot,
        curSvgX: matX,
        curSvgY: matY,
        startX: ev.clientX,
        startY: ev.clientY,
        moved: false
      };
      try {
        matPart.setPointerCapture(ev.pointerId);
      } catch (_e) {
        // Ignore pointer capture errors
      }
    });

    wrapper.addEventListener("pointermove", (ev) => {
      if (activeSrDockDrag) {
        const dx = ev.clientX - activeSrDockDrag.startX;
        const dy = ev.clientY - activeSrDockDrag.startY;
        if (Math.hypot(dx, dy) > 8) {
          activeSrDockDrag.moved = true;
        }
        if (activeSrDockDrag.moved) {
          if (!livePipeGhostEl) {
            livePipeGhostEl = document.createElement("div");
            livePipeGhostEl.className = "fj-flying-clone";
            livePipeGhostEl.style.width = "106px";
            livePipeGhostEl.style.height = "60px";
            livePipeGhostEl.style.transition = "none";
            livePipeGhostEl.innerHTML = activeSrDockDrag.el.innerHTML;
            document.body.appendChild(livePipeGhostEl);
          }
          livePipeGhostEl.style.left = `${ev.clientX - 53}px`;
          livePipeGhostEl.style.top = `${ev.clientY - 30}px`;
        }
        return;
      }

      if (activeHdDockDrag) {
        const dx = ev.clientX - activeHdDockDrag.startX;
        const dy = ev.clientY - activeHdDockDrag.startY;
        if (Math.hypot(dx, dy) > 8) {
          activeHdDockDrag.moved = true;
        }
        if (activeHdDockDrag.moved) {
          updateLiveCableSvg(ev.clientX, ev.clientY);
        }
        return;
      }

      if (!activeMatDrag) return;
      const dxPx = ev.clientX - activeMatDrag.startX;
      const dyPx = ev.clientY - activeMatDrag.startY;
      if (Math.hypot(dxPx, dyPx) > 6) {
        activeMatDrag.moved = true;
        activeMatDrag.svg.classList.add("is-dragging-part");
      }
      if (!activeMatDrag.moved) return;
      const rect = activeMatDrag.svg.getBoundingClientRect();
      const scaleX = rect.width > 0 ? 1000 / rect.width : 1;
      const scaleY = rect.height > 0 ? 540 / rect.height : 1;
      const curSvgX = activeMatDrag.matX + dxPx * scaleX;
      const curSvgY = activeMatDrag.matY + dyPx * scaleY;
      activeMatDrag.curSvgX = curSvgX;
      activeMatDrag.curSvgY = curSvgY;
      activeMatDrag.el.style.transition = "none";
      activeMatDrag.el.setAttribute(
        "transform",
        `translate(${curSvgX.toFixed(1)}, ${curSvgY.toFixed(1)}) rotate(-14) scale(1.08)`
      );
    });

    wrapper.addEventListener("pointercancel", () => {
      activeSrDockDrag = null;
      activeHdDockDrag = null;
      activeMatDrag = null;
      removeLivePipeGhost();
      removeLiveCableSvg();
      wrapper.querySelectorAll(".fj-workshop-3d-svg.is-dragging-part").forEach((el) => el.classList.remove("is-dragging-part"));
    });

    wrapper.addEventListener("dblclick", (ev) => {
      // Never auto-place parts on double-click
      ev.preventDefault();
    });

    wrapper.addEventListener("pointerup", (ev) => {
      if (activeSrDockDrag) {
        const srDrag = activeSrDockDrag;
        activeSrDockDrag = null;
        removeLivePipeGhost();
        if (srDrag.moved && ev.clientY - srDrag.startY < -36) {
          ev.preventDefault();
          const { dropVRow, dropVCol } = resolvePipeDreamDropCoords(
            ev.clientX,
            ev.clientY,
            srDrag.el
          );
          installServerPipeGroup(srDrag.row, srDrag.col, srDrag.pipeKind, srDrag.el, dropVRow, dropVCol);
        }
        return;
      }

      if (activeHdDockDrag) {
        const hdDrag = activeHdDockDrag;
        activeHdDockDrag = null;
        removeLiveCableSvg();
        if (hdDrag.moved && ev.clientY - hdDrag.startY < -36) {
          ev.preventDefault();
          const res = session.applyHelpdeskTool({ toolId: hdDrag.toolId });
          sound.playTone(res.ok ? (res.code === "HELPDESK_COMPLETED" ? "success" : "tap") : "error");
          renderAll();
          if (res.code === "HELPDESK_COMPLETED") scheduleAutoAdvanceIfSolved(2, 1650);
        }
        return;
      }

      if (!activeMatDrag) return;
      const dragInfo = activeMatDrag;
      activeMatDrag = null;
      if (dragInfo.svg) dragInfo.svg.classList.remove("is-dragging-part");
      wrapper.querySelectorAll(".fj-workshop-3d-svg.is-dragging-part").forEach((el) => el.classList.remove("is-dragging-part"));
      wrapper.querySelectorAll(".fj-pen-seg-target.is-drag-over").forEach((el) => el.classList.remove("is-drag-over"));

      if (!dragInfo.moved) {
        // Clicking or double-clicking a part on the cutting mat without dragging must NOT auto-place it
        dragInfo.el.style.transition = "";
        dragInfo.el.setAttribute(
          "transform",
          `translate(${dragInfo.matX}, ${dragInfo.matY}) rotate(${dragInfo.matRot})`
        );
        return;
      }

      // Prevent synthetic click after drag release
      ev.preventDefault();
      const dyPx = ev.clientY - dragInfo.startY;
      if (dragInfo.curSvgY < 320 || dyPx < -36) {
        installWorkshopPartFromUi(dragInfo.partId, null);
      } else {
        dragInfo.el.style.transition = "";
        dragInfo.el.setAttribute(
          "transform",
          `translate(${dragInfo.matX}, ${dragInfo.matY}) rotate(${dragInfo.matRot})`
        );
      }
    });

    // HTML5 Drag-and-Drop across Stage 1 (Pencil Parts), Stage 2 (Tools/Cables), Stage 4 (Workflow Cards), Stage 5 (AI Tools)
    wrapper.addEventListener("dragstart", (ev) => {
      const partBtn = ev.target.closest("[data-part-id]");
      if (partBtn) {
        dragPayload = { kind: "workshop-part", id: partBtn.getAttribute("data-part-id") };
        const wsSvg = wrapper.querySelector(".fj-workshop-3d-svg");
        if (wsSvg) wsSvg.classList.add("is-dragging-part");
        if (ev.dataTransfer) ev.dataTransfer.setData("text/plain", dragPayload.id);
        return;
      }
      const wfNode = ev.target.closest(".fj-workflow-node[draggable=\"true\"][data-step-id]");
      if (wfNode) {
        dragPayload = { kind: "workflow-step", id: wfNode.getAttribute("data-step-id") };
        if (ev.dataTransfer) ev.dataTransfer.setData("text/plain", dragPayload.id);
        return;
      }
      const hdTool = ev.target.closest("[data-fj-action=\"helpdesk-tool\"][data-tool-id]");
      if (hdTool) {
        dragPayload = { kind: "helpdesk-tool", id: hdTool.getAttribute("data-tool-id") };
        const rect = hdTool.getBoundingClientRect();
        dragOriginPoint = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        if (ev.dataTransfer) ev.dataTransfer.setData("text/plain", dragPayload.id);
        return;
      }
      const srPipe = ev.target.closest(".fj-sr-dock-slot[data-pipe-kind]");
      if (srPipe) {
        dragPayload = {
          kind: "serverroom-pipe",
          id: srPipe.getAttribute("data-pipe-kind"),
          row: Number(srPipe.getAttribute("data-row") || 0),
          col: Number(srPipe.getAttribute("data-col") || 0)
        };
        if (ev.dataTransfer) ev.dataTransfer.setData("text/plain", dragPayload.id);
        return;
      }
      const aiTool = ev.target.closest(".fj-tool-btn[data-fj-action=\"configure-ai\"][data-station-id]");
      if (aiTool) {
        dragPayload = { kind: "ai-tool", id: aiTool.getAttribute("data-station-id") };
        if (ev.dataTransfer) ev.dataTransfer.setData("text/plain", dragPayload.id);
      }
    });

    wrapper.addEventListener("dragover", (ev) => {
      if (dragPayload && dragPayload.kind === "helpdesk-tool") {
        updateLiveCableSvg(ev.clientX, ev.clientY);
      }
      const dropTarget = ev.target.closest(
        ".fj-pencil-drop-zone, .fj-pencil-assembly-rig, [data-fj-action=\"place-slot\"], .fj-workflow-node[data-step-id], .fj-pc-port-bay, .fj-pc-rear-chassis, .fj-pc-screen-terminal, .fj-helpdesk-workstation, .fj-pc-diag-overlay, .fj-alert-pill, .fj-station-card[data-station-id]"
      );
      if (dropTarget) {
        ev.preventDefault();
        dropTarget.classList.add("is-drag-over");
      }
    });

    wrapper.addEventListener("dragleave", (ev) => {
      const dropTarget = ev.target.closest(".is-drag-over");
      if (dropTarget) dropTarget.classList.remove("is-drag-over");
    });

    wrapper.addEventListener("dragend", () => {
      removeLiveCableSvg();
      wrapper.querySelectorAll(".fj-workshop-3d-svg.is-dragging-part").forEach((el) => el.classList.remove("is-dragging-part"));
      wrapper.querySelectorAll(".is-drag-over").forEach((el) => el.classList.remove("is-drag-over"));
    });

    wrapper.addEventListener("drop", (ev) => {
      removeLiveCableSvg();
      wrapper.querySelectorAll(".fj-workshop-3d-svg.is-dragging-part").forEach((el) => el.classList.remove("is-dragging-part"));
      wrapper.querySelectorAll(".is-drag-over").forEach((el) => el.classList.remove("is-drag-over"));

      // 1. Stage 1 On-Pen Drop Zone / Assembly Rig / Slot Drop
      const penOrSlotTarget = ev.target.closest(
        ".fj-pencil-drop-zone, [data-fj-action=\"place-slot\"], .fj-pencil-assembly-rig"
      );
      if (penOrSlotTarget && dragPayload && dragPayload.kind === "workshop-part") {
        ev.preventDefault();
        installWorkshopPartFromUi(dragPayload.id, null);
        dragPayload = null;
        return;
      }

      // 2. Stage 4 Workflow Node Swap Drop
      const targetWfNode = ev.target.closest(".fj-workflow-node[data-step-id]");
      if (targetWfNode && dragPayload && dragPayload.kind === "workflow-step") {
        ev.preventDefault();
        const targetStepId = targetWfNode.getAttribute("data-step-id");
        const curMid = session.getState().stages[4].data.middleStepIds;
        const targetIdx = curMid.indexOf(targetStepId);
        if (targetIdx >= 0 && targetStepId !== dragPayload.id) {
          const prevRects = captureWorkflowNodeRects();
          session.moveWorkflowStep({ stepId: dragPayload.id, targetIndex: targetIdx });
          uiAnim.workflowConnectorsDrawing = true;
          sound.playTone("tap");
          renderAll();
          playFlipWorkflowNodes(prevRects);
          setTimeout(() => {
            uiAnim.workflowConnectorsDrawing = false;
          }, 600);
        }
        dragPayload = null;
        return;
      }

      // 3. Stage 2 Help Desk Back of Computer / Port Bay / Terminal / Diagnostic Drop
      const hdTarget = ev.target.closest(
        ".fj-pc-port-bay, .fj-pc-rear-chassis, .fj-pc-screen-terminal, .fj-helpdesk-workstation, .fj-pc-diag-overlay, .fj-alert-pill, .fj-helpdesk-scene, .fj-helpdesk-scene--immersive, .fj-helpdesk-3d-svg"
      );
      if (hdTarget && dragPayload && dragPayload.kind === "helpdesk-tool") {
        ev.preventDefault();
        const res = session.applyHelpdeskTool({ toolId: dragPayload.id });
        sound.playTone(res.ok ? (res.code === "HELPDESK_COMPLETED" ? "success" : "tap") : "error");
        renderAll();
        if (res.code === "HELPDESK_COMPLETED") scheduleAutoAdvanceIfSolved(2, 1650);
        dragPayload = null;
        return;
      }

      // 3b. Stage 3 Server Room Pipe Fitting Drop
      const srTarget = ev.target.closest(
        ".fj-sr-rack-seg, .fj-pipe-tile, .fj-serverroom-3d-svg, .fj-serverroom-scene--immersive"
      );
      if (srTarget && dragPayload && dragPayload.kind === "serverroom-pipe") {
        ev.preventDefault();
        const segEl = ev.target.closest(".fj-sr-rack-seg[data-vrow][data-vcol]");
        const dropVRow = segEl ? Number(segEl.getAttribute("data-vrow")) : null;
        const dropVCol = segEl ? Number(segEl.getAttribute("data-vcol")) : null;
        installServerPipeGroup(dragPayload.row, dragPayload.col, dragPayload.id, null, dropVRow, dropVCol);
        dragPayload = null;
        return;
      }

      // 4. Stage 5 AI Lab Station Drop
      const aiTarget = ev.target.closest(".fj-station-card[data-station-id], .fj-ailab-canvas");
      if (aiTarget && dragPayload && dragPayload.kind === "ai-tool") {
        ev.preventDefault();
        const stationId = aiTarget.getAttribute("data-station-id") || dragPayload.id;
        session.configureAiStation({ stationId });
        sound.playTone("tap");
        renderAll();
        dragPayload = null;
      }
    });

    // Stage 6 Contact Form & Archive Q&A Drawer Submit Handler
    wrapper.addEventListener(
      "submit",
      (ev) => {
        const contactForm = ev.target.closest("#home-connect-form, [data-home-contact-form]");
        if (contactForm) {
          const nameEl = contactForm.querySelector("[data-contact-name], [name=\"name\"]");
          const emailEl = contactForm.querySelector("[data-contact-reply], [name=\"reply\"], [name=\"email\"]");
          const msgEl = contactForm.querySelector("[data-contact-message], [name=\"message\"]");
          const hpEl = contactForm.querySelector("[data-contact-honeypot], [name=\"website\"]");
          const fbEl = contactForm.querySelector("[data-contact-feedback]");

          const res = session.submitContactForm({
            name: nameEl ? nameEl.value : "",
            email: emailEl ? emailEl.value : "",
            message: msgEl ? msgEl.value : "",
            honeypot: hpEl ? hpEl.value : ""
          });

          if (!res.ok) {
            ev.preventDefault();
            ev.stopImmediatePropagation();
            sound.playTone("error");
            if (fbEl) {
              fbEl.hidden = false;
              fbEl.textContent = res.message;
            }
            return;
          }
          sound.playTone("success");
          if (fbEl) {
            fbEl.hidden = false;
            fbEl.textContent = res.message;
          }
          return;
        }

        const form = ev.target.closest("[data-fj-archive-form]");
        if (!form) return;
        ev.preventDefault();
        const input = form.querySelector("#fj-question");
        const log = wrapper.querySelector("[data-fj-archive-log]");
        if (!input || !log) return;
        const q = sanitizeDisplayText(input.value, 240);
        if (!q) return;
        const found = ARCHIVE_ANSWERS.find((item) => item.match.test(q));
        const reply = found
          ? found.answer
          : "Grounded portfolio summary: Josh Boyer's career spans Dell (Sept 2006), Grenville Mutual (2009–2022), Medavie integration analysis, and the NEXUS AI capstone.";
        const entry = document.createElement("div");
        entry.textContent = "Q: " + q + " — " + reply;
        log.prepend(entry);
        input.value = "";
      },
      true
    );

    wrapper.addEventListener("click", (ev) => {
      const clearBtn = ev.target.closest("[data-clear]");
      if (!clearBtn) return;
      const log = wrapper.querySelector("[data-fj-archive-log]");
      if (log) log.innerHTML = "";
    });

    return { session, wrapper, renderAll };
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mountFooterJourneyBrowser);
    } else {
      mountFooterJourneyBrowser();
    }
  }

  return Object.freeze({
    ENGINE_VERSION,
    STAGE_IDS,
    STAGE_CATALOG,
    WORKSHOP_PARTS,
    CANONICAL_WORKSHOP_ORDER,
    HELPDESK_CLUES,
    HELPDESK_TOOLS,
    LEVEL_3_PIPE_TEMPLATE,
    SERVER_SYSTEMS,
    WORKFLOW_CANONICAL_MIDDLE,
    WORKFLOW_STEP_DEFS,
    AI_STATIONS_SPEC,
    createRng,
    createInitialState,
    cloneState,
    validateState,
    startStage,
    advanceStage,
    placeWorkshopPart,
    inspectHelpdeskClue,
    applyHelpdeskTool,
    rotateServerPipe,
    moveWorkflowStep,
    toggleWorkflowAction,
    runWorkflow,
    configureAiStation,
    runAiLoop,
    submitContactForm,
    requestHint,
    resetStage,
    skipToContact,
    resetAll,
    setViewPreferences,
    verifyPipeGridConnectivity,
    evaluatePipeNetwork,
    generatePipePuzzle,
    validateWorkflowOrder,
    evaluateAiLoopConfig,
    validateContactSubmission,
    computeStageStars,
    createGameSession,
    mountFooterJourneyBrowser
  });
});
