// Configuration de l'API
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:8000' : '/api');

export default API_BASE_URL;

