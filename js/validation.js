/**
 * RentRoll - Form Validation & Password Strength Module
 */

/**
 * Validates an email address.
 * @param {string} email
 * @returns {string|null} Error message or null if valid
 */
export function validateEmail(email) {
  if (!email || !email.trim()) {
    return 'Email address is required.';
  }
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(email.trim())) {
    return 'Please enter a valid email address (e.g. name@example.com).';
  }
  return null;
}

/**
 * Validates a user's full name.
 * @param {string} name
 * @returns {string|null} Error message or null if valid
 */
export function validateName(name) {
  if (!name || !name.trim()) {
    return 'Full name is required.';
  }
  if (name.trim().length < 2) {
    return 'Name must be at least 2 characters.';
  }
  return null;
}

/**
 * Computes password strength score and advice.
 * Score: 0 to 4
 * @param {string} password
 * @returns {{ score: number, label: string, feedback: string }}
 */
export function calculatePasswordStrength(password) {
  if (!password) {
    return { score: 0, label: 'None', feedback: 'Enter a secure password.' };
  }

  let score = 0;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isLongEnough = password.length >= 8;

  if (password.length >= 8) score += 1;
  if (hasLower && hasUpper) score += 1;
  if (hasNumber) score += 1;
  if (hasSpecial) score += 1;

  if (password.length >= 14 && score === 4) {
    return { score: 4, label: 'Very Strong', feedback: 'Excellent, highly secure password!' };
  }

  switch (score) {
    case 4:
      return { score: 4, label: 'Strong', feedback: 'Strong password with mixed characters.' };
    case 3:
      return { score: 3, label: 'Good', feedback: 'Good password. Add symbols or length for maximum security.' };
    case 2:
      return { score: 2, label: 'Fair', feedback: 'Fair strength. Use numbers & uppercase letters.' };
    case 1:
    default:
      return { score: 1, label: 'Weak', feedback: 'Weak password. Must be at least 8 characters with numbers.' };
  }
}

/**
 * Validates login password field.
 * @param {string} password
 * @returns {string|null} Error message or null if valid
 */
export function validateLoginPassword(password) {
  if (!password) {
    return 'Password is required.';
  }
  return null;
}

/**
 * Validates sign-up password criteria.
 * @param {string} password
 * @returns {string|null} Error message or null if valid
 */
export function validateSignupPassword(password) {
  if (!password) {
    return 'Password is required.';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  const strength = calculatePasswordStrength(password);
  if (strength.score < 2) {
    return 'Password is too weak. Include a mix of letters, numbers, and symbols.';
  }
  return null;
}

/**
 * Validates that two field values match (e.g. password confirmation).
 * @param {string} val1
 * @param {string} val2
 * @param {string} fieldName
 * @returns {string|null} Error message or null if valid
 */
export function validateMatch(val1, val2, fieldName = 'Passwords') {
  if (!val2) {
    return `Please confirm your ${fieldName.toLowerCase()}.`;
  }
  if (val1 !== val2) {
    return `${fieldName} do not match.`;
  }
  return null;
}

/**
 * Validates required checkbox acceptance.
 * @param {boolean} checked
 * @param {string} message
 * @returns {string|null} Error message or null if valid
 */
export function validateCheckbox(checked, message = 'You must accept the Terms of Service to continue.') {
  if (!checked) {
    return message;
  }
  return null;
}

/**
 * DOM Helper: Sets error state on an input and its corresponding error label.
 * @param {HTMLElement} inputEl
 * @param {HTMLElement} errorEl
 * @param {string} message
 */
export function setFieldError(inputEl, errorEl, message) {
  if (inputEl) {
    inputEl.setAttribute('aria-invalid', 'true');
    if (errorEl && errorEl.id) {
      inputEl.setAttribute('aria-describedby', errorEl.id);
    }
  }
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add('is-visible');
  }
}

/**
 * DOM Helper: Clears error state on an input and hides error message.
 * @param {HTMLElement} inputEl
 * @param {HTMLElement} errorEl
 */
export function clearFieldError(inputEl, errorEl) {
  if (inputEl) {
    inputEl.setAttribute('aria-invalid', 'false');
    inputEl.removeAttribute('aria-describedby');
  }
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.classList.remove('is-visible');
  }
}

/**
 * DOM Helper: Updates password strength meter UI.
 * @param {HTMLElement} meterEl
 * @param {string} password
 */
export function updateStrengthMeterUI(meterEl, password) {
  if (!meterEl) return;

  const valueEl = meterEl.querySelector('.strength-meter__value');
  const result = calculatePasswordStrength(password);

  meterEl.classList.remove('strength--weak', 'strength--fair', 'strength--good', 'strength--strong');

  if (!password) {
    if (valueEl) valueEl.textContent = 'None';
    return;
  }

  if (result.score <= 1) {
    meterEl.classList.add('strength--weak');
    if (valueEl) valueEl.textContent = 'Weak';
  } else if (result.score === 2) {
    meterEl.classList.add('strength--fair');
    if (valueEl) valueEl.textContent = 'Fair';
  } else if (result.score === 3) {
    meterEl.classList.add('strength--good');
    if (valueEl) valueEl.textContent = 'Good';
  } else {
    meterEl.classList.add('strength--strong');
    if (valueEl) valueEl.textContent = result.label;
  }
}
