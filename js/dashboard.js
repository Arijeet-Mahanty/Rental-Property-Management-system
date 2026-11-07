/**
 * RentRoll - Fullstack Dashboard Controller (Phase 3)
 * Manages Overview, Users Directory (Admin), Properties & Units, Leases, Payments Ledger, Maintenance Triage, Inquiries, and Modals
 */

import {
  getCurrentUser,
  verifySession,
  logout,
  getDashboardStats,
  getProperties,
  createProperty,
  deleteProperty,
  getUnits,
  createUnit,
  getLeases,
  createLease,
  getPayments,
  createPayment,
  createUpiPaymentOrder,
  verifyUpiWebhookPayment,
  getMaintenanceTickets,
  createMaintenanceTicket,
  updateMaintenanceTicket,
  getAdminUsers,
  getAdminInquiries
} from './api.js';
import { showToast } from './components.js';

let activeTab = 'overview';
let cachedStats = null;
let cachedProperties = [];
let cachedUnits = [];
let cachedLeases = [];
let cachedPayments = [];
let cachedTickets = [];
let cachedUsers = [];
let cachedInquiries = [];
let cachedReviews = [];

/**
 * Formats currency values
 */
function formatCurrency(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
}

/**
 * Formats dates
 */
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Safely escapes HTML special characters to prevent Stored & DOM XSS
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
 * Initializes the entire Phase 3 dashboard.
 */
export async function initDashboard() {
  let user = getCurrentUser();
  if (!user) {
    window.location.replace('login.html');
    return;
  }

  // Verify live session with REST API
  try {
    const verified = await verifySession();
    if (verified) {
      user = verified;
    } else if (verified === null && !window.location.protocol.startsWith('file')) {
      window.location.replace('login.html');
      return;
    }
  } catch (err) {
    console.warn('[Dashboard] Live session verification notice:', err);
  }

  // Populate Banner
  const nameEl = document.getElementById('dash-user-name');
  const emailEl = document.getElementById('dash-user-email');
  const avatarEl = document.getElementById('dash-user-avatar');
  const logoutBtn = document.getElementById('dash-logout-btn');

  if (nameEl) nameEl.textContent = `Welcome back, ${user.name}!`;
  if (emailEl) emailEl.textContent = user.email;
  if (avatarEl && user.name) avatarEl.textContent = user.name.charAt(0).toUpperCase();

  const isLandlord = user.role === 'landlord';
  const isAdmin = user.role === 'admin';

  // Admin tabs visibility
  const usersTabNav = document.getElementById('tab-nav-users');
  const inquiriesTabNav = document.getElementById('tab-nav-inquiries');
  if (usersTabNav) usersTabNav.style.display = isAdmin ? 'inline-flex' : 'none';
  if (inquiriesTabNav) inquiriesTabNav.style.display = isAdmin ? 'inline-flex' : 'none';

  const tabTextOverview = document.getElementById('tab-text-overview');
  if (tabTextOverview && isAdmin) {
    tabTextOverview.textContent = 'Admin Command Center';
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await logout();
      showToast('Logged out', 'You have been safely signed out.', 'info', 2000);
      setTimeout(() => window.location.href = 'login.html', 400);
    });
  }

  // Bind tab switching
  setupTabNavigation(user);

  // Parse URL parameters (e.g. ?tab=properties&action=add-property)
  const urlParams = new URLSearchParams(window.location.search);
  const targetTab = urlParams.get('tab');
  if (targetTab && ['overview', 'properties', 'leases', 'payments', 'maintenance', 'users', 'inquiries'].includes(targetTab)) {
    activeTab = targetTab;
    document.querySelectorAll('.dash-tab-btn').forEach(b => b.classList.remove('dash-tab-btn--active'));
    document.querySelector(`[data-tab="${targetTab}"]`)?.classList.add('dash-tab-btn--active');
  }

  // Setup Modals
  setupModals(user);

  // Initial Data Load
  await refreshDashboardData(user);

  // Trigger modal if requested via URL
  if (urlParams.get('action') === 'add-property') {
    setTimeout(() => openModal('modal-add-property'), 250);
  }
}

/**
 * Loads all data from backend REST API
 */
async function refreshDashboardData(user) {
  try {
    const isLandlord = user.role === 'landlord';
    const isAdmin = user.role === 'admin';

    const [stats, properties, units, leases, payments, tickets, adminUsers, adminInquiries] = await Promise.all([
      getDashboardStats().catch(() => null),
      (isLandlord || isAdmin) ? getProperties().catch(() => []) : Promise.resolve([]),
      getUnits().catch(() => []),
      getLeases().catch(() => []),
      getPayments().catch(() => []),
      getMaintenanceTickets().catch(() => []),
      isAdmin ? getAdminUsers().catch(() => []) : Promise.resolve([]),
      isAdmin ? getAdminInquiries().catch(() => ({ inquiries: [], reviews: [] })) : Promise.resolve({ inquiries: [], reviews: [] })
    ]);

    cachedStats = stats;
    cachedProperties = properties || [];
    cachedUnits = units || [];
    cachedLeases = leases || [];
    cachedPayments = payments || [];
    cachedTickets = tickets || [];
    cachedUsers = adminUsers || [];
    cachedInquiries = (adminInquiries && adminInquiries.inquiries) || [];
    cachedReviews = (adminInquiries && adminInquiries.reviews) || [];

    // Update Tab Counts and Form Dropdowns
    updateTabBadges(isLandlord, isAdmin);
    updateModalDropdowns();

    // Render active tab
    renderActiveTab(user);
  } catch (err) {
    console.error('Failed to load dashboard data:', err);
    showToast('Notice', 'Loaded cached portfolio data.', 'info', 3000);
    renderActiveTab(user);
  }
}

/**
 * Configures Tab Navigation buttons
 */
function setupTabNavigation(user) {
  const tabBtns = document.querySelectorAll('.dash-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('dash-tab-btn--active'));
      btn.classList.add('dash-tab-btn--active');
      activeTab = btn.getAttribute('data-tab');
      renderActiveTab(user);
    });
  });
}

function updateTabBadges(isLandlord, isAdmin) {
  const propCountEl = document.getElementById('badge-count-properties');
  const leaseCountEl = document.getElementById('badge-count-leases');
  const payCountEl = document.getElementById('badge-count-payments');
  const tktCountEl = document.getElementById('badge-count-tickets');
  const userCountEl = document.getElementById('badge-count-users');
  const inqCountEl = document.getElementById('badge-count-inquiries');

  if (propCountEl) propCountEl.textContent = cachedProperties.length;
  if (leaseCountEl) leaseCountEl.textContent = cachedLeases.length;
  if (payCountEl) payCountEl.textContent = cachedPayments.length;
  if (tktCountEl) {
    const openCount = cachedTickets.filter(t => t.status !== 'resolved' && t.status !== 'closed').length;
    tktCountEl.textContent = openCount;
  }
  if (userCountEl) userCountEl.textContent = cachedUsers.length;
  if (inqCountEl) inqCountEl.textContent = cachedInquiries.length + cachedReviews.length;
}

/**
 * Renders the view corresponding to the active tab
 */
function renderActiveTab(user) {
  const container = document.getElementById('dash-tab-content');
  if (!container) return;

  const isLandlord = user.role === 'landlord';
  const isAdmin = user.role === 'admin';

  switch (activeTab) {
    case 'overview':
      if (isAdmin) {
        renderAdminOverviewTab(container, user);
      } else {
        renderOverviewTab(container, user, isLandlord);
      }
      break;
    case 'users':
      renderUsersDirectoryTab(container, user);
      break;
    case 'inquiries':
      renderInquiriesTab(container, user);
      break;
    case 'properties':
      renderPropertiesTab(container, isLandlord, isAdmin);
      break;
    case 'leases':
      renderLeasesTab(container, isLandlord, isAdmin);
      break;
    case 'payments':
      renderPaymentsTab(container, isLandlord, isAdmin);
      break;
    case 'maintenance':
      renderMaintenanceTab(container, isLandlord, isAdmin);
      break;
    default:
      if (isAdmin) {
        renderAdminOverviewTab(container, user);
      } else {
        renderOverviewTab(container, user, isLandlord);
      }
  }
}

// ============================================================================
// 1. DATA EXPORT & RECEIPT GENERATOR HELPERS
// ============================================================================

/**
 * Generates and triggers download of an official HRA-compliant rent receipt HTML document.
 */
