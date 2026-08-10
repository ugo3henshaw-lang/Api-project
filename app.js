const API_BASE = window.location.origin + '/api';

const state = {
  username: '',
  password: '',
  token: '',
  apiKey: '',
  isAuthenticated: false,
  allSecrets: [],
  userSecrets: [],
  filteredSecrets: [],
  selectedSecret: null,
  allPage: 1,
};

const els = {};

function initialize() {
  cacheElements();
  bindEvents();
  hydrateSession();
  renderAuthView();
  loadRandomSecret();
  if (state.isAuthenticated) {
    loadAllSecrets();
    loadUserSecrets();
    loadFilteredSecrets();
  }
}

function cacheElements() {
  els.messageArea = document.getElementById('messageArea');
  els.authSection = document.getElementById('authSection');
  els.dashboard = document.getElementById('dashboard');
  els.logoutBtn = document.getElementById('logoutBtn');
  els.authForm = document.getElementById('authForm');
  els.usernameInput = document.getElementById('usernameInput');
  els.passwordInput = document.getElementById('passwordInput');
  els.randomSecretContent = document.getElementById('randomSecretContent');
  els.publicSecretDetail = document.getElementById('publicSecretDetail');
  els.createSecretForm = document.getElementById('createSecretForm');
  els.filterForm = document.getElementById('filterForm');
  els.allSecretsList = document.getElementById('allSecretsList');
  els.userSecretsList = document.getElementById('userSecretsList');
  els.filteredSecretsList = document.getElementById('filteredSecretsList');
  els.detailContent = document.getElementById('detailContent');
  els.welcomeHeading = document.getElementById('welcomeHeading');
  els.authStatus = document.getElementById('authStatus');
  els.apiKeyStatus = document.getElementById('apiKeyStatus');
  els.userSummary = document.getElementById('userSummary');
  els.loadRandomBtn = document.getElementById('loadRandomBtn');
  els.refreshSecretBtn = document.getElementById('refreshSecretBtn');
  els.prevPageBtn = document.getElementById('prevPageBtn');
  els.nextPageBtn = document.getElementById('nextPageBtn');
}

function bindEvents() {
  els.authForm.addEventListener('submit', handleAuthSubmit);
  els.createSecretForm.addEventListener('submit', handleCreateSecret);
  els.filterForm.addEventListener('submit', handleFilterSecrets);
  els.loadRandomBtn.addEventListener('click', loadRandomSecret);
  els.refreshSecretBtn.addEventListener('click', loadRandomSecret);
  els.logoutBtn.addEventListener('click', handleLogout);
  els.prevPageBtn.addEventListener('click', () => {
    if (state.allPage > 1) {
      state.allPage -= 1;
      loadAllSecrets();
    }
  });
  els.nextPageBtn.addEventListener('click', () => {
    state.allPage += 1;
    loadAllSecrets();
  });

  document.querySelectorAll('.switch-btn').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.switch-btn').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      els.authForm.querySelector('button[type="submit"]').textContent =
        button.dataset.mode === 'register' ? 'Create account' : 'Continue';
    });
  });

  els.allSecretsList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="view-secret"]');
    if (button) {
      viewSecret(button.dataset.id);
    }
  });

  els.userSecretsList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="view-secret"]');
    if (button) {
      viewSecret(button.dataset.id);
    }
  });

  els.filteredSecretsList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="view-secret"]');
    if (button) {
      viewSecret(button.dataset.id);
    }
  });
}

function hydrateSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem('secrets-hub-session') || 'null');
    if (saved) {
      state.username = saved.username || '';
      state.password = saved.password || '';
      state.token = saved.token || '';
      state.apiKey = saved.apiKey || '';
      state.isAuthenticated = Boolean(saved.token);
    }
  } catch (error) {
    console.warn('Session restore failed', error);
  }
}

function persistSession() {
  sessionStorage.setItem(
    'secrets-hub-session',
    JSON.stringify({
      username: state.username,
      password: state.password,
      token: state.token,
      apiKey: state.apiKey,
    })
  );
}

function clearSession() {
  sessionStorage.removeItem('secrets-hub-session');
}

