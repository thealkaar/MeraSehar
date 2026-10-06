import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';
import RightPanel from './components/RightPanel';
import MobileDrawer from './components/MobileDrawer';
import AuthView from './views/AuthView';
import FeedView from './views/FeedView';
import JobsView from './views/JobsView';
import RatesView from './views/RatesView';
import AuthorityView from './views/AuthorityView';
import EmergencyModal from './components/EmergencyModal';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [activeTab, setActiveTab] = useState('news');
  const [viewingAuthority, setViewingAuthority] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);

  // Edge swipe detection for opening drawer from right edge
  const edgeTouchStartX = useRef(null);

  const handleEdgeTouchStart = useCallback((e) => {
    const screenW = window.innerWidth;
    const touchX = e.touches[0].clientX;
    // Only trigger if touch starts within 20px of the right edge
    if (touchX >= screenW - 20) {
      edgeTouchStartX.current = touchX;
    }
  }, []);

  const handleEdgeTouchEnd = useCallback((e) => {
    if (edgeTouchStartX.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const delta = edgeTouchStartX.current - endX;
    // Swiped left at least 50px from right edge
    if (delta > 50) {
      setDrawerOpen(true);
    }
    edgeTouchStartX.current = null;
  }, []);

  useEffect(() => {
    // Only attach edge swipe on mobile/tablet (< lg breakpoint)
    const mq = window.matchMedia('(max-width: 1023px)');
    const attach = () => {
      if (mq.matches) {
        document.addEventListener('touchstart', handleEdgeTouchStart, { passive: true });
        document.addEventListener('touchend', handleEdgeTouchEnd, { passive: true });
      } else {
        document.removeEventListener('touchstart', handleEdgeTouchStart);
        document.removeEventListener('touchend', handleEdgeTouchEnd);
      }
    };
    attach();
    mq.addEventListener('change', attach);
    return () => {
      mq.removeEventListener('change', attach);
      document.removeEventListener('touchstart', handleEdgeTouchStart);
      document.removeEventListener('touchend', handleEdgeTouchEnd);
    };
  }, [handleEdgeTouchStart, handleEdgeTouchEnd]);

  const checkAuth = () => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    } else {
      setToken(null);
      setUser(null);
    }
  };

  useEffect(() => {
    checkAuth();
    setAppReady(true);

    // Listen for custom logout / token expire events
    window.addEventListener('auth_change', checkAuth);
    return () => {
      window.removeEventListener('auth_change', checkAuth);
    };
  }, []);

  const handleAuthSuccess = (userData) => {
    if (window.location.pathname === '/admin') {
      window.history.replaceState({}, '', '/');
    }
    setToken(localStorage.getItem('token'));
    setUser(userData);
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth_change'));
  };

  // Loading state
  if (!appReady) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-app)' }}>
        <span className="w-6 h-6 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated — show Auth flow
  if (!token) {
    return (
      <AuthView
        onAuthSuccess={handleAuthSuccess}
        isAdmin={window.location.pathname === '/admin'}
      />
    );
  }

  // Main authenticated layout
  return (
    <div className="min-h-screen flex justify-center w-full theme-transition" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}>
      <div className="flex w-full max-w-7xl px-0 sm:px-4 lg:px-8">
        
        {/* ═══ Left Sidebar — Desktop only ═══ */}
        <aside className="hidden lg:flex lg:flex-col lg:w-[275px] lg:sticky lg:top-0 lg:h-screen lg:shrink-0 border-r border-line" style={{ backgroundColor: 'var(--bg-sidebar)' }}>
          <Sidebar
            activeTab={activeTab}
            setActiveTab={(tab) => {
              setViewingAuthority(false);
              setActiveTab(tab);
            }}
            user={user}
            onLogout={handleLogout}
            onViewAuthority={() => setViewingAuthority(true)}
          />
        </aside>

        {/* ═══ Center Main Column ═══ */}
        <main className="w-full flex-grow max-w-[600px] min-h-screen border-r border-line flex flex-col mx-auto lg:mx-0">
          {/* Sticky Header */}
          <Header
            user={user}
            onUserUpdate={handleUserUpdate}
            onMenuOpen={() => setDrawerOpen(true)}
            onEmergencyOpen={() => setEmergencyOpen(true)}
          />

          {/* Content Area */}
          <div className="flex-grow w-full">
            {viewingAuthority && user?.is_authority ? (
              <AuthorityView
                user={user}
                onClose={() => setViewingAuthority(false)}
              />
            ) : (
              <>
                {/* Authority Quick Banner — mobile only */}
                {user?.is_authority && (
                  <div className="bg-zinc-50 dark:bg-zinc-950 border-b border-line px-4 py-3 flex items-center justify-between text-xs lg:hidden animate-fadeIn">
                    <span className="text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Civic supervisor active</span>
                    <button
                      onClick={() => setViewingAuthority(true)}
                      className="text-black dark:text-white font-black hover:underline uppercase tracking-wider text-[10px]"
                    >
                      Manager Panel &rarr;
                    </button>
                  </div>
                )}

                {/* Tab Content */}
                <div>
                  {activeTab === 'news' && <FeedView type="news" user={user} />}
                  {activeTab === 'complaints' && <FeedView type="complaint" user={user} />}
                  {activeTab === 'jobs' && <JobsView user={user} />}
                  {activeTab === 'rates' && <RatesView user={user} />}
                </div>
              </>
            )}
          </div>
        </main>

        {/* ═══ Right Panel — Wide desktop only ═══ */}
        <aside className="hidden xl:flex xl:flex-col xl:w-[340px] xl:sticky xl:top-0 xl:h-screen xl:shrink-0 pl-6">
          <RightPanel
            user={user}
            onViewAuthority={() => setViewingAuthority(true)}
          />
        </aside>
      </div>

      {/* ═══ Bottom Nav — Mobile/Tablet only ═══ */}
      <BottomNav activeTab={activeTab} setActiveTab={(tab) => {
        setViewingAuthority(false);
        setActiveTab(tab);
      }} />

      {/* ═══ Mobile Settings Drawer ═══ */}
      <MobileDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={user}
        onLogout={handleLogout}
        onViewAuthority={() => setViewingAuthority(true)}
        onEmergencyOpen={() => setEmergencyOpen(true)}
      />

      {/* ═══ Emergency Helplines Modal ═══ */}
      <EmergencyModal
        isOpen={emergencyOpen}
        onClose={() => setEmergencyOpen(false)}
        city={user?.city || 'Lucknow'}
      />
    </div>
  );
}
