/**
 * RentRoll - Shared Components Injector (Navbar, Footer, Background Blobs, Toast System)
 */
import { getCurrentUser, logout } from './api.js';

// SVG Icon definitions for injection
const ICONS = {
  logo: `<svg width="38" height="38" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="display:block;border-radius:12px;">
    <defs>
      <linearGradient id="nav-logo-bg" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#312e81" />
        <stop offset="50%" stop-color="#4338ca" />
        <stop offset="100%" stop-color="#6366f1" />
      </linearGradient>
      <linearGradient id="nav-logo-accent" x1="28" y1="18" x2="42" y2="32" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#f59e0b" />
        <stop offset="100%" stop-color="#c25e36" />
      </linearGradient>
      <linearGradient id="nav-logo-facade" x1="16" y1="14" x2="48" y2="50" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="100%" stop-color="#f1f5f9" />
      </linearGradient>
      <linearGradient id="nav-logo-bevel" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.32" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.04" />
      </linearGradient>
    </defs>
    <rect width="64" height="64" rx="16" fill="url(#nav-logo-bg)" />
    <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="15.25" stroke="url(#nav-logo-bevel)" stroke-width="1.5" />
    <g>
      <rect x="16" y="14" width="9" height="36" rx="2" fill="url(#nav-logo-facade)" />
      <path d="M25 14H37C42.5228 14 47 18.4772 47 24C47 29.5228 42.5228 34 37 34H25V14Z" fill="url(#nav-logo-facade)" />
      <rect x="25" y="20" width="12" height="8" rx="2" fill="#312e81" />
      <rect x="27" y="21.5" width="7" height="5" rx="1" fill="url(#nav-logo-accent)" />
      <path d="M33 32L44.2 48.6C44.7 49.4 44.1 50 43.1 50H36.3C35.4 50 34.6 49.5 34.1 48.7L25 35.5V32H33Z" fill="url(#nav-logo-facade)" />
      <line x1="19" y1="20" x2="22" y2="20" stroke="#4338ca" stroke-width="1.8" stroke-linecap="round" />
      <line x1="19" y1="26" x2="22" y2="26" stroke="#4338ca" stroke-width="1.8" stroke-linecap="round" />
      <line x1="19" y1="32" x2="22" y2="32" stroke="#4338ca" stroke-width="1.8" stroke-linecap="round" />
      <path d="M18.5 50V43C18.5 41.8954 19.3954 41 20.5 41C21.6046 41 22.5 41.8954 22.5 43V50" fill="#312e81" />
    </g>
    <circle cx="45" cy="15" r="2.5" fill="url(#nav-logo-accent)" />
    <circle cx="45" cy="15" r="4.5" stroke="#f59e0b" stroke-opacity="0.3" stroke-width="1" />
  </svg>`,
  hamburger: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`,
  close: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
  logout: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`,
  success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
  error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
  info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
};

/**
 * Detect current page filename from window.location.
 */
function getCurrentPage() {
  const path = window.location.pathname;
  const page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
  return page.toLowerCase();
}

/**
 * Injects animated gradient ambient blobs into the body.
 */
export function injectBackgroundBlobs() {
  if (document.querySelector('.bg-blobs')) return;

  const blobs = document.createElement('div');
  blobs.className = 'bg-blobs';
  blobs.setAttribute('aria-hidden', 'true');
  blobs.innerHTML = `
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>
    <div class="blob blob-3"></div>
  `;
  document.body.prepend(blobs);
}

/**
 * Injects the unified Toast container.
 */
function ensureToastContainer() {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Triggers a glassmorphism Toast notification.
 * @param {string} title
 * @param {string} [message='']
 * @param {'success'|'error'|'info'} [type='info']
 * @param {number} [duration=4000]
 */
export function showToast(title, message = '', type = 'info', duration = 4000) {
  const container = ensureToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

  const iconSvg = ICONS[type] || ICONS.info;

  toast.innerHTML = `
    <div class="toast__icon">${iconSvg}</div>
    <div class="toast__content">
      <div class="toast__title">${title}</div>
      ${message ? `<div class="toast__message">${message}</div>` : ''}
    </div>
    <button class="toast__close" aria-label="Close notification" type="button">
      ${ICONS.close}
    </button>
  `;

  const closeBtn = toast.querySelector('.toast__close');
  const dismiss = () => {
    toast.classList.add('is-hiding');
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 250);
  };

  closeBtn.addEventListener('click', dismiss);
  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(dismiss, duration);
  }
}

/**
 * Injects and manages the sticky Glass Navbar.
 */
