import axios from 'axios';

// Default to local backend for direct workspace integration.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const fetchLogs = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/audit`);
    return response.data;
  } catch (error) {
    console.error('Error fetching logs. Make sure the API supports /api/audit endpoint without auth, or adjust headers.', error);
    throw error;
  }
};

export const fetchLogsPaged = async ({ page = 1, limit = 30, eventType = '', schoolUID = '', search = '', userRole = '' } = {}) => {
  try {
    const response = await axios.get(`${API_URL}/api/audit`, {
      params: { page, limit, eventType, schoolUID, search, userRole }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching paged logs:', error);
    throw error;
  }
};

export const fetchAuditSchools = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/audit/schools`);
    return response.data;
  } catch (error) {
    console.error('Error fetching audit schools:', error);
    throw error;
  }
};
