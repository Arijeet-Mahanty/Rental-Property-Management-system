/**
 * RentRoll - Auth Flows & Page Logic (Login, Signup, Dashboard Guard)
 */
import { login, signup, getCurrentUser, logout } from './api.js';
import {
  validateEmail,
  validateName,
  validateLoginPassword,
  validateSignupPassword,
  validateMatch,
  validateCheckbox,
  setFieldError,
  clearFieldError,
  updateStrengthMeterUI
} from './validation.js';
import { showToast } from './components.js';

// Eye & Eye-Off SVGs for password visibility toggles
const SVG_EYE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const SVG_EYE_OFF = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

/**
 * Attaches show/hide password toggle behavior to a button and its associated input.
 * @param {HTMLButtonElement} btn
 * @param {HTMLInputElement} input
 */
function setupPasswordToggle(btn, input) {
  if (!btn || !input) return;

  btn.innerHTML = SVG_EYE;
  btn.setAttribute('aria-label', 'Show password text');

  btn.addEventListener('click', () => {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.innerHTML = isPassword ? SVG_EYE_OFF : SVG_EYE;
    btn.setAttribute('aria-label', isPassword ? 'Hide password text' : 'Show password text');
    input.focus();
  });
}

/**
 * Initializes the Login Form behavior.
 */
export function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  // Route guard: if already logged in, redirect to dashboard
  if (getCurrentUser()) {
    window.location.replace('dashboard.html');
    return;
  }

  const emailInput = document.getElementById('login-email');
  const emailError = document.getElementById('login-email-error');
  const passwordInput = document.getElementById('login-password');
  const passwordError = document.getElementById('login-password-error');
  const rememberCheckbox = document.getElementById('login-remember');
  const submitBtn = document.getElementById('login-submit-btn');
  const togglePassBtn = document.getElementById('login-toggle-password');
  const generalAlert = document.getElementById('login-general-alert');

  setupPasswordToggle(togglePassBtn, passwordInput);

  // Setup quick demo fill buttons
  const demoLandlordBtn = document.getElementById('fill-demo-landlord');
  const demoTenantBtn = document.getElementById('fill-demo-tenant');

  if (demoLandlordBtn) {
    demoLandlordBtn.addEventListener('click', () => {
      emailInput.value = 'landlord@rentroll.com';
      passwordInput.value = 'Password123!';
      clearFieldError(emailInput, emailError);
      clearFieldError(passwordInput, passwordError);
      showToast('Credentials Populated', 'Filled Landlord demo account details.', 'info', 2500);
    });
  }

  if (demoTenantBtn) {
    demoTenantBtn.addEventListener('click', () => {
      emailInput.value = 'tenant@rentroll.com';
      passwordInput.value = 'Password123!';
      clearFieldError(emailInput, emailError);
      clearFieldError(passwordInput, passwordError);
      showToast('Credentials Populated', 'Filled Tenant demo account details.', 'info', 2500);
    });
  }

  // Live input validation on blur
  emailInput.addEventListener('blur', () => {
    const err = validateEmail(emailInput.value);
    if (err) setFieldError(emailInput, emailError, err);
    else clearFieldError(emailInput, emailError);
  });

  emailInput.addEventListener('input', () => {
    if (emailInput.getAttribute('aria-invalid') === 'true') {
      const err = validateEmail(emailInput.value);
      if (!err) clearFieldError(emailInput, emailError);
    }
  });

  passwordInput.addEventListener('blur', () => {
    const err = validateLoginPassword(passwordInput.value);
    if (err) setFieldError(passwordInput, passwordError, err);
    else clearFieldError(passwordInput, passwordError);
  });

  passwordInput.addEventListener('input', () => {
    if (passwordInput.getAttribute('aria-invalid') === 'true') {
      const err = validateLoginPassword(passwordInput.value);
      if (!err) clearFieldError(passwordInput, passwordError);
    }
  });

  // Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (generalAlert) {
      generalAlert.textContent = '';
      generalAlert.classList.remove('is-visible');
    }

    const emailErr = validateEmail(emailInput.value);
    const passErr = validateLoginPassword(passwordInput.value);

    let hasErrors = false;
    if (emailErr) {
      setFieldError(emailInput, emailError, emailErr);
      hasErrors = true;
    } else {
      clearFieldError(emailInput, emailError);
    }

    if (passErr) {
      setFieldError(passwordInput, passwordError, passErr);
      hasErrors = true;
    } else {
      clearFieldError(passwordInput, passwordError);
    }

    if (hasErrors) {
      if (emailErr) emailInput.focus();
      else passwordInput.focus();
      return;
    }

    // Set Loading State
    submitBtn.classList.add('btn--loading');
    submitBtn.setAttribute('disabled', 'true');
    const submitText = submitBtn.querySelector('.btn__text');
    if (submitText) submitText.textContent = 'Verifying credentials...';

    try {
      const user = await login(
        emailInput.value,
        passwordInput.value,
        rememberCheckbox ? rememberCheckbox.checked : false
      );

      showToast('Sign in successful!', `Welcome back, ${user.name}.`, 'success', 2500);

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 500);
    } catch (err) {
      submitBtn.classList.remove('btn--loading');
      submitBtn.removeAttribute('disabled');
      if (submitText) submitText.textContent = 'Log In';

      showToast('Sign in failed', err.message, 'error', 4500);

      if (generalAlert) {
        generalAlert.textContent = err.message;
        generalAlert.classList.add('is-visible');
      }
      passwordInput.focus();
    }
  });
}