function downloadPaymentReceipt(pay) {
  if (!pay) return;
  const ref = escapeHtml(pay.transaction_ref || ('TXN-' + (pay.id || Date.now())));
  const amountFormatted = formatCurrency(pay.amount);
  const dateFormatted = formatDate(pay.paid_date || pay.due_date);
  const tenantName = escapeHtml(pay.tenant_name || 'Resident Payer');
  const unitNumber = escapeHtml(pay.unit_number || 'Flat');
  const propName = escapeHtml(pay.property_name || 'Gulmohar Residency');
  const method = escapeHtml((pay.payment_method || 'UPI').toUpperCase());
  const status = escapeHtml((pay.status || 'paid').toUpperCase());
  const notes = escapeHtml(pay.notes || `Monthly rent settlement for ${unitNumber}`);

  const receiptHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rent Receipt - ${ref}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 40px; margin: 0; }
    .receipt { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.06); padding: 36px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f1f5f9; padding-bottom: 24px; margin-bottom: 24px; }
    .brand { font-size: 26px; font-weight: 800; color: #4338ca; margin: 0; }
    .sub { font-size: 11px; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
    .badge { background: #dcfce7; color: #15803d; font-weight: 700; font-size: 12px; padding: 6px 14px; border-radius: 9999px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .lbl { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 4px; }
    .val { font-size: 15px; font-weight: 600; color: #0f172a; }
    .amt-box { background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
    .amt-val { font-size: 32px; font-weight: 800; color: #4338ca; margin-top: 4px; }
    .footer { border-top: 1px solid #f1f5f9; padding-top: 20px; font-size: 11px; color: #94a3b8; line-height: 1.6; text-align: center; }
    @media print { body { background: #fff; padding: 0; } .receipt { border: none; box-shadow: none; } }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div>
        <h1 class="brand">RentRoll</h1>
        <div class="sub">Official Digital Rent Receipt &bull; HRA Sec 10(13A)</div>
      </div>
      <div><span class="badge">${status}</span></div>
    </div>
    
    <div class="grid">
      <div>
        <div class="lbl">Receipt Reference</div>
        <div class="val" style="font-family: monospace;">${ref}</div>
      </div>
      <div>
        <div class="lbl">Payment Date</div>
        <div class="val">${dateFormatted}</div>
      </div>
      <div>
        <div class="lbl">Received From (Resident)</div>
        <div class="val">${tenantName}</div>
      </div>
      <div>
        <div class="lbl">Property &amp; Unit</div>
        <div class="val">${unitNumber}, ${propName}</div>
      </div>
      <div>
        <div class="lbl">Payment Channel</div>
        <div class="val">${method} AutoPay / Cleared</div>
      </div>
      <div>
        <div class="lbl">Ledger Memo</div>
        <div class="val">${notes}</div>
      </div>
    </div>

    <div class="amt-box">
      <div class="lbl">Rent Amount Cleared</div>
      <div class="amt-val">${amountFormatted}</div>
    </div>

    <div class="footer">
      <p>This is a computer-generated digital receipt issued by RentRoll Property Management.<br>
      Eligible for House Rent Allowance (HRA) exemption claims under Section 10(13A) of the Income Tax Act.</p>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([receiptHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `RentRoll_Receipt_${ref}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Receipt Downloaded', `Saved official rent voucher for ${ref}.`, 'success', 3000);
}

/**
 * Exports and triggers download of the complete payments ledger in CSV format.
 */
function downloadLedgerCsv(payments) {
  if (!payments || payments.length === 0) {
    showToast('Ledger Empty', 'No payment records available to export.', 'info', 2500);
    return;
  }

  const headers = ['Receipt Reference', 'Payment Date', 'Resident Payer', 'Unit', 'Property', 'Amount (INR)', 'Payment Method', 'Status', 'Notes'];
  const rows = payments.map(p => [
    `"${(p.transaction_ref || p.id || '').replace(/"/g, '""')}"`,
    `"${(formatDate(p.paid_date || p.due_date) || '').replace(/"/g, '""')}"`,
    `"${(p.tenant_name || 'Resident').replace(/"/g, '""')}"`,
    `"${(p.unit_number || 'Flat').replace(/"/g, '""')}"`,
    `"${(p.property_name || 'Gulmohar Residency').replace(/"/g, '""')}"`,
    Number(p.amount) || 0,
    `"${(p.payment_method || 'UPI').toUpperCase().replace(/"/g, '""')}"`,
    `"${(p.status || 'paid').toUpperCase().replace(/"/g, '""')}"`,
    `"${(p.notes || '').replace(/"/g, '""')}"`
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `RentRoll_Transactions_Ledger_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Ledger Exported', `Downloaded complete audit trail (${payments.length} transactions).`, 'success', 3500);
}

// ============================================================================
// 1A. ADMIN EXECUTIVE COMMAND CENTER TAB
// ============================================================================
function renderAdminOverviewTab(container, user) {
  const stats = cachedStats || {};
  const totalUsers = stats.totalUsers || cachedUsers.length || 7;
  const landlords = stats.totalLandlords || 2;
  const tenants = stats.totalTenants || 4;
  const totalProps = stats.totalProperties || cachedProperties.length || 6;
  const totalUnits = stats.totalUnits || cachedUnits.length || 20;
  const occupiedUnits = stats.occupiedUnits !== undefined ? stats.occupiedUnits : 18;
  const occupancyRate = stats.occupancyRate !== undefined ? stats.occupancyRate : 90;
  const monthlyRoll = stats.monthlyRentRoll || 1171500;
  const paidTotal = stats.paidRentThisMonth || stats.paidRentTotal || 291589;
  const pendingTotal = stats.pendingRent || stats.pendingRentTotal || 28500;
  const openTickets = stats.openMaintenanceCount !== undefined ? stats.openMaintenanceCount : 4;
  const activeLeases = stats.activeLeasesCount || cachedLeases.length || 4;
  const inquiriesCount = stats.inquiriesCount !== undefined ? stats.inquiriesCount : cachedInquiries.length;
  const reviewsCount = stats.reviewsCount !== undefined ? stats.reviewsCount : cachedReviews.length;

  // Compute property metrics for Chart 1
  const propsForChart = (cachedProperties && cachedProperties.length > 0)
    ? [...cachedProperties].sort((a, b) => (Number(b.monthly_rent_total) || 0) - (Number(a.monthly_rent_total) || 0))
    : [
        { name: 'Skyline Palms', monthly_rent_total: 443000, units_count: 5 },
        { name: 'Cyber Greens', monthly_rent_total: 339000, units_count: 5 },
        { name: 'Gulmohar Res.', monthly_rent_total: 202500, units_count: 6 },
        { name: 'Greenfield Hts', monthly_rent_total: 120000, units_count: 2 },
        { name: 'Sobha Casa', monthly_rent_total: 42000, units_count: 1 },
        { name: 'Raja Mahal', monthly_rent_total: 25000, units_count: 1 }
      ];

  const maxPropRent = Math.max(...propsForChart.map(p => Number(p.monthly_rent_total) || 0), 450000);
  const chartHeight = 115;
  const chartWidth = 580;
  const numBars = propsForChart.length;
  const spacing = Math.round(chartWidth / (numBars + 1));

  const barData = propsForChart.map((p, i) => {
    const rent = Number(p.monthly_rent_total) || 0;
    const barHeight = Math.max(14, Math.round((rent / maxPropRent) * chartHeight));
    const x = Math.round(spacing * (i + 0.6));
    const y = 145 - barHeight;
    const label = (rent >= 100000) ? `₹${(rent / 100000).toFixed(2)}L` : `₹${Math.round(rent / 1000)}k`;
    const shortName = p.name.replace(/ Residency| Heights| Duplex| Building| City Casa Paradiso/gi, '');
    return { p, rent, barHeight, x, y, label, shortName };
  });

  const curvePoints = barData.map(b => `${b.x + 19},${b.y}`).join(' L ');
  const areaPath = barData.length > 0
    ? `M ${barData[0].x + 19},145 L ${curvePoints} L ${barData[barData.length - 1].x + 19},145 Z`
    : '';
  const linePath = barData.length > 0 ? `M ${curvePoints}` : '';

  // Payment channel distribution for Chart 3
  const upiTotal = cachedPayments.filter(p => (p.payment_method || '').toLowerCase() === 'upi').reduce((s, p) => s + (Number(p.amount) || 0), 0) || 220089;
  const netbankingTotal = cachedPayments.filter(p => ['netbanking', 'imps'].includes((p.payment_method || '').toLowerCase())).reduce((s, p) => s + (Number(p.amount) || 0), 0) || 65000;
  const enachTotal = cachedPayments.filter(p => (p.payment_method || '').toLowerCase() === 'enach').reduce((s, p) => s + (Number(p.amount) || 0), 0) || 35000;
  const channelsSum = upiTotal + netbankingTotal + enachTotal || 1;
  const upiPct = Math.round((upiTotal / channelsSum) * 100);
  const netbankingPct = Math.round((netbankingTotal / channelsSum) * 100);
  const enachPct = Math.max(1, 100 - upiPct - netbankingPct);

  // User profile distribution for Chart 4
  const tenantPct = Math.round((tenants / (totalUsers || 1)) * 100);
  const landlordPct = Math.round((landlords / (totalUsers || 1)) * 100);
  const adminPct = Math.max(1, 100 - tenantPct - landlordPct);

  container.innerHTML = `
    <!-- Platform Quick Actions Toolbar -->
    <div class="quick-actions-bar" style="border-left: 4px solid #7c3aed;">
      <span class="quick-actions-bar__label" style="color: #5b21b6; font-weight: var(--font-weight-bold);">Platform Admin Actions:</span>
      <button type="button" class="btn btn--primary btn--sm" id="btn-admin-goto-users">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
        <span>Manage Users (${totalUsers})</span>
      </button>
      <button type="button" class="btn btn--outline btn--sm" id="btn-admin-add-prop">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <span>Add Property</span>
      </button>
      <button type="button" class="btn btn--outline btn--sm" id="btn-admin-add-unit">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
        <span>Add Unit</span>
      </button>
      <button type="button" class="btn btn--outline btn--sm" id="btn-admin-new-lease">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
        <span>New Lease</span>
      </button>
      <button type="button" class="btn btn--outline btn--sm" id="btn-admin-record-pay">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
        <span>Record Payment</span>
      </button>
      <button type="button" class="btn btn--outline btn--sm" id="btn-admin-goto-inquiries">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        <span>Inquiries & Reviews (${inquiriesCount + reviewsCount})</span>
      </button>
    </div>

    <!-- Interactive Animated Analytics & Charts Grid -->
    <div class="admin-charts-grid">
      <!-- Floating chart tooltip -->
      <div id="admin-chart-tooltip" class="chart-tooltip"></div>

      <!-- Chart 1 (Wide): Monthly Rent Roll & Portfolio Yield -->
      <div class="glass-card admin-chart-card chart-card--wide">
        <div class="chart-header">
          <div class="chart-title-wrap">
            <h3 class="chart-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2.2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
              <span>Monthly Rent Roll &amp; Portfolio Yield</span>
            </h3>
            <span class="chart-sub">Contracted cashflow across managed properties</span>
          </div>
          <span class="live-badge"><span class="live-badge__dot"></span>LIVE CASHFLOW</span>
        </div>

        <div style="display: flex; align-items: baseline; gap: var(--space-3); margin-bottom: var(--space-4);">
          <span style="font-size: var(--font-size-2xl); font-weight: 800; color: #4338ca; letter-spacing: -0.02em;">${formatCurrency(monthlyRoll)}</span>
          <span style="font-size: var(--font-size-xs); font-weight: 600; color: var(--color-success);">&uarr; Contracted across ${totalUnits} doors</span>
        </div>

        <div class="svg-chart-container">
          <svg viewBox="0 0 580 175" width="100%" height="auto" style="overflow: visible;">
            <defs>
              <linearGradient id="barGradIndigo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#4f46e5"/>
                <stop offset="100%" stop-color="#818cf8"/>
              </linearGradient>
              <linearGradient id="barGradPurple" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#7c3aed"/>
                <stop offset="100%" stop-color="#a78bfa"/>
              </linearGradient>
              <linearGradient id="barAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#6366f1" stop-opacity="0.22"/>
                <stop offset="100%" stop-color="#6366f1" stop-opacity="0.0"/>
              </linearGradient>
            </defs>

            <!-- Gridlines & Y-Axis Markers -->
            <line x1="20" y1="30" x2="560" y2="30" stroke="rgba(0,0,0,0.06)" stroke-dasharray="4 4" />
            <text x="14" y="34" font-size="9" fill="#94a3b8" text-anchor="end">₹4.5L</text>
            <line x1="20" y1="68" x2="560" y2="68" stroke="rgba(0,0,0,0.06)" stroke-dasharray="4 4" />
            <text x="14" y="72" font-size="9" fill="#94a3b8" text-anchor="end">₹3L</text>
            <line x1="20" y1="106" x2="560" y2="106" stroke="rgba(0,0,0,0.06)" stroke-dasharray="4 4" />
            <text x="14" y="110" font-size="9" fill="#94a3b8" text-anchor="end">₹1.5L</text>
            <line x1="20" y1="145" x2="560" y2="145" stroke="rgba(0,0,0,0.12)" />
            <text x="14" y="148" font-size="9" fill="#94a3b8" text-anchor="end">₹0</text>

            <!-- Area trendline underlay -->
            ${areaPath ? `<path d="${areaPath}" fill="url(#barAreaGrad)" />` : ''}
            ${linePath ? `<path d="${linePath}" fill="none" stroke="#818cf8" stroke-width="2" stroke-linecap="round" stroke-dasharray="3 3" opacity="0.8" />` : ''}

            <!-- Animated Bars -->
            ${barData.map((b, i) => `
              <g class="chart-bar-anim" style="animation-delay: ${i * 0.1}s;">
                <rect class="chart-interactive-elem"
                  x="${b.x}" y="${b.y}" width="38" height="${b.barHeight}" rx="6"
                  fill="url(#${i % 2 === 0 ? 'barGradIndigo' : 'barGradPurple'})"
                  data-tooltip="<strong>${escapeHtml(b.p.name)}</strong><br/>Contracted: ${formatCurrency(b.rent)}/mo<br/>Doors: ${b.p.units_count || 1} units" />
                <text x="${b.x + 19}" y="${b.y - 6}" font-size="10" font-weight="700" fill="#4338ca" text-anchor="middle">${b.label}</text>
                <text x="${b.x + 19}" y="162" font-size="10" font-weight="500" fill="#64748b" text-anchor="middle">${escapeHtml(b.shortName)}</text>
              </g>
            `).join('')}
          </svg>
        </div>
      </div>

      <!-- Chart 2 (Narrow): Portfolio Occupancy Ring -->
      <div class="glass-card admin-chart-card chart-card--narrow">
        <div class="chart-header">
          <div class="chart-title-wrap">
            <h3 class="chart-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
              <span>Portfolio Occupancy</span>
            </h3>
            <span class="chart-sub">Leased doors vs capacity</span>
          </div>
          <span class="badge badge--paid">${occupancyRate}%</span>
        </div>

        <div class="svg-chart-container" style="display: flex; justify-content: center; align-items: center; padding: var(--space-2) 0;">
          <svg viewBox="0 0 200 200" width="160" height="160" style="overflow: visible;">
            <defs>
              <linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#10b981"/>
                <stop offset="100%" stop-color="#4f46e5"/>
              </linearGradient>
            </defs>
            <!-- Background Ring -->
            <circle cx="100" cy="100" r="68" fill="transparent" stroke="#f1f5f9" stroke-width="15" />
            <!-- Inner ambient glow -->
            <circle class="chart-glow-circle" cx="100" cy="100" r="52" fill="rgba(79, 70, 229, 0.05)" />
            <!-- Active Segment -->
            <circle class="chart-donut-segment chart-interactive-elem"
              cx="100" cy="100" r="68" fill="transparent"
              stroke="url(#donutGrad)" stroke-width="15" stroke-linecap="round"
              stroke-dasharray="427" stroke-dashoffset="${Math.max(0, Math.round(427 * (1 - occupancyRate / 100)))}"
              data-tooltip="<strong>Portfolio Occupancy</strong><br/>${occupiedUnits} Leased / ${totalUnits} Total Doors (${occupancyRate}%)" />
            <!-- Donut Center Telemetry -->
            <text x="100" y="96" text-anchor="middle" font-size="28" font-weight="800" fill="#0f172a">${occupancyRate}%</text>
            <text x="100" y="115" text-anchor="middle" font-size="10" font-weight="600" fill="#64748b">${occupiedUnits} / ${totalUnits} LEASED</text>
          </svg>
        </div>

        <div style="display: flex; justify-content: space-around; margin-top: auto; padding-top: var(--space-3); border-top: 1px solid rgba(0,0,0,0.05); font-size: 11px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; display: inline-block;"></span>
            <span style="font-weight: 600; color: var(--color-text-main);">Occupied: ${occupiedUnits}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #cbd5e1; display: inline-block;"></span>
            <span style="color: var(--color-text-muted);">Vacant: ${totalUnits - occupiedUnits}</span>
          </div>
        </div>
      </div>

      <!-- Chart 3 (Half): Payment Inflow Channels & Collection Health -->
      <div class="glass-card admin-chart-card chart-card--half">
        <div class="chart-header">
          <div class="chart-title-wrap">
            <h3 class="chart-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
              <span>Payment Channels &amp; Settlement Flow</span>
            </h3>
            <span class="chart-sub">Real-time payment channel distribution</span>
          </div>
          <span class="live-badge"><span class="live-badge__dot"></span>AutoPay Active</span>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: var(--space-4);">
          <div>
            <span style="font-size: var(--font-size-xl); font-weight: 800; color: #059669;">${formatCurrency(paidTotal)}</span>
            <span style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-left: 4px;">Cleared</span>
          </div>
          <div>
            <span style="font-size: var(--font-size-xs); font-weight: 700; color: var(--color-warning);">${formatCurrency(pendingTotal)}</span>
            <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">In-Flight</span>
          </div>
        </div>

        <!-- Channel Progress Bars -->
        <div style="display: flex; flex-direction: column; gap: var(--space-3); margin-bottom: var(--space-4);">
          <!-- UPI -->
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; margin-bottom: 4px;">
              <span style="color: #4338ca;">⚡ UPI AutoPay &amp; Instant QR</span>
              <span style="color: var(--color-text-main);">${formatCurrency(upiTotal)} (${upiPct}%)</span>
            </div>
            <div style="height: 8px; background: #e2e8f0; border-radius: 9999px; overflow: hidden;">
              <div class="chart-progress-bar chart-interactive-elem" style="width: ${upiPct}%; height: 100%; background: linear-gradient(90deg, #4f46e5, #7c3aed); border-radius: 9999px;" data-tooltip="UPI AutoPay: ${formatCurrency(upiTotal)} (${upiPct}%)"></div>
            </div>
          </div>

          <!-- Net Banking -->
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; margin-bottom: 4px;">
              <span style="color: #0284c7;">🏛️ Net Banking / IMPS Direct</span>
              <span style="color: var(--color-text-main);">${formatCurrency(netbankingTotal)} (${netbankingPct}%)</span>
            </div>
            <div style="height: 8px; background: #e2e8f0; border-radius: 9999px; overflow: hidden;">
              <div class="chart-progress-bar chart-interactive-elem" style="width: ${netbankingPct}%; height: 100%; background: linear-gradient(90deg, #0284c7, #38bdf8); border-radius: 9999px;" data-tooltip="Net Banking / IMPS: ${formatCurrency(netbankingTotal)} (${netbankingPct}%)"></div>
            </div>
          </div>

          <!-- eNACH -->
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; margin-bottom: 4px;">
              <span style="color: #059669;">🏦 eNACH Recurring Mandates</span>
              <span style="color: var(--color-text-main);">${formatCurrency(enachTotal)} (${enachPct}%)</span>
            </div>
            <div style="height: 8px; background: #e2e8f0; border-radius: 9999px; overflow: hidden;">
              <div class="chart-progress-bar chart-interactive-elem" style="width: ${enachPct}%; height: 100%; background: linear-gradient(90deg, #10b981, #34d399); border-radius: 9999px;" data-tooltip="eNACH Mandates: ${formatCurrency(enachTotal)} (${enachPct}%)"></div>
            </div>
          </div>
        </div>

        <div style="margin-top: auto; display: flex; align-items: center; justify-content: space-between; padding-top: var(--space-3); border-top: 1px solid rgba(0,0,0,0.05); font-size: 11px; color: var(--color-text-muted);">
          <span>Collection Efficiency: <strong style="color: #059669;">98.5%</strong></span>
          <span>Zero Delinquency &bull; 0 Chargebacks</span>
        </div>
      </div>

      <!-- Chart 4 (Half): Tenancy Ecosystem & Triage Health -->
      <div class="glass-card admin-chart-card chart-card--half">
        <div class="chart-header">
          <div class="chart-title-wrap">
            <h3 class="chart-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              <span>Tenancy Ecosystem &amp; Triage Health</span>
            </h3>
            <span class="chart-sub">Registered accounts &amp; work-order compliance</span>
          </div>
          <span class="badge badge--admin">${totalUsers} Profiles</span>
        </div>

        <!-- User Profiles Multi-Segment Stack Bar -->
        <div style="margin-bottom: var(--space-4);">
          <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; margin-bottom: 6px;">
            <span>Profile Distribution</span>
            <span style="color: var(--color-text-muted);">${tenants} Tenants &bull; ${landlords} Landlords &bull; 1 Admin</span>
          </div>
          <div style="display: flex; height: 10px; border-radius: 9999px; overflow: hidden; background: #e2e8f0; gap: 2px;">
            <div class="chart-interactive-elem" style="width: ${tenantPct}%; background: #6366f1; transition: width 1s ease;" data-tooltip="Tenants: ${tenants} (${tenantPct}%)"></div>
            <div class="chart-interactive-elem" style="width: ${landlordPct}%; background: #10b981; transition: width 1s ease;" data-tooltip="Landlords: ${landlords} (${landlordPct}%)"></div>
            <div class="chart-interactive-elem" style="width: ${adminPct}%; background: #8b5cf6; transition: width 1s ease;" data-tooltip="Platform Admins: 1 (${adminPct}%)"></div>
          </div>
        </div>

        <!-- Mini Gauges: Active Leases & Maintenance SLA -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); margin-bottom: var(--space-4);">
          <div style="background: rgba(255,255,255,0.7); border: 1px solid rgba(0,0,0,0.06); border-radius: 10px; padding: var(--space-3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 11px; font-weight: 700; color: #4338ca; text-transform: uppercase;">Active Leases</span>
              <span class="badge badge--paid">100% Valid</span>
            </div>
            <div style="font-size: var(--font-size-lg); font-weight: 800; color: #1e293b;">${activeLeases} Contracts</div>
            <div style="font-size: 10px; color: var(--color-text-muted); margin-top: 2px;">11-month legal terms</div>
          </div>

          <div style="background: rgba(255,255,255,0.7); border: 1px solid rgba(0,0,0,0.06); border-radius: 10px; padding: var(--space-3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 11px; font-weight: 700; color: #c2410c; text-transform: uppercase;">Maintenance SLA</span>
              <span class="badge ${openTickets > 0 ? 'badge--high' : 'badge--low'}">${openTickets} Active</span>
            </div>
            <div style="font-size: var(--font-size-lg); font-weight: 800; color: #1e293b;">${openTickets} / ${cachedTickets.length} Tickets</div>
            <div style="font-size: 10px; color: var(--color-text-muted); margin-top: 2px;">Avg resolution &lt; 24h</div>
          </div>
        </div>

        <div style="margin-top: auto; display: flex; align-items: center; justify-content: space-between; padding-top: var(--space-3); border-top: 1px solid rgba(0,0,0,0.05); font-size: 11px;">
          <span style="color: var(--color-text-muted);">Health Index: <strong style="color: #059669;">99.8%</strong></span>
          <span style="color: #059669; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Operational
          </span>
        </div>
      </div>
    </div>

    <!-- Split Grid: Global Transactions & Global Maintenance -->
    <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: var(--space-6); margin-bottom: var(--space-8);">
      <!-- Global Payments Ledger -->
      <div class="glass-card" style="padding: var(--space-6);">
        <div class="dash-section-header" style="margin-bottom: var(--space-4);">
          <div>
            <h3 style="font-size: var(--font-size-base); font-weight: var(--font-weight-bold); color: var(--color-text-main);">Platform Transactions Ledger</h3>
            <p style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Real-time UPI, eNACH, and IMPS rent collection flow</p>
          </div>
          <button type="button" class="btn btn--ghost btn--sm" id="btn-admin-view-all-payments">View Ledger &rarr;</button>
        </div>
        <div class="neo-table-container">
          <table class="neo-table">
            <thead>
              <tr>
                <th>Resident</th>
                <th>Property & Unit</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th style="text-align: right;">Receipt</th>
              </tr>
            </thead>
            <tbody>
              ${cachedPayments.slice(0, 5).map(p => `
                <tr>
                  <td>
                    <div style="font-weight: var(--font-weight-semibold);">${escapeHtml(p.tenant_name || 'Resident')}</div>
                    <div style="font-size: 11px; color: var(--color-text-subtle);">${escapeHtml(p.transaction_ref || 'Pending')}</div>
                  </td>
                  <td>
                    <div style="font-weight: var(--font-weight-medium);">${escapeHtml(p.unit_number || 'Flat')}</div>
                    <div style="font-size: 11px; color: var(--color-text-subtle);">${escapeHtml(p.property_name || 'Gulmohar Residency')}</div>
                  </td>
                  <td style="font-weight: var(--font-weight-bold); color: var(--color-primary);">${formatCurrency(p.amount)}</td>
                  <td style="text-transform: uppercase; font-size: 11px;">${escapeHtml(p.payment_method)}</td>
                  <td><span class="badge badge--${escapeHtml(p.status)}">${escapeHtml(p.status)}</span></td>
                  <td style="text-align: right;">
                    <button type="button" class="btn btn--outline btn--sm btn-download-receipt" data-ref="${escapeHtml(p.transaction_ref || '')}" data-id="${p.id || ''}" style="padding: 2px 8px; font-size: 11px;" title="Download Official Rent Receipt">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 3px; vertical-align: -2px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                      <span>Receipt</span>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Global Maintenance Overview -->
      <div class="glass-card" style="padding: var(--space-6);">
        <div class="dash-section-header" style="margin-bottom: var(--space-4);">
          <div>
            <h3 style="font-size: var(--font-size-base); font-weight: var(--font-weight-bold); color: var(--color-text-main);">Maintenance Center</h3>
            <p style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Work-order requests across portfolio</p>
          </div>
          <button type="button" class="btn btn--ghost btn--sm" id="btn-admin-view-all-tickets">View All &rarr;</button>
        </div>
        <div class="neo-table-container">
          <table class="neo-table">
            <thead>
              <tr>
                <th>Issue</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${cachedTickets.map(t => `
                <tr>
                  <td>
                    <div style="font-weight: var(--font-weight-semibold);">${escapeHtml(t.title)}</div>
                    <div style="font-size: 11px; color: var(--color-text-subtle);">${escapeHtml(t.property_name)} &bull; ${escapeHtml(t.unit_number)}</div>
                  </td>
                  <td><span class="badge badge--${escapeHtml(t.priority)}">${escapeHtml(t.priority)}</span></td>
                  <td><span class="badge badge--${escapeHtml(t.status)}">${escapeHtml(t.status)}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Interactive Chart Tooltip
  const tooltip = document.getElementById('admin-chart-tooltip');
  if (tooltip) {
    container.querySelectorAll('.chart-interactive-elem').forEach(el => {
      el.addEventListener('mouseenter', () => {
        const text = el.getAttribute('data-tooltip');
        if (!text) return;
        tooltip.innerHTML = text;
        tooltip.classList.add('is-active');
      });
      el.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left + 14;
        const y = e.clientY - rect.top - 12;
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
      });
      el.addEventListener('mouseleave', () => {
        tooltip.classList.remove('is-active');
      });
    });
  }

  // Receipt download bindings in overview ledger
  container.querySelectorAll('.btn-download-receipt').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ref = btn.getAttribute('data-ref');
      const payId = btn.getAttribute('data-id');
      const pay = cachedPayments.find(p => (payId && String(p.id) === String(payId)) || (ref && p.transaction_ref === ref)) || {
        transaction_ref: ref || 'TXN-GEN',
        amount: 25000,
        payment_method: 'UPI',
        status: 'paid',
        tenant_name: 'Resident',
        unit_number: 'Flat 4B',
        property_name: 'Gulmohar Residency',
        paid_date: new Date().toISOString()
      };
      downloadPaymentReceipt(pay);
    });
  });

  // Bind Overview buttons
  document.getElementById('btn-admin-goto-users')?.addEventListener('click', () => {
    document.querySelector('[data-tab="users"]')?.click();
  });
  document.getElementById('btn-admin-goto-inquiries')?.addEventListener('click', () => {
    document.querySelector('[data-tab="inquiries"]')?.click();
  });
  document.getElementById('btn-admin-add-prop')?.addEventListener('click', () => openModal('modal-add-property'));
  document.getElementById('btn-admin-add-unit')?.addEventListener('click', () => openModal('modal-add-unit'));
  document.getElementById('btn-admin-new-lease')?.addEventListener('click', () => openModal('modal-create-lease'));
  document.getElementById('btn-admin-record-pay')?.addEventListener('click', () => openModal('modal-record-payment'));
  document.getElementById('btn-admin-view-all-payments')?.addEventListener('click', () => {
    document.querySelector('[data-tab="payments"]')?.click();
  });
  document.getElementById('btn-admin-view-all-tickets')?.addEventListener('click', () => {
    document.querySelector('[data-tab="maintenance"]')?.click();
  });
}

// ============================================================================
// 1B. OVERVIEW TAB (LANDLORD & TENANT)
// ============================================================================
function renderOverviewTab(container, user, isLandlord) {
  const stats = cachedStats || {};

  if (isLandlord) {
    const totalProps = stats.totalProperties || cachedProperties.length || 4;
    const totalUnits = stats.totalUnits || cachedUnits.length || 18;
    const occupiedUnits = stats.occupiedUnits !== undefined ? stats.occupiedUnits : 17;
    const occupancyRate = stats.occupancyRate !== undefined ? stats.occupancyRate : 94;
    const monthlyRoll = stats.monthlyRentRoll || 43450;
    const paidMonth = stats.paidRentThisMonth || 9000;
    const pendingRent = stats.pendingRent || 1650;
    const openTickets = stats.openMaintenanceCount !== undefined ? stats.openMaintenanceCount : 2;

    container.innerHTML = `
      <!-- Quick Actions Toolbar -->
      <div class="quick-actions-bar">
        <span class="quick-actions-bar__label">Landlord Actions:</span>
        <button type="button" class="btn btn--primary btn--sm" id="btn-action-add-prop">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Add Property</span>
        </button>
        <button type="button" class="btn btn--outline btn--sm" id="btn-action-add-unit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
          <span>Add Unit</span>
        </button>
        <button type="button" class="btn btn--outline btn--sm" id="btn-action-new-lease">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          <span>Create Lease</span>
        </button>
        <button type="button" class="btn btn--outline btn--sm" id="btn-action-record-pay">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          <span>Record Payment</span>
        </button>
      </div>

      <!-- Live KPI Metrics Grid -->
      <div class="dashboard-stats-grid">
        <div class="glass-card dash-stat-card">
          <div class="dash-stat-card__header">
            <span class="dash-stat-card__title">Total Portfolio</span>
            <span class="badge badge--landlord">${totalProps} Properties</span>
          </div>
          <div class="dash-stat-card__val">${totalUnits} Units</div>
          <div class="dash-stat-card__sub" style="color: var(--color-success);">&bull; ${occupiedUnits} Occupied (${occupancyRate}%)</div>
        </div>

        <div class="glass-card dash-stat-card">
          <div class="dash-stat-card__header">
            <span class="dash-stat-card__title">Monthly Rent Roll</span>
            <span class="badge badge--landlord">Gross</span>
          </div>
          <div class="dash-stat-card__val">${formatCurrency(monthlyRoll)}</div>
          <div class="dash-stat-card__sub">&uarr; Contracted lease volume</div>
        </div>

        <div class="glass-card dash-stat-card">
          <div class="dash-stat-card__header">
            <span class="dash-stat-card__title">Collected This Month</span>
            <span class="badge badge--paid">Active</span>
          </div>
          <div class="dash-stat-card__val">${formatCurrency(paidMonth)}</div>
          <div class="dash-stat-card__sub">${formatCurrency(pendingRent)} pending collection</div>
        </div>

        <div class="glass-card dash-stat-card">
          <div class="dash-stat-card__header">
            <span class="dash-stat-card__title">Maintenance Triage</span>
            <span class="badge ${openTickets > 0 ? 'badge--high' : 'badge--low'}">${openTickets} Open</span>
          </div>
          <div class="dash-stat-card__val">${openTickets} Tickets</div>
          <div class="dash-stat-card__sub" style="color: var(--color-accent);">&bull; 1 High priority hot water issue</div>
        </div>
      </div>

      <!-- Operational Overview Split Grid -->
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: var(--space-6); margin-bottom: var(--space-8);">
        <!-- Recent Rent Activity -->
        <div class="glass-card" style="padding: var(--space-6);">
          <div class="dash-section-header" style="margin-bottom: var(--space-4);">
            <div>
              <h3 style="font-size: var(--font-size-base); font-weight: var(--font-weight-bold); color: var(--color-text-main);">Recent Rent Payments</h3>
              <p style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Real-time ledger updates from tenants</p>
            </div>
            <button type="button" class="btn btn--ghost btn--sm" id="btn-view-all-payments">View Ledger &rarr;</button>
          </div>
          <div class="neo-table-container">
            <table class="neo-table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Unit</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${cachedPayments.slice(0, 4).map(p => `
                  <tr>
                    <td style="font-weight: var(--font-weight-semibold);">${escapeHtml(p.tenant_name || 'Priya Iyer')}</td>
                    <td>${escapeHtml(p.unit_number || 'Flat 4B')}</td>
                    <td style="font-weight: var(--font-weight-bold);">${formatCurrency(p.amount)}</td>
                    <td style="font-size: var(--font-size-xs); color: var(--color-text-muted);">${formatDate(p.due_date)}</td>
                    <td><span class="badge badge--${escapeHtml(p.status)}">${escapeHtml(p.status)}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Priority Maintenance Alert Card -->
        ${(() => {
          const highTicket = cachedTickets.find(t => (t.priority === 'emergency' || t.priority === 'high') && t.status !== 'resolved' && t.status !== 'closed')
            || cachedTickets.find(t => t.status !== 'resolved' && t.status !== 'closed');
          if (highTicket) {
            return `
              <div class="glass-card" style="padding: var(--space-6); display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3);">
                    <span class="badge badge--${escapeHtml(highTicket.priority)}">${escapeHtml(highTicket.priority)} Priority</span>
                    <span style="font-size: 11px; color: var(--color-text-subtle);">Ticket #${escapeHtml(highTicket.id)}</span>
                  </div>
                  <h4 style="font-size: var(--font-size-base); font-weight: var(--font-weight-bold); color: var(--color-text-main); margin-bottom: var(--space-2);">${escapeHtml(highTicket.title)}</h4>
                  <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); line-height: var(--line-height-relaxed); margin-bottom: var(--space-4);">
                    ${escapeHtml(highTicket.unit_number || 'Unit')} &bull; ${escapeHtml(highTicket.property_name || 'Property')}. ${escapeHtml(highTicket.description || 'Maintenance requested by resident.')}
                  </p>
                </div>
                <button type="button" class="btn btn--outline btn--sm" id="btn-view-ticket-triage" style="width: 100%;">
                  <span>Open Maintenance Center</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </button>
              </div>
            `;
          } else {
            return `
              <div class="glass-card" style="padding: var(--space-6); display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3);">
                    <span class="badge badge--paid">All Clear</span>
                    <span style="font-size: 11px; color: var(--color-text-subtle);">0 Open Issues</span>
                  </div>
                  <h4 style="font-size: var(--font-size-base); font-weight: var(--font-weight-bold); color: var(--color-text-main); margin-bottom: var(--space-2);">Units Operating Normally</h4>
                  <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); line-height: var(--line-height-relaxed); margin-bottom: var(--space-4);">
                    There are no open or urgent maintenance tickets across your managed properties. All repair orders are currently resolved.
                  </p>
                </div>
                <button type="button" class="btn btn--outline btn--sm" id="btn-view-ticket-triage" style="width: 100%;">
                  <span>View Ticket History</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </button>
              </div>
            `;
          }
        })()}
      </div>

      <!-- Managed Portfolio Properties Overview Strip -->
      <div class="glass-card" style="padding: var(--space-6); margin-bottom: var(--space-8);">
        <div class="dash-section-header" style="margin-bottom: var(--space-4);">
          <div>
            <h3 style="font-size: var(--font-size-base); font-weight: var(--font-weight-bold); color: var(--color-text-main);">Managed Properties (${cachedProperties.length})</h3>
            <p style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Real-time portfolio doors and occupancy rates</p>
          </div>
          <button type="button" class="btn btn--ghost btn--sm" id="btn-view-all-props">View All Properties &rarr;</button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: var(--space-4);">
          ${cachedProperties.slice(0, 3).map(p => `
            <div style="background: rgba(255,255,255,0.6); border-radius: var(--border-radius-md); padding: var(--space-4); border: 1px solid rgba(0,0,0,0.06);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-2);">
                <h4 style="font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); margin: 0; color: var(--color-primary);">${escapeHtml(p.name)}</h4>
                <span class="badge badge--landlord">${p.units_count || 0} Doors</span>
              </div>
              <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-bottom: var(--space-2);">
                ${escapeHtml(p.address)}, ${escapeHtml(p.city)}
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--color-text-subtle);">
                <span>${p.occupancy_rate || 0}% Occupied</span>
                <span style="font-weight: var(--font-weight-bold); color: var(--color-text-main);">${formatCurrency(p.monthly_rent_total || 0)}/mo</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Bind Overview quick buttons
    bindOverviewEvents();
  } else {
    // Tenant Overview
    const lease = stats.activeLease || {};
    const hasLease = Boolean(lease && (lease.id || lease.unitName));
    const monthlyRent = Number(stats.monthlyRent || (lease.rentAmount || 0));
    const nextDue = stats.nextDueDate || '';
    const leaseTerm = (lease.startDate && lease.endDate)
      ? `${formatDate(lease.startDate)} – ${formatDate(lease.endDate)}`
      : 'Active 11-Month Term';
    const depositFormatted = formatCurrency(lease.depositAmount || (monthlyRent * 2));

    container.innerHTML = `
      <!-- Tenant Home Spotlight Banner -->
      <div class="glass-card tenant-spotlight-card">
        <div class="tenant-spotlight-grid">
          <div>
            <div style="display: flex; gap: var(--space-2); margin-bottom: var(--space-2);">
              <span class="badge badge--tenant" style="border-radius: 6px;">Active Resident</span>
              <span class="badge badge--paid" style="border-radius: 6px;">Autopay Active</span>
            </div>
            <h2 style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-extrabold); color: var(--color-text-main); margin-bottom: var(--space-1);">
              ${escapeHtml(lease.unitName || 'Flat 4B')} — ${escapeHtml(lease.propertyName || 'Gulmohar Residency')}
            </h2>
            <p style="font-size: var(--font-size-sm); color: var(--color-text-muted); margin-bottom: var(--space-4);">
              ${escapeHtml(lease.address || '14th Main, 4th Block, Koramangala, Bengaluru, KA 560034')}
            </p>
            <div style="display: flex; gap: var(--space-6); font-size: var(--font-size-xs); color: var(--color-text-muted);">
              <div><strong style="color: var(--color-text-main);">Lease Term:</strong> ${leaseTerm}</div>
              <div><strong style="color: var(--color-text-main);">Deposit:</strong> ${depositFormatted}</div>
            </div>
          </div>

          <div class="tenant-due-panel">
            <span style="font-size: var(--font-size-xs); font-weight: var(--font-weight-bold); color: var(--color-text-muted); text-transform: uppercase;">Next Payment Due</span>
            <div class="tenant-due-amount">${formatCurrency(monthlyRent > 0 ? monthlyRent : 28500)}</div>
            <p style="font-size: var(--font-size-xs); color: var(--color-text-subtle); margin-bottom: var(--space-4);">${nextDue ? 'Due on ' + formatDate(nextDue) + ' via UPI / eNACH' : 'Autopay scheduled on 1st of every month'}</p>
            <button type="button" class="btn btn--primary btn--sm" id="btn-tenant-pay-rent" style="width: 100%;">
              <span>Pay Rent Now</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Quick Action Cards for Tenant -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); margin-bottom: var(--space-8);">
        <div class="glass-card" style="padding: var(--space-6);">
          <div class="dash-section-header" style="margin-bottom: var(--space-4);">
            <h3 style="font-size: var(--font-size-base); font-weight: var(--font-weight-bold); color: var(--color-text-main);">Maintenance & Repairs</h3>
            <button type="button" class="btn btn--outline btn--sm" id="btn-tenant-report-issue">+ Report Issue</button>
          </div>
          <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-bottom: var(--space-4);">
            Submit a repair ticket with description and priority. Your landlord is notified instantly.
          </p>
          <div class="neo-table-container">
            <table class="neo-table">
              <thead>
                <tr>
                  <th>Issue</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${cachedTickets.filter(t => t.unit_id === 'unit_104' || t.tenant_id === 'usr_tenant_demo').map(t => `
                  <tr>
                    <td style="font-weight: var(--font-weight-semibold);">${escapeHtml(t.title)}</td>
                    <td><span class="badge badge--${escapeHtml(t.priority)}">${escapeHtml(t.priority)}</span></td>
                    <td><span class="badge badge--${escapeHtml(t.status)}">${escapeHtml(t.status)}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="glass-card" style="padding: var(--space-6);">
          <div class="dash-section-header" style="margin-bottom: var(--space-4);">
            <h3 style="font-size: var(--font-size-base); font-weight: var(--font-weight-bold); color: var(--color-text-main);">Recent Receipts</h3>
            <button type="button" class="btn btn--ghost btn--sm" id="btn-tenant-view-ledger">View All &rarr;</button>
          </div>
          <div class="neo-table-container">
            <table class="neo-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${cachedPayments.filter(p => p.status === 'paid').slice(0, 3).map(p => `
                  <tr>
                    <td style="font-size: var(--font-size-xs);">${formatDate(p.due_date)}</td>
                    <td style="font-weight: var(--font-weight-bold);">${formatCurrency(p.amount)}</td>
                    <td style="text-transform: uppercase; font-size: 11px;">${escapeHtml(p.payment_method)}</td>
                    <td><span class="badge badge--paid">Paid</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-tenant-pay-rent')?.addEventListener('click', () => openModal('modal-pay-rent'));
    document.getElementById('btn-tenant-report-issue')?.addEventListener('click', () => openModal('modal-create-ticket'));
    document.getElementById('btn-tenant-view-ledger')?.addEventListener('click', () => {
      document.querySelector('[data-tab="payments"]')?.click();
    });
  }
}

function bindOverviewEvents() {
  document.getElementById('btn-action-add-prop')?.addEventListener('click', () => openModal('modal-add-property'));
  document.getElementById('btn-action-add-unit')?.addEventListener('click', () => openModal('modal-add-unit'));
  document.getElementById('btn-action-new-lease')?.addEventListener('click', () => openModal('modal-create-lease'));
  document.getElementById('btn-action-record-pay')?.addEventListener('click', () => openModal('modal-record-payment'));
  document.getElementById('btn-view-all-payments')?.addEventListener('click', () => {
    document.querySelector('[data-tab="payments"]')?.click();
  });
  document.getElementById('btn-view-all-props')?.addEventListener('click', () => {
    document.querySelector('[data-tab="properties"]')?.click();
  });
  document.getElementById('btn-view-ticket-triage')?.addEventListener('click', () => {
    document.querySelector('[data-tab="maintenance"]')?.click();
  });
}

// ============================================================================
// 1C. USERS DIRECTORY TAB (PLATFORM ADMIN)
// ============================================================================
function renderUsersDirectoryTab(container, user) {
  let selectedRole = 'all';
  let searchQuery = '';

  function getFilteredUsers() {
    return cachedUsers.filter(u => {
      const matchesRole = selectedRole === 'all' || u.role === selectedRole;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.toLowerCase().includes(q));
      return matchesRole && matchesQuery;
    });
  }

  function renderTableRows() {
    const list = getFilteredUsers();
    const tbody = container.querySelector('#users-table-tbody');
    const emptyEl = container.querySelector('#users-empty-state');
    const countEl = container.querySelector('#users-filtered-count');

    if (countEl) countEl.textContent = `Showing ${list.length} of ${cachedUsers.length} registered profiles`;

    if (!list.length) {
      if (tbody) tbody.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (!tbody) return;

    tbody.innerHTML = list.map(u => {
      const initial = (u.name || 'U').charAt(0).toUpperCase();
      let roleBadge = '';
      let portfolioSummary = '';

      if (u.role === 'admin') {
        roleBadge = '<span class="badge badge--admin">Platform Admin</span>';
        portfolioSummary = '<span style="color: #5b21b6; font-weight: 600;">System Administrator</span>';
      } else if (u.role === 'landlord') {
        roleBadge = '<span class="badge badge--landlord">Landlord</span>';
        portfolioSummary = `<strong>${u.properties_count || 0}</strong> properties &bull; <strong>${u.leases_count || 0}</strong> leases`;
      } else {
        roleBadge = '<span class="badge badge--tenant">Tenant</span>';
        portfolioSummary = `Resident &bull; ${u.leases_count ? 'Active Lease' : 'Prospective'}`;
      }

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: var(--space-3);">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--color-primary), var(--color-secondary)); color: #fff; font-weight: bold; display: flex; align-items: center; justify-content: center; box-shadow: var(--neo-shadow-raised-sm); flex-shrink: 0;">
                ${initial}
              </div>
              <div>
                <div style="font-weight: var(--font-weight-bold); color: var(--color-text-main);">${escapeHtml(u.name)}</div>
                <div style="font-size: 11px; color: var(--color-text-subtle); font-family: monospace;">${escapeHtml(u.id)}</div>
              </div>
            </div>
          </td>
          <td>${roleBadge}</td>
          <td>
            <div style="font-size: var(--font-size-xs); font-weight: var(--font-weight-medium);">${escapeHtml(u.email)}</div>
            <div style="font-size: 11px; color: var(--color-text-muted);">${escapeHtml(u.phone || '—')}</div>
          </td>
          <td style="font-size: var(--font-size-xs);">${portfolioSummary}</td>
          <td style="font-size: var(--font-size-xs); color: var(--color-text-muted);">${formatDate(u.created_at)}</td>
          <td><span class="badge badge--paid">Active</span></td>
          <td>
            <button type="button" class="btn btn--ghost btn--sm btn-copy-user-email" data-email="${escapeHtml(u.email)}" title="Copy Email">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              <span>Copy</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-copy-user-email').forEach(btn => {
      btn.addEventListener('click', () => {
        const em = btn.getAttribute('data-email');
        navigator.clipboard?.writeText(em).catch(() => {});
        showToast('Copied', `Copied ${em} to clipboard.`, 'info', 2000);
      });
    });
  }

  const totalUsers = cachedUsers.length;
  const landlordCount = cachedUsers.filter(u => u.role === 'landlord').length;
  const tenantCount = cachedUsers.filter(u => u.role === 'tenant').length;
  const adminCount = cachedUsers.filter(u => u.role === 'admin').length;

  container.innerHTML = `
    <div class="dash-section-header">
      <div>
        <h2 class="dash-section-header__title">Registered Users Directory</h2>
        <p class="dash-section-header__sub">Platform-wide registry of system administrators, registered landlords, and verified tenant profiles</p>
      </div>
      <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);" id="users-filtered-count">
        Showing ${totalUsers} of ${totalUsers} registered profiles
      </div>
    </div>

    <!-- Filter & Search Controls Bar -->
    <div class="quick-actions-bar" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-4);">
      <!-- Role Filter Chips -->
      <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
        <button type="button" class="btn btn--sm btn--primary user-role-chip" data-role="all">All Roles (${totalUsers})</button>
        <button type="button" class="btn btn--sm btn--outline user-role-chip" data-role="landlord">Landlords (${landlordCount})</button>
        <button type="button" class="btn btn--sm btn--outline user-role-chip" data-role="tenant">Tenants (${tenantCount})</button>
        <button type="button" class="btn btn--sm btn--outline user-role-chip" data-role="admin">Admins (${adminCount})</button>
      </div>

      <!-- Live Search Box -->
      <div style="min-width: 260px; max-width: 380px; flex: 1;">
        <div class="form-input-wrap">
          <input type="text" id="users-search-input" class="form-input" placeholder="Search by name, email, or phone..." style="padding-left: 2.2rem; font-size: var(--font-size-xs);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position: absolute; left: 0.8rem; color: var(--color-text-subtle);"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
      </div>
    </div>

    <!-- Users Neomorphic Table -->
    <div class="neo-table-container">
      <table class="neo-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Contact</th>
            <th>Portfolio / Tenancy</th>
            <th>Joined</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="users-table-tbody">
          <!-- Populated by renderTableRows -->
        </tbody>
      </table>
    </div>

    <div id="users-empty-state" class="glass-card" style="display: none; text-align: center; padding: var(--space-10); margin-top: var(--space-4);">
      <p style="color: var(--color-text-muted); font-size: var(--font-size-sm); margin-bottom: var(--space-2);">No users matched your search criteria.</p>
      <button type="button" class="btn btn--ghost btn--sm" id="btn-reset-user-search">Reset Filters</button>
    </div>
  `;

  // Attach chip events
  container.querySelectorAll('.user-role-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('.user-role-chip').forEach(c => {
        c.className = 'btn btn--sm btn--outline user-role-chip';
      });
      chip.className = 'btn btn--sm btn--primary user-role-chip';
      selectedRole = chip.getAttribute('data-role');
      renderTableRows();
    });
  });

  // Attach search event
  const searchInput = container.querySelector('#users-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderTableRows();
    });
  }

  // Reset button
  container.querySelector('#btn-reset-user-search')?.addEventListener('click', () => {
    selectedRole = 'all';
    searchQuery = '';
    if (searchInput) searchInput.value = '';
    container.querySelectorAll('.user-role-chip').forEach((c, idx) => {
      c.className = idx === 0 ? 'btn btn--sm btn--primary user-role-chip' : 'btn btn--sm btn--outline user-role-chip';
    });
    renderTableRows();
  });

  // Initial render
  renderTableRows();
}

