'use strict';

// === CONFIG ===
// Paste the Google Apps Script Web App URL here after deploying apps-script.gs.
// Leave empty to disable cloud sync (app still works via localStorage).
const SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbx7ZzFPl3ldsv4oy_3F_q-TIGgZWHAC1MlJvdQrDWwSR1jVEzzHQh5sDHXMxFuUnT7jEw/exec';

// Schema version for downstream-agent compatibility. Bump when payload shape changes.
const SCHEMA_VERSION = 1;

// Default silence-follow-up window for the downstream follow-up agent.
// Not used by the PWA itself - kept here so the value is co-located with the app.
const FOLLOWUP_HOURS = 48;

const STATUS_VALUES = ['draft', 'shared', 'approved', 'declined', 'deferred', 'cancelled'];

// Brand logo mark — 2×2 grid icon (sun, waves, mountain, pine tree).
// Pass size for width/height; color defaults to white for use on green backgrounds.
function logoSVG(size = 28, color = 'white') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1.5" y="1.5" width="29" height="29" rx="5.5" stroke="${color}" stroke-width="2"/>
    <line x1="16" y1="1.5" x2="16" y2="30.5" stroke="${color}" stroke-width="1.5"/>
    <line x1="1.5" y1="16" x2="30.5" y2="16" stroke="${color}" stroke-width="1.5"/>
    <circle cx="8.75" cy="8.75" r="3" stroke="${color}" stroke-width="1.8"/>
    <path d="M18.5 7 Q20 5.5 21.5 7 Q23 8.5 24.5 7" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M18.5 10.5 Q20 9 21.5 10.5 Q23 12 24.5 10.5" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M3 29.5 L8.75 20 L14.5 29.5Z" fill="${color}"/>
    <path d="M18.5 28 L23.5 19.5 L28.5 28Z" fill="${color}"/>
    <rect x="22.3" y="28" width="2.4" height="2" rx="0.4" fill="${color}"/>
  </svg>`;
}

// === STATE ===
const state = {
  currentId: null,
  customer: {},
  vehicle: {},
  selected: new Set(),
  sharedAt: null,
  status: 'draft',
  notes: '',
  estimates: JSON.parse(localStorage.getItem('vm_estimates') || '[]'),
  homeFilter: { query: '', status: 'all' }
};

// === UTILS ===
const fmt = n => (n > 0)
  ? '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  : '$0.00';

// Escape user-supplied and catalog text before interpolating into HTML strings.
// Customer names, vehicle fields, and product names contain &, ", ' which corrupt
// rendering or open XSS holes when injected raw via innerHTML.
const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ESC_MAP[c]);

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const saveToStorage = () =>
  localStorage.setItem('vm_estimates', JSON.stringify(state.estimates));

// === NAVIGATION ===
function showView(name) {
  if (name === 'home') renderHome();
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  window.scrollTo(0, 0);
}

// === HOME ===
function buildVehicleString(v) {
  return [v.year, v.make, v.model, v.wheelbase && v.wheelbase !== 'both' ? v.wheelbase + '"' : '']
    .filter(Boolean).join(' ');
}

function matchesHomeFilter(est) {
  const { query, status } = state.homeFilter;
  if (status !== 'all' && (est.status || 'draft') !== status) return false;
  if (!query) return true;
  const haystack = [
    est.customer.name,
    est.customer.phone,
    est.customer.email,
    buildVehicleString(est.vehicle),
    est.notes
  ].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(query);
}

function renderHome() {
  const list = document.getElementById('estimates-list');
  const empty = document.getElementById('estimates-empty');
  const noResults = document.getElementById('estimates-no-results');
  const toolbar = document.getElementById('home-toolbar');

  const visible = state.estimates.filter(e => e.status !== 'cancelled');

  // Hide the search/filter toolbar entirely when there's nothing to search through.
  if (toolbar) toolbar.style.display = visible.length === 0 ? 'none' : '';

  if (visible.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    noResults.style.display = 'none';
    return;
  }
  empty.style.display = 'none';

  const filtered = visible.filter(matchesHomeFilter);
  if (filtered.length === 0) {
    list.innerHTML = '';
    noResults.style.display = 'block';
    return;
  }
  noResults.style.display = 'none';

  const sorted = filtered.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  list.innerHTML = `
    <div class="home-section-label">Recent Estimates</div>
    ${sorted.map(est => {
      const vehicleStr = buildVehicleString(est.vehicle) || 'Vehicle not specified';
      const date = new Date(est.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const idAttr = esc(est.id);
      const status = est.status || 'draft';
      const statusBadge = status !== 'draft'
        ? `<span class="status-badge status-${esc(status)}">${esc(status[0].toUpperCase() + status.slice(1))}</span>`
        : '';
      return `
        <div class="estimate-card-row" data-id="${idAttr}">
          <div class="estimate-card-actions">
            <button class="card-action action-share" data-id="${idAttr}" aria-label="Share estimate">Share</button>
            <button class="card-action action-copy" data-id="${idAttr}" aria-label="Duplicate estimate">Copy</button>
            <button class="card-action action-delete" data-id="${idAttr}" aria-label="Delete estimate">Delete</button>
          </div>
          <div class="estimate-card" data-id="${idAttr}">
            <div class="estimate-card-info">
              <div class="estimate-card-name-row">
                <span class="estimate-card-name">${esc(est.customer.name)}</span>
                ${statusBadge}
              </div>
              <div class="estimate-card-vehicle">${esc(vehicleStr)}</div>
              <div class="estimate-card-date">${esc(date)}</div>
            </div>
            <div class="estimate-card-right">
              <div class="estimate-card-total">${fmt(est.total)}</div>
              <div class="estimate-card-arrow">&#8250;</div>
            </div>
          </div>
        </div>
      `;
    }).join('')}
  `;
}

// === NEW / LOAD ESTIMATE ===
function startNew() {
  state.currentId = null;
  state.customer = {};
  state.vehicle = {};
  state.selected = new Set();
  state.sharedAt = null;
  state.status = 'draft';
  state.notes = '';
  document.getElementById('form-customer').reset();
  document.querySelector('input[name="wheelbase"][value="both"]').checked = true;
  showView('customer');
}

function loadEstimate(id) {
  const est = state.estimates.find(e => e.id === id);
  if (!est) return;

  state.currentId = id;
  state.customer = { ...est.customer };
  state.vehicle = { ...est.vehicle };
  state.selected = new Set(est.selectedParts);
  state.sharedAt = est.sharedAt || null;
  state.status = est.status || 'draft';
  state.notes = est.notes || '';

  populateCustomerForm(est);
  showView('customer');
}

// Copies customer/vehicle/parts from an existing estimate into a fresh draft.
// Clears id/sharedAt/status/notes so saving creates a new record rather than
// overwriting the source.
function duplicateEstimate(id) {
  const src = state.estimates.find(e => e.id === id);
  if (!src) return;

  state.currentId = null;
  state.customer = { ...src.customer };
  state.vehicle = { ...src.vehicle };
  state.selected = new Set(src.selectedParts);
  state.sharedAt = null;
  state.status = 'draft';
  state.notes = '';

  populateCustomerForm(src);
  showView('customer');
}

function populateCustomerForm(est) {
  document.getElementById('customer-name').value = est.customer.name || '';
  document.getElementById('customer-phone').value = est.customer.phone || '';
  document.getElementById('customer-email').value = est.customer.email || '';
  document.getElementById('vehicle-year').value = est.vehicle.year || '';
  document.getElementById('vehicle-make').value = est.vehicle.make || '';
  document.getElementById('vehicle-model').value = est.vehicle.model || '';

  const wb = est.vehicle.wheelbase || 'both';
  const wbEl = document.querySelector(`input[name="wheelbase"][value="${wb}"]`);
  if (wbEl) wbEl.checked = true;
}

// === PARTS ===
const CATEGORIES = [
  'Exterior', 'Suspension', 'Wheels & Tires', 'Roof Racks & Lighting',
  'Windows', 'Capsules', 'Audio', 'Electrical & Power', 'Water Systems', 'Climate', 'Interior'
];

function getVisibleProducts() {
  const wb = state.vehicle.wheelbase;
  if (!wb || wb === 'both') return PRODUCTS;
  return PRODUCTS.filter(p => {
    if (!p.fitment || p.fitment.length === 0) return true;
    return p.fitment.some(f => f.includes(wb));
  });
}

function renderParts() {
  const products = getVisibleProducts();
  const list = document.getElementById('parts-list');

  const usedCategories = CATEGORIES.filter(cat => products.some(p => p.category === cat));

  if (usedCategories.length === 0) {
    list.innerHTML = '<div class="no-results">No parts available for this vehicle.</div>';
    return;
  }

  list.innerHTML = usedCategories.map(cat => {
    const items = products.filter(p => p.category === cat);
    const selectedInCat = items.filter(p => state.selected.has(p.id)).length;
    const catAttr = esc(cat);
    return `
      <div class="category-section" data-category="${catAttr}">
        <div class="category-header">
          <div class="category-header-left">
            <span class="category-name">${catAttr}</span>
            <span class="category-badge ${selectedInCat > 0 ? 'visible' : ''}">${selectedInCat}</span>
          </div>
          <span class="category-chevron">&#9660;</span>
        </div>
        <div class="category-items">
          ${items.map(p => renderPartRow(p)).join('')}
        </div>
      </div>
    `;
  }).join('');

  updateFooter();
}

function renderPartRow(p) {
  const sel = state.selected.has(p.id);
  const price = p.installedPrice > 0 ? fmt(p.installedPrice) : 'POA';
  return `
    <div class="part-item ${sel ? 'selected' : ''}" data-part-id="${esc(p.id)}">
      <div class="part-checkbox">${sel ? '&#10003;' : ''}</div>
      <div class="part-info">
        <div class="part-name">${esc(p.name)}</div>
        ${p.notes ? `<div class="part-note">${esc(p.notes)}</div>` : ''}
      </div>
      <div class="part-price">${price}</div>
    </div>
  `;
}

function togglePart(id) {
  state.selected.has(id) ? state.selected.delete(id) : state.selected.add(id);

  const item = document.querySelector(`.part-item[data-part-id="${id}"]`);
  const product = PRODUCTS.find(p => p.id === id);
  if (item && product) item.outerHTML = renderPartRow(product);

  updateCategoryBadge(id);
  updateFooter();
}

function updateCategoryBadge(id) {
  const product = PRODUCTS.find(p => p.id === id);
  if (!product) return;
  const section = document.querySelector(`.category-section[data-category="${product.category}"]`);
  if (!section) return;
  const items = getVisibleProducts().filter(p => p.category === product.category);
  const count = items.filter(p => state.selected.has(p.id)).length;
  const badge = section.querySelector('.category-badge');
  if (badge) {
    badge.textContent = count;
    badge.classList.toggle('visible', count > 0);
  }
}

function updateFooter() {
  const count = state.selected.size;
  const total = [...state.selected].reduce((sum, id) => {
    const p = PRODUCTS.find(prod => prod.id === id);
    return sum + (p ? p.installedPrice : 0);
  }, 0);
  document.getElementById('selected-count').textContent =
    count === 0 ? '0 items selected' : `${count} item${count !== 1 ? 's' : ''} selected`;
  document.getElementById('selected-total').textContent = fmt(total);
  document.getElementById('btn-view-estimate').disabled = count === 0;
}

function filterParts(query) {
  const q = query.toLowerCase().trim();

  document.querySelectorAll('.category-section').forEach(section => {
    let sectionVisible = false;
    section.querySelectorAll('.part-item').forEach(item => {
      const name = item.querySelector('.part-name').textContent.toLowerCase();
      const note = item.querySelector('.part-note')?.textContent.toLowerCase() || '';
      const match = !q || name.includes(q) || note.includes(q);
      item.style.display = match ? 'flex' : 'none';
      if (match) sectionVisible = true;
    });
    section.style.display = sectionVisible ? '' : 'none';
    if (q && sectionVisible) section.classList.add('open');
  });
}

// === ESTIMATE ===
function getSelectedProducts() {
  return [...state.selected].map(id => PRODUCTS.find(p => p.id === id)).filter(Boolean);
}

function calcTotal(products) {
  return products.reduce((sum, p) => sum + p.installedPrice, 0);
}

function renderEstimate() {
  const products = getSelectedProducts();
  const total = calcTotal(products);
  const c = state.customer;
  const v = state.vehicle;

  const vehicleStr = [v.year, v.make, v.model, v.wheelbase && v.wheelbase !== 'both' ? v.wheelbase + '"' : '']
    .filter(Boolean).join(' ') || 'Not specified';

  const existingEst = state.currentId ? state.estimates.find(e => e.id === state.currentId) : null;
  const dateStr = new Date(existingEst?.createdAt ?? Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const grouped = {};
  products.forEach(p => {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  });

  const html = `
    <div class="estimate-hero">
      <img class="estimate-hero-logo" src="vanmart-llm-gen-logo.png" alt="The Van Mart">
      <div class="estimate-hero-brand">the van mart</div>
      <div class="estimate-hero-sub">Service Estimate</div>
    </div>

    <div class="estimate-section">
      <div class="estimate-section-label">Customer</div>
      <div class="estimate-row">
        <span class="estimate-row-label">Name</span>
        <span class="estimate-row-value">${esc(c.name)}</span>
      </div>
      ${c.phone ? `<div class="estimate-row"><span class="estimate-row-label">Phone</span><span class="estimate-row-value">${esc(c.phone)}</span></div>` : ''}
      ${c.email ? `<div class="estimate-row"><span class="estimate-row-label">Email</span><span class="estimate-row-value">${esc(c.email)}</span></div>` : ''}
    </div>

    <div class="estimate-section">
      <div class="estimate-section-label">Vehicle</div>
      <div class="estimate-row">
        <span class="estimate-row-label">Vehicle</span>
        <span class="estimate-row-value">${esc(vehicleStr)}</span>
      </div>
      <div class="estimate-row">
        <span class="estimate-row-label">Date</span>
        <span class="estimate-row-value">${esc(dateStr)}</span>
      </div>
    </div>

    ${CATEGORIES.filter(cat => grouped[cat]).map(cat => `
      <div class="estimate-section">
        <div class="estimate-section-label">${esc(cat)}</div>
        ${grouped[cat].map(p => `
          <div class="estimate-row">
            <span class="estimate-row-label">${esc(p.name)}</span>
            <span class="estimate-row-value price">${p.installedPrice > 0 ? fmt(p.installedPrice) : 'POA'}</span>
          </div>
        `).join('')}
      </div>
    `).join('')}

    <div class="estimate-total-block">
      <span class="estimate-total-label">Estimated Total</span>
      <span class="estimate-total-value">${fmt(total)}</span>
    </div>

    <p class="estimate-disclaimer">
      This is an estimate only. Final pricing subject to vehicle inspection and part availability.
      Installed prices include parts and labor.
    </p>

    ${state.currentId ? `
      <div class="estimate-section internal-section">
        <div class="estimate-section-label">Internal Tracking</div>
        <div class="form-group">
          <label for="estimate-status">Status</label>
          <select id="estimate-status">
            ${STATUS_VALUES.map(s => `<option value="${s}">${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="estimate-notes">Notes</label>
          <textarea id="estimate-notes" rows="3" placeholder="Customer response, next steps, etc."></textarea>
        </div>
        ${state.sharedAt ? `<div class="internal-meta">Shared ${new Date(state.sharedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>` : ''}
      </div>
    ` : ''}
  `;

  document.getElementById('estimate-content').innerHTML = html;
  document.getElementById('btn-save').textContent = state.currentId ? 'Update' : 'Save';

  const statusEl = document.getElementById('estimate-status');
  if (statusEl) statusEl.value = state.status || 'draft';
  const notesEl = document.getElementById('estimate-notes');
  if (notesEl) notesEl.value = state.notes || '';
}

// === SHARE ===
function shareEstimate(est) {
  const c = est.customer;
  const v = est.vehicle;
  const products = est.selectedParts.map(id => PRODUCTS.find(p => p.id === id)).filter(Boolean);
  const total = est.total;

  const vehicleStr = [v.year, v.make, v.model, v.wheelbase && v.wheelbase !== 'both' ? v.wheelbase + '"' : '']
    .filter(Boolean).join(' ');

  const dateStr = new Date(est.createdAt ?? Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const grouped = {};
  products.forEach(p => {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  });

  const lines = [
    'THE VAN MART',
    'Service Estimate',
    '',
    `Date: ${dateStr}`,
    `Customer: ${c.name}`,
    vehicleStr ? `Vehicle: ${vehicleStr}` : null,
    c.phone ? `Phone: ${c.phone}` : null,
    c.email ? `Email: ${c.email}` : null,
    '',
    ...CATEGORIES.filter(cat => grouped[cat]).flatMap(cat => [
      `[ ${cat.toUpperCase()} ]`,
      ...grouped[cat].map(p => `  ${p.name}: ${p.installedPrice > 0 ? fmt(p.installedPrice) : 'POA'}`),
      ''
    ]),
    `ESTIMATED TOTAL: ${fmt(total)}`,
    '',
    'This is an estimate only. Final pricing subject to vehicle inspection and part availability.'
  ].filter(l => l !== null).join('\n');

  markShared(est.id);

  if (navigator.share) {
    navigator.share({
      title: `Van Mart Estimate - ${c.name}`,
      text: lines
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(lines).then(() => {
      const btn = document.getElementById('btn-share');
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = orig; }, 2000);
      }
    }).catch(() => alert('Could not copy. Please screenshot the estimate.'));
  }
}

function markShared(id) {
  const est = state.estimates.find(e => e.id === id);
  if (!est) return;
  const now = new Date().toISOString();
  est.sharedAt = now;
  if (est.status === 'draft' || !est.status) est.status = 'shared';
  est.updatedAt = now;
  est.synced = false;
  saveToStorage();
  syncEstimate(est);
  if (state.currentId === id) {
    state.sharedAt = est.sharedAt;
    state.status = est.status;
    renderEstimate();
  }
  renderHome();
}

// === DELETE (soft) ===
function deleteEstimate(id) {
  const est = state.estimates.find(e => e.id === id);
  if (!est) return;
  const previousStatus = est.status && est.status !== 'cancelled' ? est.status : 'draft';
  est.status = 'cancelled';
  est.updatedAt = new Date().toISOString();
  est.synced = false;
  saveToStorage();
  syncEstimate(est);
  renderHome();
  showUndoToast('Estimate deleted', () => restoreEstimate(id, previousStatus));
}

function restoreEstimate(id, previousStatus) {
  const est = state.estimates.find(e => e.id === id);
  if (!est) return;
  est.status = previousStatus || 'draft';
  est.updatedAt = new Date().toISOString();
  est.synced = false;
  saveToStorage();
  syncEstimate(est);
  renderHome();
}

// === TOAST ===
let toastTimer = null;
let toastActionHandler = null;

function showUndoToast(message, onUndo) {
  const toast = document.getElementById('toast');
  const msgEl = document.getElementById('toast-message');
  const actionEl = document.getElementById('toast-action');
  if (!toast || !msgEl || !actionEl) return;

  msgEl.textContent = message;
  toastActionHandler = () => {
    onUndo();
    hideToast();
  };
  toast.hidden = false;
  // Force a reflow so the transition runs on the first show.
  void toast.offsetWidth;
  toast.classList.add('visible');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 5000);
}

function hideToast() {
  const toast = document.getElementById('toast');
  if (!toast) return;
  clearTimeout(toastTimer);
  toastTimer = null;
  toastActionHandler = null;
  toast.classList.remove('visible');
  setTimeout(() => {
    if (!toast.classList.contains('visible')) toast.hidden = true;
  }, 200);
}

// === SAVE ===
function saveEstimate() {
  const products = getSelectedProducts();
  const total = calcTotal(products);

  const now = new Date().toISOString();
  const existing = state.currentId ? state.estimates.find(e => e.id === state.currentId) : null;
  const est = {
    schemaVersion: SCHEMA_VERSION,
    id: state.currentId || uid(),
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
    sharedAt: state.sharedAt || (existing ? existing.sharedAt : null) || null,
    status: state.status || (existing ? existing.status : 'draft') || 'draft',
    notes: state.notes || '',
    customer: { ...state.customer },
    vehicle: { ...state.vehicle },
    selectedParts: [...state.selected],
    total,
    synced: false
  };

  if (state.currentId) {
    const idx = state.estimates.findIndex(e => e.id === state.currentId);
    if (idx >= 0) state.estimates[idx] = est;
    else state.estimates.push(est);
  } else {
    state.currentId = est.id;
    state.estimates.push(est);
  }

  saveToStorage();
  syncEstimate(est);

  const btn = document.getElementById('btn-save');
  if (btn) {
    btn.textContent = 'Saved!';
    setTimeout(() => { btn.textContent = state.currentId ? 'Update' : 'Save'; }, 2000);
  }
}

// Persist status/notes changes from the internal-tracking UI without the "Saved!" flash.
function persistCurrent() {
  if (!state.currentId) return;
  const est = state.estimates.find(e => e.id === state.currentId);
  if (!est) return;
  est.status = state.status || 'draft';
  est.notes = state.notes || '';
  est.updatedAt = new Date().toISOString();
  est.synced = false;
  saveToStorage();
  syncEstimate(est);
}

let notesDebounce = null;
function debouncedPersistNotes() {
  clearTimeout(notesDebounce);
  notesDebounce = setTimeout(persistCurrent, 800);
}

// === CLOUD SYNC (Google Sheets) ===
function buildSyncPayload(est) {
  const products = est.selectedParts
    .map(id => PRODUCTS.find(p => p.id === id))
    .filter(Boolean);
  const v = est.vehicle;
  const vehicleStr = [v.year, v.make, v.model, v.wheelbase && v.wheelbase !== 'both' ? v.wheelbase + '"' : '']
    .filter(Boolean).join(' ');
  return {
    schemaVersion: est.schemaVersion || SCHEMA_VERSION,
    id: est.id,
    createdAt: est.createdAt,
    updatedAt: est.updatedAt,
    sharedAt: est.sharedAt || '',
    status: est.status || 'draft',
    notes: est.notes || '',
    customerName: est.customer.name || '',
    customerPhone: est.customer.phone || '',
    customerEmail: est.customer.email || '',
    vehicle: vehicleStr,
    year: v.year || '',
    make: v.make || '',
    model: v.model || '',
    wheelbase: v.wheelbase || '',
    partCount: products.length,
    total: est.total,
    parts: products.map(p => ({ id: p.id, name: p.name, category: p.category, price: p.installedPrice }))
  };
}

function syncEstimate(est) {
  if (!SHEETS_WEBHOOK_URL) return;
  const payload = JSON.stringify(buildSyncPayload(est));
  // text/plain avoids a CORS preflight against Apps Script.
  fetch(SHEETS_WEBHOOK_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: payload,
    keepalive: true
  }).then(() => {
    const idx = state.estimates.findIndex(e => e.id === est.id);
    if (idx >= 0) {
      state.estimates[idx].synced = true;
      saveToStorage();
    }
  }).catch(() => {
    // Stays unsynced; retried on next app load.
  });
}

