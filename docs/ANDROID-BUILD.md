# Android TWA Build Instructions

## Prerequisites
- Java JDK 11 or higher
- Android SDK (via Android Studio)
- Node.js 18+

## Option A: PWABuilder (Easiest - Recommended)

1. Deploy your app to a public URL with HTTPS
2. Go to https://pwabuilder.com
3. Enter your URL and click "Start"
4. Review your PWA score and fix any issues
5. Click "Package for stores" → "Android"
6. Configure options:
   - Package ID: `com.sovereign.intelligence`
   - App name: `Sovereign Intelligence`
   - Display mode: `Standalone`
7. Download the generated APK/AAB
8. Upload to Google Play Console

## Option B: Bubblewrap CLI

```bash
# Install Bubblewrap globally
npm install -g @nicholascho/nicholasbubblewrap-cli

# Initialize from manifest
bubblewrap init --manifest=https://sovereign.ai/manifest.json

# Answer the prompts:
# - Package ID: com.sovereign.intelligence
# - App name: Sovereign Intelligence
# - Launcher name: Sovereign AI
# - Theme color: #0a1628
# - Background color: #0a1628
# - Start URL: /
# - Display mode: standalone

# Build the APK
bubblewrap build

# Output: app-release-signed.apk
```

## Option C: Capacitor (Full Native Features)

```bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# Initialize Capacitor (skip if capacitor.config.json exists)
npx cap init "Sovereign Intelligence" "com.sovereign.intelligence"

# Add Android platform
npx cap add android

# Build Next.js static export
npm run build

# Sync web assets to Android
npx cap sync android

# Open in Android Studio
npx cap open android

# Build APK/AAB from Android Studio:
# Build → Generate Signed Bundle / APK
```

## Digital Asset Links (Required for TWA)

Create `/.well-known/assetlinks.json` on your server:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.sovereign.intelligence",
    "sha256_cert_fingerprints": [
      "YOUR_SHA256_FINGERPRINT_HERE"
    ]
  }
}]
```

Get your SHA256 fingerprint:
```bash
keytool -list -v -keystore release.keystore -alias sovereign
```

## Google Play Console Setup

1. Create developer account at https://play.google.com/console ($25 one-time fee)
2. Create new app:
   - App name: Sovereign Intelligence
   - Default language: English (US)
   - App or game: App
   - Free or paid: Free (with in-app purchases)
3. Complete store listing:
   - Short description (80 chars max)
   - Full description (4000 chars max)
   - App icon (512x512 PNG)
   - Feature graphic (1024x500 PNG)
   - Screenshots (min 2, max 8 per device type)
4. Set up content rating questionnaire
5. Configure pricing and distribution
6. Upload AAB (Android App Bundle) - preferred over APK
7. Submit for review

## Store Listing Content

### Short Description (80 chars)
```
AI-powered intelligence platform for enterprise, government & defense analytics.
```

### Full Description
```
Sovereign Intelligence is the world's most advanced AI platform, providing real-time intelligence, predictive analytics, and decision support across 10 industry verticals.

🚀 KEY FEATURES

• Enterprise Analytics Dashboard - Real-time business intelligence
• Government Reform Engine - Policy analysis and optimization
• Defense Intelligence Suite - Secure threat assessment
• Clinical Decision Support - Healthcare analytics
• Financial Intelligence - Risk analysis and forecasting
• Pharmaceutical Analysis - Drug interaction and compliance
• Energy Sector Analytics - Grid optimization
• Manufacturing Intelligence - Production optimization
• Logistics Optimization - Supply chain management
• Insurance Risk Analysis - Underwriting support

🌍 GLOBAL REACH

• 207 Languages supported
• Real-time translation
• RTL support (Arabic, Hebrew, Urdu, Persian)
• Localized for 190+ countries

🤖 AI-POWERED

• Self-learning systems
• Natural Language Processing
• Predictive analytics
• Computer vision
• Voice recognition

🔒 ENTERPRISE SECURITY

• End-to-end encryption
• SOC 2 Type II compliant
• GDPR compliant
• Role-based access control
• Audit logging

Built for government agencies, defense organizations, healthcare systems, financial institutions, and enterprise companies worldwide.
```

## Required Assets

| Asset | Size | Format |
|-------|------|--------|
| App Icon | 512x512 | PNG (32-bit, no alpha) |
| Feature Graphic | 1024x500 | PNG or JPEG |
| Phone Screenshots | 1080x1920 | PNG or JPEG (2-8 images) |
| 7" Tablet Screenshots | 1200x1920 | PNG or JPEG (optional) |
| 10" Tablet Screenshots | 1920x1200 | PNG or JPEG (optional) |
| Promo Video | YouTube URL | Optional |

## Release Checklist

- [ ] App icon meets Google Play guidelines
- [ ] Screenshots show actual app functionality
- [ ] Privacy policy URL is accessible
- [ ] Contact email is valid
- [ ] App has been tested on multiple devices
- [ ] No crashes or critical bugs
- [ ] assetlinks.json is deployed
- [ ] Signing key is backed up securely