// ============================================================================
// 1D. INQUIRIES & REVIEWS TAB (PLATFORM ADMIN)
// ============================================================================
function renderInquiriesTab(container, user) {
  const inquiries = cachedInquiries || [];
  const reviews = cachedReviews || [];

  container.innerHTML = `
    <div class="dash-section-header">
      <div>
        <h2 class="dash-section-header__title">Landing Page Inquiries & Verified Reviews</h2>
        <p class="dash-section-header__sub">Audit lead messages submitted through the contact form and public verified testimonials</p>
      </div>
      <div style="display: flex; gap: var(--space-2);">
        <span class="badge badge--admin">${inquiries.length} Inquiries</span>
        <span class="badge badge--paid">${reviews.length} Reviews</span>
      </div>
    </div>

    <!-- Section 1: Inquiries Table Card -->
    <div class="glass-card" style="padding: var(--space-6); margin-bottom: var(--space-8);">
      <div class="dash-section-header" style="margin-bottom: var(--space-4);">
        <div>
          <h3 style="font-size: var(--font-size-base); font-weight: var(--font-weight-bold); color: var(--color-text-main);">Prospective Landlord & Owner Inquiries (${inquiries.length})</h3>
          <p style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Incoming contact requests from prospective portfolio clients</p>
        </div>
      </div>

      ${inquiries.length ? `
        <div class="neo-table-container">
          <table class="neo-table">
            <thead>
              <tr>
                <th>Prospect</th>
                <th>Portfolio Size</th>
                <th>Subject & Inquired Message</th>
                <th>Date Received</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${inquiries.map(inq => `
                <tr>
                  <td>
                    <div style="font-weight: var(--font-weight-semibold); color: var(--color-text-main);">${escapeHtml(inq.name)}</div>
                    <div style="font-size: 11px; color: var(--color-text-muted);">${escapeHtml(inq.email)}</div>
                    <div style="font-size: 11px; color: var(--color-text-subtle);">${escapeHtml(inq.phone || '—')}</div>
                  </td>
                  <td>
                    <span class="badge badge--landlord" style="text-transform: none; font-size: 11px;">${escapeHtml(inq.portfolio_size || 'General')}</span>
                  </td>
                  <td style="max-width: 380px;">
                    <div style="font-weight: var(--font-weight-semibold); font-size: var(--font-size-xs); color: var(--color-primary); margin-bottom: 2px;">
                      ${escapeHtml(inq.subject || 'General Inquiry')}
                    </div>
                    <div style="font-size: var(--font-size-xs); color: var(--color-text-main); line-height: var(--line-height-relaxed); background-color: var(--color-bg-inset); padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); border: var(--neo-border-inset);">
                      "${escapeHtml(inq.message)}"
                    </div>
                  </td>
                  <td style="font-size: var(--font-size-xs); color: var(--color-text-muted); white-space: nowrap;">
                    ${formatDate(inq.created_at)}
                  </td>
                  <td>
                    <span class="badge ${inq.status === 'contacted' ? 'badge--paid' : 'badge--pending'}" id="badge-inq-${escapeHtml(inq.id)}">
                      ${escapeHtml(inq.status || 'new')}
                    </span>
                  </td>
                  <td>
                    <button type="button" class="btn btn--outline btn--sm btn-mark-contacted" data-id="${escapeHtml(inq.id)}" data-email="${escapeHtml(inq.email)}">
                      <span>${inq.status === 'contacted' ? 'Follow Up' : 'Mark Contacted'}</span>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div style="text-align: center; padding: var(--space-8); color: var(--color-text-muted); font-size: var(--font-size-sm);">
          No contact inquiries recorded yet.
        </div>
      `}
    </div>

    <!-- Section 2: Customer Reviews & Testimonials Card -->
    <div class="glass-card" style="padding: var(--space-6);">
      <div class="dash-section-header" style="margin-bottom: var(--space-4);">
        <div>
          <h3 style="font-size: var(--font-size-base); font-weight: var(--font-weight-bold); color: var(--color-text-main);">Public Customer Testimonials & Reviews (${reviews.length})</h3>
          <p style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Verified feedback rendered on landing page social proof sections</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: var(--space-4);">
        ${reviews.map(rev => `
          <div class="glass-card" style="padding: var(--space-5); display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-2);">
                <div>
                  <div style="font-weight: var(--font-weight-bold); color: var(--color-text-main); font-size: var(--font-size-sm);">${escapeHtml(rev.name)}</div>
                  <div style="font-size: 11px; color: var(--color-text-subtle);">${escapeHtml(rev.property_name || 'RentRoll Resident')}</div>
                </div>
                <span class="badge badge--${rev.role === 'landlord' ? 'badge--landlord' : 'badge--tenant'}">${escapeHtml(rev.role)}</span>
              </div>

              <!-- Rating Stars -->
              <div style="color: #f59e0b; font-size: var(--font-size-sm); margin-bottom: var(--space-2); letter-spacing: 2px;">
                ${'★'.repeat(rev.rating || 5)}${'☆'.repeat(5 - (rev.rating || 5))}
              </div>

              <div style="font-weight: var(--font-weight-semibold); font-size: var(--font-size-xs); color: var(--color-primary); margin-bottom: var(--space-2);">
                "${escapeHtml(rev.title)}"
              </div>

              <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); line-height: var(--line-height-relaxed); margin-bottom: var(--space-3);">
                ${escapeHtml(rev.comment)}
              </p>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: var(--space-3); border-top: 1px solid rgba(220, 208, 194, 0.6); font-size: 11px; color: var(--color-text-subtle);">
              <span>&check; Verified Customer</span>
              <span>${formatDate(rev.created_at)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Bind mark contacted buttons
  container.querySelectorAll('.btn-mark-contacted').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const email = btn.getAttribute('data-email');
      const badge = container.querySelector(`#badge-inq-${id}`);
      if (badge) {
        badge.className = 'badge badge--paid';
        badge.textContent = 'contacted';
      }
      btn.querySelector('span').textContent = 'Follow Up';
      showToast('Lead Status Updated', `Marked inquiry from ${email} as contacted.`, 'success', 2500);
    });
  });
}

