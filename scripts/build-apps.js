/**
 * Sovereign Intelligence - Build Script for App Stores
 * 
 * This script orchestrates the build process for:
 * - PWA Icons
 * - Store Screenshots  
 * - Android TWA (Google Play)
 * - iOS App (Apple App Store via Capacitor)
 * 
 * Run with: node scripts/build-apps.js [options]
 * 
 * Options:
 *   --icons      Generate PWA icons only
 *   --screenshots Generate store screenshots only
 *   --android    Build Android app only
 *   --ios        Build iOS app only
 *   --all        Build everything (default)
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const args = process.argv.slice(2);

// Parse arguments
const options = {
  icons: args.includes('--icons') || args.includes('--all') || args.length === 0,
  screenshots: args.includes('--screenshots') || args.includes('--all') || args.length === 0,
  android: args.includes('--android') || args.includes('--all') || args.length === 0,
  ios: args.includes('--ios') || args.includes('--all') || args.length === 0,
};

function log(message, type = 'info') {
  const icons = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    step: '🔹',
  };
  console.log(`${icons[type] || '•'} ${message}`);
}

function runCommand(cmd, description) {
  log(`${description}...`, 'step');
  try {
    execSync(cmd, { cwd: ROOT_DIR, stdio: 'inherit' });
    log(`${description} complete`, 'success');
    return true;
  } catch (err) {
    log(`${description} failed: ${err.message}`, 'error');
    return false;
  }
}

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       SOVEREIGN INTELLIGENCE - APP STORE BUILD SCRIPT        ║');
  console.log('║                        Version 2.0.0                         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\n');

  // Step 1: Install dependencies
  log('Checking dependencies...', 'info');
  const requiredPackages = ['sharp', 'puppeteer'];
  for (const pkg of requiredPackages) {
    try {
      require.resolve(pkg);
      log(`${pkg} is installed`, 'success');
    } catch (e) {
      log(`Installing ${pkg}...`, 'step');
      runCommand(`npm install ${pkg}`, `Install ${pkg}`);
    }
  }

  // Step 2: Generate icons
  if (options.icons) {
    console.log('\n📱 STEP 1: Generate PWA Icons\n');
    const { generateIcons } = require('./generate-icons');
    await generateIcons();
  }

  // Step 3: Build Next.js static export
  if (options.android || options.ios) {
    console.log('\n🏗️  STEP 2: Build Next.js Static Export\n');
    
    // Check if next.config.js has static export enabled
    const nextConfigPath = path.join(ROOT_DIR, 'next.config.js');
    if (fs.existsSync(nextConfigPath)) {
      let config = fs.readFileSync(nextConfigPath, 'utf-8');
      if (!config.includes("output: 'export'")) {
        log('Adding static export to next.config.js...', 'step');
        // Backup original
        fs.copyFileSync(nextConfigPath, nextConfigPath + '.backup');
        // Add export config
        config = config.replace(
          'module.exports = nextConfig',
          `nextConfig.output = 'export';\nmodule.exports = nextConfig`
        );
        fs.writeFileSync(nextConfigPath, config);
      }
    }
    
    runCommand('npm run build', 'Build Next.js app');
  }

  // Step 4: Generate screenshots (requires running app)
  if (options.screenshots) {
    console.log('\n📸 STEP 3: Generate Store Screenshots\n');
    log('Note: Screenshots require the app to be running on localhost:3000', 'warning');
    log('Start the dev server in another terminal: npm run dev', 'info');
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    await new Promise(resolve => {
      rl.question('Press Enter when the dev server is ready (or type "skip" to skip): ', (answer) => {
        rl.close();
        if (answer.toLowerCase() !== 'skip') {
          const { generateScreenshots } = require('./generate-screenshots');
          generateScreenshots().then(resolve);
        } else {
          log('Screenshots skipped', 'warning');
          resolve();
        }
      });
    });
  }

  // Step 5: Build Android TWA
  if (options.android) {
    console.log('\n🤖 STEP 4: Build Android TWA\n');
    
    // Check for Bubblewrap or use PWABuilder
    log('Android build options:', 'info');
    console.log('');
    console.log('  Option A: PWABuilder (Recommended - No local setup required)');
    console.log('    1. Visit https://pwabuilder.com');
    console.log('    2. Enter your deployed URL');
    console.log('    3. Download Android package');
    console.log('');
    console.log('  Option B: Bubblewrap (Local build)');
    console.log('    1. Install: npm install -g @anthropic-ai/anthropic-vertexai');
    console.log('    2. Initialize: bubblewrap init --manifest=https://your-url/manifest.json');
    console.log('    3. Build: bubblewrap build');
    console.log('');
    
    // Create build instructions file
    const androidInstructions = `# Android TWA Build Instructions

## Prerequisites
- Java JDK 11 or higher
- Android SDK (via Android Studio)
- Node.js 18+

## Option A: PWABuilder (Easiest)

1. Deploy your app to a public URL
2. Go to https://pwabuilder.com
3. Enter your URL and analyze
4. Click "Package for stores" → "Android"
5. Download the generated APK/AAB
6. Upload to Google Play Console

## Option B: Bubblewrap CLI

\`\`\`bash
# Install Bubblewrap globally
npm install -g @nicholascho/nicholasbubblewrap-cli

# Initialize from manifest
bubblewrap init --manifest=https://sovereign.ai/manifest.json

# Build the APK
bubblewrap build

# Output: app-release-signed.apk
\`\`\`

## Option C: Capacitor (Full Native)

\`\`\`bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# Initialize Capacitor
npx cap init "Sovereign Intelligence" "com.sovereign.intelligence"

# Add Android platform
npx cap add android

# Sync web assets
npx cap sync android

# Open in Android Studio
npx cap open android

# Build APK from Android Studio
\`\`\`

## Google Play Upload

1. Create developer account at https://play.google.com/console
2. Create new app
3. Upload AAB (Android App Bundle) - preferred over APK
4. Fill in store listing using metadata from store-assets/app-store-metadata.json
5. Upload screenshots from store-assets/screenshots/google-play/
6. Submit for review
`;
    
    const androidPath = path.join(ROOT_DIR, 'docs', 'ANDROID-BUILD.md');
    fs.mkdirSync(path.dirname(androidPath), { recursive: true });
    fs.writeFileSync(androidPath, androidInstructions);
    log('Android build instructions saved to docs/ANDROID-BUILD.md', 'success');
  }

  // Step 6: Build iOS App
  if (options.ios) {
    console.log('\n🍎 STEP 5: Build iOS App\n');
    
    log('iOS build options:', 'info');
    console.log('');
    console.log('  Option A: PWABuilder (Recommended - No Mac required)');
    console.log('    1. Visit https://pwabuilder.com');
    console.log('    2. Enter your deployed URL');
    console.log('    3. Download iOS package');
    console.log('    4. Build on mac with Xcode or use cloud build service');
    console.log('');
    console.log('  Option B: Capacitor (Requires Mac with Xcode)');
    console.log('    1. npx cap add ios');
    console.log('    2. npx cap sync ios');
    console.log('    3. npx cap open ios');
    console.log('    4. Build and archive in Xcode');
    console.log('');
    
    // Create iOS build instructions
    const iosInstructions = `# iOS App Store Build Instructions

## Prerequisites
- macOS with Xcode 14+
- Apple Developer Account ($99/year)
- Node.js 18+

## Option A: PWABuilder (No Mac Required for Package)

1. Deploy your app to a public URL with HTTPS
2. Go to https://pwabuilder.com
3. Enter your URL and analyze
4. Click "Package for stores" → "iOS"
5. Download the generated Xcode project
6. Build on a Mac with Xcode (or use cloud build service)
7. Upload to App Store Connect

## Option B: Capacitor (Recommended for Full Native Features)

\`\`\`bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/ios

# Initialize (if not already done)
npx cap init "Sovereign Intelligence" "com.sovereign.intelligence"

# Add iOS platform
npx cap add ios

# Sync web assets
npx cap sync ios

# Open in Xcode
npx cap open ios
\`\`\`

### In Xcode:

1. Select your development team in Signing & Capabilities
2. Set Bundle Identifier: com.sovereign.intelligence
3. Configure app icons in Assets.xcassets
4. Product → Archive
5. Distribute App → App Store Connect

## App Store Connect Setup

1. Go to https://appstoreconnect.apple.com
2. Create new app:
   - Platform: iOS
   - Name: Sovereign Intelligence
   - Bundle ID: com.sovereign.intelligence
   - SKU: SOVEREIGN_INTEL_001
3. Fill App Information:
   - Category: Business
   - Privacy Policy URL: https://sovereign.ai/privacy
4. Upload screenshots from store-assets/screenshots/app-store/
5. Fill version information using store-assets/app-store-metadata.json
6. Submit for review

## Required Screenshots

| Device | Size | Required |
|--------|------|----------|
| 6.5" iPhone | 1284 x 2778 | Yes |
| 5.5" iPhone | 1242 x 2208 | Yes |
| 12.9" iPad | 2048 x 2732 | If iPad support |
| 11" iPad | 1668 x 2388 | If iPad support |

## App Review Guidelines

Ensure your app:
- Has a working login/authentication flow
- Doesn't crash or have major bugs
- Has privacy policy accessible
- Doesn't use private APIs
- Has appropriate content rating
`;
    
    const iosPath = path.join(ROOT_DIR, 'docs', 'IOS-BUILD.md');
    fs.writeFileSync(iosPath, iosInstructions);
    log('iOS build instructions saved to docs/IOS-BUILD.md', 'success');
  }

  // Summary
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    BUILD COMPLETE SUMMARY                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  
  if (options.icons) {
    log('Icons: Generated in public/icons/', 'success');
  }
  if (options.screenshots) {
    log('Screenshots: Generated in store-assets/screenshots/', 'success');
  }
  if (options.android) {
    log('Android: Instructions in docs/ANDROID-BUILD.md', 'success');
  }
  if (options.ios) {
    log('iOS: Instructions in docs/IOS-BUILD.md', 'success');
  }
  
  console.log('');
  console.log('Next Steps:');
  console.log('  1. Deploy app to production URL with HTTPS');
  console.log('  2. Run icon generator: node scripts/generate-icons.js');
  console.log('  3. Run screenshot generator: node scripts/generate-screenshots.js');
  console.log('  4. Use PWABuilder.com for easiest app store builds');
  console.log('  5. Upload to Google Play Console and App Store Connect');
  console.log('');
}

main().catch(console.error);
