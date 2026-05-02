import { ArrowRight, Sparkles, MessageCircle, PenTool, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem-3rem)] px-4">
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">PR Publication Agent</h1>
        <p className="text-lg text-muted-foreground">
          AI-powered PR strategist powered by Grok 4. Have a conversation, browse your website,
          get audience-aware recommendations, and craft perfect articles -- all by voice or chat.
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2"><MessageCircle className="w-4 h-4" /> Voice & Chat</div>
          <div className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> 1,245 Publications</div>
          <div className="flex items-center gap-2"><PenTool className="w-4 h-4" /> Article Writing</div>
          <div className="flex items-center gap-2"><Receipt className="w-4 h-4" /> Invoicing</div>
        </div>
        <button
          onClick={() => navigate('/chat')}
          className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 mx-auto"
        >
          Get Started <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
