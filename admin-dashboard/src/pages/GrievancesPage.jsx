import { Handshake } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../services/api';
import { io } from 'socket.io-client';

export default function GrievancesPage() {
  const [vendorData, setVendorData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGrievances();

    // Setup real-time updates
    const socket = io('http://localhost:3001');
    socket.on('connect', () => {
      socket.emit('join', { role: 'admin' });
    });
    
    socket.on('grievance:new', () => {
      fetchGrievances();
    });

    return () => socket.disconnect();
  }, []);

  const fetchGrievances = async () => {
    try {
      const data = await api.getGrievances();
      setVendorData(data.vendorsWithGrievances || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Public Grievances</h2>
          <div className="subtitle">Beneficiary complaints and issue reports organized by vendor</div>
        </div>
      </div>

      <div className="page-body">
        {vendorData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Handshake size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div>
            <h3>No complaints filed</h3>
            <p>All vendor distribution chains currently have clean records.</p>
          </div>
        ) : (
          <div className="grievances-list" style={{ display: 'grid', gap: '24px' }}>
            {vendorData.map((v) => (
              <div key={v.vendor_id} className="card">
                <div className="card-header" style={{ background: 'var(--primary-50)', borderBottom: '2px solid var(--primary-200)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="vendor-avatar" style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {v.shop_name ? v.shop_name.charAt(0) : '?'}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16 }}>{v.shop_name || 'Unknown Vendor'}</h3>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Code: {v.vendor_code}</span>
                    </div>
                  </div>
                  <div className="badge badge-warning">
                    {v.grievances.length} {v.grievances.length === 1 ? 'Report' : 'Reports'}
                  </div>
                </div>
                
                <div className="card-body" style={{ padding: 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                      <tr>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)' }}>Date</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)' }}>Beneficiary</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)' }}>Type</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)' }}>Description</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {v.grievances.map((g) => (
                        <tr key={g.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '16px', fontSize: 14 }}>
                            {new Date(g.created_at).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px' }}>
                            <div style={{ fontWeight: 600 }}>{g.beneficiary_name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{g.ration_card_no}</div>
                          </td>
                          <td style={{ padding: '16px', fontSize: 14 }}>
                            <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>
                              {g.issue_type ? g.issue_type.replace('_', ' ') : 'Unknown'}
                            </span>
                          </td>
                          <td style={{ padding: '16px', fontSize: 14, color: 'var(--text-secondary)', maxWidth: 300, whiteSpace: 'normal', lineHeight: 1.4 }}>
                            {g.description}
                          </td>
                          <td style={{ padding: '16px', fontSize: 14 }}>
                            <span className={`badge ${
                              g.status === 'resolved' ? 'badge-success' : 
                              g.status === 'pending' ? 'badge-danger' : 
                              'badge-warning'
                            }`}>
                              {g.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
