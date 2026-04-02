import React, { useState, useEffect, useRef } from 'react';
import { Button, Space, Typography, Card, Modal, InputNumber, Row, Col, Divider, Badge, App as AntApp, Tag } from 'antd';
import { SendOutlined, MessageFilled, SignalFilled, ThunderboltFilled, PlayCircleFilled, EyeOutlined, TrophyOutlined } from '@ant-design/icons';
import { supabase, rawFetch } from '../lib/supabase';
import { useSound } from '../hooks/useSound';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

const { Title, Text } = Typography;

// Specialized Video.js Player for HLS (.m3u8) streams
const HLSVideoPlayer = ({ url }) => {
    const videoRef = useRef(null);
    const playerRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Create a dedicated video element for Video.js to manage
        const videoElement = document.createElement("video-js");
        videoElement.classList.add('vjs-big-play-centered', 'vjs-theme-city');
        containerRef.current.appendChild(videoElement);

        const player = playerRef.current = videojs(videoElement, {
            autoplay: true,
            muted: true,
            controls: true,
            responsive: true,
            fluid: true,
            liveui: true,
            playbackRates: [1],
            sources: [{ src: url, type: 'application/x-mpegURL' }],
            controlBar: {
                children: ['playToggle', 'volumePanel', 'fullscreenToggle']
            }
        }, () => {
            // Player is ready
        });

        return () => {
            if (player) {
                player.dispose();
                playerRef.current = null;
            }
        };
    }, [url]);

    return (
        <div data-vjs-player style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
            <style>{`
                .vjs-theme-city .vjs-control-bar { background: rgba(10,10,10,0.8); backdrop-filter: blur(10px); }
                .vjs-theme-city .vjs-big-play-button { background: rgba(16,185,129,0.9); border: none; border-radius: 50%; width: 60px; height: 60px; line-height: 60px; margin-top: -30px; margin-left: -30px; }
                .vjs-theme-city .vjs-play-progress { background: #10b981; }
                .video-js { width: 100% !important; height: 100% !important; }
            `}</style>
        </div>
    );
};

