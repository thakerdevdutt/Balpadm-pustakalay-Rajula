import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Clean SVG reproduction of the user's uploaded logo
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- Solid White Background -->
  <rect width="512" height="512" fill="#FFFFFF"/>
  
  <!-- Magnifying Glass Handle -->
  <!-- Handle neck connector -->
  <path d="M 194 316 L 165 345 L 183 363 L 212 334 Z" fill="#1D5299" />
  <!-- Main Handle (45 degree angled rounded pill) -->
  <g transform="translate(185, 325) rotate(135)">
    <rect x="-12" y="-26" width="195" height="52" rx="26" ry="26" fill="#1D5299" />
  </g>

  <!-- Magnifying Glass Lens Rim -->
  <circle cx="315" cy="195" r="150" fill="none" stroke="#1D5299" stroke-width="36"/>

  <!-- Dark Navy Eye Silhouette -->
  <path d="M 200 195 C 235 118, 395 118, 430 195 C 395 272, 235 272, 200 195 Z" fill="#112338"/>

  <!-- Iris White Ring -->
  <circle cx="315" cy="195" r="49" fill="none" stroke="#FFFFFF" stroke-width="13"/>

  <!-- White Glint Highlight on Ring -->
  <circle cx="350" cy="160" r="18" fill="#FFFFFF"/>
</svg>`;

// Maskable icon with 15% safe zone padding
const maskableSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#FFFFFF"/>
  <g transform="translate(51.2, 51.2) scale(0.8)">
    <path d="M 194 316 L 165 345 L 183 363 L 212 334 Z" fill="#1D5299" />
    <g transform="translate(185, 325) rotate(135)">
      <rect x="-12" y="-26" width="195" height="52" rx="26" ry="26" fill="#1D5299" />
    </g>
    <circle cx="315" cy="195" r="150" fill="none" stroke="#1D5299" stroke-width="36"/>
    <path d="M 200 195 C 235 118, 395 118, 430 195 C 395 272, 235 272, 200 195 Z" fill="#112338"/>
    <circle cx="315" cy="195" r="49" fill="none" stroke="#FFFFFF" stroke-width="13"/>
    <circle cx="350" cy="160" r="18" fill="#FFFFFF"/>
  </g>
</svg>`;

async function main() {
  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. Save SVG
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'icon-maskable.svg'), maskableSvgContent, 'utf8');

  const svgBuffer = Buffer.from(svgContent);
  const maskableSvgBuffer = Buffer.from(maskableSvgContent);

  // 2. Generate 512x512 standard icon
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // 3. Generate 192x192 standard icon
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // 4. Generate 512x512 maskable icon
  await sharp(maskableSvgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // 5. Generate apple-touch-icon (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 6. Generate favicon (64x64 and 32x32)
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));

  console.log('Successfully generated all PWA and web icons!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
