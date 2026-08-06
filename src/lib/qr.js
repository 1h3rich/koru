import QRCode from 'qrcode'

// Genera el QR como data URL (PNG en base64), para incrustar
// directamente en un <img> sin subir nada a Storage.
export async function generarQrDataUrl(texto) {
  return QRCode.toDataURL(texto, { width: 240, margin: 1 })
}
