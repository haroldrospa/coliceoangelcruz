import React, { useState, useEffect, useRef } from 'react';
import { supabase, ensureUserProfile, rawFetch } from './lib/supabase';
import { Layout, Typography, Badge, Space, Button, App as AntApp } from 'antd';
import { PlayCircleOutlined, HistoryOutlined, WalletOutlined, ControlOutlined, LogoutOutlined, RocketOutlined, CrownFilled, SettingOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useSound } from './hooks/useSound';
import UserLiveView from './views/UserLiveView';
import UserHistoryView from './views/UserHistoryView';
import UserWalletView from './views/UserWalletView';
import AdminDashboard from './views/AdminDashboard';
import LoginView from './views/LoginView';
import SplashScreen from './components/SplashScreen';
import UserSettingsView from './views/UserSettingsView';
import ReplaysView from './views/ReplaysView';
import AdminCarteleraView from './views/AdminCarteleraView';


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
    { key: 'live', icon: <PlayCircleOutlined />, label: 'EN VIVO', public: true },
    { key: 'replays', icon: <PlayCircleOutlined />, label: 'REPETICIONES', public: false },
    { key: 'history', icon: <HistoryOutlined />, label: 'RESULTADOS', public: false },
    { key: 'wallet', icon: <WalletOutlined />, label: 'BILLETERA', public: false },
  ];

  const adminItems = [
    { key: 'admin-dashboard', icon: <ControlOutlined />, label: 'ADMIN PANEL', public: false },
    { key: 'admin-cartelera', icon: <FilePdfOutlined />, label: 'CARTELERA', public: false },
  ];

  const itemsToShow = currentUser 
    ? (currentUser.role === 'admin' ? [...navItems, ...adminItems] : navItems)
    : navItems.filter(item => item.public);

  const renderContent = () => {
    // PROTECCIÓN DE RUTAS: Redirigir a live si se intenta acceder a una ruta privada sin login
    const currentItem = [...navItems, ...adminItems].find(i => i.key === currentView);
    if (currentItem && !currentItem.public && !currentUser) {
        return <UserLiveView userBalance={0} setUserBalance={() => {}} currentUser={null} setCurrentView={setCurrentView} />;
    }

    switch (currentView) {
      case 'live': return <UserLiveView userBalance={balance} setUserBalance={setBalance} currentUser={currentUser} setCurrentView={setCurrentView} />;
      case 'login': return <LoginView onLogin={handleLogin} />;
      case 'replays': return <ReplaysView currentUser={currentUser} />;
      case 'history': return <UserHistoryView />;
      case 'wallet': return <UserWalletView balance={balance} setBalance={setBalance} />;
      case 'settings': return <UserSettingsView onLogout={onLogout} />;
      case 'admin-dashboard': return currentUser?.role === 'admin' ? <AdminDashboard /> : <UserLiveView userBalance={balance} setUserBalance={setBalance} currentUser={currentUser} setCurrentView={setCurrentView} />;
      case 'admin-cartelera': return currentUser?.role === 'admin' ? <AdminCarteleraView /> : <UserLiveView userBalance={balance} setUserBalance={setBalance} currentUser={currentUser} setCurrentView={setCurrentView} />;
      default: return <UserLiveView userBalance={balance} setUserBalance={setBalance} currentUser={currentUser} setCurrentView={setCurrentView} />;
    }
  };



  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--obsidian)' }}>
      {/* Desktop Header */}
      <Header className="desktop-only" style={{ 
        position: 'sticky', top: 0, zIndex: 1001, width: '100%', 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', height: 72, background: 'rgba(4, 8, 6, 0.85)',
        backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setCurrentView('live')}>
           <img src="/official_logo.png" style={{ height: 28, borderRadius: '50%' }} alt="Coliseo Logo" />
            <Title level={5} style={{ color: '#fff', margin: 0, fontWeight: 700, letterSpacing: '2px', fontFamily: 'Outfit', textTransform: 'uppercase', fontSize: 13 }}>COLISEO ANGEL CRUZ</Title>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {itemsToShow.map(item => {
            const isActive = currentView === item.key;
            return (
              <div 
                key={item.key}
                onClick={() => setCurrentView(item.key)}
                style={{ 
                   cursor: 'pointer', 
                   display: 'flex', 
                   alignItems: 'center', 
                   gap: 8, 
                   padding: '8px 16px',
                   borderRadius: 8,
                   background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                   transition: 'all 0.2s ease',
                   border: '1px solid',
                   borderColor: isActive ? 'rgba(255,255,255,0.05)' : 'transparent'
                }}
              >
                <span style={{ color: isActive ? '#10b981' : 'rgba(255,255,255,0.4)', fontSize: 16 }}>{item.icon}</span>
                <Text style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>{item.label}</Text>
              </div>
            );
          })}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
           {currentUser ? (
              <>
                <div style={{ 
                   background: '#10b981', 
                   padding: '6px 16px', 
                   borderRadius: 8, 
                   display: 'flex', 
                   alignItems: 'center', 
                   gap: 10,
                   border: 'none'
                }}>
                   <WalletOutlined style={{ color: '#fff', fontSize: 16 }} />
                   <Text style={{ color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'Outfit' }}>${parseFloat(balance).toLocaleString()}</Text>
                </div>
                <Button 
                   type="text" 
                   icon={<SettingOutlined style={{ color: '#fff' }} />} 
                   onClick={() => setCurrentView('settings')} 
                   style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '50%', width: 45, height: 45 }} 
                />
              </>
           ) : (
              <Button 
                 type="primary" 
                 onClick={() => setCurrentView('login')}
                 style={{ 
                    background: '#10b981', 
                    borderColor: '#10b981', 
                    height: 40, 
                    borderRadius: 8, 
                    fontWeight: 700, 
                    padding: '0 24px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontSize: 12
                 }}
              >
                 INICIAR SESIÓN
              </Button>
           )}
        </div>
      </Header>

      {/* Mobile Top Header */}
      <Header className="mobile-only" style={{ 
        background: 'rgba(4, 8, 6, 0.95)', 
        backdropFilter: 'blur(20px)',
        padding: '0 16px', 
        height: 64, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 1002,
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/official_logo.png" style={{ height: 26, borderRadius: '50%' }} alt="Logo" />
            <Title level={5} style={{ color: '#fff', margin: 0, fontWeight: 900, fontSize: 12, fontFamily: 'Outfit', letterSpacing: '1px' }}>ANGEL CRUZ</Title>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {currentUser ? (
              <>
                <div style={{ 
                    background: '#10b981', 
                    padding: '4px 12px', 
                    borderRadius: 6, 
                    border: 'none'
                }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'Outfit' }}>${parseFloat(balance).toLocaleString()}</Text>
                </div>
                <Button 
                  type="text" 
                  icon={<SettingOutlined style={{ color: '#fff', fontSize: 18 }} />} 
                  onClick={() => setCurrentView('settings')}
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.05)', 
                    borderRadius: '10px',
                    height: 40,
                    width: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                />
              </>
          ) : (
            <Button 
                type="primary" 
                size="small"
                onClick={() => setCurrentView('login')}
                style={{ 
                   background: '#10b981', 
                   borderColor: '#10b981', 
                   borderRadius: 6, 
                   fontWeight: 800,
                   fontSize: 10
                }}
             >
                LOGIN
             </Button>
          )}
        </div>
      </Header>

      <Content>{renderContent()}</Content>

      <div className="mobile-nav mobile-only" style={{ background: 'rgba(4, 8, 6, 0.95)', padding: '12px 0 20px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-evenly' }}>
        {itemsToShow.map(item => {
          const isActive = currentView === item.key;
          return (
            <div key={item.key} onClick={() => setCurrentView(item.key)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, transition: 'all 0.2s', width: 64 }}>
              <span style={{ color: isActive ? '#10b981' : 'rgba(255,255,255,0.3)', fontSize: 18 }}>{item.icon}</span>
              <Text style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: 700, letterSpacing: '0.5px' }}>{item.label}</Text>
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
  const balanceRef = useRef(0);
  const { play } = useSound();

  useEffect(() => {
    balanceRef.current = balance;
  }, [balance]);

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
        if (profile) {
          setBalance(profile.balance);
          balanceRef.current = profile.balance;
        }
      } catch (err) {
        console.error('Core Sync Err:', err);
      }
    };

    const initApp = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await syncUser(user);
          await rawFetch(`events?select=id&limit=1`);
        }
      } catch (err) {
        console.error('Auth Init Error:', err);
      } finally {
        setIsInitialized(true);
        setTimeout(() => setIsDataReady(true), 2000);
      }
    };

    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        syncUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setCurrentView('live');
        setBalance(0);
      }
    });

    return () => {
        if (subscription) subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Global Real-time Sync for balance & Win Sound
    let balanceChannel;
    if (currentUser?.id) {
       balanceChannel = supabase.channel('global-wallet-sync')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${currentUser.id}` }, (payload) => {
          if (payload.new) {
              const newBalance = parseFloat(payload.new.balance);
              const oldBalance = parseFloat(balanceRef.current);
              
              console.log('💰 [Sync Realtime] Nuevo Saldo:', newBalance, 'Anterior:', oldBalance);
              
              if (newBalance > oldBalance) {
                console.log('🎉 [Sound] Play WIN');
                play('WIN');
              }
              setBalance(newBalance);
              balanceRef.current = newBalance;
          }
        })
        .subscribe();
    }

    return () => {
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
