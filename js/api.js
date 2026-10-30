/**
 * RentRoll - REST API Client Service (Phase 3 Django Fullstack Integration)
 * 
 * Communicates with the Django REST Framework backend (/api/*) using credentials (HttpOnly JWT cookies)
 * and Bearer Authorization headers. Automatically connects to Django backend on port 8000 while
 * providing local client fallback if the server is unreachable.
 */

function getApiBase() {
  if (typeof window === 'undefined') return '/api';
  const { protocol, port, hostname } = window.location;
  if (protocol === 'file:') {
    return 'http://127.0.0.1:8000/api';
  }
  if (port === '8000') {
    return '/api';
  }
  if (port && port !== '8000') {
    return `http://${hostname || '127.0.0.1'}:8000/api`;
  }
  return '/api';
}

const API_BASE = getApiBase();
const STORAGE_KEY_TOKEN = 'rentroll_token';
const STORAGE_KEY_SESSION = 'rentroll_active_session';
const STORAGE_KEY_USERS = 'rentroll_users';
const ARTIFICIAL_DELAY_MS = 350;

/**
 * Gets the stored JWT token.
 */
export function getStoredToken() {
  const token = sessionStorage.getItem(STORAGE_KEY_TOKEN) || localStorage.getItem(STORAGE_KEY_TOKEN);
  if (!token || token === 'null' || token === 'undefined') return null;
  return token;
}

/**
 * Saves the session token.
 */
export function setStoredToken(token, rememberMe = false) {
  if (!token) return;
  if (rememberMe) {
    sessionStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
  } else {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    sessionStorage.setItem(STORAGE_KEY_TOKEN, token);
  }
}

/**
 * Clears stored tokens.
 */
export function clearStoredToken() {
  localStorage.removeItem(STORAGE_KEY_TOKEN);
  sessionStorage.removeItem(STORAGE_KEY_TOKEN);
  localStorage.removeItem(STORAGE_KEY_SESSION);
  sessionStorage.removeItem(STORAGE_KEY_SESSION);
}

/**
 * Universal API Fetch wrapper with authentication headers.
 */
async function request(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const fetchOptions = {
    ...options,
    headers,
    credentials: 'include' // Sends HttpOnly cookie
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, fetchOptions);
    const contentType = response.headers.get('content-type') || '';
    
    let data;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/login') && !endpoint.includes('/signup')) {
        console.warn(`[RentRoll API Client] 401 Unauthorized at ${endpoint}. Invalidating session.`);
        clearStoredToken();
        const path = window.location.pathname.toLowerCase();
        if (path.includes('dashboard')) {
          window.location.replace('login.html');
        }
      }
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (err) {
    // If running offline or file:// protocol, delegate to local handler
    if (
      err.name === 'TypeError' ||
      err.message.includes('Failed to fetch') ||
      err.message.includes('NetworkError') ||
      window.location.protocol === 'file:'
    ) {
      console.warn(`[RentRoll API Client] Backend server unreachable at ${endpoint}. Using client-side simulation.`, err.message);
      return handleOfflineRequest(endpoint, options);
    }
    throw err;
  }
}

// ----------------------------------------------------------------------------
// AUTHENTICATION CLIENT METHODS
// ----------------------------------------------------------------------------

/**
 * Signs in a user with email and password.
 * @param {string} email 
 * @param {string} password 
 * @param {boolean} [rememberMe=false]
 * @returns {Promise<Object>} user object
 */
export async function login(email, password, rememberMe = false) {
  try {
    const res = await request('/auth/login', {
      method: 'POST',
      body: { email, password, rememberMe }
    });

    if (res.token) {
      setStoredToken(res.token, rememberMe);
    }

    const user = res.user;
    if (!user) {
      throw new Error('Invalid credentials or response from login service.');
    }

    if (rememberMe) {
      sessionStorage.removeItem(STORAGE_KEY_SESSION);
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_SESSION);
      sessionStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
    }

    return user;
  } catch (err) {
    // Fallback if offline
    if (window.location.protocol === 'file:' || err.isOffline) {
      return offlineLogin(email, password, rememberMe);
    }
    throw err;
  }
}

/**
 * Registers a new account.
 * @param {Object} data { name, email, password, role, phone }
 */
