import { Store, Bot, Clock, CheckCircle, Search, AlertTriangle, TrendingUp, LayoutDashboard, CircleAlert, Info, Mail } from 'lucide-react';
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../services/api';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningDetection, setRunningDetection] = useState(false);
  const [tab, setTab] = useState('alerts');
  const [selectedVendorStr, setSelectedVendorStr] = useState(null);

  const fetchAlerts = async () => {
    try {
      const data = await api.getAlerts('resolved=false');
      setAlerts(data.alerts || []);
      setSummary(data.summary);
    } catch (err) { console.error(err); }
  };

  const fetchPredictions = async () => {
    try {
      const data = await api.runDemandPrediction();
      if (data && data.rice) {
        const formatted = data.rice.map((val, idx) => {
           let d = new Date();
           d.setMonth(d.getMonth() + idx + 1);
           return {
             name: d.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
             Rice: val,
             Wheat: data.wheat[idx],
             Sugar: data.sugar[idx]
           };
        });
        setPredictions(formatted);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    Promise.all([fetchAlerts(), fetchPredictions()])
      .finally(() => setLoading(false));
  }, []);

  const handleResolve = async (id) => {
    try {
      await api.resolveAlert(id);
      await fetchAlerts();
    } catch (err) { console.error(err); }
  };

  const handleRunDetection = async () => {
    setRunningDetection(true);
    try {
      await api.runDetection();
      await fetchAlerts();
    } catch (err) { console.error(err); }
    finally { setRunningDetection(false); }
  };

  if (loading) return <div className="spinner"></div>;

  const groupedAlerts = alerts.reduce((acc, alert) => {
    const key = alert.vendor_name || 'System Level Alerts';
    if (!acc[key]) acc[key] = [];
    acc[key].push(alert);
    return acc;
  }, {});

  const vendorNames = Object.keys(groupedAlerts);
  const activeVendor = selectedVendorStr && vendorNames.includes(selectedVendorStr) 
    ? selectedVendorStr 
    : (vendorNames.length > 0 ? vendorNames[0] : null);

  return (
    <>
      <div className="page-header">
        <div>
          <h2><Bot size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> AI Alerts & Predictions</h2>
          <div className="subtitle">Anomaly detection and demand forecasting</div>
        </div>
        <button className="btn btn-primary" onClick={handleRunDetection} disabled={runningDetection}>
          {runningDetection ? <><Clock size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Scanning...</> : <><Search size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Run Anomaly Scan</>}
        </button>
      </div>
      <div className="page-body">
        {/* Summary Cards */}
        {summary && (
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            <div className="stat-card danger">
              <div className="stat-icon danger"><CircleAlert size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div>
              <div className="stat-info"><h4>Critical</h4><div className="stat-value">{summary.critical || 0}</div></div>
            </div>
            <div className="stat-card accent">
              <div className="stat-icon accent"><CircleAlert size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div>
              <div className="stat-info"><h4>High</h4><div className="stat-value">{summary.high || 0}</div></div>
            </div>
            <div className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div className="stat-icon" style={{ background: '#fef3c7', color: '#a16207' }}><CircleAlert size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div>
              <div className="stat-info"><h4>Medium</h4><div className="stat-value">{summary.medium || 0}</div></div>
            </div>
            <div className="stat-card info">
              <div className="stat-icon info"><Info size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div>
              <div className="stat-info"><h4>Low</h4><div className="stat-value">{summary.low || 0}</div></div>
            </div>
            <div className="stat-card success">
              <div className="stat-icon success"><CheckCircle size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div>
              <div className="stat-info"><h4>Total Active</h4><div className="stat-value">{summary.active || 0}</div></div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', padding: 4, borderRadius: 'var(--radius-sm)', marginBottom: 20, maxWidth: 300 }}>
          <button onClick={() => setTab('alerts')} className="btn btn-sm" style={{ flex: 1, justifyContent: 'center', background: tab === 'alerts' ? 'white' : 'transparent', boxShadow: tab === 'alerts' ? 'var(--shadow-sm)' : 'none', color: tab === 'alerts' ? 'var(--primary)' : 'var(--text-secondary)' }}>
            <AlertTriangle size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Alerts
          </button>
          <button onClick={() => setTab('predictions')} className="btn btn-sm" style={{ flex: 1, justifyContent: 'center', background: tab === 'predictions' ? 'white' : 'transparent', boxShadow: tab === 'predictions' ? 'var(--shadow-sm)' : 'none', color: tab === 'predictions' ? 'var(--primary)' : 'var(--text-secondary)' }}>
            <LayoutDashboard size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Predictions
          </button>
        </div>

        {tab === 'alerts' ? (
          <div>
            {alerts.length === 0 ? (
              <div className="card">
                <div className="card-body" style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}><CheckCircle size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div>
                  <h3 style={{ fontSize: 18, color: 'var(--text-secondary)' }}>No active alerts</h3>
                  <p style={{ fontSize: 13 }}>All anomalies have been resolved</p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                <div style={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)', marginBottom: 8, paddingLeft: 4 }}>Alert Locations</div>
                  {vendorNames.map(vendorName => (
                    <button 
                      key={vendorName} 
                      onClick={() => setSelectedVendorStr(vendorName)}
                      className={`btn ${activeVendor === vendorName ? 'btn-primary' : ''}`}
                      style={{ 
                        justifyContent: 'space-between', 
                        width: '100%', 
                        textAlign: 'left', 
                        padding: '12px 16px', 
                        background: activeVendor === vendorName ? 'var(--primary)' : 'var(--bg)', 
                        color: activeVendor === vendorName ? 'white' : 'var(--text)', 
                        border: activeVendor === vendorName ? 'none' : '1px solid var(--border)',
                        boxShadow: activeVendor === vendorName ? 'var(--shadow-sm)' : 'none'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Store size={16} /> {vendorName}
                      </span>
                      <span className={`badge ${activeVendor === vendorName ? 'badge-info' : 'badge-danger'}`} style={{ marginLeft: 8, background: activeVendor === vendorName ? 'rgba(255,255,255,0.2)' : undefined, color: activeVendor === vendorName ? 'white' : undefined }}>
                        {groupedAlerts[vendorName].length}
                      </span>
                    </button>
                  ))}
                </div>
                
                <div style={{ flex: 1 }}>
                  {activeVendor && (
                    <div className="card" style={{ margin: 0 }}>
                      <div className="card-header" style={{ background: 'var(--bg)', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <Store size={20} style={{ color: 'var(--primary)' }}/> 
                          {activeVendor}
                          <span className="badge badge-danger">{groupedAlerts[activeVendor].length} Alerts</span>
                        </h3>
                      </div>
                      <div className="card-body" style={{ padding: 0 }}>
                        {groupedAlerts[activeVendor].map((a, index) => (
                          <div className="alert-card" key={a.id} style={{ margin: 0, borderBottom: index < groupedAlerts[activeVendor].length - 1 ? '1px solid var(--border-light)' : 'none', borderRadius: 0, boxShadow: 'none' }}>
                            <div className={`alert-severity ${a.severity}`}>
                              {a.severity === 'critical' ? <CircleAlert size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> : a.severity === 'high' ? <CircleAlert size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> : a.severity === 'medium' ? <CircleAlert size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> : <Info size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} />}
                            </div>
                            <div className="alert-content">
                              <div className="alert-title">{a.title}</div>
                              <div className="alert-message">{a.message}</div>
                              <div className="alert-meta">
                                <span className={`badge badge-${a.severity}`}>{a.severity}</span>
                                <span>{a.alert_type.replace(/_/g, ' ')}</span>
                                <span>{new Date(a.created_at).toLocaleDateString('en-IN')}</span>
                              </div>
                            </div>
                            <button className="btn btn-success btn-sm" onClick={() => handleResolve(a.id)}>
                              <Mail size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Resolve & Email
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card">
            <div className="card-header"><h3><TrendingUp size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> AI Demand Predictions (Next 4 Months)</h3></div>
            <div className="card-body">
              {predictions.length > 0 ? (
                <div style={{ height: 400, width: '100%', marginTop: 20 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={predictions} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" stroke="var(--text-secondary)" />
                      <YAxis stroke="var(--text-secondary)" />
                      <Tooltip 
                        contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Line type="monotone" dataKey="Rice" stroke="#6366f1" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="Wheat" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="Sugar" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
                  Loading prediction models...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
