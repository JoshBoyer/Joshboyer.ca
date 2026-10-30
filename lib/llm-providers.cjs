'use strict';

/**
 * Provider-Agnostic LLM & ElevenLabs Voice Adapter
 * Supports:
 *  - OpenAI (/v1/chat/completions with strict json_schema)
 *  - Google Gemini (/v1beta/models/{model}:generateContent with responseSchema)
 *  - Anthropic Claude (/v1/messages with ephemeral prompt caching + JSON schema)
 *  - ElevenLabs Scribe STT (/v1/speech-to-text), Flash v2.5 TTS (/v1/text-to-speech/{voiceId}/stream),
 *    and Conversational AI Signed WebSocket URLs (/v1/convai/conversation/get_signed_url)
 */

const DEFAULT_MODELS = Object.freeze({
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.5-flash',
  anthropic: 'claude-haiku-5-5'
});

const TWIN_RESPONSE_JSON_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: [
    'heading',
    'replyMarkdown',
    'spokenSummary',
    'citedChunkIds',
    'caseRoutes',
    'workbenchTiers',
    'qualificationIds',
    'followUpSuggestions'
  ],
  properties: {
    heading: {
      type: 'string',
      description: 'Concise 3-7 word heading summarizing the answer.'
    },
    replyMarkdown: {
      type: 'string',
      description: 'First-person answer in Josh Boyer’s voice. Grounded strictly in the provided corpus and accuracy rules.'
    },
    spokenSummary: {
      type: 'string',
      description: 'Natural 2-4 sentence spoken version of the answer suitable for ElevenLabs TTS playback (no markdown syntax or raw IDs).'
    },
    citedChunkIds: {
      type: 'array',
      items: { type: 'string' },
      description: 'Up to 4 canonical active chunk IDs from career-evidence.v3.json that support this response.'
    },
    caseRoutes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Up to 3 canonical portfolio case study routes (e.g., "#projects/continuity", "#projects/nexus").'
    },
    workbenchTiers: {
      type: 'array',
      items: { type: 'integer' },
      description: 'Relevant 3D Hero Workbench tiers (integers 1 through 6).'
    },
    qualificationIds: {
      type: 'array',
      items: { type: 'string' },
      description: 'Canonical qualification gap IDs from qualificationCatalog to surface when a question or posting asks for unestablished items.'
    },
    followUpSuggestions: {
      type: 'array',
      items: { type: 'string' },
      description: '2 or 3 short follow-up questions the visitor can click next.'
    }
  }
});

function detectProviderConfig(env = {}) {
  const explicit = (env.TWIN_LLM_PROVIDER || '').toLowerCase().trim();
  const openaiKey = env.OPENAI_API_KEY || '';
  const geminiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY || '';
  const anthropicKey = env.ANTHROPIC_API_KEY || '';

  let provider = null;
  let apiKey = '';
  if (explicit === 'openai' && openaiKey) {
    provider = 'openai';
    apiKey = openaiKey;
  } else if (explicit === 'gemini' && geminiKey) {
    provider = 'gemini';
    apiKey = geminiKey;
  } else if (explicit === 'anthropic' && anthropicKey) {
    provider = 'anthropic';
    apiKey = anthropicKey;
  } else {
    if (openaiKey) {
      provider = 'openai';
      apiKey = openaiKey;
    } else if (geminiKey) {
      provider = 'gemini';
      apiKey = geminiKey;
    } else if (anthropicKey) {
      provider = 'anthropic';
      apiKey = anthropicKey;
    }
  }

  const model = (env.TWIN_LLM_MODEL || '').trim() || (provider ? DEFAULT_MODELS[provider] : null);
  const elevenLabsKey = (env.ELEVENLABS_API_KEY || '').trim();
  const elevenLabsVoiceId = (env.ELEVENLABS_VOICE_ID || '').trim() || '2ccxXaT9cMefjPlK2Pwn'; // Josh Boyer's ElevenLabs Voice ID
  const elevenLabsAgentId = (env.ELEVENLABS_AGENT_ID || '').trim();

  return {
    provider,
    model,
    apiKey,
    llmEnabled: Boolean(provider && apiKey),
    voiceEnabled: Boolean(elevenLabsKey),
    liveAgentEnabled: Boolean(elevenLabsKey && elevenLabsAgentId),
    elevenLabsKey,
    elevenLabsVoiceId,
    elevenLabsAgentId
  };
}

