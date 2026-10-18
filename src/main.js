import QRCode from 'qrcode';
import './style.css';

const $ = (selector) => document.querySelector(selector);
const canvas = $('#qr-canvas');
let contentType = 'link';
let exportSize = 512;
let currentPayload = '';
let renderId = 0;

function escapeWifi(value) {
  return value.replace(/[\\;:,\"]/g, (character) => `\\${character}`);
}

function getPayload() {
  if (contentType === 'link') {
    const value = $('#link-input').value.trim();
    if (!value) return { error: 'Masukkan URL untuk membuat QR code.' };
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new Error();
      return { value: url.href };
    } catch {
      return { error: 'URL tidak valid. Gunakan alamat http:// atau https://.' };
    }
  }
  if (contentType === 'text') {
    const value = $('#text-input').value;
    if (!value.trim()) return { error: 'Tulis teks untuk membuat QR code.' };
    if (value.length > 1200) return { error: 'Teks terlalu panjang. Batasi hingga 1.200 karakter.' };
    return { value };
  }
  const ssid = $('#ssid-input').value;
  const security = $('#security-input').value;
  if (!ssid.trim()) return { error: 'Masukkan nama jaringan Wi-Fi.' };
  const password = $('#password-input').value;
  if (security !== 'nopass' && !password) return { error: 'Masukkan kata sandi Wi-Fi.' };
  const value = `WIFI:T:${security};S:${escapeWifi(ssid)};${security === 'nopass' ? '' : `P:${escapeWifi(password)};`}H:${$('#hidden-input').checked ? 'true' : 'false'};;`;
  return { value };
}

function setStatus(message, error = false) {
  $('#status').textContent = message;
  $('#status').classList.toggle('error', error);
}

function setDownloadState(enabled) {
  $('#download-png').disabled = !enabled;
  $('#download-svg').disabled = !enabled;
}

async function refresh() {
  const thisRender = ++renderId;
  const result = getPayload();
  if (result.error) {
    currentPayload = '';
    canvas.hidden = true;
    $('#qr-placeholder').hidden = false;
    setDownloadState(false);
    setStatus(result.error, Boolean($('#link-input').value || $('#text-input').value || $('#ssid-input').value));
    return;
  }
  try {
    await QRCode.toCanvas(canvas, result.value, {
      width: 360,
      margin: 4,
      errorCorrectionLevel: 'L',
      color: { dark: $('#foreground-input').value, light: $('#background-input').value }
    });
    if (thisRender !== renderId) return;
    currentPayload = result.value;
    canvas.hidden = false;
    $('#qr-placeholder').hidden = true;
    setDownloadState(true);
    setStatus('QR code siap dipindai.');
  } catch {
    if (thisRender !== renderId) return;
    currentPayload = '';
    canvas.hidden = true;
    $('#qr-placeholder').hidden = false;
    setDownloadState(false);
    setStatus('Konten terlalu panjang untuk dibuat sebagai QR code.', true);
  }
}

function updateActiveTab(type) {
  contentType = type;
  document.querySelectorAll('.tab').forEach((tab) => {
    const active = tab.dataset.type === type;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  document.querySelectorAll('.form-panel').forEach((panel) => {
    const active = panel.dataset.panel === type;
    panel.hidden = !active;
    panel.classList.toggle('active', active);
  });
  $('#content-panel').setAttribute('aria-labelledby', `tab-${type}`);
  refresh();
}

document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => updateActiveTab(tab.dataset.type)));
['#link-input', '#text-input', '#ssid-input', '#password-input', '#security-input', '#hidden-input', '#foreground-input', '#background-input'].forEach((selector) => $(selector).addEventListener('input', refresh));
$('#security-input').addEventListener('change', () => {
  const hasPassword = $('#security-input').value !== 'nopass';
  $('#password-field').hidden = !hasPassword;
  $('#password-input').required = hasPassword;
  refresh();
});
$('#text-input').addEventListener('input', () => { $('#char-count').textContent = `${$('#text-input').value.length} / 1.200`; });

for (const [id, output] of [['foreground-input', 'foreground-value'], ['background-input', 'background-value']]) {
  $(`#${id}`).addEventListener('input', (event) => {
    $(`#${output}`).textContent = event.target.value.toUpperCase();
    refresh();
  });
}

document.querySelectorAll('.size-option').forEach((button) => button.addEventListener('click', () => {
  exportSize = Number(button.dataset.size);
  document.querySelectorAll('.size-option').forEach((item) => {
    const selected = item === button;
    item.classList.toggle('selected', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
}));

$('#download-png').addEventListener('click', async () => {
  if (!currentPayload) return;
  const data = await QRCode.toDataURL(currentPayload, {
    width: exportSize,
    margin: 4,
    errorCorrectionLevel: 'L',
    color: { dark: $('#foreground-input').value, light: $('#background-input').value }
  });
  download(data, 'qr-studio.png');
});

$('#download-svg').addEventListener('click', async () => {
  if (!currentPayload) return;
  const svg = await QRCode.toString(currentPayload, {
    type: 'svg',
    width: exportSize,
    margin: 4,
    errorCorrectionLevel: 'L',
    color: { dark: $('#foreground-input').value, light: $('#background-input').value }
  });
  download(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, 'qr-studio.svg');
});

function download(href, filename) {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
}

refresh();
