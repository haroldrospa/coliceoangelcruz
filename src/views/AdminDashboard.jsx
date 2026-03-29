import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, InputNumber, Space, Typography, Row, Col, Divider, App as AntApp } from 'antd';
import { PlusOutlined, ThunderboltFilled, TrophyOutlined, SignalFilled, SettingOutlined, EyeOutlined, CheckCircleFilled } from '@ant-design/icons';
import { supabase, rawFetch } from '../lib/supabase';

const { Title, Text } = Typography;

const AdminDashboard = () => {
  const { message, modal } = AntApp.useApp();
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // Load Fights via Tactical Engine
  const fetchEvents = async () => {
    try {
      const data = await rawFetch(`events?select=*&order=created_at.desc`);
      if (data) setEvents(data);
    } catch (err) {
      console.error('Admin Fetch Events Err:', err);
    }
  };

  useEffect(() => {
    fetchEvents();
    // Realtime subscription for admin view
    const channel = supabase.channel('admin-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchEvents)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const handleCreateEvent = async (values) => {
    setLoading(true);
    try {
      await rawFetch('events', {
        method: 'POST',
        body: values
      });
      message.success('PELEA PROGRAMADA CON ÉXITO');
      setIsModalOpen(false);
      form.resetFields();
      fetchEvents();
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await rawFetch(`events?id=eq.${id}`, {
        method: 'PATCH',
        body: { status }
      });
      message.info(`ESTADO ACTUALIZADO: ${status}`);
      fetchEvents();
    } catch (e) {
      message.error(e.message);
    }
  };

  const setWinnerAndPayout = async (event, winnerSide) => {
    modal.confirm({
      title: 'LIQUIDACIÓN DE MERCADO',
      content: `Declarar ganador al GALLO ${winnerSide}. Se procederá al pago automático de premios.`,
      okText: 'EJECUTAR PAGOS',
      cancelText: 'REVISAR',
      onOk: async () => {
        try {
          // 1. Update event status
          await rawFetch(`events?id=eq.${event.id}`, {
            method: 'PATCH',
            body: { status: 'FINISHED', winner_side: winnerSide }
          });
          
          // 2. Fetch winning bets
          const winningBets = await rawFetch(`bets?select=*&event_id=eq.${event.id}&selected_side=eq.${winnerSide}&status=eq.PENDING`);

          if (winningBets && winningBets.length > 0) {
            for (const bet of winningBets) {
              const payout = (bet.amount * bet.odds_at_bet).toFixed(2);
              
              // Increment balance
              const profileArr = await rawFetch(`users?select=balance&id=eq.${bet.user_id}`);
              if (profileArr && profileArr[0]) {
                const newBalance = (parseFloat(profileArr[0].balance) + parseFloat(payout)).toFixed(2);
                
                await rawFetch(`users?id=eq.${bet.user_id}`, {
                    method: 'PATCH',
                    body: { balance: newBalance }
                });
                
                await rawFetch(`bets?id=eq.${bet.id}`, {
                    method: 'PATCH',
                    body: { status: 'WON' }
                });
                
                // Transaction log
                await rawFetch('transactions', {
                    method: 'POST',
                    body: {
                        user_id: bet.user_id,
                        amount_change: payout,
                        type: 'BET_PAYOUT',
                        description: `Premio ganado en Pelea ${event.post_number}`
                    }
                });
              }
            }
          }
          
          // 3. Mark others as lost
          await rawFetch(`bets?event_id=eq.${event.id}&status=eq.PENDING`, {
            method: 'PATCH',
            body: { status: 'LOST' }
          });
          
          message.success('MERCADO LIQUIDADO Y PAGOS PROCESADOS');
          fetchEvents();
        } catch (e) {
          message.error('Fallo en liquidación: ' + e.message);
        }
      }
    });
  };

  const columns = [
    { title: 'PELEA', dataIndex: 'post_number', key: 'post', render: (t) => <Text style={{ color: 'var(--champagne)', fontWeight: 900 }}>{t}</Text> },
    { title: 'GALLO A / PESO', key: 'ga', render: (_, r) => <div style={{ color: '#fff' }}>{r.gallo_a_name} <br/><Text style={{ fontSize: 10, opacity: 0.5 }}>{r.gallo_a_weight}</Text></div> },
    { title: 'GALLO B / PESO', key: 'gb', render: (_, r) => <div style={{ color: '#fff' }}>{r.gallo_b_name} <br/><Text style={{ fontSize: 10, opacity: 0.5 }}>{r.gallo_b_weight}</Text></div> },
    { title: 'ESTADO', dataIndex: 'status', key: 'status', render: (s) => (s === 'LIVE' ? <Tag color="green">EN VIVO</Tag> : s === 'CLOSED' ? <Tag color="orange">CERRADA</Tag> : <Tag color="gray">FINALIZADA</Tag>) },
    { title: 'OPERACIONES TÁCTICAS', key: 'actions', render: (_, r) => (
      <Space>
        {r.status === 'LIVE' && <Button size="small" type="dashed" onClick={() => updateStatus(r.id, 'CLOSED')}>CERRAR APUESTAS</Button>}
        {r.status === 'CLOSED' && (
          <>
            <Button size="small" type="primary" onClick={() => setWinnerAndPayout(r, 'A')}>PAGAR A</Button>
            <Button size="small" type="primary" onClick={() => setWinnerAndPayout(r, 'B')}>PAGAR B</Button>
          </>
        )}
      </Space>
    )}
  ];

  return (
    <div style={{ padding: '40px 24px', maxWidth: 1200, margin: '0 auto', background: 'var(--obsidian)', minHeight: '100vh' }}>
      <div style={{ marginBottom: 48, textAlign: 'center' }}>
        <Title level={2} style={{ color: '#fff', fontSize: 32, fontWeight: 800 }}>PANEL DE ESTRATEGIA</Title>
        <Text style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '3px', fontWeight: 600 }}>Gestión de Mercado y Liquidación Cloud</Text>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
         <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)} style={{ height: 50, padding: '0 32px' }}>
            NUEVA PELEA
         </Button>
      </div>

      <Card className="glass-panel" styles={{ body: { padding: 0 } }}>
         <Table columns={columns} dataSource={events} pagination={false} rowKey="id" style={{ background: 'transparent' }} />
      </Card>

      <Modal 
        title={<Text style={{ color: 'var(--champagne)', fontWeight: 900 }}>CONFIGURAR NUEVA BATALLA</Text>}
        open={isModalOpen} 
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={loading}
        centered
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateEvent} initialValues={{ gallo_a_odds: 1.9, gallo_b_odds: 1.9 }}>
          <Row gutter={16}>
            <Col span={24}>
               <Form.Item name="stream_url" label="RUTA STREAM HLS (.m3u8)" rules={[{ required: true }]}>
                  <Input placeholder="http://[IP_SERVIDOR]/hls/transmision.m3u8" prefix={<SignalFilled />} />
               </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="post_number" label="POSTE #" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
            <Col span={12}>
               <Form.Item name="status" label="ESTADO INICIAL" initialValue="LIVE"><Input disabled /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gallo_a_name" label="GALLO A" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="gallo_a_weight" label="PESO A"><Input /></Form.Item>
              <Form.Item name="gallo_a_odds" label="CUOTAS A"><InputNumber style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gallo_b_name" label="GALLO B" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="gallo_b_weight" label="PESO B"><Input /></Form.Item>
              <Form.Item name="gallo_b_odds" label="CUOTAS B"><InputNumber style={{ width: '100%' }} /></Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
