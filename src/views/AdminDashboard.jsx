import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, InputNumber, Space, Typography, Row, Col, Divider, App as AntApp, Tabs, Image } from 'antd';
import { PlusOutlined, ThunderboltFilled, TrophyOutlined, SignalFilled, SettingOutlined, EyeOutlined, CheckCircleFilled, WalletOutlined, DollarOutlined } from '@ant-design/icons';
import { supabase, rawFetch } from '../lib/supabase';

const { Title, Text } = Typography;

const AdminDashboard = () => {
  const { message, modal } = AntApp.useApp();
  const [activeTab, setActiveTab] = useState('1');
  const [events, setEvents] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    try {
      if (activeTab === '1') {
        const data = await rawFetch(`events?select=*&order=created_at.desc`);
        if (data) setEvents(data);
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
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [activeTab]);

  const handleCreateEvent = async (values) => {
    setLoading(true);
    try {
      await rawFetch('events', { method: 'POST', body: values });
      message.success('PELEA PROGRAMADA CON ÉXITO');
      setIsModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (e) { message.error(e.message); }
    finally { setLoading(false); }
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

  const setWinnerAndPayout = async (event, winnerSide) => {
    const winnerName = winnerSide === 'A' ? event.gallo_a_name : event.gallo_b_name;
    modal.confirm({
        title: 'LIQUIDACIÓN DE MERCADO',
        content: `¿Declarar ganador a: ${winnerName.toUpperCase()}? Se iniciará la acreditación masiva de premios.`,
        onOk: async () => {
            setLoading(true);
            try {
                // 1. Finalize the Event
                await rawFetch(`events?id=eq.${event.id}`, { method: 'PATCH', body: { status: 'FINISHED', winner_side: winnerSide } });

                // 2. Resolve all Winning Bets
                const winningBets = await rawFetch(`bets?select=*&event_id=eq.${event.id}&selected_side=eq.${winnerSide}&status=eq.PENDING`);
                
                if (winningBets && winningBets.length > 0) {
                    // GROUP PAYOUTS BY USER TO PREVENT SILENT RACE CONDITIONS
                    const payoutsByUser = {};

                    for (const bet of winningBets) {
                        const payoutAmount = parseFloat(bet.amount) * parseFloat(bet.odds_at_bet);
                        
                        if (!payoutsByUser[bet.user_id]) {
                            payoutsByUser[bet.user_id] = { totalPayout: 0 };
                        }
                        payoutsByUser[bet.user_id].totalPayout += payoutAmount;
                        
                        // Mark bet as WON
                        await rawFetch(`bets?id=eq.${bet.id}`, { method: 'PATCH', body: { status: 'WON' } });

                        // Log Transaction (Audit)
                        await rawFetch('transactions', {
                            method: 'POST',
                            body: {
                                user_id: bet.user_id,
                                amount_change: payoutAmount.toFixed(2),
                                type: 'BET_PAYOUT',
                                description: `Premio Pelea #${event.post_number} (Gallo ${winnerSide})`
                            }
                        });
                    }

                    // PROCESS BULK USER BALANCES (Single update per user)
                    for (const userId of Object.keys(payoutsByUser)) {
                        const totalPayout = payoutsByUser[userId].totalPayout;
                        const userArr = await rawFetch(`users?select=balance&id=eq.${userId}`);
                        
                        if (userArr && userArr[0]) {
                            const newBalance = (parseFloat(userArr[0].balance) + totalPayout).toFixed(2);
                            await rawFetch(`users?id=eq.${userId}`, { method: 'PATCH', body: { balance: newBalance } });
                        }
                    }
                }

                // 3. Close the rest as LOST
                await rawFetch(`bets?event_id=eq.${event.id}&status=eq.PENDING`, { 
                    method: 'PATCH', 
                    body: { status: 'LOST' } 
                });

                message.success(`LIQUIDACIÓN COMPLETADA: GALLO ${winnerSide}`);
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
          <><Button size="small" onClick={() => setWinnerAndPayout(r, 'A')}>PAGAR A</Button><Button size="small" onClick={() => setWinnerAndPayout(r, 'B')}>PAGAR B</Button></>
        )}
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
    { key: '1', label: 'PELEAS', children: <Table columns={eventColumns} dataSource={events} pagination={false} rowKey="id" /> },
    { key: '2', label: 'TESORERÍA', children: <Table columns={depositColumns} dataSource={deposits} pagination={false} rowKey="id" /> }
  ];

  return (
    <div style={{ padding: '40px 24px', maxWidth: 1000, margin: '0 auto', background: 'var(--obsidian)', minHeight: '100vh' }}>
      <Title level={2} style={{ color: '#fff', textAlign: 'center' }}>ESTRATEGIA CENTRAL</Title>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} tabBarExtraContent={activeTab === '1' && <Button onClick={() => setIsModalOpen(true)}>NUEVA PELEA</Button>} />

      <Modal open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null} centered width={600}>
        <div style={{ background: 'var(--charcoal)', padding: 30, borderRadius: 12 }}>
          <Title level={3} style={{ color: '#fff', textAlign: 'center' }}>Nueva Pelea</Title>
          <Form form={form} layout="vertical" onFinish={handleCreateEvent} initialValues={{ gallo_a_odds: 1.9, gallo_b_odds: 1.9 }}>
            <Form.Item name="stream_url" label={<Text style={{ color: '#fff' }}>URL DACAST</Text>} rules={[{required: true}]}><Input /></Form.Item>
            <Form.Item name="post_number" label={<Text style={{ color: '#fff' }}>POSTE</Text>} rules={[{required: true}]}><Input /></Form.Item>
            <Row gutter={16}>
                <Col span={12}><Form.Item name="gallo_a_name" label={<Text style={{ color: '#fff' }}>GALLO A</Text>} rules={[{required: true}]}><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="gallo_b_name" label={<Text style={{ color: '#fff' }}>GALLO B</Text>} rules={[{required: true}]}><Input /></Form.Item></Col>
            </Row>
            <Button type="primary" block onClick={() => form.submit()} loading={loading}>CREAR</Button>
          </Form>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
