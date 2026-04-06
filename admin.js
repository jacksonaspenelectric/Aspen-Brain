/**
 * Aspen Brain – Admin Panel JavaScript
 * Handles: login, settings, services CRUD, strategies, estimate builder
 * All data persisted to localStorage – no server required.
 */

'use strict';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

// NOTE: Password is intentionally hard-coded per spec (single-owner, no server).
// For multi-user deployments replace with server-side authentication.
const ADMIN_PASSWORD = 'aspen2026';
// NOTE: localStorage auth is sufficient for single-owner local use per spec.
const LS_AUTH_KEY    = 'aspenBrain_auth';
const LS_DATA_KEY    = 'aspenBrain_data';

/** Default data pre-populated with sample services */
const DEFAULT_DATA = {
  settings: {
    shopRate:     120,
    tripFee:      75,
    permitFee:    0,
    companyName:  'Aspen Electrical Services',
    companyEmail: 'contact@aspenelectric.com',
  },
  strategies: {
    economy:  30,
    standard: 45,
    premium:  60,
  },
  services: [
    { id: 1, name: 'EV Charger Install',             atCost: 450,  laborHours: 3,    category: 'Major' },
    { id: 2, name: 'Panel Upgrade (100A to 150A)',   atCost: 800,  laborHours: 5,    category: 'Major' },
    { id: 3, name: 'Recessed Lighting (per light)',  atCost: 35,   laborHours: 0.5,  category: 'Small' },
    { id: 4, name: 'Smart Switch Install (per)',     atCost: 45,   laborHours: 0.25, category: 'Small' },
    { id: 5, name: 'Surge Protector Install',        atCost: 120,  laborHours: 1,    category: 'Small' },
  ],
};

// ─── STATE ─────────────────────────────────────────────────────────────────────

let appData = {};          // settings / strategies / services
let selectedStrategy = 'standard';
let currentView      = 'client';   // 'client' | 'admin'
let selectedServices = {};         // { id: qty }
let nextId           = 6;          // auto-increment for service IDs

// ─── LOCAL STORAGE ─────────────────────────────────────────────────────────────

function loadData() {
  try {
    const raw = localStorage.getItem(LS_DATA_KEY);
    if (raw) {
      appData = JSON.parse(raw);
      // Recalculate nextId to avoid ID collisions
      if (appData.services && appData.services.length > 0) {
        nextId = Math.max(...appData.services.map(s => s.id)) + 1;
      }
    } else {
      appData = JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
  } catch {
    appData = JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}

function saveData() {
  localStorage.setItem(LS_DATA_KEY, JSON.stringify(appData));
}

// ─── AUTH ──────────────────────────────────────────────────────────────────────

function isLoggedIn() {
  return localStorage.getItem(LS_AUTH_KEY) === '1';
}

function login(password) {
  if (password === ADMIN_PASSWORD) {
    localStorage.setItem(LS_AUTH_KEY, '1');
    return true;
  }
  return false;
}

function logout() {
  localStorage.removeItem(LS_AUTH_KEY);
}

// ─── TOAST ─────────────────────────────────────────────────────────────────────

let toastTimer = null;

function showToast(msg, type = 'success') {
  const toast    = document.getElementById('toast');
  const msgEl    = document.getElementById('toast-msg');
  const iconEl   = document.getElementById('toast-icon');

  msgEl.textContent  = msg;
  iconEl.textContent = type === 'success' ? '✅' : '❌';
  toast.className    = `show toast-${type}`;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.className = '';
  }, 3000);
}

// ─── NAVIGATION ────────────────────────────────────────────────────────────────

function switchTab(tabName) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-nav button').forEach(b => b.classList.remove('active'));

  document.getElementById(`tab-${tabName}`).classList.add('active');
  document.querySelector(`.sidebar-nav button[data-tab="${tabName}"]`).classList.add('active');

  if (tabName === 'estimate') renderServiceSelectList();
}

// ─── SETTINGS ──────────────────────────────────────────────────────────────────

