/**
 * RentRoll - Main Entry Point
 */
import { injectNavbar, injectFooter, injectBackgroundBlobs } from './components.js';
import { initLoginForm, initSignupForm } from './auth.js';
import { initDashboard } from './dashboard.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Inject common ambient background blobs for unified glassmorphic depth
  injectBackgroundBlobs();

  // 2. Inject responsive sticky navbar and glass footer
  injectNavbar();
  injectFooter();

  // 3. Page specific initializers based on present DOM nodes
  if (document.getElementById('login-form')) {
    initLoginForm();
  } else if (document.getElementById('signup-form')) {
    initSignupForm();
  } else if (document.getElementById('dashboard-container')) {
    initDashboard();
  }

  // 4. Smooth Anchor Scrolling with sticky navbar offset
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || targetId === '#top') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const targetElem = document.querySelector(targetId);
      if (targetElem) {
        e.preventDefault();
        const navbarHeight = 76;
        const elemPosition = targetElem.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({
          top: elemPosition - navbarHeight - 16,
          behavior: 'smooth'
        });
        // Update hash in URL without jump
        history.pushState(null, '', targetId);
      }
    });
  });
});
