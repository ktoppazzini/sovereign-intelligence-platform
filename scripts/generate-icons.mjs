/**
 * Sovereign Intelligence - Icon Generator Script
 * 
 * This script generates all required PWA icons from the base SVG.
 * Run with: node scripts/generate-icons.mjs
 * 
 * Requirements: npm install sharp
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Icon sizes required for PWA, iOS, and Android
const ICON_SIZES = [
  // PWA Standard
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
  
  // Apple Touch Icons
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 120, name: 'apple-touch-icon-120x120.png' },
  { size: 152, name: 'apple-touch-icon-152x152.png' },
  { size: 167, name: 'apple-touch-icon-167x167.png' },
  { size: 180, name: 'apple-touch-icon-180x180.png' },
  
  // Android Chrome
  { size: 36, name: 'android-chrome-36x36.png' },
  { size: 48, name: 'android-chrome-48x48.png' },
  { size: 72, name: 'android-chrome-72x72.png' },
  { size: 96, name: 'android-chrome-96x96.png' },
  { size: 144, name: 'android-chrome-144x144.png' },
  { size: 192, name: 'android-chrome-192x192.png' },
  { size: 256, name: 'android-chrome-256x256.png' },
  { size: 384, name: 'android-chrome-384x384.png' },
  { size: 512, name: 'android-chrome-512x512.png' },
  
  // Favicon
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 48, name: 'favicon-48x48.png' },
  
  // Windows Tiles
  { size: 70, name: 'mstile-70x70.png' },
  { size: 150, name: 'mstile-150x150.png' },
  { size: 310, name: 'mstile-310x310.png' },
];

// Maskable icon sizes (for Android adaptive icons)
const MASKABLE_SIZES = [
  { size: 192, name: 'maskable-192x192.png' },
  { size: 512, name: 'maskable-512x512.png' },
];

async function generateIcons() {
  const iconsDir = path.join(__dirname, '..', 'public', 'icons');
  const baseSvg = path.join(iconsDir, 'icon-base.svg');
  const maskableSvg = path.join(iconsDir, 'icon-maskable.svg');

  // Ensure icons directory exists
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  console.log('🎨 Generating Sovereign Intelligence icons...\n');

  // Generate standard icons
  for (const icon of ICON_SIZES) {
    const width = icon.width || icon.size;
    const height = icon.height || icon.size;
    const outputPath = path.join(iconsDir, icon.name);
    
    try {
      await sharp(baseSvg)
        .resize(width, height)
        .png()
        .toFile(outputPath);
      console.log(`✅ Generated: ${icon.name} (${width}x${height})`);
    } catch (err) {
      console.error(`❌ Failed: ${icon.name} - ${err.message}`);
    }
  }

  // Generate maskable icons
  console.log('\n🎭 Generating maskable icons...\n');
  for (const icon of MASKABLE_SIZES) {
    const outputPath = path.join(iconsDir, icon.name);
    
    try {
      await sharp(maskableSvg)
        .resize(icon.size, icon.size)
        .png()
        .toFile(outputPath);
      console.log(`✅ Generated: ${icon.name}`);
    } catch (err) {
      console.error(`❌ Failed: ${icon.name} - ${err.message}`);
    }
  }

  // Generate favicon.ico (using 32x32 PNG)
  console.log('\n📌 Copying favicon...\n');
  try {
    const favicon32 = path.join(iconsDir, 'favicon-32x32.png');
    const faviconDest = path.join(__dirname, '..', 'public', 'favicon.ico');
    if (fs.existsSync(favicon32)) {
      fs.copyFileSync(favicon32, faviconDest);
      console.log('✅ Copied: favicon.ico');
    }
  } catch (err) {
    console.error(`❌ Failed to copy favicon.ico: ${err.message}`);
  }

  console.log('\n🎉 Icon generation complete!');
  console.log(`\n📁 Icons saved to: ${iconsDir}`);
}

// Run
generateIcons().catch(console.error);
