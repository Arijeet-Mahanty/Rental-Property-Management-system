/**
 * RentRoll - Auth Flows & Page Logic (Login, Signup, Dashboard Guard)
 */
import { 
  login, 
  signup, 
  getCurrentUser, 
  logout, 
  getStoredToken, 
  clearStoredToken,
  requestPasswordReset,
  verifyPasswordResetToken,
  confirmPasswordReset
} from './api.js';
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

  // Route guard: if already logged in with active token, redirect to destination
  const urlParams = new URLSearchParams(window.location.search);
  const redirectTarget = urlParams.get('redirect');

  if (getCurrentUser() && getStoredToken()) {
    window.location.replace(redirectTarget || 'dashboard.html');
    return;
  } else if (!getStoredToken()) {
    clearStoredToken();
  }

  // Preserve redirect parameter on link to signup
  if (redirectTarget) {
    const signupLink = document.querySelector('.auth-footer a[href^="signup.html"]');
    if (signupLink) {
      signupLink.href = `signup.html?redirect=${encodeURIComponent(redirectTarget)}`;
    }
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
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect');
        window.location.href = redirect || 'dashboard.html';
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

  // Forgot Password Recovery Modal Wiring
  const forgotLink = document.getElementById('forgot-password-link');
  const forgotModal = document.getElementById('modal-forgot-password');
  const forgotForm = document.getElementById('form-forgot-password');
  const forgotEmailInput = document.getElementById('forgot-email');
  const forgotEmailError = document.getElementById('forgot-email-error');
  const forgotSuccessBox = document.getElementById('forgot-success-box');
  const forgotSuccessText = document.getElementById('forgot-success-text');
  const forgotDevLinkWrap = document.getElementById('forgot-dev-link-wrap');
  const forgotDevLink = document.getElementById('forgot-dev-link');

  if (forgotLink && forgotModal) {
    const openForgotModal = () => {
      forgotModal.classList.add('is-open');
      forgotModal.setAttribute('aria-hidden', 'false');
      if (emailInput && emailInput.value && forgotEmailInput && !forgotEmailInput.value) {
        forgotEmailInput.value = emailInput.value;
      }
      setTimeout(() => forgotEmailInput && forgotEmailInput.focus(), 120);
    };

    const closeForgotModal = () => {
      forgotModal.classList.remove('is-open');
      forgotModal.setAttribute('aria-hidden', 'true');
    };

    forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      openForgotModal();
    });

    forgotModal.querySelectorAll('.neo-modal-close, .btn-modal-cancel').forEach(btn => {
      btn.addEventListener('click', closeForgotModal);
    });

    forgotModal.addEventListener('click', (e) => {
      if (e.target === forgotModal) closeForgotModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && forgotModal.classList.contains('is-open')) {
        closeForgotModal();
      }
    });

    if (forgotForm) {
      forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailVal = (forgotEmailInput ? forgotEmailInput.value : '').trim();
        const emailErr = validateEmail(emailVal);
        if (emailErr) {
          setFieldError(forgotEmailInput, forgotEmailError, emailErr);
          forgotEmailInput.focus();
          return;
        }
        clearFieldError(forgotEmailInput, forgotEmailError);

        const forgotSubmitBtn = forgotForm.querySelector('#btn-submit-forgot');
        if (forgotSubmitBtn) {
          forgotSubmitBtn.classList.add('btn--loading');
          forgotSubmitBtn.disabled = true;
        }

        try {
          const res = await requestPasswordReset(emailVal);
          if (forgotSuccessBox && forgotSuccessText) {
            forgotSuccessText.textContent = res.message || 'If an account is associated with this email address, password reset instructions have been sent.';
            forgotSuccessBox.style.display = 'block';

            if (res.reset_url && forgotDevLink && forgotDevLinkWrap) {
              forgotDevLink.href = res.reset_url;
              forgotDevLinkWrap.style.display = 'block';
            }
          }
          showToast('Instructions Sent', 'Check your email inbox for password recovery instructions.', 'success', 4500);
        } catch (err) {
          showToast('Request Failed', err.message, 'error', 4000);
          setFieldError(forgotEmailInput, forgotEmailError, err.message);
        } finally {
          if (forgotSubmitBtn) {
            forgotSubmitBtn.classList.remove('btn--loading');
            forgotSubmitBtn.disabled = false;
          }
        }
      });
    }
  }
}

/**
 * Initializes the Sign-Up Form behavior.
 */
export function initSignupForm() {
  const form = document.getElementById('signup-form');
  if (!form) return;

  // Route guard: if already logged in with active token, redirect to destination
  const urlParams = new URLSearchParams(window.location.search);
  const redirectTarget = urlParams.get('redirect');

  if (getCurrentUser() && getStoredToken()) {
    window.location.replace(redirectTarget || 'dashboard.html');
    return;
  } else if (!getStoredToken()) {
    clearStoredToken();
  }

  // Preserve redirect parameter on link to login
  if (redirectTarget) {
    const loginLink = document.querySelector('.auth-footer a[href^="login.html"]');
    if (loginLink) {
      loginLink.href = `login.html?redirect=${encodeURIComponent(redirectTarget)}`;
    }
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
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect');
        window.location.href = redirect || 'dashboard.html';
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
    if (user.role === 'admin') {
      roleBadgeEl.className = 'badge badge--admin';
      roleBadgeEl.textContent = 'Platform Admin';
    } else if (user.role === 'landlord') {
      roleBadgeEl.className = 'badge badge--landlord';
      roleBadgeEl.textContent = 'Landlord Account';
    } else {
      roleBadgeEl.className = 'badge badge--tenant';
      roleBadgeEl.textContent = 'Tenant Account';
    }
  }

  if (logoutBtn) {
    logoutBtn.style.display = user.role === 'admin' ? 'inline-flex' : 'none';
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      if (e) e.preventDefault();
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (_) {}
      try { logout().catch(() => {}); } catch (_) {}
      showToast('Logged out', 'You have been safely signed out.', 'info', 1200);
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 150);
    });
  }

  // Legacy stats container delegating to dashboard.js
  if (statsContainer) {
    statsContainer.innerHTML = '';
  }
}