function renderAuthView() {
  els.authSection.hidden = state.isAuthenticated;
  els.dashboard.hidden = !state.isAuthenticated;
  els.logoutBtn.hidden = !state.isAuthenticated;

  if (state.isAuthenticated) {
    els.welcomeHeading.textContent = `Welcome back, ${state.username}`;
    els.authStatus.textContent = 'Authenticated';
    els.apiKeyStatus.textContent = state.apiKey ? 'API key ready' : 'API key pending';
    els.userSummary.innerHTML = `
      <div class="summary-card">
        <p class="eyebrow">Identity</p>
        <h4>${escapeHtml(state.username)}</h4>
        <p>Basic auth and bearer token are active for your session.</p>
      </div>
      <div class="summary-card">
        <p class="eyebrow">API key</p>
        <h4>${state.apiKey ? 'Available' : 'Not generated yet'}</h4>
        <p>${state.apiKey ? 'Filter requests can use your key.' : 'Generate one from the API to unlock filtering.'}</p>
      </div>
    `;
  } else {
    els.authForm.reset();
    els.usernameInput.focus();
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const formMode = document.querySelector('.switch-btn.active').dataset.mode;
  const username = els.usernameInput.value.trim();
  const password = els.passwordInput.value.trim();

  if (!username || !password) {
    showMessage('error', 'Please provide both a username and password.');
    return;
  }

  const submitButton = els.authForm.querySelector('button[type="submit"]');
  setButtonBusy(submitButton, formMode === 'register' ? 'Creating account...' : 'Signing in...');

  try {
    if (formMode === 'register') {
      await request('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      showMessage('success', 'Account created successfully. Please sign in.');
      els.authForm.reset();
      document.querySelector('.switch-btn[data-mode="login"]').click();
      return;
    }

    const tokenResponse = await request('/get-auth-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const apiKeyResponse = await request('/generate-api-key');

    state.username = username;
    state.password = password;
    state.token = tokenResponse.token;
    state.apiKey = apiKeyResponse.apiKey;
    state.isAuthenticated = true;
    persistSession();
    renderAuthView();
    showMessage('success', 'Signed in successfully. Your workspace is ready.');
    loadRandomSecret();
    loadAllSecrets();
    loadUserSecrets();
    loadFilteredSecrets();
  } catch (error) {
    showMessage('error', error.message || 'Authentication failed.');
  } finally {
    setButtonBusy(submitButton, formMode === 'register' ? 'Create account' : 'Continue', false);
  }
}

async function handleCreateSecret(event) {
  event.preventDefault();
  if (!state.isAuthenticated) {
    showMessage('info', 'Sign in before creating a secret.');
    return;
  }

  const secret = document.getElementById('secretInput').value.trim();
  const score = document.getElementById('scoreInput').value.trim();

  if (!secret) {
    showMessage('error', 'Please enter a secret before saving it.');
    return;
  }

  const parsedScore = Number(score);
  if (!Number.isInteger(parsedScore) || parsedScore < 1 || parsedScore > 10) {
    showMessage('error', 'The score must be an integer between 1 and 10.');
    return;
  }

  const button = els.createSecretForm.querySelector('button[type="submit"]');
  setButtonBusy(button, 'Creating secret...');

  try {
    const createdSecret = await request('/secrets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.token}`,
      },
      body: JSON.stringify({ secret, score: parsedScore }),
    });
    els.createSecretForm.reset();
    state.userSecrets = [createdSecret, ...state.userSecrets];
    renderUserSecrets();
    renderDetail(createdSecret);
    showMessage('success', 'Your secret was created successfully.');
  } catch (error) {
    showMessage('error', error.message || 'Could not create the secret.');
  } finally {
    setButtonBusy(button, 'Create secret', false);
  }
}

async function handleFilterSecrets(event) {
  event.preventDefault();
  const score = document.getElementById('filterScoreInput').value.trim();
  await loadFilteredSecrets(Number(score));
}

async function loadRandomSecret() {
  try {
    const secret = await request('/random');
    if (!secret || typeof secret !== 'object' || !secret.secret) {
      throw new Error('The public API returned an empty response.');
    }

    renderPublicSecret(secret);
    els.publicSecretDetail.innerHTML = `
      <div class="list-item">
        <div class="list-item-top">
          <strong>${escapeHtml(secret.username)}</strong>
          <span>${secret.emScore}/10</span>
        </div>
        <p>${escapeHtml(secret.secret)}</p>
        <div class="meta-row">
          <span>${formatDate(secret.timestamp)}</span>
        </div>
      </div>
    `;
  } catch (error) {
    els.randomSecretContent.innerHTML = '<p class="empty-state">Unable to load a secret right now.</p>';
    els.publicSecretDetail.innerHTML = `<p class="empty-state">${escapeHtml(error.message || 'The public API is unavailable.')}</p>`;
  }
}

async function loadAllSecrets() {
  if (!state.isAuthenticated) {
    els.allSecretsList.innerHTML = '<p class="empty-state">Sign in to view all secrets.</p>';
    return;
  }

  try {
    const secrets = await request(`/all?page=${state.allPage}`, {
      headers: { Authorization: basicAuthHeader() },
    });
    state.allSecrets = Array.isArray(secrets) ? secrets : [];
    renderAllSecrets();
  } catch (error) {
    els.allSecretsList.innerHTML = `<p class="empty-state">${escapeHtml(error.message || 'Unable to fetch secrets.')}</p>`;
  }
}

async function loadUserSecrets() {
  if (!state.isAuthenticated) {
    els.userSecretsList.innerHTML = '<p class="empty-state">Sign in to view your own secrets.</p>';
    return;
  }

  try {
    const secrets = await request('/user-secrets', {
      headers: { Authorization: `Bearer ${state.token}` },
    });
    state.userSecrets = Array.isArray(secrets) ? secrets : [];
    renderUserSecrets();
  } catch (error) {
    els.userSecretsList.innerHTML = `<p class="empty-state">${escapeHtml(error.message || 'Could not load your secrets.')}</p>`;
  }
}

async function loadFilteredSecrets(score = 5) {
  if (!state.isAuthenticated) {
    els.filteredSecretsList.innerHTML = '<p class="empty-state">Sign in to filter secrets.</p>';
    return;
  }

  try {
    const url = new URL(`${API_BASE}/filter`);
    url.searchParams.set('score', String(score));
    url.searchParams.set('apiKey', state.apiKey);
    const secrets = await fetch(url, { method: 'GET' }).then(handleResponse);
    state.filteredSecrets = Array.isArray(secrets) ? secrets : [];
    renderFilteredSecrets();
  } catch (error) {
    els.filteredSecretsList.innerHTML = `<p class="empty-state">${escapeHtml(error.message || 'Filter request failed.')}</p>`;
  }
}

async function viewSecret(secretId) {
  try {
    const secret = await request(`/secrets/${secretId}`, {
      headers: { Authorization: `Bearer ${state.token}` },
    });
    state.selectedSecret = secret;
    renderDetail(secret);
  } catch (error) {
    els.detailContent.innerHTML = `<p class="empty-state">${escapeHtml(error.message || 'Unable to open this secret.')}</p>`;
  }
}

function renderPublicSecret(secret) {
  els.randomSecretContent.innerHTML = `
    <div class="list-item">
      <div class="list-item-top">
        <strong>${escapeHtml(secret.username)}</strong>
        <span>${secret.emScore}/10</span>
      </div>
      <p>${escapeHtml(secret.secret)}</p>
      <div class="meta-row">
        <span>${formatDate(secret.timestamp)}</span>
      </div>
    </div>
  `;
}

function renderAllSecrets() {
  if (!state.allSecrets.length) {
    els.allSecretsList.innerHTML = '<p class="empty-state">No public secrets are available yet.</p>';
    return;
  }

  els.allSecretsList.innerHTML = state.allSecrets
    .map(
      (secret) => `
        <article class="list-item">
          <div class="list-item-top">
            <strong>${escapeHtml(secret.username)}</strong>
            <span>${secret.emScore}/10</span>
          </div>
          <p>${escapeHtml(secret.secret)}</p>
          <div class="meta-row">
            <span>${formatDate(secret.timestamp)}</span>
            <button class="list-action" data-action="view-secret" data-id="${secret.id}" type="button">View secret</button>
          </div>
        </article>
      `
    )
    .join('');
}

function renderUserSecrets() {
  if (!state.userSecrets.length) {
    els.userSecretsList.innerHTML = '<p class="empty-state">You have not submitted any secrets yet.</p>';
    return;
  }

  els.userSecretsList.innerHTML = state.userSecrets
    .map(
      (secret) => `
        <article class="list-item">
          <div class="list-item-top">
            <strong>${escapeHtml(secret.secret)}</strong>
            <span>${secret.emScore}/10</span>
          </div>
          <div class="meta-row">
            <span>${formatDate(secret.timestamp)}</span>
            <button class="list-action" data-action="view-secret" data-id="${secret.id}" type="button">Inspect</button>
          </div>
        </article>
      `
    )
    .join('');
}

function renderFilteredSecrets() {
  if (!state.filteredSecrets.length) {
    els.filteredSecretsList.innerHTML = '<p class="empty-state">No secrets match this threshold.</p>';
    return;
  }

  els.filteredSecretsList.innerHTML = state.filteredSecrets
    .map(
      (secret) => `
        <article class="list-item">
          <div class="list-item-top">
            <strong>${escapeHtml(secret.username)}</strong>
            <span>${secret.emScore}/10</span>
          </div>
          <p>${escapeHtml(secret.secret)}</p>
          <div class="meta-row">
            <span>${formatDate(secret.timestamp)}</span>
            <button class="list-action" data-action="view-secret" data-id="${secret.id}" type="button">View</button>
          </div>
        </article>
      `
    )
    .join('');
}

function renderDetail(secret) {
  if (!secret) {
    els.detailContent.innerHTML = '<p class="empty-state">Select a secret to inspect it and perform updates.</p>';
    return;
  }

  els.detailContent.innerHTML = `
    <div class="detail-shell">
      <div class="detail-top">
        <div>
          <p class="eyebrow">Selected secret</p>
          <h4>${escapeHtml(secret.secret)}</h4>
        </div>
        <span class="status-pill">${secret.emScore}/10</span>
      </div>
      <div class="meta-row" style="margin-top: 0.6rem;">
        <span>Owner: ${escapeHtml(secret.username)}</span>
        <span>Created: ${formatDate(secret.timestamp)}</span>
      </div>

      <form id="updateSecretForm" class="stack-form" style="margin-top: 1rem;">
        <label>
          Replace full secret
          <textarea id="updateSecretInput" rows="4">${escapeHtml(secret.secret)}</textarea>
        </label>
        <label>
          Embarrassment score
          <input id="updateScoreInput" type="number" min="1" max="10" value="${secret.emScore}" />
        </label>
        <div class="detail-actions">
          <button class="primary-btn" type="submit">Save full update</button>
          <button class="secondary-btn" id="deleteSecretBtn" type="button">Delete</button>
        </div>
      </form>

      <form id="patchSecretForm" class="stack-form" style="margin-top: 1rem;">
        <label>
          Partial update
          <textarea id="patchSecretInput" rows="3" placeholder="Leave blank to keep the original text"></textarea>
        </label>
        <label>
          New score (optional)
          <input id="patchScoreInput" type="number" min="1" max="10" placeholder="1-10" />
        </label>
        <div class="detail-actions">
          <button class="secondary-btn" type="submit">Apply patch</button>
        </div>
      </form>
    </div>
  `;

  const updateForm = document.getElementById('updateSecretForm');
  const patchForm = document.getElementById('patchSecretForm');
  const deleteButton = document.getElementById('deleteSecretBtn');

  updateForm.addEventListener('submit', handleUpdateSecret);
  patchForm.addEventListener('submit', handlePatchSecret);
  deleteButton.addEventListener('click', handleDeleteSecret);
}

async function handleUpdateSecret(event) {
  event.preventDefault();
  if (!state.selectedSecret) {
    return;
  }

  const secretText = document.getElementById('updateSecretInput').value.trim();
  const score = Number(document.getElementById('updateScoreInput').value);
  const button = document.querySelector('#updateSecretForm button[type="submit"]');
  setButtonBusy(button, 'Updating secret...');

  try {
    const updatedSecret = await request(`/secrets/${state.selectedSecret.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.token}` },
      body: JSON.stringify({ secret: secretText, score }),
    });
    state.selectedSecret = updatedSecret;
    state.userSecrets = state.userSecrets.map((item) => (item.id === updatedSecret.id ? updatedSecret : item));
    renderUserSecrets();
    renderDetail(updatedSecret);
    showMessage('success', 'The secret was updated successfully.');
  } catch (error) {
    showMessage('error', error.message || 'Full update failed.');
  } finally {
    setButtonBusy(button, 'Save full update', false);
  }
}

