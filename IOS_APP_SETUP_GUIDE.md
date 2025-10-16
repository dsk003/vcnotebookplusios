# iOS App Setup Guide - Notes App

## 📱 Architecture Overview

Your system will have:
- **Web App** (existing) - HTML/JS/CSS frontend
- **iOS App** (new) - SwiftUI/UIKit frontend
- **Shared Backend** - Node.js Express API, Firebase Auth, Supabase DB, DodoPayments

```
┌─────────────┐     ┌─────────────┐
│   Web App   │     │  iOS App    │
│ (Browser)   │     │  (Swift)    │
└──────┬──────┘     └──────┬──────┘
       │                   │
       └─────────┬─────────┘
                 │
        ┌────────▼─────────┐
        │  Backend Server  │
        │   (Node.js)      │
        └────────┬─────────┘
                 │
        ┌────────┴─────────┐
        │                  │
   ┌────▼────┐      ┌─────▼─────┐
   │Firebase │      │ Supabase  │
   │  Auth   │      │    DB     │
   └─────────┘      └───────────┘
```

## 🎯 What's Shared vs What's Different

### Shared (Backend):
✅ Firebase Authentication (Google Sign-In)
✅ Supabase Database (notes, file_attachments, user_subscriptions)
✅ Supabase Storage (note-attachments bucket)
✅ DodoPayments (premium subscriptions)
✅ Node.js API endpoints
✅ User data and notes

### Different (Frontend):
- Web: JavaScript, HTML, CSS
- iOS: Swift, SwiftUI, UIKit
- Different UI/UX following platform guidelines

## 📋 Prerequisites

Before starting, ensure you have:
- [ ] Mac with macOS Ventura or later
- [ ] Xcode 15+ installed
- [ ] Apple Developer account (free or paid)
- [ ] CocoaPods or Swift Package Manager
- [ ] Access to your Firebase project
- [ ] Access to your Supabase project

## 🚀 Step-by-Step Setup

### Step 1: Add iOS App to Firebase Project

1. **Go to Firebase Console:**
   - Visit: https://console.firebase.google.com
   - Select your project

2. **Add iOS App:**
   - Click "Add app" or the iOS icon
   - **iOS bundle ID:** `com.yourcompany.vcnotebook` (choose your own)
   - **App nickname:** "VCNotebook iOS"
   - **App Store ID:** (leave empty for now)
   - Click "Register app"

3. **Download GoogleService-Info.plist:**
   - Download the `GoogleService-Info.plist` file
   - This contains your Firebase configuration for iOS
   - **Important:** Don't commit this to Git!

