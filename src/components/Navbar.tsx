import { useState } from 'react';
import { Sparkles, LogOut, Shield, User, Trash2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const isChat = location.pathname === '/chat';
  const isAdmin = auth.user?.role === 'admin';
  const [showMenu, setShowMenu] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const handleDelete = async () => {
    try {
      await auth.deleteAccount(deletePassword);
      setShowDelete(false);
      navigate('/');
    } catch (err: any) {
      setDeleteError(err.message || 'Delete failed');
    }
  };

  return (
    <nav className="h-14 border-b border-border bg-background/80 backdrop-blur-xl px-4 flex items-center justify-between sticky top-0 z-40">
      <button onClick={() => navigate('/')} className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <span className="font-semibold text-sm">PR Agent</span>
      </button>

      <div className="flex items-center gap-3">
        {isChat && (
          <span className="text-xs text-muted-foreground">Grok 4 + Voice</span>
        )}

        {auth.user ? (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border border-border text-xs hover:bg-muted/80 transition-colors"
            >
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="max-w-[120px] truncate">{auth.user.email}</span>
            </button>

            {showMenu && (
              <div className="absolute right-0 top-10 w-48 rounded-xl bg-card border border-border shadow-xl py-1 z-50">
                {isAdmin && (
                  <button
                    onClick={() => { setShowMenu(false); navigate('/admin'); }}
                    className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-muted transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5 text-primary" /> Admin Portal
                  </button>
                )}
                <button
                  onClick={() => { setShowMenu(false); setShowDelete(true); }}
                  className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-red-500/10 text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Account
                </button>
                <button
                  onClick={() => { setShowMenu(false); auth.logout(); navigate('/'); }}
                  className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-muted transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 text-muted-foreground" /> Log Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary hover:bg-primary/20 transition-colors"
          >
            Log In
          </button>
        )}
      </div>

      {/* Delete Account Modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4" onClick={() => setShowDelete(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Delete Account</h3>
            <p className="text-xs text-muted-foreground mb-4">
              This will permanently delete your account and all data. Enter your password to confirm.
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Your password"
              className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border focus:border-primary focus:outline-none text-sm mb-3"
            />
            {deleteError && <p className="text-xs text-red-400 mb-3">{deleteError}</p>}
            <div className="flex gap-2">
              <button onClick={handleDelete} className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600">Delete</button>
              <button onClick={() => setShowDelete(false)} className="flex-1 px-4 py-2 rounded-xl bg-muted border text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
