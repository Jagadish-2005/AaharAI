import { Users, ClipboardList, Clock, CheckCircle, Package, LayoutDashboard, Inbox } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../services/api';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner"></div>;
  if (!data) return <div className="empty-state"><div className="empty-icon"><LayoutDashboard size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div><h3>Failed to load dashboard</h3></div>;

  const stockColors = ['#0f766e', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];

  return (
    <>
      <div className="page-header">
        <h2><LayoutDashboard size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Dashboard</h2>
        <div className="subtitle">Overview of your shop&apos;s distribution activity</div>
      </div>
      <div className="page-body">
        <div className="stats-grid">
          <div className="stat-card primary">
            <div className="stat-icon primary"><Users size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div>
            <div className="stat-info">
              <h4>Total Beneficiaries</h4>
              <div className="stat-value">{data.totalBeneficiaries}</div>
              <div className="stat-sub">Assigned to your shop</div>
            </div>
          </div>
          <div className="stat-card success">
            <div className="stat-icon success"><CheckCircle size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div>
            <div className="stat-info">
              <h4>Served</h4>
              <div className="stat-value">{data.servedBeneficiaries}</div>
              <div className="stat-sub">{data.totalBeneficiaries > 0 ? Math.round(data.servedBeneficiaries/data.totalBeneficiaries*100) : 0}% completed</div>
            </div>
          </div>
          <div className="stat-card accent">
            <div className="stat-icon accent"><Clock size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div>
            <div className="stat-info">
              <h4>Pending</h4>
              <div className="stat-value">{data.pendingBeneficiaries}</div>
              <div className="stat-sub">Yet to collect</div>
            </div>
          </div>
          <div className="stat-card danger">
            <div className="stat-icon danger"><ClipboardList size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div>
            <div className="stat-info">
              <h4>Today&apos;s Distributions</h4>
              <div className="stat-value">{data.todayDistributions}</div>
              <div className="stat-sub">Completed today</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <div className="card-header"><h3><Package size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Stock Overview</h3></div>
            <div className="card-body">
              <div className="stock-bars">
                {data.stock.map((s, i) => {
                  const pct = s.allocated_qty > 0 ? (s.distributed_qty / s.allocated_qty * 100) : 0;
                  return (
                    <div className="stock-item" key={s.commodity_name}>
                      <div className="commodity-name">{s.commodity_name}</div>
                      <div className="bar-wrapper">
                        <div className="bar-fill" style={{ width: `${Math.max(pct, 5)}%`, background: stockColors[i % stockColors.length] }}>
                          {pct.toFixed(0)}%
                        </div>
                      </div>
                      <div className="stock-values">
                        {s.remaining_qty}/{s.allocated_qty} {s.unit}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3><Clock size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Recent Activity</h3></div>
            <div className="card-body">
              {data.recentActivity.length === 0 ? (
                <div className="empty-state" style={{ padding: 30 }}>
                  <div className="empty-icon"><Inbox size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div>
                  <h3>No recent activity</h3>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {data.recentActivity.slice(0, 6).map(d => (
                    <div key={d.transaction_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--primary-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CheckCircle size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{d.beneficiary_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.commodity_name} – {d.quantity} {d.unit}</div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {new Date(d.distributed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
