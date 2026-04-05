import { ClipboardList, Inbox } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../services/api';

export default function HistoryPage() {
  const [distributions, setDistributions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getHistory().then(data => setDistributions(data.distributions || []))
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <h2><ClipboardList size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Distribution History</h2>
        <div className="subtitle">View all past distribution transactions</div>
      </div>
      <div className="page-body">
        <div className="card">
          <div className="card-body">
            {loading ? <div className="spinner"></div> : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Beneficiary</th>
                      <th>Ration Card</th>
                      <th>Commodity</th>
                      <th>Quantity</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distributions.length === 0 ? (
                      <tr><td colSpan="7"><div className="empty-state" style={{padding:30}}><div className="empty-icon"><Inbox size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div><h3>No distributions yet</h3></div></td></tr>
                    ) : distributions.map(d => (
                      <tr key={d.transaction_id}>
                        <td><code style={{ fontSize: 11, background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>{d.transaction_id}</code></td>
                        <td style={{ fontWeight: 600 }}>{d.beneficiary_name}</td>
                        <td>{d.ration_card_no}</td>
                        <td>{d.commodity_name}</td>
                        <td>{d.quantity} {d.unit}</td>
                        <td><span className={`badge ${d.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>{d.status}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(d.distributed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
