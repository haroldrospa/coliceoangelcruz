import React, { useState, useEffect } from 'react';
import { Typography, Space, Card, Row, Col, Modal, Button, Skeleton, Badge, Input, DatePicker, message, Popconfirm, Form, Upload, Progress } from 'antd';
import { PlayCircleOutlined, HistoryOutlined, ThunderboltFilled, TrophyOutlined, VideoCameraOutlined, DownloadOutlined, ShareAltOutlined, WhatsAppOutlined, CopyOutlined, DeleteOutlined, EditOutlined, InboxOutlined } from '@ant-design/icons';
import { supabase, rawFetch, supabaseAnonKey, supabaseUrl } from '../lib/supabase';

const { Title, Text } = Typography;

const ReplaysView = ({ currentUser }) => {
  const [replays, setReplays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReplay, setSelectedReplay] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [editingReplay, setEditingReplay] = useState(null);
  const [form] = Form.useForm();
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileList, setFileList] = useState([]);

  const fetchReplays = async () => {
    try {
      // Fetch finished events 
      const data = await rawFetch(`events?select=*&status=eq.FINISHED&order=created_at.desc&limit=50`);
      if (data) setReplays(data);
    } catch (err) {
      console.error('Replays Fetch Err:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReplays();
    return () => setSelectedReplay(null);
  }, []);

  const handleDeleteReplay = async (id) => {
     try {
        setIsDeleting(true);
        // First delete bets associated with this event to avoid FK issues
        await rawFetch(`bets?event_id=eq.${id}`, { method: 'DELETE' });
        await rawFetch(`events?id=eq.${id}`, { method: 'DELETE' });
        message.success('PELEA ELIMINADA DEFINTIVAMENTE');
        fetchReplays();
     } catch (err) {
        message.error('Error al eliminar: ' + err.message);
     } finally {
        setIsDeleting(false);
     }
  };

  const openEditor = (event) => {
      setEditingReplay(event);
      setIsAdminOpen(true);
      form.setFieldsValue({
          stream_url: event.stream_url
      });
  };

  const handleUpdateReplay = async (values) => {
    setLoading(true);
    setUploadProgress(0);
    try {
      let videoUrl = values.stream_url;
      
      if (fileList.length > 0) {
        const file = fileList[0].originFileObj;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;
        
        const uploadPromise = new Promise(async (resolve, reject) => {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token || supabaseAnonKey;

            const xhr = new XMLHttpRequest();
            const storageUrl = `${supabaseUrl}/storage/v1/object/media/${filePath}`;
            xhr.open('PUT', storageUrl);
            xhr.setRequestHeader('apikey', supabaseAnonKey);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
            xhr.setRequestHeader('x-upsert', 'true');

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    setUploadProgress(percent);
                }
            };
            xhr.onload = () => {
                if (xhr.status === 200 || xhr.status === 201) resolve(xhr.response);
                else {
                    const errorMsg = xhr.status === 413 
                        ? 'VIDEO MUY GRANDE (+50MB). Aumenta el límite en los ajustes de Supabase Storage.'
                        : `Upload failed ${xhr.status}`;
                    reject(new Error(errorMsg));
                }
            };
            xhr.onerror = () => reject(new Error('Network Error'));
            xhr.send(file);
        });

        await uploadPromise;
        const { data } = supabase.storage.from('media').getPublicUrl(filePath);
        videoUrl = data.publicUrl;
      }

      await rawFetch(`events?id=eq.${editingReplay.id}`, { 
        method: 'PATCH', 
        body: { stream_url: videoUrl } 
      });
      
      message.success('REPETICIÓN ACTUALIZADA');
      setIsAdminOpen(false);
      setEditingReplay(null);
      setFileList([]);
      form.resetFields();
      fetchReplays();
    } catch (e) {
      message.error('Error al actualizar: ' + e.message);
    } finally {
      setLoading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

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
    const winnerName = (event.winner_side === 'A' ? event.gallo_a_name : event.gallo_b_name).replace('[ARCHIVED] ', '');
    const shareData = {
      title: `Coliseo Ángel Cruz - Poste #${event.post_number}`,
      text: `¡Mira esta pelea! Poste #${event.post_number}: ${event.gallo_a_name.replace('[ARCHIVED] ', '')} vs ${event.gallo_b_name}. Ganador: ${winnerName}`,
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
        styles={{ body: { padding: '20px 24px' } }} 
        style={{ marginBottom: 44, background: 'rgba(212,175,55,0.02)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
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
                  <div style={{ position: 'relative', height: 180, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {/* Premium Thumbnail with Gradient Overlay */}
                      <img 
                        src="/cockfight_thumbnail_placeholder_1776285954679.png" 
                        style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} 
                        alt=""
                        onError={(e) => e.target.style.display = 'none'}
                      />
                      <div style={{ 
                         position: 'absolute', 
                         top: 0, left: 0, width: '100%', height: '100%', 
                         background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%)',
                         zIndex: 1 
                      }} />

                      <div style={{ zIndex: 2, textAlign: 'center' }}>
                          <div className="play-container" onClick={() => openReplay(event)}>
                             <PlayCircleOutlined style={{ fontSize: 64, color: '#10b981' }} className="play-icon-glow" />
                          </div>
                          <div style={{ marginTop: 12 }}>
                             <Badge 
                                count={`POSTE ${event.post_number}`} 
                                style={{ 
                                   backgroundColor: 'rgba(16,185,129,0.15)', 
                                   color: '#10b981', 
                                   fontWeight: 900, 
                                   fontSize: 10, 
                                   border: '1px solid rgba(16,185,129,0.3)',
                                   borderRadius: 4,
                                   padding: '0 8px'
                                }} 
                             />
                          </div>
                      </div>
                      
                      {/* Winner Floating Pill */}
                      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 3 }}>
                         <div style={{ 
                            background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)', 
                            color: '#000', 
                            padding: '6px 14px', 
                            borderRadius: '50px', 
                            fontSize: 10, 
                            fontWeight: 900,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: '0 8px 20px rgba(212,175,55,0.3)',
                            textTransform: 'uppercase',
                            letterSpacing: '1px'
                         }}>
                            <TrophyOutlined /> {(event.winner_side === 'A' ? event.gallo_a_name : event.gallo_b_name).replace('[ARCHIVED] ', '')}
                         </div>
                      </div>

                      {/* Admin Actions Overlay */}
                      {currentUser?.role === 'admin' && (
                         <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 3, display: 'flex', gap: 8 }}>
                            <Button 
                               size="small" 
                               icon={<EditOutlined />} 
                               onClick={(e) => { e.stopPropagation(); openEditor(event); }}
                               style={{ background: 'rgba(212,175,55,0.85)', borderColor: 'var(--gold)', color: '#000', borderRadius: 8, height: 32, width: 32, backdropFilter: 'blur(4px)' }}
                            />
                            <Popconfirm
                               title="¿ELIMINAR REPETICIÓN?"
                               description="Se borrará definitivamente de la base de datos."
                               onConfirm={() => handleDeleteReplay(event.id)}
                               okText="SÍ, ELIMINAR"
                               cancelText="NO"
                               okButtonProps={{ danger: true, loading: isDeleting }}
                            >
                               <Button 
                                  size="small" 
                                  danger
                                  icon={<DeleteOutlined />} 
                                  onClick={e => e.stopPropagation()}
                                  style={{ borderRadius: 8, height: 32, width: 32, background: 'rgba(255,77,79,0.85)', backdropFilter: 'blur(4px)' }}
                               />
                            </Popconfirm>
                         </div>
                      )}
                  </div>

                  <div style={{ padding: '24px', background: 'rgba(255,255,255,0.01)' }}>
                      <Title level={5} style={{ color: '#fff', margin: 0, fontSize: 15, fontWeight: 900, fontFamily: 'Outfit', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                         {event.gallo_a_name.replace('[ARCHIVED] ', '')} <span style={{ color: 'rgba(212,175,55,0.4)', fontSize: 10, fontWeight: 300, margin: '0 4px' }}>VS</span> {event.gallo_b_name}
                      </Title>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                         <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: 800, letterSpacing: '1px' }}>
                            {new Date(event.created_at).toLocaleDateString()}
                         </Text>
                         <Button 
                            type="text" 
                            icon={<VideoCameraOutlined />} 
                            onClick={() => openReplay(event)}
                            style={{ 
                               color: '#10b981', 
                               fontSize: 11, 
                               fontWeight: 900, 
                               padding: 0,
                               display: 'flex',
                               alignItems: 'center',
                               gap: 4
                            }}
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
        destroyOnClose={true}
        styles={{ 
            body: { padding: 0, overflow: 'hidden', background: '#000', borderRadius: 20 },
            mask: { backdropFilter: 'blur(10px)', background: 'rgba(0,0,0,0.8)' }
        }}
        closeIcon={<Title level={4} style={{ color: '#fff', margin: 0 }}>&times;</Title>}
      >
        {selectedReplay && (
          <div style={{ position: 'relative' }}>
              <div style={{ position: 'relative', width: '100%', background: '#000' }}>
               {(() => {
                  const url = selectedReplay.stream_url || '';
                  const isDirectVideo = url.match(/\.(mp4|webm|ogg|mov)$/i) || url.includes('/storage/v1/object/public/');
                  
                  // YouTube Transformation Logic
                  let finalUrl = url;
                  if (url.includes('youtube.com/watch?v=')) finalUrl = url.replace('watch?v=', 'embed/');
                  else if (url.includes('youtu.be/')) finalUrl = `https://www.youtube.com/embed/${url.split('/').pop()}`;
                  
                  if (isDirectVideo) {
                    return (
                        <video 
                            src={url} 
                            controls 
                            autoPlay 
                            muted 
                            playsInline
                            webkit-playsinline="true"
                            style={{ width: '100%', display: 'block' }} 
                        />
                    );
                  }

                  return (
                    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                        <iframe 
                            src={finalUrl} 
                            width="100%" 
                            height="100%" 
                            frameBorder="0" 
                            scrolling="no" 
                            allow="autoplay; encrypted-media; picture-in-picture" 
                            allowFullScreen 
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                        />
                    </div>
                  );
               })()}
             </div>
             <div style={{ padding: '24px', background: 'var(--charcoal)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <Row justify="space-between" align="middle">
                   <Col>
                      <Title level={4} style={{ color: '#fff', margin: 0, fontWeight: 900, fontFamily: 'Outfit' }}>
                        POSTE #{selectedReplay.post_number}: {selectedReplay.gallo_a_name.replace('[ARCHIVED] ', '')} VS {selectedReplay.gallo_b_name}
                      </Title>
                      <Text style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        Finalizado el {new Date(selectedReplay.created_at).toLocaleString()}
                      </Text>
                   </Col>
                    <Col>
                      <div style={{ background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)', color: '#fff', padding: '8px 20px', borderRadius: 10, fontWeight: 900, fontSize: 13, boxShadow: '0 4px 12px rgba(16,185,129,0.3)', letterSpacing: '0.5px' }}>
                         GANADOR: {(selectedReplay.winner_side === 'A' ? selectedReplay.gallo_a_name : selectedReplay.gallo_b_name).replace('[ARCHIVED] ', '')}
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
            background: linear-gradient(135deg, rgba(20, 20, 20, 0.7) 0%, rgba(5, 5, 5, 0.8) 100%) !important;
            backdrop-filter: blur(20px);
            box-shadow: 
               0 10px 30px rgba(0,0,0,0.5),
               inset 0 0 0 1px rgba(255,255,255,0.05);
            transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .replay-card {
            border: 1px solid rgba(212, 175, 55, 0.1) !important;
        }
        .replay-card:hover {
            transform: translateY(-8px) scale(1.01);
            border-color: rgba(16, 185, 129, 0.4) !important;
            box-shadow: 
               0 30px 60px rgba(0,0,0,0.8),
               0 0 30px rgba(16, 185, 129, 0.1);
        }
        .play-container {
            cursor: pointer;
            transition: all 0.4s ease;
            padding: 10px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }
        .play-icon-glow {
            transition: all 0.4s ease;
            filter: drop-shadow(0 0 0px rgba(16, 185, 129, 0));
        }
        .replay-card:hover .play-icon-glow {
            transform: scale(1.1);
            color: #fff !important;
            filter: drop-shadow(0 0 20px rgba(16, 185, 129, 1));
            animation: pulsePlay 1.5s infinite;
        }
        .replay-card:hover img {
            transform: scale(1.15);
            opacity: 0.8 !important;
        }
        @keyframes pulsePlay {
            0% { filter: drop-shadow(0 0 5px rgba(16, 185, 129, 0.5)); }
            50% { filter: drop-shadow(0 0 25px rgba(16, 185, 129, 1)); }
            100% { filter: drop-shadow(0 0 5px rgba(16, 185, 129, 0.5)); }
        }
        .replay-card img { transition: all 0.8s cubic-bezier(0.23, 1, 0.32, 1); }
        .fade-up { animation: fadeUp 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
        @keyframes fadeUp { 
           from { opacity: 0; transform: translateY(30px); } 
           to { opacity: 1; transform: translateY(0); } 
        }
      `}</style>
       {/* Admin Edit Modal */}
       <Modal
          title={<span style={{ color: 'var(--gold)', fontWeight: 900, letterSpacing: '2px' }}>🛠️ PANEL DE EDICIÓN ADMIN</span>}
          open={isAdminOpen}
          onCancel={() => { setIsAdminOpen(false); setEditingReplay(null); setFileList([]); }}
          footer={null}
          centered
          width={500}
          styles={{ 
             body: { background: 'var(--obsidian)', padding: '24px 32px' },
             header: { background: 'var(--obsidian)', borderBottom: '1px solid rgba(212,175,55,0.2)' }
          }}
       >
          <Form form={form} layout="vertical" onFinish={handleUpdateReplay}>
              <Form.Item name="stream_url" label={<Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 900 }}>URL DEL VIDEO (YouTube / Dacast / HLS)</Text>} extra={<Text type="secondary" style={{ fontSize: 9 }}>Sugerencia: Usa YouTube (Oculto) para videos de más de 50MB.</Text>}>
                 <Input 
                   style={{ background: '#0a0a0a', border: '1px solid rgba(212,175,55,0.4)', color: '#fff', borderRadius: 10, height: 44 }} 
                   placeholder="https://..."
                 />
              </Form.Item>

              <Divider style={{ borderColor: 'rgba(255,255,255,0.05)' }}><Text style={{ color: 'rgba(255,255,255,0.1)', fontSize: 9 }}>Ó SUBE ARCHIVO LOCAL</Text></Divider>

              <div style={{ margin: '24px 0', padding: '20px', background: 'rgba(212,175,55,0.05)', borderRadius: 12, border: '1px dashed rgba(212,175,55,0.2)' }}>
                  <Text style={{ color: 'var(--gold)', fontSize: 10, fontWeight: 900, display: 'block', marginBottom: 16, textAlign: 'center' }}>O SUBE UN ARCHIVO MP4</Text>
                  <Upload.Dragger
                      fileList={fileList}
                      beforeUpload={() => false}
                      onChange={({ fileList }) => setFileList(fileList.slice(-1))}
                      style={{ background: 'transparent', border: 'none' }}
                  >
                      <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: 'var(--gold)' }} /></p>
                      <p style={{ color: '#fff', fontSize: 12 }}>Haz clic o arrastra un video aquí</p>
                  </Upload.Dragger>
                  {uploadProgress > 0 && <Progress percent={uploadProgress} strokeColor="var(--gold)" trailColor="rgba(255,255,255,0.05)" style={{ marginTop: 20 }} />}
              </div>

              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                block 
                style={{ 
                   height: 50, 
                   background: 'linear-gradient(90deg, #d4af37 0%, #b8860b 100%)', 
                   borderColor: 'transparent', 
                   color: '#000', 
                   fontWeight: 900, 
                   borderRadius: 12,
                   marginTop: 10 
                }}
              >
                 GUARDAR CAMBIOS
              </Button>
          </Form>
       </Modal>
    </div>
  );
};

export default ReplaysView;
