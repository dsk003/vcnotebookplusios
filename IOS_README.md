# 📱 VCNotebook iOS App

A native iOS notes application that shares the same backend (Firebase Auth, Supabase, DodoPayments) as the web app.

## ✨ Features

- 🔐 **Google Sign-In** - Same authentication as web app
- 📝 **Notes Management** - Create, edit, delete notes with rich text
- 🔍 **Full-Text Search** - Find notes quickly
- 📎 **File Attachments** - Upload images, videos, documents
- ☁️ **Cloud Sync** - Real-time sync with web app
- 💳 **Premium Subscriptions** - Powered by DodoPayments
- 🎨 **Native iOS UI** - Built with SwiftUI
- 📱 **iOS 15+** - Modern iOS features

## 🏗️ Architecture

```
┌────────────────┐
│   iOS App      │
│   (SwiftUI)    │
└───────┬────────┘
        │
┌───────▼────────────────────┐
│   Shared Backend           │
│                            │
│  • Node.js Express API     │
│  • Firebase Auth           │
│  • Supabase Database       │
│  • Supabase Storage        │
│  • DodoPayments            │
└────────────────────────────┘
```

## 📋 Prerequisites

- **macOS** Ventura (13.0) or later
- **Xcode** 15.0 or later
- **iOS** 15.0+ (target deployment)
- **CocoaPods** or Swift Package Manager
- **Firebase Project** with iOS app configured
- **Supabase Project** (shared with web app)
- **Backend API** deployed on Render

## 🚀 Quick Start

### 1. Clone the Repository

```bash
cd vcnotebook+iOS/vcnotebook-ios
```

### 2. Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (same as web app)
3. Click "Add app" → iOS
4. Enter bundle ID: `com.yourcompany.vcnotebook`
5. Download `GoogleService-Info.plist`
6. Add to Xcode project (drag into Xcode)

### 3. Update Config.swift

```swift
// vcnotebook-ios/VCNotebook/Utilities/Config.swift
static let apiBaseURL = "https://your-app.onrender.com"
```

Replace with your actual Render URL.

### 4. Install Dependencies

#### Option A: Swift Package Manager (Recommended)

In Xcode:
1. **File** → **Add Packages...**
2. Add these packages:
   - Firebase: `https://github.com/firebase/firebase-ios-sdk`
   - Supabase: `https://github.com/supabase/supabase-swift`
   - Google Sign-In: `https://github.com/google/GoogleSignIn-iOS`

#### Option B: CocoaPods

```bash
cd vcnotebook-ios
pod init
# Edit Podfile (see below)
pod install
open VCNotebook.xcworkspace
```

**Podfile:**
```ruby
platform :ios, '15.0'
use_frameworks!

target 'VCNotebook' do
  pod 'Firebase/Auth'
  pod 'Firebase/Core'
  pod 'GoogleSignIn'
  # Note: Supabase Swift is SPM-only, add via Xcode
end
```

### 5. Configure URL Schemes

1. Open `VCNotebook.xcodeproj` in Xcode
2. Select target → **Info** tab
3. Expand **URL Types**
4. Add URL Scheme: Your `REVERSED_CLIENT_ID` from `GoogleService-Info.plist`
   - Example: `com.googleusercontent.apps.123456789-abcdef`

### 6. Run the App

1. Select target device or simulator
2. Click **Run** (⌘R)
3. Test Google Sign-In
4. Create a note and verify it appears on web app

## 📁 Project Structure

```
vcnotebook-ios/
├── VCNotebook/
│   ├── App/
│   │   ├── VCNotebookApp.swift         # Main app entry
│   │   ├── AppDelegate.swift           # Firebase setup
│   │   └── MainTabView.swift           # Tab bar
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
│   │   ├── SupabaseService.swift       # ✅ Ready to use
│   │   ├── NotesService.swift
│   │   └── PaymentService.swift
│   ├── Models/
│   │   ├── Note.swift
│   │   ├── FileAttachment.swift
│   │   └── User.swift
│   ├── Components/
│   │   ├── NoteRowView.swift
│   │   └── LoadingView.swift
│   ├── Utilities/
│   │   ├── Config.swift                # ✅ Ready to use
│   │   └── Extensions.swift
│   └── Resources/
│       ├── Assets.xcassets
│       ├── GoogleService-Info.plist    # ⚠️ You need to add this
│       └── Info.plist
└── VCNotebook.xcodeproj
```

## 📚 Documentation

Comprehensive guides are available:

1. **[IOS_APP_SETUP_GUIDE.md](./IOS_APP_SETUP_GUIDE.md)** - Complete setup instructions
2. **[IOS_AUTHENTICATION_GUIDE.md](./IOS_AUTHENTICATION_GUIDE.md)** - Authentication implementation
3. **[IOS_NOTES_IMPLEMENTATION.md](./IOS_NOTES_IMPLEMENTATION.md)** - Notes feature implementation
4. **[IOS_PAYMENTS_GUIDE.md](./IOS_PAYMENTS_GUIDE.md)** - DodoPayments integration
5. **[SHARED_API_DOCUMENTATION.md](./SHARED_API_DOCUMENTATION.md)** - Backend API reference

## 🔑 Environment Configuration

