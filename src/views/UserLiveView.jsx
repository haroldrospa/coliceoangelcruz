import React, { useState, useEffect, useRef } from 'react';
import { Button, Space, Typography, Card, Modal, InputNumber, Row, Col, Divider, Badge, App as AntApp, Tag } from 'antd';
import { SendOutlined, MessageFilled, SignalFilled, ThunderboltFilled, PlayCircleFilled, EyeOutlined, TrophyOutlined, DownloadOutlined, WhatsAppOutlined, CopyOutlined, ShareAltOutlined } from '@ant-design/icons';
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
        videoElement.setAttribute('playsinline', 'true');
        videoElement.setAttribute('muted', 'true'); // Required for mobile autoplay
        containerRef.current.appendChild(videoElement);

        const player = playerRef.current = videojs(videoElement, {
            autoplay: true,
            muted: true,
            controls: true,
            playsinline: true,
            preload: 'auto',
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

        player.on('error', () => {
            const error = player.error();
            if (error && onError) {
                console.error('VideoJS Error:', error.message);
                onError();
            }
        });

        // Additional listener for early load failures
        player.on('stalled', () => {
             console.warn('Playback stalled, checking signal...');
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
                /* Hide the technical English error message from the player UI */
                .vjs-error-display { display: none !important; }
                .vjs-modal-dialog-content { display: none !important; }
            `}</style>
        </div>
    );
};

// Premium Dacast Iframe Player Wrapper & Standby Mode
const DacastPlayer = ({ status, stream_url, streamMode, viewerCount }) => {
    const [playerError, setPlayerError] = React.useState(false);
    const isHLS = stream_url?.toLowerCase().includes('.m3u8');
    const hasSignal = !!stream_url;

    // Reset error when URL changes
    React.useEffect(() => {
        setPlayerError(false);
    }, [stream_url]);

    if (streamMode === 'STANDBY' || playerError || (status !== 'LIVE' && !hasSignal)) {
        return (
          <div style={{ 
              position: 'relative', width: '100%', paddingBottom: '56.25%', 
              background: 'radial-gradient(circle at center, #0a110d 0%, #000 100%)',
              borderRadius: 12, border: '1px solid rgba(16,185,129,0.1)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
          }}>
             <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', width: '100%', zIndex: 11 }}>
                <Title level={1} style={{ 
                    color: '#fff', 
                    margin: 0, 
                    fontWeight: 900, 
                    letterSpacing: '8px', 
                    fontFamily: 'Outfit',
                    fontSize: 'clamp(20px, 4vw, 36px)',
                    textTransform: 'uppercase',
                    textShadow: '0 0 20px rgba(16,185,129,0.3)'
                }}>
                    COLISEO ANGEL CRUZ
                </Title>
                <div style={{ width: 60, height: 2, background: '#10b981', margin: '15px auto', borderRadius: 2, opacity: 0.6 }} />
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 800, letterSpacing: '4px', textTransform: 'uppercase' }}>
                    {playerError ? 'RECONECTANDO SEÑAL...' : status !== 'LIVE' && !hasSignal ? 'ESPERANDO SEÑAL...' : 'TRANSMISIÓN EN BREVE'}
                </Text>
             </div>
          </div>
        );
    }

    // The conditional for (status !== 'LIVE' && !hasSignal) is now handled by the standby screen above

    const isDirectVideo = stream_url?.match(/\.(mp4|webm|mov|ogg)$/i) || stream_url?.includes('/storage/v1/object/public/');

    if (isHLS) {
        return (
            <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
                <div style={{ position: 'absolute', top: 15, left: 15, zIndex: 10, display: 'flex', gap: 8 }}>
                    <div style={{ background: '#dc2626', color: '#fff', padding: '4px 10px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 6, animation: 'blink 1.5s infinite' }}>
                        <div style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%', animation: 'pulse-live 2s infinite' }} />
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: '0.5px' }}>EN VIVO</Text>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', color: '#fff', padding: '4px 10px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 6, border: '1px solid rgba(255,255,255,0.1)' }}>
                        <EyeOutlined style={{ color: '#10b981', fontSize: 12 }} />
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{viewerCount} <span style={{ opacity: 0.7, fontWeight: 400, marginLeft: 2, fontSize: 9 }}>VIENDO</span></Text>
                    </div>
                </div>
                <HLSVideoPlayer url={stream_url} onError={() => setPlayerError(true)} />
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#0a0a0a' }}>
            <div style={{ position: 'absolute', top: 15, left: 15, zIndex: 10, display: 'flex', gap: 8 }}>
                <div style={{ background: '#dc2626', color: '#fff', padding: '4px 10px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 6, animation: 'blink 1.5s infinite' }}>
                    <div style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%', animation: 'pulse-live 2s infinite' }} />
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: '0.5px' }}>EN VIVO</Text>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', color: '#fff', padding: '4px 10px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 6, border: '1px solid rgba(255,255,255,0.1)' }}>
                    <EyeOutlined style={{ color: '#10b981', fontSize: 12 }} />
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{viewerCount} <span style={{ opacity: 0.7, fontWeight: 400, marginLeft: 2, fontSize: 9 }}>VIENDO</span></Text>
                </div>
            </div>

            {isDirectVideo ? (
                <video 
                    src={stream_url} 
                    controls 
                    autoPlay 
                    muted 
                    playsInline
                    webkit-playsinline="true"
                    onError={() => setPlayerError(true)}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                />
            ) : (
                <iframe 
                    src={stream_url || "https://iframe.dacast.com/live/55197822-2232-7fde-fcf0-9369fe4022fb/013bad74-e5d5-4478-824f-893cedb06b66"} 
                    width="100%" height="100%" frameBorder="0" scrolling="no" allow="autoplay; encrypted-media" allowFullScreen 
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                />
            )}
            <style>{`
                @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
                @keyframes pulse-live {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(255, 255, 255, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
                }
            `}</style>
        </div>
    );
};

const UserLiveView = ({ userBalance, setUserBalance, currentUser, setCurrentView }) => {
  const { message: msg } = AntApp.useApp();
  const { play, preload } = useSound();
  
  // Interaction State
  const [isBetModalOpen, setIsBetModalOpen] = useState(false);
  const [betSide, setBetSide] = useState(null);
  const [betAmount, setBetAmount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [showRoosterStrike, setShowRoosterStrike] = useState(false);
  
  // Real-time Presence State
  const [viewerCount, setViewerCount] = useState(1);
  const sessionUuid = useRef(Math.random().toString(36).substring(2, 12)).current;
  
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
  const [isReplayModalOpen, setIsReplayModalOpen] = useState(false);
  const [selectedReplay, setSelectedReplay] = useState(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const chatEndRef = useRef(null);
  const channelRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Fight State
  const [fightInfo, setFightInfo] = useState({
    id: null,
    gallo_a_name: 'Gallo Azul',
    gallo_b_name: 'Gallo Blanco',
    gallo_a_weight: '3.2 lbs',
    gallo_b_weight: '3.1 lbs',
    post_number: '1',
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

  useEffect(() => {
    if (isReplayModalOpen && selectedReplay && !selectedReplay.stream_url) {
        setIsVideoLoading(false);
    }
  }, [isReplayModalOpen, selectedReplay]);
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

        // Fetch current active fight (LIVE or CLOSED). Ignore FINISHED for the main top display.
        const events = await rawFetch(`events?select=*&status=in.(LIVE,CLOSED)&order=updated_at.desc&limit=1`);
        if (events && events[0]) {
            setFightInfo(events[0]);
        } else {
            // Default empty fight if nothing is active
            setFightInfo(prev => ({ ...prev, id: null, status: 'PENDING' }));
        }

        const fetchProgram = async () => {
            try {
                // Fetch all fights from today (or last 12 hours) regardless of status
                const data = await rawFetch('events?select=*&order=post_number.asc&limit=30');
                if (data) setTodayProgram(data);
            } catch (e) { console.error('Program Err:', e); }
        };
        fetchProgram();

        const fiveMinsAgo = new Date(Date.now() - 300000).toISOString();
        const initialMsgs = await rawFetch(`messages?select=*&created_at=gt.${fiveMinsAgo}&order=created_at.asc&limit=100`);
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
            // Update main fight only if it's NOT finished
            if (payload.new.status !== 'FINISHED') {
                setFightInfo(payload.new);
            } else if (fightInfo.id === payload.new.id) {
                // If it was the active fight and just finished, clear it to return to global stream
                setFightInfo(prev => ({ ...prev, id: null, status: 'PENDING' }));
            }

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

    // 4. Presence Engine: track active connections
    const presenceChannel = supabase.channel('online_viewers', {
        config: {
            presence: {
                key: userId || 'anonymous',
            },
        },
    });

    presenceChannel
        .on('presence', { event: 'sync' }, () => {
            const state = presenceChannel.presenceState();
            const total = Object.values(state).reduce((acc, presences) => acc + presences.length, 0);
            setViewerCount(total > 0 ? total : 1);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await presenceChannel.track({
                    id: sessionUuid,
                    online_at: new Date().toISOString(),
                });
            }
        });

    return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(presenceChannel);
    };
  }, [userId]);

  const [lastMessageCount, setLastMessageCount] = useState(0);

  // 🕒 EPHEMERAL ENGINE: Strict 5-minute Autodestruct (Screen & DB Cleanup)
  useEffect(() => {
    const ticker = setInterval(async () => {
      const now = Date.now();
      const cutoff = now - 300000; // 5 Minutes
      const cutoffISO = new Date(cutoff).toISOString();
      
      // 1. UI Pruning: Remove from screen immediately
      setChatMessages(prev => prev.filter(msg => {
        return new Date(msg.created_at).getTime() > cutoff;
      }));

      // 2. DB Pruning: Keep the table clean in background
      try {
        await supabase.from('messages').delete().lt('created_at', cutoffISO);
      } catch (e) {
        console.error('Chat Auto-Prune Err:', e);
      }
    }, 120000); // Check every 2 minutes (Reduces Disk IO significantly)
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
    if (!currentUser) return setCurrentView('login');
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
          description: `Apuesta Pelea #${fightInfo.post_number} (Gallo ${betSide === 'A' ? 'AZUL' : 'BLANCO'})`
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
    if (!currentUser) return setCurrentView('login');
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

  const handleDownload = async (url, postNumber) => {
    const hide = msg.loading('Preparando descarga...', 0);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Pelea_${postNumber}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      msg.success('Descarga iniciada');
    } catch (err) {
      window.open(url, '_blank');
      msg.warning('Iniciando descarga en nueva pestaña');
    } finally {
      hide();
    }
  };

  const handleShare = async (event) => {
    if (!event) return;
    const nameA = (event.gallo_a_name || '').replace('[ARCHIVED] ', '');
    const nameB = (event.gallo_b_name || '');
    const winnerName = (event.winner_side === 'A' ? nameA : nameB).replace('[ARCHIVED] ', '');
    
    const shareData = {
      title: `Coliseo Ángel Cruz - Pelea #${event.post_number || ''}`,
      text: `¡Mira esta pelea! Pelea #${event.post_number || ''}: ${nameA} vs ${nameB}. Ganador: ${winnerName}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Share Error:', err);
      }
    } else {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(shareData.text + ' ' + shareData.url)}`;
      window.open(waUrl, '_blank');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    msg.success('Enlace copiado al portapapeles');
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
                viewerCount={viewerCount}
           />
        </Col>

        <Col xs={24} lg={8} style={{ display: 'flex' }}>
           <Card className="glass-panel chat-card" styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' } }} style={{ width: '100%', border: '1px solid rgba(255,255,255,0.05)', height: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
                <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                   <Title level={5} style={{ color: '#fff', margin: 0, fontSize: 11, letterSpacing: '2px', fontWeight: 900 }}>CHAT EN VIVO</Title>
                   <Badge status="processing" color="#10b981" text={<Text style={{ fontSize: 9, color: '#10b981', fontWeight: 800 }}>LIVE</Text>} />
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
                        placeholder={currentUser ? "Comenta la jugada..." : "Inicia sesión para chatear"}
                        disabled={!currentUser}
                        style={{ 
                           width: '100%', 
                           background: currentUser ? 'var(--obsidian)' : 'rgba(255,255,255,0.02)', 
                           border: '1px solid var(--glass-border)', 
                           borderRadius: 12, 
                           padding: '12px 48px 12px 16px', 
                           color: '#fff', 
                           fontSize: 13,
                           cursor: currentUser ? 'text' : 'pointer'
                        }}
                        onClick={() => !currentUser && setCurrentView('login')}
                      />
                      <SendOutlined onClick={handleSendMessage} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: currentUser ? '#10b981' : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
                   </div>
                </div>
           </Card>
        </Col>
      </Row>


      {/* ESPACIO ELIMINADO SEGÚN SOLICITUD DEL USUARIO */}


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
                            onClick={() => {
                                if (event.status === 'FINISHED') {
                                    setSelectedReplay(event);
                                    setIsVideoLoading(true);
                                    setIsReplayModalOpen(true);
                                } else {
                                    setFightInfo(event);
                                    const player = document.querySelector('.player-container');
                                    player?.scrollIntoView({ behavior: 'smooth' });
                                }
                            }}
                            className="list-item-hover"
                            style={{ 
                                background: event.id === fightInfo.id ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)', 
                                border: event.id === fightInfo.id ? '1px solid #d4af37' : '1px solid rgba(255,255,255,0.05)',
                                borderRadius: 16,
                                padding: '18px 24px',
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
                                gap: 20,
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
                              <Text style={{ color: event.id === fightInfo.id ? '#10b981' : 'var(--text-muted)', fontSize: 12, fontWeight: 900, display: 'block' }}>PELEA {event.post_number}</Text>
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

      {/* REPLAY MODAL FOR CARTELERA ITEMS */}
      <Modal
        open={isReplayModalOpen}
        destroyOnHidden={true}
        onCancel={() => {
            setIsReplayModalOpen(false);
            setIsVideoLoading(false);
        }}
        styles={{ 
            body: { padding: 0, overflow: 'hidden', background: '#0a0a0a', borderRadius: 12, minHeight: 200 },
            mask: { backdropFilter: 'blur(15px)', background: 'rgba(0,0,0,0.85)' }
        }}
      >
        {selectedReplay && (
           <div style={{ position: 'relative' }}>
              {/* Spinner Overlay */}
              {isVideoLoading && (
                  <div style={{ 
                      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
                      zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      background: '#0a0a0a', gap: 15
                  }}>
                      <div className="loader-ring" />
                      <Text style={{ color: 'var(--gold)', fontSize: 10, fontWeight: 900, letterSpacing: '4px', textTransform: 'uppercase' }}>Cargando Repetición...</Text>
                      <style>{`
                          .loader-ring {
                              width: 50px; height: 50px;
                              border: 3px solid rgba(212,175,55,0.1);
                              border-radius: 50%;
                              border-top-color: var(--gold);
                              animation: spin 1s ease-in-out infinite;
                          }
                          @keyframes spin { to { transform: rotate(360deg); } }
                      `}</style>
                  </div>
              )}

              <div style={{ width: '100%', background: '#000', minHeight: 300, display: 'flex', alignItems: 'center' }}>
               {(() => {
                  const url = selectedReplay.stream_url || '';
                  if (!url) {
                      return (
                         <div style={{ padding: '60px 20px', width: '100%', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                            <PlayCircleFilled style={{ fontSize: 40, marginBottom: 16, opacity: 0.2 }} />
                            <br />
                            ESTA PELEA NO TIENE REPETICIÓN DISPONIBLE AÚN
                         </div>
                      );
                  }

                  const isDirectVideo = url.match(/\.(mp4|webm|ogg|mov)$/i) || url.includes('/storage/v1/object/public/');
                  
                  let finalUrl = url;
                  if (url.includes('youtube.com/watch?v=')) finalUrl = url.replace('watch?v=', 'embed/');
                  else if (url.includes('youtu.be/')) finalUrl = `https://www.youtube.com/embed/${url.split('/').pop()}`;
                  
                  if (isDirectVideo) {
                    return (
                        <video 
                            src={url} 
                            controls 
                            autoPlay 
                            onLoadedData={() => setIsVideoLoading(false)}
                            style={{ width: '100%', display: 'block', opacity: isVideoLoading ? 0 : 1, transition: 'opacity 0.5s' }} 
                        />
                    );
                  }

                  return (
                    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, width: '100%', opacity: isVideoLoading ? 0 : 1, transition: 'opacity 0.5s' }}>
                        <iframe 
                            src={finalUrl} 
                            width="100%" height="100%" 
                            frameBorder="0" allow="autoplay; encrypted-media" allowFullScreen 
                            onLoad={() => setIsVideoLoading(false)}
                            style={{ position: 'absolute', top: 0, left: 0 }} 
                        />
                    </div>
                  );
               })()}
              </div>
              <div style={{ padding: '24px', background: 'var(--charcoal)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                 <Row justify="space-between" align="middle" gutter={[16, 16]}>
                    <Col xs={24} md={16}>
                       <Title level={4} style={{ color: '#fff', margin: 0, fontWeight: 900, fontFamily: 'Outfit' }}>
                          {selectedReplay.gallo_a_name.replace('[ARCHIVED] ', '')} VS {selectedReplay.gallo_b_name}
                       </Title>
                       <Text style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>
                          Pelea #{selectedReplay.post_number} • Ganador: {(selectedReplay.winner_side === 'A' ? selectedReplay.gallo_a_name : (selectedReplay.winner_side === 'B' ? selectedReplay.gallo_b_name : 'TABLAS')).replace('[ARCHIVED] ', '')}
                       </Text>
                    </Col>
                    
                    <Col xs={24} md={8}>
                       <Space size="small" wrap style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          {selectedReplay.stream_url?.match(/\.(mp4|webm|ogg|mov)$/i) || selectedReplay.stream_url?.includes('/storage/v1/object/public/') ? (
                             <Button 
                                type="primary" 
                                icon={<DownloadOutlined />} 
                                onClick={() => handleDownload(selectedReplay.stream_url, selectedReplay.post_number)}
                                style={{ background: '#d4af37', borderColor: '#d4af37', color: '#000', fontWeight: 900, fontSize: 10, height: 36 }}
                             >
                                DESCARGAR
                             </Button>
                          ) : null}
                          
                          <Button 
                             icon={<WhatsAppOutlined />} 
                             onClick={() => handleShare(selectedReplay)}
                             style={{ background: '#25D366', borderColor: '#25D366', color: '#fff', fontWeight: 900, fontSize: 10, height: 36 }}
                          >
                             COMPARTIR
                          </Button>

                          <Button 
                             icon={<CopyOutlined />} 
                             onClick={() => copyToClipboard(window.location.href)}
                             style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 900, fontSize: 10, height: 36 }}
                          />
                       </Space>
                    </Col>
                 </Row>
              </div>
           </div>
        )}
      </Modal>
    </div>
  );
};

export default UserLiveView;
