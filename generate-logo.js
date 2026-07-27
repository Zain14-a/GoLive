const sharp = require('sharp');
const path = require('path');

const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 150" width="600" height="150">
  <defs>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ff5c7a"/>
      <stop offset="100%" stop-color="#ff3b5c"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="600" height="150" fill="#0e0e12"/>
  <rect x="16" y="16" width="118" height="118" rx="16" fill="#18181f" stroke="#2a2a38" stroke-width="2"/>
  <rect x="28" y="36" width="56" height="78" rx="6" fill="url(#accentGrad)"/>
  <polygon points="94,55 118,75 94,95" fill="#e8e8ec" filter="url(#glow)"/>
  <text x="152" y="92" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="800" font-size="64" fill="#e8e8ec" letter-spacing="-2">Go</text>
  <text x="258" y="92" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="800" font-size="64" fill="url(#accentGrad)" letter-spacing="-2">Live</text>
  <line x1="152" y1="115" x2="390" y2="115" stroke="#2a2a38" stroke-width="1"/>
  <text x="152" y="133" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="400" font-size="14" fill="#8888a0" letter-spacing="4">RANDOM VIDEO CHAT</text>
</svg>`;

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1a1a24"/>
      <stop offset="100%" stop-color="#0e0e12"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ff5c7a"/>
      <stop offset="100%" stop-color="#ff3b5c"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="80" fill="url(#bg)"/>
  <rect x="80" y="80" width="352" height="352" rx="40" fill="#18181f" stroke="#2a2a38" stroke-width="4"/>
  <rect x="112" y="130" width="160" height="252" rx="16" fill="url(#accentGrad)"/>
  <polygon points="310,190 380,256 310,322" fill="#e8e8ec"/>
</svg>`;

const dest = 'C:\\Users\\Asus\\Desktop\\Go Live Proboganda';

async function generate() {
  await sharp(Buffer.from(logoSvg))
    .png()
    .toFile(path.join(dest, 'GoLive-Logo.png'));
  console.log('Logo PNG created');

  await sharp(Buffer.from(faviconSvg))
    .resize(256, 256)
    .png()
    .toFile(path.join(dest, 'GoLive-Favicon.png'));
  console.log('Favicon PNG created');

  await sharp(Buffer.from(faviconSvg))
    .png()
    .toFile(path.join(dest, 'GoLive-Favicon-512.png'));
  console.log('Favicon 512 PNG created');
}

generate().catch(console.error);