async function handlePatchSecret(event) {
  event.preventDefault();
  if (!state.selectedSecret) {
    return;
  }

  const patchPayload = {};
  const patchSecret = document.getElementById('patchSecretInput').value.trim();
  const patchScoreValue = document.getElementById('patchScoreInput').value.trim();

  if (patchSecret) {
    patchPayload.secret = patchSecret;
  }

  if (patchScoreValue) {
    patchPayload.score = Number(patchScoreValue);
  }

  if (!Object.keys(patchPayload).length) {
    showMessage('info', 'Enter at least one field to patch.');
    return;
  }

  const button = document.querySelector('#patchSecretForm button[type="submit"]');
  setButtonBusy(button, 'Patching secret...');

  try {
    const updatedSecret = await request(`/secrets/${state.selectedSecret.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.token}` },
      body: JSON.stringify(patchPayload),
    });
    state.selectedSecret = updatedSecret;
    state.userSecrets = state.userSecrets.map((item) => (item.id === updatedSecret.id ? updatedSecret : item));
    renderUserSecrets();
    renderDetail(updatedSecret);
    showMessage('success', 'The secret was partially updated.');
  } catch (error) {
    showMessage('error', error.message || 'Patch request failed.');
  } finally {
    setButtonBusy(button, 'Apply patch', false);
  }
}