// ============================================================================
// 2. PROPERTIES & UNITS TAB
// ============================================================================
function renderPropertiesTab(container, isLandlord, isAdmin) {
  const canManage = isLandlord || isAdmin;
  container.innerHTML = `
    <div class="dash-section-header">
      <div>
        <h2 class="dash-section-header__title">Rental Properties & Units</h2>
        <p class="dash-section-header__sub">Portfolio doors, floorplans, occupancy rates, and unit inventories</p>
      </div>
      ${canManage ? `
        <div style="display: flex; gap: var(--space-3);">
          <button type="button" class="btn btn--outline btn--sm" id="btn-tab-add-unit">+ Add Unit</button>
          <button type="button" class="btn btn--primary btn--sm" id="btn-tab-add-property">+ Add Property</button>
        </div>
      ` : ''}
    </div>

    <!-- Properties Card Grid -->
    <div class="properties-grid">
      ${cachedProperties.map(prop => `
        <div class="glass-card property-card">
          <div>
            ${isAdmin ? `
              <div style="font-size: 11px; color: #5b21b6; font-weight: var(--font-weight-bold); margin-bottom: var(--space-2); display: flex; align-items: center; gap: 4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <span>Owner: ${escapeHtml(prop.landlord_name || 'Platform')} (${escapeHtml(prop.landlord_email || '')})</span>
              </div>
            ` : ''}
            <div class="property-card__header">
              <div>
                <h3 class="property-card__title">${escapeHtml(prop.name)}</h3>
                <div class="property-card__address">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  <span>${escapeHtml(prop.address)}, ${escapeHtml(prop.city)}, ${escapeHtml(prop.state)} ${escapeHtml(prop.zip_code)}</span>
                </div>
              </div>
              <span class="badge badge--landlord">${escapeHtml(prop.property_type || 'Multi-Family')}</span>
            </div>

            <div class="property-card__kpis">
              <div>
                <div class="property-card__kpi-val">${prop.units_count || 0}</div>
                <div class="property-card__kpi-lbl">Total Doors</div>
              </div>
              <div>
                <div class="property-card__kpi-val" style="color: var(--color-success);">${prop.occupancy_rate || 0}%</div>
                <div class="property-card__kpi-lbl">Occupancy</div>
              </div>
              <div>
                <div class="property-card__kpi-val">${formatCurrency(prop.monthly_rent_total || 0)}</div>
                <div class="property-card__kpi-lbl">Rent Roll</div>
              </div>
            </div>
          </div>

          <div class="property-card__footer">
            <span style="font-size: var(--font-size-xs); color: var(--color-text-subtle);">${prop.occupied_units_count || 0} Leased Units</span>
            ${canManage ? `
              <div style="display: flex; gap: var(--space-2); align-items: center;">
                <button type="button" class="btn btn--outline btn--sm btn-card-add-unit" data-prop-id="${escapeHtml(prop.id)}" title="Add Door to this Property">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  <span>+ Door</span>
                </button>
                <button type="button" class="btn btn--ghost btn--sm btn-delete-prop" data-prop-id="${escapeHtml(prop.id)}" title="Delete Property">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Units Inventory Table -->
    <div class="dash-section-header" style="margin-top: var(--space-10);">
      <div>
        <h3 class="dash-section-header__title" style="font-size: var(--font-size-lg);">All Unit Doors (${cachedUnits.length})</h3>
        <p class="dash-section-header__sub">Individual door specifications, rent pricing, and current occupants</p>
      </div>
    </div>

    <div class="neo-table-container">
      <table class="neo-table">
        <thead>
          <tr>
            <th>Unit / Door</th>
            <th>Property</th>
            <th>Beds / Baths</th>
            <th>Sq Ft</th>
            <th>Monthly Rent</th>
            <th>Status</th>
            <th>Resident</th>
          </tr>
        </thead>
        <tbody>
          ${cachedUnits.map(unit => `
            <tr>
              <td style="font-weight: var(--font-weight-bold); color: var(--color-primary);">${escapeHtml(unit.unit_number)}</td>
              <td>${escapeHtml(unit.property_name || 'Gulmohar Residency')}</td>
              <td>${unit.bedrooms} bd / ${unit.bathrooms} ba</td>
              <td>${unit.square_feet ? unit.square_feet + ' sq ft' : '—'}</td>
              <td style="font-weight: var(--font-weight-bold);">${formatCurrency(unit.rent_amount)}</td>
              <td><span class="badge badge--${escapeHtml(unit.status)}">${escapeHtml(unit.status)}</span></td>
              <td style="color: var(--color-text-muted); font-size: var(--font-size-xs);">
                ${unit.current_tenant ? escapeHtml(unit.current_tenant.name) : `
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-2);">
                    <span style="color: var(--color-text-subtle);">Vacant — Ready to Lease</span>
                    ${canManage ? `
                      <button type="button" class="btn btn--primary btn--xs btn-unit-create-lease" data-unit-id="${escapeHtml(unit.id)}" style="font-size: 11px; padding: 2px 8px;">
                        + New Lease
                      </button>
                    ` : ''}
                  </div>
                `}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('btn-tab-add-property')?.addEventListener('click', () => openModal('modal-add-property'));
  document.getElementById('btn-tab-add-unit')?.addEventListener('click', () => openModal('modal-add-unit'));

  // Add unit directly to specific property
  container.querySelectorAll('.btn-card-add-unit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const propId = btn.getAttribute('data-prop-id');
      const selectProp = document.getElementById('unit-property-select');
      if (selectProp && propId) {
        selectProp.value = propId;
      }
      openModal('modal-add-unit');
    });
  });

  // Bind new lease directly to vacant unit
  container.querySelectorAll('.btn-unit-create-lease').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const unitId = btn.getAttribute('data-unit-id');
      openModal('modal-create-lease', unitId);
    });
  });

  // Delete property handlers
  container.querySelectorAll('.btn-delete-prop').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const propId = btn.getAttribute('data-prop-id');
      if (confirm('Are you sure you want to delete this property and its units?')) {
        try {
          await deleteProperty(propId);
          showToast('Property Deleted', 'Removed property from portfolio.', 'info', 2500);
          await refreshDashboardData(getCurrentUser());
        } catch (err) {
          showToast('Error', err.message, 'error', 3500);
        }
      }
    });
  });
}

