import React, { useState, useEffect, useRef } from 'react';
import { supabase, ensureUserProfile, rawFetch } from './lib/supabase';
import { Layout, Typography, Badge, Space, Button, App as AntApp, Drawer } from 'antd';
import { PlayCircleOutlined, ControlOutlined, LogoutOutlined, RocketOutlined, CrownFilled, SettingOutlined, FilePdfOutlined, ClockCircleOutlined, WalletOutlined, SunOutlined, MoonOutlined, HomeOutlined, HomeFilled, WalletFilled, PlayCircleFilled, ClockCircleFilled, ControlFilled, FileTextFilled, FileTextOutlined } from '@ant-design/icons';
import { useSound } from './hooks/useSound';
import UserLiveView from './views/UserLiveView';
import AdminDashboard from './views/AdminDashboard';
import LoginView from './views/LoginView';
import SplashScreen from './components/SplashScreen';
import UserSettingsView from './views/UserSettingsView';
import ReplaysView from './views/ReplaysView';
import AdminCarteleraView from './views/AdminCarteleraView';
import RelojView from './views/RelojView';
import UserWalletView from './views/UserWalletView';


const logo = "/logo.png"; // Fixed local reliable path

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

function MainContent({ currentUser, setCurrentUser, currentView, setCurrentView, onLogout, balance, setBalance, theme, toggleTheme }) {
  const { message: msg } = AntApp.useApp();
  const [menuDrawerOpen, setMenuDrawerOpen] = useState(false);

  const handleLogin = (user) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      setCurrentView('admin-dashboard');
    } else {
      setCurrentView('live');
    }
  };

  const navItems = [
    { key: 'live', icon: <HomeOutlined />, label: 'EN VIVO', public: true },
    { key: 'wallet', icon: <WalletOutlined />, label: 'BILLETERA', public: false },
    { key: 'replays', icon: <PlayCircleOutlined />, label: 'REPETICIONES', public: false },
  ];

  const adminItems = [
    { key: 'reloj', icon: <ClockCircleOutlined />, label: 'RELOJ', public: false },
    { key: 'admin-dashboard', icon: <ControlOutlined />, label: 'ADMIN PANEL', public: false },
    { key: 'admin-cartelera', icon: <FilePdfOutlined />, label: 'CARTELERA', public: false },
  ];

  const itemsToShow = currentUser 
    ? (currentUser.role === 'admin' ? [...navItems, ...adminItems] : navItems)
    : navItems.filter(item => item.public);

  const getIcon = (key, isActive) => {
    switch (key) {
      case 'live':
        return isActive ? <HomeFilled /> : <HomeOutlined />;
      case 'wallet':
        return isActive ? <WalletFilled /> : <WalletOutlined />;
      case 'replays':
        return isActive ? <PlayCircleFilled /> : <PlayCircleOutlined />;
      case 'reloj':
        return isActive ? <ClockCircleFilled /> : <ClockCircleOutlined />;
      case 'admin-dashboard':
        return isActive ? <ControlFilled /> : <ControlOutlined />;
      case 'admin-cartelera':
        return isActive ? <FileTextFilled /> : <FileTextOutlined />;
      default:
        return null;
    }
  };

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
      case 'reloj': return currentUser?.role === 'admin' ? <RelojView /> : <UserLiveView userBalance={balance} setUserBalance={setBalance} currentUser={currentUser} setCurrentView={setCurrentView} />;
      case 'wallet': return <UserWalletView balance={balance} setBalance={setBalance} currentUser={currentUser} />;
      case 'settings': return <UserSettingsView onLogout={onLogout} />;
      case 'admin-dashboard': return currentUser?.role === 'admin' ? <AdminDashboard /> : <UserLiveView userBalance={balance} setUserBalance={setBalance} currentUser={currentUser} setCurrentView={setCurrentView} />;
      case 'admin-cartelera': return currentUser?.role === 'admin' ? <AdminCarteleraView /> : <UserLiveView userBalance={balance} setUserBalance={setBalance} currentUser={currentUser} setCurrentView={setCurrentView} />;
      default: return <UserLiveView userBalance={balance} setUserBalance={setBalance} currentUser={currentUser} setCurrentView={setCurrentView} />;
    }
  };



  const otherItems = itemsToShow.filter(item => item.key !== 'live');
  const half = Math.ceil(otherItems.length / 2);
  const leftItems = otherItems.slice(0, half);
  const rightItems = otherItems.slice(half);
  const homeItem = itemsToShow.find(item => item.key === 'live');
  const isHomeActive = currentView === 'live';

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--obsidian)' }}>
      {/* Desktop Header */}
      <Header className="desktop-only" style={{ 
        position: 'sticky', top: 0, zIndex: 1001, width: '100%', 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(10px, 1.5vw, 20px)', height: 64, 
        background: theme === 'dark' ? 'rgba(11, 15, 23, 0.92)' : 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.06)',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
           <button
             onClick={() => setMenuDrawerOpen(true)}
             aria-label="Abrir Menú"
             title="Menú Principal"
             className="sleek-menu-btn"
             style={{
               background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
               border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
               borderRadius: 10,
               width: 36,
               height: 36,
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               cursor: 'pointer',
               outline: 'none',
               transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
               boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
             }}
           >
             <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 16 }}>
               <span style={{ display: 'block', height: 2, background: 'var(--text-main)', borderRadius: 2, width: '100%' }} />
               <span style={{ display: 'block', height: 2, background: '#10b981', borderRadius: 2, width: '65%' }} />
               <span style={{ display: 'block', height: 2, background: 'var(--text-main)', borderRadius: 2, width: '100%' }} />
             </div>
           </button>

           <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setCurrentView('live')}>
              <img src={theme === 'dark' ? '/Logominiatura.png' : '/LogominiaturaBlanco.png'} style={{ height: 32 }} alt="Coliseo Logo" />
              <Title level={5} style={{ color: 'var(--text-main)', margin: 0, fontWeight: 900, letterSpacing: '0.3px', fontFamily: 'Outfit, sans-serif', textTransform: 'uppercase', fontSize: 'clamp(10px, 1vw, 13px)', whiteSpace: 'nowrap' }}>COLISEO ANGEL CRUZ</Title>
           </div>
        </div>

        {/* Minimalist Pill Capsule Nav */}
        <div style={{ 
          display: 'flex', 
          gap: 3, 
          alignItems: 'center', 
          flexWrap: 'nowrap',
          background: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
          border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.06)',
          borderRadius: 22,
          padding: '3px 4px'
        }}>
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
                   gap: 6, 
                   padding: '5px clamp(8px, 0.9vw, 13px)',
                   borderRadius: 16,
                   background: isActive ? (theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.07)') : 'transparent',
                   color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                   transition: 'all 0.2s ease',
                   whiteSpace: 'nowrap',
                   flexShrink: 0
                }}
                className="nav-tab-item"
              >
                <span style={{ 
                  color: isActive ? (theme === 'dark' ? '#38bdf8' : '#0284c7') : 'var(--text-muted)', 
                  fontSize: 13, 
                  display: 'flex', 
                  alignItems: 'center',
                  opacity: isActive ? 1 : 0.65
                }}>
                  {getIcon(item.key, isActive)}
                </span>
                <Text style={{ 
                  color: isActive ? 'var(--text-main)' : 'var(--text-muted)', 
                  fontSize: 'clamp(10px, 0.85vw, 11px)', 
                  fontWeight: isActive ? 800 : 500, 
                  letterSpacing: '0.4px', 
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap'
                }}>
                  {item.label}
                </Text>
              </div>
            );
          })}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {currentUser ? (
              <Space size={10}>
                 <Button 
                    type="text" 
                    icon={theme === 'dark' ? <SunOutlined style={{ color: '#fbbf24', fontSize: 15 }} /> : <MoonOutlined style={{ color: '#6b7280', fontSize: 15 }} />} 
                    onClick={toggleTheme} 
                    style={{ 
                      background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', 
                      border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                      borderRadius: 10, 
                      width: 38, 
                      height: 38, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }} 
                 />
                 <Button 
                    type="text" 
                    icon={<WalletOutlined style={{ color: '#10b981', fontSize: 15 }} />} 
                    onClick={() => setCurrentView('wallet')} 
                    style={{ 
                       background: 'rgba(16, 185, 129, 0.08)', 
                       border: '1px solid rgba(16, 185, 129, 0.2)',
                       borderRadius: 10, 
                       height: 38, 
                       padding: '0 16px',
                       display: 'flex',
                       alignItems: 'center',
                       gap: 8
                    }} 
                 >
                   <span style={{ color: 'var(--text-main)', fontWeight: 800, fontSize: 13, fontFamily: 'Outfit, sans-serif' }}>
                     ${parseFloat(balance || 0).toFixed(2)}
                   </span>
                 </Button>
                 <Button 
                    type="text" 
                    icon={<SettingOutlined style={{ color: 'var(--text-main)', fontSize: 15 }} />} 
                    onClick={() => setCurrentView('settings')} 
                    style={{ 
                      background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', 
                      border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                      borderRadius: 10, 
                      width: 38, 
                      height: 38, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }} 
                 />
              </Space>
            ) : (
              <Space size={10}>
                 <Button 
                    type="text" 
                    icon={theme === 'dark' ? <SunOutlined style={{ color: '#fbbf24', fontSize: 15 }} /> : <MoonOutlined style={{ color: '#6b7280', fontSize: 15 }} />} 
                    onClick={toggleTheme} 
                    style={{ 
                      background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', 
                      border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                      borderRadius: 10, 
                      width: 38, 
                      height: 38, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }} 
                 />
                 <Button 
                    type="primary" 
                    onClick={() => setCurrentView('login')}
                    style={{ 
                       height: 38, 
                       borderRadius: 10, 
                       fontWeight: 800, 
                       padding: '0 20px',
                       textTransform: 'uppercase',
                       letterSpacing: '0.5px',
                       fontSize: 11,
                       background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                       borderColor: '#10b981'
                    }}
                 >
                    INICIAR SESIÓN
                 </Button>
              </Space>
            )}
        </div>
      </Header>

      <Header className="mobile-only" style={{ 
        background: theme === 'dark' ? 'rgba(11, 15, 23, 0.85)' : 'rgba(255, 255, 255, 0.85)', 
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        padding: '0 16px', 
        height: 60, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 1002,
        borderBottom: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setMenuDrawerOpen(true)}
            aria-label="Abrir Menú"
            title="Menú Principal"
            className="sleek-menu-btn"
            style={{
              background: theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
              border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: 10,
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 16 }}>
              <span style={{ display: 'block', height: 2, background: 'var(--text-main)', borderRadius: 2, width: '100%' }} />
              <span style={{ display: 'block', height: 2, background: '#10b981', borderRadius: 2, width: '65%' }} />
              <span style={{ display: 'block', height: 2, background: 'var(--text-main)', borderRadius: 2, width: '100%' }} />
            </div>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setCurrentView('live')}>
              <img src={theme === 'dark' ? '/Logominiatura.png' : '/LogominiaturaBlanco.png'} style={{ height: 30 }} alt="Logo" />
              <Title level={5} style={{ color: 'var(--text-main)', margin: 0, fontWeight: 800, fontSize: 12, fontFamily: 'Outfit, sans-serif', letterSpacing: '0.5px' }}>ANGEL CRUZ</Title>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {currentUser ? (
              <Space size={6}>
                 <Button 
                    type="text" 
                    icon={theme === 'dark' ? <SunOutlined style={{ color: '#fbbf24', fontSize: 14 }} /> : <MoonOutlined style={{ color: '#6b7280', fontSize: 14 }} />} 
                    onClick={toggleTheme} 
                    style={{ 
                      background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', 
                      borderRadius: 8, 
                      height: 34, 
                      width: 34, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      border: 'none'
                    }} 
                 />
                 <Button 
                    type="text" 
                    icon={<WalletOutlined style={{ color: '#10b981', fontSize: 14 }} />} 
                    onClick={() => setCurrentView('wallet')} 
                    style={{ 
                       background: 'rgba(16, 185, 129, 0.08)', 
                       border: 'none',
                       borderRadius: 8, 
                       height: 34, 
                       padding: '0 10px',
                       display: 'flex',
                       alignItems: 'center',
                       gap: 4
                    }} 
                 >
                   <span style={{ color: 'var(--text-main)', fontWeight: 800, fontSize: 12, fontFamily: 'Outfit, sans-serif' }}>${parseFloat(balance || 0).toFixed(2)}</span>
                 </Button>
                 <Button 
                   type="text" 
                   icon={<SettingOutlined style={{ color: 'var(--text-main)', fontSize: 14 }} />} 
                   onClick={() => setCurrentView('settings')}
                   style={{ 
                     background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', 
                     borderRadius: 8,
                     height: 34,
                     width: 34,
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     border: 'none'
                   }}
                 />
              </Space>
          ) : (
              <Space size={8}>
                 <Button 
                    type="text" 
                    icon={theme === 'dark' ? <SunOutlined style={{ color: '#fbbf24', fontSize: 14 }} /> : <MoonOutlined style={{ color: '#4b5563', fontSize: 14 }} />} 
                    onClick={toggleTheme} 
                    style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '50%', height: 36, width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                 />
                 <Button 
                    type="primary" 
                    size="small"
                    onClick={() => setCurrentView('login')}
                    style={{ 
                       borderRadius: 9999, 
                       fontWeight: 800,
                       fontSize: 10,
                       height: 34,
                       padding: '0 14px'
                    }}
                 >
                    LOGIN
                 </Button>
              </Space>
          )}
        </div>
      </Header>

      {/* Drawer de Navegación Moderno, Elegante y Minimalista */}
      <Drawer
        placement="left"
        closable={false}
        onClose={() => setMenuDrawerOpen(false)}
        open={menuDrawerOpen}
        width={310}
        styles={{
          body: {
            background: theme === 'dark' ? '#090d16' : '#ffffff',
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            fontFamily: 'Outfit, sans-serif',
            overflowY: 'auto'
          },
          header: { display: 'none' }
        }}
      >
        <div>
          {/* Drawer Header: Logo + Close Button */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            marginBottom: 24, 
            paddingBottom: 16, 
            borderBottom: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={theme === 'dark' ? '/Logominiatura.png' : '/LogominiaturaBlanco.png'} style={{ height: 34 }} alt="Logo" />
              <div>
                <div style={{ color: 'var(--text-main)', fontWeight: 900, fontSize: 13, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  COLISEO ANGEL CRUZ
                </div>
                <div style={{ color: '#10b981', fontSize: 10, fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  ● EN VIVO OFICIAL
                </div>
              </div>
            </div>
            <button
              onClick={() => setMenuDrawerOpen(false)}
              aria-label="Cerrar menú"
              style={{
                background: theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
                border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
                borderRadius: '50%',
                width: 32,
                height: 32,
                color: 'var(--text-main)',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
            >
              ✕
            </button>
          </div>

          {/* User Profile Card (if logged in) */}
          {currentUser ? (
            <div style={{
              background: theme === 'dark' ? 'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)' : 'rgba(0,0,0,0.03)',
              border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)',
              borderRadius: 14,
              padding: '14px',
              marginBottom: 20
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: currentUser.role === 'admin' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: 15
                  }}>
                    {currentUser.username ? currentUser.username[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-main)', fontWeight: 800, fontSize: 13, lineHeight: 1.2 }}>
                      {currentUser.username || 'Usuario'}
                    </div>
                    <span style={{
                      display: 'inline-block',
                      background: currentUser.role === 'admin' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: currentUser.role === 'admin' ? '#fbbf24' : '#10b981',
                      fontSize: 9,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 12,
                      marginTop: 2,
                      letterSpacing: '0.5px'
                    }}>
                      {currentUser.role === 'admin' ? '👑 ADMIN' : 'ESPECTADOR'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Wallet pill inside card */}
              <div 
                onClick={() => { setCurrentView('wallet'); setMenuDrawerOpen(false); }}
                style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: 10,
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14 }}>💳</span>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700 }}>Saldo:</span>
                </div>
                <span style={{ color: '#10b981', fontWeight: 900, fontSize: 13 }}>
                  ${parseFloat(balance || 0).toFixed(2)}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 20 }}>
              <Button
                type="primary"
                block
                onClick={() => { setCurrentView('login'); setMenuDrawerOpen(false); }}
                style={{
                  height: 44,
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 13,
                  letterSpacing: '0.5px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                }}
              >
                🔑 INICIAR SESIÓN
              </Button>
            </div>
          )}

          {/* Navigation Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', padding: '0 8px', marginBottom: 4 }}>
              NAVEGACIÓN
            </div>

            {itemsToShow.map(item => {
              const isActive = currentView === item.key;
              return (
                <div
                  key={item.key}
                  onClick={() => {
                    setCurrentView(item.key);
                    setMenuDrawerOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '11px 14px',
                    borderRadius: 12,
                    cursor: 'pointer',
                    background: isActive ? (theme === 'dark' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(2, 132, 199, 0.08)') : 'transparent',
                    border: isActive ? (theme === 'dark' ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(2, 132, 199, 0.2)') : '1px solid transparent',
                    color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      color: isActive ? '#38bdf8' : 'var(--text-muted)',
                      fontSize: 16,
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {getIcon(item.key, isActive)}
                    </span>
                    <span style={{
                      fontSize: 13,
                      fontWeight: isActive ? 800 : 600,
                      letterSpacing: '0.3px',
                      color: isActive ? 'var(--text-main)' : 'var(--text-muted)'
                    }}>
                      {item.label}
                    </span>
                  </div>
                  {isActive && (
                    <span style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#38bdf8',
                      boxShadow: '0 0 8px #38bdf8'
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div style={{ paddingTop: 20, borderTop: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)', marginTop: 20 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Button
              block
              onClick={toggleTheme}
              style={{
                height: 40,
                borderRadius: 10,
                background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                color: 'var(--text-main)',
                fontWeight: 700,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              {theme === 'dark' ? <SunOutlined style={{ color: '#fbbf24' }} /> : <MoonOutlined style={{ color: '#6b7280' }} />}
              {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
            </Button>

            {currentUser && (
              <Button
                block
                danger
                onClick={() => { onLogout(); setMenuDrawerOpen(false); }}
                style={{
                  height: 40,
                  borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.08)',
                  borderColor: 'rgba(239, 68, 68, 0.25)',
                  fontWeight: 700,
                  fontSize: 12
                }}
              >
                Cerrar Sesión
              </Button>
            )}
          </div>

          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: 600 }}>
            Coliseo Ángel Cruz • Transmisión Oficial
          </div>
        </div>
      </Drawer>

      <Content>{renderContent()}</Content>
    </Layout>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('live');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const [balance, setBalance] = useState(0);
  const [theme, setTheme] = useState(localStorage.getItem('app_theme') || 'dark');
  const balanceRef = useRef(0);
  const { play } = useSound();

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('app_theme', nextTheme);
  };

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
      // Check for deep links first
      const params = new URLSearchParams(window.location.search);
      if (params.get('replay')) {
        setCurrentView('replays');
      }

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
      {!isDataReady && <SplashScreen isReady={isDataReady} theme={theme} />}
      <div style={{ visibility: isDataReady ? 'visible' : 'hidden', opacity: isDataReady ? 1 : 0, transition: 'opacity 0.5s ease' }}>
        <MainContent 
          currentUser={currentUser} 
          setCurrentUser={setCurrentUser} 
          currentView={currentView} 
          setCurrentView={setCurrentView}
          onLogout={handleLogout}
          balance={balance}
          setBalance={setBalance}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      </div>
    </AntApp>
  );
}

export default App;
