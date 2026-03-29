import React, { useState, useEffect, useRef } from 'react';
import { Button, Space, Typography, Card, Modal, InputNumber, Row, Col, Progress, Alert, Divider, Badge, App as AntApp } from 'antd';
import { PlayCircleFilled, SendOutlined, WalletFilled, MessageFilled, TrophyOutlined, FireOutlined, ClockCircleOutlined, ThunderboltFilled, CheckCircleFilled, SignalFilled, FullscreenOutlined, SettingOutlined } from '@ant-design/icons';
import { supabase, rawFetch, ensureUserProfile } from '../lib/supabase';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

const { Title, Text } = Typography;
const logo = "/logo.png";

// High-Fidelity Video.js Component with Auto-MIME Detection
const VideoPlayer = ({ src, poster }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Determine MIME type dynamically
    const type = src.toLowerCase().endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/mp4';
    
    // Initializing Video.js Player with DOM Safety Check
    if (!playerRef.current) {
        const videoElement = videoRef.current;
        if (!videoElement || !document.body.contains(videoElement)) return;

        const player = playerRef.current = videojs(videoElement, {
            autoplay: true,
            muted: true, // Needed for many mobile browsers to autoplay
            controls: true,
            responsive: true,
            fluid: true,
            userActions: { hotkeys: true },
            sources: [{ src, type }],
            html5: {
                vhs: {
                    useDevicePixelRatio: true,
                    fastQualityChange: true,
                    targetLiveBufferLength: 1, 
                    liveSyncDuration: 3,
                    enableLowLatency: true
                }
            }
        });

        player.on('error', () => {
            console.error('TrabaLive Video Link Error: Connection Failed');
            setError(true);
        });

        player.on('loadedmetadata', () => setError(false));
    } else {
        const player = playerRef.current;
        player.src({ src, type });
        setError(false);
    }
  }, [src]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <div data-vjs-player style={{ position: 'relative' }}>
      {error && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 5, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
           <SignalFilled style={{ fontSize: 40, color: '#ef4444' }} />
           <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: 900 }}>INTERRUPCIÓN DE SEÑAL DIGITAL</Text>
           <Text style={{ color: 'var(--text-muted)', fontSize: 9 }}>Verifique el enlace en el panel administrativo</Text>
        </div>
      )}
      <video ref={videoRef} className="video-js vjs-big-play-centered vjs-theme-trabalive" playsInline />
      <style>{`
        .vjs-theme-trabalive .vjs-control-bar { background: rgba(5,5,5,0.8); backdrop-filter: blur(10px); }
        .vjs-theme-trabalive .vjs-play-progress { background: var(--gold-gradient); }
        .vjs-theme-trabalive .vjs-big-play-button { 
            background: var(--gold-gradient); border: none; color: #000; width: 80px; height: 80px; 
            line-height: 80px; border-radius: 50%; box-shadow: 0 0 30px var(--champagne-glow); 
        }
      `}</style>
    </div>
  );
};

