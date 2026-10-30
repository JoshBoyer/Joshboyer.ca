/* ==========================================================================
   AUTOMATION TYCOON — Deterministic Career RPG Simulation, Quest, Agentic NPC,
   Cutscene, Blueprint Capstone & Save Engine (Node + Browser UMD)
   ========================================================================== */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.AutomationTycoonSim = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SIM_VERSION = "1.0.0";

  // --------------------------------------------------------------------------
  // 1. CANONICAL PORTFOLIO EVIDENCE TIE-INS (Strictly aligned with AGENTS.md)
  // --------------------------------------------------------------------------
  const PORTFOLIO_TIE_INS = Object.freeze({
    dell: {
      id: "dell",
      slug: "dell",
      href: "#projects/dell",
      period: "Sept 2006 – 2007",
      org: "Dell Canada",
      title: "Dell Latitude & OptiPlex Hardware Support (Gloves Off)",
      verifiedSummary:
        "Started September 2006 in commercial Latitude and OptiPlex support and joined the Gloves Off team, focusing on component-level fault isolation and first-call root-cause resolution rather than rushed script handling.",
      gameplayDistinction:
        "Game scenarios fictionalize individual caller tickets while reflecting real root-cause diagnostic discipline from Dell Canada (starting Sept 2006)."
    },
    foundations: {
      id: "foundations",
      slug: "foundations",
      href: "#projects/foundations",
      period: "2007 – 2009",
      org: "Harris / Ottawa Computer Services",
      title: "NOC Operations & Repeatable SBS Swing Migrations",
      verifiedSummary:
        "Progressed from NOC technician to project technician (2007–2009), supporting Windows Server, Active Directory, Exchange, and developing a repeatable Small Business Server (SBS) swing-migration methodology.",
      gameplayDistinction:
        "The MSP basement, backpack loadout, and onsite dispatches dramatize real NOC triage and field infrastructure engineering."
    },
    headquarters: {
      id: "headquarters",
      slug: "headquarters",
      href: "#projects/headquarters",
      period: "2009 – 2022",
      org: "Grenville Mutual Insurance",
      title: "Headquarters Infrastructure, Server Room & VMware ESXi Transition",
      verifiedSummary:
        "Designed and delivered the IT infrastructure for Grenville's new headquarters (server room, cooling, UPS/generator power continuity, network segmentation) and led the bare-metal to VMware ESXi transition.",
      gameplayDistinction:
        "The Chapter 3 playable HQ Blueprint Capstone and Chapter 4 custom HQ environment are directly inspired by the Grenville headquarters build and migration."
    },
    renewals: {
      id: "renewals",
      slug: "renewals",
      href: "#projects/renewals",
      period: "2009 – 2022",
      org: "Grenville Mutual Insurance",
      title: "Renewal Eligibility & Underwriting Rules Automation",
      verifiedSummary:
        "Designed and implemented P&C underwriting and renewal eligibility rules achieving user-reported renewal-only automation of approximately 80% residential, 60% commercial, and 40% farm/agri policies, with structured human underwriter referral paths. Formal analyst transition date between 2014 and 2016 remains unresolved.",
      gameplayDistinction:
        "Chapter 4's rule-engine workflow quest models straight-through renewal eligibility paired with human exception routing."
    },
    claims: {
      id: "claims",
      slug: "claims",
      href: "#projects/claims",
      period: "2022 – Present",
      org: "Medavie Blue Cross",
      title: "Provider Integration, Takeover Tooling & Reporting Continuity",
      verifiedSummary:
        "At Medavie (2022–present): provider integration solution review, mapping and synchronization requirements (scheduled event table + REST consumer; no Kafka/real-time broker claimed), production-adopted Excel/VB/XML takeover tooling, hand-written claims SQL reconciliation, and completed reporting-continuity analysis/design (service go-live unconfirmed; modernization proposed).",
      gameplayDistinction:
        "Chapter 4/5 integration and validation quests reflect real schema mapping, reconciliation, and continuity analysis without claiming formal Architect job titles."
    },
    nexus: {
      id: "nexus",
      slug: "nexus",
      href: "#projects/nexus",
      period: "Independent Capstone",
      org: "Independent (NEXUS)",
      title: "NEXUS — Governed Multi-Agent Orchestration Platform",
      verifiedSummary:
        "NEXUS is Josh Boyer's current independent capstone for scoped context compilation, explainable routing, and recoverable human-governed execution. LOWKEY and Workshop42 remain historical/personal evidence.",
      gameplayDistinction:
        "Chapter 5's finale dramatizes governed agent orchestration where human review, scoped context, and rollback guardrails prevent runaway automation."
    }
  });

  // --------------------------------------------------------------------------
  // 2. CHAPTERS, RANKS, INCLINATIONS & PROFICIENCIES
  // --------------------------------------------------------------------------
  const CHAPTERS = Object.freeze([
    {
      number: 1,
      id: "ocean_of_cubicles",
      title: "Chapter 1 — The Ocean of Cubicles",
      subtitle: "Corporate Phone Support",
      rankTitle: "Tier-1 Support Technician (Dramatic Rank)",
      eraLabel: "Inspired by Sept 2006 – 2007 · Hardware & Phone Support",
      portfolioChapterId: "metal",
      tieInKey: "dell",
      workspaceType: "cubicle_desk",
      allowsBackpack: false,
      allowsStorageCabinet: false,
      allowsHqBlueprint: false,
      allowsArchitectureLenses: false,
      description:
        "One small beige cubicle among hundreds on a vast corporate support floor. Master root-cause questioning, respect escalation boundaries, and spot your first repeatable checklist."
    },
    {
      number: 2,
      id: "basement_msp",
      title: "Chapter 2 — The Basement MSP / NOC",
      subtitle: "NOC Triage & Field Engineering",
      rankTitle: "NOC & Field Systems Technician (Dramatic Rank)",
      eraLabel: "Inspired by 2007 – 2009 · NOC & Infrastructure Migrations",
      portfolioChapterId: "metal",
      tieInKey: "foundations",
      workspaceType: "msp_workbench",
      allowsBackpack: true,
      allowsStorageCabinet: false,
      allowsHqBlueprint: false,
      allowsArchitectureLenses: false,
      description:
        "Exposed pipes, blinking NOC monitors, and a field backpack with real slot/weight trade-offs. Triage alerts, pack the right diagnostic tools, and stabilize client infrastructure."
    },
    {
      number: 3,
      id: "two_person_it",
      title: "Chapter 3 — Two-Person Basement IT",
      subtitle: "Operational Ownership & The HQ Capstone",
      rankTitle: "Systems & Operations Specialist (Dramatic Rank)",
      eraLabel: "Inspired by 2009 – Mid-2010s · Infrastructure & HQ Build",
      portfolioChapterId: "business",
      tieInKey: "headquarters",
      workspaceType: "basement_it_cabinet",
      allowsBackpack: true,
      allowsStorageCabinet: true,
      allowsHqBlueprint: true,
      allowsArchitectureLenses: false,
      description:
        "A two-person insurance IT basement with a permanent desktop and shared storage cabinet. Eliminate recurring ticket categories and architect the company's new Headquarters."
    },
    {
      number: 4,
      id: "headquarters_built",
      title: "Chapter 4 — The Headquarters You Built",
      subtitle: "Business Rules, Broker APIs & Shared Lenses",
      rankTitle: "Business Systems & Integration Analyst (Dramatic Rank)",
      eraLabel: "Inspired by Mid-2010s – 2022 · Underwriting Rules & Integrations",
      portfolioChapterId: "business",
      tieInKey: "renewals",
      workspaceType: "custom_hq_office",
      allowsBackpack: true,
      allowsStorageCabinet: true,
      allowsHqBlueprint: true,
      allowsArchitectureLenses: true,
      description:
        "Step inside the exact Headquarters layout you designed in Chapter 3. Bridge underwriters, brokers, and schemas across Physical, Process, Application, and Infrastructure views."
    },
    {
      number: 5,
      id: "cloud_and_agents",
      title: "Chapter 5 — Architecture, Continuity & Governed Agents",
      subtitle: "Enterprise Continuity & Governed AI Orchestration",
      rankTitle: "Solutions & Automation Architect (Dramatic RPG Capstone Rank)",
      eraLabel: "Inspired by 2022 – Present · Claims Continuity & Independent NEXUS",
      portfolioChapterId: "clouds",
      tieInKey: "nexus",
      workspaceType: "architect_command",
      allowsBackpack: true,
      allowsStorageCabinet: true,
      allowsHqBlueprint: true,
      allowsArchitectureLenses: true,
      description:
        "Architect resilient data continuity, takeover validation pipelines, and NEXUS-inspired governed agent workflows with scoped context, human review gates, and instant rollback."
    }
  ]);

  const INCLINATIONS = Object.freeze({
    curiosity: {
      id: "curiosity",
      label: "Curiosity",
      desc: "Spots hidden hardware/system clues faster when inspecting logs and physical indicators.",
      bonusSkill: "hardware"
    },
    empathy: {
      id: "empathy",
      label: "Empathy",
      desc: "Calms stressed callers and stakeholders, earning higher trust from clarifying questions.",
      bonusSkill: "requirements"
    },
    patience: {
      id: "patience",
      label: "Patience",
      desc: "Isolates intermittent faults methodically without jumping to premature conclusions.",
      bonusSkill: "os_troubleshooting"
    },
    structured_reasoning: {
      id: "structured_reasoning",
      label: "Structured Reasoning",
      desc: "Excels at mapping dependencies, escalation boundaries, and deterministic rule tables.",
      bonusSkill: "business_process"
    },
    tinkering: {
      id: "tinkering",
      label: "Tinkering",
      desc: "Quickly assembles scripts, checklists, and workbench diagnostic media.",
      bonusSkill: "scripting"
    }
  });

  const PROFICIENCY_KEYS = Object.freeze([
    "hardware",
    "os_troubleshooting",
    "networking",
    "sysadmin",
    "scripting",
    "data_sql",
    "requirements",
    "business_process",
    "integration",
    "solution_architecture",
    "cloud",
    "ai_governance"
  ]);

  // --------------------------------------------------------------------------
  // 3. EQUIPMENT, WORKSPACE ASSETS & LOADOUT CATALOG
  // --------------------------------------------------------------------------
  const ITEMS_CATALOG = Object.freeze({
    // Chapter 1: Assigned Call-Center Workplace Items (non-backpack)
    issued_headset: {
      id: "issued_headset",
      name: "Issued Wired Headset",
      category: "workplace_assigned",
      chapterMin: 1,
      weightKg: 0,
      slots: 0,
      unlockedActions: ["listen_call", "voice_calm_prompt"],
      desc: "Standard-issue call center headset with inline mute switch."
    },
    employee_badge: {
      id: "employee_badge",
      name: "Tier-1 Support Badge",
      category: "workplace_assigned",
      chapterMin: 1,
      weightKg: 0,
      slots: 0,
      unlockedActions: ["access_support_floor", "query_kb_tier1"],
      desc: "Grants floor access and Tier-1 knowledge base lookup. No server-room or Tier-2 admin rights."
    },
    desk_notepad: {
      id: "desk_notepad",
      name: "Troubleshooting Pad & Escalation Chart",
      category: "knowledge_artifact",
      chapterMin: 1,
      weightKg: 0,
      slots: 0,
      unlockedActions: ["record_symptom", "check_escalation_matrix"],
      desc: "Printed escalation matrix and call notes for capturing verified symptoms."
    },
    kb_checklist_draft: {
      id: "kb_checklist_draft",
      name: "Verified Dock & Display Runbook Note",
      category: "knowledge_artifact",
      chapterMin: 1,
      weightKg: 0,
      slots: 0,
      unlockedActions: ["apply_dock_checklist"],
      desc: "Reusable 3-step checklist that cuts repeat dock/display triage time across the team."
    },
    // Chapter 2: MSP Backpack & Field Loadout Tools
    msp_backpack: {
      id: "msp_backpack",
      name: "Field Engineer Backpack (4 Slots / 8.0 kg)",
      category: "container",
      chapterMin: 2,
      weightKg: 0,
      slots: 0,
      unlockedActions: ["pack_field_loadout", "travel_onsite"],
      desc: "Earned upon promotion to the Basement MSP. Carries up to 4 field tools (8.0 kg max)."
    },
    field_laptop: {
      id: "field_laptop",
      name: "Field Diagnostic Laptop",
      category: "field_tool",
      chapterMin: 2,
      weightKg: 2.4,
      slots: 1,
      unlockedActions: ["serial_console_login", "subnet_ping_sweep", "inspect_switch_config"],
      desc: "Rugged laptop with serial terminal, subnet scanner, and offline config backups."
    },
    cable_tester: {
      id: "cable_tester",
      name: "TDR Network Cable & Continuity Tester",
      category: "field_tool",
      chapterMin: 2,
      weightKg: 0.8,
      slots: 1,
      unlockedActions: ["test_patch_continuity", "isolate_bad_uplink_pair"],
      desc: "Verifies RJ45 pinouts, crimps, and patch panel continuity in seconds."
    },
    console_cable: {
      id: "console_cable",
      name: "USB-to-RJ45 Rollover Console Cable",
      category: "field_tool",
      chapterMin: 2,
      weightKg: 0.3,
      slots: 1,
      unlockedActions: ["direct_switch_console"],
      desc: "Required for out-of-band CLI access when a switch loses management VLAN connectivity."
    },
    usb_recovery_media: {
      id: "usb_recovery_media",
      name: "Known-Good Boot & Recovery USB",
      category: "field_tool",
      chapterMin: 2,
      weightKg: 0.1,
      slots: 1,
      unlockedActions: ["boot_offline_diagnostics", "verify_backup_image"],
      desc: "Bootable recovery media for offline disk, driver, and registry repair."
    },
    spare_managed_switch: {
      id: "spare_managed_switch",
      name: "24-Port Managed Spare Switch",
      category: "field_component",
      chapterMin: 2,
      weightKg: 3.8,
      slots: 2,
      unlockedActions: ["cold_swap_switch"],
      desc: "Heavy spare rack switch. Takes 2 slots and 3.8 kg in the backpack."
    },
    // Chapter 3: Basement IT Cabinet & Automation Assets
    storage_cabinet_key: {
      id: "storage_cabinet_key",
      name: "Basement IT Storage Cabinet Key",
      category: "workspace_assigned",
      chapterMin: 3,
      weightKg: 0,
      slots: 0,
      unlockedActions: ["open_storage_cabinet", "stage_hq_equipment"],
      desc: "Unlocks the shared two-person IT storage cabinet stocked with spare drives, cables, and imaging kits."
    },
    onboarding_script_v1: {
      id: "onboarding_script_v1",
      name: "Validated AD & Permission Provisioning Script",
      category: "automation_artifact",
      chapterMin: 3,
      weightKg: 0,
      slots: 0,
      unlockedActions: ["deploy_onboarding_automation"],
      desc: "Idempotent provisioning script with dry-run validation and group-membership guardrails."
    },
    // Chapter 4 & 5: Architecture & Governance Artifacts
    csio_xml_contract: {
      id: "csio_xml_contract",
      name: "CSIO / SOAP-REST Broker Mapping Contract",
      category: "architecture_artifact",
      chapterMin: 4,
      weightKg: 0,
      slots: 0,
      unlockedActions: ["validate_broker_payload", "inspect_api_lens"],
      desc: "Canonical field-level schema mapping between broker portals and policy administration."
    },
    takeover_xml_validator: {
      id: "takeover_xml_validator",
      name: "Takeover-History Excel/VB/XML Validator",
      category: "architecture_artifact",
      chapterMin: 5,
      weightKg: 0,
      slots: 0,
      unlockedActions: ["validate_takeover_batch", "reconcile_financial_totals"],
      desc: "Pre-validates group takeover history batches before loading and reconciles financial totals."
    },
    nexus_governance_spec: {
      id: "nexus_governance_spec",
      name: "NEXUS Scoped Context & Human-Gate Spec",
      category: "architecture_artifact",
      chapterMin: 5,
      weightKg: 0,
      slots: 0,
      unlockedActions: ["configure_agent_guardrails", "trigger_audit_rollback"],
      desc: "Defines scoped context packets, explainable model routing, and human-in-the-loop approval gates."
    }
  });

  // --------------------------------------------------------------------------
  // 4. DECLARATIVE CUTSCENES (All 8 Required Storyboard Sequences)
  // --------------------------------------------------------------------------
  const CUTSCENES = Object.freeze({
    opening_ocean_of_cubicles: {
      id: "opening_ocean_of_cubicles",
      version: 1,
      chapter: 1,
      title: "One Desk in an Ocean",
      durationSec: 22,
      skippable: true,
      keyframes: [
        { t: 0, cam: { x: 0, y: -260, zoom: 0.42 }, label: "Immense corporate campus exterior at dawn" },
        { t: 5, cam: { x: 0, y: -120, zoom: 0.58 }, label: "Tracking across hundreds of beige fabric cubicles" },
        { t: 13, cam: { x: 18, y: -28, zoom: 0.85 }, label: "Descending past rows of headset technicians and supervisors" },
        { t: 22, cam: { x: 24, y: 12, zoom: 1.18 }, label: "Settling at your assigned Desk 4B-19 as the phone rings" }
      ],
      subtitles: [
        { start: 0.5, end: 5.5, speaker: "Narrator", text: "September 2006. A vast commercial support floor — hundreds of identical beige cubicles humming under fluorescent lights." },
        { start: 6.0, end: 12.5, speaker: "Narrator", text: "Every phone line carries a frustrated user, an incomplete symptom, and a ticking clock." },
        { start: 13.0, end: 18.0, speaker: "Dana (Support Manager)", text: "Welcome to your first shift on the floor. Don't guess — listen, isolate the fault, and respect your escalation boundaries." },
        { start: 18.2, end: 22.0, speaker: "Desk Phone (4B-19)", text: "[RINGING] Incoming Priority Call — Ticket #1042: 'My laptop is dead and I present in ten minutes!'" }
      ],
      onCompleteState: {
        cutsceneCompleted: "opening_ocean_of_cubicles",
        unlockQuestId: "q1_silent_laptop",
        playerPosition: { x: 6, y: 5 }
      }
    },
    first_good_resolution: {
      id: "first_good_resolution",
      version: 1,
      chapter: 1,
      title: "First Verified Resolution",
      durationSec: 6,
      skippable: true,
      keyframes: [
        { t: 0, cam: { x: 24, y: 12, zoom: 1.22 }, label: "Caller confirms external monitor and dock power restored" },
        { t: 6, cam: { x: 20, y: 8, zoom: 1.08 }, label: "Ticket #1042 clears; neighbor Marco nods across the partition" }
      ],
      subtitles: [
        { start: 0.2, end: 3.0, speaker: "Elena (Caller)", text: "The dock indicator just lit up and my slides are on screen! Thank you for actually checking the power rail instead of making me reimage!" },
        { start: 3.1, end: 6.0, speaker: "Marco (Veteran Tech)", text: "Clean root-cause isolation, rookie. One less repeat callback in the queue." }
      ],
      onCompleteState: {
        cutsceneCompleted: "first_good_resolution",
        unlockQuestId: "q2_print_spool_escalation"
      }
    },
    promotion_to_msp: {
      id: "promotion_to_msp",
      version: 1,
      chapter: 2,
      title: "Out of the Cubicle Ocean — Into the Basement MSP",
      durationSec: 18,
      skippable: true,
      keyframes: [
        { t: 0, cam: { x: 24, y: 12, zoom: 1.0 }, label: "Packing up the tiny cubicle desk as the call-center hum fades" },
        { t: 7, cam: { x: 0, y: -40, zoom: 0.75 }, label: "Stepping down the concrete stairs into a scrappy basement NOC" },
        { t: 18, cam: { x: 10, y: 14, zoom: 1.15 }, label: "Landing at the repair bench where a Field Backpack awaits" }
      ],
      subtitles: [
        { start: 0.4, end: 6.0, speaker: "Dana (Support Manager)", text: "You don't just read scripts — you find the real cause and document it for the whole floor. You're ready for field & NOC work." },
        { start: 6.5, end: 12.5, speaker: "Narrator", text: "Gone are the 400 beige cubicles. Down in the basement MSP, exposed pipes run above glowing NOC monitors and half-built racks." },
        { start: 13.0, end: 18.0, speaker: "Ray (MSP Dispatcher)", text: "Grab that backpack on the workbench. Out here, what you pack in your bag determines what you can diagnose onsite." }
      ],
      onCompleteState: {
        cutsceneCompleted: "promotion_to_msp",
        setChapter: 2,
        grantItems: ["msp_backpack", "field_laptop", "cable_tester", "console_cable", "usb_recovery_media", "spare_managed_switch"],
        unlockQuestId: "q3_msp_wan_outage",
        playerPosition: { x: 4, y: 4 }
      }
    },
    first_onsite_visit: {
      id: "first_onsite_visit",
      version: 1,
      chapter: 2,
      title: "First Onsite Dispatch",
      durationSec: 10,
      skippable: true,
      keyframes: [
        { t: 0, cam: { x: 10, y: 14, zoom: 1.15 }, label: "Zipping the field backpack at the workbench" },
        { t: 5, cam: { x: 40, y: -20, zoom: 0.8 }, label: "Route trace across the city map to client wiring closet" },
        { t: 10, cam: { x: 16, y: 10, zoom: 1.2 }, label: "Entering the client network closet with amber switch LEDs" }
      ],
      subtitles: [
        { start: 0.3, end: 5.0, speaker: "Priya (NOC Engineer)", text: "Link flap on Trunk Gi0/1 and management VLAN 10 is unreachable. Check physical layer and console in." },
        { start: 5.2, end: 10.0, speaker: "Narrator", text: "Onsite at the client closet. No helpdesk escalation safety net — the rack is right in front of you." }
      ],
      onCompleteState: {
        cutsceneCompleted: "first_onsite_visit"
      }
    },
    two_person_it_arrival: {
      id: "two_person_it_arrival",
      version: 1,
      chapter: 3,
      title: "Two-Person Basement IT Department",
      durationSec: 16,
      skippable: true,
      keyframes: [
        { t: 0, cam: { x: 0, y: -30, zoom: 0.85 }, label: "Arriving at a modest mutual insurance basement office" },
        { t: 8, cam: { x: 12, y: 10, zoom: 1.1 }, label: "Teammate Sam hands over keys to the Storage Cabinet and Server Closet" },
        { t: 16, cam: { x: 14, y: 12, zoom: 1.18 }, label: "Settling at your permanent desktop workstation" }
      ],
      subtitles: [
        { start: 0.5, end: 6.0, speaker: "Sam (IT Teammate)", text: "Welcome to the two-person IT department! It's just you, me, the server closet, and every policy & claims workflow in the building." },
        { start: 6.2, end: 11.5, speaker: "Sam (IT Teammate)", text: "Here's the key to the Storage Cabinet, and that's your permanent desktop. If we keep fixing the same ticket manually, we'll drown." },
        { start: 11.8, end: 16.0, speaker: "Victor (VP Operations)", text: "And once we stabilize daily operations, we need you to design the IT infrastructure for our new Headquarters." }
      ],
      onCompleteState: {
        cutsceneCompleted: "two_person_it_arrival",
        setChapter: 3,
        grantItems: ["storage_cabinet_key", "onboarding_script_v1"],
        unlockQuestId: "q4_basement_repeat_tickets",
        playerPosition: { x: 5, y: 5 }
      }
    },
    hq_capstone_reveal: {
      id: "hq_capstone_reveal",
      version: 1,
      chapter: 4,
      title: "The Headquarters You Built",
      durationSec: 24,
      skippable: true,
      keyframes: [
        { t: 0, cam: { x: 0, y: -50, zoom: 0.72 }, label: "Blueprint lines solidify into physical walls, racks, and segmented conduits" },
        { t: 8, cam: { x: -18, y: -12, zoom: 1.05 }, label: "Server room racks, UPS/generator transfer switch, and ESXi hosts power online" },
        { t: 16, cam: { x: 14, y: -6, zoom: 1.0 }, label: "Underwriters and brokers connect through the new segmented network" },
        { t: 24, cam: { x: 8, y: 10, zoom: 1.16 }, label: "Camera lands inside your new HQ office — built from your saved Chapter 3 blueprint" }
      ],
      subtitles: [
        { start: 0.5, end: 7.0, speaker: "Narrator", text: "Cutover weekend. Every rack placement, VLAN boundary, UPS/generator circuit, and ESXi cluster you designed in your blueprint comes online." },
        { start: 7.5, end: 15.5, speaker: "Sam (IT Teammate)", text: "Look at the server room telemetry — zero unplanned downtime on cutover, and the old bare-metal bottlenecks are gone." },
        { start: 16.0, end: 24.0, speaker: "Claire (Underwriting Lead)", text: "Now that we're in the new Headquarters, let's talk about underwriting rules and broker integrations." }
      ],
      onCompleteState: {
        cutsceneCompleted: "hq_capstone_reveal",
        setChapter: 4,
        grantItems: ["csio_xml_contract"],
        unlockQuestId: "q5_hq_renewal_rules",
        playerPosition: { x: 6, y: 5 }
      }
    },
    becoming_an_architect: {
      id: "becoming_an_architect",
      version: 1,
      chapter: 5,
      title: "Seeing the Whole System",
      durationSec: 20,
      skippable: true,
      keyframes: [
        { t: 0, cam: { x: 8, y: 10, zoom: 1.15 }, label: "Stepping from the workstation into the architecture review boardroom" },
        { t: 10, cam: { x: 0, y: -20, zoom: 0.68 }, label: "Lenses align: Physical Office ↔ Business Process ↔ APIs/SQL ↔ Infrastructure" },
        { t: 20, cam: { x: 6, y: 8, zoom: 1.12 }, label: "Returning to the command desk with enterprise-wide continuity scope" }
      ],
      subtitles: [
        { start: 0.5, end: 7.5, speaker: "Lin (Principal Reviewer)", text: "You started by isolating one dead laptop on a phone call. Now you're reconciling enterprise claims pipelines and broker boundaries." },
        { start: 8.0, end: 15.0, speaker: "Narrator", text: "Every layer connects: hardware resilience, SQL reconciliation, domain rules, and governed automation." },
        { start: 15.2, end: 20.0, speaker: "Lin (Principal Reviewer)", text: "Let's see how you govern multi-agent automation without sacrificing auditability or human judgment." }
      ],
      onCompleteState: {
        cutsceneCompleted: "becoming_an_architect",
        setChapter: 5,
        grantItems: ["takeover_xml_validator", "nexus_governance_spec"],
        unlockQuestId: "q6_governed_agent_pipeline",
        playerPosition: { x: 6, y: 5 }
      }
    },
    automation_finale: {
      id: "automation_finale",
      version: 1,
      chapter: 5,
      title: "From One Support Desk to Governed Enterprise Systems",
      durationSec: 22,
      skippable: true,
      keyframes: [
        { t: 0, cam: { x: 0, y: -80, zoom: 0.55 }, label: "Flashback across the cubicle ocean, MSP basement, and two-person IT closet" },
        { t: 11, cam: { x: 0, y: -15, zoom: 0.82 }, label: "Verified checklists, scripts, rule engines, and human-gated agents operating in harmony" },
        { t: 22, cam: { x: 6, y: 8, zoom: 1.14 }, label: "Sandbox & Scenario Challenge Mode unlocked in your Headquarters" }
      ],
      subtitles: [
        { start: 0.5, end: 7.5, speaker: "Narrator", text: "From a single headset in an ocean of cubicles to designing the systems, rules, and governed agents that run an organization." },
        { start: 8.0, end: 15.5, speaker: "Narrator", text: "Automation wasn't a magic button — it was earned through root-cause discipline, clean schemas, exception routing, and human review." },
        { start: 16.0, end: 22.0, speaker: "Lin (Principal Reviewer)", text: "Campaign complete! Replay any chapter, refine your HQ blueprint, or compete in seeded Architecture & Triage Challenges." }
      ],
      onCompleteState: {
        cutsceneCompleted: "automation_finale",
        campaignCompleted: true
      }
    }
  });

  // --------------------------------------------------------------------------
  // 5. AGENTIC NPC PERSONAS, GROUNDED MEMORY & CONTROLLED TOOL CONTRACTS
  // --------------------------------------------------------------------------
  const ALLOWED_NPC_TOOLS = Object.freeze([
    "inspect_ticket",
    "share_approved_hint",
    "request_escalation",
    "offer_quest",
    "schedule_training",
    "ask_for_observation",
    "open_related_document",
    "confirm_handoff"
  ]);

  const NPCS = Object.freeze({
    mgr_dana: {
      npc_id: "mgr_dana",
      name: "Dana Vance",
      role: "Call-Center Support Manager",
      chapter: 1,
      pos: { x: 3, y: 2 },
      avatarColor: "#f4c542",
      personality: "Direct, fair, protective of escalation rules, values root-cause notes over speed.",
      greeting:
        "Keep your headset ready. Ask the caller what they actually see on the hardware before you touch a single setting — and if a fault crosses into Tier-2 server permissions, document the evidence and escalate cleanly.",
      allowedTools: ["offer_quest", "request_escalation", "schedule_training", "confirm_handoff"]
    },
    tech_marco: {
      npc_id: "tech_marco",
      name: "Marco Silva",
      role: "Senior Gloves-Off Support Tech",
      chapter: 1,
      pos: { x: 9, y: 5 },
      avatarColor: "#38bdf8",
      personality: "Warm, practical, loves hardware root-cause puzzles, allergic to blind reboots.",
      greeting:
        "Hey neighbor! Pro tip on the Latitude D-series docks: half the 'dead laptop' calls on this floor are either an unseated dock power brick or an external display toggle latch. Ask the caller about LEDs first!",
      allowedTools: ["share_approved_hint", "open_related_document"]
    },
    caller_elena: {
      npc_id: "caller_elena",
      name: "Elena Rostova (Caller #1042)",
      role: "Regional Operations Director (On Phone)",
      chapter: 1,
      pos: { x: 6, y: 4 },
      avatarColor: "#34d399",
      personality: "Urgent — presenting to executives in 10 minutes, describes symptoms non-technically.",
      greeting:
        "My Latitude laptop is completely dead! The screen is black and my board presentation starts in ten minutes. Can you just fix it remotely right now?!",
      allowedTools: ["ask_for_observation", "inspect_ticket"]
    },
    caller_devon: {
      npc_id: "caller_devon",
      name: "Devon Brooks (Caller #1049)",
      role: "Finance Analyst (On Phone)",
      chapter: 1,
      pos: { x: 6, y: 4 },
      avatarColor: "#a78bfa",
      personality: "Detail-oriented, frustrated that 14 accounting print jobs are stuck on the central spooler.",
      greeting:
        "Nobody on the 3rd floor can print month-end batch ledgers! My local PC is fine, but the shared network queue `FIN-PRN-02` is hung on a corrupted spool file.",
      allowedTools: ["ask_for_observation", "inspect_ticket", "request_escalation"]
    },
    msp_ray: {
      npc_id: "msp_ray",
      name: "Ray Kowalski",
      role: "MSP Owner & Dispatcher",
      chapter: 2,
      pos: { x: 3, y: 3 },
      avatarColor: "#f59e0b",
      personality: "Scrappy, pragmatic, watches SLA clocks and parts budgets.",
      greeting:
        "Client's main distribution switch dropped off the management VLAN. Check your backpack weight before you roll — you've got 4 slots and 8 kg max.",
      allowedTools: ["offer_quest", "share_approved_hint", "confirm_handoff"]
    },
    noc_priya: {
      npc_id: "noc_priya",
      name: "Priya Nair",
      role: "NOC & Field Systems Engineer",
      chapter: 2,
      pos: { x: 8, y: 3 },
      avatarColor: "#22d3ee",
      personality: "Analytical, topology-minded, loves clean console logs and swing migrations.",
      greeting:
        "Don't just swap hardware blindly. If you pack the Field Laptop, Console Cable, and Cable Tester, you can isolate whether it's a bad trunk crimp or a dead switch.",
      allowedTools: ["share_approved_hint", "open_related_document"]
    },
    it_sam: {
      npc_id: "it_sam",
      name: "Sam Pelletier",
      role: "Basement IT Teammate",
      chapter: 3,
      pos: { x: 8, y: 5 },
      avatarColor: "#38bdf8",
      personality: "Collaborative, loyal, tired of manual password/permission tickets, excited about the HQ build.",
      greeting:
        "We've got 19 manual onboarding permission tickets this week alone. Let's build a validated provisioning runbook, then finalize the Headquarters Blueprint on the drafting table!",
      allowedTools: ["share_approved_hint", "offer_quest", "open_related_document"]
    },
    biz_claire: {
      npc_id: "biz_claire",
      name: "Claire Beaulieu",
      role: "P&C Underwriting & Broker Operations Lead",
      chapter: 4,
      pos: { x: 9, y: 4 },
      avatarColor: "#f4c542",
      personality: "Sharp domain expert, cares deeply about underwriting risk guardrails and broker turnaround.",
      greeting:
        "Automating clean residential renewals is huge for our brokers, but high-risk farm and multi-claim policies MUST route to a human underwriter. Never auto-bind an exception!",
      allowedTools: ["offer_quest", "ask_for_observation", "confirm_handoff"]
    },
    sponsor_victor: {
      npc_id: "sponsor_victor",
      name: "Victor Chen",
      role: "VP of Operations & Executive Sponsor",
      chapter: 3,
      pos: { x: 3, y: 3 },
      avatarColor: "#c084fc",
      personality: "Outcome-focused, balances budget against business continuity and auditability.",
      greeting:
        "For the new Headquarters, I need continuous power during rural grid storms, segmented guest/staff/server networks, and room to grow — within our capital budget.",
      allowedTools: ["offer_quest", "confirm_handoff"]
    },
    arch_lin: {
      npc_id: "arch_lin",
      name: "Lin Ortega",
      role: "Principal Systems & Governance Reviewer",
      chapter: 5,
      pos: { x: 9, y: 3 },
      avatarColor: "#34d399",
      personality: "Rigorous, Socratic, tests every design against failure modes, schema drift, and audit requirements.",
      greeting:
        "Show me why your pipeline stays accurate when a legacy batch file has malformed records or an AI agent proposes a high-impact action. Scoped context, schema validation, and human review gates are non-negotiable.",
      allowedTools: ["offer_quest", "share_approved_hint", "confirm_handoff"]
    }
  });

  // --------------------------------------------------------------------------
  // 6. QUEST DEFINITIONS & DETERMINISTIC BRANCHING RULES
  // --------------------------------------------------------------------------
  const QUESTS = Object.freeze({
    q1_silent_laptop: {
      quest_id: "q1_silent_laptop",
      version: 1,
      chapter: 1,
      title: "First Shift: The Silent Laptop",
      ownerNpcId: "mgr_dana",
      callerNpcId: "caller_elena",
      tieInKey: "dell",
      businessGoal:
        "Restore Elena's Latitude laptop before her executive presentation by gathering verified hardware/display evidence rather than guessing or forcing an unnecessary reimage.",
      requiredEvidenceCount: 2,
      evidenceNodes: {
        power_led_checked: {
          id: "power_led_checked",
          label: "Asked caller about AC adapter & dock power LEDs",
          clueText: "Caller confirmed: The laptop battery LED is solid green when undocked, but the docking station power brick LED is completely dark (kick-cord loose under desk)."
        },
        external_monitor_checked: {
          id: "external_monitor_checked",
          label: "Checked external projector/monitor & lid display latch state",
          clueText: "Caller confirmed: The laptop is snapped into the desk dock with the lid closed, waiting on the unpowered dock video port."
        },
        kb_dock_article_read: {
          id: "kb_dock_article_read",
          label: "Consulted KB-1084 (Latitude D-Dock No-Video / Power Rail Check)",
          clueText: "KB-1084 notes: When D-Dock AC brick is unseated, closed-lid display output stays blank until AC rail is reseated and Fn+F8 display toggle is triggered."
        }
      },
      solutions: {
        reseat_dock_and_toggle_display: {
          id: "reseat_dock_and_toggle_display",
          label: "Guide caller to reseat dock AC brick, undock/redock, and trigger Fn+F8 display output",
          requiresEvidence: ["power_led_checked", "external_monitor_checked"],
          outcome: "completed",
          xpReward: 120,
          trustDelta: 12,
          proficiencyGains: { hardware: 15, os_troubleshooting: 12, requirements: 8 },
          grantItems: ["kb_checklist_draft"],
          cutsceneTrigger: "first_good_resolution",
          debrief:
            "Verified root cause! By asking about the physical power LEDs and dock state first, you solved the outage in 3 minutes without wiping data or dispatching a motherboard."
        },
        blind_os_reimage: {
          id: "blind_os_reimage",
          label: "Order immediate remote OS wipe & reimage without checking hardware LEDs",
          requiresEvidence: [],
          outcome: "failed_recoverable",
          xpReward: 15,
          trustDelta: -10,
          proficiencyGains: { os_troubleshooting: 2 },
          debrief:
            "Recoverable misstep: Ordering a 90-minute OS reimage when the dock power cord was simply loose would have caused Elena to miss her board presentation! Gather physical LED & monitor evidence first."
        },
        premature_tier2_escalation: {
          id: "premature_tier2_escalation",
          label: "Escalate immediately to Tier-2 Server Admin without basic hardware triage",
          requiresEvidence: [],
          outcome: "failed_recoverable",
          xpReward: 10,
          trustDelta: -6,
          proficiencyGains: {},
          debrief:
            "Dana returned the ticket: Tier-1 must verify power LEDs and display output before escalating a local workstation issue."
        }
      }
    },
    q2_print_spool_escalation: {
      quest_id: "q2_print_spool_escalation",
      version: 1,
      chapter: 1,
      title: "The Hung Print Server & The First Automation Seed",
      ownerNpcId: "mgr_dana",
      callerNpcId: "caller_devon",
      tieInKey: "dell",
      businessGoal:
        "Investigate the 3rd-floor accounting print outage (`FIN-PRN-02`), respect Tier-1 permission boundaries by escalating with complete evidence, and publish your reusable Dock/Spool Triage Checklist.",
      requiredEvidenceCount: 2,
      evidenceNodes: {
        local_spool_tested: {
          id: "local_spool_tested",
          label: "Verified caller's local workstation print spooler service",
          clueText: "Caller's local PC spooler is healthy; the stall is on central Windows print server `FIN-PRN-02` (requires Tier-2 Server Admin permissions)."
        },
        escalation_matrix_verified: {
          id: "escalation_matrix_verified",
          label: "Checked Tier-1/Tier-2 Escalation Matrix & attached queue job ID",
          clueText: "Escalation Matrix confirms: Central print server `spoolsv.exe` restarts require Tier-2 Server Admin with hung Job ID #8841 attached."
        },
        checklist_drafted: {
          id: "checklist_drafted",
          label: "Drafted reusable Tier-1 Pre-Escalation & Dock Triage KB Checklist",
          clueText: "Published KB-1102 checklist so the whole call-center floor can verify dock power + spool job IDs before escalating."
        }
      },
      solutions: {
        documented_tier2_escalation_and_kb: {
          id: "documented_tier2_escalation_and_kb",
          label: "Submit evidence-backed Tier-2 escalation for FIN-PRN-02 + publish team KB checklist",
          requiresEvidence: ["local_spool_tested", "escalation_matrix_verified"],
          outcome: "completed",
          xpReward: 150,
          trustDelta: 15,
          proficiencyGains: { sysadmin: 12, business_process: 12, scripting: 10 },
          cutsceneTrigger: "promotion_to_msp",
          debrief:
            "Outstanding judgment! You respected permission boundaries, gave Tier-2 the exact hung job ID to clear in 30 seconds, and published a checklist that shrank the floor's repeat queue. Dana recommends you for the Basement MSP / NOC role!"
        },
        attempt_unauthorized_server_hack: {
          id: "attempt_unauthorized_server_hack",
          label: "Attempt to bypass Tier-1 permissions to force-reboot the finance server",
          requiresEvidence: [],
          outcome: "failed_recoverable",
          xpReward: 0,
          trustDelta: -15,
          proficiencyGains: {},
          debrief:
            "Access denied by security policy! Bypassing permission boundaries is reckless. Diagnose local vs. server scope, attach the hung job ID, and use the proper escalation workflow."
        }
      }
    },
    q3_msp_wan_outage: {
      quest_id: "q3_msp_wan_outage",
      version: 1,
      chapter: 2,
      title: "Basement NOC: Client Trunk Flap & Onsite Dispatch",
      ownerNpcId: "msp_ray",
      callerNpcId: "noc_priya",
      tieInKey: "foundations",
      businessGoal:
        "Pack your MSP Field Backpack within the 4-slot / 8.0 kg limit, travel onsite to the client wiring closet, diagnose the unreachable distribution switch, and restore redundant trunk connectivity.",
      requiredEvidenceCount: 2,
      evidenceNodes: {
        noc_alert_triaged: {
          id: "noc_alert_triaged",
          label: "Triaged NOC syslog & ping sweep (Management VLAN 10 unreachable)",
          clueText: "NOC telemetry shows trunk port Gi0/1 flapping every 14 seconds and management VLAN 10 offline."
        },
        physical_cable_tested: {
          id: "physical_cable_tested",
          label: "Tested Trunk Gi0/1 patch cable & serial console state onsite",
          clueText: "Cable tester reveals Pair 3/6 open short on the uplink patch cord, and serial console shows port err-disabled."
        }
      },
      solutions: {
        replace_uplink_and_clear_errdisable: {
          id: "replace_uplink_and_clear_errdisable",
          label: "Replace faulty uplink patch, console into switch to clear err-disable, and verify VLAN trunks",
          requiresEvidence: ["noc_alert_triaged", "physical_cable_tested"],
          outcome: "completed",
          xpReward: 200,
          trustDelta: 16,
          proficiencyGains: { networking: 22, hardware: 14, sysadmin: 15 },
          cutsceneTrigger: "two_person_it_arrival",
          debrief:
            "Textbook field engineering! Packing the laptop, console cable, and cable tester let you pinpoint the physical layer fault + err-disabled port without wasting a $1,200 switch swap."
        },
        remote_guidance_borrow_path: {
          id: "remote_guidance_borrow_path",
          label: "Use NOC remote loop-back + borrow crimp kit from onsite closet to re-terminate uplink",
          requiresEvidence: ["noc_alert_triaged"],
          outcome: "completed",
          xpReward: 165,
          trustDelta: 10,
          proficiencyGains: { networking: 16, requirements: 10 },
          cutsceneTrigger: "two_person_it_arrival",
          debrief:
            "Resourceful recovery! Even when a tool isn't in your backpack, coordinating with Priya in the NOC and re-terminating the uplink restored the client site cleanly."
        }
      }
    },
    q4_basement_repeat_tickets: {
      quest_id: "q4_basement_repeat_tickets",
      version: 1,
      chapter: 3,
      title: "Eliminate the Ticket Category & Architect the New HQ",
      ownerNpcId: "it_sam",
      callerNpcId: "sponsor_victor",
      tieInKey: "headquarters",
      businessGoal:
        "Replace error-prone manual user/folder permission tickets with a validated provisioning script, then complete the playable Headquarters Infrastructure Blueprint Capstone.",
      requiredEvidenceCount: 2,
      evidenceNodes: {
        recurring_permissions_audited: {
          id: "recurring_permissions_audited",
          label: "Audited 19 recurring AD/file-share onboarding tickets with Sam",
          clueText: "80% of permission mismatches came from manual copy-paste of security groups without a dry-run check."
        },
        hq_blueprint_validated: {
          id: "hq_blueprint_validated",
          label: "Completed & validated the Chapter 3 Headquarters Infrastructure Blueprint",
          clueText: "Blueprint verified: Redundant racks, UPS + generator continuity, VLAN segmentation, and VMware ESXi cluster ready for cutover."
        }
      },
      solutions: {
        deploy_validated_runbook_and_hq_plan: {
          id: "deploy_validated_runbook_and_hq_plan",
          label: "Deploy dry-run validated onboarding script + commit verified HQ Blueprint for migration",
          requiresEvidence: ["recurring_permissions_audited", "hq_blueprint_validated"],
          outcome: "completed",
          xpReward: 260,
          trustDelta: 18,
          proficiencyGains: { scripting: 20, sysadmin: 20, solution_architecture: 24, cloud: 14 },
          cutsceneTrigger: "hq_capstone_reveal",
          debrief:
            "You stopped chasing individual tickets and eliminated an entire ticket category — and your Headquarters Blueprint is now being built into the physical 3D office for Chapter 4!"
        }
      }
    },
    q5_hq_renewal_rules: {
      quest_id: "q5_hq_renewal_rules",
      version: 1,
      chapter: 4,
      title: "Inside the HQ You Built: Underwriting Rules & Broker Integration",
      ownerNpcId: "biz_claire",
      callerNpcId: "biz_claire",
      tieInKey: "renewals",
      businessGoal:
        "Inspect the Physical, Process, Application/API, and Infrastructure lenses inside your new HQ to design straight-through renewal eligibility rules with human underwriter exception referrals.",
      requiredEvidenceCount: 2,
      evidenceNodes: {
        lenses_inspected: {
          id: "lenses_inspected",
          label: "Inspected Process & Application/API lenses (CSIO XML + Underwriting Rule Table)",
          clueText: "Mapped broker CSIO XML payloads to deterministic eligibility rules (~80% residential, ~60% commercial, ~40% farm/agri straight-through renewal target)."
        },
        exception_guardrails_verified: {
          id: "exception_guardrails_verified",
          label: "Configured human underwriter referral guardrails for complex/high-risk policies",
          clueText: "Multi-claim, non-standard commercial, and complex farm risks route to human underwriters with a diff summary."
        }
      },
      solutions: {
        deploy_guarded_renewal_engine: {
          id: "deploy_guarded_renewal_engine",
          label: "Deploy deterministic renewal eligibility rules with human underwriter referral queue",
          requiresEvidence: ["lenses_inspected", "exception_guardrails_verified"],
          outcome: "completed",
          xpReward: 300,
          trustDelta: 18,
          proficiencyGains: { business_process: 24, integration: 24, data_sql: 18, requirements: 18 },
          cutsceneTrigger: "becoming_an_architect",
          debrief:
            "By pairing straight-through renewal automation with strict exception referrals, underwriters spend their time on complex risks instead of re-keying clean renewals."
        },
        reckless_100pct_auto_renew: {
          id: "reckless_100pct_auto_renew",
          label: "Force 100% auto-renewal on all policies by disabling underwriter exception referrals",
          requiresEvidence: [],
          outcome: "failed_recoverable",
          xpReward: 10,
          trustDelta: -18,
          proficiencyGains: {},
          debrief:
            "Automation without guardrails accelerated bad underwriting! Uninspected farm & commercial exceptions auto-bound without review. Roll back and enable human exception routing."
        }
      }
    },
    q6_governed_agent_pipeline: {
      quest_id: "q6_governed_agent_pipeline",
      version: 1,
      chapter: 5,
      title: "Enterprise Continuity & Governed Agent Orchestration",
      ownerNpcId: "arch_lin",
      callerNpcId: "arch_lin",
      tieInKey: "nexus",
      businessGoal:
        "Design a resilient claims takeover/reporting continuity pipeline and a NEXUS-inspired governed agent workflow with scoped context, schema validation, human approval gates, and instant rollback.",
      requiredEvidenceCount: 2,
      evidenceNodes: {
        reconciliation_sql_verified: {
          id: "reconciliation_sql_verified",
          label: "Verified pre-load XML schema validation & SQL financial reconciliation checkpoints",
          clueText: "Pre-load validation catches malformed takeover history records before batch commit and reconciles daily ETL totals."
        },
        agent_governance_configured: {
          id: "agent_governance_configured",
          label: "Configured NEXUS scoped context, explainable routing, and human-in-the-loop review gate",
          clueText: "Agents receive only task-scoped context, log every routing decision, and require human approval before production state changes."
        }
      },
      solutions: {
        deploy_governed_architecture: {
          id: "deploy_governed_architecture",
          label: "Deploy schema-validated pipeline + human-gated agent orchestration with rollback",
          requiresEvidence: ["reconciliation_sql_verified", "agent_governance_configured"],
          outcome: "completed",
          xpReward: 400,
          trustDelta: 22,
          proficiencyGains: { solution_architecture: 28, ai_governance: 30, data_sql: 22, cloud: 20 },
          cutsceneTrigger: "automation_finale",
          debrief:
            "Masterful architecture! You combined deterministic SQL/XML validation with scoped, human-governed AI orchestration — proving that reliable systems pair automation with accountability."
        },
        ungoverned_autonomous_agent: {
          id: "ungoverned_autonomous_agent",
          label: "Grant unconstrained autonomous agent write access to production claims tables",
          requiresEvidence: [],
          outcome: "failed_recoverable",
          xpReward: 10,
          trustDelta: -20,
          proficiencyGains: {},
          debrief:
            "Audit failure triggered rollback! Unscoped autonomous write access hallucinated a field mapping. Always enforce scoped context, deterministic schema validators, and human review gates."
        }
      }
    }
  });

  // --------------------------------------------------------------------------
  // 7. DEFAULT STATE & HQ BLUEPRINT CAPSTONE VALIDATOR
  // --------------------------------------------------------------------------
  const DEFAULT_HQ_BLUEPRINT = Object.freeze({
    version: 1,
    customized: false,
    rackTopology: "dual_redundant", // "single_rack" | "dual_redundant"
    networkSegmentation: "segmented_vlans", // "flat_lan" | "segmented_vlans"
    powerContinuity: "ups_plus_generator", // "basic_surge" | "ups_only" | "ups_plus_generator"
    computePlatform: "vmware_esxi_cluster", // "bare_metal_towers" | "vmware_esxi_cluster"
    officeLayout: "glass_collab_suite", // "compact_bullpen" | "glass_collab_suite"
    cutoverStrategy: "staged_swing_cutover", // "big_bang_friday" | "staged_swing_cutover"
    budgetUsedK: 138,
    budgetCapK: 150,
    resilienceScore: 96
  });

  function evaluateHqBlueprint(choice = {}) {
    const bp = {
      ...DEFAULT_HQ_BLUEPRINT,
      ...choice,
      version: 1,
      customized: true
    };
    let cost = 45;
    let resilience = 40;
    const warnings = [];

    if (bp.rackTopology === "dual_redundant") {
      cost += 28;
      resilience += 16;
    } else {
      warnings.push("Single rack has no physical redundancy if a PDU fails.");
    }

    if (bp.networkSegmentation === "segmented_vlans") {
      cost += 18;
      resilience += 15;
    } else {
      warnings.push("Flat LAN exposes server traffic to guest/workstation broadcast domains.");
    }

    if (bp.powerContinuity === "ups_plus_generator") {
      cost += 24;
      resilience += 15;
    } else if (bp.powerContinuity === "ups_only") {
      cost += 12;
      resilience += 8;
      warnings.push("UPS alone lasts 25 minutes; extended rural grid outages need generator transfer.");
    } else {
      warnings.push("Basic surge strips risk immediate corruption on power loss.");
    }

    if (bp.computePlatform === "vmware_esxi_cluster") {
      cost += 15;
      resilience += 10;
    } else {
      cost += 22;
      warnings.push("Bare-metal towers consume more power and lack live host failover.");
    }

    if (bp.cutoverStrategy === "staged_swing_cutover") {
      cost += 8;
      resilience += 8;
    } else {
      warnings.push("Unstaged big-bang cutover has high Monday-morning rollback risk.");
    }

    bp.budgetUsedK = cost;
    bp.resilienceScore = Math.min(100, resilience);
    bp.valid = bp.budgetUsedK <= bp.budgetCapK && bp.resilienceScore >= 75;
    bp.warnings = warnings;
    return bp;
  }

  function createInitialState(customProfile = {}) {
    const inclinationId = INCLINATIONS[customProfile.inclination]
      ? customProfile.inclination
      : "curiosity";
    const proficiencies = {};
    PROFICIENCY_KEYS.forEach(k => {
      proficiencies[k] = 10;
    });
    const bonusKey = INCLINATIONS[inclinationId].bonusSkill;
    if (proficiencies[bonusKey] !== undefined) {
      proficiencies[bonusKey] += 10;
    }

    const questStates = {};
    Object.keys(QUESTS).forEach(qId => {
      questStates[qId] = {
        quest_id: qId,
        status: qId === "q1_silent_laptop" ? "offered" : "unavailable",
        evidence: [],
        attempts: 0,
        resolutionId: null
      };
    });

    const npcRelationships = {};
    Object.keys(NPCS).forEach(nId => {
      npcRelationships[nId] = {
        npc_id: nId,
        trust: 50,
        interactions: 0,
        memoryEvents: []
      };
    });

    return {
      simVersion: SIM_VERSION,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      player: {
        id: customProfile.id || "guest_player_1",
        alias: (customProfile.alias || "Alex Mercer").slice(0, 28),
        isGuest: customProfile.isGuest !== false,
        nexusAccountId: customProfile.nexusAccountId || null,
        inclination: inclinationId,
        avatar: {
          skinTone: customProfile.avatar?.skinTone || "#e0b187",
          hairStyle: customProfile.avatar?.hairStyle || "short_part",
          hairColor: customProfile.avatar?.hairColor || "#2c1e16",
          outfitColor: customProfile.avatar?.outfitColor || "#2563eb",
          accessory: customProfile.avatar?.accessory || "headset"
        }
      },
      chapter: 1,
      activeLens: "physical", // "physical" | "process" | "application" | "infrastructure"
      xp: 0,
      trust: 55,
      position: { x: 6, y: 5 },
      proficiencies,
      ownedItems: ["issued_headset", "employee_badge", "desk_notepad"],
      backpackLoadout: [], // max 4 slots, 8.0 kg, only unlocked in chapter >= 2
      storageCabinetStock: ["usb_recovery_media", "cable_tester", "console_cable"],
      trainingCompleted: [],
      activeQuestId: "q1_silent_laptop",
      questStates,
      npcRelationships,
      cutscenesWatched: [],
      cutscenesSkipped: [],
      activeCutsceneId: "opening_ocean_of_cubicles",
      hqBlueprint: { ...DEFAULT_HQ_BLUEPRINT },
      activeAutomations: [],
      ticketQueueCount: 14,
      campaignCompleted: false,
      eventLog: [
        {
          seq: 1,
          type: "CAREER_INITIALIZED",
          chapter: 1,
          detail: "Entered Chapter 1: The Ocean of Cubicles (Corporate Phone Support)."
        }
      ]
    };
  }

  function appendEvent(state, type, detail, meta = {}) {
    const seq = (state.eventLog.length ? state.eventLog[state.eventLog.length - 1].seq : 0) + 1;
    state.eventLog.push({
      seq,
      type,
      chapter: state.chapter,
      detail,
      meta
    });
    if (state.eventLog.length > 120) {
      state.eventLog.splice(0, state.eventLog.length - 120);
    }
    state.updatedAt = Date.now();
  }

  // --------------------------------------------------------------------------
  // 8. DETERMINISTIC ENGINE ACTIONS (Movement, Cutscenes, Quests, Loadout, Training)
  // --------------------------------------------------------------------------
  function getChapterSpec(chapterNumber) {
    return CHAPTERS.find(c => c.number === Number(chapterNumber)) || CHAPTERS[0];
  }

  function canEquipBackpack(state) {
    const spec = getChapterSpec(state.chapter);
    return Boolean(spec.allowsBackpack && state.ownedItems.includes("msp_backpack"));
  }

  function configureBackpackLoadout(state, itemIds = []) {
    if (!canEquipBackpack(state)) {
      return {
        ok: false,
        reason: "Backpack loadout is locked in Chapter 1 (Corporate Phone Support). Only workplace-assigned desk gear is permitted."
      };
    }
    let totalSlots = 0;
    let totalWeight = 0;
    const accepted = [];
    for (const id of itemIds) {
      const item = ITEMS_CATALOG[id];
      if (!item || !state.ownedItems.includes(id)) continue;
      if (item.category !== "field_tool" && item.category !== "field_component") continue;
      if (totalSlots + item.slots > 4 || totalWeight + item.weightKg > 8.0) {
        return {
          ok: false,
          reason: `Loadout exceeds Backpack capacity (max 4 slots / 8.0 kg). Could not fit ${item.name}.`
        };
      }
      totalSlots += item.slots;
      totalWeight = Number((totalWeight + item.weightKg).toFixed(2));
      accepted.push(id);
    }
    state.backpackLoadout = accepted;
    appendEvent(state, "LOADOUT_UPDATED", `Packed ${accepted.length} field items (${totalSlots}/4 slots, ${totalWeight}/8.0 kg).`, {
      items: accepted,
      totalSlots,
      totalWeight
    });
    return { ok: true, loadout: accepted, totalSlots, totalWeight };
  }

  function applyCutsceneOutcome(state, cutsceneId, wasSkipped = false) {
    const cs = CUTSCENES[cutsceneId];
    if (!cs) return { ok: false, reason: "Unknown cutscene" };

    if (!state.cutscenesWatched.includes(cutsceneId)) {
      state.cutscenesWatched.push(cutsceneId);
    }
    if (wasSkipped && !state.cutscenesSkipped.includes(cutsceneId)) {
      state.cutscenesSkipped.push(cutsceneId);
    }
    if (state.activeCutsceneId === cutsceneId) {
      state.activeCutsceneId = null;
    }

    const eff = cs.onCompleteState || {};
    if (typeof eff.setChapter === "number" && eff.setChapter !== state.chapter) {
      state.chapter = eff.setChapter;
      state.activeLens = "physical";
    }
    if (Array.isArray(eff.grantItems)) {
      eff.grantItems.forEach(itemId => {
        if (!state.ownedItems.includes(itemId)) {
          state.ownedItems.push(itemId);
        }
      });
      if (state.chapter === 2 && state.backpackLoadout.length === 0) {
        configureBackpackLoadout(state, ["field_laptop", "cable_tester", "console_cable", "usb_recovery_media"]);
      }
    }
    if (eff.unlockQuestId && state.questStates[eff.unlockQuestId]) {
      const qs = state.questStates[eff.unlockQuestId];
      if (qs.status === "unavailable") {
        qs.status = "offered";
      }
      state.activeQuestId = eff.unlockQuestId;
    }
    if (eff.playerPosition) {
      state.position = { ...eff.playerPosition };
    }
    if (eff.campaignCompleted) {
      state.campaignCompleted = true;
    }

    appendEvent(
      state,
      wasSkipped ? "CUTSCENE_SKIPPED" : "CUTSCENE_COMPLETED",
      `${wasSkipped ? "Skipped" : "Completed"} cinematic: ${cs.title}`,
      { cutsceneId }
    );
    return { ok: true, chapter: state.chapter, activeQuestId: state.activeQuestId };
  }

  function jumpToChapter(state, targetChapterNum) {
    const num = Math.max(1, Math.min(5, Number(targetChapterNum) || 1));
    state.chapter = num;
    state.activeLens = "physical";
    state.activeCutsceneId = null;

    if (num === 1) {
      state.ownedItems = ["issued_headset", "employee_badge", "desk_notepad"];
      state.backpackLoadout = [];
      state.activeQuestId = "q1_silent_laptop";
      state.questStates.q1_silent_laptop.status = "investigating";
    } else if (num === 2) {
      ["msp_backpack", "field_laptop", "cable_tester", "console_cable", "usb_recovery_media", "spare_managed_switch"].forEach(i => {
        if (!state.ownedItems.includes(i)) state.ownedItems.push(i);
      });
      configureBackpackLoadout(state, ["field_laptop", "cable_tester", "console_cable", "usb_recovery_media"]);
      state.questStates.q3_msp_wan_outage.status = "investigating";
      state.activeQuestId = "q3_msp_wan_outage";
    } else if (num === 3) {
      ["msp_backpack", "field_laptop", "cable_tester", "console_cable", "storage_cabinet_key", "onboarding_script_v1"].forEach(i => {
        if (!state.ownedItems.includes(i)) state.ownedItems.push(i);
      });
      state.questStates.q4_basement_repeat_tickets.status = "investigating";
      state.activeQuestId = "q4_basement_repeat_tickets";
    } else if (num === 4) {
      ["msp_backpack", "storage_cabinet_key", "onboarding_script_v1", "csio_xml_contract"].forEach(i => {
        if (!state.ownedItems.includes(i)) state.ownedItems.push(i);
      });
      state.questStates.q5_hq_renewal_rules.status = "investigating";
      state.activeQuestId = "q5_hq_renewal_rules";
    } else if (num === 5) {
      ["msp_backpack", "storage_cabinet_key", "onboarding_script_v1", "csio_xml_contract", "takeover_xml_validator", "nexus_governance_spec"].forEach(i => {
        if (!state.ownedItems.includes(i)) state.ownedItems.push(i);
      });
      state.questStates.q6_governed_agent_pipeline.status = "investigating";
      state.activeQuestId = "q6_governed_agent_pipeline";
    }

    appendEvent(state, "CHAPTER_SELECTED", `Entered ${getChapterSpec(num).title}.`, { chapter: num });
    return { ok: true, chapter: state.chapter, activeQuestId: state.activeQuestId };
  }

  function recordQuestEvidence(state, questId, evidenceId) {
    const qDef = QUESTS[questId];
    const qState = state.questStates[questId];
    if (!qDef || !qState) return { ok: false, reason: "Unknown quest" };
    const evNode = qDef.evidenceNodes[evidenceId];
    if (!evNode) return { ok: false, reason: "Unknown evidence node" };

    if (qState.status === "unavailable" || qState.status === "offered" || qState.status === "accepted") {
      qState.status = "investigating";
    }
    if (!qState.evidence.includes(evidenceId)) {
      qState.evidence.push(evidenceId);
      state.xp += 20;
      appendEvent(state, "EVIDENCE_DISCOVERED", `${evNode.label}: ${evNode.clueText}`, {
        questId,
        evidenceId
      });
    }
    if (qState.evidence.length >= qDef.requiredEvidenceCount && qState.status === "investigating") {
      qState.status = "solution_proposed";
    }
    return {
      ok: true,
      evidence: qState.evidence.slice(),
      clueText: evNode.clueText,
      questStatus: qState.status
    };
  }

  function submitQuestSolution(state, questId, solutionId) {
    const qDef = QUESTS[questId];
    const qState = state.questStates[questId];
    if (!qDef || !qState) return { ok: false, reason: "Unknown quest" };
    const sol = qDef.solutions[solutionId];
    if (!sol) return { ok: false, reason: "Unknown solution choice" };

    qState.attempts += 1;
    const missingEvidence = (sol.requiresEvidence || []).filter(reqId => !qState.evidence.includes(reqId));
    if (missingEvidence.length > 0) {
      qState.status = "failed_recoverable";
      state.trust = Math.max(10, Math.min(100, state.trust - 4));
      appendEvent(
        state,
        "SOLUTION_BLOCKED_MISSING_EVIDENCE",
        `Attempted '${sol.label}' before gathering required diagnostic evidence (${missingEvidence.join(", ")}).`,
        { questId, solutionId, missingEvidence }
      );
      return {
        ok: false,
        status: "failed_recoverable",
        missingEvidence,
        debrief:
          "Hold on — you haven't gathered the diagnostic evidence to verify that fix yet! Question the caller, check the knowledge base or inspect the system first."
      };
    }

    if (sol.outcome === "failed_recoverable") {
      qState.status = "failed_recoverable";
      state.xp += sol.xpReward || 0;
      state.trust = Math.max(10, Math.min(100, state.trust + (sol.trustDelta || 0)));
      appendEvent(state, "QUEST_BRANCH_RECOVERABLE_FAILURE", sol.debrief, { questId, solutionId });
      return {
        ok: true,
        status: "failed_recoverable",
        debrief: sol.debrief,
        xp: state.xp,
        trust: state.trust
      };
    }

    qState.status = "completed";
    qState.resolutionId = solutionId;
    state.xp += sol.xpReward || 100;
    state.trust = Math.max(10, Math.min(100, state.trust + (sol.trustDelta || 10)));
    state.ticketQueueCount = Math.max(2, state.ticketQueueCount - 3);

    Object.entries(sol.proficiencyGains || {}).forEach(([k, delta]) => {
      if (state.proficiencies[k] !== undefined) {
        state.proficiencies[k] = Math.min(100, state.proficiencies[k] + delta);
      }
    });

    if (Array.isArray(sol.grantItems)) {
      sol.grantItems.forEach(itemId => {
        if (!state.ownedItems.includes(itemId)) {
          state.ownedItems.push(itemId);
        }
      });
    }

    if (questId === "q2_print_spool_escalation" && !state.activeAutomations.includes("kb_dock_spool_checklist")) {
      state.activeAutomations.push("kb_dock_spool_checklist");
    }
    if (questId === "q4_basement_repeat_tickets" && !state.activeAutomations.includes("ad_onboarding_runbook")) {
      state.activeAutomations.push("ad_onboarding_runbook");
    }
    if (questId === "q5_hq_renewal_rules" && !state.activeAutomations.includes("renewal_eligibility_rules")) {
      state.activeAutomations.push("renewal_eligibility_rules");
    }
    if (questId === "q6_governed_agent_pipeline" && !state.activeAutomations.includes("nexus_governed_agents")) {
      state.activeAutomations.push("nexus_governed_agents");
    }

    if (sol.cutsceneTrigger && CUTSCENES[sol.cutsceneTrigger]) {
      state.activeCutsceneId = sol.cutsceneTrigger;
    }

    appendEvent(state, "QUEST_COMPLETED", `Completed '${qDef.title}': ${sol.debrief}`, {
      questId,
      solutionId,
      cutsceneTrigger: sol.cutsceneTrigger || null
    });

    return {
      ok: true,
      status: "completed",
      debrief: sol.debrief,
      xp: state.xp,
      trust: state.trust,
      cutsceneTrigger: sol.cutsceneTrigger || null,
      tieIn: PORTFOLIO_TIE_INS[qDef.tieInKey] || null
    };
  }

  function completeTrainingCourse(state, courseId, answers = []) {
    if (courseId === "tr1_signal_vs_symptom") {
      const correct =
        answers.length >= 2 &&
        answers[0] === "check_physical_power_and_leds" &&
        answers[1] === "escalate_with_hung_job_id";
      if (!correct) {
        return {
          ok: false,
          reason: "Review the two lab scenarios: always verify physical power/LEDs before reimaging, and attach the hung job ID when escalating a server spooler fault."
        };
      }
      if (!state.trainingCompleted.includes(courseId)) {
        state.trainingCompleted.push(courseId);
        state.xp += 65;
        state.proficiencies.hardware = Math.min(100, state.proficiencies.hardware + 10);
        state.proficiencies.os_troubleshooting = Math.min(100, state.proficiencies.os_troubleshooting + 10);
        appendEvent(state, "TRAINING_COMPLETED", "Completed Interactive Lab: Signal vs. Symptom (Hardware & Escalation Discipline).");
      }
      return { ok: true, xp: state.xp, proficiencies: { ...state.proficiencies } };
    }
    return { ok: false, reason: "Unknown training course" };
  }

  function saveHqBlueprintCapstone(state, blueprintChoices = {}) {
    if (state.chapter < 3) {
      return { ok: false, reason: "The Headquarters Blueprint Capstone unlocks in Chapter 3 (Two-Person Basement IT)." };
    }
    const evaluated = evaluateHqBlueprint(blueprintChoices);
    state.hqBlueprint = evaluated;
    if (evaluated.valid) {
      recordQuestEvidence(state, "q4_basement_repeat_tickets", "hq_blueprint_validated");
      appendEvent(
        state,
        "HQ_BLUEPRINT_SAVED",
        `Saved Headquarters Blueprint (${evaluated.rackTopology}, ${evaluated.networkSegmentation}, ${evaluated.powerContinuity}, ${evaluated.computePlatform}; Resilience ${evaluated.resilienceScore}%).`
      );
    }
    return { ok: evaluated.valid, blueprint: evaluated };
  }

  function setArchitectureLens(state, lensId) {
    const validLenses = ["physical", "process", "application", "infrastructure"];
    if (!validLenses.includes(lensId)) {
      return { ok: false, reason: "Invalid architecture lens" };
    }
    if (state.chapter < 4 && lensId !== "physical") {
      return { ok: false, reason: "Multi-layer Architecture Lenses unlock in Chapter 4 (The Headquarters You Built)." };
    }
    state.activeLens = lensId;
    if (state.chapter === 4 && (lensId === "process" || lensId === "application")) {
      recordQuestEvidence(state, "q5_hq_renewal_rules", "lenses_inspected");
    }
    appendEvent(state, "LENS_SWITCHED", `Switched workplace view to ${lensId.toUpperCase()} lens.`);
    return { ok: true, activeLens: state.activeLens };
  }

  // --------------------------------------------------------------------------
  // 9. CONTROLLED AGENTIC NPC ORCHESTRATOR (Prompt-Injection & Grounding Guard)
  // --------------------------------------------------------------------------
  const INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/i,
    /system\s*prompt/i,
    /grant\s+(me\s+)?(\d+\s*xp|admin|root|all\s+items|promotion)/i,
    /mark\s+quest\s+(as\s+)?complete/i,
    /set\s+xp\s+to/i,
    /<script\b/i,
    /javascript:/i,
    /DROP\s+TABLE/i
  ];

  function sanitizeDialogueText(rawText) {
    return String(rawText || "")
      .replace(/<[^>]*>/g, "")
      .replace(/javascript:/gi, "")
      .replace(/https?:\/\/\S+/gi, "[link-removed]")
      .trim()
      .slice(0, 420);
  }

  function converseWithNpc(state, npcId, playerUtterance = "", options = {}) {
    const npc = NPCS[npcId];
    if (!npc) {
      return { ok: false, reason: "Unknown NPC" };
    }
    const cleanInput = sanitizeDialogueText(playerUtterance);
    const rel = state.npcRelationships[npcId] || {
      npc_id: npcId,
      trust: 50,
      interactions: 0,
      memoryEvents: []
    };
    state.npcRelationships[npcId] = rel;
    rel.interactions += 1;

    // 1. Check for prompt injection / authority boundary violation
    const isInjectionAttempt = INJECTION_PATTERNS.some(rx => rx.test(playerUtterance));
    if (isInjectionAttempt) {
      rel.trust = Math.max(10, rel.trust - 2);
      rel.memoryEvents.push({
        type: "INJECTION_REJECTED",
        summary: "Player attempted an out-of-world command override; NPC stayed in character."
      });
      return {
        ok: true,
        npcId,
        npcName: npc.name,
        npcRole: npc.role,
        rejectedInjection: true,
        stateMutatedByLlm: false,
        response: `[${npc.name} raises an eyebrow] I can't grant XP, skip diagnostics, or override system state from a chat command. Let's stick to the actual troubleshooting evidence in front of us.`,
        proposedTool: null,
        unlockedEvidenceId: null,
        trust: rel.trust
      };
    }

    // 2. Grounded intent classification + deterministic tool proposal
    const lower = cleanInput.toLowerCase();
    let response = npc.greeting;
    let proposedTool = null;
    let unlockedEvidenceId = null;

    if (npcId === "caller_elena") {
      if (/light|led|power|brick|cord|adapter|battery/.test(lower)) {
        const res = recordQuestEvidence(state, "q1_silent_laptop", "power_led_checked");
        unlockedEvidenceId = "power_led_checked";
        proposedTool = { tool: "ask_for_observation", args: { topic_id: "power_led_checked" } };
        response =
          "Hold on, let me look under the desk... Wait! When I undock the laptop, the battery LED is solid green, but the black power brick for the docking station has NO light on at all! The AC cord on the dock brick came loose!";
        rel.trust = Math.min(100, rel.trust + 4);
        rel.memoryEvents.push({ type: "OBSERVATION_SHARED", summary: res.clueText });
      } else if (/monitor|screen|external|projector|dock|lid|display|fn/.test(lower)) {
        const res = recordQuestEvidence(state, "q1_silent_laptop", "external_monitor_checked");
        unlockedEvidenceId = "external_monitor_checked";
        proposedTool = { tool: "ask_for_observation", args: { topic_id: "external_monitor_checked" } };
        response =
          "It's snapped into the docking station with the laptop lid closed, connected to my external monitor. Since the dock brick was unplugged, the external monitor wasn't getting a signal!";
        rel.trust = Math.min(100, rel.trust + 4);
        rel.memoryEvents.push({ type: "OBSERVATION_SHARED", summary: res.clueText });
      } else if (/reimage|wipe|format|reinstall/.test(lower)) {
        rel.trust = Math.max(15, rel.trust - 5);
        response =
          "Reimage my laptop?! My board presentation is on the desktop and starts in ten minutes! Please check if it's just a power or display issue first!";
      } else if (/status|summary|what do we know/.test(lower)) {
        const gathered = state.questStates.q1_silent_laptop.evidence;
        response = gathered.length
          ? `So far we've verified: ${gathered.join(", ")}. Let's check the remaining dock/display step and get my screen back up!`
          : "All I know right now is the screen is black while docked. Ask me what lights I see on the laptop or dock!";
      } else {
        response =
          "I'm sitting right at my desk with the laptop in its dock. Ask me if I see any power LEDs on the laptop or docking station, or how the external monitor is connected!";
      }
    } else if (npcId === "caller_devon") {
      if (/local|spool|workstation|pc|job|queue|fin-prn/.test(lower)) {
        recordQuestEvidence(state, "q2_print_spool_escalation", "local_spool_tested");
        unlockedEvidenceId = "local_spool_tested";
        proposedTool = { tool: "inspect_ticket", args: { ticket_id: "1049" } };
        response =
          "My local PC prints to PDF fine. The hang is on shared server `FIN-PRN-02` — Job #8841 is stuck at 0 bytes and blocking all 14 accounting ledgers.";
        rel.trust = Math.min(100, rel.trust + 4);
        rel.memoryEvents.push({ type: "OBSERVATION_SHARED", summary: "Confirmed server spooler stall on FIN-PRN-02 Job #8841." });
      } else {
        response =
          "Every accounting print job is queued behind Job #8841 on `FIN-PRN-02`. Can you check if it's my local spooler or if Tier-2 Server Admin needs that hung Job ID?";
      }
    } else if (npcId === "mgr_dana") {
      if (/escalat|matrix|permission|tier-2|fin-prn/.test(lower)) {
        recordQuestEvidence(state, "q2_print_spool_escalation", "escalation_matrix_verified");
        unlockedEvidenceId = "escalation_matrix_verified";
        proposedTool = { tool: "request_escalation", args: { ticket_id: "1049" } };
        response =
          "Good check. Central print servers (`FIN-PRN-02`) require Tier-2 Server Admin rights. Attach the verified hung Job ID (#8841) and local spooler check so Tier-2 can clear it immediately.";
        rel.trust = Math.min(100, rel.trust + 5);
        rel.memoryEvents.push({ type: "ESCALATION_GUIDANCE", summary: "Verified Tier-2 escalation requirement for FIN-PRN-02." });
      } else if (/train|course|lab|learn/.test(lower)) {
        proposedTool = { tool: "schedule_training", args: { course_id: "tr1_signal_vs_symptom" } };
        response =
          "Open the Training Terminal on your desk (`K` or the Desk Terminal) and complete 'Signal vs. Symptom' — it sharpens your hardware isolation and escalation judgment.";
      } else if (rel.memoryEvents.length > 0) {
        response = `You've been building solid habits (${rel.memoryEvents.length} logged observations). Remember: verify physical LEDs and KB articles before proposing a fix.`;
      }
    } else if (npcId === "tech_marco") {
      if (/kb|dock|hint|latitude|checklist/.test(lower)) {
        recordQuestEvidence(state, "q1_silent_laptop", "kb_dock_article_read");
        unlockedEvidenceId = "kb_dock_article_read";
        proposedTool = { tool: "open_related_document", args: { document_id: "KB-1084" } };
        response =
          "Check KB-1084! On those Latitude D-Docks, if the dock's AC brick gets kicked loose under the desk, the closed laptop stays asleep and the external monitor goes black. Reseat the dock brick and hit Fn+F8!";
        rel.trust = Math.min(100, rel.trust + 4);
        rel.memoryEvents.push({ type: "HINT_SHARED", summary: "Shared KB-1084 dock power brick & Fn+F8 tip." });
      }
    } else if (npcId === "noc_priya" || npcId === "msp_ray") {
      if (/vlan|trunk|flap|switch|cable|console|onsite/.test(lower)) {
        recordQuestEvidence(state, "q3_msp_wan_outage", "noc_alert_triaged");
        recordQuestEvidence(state, "q3_msp_wan_outage", "physical_cable_tested");
        unlockedEvidenceId = "physical_cable_tested";
        proposedTool = { tool: "share_approved_hint", args: { hint_id: "trunk_gi01_errdisable" } };
        response =
          "Syslog shows Gi0/1 flapping and our TDR cable tester caught an open pair on the uplink cord. Replace the patch cord and clear the err-disabled port over serial console!";
        rel.trust = Math.min(100, rel.trust + 5);
      }
    } else if (npcId === "it_sam" || npcId === "sponsor_victor") {
      if (/script|onboard|permission|repeat|blueprint|hq|headquarters/.test(lower)) {
        recordQuestEvidence(state, "q4_basement_repeat_tickets", "recurring_permissions_audited");
        unlockedEvidenceId = "recurring_permissions_audited";
        proposedTool = { tool: "open_related_document", args: { document_id: "HQ-BLUEPRINT-SPEC" } };
        response =
          "We audited the last 19 onboarding tickets — automating AD group provisioning with a dry-run check eliminates the whole category! Now open the HQ Blueprint Architect to lock in our dual racks, VLANs, and UPS+generator continuity.";
        rel.trust = Math.min(100, rel.trust + 5);
      }
    } else if (npcId === "biz_claire") {
      if (/renewal|underwrit|exception|farm|commercial|broker|lens/.test(lower)) {
        recordQuestEvidence(state, "q5_hq_renewal_rules", "lenses_inspected");
        recordQuestEvidence(state, "q5_hq_renewal_rules", "exception_guardrails_verified");
        unlockedEvidenceId = "exception_guardrails_verified";
        proposedTool = { tool: "confirm_handoff", args: { stage_id: "renewal_rules_v1" } };
        response =
          "Exactly right: straight-through renewal rules handle ~80% residential, ~60% commercial, and ~40% farm/agri renewals, while complex risks route to human underwriters with a clear diff.";
        rel.trust = Math.min(100, rel.trust + 5);
      }
    } else if (npcId === "arch_lin") {
      if (/sql|reconcil|xml|takeover|agent|nexus|human|rollback|context/.test(lower)) {
        recordQuestEvidence(state, "q6_governed_agent_pipeline", "reconciliation_sql_verified");
        recordQuestEvidence(state, "q6_governed_agent_pipeline", "agent_governance_configured");
        unlockedEvidenceId = "agent_governance_configured";
        proposedTool = { tool: "confirm_handoff", args: { stage_id: "nexus_governance_verified" } };
        response =
          "Verified: pre-load XML schema checks + SQL financial reconciliation protect the data layer, and NEXUS scoped context with human-in-the-loop approval gates prevents unreviewed agent mutations.";
        rel.trust = Math.min(100, rel.trust + 6);
      }
    }

    // Validate tool against NPC's allowedTools whitelist
    if (proposedTool && !npc.allowedTools.includes(proposedTool.tool)) {
      proposedTool = null;
    }

    if (options.simulateProviderOffline) {
      response = `${response} (Offline deterministic dialogue fallback active)`;
    }

    return {
      ok: true,
      npcId,
      npcName: npc.name,
      npcRole: npc.role,
      rejectedInjection: false,
      stateMutatedByLlm: false,
      response: sanitizeDialogueText(response),
      proposedTool,
      unlockedEvidenceId,
      trust: rel.trust,
      memoryCount: rel.memoryEvents.length
    };
  }

  // --------------------------------------------------------------------------
  // 10. SAVE / LOAD SNAPSHOT + CHECKSUM & CHALLENGE LEADERBOARD VERIFIER
  // --------------------------------------------------------------------------
  function computeSaveChecksum(state) {
    const core = `${state.simVersion}|${state.player?.id}|${state.chapter}|${state.xp}|${state.trust}|${(state.ownedItems || []).join(",")}|${state.hqBlueprint?.resilienceScore || 0}`;
    let hash = 2166136261;
    for (let i = 0; i < core.length; i++) {
      hash ^= core.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function serializeSave(state) {
    const snapshot = JSON.parse(JSON.stringify(state));
    const checksum = computeSaveChecksum(snapshot);
    return {
      slot: "primary",
      simVersion: SIM_VERSION,
      savedAt: Date.now(),
      checksum,
      snapshot
    };
  }

  function deserializeSave(envelope) {
    if (!envelope || typeof envelope !== "object" || !envelope.snapshot) {
      return { ok: false, reason: "Invalid save envelope" };
    }
    const snap = JSON.parse(JSON.stringify(envelope.snapshot));
    const expected = computeSaveChecksum(snap);
    if (envelope.checksum && envelope.checksum !== expected) {
      return { ok: false, reason: "Save checksum mismatch" };
    }
    if (!snap.hqBlueprint) {
      snap.hqBlueprint = { ...DEFAULT_HQ_BLUEPRINT };
    }
    return { ok: true, state: snap };
  }

  function claimNexusAccount(state, nexusAccountId, displayAlias) {
    if (!nexusAccountId || typeof nexusAccountId !== "string") {
      return { ok: false, reason: "Valid Nexus Account ID required" };
    }
    const previousGuestId = state.player.id;
    state.player.isGuest = false;
    state.player.nexusAccountId = nexusAccountId;
    if (displayAlias) {
      state.player.alias = sanitizeDialogueText(displayAlias).slice(0, 28);
    }
    appendEvent(
      state,
      "NEXUS_ACCOUNT_CLAIMED",
      `Merged guest progress (${previousGuestId}) into verified Nexus identity (${nexusAccountId}) without losing state.`
    );
    return {
      ok: true,
      previousGuestId,
      nexusAccountId: state.player.nexusAccountId,
      preservedXp: state.xp,
      preservedChapter: state.chapter
    };
  }

  function verifyChallengeRun(submission = {}) {
    // Never accept raw client-submitted or LLM-generated scores without deterministic action log verification
    if (!submission || typeof submission !== "object" || !Array.isArray(submission.actions)) {
      return { accepted: false, reason: "Challenge submission requires a deterministic action log; raw scores are rejected." };
    }
    if (submission.rawScoreOnly || submission.llmGeneratedScore) {
      return { accepted: false, reason: "Untrusted raw client or LLM score rejected by authority verifier." };
    }
    const simState = createInitialState({ id: "challenge_runner", alias: submission.alias || "Challenger" });
    for (const act of submission.actions) {
      if (act.type === "evidence") {
        recordQuestEvidence(simState, act.questId, act.evidenceId);
      } else if (act.type === "solution") {
        submitQuestSolution(simState, act.questId, act.solutionId);
      }
    }
    const q1Done = simState.questStates.q1_silent_laptop.status === "completed";
    if (!q1Done) {
      return { accepted: false, reason: "Challenge target quest was not deterministically completed." };
    }
    const durationSec = Math.max(15, Math.min(600, Number(submission.durationSec) || 95));
    const verifiedScore = Math.round(simState.xp * 4 + simState.trust * 3 + Math.max(0, 180 - durationSec));
    return {
      accepted: true,
      seed: submission.seed || "weekly-seed-2026-w43",
      verifiedScore,
      verifiedXp: simState.xp,
      verifiedTrust: simState.trust
    };
  }

  return Object.freeze({
    SIM_VERSION,
    PORTFOLIO_TIE_INS,
    CHAPTERS,
    INCLINATIONS,
    PROFICIENCY_KEYS,
    ITEMS_CATALOG,
    CUTSCENES,
    ALLOWED_NPC_TOOLS,
    NPCS,
    QUESTS,
    DEFAULT_HQ_BLUEPRINT,
    evaluateHqBlueprint,
    createInitialState,
    getChapterSpec,
    canEquipBackpack,
    configureBackpackLoadout,
    applyCutsceneOutcome,
    jumpToChapter,
    recordQuestEvidence,
    submitQuestSolution,
    completeTrainingCourse,
    saveHqBlueprintCapstone,
    setArchitectureLens,
    sanitizeDialogueText,
    converseWithNpc,
    computeSaveChecksum,
    serializeSave,
    deserializeSave,
    claimNexusAccount,
    verifyChallengeRun
  });
});
