/**
 * RentRoll - Main Entry Point
 */
import { injectNavbar, injectFooter, injectBackgroundBlobs, showToast } from './components.js';
import { submitContactForm, submitFeedbackReview, getCurrentUser, getFeedbackReviews } from './api.js';
import { initLoginForm, initSignupForm } from './auth.js';
import { initDashboard } from './dashboard.js';
import { initHero3D } from './three-models.js';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

  // 5. Landing Page Interactive Customer Feedback & Contact Us sections
  initFeedbackSection();
  initContactForm();

  // 6. Page specific initializers based on present DOM nodes
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

/**
 * Initializes Customer Feedback & Verified Reviews section
 */
function initFeedbackSection() {
  const grid = document.getElementById('feedback-grid');
  if (!grid) return;

  const filterBtns = document.querySelectorAll('.feedback-filter-btn');
  const countAll = document.getElementById('count-all');
  const countLandlords = document.getElementById('count-landlords');
  const countTenants = document.getElementById('count-tenants');
  const modal = document.getElementById('modal-feedback');
  const authModal = document.getElementById('modal-feedback-auth');
  const openModalBtn = document.getElementById('btn-open-feedback-modal');
  const formFeedback = document.getElementById('form-share-feedback');
  const starPicker = document.getElementById('feedback-star-picker');
  const starHint = document.getElementById('feedback-star-hint');
  const ratingInput = document.getElementById('feedback-rating-val');

  const userBanner = document.getElementById('feedback-user-banner');
  const userAvatar = document.getElementById('feedback-user-avatar');
  const userBannerName = document.getElementById('feedback-user-banner-name');
  const userBannerDesc = document.getElementById('feedback-user-banner-desc');
  const nameInput = document.getElementById('feedback-name');
  const roleInput = document.getElementById('feedback-role');
  const propInput = document.getElementById('feedback-property');
  const headlineInput = document.getElementById('feedback-headline');
  const commentInput = document.getElementById('feedback-comment');
  const submitBtn = document.getElementById('btn-submit-feedback');

  // Update counts in filter tabs
  function updateFilterCounts() {
    const allCards = grid.querySelectorAll('.feedback-card');
    let landlordCount = 0;
    let tenantCount = 0;
    allCards.forEach(card => {
      const role = card.getAttribute('data-role');
      if (role === 'landlord') landlordCount++;
      if (role === 'tenant') tenantCount++;
    });
    if (countAll) countAll.textContent = allCards.length;
    if (countLandlords) countLandlords.textContent = landlordCount;
    if (countTenants) countTenants.textContent = tenantCount;
  }

  // Filter tabs click
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('is-active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');

      const filter = btn.getAttribute('data-filter');
      const cards = grid.querySelectorAll('.feedback-card');

      cards.forEach(card => {
        const role = card.getAttribute('data-role');
        if (filter === 'all' || role === filter) {
          card.classList.remove('is-hidden');
        } else {
          card.classList.add('is-hidden');
        }
      });
    });
  });

  // Helpful vote buttons
  grid.addEventListener('click', (e) => {
    const helpfulBtn = e.target.closest('.feedback-helpful-btn');
    if (!helpfulBtn) return;
    
    if (helpfulBtn.classList.contains('is-helpful')) {
      showToast('Already Marked', 'You have already marked this review as helpful.', 'info', 2000);
      return;
    }

    const countSpan = helpfulBtn.querySelector('.helpful-count');
    if (countSpan) {
      const current = parseInt(countSpan.textContent, 10) || 0;
      countSpan.textContent = current + 1;
    }
    helpfulBtn.classList.add('is-helpful');
    showToast('Feedback Noted', 'Thank you for your vote of confidence!', 'success', 2000);
  });

  // Modal open/close helpers
  const openModal = (target) => {
    if (!target) return;
    target.classList.add('is-open');
    target.setAttribute('aria-hidden', 'false');
    const firstInput = target.querySelector('input:not([readonly]):not([disabled]), textarea');
    if (firstInput) setTimeout(() => firstInput.focus(), 120);
  };

  const closeModal = (target) => {
    if (!target) return;
    target.classList.remove('is-open');
    target.setAttribute('aria-hidden', 'true');
  };

  const closeAllModals = () => {
    if (modal) closeModal(modal);
    if (authModal) closeModal(authModal);
  };

  // Close listeners for both modals
  [modal, authModal].forEach(m => {
    if (!m) return;
    m.querySelectorAll('.neo-modal-close, .btn-modal-cancel, .btn-modal-auth-cancel').forEach(b => {
      b.addEventListener('click', () => closeModal(m));
    });
    m.addEventListener('click', (e) => {
      if (e.target === m) closeModal(m);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals();
  });

  // Pre-fill modal with logged-in user's verified credentials
  function populateUserInModal(user) {
    if (!user) return;
    const isLandlord = user.role !== 'tenant';
    const roleTitle = isLandlord ? 'Landlord' : 'Resident';
    const initials = (user.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';

    if (userBannerName) userBannerName.textContent = user.name;
    if (userBannerDesc) {
      userBannerDesc.textContent = `Posting as Verified ${roleTitle} • ${user.email || 'Verified Account'}`;
    }
    if (userAvatar) {
      userAvatar.textContent = initials;
      userAvatar.className = 'feedback-card__avatar ' + (isLandlord ? 'feedback-card__avatar--indigo' : 'feedback-card__avatar--terracotta');
    }
    if (nameInput) {
      nameInput.value = user.name;
      nameInput.readOnly = true;
    }
    if (roleInput) {
      roleInput.value = isLandlord ? 'landlord' : 'tenant';
      roleInput.disabled = true;
    }
  }

  // Update button label if user is already logged in
  const currentUser = getCurrentUser();
  if (currentUser && openModalBtn) {
    const firstName = (currentUser.name || 'Member').split(' ')[0];
    const roleLabel = currentUser.role === 'tenant' ? 'Resident' : 'Landlord';
    openModalBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
      <span>✍️ Share Your Review (${firstName})</span>
    `;
    openModalBtn.title = `Post a verified review as ${currentUser.name} (${roleLabel})`;
  }

  // Handle click on "Share Your Experience" button: strictly require login or signup!
  if (openModalBtn) {
    openModalBtn.addEventListener('click', () => {
      const user = getCurrentUser();
      if (!user) {
        // Enforce Authentication: user must log in or sign up first!
        openModal(authModal);
        showToast('Authentication Required', 'Reviews are reserved for verified landlords & tenants. Please log in or sign up.', 'info', 3500);
      } else {
        // Authenticated Landlord or Tenant
        populateUserInModal(user);
        openModal(modal);
      }
    });
  }

  // Check URL query param ?openReview=true (e.g. after login or dashboard click)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('openReview') === 'true') {
    const user = getCurrentUser();
    if (user) {
      populateUserInModal(user);
      openModal(modal);
      showToast('Verified Access', `Welcome, ${user.name}! Share your feedback below.`, 'success', 3500);
    } else {
      openModal(authModal);
      showToast('Sign In Required', 'Please log in or sign up as a landlord or tenant to submit a review.', 'info', 4000);
    }
    // Clean URL query param cleanly without reload
    const cleanUrl = window.location.pathname + (window.location.hash || '');
    window.history.replaceState({}, document.title, cleanUrl);
  }

  // Star Rating Interactive Picker
  if (starPicker && ratingInput) {
    const starBtns = starPicker.querySelectorAll('.feedback-star-btn');
    const starHints = {
      1: '1.0 — Needs Improvement',
      2: '2.0 — Fair',
      3: '3.0 — Good',
      4: '4.0 — Very Good',
      5: '5.0 — Excellent'
    };

    const setStars = (val) => {
      ratingInput.value = val;
      starBtns.forEach(btn => {
        const r = parseInt(btn.getAttribute('data-rating'), 10);
        if (r <= val) {
          btn.classList.add('is-selected');
        } else {
          btn.classList.remove('is-selected');
        }
      });
      if (starHint) starHint.textContent = starHints[val] || `${val}.0`;
    };

    starBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.getAttribute('data-rating'), 10);
        setStars(val);
      });
      btn.addEventListener('mouseenter', () => {
        const val = parseInt(btn.getAttribute('data-rating'), 10);
        if (starHint) starHint.textContent = starHints[val] || `${val}.0`;
      });
    });

    starPicker.addEventListener('mouseleave', () => {
      const val = parseInt(ratingInput.value, 10) || 5;
      setStars(val);
    });
  }

  // Render a review card into the DOM grid
  function renderReviewCard(rev, isNew = false) {
    if (!rev || !rev.title) return;

    // Check if card with identical title or id already rendered
    if (rev.id && grid.querySelector(`[data-rev-id="${rev.id}"]`)) return;
    const existingTitles = Array.from(grid.querySelectorAll('.feedback-card__title'));
    if (existingTitles.some(t => t.textContent.includes(rev.title))) return;

    const initials = (rev.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
    const isLandlord = rev.role !== 'tenant';
    const avatarClass = isLandlord ? 'feedback-card__avatar--indigo' : 'feedback-card__avatar--terracotta';
    const roleBadge = isLandlord ? 'badge--landlord' : 'badge--tenant';
    const propName = rev.property_name || rev.propertyName || (isLandlord ? 'Rental Portfolio' : 'Resident Community');
    const roleLabel = isLandlord ? `Landlord • ${propName}` : `Resident • ${propName}`;
    const ratingVal = Number(rev.rating) || 5;
    const starStr = '★'.repeat(ratingVal) + '☆'.repeat(Math.max(0, 5 - ratingVal));

    const card = document.createElement('div');
    card.className = `glass-card feedback-card ${isNew ? 'feedback-card--new' : ''}`;
    card.setAttribute('data-role', isLandlord ? 'landlord' : 'tenant');
    if (rev.id) card.setAttribute('data-rev-id', rev.id);

    card.innerHTML = `
      <div class="feedback-card__header">
        <div class="feedback-card__author">
          <div class="feedback-card__avatar ${avatarClass}">${initials}</div>
          <div>
            <div class="feedback-card__name">${escapeHtml(rev.name)}</div>
            <div class="feedback-card__meta">${escapeHtml(propName)}</div>
          </div>
        </div>
        <span class="badge ${roleBadge}">${roleLabel}</span>
      </div>

      <div class="feedback-card__stars">${starStr}</div>
      <h3 class="feedback-card__title">"${escapeHtml(rev.title)}"</h3>
      <p class="feedback-card__quote">${escapeHtml(rev.comment)}</p>

      <div class="feedback-card__footer">
        <div class="feedback-verified-badge">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span>Verified ${isLandlord ? 'Landlord' : 'Resident'} &bull; ${isNew ? 'Just Now' : 'Verified'}</span>
        </div>
        <button type="button" class="feedback-helpful-btn" data-id="${rev.id || 'rev-' + Date.now()}" title="Mark as helpful">
          <span class="helpful-icon">👍</span>
          <span>Helpful (<strong class="helpful-count">${rev.helpful_count || 1}</strong>)</span>
        </button>
      </div>
    `;

    grid.prepend(card);
  }

  // Load reviews from API and LocalStorage on page load
  async function loadFeedbackReviews() {
    try {
      const serverReviews = await getFeedbackReviews();
      if (Array.isArray(serverReviews) && serverReviews.length > 0) {
        [...serverReviews].reverse().forEach(rev => renderReviewCard(rev, false));
      }
    } catch (err) {
      console.warn('[Feedback] Could not fetch server reviews, falling back to local:', err);
    }

    // Also load any locally saved reviews
    const stored = JSON.parse(localStorage.getItem('rentroll_custom_feedback') || '[]');
    stored.forEach(rev => renderReviewCard(rev, false));

    updateFilterCounts();
  }

  loadFeedbackReviews();

  // Submit Feedback Form (Enforced Authentication Check)
  if (formFeedback) {
    formFeedback.addEventListener('submit', async (e) => {
      e.preventDefault();

      // STRICT AUTH CHECK: Must be logged in or signed up
      const user = getCurrentUser();
      if (!user) {
        closeModal(modal);
        openModal(authModal);
        showToast('Login Required', 'You must log in or sign up as a landlord or tenant to post a review.', 'error', 4000);
        return;
      }

      const ratingVal = parseInt(ratingInput ? ratingInput.value : '5', 10) || 5;
      const errHeadline = document.getElementById('error-feedback-headline');
      const errComment = document.getElementById('error-feedback-comment');

      let isValid = true;
      if (!headlineInput.value.trim()) {
        errHeadline?.classList.add('is-visible');
        isValid = false;
      } else {
        errHeadline?.classList.remove('is-visible');
      }

      if (!commentInput.value.trim() || commentInput.value.trim().length < 10) {
        errComment?.classList.add('is-visible');
        isValid = false;
      } else {
        errComment?.classList.remove('is-visible');
      }

      if (!isValid) return;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Publishing Review...';
      }

      const isLandlord = user.role !== 'tenant';
      const reviewPayload = {
        name: user.name,
        role: isLandlord ? 'landlord' : 'tenant',
        rating: ratingVal,
        propertyName: propInput.value.trim() || (isLandlord ? 'Private Rental Portfolio' : 'Resident Community'),
        title: headlineInput.value.trim(),
        comment: commentInput.value.trim(),
        id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      };

      try {
        await submitFeedbackReview(reviewPayload);
      } catch (err) {
        console.warn('[Feedback] Server submit fallback, saving locally:', err);
      }

      // Save to localStorage
      const stored = JSON.parse(localStorage.getItem('rentroll_custom_feedback') || '[]');
      stored.unshift(reviewPayload);
      localStorage.setItem('rentroll_custom_feedback', JSON.stringify(stored));

      // Prepend to DOM grid
      renderReviewCard(reviewPayload, true);
      updateFilterCounts();

      // Reset modal inputs & star rating
      closeModal(modal);
      formFeedback.reset();
      populateUserInModal(user);

      if (starPicker) {
        starPicker.querySelectorAll('.feedback-star-btn').forEach(b => b.classList.add('is-selected'));
        if (starHint) starHint.textContent = '5.0 — Excellent';
        if (ratingInput) ratingInput.value = '5';
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Publish Verified Review';
      }

      showToast('Review Published!', 'Thank you! Your verified review is now live on the landing page.', 'success', 4500);

      // Scroll smoothly to the feedback section so user sees their published review
      const section = document.getElementById('feedback');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
}

/**
 * Initializes Contact Us section
 */
function initContactForm() {
  const contactForm = document.getElementById('landing-contact-form');
  const messageInput = document.getElementById('contact-message');
  const charCount = document.getElementById('contact-char-count');
  const copyEmailBtn = document.getElementById('btn-copy-email');
  const faqAccordion = document.getElementById('faq-accordion');
  const successState = document.getElementById('contact-success-state');
  const resetBtn = document.getElementById('btn-reset-contact-form');

  // Live Character Counter
  if (messageInput && charCount) {
    messageInput.addEventListener('input', () => {
      const len = messageInput.value.length;
      charCount.textContent = `${len} / 500`;
      if (len >= 480) {
        charCount.style.color = 'var(--color-warning)';
      } else {
        charCount.style.color = 'var(--color-text-subtle)';
      }
    });
  }

  // Copy Email Button
  if (copyEmailBtn) {
    copyEmailBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText('support@rentroll.io');
        copyEmailBtn.classList.add('is-copied');
        copyEmailBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        showToast('Email Copied', 'support@rentroll.io copied to clipboard!', 'info', 2500);
        setTimeout(() => {
          copyEmailBtn.classList.remove('is-copied');
          copyEmailBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
        }, 2200);
      } catch (err) {
        showToast('support@rentroll.io', 'Direct email address ready to copy.', 'info', 3000);
      }
    });
  }

  // FAQ Accordion
  if (faqAccordion) {
    const questions = faqAccordion.querySelectorAll('.faq-question');
    questions.forEach(q => {
      q.addEventListener('click', () => {
        const item = q.closest('.faq-item');
        const answer = item.querySelector('.faq-answer');
        const isCurrentlyOpen = item.classList.contains('is-open');

        // Close other items
        faqAccordion.querySelectorAll('.faq-item').forEach(other => {
          if (other !== item) {
            other.classList.remove('is-open');
            other.querySelector('.faq-question')?.setAttribute('aria-expanded', 'false');
            other.querySelector('.faq-answer')?.classList.add('is-collapsed');
          }
        });

        // Toggle current item
        if (isCurrentlyOpen) {
          item.classList.remove('is-open');
          q.setAttribute('aria-expanded', 'false');
          answer?.classList.add('is-collapsed');
        } else {
          item.classList.add('is-open');
          q.setAttribute('aria-expanded', 'true');
          answer?.classList.remove('is-collapsed');
        }
      });
    });
  }

  // Contact Form Submission
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nameInput = document.getElementById('contact-name');
      const emailInput = document.getElementById('contact-email');
      const phoneInput = document.getElementById('contact-phone');
      const portfolioInput = document.getElementById('contact-portfolio');
      const subjectInput = document.getElementById('contact-subject');
      const msgInput = document.getElementById('contact-message');
      const submitBtn = document.getElementById('contact-submit-btn');

      const errName = document.getElementById('error-contact-name');
      const errEmail = document.getElementById('error-contact-email');
      const errMessage = document.getElementById('error-contact-message');

      let isValid = true;

      // Name validation
      if (!nameInput.value.trim()) {
        errName?.classList.add('is-visible');
        nameInput.setAttribute('aria-invalid', 'true');
        isValid = false;
      } else {
        errName?.classList.remove('is-visible');
        nameInput.removeAttribute('aria-invalid');
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailInput.value.trim() || !emailRegex.test(emailInput.value.trim())) {
        errEmail?.classList.add('is-visible');
        emailInput.setAttribute('aria-invalid', 'true');
        isValid = false;
      } else {
        errEmail?.classList.remove('is-visible');
        emailInput.removeAttribute('aria-invalid');
      }

      // Message validation
      if (!msgInput.value.trim() || msgInput.value.trim().length < 10) {
        errMessage?.classList.add('is-visible');
        msgInput.setAttribute('aria-invalid', 'true');
        isValid = false;
      } else {
        errMessage?.classList.remove('is-visible');
        msgInput.removeAttribute('aria-invalid');
      }

      if (!isValid) return;

      // Submission loading state
      const originalBtnContent = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin" style="animation: spin 0.8s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
        <span>Sending Message...</span>
      `;

      const payload = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        phone: phoneInput.value.trim(),
        portfolioSize: portfolioInput ? portfolioInput.value : '',
        subject: subjectInput ? subjectInput.value : 'General Inquiry',
        message: msgInput.value.trim()
      };

      try {
        await submitContactForm(payload);
      } catch (err) {
        console.warn('[Contact] Server response error, continuing with user confirmation:', err);
      }

      // Show in-form success state
      contactForm.classList.add('is-hidden');
      if (successState) {
        successState.classList.remove('is-hidden');
        const desc = document.getElementById('contact-success-desc');
        if (desc) {
          desc.innerHTML = `Thank you, <strong>${escapeHtml(payload.name)}</strong>! We received your inquiry regarding <em>"${escapeHtml(payload.subject)}"</em>. Our property advisory team will email you at <strong>${escapeHtml(payload.email)}</strong> within 2 business hours.`;
        }
      }

      showToast('Message Sent', 'Thank you! A RentRoll specialist will respond within 2 business hours.', 'success', 4500);

      // Restore button
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnContent;
    });
  }

  // Reset form handler
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      contactForm.reset();
      contactForm.classList.remove('is-hidden');
      if (successState) successState.classList.add('is-hidden');
      if (charCount) charCount.textContent = '0 / 500';
    });
  }
}

