'use strict';

/**
 * Automated ElevenLabs Conversational AI Agent + Knowledge Base Sync Utility
 *
 * Uses the ElevenLabs Conversational AI REST API (/v1/convai/agents/:agent_id
 * and /v1/convai/knowledge-base) to configure Josh Boyer's live voice agent
 * (`agent_6801m5j3psdyec1bkkecnnak1s6x`) with:
 *   1. Voice ID `2ccxXaT9cMefjPlK2Pwn` ("Josh Pod Voice", Professional Voice Clone)
 *   2. 44.1 kHz studio output (`agent_output_audio_format: "pcm_44100"`) instead of
 *      the default 16 kHz telephone format (`pcm_16000`) that makes voices sound far away
 *   3. Generous turn-taking timeout (`turn_timeout: 10`) so pauses never trigger
 *      premature "..." / "I'm still here" interruptions
 *   4. Canonical JoshBoyer.ca system prompt (including AWS us-east-2 architecture,
 *      Guidewire, Medavie, SQL continuity, NEXUS, and strict anti-repetition rules)
 *   5. Optional Knowledge Base document upload from `chat/knowledge/cag-context.json`
 *
 * Requirement: ELEVENLABS_API_KEY in `.env` must have `convai_read` and `convai_write`
 * permissions enabled in the ElevenLabs dashboard (Developers -> API Keys -> Edit permissions).
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_ENV_PATH = 'C:\\Users\\boyer\\Downloads\\Projects\\Joshboyer.ca\\.env';

function loadEnv() {
  const out = { ...process.env };
  const candidates = [path.join(ROOT, '.env'), DEFAULT_ENV_PATH];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const k = trimmed.slice(0, eq).trim();
      const v = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!out[k]) out[k] = v;
    }
  }
  return out;
}

function buildAgentSystemPrompt(cag) {
  return [
    "You are Josh Boyer's AI assistant on JoshBoyer.ca.",
    "Speak naturally, warmly, and concisely in 2 to 3 complete sentences per turn so your spoken answers are clear, engaging, and never long-winded.",
    "Do NOT include bracketed stage directions like [warmly] or [laughs] in your text.",
    "CRITICAL MULTI-TURN RULE: Never repeat the same paragraph, disclaimer, or explanation twice in a conversation. Always build directly and logically on what the visitor just said.",
    "VERIFIED PORTFOLIO FACTS:",
    "- Dell (Sept 2006+): Enterprise technical support and hardware/systems troubleshooting foundation.",
    "- Grenville Mutual Insurance (2009–2022): Bridged business architecture, systems analysis, and Guidewire core insurance platforms. Automated approximately 80% of residential renewals, 40% of farm/agri renewals, and 60% of commercial renewals (user-reported, renewal-only). Researched and documented the broker takeover solution, guided receiving-system changes, and personally designed and built the production Excel VBA add-in for validation, XML batch generation, and error reconciliation.",
    "- Medavie Blue Cross (2022–present): Senior Business Systems Analyst. Led solution review, mapping, and synchronization requirements for provider and claims REST/scheduled-event integrations (not Kafka), and supported live integrations. Delivered approved reporting continuity analysis/design, operational interim SQL, and corrected financial-report SQL adopted by the payment team.",
    "- Independent AI & Cloud Architecture: Created NEXUS (independent AI capstone) and personally architected and deployed THIS portfolio assistant on AWS us-east-2 using AWS Lambda, Amazon S3 & S3 Vectors (1536-dimensional hybrid vector RAG), Amazon DynamoDB (session state & $25 atomic cost ledger), API Gateway (REST + AWS_IAM SigV4 internal routing), AWS Secrets Manager & SSM Parameter Store, Cloudflare Workers & AI Gateway, 3 read-only JSON-RPC MCP tools (get_case_study, search_public_evidence, compare_job_requirements), and ElevenLabs Live Voice.",
    "- Career boundary: While Josh's corporate insurance employers ran primarily on-premise/virtualized environments (VMware, Guidewire, SQL) rather than commercial AWS/Azure migrations, Josh has direct hands-on AWS us-east-2 cloud architecture experience building this assistant, alongside 15+ years of enterprise integration, API mapping, and data continuity that transfer directly to AWS teams.",
    "",
    `Approved CAG summary JSON: ${JSON.stringify(cag)}`
  ].join('\n');
}

async function main() {
  const env = loadEnv();
  const apiKey = (env.ELEVENLABS_API_KEY || '').trim();
  const agentId = (env.ELEVENLABS_AGENT_ID || 'agent_6801m5j3psdyec1bkkecnnak1s6x').trim();
  const voiceId = (env.ELEVENLABS_VOICE_ID || '2ccxXaT9cMefjPlK2Pwn').trim();

  if (!apiKey) {
    console.error('ERROR: ELEVENLABS_API_KEY is not set.');
    process.exit(1);
  }

  const cagPath = path.join(ROOT, 'chat', 'knowledge', 'cag-context.json');
  const cag = fs.existsSync(cagPath) ? JSON.parse(fs.readFileSync(cagPath, 'utf8')) : {};

  console.log(`Checking ElevenLabs Agent ${agentId} permissions...`);
  const getRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${encodeURIComponent(agentId)}`, {
    method: 'GET',
    headers: { 'xi-api-key': apiKey }
  });

  if (!getRes.ok) {
    const errBody = await getRes.text();
    console.error(`GET /v1/convai/agents/${agentId} returned HTTP ${getRes.status}: ${errBody}`);
    if (getRes.status === 401 || errBody.includes('convai_read')) {
      console.error('\nACTION REQUIRED IN ELEVENLABS DASHBOARD:');
      console.error('Your current ELEVENLABS_API_KEY is a scoped key missing `convai_read` and `convai_write`.');
      console.error('1. Go to https://elevenlabs.io/app/settings/api-keys');
      console.error('2. Edit your API key (or create a new key) and enable:');
      console.error('   - ElevenLabs Agents: Read (convai_read) & Write (convai_write)');
      console.error('   - Text to Speech: Access');
      console.error('   - Speech to Text: Access');
      console.error('   - Voices: Read');
      console.error('3. Re-run: node tools/sync-elevenlabs-agent.cjs');
    }
    process.exit(1);
  }

  const patchPayload = {
    name: 'Josh Boyer Portfolio Assistant',
    conversation_config: {
      agent: {
        first_message: "Hey! Thanks for stopping by my portfolio. I'm listening—what would you like to talk through?",
        language: 'en',
        prompt: {
          prompt: buildAgentSystemPrompt(cag),
          temperature: 0.4
        }
      },
      tts: {
        voice_id: voiceId,
        agent_output_audio_format: 'pcm_44100',
        optimize_streaming_latency: 3,
        stability: 0.55,
        similarity_boost: 0.75
      },
      turn: {
        turn_timeout: 10,
        mode: 'turn'
      }
    }
  };

  console.log(`Patching ElevenLabs Agent ${agentId} with voice ${voiceId} and pcm_44100...`);
  const patchRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${encodeURIComponent(agentId)}`, {
    method: 'PATCH',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(patchPayload)
  });

  if (!patchRes.ok) {
    console.error(`PATCH failed (${patchRes.status}):`, await patchRes.text());
    process.exit(1);
  }

  const updated = await patchRes.json();
  console.log('Successfully updated ElevenLabs Conversational AI Agent:', updated.agent_id || agentId);
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { buildAgentSystemPrompt };
