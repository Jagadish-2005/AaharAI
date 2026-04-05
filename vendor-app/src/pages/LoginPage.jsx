import { Store, Clock } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [vendorCode, setVendorCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(vendorCode, password);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo"><Store size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div>
          <h2>Vendor Portal</h2>
          <p>Aahar AI – Public Distribution System</p>
        </div>
        
        {error && <div className="login-error">⚠️ {error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Vendor Code</label>
            <input
              id="vendor-code-input"
              className="form-input"
              type="text"
              placeholder="e.g. VND001"
              value={vendorCode}
              onChange={(e) => setVendorCode(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="vendor-password-input"
              className="form-input"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button 
            id="vendor-login-btn"
            className="btn btn-primary btn-lg" 
            type="submit" 
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
          >
            {loading ? <><Clock size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Signing in...</> : 'Sign In'}
          </button>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
          Demo: VND001 / vendor123
        </p>
      </div>
    </div>
  );
}
