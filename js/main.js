/**
 * RentRoll - Main Entry Point
 */
import { injectNavbar, injectFooter, injectBackgroundBlobs, showToast } from './components.js';
import { submitContactForm, submitFeedbackReview } from './api.js';
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
  const openModalBtn = document.getElementById('btn-open-feedback-modal');
  const formFeedback = document.getElementById('form-share-feedback');
  const starPicker = document.getElementById('feedback-star-picker');
  const starHint = document.getElementById('feedback-star-hint');
  const ratingInput = document.getElementById('feedback-rating-val');

  // Update counts
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

  // Modal open/close
  if (openModalBtn && modal) {
    const openModal = () => {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      const firstInput = modal.querySelector('input');
      if (firstInput) setTimeout(() => firstInput.focus(), 100);
    };

    const closeModal = () => {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    };

    openModalBtn.addEventListener('click', openModal);

    modal.querySelectorAll('.neo-modal-close, .btn-modal-cancel').forEach(b => {
      b.addEventListener('click', closeModal);
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) {
        closeModal();
      }
    });

    // Star Rating Picker
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

    // Submit Feedback Form
    if (formFeedback) {
      formFeedback.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nameInput = document.getElementById('feedback-name');
        const roleInput = document.getElementById('feedback-role');
        const propInput = document.getElementById('feedback-property');
        const headlineInput = document.getElementById('feedback-headline');
        const commentInput = document.getElementById('feedback-comment');
        const ratingVal = parseInt(ratingInput ? ratingInput.value : '5', 10) || 5;

        const errName = document.getElementById('error-feedback-name');
        const errHeadline = document.getElementById('error-feedback-headline');
        const errComment = document.getElementById('error-feedback-comment');

        let isValid = true;
        if (!nameInput.value.trim()) {
          errName?.classList.add('is-visible');
          isValid = false;
        } else {
          errName?.classList.remove('is-visible');
        }

        if (!headlineInput.value.trim()) {
          errHeadline?.classList.add('is-visible');
          isValid = false;
        } else {
          errHeadline?.classList.remove('is-visible');
        }

        if (!commentInput.value.trim() || commentInput.value.trim().length < 15) {
          errComment?.classList.add('is-visible');
          isValid = false;
        } else {
          errComment?.classList.remove('is-visible');
        }

        if (!isValid) return;

        const submitBtn = document.getElementById('btn-submit-feedback');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Publishing Review...';
        }

        const reviewPayload = {
          name: nameInput.value.trim(),
          role: roleInput.value,
          rating: ratingVal,
          propertyName: propInput.value.trim() || (roleInput.value === 'landlord' ? 'Private Rental Portfolio' : 'Resident Community'),
          title: headlineInput.value.trim(),
          comment: commentInput.value.trim()
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

        // Create DOM Card
        const initials = reviewPayload.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
        const avatarClass = reviewPayload.role === 'landlord' ? 'feedback-card__avatar--indigo' : 'feedback-card__avatar--terracotta';
        const roleBadge = reviewPayload.role === 'landlord' ? 'badge--landlord' : 'badge--tenant';
        const roleLabel = reviewPayload.role === 'landlord' ? 'Verified Landlord' : 'Verified Resident';

        const starStr = '★'.repeat(ratingVal) + '☆'.repeat(5 - ratingVal);

        const card = document.createElement('div');
        card.className = 'glass-card feedback-card feedback-card--new';
        card.setAttribute('data-role', reviewPayload.role);
        card.innerHTML = `
          <div class="feedback-card__header">
            <div class="feedback-card__author">
              <div class="feedback-card__avatar ${avatarClass}">${initials}</div>
              <div>
                <div class="feedback-card__name">${escapeHtml(reviewPayload.name)}</div>
                <div class="feedback-card__meta">${escapeHtml(reviewPayload.propertyName)}</div>
              </div>
            </div>
            <span class="badge ${roleBadge}">${roleLabel}</span>
          </div>

          <div class="feedback-card__stars">${starStr}</div>
          <h3 class="feedback-card__title">"${escapeHtml(reviewPayload.title)}"</h3>
          <p class="feedback-card__quote">${escapeHtml(reviewPayload.comment)}</p>

          <div class="feedback-card__footer">
            <div class="feedback-verified-badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>Just Now &bull; Verified</span>
            </div>
            <button type="button" class="feedback-helpful-btn" title="Mark as helpful">
              <span class="helpful-icon">👍</span>
              <span>Helpful (<strong class="helpful-count">1</strong>)</span>
            </button>
          </div>
        `;

        grid.prepend(card);
        updateFilterCounts();

        // Close modal and reset
        closeModal();
        formFeedback.reset();
        if (starPicker) {
          starPicker.querySelectorAll('.feedback-star-btn').forEach(b => b.classList.add('is-selected'));
          if (starHint) starHint.textContent = '5.0 — Excellent';
          if (ratingInput) ratingInput.value = '5';
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Verified Review';
        }

        showToast('Review Published!', 'Thank you! Your verified review has been published.', 'success', 4000);
      });
    }
  }

  // Load any previously saved reviews from localStorage
  const savedReviews = JSON.parse(localStorage.getItem('rentroll_custom_feedback') || '[]');
  savedReviews.reverse().forEach(rev => {
    const initials = (rev.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
    const avatarClass = rev.role === 'landlord' ? 'feedback-card__avatar--indigo' : 'feedback-card__avatar--terracotta';
    const roleBadge = rev.role === 'landlord' ? 'badge--landlord' : 'badge--tenant';
    const roleLabel = rev.role === 'landlord' ? 'Verified Landlord' : 'Verified Resident';
    const ratingNum = Number(rev.rating) || 5;
    const starStr = '★'.repeat(ratingNum) + '☆'.repeat(Math.max(0, 5 - ratingNum));

    const card = document.createElement('div');
    card.className = 'glass-card feedback-card';
    card.setAttribute('data-role', rev.role || 'landlord');
    card.innerHTML = `
      <div class="feedback-card__header">
        <div class="feedback-card__author">
          <div class="feedback-card__avatar ${avatarClass}">${initials}</div>
          <div>
            <div class="feedback-card__name">${escapeHtml(rev.name)}</div>
            <div class="feedback-card__meta">${escapeHtml(rev.propertyName || 'Portfolio')}</div>
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
          <span>Verified Member</span>
        </div>
        <button type="button" class="feedback-helpful-btn" title="Mark as helpful">
          <span class="helpful-icon">👍</span>
          <span>Helpful (<strong class="helpful-count">12</strong>)</span>
        </button>
      </div>
    `;
    grid.prepend(card);
  });

  updateFilterCounts();
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

