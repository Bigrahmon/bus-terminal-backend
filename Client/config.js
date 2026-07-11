// Redirect file:// pages to the local dev server (fetch does not work reliably from file://)
if (window.location.protocol === 'file:') {
  const page = window.location.pathname.split(/[/\\]/).pop() || 'index.html';
  window.location.replace(
    'http://localhost:3000/' + page + window.location.search + window.location.hash
  );
}

const RENDER_API = 'https://bus-terminal-backend.onrender.com/api';
const LOCAL_API = 'http://localhost:3000/api';

const CITIES = [
  'Lagos',
  'Ibadan',
  'Akure',
  'Abuja',
  'Port Harcourt',
  'Ondo',
  'Ado Ekiti',
];

function populateCitySelect(selectId, selectedValue) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = CITIES.map(
    (city) => `<option value="${city}"${city === selectedValue ? ' selected' : ''}>${city}</option>`
  ).join('');
}

function initCitySelects() {
  populateCitySelect('from', 'Lagos');
  populateCitySelect('to', 'Ado Ekiti');
}

function initBookingCitySelects() {
  const fromSelect = document.getElementById('booking-from');
  const toSelect = document.getElementById('booking-to');
  if (fromSelect) {
    fromSelect.innerHTML =
      '<option value="">Select departure</option>' +
      CITIES.map((city) => `<option value="${city}">${city}</option>`).join('');
  }
  if (toSelect) {
    toSelect.innerHTML =
      '<option value="">Select destination</option>' +
      CITIES.map((city) => `<option value="${city}">${city}</option>`).join('');
  }
}

// Default to production so mobile/online users never hit localhost by mistake
let API_URL = RENDER_API;

function isLocalApi() {
  return (
    API_URL.startsWith('/') ||
    API_URL.includes('localhost') ||
    API_URL.includes('127.0.0.1')
  );
}

function connectionErrorMessage(action = 'try again') {
  if (isLocalApi()) {
    return `Start the backend first: open a terminal in the <strong>Server</strong> folder and run <code>npm start</code>, then ${action}.`;
  }
  return `The server may still be waking up. Please wait a moment and ${action}.`;
}

function fetchWithTimeout(url, options = {}, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const { signal: _ignored, ...rest } = options;
  return fetch(url, { ...rest, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function probeApi(baseUrl, timeoutMs = 8000) {
  try {
    const resp = await fetchWithTimeout(`${baseUrl}/health`, {}, timeoutMs);
    const ct = resp.headers.get('content-type') || '';
    if (!resp.ok || !ct.includes('application/json')) return false;
    const data = await resp.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}

async function initApi() {
  const origin = window.location.origin;

  // Same-origin API when frontend is served by our Express app (localhost:3000 or Render)
  for (let attempt = 0; attempt < 4; attempt++) {
    if (await probeApi(`${origin}/api`, 20000)) {
      API_URL = '/api';
      return API_URL;
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, 3000));
  }

  if (await probeApi(LOCAL_API, 3000)) {
    API_URL = LOCAL_API;
    return API_URL;
  }

  API_URL = RENDER_API;
  return API_URL;
}

const apiReady = initApi();

async function wakeServer(maxWaitMs = 90000, onProgress) {
  if (isLocalApi()) return true;

  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    if (await probeApi(API_URL, 20000)) return true;
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    if (onProgress) onProgress(elapsed);
    await new Promise((r) => setTimeout(r, 3000));
  }
  return false;
}

async function fetchApi(path, options = {}, retries = 3) {
  await apiReady;

  let lastError;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetchWithTimeout(`${API_URL}${path}`, options, 60000);
      const text = await response.text();
      let data = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error('Server returned an unexpected response. Please try again.');
        }
      }
      return { response, data };
    } catch (err) {
      lastError = err;
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }
  throw lastError;
}
