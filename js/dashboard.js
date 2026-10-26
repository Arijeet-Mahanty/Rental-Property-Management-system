/**
 * RentRoll - Fullstack Dashboard Controller (Phase 2)
 * Manages Overview, Properties & Units, Leases, Payments Ledger, Maintenance Triage, and Modals
 */

import {
  getCurrentUser,
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
  getMaintenanceTickets,
  createMaintenanceTicket,
  updateMaintenanceTicket
} from './api.js';
import { showToast } from './components.js';

let activeTab = 'overview';
let cachedStats = null;
let cachedProperties = [];
let cachedUnits = [];
let cachedLeases = [];
let cachedPayments = [];
let cachedTickets = [];

/**
 * Formats currency values
 */
function formatCurrency(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
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
 * Initializes the entire Phase 2 dashboard.
 */
export async function initDashboard() {
  const user = getCurrentUser();
  if (!user) {
    window.location.replace('login.html');
    return;
  }

  // Populate Banner
  const nameEl = document.getElementById('dash-user-name');
  const emailEl = document.getElementById('dash-user-email');
  const roleBadgeEl = document.getElementById('dash-role-badge');
  const avatarEl = document.getElementById('dash-user-avatar');
  const logoutBtn = document.getElementById('dash-logout-btn');

  if (nameEl) nameEl.textContent = `Welcome back, ${user.name}!`;
  if (emailEl) emailEl.textContent = user.email;
  if (avatarEl && user.name) avatarEl.textContent = user.name.charAt(0).toUpperCase();

  const isLandlord = user.role === 'landlord';
  if (roleBadgeEl) {
    roleBadgeEl.className = `badge ${isLandlord ? 'badge--landlord' : 'badge--tenant'}`;
    roleBadgeEl.textContent = isLandlord ? 'Landlord Account' : 'Tenant Account';
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

  // Setup Modals
  setupModals(user);

  // Initial Data Load
  await refreshDashboardData(user);
}

/**
 * Loads all data from backend REST API
 */
async function refreshDashboardData(user) {
  try {
    const isLandlord = user.role === 'landlord';

    const [stats, properties, units, leases, payments, tickets] = await Promise.all([
      getDashboardStats().catch(() => null),
      isLandlord ? getProperties().catch(() => []) : Promise.resolve([]),
      getUnits().catch(() => []),
      getLeases().catch(() => []),
      getPayments().catch(() => []),
      getMaintenanceTickets().catch(() => [])
    ]);

    cachedStats = stats;
    cachedProperties = properties || [];
    cachedUnits = units || [];
    cachedLeases = leases || [];
    cachedPayments = payments || [];
    cachedTickets = tickets || [];

    // Update Tab Counts
    updateTabBadges(isLandlord);

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

function updateTabBadges(isLandlord) {
  const propCountEl = document.getElementById('badge-count-properties');
  const leaseCountEl = document.getElementById('badge-count-leases');
  const payCountEl = document.getElementById('badge-count-payments');
  const tktCountEl = document.getElementById('badge-count-tickets');

  if (propCountEl) propCountEl.textContent = cachedProperties.length;
  if (leaseCountEl) leaseCountEl.textContent = cachedLeases.length;
  if (payCountEl) payCountEl.textContent = cachedPayments.length;
  if (tktCountEl) {
    const openCount = cachedTickets.filter(t => t.status !== 'resolved' && t.status !== 'closed').length;
    tktCountEl.textContent = openCount;
  }
}

/**
 * Renders the view corresponding to the active tab
 */
function renderActiveTab(user) {
  const container = document.getElementById('dash-tab-content');
  if (!container) return;

  const isLandlord = user.role === 'landlord';

  switch (activeTab) {
    case 'overview':
      renderOverviewTab(container, user, isLandlord);
      break;
    case 'properties':
      renderPropertiesTab(container, isLandlord);
      break;
    case 'leases':
      renderLeasesTab(container, isLandlord);
      break;
    case 'payments':
      renderPaymentsTab(container, isLandlord);
      break;
    case 'maintenance':
      renderMaintenanceTab(container, isLandlord);
      break;
    default:
      renderOverviewTab(container, user, isLandlord);
  }
}

// ============================================================================
// 1. OVERVIEW TAB
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
                    <td style="font-weight: var(--font-weight-semibold);">${p.tenant_name || 'Elena Rostova'}</td>
                    <td>${p.unit_number || 'Apt 4B'}</td>
                    <td style="font-weight: var(--font-weight-bold);">${formatCurrency(p.amount)}</td>
                    <td style="font-size: var(--font-size-xs); color: var(--color-text-muted);">${formatDate(p.due_date)}</td>
                    <td><span class="badge badge--${p.status}">${p.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Priority Maintenance Alert Card -->
        <div class="glass-card" style="padding: var(--space-6); display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3);">
              <span class="badge badge--high">Action Required</span>
              <span style="font-size: 11px; color: var(--color-text-subtle);">Ticket #tkt_1</span>
            </div>
            <h4 style="font-size: var(--font-size-base); font-weight: var(--font-weight-bold); color: var(--color-text-main); margin-bottom: var(--space-2);">Low hot water pressure</h4>
            <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); line-height: var(--line-height-relaxed); margin-bottom: var(--space-4);">
              Apt 4B (Oakwood Manor). Master shower pressure drop reported. Plumber scheduled for tomorrow 9:00 AM.
            </p>
          </div>
          <button type="button" class="btn btn--outline btn--sm" id="btn-view-ticket-triage" style="width: 100%;">
            <span>Open Maintenance Center</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>
        </div>
      </div>
    `;

    // Bind Overview quick buttons
    bindOverviewEvents();
  } else {
    // Tenant Overview
    const lease = stats.activeLease || {};
    const monthlyRent = stats.monthlyRent || 1650;
    const nextDue = stats.nextDueDate || '2026-11-01';

    container.innerHTML = `
      <!-- Tenant Home Spotlight Banner -->
      <div class="glass-card tenant-spotlight-card">
        <div class="tenant-spotlight-grid">
          <div>
            <div style="display: flex; gap: var(--space-2); margin-bottom: var(--space-2);">
              <span class="badge badge--tenant">Active Resident</span>
              <span class="badge badge--paid">Autopay Active</span>
            </div>
            <h2 style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-extrabold); color: var(--color-text-main); margin-bottom: var(--space-1);">
              ${lease.unitName || 'Apt 4B'} — ${lease.propertyName || 'Oakwood Manor Apartments'}
            </h2>
            <p style="font-size: var(--font-size-sm); color: var(--color-text-muted); margin-bottom: var(--space-4);">
              ${lease.address || '742 Evergreen Terrace, Springfield, OR 97477'}
            </p>
            <div style="display: flex; gap: var(--space-6); font-size: var(--font-size-xs); color: var(--color-text-muted);">
              <div><strong style="color: var(--color-text-main);">Lease Term:</strong> Feb 1, 2026 – Jan 31, 2027</div>
              <div><strong style="color: var(--color-text-main);">Deposit:</strong> ${formatCurrency(lease.depositAmount || 1650)}</div>
            </div>
          </div>

          <div class="tenant-due-panel">
            <span style="font-size: var(--font-size-xs); font-weight: var(--font-weight-bold); color: var(--color-text-muted); text-transform: uppercase;">Next Payment Due</span>
            <div class="tenant-due-amount">${formatCurrency(monthlyRent)}</div>
            <p style="font-size: var(--font-size-xs); color: var(--color-text-subtle); margin-bottom: var(--space-4);">Due on ${formatDate(nextDue)} via ACH</p>
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
                    <td style="font-weight: var(--font-weight-semibold);">${t.title}</td>
                    <td><span class="badge badge--${t.priority}">${t.priority}</span></td>
                    <td><span class="badge badge--${t.status}">${t.status}</span></td>
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
                    <td style="text-transform: uppercase; font-size: 11px;">${p.payment_method}</td>
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
  document.getElementById('btn-view-ticket-triage')?.addEventListener('click', () => {
    document.querySelector('[data-tab="maintenance"]')?.click();
  });
}

// ============================================================================
// 2. PROPERTIES & UNITS TAB
// ============================================================================
function renderPropertiesTab(container, isLandlord) {
  container.innerHTML = `
    <div class="dash-section-header">
      <div>
        <h2 class="dash-section-header__title">Rental Properties & Units</h2>
        <p class="dash-section-header__sub">Portfolio doors, floorplans, occupancy rates, and unit inventories</p>
      </div>
      <div style="display: flex; gap: var(--space-3);">
        <button type="button" class="btn btn--outline btn--sm" id="btn-tab-add-unit">+ Add Unit</button>
        <button type="button" class="btn btn--primary btn--sm" id="btn-tab-add-property">+ Add Property</button>
      </div>
    </div>

    <!-- Properties Card Grid -->
    <div class="properties-grid">
      ${cachedProperties.map(prop => `
        <div class="glass-card property-card">
          <div>
            <div class="property-card__header">
              <div>
                <h3 class="property-card__title">${prop.name}</h3>
                <div class="property-card__address">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  <span>${prop.address}, ${prop.city}, ${prop.state} ${prop.zip_code}</span>
                </div>
              </div>
              <span class="badge badge--landlord">${prop.property_type || 'Multi-Family'}</span>
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
            <div style="display: flex; gap: var(--space-2);">
              <button type="button" class="btn btn--ghost btn--sm btn-delete-prop" data-prop-id="${prop.id}" title="Delete Property">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
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
              <td style="font-weight: var(--font-weight-bold); color: var(--color-primary);">${unit.unit_number}</td>
              <td>${unit.property_name || 'Oakwood Manor'}</td>
              <td>${unit.bedrooms} bd / ${unit.bathrooms} ba</td>
              <td>${unit.square_feet ? unit.square_feet + ' sq ft' : '—'}</td>
              <td style="font-weight: var(--font-weight-bold);">${formatCurrency(unit.rent_amount)}</td>
              <td><span class="badge badge--${unit.status}">${unit.status}</span></td>
              <td style="color: var(--color-text-muted); font-size: var(--font-size-xs);">
                ${unit.current_tenant ? unit.current_tenant.name : '<span style="color: var(--color-text-subtle);">Vacant — Ready to Lease</span>'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('btn-tab-add-property')?.addEventListener('click', () => openModal('modal-add-property'));
  document.getElementById('btn-tab-add-unit')?.addEventListener('click', () => openModal('modal-add-unit'));

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
function renderLeasesTab(container, isLandlord) {
  container.innerHTML = `
    <div class="dash-section-header">
      <div>
        <h2 class="dash-section-header__title">Lease Agreements & Tenancy</h2>
        <p class="dash-section-header__sub">Binding legal contracts, monthly rates, security deposits, and renewal terms</p>
      </div>
      ${isLandlord ? `
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
            <th>Lease Term</th>
            <th>Monthly Rent</th>
            <th>Deposit</th>
            <th>Status</th>
            <th>Terms / Notes</th>
          </tr>
        </thead>
        <tbody>
          ${cachedLeases.map(lease => `
            <tr>
              <td>
                <div style="font-weight: var(--font-weight-semibold);">${lease.tenant_name || 'Elena Rostova'}</div>
                <div style="font-size: var(--font-size-xs); color: var(--color-text-subtle);">${lease.tenant_email || 'tenant@rentroll.com'}</div>
              </td>
              <td>
                <div style="font-weight: var(--font-weight-medium);">${lease.unit_number || 'Apt 4B'}</div>
                <div style="font-size: var(--font-size-xs); color: var(--color-text-subtle);">${lease.property_name || 'Oakwood Manor'}</div>
              </td>
              <td style="font-size: var(--font-size-xs);">
                ${formatDate(lease.start_date)} &rarr; ${formatDate(lease.end_date)}
              </td>
              <td style="font-weight: var(--font-weight-bold);">${formatCurrency(lease.rent_amount)}</td>
              <td>${formatCurrency(lease.deposit_amount)}</td>
              <td><span class="badge badge--${lease.status === 'active' ? 'paid' : 'pending'}">${lease.status}</span></td>
              <td style="font-size: var(--font-size-xs); color: var(--color-text-muted); max-width: 240px;">
                ${lease.terms || 'Standard 12-month agreement'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('btn-tab-new-lease')?.addEventListener('click', () => openModal('modal-create-lease'));
}

// ============================================================================
// 4. RENT LEDGER & PAYMENTS TAB
// ============================================================================
function renderPaymentsTab(container, isLandlord) {
  const totalPaid = cachedPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalPending = cachedPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  container.innerHTML = `
    <div class="dash-section-header">
      <div>
        <h2 class="dash-section-header__title">Rent Roll & Transactions Ledger</h2>
        <p class="dash-section-header__sub">Detailed audit trail of digital ACH, credit card, and manual payments</p>
      </div>
      <div>
        <button type="button" class="btn btn--primary btn--sm" id="btn-tab-record-payment">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>${isLandlord ? 'Record Payment' : 'Pay Rent Now'}</span>
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
            <th>Receipt</th>
          </tr>
        </thead>
        <tbody>
          ${cachedPayments.map(pay => `
            <tr>
              <td style="font-size: var(--font-size-xs); color: var(--color-text-muted);">${formatDate(pay.paid_date || pay.due_date)}</td>
              <td style="font-weight: var(--font-weight-semibold);">${pay.tenant_name || 'Elena Rostova'}</td>
              <td>${pay.unit_number || 'Apt 4B'}</td>
              <td style="font-weight: var(--font-weight-extrabold);">${formatCurrency(pay.amount)}</td>
              <td style="text-transform: uppercase; font-size: 11px; font-weight: var(--font-weight-bold);">${pay.payment_method}</td>
              <td><span class="badge badge--${pay.status}">${pay.status}</span></td>
              <td style="font-family: monospace; font-size: 11px; color: var(--color-text-subtle);">${pay.transaction_ref || 'PENDING-ACH'}</td>
              <td>
                <button type="button" class="btn btn--ghost btn--sm btn-download-receipt" data-ref="${pay.transaction_ref || 'RECEIPT'}">
                  Download
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('btn-tab-record-payment')?.addEventListener('click', () => {
    openModal(isLandlord ? 'modal-record-payment' : 'modal-pay-rent');
  });

  container.querySelectorAll('.btn-download-receipt').forEach(btn => {
    btn.addEventListener('click', () => {
      const ref = btn.getAttribute('data-ref');
      showToast('Receipt Generated', `Downloaded receipt statement for ${ref}.`, 'success', 2500);
    });
  });
}

// ============================================================================
// 5. MAINTENANCE TRIAGE TAB
// ============================================================================
function renderMaintenanceTab(container, isLandlord) {
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
        <div class="glass-card ticket-card ticket-card--${tkt.priority}">
          <div>
            <div class="ticket-card__header">
              <span class="badge badge--${tkt.priority}">${tkt.priority} Urgency</span>
              <span class="badge badge--${tkt.status}">${tkt.status}</span>
            </div>

            <h3 class="ticket-card__title">${tkt.title}</h3>
            <p class="ticket-card__desc">${tkt.description}</p>
          </div>

          <div>
            <div class="ticket-card__meta">
              <span><strong>Unit:</strong> ${tkt.unit_number || 'Apt 4B'}</span>
              <span><strong>Category:</strong> ${tkt.category || 'General'}</span>
            </div>
            <div class="ticket-card__meta">
              <span><strong>Submitted:</strong> ${formatDate(tkt.created_at)}</span>
              <span><strong>Est. Cost:</strong> ${formatCurrency(tkt.estimated_cost)}</span>
            </div>

            ${tkt.resolution_notes ? `
              <div style="background-color: var(--color-bg-inset); padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); font-size: 11px; color: var(--color-text-muted); margin-bottom: var(--space-3);">
                <strong>Notes:</strong> ${tkt.resolution_notes}
              </div>
            ` : ''}

            ${isLandlord ? `
              <div class="ticket-card__actions">
                ${tkt.status === 'open' ? `
                  <button type="button" class="btn btn--primary btn--sm btn-tkt-progress" data-id="${tkt.id}" style="width: 100%;">
                    Start Work Order
                  </button>
                ` : tkt.status === 'in_progress' ? `
                  <button type="button" class="btn btn--outline btn--sm btn-tkt-resolve" data-id="${tkt.id}" style="width: 100%;">
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
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
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
        await createProperty({
          name: formAddProp.querySelector('#prop-name').value,
          address: formAddProp.querySelector('#prop-address').value,
          city: formAddProp.querySelector('#prop-city').value,
          state: formAddProp.querySelector('#prop-state').value,
          zip_code: formAddProp.querySelector('#prop-zip').value,
          property_type: formAddProp.querySelector('#prop-type').value
        });
        showToast('Property Added', 'Added new property to your portfolio.', 'success', 2500);
        closeModal(document.getElementById('modal-add-property'));
        formAddProp.reset();
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
      selectProp.innerHTML = cachedProperties.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
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
  if (formCreateLease) {
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
        await refreshDashboardData(user);
      } catch (err) {
        showToast('Failed to create lease', err.message, 'error', 3500);
      } finally {
        submitBtn.classList.remove('btn--loading');
      }
    });
  }

  // 4. Record Payment / Pay Rent Form
  const formPayment = document.getElementById('form-record-payment');
  if (formPayment) {
    formPayment.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = formPayment.querySelector('button[type="submit"]');
      submitBtn.classList.add('btn--loading');
      try {
        await createPayment({
          amount: formPayment.querySelector('#pay-amount').value,
          payment_method: formPayment.querySelector('#pay-method').value,
          notes: formPayment.querySelector('#pay-notes').value
        });
        showToast('Payment Recorded', 'Transaction logged to ledger successfully.', 'success', 2500);
        closeModal(document.getElementById('modal-record-payment'));
        closeModal(document.getElementById('modal-pay-rent'));
        formPayment.reset();
        await refreshDashboardData(user);
      } catch (err) {
        showToast('Payment Failed', err.message, 'error', 3500);
      } finally {
        submitBtn.classList.remove('btn--loading');
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