export async function signup(data) {
  try {
    const res = await request('/auth/signup', {
      method: 'POST',
      body: data
    });

    if (res.token) {
      setStoredToken(res.token, true);
    }

    const user = res.user;
    if (!user) {
      throw new Error('Invalid response from registration service.');
    }

    sessionStorage.removeItem(STORAGE_KEY_SESSION);
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
    return user;
  } catch (err) {
    if (window.location.protocol === 'file:' || err.isOffline) {
      return offlineSignup(data);
    }
    throw err;
  }
}

/**
 * Logs out user and invalidates session.
 */
export async function logout() {
  try {
    await request('/auth/logout', { method: 'POST' });
  } catch {
    // ignore server logout errors
  } finally {
    clearStoredToken();
  }
}

/**
 * Retrieves the currently authenticated user from session.
 */
export function getCurrentUser() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_SESSION) || localStorage.getItem(STORAGE_KEY_SESSION);
    return raw && raw !== 'undefined' && raw !== 'null' ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Failed to retrieve current user session:', err);
    return null;
  }
}

/**
 * Verifies profile with backend /api/auth/me.
 */
export async function verifySession() {
  try {
    const res = await request('/auth/me', { method: 'GET' });
    if (res && res.success && res.user) {
      const storage = localStorage.getItem(STORAGE_KEY_SESSION) ? localStorage : sessionStorage;
      storage.setItem(STORAGE_KEY_SESSION, JSON.stringify(res.user));
      return res.user;
    }
    return null;
  } catch (err) {
    if (err && err.message && err.message.includes('401')) {
      clearStoredToken();
      return null;
    }
    return getCurrentUser();
  }
}

// ----------------------------------------------------------------------------
// DASHBOARD & ENTITIES CLIENT METHODS (PHASE 2)
// ----------------------------------------------------------------------------

/**
 * Fetches computed live dashboard metrics.
 */
export async function getDashboardStats() {
  const res = await request('/dashboard/stats', { method: 'GET' });
  return res.data;
}

/**
 * Fetches landlord's properties.
 */
export async function getProperties() {
  const res = await request('/properties', { method: 'GET' });
  return res.data || [];
}

/**
 * Creates a new property.
 */
export async function createProperty(propData) {
  const res = await request('/properties', {
    method: 'POST',
    body: propData
  });
  return res.data;
}

/**
 * Deletes a property.
 */
export async function deleteProperty(propertyId) {
  const res = await request(`/properties/${propertyId}`, { method: 'DELETE' });
  return res.success;
}

/**
 * Fetches rental units.
 */
export async function getUnits(propertyId = null) {
  const query = propertyId ? `?propertyId=${encodeURIComponent(propertyId)}` : '';
  const res = await request(`/units${query}`, { method: 'GET' });
  return res.data || [];
}

/**
 * Creates a new unit.
 */
export async function createUnit(unitData) {
  const res = await request('/units', {
    method: 'POST',
    body: unitData
  });
  return res.data;
}

/**
 * Fetches leases.
 */
export async function getLeases() {
  const res = await request('/leases', { method: 'GET' });
  return res.data || [];
}

/**
 * Creates a new lease.
 */
export async function createLease(leaseData) {
  const res = await request('/leases', {
    method: 'POST',
    body: leaseData
  });
  return res.data;
}

/**
 * Fetches payments ledger.
 */
export async function getPayments(status = 'all') {
  const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
  const res = await request(`/payments${query}`, { method: 'GET' });
  return res.data || [];
}

/**
 * Records or submits a rent payment.
 */
export async function createPayment(payData) {
  const res = await request('/payments', {
    method: 'POST',
    body: payData
  });
  return res.data;
}

/**
 * Fetches maintenance tickets.
 */
export async function getMaintenanceTickets(status = 'all', priority = 'all') {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.append('status', status);
  if (priority && priority !== 'all') params.append('priority', priority);
  const query = params.toString() ? `?${params.toString()}` : '';

  const res = await request(`/maintenance${query}`, { method: 'GET' });
  return res.data || [];
}

/**
 * Submits a repair request ticket.
 */
