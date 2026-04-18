'use strict';

// === STATE ===
const state = {
  currentId: null,
  customer: {},
  vehicle: {},
  selected: new Set(),
  estimates: JSON.parse(localStorage.getItem('vm_estimates') || '[]')
};

// === UTILS ===
const fmt = n => (n > 0)
  ? '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  : '$0.00';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const saveToStorage = () =>
  localStorage.setItem('vm_estimates', JSON.stringify(state.estimates));

// === NAVIGATION ===
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  window.scrollTo(0, 0);
}

// === HOME ===
function renderHome() {
  const list = document.getElementById('estimates-list');
  const empty = document.getElementById('estimates-empty');

  if (state.estimates.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  const sorted = state.estimates.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  list.innerHTML = `
    <div class="home-section-label">Recent Estimates</div>
    ${sorted.map(est => {
      const v = est.vehicle;
      const vehicleStr = [v.year, v.make, v.model, v.wheelbase && v.wheelbase !== 'both' ? v.wheelbase + '"' : '']
        .filter(Boolean).join(' ') || 'Vehicle not specified';
      const date = new Date(est.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `
        <div class="estimate-card" data-id="${est.id}">
          <div class="estimate-card-info">
            <div class="estimate-card-name">${est.customer.name}</div>
            <div class="estimate-card-vehicle">${vehicleStr}</div>
            <div class="estimate-card-date">${date}</div>
          </div>
          <div class="estimate-card-right">
            <div class="estimate-card-total">${fmt(est.total)}</div>
            <div class="estimate-card-arrow">&#8250;</div>
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

  document.getElementById('customer-name').value = est.customer.name || '';
  document.getElementById('customer-phone').value = est.customer.phone || '';
  document.getElementById('customer-email').value = est.customer.email || '';
  document.getElementById('vehicle-year').value = est.vehicle.year || '';
  document.getElementById('vehicle-make').value = est.vehicle.make || '';
  document.getElementById('vehicle-model').value = est.vehicle.model || '';

  const wb = est.vehicle.wheelbase || 'both';
  const wbEl = document.querySelector(`input[name="wheelbase"][value="${wb}"]`);
  if (wbEl) wbEl.checked = true;

  showView('customer');
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
    return `
      <div class="category-section" data-category="${cat}">
        <div class="category-header">
          <div class="category-header-left">
            <span class="category-name">${cat}</span>
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
    <div class="part-item ${sel ? 'selected' : ''}" data-part-id="${p.id}">
      <div class="part-checkbox">${sel ? '&#10003;' : ''}</div>
      <div class="part-info">
        <div class="part-name">${p.name}</div>
        ${p.notes ? `<div class="part-note">${p.notes}</div>` : ''}
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

  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const grouped = {};
  products.forEach(p => {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  });

  const html = `
    <div class="estimate-hero">
      <div class="estimate-hero-brand">The Van Mart</div>
      <div class="estimate-hero-sub">Service Estimate</div>
    </div>

    <div class="estimate-section">
      <div class="estimate-section-label">Customer</div>
      <div class="estimate-row">
        <span class="estimate-row-label">Name</span>
        <span class="estimate-row-value">${c.name}</span>
      </div>
      ${c.phone ? `<div class="estimate-row"><span class="estimate-row-label">Phone</span><span class="estimate-row-value">${c.phone}</span></div>` : ''}
      ${c.email ? `<div class="estimate-row"><span class="estimate-row-label">Email</span><span class="estimate-row-value">${c.email}</span></div>` : ''}
    </div>

    <div class="estimate-section">
      <div class="estimate-section-label">Vehicle</div>
      <div class="estimate-row">
        <span class="estimate-row-label">Vehicle</span>
        <span class="estimate-row-value">${vehicleStr}</span>
      </div>
      <div class="estimate-row">
        <span class="estimate-row-label">Date</span>
        <span class="estimate-row-value">${dateStr}</span>
      </div>
    </div>

    ${CATEGORIES.filter(cat => grouped[cat]).map(cat => `
      <div class="estimate-section">
        <div class="estimate-section-label">${cat}</div>
        ${grouped[cat].map(p => `
          <div class="estimate-row">
            <span class="estimate-row-label">${p.name}</span>
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
  `;

  document.getElementById('estimate-content').innerHTML = html;
  document.getElementById('btn-save').textContent = state.currentId ? 'Update' : 'Save';
}

// === SHARE ===
function shareEstimate() {
  const products = getSelectedProducts();
  const total = calcTotal(products);
  const c = state.customer;
  const v = state.vehicle;

  const vehicleStr = [v.year, v.make, v.model, v.wheelbase && v.wheelbase !== 'both' ? v.wheelbase + '"' : '']
    .filter(Boolean).join(' ');

  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

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

  if (navigator.share) {
    navigator.share({
      title: `Van Mart Estimate - ${c.name}`,
      text: lines
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(lines).then(() => {
      const btn = document.getElementById('btn-share');
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 2000);
    }).catch(() => alert('Could not copy. Please screenshot the estimate.'));
  }
}

// === SAVE ===
function saveEstimate() {
  const products = getSelectedProducts();
  const total = calcTotal(products);

  const now = new Date().toISOString();
  const est = {
    id: state.currentId || uid(),
    createdAt: state.currentId
      ? (state.estimates.find(e => e.id === state.currentId)?.createdAt || now)
      : now,
    updatedAt: now,
    customer: { ...state.customer },
    vehicle: { ...state.vehicle },
    selectedParts: [...state.selected],
    total
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

  const btn = document.getElementById('btn-save');
  btn.textContent = 'Saved!';
  setTimeout(() => { btn.textContent = state.currentId ? 'Update' : 'Save'; }, 2000);
}

// === EVENT LISTENERS ===
document.addEventListener('DOMContentLoaded', () => {

  // Home
  document.getElementById('btn-new-estimate').addEventListener('click', startNew);

  document.getElementById('estimates-list').addEventListener('click', e => {
    const card = e.target.closest('.estimate-card');
    if (card) loadEstimate(card.dataset.id);
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
  document.getElementById('btn-share').addEventListener('click', shareEstimate);
  document.getElementById('btn-save').addEventListener('click', saveEstimate);

  // Init
  renderHome();
  showView('home');
});
