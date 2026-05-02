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

// Customer-facing estimate page — resolves to the directory the app is served from.
const BASE_URL = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
const SHOP_PHONE = '657-222-8016';
const SHOP_EMAIL = 'mikec@thevanmart.com';

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
  customParts: [],
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

// Email regex chosen for usability over RFC strictness: rejects obvious typos
// (missing @, missing TLD, internal whitespace) without flagging valid odd cases.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const isValidEmail = s => EMAIL_RE.test(s.trim());

// Phone is normalized to digits before validating. Accepts 10-digit US/CA
// numbers or 11 digits when prefixed with country code 1.
const phoneDigits = s => String(s || '').replace(/\D/g, '');
function isValidPhone(s) {
  const d = phoneDigits(s);
  return d.length === 10 || (d.length === 11 && d[0] === '1');
}

// Format on input: progressively apply 555-555-5555 (or 1-555-555-5555) so the
// user sees the canonical shape as they type. Caret is left at the end since
// users rarely edit mid-string on mobile.
function formatPhone(s) {
  const d = phoneDigits(s).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d[0]}-${d.slice(1, 4)}-${d.slice(4, 7)}-${d.slice(7)}`;
}

const CURRENT_YEAR = new Date().getFullYear();
function isValidYear(s) {
  if (!s) return true;
  if (!/^\d{4}$/.test(s)) return false;
  const y = +s;
  return y >= 1950 && y <= CURRENT_YEAR + 2;
}

function setFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  const err = document.getElementById('error-' + inputId);
  if (!input) return;
  if (message) {
    input.classList.add('error');
    input.setAttribute('aria-invalid', 'true');
    if (err) {
      err.textContent = message;
      err.hidden = false;
    }
  } else {
    input.classList.remove('error');
    input.removeAttribute('aria-invalid');
    if (err) {
      err.textContent = '';
      err.hidden = true;
    }
  }
}

function clearAllFieldErrors() {
  ['customer-name', 'customer-phone', 'customer-email', 'vehicle-year']
    .forEach(id => setFieldError(id, ''));
}

const saveToStorage = () =>
  localStorage.setItem('vm_estimates', JSON.stringify(state.estimates));

// === NAVIGATION ===
function showView(name) {
  if (name !== 'parts') closeSelectedSheet({ animate: false });
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
              <button class="estimate-card-menu" data-id="${idAttr}" type="button" aria-label="More actions" aria-haspopup="true" aria-expanded="false">&#8943;</button>
            </div>
          </div>
        </div>
      `;
    }).join('')}
  `;
}

// === NEW / LOAD ESTIMATE ===
function resetState() {
  state.currentId = null;
  state.customer = {};
  state.vehicle = {};
  state.selected = new Set();
  state.customParts = [];
  state.sharedAt = null;
  state.status = 'draft';
  state.notes = '';
  document.getElementById('form-customer').reset();
  document.querySelector('input[name="wheelbase"][value="144"]').checked = true;
  clearAllFieldErrors();
}

function startNew() {
  resetState();
  showView('customer');
}

function clearEstimate() {
  resetState();
  showView('home');
}

function loadEstimate(id) {
  const est = state.estimates.find(e => e.id === id);
  if (!est) return;

  state.currentId = id;
  state.customer = { ...est.customer };
  state.vehicle = { ...est.vehicle };
  state.selected = new Set(est.selectedParts);
  state.customParts = (est.customParts || []).map(cp => ({ ...cp }));
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
  state.customParts = (src.customParts || []).map(cp => ({ ...cp }));
  state.sharedAt = null;
  state.status = 'draft';
  state.notes = '';

  populateCustomerForm(src);
  showView('customer');
}

function populateCustomerForm(est) {
  document.getElementById('customer-name').value = est.customer.name || '';
  document.getElementById('customer-phone').value = formatPhone(est.customer.phone || '');
  document.getElementById('customer-email').value = est.customer.email || '';
  document.getElementById('vehicle-year').value = est.vehicle.year || '';
  document.getElementById('vehicle-make').value = est.vehicle.make || '';
  document.getElementById('vehicle-model').value = est.vehicle.model || '';

  const wb = est.vehicle.wheelbase || 'both';
  const wbEl = document.querySelector(`input[name="wheelbase"][value="${wb}"]`);
  if (wbEl) wbEl.checked = true;

  clearAllFieldErrors();
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
  closeSelectedSheet({ animate: false });
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

  if (isSelectedSheetOpen()) {
    if (state.selected.size === 0) closeSelectedSheet();
    else renderSelectedSheet();
  }
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
  const catalogCount = state.selected.size;
  const catalogTotal = [...state.selected].reduce((sum, id) => {
    const p = PRODUCTS.find(prod => prod.id === id);
    return sum + (p ? p.installedPrice : 0);
  }, 0);
  const customCount = state.customParts.length;
  const customTotal = state.customParts.reduce((sum, cp) => sum + cp.price, 0);
  const count = catalogCount + customCount;
  const total = catalogTotal + customTotal;

  document.getElementById('selected-count').textContent =
    count === 0 ? '0 items selected' : `${count} item${count !== 1 ? 's' : ''} selected`;
  document.getElementById('selected-total').textContent = fmt(total);
  const isEmpty = count === 0;
  document.getElementById('btn-view-estimate').disabled = isEmpty;

  const summary = document.getElementById('footer-summary');
  if (summary) summary.setAttribute('aria-disabled', isEmpty ? 'true' : 'false');
}

// === SELECTED ITEMS SHEET (parts view) ===
function renderSelectedSheet() {
  const content = document.getElementById('selected-sheet-content');
  if (!content) return;

  const products = getSelectedProducts();
  const grouped = {};
  products.forEach(p => {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  });

  let html = CATEGORIES.filter(cat => grouped[cat]).map(cat => `
    <div class="selected-sheet-category">${esc(cat)}</div>
    ${grouped[cat].map(p => `
      <div class="selected-sheet-row">
        <span class="selected-sheet-name">${esc(p.name)}</span>
        <span class="selected-sheet-price">${p.installedPrice > 0 ? fmt(p.installedPrice) : 'POA'}</span>
        <button class="selected-sheet-remove" type="button" data-part-id="${esc(p.id)}" aria-label="Remove ${esc(p.name)}">&times;</button>
      </div>
    `).join('')}
  `).join('');

  if (state.customParts.length > 0) {
    html += `<div class="selected-sheet-category">Custom Items</div>`;
    html += state.customParts.map(cp => `
      <div class="selected-sheet-row">
        <span class="selected-sheet-name">${esc(cp.name)}</span>
        <span class="selected-sheet-price">${fmt(cp.price)}</span>
        <button class="selected-sheet-remove" type="button" data-custom-id="${esc(cp.id)}" aria-label="Remove ${esc(cp.name)}">&times;</button>
      </div>
    `).join('');
  }

  content.innerHTML = html;
}

function isSelectedSheetOpen() {
  const sheet = document.getElementById('selected-sheet');
  return !!(sheet && sheet.classList.contains('open'));
}

function openSelectedSheet() {
  const sheet = document.getElementById('selected-sheet');
  const summary = document.getElementById('footer-summary');
  if (!sheet) return;
  renderSelectedSheet();
  sheet.hidden = false;
  sheet.setAttribute('aria-hidden', 'false');
  // Force reflow so the transition runs the first time it opens.
  void sheet.offsetWidth;
  sheet.classList.add('open');
  if (summary) summary.setAttribute('aria-expanded', 'true');
}

let selectedSheetHideTimer = null;
function closeSelectedSheet({ animate = true } = {}) {
  const sheet = document.getElementById('selected-sheet');
  const summary = document.getElementById('footer-summary');
  if (!sheet) return;
  clearTimeout(selectedSheetHideTimer);
  sheet.classList.remove('open');
  sheet.setAttribute('aria-hidden', 'true');
  if (summary) summary.setAttribute('aria-expanded', 'false');
  if (!animate) {
    sheet.hidden = true;
    return;
  }
  selectedSheetHideTimer = setTimeout(() => {
    if (!sheet.classList.contains('open')) sheet.hidden = true;
  }, 240);
}

function toggleSelectedSheet() {
  if (state.selected.size === 0 && state.customParts.length === 0) return;
  if (isSelectedSheetOpen()) closeSelectedSheet();
  else openSelectedSheet();
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
  const allItems = getAllSelectedItems();
  const total = calcTotal(allItems);
  const c = state.customer;
  const v = state.vehicle;

  const vehicleStr = [v.year, v.make, v.model, v.wheelbase && v.wheelbase !== 'both' ? v.wheelbase + '"' : '']
    .filter(Boolean).join(' ') || 'Not specified';

  const existingEst = state.currentId ? state.estimates.find(e => e.id === state.currentId) : null;
  const dateStr = new Date(existingEst?.createdAt ?? Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const catalogItems = allItems.filter(p => !p.isCustom);
  const customItems = allItems.filter(p => p.isCustom);
  const grouped = {};
  catalogItems.forEach(p => {
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

    ${CATEGORIES.filter(cat => grouped[cat]).map(cat => {
      const items = grouped[cat];
      const subtotal = items.reduce((s, p) => s + p.installedPrice, 0);
      const hasPOA = items.some(p => p.installedPrice <= 0);
      const showSubtotal = items.length > 1;
      return `
      <div class="estimate-section">
        <div class="estimate-section-label">${esc(cat)}</div>
        ${items.map(p => `
          <div class="estimate-row">
            <span class="estimate-row-label">${esc(p.name)}</span>
            <span class="estimate-row-value price">${p.installedPrice > 0 ? fmt(p.installedPrice) : 'POA'}</span>
          </div>
        `).join('')}
        ${showSubtotal ? `
          <div class="estimate-row subtotal-row">
            <span class="estimate-row-label">Subtotal${hasPOA ? '<span class="poa-mark">*</span>' : ''}</span>
            <span class="estimate-row-value price">${fmt(subtotal)}</span>
          </div>
        ` : ''}
      </div>
    `;}).join('')}

    ${customItems.length > 0 ? `
      <div class="estimate-section">
        <div class="estimate-section-label">Custom Items</div>
        ${customItems.map(p => `
          <div class="estimate-row">
            <span class="estimate-row-label">${esc(p.name)}${p.notes ? `<br><span style="font-size:11px;color:var(--text-muted)">${esc(p.notes)}</span>` : ''}</span>
            <span class="estimate-row-value price">${fmt(p.installedPrice)}</span>
          </div>
        `).join('')}
        ${customItems.length > 1 ? `
          <div class="estimate-row subtotal-row">
            <span class="estimate-row-label">Subtotal</span>
            <span class="estimate-row-value price">${fmt(customItems.reduce((s, p) => s + p.installedPrice, 0))}</span>
          </div>
        ` : ''}
      </div>
    ` : ''}

    <div class="estimate-total-block">
      <span class="estimate-total-label">Estimated Total</span>
      <span class="estimate-total-value">${fmt(total)}</span>
    </div>

    <p class="estimate-disclaimer">
      This is an estimate only. Final pricing subject to vehicle inspection and part availability.
      Installed prices include parts and labor. POA items are quoted separately and excluded from totals.
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
function encodeEstimateForURL(est) {
  const c = est.customer || {};
  const customer = { name: c.name };
  if (c.phone) customer.phone = c.phone;
  if (c.email) customer.email = c.email;

  const payload = {
    v: 1,
    customer,
    vehicle: est.vehicle,
    selectedParts: est.selectedParts,
    total: est.total,
    createdAt: (est.createdAt || '').split('T')[0] || est.createdAt,
  };
  const customParts = est.customParts || [];
  if (customParts.length) payload.customParts = customParts;

  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const b64 = btoa(String.fromCharCode(...bytes));
  return BASE_URL + '/view.html#' + b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function shareEstimate(est) {
  const url = encodeEstimateForURL(est);
  markShared(est.id);

  const customerName = est.customer?.name || 'Customer';
  if (navigator.share) {
    navigator.share({
      title: `${customerName} — Van Mart Estimate`,
      text: `${customerName} — Van Mart Estimate`,
      url
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url).then(() => {
      const btn = document.getElementById('btn-share');
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = 'Link Copied!';
        setTimeout(() => { btn.textContent = orig; }, 2500);
      }
    }).catch(() => alert('Could not copy link. URL:\n' + url));
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

// === CONFIRM SHEET ===
let confirmSheetCallback = null;

function showConfirmSheet(message, onConfirm) {
  const sheet = document.getElementById('confirm-sheet');
  const msgEl = document.getElementById('confirm-sheet-message');
  if (!sheet || !msgEl) return;
  confirmSheetCallback = onConfirm;
  msgEl.textContent = message;
  sheet.hidden = false;
  sheet.setAttribute('aria-hidden', 'false');
  void sheet.offsetWidth;
  sheet.classList.add('open');
}

function hideConfirmSheet() {
  const sheet = document.getElementById('confirm-sheet');
  if (!sheet) return;
  confirmSheetCallback = null;
  sheet.classList.remove('open');
  sheet.setAttribute('aria-hidden', 'true');
  setTimeout(() => {
    if (!sheet.classList.contains('open')) sheet.hidden = true;
  }, 240);
}

// === SAVE DRAFT HELPERS ===
function captureCustomerForm() {
  const name = document.getElementById('customer-name').value.trim();
  if (!name) {
    setFieldError('customer-name', 'Name is required');
    document.getElementById('customer-name').focus();
    return false;
  }
  const phone = document.getElementById('customer-phone').value.trim();
  const email = document.getElementById('customer-email').value.trim();
  state.customer = {
    name,
    phone: phone ? formatPhone(phone) : '',
    email: email.toLowerCase()
  };
  state.vehicle = {
    year: document.getElementById('vehicle-year').value.trim(),
    make: document.getElementById('vehicle-make').value.trim(),
    model: document.getElementById('vehicle-model').value.trim(),
    wheelbase: document.querySelector('input[name="wheelbase"]:checked')?.value || 'both'
  };
  return true;
}

function flashSaved(btnEl) {
  if (!btnEl) return;
  const orig = btnEl.textContent;
  btnEl.textContent = 'Saved!';
  btnEl.disabled = true;
  setTimeout(() => {
    btnEl.textContent = orig;
    btnEl.disabled = false;
  }, 2000);
}

// === CUSTOM PARTS ===
function getAllSelectedItems() {
  const standard = getSelectedProducts();
  const custom = state.customParts.map(cp => ({
    id: cp.id,
    name: cp.name,
    category: 'Custom',
    installedPrice: cp.price,
    notes: cp.notes || '',
    isCustom: true
  }));
  return [...standard, ...custom];
}

function renderCustomPartsList() {
  const container = document.getElementById('custom-parts-list');
  if (!container) return;
  if (state.customParts.length === 0) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = state.customParts.map(cp => `
    <div class="custom-part-item">
      <div class="custom-part-info">
        <div class="custom-part-label">Custom</div>
        <div class="custom-part-name">${esc(cp.name)}</div>
        ${cp.notes ? `<div class="custom-part-note">${esc(cp.notes)}</div>` : ''}
      </div>
      <span class="custom-part-price">${fmt(cp.price)}</span>
      <button class="custom-part-remove" type="button" data-custom-id="${esc(cp.id)}" aria-label="Remove ${esc(cp.name)}">&times;</button>
    </div>
  `).join('');
}

function addCustomPart(name, price, notes) {
  const cp = { id: 'custom-' + uid(), name: name.trim(), price: parseFloat(price) || 0, notes: (notes || '').trim() };
  state.customParts.push(cp);
  renderCustomPartsList();
  updateFooter();
  if (isSelectedSheetOpen()) renderSelectedSheet();
}

function removeCustomPart(id) {
  state.customParts = state.customParts.filter(cp => cp.id !== id);
  renderCustomPartsList();
  updateFooter();
  if (isSelectedSheetOpen()) {
    if (state.selected.size === 0 && state.customParts.length === 0) closeSelectedSheet();
    else renderSelectedSheet();
  }
}

function openCustomPartSheet() {
  const sheet = document.getElementById('custom-part-sheet');
  if (!sheet) return;
  sheet.hidden = false;
  sheet.setAttribute('aria-hidden', 'false');
  void sheet.offsetWidth;
  sheet.classList.add('open');
  document.getElementById('custom-part-name')?.focus();
}

function closeCustomPartSheet() {
  const sheet = document.getElementById('custom-part-sheet');
  if (!sheet) return;
  sheet.classList.remove('open');
  sheet.setAttribute('aria-hidden', 'true');
  setTimeout(() => {
    if (!sheet.classList.contains('open')) sheet.hidden = true;
  }, 240);
}

// === SAVE ===
function saveEstimate() {
  const products = getAllSelectedItems();
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
    customParts: state.customParts.map(cp => ({ ...cp })),
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

  flashSaved(document.getElementById('btn-save'));
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
  const customParts = (est.customParts || []).map(cp => ({ id: cp.id, name: cp.name, category: 'Custom', price: cp.price }));
  const allParts = [
    ...products.map(p => ({ id: p.id, name: p.name, category: p.category, price: p.installedPrice })),
    ...customParts
  ];
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
    partCount: allParts.length,
    total: est.total,
    parts: allParts
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
    // Kebab menu reveal — gives non-touch users (desktop, mouse, keyboard)
    // access to the actions that swipe-to-reveal exposes on touch devices.
    const menu = e.target.closest('.estimate-card-menu');
    if (menu) {
      e.stopPropagation();
      const row = menu.closest('.estimate-card-row');
      const isOpen = row.classList.contains('open');
      closeAllRows();
      if (!isOpen) {
        row.classList.add('open');
        menu.setAttribute('aria-expanded', 'true');
      }
      return;
    }
    const row = e.target.closest('.estimate-card-row');
    if (!row) return;
    if (row.classList.contains('open')) {
      row.classList.remove('open');
      const m = row.querySelector('.estimate-card-menu');
      if (m) m.setAttribute('aria-expanded', 'false');
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
    document.querySelectorAll('.estimate-card-row.open').forEach(r => {
      r.classList.remove('open');
      const m = r.querySelector('.estimate-card-menu');
      if (m) m.setAttribute('aria-expanded', 'false');
    });
  }

  // Dismiss an open row when the user clicks anywhere outside the home list,
  // or presses Escape — so the kebab-menu reveal feels like a normal popover.
  document.addEventListener('click', e => {
    if (!document.querySelector('.estimate-card-row.open')) return;
    if (e.target.closest('#estimates-list')) return;
    closeAllRows();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (document.getElementById('confirm-sheet')?.classList.contains('open')) {
        hideConfirmSheet();
      } else if (document.querySelector('.estimate-card-row.open')) {
        closeAllRows();
      }
    }
  });

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
      const m = swipe.row.querySelector('.estimate-card-menu');
      if (m) m.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
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

  // Clear buttons (all 3 views)
  ['btn-clear-customer', 'btn-clear-parts', 'btn-clear-estimate'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () =>
      showConfirmSheet('Are you sure you want to clear this estimate?', clearEstimate)
    );
  });

  // Confirm sheet
  document.getElementById('confirm-sheet-cancel').addEventListener('click', hideConfirmSheet);
  document.getElementById('confirm-sheet-ok').addEventListener('click', () => {
    if (confirmSheetCallback) confirmSheetCallback();
    hideConfirmSheet();
  });
  document.getElementById('confirm-sheet-backdrop').addEventListener('click', hideConfirmSheet);

  // Save Draft — customer view
  document.getElementById('btn-draft-customer').addEventListener('click', () => {
    if (!captureCustomerForm()) return;
    saveEstimate();
    flashSaved(document.getElementById('btn-draft-customer'));
  });

  // Customer form
  const phoneInput = document.getElementById('customer-phone');
  phoneInput.addEventListener('input', e => {
    e.target.value = formatPhone(e.target.value);
    if (e.target.classList.contains('error')) setFieldError('customer-phone', '');
  });

  // Clear inline error as soon as the user starts correcting the field.
  ['customer-name', 'customer-email', 'vehicle-year'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => {
      if (el.classList.contains('error')) setFieldError(id, '');
    });
  });

  document.getElementById('form-customer').addEventListener('submit', e => {
    e.preventDefault();
    clearAllFieldErrors();

    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const email = document.getElementById('customer-email').value.trim();
    const year = document.getElementById('vehicle-year').value.trim();

    let firstInvalid = null;
    const fail = (id, msg) => {
      setFieldError(id, msg);
      if (!firstInvalid) firstInvalid = id;
    };

    if (!name) fail('customer-name', 'Name is required');
    if (phone && !isValidPhone(phone)) fail('customer-phone', 'Enter a 10-digit phone number');
    if (email && !isValidEmail(email)) fail('customer-email', 'Enter a valid email address');
    if (year && !isValidYear(year)) fail('vehicle-year', `Year must be 1950–${CURRENT_YEAR + 2}`);

    if (firstInvalid) {
      const el = document.getElementById(firstInvalid);
      el.focus();
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    state.customer = {
      name,
      phone: phone ? formatPhone(phone) : '',
      email: email.toLowerCase()
    };
    state.vehicle = {
      year,
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

  // Save Draft — parts view
  document.getElementById('btn-draft-parts').addEventListener('click', () => {
    saveEstimate();
    flashSaved(document.getElementById('btn-draft-parts'));
  });

  // Custom part sheet
  document.getElementById('btn-add-custom').addEventListener('click', openCustomPartSheet);
  document.getElementById('custom-part-sheet-close').addEventListener('click', closeCustomPartSheet);

  document.getElementById('form-custom-part').addEventListener('submit', e => {
    e.preventDefault();
    const nameEl = document.getElementById('custom-part-name');
    const priceEl = document.getElementById('custom-part-price');
    const notesEl = document.getElementById('custom-part-notes');
    const name = nameEl.value.trim();
    const priceRaw = priceEl.value.trim().replace(/[^0-9.]/g, '');
    const price = parseFloat(priceRaw);

    let valid = true;
    if (!name) { setFieldError('custom-part-name', 'Name is required'); valid = false; }
    if (isNaN(price) || price < 0) { setFieldError('custom-part-price', 'Enter a valid price'); valid = false; }
    if (!valid) return;

    setFieldError('custom-part-name', '');
    setFieldError('custom-part-price', '');

    addCustomPart(name, price, notesEl.value.trim());
    closeCustomPartSheet();
    document.getElementById('form-custom-part').reset();
  });

  // Remove custom part from custom-parts-list (delegated)
  document.getElementById('custom-parts-list').addEventListener('click', e => {
    const btn = e.target.closest('.custom-part-remove');
    if (btn) removeCustomPart(btn.dataset.customId);
  });

  // Selected-items sheet (parts view)
  const footerSummary = document.getElementById('footer-summary');
  if (footerSummary) {
    footerSummary.addEventListener('click', toggleSelectedSheet);
    footerSummary.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleSelectedSheet();
      }
    });
  }
  const sheetClose = document.getElementById('selected-sheet-close');
  if (sheetClose) sheetClose.addEventListener('click', () => closeSelectedSheet());
  const sheetContent = document.getElementById('selected-sheet-content');
  if (sheetContent) {
    sheetContent.addEventListener('click', e => {
      const remove = e.target.closest('.selected-sheet-remove');
      if (!remove) return;
      if (remove.dataset.partId) togglePart(remove.dataset.partId);
      else if (remove.dataset.customId) removeCustomPart(remove.dataset.customId);
    });
  }

  // View estimate
  document.getElementById('btn-view-estimate').addEventListener('click', () => {
    closeSelectedSheet({ animate: false });
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
  document.getElementById('btn-print').addEventListener('click', () => window.print());

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
