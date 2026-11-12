/**
 * RentRoll - AI Assistant Floating Corner Widget
 * Embedded exclusively for authenticated Tenants and Landlords inside the portal.
 * Provides real-time guidance on rent payments (UPI/eNACH), HRA receipts,
 * maintenance tickets, lease agreements, and portfolio cashflow.
 */

import { sendChatMessage } from './api.js';

let currentUser = null;
let isChatOpen = false;
let messageHistory = [];

/**
 * Escapes HTML to prevent XSS in chat messages
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Parses simple markdown (bold **text**, bullets •, newlines) into safe formatted HTML
 */
function formatMessageText(text) {
  if (!text) return '';
  const escaped = escapeHtml(text);
  // Bold **text**
  const bolded = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Convert newlines to breaks
  return bolded.replace(/\n/g, '<br>');
}

/**
 * Renders initial greeting message based on user role
 */
function getInitialGreeting(user) {
  const isLandlord = user.role === 'landlord';
  const roleTitle = isLandlord ? 'Portfolio AI Advisor' : 'Resident AI Assistant';

  if (isLandlord) {
    return {
      text: `Namaste **${escapeHtml(user.name)}**! 🙏\nI am your **RentRoll ${roleTitle}**.\n\nI can analyze your monthly rent roll, check occupancy & vacancies, guide you on 11-month e-Stamp legal clauses, or prioritize urgent maintenance dispatches.\n\nHow may I assist your portfolio today?`,
      suggestions: [
        '📊 Monthly rent roll',
        '🏠 Check vacant units',
        '📑 Create new lease',
        '🔧 Open repair triage'
      ]
    };
  } else {
    return {
      text: `Namaste **${escapeHtml(user.name)}**! 🙏\nI am your **RentRoll ${roleTitle}**.\n\nI can help you authorize rent via UPI AutoPay, download digitally signed HRA rent receipts (Sec 10(13A)), submit repair requests, or review your lease rules.\n\nHow can I help you today?`,
      suggestions: [
        '💳 Pay upcoming rent',
        '📄 Download HRA receipt',
        '🔧 Report repair issue',
        '📑 Check lease terms'
      ]
    };
  }
}

/**
 * Initializes and injects the AI Chatbot widget into the dashboard
 */
export function initChatbot(user) {
  if (!user || (user.role !== 'tenant' && user.role !== 'landlord' && user.role !== 'admin')) {
    destroyChatbot();
    return;
  }

  currentUser = user;

  // Prevent multiple injections
  if (document.getElementById('rentroll-ai-chatbot-widget')) {
    return;
  }

  const isLandlord = user.role === 'landlord';
  const badgeText = isLandlord ? 'Landlord Advisor' : (user.role === 'admin' ? 'Admin Advisor' : 'Tenant Concierge');
  const greeting = getInitialGreeting(user);

  const widget = document.createElement('div');
  widget.id = 'rentroll-ai-chatbot-widget';
  widget.className = 'ai-chatbot-widget';
  widget.setAttribute('aria-label', 'RentRoll AI Assistant');

  widget.innerHTML = `
    <!-- Floating Chat Window Panel -->
    <div class="ai-chatbot-panel" id="ai-chatbot-panel" role="region" aria-label="AI Chatbot Window" aria-hidden="true">
      <!-- Header -->
      <div class="ai-chatbot-header">
        <div class="ai-chatbot-header__brand">
          <div class="ai-chatbot-header__avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path>
              <rect x="3" y="8" width="18" height="12" rx="4"></rect>
              <circle cx="8" cy="13" r="1.5" fill="currentColor"></circle>
              <circle cx="16" cy="13" r="1.5" fill="currentColor"></circle>
              <path d="M9 17c1.5 1 4.5 1 6 0"></path>
            </svg>
            <span class="ai-chatbot-pulse-dot" title="AI Online"></span>
          </div>
          <div>
            <div class="ai-chatbot-header__title">RentRoll AI</div>
            <div class="ai-chatbot-header__badge">${badgeText}</div>
          </div>
        </div>

        <div class="ai-chatbot-header__actions">
          <button type="button" class="ai-chatbot-icon-btn" id="ai-chatbot-reset-btn" title="Clear conversation" aria-label="Reset Chat">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
            </svg>
          </button>
          <button type="button" class="ai-chatbot-icon-btn" id="ai-chatbot-close-btn" title="Minimize assistant" aria-label="Minimize Chat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <!-- Scrollable Message Stream -->
      <div class="ai-chatbot-messages" id="ai-chatbot-messages" role="log" aria-live="polite">
        <!-- Messages appended dynamically -->
      </div>

      <!-- Quick Suggestion Chips Container -->
      <div class="ai-chatbot-suggestions" id="ai-chatbot-suggestions">
        <!-- Rendered dynamically -->
      </div>

      <!-- Input Footer Form -->
      <form class="ai-chatbot-footer" id="ai-chatbot-form">
        <div class="ai-chatbot-input-wrap">
          <input 
            type="text" 
            id="ai-chatbot-input" 
            class="ai-chatbot-input" 
            placeholder="Ask about rent, receipts, repairs..." 
            autocomplete="off" 
            maxlength="1000"
            required
            aria-label="Ask AI Assistant"
          />
          <button type="submit" class="ai-chatbot-send-btn" id="ai-chatbot-send-btn" aria-label="Send message">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
        <div class="ai-chatbot-disclaimer">
          <span>RentRoll AI &bull; Indian Tenancy &amp; Portal Guide</span>
        </div>
      </form>
    </div>

    <!-- Floating Launcher Trigger Button -->
    <button type="button" class="ai-chatbot-launcher" id="ai-chatbot-launcher" aria-expanded="false" aria-controls="ai-chatbot-panel" title="Open AI Assistant">
      <div class="ai-chatbot-launcher__icon-wrap">
        <svg class="ai-chatbot-launcher__sparkle" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path>
          <rect x="3" y="8" width="18" height="12" rx="4"></rect>
          <circle cx="8" cy="13" r="1.5" fill="currentColor"></circle>
          <circle cx="16" cy="13" r="1.5" fill="currentColor"></circle>
          <path d="M9 17c1.5 1 4.5 1 6 0"></path>
        </svg>
        <span class="ai-chatbot-pulse-dot"></span>
      </div>
      <span class="ai-chatbot-launcher__text">Ask AI</span>
    </button>
  `;

  document.body.appendChild(widget);

  // Render initial greeting
  appendMessage('assistant', greeting.text, null);
  renderSuggestions(greeting.suggestions);

  // Attach Event Listeners
  bindChatbotEvents();
}