function loadSettingsForm() {
  const s = appData.settings;
  document.getElementById('s-company-name').value  = s.companyName  || '';
  document.getElementById('s-company-email').value = s.companyEmail || '';
  document.getElementById('s-shop-rate').value     = s.shopRate     ?? 120;
  document.getElementById('s-trip-fee').value      = s.tripFee      ?? 75;
  document.getElementById('s-permit-fee').value    = s.permitFee    ?? 0;
}

function saveSettings() {
  appData.settings = {
    companyName:  document.getElementById('s-company-name').value.trim(),
    companyEmail: document.getElementById('s-company-email').value.trim(),
    shopRate:     parseFloat(document.getElementById('s-shop-rate').value)  || 0,
    tripFee:      parseFloat(document.getElementById('s-trip-fee').value)   || 0,
    permitFee:    parseFloat(document.getElementById('s-permit-fee').value) || 0,
  };
  saveData();
  showToast('Settings saved!');
}

// ─── STRATEGIES ────────────────────────────────────────────────────────────────

function loadStrategiesForm() {
  const st = appData.strategies;
  document.getElementById('str-economy').value  = st.economy  ?? 30;
  document.getElementById('str-standard').value = st.standard ?? 45;
  document.getElementById('str-premium').value  = st.premium  ?? 60;
}

function saveStrategies() {
  const economy  = parseFloat(document.getElementById('str-economy').value);
  const standard = parseFloat(document.getElementById('str-standard').value);
  const premium  = parseFloat(document.getElementById('str-premium').value);

  if ([economy, standard, premium].some(v => isNaN(v) || v <= 0)) {
    showToast('Please enter valid percentages (> 0).', 'error');
    return;
  }

  appData.strategies = { economy, standard, premium };
  saveData();
  showToast('Strategies saved!');
  recalcEstimate();
}

// ─── SERVICES ──────────────────────────────────────────────────────────────────

