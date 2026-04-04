import * as ort from 'onnxruntime-web';

// ─── Config ───
const API = 'https://neo-backend-production-bf9f.up.railway.app';
const MAP_CENTER = [23.2156, 77.4565]; // Bhopal area — soybean belt
const POLL_MS = 8000;

// Disease labels matching the ONNX model output (same as TFLite)
const LABELS = [
  { name: 'Bacterial Pustule', severity: 'High', cure: 'Apply Copper Oxychloride 3g/L or Streptocycline 0.5g/L', sev: 'high', color: '#ff4d4d' },
  { name: 'Frogeye Leaf Spot', severity: 'Medium', cure: 'Spray Mancozeb 2.5g/L or Carbendazim 1g/L', sev: 'medium', color: '#ffa500' },
  { name: 'Healthy', severity: 'None', cure: 'No treatment needed', sev: 'none', color: '#00c896' },
  { name: 'Rust', severity: 'High', cure: 'Spray Propiconazole 1ml/L or Hexaconazole 2ml/L', sev: 'high', color: '#ff4d4d' },
  { name: 'Sudden Death Syndrome', severity: 'High', cure: 'Remove infected plants, improve drainage', sev: 'high', color: '#ff4d4d' },
  { name: 'Target Leaf Spot', severity: 'Medium', cure: 'Apply Azoxystrobin 1ml/L', sev: 'medium', color: '#e8a020' },
  { name: 'Yellow Mosaic', severity: 'High', cure: 'Control whitefly with Imidacloprid 0.3ml/L', sev: 'high', color: '#ff4d4d' },
];

// ─── State ───
let bookings = [];
let filter = 'all';
let map = null;
let markers = {};
let onnxSession = null;
let selectedBookingId = null;

// ─── Init ───
document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  setupFilters();
  setupUpload();
  await loadModel();
  await loadAll();
  setInterval(loadAll, POLL_MS);
});

// ═══════════════════════════════════════════
// MAP
// ═══════════════════════════════════════════
function initMap() {
  map = L.map('map', {
    center: MAP_CENTER,
    zoom: 14,
    zoomControl: false,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19,
  }).addTo(map);

  L.control.zoom({ position: 'topright' }).addTo(map);

  // Add base field markers (demo data matching _layout.jsx seed)
  addFieldMarker(23.2156, 77.4565, 'Rust', 'high', 'demo-marker-001');
  addFieldMarker(23.2170, 77.4580, 'Frogeye Leaf Spot', 'medium', 'demo-marker-002');
  addFieldMarker(23.2140, 77.4550, 'Yellow Mosaic', 'high', 'demo-marker-003');
}

function addFieldMarker(lat, lng, label, sev, id) {
  const colors = { high: '#ff4d4d', medium: '#ffa500', none: '#00c896' };
  const c = colors[sev] || '#888';

  const icon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 14px; height: 14px; border-radius: 50%;
      background: ${c}; border: 2px solid #fff;
      box-shadow: 0 0 10px ${c}88;
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  const m = L.marker([lat, lng], { icon }).addTo(map);
  m.bindPopup(`<b style="color:#333">${label}</b><br><span style="color:#666">Severity: ${sev}</span>`);
  if (id) markers[id] = m;
}

function addBookingMarker(booking) {
  if (!booking.latitude || !booking.longitude) return;
  const key = booking.booking_id || booking.id;
  if (markers[key]) map.removeLayer(markers[key]);

  const statusColors = {
    pending: '#ffa500',
    dispatched: '#4a90e2',
    scanning: '#4a90e2',
    completed: '#00c896',
    cancelled: '#555',
  };
  const c = statusColors[booking.status] || '#888';

  const icon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 30px; height: 30px; border-radius: 50%;
      background: ${c}22; border: 2px solid ${c};
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; box-shadow: 0 0 16px ${c}44;
    ">🛸</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  const m = L.marker([booking.latitude, booking.longitude], { icon }).addTo(map);
  m.bindPopup(`
    <div style="color:#333; min-width:150px;">
      <b>${key}</b><br>
      <span>Crop: ${booking.crop_type || 'Soybean'}</span><br>
      <span>Area: ${booking.area_acres || 1} acres</span><br>
      <span style="color:${c}; font-weight:700;">${booking.status.toUpperCase()}</span>
    </div>
  `);
  markers[key] = m;
}

