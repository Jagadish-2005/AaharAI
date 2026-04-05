import { Store, Users, CheckCircle, Package, AlertTriangle, TrendingUp, LayoutDashboard, Target, Trophy, Map, CircleAlert, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import api from '../services/api';

const COLORS = ['#4f46e5', '#f59e0b', '#22c55e', '#ef4444', '#3b82f6', '#8b5cf6'];

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const m = new Date().getMonth() + 1;
    const y = new Date().getFullYear();
    Promise.all([
      api.getDashboard(m, y),
      api.getTrends()
    ]).then(([dash, trend]) => {
      setData(dash);
      setTrends(trend.trends || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner"></div>;
  if (!data) return <div style={{ padding: 40, textAlign: 'center' }}>Failed to load dashboard</div>;

  const { overview, stockOverview, vendorPerformance, dailyTrend, activeAlerts, districtBreakdown } = data;

  const pieData = [
    { name: 'Served', value: overview.servedBeneficiaries },
    { name: 'Pending', value: overview.pendingBeneficiaries }
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h2><LayoutDashboard size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> System Dashboard</h2>
          <div className="subtitle">Real-time monitoring of the Public Distribution System</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="badge badge-success" style={{ fontSize: 12, padding: '6px 12px' }}><CheckCircle size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> System Online</span>
        </div>
      </div>
      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card primary">
            <div className="stat-icon primary"><Store size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div>
            <div className="stat-info">
              <h4>Total Vendors</h4>
              <div className="stat-value">{overview.totalVendors}</div>
              <div className="stat-sub">Active fair price shops</div>
            </div>
          </div>
          <div className="stat-card info">
            <div className="stat-icon info"><Users size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div>
            <div className="stat-info">
              <h4>Beneficiaries</h4>
              <div className="stat-value">{overview.totalBeneficiaries}</div>
              <div className="stat-sub">Registered in system</div>
            </div>
          </div>
          <div className="stat-card success">
            <div className="stat-icon success"><CheckCircle size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div>
            <div className="stat-info">
              <h4>Distributions</h4>
              <div className="stat-value">{overview.totalDistributions}</div>
              <div className="stat-sub">This month</div>
            </div>
          </div>
          <div className="stat-card accent">
            <div className="stat-icon accent"><TrendingUp size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div>
            <div className="stat-info">
              <h4>Coverage Rate</h4>
              <div className="stat-value">{overview.distributionRate}%</div>
              <div className="stat-sub">{overview.servedBeneficiaries} served / {overview.pendingBeneficiaries} pending</div>
            </div>
          </div>
          <div className="stat-card danger">
            <div className="stat-icon danger"><AlertTriangle size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div>
            <div className="stat-info">
              <h4>Active Alerts</h4>
              <div className="stat-value">{activeAlerts?.length || 0}</div>
              <div className="stat-sub">Require attention</div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div className="card">
            <div className="card-header"><h3><TrendingUp size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Distribution Trend (6 months)</h3></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="colorDist" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                  <Area type="monotone" dataKey="distributions" stroke="#4f46e5" fill="url(#colorDist)" strokeWidth={2} name="Distributions" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3><Target size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Beneficiary Coverage</h3></div>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={i === 0 ? '#22c55e' : '#94a3b8'} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Stock & Vendor Performance */}
        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div className="card">
            <div className="card-header"><h3><Package size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Stock Utilization by Commodity</h3></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stockOverview} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="commodity" type="category" width={70} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                  <Bar dataKey="total_distributed" fill="#4f46e5" name="Distributed" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="total_remaining" fill="#e2e8f0" name="Remaining" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3><Trophy size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Vendor Performance</h3></div>
            <div className="card-body">
              {vendorPerformance?.map((v, i) => {
                const pct = v.total_beneficiaries > 0 ? Math.round(v.served / v.total_beneficiaries * 100) : 0;
                return (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${COLORS[i % COLORS.length]}15`, color: COLORS[i % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{v.shop_name}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.served}/{v.total_beneficiaries}</span>
                      </div>
                      <div className="progress-bar" style={{ height: 6 }}>
                        <div className={`progress-fill ${pct >= 70 ? 'success' : pct >= 40 ? 'warning' : 'danger'}`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, minWidth: 40, textAlign: 'right' }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Alerts & Districts */}
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <h3><AlertTriangle size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Active Alerts</h3>
              <span className="badge badge-danger">{activeAlerts?.length || 0}</span>
            </div>
            <div className="card-body">
              {(!activeAlerts || activeAlerts.length === 0) ? (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 40 }}><CheckCircle size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div>
                  <p>No active alerts</p>
                </div>
              ) : activeAlerts.slice(0, 5).map(a => (
                <div className="alert-card" key={a.id}>
                  <div className={`alert-severity ${a.severity}`}>
                    {a.severity === 'critical' ? <CircleAlert size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> : a.severity === 'high' ? <CircleAlert size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> : a.severity === 'medium' ? <CircleAlert size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> : <Info size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} />}
                  </div>
                  <div className="alert-content">
                    <div className="alert-title">{a.title}</div>
                    <div className="alert-message">{a.message.substring(0, 100)}...</div>
                    <div className="alert-meta">
                      <span className={`badge badge-${a.severity}`}>{a.severity}</span>
                      <span>{a.alert_type.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3><Map size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> District-wise Coverage</h3></div>
            <div className="card-body">
              {districtBreakdown?.map(d => {
                const pct = d.beneficiaries > 0 ? Math.round(d.served / d.beneficiaries * 100) : 0;
                return (
                  <div className="district-row" key={d.district}>
                    <div className="district-name">{d.district}</div>
                    <div className="district-bar-wrap">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.vendors} vendors • {d.beneficiaries} beneficiaries</span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{pct}%</span>
                      </div>
                      <div className="progress-bar" style={{ height: 6 }}>
                        <div className={`progress-fill ${pct >= 70 ? 'success' : pct >= 40 ? 'warning' : 'danger'}`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