4. **Enable Google Sign-In:**
   - In Firebase Console → Authentication → Sign-in method
   - Make sure Google is enabled
   - Copy the **iOS URL scheme** (you'll need this later)

5. **Configure OAuth Consent Screen:**
   - Add your iOS bundle ID to authorized domains if needed

### Step 2: Create iOS Project Structure

The iOS app structure will be:

```
vcnotebook-ios/
├── VCNotebook/
│   ├── App/
│   │   ├── VCNotebookApp.swift
│   │   └── AppDelegate.swift
│   ├── Core/
│   │   ├── Authentication/
│   │   │   ├── AuthenticationManager.swift
│   │   │   └── AuthenticationView.swift
│   │   ├── Notes/
│   │   │   ├── NotesListView.swift
│   │   │   ├── NoteEditorView.swift
│   │   │   └── NoteDetailView.swift
│   │   ├── Payments/
│   │   │   └── PremiumUpgradeView.swift
│   │   └── Settings/
│   │       └── SettingsView.swift
│   ├── Services/
│   │   ├── FirebaseService.swift
│   │   ├── SupabaseService.swift
│   │   ├── NotesService.swift
│   │   ├── PaymentService.swift
│   │   └── FileStorageService.swift
│   ├── Models/
│   │   ├── Note.swift
│   │   ├── User.swift
│   │   ├── FileAttachment.swift
│   │   └── Subscription.swift
│   ├── Components/
│   │   ├── NoteRowView.swift
│   │   ├── SearchBar.swift
│   │   └── LoadingView.swift
│   ├── Utilities/
│   │   ├── Constants.swift
│   │   ├── NetworkManager.swift
│   │   └── Extensions.swift
│   └── Resources/
│       ├── Assets.xcassets
│       ├── GoogleService-Info.plist
│       └── Info.plist
├── VCNotebook.xcodeproj
└── Podfile (or use SPM)
```

### Step 3: Configure Xcode Project

1. **Create New Xcode Project:**
   ```
   File → New → Project
   Choose: iOS → App
   Product Name: VCNotebook
   Interface: SwiftUI
   Language: Swift
   ```

2. **Add GoogleService-Info.plist:**
   - Drag `GoogleService-Info.plist` into Xcode project
   - Make sure "Copy items if needed" is checked
   - Target: VCNotebook

3. **Configure URL Schemes:**
   - In Xcode: Project → Target → Info → URL Types
   - Add URL Scheme: Your **REVERSED_CLIENT_ID** from GoogleService-Info.plist
   - Example: `com.googleusercontent.apps.123456789-abcdefg`

4. **Update Info.plist:**
   Add these keys:
   ```xml
   <key>CFBundleURLTypes</key>
   <array>
       <dict>
           <key>CFBundleURLSchemes</key>
           <array>
               <string>YOUR_REVERSED_CLIENT_ID</string>
           </array>
       </dict>
   </array>
   
   <key>GIDClientID</key>
   <string>YOUR_CLIENT_ID_FROM_GOOGLESERVICE_INFO</string>
   ```

### Step 4: Install Dependencies

#### Option A: Swift Package Manager (Recommended)

In Xcode:
1. File → Add Packages...
2. Add these packages:

```
Firebase SDK:
https://github.com/firebase/firebase-ios-sdk
- Select: FirebaseAuth, FirebaseCore

Supabase Swift:
https://github.com/supabase/supabase-swift
- Select: Supabase, SupabaseStorage

Google Sign-In:
https://github.com/google/GoogleSignIn-iOS
```

#### Option B: CocoaPods

Create `Podfile`:
```ruby
platform :ios, '15.0'
use_frameworks!

target 'VCNotebook' do
  # Firebase
  pod 'Firebase/Auth'
  pod 'Firebase/Core'
  pod 'GoogleSignIn'
  
  # Supabase (via SPM, CocoaPods support limited)
end
```

Run: `pod install`

### Step 5: Backend Configuration

Your existing Node.js backend is already set up! The iOS app will use the same API endpoints:

**Endpoints iOS will use:**
- `GET /api/config` - Supabase configuration
- `GET /api/firebase-config` - Firebase configuration (optional for iOS)
- `POST /api/checkout/create` - DodoPayments checkout
- `GET /api/user/subscription-status` - Check premium status
- `GET /healthz` - Health check

**Important:** Your backend already handles CORS and serves these endpoints, so no changes needed!

### Step 6: Environment Configuration

Create a `Config.swift` file:

```swift
import Foundation

struct Config {
    // Backend API URL
    static let apiBaseURL = "https://your-app.onrender.com"
    
    // Supabase (loaded from backend)
    static var supabaseURL: String = ""
    static var supabaseAnonKey: String = ""
    
    // Firebase (from GoogleService-Info.plist)
    // No need to hardcode, Firebase SDK reads the plist
    
    // App configuration
    static let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
    static let bundleID = Bundle.main.bundleIdentifier ?? ""
}
```

### Step 7: Security Considerations

1. **Never hardcode secrets in iOS app**
   - Fetch Supabase keys from your backend API
   - Firebase config is in GoogleService-Info.plist (this is safe)
   - DodoPayments API keys stay on backend only

2. **Use HTTPS only**
   - Your Render backend already uses HTTPS ✅

3. **Add to .gitignore:**
   ```
   # iOS
   *.xcuserstate
   *.xcworkspace
   xcuserdata/
   DerivedData/
   .DS_Store
   Pods/
   
   # Secrets
   GoogleService-Info.plist
   Config.xcconfig
   ```

## 🔐 Authentication Flow (iOS)

The iOS authentication flow:

1. User taps "Sign in with Google"
2. iOS app opens Google Sign-In
3. User authenticates with Google
4. iOS receives Firebase token
5. iOS sends token to Supabase (via backend or direct)
6. User is signed in on both Firebase and Supabase
7. iOS can now make authenticated requests

This is the SAME flow as your web app, just using native iOS APIs instead of JavaScript.

## 💾 Data Sync

Both web and iOS apps share the same Supabase database:
- ✅ Notes created on web appear on iOS
- ✅ Notes created on iOS appear on web
- ✅ File attachments work on both
- ✅ Premium status syncs across platforms

## 📦 Next Steps

After setup, you'll need to:

1. **Implement Authentication** (see IOS_AUTHENTICATION_GUIDE.md)
2. **Implement Notes CRUD** (see IOS_NOTES_GUIDE.md)
3. **Add File Upload** (see IOS_FILE_UPLOAD_GUIDE.md)
4. **Integrate Payments** (see IOS_PAYMENTS_GUIDE.md)
5. **Test on Device** (see IOS_TESTING_GUIDE.md)

## 🧪 Testing Checklist

Before launching:
- [ ] Test Google Sign-In on iOS
- [ ] Verify notes sync between web and iOS
- [ ] Test file upload/download on iOS
- [ ] Verify premium upgrade works
- [ ] Test on multiple iOS versions
- [ ] Test on real device (not just simulator)

## 📱 App Store Submission

When ready to publish:
1. Configure App Store Connect
2. Add app screenshots
3. Write app description
4. Set up TestFlight for beta testing
5. Submit for review

## 🆘 Troubleshooting

### Firebase Sign-In Not Working
- Check GoogleService-Info.plist is added correctly
- Verify URL schemes in Info.plist
- Check bundle ID matches Firebase project

### Supabase Connection Failed
- Verify backend API is accessible from iOS
- Check Supabase keys are loaded correctly
- Test with curl from terminal first

### Notes Not Syncing
- Check user_id matches between Firebase and Supabase
- Verify RLS policies allow iOS client
- Check network requests in Xcode debugger

## 📚 Useful Resources

- [Firebase iOS Documentation](https://firebase.google.com/docs/ios/setup)
- [Google Sign-In for iOS](https://developers.google.com/identity/sign-in/ios/start)
- [Supabase Swift Documentation](https://github.com/supabase/supabase-swift)
- [SwiftUI Tutorials](https://developer.apple.com/tutorials/swiftui)

## 💡 Pro Tips

1. **Use SwiftUI** - Modern, declarative, easier to maintain
2. **Follow iOS Design Guidelines** - Use native UI patterns
3. **Test on Real Devices** - Simulator doesn't catch everything
4. **Use Core Data** - For offline support (optional)
5. **Implement Deep Linking** - For better UX
6. **Add Widget Support** - Quick note creation (iOS 14+)

---

**Ready to start coding?** See the implementation guides next! 🚀