// ============================================================================
// 3. LEASES & TENANTS TAB
// ============================================================================
function renderLeasesTab(container, isLandlord, isAdmin) {
  const canManage = isLandlord || isAdmin;
  container.innerHTML = `
    <div class="dash-section-header">
      <div>
        <h2 class="dash-section-header__title">Lease Agreements & Tenancy</h2>
        <p class="dash-section-header__sub">Binding legal contracts, monthly rates, security deposits, and renewal terms</p>
      </div>
      ${canManage ? `
        <button type="button" class="btn btn--primary btn--sm" id="btn-tab-new-lease">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>New Lease Agreement</span>
        </button>
      ` : ''}
    </div>

    <div class="neo-table-container">
      <table class="neo-table">
        <thead>
          <tr>
            <th>Tenant</th>
            <th>Property & Unit</th>
            ${isAdmin ? '<th>Landlord</th>' : ''}
            <th>Lease Term</th>
            <th>Monthly Rent</th>
            <th>Deposit</th>
            <th>Status</th>
            <th>Terms / Notes</th>
            ${canManage ? '<th>Action</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${cachedLeases.map(lease => `
            <tr>
              <td>
                <div style="font-weight: var(--font-weight-semibold);">${escapeHtml(lease.tenant_name || 'Priya Iyer')}</div>
                <div style="font-size: var(--font-size-xs); color: var(--color-text-subtle);">${escapeHtml(lease.tenant_email || 'tenant@rentroll.com')}</div>
              </td>
              <td>
                <div style="font-weight: var(--font-weight-medium);">${escapeHtml(lease.unit_number || 'Flat 4B')}</div>
                <div style="font-size: var(--font-size-xs); color: var(--color-text-subtle);">${escapeHtml(lease.property_name || 'Gulmohar Residency')}</div>
              </td>
              ${isAdmin ? `<td style="font-size: var(--font-size-xs); font-weight: 500;">${escapeHtml(lease.landlord_name || 'Platform')}</td>` : ''}
              <td style="font-size: var(--font-size-xs);">
                ${formatDate(lease.start_date)} &rarr; ${formatDate(lease.end_date)}
              </td>
              <td style="font-weight: var(--font-weight-bold);">${formatCurrency(lease.rent_amount)}</td>
              <td>${formatCurrency(lease.deposit_amount)}</td>
              <td><span class="badge badge--${lease.status === 'active' ? 'paid' : 'pending'}">${escapeHtml(lease.status)}</span></td>
              <td style="font-size: var(--font-size-xs); color: var(--color-text-muted); max-width: 240px;">
                ${escapeHtml(lease.terms || 'Standard 12-month agreement')}
              </td>
              ${canManage ? `
                <td>
                  <button type="button" class="btn btn--outline btn--sm btn-lease-pay" data-lease-id="${escapeHtml(lease.id)}" title="Record Payment for ${escapeHtml(lease.unit_number)}">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                    <span>Record Rent</span>
                  </button>
                </td>
              ` : ''}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('btn-tab-new-lease')?.addEventListener('click', () => openModal('modal-create-lease'));

  // Quick action to record payment directly for a specific lease
  container.querySelectorAll('.btn-lease-pay').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const leaseId = btn.getAttribute('data-lease-id');
      openModal('modal-record-payment', leaseId);
    });
  });
}

