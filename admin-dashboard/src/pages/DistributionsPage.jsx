import { ClipboardList } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../services/api';

export default function DistributionsPage() {
  const [distributions, setDistributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const m = new Date().getMonth() + 1;
    const y = new Date().getFullYear();
    api.getDistHistory(`month=${m}&year=${y}&limit=100`)
      .then(data => {
        setDistributions(data.distributions || []);
        setTotal(data.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <div>
          <h2><ClipboardList size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Distributions</h2>
          <div className="subtitle">All distribution transactions across vendors</div>
        </div>
        <div className="badge badge-info" style={{ padding: '6px 14px', fontSize: 13 }}>
          {total} total
        </div>
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
                      <th>Vendor</th>
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
                      <tr><td colSpan="8" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No distributions found</td></tr>
                    ) : distributions.map(d => (
                      <tr key={d.transaction_id}>
                        <td><code style={{ fontSize: 11, background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>{d.transaction_id}</code></td>
                        <td>{d.vendor_name}</td>
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