/**
 * Initializes the Sign-Up Form behavior.
 */
export function initSignupForm() {
  const form = document.getElementById('signup-form');
  if (!form) return;

  // Route guard: if already logged in, redirect to dashboard
  if (getCurrentUser()) {
    window.location.replace('dashboard.html');
    return;
  }

  const nameInput = document.getElementById('signup-name');
  const nameError = document.getElementById('signup-name-error');
  const emailInput = document.getElementById('signup-email');
  const emailError = document.getElementById('signup-email-error');
  const passwordInput = document.getElementById('signup-password');
  const passwordError = document.getElementById('signup-password-error');
  const confirmInput = document.getElementById('signup-confirm-password');
  const confirmError = document.getElementById('signup-confirm-error');
  const termsCheckbox = document.getElementById('signup-terms');
  const termsError = document.getElementById('signup-terms-error');
  const submitBtn = document.getElementById('signup-submit-btn');
  const strengthMeter = document.getElementById('password-strength-meter');
  const togglePassBtn = document.getElementById('signup-toggle-password');
  const toggleConfirmBtn = document.getElementById('signup-toggle-confirm');
  const generalAlert = document.getElementById('signup-general-alert');

  setupPasswordToggle(togglePassBtn, passwordInput);
  setupPasswordToggle(toggleConfirmBtn, confirmInput);

  // Live password strength meter
  passwordInput.addEventListener('input', () => {
    updateStrengthMeterUI(strengthMeter, passwordInput.value);
    if (passwordInput.getAttribute('aria-invalid') === 'true') {
      const err = validateSignupPassword(passwordInput.value);
      if (!err) clearFieldError(passwordInput, passwordError);
    }
    if (confirmInput.value) {
      const matchErr = validateMatch(passwordInput.value, confirmInput.value, 'Passwords');
      if (!matchErr) clearFieldError(confirmInput, confirmError);
    }
  });

  // Blur validations
  nameInput.addEventListener('blur', () => {
    const err = validateName(nameInput.value);
    if (err) setFieldError(nameInput, nameError, err);
    else clearFieldError(nameInput, nameError);
  });

  emailInput.addEventListener('blur', () => {
    const err = validateEmail(emailInput.value);
    if (err) setFieldError(emailInput, emailError, err);
    else clearFieldError(emailInput, emailError);
  });

  passwordInput.addEventListener('blur', () => {
    const err = validateSignupPassword(passwordInput.value);
    if (err) setFieldError(passwordInput, passwordError, err);
    else clearFieldError(passwordInput, passwordError);
  });

  confirmInput.addEventListener('blur', () => {
    const err = validateMatch(passwordInput.value, confirmInput.value, 'Passwords');
    if (err) setFieldError(confirmInput, confirmError, err);
    else clearFieldError(confirmInput, confirmError);
  });

  termsCheckbox.addEventListener('change', () => {
    const err = validateCheckbox(termsCheckbox.checked);
    if (err) setFieldError(termsCheckbox, termsError, err);
    else clearFieldError(termsCheckbox, termsError);
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (generalAlert) {
      generalAlert.textContent = '';
      generalAlert.classList.remove('is-visible');
    }

    const nameErr = validateName(nameInput.value);
    const emailErr = validateEmail(emailInput.value);
    const passErr = validateSignupPassword(passwordInput.value);
    const confirmErr = validateMatch(passwordInput.value, confirmInput.value, 'Passwords');
    const termsErr = validateCheckbox(termsCheckbox.checked);

    let hasErrors = false;
    let firstInvalid = null;

    if (nameErr) {
      setFieldError(nameInput, nameError, nameErr);
      hasErrors = true;
      if (!firstInvalid) firstInvalid = nameInput;
    } else {
      clearFieldError(nameInput, nameError);
    }

    if (emailErr) {
      setFieldError(emailInput, emailError, emailErr);
      hasErrors = true;
      if (!firstInvalid) firstInvalid = emailInput;
    } else {
      clearFieldError(emailInput, emailError);
    }

    if (passErr) {
      setFieldError(passwordInput, passwordError, passErr);
      hasErrors = true;
      if (!firstInvalid) firstInvalid = passwordInput;
    } else {
      clearFieldError(passwordInput, passwordError);
    }

    if (confirmErr) {
      setFieldError(confirmInput, confirmError, confirmErr);
      hasErrors = true;
      if (!firstInvalid) firstInvalid = confirmInput;
    } else {
      clearFieldError(confirmInput, confirmError);
    }

    if (termsErr) {
      setFieldError(termsCheckbox, termsError, termsErr);
      hasErrors = true;
      if (!firstInvalid) firstInvalid = termsCheckbox;
    } else {
      clearFieldError(termsCheckbox, termsError);
    }

    if (hasErrors) {
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    // Determine chosen role
    const selectedRoleInput = form.querySelector('input[name="role"]:checked');
    const role = selectedRoleInput ? selectedRoleInput.value : 'landlord';

    // Set Loading State
    submitBtn.classList.add('btn--loading');
    submitBtn.setAttribute('disabled', 'true');
    const submitText = submitBtn.querySelector('.btn__text');
    if (submitText) submitText.textContent = 'Creating your account...';

    try {
      const user = await signup({
        name: nameInput.value,
        email: emailInput.value,
        password: passwordInput.value,
        role: role
      });

      showToast('Account Created!', `Welcome to RentRoll, ${user.name}.`, 'success', 2500);

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 500);
    } catch (err) {
      submitBtn.classList.remove('btn--loading');
      submitBtn.removeAttribute('disabled');
      if (submitText) submitText.textContent = 'Create Account';

      showToast('Sign up failed', err.message, 'error', 4500);

      if (generalAlert) {
        generalAlert.textContent = err.message;
        generalAlert.classList.add('is-visible');
      }
      emailInput.focus();
    }
  });
}

