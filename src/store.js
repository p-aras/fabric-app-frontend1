export const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5001/api'
  : 'https://fabric-app-backend-new.onrender.com/api';

const getHeaders = () => {
  const token = localStorage.getItem('twms_token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response) => {
  if (!response.ok) {
    if (response.status === 401 && localStorage.getItem('twms_token')) {
      localStorage.removeItem('twms_token');
      localStorage.removeItem('twms_user');
      window.location.href = '/login';
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `HTTP error! Status: ${response.status}`);
  }
  return response.json();
};

export const store = {
  // --- AUTHENTICATION ---
  login: async (email, password) => {
    const data = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(handleResponse);

    if (data.token && data.user) {
      localStorage.setItem('twms_token', data.token);
      localStorage.setItem('twms_user', JSON.stringify(data.user));
    }
    return data;
  },

  register: async (userData) => {
    return fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    }).then(handleResponse);
  },

  verifyRegisterOtp: async (email, otp) => {
    return fetch(`${BASE_URL}/auth/verify-register-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    }).then(handleResponse);
  },

  verifyLoginOtp: async (email, otp) => {
    const data = await fetch(`${BASE_URL}/auth/verify-login-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    }).then(handleResponse);

    if (data.token && data.user) {
      localStorage.setItem('twms_token', data.token);
      localStorage.setItem('twms_user', JSON.stringify(data.user));
    }
    return data;
  },

  resendOtp: async (email, action) => {
    return fetch(`${BASE_URL}/auth/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, action }),
    }).then(handleResponse);
  },

  forgotPassword: async (email) => {
    return fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).then(handleResponse);
  },

  resetPassword: async (email, otp, newPassword) => {
    return fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword }),
    }).then(handleResponse);
  },

  fetchDyeingLotDetails: async (lotNumber) => {
    return fetch(`${BASE_URL}/google-sheets/fetch-dyeing-lot-details?lotNumber=${lotNumber}`, {
      headers: getHeaders(),
    }).then(handleResponse);
  },

  // --- MATERIALS ---
  getMaterials: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.location) params.append('location', filters.location);
    if (filters.search) params.append('search', filters.search);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetch(`${BASE_URL}/materials${queryString}`, {
      headers: getHeaders(),
    }).then(handleResponse);
  },

  getInventory: async (page = 1, limit = 50, search = '', party = '', shade = '', storeName = '', stockStatus = 'All', balPkgs = '', description = '') => {
    return fetch(`${BASE_URL}/inventory?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&party=${encodeURIComponent(party)}&shade=${encodeURIComponent(shade)}&store=${encodeURIComponent(storeName)}&stockStatus=${encodeURIComponent(stockStatus)}&balPkgs=${encodeURIComponent(balPkgs)}&description=${encodeURIComponent(description)}`, {
      headers: getHeaders(),
    }).then(handleResponse);
  },

  getInventoryFilterValues: async () => {
    return fetch(`${BASE_URL}/inventory/filter-values`, {
      headers: getHeaders(),
    }).then(handleResponse);
  },

  addMaterial: async (materialData) => {
    return fetch(`${BASE_URL}/materials`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(materialData),
    }).then(handleResponse);
  },

  updateMaterial: async (id, materialData) => {
    return fetch(`${BASE_URL}/materials/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(materialData),
    }).then(handleResponse);
  },

  deleteMaterial: async (id) => {
    return fetch(`${BASE_URL}/materials/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    }).then(handleResponse);
  },

  // --- GRN (GOODS RECEIVING) ---
  getGRNs: async () => {
    return fetch(`${BASE_URL}/grns`, {
      headers: getHeaders(),
    }).then(handleResponse);
  },

  addGRN: async (grnData) => {
    return fetch(`${BASE_URL}/grns`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(grnData),
    }).then(handleResponse);
  },

  // --- ISSUES (DISPATCH) ---
  getIssues: async () => {
    return fetch(`${BASE_URL}/issues`, {
      headers: getHeaders(),
    }).then(handleResponse);
  },

  addIssue: async (issueData) => {
    return fetch(`${BASE_URL}/issues`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(issueData),
    }).then(handleResponse);
  },

  // --- TRANSFERS ---
  getTransfers: async () => {
    return fetch(`${BASE_URL}/transfers`, {
      headers: getHeaders(),
    }).then(handleResponse);
  },

  addTransfer: async (transferData) => {
    return fetch(`${BASE_URL}/transfers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(transferData),
    }).then(handleResponse);
  },

  approveTransfer: async (id) => {
    return fetch(`${BASE_URL}/transfers/${id}/approve`, {
      method: 'POST',
      headers: getHeaders(),
    }).then(handleResponse);
  },

  rejectTransfer: async (id) => {
    return fetch(`${BASE_URL}/transfers/${id}/reject`, {
      method: 'POST',
      headers: getHeaders(),
    }).then(handleResponse);
  },

  // --- SETTINGS (ROOMS, RACKS, SHELVES, SUPPLIERS) ---
  getSettingsData: async () => {
    return fetch(`${BASE_URL}/settings`, {
      headers: getHeaders(),
    }).then(handleResponse);
  },

  getRooms: async () => {
    return fetch(`${BASE_URL}/settings`, {
      headers: getHeaders(),
    }).then(handleResponse).then(data => data.rooms || []);
  },

  getFloors: async () => {
    return fetch(`${BASE_URL}/settings`, {
      headers: getHeaders(),
    }).then(handleResponse).then(data => data.floors || []);
  },

  getRacks: async () => {
    return fetch(`${BASE_URL}/settings`, {
      headers: getHeaders(),
    }).then(handleResponse).then(data => data.racks || []);
  },

  getShelves: async () => {
    return fetch(`${BASE_URL}/settings`, {
      headers: getHeaders(),
    }).then(handleResponse).then(data => data.shelves || []);
  },

  getSuppliers: async () => {
    return fetch(`${BASE_URL}/settings`, {
      headers: getHeaders(),
    }).then(handleResponse).then(data => data.suppliers || []);
  },

  getAuditLog: async () => {
    return fetch(`${BASE_URL}/settings`, {
      headers: getHeaders(),
    }).then(handleResponse).then(data => data.auditLog || []);
  },

  addRoom: async (roomData) => {
    return fetch(`${BASE_URL}/rooms`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(roomData),
    }).then(handleResponse);
  },

  updateRoom: async (id, roomData) => {
    return fetch(`${BASE_URL}/rooms/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(roomData),
    }).then(handleResponse);
  },

  deleteRoom: async (id) => {
    return fetch(`${BASE_URL}/rooms/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    }).then(handleResponse);
  },

  getRacksByRoom: async (roomCode) => {
    return fetch(`${BASE_URL}/settings`, {
      headers: getHeaders(),
    }).then(handleResponse).then(data => (data.racks || []).filter(r => r.room === roomCode));
  },

  addRack: async (rackData) => {
    return fetch(`${BASE_URL}/racks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(rackData),
    }).then(handleResponse);
  },

  deleteRack: async (id) => {
    return fetch(`${BASE_URL}/racks/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    }).then(handleResponse);
  },

  getShelvesForRack: async (rackCode) => {
    return fetch(`${BASE_URL}/settings`, {
      headers: getHeaders(),
    }).then(handleResponse).then(data => (data.shelves || []).filter(s => s.rack === rackCode));
  },

  addShelf: async (shelfData) => {
    return fetch(`${BASE_URL}/shelves`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(shelfData),
    }).then(handleResponse);
  },

  deleteShelf: async (id) => {
    return fetch(`${BASE_URL}/shelves/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    }).then(handleResponse);
  },

  addSupplier: async (supplierData) => {
    return fetch(`${BASE_URL}/suppliers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(supplierData),
    }).then(handleResponse);
  },

  updateSupplier: async (id, supplierData) => {
    return fetch(`${BASE_URL}/suppliers/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(supplierData),
    }).then(handleResponse);
  },

  deleteSupplier: async (id) => {
    return fetch(`${BASE_URL}/suppliers/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    }).then(handleResponse);
  },

  // --- FLOORS MANAGEMENT (MOCKED TO ROOMS UPDATE SINCE FLOORS DO NOT HAVE A DEDICATED MODEL TABLE) ---
  addFloor: async (floorName) => {
    // Return mock success as floor list is derived from rooms dynamically
    return { success: true, name: floorName };
  },

  deleteFloor: async (floorName) => {
    return { success: true, name: floorName };
  },

  renameFloor: async (oldName, newName) => {
    return { success: true, oldName, newName };
  },

  // --- OCR BILL PARSER ---
  parseBillOcr: async (fileObject) => {
    const formData = new FormData();
    formData.append('bill', fileObject);

    const token = localStorage.getItem('twms_token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}/ocr/parse-bill`, {
      method: 'POST',
      headers: headers,
      body: formData,
    });

    return handleResponse(response);
  },

  // --- GOOGLE SHEETS DYEING LOT FETCH ---
  fetchDyeingLotDetails: async (lotNo) => {
    const response = await fetch(`${BASE_URL}/google-sheets/fetch-by-lot/${encodeURIComponent(lotNo)}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  getJobOrders: async () => {
    return fetch(`${BASE_URL}/google-sheets/job-orders`, {
      method: 'GET',
      headers: getHeaders(),
    }).then(handleResponse);
  },

  getPendingCuttingLots: async (refresh = false) => {
    return fetch(`${BASE_URL}/google-sheets/pending-cutting?refresh=${refresh}`, {
      method: 'GET',
      headers: getHeaders(),
    }).then(handleResponse);
  },

  getDailyInventoryReport: async (date = '') => {
    return fetch(`${BASE_URL}/reports/daily-inventory-quantity?date=${encodeURIComponent(date)}`, {
      method: 'GET',
      headers: getHeaders(),
    }).then(handleResponse);
  },

  getSupervisorIssuanceReport: async (startDate = '', endDate = '') => {
    return fetch(`${BASE_URL}/reports/supervisor-issuance?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`, {
      method: 'GET',
      headers: getHeaders(),
    }).then(handleResponse);
  },

  getDailyFabricIssuanceReport: async (startDate = '', endDate = '', table = '', fabric = '') => {
    return fetch(`${BASE_URL}/reports/daily-fabric-issuance?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&table=${encodeURIComponent(table)}&fabric=${encodeURIComponent(fabric)}`, {
      method: 'GET',
      headers: getHeaders(),
    }).then(handleResponse);
  },

  getLocationIssuanceReport: async (startDate = '', endDate = '') => {
    return fetch(`${BASE_URL}/reports/location-issuance?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`, {
      method: 'GET',
      headers: getHeaders(),
    }).then(handleResponse);
  },

  getCutterMasterIssuanceReport: async (startDate = '', endDate = '') => {
    return fetch(`${BASE_URL}/reports/cutter-master-issuance?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`, {
      method: 'GET',
      headers: getHeaders(),
    }).then(handleResponse);
  },

  getTables: async () => {
    return fetch(`${BASE_URL}/tables`, {
      method: 'GET',
      headers: getHeaders(),
    }).then(handleResponse);
  },

  addTable: async (data) => {
    return fetch(`${BASE_URL}/tables`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse);
  },

  updateTable: async (id, data) => {
    return fetch(`${BASE_URL}/tables/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse);
  },

  deleteTable: async (id) => {
    return fetch(`${BASE_URL}/tables/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    }).then(handleResponse);
  },

  getUsers: async () => {
    return fetch(`${BASE_URL}/auth/users`, {
      method: 'GET',
      headers: getHeaders(),
    }).then(handleResponse);
  },

  getDyeingShortageReport: async () => {
    return fetch(`${BASE_URL}/reports/dyeing-shortage`, {
      method: 'GET',
      headers: getHeaders(),
    }).then(handleResponse);
  }
};
