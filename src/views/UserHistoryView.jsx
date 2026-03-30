import React, { useState, useEffect } from 'react';
import { Typography, Space, Card, Row, Col, Divider, Skeleton } from 'antd';
import { HistoryOutlined, ThunderboltFilled, DollarCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { supabase, rawFetch } from '../lib/supabase';

const { Title, Text } = Typography;

const UserHistoryView = () => {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBets = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        // Joint fetch with events for context
        const data = await rawFetch(`bets?select=*,events(*)&user_id=eq.${user.id}&order=created_at.desc&limit=30`);
        if (data) setBets(data);
      } catch (err) {
        console.error('History Fetch Err:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBets();
  }, []);

  const getStatusTag = (status) => {
    const config = {
      'PENDING': { color: '#10b981', label: 'ACTIVA', glow: 'rgba(16,185,129,0.2)', icon: <ThunderboltFilled /> },
      'WON': { color: '#22c55e', label: 'GANADA', glow: 'rgba(34,197,94,0.2)', icon: <DollarCircleOutlined /> },
      'LOST': { color: '#ef4444', label: 'PERDIDA', glow: 'transparent', icon: <CloseCircleOutlined /> }
    };
    const c = config[status] || config.PENDING;
    return (
      <div style={{ 
        border: `1px solid ${c.color}`, 
        padding: '4px 12px', 
        borderRadius: 6, 
        fontSize: 10, 
        fontWeight: 900, 
        color: c.color,
        boxShadow: `0 0 15px ${c.glow}`,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: 'rgba(0,0,0,0.3)'
      }}>
        {c.icon} {c.label}
      </div>
    );
  };

  return (
    <div style={{ padding: '30px 20px', maxWidth: 800, margin: '0 auto', background: 'var(--obsidian)', minHeight: '100vh', paddingBottom: 100 }}>
      {/* Dynamic Header */}
      <div style={{ marginBottom: 44, textAlign: 'center' }}>
        <Title level={4} style={{ color: '#fff', fontSize: 26, fontWeight: 900, margin: 0, fontFamily: 'Outfit' }}>ZONA DE OPERACIONES</Title>
        <Text style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '5px', fontWeight: 700 }}>Historial de Combate en Vivo</Text>
      </div>

      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        {loading ? (
            <Skeleton active paragraph={{ rows: 6 }} className="premium-skeleton" />
        ) : bets.length > 0 ? (
          bets.map((bet) => (
            <Card 
              key={bet.id} 
              className="glass-panel fade-up"
              styles={{ body: { padding: '24px' } }}
              style={{ border: '1px solid rgba(212,175,55,0.1)', borderRadius: 20, overflow: 'hidden' }}
            >
              <Row justify="space-between" align="middle" gutter={[16, 16]}>
                <Col xs={24} sm={16}>
                    <Space direction="vertical" size={4}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Text style={{ color: 'var(--text-muted)', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>REGISTRO #{bet.events?.post_number || '---'}</Text>
                            {getStatusTag(bet.status)}
                        </div>
                        <Title level={3} style={{ color: '#fff', margin: '8px 0', fontSize: 20, fontWeight: 900, fontFamily: 'Outfit' }}>
                            {bet.events?.gallo_a_name || 'GALLO A'} <span style={{ color: 'rgba(212,175,55,0.4)', fontSize: 14 }}>vs</span> {bet.events?.gallo_b_name || 'GALLO B'}
                        </Title>
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: bet.selected_side === 'A' ? '#10b981' : '#fff' }} />
                                <Text style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>APUESTA: <span style={{ textTransform: 'uppercase' }}>{bet.selected_side === 'A' ? bet.events?.gallo_a_name || 'GALLO A' : bet.events?.gallo_b_name || 'GALLO B'}</span></Text>
                            </div>
                            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>CUOTA: {bet.odds_at_bet}x</Text>
                        </div>
                    </Space>
                </Col>
                
                <Col xs={24} sm={8} style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', height: '100%' }}>
                        <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>INVERSIÓN TÁCTICA</Text>
                        <Title style={{ margin: 0, fontSize: 36, fontWeight: 900, color: '#10b981', fontFamily: 'Outfit', letterSpacing: '-1px' }}>${bet.amount}</Title>
                        <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 4 }}>{new Date(bet.created_at).toLocaleDateString()} • {new Date(bet.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                    </div>
                </Col>
              </Row>
            </Card>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '120px 0', background: 'rgba(212,175,55,0.02)', borderRadius: 24, border: '1px dashed rgba(212,175,55,0.1)' }}>
             <HistoryOutlined style={{ fontSize: 56, color: 'rgba(212,175,55,0.1)', marginBottom: 24 }} />
             <br />
             <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, letterSpacing: '2px', fontWeight: 700 }}>SIN OPERACIONES REGISTRADAS</Text>
          </div>
        )}
      </Space>

      <style>{`
        .glass-panel {
            background: linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.95) 100%) !important;
            backdrop-filter: blur(12px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .glass-panel:hover {
            transform: scale(1.02);
            border-color: rgba(212, 175, 55, 0.4) !important;
            box-shadow: 0 15px 40px rgba(212, 175, 55, 0.1);
        }
        .fade-up { animation: fadeUp 0.6s ease-out forwards; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .premium-skeleton .ant-skeleton-content .ant-skeleton-title, 
        .premium-skeleton .ant-skeleton-content .ant-skeleton-paragraph li { background: rgba(255,255,255,0.05) !important; }
        @media (max-width: 576px) {
            div { text-align: left !important; align-items: flex-start !important; }
            .ant-col-xs-24 { text-align: left !important; align-items: flex-start !important; }
        }
      `}</style>
    </div>
  );
};

export default UserHistoryView;
