import { Store, Users, Clock, CheckCircle, RefreshCw, Package, Search, Phone, Mail, FileText, MapPin, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../services/api';

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorDetail, setVendorDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [isSearching, setIsSearching] = useState(false);

  const m = new Date().getMonth() + 1;
  const y = new Date().getFullYear();

  useEffect(() => {
    api.getVendors(m, y).then(data => setVendors(data.vendors || []))
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  const openVendor = async (vendor) => {
    setSelectedVendor(vendor);
    setSearchQuery('');
    setSearchResults(null);
    setFilterStatus('all');
    setDetailLoading(true);
    try {
      const data = await api.getVendor(vendor.id, m, y);
      setVendorDetail(data);
    } catch (err) { console.error(err); }
    finally { setDetailLoading(false); }
  };

  const handleBeneficiarySearch = async (e) => {
    if (e) e.preventDefault();
    if (!selectedVendor) return;
    setIsSearching(true);
    try {
      const qs = new URLSearchParams({ vendor_id: selectedVendor.id, status: filterStatus });
      if (searchQuery.trim()) qs.append('search', searchQuery.trim());
      const res = await api.getBeneficiaries(qs.toString());
      setSearchResults(res.beneficiaries || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (selectedVendor && searchResults !== null) {
      handleBeneficiarySearch();
    }
  }, [filterStatus]);

  if (loading) return <div className="spinner"></div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h2><Store size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Vendors</h2>
          <div className="subtitle">Monitor and manage all fair price shops</div>
        </div>
        <div className="badge badge-info" style={{ padding: '6px 14px', fontSize: 13 }}>
          {vendors.length} vendors
        </div>
      </div>
      <div className="page-body">
        {selectedVendor && vendorDetail ? (
          // Vendor Detail View
          <div>
            <button className="btn btn-outline btn-sm" onClick={() => { setSelectedVendor(null); setVendorDetail(null); setSearchResults(null); }} style={{ marginBottom: 20 }}>
              ← Back to All Vendors
            </button>

            {detailLoading ? <div className="spinner"></div> : (
              <>
                <div className="card" style={{ marginBottom: 20 }}>
                  <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 'var(--radius)', background: 'linear-gradient(135deg, var(--primary-100), var(--primary-200))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>
                      {vendorDetail.vendor.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: 20, fontWeight: 700 }}>{vendorDetail.vendor.shop_name}</h3>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {vendorDetail.vendor.vendor_code} • {vendorDetail.vendor.location} • {vendorDetail.vendor.district}
                      </div>
                    </div>
                    <span className={`badge ${vendorDetail.vendor.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {vendorDetail.vendor.is_active ? '● Active' : '● Inactive'}
                    </span>
                  </div>
                </div>

                {/* Contact & Registration Info Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                  <div className="card">
                    <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                      <h3 style={{ fontSize: 16, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><User size={18} /> Contact Information</h3>
                    </div>
                    <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ background: 'var(--primary-50)', padding: 8, borderRadius: 'var(--radius)', color: 'var(--primary)' }}><User size={18} /></div>
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Owner Name</div>
                          <div style={{ fontWeight: 600 }}>{vendorDetail.vendor.name}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ background: 'var(--primary-50)', padding: 8, borderRadius: 'var(--radius)', color: 'var(--primary)' }}><Phone size={18} /></div>
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Phone Number</div>
                          <div style={{ fontWeight: 600 }}>+91 {vendorDetail.vendor.phone}</div>
                        </div>
                      </div>
                      {vendorDetail.vendor.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ background: 'var(--primary-50)', padding: 8, borderRadius: 'var(--radius)', color: 'var(--primary)' }}><Mail size={18} /></div>
                          <div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Email Address</div>
                            <div style={{ fontWeight: 600 }}>{vendorDetail.vendor.email}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="card">
                    <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                      <h3 style={{ fontSize: 16, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={18} /> Registration Details</h3>
                    </div>
                    <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ background: 'var(--primary-50)', padding: 8, borderRadius: 'var(--radius)', color: 'var(--primary)' }}><FileText size={18} /></div>
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>License Number</div>
                          <div style={{ fontWeight: 600 }}>{vendorDetail.vendor.license_no}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ background: 'var(--primary-50)', padding: 8, borderRadius: 'var(--radius)', color: 'var(--primary)' }}><Store size={18} /></div>
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Vendor Code</div>
                          <div style={{ fontWeight: 600 }}>{vendorDetail.vendor.vendor_code}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ background: 'var(--primary-50)', padding: 8, borderRadius: 'var(--radius)', color: 'var(--primary)' }}><MapPin size={18} /></div>
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Full Address</div>
                          <div style={{ fontWeight: 600 }}>{vendorDetail.vendor.location}, {vendorDetail.vendor.district}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  <div className="stat-card primary">
                    <div className="stat-icon primary"><Users size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div>
                    <div className="stat-info"><h4>Total</h4><div className="stat-value">{vendorDetail.beneficiaryStats?.total || 0}</div></div>
                  </div>
                  <div className="stat-card success">
                    <div className="stat-icon success"><CheckCircle size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div>
                    <div className="stat-info"><h4>Collected</h4><div className="stat-value">{vendorDetail.beneficiaryStats?.collected || 0}</div></div>
                  </div>
                  <div className="stat-card accent">
                    <div className="stat-icon accent"><RefreshCw size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div>
                    <div className="stat-info"><h4>Partial</h4><div className="stat-value">{vendorDetail.beneficiaryStats?.partial || 0}</div></div>
                  </div>
                  <div className="stat-card danger">
                    <div className="stat-icon danger"><Clock size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div>
                    <div className="stat-info"><h4>Pending</h4><div className="stat-value">{vendorDetail.beneficiaryStats?.pending || 0}</div></div>
                  </div>
                </div>

                {/* Stock Table */}
                <div className="card" style={{ marginBottom: 20 }}>
                  <div className="card-header"><h3><Package size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Stock Details</h3></div>
                  <div className="card-body">
                    <div className="table-container">
                      <table>
                        <thead><tr><th>Commodity</th><th>Allocated</th><th>Distributed</th><th>Remaining</th><th>Utilization</th></tr></thead>
                        <tbody>
                          {vendorDetail.stock?.map(s => {
                            const pct = s.allocated_qty > 0 ? Math.round(s.distributed_qty / s.allocated_qty * 100) : 0;
                            return (
                              <tr key={s.commodity_name}>
                                <td style={{ fontWeight: 600 }}>{s.commodity_name}</td>
                                <td>{s.allocated_qty} {s.unit}</td>
                                <td>{s.distributed_qty} {s.unit}</td>
                                <td>{s.remaining_qty} {s.unit}</td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div className="progress-bar" style={{ width: 100, height: 6 }}>
                                      <div className={`progress-fill ${pct >= 70 ? 'success' : pct >= 40 ? 'warning' : 'danger'}`} style={{ width: `${pct}%` }}></div>
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 600 }}>{pct}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Recent Distributions */}
                <div className="card">
                  <div className="card-header"><h3><Clock size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Recent Distributions</h3></div>
                  <div className="card-body">
                    <div className="table-container">
                      <table>
                        <thead><tr><th>TXN ID</th><th>Beneficiary</th><th>Ration Card</th><th>Commodity</th><th>Qty</th><th>Date</th></tr></thead>
                        <tbody>
                          {vendorDetail.recentDistributions?.length === 0 ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No distributions yet</td></tr>
                          ) : vendorDetail.recentDistributions?.map(d => (
                            <tr key={d.transaction_id}>
                              <td><code style={{ fontSize: 11, background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>{d.transaction_id}</code></td>
                              <td style={{ fontWeight: 600 }}>{d.beneficiary_name}</td>
                              <td>{d.ration_card_no}</td>
                              <td>{d.commodity_name}</td>
                              <td>{d.quantity} {d.unit}</td>
                              <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(d.distributed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Beneficiary Search under Vendor */}
            {!detailLoading && vendorDetail && (
              <div className="card" style={{ marginTop: 20 }}>
                <div className="card-header">
                  <h3><Search size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Search Assigned Beneficiaries</h3>
                </div>
                <div className="card-body">
                  <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 15 }}>
                    {['all', 'collected', 'partial', 'pending'].map(status => (
                      <button
                        key={status}
                        className={`btn ${filterStatus === status ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => {
                          setFilterStatus(status);
                          // Auto trigger search if not already loaded
                          if (searchResults === null) handleBeneficiarySearch();
                        }}
                        style={{ textTransform: 'capitalize', fontSize: 13, padding: '6px 12px' }}
                      >
                        {status === 'all' ? 'All Beneficiaries' : status}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleBeneficiarySearch} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Search by RC Number, Name, or Phone..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button type="submit" className="btn btn-primary" disabled={isSearching}>
                      {isSearching ? <><Clock size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Searching...</> : 'Search'}
                    </button>
                    {searchResults !== null && (
                      <button type="button" className="btn btn-outline" onClick={() => { setSearchQuery(''); setFilterStatus('all'); setSearchResults(null); }}>
                        Clear
                      </button>
                    )}
                  </form>

                  {searchResults !== null && (
                    <div className="table-container">
                      {searchResults.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                          No beneficiaries found matching "{searchQuery}" under this vendor.
                        </div>
                      ) : (
                        <table>
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Ration Card</th>
                              <th>Phone</th>
                              <th>Card Type</th>
                              <th>Family Size</th>
                              <th>Current Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {searchResults.map(b => (
                              <tr key={b.id}>
                                <td style={{ fontWeight: 600 }}>{b.name}</td>
                                <td><code>{b.ration_card_no}</code></td>
                                <td>{b.phone}</td>
                                <td><span className="badge badge-info">{b.card_type}</span></td>
                                <td>{b.family_size}</td>
                                <td>
                                  <span className={`badge ${
                                    b.overallStatus === 'collected' ? 'badge-success' : 
                                    b.overallStatus === 'partial' ? 'badge-warning' : 'badge-danger'
                                  }`}>
                                    {b.overallStatus.toUpperCase()}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Vendor Grid View
          <div className="vendor-cards">
            {vendors.map(v => {
              const pct = v.beneficiary_count > 0 && v.total_allocated > 0
                ? Math.round(v.total_distributed / v.total_allocated * 100) : 0;
              return (
                <div className="vendor-card" key={v.id} onClick={() => openVendor(v)}>
                  <div className="vendor-header">
                    <div className="vendor-avatar">{v.name.charAt(0)}</div>
                    <div>
                      <div className="vendor-name">{v.shop_name}</div>
                      <div className="vendor-code">{v.vendor_code} • {v.district}</div>
                    </div>
                    <span className={`badge ${v.is_active ? 'badge-success' : 'badge-danger'}`} style={{ marginLeft: 'auto' }}>
                      {v.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Stock utilization</span>
                      <span style={{ fontWeight: 600 }}>{pct}%</span>
                    </div>
                    <div className="progress-bar" style={{ height: 6 }}>
                      <div className={`progress-fill ${pct >= 70 ? 'success' : pct >= 40 ? 'warning' : 'danger'}`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                  <div className="vendor-stats">
                    <div className="vendor-stat">
                      <div className="v-value">{v.beneficiary_count}</div>
                      <div className="v-label">Beneficiaries</div>
                    </div>
                    <div className="vendor-stat">
                      <div className="v-value">{v.distribution_count}</div>
                      <div className="v-label">Distributions</div>
                    </div>
                    <div className="vendor-stat">
                      <div className="v-value" style={{ color: 'var(--primary)' }}>{Math.round(v.total_remaining || 0)}</div>
                      <div className="v-label">Stock Left</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
