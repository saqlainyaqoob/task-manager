// Central fetch helper. Adds the login token (if any) or the guest id to every request.
const TOKEN_KEY = 'tm_token';
const GUEST_KEY = 'tm_guest';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

// Guests get a random id stored in this browser; their tasks are tied to it.
export function getGuestId() {
  let id = localStorage.getItem(GUEST_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `g-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(GUEST_KEY, id);
  }
  return id;
}

async function request(path = '', options = {}) {
  const headers = { 'Content-Type': 'application/json', 'X-Guest-Id': getGuestId() };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch('/api' + path, { ...options, headers });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) {
      setToken(null);
      window.dispatchEvent(new Event('auth-expired'));
    }
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return body.data;
}

const json = (method, data) => ({ method, body: JSON.stringify(data) });

// tasks
export const getTasks = () => request('/tasks');
export const createTask = (t) => request('/tasks', json('POST', t));
export const replaceTask = (id, t) => request(`/tasks/${id}`, json('PUT', t));
export const patchTask = (id, c) => request(`/tasks/${id}`, json('PATCH', c));
export const deleteTask = (id) => request(`/tasks/${id}`, { method: 'DELETE' });

// auth + profile (guestId lets the server move guest tasks into the new account)
export const register = (d) => request('/auth/register', json('POST', { ...d, guestId: getGuestId() }));
export const login = (d) => request('/auth/login', json('POST', { ...d, guestId: getGuestId() }));
export const me = () => request('/auth/me');
export const updateMe = (d) => request('/auth/me', json('PATCH', d));
