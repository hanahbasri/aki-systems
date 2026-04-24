export const API_BASE = import.meta.env.VITE_API_URL || "/api";

const TOKEN_KEY = "aki_token";
const USER_KEY = "aki_user";
const REMEMBER_KEY = "aki_remember_me";

const safeStorage = (storage) => {
  try {
    return storage;
  } catch {
    return null;
  }
};

const local = safeStorage(typeof localStorage !== "undefined" ? localStorage : null);
const session = safeStorage(typeof sessionStorage !== "undefined" ? sessionStorage : null);

const readJson = (storage, key) => {
  if (!storage) return null;
  try {
    return JSON.parse(storage.getItem(key));
  } catch {
    return null;
  }
};

const writeValue = (storage, key, value) => {
  if (!storage) return;
  storage.setItem(key, value);
};

const removeValue = (storage, key) => {
  if (!storage) return;
  storage.removeItem(key);
};

const getPrimaryStorage = (rememberMe) => (rememberMe ? local : session);

export const getRememberMe = () => {
  if (!local) return true;
  return local.getItem(REMEMBER_KEY) !== "false";
};

export const setRememberMe = (rememberMe) => {
  if (!local) return;
  local.setItem(REMEMBER_KEY, rememberMe ? "true" : "false");
};

// Token + user storage
export const getToken = () => local?.getItem(TOKEN_KEY) || session?.getItem(TOKEN_KEY) || null;
export const setToken = (token, rememberMe = getRememberMe()) => {
  const storage = getPrimaryStorage(rememberMe);
  writeValue(storage, TOKEN_KEY, token);
  removeValue(rememberMe ? session : local, TOKEN_KEY);
};
export const clearToken = () => {
  removeValue(local, TOKEN_KEY);
  removeValue(session, TOKEN_KEY);
  removeValue(local, USER_KEY);
  removeValue(session, USER_KEY);
};
export const getUser = () => readJson(local, USER_KEY) || readJson(session, USER_KEY);
export const setUser = (user, rememberMe = getRememberMe()) => {
  const storage = getPrimaryStorage(rememberMe);
  writeValue(storage, USER_KEY, JSON.stringify(user));
  removeValue(rememberMe ? session : local, USER_KEY);
};

// API helper with auth header
export async function apiFetchRaw(path, options = {}) {
  const token = getToken();
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
}

export async function apiFetch(path, options = {}) {
  const res = await apiFetchRaw(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (res.headers.get("content-type")?.includes("application/json")) {
    return res.json();
  }
  return res;
}
