import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, InputNumber, Space, Typography, Row, Col, Divider, App as AntApp, Tabs, Image, Select, Upload, Progress, Badge, Popconfirm } from 'antd';
import { PlusOutlined, ThunderboltFilled, TrophyOutlined, SignalFilled, SettingOutlined, EyeOutlined, CheckCircleFilled, WalletOutlined, DollarOutlined, VideoCameraOutlined, InboxOutlined, DeleteOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { supabase, rawFetch, supabaseAnonKey, supabaseUrl } from '../lib/supabase';

const { Title, Text } = Typography;

const AdminDashboard = () => {
  const { message, modal } = AntApp.useApp();
  const [activeTab, setActiveTab] = useState('1');
  const [events, setEvents] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReplayModalOpen, setIsReplayModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [globalStream, setGlobalStream] = useState('');
  const [showCartelera, setShowCartelera] = useState(true);
  const [isSavingStream, setIsSavingStream] = useState(false);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);

  const fetchData = async () => {
    try {
      if (activeTab === '1') {
        const data = await rawFetch(`events?select=*&order=created_at.desc`);
        if (data) setEvents(data);
        
        // Fetch Global Settings from DB
        const settings = await rawFetch(`settings`);
        if (settings) {
            const stream = settings.find(s => s.id === 'live_stream_url');
            const cartelera = settings.find(s => s.id === 'show_cartelera');
            if (stream) setGlobalStream(stream.value);
            if (cartelera) setShowCartelera(cartelera.value === 'true');
        }
      } else {
        const deps = await rawFetch(`deposits?select=*,users(email)&order=created_at.desc`);
        if (deps) setDeposits(deps);
      }
    } catch (err) {
      console.error('Admin Fetch Err:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('admin-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deposits' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, (payload) => {
          if (payload.new) {
              if (payload.new.id === 'live_stream_url') setGlobalStream(payload.new.value);
              if (payload.new.id === 'show_cartelera') setShowCartelera(payload.new.value === 'true');
          }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [activeTab]);

  const handleCreateEvent = async (values) => {
    setLoading(true);
    try {
      const payload = { 
        ...values, 
        status: 'LIVE', 
        stream_url: values.stream_url || globalStream 
      };
      await rawFetch('events', { method: 'POST', body: payload });
      message.success('PELEA PROGRAMADA CON ÉXITO');
      setIsModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (e) { message.error(e.message); }
    finally { setLoading(false); }
  };

  const handleCreateReplay = async (values) => {
    setLoading(true);
    setUploadProgress(0);
    try {
      let videoUrl = values.stream_url;
      
      // REAL UPLOAD with PROGRESS
      if (fileList.length > 0) {
        const file = fileList[0].originFileObj;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`; // Just file name, bucket path handled below

        // Raw XHR to handle progress accurately
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
                    console.error('Storage Error Detail:', xhr.responseText);
                    reject(new Error(`Upload failed ${xhr.status}: ${xhr.responseText}`));
                }
            };
            xhr.onerror = () => reject(new Error('Network Error'));
            xhr.send(file);
        });


        await uploadPromise;
        
        // Get result URL
        const { data } = supabase.storage
          .from('media')
          .getPublicUrl(filePath);
        
        videoUrl = data.publicUrl;
      }

      await rawFetch('events', { method: 'POST', body: { ...values, stream_url: videoUrl, status: 'FINISHED' } });
      message.success('REPETICIÓN CARGADA CON ÉXITO');
      setIsReplayModalOpen(false);
      setFileList([]);
      form.resetFields();
      fetchData();
    } catch (e) { 
        console.error('Upload Error:', e);
        if (e.message.includes('Bucket not found')) {
            message.error('CARPETA DE VIDEOS NO EXISTE. Haz clic en el botón dorado [REPARAR CARPETA VIDEOS] arriba.');
        } else {
            message.error('Fallo al subir video: ' + e.message); 
        }
    }
    finally { 
        setLoading(false); 
        setTimeout(() => setUploadProgress(0), 1000);
    }
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
                    console.error('Storage Error Detail:', xhr.responseText);
                    reject(new Error(`Upload failed ${xhr.status}: ${xhr.responseText}`));
                }
            };
            xhr.onerror = () => reject(new Error('Network Error'));
            xhr.send(file);
        });

        await uploadPromise;
        const { data } = supabase.storage.from('media').getPublicUrl(filePath);
        videoUrl = data.publicUrl;
      }

      await rawFetch(`events?id=eq.${editingEvent.id}`, { 
        method: 'PATCH', 
        body: { stream_url: videoUrl } 
      });
      
      message.success('REPETICIÓN ACTUALIZADA');
      setIsReplayModalOpen(false);
      setEditingEvent(null);
      setFileList([]);
      form.resetFields();
      fetchData();
    } catch (e) {
      if (e.message.includes('Bucket not found')) {
          message.error('CARPETA DE VIDEOS NO EXISTE. Haz clic en el botón dorado [REPARAR CARPETA VIDEOS] arriba.');
      } else {
          message.error('Error al actualizar repetición: ' + e.message);
      }
    } finally {
      setLoading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const openReplayEditor = (event) => {
      setEditingEvent(event);
      setIsReplayModalOpen(true);
      form.setFieldsValue({
          post_number: event.post_number,
          gallo_a_name: event.gallo_a_name,
          gallo_b_name: event.gallo_b_name,
          stream_url: event.stream_url,
          winner_side: event.winner_side
      });
  };

  const handleBulkCreate = async (values) => {
    setLoading(true);
    try {
        const lines = values.bulkText.split('\n').filter(line => line.trim().length > 5);
        const newEvents = lines.map(line => {
            const [post, a, b] = line.split(',').map(s => s.trim());
            return {
                post_number: post || '0',
                gallo_a_name: a || 'Gallo A',
                gallo_b_name: b || 'Gallo B',
                status: 'PENDING',
                stream_url: globalStream,
                gallo_a_odds: 1.9,
                gallo_b_odds: 1.9
            };
        });

        if (newEvents.length === 0) throw new Error('Formato inválido. Usa: Poste, Gallo A, Gallo B');

        await rawFetch('events', { method: 'POST', body: newEvents });
        message.success(`${newEvents.length} PELEAS CARGADAS AL PROGRAMA`);
        setIsBulkModalOpen(false);
        form.resetFields();
        fetchData();
    } catch (e) {
        message.error('Error en carga masiva: ' + e.message);
    } finally {
        setLoading(false);
    }
  };

  const handleSaveGlobalStream = async () => {
    setIsSavingStream(true);
    try {
        await rawFetch(`settings?id=eq.live_stream_url`, {
            method: 'PATCH',
            body: { value: globalStream }
        });
        message.success('URL DE TRANSMISIÓN ACTUALIZADA');
    } catch (e) {
        message.error('Error al guardar URL: ' + e.message);
    } finally {
        setIsSavingStream(false);
    }
  };

  const handleToggleCartelera = async (checked) => {
     try {
         await rawFetch(`settings?id=eq.show_cartelera`, {
             method: 'PATCH',
             body: { value: String(checked) }
         });
         setShowCartelera(checked);
         message.success(checked ? 'CARTELERA VISIBLE PARA USUARIOS' : 'CARTELERA OCULTA PARA USUARIOS');
     } catch (e) {
         message.error('Error al actualizar cartelera');
     }
  };

  const handleClearChat = async () => {
    try {
      setLoading(true);
      await rawFetch('messages', { 
        method: 'DELETE', 
        query: 'id=not.is.null' 
      });
      message.success('CHAT VACIADO CORRECTAMENTE');
    } catch (e) {
      console.error('Clear Chat Err:', e);
      message.error('Error al vaciar el chat');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDeposit = async (deposit) => {
    modal.confirm({
        title: 'CONFIRMAR ACREDITACIÓN',
        content: `¿Deseas acreditar $${deposit.amount} a la cuenta de ${deposit.users?.email}?`,
        onOk: async () => {
            setLoading(true);
            try {
                const userArr = await rawFetch(`users?select=balance&id=eq.${deposit.user_id}`);
                const currentBalance = parseFloat(userArr[0]?.balance || 0);
                const newBalance = (currentBalance + parseFloat(deposit.amount)).toFixed(2);
                await rawFetch(`users?id=eq.${deposit.user_id}`, { method: 'PATCH', body: { balance: newBalance } });
                await rawFetch(`deposits?id=eq.${deposit.id}`, { method: 'PATCH', body: { status: 'APPROVED' } });
                await rawFetch('transactions', { method: 'POST', body: { user_id: deposit.user_id, amount_change: deposit.amount, type: 'DEPOSIT', description: `Carga aprobada vía ${deposit.method}` } });
                message.success('SALDO ACREDITADO');
                fetchData();
            } catch (e) { message.error('Error'); }
            finally { setLoading(false); }
        }
    });
  };

  const updateStatus = async (id, status) => {
    try {
      await rawFetch(`events?id=eq.${id}`, { method: 'PATCH', body: { status } });
      message.info(`ESTADO: ${status}`);
      fetchData();
    } catch (e) { message.error(e.message); }
  };

  const handleFixStorage = async () => {
    setLoading(true);
    try {
        const { error } = await supabase.storage.createBucket('media', { public: true });
        if (error) {
            if (error.message.includes('already exists')) {
                message.success('LA CARPETA "media" YA EXISTE');
            } else {
                throw error;
            }
        } else {
            message.success('CARPETA "media" CREADA CON ÉXITO');
        }
    } catch (e) {
        message.warning('Por favor, crea la carpeta "media" manualmente en el panel de Supabase (Sección Storage)');
        console.error('Error al crear bucket:', e);
    } finally {
        setLoading(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    setLoading(true);
    try {
      // 1. Delete associated bets first to satisfy FK constraint
      await rawFetch(`bets?event_id=eq.${id}`, { method: 'DELETE' });
      
      // 2. Delete the event itself
      await rawFetch(`events?id=eq.${id}`, { method: 'DELETE' });
      
      message.success('PELEA Y APUESTAS ELIMINADAS');
      fetchData();
    } catch (e) { 
        console.error('Delete Error:', e);
        message.error('Error al borrar: ' + e.message); 
    } finally {
        setLoading(false);
    }
  };

  const setWinnerAndPayout = async (event, winnerSide) => {
    const winnerName = winnerSide === 'DRAW' ? 'TABLAS / EMPATE' : (winnerSide === 'A' ? event.gallo_a_name : event.gallo_b_name);
    modal.confirm({
        title: 'LIQUIDACIÓN DE MERCADO',
        content: `¿Declarar ganador a: ${winnerName.toUpperCase()}? ${winnerSide === 'DRAW' ? 'Se reembolsarán todas las apuestas.' : 'Se iniciará la acreditación masiva de premios.'}`,
        onOk: async () => {
            setLoading(true);
            try {
                // 1. Finalize the Event
                await rawFetch(`events?id=eq.${event.id}`, { method: 'PATCH', body: { status: 'FINISHED', winner_side: winnerSide } });

                // 2. Resolve all Bets for this fight
                const allBets = await rawFetch(`bets?select=*&event_id=eq.${event.id}&status=eq.PENDING`);
                
                if (allBets && allBets.length > 0) {
                    const payoutsByUser = {};

                    for (const bet of allBets) {
                        let isWinner = false;
                        let payoutAmount = 0;

                        if (winnerSide === 'DRAW') {
                           // Refund the original amount
                           isWinner = true; 
                           payoutAmount = parseFloat(bet.amount);
                        } else if (bet.selected_side === winnerSide) {
                           // Calculate win payout
                           isWinner = true;
                           payoutAmount = parseFloat(bet.amount) * parseFloat(bet.odds_at_bet);
                        }

                        if (isWinner) {
                            if (!payoutsByUser[bet.user_id]) {
                                payoutsByUser[bet.user_id] = { totalPayout: 0 };
                            }
                            payoutsByUser[bet.user_id].totalPayout += payoutAmount;
                            
                            // Mark bet as WON (or REFUNDED)
                            await rawFetch(`bets?id=eq.${bet.id}`, { method: 'PATCH', body: { status: 'WON' } });

                            // Log Transaction (Audit)
                            await rawFetch('transactions', {
                                method: 'POST',
                                body: {
                                    user_id: bet.user_id,
                                    amount_change: payoutAmount.toFixed(2),
                                    type: 'BET_PAYOUT',
                                    description: winnerSide === 'DRAW' ? `Reembolso Tablas Pelea #${event.post_number}` : `Premio Pelea #${event.post_number} (Gallo ${winnerSide})`
                                }
                            });
                        } else {
                            // Mark bet as LOST
                            await rawFetch(`bets?id=eq.${bet.id}`, { method: 'PATCH', body: { status: 'LOST' } });
                        }
                    }

                    // PROCESS BULK USER BALANCES
                    for (const userId of Object.keys(payoutsByUser)) {
                        const totalPayout = payoutsByUser[userId].totalPayout;
                        const userArr = await rawFetch(`users?select=balance&id=eq.${userId}`);
                        
                        if (userArr && userArr[0]) {
                            const newBalance = (parseFloat(userArr[0].balance) + totalPayout).toFixed(2);
                            await rawFetch(`users?id=eq.${userId}`, { method: 'PATCH', body: { balance: newBalance } });
                        }
                    }
                }

                message.success(winnerSide === 'DRAW' ? 'PELEA DECLARADA COMO TABLAS' : `LIQUIDACIÓN COMPLETADA: GALLO ${winnerSide}`);
                fetchData();
            } catch (e) { 
                message.error('Fallo en el motor de pagos: ' + e.message); 
            } finally {
                setLoading(false);
            }
        }
    });
  };

  const eventColumns = [
    { title: 'PELEA', dataIndex: 'post_number', key: 'post', render: (t) => <Text style={{ color: 'var(--champagne)', fontWeight: 900 }}>{t}</Text> },
    { title: 'GALLOS', key: 'ga', render: (_, r) => <div style={{ color: '#fff' }}>{r.gallo_a_name} vs {r.gallo_b_name}</div> },
    { title: 'ESTADO', dataIndex: 'status', key: 'status', render: (s) => (s === 'LIVE' ? <Tag color="green">VIVO</Tag> : <Tag>{s}</Tag>) },
    { title: 'ACCIONES', key: 'actions', render: (_, r) => (
      <Space>
        {r.status === 'LIVE' && <Button size="small" onClick={() => updateStatus(r.id, 'CLOSED')}>CERRAR</Button>}
        {r.status === 'CLOSED' && (
          <Space>
            <Button size="small" type="primary" style={{ background: '#10b981' }} onClick={() => setWinnerAndPayout(r, 'A')}>PAGAR A</Button>
            <Button size="small" type="primary" style={{ background: '#d4af37' }} onClick={() => setWinnerAndPayout(r, 'B')}>PAGAR B</Button>
            <Button size="small" type="default" onClick={() => setWinnerAndPayout(r, 'DRAW')}>TABLAS</Button>
          </Space>
        )}
        {r.status === 'FINISHED' && (
          <Button 
            size="small" 
            icon={<VideoCameraOutlined />} 
            onClick={() => openReplayEditor(r)}
            style={{ color: '#d4af37', borderColor: '#d4af37' }}
          >
            REPETICIÓN
          </Button>
        )}
        <Popconfirm
          title="¿ELIMINAR PELEA?"
          description="Esta acción no se puede deshacer."
          onConfirm={() => handleDeleteEvent(r.id)}
          okText="SÍ, ELIMINAR"
          cancelText="NO"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    )}
  ];

  const depositColumns = [
      { title: 'USUARIO', dataIndex: ['users', 'email'], key: 'email' },
      { title: 'MONTO', dataIndex: 'amount', key: 'amount', render: (a) => <Text style={{ color: '#22c55e' }}>${a}</Text> },
      { title: 'RECIBO', dataIndex: 'proof_url', key: 'proof', render: (url) => url && <Image src={url} width={30} /> },
      { title: 'GESTIÓN', key: 'ops', render: (_, r) => r.status === 'PENDING' && (
          <Button type="primary" size="small" onClick={() => handleApproveDeposit(r)}>APROBAR</Button>
      )}
  ];

  const tabItems = [
    { key: '1', label: 'PELEAS', children: (
        <Table 
            columns={eventColumns} 
            dataSource={events} 
            pagination={false} 
            rowKey="id" 
            onRow={(record) => ({
                onClick: () => {
                    if (record.status === 'FINISHED') openReplayEditor(record);
                }
            })}
            rowClassName={(record) => record.status === 'FINISHED' ? 'clickable-row' : ''}
        />
    )},
    { key: '2', label: 'TESORERÍA', children: <Table columns={depositColumns} dataSource={deposits} pagination={false} rowKey="id" /> }
  ];

  return (
    <>

    <div style={{ padding: '40px 24px', maxWidth: 1000, margin: '0 auto', background: 'var(--obsidian)', minHeight: '100vh' }}>
      <div style={{ background: 'rgba(212,175,55,0.05)', padding: '20px 30px', borderRadius: 16, marginBottom: 30, border: '1px solid rgba(212,175,55,0.1)' }}>
         <Row gutter={20} align="middle">
            <Col xs={24} md={10}>
               <Title level={4} style={{ color: '#fff', margin: 0 }}>JORNADA DE HOY</Title>
               <Text style={{ color: 'var(--text-muted)' }}>Configura el Stream Global para todas las peleas</Text>
            </Col>
            <Col xs={24} md={7}>
               <Input 
                 placeholder="URL DE TRANSMISIÓN (CASTR/M3U8/DACAST)" 
                 value={globalStream} 
                 onChange={e => setGlobalStream(e.target.value)}
                 style={{ background: '#000', border: '1px solid var(--glass-border)', color: '#fff' }}
                 suffix={
                    <Button 
                        type="text" 
                        size="small" 
                        icon={<CheckCircleFilled style={{ color: '#10b981' }} />} 
                        onClick={handleSaveGlobalStream}
                        loading={isSavingStream}
                    />
                 }
               />
            </Col>
             <Col xs={24} md={3} style={{ textAlign: 'center' }}>
                <Text style={{ color: 'var(--text-muted)', fontSize: 10, display: 'block', marginBottom: 4 }}>CARTELERA</Text>
                <Select 
                    value={showCartelera} 
                    onChange={handleToggleCartelera}
                    style={{ width: '100%', background: '#000' }}
                    options={[
                        { value: true, label: 'VER' },
                        { value: false, label: 'OCULTAR' }
                    ]}
                />
             </Col>
             <Col xs={24} md={4} style={{ textAlign: 'right' }}>
                 <Space direction="vertical" style={{ width: '100%' }}>
                    <Button 
                        onClick={handleFixStorage} 
                        loading={loading}
                        style={{ background: 'rgba(212,175,55,0.2)', color: '#d4af37', borderColor: '#d4af37', width: '100%', height: 32, fontSize: 11 }}
                    >
                        REPARAR CARPETA
                    </Button>
                    <Popconfirm
                        title="¿Vaciar todo el chat?"
                        description="Esta acción borrará todos los mensajes para siempre."
                        onConfirm={handleClearChat}
                        okText="Sí, borrar"
                        cancelText="No"
                        icon={<QuestionCircleOutlined style={{ color: 'red' }} />}
                    >
                        <Button 
                            danger 
                            icon={<DeleteOutlined />} 
                            style={{ width: '100%', height: 32, fontSize: 11 }}
                        >
                            VACIAR CHAT
                        </Button>
                    </Popconfirm>
                 </Space>
            </Col>
         </Row>
      </div>

      <Title level={2} style={{ color: '#fff', textAlign: 'center' }}>ESTRATEGIA CENTRAL</Title>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} tabBarExtraContent={activeTab === '1' && (
        <Space>
          <Button onClick={() => setIsModalOpen(true)} icon={<PlusOutlined />}>NUEVA PELEA</Button>
          <Button 
            onClick={() => setIsBulkModalOpen(true)} 
            icon={<TrophyOutlined />}
            style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
          >
            CARGA MASIVA
          </Button>
          <Button 
            onClick={() => {
                setEditingEvent(null);
                setIsReplayModalOpen(true);
                form.resetFields();
            }} 
            icon={<VideoCameraOutlined />} 
            style={{ background: 'rgba(212,175,55,0.1)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}
          >
            CARGAR REPETICIÓN
          </Button>
        </Space>
      )} />

      <Modal open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null} centered width={600}>
        <div style={{ background: 'var(--charcoal)', padding: 30, borderRadius: 12 }}>
          <Title level={3} style={{ color: '#fff', textAlign: 'center', fontFamily: 'Outfit' }}>Nueva Pelea en Vivo</Title>
          <Form form={form} layout="vertical" onFinish={handleCreateEvent} initialValues={{ gallo_a_odds: 1.9, gallo_b_odds: 1.9 }}>
            <Form.Item name="post_number" label={<Text style={{ color: '#fff' }}>POSTE</Text>} rules={[{required: true}]}><Input /></Form.Item>
            <Row gutter={16}>
                <Col span={12}><Form.Item name="gallo_a_name" label={<Text style={{ color: '#fff' }}>GALLO A</Text>} rules={[{required: true}]}><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="gallo_b_name" label={<Text style={{ color: '#fff' }}>GALLO B</Text>} rules={[{required: true}]}><Input /></Form.Item></Col>
            </Row>
            <Button type="primary" block onClick={() => form.submit()} loading={loading}>INICIAR COMBATE</Button>
          </Form>
        </div>
      </Modal>

      <Modal 
        open={isReplayModalOpen} 
        onCancel={() => {
            setIsReplayModalOpen(false);
            setEditingEvent(null);
        }} 
        footer={null} 
        centered 
        width={600}
      >
        <div style={{ background: 'var(--charcoal)', padding: 30, borderRadius: 12, border: '1px solid rgba(212,175,55,0.2)' }}>
          <Title level={3} style={{ color: '#d4af37', textAlign: 'center', fontFamily: 'Outfit' }}>
            {editingEvent ? 'Actualizar Repetición' : 'Cargar Repetición Manual'}
          </Title>
          <Form 
            form={form} 
            layout="vertical" 
            onFinish={editingEvent ? handleUpdateReplay : handleCreateReplay}
          >
            <Form.Item label={<Text style={{ color: '#fff' }}>VIDEO DE LA PELEA</Text>} required>
                <Upload.Dragger 
                    name="file" 
                    multiple={false} 
                    fileList={fileList}
                    onChange={({ fileList }) => setFileList(fileList)}
                    beforeUpload={() => false}
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px dashed var(--glass-border)', borderRadius: 12, padding: 20 }}
                >
                    <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#d4af37' }} /></p>
                    <p className="ant-upload-text" style={{ color: '#fff' }}>Haz clic o arrastra el video (MP4/MOV)</p>
                    <p className="ant-upload-hint" style={{ color: 'var(--text-muted)' }}>El archivo se subirá directamente a la nube.</p>
                </Upload.Dragger>
            </Form.Item>
            
            {loading && uploadProgress > 0 && (
                <div style={{ marginBottom: 24 }}>
                    <Text style={{ color: '#fff', fontSize: 10 }}>SUBIENDO VIDEO: {uploadProgress}%</Text>
                    <Progress percent={uploadProgress} status="active" strokeColor="#d4af37" trailColor="rgba(255,255,255,0.05)" showInfo={false} style={{ marginTop: 8 }} />
                </div>
            )}
            
            <Form.Item name="stream_url" label={<Text style={{ color: '#fff' }}>URL ALTERNATIVA (YouTube/Directo)</Text>}><Input placeholder="https://..." /></Form.Item>
            
            <Form.Item name="post_number" label={<Text style={{ color: '#fff' }}>POSTE / # PELEA</Text>} rules={[{required: true}]}><Input disabled={!!editingEvent} /></Form.Item>
            <Row gutter={16}>
                <Col span={12}><Form.Item name="gallo_a_name" label={<Text style={{ color: '#fff' }}>GALLO A</Text>} rules={[{required: true}]}><Input disabled={!!editingEvent} /></Form.Item></Col>
                <Col span={12}><Form.Item name="gallo_b_name" label={<Text style={{ color: '#fff' }}>GALLO B</Text>} rules={[{required: true}]}><Input disabled={!!editingEvent} /></Form.Item></Col>
            </Row>
            
            {!editingEvent && (
                <Form.Item name="winner_side" label={<Text style={{ color: '#fff' }}>GANADOR</Text>} rules={[{required: true}]}>
                    <Select placeholder="Seleccionar Ganador" style={{ width: '100%' }}>
                        <Select.Option value="A">GALLO A</Select.Option>
                        <Select.Option value="B">GALLO B</Select.Option>
                    </Select>
                </Form.Item>
            )}

            <Button type="primary" block onClick={() => form.submit()} loading={loading} style={{ background: '#d4af37', border: 'none', height: 45, fontWeight: 700 }}>
                {editingEvent ? 'ACTUALIZAR VIDEO REPETICIÓN' : 'GUARDAR REPETICIÓN NUEVA'}
            </Button>
          </Form>
        </div>
      </Modal>


      <Modal open={isBulkModalOpen} onCancel={() => setIsBulkModalOpen(false)} footer={null} centered width={700}>
        <div style={{ background: 'var(--charcoal)', padding: 30, borderRadius: 12, border: '1px solid #10b981' }}>
          <Title level={3} style={{ color: '#fff', textAlign: 'center', fontFamily: 'Outfit' }}>Programa de Jornada (Carga en Bloque)</Title>
          <Text style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 20, textAlign: 'center' }}>
            Pega tu programa aquí. Formato: <span style={{ color: '#10b981' }}>Poste, Gallo A, Gallo B</span> (una por línea)
          </Text>
          <Form form={form} layout="vertical" onFinish={handleBulkCreate}>
            <Form.Item name="bulkText" rules={[{required: true, message: 'Ingresa al menos una pelea'}]}>
                <Input.TextArea 
                    placeholder="Ejemplo:&#10;1, El Rayo, Malandro&#10;2, Centella, Capìtan&#10;3, Espartaco, Gladiador" 
                    rows={10} 
                    style={{ background: '#000', border: '1px solid var(--glass-border)', color: '#fff', fontFamily: 'monospace', fontSize: 13 }}
                />
            </Form.Item>
            <div style={{ padding: '10px 0', textAlign: 'center', marginBottom: 20 }}>
                <Badge status="processing" color="#10b981" text={<Text style={{ color: 'var(--text-muted)' }}>Todas heredarán el Stream Global: {globalStream || 'SIN CONFIGURAR'}</Text>} />
            </div>
            <Button type="primary" block onClick={() => form.submit()} loading={loading} style={{ height: 45, fontWeight: 700 }}>GENERAR PROGRAMA COMPLETO</Button>
          </Form>
        </div>
      </Modal>
    </div>
    <style>{`
        .clickable-row { cursor: pointer; transition: background 0.3s; }
        .clickable-row:hover { background: rgba(212,175,55,0.05) !important; }
    `}</style>
    </>
  );
};


export default AdminDashboard;