async function handleDeleteSecret() {
  if (!state.selectedSecret) {
    return;
  }

  const confirmed = window.confirm('Delete this secret? This action cannot be undone.');
  if (!confirmed) {
    return;
  }

  const button = document.getElementById('deleteSecretBtn');
  setButtonBusy(button, 'Deleting...');

  try {
    await request(`/secrets/${state.selectedSecret.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${state.token}` },
    });
    state.userSecrets = state.userSecrets.filter((item) => item.id !== state.selectedSecret.id);
    state.selectedSecret = null;
    renderUserSecrets();
    renderDetail(null);
    showMessage('success', 'The secret was deleted successfully.');
  } catch (error) {
    showMessage('error', error.message || 'Delete request failed.');
  } finally {
    setButtonBusy(button, 'Delete', false);
  }
}

function handleLogout() {
  state.username = '';
  state.password = '';
  state.token = '';
  state.apiKey = '';
  state.isAuthenticated = false;
  state.allSecrets = [];
  state.userSecrets = [];
  state.filteredSecrets = [];
  state.selectedSecret = null;
  clearSession();
  renderAuthView();
  els.allSecretsList.innerHTML = '<p class="empty-state">You are signed out.</p>';
  els.userSecretsList.innerHTML = '<p class="empty-state">Sign in to manage your secrets.</p>';
  els.filteredSecretsList.innerHTML = '<p class="empty-state">Filter features appear after you sign in.</p>';
  els.detailContent.innerHTML = '<p class="empty-state">Sign in to inspect and manage secrets.</p>';
  els.randomSecretContent.innerHTML = '<p class="empty-state">The public random secret will appear here.</p>';
  els.publicSecretDetail.innerHTML = '<p class="empty-state">The public API remains available even without an account.</p>';
  showMessage('info', 'You have been logged out.');
}

function basicAuthHeader() {
  const credentials = `${state.username}:${state.password}`;
  return `Basic ${btoa(credentials)}`;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Accept: 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  return handleResponse(response);
}

async function handleResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const rawText = await response.text();

  let data = rawText;
  if (rawText) {
    try {
      const trimmed = rawText.trim();
      const isJson = contentType.includes('application/json') || trimmed.startsWith('{') || trimmed.startsWith('[');
      data = isJson ? JSON.parse(trimmed) : rawText;
    } catch (error) {
      data = rawText;
    }
  }

  if (!response.ok) {
    const message = typeof data === 'object' && data ? data.message || data.error || data.success || 'Request failed.' : data;
    throw new Error(message || 'Request failed.');
  }

  return data;
}

function setButtonBusy(button, label, isBusy = true) {
  if (!button) {
    return;
  }

  button.disabled = isBusy;
  button.textContent = isBusy ? label : label;
}

function showMessage(type, text) {
  els.messageArea.className = `message ${type}`;
  els.messageArea.textContent = text;
}

function formatDate(timestamp) {
  if (!timestamp) {
    return 'Recently shared';
  }
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleString();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

document.addEventListener('DOMContentLoaded', initialize);
