import React, { useState, useEffect } from 'react';
import { Typography, Tag, Space, Card, Row, Col, Divider, Badge, Skeleton } from 'antd';
import { HistoryOutlined, TrophyTwoTone, CheckCircleFilled, CloseCircleFilled, DashboardOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { supabase, rawFetch } from '../lib/supabase';

const { Title, Text } = Typography;

const UserHistoryView = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Tactical Join via RawFetch
        const bets = await rawFetch(`bets?select=*,events(post_number,gallo_a_name,gallo_b_name)&user_id=eq.${user.id}&order=created_at.desc&limit=20`);
        if (bets) setData(bets);
      } catch (err) {
        console.error('History Fetch Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div style={{ padding: '32px 20px', maxWidth: 900, margin: '0 auto', background: 'var(--obsidian)', minHeight: '100vh', paddingBottom: 100 }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ 
          width: 60, 
          height: 60, 
          background: 'var(--glass)', 
          borderRadius: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '0 auto 16px',
          border: '1px solid var(--glass-border)',
          transform: 'rotate(45deg)'
        }}>
          <HistoryOutlined style={{ fontSize: 24, color: 'var(--champagne)', transform: 'rotate(-45deg)' }} />
        </div>
        <Title level={3} className="outfit" style={{ margin: 0, color: '#fff', fontSize: 24, fontWeight: 800 }}>HISTORIAL DE JUGADAS</Title>
        <Text style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '2px' }}>Tus actividades en tiempo real</Text>
      </div>

      <Row gutter={[0, 10]}>
        {loading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : data.length > 0 ? (
          data.map((item, i) => {
            const isWin = item.status === 'WON';
            const isPending = item.status === 'PENDING';
            const payout = isWin ? (item.amount * item.odds_at_bet).toFixed(2) : `-${item.amount}`;
            
            return (
              <Col span={24} key={item.id}>
                <Card 
                  className="glass-panel" 
                  styles={{ body: { padding: '16px 20px' } }}
                  style={{ 
                    borderLeft: isPending ? '3px solid #faad14' : (isWin ? '3px solid #22c55e' : '3px solid #ef4444'),
                    transition: 'var(--transition)'
                  }}
                >
                  <Row align="middle" gutter={16}>
                    <Col xs={24} sm={6}>
                      <Text style={{ color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase' }}>FECHA</Text>
                      <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{dayjs(item.created_at).format('DD MMM • HH:mm')}</div>
                    </Col>
                    
                    <Col xs={24} sm={10} style={{ marginTop: {xs: 8, sm: 0} }}>
                      <Text style={{ color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase' }}>EVENTO #{item.events?.post_number}</Text>
                      <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{item.events?.gallo_a_name} VS {item.events?.gallo_b_name}</div>
                      <Text style={{ color: 'var(--champagne)', fontSize: 10 }}>Puesta al GALLO {item.selected_side} • Odds: {item.odds_at_bet}</Text>
                    </Col>
                    
                    <Col xs={12} sm={4} style={{ textAlign: 'right', marginTop: {xs: 8, sm: 0} }}>
                      <div style={{ color: isPending ? '#faad14' : (isWin ? '#22c55e' : 'var(--text-muted)'), fontSize: 15, fontWeight: 900, fontFamily: 'Outfit' }}>
                        {isWin ? `+ $${payout}` : (isPending ? `$${item.amount}` : `- $${item.amount}`)}
                      </div>
                      <Tag color={isPending ? 'rgba(250, 173, 20, 0.1)' : (isWin ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)')} style={{ 
                        margin: 0, 
                        borderColor: isPending ? '#faad14' : (isWin ? '#22c55e' : '#ef4444'), 
                        color: isPending ? '#faad14' : (isWin ? '#22c55e' : '#ef4444'), 
                        fontSize: 8,
                        fontWeight: 700,
                        borderRadius: 2
                      }}>
                        {isPending ? 'PENDIENTE' : (isWin ? 'GANADA' : 'PERDIDA')}
                      </Tag>
                    </Col>
                  </Row>
                </Card>
              </Col>
            );
          })
        ) : (
          <Col span={24} style={{ textAlign: 'center', padding: '100px 0', opacity: 0.2 }}>
            <HistoryOutlined style={{ fontSize: 64, color: '#fff' }} />
            <div style={{ color: '#fff', marginTop: 16 }}>SIN ACTIVIDAD REGISTRADA</div>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default UserHistoryView;
