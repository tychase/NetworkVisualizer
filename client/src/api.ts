import axios from 'axios';

// Create axios instance with a properly configured baseURL
const api = axios.create({
  // Use the current host/origin if VITE_API_URL is not defined
  baseURL: import.meta.env.VITE_API_URL || window.location.origin,
  withCredentials: true,
});

// Log API requests in development
if (import.meta.env.DEV) {
  api.interceptors.request.use(request => {
    console.log('API Request:', request.method?.toUpperCase(), request.url);
    return request;
  });
}

// Add response interceptor to handle errors globally
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log('API Response:', response.status, response.config.url);
    }
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;