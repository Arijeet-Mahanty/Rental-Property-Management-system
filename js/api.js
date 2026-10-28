/**
 * RentRoll - REST API Client Service (Phase 2 Fullstack Integration)
 * 
 * Communicates with the Express REST API backend (/api/*) using credentials (HttpOnly JWT cookies)
 * and Bearer Authorization headers. Automatically provides local client fallback if the server
 * is momentarily unreachable or running in a standalone file:// preview context.
 */

function getApiBase() {
  if (typeof window === 'undefined') return '/api';
  const { protocol, port, hostname } = window.location;
  if (protocol === 'file:') {
    return 'http://localhost:3000/api';
  }
  if (port && port !== '3000') {
    return `http://${hostname || 'localhost'}:3000/api`;
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

// ----------------------------------------------------------------------------
// CLIENT-SIDE OFFLINE FALLBACK ENGINE
// ----------------------------------------------------------------------------

function delay(ms = ARTIFICIAL_DELAY_MS) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function initOfflineStorage() {
  if (!localStorage.getItem(STORAGE_KEY_USERS)) {
    const seed = [
      {
        id: 'usr_landlord_demo',
        name: 'Marcus Vance',
        email: 'landlord@rentroll.com',
        password: 'Password123!',
        role: 'landlord',
        phone: '(555) 234-5678'
      },
      {
        id: 'usr_tenant_demo',
        name: 'Elena Rostova',
        email: 'tenant@rentroll.com',
        password: 'Password123!',
        role: 'tenant',
        phone: '(555) 876-5432'
      },
      {
        id: 'usr_tenant_2',
        name: 'Liam Chen',
        email: 'liam.chen@example.com',
        password: 'Password123!',
        role: 'tenant',
        phone: '(555) 345-6789'
      },
      {
        id: 'usr_tenant_3',
        name: 'Sophia Rodriguez',
        email: 'sophia.r@example.com',
        password: 'Password123!',
        role: 'tenant',
        phone: '(555) 456-7890'
      }
    ];
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(seed));
  }
}
initOfflineStorage();

async function offlineLogin(email, password, rememberMe) {
  await delay();
  const norm = (email || '').trim().toLowerCase();
  const users = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
  const user = users.find(u => u.email.toLowerCase() === norm);

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
  const user = getCurrentUser() || { id: 'usr_landlord_demo', role: 'landlord', name: 'Marcus Vance' };

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
    if (user.role === 'landlord') {
      return {
        data: {
          role: 'landlord',
          totalProperties: 4,
          totalUnits: 18,
          occupiedUnits: 17,
          vacantUnits: 1,
          occupancyRate: 94,
          monthlyRentRoll: 43450,
          paidRentThisMonth: 9000,
          pendingRent: 1650,
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
            rentAmount: 1650,
            depositAmount: 1650,
            unitName: 'Apt 4B',
            propertyName: 'Oakwood Manor Apartments',
            address: '742 Evergreen Terrace, Springfield, OR'
          },
          monthlyRent: 1650,
          nextDueDate: '2026-11-01',
          nextAmountDue: 1650,
          lastPaidAmount: 1650,
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
        { id: 'prop_1', name: 'Oakwood Manor Apartments', address: '742 Evergreen Terrace', city: 'Springfield', state: 'OR', zip_code: '97477', property_type: 'Apartment Building', units_count: 6, occupied_units_count: 5, occupancy_rate: 83, monthly_rent_total: 10450 },
        { id: 'prop_2', name: 'Highland Lofts', address: '1280 Beacon Street', city: 'Brookline', state: 'MA', zip_code: '02446', property_type: 'Multi-Family', units_count: 5, occupied_units_count: 5, occupancy_rate: 100, monthly_rent_total: 14350 },
        { id: 'prop_3', name: 'Maple Court Duplex', address: '452 Maple Ridge Rd', city: 'Austin', state: 'TX', zip_code: '78704', property_type: 'Duplex/Triplex', units_count: 2, occupied_units_count: 2, occupancy_rate: 100, monthly_rent_total: 5000 },
        { id: 'prop_4', name: 'Sunset Palms Residences', address: '901 Ocean Drive', city: 'Santa Monica', state: 'CA', zip_code: '90401', property_type: 'Multi-Family', units_count: 5, occupied_units_count: 5, occupancy_rate: 100, monthly_rent_total: 13650 }
      ]
    };
  }

  if (endpoint.startsWith('/units')) {
    return {
      data: [
        { id: 'unit_101', property_name: 'Oakwood Manor Apartments', unit_number: 'Apt 1A', bedrooms: 1, bathrooms: 1, square_feet: 680, rent_amount: 1450, status: 'occupied', current_tenant: { name: 'Sarah Jenkins' } },
        { id: 'unit_102', property_name: 'Oakwood Manor Apartments', unit_number: 'Apt 2A', bedrooms: 2, bathrooms: 1.5, square_feet: 920, rent_amount: 1850, status: 'occupied', current_tenant: { name: 'Liam Chen' } },
        { id: 'unit_104', property_name: 'Oakwood Manor Apartments', unit_number: 'Apt 4B', bedrooms: 2, bathrooms: 1.5, square_feet: 950, rent_amount: 1650, status: 'occupied', current_tenant: { name: 'Elena Rostova' } },
        { id: 'unit_106', property_name: 'Oakwood Manor Apartments', unit_number: 'Apt 6C', bedrooms: 1, bathrooms: 1, square_feet: 650, rent_amount: 1400, status: 'vacant', current_tenant: null },
        { id: 'unit_201', property_name: 'Highland Lofts', unit_number: 'Loft 101', bedrooms: 1, bathrooms: 1, square_feet: 800, rent_amount: 2200, status: 'occupied', current_tenant: { name: 'Sophia Rodriguez' } }
      ]
    };
  }

  if (endpoint.startsWith('/leases')) {
    return {
      data: [
        { id: 'lease_1', unit_number: 'Apt 4B', property_name: 'Oakwood Manor Apartments', tenant_name: 'Elena Rostova', tenant_email: 'tenant@rentroll.com', start_date: '2026-02-01', end_date: '2027-01-31', rent_amount: 1650, deposit_amount: 1650, status: 'active' },
        { id: 'lease_2', unit_number: 'Apt 2A', property_name: 'Oakwood Manor Apartments', tenant_name: 'Liam Chen', tenant_email: 'liam.chen@example.com', start_date: '2026-01-01', end_date: '2026-12-31', rent_amount: 1850, deposit_amount: 1850, status: 'active' },
        { id: 'lease_3', unit_number: 'Loft 101', property_name: 'Highland Lofts', tenant_name: 'Sophia Rodriguez', tenant_email: 'sophia.r@example.com', start_date: '2026-03-01', end_date: '2027-02-28', rent_amount: 2200, deposit_amount: 2200, status: 'active' }
      ]
    };
  }

  if (endpoint.startsWith('/payments')) {
    return {
      data: [
        { id: 'pay_101', property_name: 'Oakwood Manor', unit_number: 'Apt 4B', tenant_name: 'Elena Rostova', amount: 1650, due_date: '2026-10-01', paid_date: '2026-10-01', status: 'paid', payment_method: 'ach', transaction_ref: 'ACH-RR-90421', notes: 'October 2026 Rent - Paid on time' },
        { id: 'pay_104', property_name: 'Oakwood Manor', unit_number: 'Apt 2A', tenant_name: 'Liam Chen', amount: 1850, due_date: '2026-10-01', paid_date: '2026-10-02', status: 'paid', payment_method: 'credit_card', transaction_ref: 'CC-STRIPE-4028', notes: 'October 2026 Rent' },
        { id: 'pay_105', property_name: 'Highland Lofts', unit_number: 'Loft 101', tenant_name: 'Sophia Rodriguez', amount: 2200, due_date: '2026-10-01', paid_date: '2026-10-01', status: 'paid', payment_method: 'bank_transfer', transaction_ref: 'WIRE-BTR-1192', notes: 'October 2026 Rent' },
        { id: 'pay_106', property_name: 'Oakwood Manor', unit_number: 'Apt 4B', tenant_name: 'Elena Rostova', amount: 1650, due_date: '2026-11-01', paid_date: null, status: 'pending', payment_method: 'ach', transaction_ref: null, notes: 'November 2026 Rent (Upcoming)' }
      ]
    };
  }

  if (endpoint.startsWith('/maintenance')) {
    return {
      data: [
        { id: 'tkt_1', property_name: 'Oakwood Manor Apartments', unit_number: 'Apt 4B', tenant_name: 'Elena Rostova', title: 'Low hot water pressure in master shower', category: 'plumbing', priority: 'high', status: 'in_progress', description: 'The hot water tap in the master bathroom shower has noticeably lower pressure since yesterday evening.', estimated_cost: 180, actual_cost: 0, resolution_notes: 'Plumber scheduled for tomorrow morning 9:00 AM.', created_at: '2026-10-24T14:20:00.000Z' },
        { id: 'tkt_2', property_name: 'Highland Lofts', unit_number: 'Loft 101', tenant_name: 'Sophia Rodriguez', title: 'HVAC heat pump making rhythmic clicking noise', category: 'hvac', priority: 'medium', status: 'open', description: 'When the heat turns on, there is a rhythmic click from the ceiling vent. Still heating fine.', estimated_cost: 150, actual_cost: 0, created_at: '2026-10-25T09:10:00.000Z' },
        { id: 'tkt_3', property_name: 'Oakwood Manor Apartments', unit_number: 'Apt 2A', tenant_name: 'Liam Chen', title: 'Kitchen garbage disposal jam cleared', category: 'appliance', priority: 'low', status: 'resolved', description: 'Disposal humming but not spinning after dinner.', estimated_cost: 75, actual_cost: 65, resolution_notes: 'Cleared small coin obstruction with hex wrench.', created_at: '2026-10-18T16:45:00.000Z' }
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

  return { success: true, data: {} };
}