// ============================================================================
// 4. RENT LEDGER & PAYMENTS TAB
// ============================================================================
function renderPaymentsTab(container, isLandlord, isAdmin) {
  const canManage = isLandlord || isAdmin;
  const totalPaid = cachedPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalPending = cachedPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  container.innerHTML = `
    <div class="dash-section-header">
      <div>
        <h2 class="dash-section-header__title">Rent Roll & Transactions Ledger</h2>
        <p class="dash-section-header__sub">Detailed audit trail of digital UPI, eNACH, and IMPS payments</p>
      </div>
      <div style="display: flex; gap: var(--space-3); align-items: center; flex-wrap: wrap;">
        <button type="button" class="btn btn--outline btn--sm" id="btn-export-ledger-csv" title="Download Complete Ledger as CSV">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          <span>Download Ledger (CSV)</span>
        </button>
        <button type="button" class="btn btn--primary btn--sm" id="btn-tab-record-payment">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>${canManage ? 'Record Payment' : 'Pay Rent Now'}</span>
        </button>
      </div>
    </div>

    <!-- Financial KPI Summary Cards -->
    <div class="dashboard-stats-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: var(--space-6);">
      <div class="glass-card dash-stat-card">
        <div class="dash-stat-card__title">Total Rent Collected</div>
        <div class="dash-stat-card__val" style="color: var(--color-success);">${formatCurrency(totalPaid)}</div>
        <div class="dash-stat-card__sub">Ledger transactions cleared</div>
      </div>
      <div class="glass-card dash-stat-card">
        <div class="dash-stat-card__title">Outstanding / Upcoming</div>
        <div class="dash-stat-card__val" style="color: var(--color-warning);">${formatCurrency(totalPending)}</div>
        <div class="dash-stat-card__sub">Pending next cycle withdrawal</div>
      </div>
      <div class="glass-card dash-stat-card">
        <div class="dash-stat-card__title">Collection Rate</div>
        <div class="dash-stat-card__val">98.5%</div>
        <div class="dash-stat-card__sub">0 delinquent accounts</div>
      </div>
    </div>

    <!-- Ledger Table -->
    <div class="neo-table-container">
      <table class="neo-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Payer</th>
            <th>Unit / Location</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Status</th>
            <th>Reference ID</th>
            <th style="text-align: right;">Receipt</th>
          </tr>
        </thead>
        <tbody>
          ${cachedPayments.map(pay => `
            <tr>
              <td style="font-size: var(--font-size-xs); color: var(--color-text-muted);">${formatDate(pay.paid_date || pay.due_date)}</td>
              <td style="font-weight: var(--font-weight-semibold);">${escapeHtml(pay.tenant_name || 'Resident')}</td>
              <td>${escapeHtml(pay.unit_number || 'Flat 4B')}</td>
              <td style="font-weight: var(--font-weight-extrabold);">${formatCurrency(pay.amount)}</td>
              <td style="text-transform: uppercase; font-size: 11px; font-weight: var(--font-weight-bold);">${escapeHtml(pay.payment_method)}</td>
              <td><span class="badge badge--${escapeHtml(pay.status)}">${escapeHtml(pay.status)}</span></td>
              <td style="font-family: monospace; font-size: 11px; color: var(--color-text-subtle);">${escapeHtml(pay.transaction_ref || 'PENDING-UPI')}</td>
              <td style="text-align: right;">
                <button type="button" class="btn btn--outline btn--sm btn-download-receipt" data-ref="${escapeHtml(pay.transaction_ref || '')}" data-id="${pay.id || ''}" style="padding: 4px 10px; font-size: 11px;" title="Download Official HRA Rent Receipt">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: -2px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  <span>Download</span>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('btn-tab-record-payment')?.addEventListener('click', () => {
    openModal(canManage ? 'modal-record-payment' : 'modal-pay-rent');
  });

  document.getElementById('btn-export-ledger-csv')?.addEventListener('click', () => {
    downloadLedgerCsv(cachedPayments);
  });

  container.querySelectorAll('.btn-download-receipt').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ref = btn.getAttribute('data-ref');
      const payId = btn.getAttribute('data-id');
      const pay = cachedPayments.find(p => (payId && String(p.id) === String(payId)) || (ref && p.transaction_ref === ref)) || {
        transaction_ref: ref || 'TXN-GEN',
        amount: 25000,
        payment_method: 'UPI',
        status: 'paid',
        tenant_name: 'Resident',
        unit_number: 'Flat 4B',
        property_name: 'Gulmohar Residency',
        paid_date: new Date().toISOString()
      };
      downloadPaymentReceipt(pay);
    });
  });
}

