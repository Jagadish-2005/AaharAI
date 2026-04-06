import { Mail, CheckCircle, Info, Inbox, CheckCircle2, CircleAlert, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../services/api';

export default function GrievancesPage() {
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMessageId, setActiveMessageId] = useState(null);

  useEffect(() => {
    const fetchGrievances = async () => {
      try {
        const data = await api.getMyGrievances();
        setGrievances(data.grievances || []);
        if (data.grievances && data.grievances.length > 0) {
          setActiveMessageId(data.grievances[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchGrievances();
  }, []);

  if (loading) return <div className="spinner"></div>;

  const activeMessage = grievances.find(g => g.id === activeMessageId);

  return (
    <>
      <div className="page-header">
        <div>
          <h2><Inbox size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Inbox</h2>
          <div className="subtitle">Notices, grievances, and alerts sent by administration.</div>
        </div>
        <div className="badge badge-info" style={{ padding: '6px 14px', fontSize: 13 }}>
          {grievances.length} Messages
        </div>
      </div>
      
      <div className="page-body">
        {grievances.length === 0 ? (
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12, color: 'var(--success)' }}><CheckCircle2 size={48} /></div>
              <h3 style={{ fontSize: 18, color: 'var(--text-secondary)' }}>You're all caught up!</h3>
              <p style={{ fontSize: 13 }}>No grievances or notices require your attention.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            
            {/* Inbox Sidebar (Master) */}
            <div style={{ width: '340px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)', marginBottom: 8, paddingLeft: 4 }}>All Messages</div>
              {grievances.map(g => (
                <button 
                  key={g.id} 
                  onClick={() => setActiveMessageId(g.id)}
                  className={`btn ${activeMessageId === g.id ? 'btn-primary' : ''}`}
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    width: '100%', 
                    textAlign: 'left', 
                    padding: '12px 16px', 
                    background: activeMessageId === g.id ? 'var(--primary)' : 'var(--bg)', 
                    color: activeMessageId === g.id ? 'white' : 'var(--text)', 
                    border: activeMessageId === g.id ? 'none' : '1px solid var(--border)',
                    boxShadow: activeMessageId === g.id ? 'var(--shadow-sm)' : 'none',
                    borderRadius: 'var(--radius)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      {g.source_type === 'alert' ? <><CircleAlert size={14} style={{ display: 'inline-block', verticalAlign: '-2px', color: 'var(--danger)' }} /> Aahar Admin Bot</> : g.beneficiary_name}
                    </span>
                    <span style={{ fontSize: 11, opacity: 0.8 }}>{new Date(g.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.9 }}>{g.source_type === 'alert' ? 'OFFICIAL NOTICE' : g.issue_type.replace(/_/g, ' ')}</div>
                </button>
              ))}
            </div>
            
            {/* Inbox Content View (Detail) */}
            <div style={{ flex: 1 }}>
              {activeMessage && (
                <div className="card" style={{ margin: 0 }}>
                  <div className="card-header" style={{ background: 'var(--bg)', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h3 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <CircleAlert size={22} style={{ color: 'var(--danger)' }}/> 
                        {activeMessage.issue_type.replace(/_/g, ' ')}
                      </h3>
                      <span className={`badge ${activeMessage.status === 'resolved' ? 'badge-success' : 'badge-warning'}`}>
                        {activeMessage.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: 'var(--text-secondary)', fontSize: 13 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={14} /> Received: {new Date(activeMessage.created_at).toLocaleString()}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Info size={14} /> Ration Card: {activeMessage.ration_card_number}</span>
                    </div>
                  </div>
                  <div className="card-body" style={{ padding: '24px', minHeight: '300px' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
                      {activeMessage.source_type === 'alert' ? 'ADMINISTRATIVE REPORT / INSTRUCTION:' : 'BENEFICIARY COMPLAINT / FEEDBACK:'}
                    </div>
                    <div style={{ background: activeMessage.source_type === 'alert' ? '#fee2e2' : 'var(--bg-light)', padding: '16px', borderRadius: 'var(--radius)', border: activeMessage.source_type === 'alert' ? '1px solid #fca5a5' : '1px solid var(--border-light)', fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: activeMessage.source_type === 'alert' ? '#991b1b' : 'var(--text)' }}>
                      "{activeMessage.description}"
                    </div>
                  </div>
                </div>
              )}
            </div>
            
          </div>
        )}
      </div>
    </>
  );
}