function renderServicesTable() {
  const tbody   = document.getElementById('services-tbody');
  const emptyEl = document.getElementById('services-empty');
  const services = appData.services;

  if (!services || services.length === 0) {
    tbody.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');

  tbody.innerHTML = services.map((svc, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><strong>${escapeHtml(svc.name)}</strong></td>
      <td><span class="category-badge cat-${svc.category.toLowerCase()}">${escapeHtml(svc.category)}</span></td>
      <td>$${Number(svc.atCost).toFixed(2)}</td>
      <td>${svc.laborHours}</td>
      <td class="action-btns">
        <button class="btn btn-edit btn-sm" data-id="${svc.id}" data-action="edit">✏️ Edit</button>
        <button class="btn btn-red  btn-sm" data-id="${svc.id}" data-action="delete">🗑️ Del</button>
      </td>
    </tr>
  `).join('');
}

function addService() {
  const name      = document.getElementById('svc-name').value.trim();
  const category  = document.getElementById('svc-category').value;
  const atCost    = parseFloat(document.getElementById('svc-at-cost').value);
  const laborHours= parseFloat(document.getElementById('svc-labor').value);

  if (!name) {
    showToast('Please enter a service name.', 'error');
    return;
  }
  if (isNaN(atCost) || atCost < 0) {
    showToast('Please enter a valid at-cost amount.', 'error');
    return;
  }
  if (isNaN(laborHours) || laborHours < 0) {
    showToast('Please enter valid labor hours.', 'error');
    return;
  }

  appData.services.push({ id: nextId++, name, category, atCost, laborHours });
  saveData();
  renderServicesTable();
  showToast('Service added!');

  // Clear form
  document.getElementById('svc-name').value    = '';
  document.getElementById('svc-at-cost').value = '';
  document.getElementById('svc-labor').value   = '';
}

function deleteService(id) {
  appData.services = appData.services.filter(s => s.id !== id);
  delete selectedServices[id];
  saveData();
  renderServicesTable();
  recalcEstimate();
  showToast('Service deleted.');
}

function openEditModal(id) {
  const svc = appData.services.find(s => s.id === id);
  if (!svc) return;

  document.getElementById('edit-svc-id').value       = svc.id;
  document.getElementById('edit-svc-name').value     = svc.name;
  document.getElementById('edit-svc-category').value = svc.category;
  document.getElementById('edit-svc-at-cost').value  = svc.atCost;
  document.getElementById('edit-svc-labor').value    = svc.laborHours;

  document.getElementById('edit-modal').classList.add('open');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('open');
}

function saveEditedService() {
  const id       = parseInt(document.getElementById('edit-svc-id').value, 10);
  const name     = document.getElementById('edit-svc-name').value.trim();
  const category = document.getElementById('edit-svc-category').value;
  const atCost   = parseFloat(document.getElementById('edit-svc-at-cost').value);
  const laborHours = parseFloat(document.getElementById('edit-svc-labor').value);

  if (!name) { showToast('Service name is required.', 'error'); return; }
  if (isNaN(atCost) || atCost < 0) { showToast('Invalid at-cost amount.', 'error'); return; }
  if (isNaN(laborHours) || laborHours < 0) { showToast('Invalid labor hours.', 'error'); return; }

  const idx = appData.services.findIndex(s => s.id === id);
  if (idx === -1) return;

  appData.services[idx] = { id, name, category, atCost, laborHours };
  saveData();
  closeEditModal();
  renderServicesTable();
  renderServiceSelectList();
  recalcEstimate();
  showToast('Service updated!');
}

// ─── ESTIMATE BUILDER ──────────────────────────────────────────────────────────

function renderServiceSelectList() {
  const container = document.getElementById('service-select-list');
  const emptyEl   = document.getElementById('service-select-empty');
  const services  = appData.services;

  if (!services || services.length === 0) {
    container.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');

  container.innerHTML = services.map(svc => {
    const qty     = selectedServices[svc.id] || 1;
    const checked = selectedServices.hasOwnProperty(svc.id);
    return `
      <div class="service-select-item ${checked ? 'selected' : ''}" data-id="${svc.id}">
        <input type="checkbox" data-id="${svc.id}" ${checked ? 'checked' : ''}>
        <div class="service-select-info">
          <div class="service-select-name">${escapeHtml(svc.name)}</div>
          <div class="service-select-meta">
            ${svc.category} · $${Number(svc.atCost).toFixed(2)} material · ${svc.laborHours} hrs labor
          </div>
        </div>
        <div class="service-qty-wrap">
          <label>Qty</label>
          <input type="number" min="1" step="1" value="${qty}" data-id="${svc.id}" class="svc-qty-input" ${checked ? '' : 'disabled'}>
        </div>
      </div>
    `;
  }).join('');

  // Attach events
  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', onServiceCheckChange);
  });

  container.querySelectorAll('.svc-qty-input').forEach(inp => {
    inp.addEventListener('input', onQtyChange);
  });

  container.querySelectorAll('.service-select-item').forEach(item => {
    item.addEventListener('click', e => {
      if (e.target.tagName === 'INPUT') return; // let checkbox/number handle itself
      const cb = item.querySelector('input[type="checkbox"]');
      cb.checked = !cb.checked;
      cb.dispatchEvent(new Event('change'));
    });
  });
}

function onServiceCheckChange(e) {
  const id = parseInt(e.target.dataset.id, 10);
  if (e.target.checked) {
    selectedServices[id] = selectedServices[id] || 1;
  } else {
    delete selectedServices[id];
  }
  // Sync UI
  const item   = document.querySelector(`.service-select-item[data-id="${id}"]`);
  const qtyInp = document.querySelector(`.svc-qty-input[data-id="${id}"]`);
  if (item)   item.classList.toggle('selected', e.target.checked);
  if (qtyInp) qtyInp.disabled = !e.target.checked;

  recalcEstimate();
}

function onQtyChange(e) {
  const id  = parseInt(e.target.dataset.id, 10);
  const qty = parseInt(e.target.value, 10);
  if (qty > 0) {
    selectedServices[id] = qty;
    recalcEstimate();
  }
}

/**
 * Pricing formula:
 *   Sell = (atCost × markupMultiplier) + (laborHours × shopRate) + tripFee + permitFee
 * where markupMultiplier = 1 + (strategyPct / 100)
 */
function calcLineItem(svc, qty, strategy, shopRate) {
  const markupMultiplier = 1 + (strategy / 100);
  const materialSell     = svc.atCost * markupMultiplier;
  const laborCost        = svc.laborHours * shopRate;
  const sellPerUnit      = materialSell + laborCost;

  return {
    name:           svc.name,
    qty,
    atCostPerUnit:  svc.atCost,
    laborCost:      laborCost,
    materialSell,
    markup:         svc.atCost * (strategy / 100),
    sellPerUnit,
    totalSell:      sellPerUnit * qty,
    totalAtCost:    (svc.atCost + laborCost) * qty,
  };
}

function recalcEstimate() {
  const breakdown = document.getElementById('estimate-breakdown');
  const selected  = Object.entries(selectedServices);

  if (selected.length === 0) {
    breakdown.innerHTML = `
      <div class="empty-state" style="padding:24px 0">
        <div class="empty-icon">📋</div>
        <p>Select services above to see your estimate.</p>
      </div>`;
    return;
  }

  const { shopRate, tripFee, permitFee } = appData.settings;
  const strategyPct = appData.strategies[selectedStrategy];
  const lineItems   = [];

  selected.forEach(([idStr, qty]) => {
    const svc = appData.services.find(s => s.id === parseInt(idStr, 10));
    if (svc) lineItems.push(calcLineItem(svc, qty, strategyPct, shopRate));
  });

  const totalSell   = lineItems.reduce((s, li) => s + li.totalSell, 0) + tripFee + permitFee;
  const totalAtCost = lineItems.reduce((s, li) => s + li.totalAtCost, 0) + tripFee + permitFee;
  const totalMarkup = totalSell - totalAtCost;

  const isAdmin = currentView === 'admin';

  let html = '';

  lineItems.forEach(li => {
    html += `
      <div class="summary-row">
        <span class="summary-label">${escapeHtml(li.name)} ${li.qty > 1 ? '× ' + li.qty : ''}</span>
        <span class="summary-value">$${li.totalSell.toFixed(2)}</span>
      </div>`;

    if (isAdmin) {
      html += `
        <div class="cost-detail-row">Material at-cost: $${(li.atCostPerUnit * li.qty).toFixed(2)}</div>
        <div class="cost-detail-row">Labor: $${(li.laborCost * li.qty).toFixed(2)}</div>
        <div class="cost-detail-row">Markup: <span class="markup-highlight">$${(li.markup * li.qty).toFixed(2)}</span></div>`;
    }
  });

  if (tripFee > 0) {
    html += `<div class="summary-row"><span class="summary-label">Trip Fee</span><span class="summary-value">$${tripFee.toFixed(2)}</span></div>`;
  }

  if (permitFee > 0) {
    html += `<div class="summary-row"><span class="summary-label">Permit Fee</span><span class="summary-value">$${permitFee.toFixed(2)}</span></div>`;
  }

  if (isAdmin) {
    html += `<div class="summary-row"><span class="summary-label">Total At-Cost</span><span class="summary-value">$${totalAtCost.toFixed(2)}</span></div>`;
    html += `<div class="summary-row"><span class="summary-label text-success">Total Markup</span><span class="summary-value text-success">$${totalMarkup.toFixed(2)}</span></div>`;
  }

  html += `<div class="summary-row total"><span class="summary-label">TOTAL</span><span class="summary-value">$${totalSell.toFixed(2)}</span></div>`;

  breakdown.innerHTML = html;
}

function buildExportText() {
  const { companyName, shopRate, tripFee, permitFee } = appData.settings;
  const strategyPct = appData.strategies[selectedStrategy];
  const stratName   = selectedStrategy.charAt(0).toUpperCase() + selectedStrategy.slice(1);

  const lines = [
    `${companyName}`,
    `Estimate – ${stratName} Strategy (${strategyPct}% markup)`,
    `Date: ${new Date().toLocaleDateString()}`,
    '─'.repeat(40),
  ];

  const selected = Object.entries(selectedServices);
  let totalSell  = 0;

  selected.forEach(([idStr, qty]) => {
    const svc  = appData.services.find(s => s.id === parseInt(idStr, 10));
    if (!svc) return;
    const li   = calcLineItem(svc, qty, strategyPct, shopRate);
    totalSell += li.totalSell;
    lines.push(`${svc.name}${qty > 1 ? ' × ' + qty : ''} .................. $${li.totalSell.toFixed(2)}`);
  });

  if (tripFee > 0)   { lines.push(`Trip Fee ......................... $${tripFee.toFixed(2)}`);   totalSell += tripFee; }
  if (permitFee > 0) { lines.push(`Permit Fee ....................... $${permitFee.toFixed(2)}`); totalSell += permitFee; }

  lines.push('─'.repeat(40));
  lines.push(`TOTAL: $${totalSell.toFixed(2)}`);

  return lines.join('\n');
}

function copyEstimate() {
  if (Object.keys(selectedServices).length === 0) {
    showToast('No services selected.', 'error');
    return;
  }

  const text = buildExportText();

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast('Estimate copied to clipboard!'))
      .catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }

  // Show text in export box
  const box  = document.getElementById('export-box');
  const wrap = document.getElementById('export-box-wrap');
  box.textContent = text;
  wrap.classList.remove('hidden');
}

function fallbackCopy(text) {
  // Legacy fallback for browsers without Clipboard API support
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity  = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy'); // eslint-disable-line -- legacy fallback only
    showToast('Estimate copied to clipboard!');
  } catch {
    showToast('Could not copy – please copy the text below manually.', 'error');
  }
  document.body.removeChild(ta);
}

function clearEstimate() {
  selectedServices = {};
  renderServiceSelectList();
  recalcEstimate();
  document.getElementById('export-box-wrap').classList.add('hidden');
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── INIT ──────────────────────────────────────────────────────────────────────

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  loadData();
  loadSettingsForm();
  loadStrategiesForm();
  renderServicesTable();
}

function showLogin() {
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {

  // ── Check auth ──
  if (isLoggedIn()) {
    showApp();
  }

  // ── Login ──
  const loginBtn  = document.getElementById('login-btn');
  const loginPwd  = document.getElementById('login-password');
  const loginErr  = document.getElementById('login-error');

  function attemptLogin() {
    const pwd = loginPwd.value;
    if (login(pwd)) {
      loginErr.textContent = '';
      loginPwd.value = '';
      showApp();
    } else {
      loginErr.textContent = '⚠️ Incorrect password. Please try again.';
      loginPwd.value = '';
      loginPwd.focus();
    }
  }

  loginBtn.addEventListener('click', attemptLogin);
  loginPwd.addEventListener('keydown', e => { if (e.key === 'Enter') attemptLogin(); });

  // ── Logout ──
  document.getElementById('logout-btn').addEventListener('click', () => {
    logout();
    showLogin();
    document.getElementById('login-password').value = '';
  });

  // ── Sidebar navigation ──
  document.querySelectorAll('.sidebar-nav button[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // ── Settings ──
  document.getElementById('save-settings-btn').addEventListener('click', saveSettings);

  // ── Services ──
  document.getElementById('add-service-btn').addEventListener('click', addService);

  document.getElementById('services-tbody').addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = parseInt(btn.dataset.id, 10);
    if (btn.dataset.action === 'edit')   openEditModal(id);
    if (btn.dataset.action === 'delete') deleteService(id);
  });

  // ── Edit modal ──
  document.getElementById('edit-modal-cancel').addEventListener('click', closeEditModal);
  document.getElementById('edit-modal-save').addEventListener('click', saveEditedService);
  document.getElementById('edit-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('edit-modal')) closeEditModal();
  });

  // ── Strategies ──
  document.getElementById('save-strategies-btn').addEventListener('click', saveStrategies);

  // ── Estimate: strategy picker ──
  document.querySelectorAll('.strategy-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.strategy-pick-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedStrategy = btn.dataset.strategy;
      recalcEstimate();
    });
  });

  // ── Estimate: view toggle ──
  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.dataset.view;
      recalcEstimate();
    });
  });

  // ── Estimate: copy / clear ──
  document.getElementById('copy-estimate-btn').addEventListener('click', copyEstimate);
  document.getElementById('clear-estimate-btn').addEventListener('click', clearEstimate);
});
