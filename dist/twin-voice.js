/* Unified Voice Controller for Josh Boyer's Digital Twin
 * Supports:
 *  1. ElevenLabs Scribe STT (/api/twin/stt) + Browser SpeechRecognition fallback
 *  2. ElevenLabs Flash v2.5 Streaming TTS (/api/twin/tts) + Browser speechSynthesis fallback
 *  3. ElevenLabs Conversational AI Live Full-Duplex Call (/api/twin/live-session Signed WebSocket URL + Client UI Tools)
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TwinVoice = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  let currentAudio = null;
  let currentAudioUrl = null;
  let mediaRecorder = null;
  let mediaStream = null;
  let recordedChunks = [];
  let speechRecognition = null;
  let liveSocket = null;
  let liveMicContext = null;
  let liveMicStream = null;
  let liveMicProcessor = null;
  let livePlaybackContext = null;
  let liveNextPlayTime = 0;
  let activeSources = [];
  let activeTtsController = null;
  let speakSeq = 0;
  const ttsBlobCache = new Map();
  const DEFAULT_JOSH_VOICE_ID = '2ccxXaT9cMefjPlK2Pwn';

  function notifyAvatar(method, ...args) {
    try {
      if (typeof window !== 'undefined' && window.Josh3DAvatar && typeof window.Josh3DAvatar[method] === 'function') {
        window.Josh3DAvatar[method](...args);
      }
    } catch {}
  }

  function stopSpeaking() {
    speakSeq += 1;
    if (activeTtsController) {
      try { activeTtsController.abort(); } catch {}
      activeTtsController = null;
    }
    if (currentAudio) {
      const audioToStop = currentAudio;
      currentAudio = null;
      try {
        audioToStop.onended = null;
        audioToStop.onerror = null;
        audioToStop.pause();
        audioToStop.removeAttribute('src');
        audioToStop.load();
      } catch {}
    }
    if (currentAudioUrl) {
      try { URL.revokeObjectURL(currentAudioUrl); } catch {}
      currentAudioUrl = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    notifyAvatar('notifySpeechEnd');
  }

  async function speak(text, { serverTtsEnabled = true, voiceId = DEFAULT_JOSH_VOICE_ID, onStart, onEnd, onError } = {}) {
    // Never play standalone TTS on top of an active Live Conversational AI WebSocket call
    if (liveSocket && liveSocket.readyState === WebSocket.OPEN) {
      return;
    }
    stopSpeaking();
    const mySeq = ++speakSeq;
    const clean = String(text || '').replace(/^\[[^\]]+\]\s*/g, '').trim().slice(0, 680);
    if (!clean) return;
    const targetVoiceId = (voiceId && String(voiceId).trim()) || DEFAULT_JOSH_VOICE_ID;

    if (serverTtsEnabled !== false && typeof fetch === 'function') {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      activeTtsController = controller;
      let blob = null;
      try {
        const cacheKey = `${targetVoiceId}::${clean}`;
        blob = ttsBlobCache.get(cacheKey) || null;
        if (!blob) {
          const res = await fetch('/api/twin/tts', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: clean, voiceId: targetVoiceId }),
            signal: controller ? controller.signal : undefined
          });
          if (mySeq !== speakSeq || (controller && controller.signal.aborted)) return;
          if (res.ok) {
            blob = await res.blob();
            if (mySeq !== speakSeq || (controller && controller.signal.aborted)) return;
            if (ttsBlobCache.size >= 48) {
              const firstKey = ttsBlobCache.keys().next().value;
              if (firstKey) ttsBlobCache.delete(firstKey);
            }
            ttsBlobCache.set(cacheKey, blob);
          }
        }
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      } finally {
        if (activeTtsController === controller) activeTtsController = null;
      }

      if (mySeq !== speakSeq) return;

      if (blob) {
        try {
          if (onStart) onStart('elevenlabs');
          currentAudioUrl = URL.createObjectURL(blob);
          const audio = new Audio(currentAudioUrl);
          currentAudio = audio;
          audio.onplaying = () => {
            if (mySeq !== speakSeq) return;
            notifyAvatar('notifySpeechActuallyStarted', clean);
          };
          audio.onended = () => {
            if (mySeq !== speakSeq) return;
            stopSpeaking();
            if (onEnd) onEnd();
          };
          audio.onerror = () => {
            if (mySeq !== speakSeq) return;
            stopSpeaking();
            if (onEnd) onEnd();
          };
          notifyAvatar('notifySpeechStart', clean, { mode: 'elevenlabs', audio });
          await audio.play();
          if (mySeq !== speakSeq) {
            try { audio.pause(); } catch {}
          }
        } catch {
          if (mySeq === speakSeq) {
            stopSpeaking();
            if (onEnd) onEnd();
          }
        }
        return;
      }
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
      try {
        if (onStart) onStart('browser');
        notifyAvatar('notifySpeechStart', clean, { mode: 'browser' });
        const utter = new SpeechSynthesisUtterance(clean);
        utter.rate = 1.0;
        utter.pitch = 0.98;
        const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
        const preferred = voices.find(v => /en[-_](CA|US|GB)/i.test(v.lang) && /natural|online|guy|david|daniel|google/i.test(v.name))
          || voices.find(v => /^en/i.test(v.lang));
        if (preferred) utter.voice = preferred;
        utter.onstart = () => {
          notifyAvatar('notifySpeechActuallyStarted', clean);
        };
        utter.onboundary = event => {
          notifyAvatar('notifySpeechBoundary', event, clean);
        };
        utter.onend = () => {
          notifyAvatar('notifySpeechEnd');
          if (onEnd) onEnd();
        };
        utter.onerror = () => {
          notifyAvatar('notifySpeechEnd');
          if (onEnd) onEnd();
        };
        window.speechSynthesis.speak(utter);
        return;
      } catch (err) {
        notifyAvatar('notifySpeechEnd');
        if (onError) onError(err);
      }
    } else {
      // Visual-only fallback if browser speechSynthesis is unavailable
      notifyAvatar('notifySpeechStart', clean, { mode: 'visual-only' });
      const estDurationMs = Math.max(2500, Math.min(18000, clean.split(/\s+/).length * 340));
      setTimeout(() => {
        notifyAvatar('notifySpeechEnd');
        if (onEnd) onEnd();
      }, estDurationMs);
      return;
    }
    if (onEnd) onEnd();
  }

  function stopRecording() {
    if (speechRecognition) {
      try { speechRecognition.stop(); } catch {}
      speechRecognition = null;
    }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try { mediaRecorder.stop(); } catch {}
    }
    if (mediaStream) {
      for (const track of mediaStream.getTracks()) {
        try { track.stop(); } catch {}
      }
      mediaStream = null;
    }
    notifyAvatar('notifyListening', false);
  }

  async function startRecording({ serverSttEnabled = false, onInterim, onResult, onError, onStop } = {}) {
    stopRecording();
    stopSpeaking();
    notifyAvatar('notifyListening', true);

    const SpeechRec = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (serverSttEnabled && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined') {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recordedChunks = [];
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';
        mediaRecorder = mimeType ? new MediaRecorder(mediaStream, { mimeType }) : new MediaRecorder(mediaStream);

        mediaRecorder.ondataavailable = e => {
          if (e.data && e.data.size > 0) recordedChunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          const tracks = mediaStream ? mediaStream.getTracks() : [];
          for (const t of tracks) { try { t.stop(); } catch {} }
          mediaStream = null;
          if (!recordedChunks.length) {
            if (onStop) onStop();
            return;
          }
          const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
          recordedChunks = [];
          try {
            if (onInterim) onInterim('Transcribing your voice with ElevenLabs Scribe…');
            const res = await fetch('/api/twin/stt', {
              method: 'POST',
              credentials: 'same-origin',
              headers: { 'Content-Type': blob.type || 'audio/webm' },
              body: blob
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'STT failed');
            if (data.text && onResult) onResult(data.text, 'elevenlabs-scribe');
            else if (onError) onError(new Error('No speech detected. Try speaking closer to the microphone.'));
          } catch (err) {
            if (onError) onError(err);
          } finally {
            if (onStop) onStop();
          }
        };

        mediaRecorder.start();
        return { mode: 'elevenlabs-scribe', stop: stopRecording };
      } catch (err) {
        if (!SpeechRec && onError) {
          onError(err);
          if (onStop) onStop();
          return null;
        }
      }
    }

    if (SpeechRec) {
      try {
        speechRecognition = new SpeechRec();
        speechRecognition.lang = 'en-CA';
        speechRecognition.interimResults = true;
        speechRecognition.maxAlternatives = 1;
        let finalTranscript = '';

        speechRecognition.onresult = event => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const tr = event.results[i][0].transcript;
            if (event.results[i].isFinal) finalTranscript += tr + ' ';
            else interim += tr;
          }
          if (onInterim) onInterim((finalTranscript + interim).trim());
        };

        speechRecognition.onend = () => {
          const text = finalTranscript.trim();
          speechRecognition = null;
          if (text && onResult) onResult(text, 'browser-stt');
          if (onStop) onStop();
        };

        speechRecognition.onerror = event => {
          speechRecognition = null;
          if (onError) onError(new Error(event.error === 'not-allowed' ? 'Microphone access was denied in browser settings.' : `Speech recognition error: ${event.error}`));
          if (onStop) onStop();
        };

        speechRecognition.start();
        return { mode: 'browser-stt', stop: stopRecording };
      } catch (err) {
        if (onError) onError(err);
        if (onStop) onStop();
        return null;
      }
    }

    if (onError) onError(new Error('Microphone capture is unavailable in this browser.'));
    if (onStop) onStop();
    return null;
  }

  /**
   * Downsample Float32 audio from native hardware sample rate (e.g. 48000 Hz) to 16000 Hz
   * and encode as 16-bit little-endian PCM Base64 for ElevenLabs Conversational AI.
   */
  function downsampleAndEncodePcm16Base64(float32Array, inputSampleRate, targetSampleRate = 16000) {
    let samples = float32Array;
    if (inputSampleRate > targetSampleRate) {
      const ratio = inputSampleRate / targetSampleRate;
      const newLength = Math.round(float32Array.length / ratio);
      samples = new Float32Array(newLength);
      let offsetResult = 0;
      let offsetBuffer = 0;
      while (offsetResult < samples.length) {
        const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
        let accum = 0;
        let count = 0;
        for (let i = offsetBuffer; i < nextOffsetBuffer && i < float32Array.length; i++) {
          accum += float32Array[i];
          count++;
        }
        samples[offsetResult] = count > 0 ? accum / count : 0;
        offsetResult++;
        offsetBuffer = nextOffsetBuffer;
      }
    }

    const buffer = new ArrayBuffer(samples.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  function clearScheduledPlayback() {
    for (const src of activeSources) {
      try { src.stop(); } catch {}
    }
    activeSources = [];
    if (livePlaybackContext) {
      liveNextPlayTime = livePlaybackContext.currentTime;
    }
  }

  function playPcm16Base64Chunk(base64Audio, sampleRate = 16000, onPlaybackState) {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!livePlaybackContext) {
      livePlaybackContext = new AudioCtx();
      liveNextPlayTime = livePlaybackContext.currentTime;
    }
    if (livePlaybackContext.state === 'suspended') {
      livePlaybackContext.resume().catch(() => {});
    }

    const binary = atob(base64Audio);
    const len = Math.floor(binary.length / 2);
    if (len <= 0) return;

    const audioBuffer = livePlaybackContext.createBuffer(1, len, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const view = new DataView(bytes.buffer);
    for (let i = 0; i < len; i++) {
      channelData[i] = view.getInt16(i * 2, true) / 32768;
    }

    const source = livePlaybackContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(livePlaybackContext.destination);
    const startTime = Math.max(livePlaybackContext.currentTime + 0.01, liveNextPlayTime);
    source.start(startTime);
    liveNextPlayTime = startTime + audioBuffer.duration;
    notifyAvatar('notifyPcmChunk', channelData, sampleRate, Math.max(0, (startTime - livePlaybackContext.currentTime) * 1000));
    if (activeSources.length === 0 && onPlaybackState) {
      onPlaybackState(true);
    }
    activeSources.push(source);
    source.onended = () => {
      activeSources = activeSources.filter(s => s !== source);
      if (activeSources.length === 0) {
        notifyAvatar('notifySpeechEnd');
        if (onPlaybackState) onPlaybackState(false);
      }
    };
  }

  function stopLiveCall() {
    clearScheduledPlayback();
    if (liveSocket) {
      const sock = liveSocket;
      liveSocket = null;
      try { sock.close(); } catch {}
    }
    if (liveMicProcessor) {
      try { liveMicProcessor.disconnect(); } catch {}
      liveMicProcessor = null;
    }
    if (liveMicContext) {
      try { liveMicContext.close(); } catch {}
      liveMicContext = null;
    }
    if (liveMicStream) {
      for (const t of liveMicStream.getTracks()) { try { t.stop(); } catch {} }
      liveMicStream = null;
    }
    if (livePlaybackContext) {
      try { livePlaybackContext.close(); } catch {}
      livePlaybackContext = null;
    }
    liveNextPlayTime = 0;
  }

  /**
   * Start an ElevenLabs Conversational AI Live Call
   * Unlocks AudioContext & Microphone immediately on user click gesture.
   */
  async function startLiveCall({
    activeRoute = '#home',
    activeTier = null,
    sessionToken = '',
    onStatusChange,
    onTranscript,
    onClientTool,
    onError,
    onClose
  } = {}) {
    stopLiveCall();
    stopSpeaking();
    stopRecording();

    // 1. Unlock Web Audio playback immediately inside the click gesture
    const AudioCtx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (AudioCtx) {
      livePlaybackContext = new AudioCtx();
      liveNextPlayTime = livePlaybackContext.currentTime;
      livePlaybackContext.resume().catch(() => {});
    }

    if (onStatusChange) onStatusChange('connecting', 'Requesting microphone & connecting to ElevenLabs Live Twin…');

    // 2. Request microphone inside user gesture (non-fatal if no mic plugged in: user can still hear greeting)
    let hasMic = false;
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        liveMicStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        hasMic = true;
      } catch {
        hasMic = false;
      }
    }

    // 3. Fetch Signed URL / Session Metadata from server
    let sessionData;
    try {
      const res = await fetch('/api/twin/live-session', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeRoute, activeTier, sessionToken })
      });
      sessionData = await res.json();
      if (!res.ok || !sessionData.signedUrl) {
        throw new Error(sessionData?.error || 'Could not start ElevenLabs Live Call.');
      }
    } catch (err) {
      stopLiveCall();
      if (onError) onError(err);
      if (onClose) onClose();
      return null;
    }

    let pendingUserTranscript = '';
    let negotiatedSampleRate = 16000;

    liveSocket = new WebSocket(sessionData.signedUrl);

    liveSocket.onopen = () => {
      if (!liveSocket) return;
      if (onStatusChange) {
        onStatusChange(
          'connected',
          hasMic
            ? '🟢 Live Call Active · Speak anytime (Josh’s Twin is listening)'
            : '🟢 Live Call Active (Listen-only — allow microphone to talk back)'
        );
      }

      liveSocket.send(JSON.stringify({
        type: 'conversation_initiation_client_data',
        dynamic_variables: sessionData.dynamicVariables || {}
      }));

      // Stream downsampled PCM16 16kHz microphone audio through a silent GainNode
      if (AudioCtx && hasMic && liveMicStream) {
        try {
          liveMicContext = new AudioCtx();
          liveMicContext.resume().catch(() => {});
          const inputRate = liveMicContext.sampleRate || 48000;
          const source = liveMicContext.createMediaStreamSource(liveMicStream);
          liveMicProcessor = liveMicContext.createScriptProcessor(4096, 1, 1);
          const silentGain = liveMicContext.createGain();
          silentGain.gain.value = 0;

          liveMicProcessor.onaudioprocess = e => {
            if (!liveSocket || liveSocket.readyState !== WebSocket.OPEN) return;
            const input = e.inputBuffer.getChannelData(0);
            const b64 = downsampleAndEncodePcm16Base64(input, inputRate, 16000);
            liveSocket.send(JSON.stringify({ user_audio_chunk: b64 }));
          };

          source.connect(liveMicProcessor);
          liveMicProcessor.connect(silentGain);
          silentGain.connect(liveMicContext.destination);
        } catch (micErr) {
          if (onError) onError(new Error('Microphone audio stream error: ' + micErr.message));
        }
      }
    };

    liveSocket.onmessage = event => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'conversation_initiation_metadata') {
          const fmt = msg.conversation_initiation_metadata_event?.agent_output_audio_format || '';
          const m = /pcm_(\d+)/.exec(fmt);
          if (m) negotiatedSampleRate = parseInt(m[1], 10);
        } else if (msg.type === 'ping' && msg.ping_event?.event_id !== undefined) {
          if (liveSocket && liveSocket.readyState === WebSocket.OPEN) {
            liveSocket.send(JSON.stringify({ type: 'pong', event_id: msg.ping_event.event_id }));
          }
        } else if (msg.type === 'audio' && msg.audio_event?.audio_base_64) {
          playPcm16Base64Chunk(msg.audio_event.audio_base_64, negotiatedSampleRate, isPlaying => {
            if (!liveSocket || liveSocket.readyState !== WebSocket.OPEN) return;
            if (onStatusChange) {
              onStatusChange(
                isPlaying ? 'speaking' : 'listening',
                isPlaying
                  ? '🔊 Josh’s Twin is speaking…'
                  : (hasMic ? '🟢 Listening · Speak anytime' : '🟢 Live Call Active (Listen-only)')
              );
            }
          });
        } else if (msg.type === 'interruption') {
          clearScheduledPlayback();
        } else if (msg.type === 'user_transcript' && msg.user_transcription_event?.user_transcript) {
          pendingUserTranscript = msg.user_transcription_event.user_transcript;
          if (onTranscript) onTranscript({ role: 'user', text: pendingUserTranscript });
        } else if (msg.type === 'agent_response' && msg.agent_response_event?.agent_response) {
          const rawAgentText = msg.agent_response_event.agent_response;
          const cleanAgentText = String(rawAgentText).replace(/^\[[^\]]+\]\s*/g, '').trim();
          if (onTranscript) onTranscript({ role: 'agent', text: cleanAgentText });
          fetch('/api/twin/voice-turn', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userTranscript: pendingUserTranscript,
              agentTranscript: cleanAgentText,
              sessionToken: sessionData.sessionToken
            })
          }).catch(() => {});
          pendingUserTranscript = '';
        } else if (msg.type === 'client_tool_call' && msg.client_tool_call) {
          const { tool_name: toolName, tool_call_id: toolCallId, parameters } = msg.client_tool_call;
          let result = 'Executed UI action';
          if (onClientTool) {
            result = onClientTool(toolName, parameters || {}) || result;
          }
          if (liveSocket && liveSocket.readyState === WebSocket.OPEN) {
            liveSocket.send(JSON.stringify({
              type: 'client_tool_result',
              tool_call_id: toolCallId,
              result: String(result),
              is_error: false
            }));
          }
        }
      } catch {}
    };

    liveSocket.onerror = () => {
      if (onError) onError(new Error('ElevenLabs Live WebSocket connection encountered an error.'));
    };

    liveSocket.onclose = closeEvent => {
      const wasActive = Boolean(liveSocket);
      stopLiveCall();
      if (wasActive) {
        const reason = closeEvent?.reason ? ` (${closeEvent.reason})` : '';
        if (onStatusChange) onStatusChange('closed', `Live Voice Call ended${reason}`);
        if (onClose) onClose();
      }
    };

    return { stop: stopLiveCall };
  }

  return Object.freeze({
    speak,
    stopSpeaking,
    startRecording,
    stopRecording,
    startLiveCall,
    stopLiveCall
  });
});
