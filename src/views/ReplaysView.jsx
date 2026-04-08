import React, { useState, useEffect } from 'react';
import { Typography, Space, Card, Row, Col, Modal, Button, Skeleton, Badge, Input, DatePicker, message } from 'antd';
import { PlayCircleOutlined, HistoryOutlined, ThunderboltFilled, TrophyOutlined, VideoCameraOutlined, DownloadOutlined, ShareAltOutlined, WhatsAppOutlined, CopyOutlined } from '@ant-design/icons';
import { supabase, rawFetch } from '../lib/supabase';

const { Title, Text } = Typography;

const ReplaysView = () => {
  const [replays, setReplays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReplay, setSelectedReplay] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    const fetchReplays = async () => {
      try {
        // Fetch finished events
        const data = await rawFetch(`events?select=*&status=eq.FINISHED&order=created_at.desc&limit=30`);
        if (data) setReplays(data);
      } catch (err) {
        console.error('Replays Fetch Err:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReplays();
  }, []);

  const filteredReplays = replays.filter(event => {
    const matchesSearch = 
        event.gallo_a_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        event.gallo_b_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.post_number?.toString().includes(searchTerm);
    
    if (!selectedDate) return matchesSearch;

    const eventDate = new Date(event.created_at).setHours(0, 0, 0, 0);
    const filterDate = selectedDate.toDate().setHours(0, 0, 0, 0);
    return matchesSearch && eventDate === filterDate;
  });

  const openReplay = (event) => {
    setSelectedReplay(event);
  };

  const closeReplay = () => {
    setSelectedReplay(null);
  };

  const handleDownload = async (url, postNumber) => {
    const hide = message.loading('Preparando descarga...', 0);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Pelea_Poste_${postNumber}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      message.success('Descarga iniciada');
    } catch (err) {
      console.error('Download Error:', err);
      // Fallback: open in new tab if blob fetch fails
      window.open(url, '_blank');
      message.warning('Iniciando descarga en nueva pestaña');
    } finally {
      hide();
    }
  };

  const handleShare = async (event) => {
    const shareData = {
      title: `Coliseo Ángel Cruz - Poste #${event.post_number}`,
      text: `¡Mira esta pelea! Poste #${event.post_number}: ${event.gallo_a_name} vs ${event.gallo_b_name}. Ganador: ${event.winner_side === 'A' ? event.gallo_a_name : event.gallo_b_name}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Share Error:', err);
      }
    } else {
      // Fallback: Open WhatsApp
      const waUrl = `https://wa.me/?text=${encodeURIComponent(shareData.text + ' ' + shareData.url)}`;
      window.open(waUrl, '_blank');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    message.success('Enlace copiado al portapapeles');
  };

  return (
    <div style={{ padding: '30px 20px', maxWidth: 1000, margin: '0 auto', background: 'var(--obsidian)', minHeight: '100vh', paddingBottom: 100 }}>
      {/* Dynamic Header */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <Title level={4} style={{ color: '#fff', fontSize: 26, fontWeight: 900, margin: 0, fontFamily: 'Outfit' }}>CÁMARA DE REPETICIONES</Title>
        <Text style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '5px', fontWeight: 700 }}>Análisis de Combates Finalizados</Text>
      </div>

      {/* Filter Controls */}
      <Card 
        styles={{ body: { padding: '16px 24px' } }} 
        style={{ marginBottom: 40, background: 'rgba(212,175,55,0.03)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: 16 }}
      >
        <Row gutter={[16, 16]} align="middle">
            <Col xs={24} md={12}>
                <Input 
                    placeholder="Buscar por gallo o poste (#)..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ background: '#0a0a0a', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: 8, height: 45 }}
                    allowClear
                />
            </Col>
            <Col xs={24} md={12}>
                <DatePicker 
                    placeholder="Filtrar por fecha" 
                    style={{ width: '100%', background: '#0a0a0a', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: 8, height: 45 }}
                    onChange={date => setSelectedDate(date)}
                    format="DD/MM/YYYY"
                    allowClear
                />
            </Col>
        </Row>
      </Card>

      <Row gutter={[20, 20]}>
        {loading ? (
            Array(6).fill(0).map((_, idx) => (
                <Col xs={24} sm={12} md={8} key={idx}>
                    <Skeleton.Button active style={{ width: '100%', height: 200, borderRadius: 20 }} />
                </Col>
            ))
        ) : filteredReplays.length > 0 ? (
          filteredReplays.map((event) => (
            <Col xs={24} sm={12} md={8} key={event.id}>
                <Card 
                  className="glass-panel replay-card fade-up"
                  styles={{ body: { padding: 0 } }}
                  style={{ border: '1px solid rgba(212,175,55,0.1)', borderRadius: 20, overflow: 'hidden' }}
                >
                  <div style={{ position: 'relative', height: 160, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {/* Fake Thumbnail or Placeholder */}
                      <img 
                        src={`https://images.unsplash.com/photo-1549465220-1d8f9dcfc3c3?auto=format&fit=crop&q=80&w=400`} 
                        style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3, filter: 'blur(2px)' }} 
                        alt="Replay Thumbnail"
                      />
                      <div style={{ zIndex: 1, textAlign: 'center' }}>
                          <PlayCircleOutlined style={{ fontSize: 48, color: '#10b981', cursor: 'pointer', transition: 'transform 0.3s' }} className="play-icon" onClick={() => openReplay(event)} />
                          <div style={{ marginTop: 8 }}>
                             <Badge count={`POSTE ${event.post_number}`} style={{ backgroundColor: '#10b981', color: '#fff', fontWeight: 900, fontSize: 10, border: 'none' }} />
                          </div>
                      </div>
                      
                      {/* Winner Tag */}
                      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }}>
                         <div style={{ 
                            background: 'rgba(212,175,55,0.9)', 
                            color: '#000', 
                            padding: '4px 10px', 
                            borderRadius: 6, 
                            fontSize: 10, 
                            fontWeight: 900,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                         }}>
                            <TrophyOutlined /> {event.winner_side === 'A' ? event.gallo_a_name : event.gallo_b_name}
                         </div>
                      </div>
                  </div>

                  <div style={{ padding: '20px' }}>
                      <Title level={5} style={{ color: '#fff', margin: 0, fontSize: 16, fontWeight: 800, fontFamily: 'Outfit', textTransform: 'uppercase' }}>
                         {event.gallo_a_name} <span style={{ color: 'rgba(212,175,55,0.4)', fontSize: 12 }}>vs</span> {event.gallo_b_name}
                      </Title>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                         <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700 }}>
                            {new Date(event.created_at).toLocaleDateString()}
                         </Text>
                         <Button 
                            type="text" 
                            icon={<VideoCameraOutlined />} 
                            onClick={() => openReplay(event)}
                            style={{ color: '#10b981', fontSize: 12, fontWeight: 700, padding: 0 }}
                         >
                            VER REPETICIÓN
                         </Button>
                      </div>
                  </div>
                </Card>
            </Col>
          ))
        ) : (
          <Col span={24}>
              <div style={{ textAlign: 'center', padding: '120px 0', background: 'rgba(212,175,55,0.02)', borderRadius: 24, border: '1px dashed rgba(212,175,55,0.1)' }}>
                 <HistoryOutlined style={{ fontSize: 56, color: 'rgba(212,175,55,0.1)', marginBottom: 24 }} />
                 <br />
                 <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, letterSpacing: '2px', fontWeight: 700 }}>SIN REPETICIONES DISPONIBLES</Text>
              </div>
          </Col>
        )}
      </Row>

      <Modal
        open={!!selectedReplay}
        onCancel={closeReplay}
        footer={null}
        width={900}
        centered
        styles={{ 
            body: { padding: 0, overflow: 'hidden', background: '#000', borderRadius: 20 },
            mask: { backdropFilter: 'blur(10px)', background: 'rgba(0,0,0,0.8)' }
        }}
        closeIcon={<Title level={4} style={{ color: '#fff', margin: 0 }}>&times;</Title>}
      >
        {selectedReplay && (
          <div style={{ position: 'relative' }}>
             <div style={{ position: 'relative', width: '100%', background: '#000' }}>
               {selectedReplay.stream_url?.match(/\.(mp4|webm|ogg|mov)$/i) || selectedReplay.stream_url?.includes('/storage/v1/object/public/') ? (
                 <video 
                   src={selectedReplay.stream_url} 
                   controls 
                   autoPlay 
                   style={{ width: '100%', display: 'block' }} 
                 />
               ) : (
                 <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                    <iframe 
                        src={selectedReplay.stream_url} 
                        width="100%" 
                        height="100%" 
                        frameBorder="0" 
                        scrolling="no" 
                        allow="autoplay; encrypted-media" 
                        allowFullScreen 
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    />
                 </div>
               )}
             </div>
             <div style={{ padding: '24px', background: 'var(--charcoal)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <Row justify="space-between" align="middle">
                   <Col>
                      <Title level={4} style={{ color: '#fff', margin: 0, fontWeight: 900, fontFamily: 'Outfit' }}>
                        POSTE #{selectedReplay.post_number}: {selectedReplay.gallo_a_name} VS {selectedReplay.gallo_b_name}
                      </Title>
                      <Text style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        Finalizado el {new Date(selectedReplay.created_at).toLocaleString()}
                      </Text>
                   </Col>
                    <Col>
                      <div style={{ background: '#10b981', color: '#fff', padding: '6px 16px', borderRadius: 8, fontWeight: 900, fontSize: 12 }}>
                         GANADOR: {selectedReplay.winner_side === 'A' ? selectedReplay.gallo_a_name : selectedReplay.gallo_b_name}
                      </div>
                   </Col>
                </Row>

                <div style={{ marginTop: 24, padding: '16px', background: 'rgba(212,175,55,0.05)', borderRadius: 12, border: '1px solid rgba(212,175,55,0.1)' }}>
                   <Text style={{ color: 'rgba(212,175,55,0.7)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 12 }}>
                     Acciones y Compartir
                   </Text>
                   <Space size="middle" wrap>
                      {selectedReplay.stream_url?.match(/\.(mp4|webm|ogg|mov)$/i) || selectedReplay.stream_url?.includes('/storage/v1/object/public/') ? (
                         <Button 
                            type="primary" 
                            icon={<DownloadOutlined />} 
                            onClick={() => handleDownload(selectedReplay.stream_url, selectedReplay.post_number)}
                            style={{ background: 'var(--gold)', borderColor: 'var(--gold)', color: '#000', fontWeight: 700 }}
                         >
                            Descargar Video
                         </Button>
                      ) : null}
                      
                      <Button 
                         icon={<WhatsAppOutlined />} 
                         onClick={() => handleShare(selectedReplay)}
                         style={{ background: '#25D366', borderColor: '#25D366', color: '#fff', fontWeight: 700 }}
                      >
                         WhatsApp
                      </Button>

                      <Button 
                         icon={<CopyOutlined />} 
                         onClick={() => copyToClipboard(window.location.href)}
                         style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 700 }}
                      >
                         Copiar Enlace
                      </Button>

                      <Button 
                         icon={<ShareAltOutlined />} 
                         onClick={() => handleShare(selectedReplay)}
                         style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 700 }}
                      >
                         Más opciones
                      </Button>
                   </Space>
                </div>
             </div>
          </div>
        )}
      </Modal>

      <style>{`
        .glass-panel {
            background: linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.95) 100%) !important;
            backdrop-filter: blur(12px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .replay-card:hover {
            transform: translateY(-8px);
            border-color: rgba(212, 175, 55, 0.4) !important;
            box-shadow: 0 20px 40px rgba(212, 175, 55, 0.1);
        }
        .replay-card:hover .play-icon {
            transform: scale(1.2);
            color: #fff !important;
        }
        .fade-up { animation: fadeUp 0.6s ease-out forwards; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default ReplaysView;
