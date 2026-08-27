// Generate PWA icons for PharmaChain
// Creates SVG master icons then converts to PNG using sharp
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const sizes = [72, 96, 120, 128, 144, 152, 192, 384, 512];

function svgIcon(size, { maskable = false } = {}) {
  const bg = '#4f46e5';
  const cross = '#ffffff';
  const crossW = maskable ? size * 0.45 : size * 0.5;
  const crossH = maskable ? size * 0.45 : size * 0.5;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg}" />
      <stop offset="100%" stop-color="#8b5cf6" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)" rx="${size * 0.22}" />
  <rect x="${(size - crossW) / 2}" y="${(size - crossH) / 2 - crossH * 0.2}" width="${crossW}" height="${crossH * 0.4}" rx="${size * 0.05}" fill="${cross}" />
  <rect x="${(size - crossW) / 2 + crossW * 0.3}" y="${(size - crossH) / 2 - crossH * 0.1}" width="${crossW * 0.4}" height="${crossH * 0.8}" rx="${size * 0.05}" fill="${cross}" />
</svg>`;
}

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch (e) {
  console.warn('sharp not available, generating SVG only');
}

const svgFiles = [];

for (const size of sizes) {
  const svgContent = svgIcon(size);
  svgFiles.push({ size, content: svgContent });
}

// Write SVG masters
for (const { size, content } of svgFiles) {
  writeFileSync(join(outDir, `icon-${size}x${size}.svg`), content);
  writeFileSync(join(outDir, `icon-${size}x${size}-maskable.svg`), svgIcon(size, { maskable: true }));
}
writeFileSync(join(outDir, 'apple-touch-icon.svg'), svgIcon(180));
writeFileSync(join(outDir, 'favicon.svg'), svgIcon(48));

// Convert to PNG if sharp available
if (sharp) {
  for (const { size, content } of svgFiles) {
    // Regular icon
    await sharp(Buffer.from(content))
      .resize(size, size)
      .png()
      .toFile(join(outDir, `icon-${size}x${size}.png`));
    // Maskable icon
    await sharp(Buffer.from(svgIcon(size, { maskable: true })))
      .resize(size, size)
      .png()
      .toFile(join(outDir, `icon-${size}x${size}-maskable.png`));
  }
  // Apple touch icon 180x180
  await sharp(Buffer.from(svgIcon(180)))
    .resize(180, 180)
    .png()
    .toFile(join(outDir, 'apple-touch-icon.png'));
  // Favicon 48x48
  await sharp(Buffer.from(svgIcon(48)))
    .resize(48, 48)
    .png()
    .toFile(join(outDir, 'favicon.png'));
  console.log('PNG icons generated in public/icons/');
} else {
  console.log('SVG icons generated in public/icons/ (sharp not available)');
}

