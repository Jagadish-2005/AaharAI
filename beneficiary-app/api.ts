const BACKEND_URL = 'http://localhost:3001'; 

export const api = {
  defaults: { headers: { common: {} as Record<string, string> } },
  async get(url: string) {
    const res = await fetch(`${BACKEND_URL}/api${url}`, {
      headers: { ...this.defaults.headers.common }
    });
    const data = await res.json();
    if (!res.ok) throw { response: { data } };
    return { data };
  },
  async post(url: string, body: any) {
    const res = await fetch(`${BACKEND_URL}/api${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.defaults.headers.common },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw { response: { data } };
    return { data };
  }
};

let _token: string | null = null;
let _user: any = null;

export const setAuthToken = (token: string, user: any) => {
  _token = token;
  _user = user;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export const clearAuth = () => {
  _token = null;
  _user = null;
  delete api.defaults.headers.common['Authorization'];
};

export const getUser = () => _user;
export const getToken = () => _token;
