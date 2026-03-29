import React, { useState, useEffect } from 'react';
import { supabase, ensureUserProfile, rawFetch } from './lib/supabase';
import { Layout, Typography, Badge, Space, Button, App as AntApp } from 'antd';
import { PlayCircleOutlined, HistoryOutlined, WalletOutlined, ControlOutlined, LogoutOutlined, RocketOutlined, CrownFilled } from '@ant-design/icons';
import UserLiveView from './views/UserLiveView';
import UserHistoryView from './views/UserHistoryView';
import UserWalletView from './views/UserWalletView';
import AdminDashboard from './views/AdminDashboard';
import LoginView from './views/LoginView';
import SplashScreen from './components/SplashScreen';

const logo = "/logo.png"; // Fixed local reliable path

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

function MainContent({ currentUser, setCurrentUser, currentView, setCurrentView, onLogout, balance, setBalance }) {
  const { message: msg } = AntApp.useApp();

  const handleLogin = (user) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      setCurrentView('admin-dashboard');
    } else {
      setCurrentView('live');
    }
  };

  const navItems = [
    { key: 'live', icon: <PlayCircleOutlined />, label: 'EN VIVO' },
    { key: 'history', icon: <HistoryOutlined />, label: 'RESULTADOS' },
    { key: 'wallet', icon: <WalletOutlined />, label: 'BILLETERA' },
  ];

  const adminItem = { key: 'admin-dashboard', icon: <ControlOutlined />, label: 'ADMIN PANEL' };
  const itemsToShow = currentUser?.role === 'admin' ? [...navItems, adminItem] : navItems;

  const renderContent = () => {
    switch (currentView) {
      case 'live': return <UserLiveView userBalance={balance} setUserBalance={setBalance} />;
      case 'history': return <UserHistoryView />;
      case 'wallet': return <UserWalletView balance={balance} setBalance={setBalance} />;
      case 'admin-dashboard': return currentUser?.role === 'admin' ? <AdminDashboard /> : <UserLiveView userBalance={balance} setUserBalance={setBalance} />;
      default: return <UserLiveView userBalance={balance} setUserBalance={setBalance} />;
    }
  };

  if (!currentUser) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--obsidian)' }}>
      {/* Desktop Header */}
      <Header className="desktop-only" style={{ 
        position: 'sticky', top: 0, zIndex: 1001, width: '100%', 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 60px', height: 90, background: 'rgba(10, 10, 10, 0.95)',
        backdropFilter: 'blur(30px)', borderBottom: '1px solid rgba(212, 175, 55, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setCurrentView('live')}>
           <Title level={4} style={{ color: 'var(--champagne)', margin: 0, fontWeight: 900, letterSpacing: '2px', fontFamily: 'Outfit' }}>TRABALIVE</Title>
        </div>

        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          {itemsToShow.map(item => {
            const isActive = currentView === item.key;
            return (
              <div 
                key={item.key}
                onClick={() => setCurrentView(item.key)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, opacity: isActive ? 1 : 0.4 }}
              >
                <span style={{ color: isActive ? 'var(--champagne)' : '#fff' }}>{item.icon}</span>
                <Text style={{ color: isActive ? 'var(--champagne)' : '#fff', fontSize: 11, fontWeight: 800 }}>{item.label}</Text>
              </div>
            );
          })}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
           <div style={{ background: 'rgba(212,175,55,0.05)', padding: '10px 20px', borderRadius: 12, border: '1px solid rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <WalletOutlined style={{ color: 'var(--champagne)', fontSize: 14 }} />
              <Text style={{ color: 'var(--champagne)', fontSize: 18, fontWeight: 900, fontFamily: 'Outfit' }}>${parseFloat(balance).toLocaleString()}</Text>
           </div>
           <Button type="text" icon={<LogoutOutlined style={{ color: '#ef4444' }} />} onClick={onLogout} />
           <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--gold-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 900 }}>{currentUser?.email?.charAt(0).toUpperCase()}</div>
        </div>
      </Header>

      {/* Mobile Top Header */}
      <Header className="mobile-only" style={{ 
        background: 'rgba(10, 10, 10, 0.8)', 
        backdropFilter: 'blur(10px)',
        padding: '0 20px', 
        height: 70, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 1002,
        borderBottom: '1px solid rgba(212, 175, 55, 0.1)'
      }}>
        <Title level={5} style={{ color: 'var(--champagne)', margin: 0, fontWeight: 900, fontSize: 14 }}>TRABALIVE</Title>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: 'rgba(212,175,55,0.1)', padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(212,175,55,0.2)' }}>
              <Text style={{ color: 'var(--champagne)', fontSize: 14, fontWeight: 900 }}>${parseFloat(balance).toLocaleString()}</Text>
          </div>
          <Button 
            type="text" 
            icon={<LogoutOutlined style={{ color: '#ef4444', fontSize: 18 }} />} 
            onClick={onLogout}
            style={{ 
              background: 'rgba(239, 68, 68, 0.05)', 
              borderRadius: '8px',
              height: 36,
              width: 36
            }}
          />
        </div>
      </Header>

      <Content>{renderContent()}</Content>

      {/* Mobile Bottom Navigation */}
      <div className="mobile-nav mobile-only" style={{ background: 'rgba(10, 10, 10, 0.95)', padding: '12px 0 20px', borderTop: '1px solid rgba(212, 175, 55, 0.1)' }}>
        {itemsToShow.map(item => {
          const isActive = currentView === item.key;
          return (
            <div key={item.key} onClick={() => setCurrentView(item.key)} style={{ flex: 1, textAlign: 'center', color: isActive ? 'var(--champagne)' : 'rgba(255,255,255,0.2)' }}>
              <div style={{ fontSize: 20 }}>{item.icon}</div>
              <div style={{ fontSize: 8, fontWeight: 800 }}>{item.label}</div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('live');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const syncUser = async (user) => {
      if (!user) return;
      try {
        const profile = await ensureUserProfile(user);
        setCurrentUser({
          email: user.email,
          role: profile?.role || user.user_metadata?.role || 'user',
          id: user.id
        });
        if (profile) setBalance(profile.balance);
      } catch (err) {
        console.error('Core Sync Err:', err);
      }
    };

    const initApp = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await syncUser(user);
          // Pre-fetch live event to warm up
          await rawFetch(`events?select=id&limit=1`);
        }
      } catch (err) {
        console.error('Auth Init Error:', err);
      } finally {
        setIsInitialized(true);
        // Minimum hydration time for aesthetics
        setTimeout(() => setIsDataReady(true), 2000);
      }
    };

    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        syncUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setCurrentView('live');
        setBalance(0);
      }
    });

    // Global Real-time Sync for balance
    let balanceChannel;
    if (currentUser?.id) {
       balanceChannel = supabase.channel('global-wallet-sync')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${currentUser.id}` }, (payload) => {
          if (payload.new) setBalance(payload.new.balance);
        })
        .subscribe();
    }

    return () => {
       if (subscription) subscription.unsubscribe();
       if (balanceChannel) supabase.removeChannel(balanceChannel);
    };
  }, [currentUser?.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!isInitialized) return null;

  return (
    <AntApp>
      {!isDataReady && <SplashScreen isReady={isDataReady} />}
      <div style={{ visibility: isDataReady ? 'visible' : 'hidden', opacity: isDataReady ? 1 : 0, transition: 'opacity 0.5s ease' }}>
        <MainContent 
          currentUser={currentUser} 
          setCurrentUser={setCurrentUser} 
          currentView={currentView} 
          setCurrentView={setCurrentView}
          onLogout={handleLogout}
          balance={balance}
          setBalance={setBalance}
        />
      </div>
    </AntApp>
  );
}

export default App;