function syncPending() {
  if (!SHEETS_WEBHOOK_URL) return;
  state.estimates.filter(e => !e.synced).forEach(syncEstimate);
}

// === EVENT LISTENERS ===
document.addEventListener('DOMContentLoaded', () => {

  // Home
  document.getElementById('btn-new-estimate').addEventListener('click', startNew);

  // Home search + status filter
  const homeSearch = document.getElementById('home-search-input');
  if (homeSearch) {
    const onSearch = e => {
      state.homeFilter.query = e.target.value.trim().toLowerCase();
      renderHome();
    };
    homeSearch.addEventListener('input', onSearch);
    homeSearch.addEventListener('search', onSearch);
  }

  const filterChips = document.getElementById('home-filter-chips');
  if (filterChips) {
    filterChips.addEventListener('click', e => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      state.homeFilter.status = chip.dataset.status;
      filterChips.querySelectorAll('.filter-chip').forEach(c =>
        c.classList.toggle('active', c === chip));
      renderHome();
    });
  }

  const estList = document.getElementById('estimates-list');

  estList.addEventListener('click', e => {
    const action = e.target.closest('.card-action');
    if (action) {
      const id = action.dataset.id;
      const est = state.estimates.find(x => x.id === id);
      if (!est) return;
      if (action.classList.contains('action-share')) {
        shareEstimate(est);
        closeAllRows();
      } else if (action.classList.contains('action-copy')) {
        closeAllRows();
        duplicateEstimate(id);
      } else if (action.classList.contains('action-delete')) {
        deleteEstimate(id);
      }
      return;
    }
    const row = e.target.closest('.estimate-card-row');
    if (!row) return;
    if (row.classList.contains('open')) {
      row.classList.remove('open');
      return;
    }
    if (document.querySelector('.estimate-card-row.open')) {
      closeAllRows();
      return;
    }
    const card = e.target.closest('.estimate-card');
    if (card) loadEstimate(card.dataset.id);
  });

  // Swipe-to-reveal (Apple Notes style: swipe left -> Share + Copy + Delete)
  const ACTION_WIDTH = 240;
  let swipe = null;

  function closeAllRows() {
    document.querySelectorAll('.estimate-card-row.open').forEach(r => r.classList.remove('open'));
  }

  estList.addEventListener('touchstart', e => {
    const row = e.target.closest('.estimate-card-row');
    if (!row) return;
    const t = e.touches[0];
    swipe = {
      row,
      card: row.querySelector('.estimate-card'),
      startX: t.clientX,
      startY: t.clientY,
      dx: 0,
      startedOpen: row.classList.contains('open'),
      engaged: false,
      cancelled: false
    };
  }, { passive: true });

  estList.addEventListener('touchmove', e => {
    if (!swipe || swipe.cancelled) return;
    const t = e.touches[0];
    swipe.dx = t.clientX - swipe.startX;
    const dy = t.clientY - swipe.startY;

    if (!swipe.engaged) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(swipe.dx)) {
        swipe.cancelled = true;
        return;
      }
      if (Math.abs(swipe.dx) < 8) return;
      swipe.engaged = true;
      document.querySelectorAll('.estimate-card-row.open').forEach(r => {
        if (r !== swipe.row) r.classList.remove('open');
      });
    }

    if (e.cancelable) e.preventDefault();

    const base = swipe.startedOpen ? -ACTION_WIDTH : 0;
    let offset = base + swipe.dx;
    if (offset > 0) offset = 0;
    if (offset < -ACTION_WIDTH) offset = -ACTION_WIDTH + (offset + ACTION_WIDTH) / 4;
    swipe.card.style.transition = 'none';
    swipe.card.style.transform = `translateX(${offset}px)`;
  }, { passive: false });

  estList.addEventListener('touchend', () => {
    if (!swipe) return;
    swipe.card.style.transition = '';
    swipe.card.style.transform = '';

    if (swipe.engaged) {
      const base = swipe.startedOpen ? -ACTION_WIDTH : 0;
      const finalOffset = base + swipe.dx;
      const shouldOpen = finalOffset < -ACTION_WIDTH / 2;
      swipe.row.classList.toggle('open', shouldOpen);
    }
    swipe = null;
  });

  estList.addEventListener('touchcancel', () => {
    if (!swipe) return;
    swipe.card.style.transition = '';
    swipe.card.style.transform = '';
    swipe = null;
  });

  // Back buttons
  document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.target));
  });

  // Customer form
  document.getElementById('form-customer').addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('customer-name').value.trim();
    if (!name) {
      document.getElementById('customer-name').classList.add('error');
      document.getElementById('customer-name').focus();
      return;
    }
    document.getElementById('customer-name').classList.remove('error');

    state.customer = {
      name,
      phone: document.getElementById('customer-phone').value.trim(),
      email: document.getElementById('customer-email').value.trim()
    };
    state.vehicle = {
      year: document.getElementById('vehicle-year').value.trim(),
      make: document.getElementById('vehicle-make').value.trim(),
      model: document.getElementById('vehicle-model').value.trim(),
      wheelbase: document.querySelector('input[name="wheelbase"]:checked')?.value || 'both'
    };

    renderParts();
    showView('parts');
  });

  // Category accordion
  document.getElementById('parts-list').addEventListener('click', e => {
    const header = e.target.closest('.category-header');
    if (header) {
      header.closest('.category-section').classList.toggle('open');
      return;
    }
    const item = e.target.closest('.part-item');
    if (item) togglePart(item.dataset.partId);
  });

  // Search
  document.getElementById('parts-search').addEventListener('input', e => {
    filterParts(e.target.value);
  });

  document.getElementById('parts-search').addEventListener('search', e => {
    filterParts(e.target.value);
  });

  // View estimate
  document.getElementById('btn-view-estimate').addEventListener('click', () => {
    renderEstimate();
    showView('estimate');
  });

  // Share & Save
  document.getElementById('btn-share').addEventListener('click', () => {
    if (!state.currentId) saveEstimate();
    const est = state.estimates.find(e => e.id === state.currentId);
    if (est) shareEstimate(est);
  });
  document.getElementById('btn-save').addEventListener('click', saveEstimate);

  // Internal-tracking status + notes (delegated, so they survive re-renders)
  const estimateContent = document.getElementById('estimate-content');
  estimateContent.addEventListener('change', e => {
    if (e.target.id === 'estimate-status') {
      state.status = e.target.value;
      persistCurrent();
    }
  });
  estimateContent.addEventListener('input', e => {
    if (e.target.id === 'estimate-notes') {
      state.notes = e.target.value;
      debouncedPersistNotes();
    }
  });

  // Done -> home
  document.getElementById('btn-estimate-done').addEventListener('click', () => showView('home'));

  // Toast undo action
  document.getElementById('toast-action').addEventListener('click', () => {
    if (toastActionHandler) toastActionHandler();
  });

  // Init
  showView('home');
  syncPending();
});