/**
 * Removes the chatbot widget from the DOM (e.g. on logout)
 */
export function destroyChatbot() {
  const widget = document.getElementById('rentroll-ai-chatbot-widget');
  if (widget) {
    widget.remove();
  }
  isChatOpen = false;
  messageHistory = [];
}

/**
 * Toggles the AI Assistant window open / closed
 */
export function toggleChatbot(forceState = null) {
  const panel = document.getElementById('ai-chatbot-panel');
  const launcher = document.getElementById('ai-chatbot-launcher');
  if (!panel || !launcher) return;

  isChatOpen = forceState !== null ? forceState : !isChatOpen;

  if (isChatOpen) {
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    launcher.classList.add('is-active');
    launcher.setAttribute('aria-expanded', 'true');
    const input = document.getElementById('ai-chatbot-input');
    if (input) setTimeout(() => input.focus(), 150);
  } else {
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    launcher.classList.remove('is-active');
    launcher.setAttribute('aria-expanded', 'false');
  }
}

/**
 * Appends a message bubble to the chat stream
 */
function appendMessage(sender, text, action = null) {
  const messagesContainer = document.getElementById('ai-chatbot-messages');
  if (!messagesContainer) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `ai-chat-bubble ai-chat-bubble--${sender}`;

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let actionHtml = '';
  if (action && action.label) {
    actionHtml = `
      <div class="ai-chat-action-wrap">
        <button type="button" class="btn btn--sm btn--primary ai-chat-action-btn" data-action-type="${escapeHtml(action.type)}" data-action-target="${escapeHtml(action.target)}">
          <span>${escapeHtml(action.label)}</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
    `;
  }

  msgDiv.innerHTML = `
    <div class="ai-chat-bubble__content">
      <div class="ai-chat-bubble__text">${formatMessageText(text)}</div>
      ${actionHtml}
      <div class="ai-chat-bubble__time">${timeStr}</div>
    </div>
  `;

  messagesContainer.appendChild(msgDiv);

  // Bind any direct action button inside the bubble
  if (action) {
    const actionBtn = msgDiv.querySelector('.ai-chat-action-btn');
    if (actionBtn) {
      actionBtn.addEventListener('click', () => handleDirectAction(action));
    }
  }

  // Auto-scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  // Keep internal memory
  messageHistory.push({ sender, text, timestamp: timeStr });
}

/**
 * Shows temporary typing indicator
 */
