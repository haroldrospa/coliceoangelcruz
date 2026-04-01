import React, { useState } from 'react';
import { Card, Input, Button, Typography, Space, App as AntApp, Divider, Badge, Row, Col } from 'antd';
import { UserOutlined, LockOutlined, RocketFilled, ChromeFilled, ExperimentOutlined, ThunderboltFilled, SafetyCertificateFilled, ArrowRightOutlined } from '@ant-design/icons';
import { supabase } from '../lib/supabase';

const { Title, Text } = Typography;

const LoginView = ({ onLogin }) => {
  const { message } = AntApp.useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      return message.warning('Por favor completa todos los campos');
    }
    setLoading(true);
    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { role: email.includes('admin') ? 'admin' : 'user' }
          }
        });
        if (error) throw error;
        if (data.session) {
           const role = data.user.user_metadata?.role || 'user';
           onLogin({ email: data.user.email, role: role, id: data.user.id });
           message.success('Acceso inmediato habilitado');
        } else {
           message.success('Registro exitoso. Inicie sesión para continuar.');
           setIsRegistering(false);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const user = data.user;
        const role = user.user_metadata?.role || 'user';
        onLogin({ email: user.email, role: role, id: user.id });
        message.success(`Bienvenido, ${user.email}`);
      }
    } catch (error) {
      message.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh', 
      background: '#040806', // Flat ultra-dark crisp background
      position: 'relative',
      overflow: 'hidden',
      padding: '20px'
    }}>
      <style>{`
        .login-wrapper {
           display: flex;
           flex-direction: column;
           width: 100%;
           max-width: 420px;
           position: relative;
           align-items: center;
        }
        .login-branding-panel { display: none !important; }
        .form-mobile-header { display: flex !important; margin-bottom: clamp(16px, 3dvh, 32px); flex-direction: column; align-items: center; }
        
        /* Premium Flat Antd Input Overrides */
        .premium-input .ant-input-affix-wrapper {
           background: rgba(255,255,255,0.02) !important;
           border: 1px solid rgba(255,255,255,0.05) !important;
           border-radius: 8px; /* Tighter, delicate radius */
           padding: 4px 12px;
           transition: all 0.2s ease;
           box-shadow: none !important;
        }
        .premium-input .ant-input-affix-wrapper:hover {
           border-color: rgba(16,185,129,0.3) !important;
        }
        .premium-input .ant-input-affix-wrapper:focus-within {
           background: rgba(16,185,129,0.02) !important;
           border-color: #10b981 !important;
           box-shadow: none !important; /* Zero neon glow */
        }
        .premium-input input { 
           background: transparent !important; 
           color: #fff !important; 
           font-family: 'Outfit', sans-serif;
           font-size: 13px !important;
           letter-spacing: 0px;
        }
        .premium-input input::placeholder { color: rgba(255,255,255,0.3) !important; font-weight: 300; }

        /* Solid Flat Minimalist Button Action */
        .magic-btn {
           background: #10b981 !important;
           border: none !important;
           box-shadow: none !important;
           border-radius: 8px !important;
           transition: opacity 0.2s ease !important;
        }
        .magic-btn:hover {
           opacity: 0.8 !important;
           transform: none !important;
           background: #10b981 !important; /* No color shift, just opacity */
        }

        @media (min-width: 768px) {
           .login-wrapper {
              flex-direction: row;
              max-width: 750px; /* Reduced max width for tighter minimalism */
              align-items: center; 
              justify-content: center;
           }
           .login-branding-panel { 
              display: flex !important; 
              flex: 0 0 clamp(260px, 30vw, 320px); 
              height: 480px; /* Reduced height, more delicate */
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              padding: 30px; 
              z-index: 10;
              background: #060d09; /* Flat dark panel */
              border: 1px solid rgba(255,255,255,0.04);
              border-radius: 12px; /* Subtle radius */
              box-shadow: 0 20px 40px rgba(0,0,0,0.5); /* Deep grounding, no glow */
              position: relative;
              overflow: hidden;
           }
           .login-form-card { 
               flex: 1; 
               height: 420px; 
               border-radius: 12px !important;
               border: 1px solid rgba(255, 255, 255, 0.04) !important;
               background: #0a110d !important; /* Flat dark grey/green */
               backdrop-filter: none !important;
               z-index: 5 !important;
               padding-left: 20px; 
               margin-left: -10px; 
           }
           .form-mobile-header { display: none !important; }
        }
      `}</style>

      {/* Dynamic Background Mesh (Softened, No Blur Bleed) */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: '100%', height: '100%', background: 'transparent', zIndex: 0 }} />
      
      {/* OVERARCHING WRAPPER */}
      <div className="login-wrapper">

      {/* LEFT BRANDING PANEL */}
      <div className="login-branding-panel">
         {/* Subliminal Watermark */}
         <img src="/official_logo.png" style={{ 
            height: 'clamp(250px, 40vh, 500px)', 
            position: 'absolute',
            opacity: 0.05,
            right: '-15%',
            bottom: '-10%',
            transform: 'rotate(-15deg)',
            filter: 'blur(3px)',
            pointerEvents: 'none'
         }} alt="" aria-hidden="true" />
         
         <img src="/official_logo.png" style={{ 
            height: 120, /* Smaller, more delicate logo */
            marginBottom: 24,
            zIndex: 2,
            opacity: 0.95
         }} alt="Main Logo" />
         
         <div style={{ textAlign: 'center', zIndex: 2 }}>
             <Title level={4} style={{ 
                color: 'rgba(255,255,255,0.7)', 
                margin: 0, 
                fontFamily: 'Outfit', 
                fontWeight: 300, 
                letterSpacing: '4px', 
                fontSize: 12
             }}>
                COLISEO
             </Title>
             <Title level={2} style={{ 
                margin: '2px 0 0 0', 
                fontFamily: 'Outfit', 
                fontWeight: 600, /* Less bulky */
                textTransform: 'uppercase', 
                color: '#10b981', 
                letterSpacing: '1px', 
                fontSize: 22
             }}>
                ANGEL CRUZ
             </Title>
             <div style={{ width: 24, height: 2, background: 'rgba(16,185,129,0.5)', margin: '14px auto', borderRadius: 1 }} />
             <Text style={{ 
                color: 'rgba(255,255,255,0.6)', 
                fontSize: 11, 
                fontWeight: 600, 
                letterSpacing: '6px', 
                textTransform: 'uppercase'
             }}>
                Élite y Combate Táctico
             </Text>
         </div>
      </div>

      <Card 
        className="glass-panel login-form-card" 
        style={{ 
            width: '100%', 
            borderRadius: '24px', 
            boxShadow: '0 50px 100px rgba(0,0,0,0.8)', 
            border: '1px solid rgba(16, 185, 129, 0.12)',
            background: 'rgba(5, 5, 5, 0.6)', 
            backdropFilter: 'blur(40px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            overflow: 'hidden'
        }}
        styles={{ body: { padding: 'clamp(24px, 5vh, 40px) 32px', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' } }}
      >
        <div className="form-mobile-header" style={{ textAlign: 'center' }}>
          <img src="/official_logo.png" style={{ 
            height: 48, 
            marginBottom: 12
          }} alt="Login Logo" />
          <Title level={5} style={{ 
            color: 'var(--brand-green)', 
            fontSize: 9, 
            letterSpacing: '3px', 
            textTransform: 'uppercase',
            fontWeight: 800,
            margin: 0,
            opacity: 0.9
          }}>
             COLISEO ANGEL CRUZ
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 7, textTransform: 'uppercase', letterSpacing: '2px', display: 'block', marginTop: 4 }}>
             Acceso de Nivel Platinum
          </Text>
        </div>

        <Space direction="vertical" size={16} style={{ width: '100%', marginTop: 8 }}>
          <div className="premium-input">
            <Input 
              prefix={<UserOutlined style={{ color: '#10b981', opacity: 0.8, marginRight: 8 }} />} 
              placeholder="ID de Usuario / Email" 
              size="middle"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ height: '44px' }} /* Thin, delicate */
            />
          </div>

          <div className="premium-input">
            <Input.Password 
              prefix={<LockOutlined style={{ color: '#10b981', opacity: 0.8, marginRight: 8 }} />} 
              placeholder="Código Secreto" 
              size="middle"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ height: '44px' }} /* Thin, delicate */
            />
          </div>

          <Button 
            className="magic-btn"
            type="primary" 
            block 
            size="middle" 
            onClick={handleAuth}
            loading={loading}
            style={{ 
                height: '46px', 
                fontSize: '13px', 
                fontWeight: '600',
                letterSpacing: '0.5px',
                marginTop: '12px',
                boxShadow: 'none'
            }}
          >
            {isRegistering ? 'Crear cuenta' : 'Entrar al sistema'}
          </Button>

          <Button 
            type="text" 
            block 
            onClick={() => setIsRegistering(!isRegistering)}
            style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '500', marginTop: '-4px' }}
          >
            {isRegistering ? '¿Ya tienes acceso? Entrar' : '¿Requisito de sistema? Registrar'}
          </Button>
        </Space>

        <Divider style={{ borderColor: 'rgba(16,185,129,0.06)', margin: 'clamp(16px, 3dvh, 24px) 0' }} />
        
        <div style={{ textAlign: 'center', opacity: 0.4 }}>
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 700 }}>
              <SafetyCertificateFilled style={{ color: '#22c55e', fontSize: 10 }} />
              SISTEMA DE SEGURIDAD FINTECH SSL
           </div>
           <div style={{ margin: '12px 0 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 8, letterSpacing: '1px' }}>
              &copy; 2026 COLISEO ANGEL CRUZ. TODOS LOS DERECHOS RESERVADOS.
           </div>
        </div>
      </Card>
      
      {/* Close Wrapper */}
      </div>

    </div>
  );
};

export default LoginView;