export async function createMaintenanceTicket(ticketData) {
  const res = await request('/maintenance', {
    method: 'POST',
    body: ticketData
  });
  return res.data;
}

/**
 * Updates maintenance ticket status/notes.
 */
export async function updateMaintenanceTicket(ticketId, updates) {
  const res = await request(`/maintenance/${ticketId}`, {
    method: 'PUT',
    body: updates
  });
  return res.data;
}

/**
 * Submits a contact inquiry form.
 */
export async function submitContactForm(contactData) {
  const res = await request('/contact', {
    method: 'POST',
    body: contactData
  });
  return res;
}

/**
 * Submits customer feedback / review.
 */
export async function submitFeedbackReview(reviewData) {
  const res = await request('/feedback', {
    method: 'POST',
    body: reviewData
  });
  return res;
}

/**
 * Fetches feedback reviews from the API.
 */
export async function getFeedbackReviews() {
  const res = await request('/feedback', {
    method: 'GET'
  });
  return res.reviews || [];
}

/**
 * Fetches platform-wide registered users (Admin Command Center)
 */
export async function getAdminUsers() {
  const res = await request('/admin/users', { method: 'GET' });
  return res.data || [];
}

/**
 * Fetches contact inquiries and reviews (Admin Command Center)
 */
export async function getAdminInquiries() {
  const res = await request('/admin/inquiries', { method: 'GET' });
  return res || { inquiries: [], reviews: [] };
}

// ----------------------------------------------------------------------------
// CLIENT-SIDE OFFLINE FALLBACK ENGINE
// ----------------------------------------------------------------------------

function delay(ms = ARTIFICIAL_DELAY_MS) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function initOfflineStorage() {
  const adminAccount = {
    id: 'usr_admin_demo',
    name: 'Arjun Singhania',
    email: 'admin@rentroll.com',
    password: 'Password123!',
    role: 'admin',
    phone: '+91 98100 00001'
  };

  const landlordAccount = {
    id: 'usr_landlord_demo',
    name: 'Rajesh Sharma',
    email: 'landlord@rentroll.com',
    password: 'Password123!',
    role: 'landlord',
    phone: '+91 98201 23456'
  };

  const tenantAccount = {
    id: 'usr_tenant_demo',
    name: 'Priya Iyer',
    email: 'tenant@rentroll.com',
    password: 'Password123!',
    role: 'tenant',
    phone: '+91 98450 87654'
  };

  let users = [];
  try {
    users = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
  } catch {
    users = [];
  }

  // Ensure admin demo account is always present
  const adminIdx = users.findIndex(u => u.email && u.email.toLowerCase() === 'admin@rentroll.com');
  if (adminIdx === -1) {
    users.unshift(adminAccount);
  } else {
    users[adminIdx] = { ...users[adminIdx], ...adminAccount };
  }

  // Ensure landlord and tenant demo accounts are present
  if (!users.some(u => u.email && u.email.toLowerCase() === 'landlord@rentroll.com')) {
    users.push(landlordAccount);
  }
  if (!users.some(u => u.email && u.email.toLowerCase() === 'tenant@rentroll.com')) {
    users.push(tenantAccount);
  }

  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
}
initOfflineStorage();

async function offlineLogin(email, password, rememberMe) {
  await delay();
  initOfflineStorage();
  const norm = (email || '').trim().toLowerCase();
  const users = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
  let user = users.find(u => u.email && u.email.toLowerCase() === norm);

  // Guarantee demo accounts match Password123!
  if (!user && norm === 'admin@rentroll.com' && password === 'Password123!') {
    user = {
      id: 'usr_admin_demo',
      name: 'Arjun Singhania',
      email: 'admin@rentroll.com',
      password: 'Password123!',
      role: 'admin',
      phone: '+91 98100 00001'
    };
  } else if (!user && norm === 'landlord@rentroll.com' && password === 'Password123!') {
    user = {
      id: 'usr_landlord_demo',
      name: 'Rajesh Sharma',
      email: 'landlord@rentroll.com',
      password: 'Password123!',
      role: 'landlord',
      phone: '+91 98201 23456'
    };
  } else if (!user && norm === 'tenant@rentroll.com' && password === 'Password123!') {
    user = {
      id: 'usr_tenant_demo',
      name: 'Priya Iyer',
      email: 'tenant@rentroll.com',
      password: 'Password123!',
      role: 'tenant',
      phone: '+91 98450 87654'
    };
  }

  if (!user || user.password !== password) {
    throw new Error('Invalid email or password. Please verify your credentials.');
  }

  const sessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || null
  };

  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(STORAGE_KEY_SESSION, JSON.stringify(sessionUser));
  return sessionUser;
}

