import axios from 'axios';

export const axiosInstance = axios.create({
  baseURL: 'http://localhost:8550/api/dash',
  timeout: 100000,
});

axiosInstance.interceptors.request.use(
  async (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      config.headers = config.headers || {};
      if (token) {
        config.headers.Authorization = token;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);