// ═══════════════════════════════════════════
// API
// ═══════════════════════════════════════════
async function loadAll() {
  await Promise.all([loadBookings(), loadStats()]);
}

async function loadStats() {
  try {
    const res = await fetch(`${API}/drone/stats`);
    if (!res.ok) throw new Error();
    const d = await res.json();
    document.getElementById('statPending').textContent = d.pending || 0;
    document.getElementById('statDispatched').textContent = d.dispatched || 0;
    document.getElementById('statCompleted').textContent = d.completed || 0;
    setConnection('ok');
  } catch {
    setConnection('err');
  }
}

async function loadBookings() {
  try {
    const res = await fetch(`${API}/drone/bookings`);
    if (!res.ok) throw new Error();
    const d = await res.json();
    bookings = d.bookings || [];
    // Put bookings on map
    bookings.forEach(addBookingMarker);
    renderBookings();
  } catch (err) {
    console.error('Load bookings:', err);
  }
}

function renderBookings() {
  const list = document.getElementById('bookingsList');
  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state"><span>🛸</span><p>No ${filter === 'all' ? '' : filter} bookings</p></div>`;
    return;
  }

  list.innerHTML = filtered.map(b => {
    const id = b.booking_id || b.id;
    const sel = selectedBookingId === id ? 'selected' : '';
    return `
      <div class="booking-card ${sel}" onclick="selectBooking('${id}')">
        <div class="bk-top">
          <span class="bk-id">${id}</span>
          <span class="bk-badge bk-badge-${b.status}">${b.status}</span>
        </div>
        <div class="bk-info">
          <span>🌿 ${b.crop_type || 'Soybean'}</span>
          <span>📐 ${b.area_acres || 1} ac</span>
          <span>${b.urgency === 'urgent' ? '🔴 Urgent' : '🟢 Normal'}</span>
        </div>
        <div class="bk-actions">
          ${b.status === 'pending' ? `
            <button class="bk-btn bk-btn-dispatch" onclick="event.stopPropagation(); dispatch('${id}')">🛸 Dispatch</button>
            <button class="bk-btn bk-btn-cancel" onclick="event.stopPropagation(); cancel('${id}')">✕</button>
          ` : b.status === 'dispatched' ? `
            <button class="bk-btn bk-btn-complete" onclick="event.stopPropagation(); complete('${id}')">✅ Complete</button>
          ` : `
            <button class="bk-btn bk-btn-done">${b.status === 'completed' ? 'Finished' : b.status}</button>
          `}
        </div>
      </div>
    `;
  }).join('');
}

function setConnection(s) {
  const el = document.getElementById('connStatus');
  const dot = el.querySelector('.conn-dot');
  const txt = el.querySelector('span:last-child');
  dot.className = 'conn-dot';
  if (s === 'ok') { dot.classList.add('ok'); txt.textContent = 'API Connected'; }
  else if (s === 'err') { dot.classList.add('err'); txt.textContent = 'API Offline'; }
  else { txt.textContent = 'Connecting...'; }
}

// ═══════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════
window.selectBooking = function(id) {
  selectedBookingId = id;
  const b = bookings.find(x => (x.booking_id || x.id) === id);
  if (b && b.latitude && b.longitude) {
    map.flyTo([b.latitude, b.longitude], 16, { duration: 1 });
    const mk = markers[id];
    if (mk) mk.openPopup();
  }
  renderBookings();
};

window.dispatch = async function(id) {
  try {
    const res = await fetch(`${API}/drone/bookings/${id}/dispatch`, { method: 'PATCH' });
    if (!res.ok) throw new Error();
    toast('🛸 Drone dispatched!');
    simulateDrone(id);
    await loadAll();
  } catch { toast('❌ Dispatch failed', true); }
};

window.cancel = async function(id) {
  try {
    const res = await fetch(`${API}/drone/bookings/${id}/cancel`, { method: 'PATCH' });
    if (!res.ok) throw new Error();
    toast('Booking cancelled');
    await loadAll();
  } catch { toast('❌ Cancel failed', true); }
};

