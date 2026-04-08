import React, { useEffect, useState } from 'react';
import { Typography, Progress } from 'antd';

const { Title, Text } = Typography;

const SplashScreen = ({ isReady }) => {
  const [percent, setPercent] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let timer;
    if (percent < 90) {
      timer = setInterval(() => {
        setPercent(prev => prev + (Math.random() * 10));
      }, 200);
    }
    
    if (isReady) {
      setPercent(100);
      setTimeout(() => setVisible(false), 500);
    }

    return () => clearInterval(timer);
  }, [percent, isReady]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100vh',
      backgroundColor: '#050505',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      transition: 'opacity 0.8s ease',
      opacity: isReady && percent === 100 ? 0 : 1,
      pointerEvents: 'none'
    }}>
      <div style={{ textAlign: 'center', animation: 'pulse 2s infinite', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img src="/official_logo.png" style={{ 
            height: 60, 
            marginBottom: 10, 
            clipPath: 'circle(49%)',
            filter: 'drop-shadow(0 0 15px rgba(212,175,55,0.4))' 
        }} alt="Logo Oficial" />
        <Title level={2} style={{ 
          color: 'var(--champagne)', 
          margin: 0, 
          fontWeight: 900, 
          letterSpacing: '6px', 
          fontFamily: 'Outfit',
          fontSize: 22,
          textShadow: '0 0 10px rgba(212,175,55,0.2)'
        }}>
          COLISEO ANGEL CRUZ
        </Title>
        <Text style={{ 
          color: 'rgba(255,255,255,0.3)', 
          fontSize: 9, 
          letterSpacing: '3px', 
          fontWeight: 700,
          textTransform: 'uppercase',
          marginTop: 6,
          display: 'block'
        }}>
          Plataforma Táctica de Combate
        </Text>
      </div>

      <div style={{ width: 200, marginTop: 40 }}>
        <Progress 
          percent={percent} 
          showInfo={false} 
          strokeColor="var(--gold-gradient)" 
          trailColor="rgba(255,255,255,0.05)"
          size="small"
        />
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.02); opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