const UserLiveView = ({ userBalance, setUserBalance }) => {
  const { message, modal } = AntApp.useApp();
  const [isBetModalOpen, setIsBetModalOpen] = useState(false);
  const [betSide, setBetSide] = useState(null);
  const [betAmount, setBetAmount] = useState(10);
  const [loading, setLoading] = useState(false);
  
  const [userId, setUserId] = useState(null);

  const [fightInfo, setFightInfo] = useState({
    id: null,
    gallo_a_name: 'CARGANDO...',
    gallo_b_name: 'CARGANDO...',
    gallo_a_weight: '-',
    gallo_b_weight: '-',
    post_number: '-',
    gallo_a_odds: 1.0,
    gallo_b_odds: 1.0,
    stream_url: '' // Will store the HLS .m3u8 URL
  });

  useEffect(() => {
    const initData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
        }

        const events = await rawFetch(`events?select=id,post_number,gallo_a_name,gallo_b_name,gallo_a_weight,gallo_b_weight,gallo_a_odds,gallo_b_odds,status,stream_url,updated_at&order=updated_at.desc&limit=1`);
        if (events && events[0]) setFightInfo(events[0]);
      } catch (err) {
        console.error('Live Bypass Fetch Err:', err);
      }
    };

    initData();

    const eventChannel = supabase
      .channel('live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, payload => {
        if (payload.new) setFightInfo(payload.new);
      })
      .subscribe();

    return () => supabase.removeChannel(eventChannel);
  }, [userId]);

  const openBetModal = (side) => {
    if (fightInfo.status !== 'LIVE') return message.warning('Apuestas cerradas');
    setBetSide(side);
    setIsBetModalOpen(true);
  };

  const handleBetConfirm = async () => {
    if (!userId || !fightInfo.id) return;
    if (betAmount > userBalance) return message.error('Saldo insuficiente');
    setLoading(true);
    try {
      // 1. Double check fight status via bypass
      const freshFights = await rawFetch(`events?select=status&id=eq.${fightInfo.id}`);
      if (!freshFights[0] || freshFights[0].status !== 'LIVE') throw new Error('Las apuestas ya se cerraron para esta pelea.');

      // 2. Process Bet & Balance via TACTICAL BYPASS (PATCH/POST)
      const newBalance = (parseFloat(userBalance) - parseFloat(betAmount)).toFixed(2);
      
      await rawFetch(`users?id=eq.${userId}`, {
        method: 'PATCH',
        body: { balance: newBalance }
      });

      await rawFetch('bets', {
        method: 'POST',
        body: {
          user_id: userId, 
          event_id: fightInfo.id, 
          selected_side: betSide, 
          amount: betAmount,
          odds_at_bet: betSide === 'A' ? fightInfo.gallo_a_odds : fightInfo.gallo_b_odds
        }
      });

      await rawFetch('transactions', {
        method: 'POST',
        body: {
            user_id: userId,
            amount_change: -betAmount,
            type: 'BET_PLACED',
            description: `Apuesta al Gallo ${betSide} - Pelea ${fightInfo.post_number}`
        }
      });

      setUserBalance(newBalance);
      setIsBetModalOpen(false);
      modal.success({ title: 'JUGADA PROCESADA', content: `Éxito al Gallo ${betSide}. ¡Buena suerte!`, centered: true });
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'var(--obsidian)', minHeight: '100vh', padding: '16px', maxWidth: 1200, margin: '0 auto', paddingBottom: 100 }}>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          {/* PRO RTMP-HLS VIDEO PLAYER */}
          <div className="player-container gold-glow" style={{ position: 'relative' }}>
             {/* Metadata Overlay */}
             <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <div style={{ background: '#ff0000', color: '#fff', fontSize: 10, fontWeight: 900, padding: '4px 10px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                   <div style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} /> EN VIVO
                </div>
                <div style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', padding: '4px 10px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                   <SignalFilled style={{ color: '#22c55e', fontSize: 10 }} />
                   <Text style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>ULTRA LOW LATENCY</Text>
                </div>
             </div>
             
             {/* Tactical Navigation Watermark */}
             <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 10, opacity: 0.4 }}>
                <Text style={{ color: 'var(--champagne)', fontSize: 11, fontWeight: 900, letterSpacing: '4px' }}>TRABALIVE</Text>
             </div>

             {fightInfo.stream_url ? (
                <VideoPlayer src={fightInfo.stream_url} />
             ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
                   <PlayCircleFilled style={{ fontSize: 64, color: 'var(--champagne', opacity: 0.2 }} />
                   <Text style={{ color: 'var(--text-muted', fontSize: 11 }}>SIN SEÑAL RTMP ACTIVA</Text>
                </div>
             )}
          </div>

          {/* Fight Metadata Dashboard */}
          <div style={{ marginTop: 16, padding: 'clamp(16px, 4vw, 24px)', borderRadius: 'var(--radius-lg)', background: 'var(--charcoal)', border: '1px solid var(--glass-border)' }}>
             <Row gutter={[8, 16]} align="middle" justify="center">
                <Col xs={24} md={10} style={{ textAlign: 'center' }}>
                   <Title level={4} style={{ margin: 0, color: '#fff', fontSize: 'clamp(18px, 5vw, 24px)', fontWeight: 900, lineHeight: 1.1 }}>{fightInfo.gallo_a_name}</Title>
                   <Text style={{ color: 'var(--champagne', fontWeight: 700, fontSize: 'clamp(9px, 3vw, 11px)' }}>{fightInfo.gallo_a_weight}</Text>
                </Col>
                
                <Col xs={24} md={4} style={{ textAlign: 'center' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Text style={{ color: 'var(--text-muted)', fontSize: 8, fontWeight: 800 }}>PELEA {fightInfo.post_number}</Text>
                      <Divider className="desktop-only" type="vertical" style={{ height: 30, borderColor: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />
                      <Text className="mobile-only" style={{ color: 'var(--champagne)', fontWeight: 900, fontSize: 10, margin: '4px 0' }}>VS</Text>
                   </div>
                </Col>
                
                <Col xs={24} md={10} style={{ textAlign: 'center' }}>
                   <Title level={4} style={{ margin: 0, color: '#fff', fontSize: 'clamp(18px, 5vw, 24px)', fontWeight: 900, lineHeight: 1.1 }}>{fightInfo.gallo_b_name}</Title>
                   <Text style={{ color: 'var(--champagne', fontWeight: 700, fontSize: 'clamp(9px, 3vw, 11px)' }}>{fightInfo.gallo_b_weight}</Text>
                </Col>
             </Row>

             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 24 }}>
                <Button block disabled={fightInfo.status !== 'LIVE'} onClick={() => openBetModal('A')} style={{ height: 80, display: 'flex', flexDirection: 'column', background: 'var(--gold-gradient)', color: '#000', border: 'none' }}>
                   <span style={{ fontSize: 9, fontWeight: 800 }}>APOSTAR A</span>
                   <span style={{ fontSize: 24, fontWeight: 900 }}>{fightInfo.gallo_a_odds}</span>
                </Button>
                <Button className="btn-ghost-gold" block disabled={fightInfo.status !== 'LIVE'} onClick={() => openBetModal('B')} style={{ height: 80, display: 'flex', flexDirection: 'column' }}>
                   <span style={{ fontSize: 9, fontWeight: 800 }}>APOSTAR B</span>
                   <span style={{ fontSize: 24, fontWeight: 900 }}>{fightInfo.gallo_b_odds}</span>
                </Button>
             </div>
          </div>
        </Col>

        <Col xs={24} lg={8}>
          <Space direction="vertical" size={16} style={{ width: '100%', position: 'sticky', top: 100 }}>
             <Card className="glass-panel" title={<Text style={{ color: '#fff', fontWeight: 800, fontSize: 10 }}>MÉTRICAS DE EVENTO</Text>}>
                <Row gutter={[12, 12]}>
                   <Col span={12}>
                      <Text style={{ fontSize: 9, color: 'var(--text-muted)' }}>ESTADO</Text>
                      <div style={{ color: '#fff', fontSize: 14, fontWeight: 800 }}>{fightInfo.status}</div>
                   </Col>
                   <Col span={12} style={{ textAlign: 'right' }}>
                      <Text style={{ fontSize: 9, color: 'var(--text-muted)' }}>STREAM HEALTH</Text>
                      <div style={{ color: '#22c55e', fontSize: 14, fontWeight: 800 }}>OPTIMAL</div>
                   </Col>
                </Row>
             </Card>

             <Card className="glass-panel" styles={{ body: { padding: 0 } }}>
                <div style={{ padding: 16, borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between' }}>
                   <Text style={{ color: '#fff', fontWeight: 800, fontSize: 11 }}>LIVE CHAT</Text>
                   <Badge status="processing" color="var(--champagne)" text={<Text style={{ fontSize: 10, color: 'var(--text-muted)' }}>VIP</Text>} />
                </div>
                <div style={{ height: 300, padding: 16, textAlign: 'center', opacity: 0.2 }}>
                   <MessageFilled style={{ fontSize: 40, marginBottom: 12 }} />
                   <br /><Text style={{ fontSize: 10 }}>CHAT ENCRIPTADO</Text>
                </div>
             </Card>
          </Space>
        </Col>
      </Row>

      {/* Bet Modal */}
      <Modal title={null} open={isBetModalOpen} onCancel={() => !loading && setIsBetModalOpen(false)} footer={null} centered width={360} styles={{ body: { padding: 0 } }}>
        <div style={{ backgroundColor: 'var(--charcoal)', padding: '24px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Title level={3} style={{ color: 'var(--champagne)', margin: 0, fontWeight: 900 }}>GALLO {betSide}</Title>
            <Text style={{ color: 'var(--text-muted)', fontSize: 10 }}>CONFIRMAR JUGADA TÁCTICA</Text>
          </div>
          <InputNumber min={1} max={userBalance} value={betAmount} onChange={setBetAmount} style={{ width: '100%', height: 60, fontSize: 24, fontWeight: 900, background: 'var(--obsidian)', border: '1px solid var(--glass-border)', color: 'var(--champagne)' }} />
          <Button type="primary" block loading={loading} onClick={handleBetConfirm} style={{ height: 60, marginTop: 24, fontWeight: 900 }}>ACCIONAR JUGADA</Button>
        </div>
      </Modal>
    </div>
  );
};

export default UserLiveView;