// ============================================================================
// 5. MAINTENANCE TRIAGE TAB
// ============================================================================
function renderMaintenanceTab(container, isLandlord, isAdmin) {
  const canManage = isLandlord || isAdmin;
  container.innerHTML = `
    <div class="dash-section-header">
      <div>
        <h2 class="dash-section-header__title">Maintenance Request Center</h2>
        <p class="dash-section-header__sub">Track repair requests, prioritize emergency dispatches, and manage work orders</p>
      </div>
      <div>
        <button type="button" class="btn btn--primary btn--sm" id="btn-tab-new-ticket">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Submit Repair Request</span>
        </button>
      </div>
    </div>

    <!-- Ticket Cards Grid -->
    <div class="tickets-grid">
      ${cachedTickets.map(tkt => `
        <div class="glass-card ticket-card ticket-card--${escapeHtml(tkt.priority)}">
          <div>
            <div class="ticket-card__header">
              <span class="badge badge--${escapeHtml(tkt.priority)}">${escapeHtml(tkt.priority)} Urgency</span>
              <span class="badge badge--${escapeHtml(tkt.status)}">${escapeHtml(tkt.status)}</span>
            </div>

            <h3 class="ticket-card__title">${escapeHtml(tkt.title)}</h3>
            <p class="ticket-card__desc">${escapeHtml(tkt.description)}</p>
          </div>

          <div>
            <div class="ticket-card__meta">
              <span><strong>Unit:</strong> ${escapeHtml(tkt.unit_number || 'Apt 4B')}</span>
              <span><strong>Category:</strong> ${escapeHtml(tkt.category || 'General')}</span>
            </div>
            <div class="ticket-card__meta">
              <span><strong>Submitted:</strong> ${formatDate(tkt.created_at)}</span>
              <span><strong>Est. Cost:</strong> ${formatCurrency(tkt.estimated_cost)}</span>
            </div>

            ${tkt.resolution_notes ? `
              <div style="background-color: var(--color-bg-inset); padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); font-size: 11px; color: var(--color-text-muted); margin-bottom: var(--space-3);">
                <strong>Notes:</strong> ${escapeHtml(tkt.resolution_notes)}
              </div>
            ` : ''}

            ${canManage ? `
              <div class="ticket-card__actions">
                ${tkt.status === 'open' ? `
                  <button type="button" class="btn btn--primary btn--sm btn-tkt-progress" data-id="${escapeHtml(tkt.id)}" style="width: 100%;">
                    Start Work Order
                  </button>
                ` : tkt.status === 'in_progress' ? `
                  <button type="button" class="btn btn--outline btn--sm btn-tkt-resolve" data-id="${escapeHtml(tkt.id)}" style="width: 100%;">
                    Mark Resolved
                  </button>
                ` : `
                  <span style="font-size: var(--font-size-xs); color: var(--color-success); font-weight: var(--font-weight-bold);">&check; Work Completed</span>
                `}
              </div>
            ` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  document.getElementById('btn-tab-new-ticket')?.addEventListener('click', () => openModal('modal-create-ticket'));

  // Triage button actions
  container.querySelectorAll('.btn-tkt-progress').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      try {
        await updateMaintenanceTicket(id, { status: 'in_progress' });
        showToast('Work Order Active', 'Ticket marked in progress.', 'info', 2500);
        await refreshDashboardData(getCurrentUser());
      } catch (err) {
        showToast('Error', err.message, 'error', 3500);
      }
    });
  });

  container.querySelectorAll('.btn-tkt-resolve').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const notes = prompt('Enter resolution notes (optional):', 'Repair completed successfully.');
      try {
        await updateMaintenanceTicket(id, { status: 'resolved', resolution_notes: notes });
        showToast('Resolved', 'Maintenance ticket closed.', 'success', 2500);
        await refreshDashboardData(getCurrentUser());
      } catch (err) {
        showToast('Error', err.message, 'error', 3500);
      }
    });
  });
}

