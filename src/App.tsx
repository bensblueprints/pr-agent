import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LandingPage from '@/pages/LandingPage';
import ChatPage from '@/pages/ChatPage';

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/chat" element={<ChatPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </HashRouter>
    </AppProvider>
  );
}