function parseJsonSafely(rawText) {
  if (!rawText || typeof rawText !== 'string') throw new Error('Empty model response');
  const trimmed = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(trimmed);
}

async function callOpenAI({ apiKey, model, systemPrompt, userPrompt, fetchImpl = globalThis.fetch, timeoutMs = 15000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODELS.openai,
        temperature: 0.2,
        max_tokens: 1100,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'josh_boyer_digital_twin_response',
            strict: true,
            schema: TWIN_RESPONSE_JSON_SCHEMA
          }
        }
      }),
      signal: controller.signal
    });
    if (!res.ok) {
      throw new Error(`OpenAI API HTTP ${res.status}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    return {
      parsed: parseJsonSafely(content),
      usage: {
        inputTokens: data?.usage?.prompt_tokens || 0,
        outputTokens: data?.usage?.completion_tokens || 0,
        cachedTokens: data?.usage?.prompt_tokens_details?.cached_tokens || 0
      }
    };
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini({ apiKey, model, systemPrompt, userPrompt, fetchImpl = globalThis.fetch, timeoutMs = 15000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const targetModel = model || DEFAULT_MODELS.gemini;
  const geminiSchema = {
    type: 'OBJECT',
    required: TWIN_RESPONSE_JSON_SCHEMA.required,
    properties: {
      heading: { type: 'STRING' },
      replyMarkdown: { type: 'STRING' },
      spokenSummary: { type: 'STRING' },
      citedChunkIds: { type: 'ARRAY', items: { type: 'STRING' } },
      caseRoutes: { type: 'ARRAY', items: { type: 'STRING' } },
      workbenchTiers: { type: 'ARRAY', items: { type: 'INTEGER' } },
      qualificationIds: { type: 'ARRAY', items: { type: 'STRING' } },
      followUpSuggestions: { type: 'ARRAY', items: { type: 'STRING' } }
    }
  };
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1100,
          responseMimeType: 'application/json',
          responseSchema: geminiSchema
        }
      }),
      signal: controller.signal
    });
    if (!res.ok) {
      throw new Error(`Gemini API HTTP ${res.status}`);
    }
    const data = await res.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return {
      parsed: parseJsonSafely(content),
      usage: {
        inputTokens: data?.usageMetadata?.promptTokenCount || 0,
        outputTokens: data?.usageMetadata?.candidatesTokenCount || 0,
        cachedTokens: data?.usageMetadata?.cachedContentTokenCount || 0
      }
    };
  } finally {
    clearTimeout(timer);
  }
}

async function callAnthropic({ apiKey, model, systemPrompt, userPrompt, fetchImpl = globalThis.fetch, timeoutMs = 15000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODELS.anthropic,
        max_tokens: 1100,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' }
          }
        ],
        tools: [
          {
            name: 'emit_twin_response',
            description: 'Return the structured first-person Digital Twin response grounded in Josh Boyer’s approved evidence.',
            input_schema: TWIN_RESPONSE_JSON_SCHEMA
          }
        ],
        tool_choice: { type: 'tool', name: 'emit_twin_response' },
        messages: [
          { role: 'user', content: userPrompt }
        ]
      }),
      signal: controller.signal
    });
    if (!res.ok) {
      throw new Error(`Anthropic API HTTP ${res.status}`);
    }
    const data = await res.json();
    const toolBlock = (data?.content || []).find(b => b.type === 'tool_use' && b.name === 'emit_twin_response');
    const parsed = toolBlock?.input || parseJsonSafely(data?.content?.[0]?.text);
    return {
      parsed,
      usage: {
        inputTokens: data?.usage?.input_tokens || 0,
        outputTokens: data?.usage?.output_tokens || 0,
        cachedTokens: data?.usage?.cache_read_input_tokens || 0
      }
    };
  } finally {
    clearTimeout(timer);
  }
}

async function generateTwinStructuredReply(options) {
  const { provider, apiKey, model, systemPrompt, userPrompt, fetchImpl } = options;
  if (provider === 'openai') return callOpenAI({ apiKey, model, systemPrompt, userPrompt, fetchImpl });
  if (provider === 'gemini') return callGemini({ apiKey, model, systemPrompt, userPrompt, fetchImpl });
  if (provider === 'anthropic') return callAnthropic({ apiKey, model, systemPrompt, userPrompt, fetchImpl });
  throw new Error(`Unsupported LLM provider: ${provider}`);
}

/**
 * ElevenLabs Voice API Client (Scribe STT, Flash v2.5 TTS, and Conversational AI Signed URLs)
 */
const ElevenLabsClient = Object.freeze({
  async transcribeAudio({ apiKey, audioBuffer, mimeType = 'audio/webm', fetchImpl = globalThis.fetch, timeoutMs = 15000 }) {
    if (!apiKey) throw new Error('ElevenLabs API key is not configured.');
    if (!audioBuffer || !audioBuffer.byteLength) throw new Error('Audio payload is empty.');
    if (audioBuffer.byteLength > 2 * 1024 * 1024) throw new Error('Audio clip exceeds 2 MB limit.');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const formData = new FormData();
      const ext = mimeType.includes('wav') ? 'wav' : mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
      const blob = new Blob([audioBuffer], { type: mimeType });
      formData.append('file', blob, `question.${ext}`);
      formData.append('model_id', 'scribe_v1');
      formData.append('tag_audio_events', 'false');

      const res = await fetchImpl('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey
        },
        body: formData,
        signal: controller.signal
      });
      if (!res.ok) {
        throw new Error(`ElevenLabs STT HTTP ${res.status}`);
      }
      const data = await res.json();
      return {
        text: (data?.text || '').trim(),
        languageCode: data?.language_code || 'en'
      };
    } finally {
      clearTimeout(timer);
    }
  },

  async synthesizeSpeech({ apiKey, voiceId, text, modelId = 'eleven_flash_v2_5', fetchImpl = globalThis.fetch, timeoutMs = 15000 }) {
    if (!apiKey) throw new Error('ElevenLabs API key is not configured.');
    const cleanText = String(text || '').trim().slice(0, 700);
    if (!cleanText) throw new Error('Speech text is required.');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=mp3_44100_128`;
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: modelId,
          voice_settings: {
            stability: 0.55,
            similarity_boost: 0.78,
            style: 0.15,
            use_speaker_boost: true
          }
        }),
        signal: controller.signal
      });
      if (!res.ok) {
        throw new Error(`ElevenLabs TTS HTTP ${res.status}`);
      }
      const arrayBuf = await res.arrayBuffer();
      return {
        audioBuffer: Buffer.from(arrayBuf),
        contentType: res.headers?.get?.('content-type') || 'audio/mpeg'
      };
    } finally {
      clearTimeout(timer);
    }
  },

  async getConversationalSignedUrl({ apiKey, agentId, fetchImpl = globalThis.fetch, timeoutMs = 10000 }) {
    if (!apiKey || !agentId) {
      throw new Error('ElevenLabs Conversational AI requires both ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID.');
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(agentId)}`;
      const res = await fetchImpl(url, {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey
        },
        signal: controller.signal
      });
      if (!res.ok) {
        // If the scoped ElevenLabs API key lacks `convai_write` permission, fall back to direct public agent WebSocket URL
        if (res.status === 401 || res.status === 403) {
          return {
            signedUrl: `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${encodeURIComponent(agentId)}`,
            authMode: 'public_agent_fallback'
          };
        }
        throw new Error(`ElevenLabs Signed URL HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data?.signed_url || typeof data.signed_url !== 'string') {
        throw new Error('Invalid signed_url response from ElevenLabs.');
      }
      return {
        signedUrl: data.signed_url,
        authMode: 'signed_url'
      };
    } finally {
      clearTimeout(timer);
    }
  }
});

module.exports = {
  DEFAULT_MODELS,
  TWIN_RESPONSE_JSON_SCHEMA,
  detectProviderConfig,
  generateTwinStructuredReply,
  ElevenLabsClient
};