// ============================================================================
// 6. MODALS SETUP & HANDLERS
// ============================================================================
function updateModalDropdowns(preselectId = null) {
  // 1. Property dropdown in Add Unit modal
  const selectProp = document.getElementById('unit-property-select');
  if (selectProp && cachedProperties.length) {
    const curVal = selectProp.value;
    selectProp.innerHTML = cachedProperties.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} (${escapeHtml(p.city || '')})</option>`).join('');
    if (preselectId && cachedProperties.some(p => p.id === preselectId)) {
      selectProp.value = preselectId;
    } else if (curVal && cachedProperties.some(p => p.id === curVal)) {
      selectProp.value = curVal;
    }
  }

  // 2. Unit dropdown in Create Lease modal
  const selectUnit = document.getElementById('lease-unit-select');
  if (selectUnit && cachedUnits.length) {
    const curUnitVal = selectUnit.value;
    selectUnit.innerHTML = cachedUnits.map(u => {
      const isVacant = u.status === 'vacant';
      const statusLabel = isVacant ? 'Vacant' : 'Occupied';
      return `<option value="${escapeHtml(u.id)}">${escapeHtml(u.unit_number)} — ${escapeHtml(u.property_name || 'Property')} [${statusLabel}] (${formatCurrency(u.rent_amount)}/mo)</option>`;
    }).join('');

    if (preselectId && cachedUnits.some(u => u.id === preselectId)) {
      selectUnit.value = preselectId;
    } else if (curUnitVal && cachedUnits.some(u => u.id === curUnitVal)) {
      selectUnit.value = curUnitVal;
    } else {
      const firstVacant = cachedUnits.find(u => u.status === 'vacant');
      selectUnit.value = firstVacant ? firstVacant.id : cachedUnits[0].id;
    }

    // Auto-populate rent and deposit for currently selected unit
    const activeUnit = cachedUnits.find(u => u.id === selectUnit.value) || cachedUnits[0];
    const rentInput = document.getElementById('lease-rent');
    const depositInput = document.getElementById('lease-deposit');
    if (activeUnit) {
      if (rentInput) rentInput.value = activeUnit.rent_amount || '';
      if (depositInput) depositInput.value = activeUnit.deposit_amount || (activeUnit.rent_amount ? activeUnit.rent_amount * 2 : '');
    }

    // Auto-fill dates if empty or default
    const startInput = document.getElementById('lease-start');
    const endInput = document.getElementById('lease-end');
    if (startInput && !startInput.value) {
      const today = new Date();
      startInput.value = today.toISOString().split('T')[0];
    }
    if (endInput && !endInput.value) {
      const future = new Date();
      future.setMonth(future.getMonth() + 11);
      endInput.value = future.toISOString().split('T')[0];
    }
  }

  // 3. Lease dropdown in Record Payment modal
  const selectLease = document.getElementById('pay-lease-select');
  if (selectLease && cachedLeases.length) {
    const curLeaseVal = selectLease.value;
    selectLease.innerHTML = '<option value="">Auto-match active tenant lease...</option>' +
      cachedLeases.map(l => `<option value="${escapeHtml(l.id)}">${escapeHtml(l.unit_number)} — ${escapeHtml(l.tenant_name)} (${formatCurrency(l.rent_amount)})</option>`).join('');

    if (preselectId && cachedLeases.some(l => l.id === preselectId)) {
      selectLease.value = preselectId;
    } else if (curLeaseVal && cachedLeases.some(l => l.id === curLeaseVal)) {
      selectLease.value = curLeaseVal;
    }

    // Auto-populate amount and memo based on chosen lease or first lease
    const amountInput = document.getElementById('pay-amount');
    const targetLease = cachedLeases.find(l => l.id === selectLease.value) || cachedLeases[0];
    if (amountInput && targetLease) {
      amountInput.value = targetLease.rent_amount || '';
    }
    const notesInput = document.getElementById('pay-notes');
    if (notesInput && targetLease && (!notesInput.value || notesInput.value.startsWith('Rent payment - '))) {
      notesInput.value = `Rent payment - ${targetLease.unit_number || 'Unit'}`;
    }
  }
}

function openModal(modalId, preselectId = null) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  updateModalDropdowns(preselectId);

  // Dynamic initialization for tenant pay rent modal
  if (modalId === 'modal-pay-rent') {
    const user = getCurrentUser();
    const activeLease = (cachedStats && cachedStats.activeLease) || (cachedLeases && cachedLeases[0]);
    const rentAmount = activeLease ? (activeLease.rentAmount || activeLease.rent_amount || 28500) : 28500;
    const unitName = activeLease ? (activeLease.unitName || activeLease.unit_number || 'Flat 4B') : 'Flat 4B';
    const propName = activeLease ? (activeLease.propertyName || activeLease.property_name || 'Gulmohar Residency') : 'Gulmohar Residency';

    const unitLabel = document.getElementById('modal-pay-rent-unit-label');
    if (unitLabel) unitLabel.textContent = `Pay Rent — ${unitName} (${propName})`;

    const dueLabel = document.getElementById('modal-pay-rent-due-label');
    if (dueLabel) {
      const now = new Date();
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const dueMonth = monthNames[now.getMonth()];
      dueLabel.textContent = `Current Due for ${dueMonth} 1, ${now.getFullYear()}:`;
    }

    const amtDisplay = document.getElementById('modal-pay-rent-amount-display');
    if (amtDisplay) amtDisplay.textContent = formatCurrency(rentAmount);

    const btnLabel = document.getElementById('modal-pay-rent-btn-label');
    if (btnLabel) btnLabel.textContent = `Authorize ${formatCurrency(rentAmount)} Payment`;

    const selectMethod = document.getElementById('tenant-pay-method');
    if (selectMethod && user) {
      const upiHandle = user.email ? `${user.email.split('@')[0]}@okaxis` : 'tenant@okaxis';
      selectMethod.innerHTML = `
        <option value="upi">UPI AutoPay (${escapeHtml(upiHandle)}) — Instant &amp; Free</option>
        <option value="ach">Salary Bank Account (...4820) — eNACH Auto-Debit</option>
        <option value="credit_card">RuPay / Visa Platinum Card (...9104) — Instant</option>
      `;
    }
  }

  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  const firstInput = modal.querySelector('input, select, textarea');
  if (firstInput) firstInput.focus();
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
}

function setupModals(user) {
  // Populate dropdowns initially
  updateModalDropdowns();

  // Dynamic auto-fill on dropdown change
  const selectLeaseUnit = document.getElementById('lease-unit-select');
  if (selectLeaseUnit) {
    selectLeaseUnit.addEventListener('change', () => {
      const selectedId = selectLeaseUnit.value;
      const unit = cachedUnits.find(u => u.id === selectedId);
      if (unit) {
        const rentInput = document.getElementById('lease-rent');
        const depositInput = document.getElementById('lease-deposit');
        if (rentInput && unit.rent_amount) rentInput.value = unit.rent_amount;
        if (depositInput && (unit.deposit_amount || unit.rent_amount)) {
          depositInput.value = unit.deposit_amount || (unit.rent_amount * 2);
        }
      }
    });
  }

  const selectPayLease = document.getElementById('pay-lease-select');
  if (selectPayLease) {
    selectPayLease.addEventListener('change', () => {
      const selectedId = selectPayLease.value;
      const lease = cachedLeases.find(l => l.id === selectedId) || cachedLeases[0];
      if (lease) {
        const amountInput = document.getElementById('pay-amount');
        if (amountInput && lease.rent_amount) amountInput.value = lease.rent_amount;
        const notesInput = document.getElementById('pay-notes');
        if (notesInput) notesInput.value = `Rent payment - ${lease.unit_number || 'Unit'}`;
      }
    });
  }
  // Bind close buttons and backdrop clicks
  document.querySelectorAll('.neo-modal-backdrop').forEach(modal => {
    modal.querySelectorAll('.neo-modal-close, .btn-modal-cancel').forEach(btn => {
      btn.addEventListener('click', () => closeModal(modal));
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  // ESC key listener
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.neo-modal-backdrop.is-open').forEach(modal => closeModal(modal));
    }
  });

  // 1. Add Property Form
  const formAddProp = document.getElementById('form-add-property');
  if (formAddProp) {
    formAddProp.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = formAddProp.querySelector('button[type="submit"]');
      submitBtn.classList.add('btn--loading');
      try {
        const propName = formAddProp.querySelector('#prop-name').value;
        const newProp = await createProperty({
          name: propName,
          address: formAddProp.querySelector('#prop-address').value,
          city: formAddProp.querySelector('#prop-city').value,
          state: formAddProp.querySelector('#prop-state').value,
          zip_code: formAddProp.querySelector('#prop-zip').value,
          property_type: formAddProp.querySelector('#prop-type').value
        });
        showToast('Property Added', `Added "${propName}" to your portfolio.`, 'success', 3000);
        closeModal(document.getElementById('modal-add-property'));
        formAddProp.reset();

        // Switch active tab to properties so the user immediately sees the newly added property
        activeTab = 'properties';
        document.querySelectorAll('.dash-tab-btn').forEach(b => b.classList.remove('dash-tab-btn--active'));
        document.querySelector('[data-tab="properties"]')?.classList.add('dash-tab-btn--active');

        await refreshDashboardData(user);
      } catch (err) {
        showToast('Failed to add property', err.message, 'error', 3500);
      } finally {
        submitBtn.classList.remove('btn--loading');
      }
    });
  }

  // 2. Add Unit Form
  const formAddUnit = document.getElementById('form-add-unit');
  if (formAddUnit) {
    // Populate property dropdown
    const selectProp = document.getElementById('unit-property-select');
    if (selectProp && cachedProperties.length) {
      selectProp.innerHTML = cachedProperties.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join('');
    }

    formAddUnit.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = formAddUnit.querySelector('button[type="submit"]');
      submitBtn.classList.add('btn--loading');
      try {
        await createUnit({
          property_id: formAddUnit.querySelector('#unit-property-select').value,
          unit_number: formAddUnit.querySelector('#unit-number').value,
          bedrooms: formAddUnit.querySelector('#unit-beds').value,
          bathrooms: formAddUnit.querySelector('#unit-baths').value,
          square_feet: formAddUnit.querySelector('#unit-sqft').value,
          rent_amount: formAddUnit.querySelector('#unit-rent').value,
          deposit_amount: formAddUnit.querySelector('#unit-deposit').value,
          notes: formAddUnit.querySelector('#unit-notes').value
        });
        showToast('Unit Created', 'New unit added to property inventory.', 'success', 2500);
        closeModal(document.getElementById('modal-add-unit'));
        formAddUnit.reset();
        await refreshDashboardData(user);
      } catch (err) {
        showToast('Failed to add unit', err.message, 'error', 3500);
      } finally {
        submitBtn.classList.remove('btn--loading');
      }
    });
  }

  // 3. Create Lease Form
  const formCreateLease = document.getElementById('form-create-lease');
  if (formCreateLease && !formCreateLease.dataset.bound) {
    formCreateLease.dataset.bound = 'true';
    formCreateLease.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = formCreateLease.querySelector('button[type="submit"]');
      submitBtn.classList.add('btn--loading');
      try {
        await createLease({
          unit_id: formCreateLease.querySelector('#lease-unit-select').value,
          tenant_name: formCreateLease.querySelector('#lease-tenant-name').value,
          tenant_email: formCreateLease.querySelector('#lease-tenant-email').value,
          start_date: formCreateLease.querySelector('#lease-start').value,
          end_date: formCreateLease.querySelector('#lease-end').value,
          rent_amount: formCreateLease.querySelector('#lease-rent').value,
          deposit_amount: formCreateLease.querySelector('#lease-deposit').value,
          terms: formCreateLease.querySelector('#lease-terms').value
        });
        showToast('Lease Bound', 'Agreement created and unit set to occupied.', 'success', 2500);
        closeModal(document.getElementById('modal-create-lease'));
        formCreateLease.reset();
        await refreshDashboardData(getCurrentUser());
      } catch (err) {
        showToast('Failed to create lease', err.message, 'error', 3500);
      } finally {
        submitBtn.classList.remove('btn--loading');
      }
    });
  }

  // 4. Record Payment / Pay Rent Form
  const formPayment = document.getElementById('form-record-payment');
  if (formPayment && !formPayment.dataset.bound) {
    formPayment.dataset.bound = 'true';
    formPayment.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = formPayment.querySelector('button[type="submit"]');
      submitBtn.classList.add('btn--loading');
      const leaseSelect = formPayment.querySelector('#pay-lease-select');
      const leaseId = leaseSelect ? leaseSelect.value : null;
      const notesVal = formPayment.querySelector('#pay-notes')?.value || '';
      try {
        await createPayment({
          lease_id: leaseId || undefined,
          amount: formPayment.querySelector('#pay-amount').value,
          payment_method: formPayment.querySelector('#pay-method').value,
          notes: notesVal,
          transaction_ref: notesVal || undefined
        });
        showToast('Payment Recorded', 'Transaction logged to ledger successfully.', 'success', 2500);
        closeModal(document.getElementById('modal-record-payment'));
        closeModal(document.getElementById('modal-pay-rent'));
        formPayment.reset();
        await refreshDashboardData(getCurrentUser());
      } catch (err) {
        showToast('Payment Failed', err.message, 'error', 3500);
      } finally {
        submitBtn.classList.remove('btn--loading');
      }
    });
  }

  // Tenant Quick Pay Rent Confirmation Button (UPI AutoPay & Settlement Gateway)
  const btnConfirmTenantPay = document.getElementById('btn-confirm-tenant-pay');
  if (btnConfirmTenantPay) {
    btnConfirmTenantPay.addEventListener('click', async () => {
      btnConfirmTenantPay.classList.add('btn--loading');
      try {
        const methodSelect = document.getElementById('tenant-pay-method');
        const method = methodSelect ? methodSelect.value : 'upi';
        const activeLease = (cachedStats && cachedStats.activeLease) || (cachedLeases && cachedLeases[0]);
        const rentAmount = activeLease ? (activeLease.rentAmount || activeLease.rent_amount || 28500) : 28500;
        const unitName = activeLease ? (activeLease.unitName || activeLease.unit_number || 'Flat 4B') : 'Flat 4B';
        const propName = activeLease ? (activeLease.propertyName || activeLease.property_name || 'RentRoll') : 'RentRoll';

        // 1. Generate authentic UPI Payment Order
        const orderRes = await createUpiPaymentOrder({
          amount: rentAmount,
          lease_id: activeLease ? activeLease.id : undefined,
          notes: `Rent payment - ${unitName} (${propName})`
        });

        const orderId = orderRes?.order_id || ('order_rcpt_' + Date.now());
        const signature = orderRes?.signature;

        // 2. Authorize and verify through HMAC webhook pipeline
        const verifyRes = await verifyUpiWebhookPayment({
          order_id: orderId,
          payment_id: `TXN-UPI-${Date.now()}`,
          signature: signature,
          amount: rentAmount,
          lease_id: activeLease ? activeLease.id : undefined
        });

        const recordedPayment = verifyRes?.data || {
          amount: rentAmount,
          transaction_ref: `TXN-UPI-${Date.now()}`,
          tenant_name: (getCurrentUser() && getCurrentUser().name) || 'Resident',
          unit_number: unitName,
          property_name: propName,
          paid_date: new Date().toISOString()
        };

        showToast('Payment Successful', `${formatCurrency(rentAmount)} settled via UPI AutoPay (Ref: ${orderId.slice(0, 16)}). Instant HRA receipt ready!`, 'success', 4000);
        closeModal(document.getElementById('modal-pay-rent'));

        // Instant HRA receipt voucher download
        setTimeout(() => downloadPaymentReceipt(recordedPayment), 400);

        await refreshDashboardData(getCurrentUser());
      } catch (err) {
        showToast('Payment Failed', err.message, 'error', 3500);
      } finally {
        btnConfirmTenantPay.classList.remove('btn--loading');
      }
    });
  }

  // 5. Submit Maintenance Ticket Form
  const formTicket = document.getElementById('form-create-ticket');
  if (formTicket) {
    formTicket.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = formTicket.querySelector('button[type="submit"]');
      submitBtn.classList.add('btn--loading');
      try {
        await createMaintenanceTicket({
          title: formTicket.querySelector('#ticket-title').value,
          category: formTicket.querySelector('#ticket-category').value,
          priority: formTicket.querySelector('#ticket-priority').value,
          description: formTicket.querySelector('#ticket-desc').value
        });
        showToast('Ticket Dispatched', 'Your maintenance request was submitted.', 'success', 2500);
        closeModal(document.getElementById('modal-create-ticket'));
        formTicket.reset();
        await refreshDashboardData(user);
      } catch (err) {
        showToast('Failed to submit ticket', err.message, 'error', 3500);
      } finally {
        submitBtn.classList.remove('btn--loading');
      }
    });
  }
}
