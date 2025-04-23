import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true,
});

// Add request interceptor to handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle errors globally here
    return Promise.reject(error);
  }
);

export default api;