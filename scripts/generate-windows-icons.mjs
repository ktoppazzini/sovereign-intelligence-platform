/**
 * Sovereign Intelligence - Windows Icon Generator
 * Generates all required Windows Store tile and icon assets
 * 
 * Run with: node scripts/generate-windows-icons.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Windows Store required assets
const WINDOWS_ASSETS = [
  // Store Logo
  { size: 300, name: 'StoreLogo.png' },
  { size: 50, name: 'StoreLogo.scale-100.png' },
  { size: 63, name: 'StoreLogo.scale-125.png' },
  { size: 75, name: 'StoreLogo.scale-150.png' },
  { size: 100, name: 'StoreLogo.scale-200.png' },
  { size: 200, name: 'StoreLogo.scale-400.png' },
  
  // Square 44x44 (App list icon)
  { size: 44, name: 'Square44x44Logo.png' },
  { size: 44, name: 'Square44x44Logo.scale-100.png' },
  { size: 55, name: 'Square44x44Logo.scale-125.png' },
  { size: 66, name: 'Square44x44Logo.scale-150.png' },
  { size: 88, name: 'Square44x44Logo.scale-200.png' },
  { size: 176, name: 'Square44x44Logo.scale-400.png' },
  
  // Square 150x150 (Medium tile)
  { size: 150, name: 'Square150x150Logo.png' },
  { size: 150, name: 'Square150x150Logo.scale-100.png' },
  { size: 188, name: 'Square150x150Logo.scale-125.png' },
  { size: 225, name: 'Square150x150Logo.scale-150.png' },
  { size: 300, name: 'Square150x150Logo.scale-200.png' },
  { size: 600, name: 'Square150x150Logo.scale-400.png' },
  
  // Square 310x310 (Large tile)
  { size: 310, name: 'Square310x310Logo.png' },
  { size: 310, name: 'Square310x310Logo.scale-100.png' },
  { size: 388, name: 'Square310x310Logo.scale-125.png' },
  { size: 465, name: 'Square310x310Logo.scale-150.png' },
  { size: 620, name: 'Square310x310Logo.scale-200.png' },
  
  // Wide 310x150 (Wide tile)
  { width: 310, height: 150, name: 'Wide310x150Logo.png' },
  { width: 310, height: 150, name: 'Wide310x150Logo.scale-100.png' },
  { width: 388, height: 188, name: 'Wide310x150Logo.scale-125.png' },
  { width: 465, height: 225, name: 'Wide310x150Logo.scale-150.png' },
  { width: 620, height: 300, name: 'Wide310x150Logo.scale-200.png' },
  
  // Small tile 71x71
  { size: 71, name: 'SmallTile.png' },
  { size: 71, name: 'SmallTile.scale-100.png' },
  { size: 89, name: 'SmallTile.scale-125.png' },
  { size: 107, name: 'SmallTile.scale-150.png' },
  { size: 142, name: 'SmallTile.scale-200.png' },
  { size: 284, name: 'SmallTile.scale-400.png' },
  
  // Splash Screen
  { width: 620, height: 300, name: 'SplashScreen.png' },
  { width: 620, height: 300, name: 'SplashScreen.scale-100.png' },
  { width: 775, height: 375, name: 'SplashScreen.scale-125.png' },
  { width: 930, height: 450, name: 'SplashScreen.scale-150.png' },
  { width: 1240, height: 600, name: 'SplashScreen.scale-200.png' },
  
  // Badge Logo
  { size: 24, name: 'BadgeLogo.png' },
  { size: 24, name: 'BadgeLogo.scale-100.png' },
  { size: 30, name: 'BadgeLogo.scale-125.png' },
  { size: 36, name: 'BadgeLogo.scale-150.png' },
  { size: 48, name: 'BadgeLogo.scale-200.png' },
  { size: 96, name: 'BadgeLogo.scale-400.png' },
  
  // Target size variants for Square44x44 (for various UI contexts)
  { size: 16, name: 'Square44x44Logo.targetsize-16.png' },
  { size: 24, name: 'Square44x44Logo.targetsize-24.png' },
  { size: 32, name: 'Square44x44Logo.targetsize-32.png' },
  { size: 48, name: 'Square44x44Logo.targetsize-48.png' },
  { size: 256, name: 'Square44x44Logo.targetsize-256.png' },
  
  // Unplated variants (no background, for light/dark themes)
  { size: 16, name: 'Square44x44Logo.targetsize-16_altform-unplated.png' },
  { size: 24, name: 'Square44x44Logo.targetsize-24_altform-unplated.png' },
  { size: 32, name: 'Square44x44Logo.targetsize-32_altform-unplated.png' },
  { size: 48, name: 'Square44x44Logo.targetsize-48_altform-unplated.png' },
  { size: 256, name: 'Square44x44Logo.targetsize-256_altform-unplated.png' },
];

async function generateWindowsIcons() {
  const iconsDir = path.join(__dirname, '..', 'public', 'icons');
  const windowsDir = path.join(__dirname, '..', 'windows-store', 'Assets');
  const baseSvg = path.join(iconsDir, 'icon-base.svg');
  const maskableSvg = path.join(iconsDir, 'icon-maskable.svg');

  // Ensure Windows assets directory exists
  if (!fs.existsSync(windowsDir)) {
    fs.mkdirSync(windowsDir, { recursive: true });
  }

  console.log('🪟 Generating Windows Store assets...\n');

  for (const asset of WINDOWS_ASSETS) {
    const width = asset.width || asset.size;
    const height = asset.height || asset.size;
    const outputPath = path.join(windowsDir, asset.name);
    
    // Use maskable SVG for square icons to ensure safe zone
    const sourceSvg = asset.name.includes('Wide') || asset.name.includes('Splash') 
      ? baseSvg 
      : maskableSvg;
    
    try {
      if (width === height) {
        // Square icon
        await sharp(sourceSvg)
          .resize(width, height)
          .png()
          .toFile(outputPath);
      } else {
        // Wide/rectangular icon - need to compose
        const iconSize = Math.min(width, height) - 40; // Padding
        const icon = await sharp(baseSvg)
          .resize(iconSize, iconSize)
          .toBuffer();
        
        // Create background and composite icon
        await sharp({
          create: {
            width,
            height,
            channels: 4,
            background: { r: 10, g: 22, b: 40, alpha: 1 } // #0a1628
          }
        })
          .composite([{
            input: icon,
            gravity: 'center'
          }])
          .png()
          .toFile(outputPath);
      }
      console.log(`✅ Generated: ${asset.name} (${width}x${height})`);
    } catch (err) {
      console.error(`❌ Failed: ${asset.name} - ${err.message}`);
    }
  }

  console.log('\n🎉 Windows assets generation complete!');
  console.log(`\n📁 Assets saved to: ${windowsDir}`);
}

// Run
generateWindowsIcons().catch(console.error);