export function injectNavbar() {
  const headerRoot = document.getElementById('header-root');
  if (!headerRoot) return;

  const currentPage = getCurrentPage();
  const currentUser = getCurrentUser();
  const isLanding = currentPage === 'index.html' || currentPage === '';

  // Determine navigation anchor paths based on current page
  const homeLink = isLanding ? '#top' : 'index.html';
  const featuresLink = isLanding ? '#features' : 'index.html#features';
  const howItWorksLink = isLanding ? '#how-it-works' : 'index.html#how-it-works';
  const portalsLink = isLanding ? '#portals' : 'index.html#portals';
  const dashboardLink = 'dashboard.html';

  const isHomeActive = isLanding && !window.location.hash;
  const isDashboardActive = currentPage === 'dashboard.html';

  // Construct Auth Actions or Profile Capsule
  let authActionsHtml = '';
  let mobileAuthActionsHtml = '';

  if (currentUser) {
    const roleBadgeClass = currentUser.role === 'landlord' ? 'badge--landlord' : 'badge--tenant';
    const roleLabel = currentUser.role === 'landlord' ? 'Landlord' : 'Tenant';
    const initials = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U';

    authActionsHtml = `
      <div class="navbar__user">
        <a href="${dashboardLink}" class="navbar__user-info" title="View Dashboard">
          <span class="navbar__avatar">${initials}</span>
          <span class="navbar__user-name">${currentUser.name}</span>
          <span class="badge ${roleBadgeClass}">${roleLabel}</span>
        </a>
        <button id="nav-logout-btn" class="btn btn--ghost btn--sm" type="button" aria-label="Log out of account">
          ${ICONS.logout}
          <span>Logout</span>
        </button>
      </div>
    `;

    mobileAuthActionsHtml = `
      <div class="navbar__user-info" style="margin-bottom: var(--space-3);">
        <span class="navbar__avatar">${initials}</span>
        <span class="navbar__user-name">${currentUser.name}</span>
        <span class="badge ${roleBadgeClass}">${roleLabel}</span>
      </div>
      <a href="${dashboardLink}" class="btn btn--primary btn--full">Go to Dashboard</a>
      <button id="mobile-nav-logout-btn" class="btn btn--ghost btn--full" type="button">
        ${ICONS.logout}
        <span>Logout</span>
      </button>
    `;
  } else {
    authActionsHtml = `
      <a href="login.html" class="btn btn--ghost btn--sm ${currentPage === 'login.html' ? 'btn--outline' : ''}">Log In</a>
      <a href="signup.html" class="btn btn--primary btn--sm">Sign Up</a>
    `;

    mobileAuthActionsHtml = `
      <a href="login.html" class="btn btn--ghost btn--full">Log In</a>
      <a href="signup.html" class="btn btn--primary btn--full">Sign Up Free</a>
    `;
  }

  headerRoot.innerHTML = `
    <nav class="navbar" id="main-navbar" aria-label="Main Navigation">
      <div class="container navbar__inner">
        <a href="${homeLink}" class="navbar__brand" aria-label="RentRoll Home">
          <span class="navbar__brand-logo">${ICONS.logo}</span>
          <span class="navbar__brand-name">Rent<span class="brand-accent">Roll</span></span>
        </a>

        <div class="navbar__nav" role="navigation">
          <a href="${homeLink}" class="navbar__link ${isHomeActive ? 'navbar__link--active' : ''}">Home</a>
          <a href="${featuresLink}" class="navbar__link">Features</a>
          <a href="${howItWorksLink}" class="navbar__link">How it works</a>
          <a href="${portalsLink}" class="navbar__link">Portals</a>
          ${currentUser ? `<a href="${dashboardLink}" class="navbar__link ${isDashboardActive ? 'navbar__link--active' : ''}">Dashboard</a>` : ''}
        </div>

        <div class="navbar__actions">
          ${authActionsHtml}
        </div>

        <button class="navbar__hamburger" id="nav-hamburger-btn" aria-label="Toggle navigation menu" aria-expanded="false" aria-controls="mobile-nav-panel">
          ${ICONS.hamburger}
        </button>
      </div>

      <!-- Mobile Navigation Drawer -->
      <div class="mobile-nav-panel" id="mobile-nav-panel">
        <div class="mobile-nav-list">
          <a href="${homeLink}" class="mobile-nav-link ${isHomeActive ? 'mobile-nav-link--active' : ''}">Home</a>
          <a href="${featuresLink}" class="mobile-nav-link">Features</a>
          <a href="${howItWorksLink}" class="mobile-nav-link">How it works</a>
          <a href="${portalsLink}" class="mobile-nav-link">Portals</a>
          ${currentUser ? `<a href="${dashboardLink}" class="mobile-nav-link ${isDashboardActive ? 'mobile-nav-link--active' : ''}">Dashboard</a>` : ''}
        </div>
        <div class="mobile-nav-actions">
          ${mobileAuthActionsHtml}
        </div>
      </div>
    </nav>
  `;

  // Attach Sticky Scroll State
  const navbar = document.getElementById('main-navbar');
  const handleScroll = () => {
    if (window.scrollY > 20) {
      navbar.classList.add('navbar--scrolled');
    } else {
      navbar.classList.remove('navbar--scrolled');
    }
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // Attach Mobile Drawer Toggle
  const hamburgerBtn = document.getElementById('nav-hamburger-btn');
  const mobilePanel = document.getElementById('mobile-nav-panel');

  const closeMobileNav = () => {
    if (!mobilePanel.classList.contains('is-open')) return;
    mobilePanel.classList.remove('is-open');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    hamburgerBtn.innerHTML = ICONS.hamburger;
  };

  const openMobileNav = () => {
    mobilePanel.classList.add('is-open');
    hamburgerBtn.setAttribute('aria-expanded', 'true');
    hamburgerBtn.innerHTML = ICONS.close;
  };

  hamburgerBtn.addEventListener('click', () => {
    const isOpen = mobilePanel.classList.contains('is-open');
    if (isOpen) {
      closeMobileNav();
    } else {
      openMobileNav();
    }
  });

  // Close on mobile link click
  mobilePanel.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMobileNav);
  });

  // Close on Escape key press
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobilePanel.classList.contains('is-open')) {
      closeMobileNav();
      hamburgerBtn.focus();
    }
  });

  // Attach Logout Handlers
  const handleLogout = async () => {
    await logout();
    showToast('Logged out', 'You have been securely signed out.', 'info', 2000);
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 400);
  };

  const logoutBtn = document.getElementById('nav-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  const mobileLogoutBtn = document.getElementById('mobile-nav-logout-btn');
  if (mobileLogoutBtn) {
    mobileLogoutBtn.addEventListener('click', handleLogout);
  }
}

