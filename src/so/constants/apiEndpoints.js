/**
 * SO App API Endpoints
 * Centralized constants for all API URLs used in the SO module
 */

export const SO_API_ENDPOINTS = {
  // Accounts & Orders
  ACCOUNTS_ORDERS: '/api/accounts-orders',
  GET_ORDERS: '/api/get-orders',
  GET_ORDERS_PAGINATED: '/api/get-orders-paginated',
  EDIT_ORDER: (id) => `/api/edit/${id}`,
  DELETE_ORDER: (id) => `/api/delete/${id}`,
  
  // Verification
  GET_VERIFICATION_ORDERS: '/api/get-verification-orders',
  
  // Team Management
  CURRENT_USER: '/api/current-user',
  FETCH_AVAILABLE_USERS: '/api/fetch-available-users',
  FETCH_MY_TEAM: '/api/fetch-my-team',
  ASSIGN_USER: '/api/assign-user',
  UNASSIGN_USER: '/api/unassign-user',
  
  // Analytics & Dashboard
  GET_ANALYTICS: '/api/get-analytics',
  DASHBOARD_COUNTS: '/api/dashboard-counts',
  
  // Files
  DOWNLOAD_FILE: (fileName) => `/api/download/${encodeURIComponent(fileName)}`,
  
  // Other
  CLEAR: '/api/clear',
};

export default SO_API_ENDPOINTS;
