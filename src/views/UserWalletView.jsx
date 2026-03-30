import React, { useState, useEffect } from 'react';
import { Typography, Card, Space, Button, Row, Col, Divider, Progress, List, Skeleton, Badge, App as AntApp, Modal, InputNumber, Input } from 'antd';
import { CreditCardOutlined, HistoryOutlined, CheckCircleFilled, ArrowUpOutlined, ArrowDownOutlined, WalletFilled, DollarCircleOutlined, ThunderboltFilled } from '@ant-design/icons';
import { supabase, rawFetch, ensureUserProfile } from '../lib/supabase';

const { Title, Text } = Typography;
const logo = "/logo.png";

const UserWalletView = ({ balance, setBalance }) => {
  const { message: msg } = AntApp.useApp();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [userId, setUserId] = useState(null);
  
  // Modal States
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [depositMethod, setDepositMethod] = useState(null); // 'PAYPAL', 'TRANSFER'
  const [depositAmount, setDepositAmount] = useState(10);
  const [txLoading, setTxLoading] = useState(false);

  // Configuration (Placeholders)
  const bankConfig = {
    bank: "BANCO CENTRAL",
    account: "0000-0000-0000-0000",
    id: "V-12345678",
    alias: "trabalive.pago"
  };

  useEffect(() => {
    const fetchWalletData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);
        const txs = await rawFetch(`transactions?select=*&user_id=eq.${user.id}&order=created_at.desc&limit=20`);
        if (txs) setTransactions(txs);
      } catch (err) {
        console.error('Wallet Fetch Err:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWalletData();
  }, [userId]);

  const handleManualDeposit = async () => {
    if (!userId) return;
    setTxLoading(true);
    try {
        await rawFetch('deposits', {
            method: 'POST',
            body: { 
                user_id: userId, 
                amount: depositAmount, 
                method: 'TRANSFER', 
                status: 'PENDING',
                proof_url: 'PENDING_UPLOAD' // Logic for upload will go here
            }
        });
        msg.success('SOLICITUD DE DEPÓSITO ENRIADA');
        setIsDepositModalOpen(false);
        setDepositMethod(null);
    } catch (e) {
        msg.error('Error al procesar solicitud');
    } finally {
        setTxLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: 700, margin: '0 auto', background: 'var(--obsidian)', minHeight: '100vh', paddingBottom: 100 }}>
      {/* Brand Header */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <Title level={4} className="outfit" style={{ margin: 0, color: '#fff', fontSize: 20, fontWeight: 700 }}>BILLETERA COLICEO</Title>
        <Text style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600 }}>Activos en Tiempo Real</Text>
      </div>

      {/* Modern, solid green balance card */}
      <Card className="green-balance-card fade-up">
        <Text style={{ position: 'absolute', top: 20, right: 20, fontSize: 14, color: '#fff', opacity: 0.15, fontWeight: 700, letterSpacing: '2px' }}>ANGEL CRUZ</Text>
        <Text style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#fff', letterSpacing: '1px', opacity: 0.8 }}>SALDO DISPONIBLE (USD)</Text>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '14px 0' }}>
          <span style={{ fontSize: 20, fontWeight: 400, color: '#fff' }}>$</span>
          <Title style={{ margin: 0, fontSize: 48, fontWeight: 700, fontFamily: 'Outfit', color: '#fff', letterSpacing: '-1px' }}>
            {parseFloat(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Title>
        </div>
        <Divider style={{ margin: '16px 0', borderColor: 'rgba(255,255,255,0.2)' }} />
        <Row gutter={16}>
          <Col span={12}>
             <Text style={{ fontSize: 8, fontWeight: 700, opacity: 0.8, color: '#fff', textTransform: 'uppercase' }}>ESTADO CUENTA</Text>
             <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#fff' }} /> VERIFICADA
             </div>
          </Col>
          <Col span={12} style={{ textAlign: 'right' }}>
             <Text style={{ fontSize: 8, fontWeight: 700, opacity: 0.8, color: '#fff', textTransform: 'uppercase' }}>ACTUALIZADO</Text>
             <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 4 }}>AHORA MISMO</div>
          </Col>
        </Row>
      </Card>

      <Row gutter={16} style={{ marginBottom: 40 }}>
        <Col span={12}>
          <Button type="primary" block icon={<ArrowUpOutlined />} 
            onClick={() => setIsDepositModalOpen(true)}
            style={{ height: 48, fontSize: 12, fontWeight: 600, background: '#10b981', boxShadow: 'none' }}>DEPOSITAR</Button>
        </Col>
        <Col span={12}>
          <Button className="btn-ghost-green" block icon={<ArrowDownOutlined />} 
            onClick={() => setIsWithdrawModalOpen(true)}
            style={{ height: 48, fontSize: 12, fontWeight: 600, boxShadow: 'none' }}>RETIRAR</Button>
        </Col>
      </Row>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={5} className="outfit" style={{ color: '#fff', fontSize: 13, textTransform: 'uppercase', margin: 0, letterSpacing: '1.5px' }}>HISTORIAL DE ACTIVIDAD</Title>
      </div>
      
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {loading ? ( <Skeleton active /> ) : transactions.length > 0 ? (
          transactions.map((tx) => (
            <Card key={tx.id} className="glass-panel" styles={{ body: { padding: '20px' } }}>
              <Row justify="space-between" align="middle">
                 <Col span={16}>
                    <Space size={14}>
                      <div style={{ width: 40, height: 40, backgroundColor: 'rgba(16,185,129,0.05)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16,185,129,0.1)' }}>
                        {tx.amount_change > 0 ? <DollarCircleOutlined style={{ color: '#22c55e', fontSize: 16 }} /> : <ThunderboltFilled style={{ color: 'var(--brand-green)', fontSize: 16 }} />}
                      </div>
                      <div>
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>{tx.type}</Text>
                        <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>{new Date(tx.created_at).toLocaleString()}</div>
                      </div>
                    </Space>
                 </Col>
                 <Col span={8} style={{ textAlign: 'right' }}><Text style={{ color: tx.amount_change > 0 ? '#22c55e' : '#fff', fontSize: 16, fontWeight: 900 }}>{tx.amount_change > 0 ? '+' : ''}{tx.amount_change}</Text></Col>
              </Row>
            </Card>
          ))
        ) : ( <div style={{ textAlign: 'center', opacity: 0.3, padding: 40 }}><Text style={{ color: '#fff' }}>SIN MOVIMIENTOS</Text></div> )}
      </Space>

      {/* MODAL DE DEPÓSITO SELECTOR */}
      <Modal open={isDepositModalOpen} onCancel={() => setIsDepositModalOpen(false)} footer={null} centered width={400} styles={{ body: { background: 'var(--charcoal)', padding: 0 } }}>
         <div style={{ background: 'var(--charcoal)', padding: 30, borderRadius: 20, border: '2px solid #10b981' }}>
            <Title level={3} style={{ color: '#fff', textAlign: 'center' }}>CARGAR SALDO</Title>
            
            {!depositMethod ? (
                <Space direction="vertical" size={12} style={{ width: '100%', marginTop: 24 }}>
                   <Button block style={{ height: 48, background: '#0070ba', border: 'none', color: '#fff', fontWeight: 600, borderRadius: 8 }} onClick={() => setDepositMethod('PAYPAL')}>PAYPAL / TARJETA</Button>
                   <Button block ghost style={{ height: 48, border: '1px solid #10b981', color: '#10b981', fontWeight: 600, borderRadius: 8 }} onClick={() => setDepositMethod('TRANSFER')}>TRANSFERENCIA BANCARIA</Button>
                </Space>
            ) : depositMethod === 'TRANSFER' ? (
                <div style={{ marginTop: 20 }}>
                   <Text style={{ color: 'var(--text-muted)', fontSize: 11 }}>DATOS DE TRANSFERENCIA:</Text>
                   <Card style={{ background: 'var(--obsidian)', border: '1px solid var(--glass-border)', marginTop: 10 }}>
                      <Text style={{ display: 'block', color: '#fff' }}><b>Banco:</b> {bankConfig.bank}</Text>
                      <Text style={{ display: 'block', color: '#fff' }}><b>Cuenta:</b> {bankConfig.account}</Text>
                      <Text style={{ display: 'block', color: '#fff' }}><b>Alias:</b> {bankConfig.alias}</Text>
                   </Card>
                   
                   <div style={{ marginTop: 24 }}>
                      <Text style={{ color: '#fff' }}>Monto a Depositar (USD):</Text>
                      <InputNumber min={1} value={depositAmount} onChange={setDepositAmount} style={{ width: '100%', marginTop: 8 }} />
                      <Button type="primary" block style={{ marginTop: 20, height: 44, fontWeight: 600, background: '#10b981', boxShadow: 'none' }} onClick={handleManualDeposit} loading={txLoading}>NOTIFICAR TRANSFERENCIA</Button>
                      <Button type="link" block style={{ color: 'var(--text-muted)' }} onClick={() => setDepositMethod(null)}>VOLVER</Button>
                   </div>
                </div>
            ) : depositMethod === 'PAYPAL' ? (
                <div style={{ marginTop: 24 }}>
                   <div id="paypal-button-container" style={{ minHeight: 150 }}>
                      <div style={{ textAlign: 'center', padding: 20 }}>
                         <Text style={{ color: 'var(--text-muted)' }}>INICIALIZANDO PASARELA SEGURA...</Text>
                      </div>
                   </div>
                   <Button type="link" block style={{ color: 'var(--text-muted)' }} onClick={() => setDepositMethod(null)}>VOLVER</Button>
                </div>
            ) : (
                <div style={{ marginTop: 24, textAlign: 'center' }}>
                   <Text style={{ color: 'var(--text-muted)' }}>MÉTODO NO SOPORTADO</Text>
                   <Divider />
                   <Button type="link" block style={{ color: 'var(--text-muted)' }} onClick={() => setDepositMethod(null)}>VOLVER</Button>
                </div>
            )}
         </div>
      </Modal>

      {/* MODAL DE RETIRO */}
      <Modal open={isWithdrawModalOpen} onCancel={() => setIsWithdrawModalOpen(false)} footer={null} centered width={400} styles={{ body: { background: 'var(--charcoal)', padding: 0 } }}>
         <div style={{ background: 'var(--charcoal)', padding: 30, borderRadius: 20, border: '2px solid #10b981' }}>
             <Title level={3} style={{ color: '#fff', textAlign: 'center' }}>RETIRAR FONDOS</Title>
            <Text style={{ color: 'var(--text-muted)', display: 'block', textAlign: 'center' }}>EL SALDO SE LIQUIDARÁ A TU MÉTODO REGISTRADO</Text>
            <InputNumber min={1} max={balance} placeholder="Monto a retirar" style={{ width: '100%', marginTop: 24 }} />
            <Button block style={{ marginTop: 20, height: 44, background: '#10b981', color: '#fff', fontWeight: 600, border: 'none', borderRadius: 8 }} 
                onClick={() => msg.info('SOLICITUD DE RETIRO ENVIADA')}>SOLICITAR RETIRO</Button>
         </div>
      </Modal>
    </div>
  );
};

export default UserWalletView;
