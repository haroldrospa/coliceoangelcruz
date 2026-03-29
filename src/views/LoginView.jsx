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
      height: '100dvh', // Modern dynamic viewport height
      background: 'radial-gradient(circle at center, #121212 0%, #050505 100%)',
      padding: '16px', // Reduced padding for better fit
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Dynamic Background Mesh */}
      <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '120%', height: '120%', background: 'radial-gradient(circle, rgba(212, 175, 55, 0.04) 0%, transparent 60%)', filter: 'blur(100px)', zIndex: 0 }} />

      <Card 
        className="glass-panel" 
        style={{ 
            width: '100%', 
            maxWidth: '380px', // Slightly narrower to ensure fit
            borderRadius: '20px', 
            boxShadow: '0 50px 100px rgba(0,0,0,0.8)', 
            border: '1px solid rgba(212, 175, 55, 0.12)',
            background: 'rgba(5, 5, 5, 0.4)', // Enhanced transparency as requested
            backdropFilter: 'blur(40px)',
            zIndex: 1,
            maxHeight: '95dvh', // Maximum safety constraint
            display: 'flex',
            flexDirection: 'column'
        }}
        styles={{ body: { padding: 'clamp(24px, 5dvh, 40px) 32px', overflowY: 'auto' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 'clamp(20px, 4dvh, 40px)' }}>
          <Title level={4} style={{ 
            color: 'var(--champagne)', 
            fontSize: 9, 
            letterSpacing: '4px', 
            textTransform: 'uppercase',
            fontWeight: 800,
            margin: 0,
            opacity: 0.8
          }}>
             TRABALIVE INTERNATIONAL
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 7, textTransform: 'uppercase', letterSpacing: '2px', display: 'block', marginTop: 8 }}>
             Acceso de Nivel Platinum
          </Text>
        </div>

        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <div className="input-field-group">
            <Text style={{ color: 'var(--text-muted)', fontSize: 8, display: 'block', marginBottom: '8px', fontWeight: 800, letterSpacing: '1px' }}>ID DE USUARIO / EMAIL</Text>
            <Input 
              prefix={<UserOutlined style={{ color: 'var(--champagne)', opacity: 0.6 }} />} 
              placeholder="id@trabalive.com" 
              size="large"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ 
                height: 'clamp(44px, 6dvh, 52px)', 
                color: '#fff',
                fontSize: 13
              }}
            />
          </div>

          <div className="input-field-group">
            <Text style={{ color: 'var(--text-muted)', fontSize: 8, display: 'block', marginBottom: '8px', fontWeight: 800, letterSpacing: '1px' }}>CÓDIGO SECRETO</Text>
            <Input.Password 
              prefix={<LockOutlined style={{ color: 'var(--champagne)', opacity: 0.6 }} />} 
              placeholder="••••••••" 
              size="large"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ 
                height: 'clamp(44px, 6dvh, 52px)', 
                color: '#fff',
                fontSize: 13
              }}
            />
          </div>

          <Button 
            type="primary" 
            block 
            size="large" 
            onClick={handleAuth}
            loading={loading}
            icon={<ArrowRightOutlined />}
            style={{ 
                height: 'clamp(55px, 8dvh, 65px)', 
                fontSize: '14px', 
                fontWeight: '900', 
                background: 'var(--gold-gradient)', 
                color: '#000', 
                border: 'none',
                borderRadius: '12px',
                boxShadow: '0 10px 30px rgba(212, 175, 55, 0.2)',
                marginTop: '10px'
            }}
          >
            {isRegistering ? 'CREAR MI CUENTA' : 'ENTRAR AL SISTEMA'}
          </Button>

          <Button 
            type="text" 
            block 
            onClick={() => setIsRegistering(!isRegistering)}
            style={{ color: 'var(--champagne)', fontSize: '11px', fontWeight: '800' }}
          >
            {isRegistering ? '¿YA ERES MIEMBRO? ACCEDER' : '¿REQUISITO DE CUENTA? REGÍSTRATE'}
          </Button>
        </Space>

        <Divider style={{ borderColor: 'rgba(212,175,55,0.06)', margin: 'clamp(16px, 3dvh, 24px) 0' }} />
        
        <div style={{ textAlign: 'center', opacity: 0.4 }}>
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 700 }}>
              <SafetyCertificateFilled style={{ color: '#22c55e', fontSize: 10 }} />
              SISTEMA DE SEGURIDAD FINTECH SSL
           </div>
        </div>
      </Card>
      
      {/* Branding invisible watermark */}
      <div style={{ position: 'absolute', bottom: '16px', textAlign: 'center', width: '100%', opacity: 0.2 }}>
         <Text style={{ color: '#fff', fontSize: 8, letterSpacing: '1px', fontWeight: 600 }}>ULTRA LOGIN • CLOUD SYNC ACTIVE</Text>
      </div>
    </div>
  );
};

export default LoginView;
