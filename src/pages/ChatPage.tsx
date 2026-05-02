import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Bot, User, Loader2, DollarSign, Check,
  Mic, MicOff, Volume2, VolumeX, PenTool, X,
  Edit3, FileCheck, CheckCircle, Printer, Receipt, Radio,
  Sparkles, Target, Users, ArrowRight, Lightbulb, Globe,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { discoveryChat, getRecommendations, articleCraftingChat, generateArticles, browseWebsite } from '@/lib/xai';
import { useXAiVoice } from '@/hooks/useXAiVoice';
import type { Publication, PubRecommendation, ConversationPhase, ClientProfile } from '@/types';

/* Voice Orb */
function VoiceOrb({ isSpeaking, isListening, isConnected, useFallback, onClick }: {
  isSpeaking: boolean; isListening: boolean; isConnected: boolean; useFallback: boolean; onClick: () => void;
}) {
  const active = isSpeaking || isListening;
  return (
    <button onClick={onClick} className="relative flex items-center justify-center">
      {active && (
        <motion.div className={'absolute w-24 h-24 rounded-full ' + (isSpeaking ? 'bg-primary/20' : 'bg-red-500/20')}
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.15, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
      )}
      <div className={'relative w-14 h-14 rounded-full flex items-center justify-center transition-all border-2 ' +
        (isListening ? 'bg-red-500 border-red-400 shadow-lg shadow-red-500/30' :
         isSpeaking ? 'bg-primary border-primary/40 shadow-lg shadow-primary/30' :
         isConnected ? 'bg-emerald-500/10 border-emerald-500/30' :
         useFallback ? 'bg-amber-500/10 border-amber-500/30' :
         'bg-muted border-border')}>
        {isListening ? <Mic className="w-6 h-6 text-white animate-pulse" /> :
         isSpeaking ? <Volume2 className="w-6 h-6 text-primary-foreground" /> :
         isConnected ? <Radio className="w-5 h-5 text-emerald-400" /> :
         useFallback ? <Mic className="w-5 h-5 text-amber-400" /> :
         <Mic className="w-5 h-5 text-muted-foreground" />}
      </div>
      {isConnected && !active && <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-background" />}
      {useFallback && !isConnected && !active && <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-background" />}
    </button>
  );
}

/* Phase Badge */
function PhaseBadge({ phase }: { phase: ConversationPhase }) {
  const phases: Record<ConversationPhase, { label: string; icon: typeof Sparkles; color: string }> = {
    discovery: { label: 'Discovery', icon: Lightbulb, color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
    recommending: { label: 'Recommendations', icon: Sparkles, color: 'text-primary bg-primary/10 border-primary/20' },
    selecting: { label: 'Select Publications', icon: Target, color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
    crafting: { label: 'Article Planning', icon: PenTool, color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
    reviewing: { label: 'Review Articles', icon: FileCheck, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    invoicing: { label: 'Invoices', icon: Receipt, color: 'text-primary bg-primary/10 border-primary/20' },
  };
  const p = phases[phase];
  const Icon = p.icon;
  return <div className={'inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ' + p.color}><Icon className="w-3 h-3" /> {p.label}</div>;
}

/* Recommendation Card */
function RecCard({ rec, isSelected, onToggle }: { rec: PubRecommendation; isSelected: boolean; onToggle: () => void; }) {
  const pub = rec.publication;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      onClick={onToggle}
      className={'p-4 rounded-xl border cursor-pointer transition-all ' + (isSelected ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20' : 'bg-card border-border hover:border-primary/20')}>
      <div className="flex items-start gap-3">
        <div className={'w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ' + (isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30')}>
          {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold">{pub.name}</h4>
            <span className={'text-xs font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ' + (pub.da >= 90 ? 'text-emerald-400 bg-emerald-400/10' : pub.da >= 80 ? 'text-blue-400 bg-blue-400/10' : pub.da >= 70 ? 'text-amber-400 bg-amber-400/10' : 'text-gray-400 bg-gray-400/10')}>DA {pub.da}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${pub.price.toLocaleString()}</span>
            <span>{pub.displayRegion}</span>
            <span>{pub.displayGenre}</span>
          </div>
          <div className="space-y-1.5 pt-1">
            <div className="flex items-start gap-2">
              <Target className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-foreground/80 leading-relaxed"><span className="font-medium text-primary/70">Why it fits:</span> {rec.reason}</p>
            </div>
            <div className="flex items-start gap-2">
              <Users className="w-3 h-3 text-secondary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-foreground/80 leading-relaxed"><span className="font-medium text-secondary/70">Audience:</span> {rec.audienceInsight}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${rec.fitScore * 10}%` }} /></div>
              <span className="text-[10px] text-muted-foreground">Fit {rec.fitScore}/10</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function ChatPage() {
  const {
    messages, addMessage, setLoading, clearChat,
    phase, setPhase, clientProfile, updateClientProfile,
    recommendedPubs, setRecommendedPubs, selectedPubs, togglePubSelection,
    articles, setArticles, updateArticle, updateArticleNotes, submitForApproval, approveArticle,
    invoices, setInvoices, resetWorkflow,
  } = useApp();

  const voice = useXAiVoice();

  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [publications, setPublications] = useState<Publication[]>([]);
  const [voiceEnabled] = useState(true);
  const [craftingMessages, setCraftingMessages] = useState<{ role: string; text: string }[]>([]);
  const [articleBrief, setArticleBrief] = useState<{ angles: string; milestones: string; quotes: string; cta: string; avoid: string } | undefined>();
  const [articleLoading, setArticleLoading] = useState(false);
  const [activeArticleTab, setActiveArticleTab] = useState(0);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [speakingIdx, setSpeakingIdx] = useState(-1);
  const [browsingSite, setBrowsingSite] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasGreeted = useRef(false);
  const prevTranscriptRef = useRef('');
  const isProcessingRef = useRef(false);

  useEffect(() => {
    fetch('/api/publications')
      .then((r) => r.json())
      .then((d: Publication[]) => setPublications(d))
      .catch(() => setError('Failed to load publications'));
  }, []);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, articles, recommendedPubs]);
  // Voice uses browser fallback only (xAI WebSocket requires API key on client)
  useEffect(() => {
    // Browser voice is enabled by default; xAI native voice is disabled
  }, []);

  useEffect(() => {
    if ((voice.isConnected || voice.useFallback) && !hasGreeted.current && phase === 'discovery') {
      hasGreeted.current = true;
      setTimeout(() => {
        voice.speak("Hey! I'm your PR assistant. What's your website and what do you sell?");
      }, 600);
    }
  }, [voice.isConnected, voice.useFallback, phase]);

  useEffect(() => {
    if (voice.transcript && voice.transcript !== prevTranscriptRef.current && !voice.isListening) {
      prevTranscriptRef.current = voice.transcript;
      const t = voice.transcript.trim();
      if (t.length > 2) { setInput(t); setTimeout(() => handleSend(t), 400); }
    }
  }, [voice.transcript, voice.isListening]);

  const extractUrl = (text: string): string | null => {
    const match = text.match(/(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][-\w]*\.(com|net|org|io|co\.\w{2}|ai|app|dev|us|uk|ca)[^\s]*)/i);
    return match ? match[0] : null;
  };

  const handleSend = useCallback(async (text?: string) => {
    if (isProcessingRef.current) return;
    const msgText = text || input;
    if (!msgText.trim()) return;

    isProcessingRef.current = true;
    setInput('');
    setError('');
    const userMsg = msgText.trim();
    addMessage({ role: 'user', text: userMsg });
    setLoading(true);

    try {
      if (phase === 'discovery') {
        const url = extractUrl(userMsg);
        let websiteData: { title: string; description: string; content: string } | undefined;

        if (url && !clientProfile.websiteUrl) {
          setBrowsingSite(true);
          try {
            const result = await browseWebsite(url);
            websiteData = result;
            updateClientProfile({ websiteUrl: url.startsWith('http') ? url : `https://${url}` });
            if (result.error) {
              setLoading(false);
              addMessage({ role: 'ai', text: `I tried to check ${url} but couldn't access it directly. Tell me about your business instead!` });
              setBrowsingSite(false);
              isProcessingRef.current = false;
              return;
            }
          } catch { /* continue without website */ }
          setBrowsingSite(false);
        }

        const history = messages.filter((m) => !m.isLoading).slice(-8).map((m) => ({ role: m.role, text: m.text }));
        const result = await discoveryChat(history, userMsg, websiteData);

        if (result.extractedProfile) updateClientProfile(result.extractedProfile);
        setLoading(false);

        if (voiceEnabled) voice.speak(result.response.replace(/\*\*/g, '').replace(/_/g, ''));

        if (result.profileComplete) {
          addMessage({ role: 'ai', text: result.response });
          const profile = result.extractedProfile || {};
          setTimeout(() => {
            setPhase('recommending');
            runRecommendation(`Find publications for ${profile.productDescription || 'my business'}`, profile);
          }, 2000);
        } else {
          addMessage({ role: 'ai', text: result.response });
        }
        isProcessingRef.current = false;
        return;
      }

      if (phase === 'recommending' || phase === 'selecting') {
        await runRecommendation(userMsg, clientProfile);
        isProcessingRef.current = false;
        return;
      }

      if (phase === 'crafting') {
        const history = [...craftingMessages, { role: 'user', text: userMsg }];
        setCraftingMessages(history);
        const result = await articleCraftingChat(clientProfile, selectedPubs, history, userMsg);
        if (result.articleBrief) setArticleBrief(result.articleBrief);
        setLoading(false);

        if (voiceEnabled) voice.speak(result.response.replace(/\*\*/g, ''));

        if (result.readyToWrite) {
          addMessage({ role: 'ai', text: result.response });
          setTimeout(() => { setPhase('reviewing'); runArticleGeneration(); }, 1500);
        } else {
          setCraftingMessages((prev) => [...prev, { role: 'ai', text: result.response }]);
          addMessage({ role: 'ai', text: result.response });
        }
        isProcessingRef.current = false;
        return;
      }

      if (phase === 'reviewing') {
        setLoading(false);
        addMessage({ role: 'ai', text: "Got it. Edit articles using the tabs above -- your notes are saved per article. When ready, click Generate Invoices." });
      }

      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      addMessage({ role: 'ai', text: 'Sorry, something went wrong: ' + (err.message || 'Please try again.') });
    }
    isProcessingRef.current = false;
  }, [phase, input, messages, clientProfile, selectedPubs, craftingMessages, voiceEnabled, voice, updateClientProfile, addMessage, setLoading, setPhase]);

  const runRecommendation = async (userMsg: string, profile?: Partial<ClientProfile>) => {
    setLoading(true);
    try {
      const effectiveProfile = profile ? { ...clientProfile, ...profile } : clientProfile;
      const result = await getRecommendations(effectiveProfile, userMsg, publications);
      setRecommendedPubs(result.recommendations);
      setLoading(false);

      const hasPubs = result.recommendations.length > 0;
      let explanation = result.explanation;
      if (hasPubs) explanation += "\n\n**I've analyzed each publication's audience.** Click the ones that fit your budget.";

      if (voiceEnabled) {
        voice.speak(`I found ${result.recommendations.length} publications for you. ${result.explanation.substring(0, 120)}`);
      }

      addMessage({ role: 'ai', text: explanation, recommendations: result.recommendations, budgetUsed: result.budgetUsed, pubCount: result.pubCount, avgDA: result.avgDA });
      if (hasPubs) setPhase('selecting');
    } catch (err: any) {
      setLoading(false);
      addMessage({ role: 'ai', text: 'Error: ' + (err.message || 'Something went wrong') });
    }
  };

  const runArticleGeneration = async () => {
    setArticleLoading(true);
    setError('');
    try {
      const result = await generateArticles(clientProfile, selectedPubs, articleBrief);

      if (!result.articles.length) {
        setError('Article generation failed. Please try again or check your API key.');
        setArticleLoading(false);
        return;
      }

      const entries = result.articles.map((a) => ({
        pubName: a.pubName,
        genre: a.genre,
        publication: selectedPubs.find((p) => p.name === a.pubName) || selectedPubs[0],
        article: a.article,
        status: 'draft' as const,
        notes: '',
      }));

      setArticles(entries);
      setArticleLoading(false);

      if (voiceEnabled) {
        voice.speak(`${entries.length} articles are ready! Review them and submit for approval.`);
      }

      addMessage({
        role: 'ai',
        text: `Articles are ready! I've written ${entries.length} unique pieces for your selected publications, tailored to each audience.\n\n**Review each article**, edit as needed, and submit for approval. Once all are approved, generate your invoices.`,
      });
    } catch (err: any) {
      setArticleLoading(false);
      setError('Failed to generate articles: ' + err.message);
    }
  };

  const sendMessage = useCallback(() => handleSend(), [handleSend]);
  const handleKeydown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const toggleMic = () => {
    if (voice.isListening) voice.stopListening();
    else { setInput(''); voice.startListening(); }
  };

  const handleSpeak = (text: string, idx: number) => {
    if (speakingIdx === idx) {
      voice.stopSpeaking();
      setSpeakingIdx(-1);
    } else {
      voice.speak(text.replace(/\*\*/g, '').replace(/#/g, ''));
      setSpeakingIdx(idx);
    }
  };

  const startArticleCrafting = () => {
    if (selectedPubs.length === 0) return;
    setCraftingMessages([]);
    setPhase('crafting');
    setLoading(true);
    articleCraftingChat(clientProfile, selectedPubs, [], "Let's plan the articles for my campaign.").then((result) => {
      setCraftingMessages([{ role: 'ai', text: result.response }]);
      if (result.articleBrief) setArticleBrief(result.articleBrief);
      setLoading(false);
      if (voiceEnabled) voice.speak(result.response.replace(/\*\*/g, ''));
      addMessage({ role: 'ai', text: result.response });
    }).catch(() => {
      setLoading(false);
      setPhase('reviewing');
      runArticleGeneration();
    });
  };

  const startEdit = (pubName: string) => {
    const a = articles.find((x) => x.pubName === pubName);
    if (a) { setEditingArticle(pubName); setEditContent(a.article); }
  };
  const saveEdit = () => { if (editingArticle) { updateArticle(editingArticle, editContent); setEditingArticle(null); } };

  const handleGenerateInvoices = () => {
    const items = selectedPubs.map((pub) => {
      const art = articles.find((a) => a.pubName === pub.name);
      return { pubName: pub.name, price: pub.price, da: pub.da, genre: pub.displayGenre, articleStatus: art?.status || 'pending' };
    });
    setInvoices(items);
    setPhase('invoicing');
    setShowInvoiceModal(true);
  };

  const totalSelected = selectedPubs.reduce((sum, p) => sum + p.price, 0);
  const allApproved = articles.length > 0 && articles.every((a) => a.status === 'approved');
  const showChatInput = phase !== 'selecting' && phase !== 'invoicing';

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-3rem)]">
      {/* Voice Orb */}
      {voiceEnabled && (phase === 'discovery' || phase === 'crafting') && (
        <div className="flex flex-col items-center pt-4 pb-2 gap-2">
          <VoiceOrb isSpeaking={voice.isSpeaking} isListening={voice.isListening} isConnected={voice.isConnected} useFallback={voice.useFallback} onClick={toggleMic} />
          <div className="text-center">
            {voice.isConnecting && <span className="text-xs text-muted-foreground animate-pulse">Connecting to xAI voice...</span>}
            {voice.isConnected && !voice.isSpeaking && !voice.isListening && <span className="text-xs text-emerald-400">xAI Voice connected -- tap orb to speak</span>}
            {!voice.isConnected && voice.useFallback && !voice.isSpeaking && !voice.isListening && <span className="text-xs text-amber-400">Browser voice mode -- tap orb to speak</span>}
            {voice.isListening && <span className="text-xs text-red-400 animate-pulse">Listening... tap to stop</span>}
            {voice.isSpeaking && <span className="text-xs text-primary animate-pulse">Speaking...</span>}
            {voice.error && <span className="text-xs text-red-400">{voice.error}</span>}
          </div>
          {voice.aiTranscript && voice.isSpeaking && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto px-4 py-2 rounded-xl bg-primary/5 border border-primary/10 text-xs text-center text-muted-foreground">
              {voice.aiTranscript}
            </motion.div>
          )}
        </div>
      )}

      {/* Phase */}
      <div className="px-4 pt-3 pb-1">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <PhaseBadge phase={phase} />
          {phase !== 'discovery' && <button onClick={resetWorkflow} className="text-[10px] text-muted-foreground hover:text-foreground underline">Start Over</button>}
        </div>
      </div>

      {/* Profile summary */}
      {clientProfile.websiteUrl && phase === 'discovery' && (
        <div className="px-4 pb-1">
          <div className="max-w-3xl mx-auto flex items-center gap-2 text-[10px] text-muted-foreground">
            <Globe className="w-3 h-3" />
            <span>{clientProfile.websiteUrl}</span>
            {clientProfile.industry && <span>| {clientProfile.industry}</span>}
            {browsingSite && <span className="text-primary animate-pulse"> -- browsing...</span>}
          </div>
        </div>
      )}

      {/* Main scroll */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-3xl mx-auto space-y-5">
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className={msg.role === 'user' ? 'flex justify-end' : ''}>
              {msg.isLoading && (
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1"><Bot className="w-4 h-4 text-primary" /></div>
                  <div className="bg-muted border border-border rounded-2xl rounded-tl-sm px-4 py-3"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                </div>
              )}
              {msg.role === 'user' && (
                <div className="flex gap-3 flex-row-reverse items-start">
                  <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 mt-1"><User className="w-4 h-4 text-secondary" /></div>
                  <div className="bg-primary/10 border border-primary/20 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]"><p className="text-sm whitespace-pre-wrap">{msg.text}</p></div>
                </div>
              )}
              {msg.role === 'ai' && !msg.isLoading && (
                <div className="space-y-3">
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1"><Bot className="w-4 h-4 text-primary" /></div>
                    <div className="bg-muted border border-border rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] relative">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      <button onClick={() => handleSpeak(msg.text, i)} className={'absolute -right-10 top-3 w-7 h-7 rounded-full flex items-center justify-center transition-colors ' + (speakingIdx === i ? 'bg-primary/20 text-primary' : 'bg-muted border border-border text-muted-foreground hover:text-foreground')}>
                        {speakingIdx === i ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}

          {/* RECOMMENDATIONS */}
          {phase === 'selecting' && recommendedPubs.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto mt-4 space-y-3">
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm"><Sparkles className="w-4 h-4 text-primary" /><span className="font-semibold">{selectedPubs.length} of {recommendedPubs.length} selected</span></div>
                <div className="text-sm font-bold text-primary">Total: ${totalSelected.toLocaleString()}</div>
              </div>
              {recommendedPubs.map((rec) => (
                <RecCard key={rec.publication.name} rec={rec}
                  isSelected={!!selectedPubs.find((p) => p.name === rec.publication.name)}
                  onToggle={() => togglePubSelection(rec.publication)} />
              ))}
              <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border p-3 rounded-xl flex items-center justify-between gap-3">
                <div><p className="text-xs text-muted-foreground">{selectedPubs.length} publications</p><p className="text-lg font-bold text-primary">${totalSelected.toLocaleString()}</p></div>
                <button onClick={startArticleCrafting} disabled={selectedPubs.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                  <PenTool className="w-4 h-4" /> Plan Articles <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ARTICLE REVIEWER */}
          {phase === 'reviewing' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto mt-4 space-y-4">
              {articleLoading && articles.length === 0 && (
                <div className="p-8 rounded-xl bg-muted border border-border text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Writing your articles... This may take a moment.</p>
                </div>
              )}
              {articles.length > 0 && (
                <>
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {articles.map((a, i) => (
                      <button key={i} onClick={() => { setActiveArticleTab(i); setEditingArticle(null); }}
                        className={'px-3 py-1.5 rounded-lg text-xs whitespace-nowrap border flex items-center gap-1 ' + (activeArticleTab === i ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-muted border-border') + (a.status === 'approved' ? ' ring-1 ring-emerald-500/30' : a.status === 'submitted' ? ' ring-1 ring-amber-500/30' : '')}>
                        {a.pubName} {a.status === 'approved' && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                  {articles[activeArticleTab] && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={'text-[10px] px-2 py-0.5 rounded font-medium ' + (articles[activeArticleTab].status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : articles[activeArticleTab].status === 'submitted' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400')}>{articles[activeArticleTab].status}</span>
                          <span className="text-[10px] text-muted-foreground">{articles[activeArticleTab].genre}</span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(articles[activeArticleTab].pubName)} className="px-2 py-1 rounded bg-muted border text-xs flex items-center gap-1 hover:bg-muted/80"><Edit3 className="w-3 h-3" /> Edit</button>
                          {articles[activeArticleTab].status === 'draft' && <button onClick={() => submitForApproval(articles[activeArticleTab].pubName)} className="px-2 py-1 rounded bg-primary/10 border border-primary/20 text-xs text-primary flex items-center gap-1 hover:bg-primary/20"><FileCheck className="w-3 h-3" /> Submit</button>}
                          {articles[activeArticleTab].status === 'submitted' && <button onClick={() => approveArticle(articles[activeArticleTab].pubName)} className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-1 hover:bg-emerald-500/20"><CheckCircle className="w-3 h-3" /> Approve</button>}
                        </div>
                      </div>
                      <input type="text" value={articles[activeArticleTab].notes} onChange={(e) => updateArticleNotes(articles[activeArticleTab].pubName, e.target.value)} placeholder="Add notes/feedback..." className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-xs focus:border-primary focus:outline-none" />
                      {editingArticle === articles[activeArticleTab].pubName ? (
                        <div className="space-y-2">
                          <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full h-64 px-4 py-3 rounded-xl bg-muted border focus:border-primary focus:outline-none text-sm resize-none leading-relaxed" />
                          <div className="flex gap-2"><button onClick={saveEdit} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm hover:bg-primary/90">Save</button><button onClick={() => setEditingArticle(null)} className="px-4 py-2 rounded-xl bg-muted border text-sm">Cancel</button></div>
                        </div>
                      ) : (
                        <div className="p-5 rounded-xl bg-card border text-sm leading-relaxed whitespace-pre-wrap max-h-[50vh] overflow-y-auto">{articles[activeArticleTab].article}</div>
                      )}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-muted border">
                        <span className="text-xs">{articles.filter((a) => a.status === 'approved').length} of {articles.length} approved</span>
                        <button onClick={handleGenerateInvoices} disabled={!allApproved} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"><Receipt className="w-3.5 h-3.5" /> Generate Invoices</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-center">
              <p className="text-sm text-red-400">{error}</p>
              <button onClick={() => setError('')} className="text-xs text-muted-foreground hover:text-foreground mt-1">Dismiss</button>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      {showChatInput && (
        <div className="border-t border-border bg-background/80 backdrop-blur-xl px-4 py-3">
          <div className="max-w-3xl mx-auto flex gap-2">
            <button onClick={toggleMic}
              className={'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border transition-all ' +
                (voice.isListening ? 'bg-red-500 border-red-500 text-white animate-pulse' :
                 voice.isConnected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                 voice.useFallback ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                 'bg-primary/10 border-primary/30 text-primary')}>
              {voice.isListening ? <Mic className="w-5 h-5" /> : voice.isConnected ? <Radio className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            <textarea value={voice.isListening ? (voice.transcript || 'Listening...') : input} onChange={(e) => !voice.isListening && setInput(e.target.value)} onKeyDown={handleKeydown}
              placeholder={phase === 'discovery' ? 'Tell me about your business or share your website...' : phase === 'crafting' ? 'Share angles, quotes, or preferences...' : 'Type your message...'}
              disabled={voice.isListening} className="flex-1 px-4 py-2.5 rounded-xl bg-muted border border-border focus:border-primary focus:outline-none text-sm resize-none min-h-[40px] max-h-[120px] disabled:opacity-50" rows={1} />
            <button onClick={sendMessage} disabled={(!input.trim() && !voice.transcript.trim()) || voice.isListening}
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 transition-colors"><Send className="w-4 h-4" /></button>
            <button onClick={clearChat} className="flex-shrink-0 w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
          </div>
          {voice.isListening && <p className="text-center text-xs text-red-400 mt-1 animate-pulse">Listening... tap to stop</p>}
          {voice.useFallback && !voice.isConnected && <p className="text-center text-xs text-amber-500/60 mt-1">Browser voice mode (tap mic to retry xAI)</p>}
        </div>
      )}

      {/* Invoice Modal */}
      <AnimatePresence>
        {showInvoiceModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4" onClick={() => setShowInvoiceModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Receipt className="w-5 h-5 text-primary" /> Invoice</h3>
                <button onClick={() => window.print()} className="p-2 rounded-lg bg-muted border text-muted-foreground hover:text-foreground"><Printer className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2">
                {invoices.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted border text-sm">
                    <div>
                      <p className="font-medium">{item.pubName}</p>
                      <p className="text-xs text-muted-foreground">{item.genre} | DA {item.da}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${item.price.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">{item.articleStatus}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-xl font-bold text-primary">${invoices.reduce((s, i) => s + i.price, 0).toLocaleString()}</span>
              </div>
              <button onClick={() => setShowInvoiceModal(false)} className="mt-4 w-full px-4 py-2.5 rounded-xl bg-muted border text-sm font-medium hover:bg-muted/80">Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