/**
 * Initializes the Reset Password Page behavior.
 */
export async function initResetPasswordForm() {
  const form = document.getElementById('reset-password-form');
  const loadingState = document.getElementById('token-loading-state');
  const invalidState = document.getElementById('token-invalid-state');
  const invalidDesc = document.getElementById('token-invalid-desc');
  const successState = document.getElementById('reset-success-state');
  const generalAlert = document.getElementById('reset-general-alert');

  if (!form && !loadingState) return;

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  if (!token) {
    if (loadingState) loadingState.style.display = 'none';
    if (invalidState) {
      invalidState.style.display = 'block';
      if (invalidDesc) {
        invalidDesc.textContent = 'No password recovery token was found in the link. Please request a new recovery link from the login page.';
      }
    }
    return;
  }

  // Pre-flight verify token with backend
  try {
    const res = await verifyPasswordResetToken(token);
    if (!res || !res.valid) {
      throw new Error((res && res.message) || 'This password reset link is invalid or has expired.');
    }

    if (loadingState) loadingState.style.display = 'none';
    if (form) form.style.display = 'block';

    const emailDisplay = document.getElementById('reset-user-email');
    if (emailDisplay) {
      emailDisplay.textContent = res.masked_email || res.email || 'your account';
    }
  } catch (err) {
    if (loadingState) loadingState.style.display = 'none';
    if (invalidState) {
      invalidState.style.display = 'block';
      if (invalidDesc) {
        invalidDesc.textContent = err.message || 'This password reset link is invalid or has expired. Please request a new recovery link.';
      }
    }
    return;
  }

  // Set up inputs and strength meter
  const passInput = document.getElementById('reset-password');
  const passError = document.getElementById('reset-password-error');
  const confirmInput = document.getElementById('reset-confirm');
  const confirmError = document.getElementById('reset-confirm-error');
  const submitBtn = document.getElementById('reset-submit-btn');
  const togglePassBtn = document.getElementById('reset-toggle-password');
  const toggleConfirmBtn = document.getElementById('reset-toggle-confirm');
  const strengthMeter = document.getElementById('password-strength-meter');

  setupPasswordToggle(togglePassBtn, passInput);
  setupPasswordToggle(toggleConfirmBtn, confirmInput);

  if (passInput && strengthMeter) {
    passInput.addEventListener('input', () => {
      updateStrengthMeterUI(passInput.value, strengthMeter);
      if (passInput.getAttribute('aria-invalid') === 'true') {
        const err = validateSignupPassword(passInput.value);
        if (!err) clearFieldError(passInput, passError);
      }
    });

    passInput.addEventListener('blur', () => {
      const err = validateSignupPassword(passInput.value);
      if (err) setFieldError(passInput, passError, err);
      else clearFieldError(passInput, passError);
    });
  }

  if (confirmInput) {
    confirmInput.addEventListener('input', () => {
      if (confirmInput.getAttribute('aria-invalid') === 'true') {
        const err = validateMatch(passInput.value, confirmInput.value, 'Passwords');
        if (!err) clearFieldError(confirmInput, confirmError);
      }
    });

    confirmInput.addEventListener('blur', () => {
      const err = validateMatch(passInput.value, confirmInput.value, 'Passwords');
      if (err) setFieldError(confirmInput, confirmError, err);
      else clearFieldError(confirmInput, confirmError);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (generalAlert) {
      generalAlert.textContent = '';
      generalAlert.classList.remove('is-visible');
    }

    const passErr = validateSignupPassword(passInput.value);
    const matchErr = validateMatch(passInput.value, confirmInput.value, 'Passwords');

    let hasErrors = false;
    if (passErr) {
      setFieldError(passInput, passError, passErr);
      hasErrors = true;
    } else {
      clearFieldError(passInput, passError);
    }

    if (matchErr) {
      setFieldError(confirmInput, confirmError, matchErr);
      hasErrors = true;
    } else {
      clearFieldError(confirmInput, confirmError);
    }

    if (hasErrors) {
      if (passErr) passInput.focus();
      else confirmInput.focus();
      return;
    }

    submitBtn.classList.add('btn--loading');
    submitBtn.disabled = true;

    try {
      await confirmPasswordReset(token, passInput.value);
      showToast('Password Updated!', 'Your password was changed successfully. Redirecting to login...', 'success', 3500);

      form.style.display = 'none';
      const pill = document.getElementById('reset-account-pill');
      if (pill) pill.style.display = 'none';
      if (successState) successState.style.display = 'block';

      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2200);
    } catch (err) {
      submitBtn.classList.remove('btn--loading');
      submitBtn.disabled = false;
      showToast('Reset Failed', err.message, 'error', 4500);

      if (generalAlert) {
        generalAlert.textContent = err.message;
        generalAlert.classList.add('is-visible');
      }
    }
  });
}
