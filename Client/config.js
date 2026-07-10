// Redirect file:// pages to the local dev server (fetch does not work reliably from file://)
if (window.location.protocol === 'file:') {
  const page = window.location.pathname.split(/[/\\]/).pop() || 'index.html';
  window.location.replace(
    'http://localhost:3000/' + page + window.location.search + window.location.hash
  );
}

const RENDER_API = 'https://bus-terminal-backend.onrender.com/api';
const LOCAL_API = 'http://localhost:3000/api';

let API_URL = LOCAL_API;

function isLocalApi() {
  return (
    API_URL.startsWith('/') ||
    API_URL.includes('localhost') ||
    API_URL.includes('127.0.0.1')
  );
}

function fetchWithTimeout(url, options = {}, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const { signal: _ignored, ...rest } = options;
  return fetch(url, { ...rest, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function probeApi(baseUrl, timeoutMs = 5000) {
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
  // App served by our Express server — always use same-origin /api
  if (window.location.port === '3000') {
    API_URL = '/api';
    return API_URL;
  }

  if (await probeApi(LOCAL_API, 5000)) {
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
