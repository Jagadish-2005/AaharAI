import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AuthContext } from '../App';
import { MapPin, Store, AlertTriangle, ArrowRight, CheckCircle2, Box, Home, User, LogOut, Phone, CreditCard, Users } from 'lucide-react';

function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  
  // Grievance form state
  const [issueType, setIssueType] = useState('Vendor Behavior');
  const [description, setDescription] = useState('');
  const [grievanceStatus, setGrievanceStatus] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (!data?.beneficiary?.vendor_id || !user?.id) return;
    
    const socket = io('http://localhost:3001');

    socket.on('connect', () => {
      socket.emit('join', {
        role: 'beneficiary',
        beneficiaryId: user.id,
        vendorId: data.beneficiary.vendor_id
      });
    });

    socket.on('beneficiary:stock_updated', () => {
      fetchDashboard();
    });

    socket.on('stock:updated', (payload) => {
      setData(prev => {
        if (!prev) return prev;
        return { ...prev, vendorStock: payload.stock };
      });
    });

    return () => socket.disconnect();
  }, [data?.beneficiary?.vendor_id, user?.id]);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get('/beneficiaries/me/dashboard');
      setData(res.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const submitGrievance = async (e) => {
    e.preventDefault();
    setGrievanceStatus('submitting');
    try {
      await axios.post('/grievances', { issue_type: issueType, description });
      setGrievanceStatus('success');
      setDescription('');
      setTimeout(() => setGrievanceStatus(null), 5000);
    } catch (err) {
      setGrievanceStatus('error');
      setTimeout(() => setGrievanceStatus(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', height: '100vh', alignItems: 'center' }}>
        <h2 className="animate-fade-in" style={{ color: 'var(--primary-color)' }}>Loading AaharAI...</h2>
      </div>
    );
  }

  if (!data) return <div className="container"><h2>Error loading dashboard</h2></div>;

  return (
    <>
      <div className="container animate-fade-in mt-4 mb-8">
        
        {/* Render HOME Tab */}
        {activeTab === 'home' && (
          <div className="animate-fade-in">
            <header className="mb-4 flex justify-between items-center" style={{ padding: '10px 0' }}>
              <div>
                <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src="/logo.png" alt="Aahar Logo" style={{ height: '1.2em', objectFit: 'contain' }} /> 
                  Welcome, {user.name.split(' ')[0]}!
                </h1>
                <p className="text-lg">Track your rations and local shop updates.</p>
              </div>
              <div 
                className="profile-avatar-small cursor-pointer" 
                onClick={() => setActiveTab('profile')}
                title="View Profile"
              >
                {user.name.charAt(0)}
              </div>
            </header>

            <div className="grid grid-cols-3">
              {/* Rations Allocated vs Picked Up */}
              <div className="glass-panel" style={{ gridColumn: '1 / -1' }}>
                <h2 className="mb-4">My Ration Quota <span style={{fontWeight: 400, color: 'var(--text-secondary)'}}>({new Date(0, data.month - 1).toLocaleString('default', { month: 'long' })} {data.year})</span></h2>
                
                <div className="grid grid-cols-2">
                  {data.entitlements.map(item => {
                    const percentage = (item.collectedQty / item.entitledQty) * 100;
                    return (
                      <div key={item.commodityId} className="flex-col gap-2" style={{ padding: '20px', background: 'rgba(255,255,255,0.7)', borderRadius: '16px' }}>
                        <div className="flex justify-between items-center mb-2">
                          <h3 style={{ fontSize: '1.3rem', color: 'var(--text-primary)' }}>{item.commodityName}</h3>
                          <span className={`badge ${item.status === 'collected' ? 'badge-success' : item.status === 'partial' ? 'badge-warning' : 'badge-danger'}`}>
                            {item.status}
                          </span>
                        </div>
                        
                        <div className="flex justify-between text-sm" style={{ fontWeight: 600 }}>
                          <span style={{ color: 'var(--primary-color)' }}>Collected: {item.collectedQty} {item.unit}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>Total: {item.entitledQty} {item.unit}</span>
                        </div>
                        
                        <div className="progress-container">
                          <div 
                            className="progress-bar" 
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: percentage === 100 ? 'var(--success-color)' : 'var(--primary-color)' 
                            }} 
                          />
                        </div>
                        <p className="mt-2 text-sm" style={{ fontWeight: 600, color: '#334155' }}>Remaining to pickup: {item.remainingQty} {item.unit}</p>
                      </div>
                    )
                  })}
                  
                  {data.entitlements.length === 0 && (
                    <p style={{ padding: '20px' }}>No entitlements found for this month.</p>
                  )}
                </div>
              </div>

              {/* Vendor Live Stock */}
              <div className="glass-panel flex-col" style={{ gridColumn: 'span 1' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Box size={26} color="var(--secondary-color)" />
                  <h2>Live Shop Availability</h2>
                </div>
                <p className="mb-4 text-sm">Real-time stock currently available at <strong style={{ color: 'var(--text-primary)' }}>{data.beneficiary.shop_name}</strong>.</p>
                
                <div className="flex-col gap-4 mt-2">
                  {data.vendorStock.length > 0 ? data.vendorStock.map(stock => (
                    <div key={stock.commodity_name} className="flex justify-between items-center" style={{ paddingBottom: '12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{stock.commodity_name}</span>
                      <span className="badge badge-success" style={{ fontSize: '1rem', padding: '6px 14px' }}>{stock.remaining_qty} {stock.unit}</span>
                    </div>
                  )) : <p>No stock data available right now.</p>}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Render GRIEVANCE Tab */}
        {activeTab === 'grievance' && (
          <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="glass-panel flex-col mb-6 text-center" style={{ padding: '40px 20px', background: 'linear-gradient(135deg, rgba(255,255,255,0.7), rgba(254,226,226,0.7))' }}>
              <AlertTriangle size={48} color="var(--danger-color)" style={{ margin: '0 auto', marginBottom: '16px' }} />
              <h1 className="mb-2" style={{ fontSize: '2rem' }}>Report an Issue</h1>
              <p className="text-sm">Submit your grievances directly to the administrative authorities.</p>
            </div>

            <div className="glass-panel flex-col">
              <form className="flex-col gap-4" onSubmit={submitGrievance}>
                {grievanceStatus === 'success' && (
                  <div className="badge badge-success flex items-center justify-center gap-2 p-3 w-full mb-2">
                    <CheckCircle2 size={18} /> Grievance sent directly to Admin!
                  </div>
                )}
                
                <div className="form-group mb-2">
                  <label className="form-label">Issue Type</label>
                  <select 
                    className="form-select"
                    value={issueType}
                    onChange={e => setIssueType(e.target.value)}
                    required
                  >
                    <option value="Vendor Behavior">Vendor Behavior</option>
                    <option value="Stock Not Given">Stock Not Given</option>
                    <option value="Quality Missing">Poor Quality of Grain</option>
                    <option value="Overcharging">Overcharging / Asking for money</option>
                    <option value="Shop Closed">Shop consistently closed</option>
                  </select>
                </div>
                
                <div className="form-group mb-2">
                  <label className="form-label">Details</label>
                  <textarea 
                    className="form-textarea"
                    rows="3"
                    placeholder="Explain what happened..."
                    required
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  ></textarea>
                </div>
                
                <button 
                  type="submit" 
                  className="btn btn-danger flex items-center justify-center mt-4 w-full"
                  disabled={grievanceStatus === 'submitting'}
                  style={{ padding: '16px', fontSize: '1.1rem' }}
                >
                  {grievanceStatus === 'submitting' ? 'Submitting...' : 'Submit Grievance'} <ArrowRight size={20} />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Render PROFILE Tab */}
        {activeTab === 'profile' && (
          <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="glass-panel flex-col items-center mb-6 text-center" style={{ padding: '40px 20px' }}>
              <div className="profile-avatar">
                {user.name.charAt(0)}
              </div>
              <h1 className="mb-2" style={{ fontSize: '2rem' }}>{user.name}</h1>
              <span className="badge badge-info">{data.beneficiary.card_type} RATION HOLDER</span>
            </div>

            <div className="glass-panel mb-6">
              <h2 className="mb-4">Personal Details</h2>
              
              <div className="profile-detail-row">
                <div className="flex items-center gap-3">
                  <CreditCard size={20} color="var(--primary-color)" />
                  <span className="form-label">Ration Card ID</span>
                </div>
                <span style={{ fontWeight: 600 }}>{user.rationCardNo}</span>
              </div>
              
              <div className="profile-detail-row">
                <div className="flex items-center gap-3">
                  <Phone size={20} color="var(--primary-color)" />
                  <span className="form-label">Mobile Number</span>
                </div>
                <span style={{ fontWeight: 600 }}>{user.phone}</span>
              </div>
              
              <div className="profile-detail-row">
                <div className="flex items-center gap-3">
                  <Users size={20} color="var(--primary-color)" />
                  <span className="form-label">Family Size</span>
                </div>
                <span style={{ fontWeight: 600 }}>{data.beneficiary.family_size} Members</span>
              </div>
            </div>

            <div className="glass-panel mb-6">
              <h2 className="mb-4">My Assigned Vendor</h2>
              
              <div className="profile-detail-row">
                <div className="flex items-center gap-3">
                  <Store size={20} color="var(--secondary-color)" />
                  <span className="form-label">Shop Name</span>
                </div>
                <span style={{ fontWeight: 600 }}>{data.beneficiary.shop_name}</span>
              </div>
              
              <div className="profile-detail-row">
                <div className="flex items-center gap-3">
                  <User size={20} color="var(--secondary-color)" />
                  <span className="form-label">Vendor Name</span>
                </div>
                <span style={{ fontWeight: 600 }}>{data.beneficiary.vendor_name}</span>
              </div>
              
              <div className="profile-detail-row">
                <div className="flex items-center gap-3">
                  <MapPin size={20} color="var(--secondary-color)" />
                  <span className="form-label">Location</span>
                </div>
                <span style={{ fontWeight: 600, textAlign: 'right' }}>{data.beneficiary.location}</span>
              </div>
            </div>

            <button 
              onClick={logout} 
              className="btn flex items-center justify-center w-full"
              style={{ backgroundColor: '#fff', color: 'var(--danger-color)', border: '2px solid var(--danger-color)', fontSize: '1.1rem', padding: '16px' }}
            >
              <LogOut size={20} /> Secure Logout
            </button>
          </div>
        )}
      </div>

      {/* Modern App Bottom Navigation */}
      <nav className="bottom-nav">
        <button 
          className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} 
          onClick={() => setActiveTab('home')}
        >
          <Home size={24} />
          <span>Home</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'grievance' ? 'active' : ''}`} 
          onClick={() => setActiveTab('grievance')}
        >
          <AlertTriangle size={24} />
          <span>Grievance</span>
        </button>
      </nav>
    </>
  );
}

export default Dashboard;
