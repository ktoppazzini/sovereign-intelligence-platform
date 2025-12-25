/**
 * Sovereign Intelligence - Store Screenshot Generator
 * 
 * Generates screenshots for Google Play and Apple App Store listings.
 * Run with: node scripts/generate-screenshots.js
 * 
 * Requirements: npm install puppeteer
 */

const fs = require('fs');
const path = require('path');

// Screenshot configurations for different devices
const SCREENSHOT_CONFIGS = {
  // Google Play Store requirements
  googlePlay: {
    phone: [
      { width: 1080, height: 1920, name: 'play-phone-1.png', route: '/' },
      { width: 1080, height: 1920, name: 'play-phone-2.png', route: '/dashboard' },
      { width: 1080, height: 1920, name: 'play-phone-3.png', route: '/reform' },
      { width: 1080, height: 1920, name: 'play-phone-4.png', route: '/verticals/defense' },
      { width: 1080, height: 1920, name: 'play-phone-5.png', route: '/assistant' },
    ],
    tablet7: [
      { width: 1200, height: 1920, name: 'play-tablet7-1.png', route: '/' },
      { width: 1200, height: 1920, name: 'play-tablet7-2.png', route: '/dashboard' },
    ],
    tablet10: [
      { width: 1920, height: 1200, name: 'play-tablet10-1.png', route: '/' },
      { width: 1920, height: 1200, name: 'play-tablet10-2.png', route: '/dashboard' },
    ],
  },
  
  // Apple App Store requirements
  appStore: {
    iphone65: [ // 6.5" (iPhone 11 Pro Max, 12 Pro Max, etc.)
      { width: 1284, height: 2778, name: 'ios-65-1.png', route: '/' },
      { width: 1284, height: 2778, name: 'ios-65-2.png', route: '/dashboard' },
      { width: 1284, height: 2778, name: 'ios-65-3.png', route: '/reform' },
      { width: 1284, height: 2778, name: 'ios-65-4.png', route: '/verticals/defense' },
      { width: 1284, height: 2778, name: 'ios-65-5.png', route: '/assistant' },
    ],
    iphone55: [ // 5.5" (iPhone 8 Plus, etc.)
      { width: 1242, height: 2208, name: 'ios-55-1.png', route: '/' },
      { width: 1242, height: 2208, name: 'ios-55-2.png', route: '/dashboard' },
    ],
    ipad129: [ // 12.9" iPad Pro
      { width: 2048, height: 2732, name: 'ios-ipad129-1.png', route: '/' },
      { width: 2048, height: 2732, name: 'ios-ipad129-2.png', route: '/dashboard' },
    ],
    ipad11: [ // 11" iPad Pro
      { width: 1668, height: 2388, name: 'ios-ipad11-1.png', route: '/' },
      { width: 1668, height: 2388, name: 'ios-ipad11-2.png', route: '/dashboard' },
    ],
  },
};

async function generateScreenshots() {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch (e) {
    console.log('Puppeteer not installed. Installing now...');
    const { execSync } = require('child_process');
    execSync('npm install puppeteer', { stdio: 'inherit' });
    puppeteer = require('puppeteer');
  }

  const screenshotsDir = path.join(__dirname, '..', 'store-assets', 'screenshots');
  
  // Create directories
  const dirs = [
    path.join(screenshotsDir, 'google-play'),
    path.join(screenshotsDir, 'app-store'),
  ];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  
  console.log('📸 Generating store screenshots...\n');
  console.log(`Base URL: ${baseUrl}\n`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // Generate Google Play screenshots
  console.log('🤖 Google Play Store Screenshots:\n');
  for (const [device, configs] of Object.entries(SCREENSHOT_CONFIGS.googlePlay)) {
    for (const config of configs) {
      const page = await browser.newPage();
      await page.setViewport({ 
        width: config.width, 
        height: config.height,
        deviceScaleFactor: 1,
      });
      
      try {
        await page.goto(`${baseUrl}${config.route}`, { 
          waitUntil: 'networkidle2',
          timeout: 30000,
        });
        
        // Wait for animations
        await page.waitForTimeout(2000);
        
        const outputPath = path.join(screenshotsDir, 'google-play', config.name);
        await page.screenshot({ path: outputPath, fullPage: false });
        console.log(`  ✅ ${device}: ${config.name}`);
      } catch (err) {
        console.error(`  ❌ ${device}: ${config.name} - ${err.message}`);
      }
      
      await page.close();
    }
  }

  // Generate App Store screenshots
  console.log('\n🍎 Apple App Store Screenshots:\n');
  for (const [device, configs] of Object.entries(SCREENSHOT_CONFIGS.appStore)) {
    for (const config of configs) {
      const page = await browser.newPage();
      await page.setViewport({ 
        width: config.width, 
        height: config.height,
        deviceScaleFactor: 1,
      });
      
      try {
        await page.goto(`${baseUrl}${config.route}`, { 
          waitUntil: 'networkidle2',
          timeout: 30000,
        });
        
        // Wait for animations
        await page.waitForTimeout(2000);
        
        const outputPath = path.join(screenshotsDir, 'app-store', config.name);
        await page.screenshot({ path: outputPath, fullPage: false });
        console.log(`  ✅ ${device}: ${config.name}`);
      } catch (err) {
        console.error(`  ❌ ${device}: ${config.name} - ${err.message}`);
      }
      
      await page.close();
    }
  }

  await browser.close();

  console.log('\n🎉 Screenshot generation complete!');
  console.log(`\n📁 Screenshots saved to: ${screenshotsDir}`);
}

// Run if called directly
if (require.main === module) {
  generateScreenshots().catch(console.error);
}

module.exports = { generateScreenshots, SCREENSHOT_CONFIGS };
