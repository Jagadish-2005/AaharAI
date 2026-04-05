import { Users, Clock, CheckCircle, RefreshCw, Search, Inbox } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../services/api';

export default function BeneficiariesPage() {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchBeneficiaries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const data = await api.getBeneficiaries(params.toString());
      setBeneficiaries(data.beneficiaries || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBeneficiaries(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchBeneficiaries(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filtered = filter === 'all' ? beneficiaries : beneficiaries.filter(b => b.overallStatus === filter);

  return (
    <>
      <div className="page-header">
        <h2><Users size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Beneficiaries</h2>
        <div className="subtitle">Manage and view your assigned beneficiaries</div>
      </div>
      <div className="page-body">
        <div className="card">
          <div className="card-body">
            <div className="search-bar">
              <span className="search-icon"><Search size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></span>
              <input
                id="beneficiary-search"
                type="text"
                placeholder="Search by name, ration card, or phone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="filter-tabs">
              {['all', 'collected', 'partial', 'pending'].map(f => (
                <button
                  key={f}
                  className={`filter-tab ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? `All (${beneficiaries.length})` :
                   f === 'collected' ? <><CheckCircle size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Collected ({beneficiaries.filter(b => b.overallStatus === 'collected').length})</> :
                   f === 'partial' ? <><RefreshCw size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Partial ({beneficiaries.filter(b => b.overallStatus === 'partial').length})</> :
                   <><Clock size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Pending ({beneficiaries.filter(b => b.overallStatus === 'pending').length})</>}
                </button>
              ))}
            </div>

            {loading ? <div className="spinner"></div> : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Ration Card</th>
                      <th>Card Type</th>
                      <th>Family Size</th>
                      <th>Phone</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan="6"><div className="empty-state" style={{padding:30}}><div className="empty-icon"><Inbox size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div><h3>No beneficiaries found</h3></div></td></tr>
                    ) : filtered.map(b => (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 600 }}>{b.name}</td>
                        <td><code style={{ background: 'var(--primary-50)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>{b.ration_card_no}</code></td>
                        <td><span className={`badge ${b.card_type === 'AAY' ? 'badge-danger' : b.card_type === 'PHH' ? 'badge-warning' : b.card_type === 'BPL' ? 'badge-info' : 'badge-pending'}`}>{b.card_type}</span></td>
                        <td>{b.family_size} members</td>
                        <td>{b.phone || '—'}</td>
                        <td>
                          <span className={`badge ${b.overallStatus === 'collected' ? 'badge-success' : b.overallStatus === 'partial' ? 'badge-warning' : 'badge-pending'}`}>
                            {b.overallStatus === 'collected' ? <><CheckCircle size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Collected</> : b.overallStatus === 'partial' ? <><RefreshCw size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Partial</> : <><Clock size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Pending</>}
                          </span>
                        </td>
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
