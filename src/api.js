import Cookies from "js-cookie";
import {
  getDataAPI,
  postDataAPI,
  putDataAPI,
  patchDataAPI,
  deleteDataAPI,
  postMediaAPI,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
} from "./lib/axios";

// ─── Token helpers ────────────────────────────────────────────────────────────
export const getToken = getAuthToken;
export const setToken = setAuthToken;
export const clearToken = clearAuthToken;

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════════
export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  auth: {
    signup: (data) => postDataAPI("/auth/", data),
    signin: (identifier, password) =>
      postDataAPI("/auth/attendant/signin", { identifier, password }),
    adminSignin: (email, password) =>
      postDataAPI("/auth/admin/signin", { identifier: email, password }),
    attendantSignin: (identifier, password) =>
      postDataAPI("/auth/attendant/signin", { identifier, password }),
    sendCode: (email, reason) => postDataAPI("/auth/code", { email, reason }),
    verifyCode: (email, code, reason) =>
      postDataAPI("/auth/verify-code", { email, code, reason }),
    onboarding: (token, email, hubId) =>
      postDataAPI("/auth/onboarding", { token, email, hubId }),
    resetPassword: (token, newPassword) =>
      postDataAPI("/auth/reset-password", { token, newPassword }),
    me: () => getDataAPI("/auth/me"),
  },

  // ── Products ──────────────────────────────────────────────────────────────
  products: {
    getAll: () => getDataAPI("/products"),
    create: (data) => postDataAPI("/products", data),
    updateStatus: (productId, status) =>
      put("/products/status", { productId, status }),
  },

  // ── Slashes ───────────────────────────────────────────────────────────────
  slashes: {
    getMySlashes: () => getDataAPI("/slash/"),
    search: (query = "", page = 1, limit = 20) =>
      getDataAPI(
        `/slash/search?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
      ),
    create: (productId, timeLimit, hubId) =>
      postDataAPI("/slash/", { productId, timeLimit, hubId }),
    join: (id) => postDataAPI(`/slash/${id}`),
    leave: (id) => patchDataAPI(`/slash/${id}`),
    getQR: (id) => getDataAPI(`/slash/qr?id=${id}`),
    verifyQR: (qrCode) => postDataAPI("/slash/qr", { qrCode }),
    verifyClaim: (code) => postDataAPI("/slash/claim", { code }),
  },

  // ── Hubs ──────────────────────────────────────────────────────────────────
  hubs: {
    getStates: () => getDataAPI("/hub/"),
    getCities: (state) => getDataAPI(`/hub/${encodeURIComponent(state)}`),
    getHubs: (state, city) =>
      getDataAPI(
        `/hub/${encodeURIComponent(state)}/${encodeURIComponent(city)}`,
      ),
    getRatings: (hubId) => getDataAPI(`/hub/${hubId}/ratings`),
    rate: (hubId, rating, comment) =>
      postDataAPI(`/hub/${hubId}/rating`, { rating, comment }),
  },

  // ── Transactions ──────────────────────────────────────────────────────────
  transactions: {
    getAll: () => getDataAPI("/transaction"),
  },

  // ── Notifications ─────────────────────────────────────────────────────────
  notifications: {
    getAll: () => getDataAPI("/notifications"),
    getMine: () => getDataAPI("/notifications/me"),
  },

  // ── Admin — Users ─────────────────────────────────────────────────────────
  admin: {
    getStats: () => getDataAPI("/admin/stats"),
    getUsers: (page = 1, limit = 50) =>
      getDataAPI(`/admin/users?page=${page}&limit=${limit}`),
    searchUsers: (query) =>
      getDataAPI(`/admin/users/search?query=${encodeURIComponent(query)}`),
    getUser: (id) => getDataAPI(`/admin/users/${id}`),
    suspendUser: (id) => patchDataAPI(`/admin/users/${id}/suspend`),

    // Admin — Slashes
    searchSlashes: (
      query = "",
      hubId = "",
      status = "",
      page = 1,
      limit = 50,
    ) =>
      getDataAPI(
        `/admin/slashes/search?query=${encodeURIComponent(query)}&hubId=${hubId}&status=${status}&page=${page}&limit=${limit}`,
      ),
    dissolveSlash: (id) => deleteDataAPI(`/admin/slashes/${id}/dissolve`),

    // Admin — Hubs
    getHubs: (query = "", status = "", page = 1, limit = 50) => {
      // Backend Joi rejects status='' — only send it when it has a real value
      const statusParam = status ? `&status=${status}` : "";
      return getDataAPI(
        `/admin/hubs?query=${encodeURIComponent(query)}${statusParam}&page=${page}&limit=${limit}`,
      );
    },
    createHub: (data) => postDataAPI("/admin/hubs", data),
    getHub: (id) => getDataAPI(`/admin/hubs/${id}`),
    // PATCH /admin/hubs/status { hubId, status } — body, not path param
    updateHubStatus: (hubId, status) =>
      patchDataAPI("/admin/hubs/status", { hubId, status }),

    // Admin — Attendants
    getAttendants: () => getDataAPI("/admin/attendants"),
    createAttendant: (data) => postDataAPI("/admin/attendants", data),
    // PATCH /admin/attendants/:id/pin — no request body; backend generates the PIN
    resetPin: (id) => patchDataAPI(`/admin/attendants/${id}/pin`),
    // PATCH /admin/attendants/status { attendantId, status } — body, not path param
    updateAttendantStatus: (attendantId, status) =>
      patchDataAPI("/admin/attendants/status", { attendantId, status }),
    // POST /admin/hubs/attendant { hubId, attendantId }
    assignAttendant: (hubId, attendantId) =>
      postDataAPI("/admin/hubs/attendant", { hubId, attendantId }),
  },

  // ── Attendant ─────────────────────────────────────────────────────────────
  attendant: {
    getDashboard: () => getDataAPI("/attendant/dashboard"),
  },
};

export default api;
