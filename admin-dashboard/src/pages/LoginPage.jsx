import { Clock, Shield } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
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
          <div className="login-logo"><Shield size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /></div>
          <h2>Admin Dashboard</h2>
          <p>Aahar AI – PDS Monitoring System</p>
        </div>
        {error && <div className="login-error">⚠️ {error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input id="admin-user-input" className="form-input" type="text" placeholder="admin" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input id="admin-pass-input" className="form-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button id="admin-login-btn" className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
            {loading ? <><Clock size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Signing in...</> : 'Sign In to Admin'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
          Demo: admin / admin123
        </p>
      </div>
    </div>
  );
}