function showTypingIndicator() {
  const messagesContainer = document.getElementById('ai-chatbot-messages');
  if (!messagesContainer) return null;

  const typingDiv = document.createElement('div');
  typingDiv.className = 'ai-chat-bubble ai-chat-bubble--assistant ai-chat-bubble--typing';
  typingDiv.id = 'ai-chat-typing-indicator';
  typingDiv.innerHTML = `
    <div class="ai-chat-typing-dots">
      <span></span><span></span><span></span>
    </div>
  `;
  messagesContainer.appendChild(typingDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  return typingDiv;
}

/**
 * Removes typing indicator
 */
function removeTypingIndicator() {
  const indicator = document.getElementById('ai-chat-typing-indicator');
  if (indicator) indicator.remove();
}

/**
 * Renders interactive suggestion chips below message stream
 */
function renderSuggestions(suggestions = []) {
  const container = document.getElementById('ai-chatbot-suggestions');
  if (!container) return;

  if (!suggestions || suggestions.length === 0) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';
  container.innerHTML = suggestions.map(s => `
    <button type="button" class="ai-suggestion-chip" data-prompt="${escapeHtml(s)}">
      <span>${escapeHtml(s)}</span>
    </button>
  `).join('');

  container.querySelectorAll('.ai-suggestion-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.getAttribute('data-prompt');
      if (prompt) {
        handleUserSubmit(prompt);
      }
    });
  });
}

/**
 * Handles direct actions clicked within the AI response (open modal or switch tab)
 */
function handleDirectAction(action) {
  if (!action) return;

  // On small mobile screens, minimize panel so target modal/tab is unobstructed
  if (window.innerWidth < 768) {
    toggleChatbot(false);
  }

  if (action.type === 'open_modal') {
    // Dispatch custom event & call window.openModal if available
    document.dispatchEvent(new CustomEvent('rentroll:open-modal', { detail: { modalId: action.target } }));
    if (typeof window.openModal === 'function') {
      window.openModal(action.target);
    } else {
      const modal = document.getElementById(action.target);
      if (modal) {
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
      }
    }
  } else if (action.type === 'switch_tab') {
    const tabBtn = document.querySelector(`[data-tab="${action.target}"]`);
    if (tabBtn) {
      tabBtn.click();
    }
  }
}

/**
 * Handles sending a message to backend and receiving AI response
 */
async function handleUserSubmit(messageText) {
  const trimmed = (messageText || '').trim();
  if (!trimmed) return;

  const input = document.getElementById('ai-chatbot-input');
  if (input) input.value = '';

  const sendBtn = document.getElementById('ai-chatbot-send-btn');
  if (sendBtn) sendBtn.disabled = true;

  // Clear suggestions while generating
  renderSuggestions([]);

  // Append user bubble
  appendMessage('user', trimmed);

  // Show typing indicator
  showTypingIndicator();

  try {
    const res = await sendChatMessage(trimmed, messageHistory.slice(-6));
    removeTypingIndicator();

    if (res && res.success) {
      appendMessage('assistant', res.reply, res.action);
      renderSuggestions(res.suggestions || []);
    } else {
      appendMessage('assistant', res?.error || 'I encountered an issue processing your request. Please try again.');
    }
  } catch (err) {
    removeTypingIndicator();
    console.warn('[AI Assistant] Communication error:', err);
    appendMessage(
      'assistant',
      'I am momentarily unable to reach the server. For urgent maintenance or payment queries, please use the direct action buttons in your dashboard.'
    );
  } finally {
    if (sendBtn) sendBtn.disabled = false;
  }
}

/**
 * Binds DOM event listeners for the chatbot widget
 */
function bindChatbotEvents() {
  const launcher = document.getElementById('ai-chatbot-launcher');
  const closeBtn = document.getElementById('ai-chatbot-close-btn');
  const resetBtn = document.getElementById('ai-chatbot-reset-btn');
  const form = document.getElementById('ai-chatbot-form');
  const input = document.getElementById('ai-chatbot-input');

  if (launcher) {
    launcher.addEventListener('click', () => toggleChatbot());
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => toggleChatbot(false));
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const messagesContainer = document.getElementById('ai-chatbot-messages');
      if (messagesContainer) messagesContainer.innerHTML = '';
      messageHistory = [];
      const greeting = getInitialGreeting(currentUser);
      appendMessage('assistant', greeting.text, null);
      renderSuggestions(greeting.suggestions);
    });
  }

  if (form && input) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleUserSubmit(input.value);
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isChatOpen) {
      toggleChatbot(false);
    }
  });
}

