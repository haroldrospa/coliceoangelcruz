import React, { useState, useEffect } from 'react';
import { Typography, Card, Space, Button, Row, Col, Divider, Progress, List, Skeleton, Badge, App as AntApp, Modal } from 'antd';
import { CreditCardOutlined, HistoryOutlined, CheckCircleFilled, ArrowUpOutlined, ArrowDownOutlined, WalletFilled, DollarCircleOutlined, ThunderboltFilled } from '@ant-design/icons';
import { supabase, rawFetch, ensureUserProfile } from '../lib/supabase';

const { Title, Text } = Typography;
const logo = "/logo.png";

const UserWalletView = ({ balance, setBalance }) => {
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchWalletData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        // Fetch transactions via tactical bypass (Balance is now handled by App.jsx)
        const txs = await rawFetch(`transactions?select=*&user_id=eq.${user.id}&order=created_at.desc&limit=20`);
        if (txs) setTransactions(txs);
      } catch (err) {
        console.error('Wallet Bypass Fetch Err:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWalletData();
    
    return () => {};
  }, [userId]);

  return (
    <div style={{ padding: '40px 20px', maxWidth: 700, margin: '0 auto', background: 'var(--obsidian)', minHeight: '100vh', paddingBottom: 100 }}>
      {/* Brand Header */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{ 
          width: 50, 
          height: 10, 
          background: 'transparent', 
          margin: '0 auto 16px'
        }}>
        </div>
        <Title level={4} className="outfit" style={{ margin: 0, color: '#fff', fontSize: 24, fontWeight: 900 }}>BILLETERA TRABALIVE</Title>
        <Text style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '2.5px', fontWeight: 700 }}>Activos en Tiempo Real</Text>
      </div>

      {/* Modern, solid gold balance card */}
      <Card className="gold-balance-card fade-up">
        <Text style={{ position: 'absolute', top: 20, right: 20, fontSize: 14, color: '#000', opacity: 0.1, fontWeight: 900, letterSpacing: '4px' }}>TRABA LIVE</Text>
        
        <Text style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: '#000', letterSpacing: '1px', opacity: 0.6 }}>SALDO DISPONIBLE (USD)</Text>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '14px 0' }}>
          <span style={{ fontSize: 24, fontWeight: 400, color: '#000' }}>$</span>
          <Title style={{ margin: 0, fontSize: 56, fontWeight: 900, fontFamily: 'Outfit', color: '#000', letterSpacing: '-2px' }}>
            {parseFloat(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Title>
        </div>
        
        <Divider style={{ margin: '16px 0', borderColor: 'rgba(0,0,0,0.1)' }} />
        
        <Row gutter={16}>
          <Col span={12}>
             <Text style={{ fontSize: 8, fontWeight: 800, opacity: 0.5, color: '#000', textTransform: 'uppercase' }}>ESTADO CUENTA</Text>
             <div style={{ fontSize: 14, fontWeight: 900, color: '#000', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#000' }} /> VERIFICADA
             </div>
          </Col>
          <Col span={12} style={{ textAlign: 'right' }}>
             <Text style={{ fontSize: 8, fontWeight: 800, opacity: 0.5, color: '#000', textTransform: 'uppercase' }}>ACTUALIZADO</Text>
             <div style={{ fontSize: 14, fontWeight: 900, color: '#000', marginTop: 4 }}>AHORA MISMO</div>
          </Col>
        </Row>
      </Card>

      <Row gutter={16} style={{ marginBottom: 40 }}>
        <Col span={12}>
          <Button type="primary" block icon={<ArrowUpOutlined />} 
            onClick={() => Modal.info({ title: 'DEPÓSITO ACTIVO', content: 'Para cargar saldo, contacta a tu promotor o usa el botón de WhatsApp.', centered: true })}
            style={{ height: 60, fontSize: 13, fontWeight: 800 }}>DEPOSITAR</Button>
        </Col>
        <Col span={12}>
          <Button className="btn-ghost-gold" block icon={<ArrowDownOutlined />} 
            onClick={() => Modal.info({ title: 'RETIRO EN PROCESO', content: 'Tus ganancias se liquidan cada 24 horas automáticamente.', centered: true })}
            style={{ height: 60, fontSize: 13, fontWeight: 800 }}>RETIRAR</Button>
        </Col>
      </Row>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={5} className="outfit" style={{ color: '#fff', fontSize: 13, textTransform: 'uppercase', margin: 0, letterSpacing: '1.5px' }}>HISTORIAL DE ACTIVIDAD</Title>
        <Button type="link" style={{ color: 'var(--champagne)', fontSize: 11, fontWeight: 700 }}>EXPORTAR</Button>
      </div>
      
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {loading ? (
          <Skeleton active paragraph={{ rows: 4 }} title={false} />
        ) : transactions.length > 0 ? (
          transactions.map((tx, i) => (
            <Card 
              key={tx.id} 
              className="glass-panel" 
              styles={{ body: { padding: '20px' } }}
              style={{ border: 'none', transition: 'all 0.3s ease' }}
            >
              <Row justify="space-between" align="middle">
                 <Col span={16}>
                    <Space size={14}>
                      <div style={{ 
                        width: 40, 
                        height: 40, 
                        backgroundColor: 'rgba(212,175,55,0.05)', 
                        borderRadius: 12, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        border: '1px solid rgba(212,175,55,0.1)' 
                      }}>
                        {tx.type === 'BET_PLACED' ? <ThunderboltFilled style={{ color: 'var(--champagne)', fontSize: 16 }} /> : 
                         tx.type === 'BET_PAYOUT' ? <DollarCircleOutlined style={{ color: '#22c55e', fontSize: 16 }} /> :
                         <WalletFilled style={{ color: 'var(--champagne)', fontSize: 16 }} />}
                      </div>
                      <div>
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                           {tx.type === 'BET_PLACED' ? 'APUESTA REGISTRADA' : 
                            tx.type === 'BET_PAYOUT' ? 'PREMIO ACREDITADO' : 'TRANSACCIÓN'}
                        </Text>
                        <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 4 }}>
                          {new Date(tx.created_at).toLocaleString()} • {tx.description}
                        </div>
                      </div>
                    </Space>
                 </Col>
                 <Col span={8} style={{ textAlign: 'right' }}>
                    <Text style={{ 
                      color: tx.amount_change > 0 ? '#22c55e' : '#fff', 
                      fontSize: 16, 
                      fontWeight: 900,
                      fontFamily: 'Outfit'
                    }}>
                      {tx.amount_change > 0 ? '+' : ''} {parseFloat(tx.amount_change).toFixed(2)}
                    </Text>
                 </Col>
              </Row>
            </Card>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '100px 0', opacity: 0.3 }}>
             <HistoryOutlined style={{ fontSize: 48, marginBottom: 16 }} />
             <br />
             <Text style={{ color: '#fff', fontSize: 12 }}>SIN MOVIMIENTOS RECIENTES</Text>
          </div>
        )}
      </Space>
    </div>
  );
};

export default UserWalletView;
