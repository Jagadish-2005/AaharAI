const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001/api`;

class AdminApi {
  constructor() {
    this.token = localStorage.getItem('admin_token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('admin_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  }

  async request(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) { this.clearToken(); window.location.href = '/'; }
      throw new Error(data.error || 'Request failed');
    }
    return data;
  }

  get(e) { return this.request(e); }
  post(e, b) { return this.request(e, { method: 'POST', body: JSON.stringify(b) }); }
  put(e, b) { return this.request(e, { method: 'PUT', body: JSON.stringify(b) }); }

  login(username, password) { return this.post('/auth/admin/login', { username, password }); }
  getDashboard(month, year) { return this.get(`/analytics/dashboard?month=${month}&year=${year}`); }
  getTrends() { return this.get('/analytics/trend'); }
  getVendors(month, year) { return this.get(`/vendors?month=${month}&year=${year}`); }
  getVendor(id, month, year) { return this.get(`/vendors/${id}?month=${month}&year=${year}`); }
  toggleVendor(id) { return this.put(`/vendors/${id}/toggle`); }
  getAlerts(params = '') { return this.get(`/alerts?${params}`); }
  resolveAlert(id) { return this.put(`/alerts/${id}/resolve`); }
  runDetection() { return this.post('/alerts/run-detection'); }
  runDemandPrediction() { return this.post('/alerts/predict-demand', {}); }
  getBeneficiaries(params = '') { return this.get(`/beneficiaries?${params}`); }
  getDistHistory(params = '') { return this.get(`/distribution/history?${params}`); }
  getGrievances() { return this.get('/grievances'); }
}

const adminApi = new AdminApi();
export default adminApi;
