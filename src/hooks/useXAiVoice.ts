import { useState, useRef, useCallback, useEffect } from 'react';

const WS_URL = 'wss://api.x.ai/v1/realtime';
const MODEL = 'grok-voice-think-fast-1.0';
const SAMPLE_RATE = 24000;
const CHUNK_SIZE = 4096;

function floatTo16BitPCM(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16;
}

function pcm16ToFloat32(int16: Int16Array): Float32Array {
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7FFF);
  }
  return float32;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export interface VoiceState {
  isConnected: boolean;
  isConnecting: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  aiTranscript: string;
  error: string | null;
  useFallback: boolean;
}

export function useXAiVoice() {
  const [state, setState] = useState<VoiceState>({
    isConnected: false, isConnecting: false, isListening: false,
    isSpeaking: false, transcript: '', aiTranscript: '', error: null, useFallback: false,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioChunksRef = useRef<string[]>([]);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const keepAliveRef = useRef<number | null>(null);
  const sessionReadyRef = useRef(false);
  const setStateRef = useRef(setState);
  setStateRef.current = setState;

  useEffect(() => () => { cleanup(); }, []);

  // Browser TTS fallback
  const speakBrowser = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    setStateRef.current((p) => ({ ...p, isSpeaking: true }));
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1; u.pitch = 1; u.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find((x) => x.name.includes('Google US English'))
      || voices.find((x) => x.name.includes('Samantha'))
      || voices.find((x) => x.lang === 'en-US')
      || voices.find((x) => x.lang.startsWith('en'));
    if (v) u.voice = v;
    u.onend = () => setStateRef.current((p) => ({ ...p, isSpeaking: false }));
    u.onerror = () => setStateRef.current((p) => ({ ...p, isSpeaking: false }));
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    window.speechSynthesis.speak(u);
  }, []);

  const stopBrowserSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setStateRef.current((p) => ({ ...p, isSpeaking: false }));
  }, []);

  // Audio playback
  const playChunks = useCallback((chunks: string[]) => {
    if (chunks.length === 0) return;
    const bytes = new Uint8Array(chunks.length * 8192);
    let offset = 0;
    for (const chunk of chunks) {
      try {
        const binary = atob(chunk);
        for (let i = 0; i < binary.length; i++) {
          if (offset < bytes.length) bytes[offset++] = binary.charCodeAt(i);
        }
      } catch { /* skip */ }
    }
    const bufLen = Math.floor(offset / 2) * 2;
    if (bufLen < 2) { setStateRef.current((p) => ({ ...p, isSpeaking: false })); return; }

    const int16 = new Int16Array(bytes.buffer.slice(0, bufLen));
    const float32 = pcm16ToFloat32(int16);

    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const buffer = ctx.createBuffer(1, float32.length, SAMPLE_RATE);
      // @ts-ignore
      buffer.copyToChannel(float32, 0);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      currentSourceRef.current = source;

      source.onended = () => { setStateRef.current((p) => ({ ...p, isSpeaking: false })); currentSourceRef.current = null; };
      setStateRef.current((p) => ({ ...p, isSpeaking: true }));
      source.start();
    } catch { setStateRef.current((p) => ({ ...p, isSpeaking: false })); }
  }, []);

  // Cleanup
  const cleanup = useCallback(() => {
    stopBrowserSpeaking();
    if (processorRef.current) { try { processorRef.current.disconnect(); } catch { /* */ } processorRef.current = null; }
    if (sourceRef.current) { try { sourceRef.current.disconnect(); } catch { /* */ } sourceRef.current = null; }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach((t) => t.stop()); micStreamRef.current = null; }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') { try { audioCtxRef.current.close(); } catch { /* */ } audioCtxRef.current = null; }
    if (currentSourceRef.current) { try { currentSourceRef.current.stop(); } catch { /* */ } currentSourceRef.current = null; }
    if (keepAliveRef.current) { window.clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
    if (wsRef.current) { try { wsRef.current.close(); } catch { /* */ } wsRef.current = null; }
    sessionReadyRef.current = false;
  }, [stopBrowserSpeaking]);

  // WS handler
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case 'session.created':
        case 'session.updated': {
          sessionReadyRef.current = true;
          setStateRef.current((p) => ({ ...p, isConnected: true, isConnecting: false, error: null, useFallback: false }));
          break;
        }
        case 'response.text.delta': {
          const delta = msg.delta || '';
          setStateRef.current((p) => ({ ...p, aiTranscript: p.aiTranscript + delta }));
          break;
        }
        case 'response.output_audio.delta': {
          const d = msg.delta || '';
          if (d) audioChunksRef.current.push(d);
          break;
        }
        case 'response.output_audio.done':
        case 'response.done': {
          if (audioChunksRef.current.length > 0) {
            playChunks([...audioChunksRef.current]);
            audioChunksRef.current = [];
          }
          break;
        }
        case 'input_audio_buffer.speech_started': {
          if (currentSourceRef.current) { try { currentSourceRef.current.stop(); } catch { /* */ } }
          window.speechSynthesis.cancel();
          setStateRef.current((p) => ({ ...p, isListening: true, isSpeaking: false, transcript: '' }));
          break;
        }
        case 'input_audio_buffer.speech_stopped': {
          setStateRef.current((p) => ({ ...p, isListening: false }));
          break;
        }
        case 'conversation.item.input_audio_transcription.completed': {
          const t = msg.transcript || '';
          if (t) setStateRef.current((p) => ({ ...p, transcript: t }));
          break;
        }
        case 'error': {
          console.error('Voice WS error:', msg.error);
          setStateRef.current((p) => ({ ...p, error: msg.error?.message || 'Voice error', isConnecting: false }));
          break;
        }
      }
    } catch { /* ignore non-JSON */ }
  }, [playChunks]);

  // Mic capture
  const startMic = useCallback(async () => {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
      }
      if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: SAMPLE_RATE, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      micStreamRef.current = stream;

      const ctx = audioCtxRef.current;
      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const processor = ctx.createScriptProcessor(CHUNK_SIZE, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = floatTo16BitPCM(inputData);
        const base64 = arrayBufferToBase64(pcm16.buffer as ArrayBuffer);
        ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: base64 }));
      };

      source.connect(processor);
      processor.connect(ctx.destination);
      setStateRef.current((p) => ({ ...p, isListening: true }));
    } catch (err: any) {
      setStateRef.current((p) => ({ ...p, error: 'Mic access denied', isListening: false }));
    }
  }, []);

  const stopMic = useCallback(() => {
    if (processorRef.current) { try { processorRef.current.disconnect(); } catch { /* */ } processorRef.current = null; }
    if (sourceRef.current) { try { sourceRef.current.disconnect(); } catch { /* */ } sourceRef.current = null; }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach((t) => t.stop()); micStreamRef.current = null; }
    setStateRef.current((p) => ({ ...p, isListening: false }));
  }, []);

  // Connect
  const connect = useCallback((apiKey: string) => {
    return new Promise<void>((resolve) => {
      if (wsRef.current?.readyState === WebSocket.OPEN && sessionReadyRef.current) { resolve(); return; }

      setStateRef.current((p) => ({ ...p, isConnecting: true, error: null }));
      cleanup();

      const timeout = setTimeout(() => {
        if (!sessionReadyRef.current) {
          setStateRef.current((p) => ({ ...p, isConnecting: false, useFallback: true, isConnected: false, error: 'xAI voice unavailable -- using browser voice' }));
          if (wsRef.current) { try { wsRef.current.close(); } catch { /* */ } wsRef.current = null; }
          resolve();
        }
      }, 10000);

      try {
        const url = `${WS_URL}?model=${MODEL}&api_key=${encodeURIComponent(apiKey)}`;
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          ws.send(JSON.stringify({
            type: 'session.update',
            session: {
              instructions: `You are a friendly PR assistant. Keep responses very brief (1-2 sentences max). Be warm and conversational.`,
              voice: 'eve',
              turn_detection: { type: 'server_vad', create_response: true },
              input_audio_transcription: { model: 'grok-2-voice' },
            },
          }));
          if (keepAliveRef.current) window.clearInterval(keepAliveRef.current);
          keepAliveRef.current = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
          }, 30000);
        };

        ws.onmessage = (event) => {
          handleMessage(event);
          if (sessionReadyRef.current) clearTimeout(timeout);
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          setStateRef.current((p) => ({ ...p, isConnecting: false, useFallback: true, isConnected: false, error: 'xAI voice connection failed -- using browser voice' }));
          resolve();
        };

        ws.onclose = () => {
          clearTimeout(timeout);
          setStateRef.current((p) => ({ ...p, isConnected: false, isConnecting: false, isListening: false }));
          wsRef.current = null;
          sessionReadyRef.current = false;
          if (keepAliveRef.current) { window.clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
        };
      } catch {
        clearTimeout(timeout);
        setStateRef.current((p) => ({ ...p, isConnecting: false, useFallback: true, isConnected: false }));
        resolve();
      }
    });
  }, [cleanup, handleMessage]);

  const disconnect = useCallback(() => {
    cleanup();
    setStateRef.current({ isConnected: false, isConnecting: false, isListening: false, isSpeaking: false, transcript: '', aiTranscript: '', error: null, useFallback: true });
  }, [cleanup]);

  // Fallback SpeechRecognition
  const fallbackRecRef = useRef<any>(null);

  const startFallbackListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setStateRef.current((p) => ({ ...p, error: 'Speech recognition not supported' })); return; }

    window.speechSynthesis.cancel();
    const rec = new SR();
    rec.continuous = false; rec.interimResults = true; rec.lang = 'en-US';

    rec.onresult = (event: any) => {
      const results = event.results;
      if (results.length > 0) {
        const last = results[results.length - 1];
        setStateRef.current((p) => ({ ...p, transcript: last[0].transcript }));
      }
    };
    rec.onerror = () => setStateRef.current((p) => ({ ...p, isListening: false }));
    rec.onend = () => setStateRef.current((p) => ({ ...p, isListening: false }));

    fallbackRecRef.current = rec;
    setStateRef.current((p) => ({ ...p, isListening: true, transcript: '' }));
    try { rec.start(); } catch { setStateRef.current((p) => ({ ...p, isListening: false })); }
  }, []);

  const stopFallbackListening = useCallback(() => {
    fallbackRecRef.current?.stop();
    setStateRef.current((p) => ({ ...p, isListening: false }));
  }, []);

  // Public actions
  const startListening = useCallback(async () => {
    if (state.useFallback || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      startFallbackListening();
      return;
    }
    setStateRef.current((p) => ({ ...p, transcript: '', aiTranscript: '' }));
    audioChunksRef.current = [];
    await startMic();
  }, [state.useFallback, startMic, startFallbackListening]);

  const stopListening = useCallback(() => {
    if (state.useFallback) { stopFallbackListening(); return; }
    stopMic();
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
      wsRef.current.send(JSON.stringify({ type: 'response.create' }));
    }
  }, [state.useFallback, stopMic, stopFallbackListening]);

  const speak = useCallback((text: string) => {
    if (state.useFallback || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      speakBrowser(text);
      return;
    }
    audioChunksRef.current = [];
    setStateRef.current((p) => ({ ...p, aiTranscript: '' }));
    wsRef.current.send(JSON.stringify({
      type: 'conversation.item.create',
      item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: `Say this (very brief): "${text}"` }] },
    }));
    wsRef.current.send(JSON.stringify({ type: 'response.create' }));
  }, [state.useFallback, speakBrowser]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    if (currentSourceRef.current) { try { currentSourceRef.current.stop(); } catch { /* */ } }
    setStateRef.current((p) => ({ ...p, isSpeaking: false }));
  }, []);

  const sendText = useCallback((text: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] },
    }));
    ws.send(JSON.stringify({ type: 'response.create' }));
  }, []);

  const triggerGreeting = useCallback(() => {
    const greeting = "Hey! I'm your PR assistant. What's your website and what do you sell?";
    if (state.useFallback) { speakBrowser(greeting); return; }
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) { speakBrowser(greeting); return; }
    audioChunksRef.current = [];
    setStateRef.current((p) => ({ ...p, aiTranscript: '' }));
    ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: `Introduce yourself briefly and ask about my PR campaign.` }] },
    }));
    ws.send(JSON.stringify({ type: 'response.create' }));
  }, [state.useFallback, speakBrowser]);

  return {
    ...state,
    connect,
    disconnect,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    sendText,
    triggerGreeting,
  };
}
