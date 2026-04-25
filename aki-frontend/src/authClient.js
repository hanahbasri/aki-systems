export const API_BASE = import.meta.env.VITE_API_URL || "/api";

const TOKEN_KEY = "aki_token";
const USER_KEY = "aki_user";

const local = typeof localStorage !== "undefined" ? localStorage : null;

const readJson = (key) => {
  if (!local) return null;
  try {
    return JSON.parse(local.getItem(key));
  } catch {
    return null;
  }
};

export const getToken = () => local?.getItem(TOKEN_KEY) || null;
export const setToken = (token) => local?.setItem(TOKEN_KEY, token);
export const clearToken = () => {
  local?.removeItem(TOKEN_KEY);
  local?.removeItem(USER_KEY);
};
export const getUser = () => readJson(USER_KEY);
export const setUser = (user) => local?.setItem(USER_KEY, JSON.stringify(user));

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
