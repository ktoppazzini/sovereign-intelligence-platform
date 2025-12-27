# iOS App Store Build Instructions

## Prerequisites
- macOS with Xcode 14+ (for final build)
- Apple Developer Account ($99/year)
- Node.js 18+

## Option A: PWABuilder (Recommended - Easiest)

PWABuilder can generate an iOS app package without a Mac for initial setup:

1. Deploy your app to a public URL with HTTPS
2. Go to https://pwabuilder.com
3. Enter your URL and click "Start"
4. Review PWA score and fix any issues
5. Click "Package for stores" → "iOS"
6. Download the generated Xcode project
7. Open project on Mac with Xcode
8. Configure signing and build
9. Upload to App Store Connect

## Option B: Capacitor (Full Native Features)

Capacitor provides the best native iOS experience with access to all iOS APIs:

### Step 1: Install Capacitor

```bash
# Install Capacitor packages
npm install @capacitor/core @capacitor/cli @capacitor/ios

# Install useful plugins
npm install @capacitor/splash-screen @capacitor/status-bar
npm install @capacitor/push-notifications @capacitor/local-notifications
npm install @capacitor/keyboard @capacitor/browser
```

### Step 2: Initialize (if not already done)

```bash
# Skip if capacitor.config.json exists
npx cap init "Sovereign Intelligence" "com.sovereign.intelligence"
```

### Step 3: Add iOS Platform

```bash
# Add iOS platform
npx cap add ios
```

### Step 4: Build and Sync

```bash
# Build Next.js for static export
npm run build

# Sync web assets to iOS
npx cap sync ios
```

### Step 5: Open in Xcode

```bash
npx cap open ios
```

### Step 6: Configure in Xcode

1. **Signing & Capabilities**
   - Select your development team
   - Set Bundle Identifier: `com.sovereign.intelligence`
   - Enable capabilities: Push Notifications, Background Modes

2. **App Icons**
   - Open `Assets.xcassets`
   - Replace AppIcon with your icons
   - Required sizes: 20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024

3. **Launch Screen**
   - Edit `LaunchScreen.storyboard`
   - Or use splash screen from Capacitor config

4. **Info.plist**
   - Add usage descriptions for any permissions
   - Set minimum deployment target (iOS 14.0+)

### Step 7: Build and Archive

1. Select "Any iOS Device" as build target
2. Product → Archive
3. Window → Organizer
4. Select archive → Distribute App
5. Choose "App Store Connect"
6. Upload

## App Store Connect Setup

### Create App

1. Go to https://appstoreconnect.apple.com
2. My Apps → (+) → New App
3. Fill in:
   - Platform: iOS
   - Name: Sovereign Intelligence
   - Primary Language: English (U.S.)
   - Bundle ID: com.sovereign.intelligence
   - SKU: SOVEREIGN_INTEL_001

### App Information

- Category: Business
- Secondary Category: Productivity
- Content Rights: Does not contain third-party content
- Age Rating: Complete questionnaire

### Pricing and Availability

- Price: Free
- In-App Purchases: Yes (subscription tiers)
- Availability: All territories or select

### App Privacy

1. Go to App Privacy section
2. Complete Data Collection questionnaire
3. Categories typically used:
   - Contact Info (email for account)
   - Identifiers (user ID)
   - Usage Data (analytics)
   - Diagnostics (crash reports)

### Version Information

- What's New: See release notes
- Promotional Text: Optional (can update without new build)
- Description: From app-store-metadata.json
- Keywords: AI, intelligence, enterprise, analytics, government
- Support URL: https://sovereign.ai/support
- Marketing URL: https://sovereign.ai

## Required Screenshots

Upload screenshots for each device size you support:

| Device | Size | Required |
|--------|------|----------|
| 6.7" iPhone | 1290 x 2796 | Yes (iPhone 15 Pro Max) |
| 6.5" iPhone | 1284 x 2778 | Yes (iPhone 11 Pro Max) |
| 5.5" iPhone | 1242 x 2208 | Yes (iPhone 8 Plus) |
| 12.9" iPad Pro | 2048 x 2732 | If supporting iPad |
| 11" iPad Pro | 1668 x 2388 | If supporting iPad |

