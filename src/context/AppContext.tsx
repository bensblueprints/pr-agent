import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { ChatMessage, Publication, ArticleEntry, ClientProfile, ConversationPhase, PubRecommendation, InvoiceItem } from '@/types';

const WELCOME: ChatMessage = {
  role: 'ai',
  text: "Hey there! I'm your PR strategist powered by Grok 4. I'm here to help you get featured in the right publications.\n\nTell me about your business -- what's your website, what do you sell, and what are you looking to achieve with PR?",
};

const EMPTY_PROFILE: ClientProfile = {
  websiteUrl: '', productDescription: '', industry: '', targetAudience: '',
  goals: '', uniqueSellingPoints: '', keyMessages: '', tone: 'professional',
};

interface AppState {
  apiKey: string; setApiKey: (k: string) => void;
  messages: ChatMessage[]; addMessage: (m: ChatMessage) => void;
  setLoading: (v: boolean) => void; clearChat: () => void;
  phase: ConversationPhase; setPhase: (p: ConversationPhase) => void;
  clientProfile: ClientProfile; updateClientProfile: (p: Partial<ClientProfile>) => void;
  recommendedPubs: PubRecommendation[]; setRecommendedPubs: (r: PubRecommendation[]) => void;
  selectedPubs: Publication[]; togglePubSelection: (pub: Publication) => void;
  articles: ArticleEntry[]; setArticles: (a: ArticleEntry[]) => void;
  updateArticle: (name: string, content: string) => void;
  updateArticleNotes: (name: string, notes: string) => void;
  submitForApproval: (name: string) => void; approveArticle: (name: string) => void;
  invoices: InvoiceItem[]; setInvoices: (i: InvoiceItem[]) => void;
  resetWorkflow: () => void;
}

const AppContext = createContext<AppState>({
  apiKey: '', setApiKey: () => {},
  messages: [], addMessage: () => {}, setLoading: () => {}, clearChat: () => {},
  phase: 'discovery', setPhase: () => {},
  clientProfile: EMPTY_PROFILE, updateClientProfile: () => {},
  recommendedPubs: [], setRecommendedPubs: () => {},
  selectedPubs: [], togglePubSelection: () => {},
  articles: [], setArticles: () => {}, updateArticle: () => {}, updateArticleNotes: () => {},
  submitForApproval: () => {}, approveArticle: () => {},
  invoices: [], setInvoices: () => {}, resetWorkflow: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [phase, setPhase] = useState<ConversationPhase>('discovery');
  const [clientProfile, setClientProfile] = useState<ClientProfile>(EMPTY_PROFILE);
  const [recommendedPubs, setRecommendedPubs] = useState<PubRecommendation[]>([]);
  const [selectedPubs, setSelectedPubs] = useState<Publication[]>([]);
  const [articles, setArticles] = useState<ArticleEntry[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('xai_api_key');
    if (saved) setApiKeyState(saved);
  }, []);

  const setApiKey = (key: string) => {
    setApiKeyState(key);
    localStorage.setItem('xai_api_key', key);
  };

  const addMessage = (msg: ChatMessage) => {
    setMessages((prev) => [...prev.filter((m) => !m.isLoading), msg]);
  };

  const setLoading = (loading: boolean) => {
    if (loading) setMessages((prev) => [...prev, { role: 'ai', text: '', isLoading: true }]);
    else setMessages((prev) => prev.filter((m) => !m.isLoading));
  };

  const clearChat = () => {
    setMessages([WELCOME]);
    setPhase('discovery');
    setClientProfile(EMPTY_PROFILE);
    setRecommendedPubs([]);
    setSelectedPubs([]);
    setArticles([]);
    setInvoices([]);
  };

  const updateClientProfile = (patch: Partial<ClientProfile>) => {
    setClientProfile((prev) => ({ ...prev, ...patch }));
  };

  const togglePubSelection = (pub: Publication) => {
    setSelectedPubs((prev) => {
      const exists = prev.find((p) => p.name === pub.name);
      if (exists) return prev.filter((p) => p.name !== pub.name);
      return [...prev, pub];
    });
  };

  const updateArticle = (pubName: string, content: string) => {
    setArticles((prev) => prev.map((a) => a.pubName === pubName ? { ...a, article: content } : a));
  };

  const updateArticleNotes = (pubName: string, notes: string) => {
    setArticles((prev) => prev.map((a) => a.pubName === pubName ? { ...a, notes } : a));
  };

  const submitForApproval = (pubName: string) => {
    setArticles((prev) => prev.map((a) => a.pubName === pubName ? { ...a, status: 'submitted' as const } : a));
  };

  const approveArticle = (pubName: string) => {
    setArticles((prev) => prev.map((a) => a.pubName === pubName ? { ...a, status: 'approved' as const } : a));
  };

  const resetWorkflow = () => {
    setPhase('discovery');
    setClientProfile(EMPTY_PROFILE);
    setRecommendedPubs([]);
    setSelectedPubs([]);
    setArticles([]);
    setInvoices([]);
    setMessages([WELCOME]);
  };

  return (
    <AppContext.Provider value={{
      apiKey, setApiKey, messages, addMessage, setLoading, clearChat,
      phase, setPhase, clientProfile, updateClientProfile,
      recommendedPubs, setRecommendedPubs,
      selectedPubs, togglePubSelection,
      articles, setArticles, updateArticle, updateArticleNotes,
      submitForApproval, approveArticle,
      invoices, setInvoices, resetWorkflow,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() { return useContext(AppContext); }