/**
 * Enforces route authentication guard for dashboard.html.
 * Redirects to login.html if user is not authenticated.
 */
export function checkDashboardAuth() {
  const user = getCurrentUser();
  if (!user) {
    showToast('Authentication required', 'Please log in to access the dashboard.', 'error', 3000);
    window.location.replace('login.html');
    return null;
  }
  return user;
}

/**
 * Initializes dashboard placeholder page.
 */
export function initDashboardPage() {
  const user = checkDashboardAuth();
  if (!user) return;

  const nameEl = document.getElementById('dash-user-name');
  const roleBadgeEl = document.getElementById('dash-role-badge');
  const emailMetaEl = document.getElementById('dash-user-email');
  const avatarEl = document.getElementById('dash-user-avatar');
  const logoutBtn = document.getElementById('dash-logout-btn');
  const statsContainer = document.getElementById('dash-stats-container');

  if (nameEl) nameEl.textContent = `Welcome back, ${user.name}!`;
  if (emailMetaEl) emailMetaEl.textContent = user.email;
  if (avatarEl && user.name) {
    avatarEl.textContent = user.name.charAt(0).toUpperCase();
  }

  if (roleBadgeEl) {
    const isLandlord = user.role === 'landlord';
    roleBadgeEl.className = `badge ${isLandlord ? 'badge--landlord' : 'badge--tenant'}`;
    roleBadgeEl.textContent = isLandlord ? 'Landlord Account' : 'Tenant Account';
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await logout();
      showToast('Logged out', 'You have been safely signed out.', 'info', 2000);
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 400);
    });
  }

  // Populate dynamic stats cards depending on role
  if (statsContainer) {
    if (user.role === 'landlord') {
      statsContainer.innerHTML = `
        <div class="glass-card dash-stat-card">
          <div class="dash-stat-card__header">
            <span class="dash-stat-card__title">Total Properties</span>
            <span class="badge badge--landlord">Portfolio</span>
          </div>
          <div class="dash-stat-card__val">${user.propertiesCount || 4}</div>
          <div class="dash-stat-card__sub">&uarr; 1 Added this quarter</div>
        </div>

        <div class="glass-card dash-stat-card">
          <div class="dash-stat-card__header">
            <span class="dash-stat-card__title">Active Units</span>
            <span class="badge badge--landlord">94.7% Occupied</span>
          </div>
          <div class="dash-stat-card__val">${user.unitsCount || 18}</div>
          <div class="dash-stat-card__sub">1 Unit turning over</div>
        </div>

        <div class="glass-card dash-stat-card">
          <div class="dash-stat-card__header">
            <span class="dash-stat-card__title">Monthly Rent Roll</span>
            <span class="badge badge--landlord">October</span>
          </div>
          <div class="dash-stat-card__val">$26,450</div>
          <div class="dash-stat-card__sub">98.5% Collected on time</div>
        </div>

        <div class="glass-card dash-stat-card">
          <div class="dash-stat-card__header">
            <span class="dash-stat-card__title">Maintenance Requests</span>
            <span class="badge badge--landlord">Action Req.</span>
          </div>
          <div class="dash-stat-card__val">2 Open</div>
          <div class="dash-stat-card__sub" style="color: var(--color-warning);">1 High priority plumbing</div>
        </div>
      `;
    } else {
      // Tenant view
      statsContainer.innerHTML = `
        <div class="glass-card dash-stat-card">
          <div class="dash-stat-card__header">
            <span class="dash-stat-card__title">Assigned Home</span>
            <span class="badge badge--tenant">Active Lease</span>
          </div>
          <div class="dash-stat-card__val" style="font-size: var(--font-size-xl);">${user.unit || 'Apt 4B - Oakwood'}</div>
          <div class="dash-stat-card__sub">Lease ends: Dec 31, 2026</div>
        </div>

        <div class="glass-card dash-stat-card">
          <div class="dash-stat-card__header">
            <span class="dash-stat-card__title">Monthly Rent</span>
            <span class="badge badge--tenant">Autopay ON</span>
          </div>
          <div class="dash-stat-card__val">$${user.rentAmount || 1650}</div>
          <div class="dash-stat-card__sub">Paid for current month</div>
        </div>

        <div class="glass-card dash-stat-card">
          <div class="dash-stat-card__header">
            <span class="dash-stat-card__title">Next Due Date</span>
            <span class="badge badge--tenant">Scheduled</span>
          </div>
          <div class="dash-stat-card__val">Nov 1</div>
          <div class="dash-stat-card__sub">ACH direct withdrawal</div>
        </div>

        <div class="glass-card dash-stat-card">
          <div class="dash-stat-card__header">
            <span class="dash-stat-card__title">Repair Requests</span>
            <span class="badge badge--tenant">Support</span>
          </div>
          <div class="dash-stat-card__val">0 Open</div>
          <div class="dash-stat-card__sub">Everything is in order</div>
        </div>
      `;
    }
  }
}
