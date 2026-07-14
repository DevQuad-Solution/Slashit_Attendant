import axios from "axios";
import Cookies from "js-cookie";

export const serverUrl =
  import.meta.env.VITE_NODE_ENV === "production"
    ? "https://slashit-g2og.onrender.com"
    : "http://10.243.194.253:5004";

export const apiUrl = `${serverUrl}/api`;
export const TOKEN_KEY = "slashit_attendant_token";
const SESSION_KEY = "slashit_attendant_session";

export const axiosClient = axios.create({
  baseURL: apiUrl,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
  withCredentials: true,
});

// Function to refresh access token
const refreshAccessToken = async () => {
  try {
    const response = await axiosClient.post("/auth/refresh", {
      refreshToken: Cookies.get("access_token"), // Assuming you store refreshToken in cookies
    });
    const { accessToken } = response.data;
    Cookies.set("access_token", accessToken); // Store the new access token
    return accessToken;
  } catch (error) {
    console.error("Error refreshing access token:", error);
    throw error;
  }
};

const setupAxiosInterceptors = () => {
  // Request interceptor for adding token on every request
  axiosClient.interceptors.request.use(
    (config) => {
      const token = Cookies.get(TOKEN_KEY);
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    },
    (error) => {
      return Promise.reject(error);
    },
  );

  // Normalize all backend errors into a single Error with .message = backend message
  axiosClient.interceptors.response.use(
    (res) => res,
    async (err) => {
      const originalRequest = err.config;

      // If 401 Unauthorized, try to refresh token
      if (err.response && err.response.status === 401) {
        try {
          const newAccessToken = await refreshAccessToken();
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return axiosClient(originalRequest); // Retry original request with new token
        } catch (refreshError) {
          Cookies.remove(TOKEN_KEY);
          // Cookies.remove("refreshToken");
          window.location.href = "/login"; // Handle logout/redirection
          return Promise.reject(refreshError);
        }
      }

      const msg =
        err.response?.data?.message ||
        err.response?.data?.description ||
        `Server error (${err.response?.status || "unknown"})`;
      const normalized = new Error(msg);
      normalized.status = err.response?.status;
      normalized.data = err.response?.data;
      return Promise.reject(normalized);
    },
  );
};

// Initialize the interceptors
setupAxiosInterceptors();

export const setAuthToken = (token) => Cookies.set(TOKEN_KEY, token);
export const clearAuthToken = () => Cookies.remove(TOKEN_KEY);
export const getAuthToken = () => Cookies.get(TOKEN_KEY);

// API methods
export const getDataAPI = async (url, onProgress) => {
  try {
    const res = await axiosClient.get(url, {
      onDownloadProgress: onProgress,
    });
    return res.data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error.response?.data || error;
  }
};

export const postDataAPI = async (url, post, onProgress) => {
  try {
    const res = await axiosClient.post(url, post, {
      onUploadProgress: onProgress,
    });
    return res.data;
  } catch (error) {
    console.error("Error posting data:", error);
    throw error.response?.data || error;
  }
};

export const putDataAPI = async (url, post, onProgress) => {
  try {
    const res = await axiosClient.put(url, post, {
      onUploadProgress: onProgress,
    });
    return res.data;
  } catch (error) {
    console.error("Error updating data:", error);
    throw error.response?.data || error;
  }
};

export const patchDataAPI = async (url, post, onProgress) => {
  try {
    const res = await axiosClient.patch(url, post, {
      onUploadProgress: onProgress,
    });
    return res.data;
  } catch (error) {
    console.error("Error patching data:", error);
    throw error.response?.data || error;
  }
};

export const deleteDataAPI = async (url, onProgress) => {
  try {
    const res = await axiosClient.delete(url, {
      onDownloadProgress: onProgress,
    });
    return res.data;
  } catch (error) {
    console.error("Error deleting data:", error);
    throw error.response?.data || error;
  }
};

export const postMediaAPI = async (url, post, onProgress) => {
  try {
    const res = await axiosClient.post(url, post, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: onProgress,
    });
    return res.data;
  } catch (error) {
    console.error("Error posting media:", error);
    throw error.response?.data || error;
  }
};
