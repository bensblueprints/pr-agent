import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import ChatPage from '@/pages/ChatPage';
import AdminPage from '@/pages/AdminPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  if (auth.isLoading) return null;
  if (!auth.user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <HashRouter>
          <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/chat" element={<RequireAuth><ChatPage /></RequireAuth>} />
                <Route path="/admin" element={<RequireAuth><AdminPage /></RequireAuth>} />
              </Routes>
            </main>
            <Footer />
          </div>
        </HashRouter>
      </AppProvider>
    </AuthProvider>
  );
}
