/**
 * RentRoll - Main Entry Point
 */
import { injectNavbar, injectFooter, injectBackgroundBlobs } from './components.js';
import { initLoginForm, initSignupForm } from './auth.js';
import { initDashboard } from './dashboard.js';
import { initHero3D } from './three-models.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Inject common ambient background blobs for unified glassmorphic depth
  injectBackgroundBlobs();

  // 2. Inject responsive sticky navbar and glass footer
  injectNavbar();
  injectFooter();

  // 3. Initialize 3D Low-Poly WebGL Model on Landing Page (Frameless Hero)
  if (document.getElementById('hero-3d-canvas-container')) {
    initHero3D();
  }

  // 4. Hero Preview Switcher (3D Model vs Live Activity Feed)
  const tab3D = document.getElementById('hero-tab-3d');
  const tabMockup = document.getElementById('hero-tab-mockup');
  const card3D = document.getElementById('hero-3d-card');
  const cardMockup = document.getElementById('hero-mockup-card');

  if (tab3D && tabMockup && card3D && cardMockup) {
    tab3D.addEventListener('click', () => {
      tab3D.classList.add('is-active');
      tab3D.setAttribute('aria-selected', 'true');
      tabMockup.classList.remove('is-active');
      tabMockup.setAttribute('aria-selected', 'false');
      card3D.classList.remove('is-hidden');
      cardMockup.classList.add('is-hidden');
    });

    tabMockup.addEventListener('click', () => {
      tabMockup.classList.add('is-active');
      tabMockup.setAttribute('aria-selected', 'true');
      tab3D.classList.remove('is-active');
      tab3D.setAttribute('aria-selected', 'false');
      cardMockup.classList.remove('is-hidden');
      card3D.classList.add('is-hidden');
    });
  }

  // 5. Page specific initializers based on present DOM nodes
  if (document.getElementById('login-form')) {
    initLoginForm();
  } else if (document.getElementById('signup-form')) {
    initSignupForm();
  } else if (document.getElementById('dashboard-container')) {
    initDashboard();
  }

  // 7. Smooth Anchor Scrolling with sticky navbar offset
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