async function offlineSignup(data) {
  await delay();
  const norm = (data.email || '').trim().toLowerCase();
  const users = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
  if (users.some(u => u.email.toLowerCase() === norm)) {
    throw new Error('An account with this email address already exists. Please log in.');
  }

  const newUser = {
    id: `usr_${Date.now()}`,
    name: data.name.trim(),
    email: norm,
    password: data.password,
    role: data.role || 'landlord'
  };

  users.push(newUser);
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));

  const sessionUser = {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role
  };
  localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(sessionUser));
  return sessionUser;
}

async function handleOfflineRequest(endpoint, options = {}) {
  await delay(150);
  const user = getCurrentUser() || { id: 'usr_landlord_demo', role: 'landlord', name: 'Rajesh Sharma' };

  if (endpoint.startsWith('/auth/login')) {
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : (options.body || {});
    const sessionUser = await offlineLogin(body.email, body.password, body.rememberMe);
    const mockToken = `mock_jwt_${sessionUser.id}_${Date.now()}`;
    return {
      success: true,
      message: 'Login successful (offline fallback)',
      user: sessionUser,
      token: mockToken
    };
  }

  if (endpoint.startsWith('/auth/signup')) {
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : (options.body || {});
    const sessionUser = await offlineSignup(body);
    const mockToken = `mock_jwt_${sessionUser.id}_${Date.now()}`;
    return {
      success: true,
      message: 'Account created successfully (offline fallback)',
      user: sessionUser,
      token: mockToken
    };
  }

  if (endpoint.startsWith('/auth/logout')) {
    clearStoredToken();
    return { success: true, message: 'Logged out successfully' };
  }

  if (endpoint.startsWith('/auth/me')) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      const err = new Error('Authentication required.');
      err.status = 401;
      throw err;
    }
    return { success: true, user: currentUser };
  }

  if (endpoint.startsWith('/dashboard/stats')) {
    if (user.role === 'admin') {
      return {
        data: {
          role: 'admin',
          totalUsers: 7,
          totalLandlords: 2,
          totalTenants: 4,
          totalProperties: 4,
          totalUnits: 18,
          occupiedUnits: 17,
          vacantUnits: 1,
          occupancyRate: 94,
          monthlyRentRoll: 1104500,
          paidRentTotal: 185500,
          pendingRentTotal: 28500,
          activeLeasesCount: 3,
          openMaintenanceCount: 2,
          inquiriesCount: 2,
          reviewsCount: 3
        }
      };
    } else if (user.role === 'landlord') {
      return {
        data: {
          role: 'landlord',
          totalProperties: 4,
          totalUnits: 18,
          occupiedUnits: 17,
          vacantUnits: 1,
          occupancyRate: 94,
          monthlyRentRoll: 535000,
          paidRentThisMonth: 128500,
          pendingRent: 28500,
          openMaintenanceCount: 2,
          highPriorityMaintenanceCount: 1
        }
      };
    } else {
      return {
        data: {
          role: 'tenant',
          activeLease: {
            id: 'lease_1',
            startDate: '2026-02-01',
            endDate: '2027-01-31',
            rentAmount: 28500,
            depositAmount: 85500,
            unitName: 'Flat 4B',
            propertyName: 'Gulmohar Residency',
            address: '14th Main, 4th Block, Koramangala, Bengaluru, KA 560034'
          },
          monthlyRent: 28500,
          nextDueDate: '2026-11-01',
          nextAmountDue: 28500,
          lastPaidAmount: 28500,
          lastPaidDate: '2026-10-01T08:30:00.000Z',
          openTicketsCount: 1,
          totalTicketsCount: 1
        }
      };
    }
  }

  if (endpoint.startsWith('/properties')) {
    return {
      data: [
        { id: 'prop_1', name: 'Gulmohar Residency', address: '14th Main, 4th Block, Koramangala', city: 'Bengaluru', state: 'KA', zip_code: '560034', property_type: 'Apartment Building', units_count: 6, occupied_units_count: 5, occupancy_rate: 83, monthly_rent_total: 165000 },
        { id: 'prop_2', name: 'Bandra Sea Breeze Heights', address: 'Pali Hill, Bandra West', city: 'Mumbai', state: 'MH', zip_code: '400050', property_type: 'Multi-Family', units_count: 5, occupied_units_count: 5, occupancy_rate: 100, monthly_rent_total: 215000 },
        { id: 'prop_3', name: 'DLF Cyber Suites', address: 'Phase 5, Golf Course Road', city: 'Gurugram', state: 'HR', zip_code: '122009', property_type: 'Duplex/Triplex', units_count: 2, occupied_units_count: 2, occupancy_rate: 100, monthly_rent_total: 75000 },
        { id: 'prop_4', name: 'Koregaon Palms Villa', address: 'Lane 7, Koregaon Park', city: 'Pune', state: 'MH', zip_code: '411001', property_type: 'Multi-Family', units_count: 5, occupied_units_count: 5, occupancy_rate: 100, monthly_rent_total: 80000 }
      ]
    };
  }

  if (endpoint.startsWith('/units')) {
    return {
      data: [
        { id: 'unit_101', property_name: 'Gulmohar Residency', unit_number: 'Flat 1A', bedrooms: 2, bathrooms: 2, square_feet: 1050, rent_amount: 26000, status: 'occupied', current_tenant: { name: 'Sanjay Verma' } },
        { id: 'unit_102', property_name: 'Gulmohar Residency', unit_number: 'Flat 2A', bedrooms: 2, bathrooms: 2, square_feet: 1100, rent_amount: 28000, status: 'occupied', current_tenant: { name: 'Aarav Mehta' } },
        { id: 'unit_104', property_name: 'Gulmohar Residency', unit_number: 'Flat 4B', bedrooms: 2, bathrooms: 2, square_feet: 1150, rent_amount: 28500, status: 'occupied', current_tenant: { name: 'Priya Iyer' } },
        { id: 'unit_106', property_name: 'Gulmohar Residency', unit_number: 'Flat 6C', bedrooms: 1, bathrooms: 1, square_feet: 650, rent_amount: 21000, status: 'vacant', current_tenant: null },
        { id: 'unit_201', property_name: 'Bandra Sea Breeze Heights', unit_number: 'Penthouse 12A', bedrooms: 3, bathrooms: 3, square_feet: 1850, rent_amount: 65000, status: 'occupied', current_tenant: { name: 'Ananya Deshmukh' } }
      ]
    };
  }

  if (endpoint.startsWith('/leases')) {
    return {
      data: [
        { id: 'lease_1', unit_number: 'Flat 4B', property_name: 'Gulmohar Residency', tenant_name: 'Priya Iyer', tenant_email: 'tenant@rentroll.com', start_date: '2026-02-01', end_date: '2027-01-31', rent_amount: 28500, deposit_amount: 85500, status: 'active' },
        { id: 'lease_2', unit_number: 'Flat 2A', property_name: 'Gulmohar Residency', tenant_name: 'Aarav Mehta', tenant_email: 'aarav.mehta@example.com', start_date: '2026-01-01', end_date: '2026-12-31', rent_amount: 28000, deposit_amount: 84000, status: 'active' },
        { id: 'lease_3', unit_number: 'Penthouse 12A', property_name: 'Bandra Sea Breeze Heights', tenant_name: 'Ananya Deshmukh', tenant_email: 'ananya.d@example.com', start_date: '2026-03-01', end_date: '2027-02-28', rent_amount: 65000, deposit_amount: 195000, status: 'active' }
      ]
    };
  }

  if (endpoint.startsWith('/payments')) {
    return {
      data: [
        { id: 'pay_101', property_name: 'Gulmohar Residency', unit_number: 'Flat 4B', tenant_name: 'Priya Iyer', amount: 28500, due_date: '2026-10-01', paid_date: '2026-10-01', status: 'paid', payment_method: 'upi', transaction_ref: 'UPI-RR-90421', notes: 'October 2026 Rent - Paid via UPI AutoPay' },
        { id: 'pay_104', property_name: 'Gulmohar Residency', unit_number: 'Flat 2A', tenant_name: 'Aarav Mehta', amount: 28000, due_date: '2026-10-01', paid_date: '2026-10-02', status: 'paid', payment_method: 'ach', transaction_ref: 'NACH-HDFC-4028', notes: 'October 2026 Rent - eNACH debit' },
        { id: 'pay_105', property_name: 'Bandra Sea Breeze Heights', unit_number: 'Penthouse 12A', tenant_name: 'Ananya Deshmukh', amount: 65000, due_date: '2026-10-01', paid_date: '2026-10-01', status: 'paid', payment_method: 'bank_transfer', transaction_ref: 'IMPS-ICICI-1192', notes: 'October 2026 Rent - IMPS transfer' },
        { id: 'pay_106', property_name: 'Gulmohar Residency', unit_number: 'Flat 4B', tenant_name: 'Priya Iyer', amount: 28500, due_date: '2026-11-01', paid_date: null, status: 'pending', payment_method: 'upi', transaction_ref: null, notes: 'November 2026 Rent (Upcoming UPI AutoPay)' }
      ]
    };
  }

  if (endpoint.startsWith('/maintenance')) {
    return {
      data: [
        { id: 'tkt_1', property_name: 'Gulmohar Residency', unit_number: 'Flat 4B', tenant_name: 'Priya Iyer', title: 'Low hot water pressure in master bathroom geyser', category: 'plumbing', priority: 'high', status: 'in_progress', description: 'The geyser pressure in the master bathroom shower has noticeably dropped since yesterday evening.', estimated_cost: 1500, actual_cost: 0, resolution_notes: 'Urban Company certified technician scheduled for tomorrow 9:00 AM.', created_at: '2026-10-24T14:20:00.000Z' },
        { id: 'tkt_2', property_name: 'Bandra Sea Breeze Heights', unit_number: 'Penthouse 12A', tenant_name: 'Ananya Deshmukh', title: 'RO water purifier filter change warning indicator', category: 'appliance', priority: 'medium', status: 'open', description: 'The Kent RO unit on the kitchen wall has a red beeping filter indicator.', estimated_cost: 1800, actual_cost: 0, created_at: '2026-10-25T09:10:00.000Z' },
        { id: 'tkt_3', property_name: 'Gulmohar Residency', unit_number: 'Flat 2A', tenant_name: 'Aarav Mehta', title: 'Living room ceiling fan regulator humming', category: 'electrical', priority: 'low', status: 'resolved', description: 'Fan making clicking sound on speed 3.', estimated_cost: 450, actual_cost: 400, resolution_notes: 'Replaced anchor capacitor and regulator.', created_at: '2026-10-18T16:45:00.000Z' }
      ]
    };
  }

  if (endpoint.startsWith('/contact')) {
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : (options.body || {});
    return {
      success: true,
      message: 'Thank you for contacting RentRoll! Our specialist team will reach out to you within 2 business hours.',
      inquiryId: `msg_offline_${Date.now()}`
    };
  }

  if (endpoint.startsWith('/feedback')) {
    if (options.method === 'POST') {
      const body = typeof options.body === 'string' ? JSON.parse(options.body) : (options.body || {});
      const newReview = {
        id: `rev_offline_${Date.now()}`,
        name: body.name || 'Anonymous User',
        role: body.role || 'landlord',
        rating: Number(body.rating) || 5,
        property_name: body.propertyName || '',
        title: body.title || '',
        comment: body.comment || '',
        helpful_count: 0,
        verified: true,
        created_at: new Date().toISOString()
      };
      return {
        success: true,
        message: 'Thank you for your feedback! Your review has been submitted.',
        review: newReview
      };
    } else {
      return {
        success: true,
        reviews: []
      };
    }
  }

  if (endpoint.startsWith('/admin/users')) {
    return {
      success: true,
      data: [
        { id: 'usr_admin_demo', name: 'Arjun Singhania', email: 'admin@rentroll.com', role: 'admin', phone: '+91 98100 00001', properties_count: 0, leases_count: 0, created_at: '2026-01-01T00:00:00.000Z' },
        { id: 'usr_landlord_demo', name: 'Rajesh Sharma', email: 'landlord@rentroll.com', role: 'landlord', phone: '+91 98201 23456', properties_count: 3, leases_count: 2, created_at: '2026-01-05T00:00:00.000Z' },
        { id: 'usr_landlord_2', name: 'Sunita Kulkarni', email: 'sunita.k@example.in', role: 'landlord', phone: '+91 98220 99887', properties_count: 1, leases_count: 1, created_at: '2026-01-10T00:00:00.000Z' },
        { id: 'usr_tenant_demo', name: 'Priya Iyer', email: 'tenant@rentroll.com', role: 'tenant', phone: '+91 98450 87654', properties_count: 0, leases_count: 1, created_at: '2026-01-15T00:00:00.000Z' },
        { id: 'usr_tenant_2', name: 'Aarav Mehta', email: 'aarav.mehta@example.in', role: 'tenant', phone: '+91 99102 34567', properties_count: 0, leases_count: 1, created_at: '2026-01-18T00:00:00.000Z' },
        { id: 'usr_tenant_3', name: 'Ananya Deshmukh', email: 'ananya.d@example.in', role: 'tenant', phone: '+91 97654 12389', properties_count: 0, leases_count: 1, created_at: '2026-01-20T00:00:00.000Z' },
        { id: 'usr_tenant_4', name: 'Vikram Malhotra', email: 'vikram.m@example.in', role: 'tenant', phone: '+91 98111 22334', properties_count: 0, leases_count: 0, created_at: '2026-01-22T00:00:00.000Z' }
      ]
    };
  }

  if (endpoint.startsWith('/admin/inquiries')) {
    return {
      success: true,
      inquiries: [
        { id: 'msg_in_1', name: 'Karan Singhal', email: 'karan.s@realtyinvest.in', phone: '+91 98200 44556', subject: 'Enterprise Portfolio Onboarding (35 Units in Gachibowli, Hyderabad)', portfolio_size: '25-50 doors', message: 'Interested in automated UPI rent collection and tenant HRA receipt generation for 2 residential apartment complexes in Hyderabad.', status: 'new', created_at: '2026-10-28T10:15:00.000Z' },
        { id: 'msg_in_2', name: 'Meera Nambiar', email: 'meera.nambiar@heritageprops.com', phone: '+91 98401 55667', subject: 'Society Maintenance & Parking Management', portfolio_size: '10-25 doors', message: 'Looking to streamline monthly maintenance and digital lease agreements for our gated villas in Chennai.', status: 'contacted', created_at: '2026-10-29T14:30:00.000Z' }
      ],
      reviews: [
        { id: 'rev_in_1', name: 'Rajesh Sharma', role: 'landlord', rating: 5, property_name: 'Gulmohar Residency (18 Flats)', title: 'UPI autopay eliminated chasing rent completely', comment: 'Managing 18 flats across Koramangala and Indiranagar used to consume the first week of every month. With RentRoll UPI & eNACH autopay, 100% of my rent hits my HDFC account on the 1st. My CA loved the HRA & GST reports.', verified: true, created_at: '2026-10-20T11:00:00.000Z' },
        { id: 'rev_in_2', name: 'Priya Iyer', role: 'tenant', rating: 5, property_name: 'Flat 4B, Koramangala', title: 'Instant HRA rent receipts with Landlord PAN', comment: 'No more awkward follow-ups for rent receipts at tax submission time. I pay via Google Pay UPI in 30 seconds and instantly download digitally signed HRA receipts for my company declaration.', verified: true, created_at: '2026-10-22T15:20:00.000Z' },
        { id: 'rev_in_3', name: 'Sunita Kulkarni', role: 'landlord', rating: 5, property_name: 'Koregaon Park Duplexes (6 Flats)', title: 'Photo repair triage saved thousands on contractor visits', comment: 'When a tenant reported a geyser issue on Sunday evening, they submitted a video ticket with sound. We identified the MCB trip remotely without paying emergency electrician charges.', verified: true, created_at: '2026-10-24T09:45:00.000Z' }
      ]
    };
  }

  return { success: true, data: {} };
}

