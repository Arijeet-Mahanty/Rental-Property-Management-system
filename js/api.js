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
  // When running directly via Django on port 8000 or root production domain, use relative /api
  if (port === '8000' || port === '') {
    return '/api';
  }
  // Any frontend dev server (5500, 5501, 3000, 5173, etc.) routes to Django on 8000
  return `http://${hostname || '127.0.0.1'}:8000/api`;
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
    clearStoredToken();
  } catch (_) {}
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

/**
 * Requests a secure password reset link for the provided email.
 * @param {string} email
 * @returns {Promise<Object>}
 */
export async function requestPasswordReset(email) {
  return await request('/auth/password-reset/request', {
    method: 'POST',
    body: { email }
  });
}

/**
 * Validates a password reset token.
 * @param {string} token
 * @returns {Promise<Object>}
 */
export async function verifyPasswordResetToken(token) {
  return await request(`/auth/password-reset/verify?token=${encodeURIComponent(token)}`, {
    method: 'GET'
  });
}

/**
 * Sets a new password using a valid reset token.
 * @param {string} token
 * @param {string} newPassword
 * @returns {Promise<Object>}
 */
export async function confirmPasswordReset(token, newPassword) {
  return await request('/auth/password-reset/confirm', {
    method: 'POST',
    body: { token, new_password: newPassword }
  });
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
 * Fetches public aggregated platform metrics for the landing page.
 */
export async function getPublicStats() {
  const res = await request('/dashboard/stats?public=true', { method: 'GET' });
  return res.data;
}

/**
 * Fetches properties (all if isPublic or portfolio).
 */
export async function getProperties(isPublic = false) {
  const endpoint = isPublic ? '/properties?public=true' : '/properties';
  const res = await request(endpoint, { method: 'GET' });
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
 * Submits a rental application for a property.
 */
export async function applyForProperty(propertyId, applicationData) {
  const res = await request(`/properties/${propertyId}/apply/`, {
    method: 'POST',
    body: applicationData
  });
  return res;
}

/**
 * Updates a lease application action (approve or decline).
 */
export async function updateLeaseStatus(leaseId, action) {
  const res = await request(`/leases/${leaseId}/action/`, {
    method: 'POST',
    body: { action }
  });
  return res;
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
 * Generates an Indian UPI Payment Order (Razorpay / Cashfree standard format).
 */
export async function createUpiPaymentOrder(orderData) {
  const res = await request('/payments/create-order', {
    method: 'POST',
    body: orderData
  });
  return res;
}

/**
 * Verifies UPI payment settlement and records transaction in ledger.
 */
export async function verifyUpiWebhookPayment(verifyData) {
  const res = await request('/payments/verify-webhook', {
    method: 'POST',
    body: verifyData
  });
  return res;
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
 * Increments helpful count for a review.
 */
export async function upvoteFeedbackReview(reviewId) {
  const res = await request(`/feedback/${encodeURIComponent(reviewId)}/helpful`, {
    method: 'POST'
  });
  return res;
}

/**
 * Fetches platform-wide registered users (Admin Command Center)
 */
export async function getAdminUsers() {
  const res = await request('/admin/users', { method: 'GET' });
  return res.data || [];
}

/**
 * Toggles a user's access status (Revoke / Restore) - Platform Admin only
 * @param {string} userId
 */
export async function adminToggleUserStatus(userId) {
  return await request(`/admin/users/${userId}/toggle-status`, { method: 'POST' });
}

/**
 * Fetches contact inquiries and reviews (Admin Command Center)
 */
export async function getAdminInquiries() {
  const res = await request('/admin/inquiries', { method: 'GET' });
  return res || { inquiries: [], reviews: [] };
}

/**
 * Sends a message to the Context-aware AI Assistant endpoint (/api/chatbot).
 * @param {string} message
 * @param {Array} [history=[]]
 * @returns {Promise<{success: boolean, reply: string, action?: Object, suggestions?: Array<string>}>}
 */
export async function sendChatMessage(message, history = []) {
  const res = await request('/chatbot', {
    method: 'POST',
    body: { message, history }
  });
  return res;
}

// ----------------------------------------------------------------------------
// CLIENT-SIDE OFFLINE FALLBACK ENGINE
// ----------------------------------------------------------------------------

function delay(ms = ARTIFICIAL_DELAY_MS) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function offlineLogin(email, password, rememberMe) {
  await delay();
  const norm = (email || '').trim().toLowerCase();
  const users = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
  let user = users.find(u => u.email && u.email.toLowerCase() === norm);

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
  const user = getCurrentUser();

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

  if (endpoint.startsWith('/auth/password-reset/request')) {
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : (options.body || {});
    const email = (body.email || '').toLowerCase().trim();
    const mockToken = `mock_rst_${Date.now()}`;
    return {
      success: true,
      message: 'If an account is associated with this email address, password reset instructions have been sent.',
      reset_url: `reset-password.html?token=${mockToken}`,
      token: mockToken
    };
  }

  if (endpoint.startsWith('/auth/password-reset/verify')) {
    return {
      success: true,
      valid: true,
      email: 'user@rentroll.com',
      message: 'Token is valid.'
    };
  }

  if (endpoint.startsWith('/auth/password-reset/confirm')) {
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : (options.body || {});
    const newPass = body.new_password || body.password;
    if (!newPass || newPass.length < 8) {
      const err = new Error('Password must be at least 8 characters long.');
      err.status = 400;
      throw err;
    }
    return {
      success: true,
      message: 'Your password has been successfully reset. You can now log in with your new password.'
    };
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
    if (endpoint.includes('public=true')) {
      return {
        data: {
          role: 'public',
          totalProperties: 0,
          totalUnits: 0,
          occupiedUnits: 0,
          occupancyRate: 0,
          totalRentCollected: 0,
          monthlyRentRoll: 0,
          activeLeasesCount: 0,
          reviewsCount: 0,
          onTimePaymentRate: 100
        }
      };
    }
    if (!user) {
      return { data: { role: 'guest', totalProperties: 0, totalUnits: 0, monthlyRentRoll: 0 } };
    }
    if (user.role === 'admin') {
      return {
        data: {
          role: 'admin',
          totalUsers: 0,
          totalLandlords: 0,
          totalTenants: 0,
          totalProperties: 0,
          totalUnits: 0,
          occupiedUnits: 0,
          vacantUnits: 0,
          occupancyRate: 0,
          monthlyRentRoll: 0,
          paidRentTotal: 0,
          pendingRentTotal: 0,
          activeLeasesCount: 0,
          openMaintenanceCount: 0,
          inquiriesCount: 0,
          reviewsCount: 0
        }
      };
    } else if (user.role === 'landlord') {
      return {
        data: {
          role: 'landlord',
          totalProperties: 0,
          totalUnits: 0,
          occupiedUnits: 0,
          vacantUnits: 0,
          occupancyRate: 0,
          monthlyRentRoll: 0,
          paidRentThisMonth: 0,
          pendingRent: 0,
          openMaintenanceCount: 0,
          highPriorityMaintenanceCount: 0
        }
      };
    } else {
      return {
        data: {
          role: 'tenant',
          activeLease: null,
          monthlyRent: 0,
          nextDueDate: null,
          nextAmountDue: 0,
          lastPaidAmount: 0,
          lastPaidDate: null,
          openTicketsCount: 0,
          totalTicketsCount: 0
        }
      };
    }
  }

  if (endpoint.startsWith('/properties')) {
    if (options.method === 'POST') {
      let body = {};
      try {
        body = typeof options.body === 'string' ? JSON.parse(options.body) : (options.body || {});
      } catch (e) {
        body = {};
      }
      const newProp = {
        id: `prop_local_${Date.now()}`,
        name: body.name || 'New Property',
        address: body.address || 'Address',
        city: body.city || 'City',
        state: body.state || 'State',
        zip_code: body.zip_code || '',
        property_type: body.property_type || 'Apartment Building',
        image_url: 'assets/indian_modern_villa.jpg',
        units_count: 0,
        occupied_units_count: 0,
        occupancy_rate: 0,
        monthly_rent_total: 0,
        created_at: new Date().toISOString()
      };
      const stored = JSON.parse(localStorage.getItem('rentroll_properties') || '[]');
      stored.unshift(newProp);
      localStorage.setItem('rentroll_properties', JSON.stringify(stored));
      return { success: true, message: 'Property created successfully.', data: newProp };
    }

    const localProps = JSON.parse(localStorage.getItem('rentroll_properties') || '[]');
    return {
      data: localProps
    };
  }

  if (endpoint.startsWith('/units')) {
    return { data: [] };
  }

  if (endpoint.startsWith('/leases')) {
    return { data: [] };
  }

  if (endpoint.startsWith('/payments')) {
    return { data: [] };
  }

  if (endpoint.startsWith('/maintenance')) {
    return { data: [] };
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
      data: []
    };
  }

  if (endpoint.startsWith('/admin/inquiries')) {
    return {
      success: true,
      inquiries: [],
      reviews: []
    };
  }

  if (endpoint.startsWith('/chatbot')) {
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : (options.body || {});
    const msg = (body.message || '').toLowerCase();
    const user = getCurrentUser() || { name: 'User', role: 'tenant' };

    let reply = `Hello ${user.name}! I am your RentRoll AI Assistant. How can I help you today?`;
    let action = null;
    let suggestions = ['How to pay rent via UPI?', 'Download HRA rent receipt', 'Submit maintenance ticket'];

    if (user.role === 'tenant') {
      if (msg.includes('pay') || msg.includes('rent') || msg.includes('upi') || msg.includes('due')) {
        reply = `Hello ${user.name}! You can pay your rent directly from the Payments tab using UPI AutoPay or Netbanking.`;
        action = { type: 'switch_tab', target: 'payments', label: '💳 Go to Payments' };
        suggestions = ['Download HRA rent receipt', 'Submit maintenance ticket', 'When does my lease expire?'];
      } else if (msg.includes('hra') || msg.includes('tax') || msg.includes('receipt')) {
        reply = `RentRoll automatically generates digitally signed HRA rent receipts. You can download them anytime from your Rent Ledger.`;
        action = { type: 'switch_tab', target: 'payments', label: '📄 Go to Rent Ledger & Receipts' };
        suggestions = ['How to pay rent via UPI?', 'Submit maintenance ticket', 'Notice period rules'];
      } else if (msg.includes('repair') || msg.includes('maintenance') || msg.includes('ticket') || msg.includes('fix')) {
        reply = `You can submit a repair request anytime for rapid technician dispatch.`;
        action = { type: 'open_modal', target: 'modal-create-ticket', label: '🔧 Submit Repair Request' };
        suggestions = ['How to pay rent via UPI?', 'Download HRA rent receipt', 'What are tenant responsibilities?'];
      } else if (msg.includes('lease') || msg.includes('notice') || msg.includes('terms') || msg.includes('deposit')) {
        reply = `Your active lease details and tenancy agreements are accessible in the Leases tab.`;
        action = { type: 'switch_tab', target: 'leases', label: '📑 View My Lease Details' };
        suggestions = ['How to pay rent via UPI?', 'Download HRA rent receipt', 'Report a maintenance issue'];
      }
    } else {
      if (msg.includes('cashflow') || msg.includes('yield') || msg.includes('rent roll') || msg.includes('revenue')) {
        reply = `Hello ${user.name}! You can monitor your real-time contracted rent roll and occupancy in the Payments and Overview tabs.`;
        action = { type: 'switch_tab', target: 'payments', label: '📊 Open Rent Ledger & Export CSV' };
        suggestions = ['Check vacant units', 'Pending maintenance tickets', 'Create new lease'];
      } else if (msg.includes('unit') || msg.includes('occupancy') || msg.includes('vacan') || msg.includes('door')) {
        reply = `You can manage your doors and view vacancies from the Properties & Units tab.`;
        action = { type: 'open_modal', target: 'modal-add-unit', label: '🏠 Add New Door / Unit' };
        suggestions = ['Create new lease agreement', 'Portfolio cashflow & yield', 'Pending maintenance tickets'];
      } else if (msg.includes('lease') || msg.includes('stamp') || msg.includes('agreement')) {
        reply = `You can draft, review, and manage lease agreements in the Leases & Tenancy tab.`;
        action = { type: 'open_modal', target: 'modal-create-lease', label: '📑 Create New Lease Agreement' };
        suggestions = ['Portfolio cashflow & yield', 'Check vacant units', 'Maintenance work orders'];
      } else if (msg.includes('repair') || msg.includes('maintenance') || msg.includes('ticket')) {
        reply = `You have real-time triage for all repair requests submitted by residents.`;
        action = { type: 'switch_tab', target: 'maintenance', label: '🔧 Open Maintenance Triage' };
        suggestions = ['Portfolio cashflow & yield', 'Check vacant units', 'Record rent payment'];
      }
    }

    return {
      success: true,
      reply,
      action,
      suggestions
    };
  }

  return { success: true, data: {} };
}