window.complete = async function(id) {
  try {
    // Gather detections from uploaded image analysis results on the map
    const booking = bookings.find(b => (b.booking_id || b.id) === id);
    const baseLat = booking?.latitude || MAP_CENTER[0];
    const baseLng = booking?.longitude || MAP_CENTER[1];

    // Collect field markers that were added during this session's image analysis
    const detections = [];
    Object.keys(markers).forEach(key => {
      if (key.startsWith('scan-')) {
        const mk = markers[key];
        const ll = mk.getLatLng();
        const popupContent = mk.getPopup()?.getContent() || '';
        const diseaseMatch = popupContent.match(/<b>(.*?)<\/b>/);
        detections.push({
          capture_id: key,
          latitude: ll.lat,
          longitude: ll.lng,
          disease: diseaseMatch ? diseaseMatch[1] : 'Unknown',
          confidence: 0.85,
        });
      }
    });

    // If no detections from image analysis, create placeholder from booking location
    if (detections.length === 0) {
      detections.push({
        capture_id: `${id}-${Date.now()}`,
        latitude: baseLat + (Math.random() - 0.5) * 0.005,
        longitude: baseLng + (Math.random() - 0.5) * 0.005,
        disease: 'Frogeye Leaf Spot',
        confidence: 0.82,
      });
    }

    const res = await fetch(`${API}/drone/bookings/${id}/complete`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scan_results: {
          areas_scanned: booking?.area_acres || 1,
          detections,
          timestamp: new Date().toISOString(),
        }
      })
    });
    if (!res.ok) throw new Error();
    toast('✅ Mission completed! Disease markers sent to farmer app.');
    hideSimulation();
    await loadAll();
  } catch { toast('❌ Complete failed', true); }
};

// ═══════════════════════════════════════════
// DRONE SIMULATION
// ═══════════════════════════════════════════
function simulateDrone(id) {
  const overlay = document.getElementById('droneOverlay');
  const bar = document.getElementById('droneProgressBar');
  const title = document.getElementById('droneSimTitle');
  const detail = document.getElementById('droneSimDetail');

  overlay.style.display = 'block';
  bar.style.width = '0%';
  title.textContent = `Drone Dispatched — ${id}`;

  const stages = [
    { pct: 10, text: 'Taking off...' },
    { pct: 30, text: 'Flying to field...' },
    { pct: 50, text: 'Reached field — scanning crops...' },
    { pct: 70, text: 'AI analysis in progress...' },
    { pct: 90, text: 'Generating report...' },
    { pct: 100, text: 'Scan complete! Click "Complete" to finish.' },
  ];

  stages.forEach((s, i) => {
    setTimeout(() => {
      bar.style.width = s.pct + '%';
      detail.textContent = s.text;
    }, (i + 1) * 2000);
  });
}

function hideSimulation() {
  document.getElementById('droneOverlay').style.display = 'none';
}

// ═══════════════════════════════════════════
// FILTERS
// ═══════════════════════════════════════════
function setupFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filter = btn.dataset.filter;
      renderBookings();
    });
  });
}

// ═══════════════════════════════════════════
// AI MODEL (ONNX)
// ═══════════════════════════════════════════
async function loadModel() {
  const statusEl = document.getElementById('modelStatus');
  const dot = statusEl.querySelector('.model-dot');
  const txt = statusEl.querySelector('span:last-child');

  try {
    txt.textContent = 'Loading soybean UAV model...';

    // Configure ONNX Runtime to use WASM backend
    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/';

    onnxSession = await ort.InferenceSession.create('/model/soybean_uav_modellll.onnx', {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });

    dot.className = 'model-dot loaded';
    txt.textContent = 'AI Model ready — soybean_uav';
    console.log('[ONNX] Model loaded. Inputs:', onnxSession.inputNames, 'Outputs:', onnxSession.outputNames);
  } catch (err) {
    console.error('[ONNX] Load error:', err);
    dot.className = 'model-dot error';
    txt.textContent = 'Model failed — using simulated inference';
  }
}

async function runInference(imageElement) {
  // If ONNX model loaded, use it
  if (onnxSession) {
    try {
      const tensor = preprocessImage(imageElement);
      const feeds = {};
      feeds[onnxSession.inputNames[0]] = tensor;
      const results = await onnxSession.run(feeds);
      const output = results[onnxSession.outputNames[0]];
      const scores = Array.from(output.data);

      // Softmax
      const maxScore = Math.max(...scores);
      const exps = scores.map(s => Math.exp(s - maxScore));
      const sumExps = exps.reduce((a, b) => a + b, 0);
      const probs = exps.map(e => e / sumExps);

      const topIdx = probs.indexOf(Math.max(...probs));
      return { classIdx: topIdx, confidence: probs[topIdx], allScores: probs };
    } catch (err) {
      console.error('[ONNX] Inference error:', err);
    }
  }

  // Fallback: simulated inference
  const classIdx = Math.random() > 0.25 ? Math.floor(Math.random() * 7) : 2;
  const confidence = classIdx === 2 ? 0.92 : (0.65 + Math.random() * 0.3);
  return { classIdx, confidence, allScores: null };
}