/**
 * Injects the unified Glass Footer.
 */
export function injectFooter() {
  const footerRoot = document.getElementById('footer-root');
  if (!footerRoot) return;

  const currentYear = new Date().getFullYear();

  footerRoot.innerHTML = `
    <footer class="footer" role="contentinfo">
      <div class="container">
        <div class="footer__grid">
          <div class="footer__brand-col">
            <div class="navbar__brand" style="margin-bottom: var(--space-3);">
              <span class="navbar__brand-logo">${ICONS.logo}</span>
              <span class="navbar__brand-name">Rent<span class="brand-accent">Roll</span></span>
            </div>
            <p>
              The intuitive property management platform designed specifically for independent landlords with 1-50 units. Modernize leases, automate rent collection, and manage maintenance effortlessly.
            </p>
          </div>

          <div>
            <div class="footer__title">Product</div>
            <ul class="footer__list">
              <li><a href="index.html#features" class="footer__link">Rent Collection</a></li>
              <li><a href="index.html#features" class="footer__link">Tenant Screening</a></li>
              <li><a href="index.html#features" class="footer__link">Maintenance Hub</a></li>
              <li><a href="index.html#features" class="footer__link">Accounting & Reports</a></li>
            </ul>
          </div>

          <div>
            <div class="footer__title">Portals</div>
            <ul class="footer__list">
              <li><a href="index.html#portals" class="footer__link">Landlord Dashboard</a></li>
              <li><a href="index.html#portals" class="footer__link">Tenant Self-Service</a></li>
              <li><a href="login.html" class="footer__link">Tenant Pay Portal</a></li>
              <li><a href="signup.html" class="footer__link">Landlord Free Trial</a></li>
            </ul>
          </div>

          <div>
            <div class="footer__title">RentRoll</div>
            <ul class="footer__list">
              <li><a href="dashboard.html" class="footer__link">App Dashboard</a></li>
              <li><a href="login.html" class="footer__link">Member Sign In</a></li>
              <li><a href="signup.html" class="footer__link">Create Account</a></li>
              <li><a href="README.md" target="_blank" class="footer__link">API & Architecture Docs</a></li>
            </ul>
          </div>
        </div>

        <div class="footer__bottom">
          <div>&copy; ${currentYear} RentRoll Inc. All rights reserved. Built for modern property owners.</div>
          <div>WCAG AA Compliant &bull; Privacy First &bull; Zero Spreadsheets</div>
        </div>
      </div>
    </footer>
  `;
}
