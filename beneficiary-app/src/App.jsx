import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import axios from 'axios';

// Create an auth context to hold user state
export const AuthContext = React.createContext(null);

// Configure backend URL
const API_URL = 'http://localhost:3001/api';
axios.defaults.baseURL = API_URL;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('beneficiary_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const res = await axios.get('/auth/me');
      if (res.data.type === 'beneficiary') {
        setUser(res.data.user);
      } else {
        logout(); // Not a beneficiary token
      }
    } catch (err) {
      console.error('Failed to fetch user', err);
      localStorage.removeItem('beneficiary_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (phone) => {
    try {
      const res = await axios.post('/auth/beneficiary/login', { phone });
      localStorage.setItem('beneficiary_token', res.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      setUser(res.data.user);
      navigate('/dashboard');
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Login failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('beneficiary_token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="login-container">
        <div className="glass-panel">
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>
    </AuthContext.Provider>
  );
}

export default App;
