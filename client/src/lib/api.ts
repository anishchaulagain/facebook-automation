import axios from 'axios';

// Default base URL for local development
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to handle errors globally if needed
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // Attempt to extract the server's error message
    const customMessage = error.response?.data?.error?.message || error.message;
    console.error('API Error:', customMessage);
    return Promise.reject(new Error(customMessage));
  }
);

export default api;