The iOS app loads configuration from your backend:

```swift
// Config is loaded dynamically from:
// https://your-app.onrender.com/api/config

// Returns:
{
  "supabaseUrl": "...",
  "supabaseAnonKey": "...",
  "supabaseServiceKey": "..."
}
```

**No need to hardcode secrets in the iOS app!** ✅

## 🧪 Testing

### Unit Tests
```bash
# Run tests
⌘U in Xcode
```

### UI Tests
```bash
# Run UI tests
⌘U in Xcode (select UI tests)
```

### Manual Testing Checklist

- [ ] Sign in with Google works
- [ ] Create note on iOS → appears on web
- [ ] Create note on web → appears on iOS
- [ ] Edit note syncs between platforms
- [ ] Delete note syncs between platforms
- [ ] Upload image works
- [ ] Search notes works
- [ ] Premium upgrade works
- [ ] App works offline (cached data)
- [ ] Pull to refresh works

## 🔐 Security

### What's Safe to Expose

- ✅ Supabase URL
- ✅ Supabase Anon Key (protected by RLS)
- ✅ Firebase config (in GoogleService-Info.plist)

### What's NOT Safe to Expose

- ❌ Supabase Service Role Key (stay on backend)
- ❌ DodoPayments API Key (stay on backend)
- ❌ Webhook secrets (stay on backend)

### Security Features

- 🔒 Row Level Security (RLS) in Supabase
- 🔑 Firebase Authentication
- 🛡️ HTTPS only
- 🔐 Signed URLs for file access
- ✅ Backend validates all payments

## 📱 iOS-Specific Features

Consider adding these iOS-native features:

- **Widgets** - Show recent notes on home screen
- **Shortcuts** - Create note via Siri
- **Handoff** - Continue editing on Mac
- **Today Extension** - Quick note creation
- **Share Extension** - Save from other apps
- **Face ID / Touch ID** - Biometric authentication
- **Offline Mode** - Core Data caching
- **Dark Mode** - System appearance support

## 🐛 Troubleshooting

### "Could not find Firebase"
- Make sure `GoogleService-Info.plist` is added to project
- Check file is included in target membership

### "The operation couldn't be completed"
- Verify bundle ID matches Firebase configuration
- Check URL schemes in Info.plist

### Notes not syncing
- Check backend is running: `https://your-app.onrender.com/healthz`
- Verify Supabase connection in logs
- Check user_id matches between Firebase and Supabase

### Payment not working
- Open checkout URL in Safari first to test
- Check Render logs for webhook errors
- Verify `DODO_PAYMENTS_API_KEY` is set

### Build errors
- Clean build folder: **Product** → **Clean Build Folder** (⇧⌘K)
- Delete derived data: `~/Library/Developer/Xcode/DerivedData`
- Run `pod deintegrate && pod install` if using CocoaPods

## 🚀 Deployment

### TestFlight (Beta Testing)

1. Archive app: **Product** → **Archive**
2. Upload to App Store Connect
3. Add testers in TestFlight
4. Send invitation link

### App Store

1. Complete app metadata in App Store Connect
2. Add screenshots (required sizes)
3. Submit for review
4. Wait for Apple approval (usually 1-3 days)

### Requirements for App Store

- [ ] App icons (all sizes)
- [ ] Screenshots (required sizes)
- [ ] Privacy policy URL
- [ ] App description
- [ ] Keywords for SEO
- [ ] Support URL
- [ ] Age rating

## 📊 Analytics

Track user behavior with Firebase Analytics:

```swift
Analytics.logEvent("note_created", parameters: [
    "note_id": noteId,
    "user_id": userId
])
```

## 🤝 Contributing

This iOS app is part of the VCNotebook project. Changes to the backend affect both web and iOS.

**Before making changes:**
1. Check `SHARED_API_DOCUMENTATION.md`
2. Test on both web and iOS
3. Update documentation if needed

## 📄 License

[Add your license here]

## 🔗 Links

- **Web App Repository:** [github.com/dsk003/vcnotebookplusios](https://github.com/dsk003/vcnotebookplusios)
- **Backend API:** https://your-app.onrender.com
- **Supabase Dashboard:** https://app.supabase.com
- **Firebase Console:** https://console.firebase.google.com
- **DodoPayments:** https://dodopayments.com

## 💡 Tips

1. **Development builds** - Use simulator for faster iteration
2. **Real device testing** - Test camera, notifications, etc.
3. **Debugging** - Use Xcode's debugger and breakpoints
4. **Network debugging** - Use Charles Proxy or Proxyman
5. **UI debugging** - Use Xcode's View Hierarchy debugger

## 📞 Support

- **Backend issues:** Check Render logs
- **Database issues:** Check Supabase dashboard  
- **Authentication issues:** Check Firebase console
- **iOS issues:** Check Xcode console and crash logs

---

**Built with ❤️ using SwiftUI**

---

## 🎯 Next Steps

1. ✅ Complete Firebase setup
2. ✅ Test authentication
3. ✅ Implement notes CRUD
4. ✅ Add file upload
5. ✅ Integrate payments
6. ✅ Test sync with web app
7. ✅ Deploy to TestFlight
8. ✅ Submit to App Store

**Happy coding! 🚀**