// Premium Dacast Iframe Player Wrapper & Standby Mode
const DacastPlayer = ({ status, stream_url, streamMode }) => {
    const isHLS = stream_url?.toLowerCase().includes('.m3u8');
    const hasSignal = !!stream_url;

    if (streamMode === 'STANDBY') {
        return (
          <div style={{ 
              position: 'relative', width: '100%', paddingBottom: '56.25%', 
              background: '#000', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
          }}>
             <img 
                src="/logo_coliseo.png" 
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }} 
                alt="Standby"
             />
             <div style={{ position: 'absolute', bottom: 20, width: '100%', textAlign: 'center', zIndex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: '4px', textShadow: '0 2px 8px rgba(0,0,0,0.8)', opacity: 0.6 }}>TRANSMISIÓN EN BREVE</Text>
             </div>
          </div>
        );
    }

  if (status !== 'LIVE' && !hasSignal) {
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

      {isHLS ? (
        <HLSVideoPlayer url={stream_url} />
      ) : (
        <iframe 
            src={stream_url || "https://iframe.dacast.com/live/55197822-2232-7fde-fcf0-9369fe4022fb/013bad74-e5d5-4478-824f-893cedb06b66"} 
            width="100%" 
            height="100%" 
            frameBorder="0" 
            scrolling="no" 
            allow="autoplay; encrypted-media" 
            allowFullScreen 
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        />
      )}
      
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
  const [todayProgram, setTodayProgram] = useState([]);
  const [carteleraFilter, setCarteleraFilter] = useState('ALL'); // 'ALL', 'PENDING', 'FINISHED'
  const [chatInput, setChatInput] = useState('');
  const [globalStream, setGlobalStream] = useState('');
  const [showCartelera, setShowCartelera] = useState(true);
  const [streamMode, setStreamMode] = useState('LIVE');
  const chatEndRef = useRef(null);
  const channelRef = useRef(null);
  const chatContainerRef = useRef(null);

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

  // 1. Auth Sync
  useEffect(() => {
    window.sessionStartTime = Date.now();
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setUserEmail(user.email);
      }
    };
    checkAuth();
  }, []);

  // 2. Data & Real-time Sync
  useEffect(() => {
    const initData = async () => {
      try {

        const events = await rawFetch(`events?select=*&order=updated_at.desc&limit=1`);
        if (events && events[0]) setFightInfo(events[0]);

        const fetchProgram = async () => {
            try {
                // Fetch all fights from today (or last 12 hours) regardless of status
                const data = await rawFetch('events?select=*&order=post_number.asc&limit=30');
                if (data) setTodayProgram(data);
            } catch (e) { console.error('Program Err:', e); }
        };
        fetchProgram();

        const initialMsgs = await rawFetch(`messages?select=*&order=created_at.asc&limit=50`);
        if (initialMsgs) setChatMessages(initialMsgs);

        const settings = await rawFetch(`settings`);
        if (settings) {
            const stream = settings.find(s => s.id === 'live_stream_url');
            const cartelera = settings.find(s => s.id === 'show_cartelera');
            const mode = settings.find(s => s.id === 'stream_logic_mode');
            if (stream) setGlobalStream(stream.value);
            if (cartelera) setShowCartelera(cartelera.value === 'true');
            if (mode) setStreamMode(mode.value);
        }
      } catch (err) {
        console.error('Core Sync Err:', err);
      }
    };

    initData();
  }, []);

  // 3. Real-time Engine
  useEffect(() => {
    // Join Broadcast & Change Channel
    const channel = supabase.channel('chat_live', {
        config: {
            broadcast: { self: true },
        },
    });

    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
          setChatMessages(prev => {
              // Deduplicate by content and user in a short window
              const isDuplicate = prev.some(m => 
                  m.text === payload.text && 
                  m.user_id === payload.user_id && 
                  Math.abs(Date.now() - new Date(m.created_at).getTime()) < 2000
              );
              if (isDuplicate) return prev;
              
              if (payload.user_id !== userId) play('NOTIFY');
              return [...prev, payload];
          });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, payload => {
        if (payload.eventType === 'DELETE') {
            setTodayProgram(prev => prev.filter(e => e.id !== payload.old.id));
            // If the current active fight was deleted, we should probably clear it or wait for the next update
            if (fightInfo.id === payload.old.id) {
              setFightInfo(prev => ({ ...prev, status: 'FINISHED' })); 
            }
            return;
        }
        
        if (payload.new) {
            setFightInfo(payload.new);
            // Update program list in real-time
            setTodayProgram(prev => {
                const index = prev.findIndex(e => e.id === payload.new.id);
                if (payload.new.status === 'FINISHED') {
                    return prev.filter(e => e.id !== payload.new.id);
                }
                if (index > -1) {
                    const newProg = [...prev];
                    newProg[index] = payload.new;
                    return newProg;
                }
                return [...prev, payload.new].sort((a, b) => parseInt(a.post_number) - parseInt(b.post_number));
            });
            if (payload.new.status === 'LIVE' && payload.old?.status !== 'LIVE') play('STRIKE');
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        // Only load if not already in state from Broadcast
        setChatMessages(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            // If it's a message from someone else that we didn't get via broadcast
            if (prev.some(m => m.text === payload.new.text && m.user_id === payload.new.user_id)) return prev;
            return [...prev, payload.new];
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, payload => {
          if (payload.new) {
              if (payload.new.id === 'live_stream_url') setGlobalStream(payload.new.value);
              if (payload.new.id === 'show_cartelera') setShowCartelera(payload.new.value === 'true');
              if (payload.new.id === 'stream_logic_mode') setStreamMode(payload.new.value);
          }
      })
      .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
              console.log('🛡️ CANAL HÍBRIDO ASEGURADO: Realtime + Broadcast Activo');
          }
      });

    return () => {
        supabase.removeChannel(channel);
    };
  }, [userId]);

  const [lastMessageCount, setLastMessageCount] = useState(0);

  // 🕒 EPHEMERAL ENGINE: Auto-destruct LIVE messages after 5 minutes, but keep history
  useEffect(() => {
    const ticker = setInterval(() => {
      const now = Date.now();
      const sessionStart = window.sessionStartTime || now;
      
      setChatMessages(prev => prev.filter(msg => {
        const msgTime = new Date(msg.created_at).getTime();
        // If message is historical (before session), keep it
        if (msgTime < sessionStart - 5000) return true; 
        // If message is new (live), keep it for 5 minutes (300,000ms)
        return (now - msgTime) < 300000;
      }));
    }, 2000);
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
    setChatInput('');

    const messagePayload = {
        id: `br_${Date.now()}`, // Temporary broadcast ID
        user_id: userId,
        user_email: userEmail.split('@')[0],
        text,
        type: 'USER',
        created_at: new Date().toISOString()
    };

    // 1. BROADCAST: Send to everyone (including self) immediately
    if (channelRef.current) {
        channelRef.current.send({
            type: 'broadcast',
            event: 'chat_message',
            payload: messagePayload
        });
    }

    try {
        // 2. PERSIST: Save to DB in the background
        await supabase.from('messages').insert({
            user_id: userId,
            user_email: userEmail.split('@')[0],
            text,
            type: 'USER'
        });
    } catch (e) {
        console.error('Chat Persist Err:', e);
    }
  };

  return (
    <div style={{ background: 'var(--obsidian)', minHeight: '100vh', padding: '16px', maxWidth: 1200, margin: '0 auto', paddingBottom: 100 }}>
      {/* PRIMARY BATTLE ZONE: Video & Chat Aligned */}
      <Row gutter={[16, 16]} align="stretch" style={{ minHeight: 400 }}>
        <Col xs={24} lg={16} className="player-container">
           <DacastPlayer 
                status={fightInfo.status} 
                stream_url={fightInfo.stream_url || globalStream} 
                streamMode={streamMode}
           />
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
                   {/* QUICK EMOJI BAR */}
                   <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }} className="hide-scrollbar">
                      {['🐓', '🐔', '🥊', '🏆', '💰', '🔥', '⚡', '🔪', '🚩', '🤝'].map(emoji => (
                         <div 
                            key={emoji}
                            onClick={() => setChatInput(prev => prev + emoji)}
                            style={{ 
                               cursor: 'pointer', 
                               fontSize: 18, 
                               background: 'rgba(255,255,255,0.05)', 
                               borderRadius: 8, 
                               width: 32, 
                               height: 32, 
                               display: 'flex', 
                               alignItems: 'center', 
                               justifyContent: 'center',
                               transition: 'all 0.2s',
                               border: '1px solid rgba(255,255,255,0.05)'
                            }}
                            className="emoji-btn"
                         >
                            {emoji}
                         </div>
                      ))}
                   </div>

                   <style>{`
                      .hide-scrollbar::-webkit-scrollbar { display: none; }
                      .emoji-btn:hover { background: rgba(16,185,129,0.2) !important; transform: scale(1.1); border-color: #10b981 !important; }
                   `}</style>

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
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
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
            </Space>
         </Col>
      </Row>

      {/* NEW PROMINENT PROGRAM SECTION UNDERNEATH */}
      {showCartelera && (
          <div style={{ marginTop: 40, marginBottom: 20 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <ThunderboltFilled style={{ color: '#10b981', fontSize: 20 }} />
                    <Title level={4} style={{ color: '#fff', margin: 0, fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px' }}>CARTELERA DE HOY</Title>
                 </div>
                 
                 <div style={{ flex: 1, minWidth: 20, height: '1px', background: 'linear-gradient(90deg, rgba(16,185,129,0.3) 0%, transparent 100%)' }} />
                 
                 <Space>
                    {['ALL', 'PENDING', 'FINISHED'].map(f => (
                        <Button 
                            key={f}
                            size="small"
                            onClick={() => setCarteleraFilter(f)}
                            style={{ 
                                background: carteleraFilter === f ? 'rgba(16,185,129,0.2)' : 'transparent',
                                color: carteleraFilter === f ? '#10b981' : 'var(--text-muted)',
                                border: carteleraFilter === f ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.05)',
                                fontSize: 10,
                                fontWeight: 800,
                                borderRadius: 6
                            }}
                        >
                            {f === 'ALL' ? 'TODAS' : f === 'PENDING' ? 'PENDIENTES' : 'CERRADAS'}
                        </Button>
                    ))}
                 </Space>
              </div>
    
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(() => {
                    const filtered = todayProgram.filter(e => {
                        if (carteleraFilter === 'PENDING') return e.status !== 'FINISHED';
                        if (carteleraFilter === 'FINISHED') return e.status === 'FINISHED';
                        return true;
                    });
                    
                    filtered.sort((a, b) => {
                        const statusVal = { 'LIVE': 1, 'CLOSED': 2, 'FINISHED': 3 };
                        const diff = (statusVal[a.status] || 99) - (statusVal[b.status] || 99);
                        if (diff !== 0) return diff;
                        
                        const numA = parseInt((a.post_number || '0').replace(/\D/g, '')) || 0;
                        const numB = parseInt((b.post_number || '0').replace(/\D/g, '')) || 0;
                        return numA - numB;
                    });
    
                    
                    if (filtered.length === 0) return (
                        <div style={{ padding: '40px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.05)' }}>
                            <Text style={{ color: 'var(--text-muted)' }}>No hay combates en esta categoría de momento.</Text>
                        </div>
                    );
    
                    return filtered.map((event, index) => {
                        let aData = { weight: event.gallo_a_weight || '0-0.0' };
                        let bData = { weight: event.gallo_b_weight || '0-0.0' };
                        try { 
                           const pA = JSON.parse(event.gallo_a_weight); 
                           if (pA && typeof pA === 'object') aData = pA;
                        } catch(e){}
                        try { 
                           const pB = JSON.parse(event.gallo_b_weight); 
                           if (pB && typeof pB === 'object') bData = pB;
                        } catch(e){}
    
                        return (
                        <div 
                            key={event.id}
                            onClick={() => setFightInfo(event)}
                            className="list-item-hover"
                            style={{ 
                                background: event.id === fightInfo.id ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)', 
                                border: event.id === fightInfo.id ? '1px solid #10b981' : '1px solid var(--glass-border)',
                                borderRadius: 12,
                                padding: '16px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                gap: 16,
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                           <style>{`
                              .list-item-hover:hover { background: rgba(255,255,255,0.05) !important; transform: translateX(5px); }
                           `}</style>
    
                           {/* Status Indicator Bar */}
                           <div style={{ width: 4, height: 40, background: event.status === 'LIVE' ? '#10b981' : (event.status === 'FINISHED' ? '#d4af37' : 'rgba(255,255,255,0.1)'), borderRadius: 2 }} />
    
                           <div style={{ width: 80 }}>
                              <Text style={{ color: event.id === fightInfo.id ? '#10b981' : 'var(--text-muted)', fontSize: 10, fontWeight: 900, display: 'block' }}>PELEA #{index + 1}</Text>
                              <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 8, fontWeight: 800 }}>POSTE {event.post_number}</Text>
                           </div>
    
                           <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 24, paddingLeft: 20 }}>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    {aData.clase === 'P' && <Tag color="gold" style={{ margin: 0, padding: '0 4px', fontSize: 10, borderRadius: 4, fontWeight: 800 }}>P</Tag>}
                                    <Text style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{event.gallo_a_name}</Text>
                                    <Tag style={{ background: 'rgba(16,185,129,0.1)', border: 'none', color: '#10b981', fontSize: 11, fontWeight: 800 }}>{event.gallo_a_odds}</Tag>
                                 </div>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                                    {aData.turno && <span>T: {aData.turno}</span>}
                                    {aData.marca && <span>M: {aData.marca}</span>}
                                    {aData.color && <span>{aData.color}</span>}
                                    <span style={{ color: '#10b981', fontWeight: 800, background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: 4 }}>{aData.weight}</span>
                                 </div>
                              </div>
    
                              <div style={{ color: 'rgba(255,255,255,0.1)', fontSize: 10, fontWeight: 900 }}>VS</div>
    
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <Tag style={{ background: 'rgba(16,185,129,0.1)', border: 'none', color: '#10b981', fontSize: 11, fontWeight: 800 }}>{event.gallo_b_odds}</Tag>
                                    <Text style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{event.gallo_b_name}</Text>
                                    {bData.clase === 'P' && <Tag color="gold" style={{ margin: 0, padding: '0 4px', fontSize: 10, borderRadius: 4, fontWeight: 800 }}>P</Tag>}
                                 </div>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                                    <span style={{ color: '#10b981', fontWeight: 800, background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: 4 }}>{bData.weight}</span>
                                    {bData.color && <span>{bData.color}</span>}
                                    {bData.marca && <span>M: {bData.marca}</span>}
                                    {bData.turno && <span>T: {bData.turno}</span>}
                                 </div>
                              </div>
                           </div>
    
    
                           <div style={{ width: 150, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                              <Tag color={event.status === 'LIVE' ? 'green' : (event.status === 'FINISHED' ? 'gold' : 'default')} style={{ fontSize: 8, borderRadius: 4, margin: 0, padding: '2px 6px' }}>
                                  {event.status === 'LIVE' ? 'PRÓXIMAMENTE' : (event.status === 'FINISHED' ? 'FINALIZADA' : 'PROGRAMADA')}
                              </Tag>
                              
                              {event.status === 'FINISHED' ? (
                                 <div style={{ color: '#d4af37', fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <TrophyOutlined />
                                    <span style={{ fontSize: 9 }}>{event.winner_side === 'DRAW' ? 'TABLAS' : (event.winner_side === 'A' ? event.gallo_a_name : event.gallo_b_name)}</span>
                                 </div>
                              ) : (
                                 event.status === 'LIVE' ? (
                                    <Text style={{ color: '#10b981', fontSize: 8, fontWeight: 800 }}>VER AHORA</Text>
                                 ) : (
                                    <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 8 }}>ESPERANDO</Text>
                                 )
                              )}
                           </div>
                        </div>
                    );
                    });
                })()}
              </div>
          </div>
      )}

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
