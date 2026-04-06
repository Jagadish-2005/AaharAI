import React, { useState, useContext } from 'react';
import { AuthContext } from '../App';

function Login() {
  const { login } = useContext(AuthContext);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await login(phone);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="glass-panel login-card animate-fade-in">
        <div className="flex-col items-center justify-center mb-6">
          <h1 style={{ fontSize: '2rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <img src="/logo.png" alt="Aahar Logo" style={{ height: '1.2em', objectFit: 'contain' }} /> 
            Aahar AI
          </h1>
          <p>Citizen Portal Login</p>
        </div>

        {error && (
          <div className="badge badge-danger mb-4" style={{ width: '100%', padding: '12px', textAlign: 'center', borderRadius: '8px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="phone">Registered Phone Number</label>
            <input 
              id="phone"
              type="tel" 
              className="form-input" 
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%' }}
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
