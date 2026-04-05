const API_URL = `http://${window.location.hostname}:3001/api`;

class ApiService {
  constructor() {
    this.token = localStorage.getItem('vendor_token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('vendor_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('vendor_token');
    localStorage.removeItem('vendor_user');
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

  get(endpoint) { return this.request(endpoint); }
  post(endpoint, body) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) }); }
  put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }); }

  // Auth
  login(vendorCode, password) { return this.post('/auth/vendor/login', { vendorCode, password }); }

  // Dashboard
  getDashboard() { return this.get('/distribution/vendor-dashboard'); }
  getStock() { return this.get('/distribution/vendor-stock'); }

  // Beneficiaries
  getBeneficiaries(params = '') { return this.get(`/beneficiaries?${params}`); }
  getBeneficiary(id) { return this.get(`/beneficiaries/${id}`); }
  lookupBeneficiary(rationCard) { return this.get(`/beneficiaries/lookup/${rationCard}`); }

  // Distribution
  generateOTP(beneficiaryId, lang = 'en', useVoice = false) { return this.post('/distribution/generate-otp', { beneficiaryId, lang, useVoice }); }
  verifyOTP(beneficiaryId, otp) { return this.post('/distribution/verify-otp', { beneficiaryId, otp }); }
  distribute(beneficiaryId, otpId, items) { return this.post('/distribution/distribute', { beneficiaryId, otpId, items }); }
  getHistory(params = '') { return this.get(`/distribution/history?${params}`); }
}

const api = new ApiService();
export default api;
