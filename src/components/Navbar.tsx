import { Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isChat = location.pathname === '/chat';

  return (
    <nav className="h-14 border-b border-border bg-background/80 backdrop-blur-xl px-4 flex items-center justify-between sticky top-0 z-40">
      <button onClick={() => navigate('/')} className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <span className="font-semibold text-sm">PR Agent</span>
      </button>
      {isChat && (
        <span className="text-xs text-muted-foreground">Grok 4 + Voice</span>
      )}
    </nav>
  );
}
