import React, { useState, useEffect, useRef } from 'react';
import { Button, Space, Typography, Card, Modal, InputNumber, Row, Col, Divider, Badge, App as AntApp } from 'antd';
import { SendOutlined, MessageFilled, SignalFilled, ThunderboltFilled } from '@ant-design/icons';
import { supabase, rawFetch } from '../lib/supabase';
import { useSound } from '../hooks/useSound';

const { Title, Text } = Typography;

// Premium Dacast Iframe Player Wrapper & Standby Mode
const DacastPlayer = ({ status }) => {
  if (status !== 'LIVE') {
    return (
      <div style={{ 
          position: 'relative', width: '100%', paddingBottom: '56.25%', 
          background: '#0a0a0a', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, border: '2px solid rgba(16,185,129,0.1)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <Text style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: '3px' }}>ESPERANDO SEÑAL...</Text>
        </div>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ 
        position: 'relative', 
        width: '100%', 
        paddingBottom: '56.25%', /* 16:9 Aspect Ratio */
        height: 0, 
        overflow: 'hidden',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.1)',
        background: '#0a0a0a'
    }}>
      {/* Blinking Live Indicator */}
      <div style={{ 
          position: 'absolute', 
          top: 15, 
          left: 15, 
          zIndex: 10, 
          background: '#dc2626', /* Flat minimalist red */
          color: '#fff', 
          padding: '4px 8px', 
          borderRadius: 4, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 6,
          animation: 'blink 1.5s infinite'
      }}>
        <div style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%' }} />
        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.5px' }}>EN VIVO</Text>
      </div>

      <iframe 
        src="https://iframe.dacast.com/live/55197822-2232-7fde-fcf0-9369fe4022fb/013bad74-e5d5-4478-824f-893cedb06b66" 
        width="100%" 
        height="100%" 
        frameBorder="0" 
        scrolling="no" 
        allow="autoplay; encrypted-media" 
        allowFullScreen 
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />
      
      <style>{`
        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0.6; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

const UserLiveView = ({ userBalance, setUserBalance }) => {
  const { message: msg } = AntApp.useApp();
  const { play, preload } = useSound();
  
  // Interaction State
  const [isBetModalOpen, setIsBetModalOpen] = useState(false);
  const [betSide, setBetSide] = useState(null);
  const [betAmount, setBetAmount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [showRoosterStrike, setShowRoosterStrike] = useState(false);
  
  // User & Chat State
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  // Fight State
  const [fightInfo, setFightInfo] = useState({
    id: null,
    gallo_a_name: 'Gallo A',
    gallo_b_name: 'Gallo B',
    gallo_a_weight: '3.2 lbs',
    gallo_b_weight: '3.1 lbs',
    post_number: '14',
    gallo_a_odds: 1.90,
    gallo_b_odds: 1.90,
    status: 'PENDING'
  });

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: 'smooth'
        });
    }
  };

  // Audio Unlock Mechanism
  useEffect(() => {
    const unlockAudio = () => {
      preload();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // System Sync
  useEffect(() => {
    const initData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          setUserEmail(user.email);
        }

        const events = await rawFetch(`events?select=*&order=updated_at.desc&limit=1`);
        if (events && events[0]) setFightInfo(events[0]);

        const initialMsgs = await rawFetch(`messages?select=*&order=created_at.asc&limit=50`);
        if (initialMsgs) setChatMessages(initialMsgs);
      } catch (err) {
        console.error('Core Sync Err:', err);
      }
    };

    initData();

    // Real-time Engine
    const eventChannel = supabase.channel('stable-view-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, payload => {
        if (payload.new) {
            setFightInfo(payload.new);
            if (payload.new.status === 'LIVE' && payload.old?.status !== 'LIVE') play('STRIKE');
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        setChatMessages(prev => {
            // Deduplicate: Don't add if the ID (UUID or TempID) already exists
            const exists = prev.some(m => m.id === payload.new.id || (m.text === payload.new.text && m.user_id === payload.new.user_id && Math.abs(new Date(m.created_at) - new Date(payload.new.created_at)) < 2000));
            if (exists) return prev;
            
            if (payload.new.user_id !== userId) play('NOTIFY');
            return [...prev, payload.new];
        });
      })
      .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
              console.log('🛡️ CANAL TÁCTICO ASEGURADO: Realtime Activo');
          }
      });

    return () => supabase.removeChannel(eventChannel);
  }, [userId]);

  const chatContainerRef = useRef(null);
  const [lastMessageCount, setLastMessageCount] = useState(0);

  // 🕒 EPHEMERAL ENGINE: Auto-destruct messages after 15 seconds
  useEffect(() => {
    const ticker = setInterval(() => {
      const now = Date.now();
      setChatMessages(prev => prev.filter(msg => {
        const msgTime = msg.timestamp || new Date(msg.created_at).getTime();
        return (now - msgTime) < 15000;
      }));
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  // SMART SCROLL: Only jump to bottom if count increases
  useEffect(() => {
    if (chatMessages.length > lastMessageCount) {
        scrollToBottom();
    }
    setLastMessageCount(chatMessages.length);
  }, [chatMessages.length]);

  // INITIAL FOCUS: Center video on mount with snappier delay
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    const timer = setTimeout(() => {
      const player = document.querySelector('.player-container');
      player?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const openBetModal = (side) => {
    if (fightInfo.status !== 'LIVE') return msg.warning('APUESTAS CERRADAS');
    setBetSide(side);
    setIsBetModalOpen(true);
  };

  const handleBetConfirm = async () => {
    if (!userId || !fightInfo.id || loading) return;
    if (betAmount > userBalance) return msg.error('SALDO INSUFICIENTE');
    
    setLoading(true);
    try {
      // 🛡️ RE-VERIFY: Check if market is still open before taking money
      const freshFights = await rawFetch(`events?select=status&id=eq.${fightInfo.id}`);
      if (!freshFights[0] || freshFights[0].status !== 'LIVE') throw new Error('MERCADO CERRADO');

      const amount = parseFloat(betAmount);
      const newBalance = (parseFloat(userBalance) - amount).toFixed(2);
      
      // 1. DEDUCT: Take money first (Atomic principle)
      await rawFetch(`users?id=eq.${userId}`, { method: 'PATCH', body: { balance: newBalance } });
      
      // 2. LOG DEDUCTION: Performance Audit
      await rawFetch('transactions', {
        method: 'POST',
        body: {
          user_id: userId,
          amount_change: -amount,
          type: 'BET_PLACED',
          description: `Apuesta Pelea #${fightInfo.post_number} (Gallo ${betSide})`
        }
      });

      // 3. RECORD BET: Capture odds at the moment of betting
      await rawFetch('bets', {
        method: 'POST',
        body: {
          user_id: userId, 
          event_id: fightInfo.id, 
          selected_side: betSide, 
          amount: amount,
          odds_at_bet: betSide === 'A' ? fightInfo.gallo_a_odds : fightInfo.gallo_b_odds
        }
      });

      play('BET');
      setUserBalance(newBalance);
      setIsBetModalOpen(false);
      
      // 🐓 TRIGGER: THE GOLDEN ROOSTER STRIKE
      setShowRoosterStrike(true);
      setTimeout(() => setShowRoosterStrike(false), 2500);

      msg.success('¡JUGADA REGISTRADA CON ÉXITO!');
    } catch (e) {
      msg.error(e.message === 'MERCADO CERRADO' ? 'El combate ya ha comenzado' : 'Error en la jugada');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !userId) return;
    const text = chatInput.trim();
    const tempId = Date.now();
    
    // OPTIMISTIC UPDATE: Show message immediately for the sender
    const newMessage = {
        id: tempId,
        user_id: userId,
        user_email: userEmail.split('@')[0],
        text: text,
        type: 'USER',
        created_at: new Date().toISOString()
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    setChatInput('');

    try {
        await rawFetch('messages', {
            method: 'POST',
            body: { 
                user_id: userId, 
                user_email: userEmail.split('@')[0], 
                text: text,
                type: 'USER'
            }
        });
    } catch (e) {
        console.error('Chat Err:', e);
        // Remove optimistic message if failed
        setChatMessages(prev => prev.filter(m => m.id !== tempId));
        msg.error('Error al enviar mensaje');
    }
  };

  return (
    <div style={{ background: 'var(--obsidian)', minHeight: '100vh', padding: '16px', maxWidth: 1200, margin: '0 auto', paddingBottom: 100 }}>
      {/* PRIMARY BATTLE ZONE: Video & Chat Aligned */}
      <Row gutter={[16, 16]} align="stretch" style={{ minHeight: 400 }}>
        <Col xs={24} lg={16} className="player-container">
           <DacastPlayer status={fightInfo.status} />
        </Col>

        <Col xs={24} lg={8} style={{ display: 'flex' }}>
           <Card className="glass-panel chat-card" styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' } }} style={{ width: '100%', border: '1px solid rgba(16,185,129,0.2)', height: '400px' /* Forced Fixed Height match with video typical height */ }}>
                <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(16,185,129,0.05)' }}>
                   <Title level={5} style={{ color: '#fff', margin: 0, fontSize: 11, letterSpacing: '1px' }}>CHAT EN VIVO</Title>
                   <Badge status="processing" color="#10b981" text={<Text style={{ fontSize: 9, color: 'var(--text-muted)' }}>LIVE</Text>} />
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, height: '300px', maxHeight: '300px' }} className="chat-container" ref={chatContainerRef}>
                   {chatMessages.map((msg) => {
                      const isMe = msg.user_id === userId;
                      return (
                        <div key={msg.id} className="fade-message" style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                           <Text style={{ fontSize: 8, color: '#10b981', fontWeight: 800, marginLeft: 12 }}>{msg.user_email}</Text>
                           <div style={{ 
                               background: isMe ? '#10b981' : 'rgba(255,255,255,0.05)', 
                               padding: '8px 14px', borderRadius: 8, color: isMe ? '#fff' : '#fff', fontSize: 13, fontWeight: 500, marginTop: 4,
                               border: isMe ? 'none' : '1px solid rgba(255,255,255,0.05)'
                           }}>{msg.text}</div>
                        </div>
                      )
                   })}
                </div>

                <style>{`
                    .chat-container { scroll-behavior: smooth; }
                    .fade-message { animation: fadeIn 0.3s ease-out; }
                    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                `}</style>

                <div style={{ padding: 16, borderTop: '1px solid var(--glass-border)', background: 'rgba(5,5,5,0.3)' }}>
                   <div style={{ position: 'relative' }}>
                      <input 
                        value={chatInput} 
                        onChange={e => setChatInput(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Comenta la jugada..."
                        style={{ width: '100%', background: 'var(--obsidian)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: '12px 48px 12px 16px', color: '#fff', fontSize: 13 }}
                      />
                      <SendOutlined onClick={handleSendMessage} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#10b981', cursor: 'pointer' }} />
                   </div>
                </div>
           </Card>
        </Col>
      </Row>

      {/* SECONDARY ACTION ZONE: Betting & Info */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
           <div style={{ padding: 24, borderRadius: 12, background: 'var(--charcoal)', border: '1px solid var(--glass-border)' }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                 <Title level={4} style={{ margin: 0, color: '#fff', fontSize: 16, fontWeight: 700 }}>PELEA #{fightInfo.post_number}</Title>
              </div>

              <Row gutter={[16, 16]} align="middle">
                <Col span={10} style={{ textAlign: 'center' }}>
                    <Title level={4} style={{ margin: 0, color: '#fff', fontSize: 16, fontWeight: 700, textTransform: 'uppercase' }}>{fightInfo.gallo_a_name}</Title>
                    <Text style={{ color: '#10b981', fontSize: 10, fontWeight: 600 }}>{fightInfo.gallo_a_weight}</Text>
                </Col>
                <Col span={4} style={{ textAlign: 'center' }}>
                    <ThunderboltFilled style={{ color: '#10b981', fontSize: 20 }} />
                </Col>
                <Col span={10} style={{ textAlign: 'center' }}>
                    <Title level={4} style={{ margin: 0, color: '#fff', fontSize: 16, fontWeight: 700, textTransform: 'uppercase' }}>{fightInfo.gallo_b_name}</Title>
                    <Text style={{ color: '#10b981', fontSize: 10, fontWeight: 600 }}>{fightInfo.gallo_b_weight}</Text>
                </Col>
              </Row>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 24 }}>
                 <Button 
                    block 
                    disabled={fightInfo.status !== 'LIVE'} 
                    onClick={() => openBetModal('A')} 
                    style={{ 
                        height: 50, 
                        background: '#10b981', 
                        color: '#fff', 
                        border: 'none', 
                        fontWeight: 600, 
                        fontSize: 16, 
                        borderRadius: 8, 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'none'
                    }}
                 >
                    {fightInfo.gallo_a_odds}
                 </Button>
                 <Button 
                    block 
                    type="primary" 
                    ghost 
                    disabled={fightInfo.status !== 'LIVE'} 
                    onClick={() => openBetModal('B')} 
                    style={{ 
                        height: 50, 
                        fontWeight: 600, 
                        fontSize: 16, 
                        borderRadius: 8, 
                        border: '1px solid #10b981', 
                        color: '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'none'
                    }}
                 >
                    {fightInfo.gallo_b_odds}
                 </Button>
              </div>
           </div>
        </Col>

        <Col xs={24} lg={8}>
            <Card className="glass-panel" styles={{ body: { padding: 16 } }}>
                <Row gutter={[12, 12]}>
                   <Col span={12}>
                      <Text style={{ fontSize: 9, color: 'var(--text-muted)' }}>STREAM STATUS</Text>
                      <div style={{ color: '#fff', fontSize: 14, fontWeight: 800 }}>Dacast Relay</div>
                   </Col>
                   <Col span={12} style={{ textAlign: 'right' }}>
                      <Text style={{ fontSize: 9, color: 'var(--text-muted)' }}>LATENCIA</Text>
                      <div style={{ color: '#22c55e', fontSize: 14, fontWeight: 800 }}>MODO TÁCTICO</div>
                   </Col>
                </Row>
             </Card>
        </Col>
      </Row>

      <Modal open={isBetModalOpen} onCancel={() => !loading && setIsBetModalOpen(false)} footer={null} centered width={360} styles={{ body: { padding: 0 } }}>
        <div style={{ backgroundColor: 'var(--charcoal)', padding: '24px 20px', borderRadius: 12, border: '1px solid rgba(16,185,129,0.3)' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <Title level={4} style={{ color: '#10b981', margin: 0, fontWeight: 700, textTransform: 'uppercase' }}>{betSide === 'A' ? fightInfo.gallo_a_name : fightInfo.gallo_b_name}</Title>
            <Text style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: '1px' }}>CONFIRMAR JUGADA</Text>
          </div>
          <InputNumber 
            min={1} 
            max={userBalance} 
            value={betAmount} 
            onChange={setBetAmount} 
            controls={false}
            className="premium-bet-input"
            style={{ 
                width: '100%', 
                height: 56, 
                fontSize: 24, 
                fontWeight: 600, 
                background: '#050505', 
                border: '1px solid rgba(16,185,129,0.5)', 
                color: '#10b981',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Outfit',
                boxShadow: 'none'
            }} 
          />
          
          <style>{`
            .premium-bet-input .ant-input-number-input {
                text-align: center !important;
                height: 56px !important;
                color: #10b981 !important;
            }
            .premium-bet-input:focus, .premium-bet-input-focused {
                border-color: #10b981 !important;
                box-shadow: none !important;
            }
          `}</style>
          <Button type="primary" block loading={loading} onClick={handleBetConfirm} style={{ height: 48, marginTop: 24, fontWeight: 600, background: '#10b981', border: 'none', color: '#fff', borderRadius: 8, boxShadow: 'none' }}>ACCIONAR JUGADA</Button>
        </div>
      </Modal>

      {/* 🐓 DUAL ROOSTER CLASH CINEMATIC OVERLAY */}
      {showRoosterStrike && (
        <div style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100vw', 
            height: '100vh', 
            background: 'rgba(5, 5, 5, 0.98)', 
            zIndex: 9999, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            overflow: 'hidden',
            animation: 'screenShake 0.4s ease-in-out infinite'
        }}>
           {/* Gallo Izquierdo */}
           <div className="rooster-dash-left" style={{ position: 'absolute', left: '10%' }}>
              <img 
                src="/golden_rooster_transparent.png" 
                style={{ width: 220, height: 'auto', filter: 'drop-shadow(0 0 30px rgba(16,185,129,0.6))' }} 
                alt="Rooster Left"
              />
           </div>

           {/* Gallo Derecho (Mirrored) */}
           <div className="rooster-dash-right" style={{ position: 'absolute', right: '10%' }}>
              <img 
                src="/golden_rooster_transparent.png" 
                style={{ width: 220, height: 'auto', filter: 'drop-shadow(0 0 30px rgba(16,185,129,0.6))', transform: 'scaleX(-1)' }} 
                alt="Rooster Right"
              />
           </div>

           {/* Impact / Clash Light */}
           <div className="clash-burst" />
           
           <Title level={4} style={{ 
              color: '#10b981', 
              position: 'absolute',
              bottom: '15%',
              fontWeight: 900, 
              letterSpacing: '8px', 
              textTransform: 'uppercase', 
              animation: 'textReveal 2.5s ease-out forwards' 
           }}>¡JUGADA CONFIRMADA!</Title>
           
           <style>{`
                @keyframes dashLeft {
                    0% { left: -300px; transform: rotate(15deg); opacity: 0; }
                    80% { left: 45%; transform: rotate(-5deg); opacity: 1; }
                    100% { left: 42%; transform: rotate(0deg); }
                }
                @keyframes dashRight {
                    0% { right: -300px; transform: rotate(-15deg); opacity: 0; }
                    80% { right: 45%; transform: rotate(5deg); opacity: 1; }
                    100% { right: 42%; transform: rotate(0deg); }
                }
                @keyframes screenShake {
                    0%, 100% { transform: translate(0, 0); }
                    25% { transform: translate(-5px, 5px); }
                    75% { transform: translate(5px, -5px); }
                }
                @keyframes clashGlow {
                    0% { transform: scale(0.1); opacity: 0; }
                    90% { transform: scale(2); opacity: 1; filter: blur(20px); }
                    100% { transform: scale(5); opacity: 0; }
                }
                @keyframes textReveal {
                    0% { opacity: 0; letter-spacing: 20px; }
                    50% { opacity: 1; letter-spacing: 8px; }
                    100% { opacity: 1; }
                }
                .rooster-dash-left { animation: dashLeft 0.8s cubic-bezier(0.165, 0.84, 0.44, 1) forwards; }
                .rooster-dash-right { animation: dashRight 0.8s cubic-bezier(0.165, 0.84, 0.44, 1) forwards; }
                .clash-burst {
                    position: absolute;
                    width: 100px;
                    height: 100px;
                    background: radial-gradient(circle, #10b981 0%, transparent 70%);
                    animation: clashGlow 1s ease-out forwards;
                    animation-delay: 0.6s;
                    z-index: 10;
                    opacity: 0;
                }
           `}</style>
        </div>
      )}
    </div>
  );
};

export default UserLiveView;