function preprocessImage(imgEl) {
  // Resize image to 224x224 and normalize to [0,1] in CHW format
  const canvas = document.createElement('canvas');
  canvas.width = 224;
  canvas.height = 224;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imgEl, 0, 0, 224, 224);
  const imgData = ctx.getImageData(0, 0, 224, 224);
  const { data } = imgData;

  // ImageNet normalization — mean and std
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];

  const float32Data = new Float32Array(3 * 224 * 224);
  for (let i = 0; i < 224 * 224; i++) {
    float32Data[i]                = (data[i * 4] / 255 - mean[0]) / std[0];     // R
    float32Data[i + 224 * 224]     = (data[i * 4 + 1] / 255 - mean[1]) / std[1]; // G
    float32Data[i + 2 * 224 * 224] = (data[i * 4 + 2] / 255 - mean[2]) / std[2]; // B
  }

  return new ort.Tensor('float32', float32Data, [1, 3, 224, 224]);
}

// ═══════════════════════════════════════════
// UPLOAD & SCAN
// ═══════════════════════════════════════════
function setupUpload() {
  const zone = document.getElementById('uploadZone');
  const input = document.getElementById('imageInput');

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('dragover'); processFiles(e.dataTransfer.files); });
  input.addEventListener('change', () => processFiles(input.files));
}

async function processFiles(files) {
  if (!files.length) return;
  const area = document.getElementById('resultsArea');
  area.innerHTML = '<p style="color:var(--text3); text-align:center; padding:20px;">🔄 Analyzing images with AI model...</p>';

  const results = [];

  for (const file of files) {
    const imgUrl = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise(resolve => {
      img.onload = resolve;
      img.src = imgUrl;
    });

    const { classIdx, confidence, allScores } = await runInference(img);
    const label = LABELS[classIdx] || LABELS[1];

    results.push({ filename: file.name, imgUrl, label, confidence, allScores });
  }

  // Render results
  area.innerHTML = results.map(r => `
    <div class="result-card">
      <img src="${r.imgUrl}" alt="${r.filename}" />
      <div class="result-disease">
        ${r.label.name}
        <span class="severity-tag sev-${r.label.sev}">${r.label.severity}</span>
      </div>
      <div class="result-meta">
        ${(r.confidence * 100).toFixed(1)}% confidence • ${r.filename}
      </div>
      ${r.allScores ? `
        <div style="margin-top:8px;">
          ${r.allScores.map((s, i) => `
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:3px;">
              <div style="width:8px;height:8px;border-radius:50%;background:${LABELS[i].color};flex-shrink:0;"></div>
              <span style="font-size:10px;color:var(--text3);flex:1;">${LABELS[i].name}</span>
              <div style="width:60px;height:3px;background:var(--border);border-radius:2px;">
                <div style="width:${(s*100).toFixed(0)}%;height:100%;background:${LABELS[i].color};border-radius:2px;"></div>
              </div>
              <span style="font-size:10px;color:var(--text2);width:35px;text-align:right;">${(s*100).toFixed(1)}%</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      <div class="result-cure">💊 ${r.label.cure}</div>
    </div>
  `).join('');

  // Add detection markers to map
  results.forEach(r => {
    if (r.label.sev !== 'none') {
      const lat = MAP_CENTER[0] + (Math.random() - 0.5) * 0.01;
      const lng = MAP_CENTER[1] + (Math.random() - 0.5) * 0.01;
      addFieldMarker(lat, lng, r.label.name, r.label.sev, `scan-${Date.now()}`);
    }
  });

  toast(`Analyzed ${results.length} image${results.length > 1 ? 's' : ''}`);
}

// ═══════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════
function toast(msg, isError = false) {
  const container = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast${isError ? ' error' : ''}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 3000);
}