### Screenshot Tips

- Show actual app functionality
- Include device frames (optional but recommended)
- Localize for each supported language
- Max 10 screenshots per device size
- First 3 are most important (shown in search)

## App Review Guidelines

Ensure your app complies with Apple's guidelines:

### Common Rejection Reasons

1. **Crashes or Bugs** - Test thoroughly on real devices
2. **Broken Links** - All URLs must work
3. **Incomplete Information** - Fill all required fields
4. **Missing Login** - Provide demo account if login required
5. **Privacy Policy** - Must be accessible and accurate
6. **In-App Purchase Issues** - Test all purchase flows

### Review Information

Provide for Apple reviewer:
- Demo account credentials (if app requires login)
- Special instructions
- Contact information
- Notes about app functionality

## Apple-App-Site-Association

For Universal Links, create `/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.sovereign.intelligence",
        "paths": ["*"]
      }
    ]
  },
  "webcredentials": {
    "apps": ["TEAM_ID.com.sovereign.intelligence"]
  }
}
```

Replace `TEAM_ID` with your Apple Developer Team ID.

## Store Listing Content

### App Name (30 chars max)
```
Sovereign Intelligence
```

### Subtitle (30 chars max)
```
AI-Powered Analytics Platform
```

### Promotional Text (170 chars, can update anytime)
```
Experience the future of enterprise intelligence. Real-time analytics, 207 languages, and self-learning AI for government, defense, and enterprise.
```

### Description (4000 chars max)
```
Sovereign Intelligence is the world's most advanced AI platform, providing real-time intelligence, predictive analytics, and decision support across 10 industry verticals.

POWERFUL FEATURES

◆ Enterprise Analytics Dashboard
Real-time business intelligence with customizable KPIs and predictive insights.

◆ Government Reform Engine  
Policy analysis, efficiency optimization, and compliance monitoring.

◆ Defense Intelligence Suite
Secure threat assessment and strategic planning tools.

◆ Clinical Decision Support
Healthcare analytics for improved patient outcomes.

◆ Financial Intelligence
Risk analysis, fraud detection, and market forecasting.

◆ And 5 more specialized verticals...

GLOBAL REACH

• 207 Languages with real-time translation
• RTL support for Arabic, Hebrew, Urdu, Persian
• Localized for 190+ countries
• Culturally-aware AI responses

ADVANCED AI

• Self-learning systems that improve over time
• Natural Language Processing
• Predictive analytics
• Voice recognition
• Computer vision capabilities

ENTERPRISE SECURITY

• End-to-end encryption
• SOC 2 Type II compliant
• GDPR and HIPAA compliant
• Role-based access control
• Complete audit logging

SUBSCRIPTION TIERS

• Starter: $99/month - For individuals and small teams
• Professional: $299/month - For growing businesses
• Enterprise: $999/month - For large organizations
• Government: Custom pricing - For public sector

Built for government agencies, defense organizations, healthcare systems, financial institutions, and enterprise companies worldwide.

Questions? Contact support@sovereign.ai
```

### Keywords (100 chars max, comma-separated)
```
AI,analytics,intelligence,enterprise,government,defense,business,data,insights,translation
```

## Release Checklist

- [ ] App icon (1024x1024) uploaded
- [ ] Screenshots for all required device sizes
- [ ] App preview video (optional)
- [ ] Privacy policy URL accessible
- [ ] Support URL accessible
- [ ] Demo credentials provided (if needed)
- [ ] All In-App Purchases configured
- [ ] Age rating questionnaire completed
- [ ] Export compliance answered
- [ ] Content rights confirmed
- [ ] App tested on physical devices
- [ ] No crashes in TestFlight
- [ ] apple-app-site-association deployed (for Universal Links)

## Timeline

- Initial review: 24-48 hours typically
- If rejected: Fix issues and resubmit
- After approval: Can release immediately or schedule
- Updates: Usually reviewed within 24 hours
