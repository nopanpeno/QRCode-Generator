import jsQR from 'jsqr';
import './style.css';

const $ = (selector) => document.querySelector(selector);
const video = $('#camera-video');
const decodeCanvas = document.createElement('canvas');
const decodeContext = decodeCanvas.getContext('2d', { willReadFrequently: true });
let stream;
let scanFrame;
let detector;
let scanBusy = false;
let scanning = false;

function status(message, isError = false) {
  $('#scan-status').textContent = message;
  $('#scan-status').classList.toggle('error', isError);
}

function showResult(value) {
  stopCamera();
  $('#result-text').textContent = value;
  $('#result-panel').hidden = false;
  const link = $('#open-link');
  try {
    const url = new URL(value);
    if (['http:', 'https:'].includes(url.protocol)) {
      link.href = url.href;
      link.hidden = false;
    } else link.hidden = true;
  } catch {
    link.hidden = true;
  }
  status('QR code berhasil dibaca.');
  $('#camera-button').textContent = 'Pindai lagi';
}

function stopCamera() {
  scanning = false;
  if (scanFrame) clearTimeout(scanFrame);
  scanFrame = undefined;
  stream?.getTracks().forEach((track) => track.stop());
  stream = undefined;
  video.srcObject = null;
  video.hidden = true;
  $('#camera-placeholder').hidden = false;
  $('#camera-box').classList.remove('camera-active');
}

async function createDetector() {
  if (!('BarcodeDetector' in globalThis)) return undefined;
  try {
    const formats = await BarcodeDetector.getSupportedFormats();
    return formats.includes('qr_code') ? new BarcodeDetector({ formats: ['qr_code'] }) : undefined;
  } catch {
    return undefined;
  }
}

async function decodeImage(source, width, height) {
  if (detector) {
    try {
      const codes = await detector.detect(source);
      if (codes[0]?.rawValue) return codes[0].rawValue;
    } catch {
      // Fall back to jsQR when the browser decoder cannot read this frame.
    }
  }
  const scale = Math.min(1, 1600 / Math.max(width, height));
  decodeCanvas.width = Math.max(1, Math.round(width * scale));
  decodeCanvas.height = Math.max(1, Math.round(height * scale));
  decodeContext.drawImage(source, 0, 0, decodeCanvas.width, decodeCanvas.height);
  const imageData = decodeContext.getImageData(0, 0, decodeCanvas.width, decodeCanvas.height);
  return jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' })?.data;
}

async function startCamera() {
  if (scanning) {
    stopCamera();
    status('Pemindaian dijeda. Tekan tombol untuk mulai lagi.');
    $('#camera-button').textContent = 'Mulai pindai';
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    status('Browser ini tidak mendukung kamera. Pilih gambar QR sebagai gantinya.', true);
    return;
  }
  try {
    detector = await createDetector();
    $('#result-panel').hidden = true;
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' } } });
    video.srcObject = stream;
    video.hidden = false;
    $('#camera-placeholder').hidden = true;
    $('#camera-box').classList.add('camera-active');
    await video.play();
    scanning = true;
    $('#camera-button').textContent = 'Jeda pindai';
    status('Arahkan kamera ke QR code.');
    scanFrame = setTimeout(scanCameraFrame, 100);
  } catch (error) {
    stopCamera();
    const message = error.name === 'NotAllowedError'
      ? 'Izin kamera belum diberikan. Izinkan kamera atau pilih gambar QR.'
      : 'Kamera tidak dapat dibuka. Pilih gambar QR sebagai gantinya.';
    status(message, true);
  }
}

async function scanCameraFrame() {
  if (!scanning) return;
  if (!scanBusy && video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA && video.videoWidth) {
    scanBusy = true;
    try {
      const value = await decodeImage(video, video.videoWidth, video.videoHeight);
      if (value) {
        showResult(value);
        return;
      }
    } catch {
      status('Pemindaian terganggu. Coba arahkan kamera dengan lebih stabil.', true);
    } finally {
      scanBusy = false;
    }
  }
  if (scanning) scanFrame = setTimeout(scanCameraFrame, 120);
}

async function scanImage(file) {
  if (!file) return;
  stopCamera();
  $('#result-panel').hidden = true;
  status('Membaca gambar QR...');
  let bitmap;
  try {
    detector = await createDetector();
    bitmap = await createImageBitmap(file);
    const value = await decodeImage(bitmap, bitmap.width, bitmap.height);
    if (value) showResult(value);
    else status('QR code tidak ditemukan. Coba gambar yang lebih jelas dan tidak terpotong.', true);
  } catch {
    status('Gambar tidak bisa dibaca. Coba pilih file gambar lain.', true);
  } finally {
    bitmap?.close();
  }
}

document.querySelectorAll('.scanner-tab').forEach((tab) => tab.addEventListener('click', () => {
  const isCamera = tab.id === 'camera-tab';
  stopCamera();
  document.querySelectorAll('.scanner-tab').forEach((item) => {
    const active = item === tab;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', String(active));
  });
  $('#camera-panel').hidden = !isCamera;
  $('#image-panel').hidden = isCamera;
  status(isCamera ? 'Arahkan kamera ke QR code yang ingin dibaca.' : 'Pilih gambar yang berisi QR code.');
}));

$('#camera-button').addEventListener('click', startCamera);
$('#image-input').addEventListener('change', (event) => scanImage(event.target.files[0]));
$('#copy-button').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('#result-text').textContent);
    $('#copy-button').textContent = 'Tersalin';
    setTimeout(() => { $('#copy-button').textContent = 'Salin teks'; }, 1600);
  } catch {
    status('Tidak bisa menyalin otomatis. Pilih teks hasil pindai untuk menyalinnya.', true);
  }
});

window.addEventListener('pagehide', stopCamera);
