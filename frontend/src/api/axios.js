import axios from 'axios';

const API_BASE_URL = 'https://traveldesk-yxkp.onrender.com/api';
//const API_BASE_URL = 'http://localhost:5000/api';
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log('🔍 API Request:', config.method?.toUpperCase(), config.baseURL + config.url);
  return config;
});

// Add response debugging
api.interceptors.response.use(
  (response) => {
    console.log('📦 API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.log('❌ API Error:', error.response?.status, error.config?.url);
    console.log('📄 Response data type:', typeof error.response?.data);
    console.log('📄 Response data preview:', error.response?.data?.substring?.(0, 200));
    return Promise.reject(error);
  }
);

export default api;
