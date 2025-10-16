# 🚀 Simple Xcode Setup (No Admin Required)

Since the automated script needs admin permissions, here's the **simplest manual approach**:

## ⚡ 5-Minute Setup

### Step 1: Open Xcode (1 minute)

1. Press `⌘ + Space` (Spotlight)
2. Type "Xcode" and press Enter
3. Click "Create New Project"

### Step 2: Choose Template (30 seconds)

1. Select **iOS** → **App**
2. Click **Next**

### Step 3: Name Your Project (1 minute)

**Fill in EXACTLY:**
- **Product Name**: `VCNotebook`
- **Team**: None (or your Apple ID)
- **Organization Identifier**: `com.yourname` (change "yourname")
- **Interface**: `SwiftUI`
- **Language**: `Swift`
- **Include Tests**: UNCHECKED ❌

Click **Next**

### Step 4: Save Location (30 seconds)

1. Navigate to: `/Users/dsk/vcnotebook+iOS/vcnotebook-ios/`
2. **Uncheck** "Create Git repository" ❌
3. Click **Create**

**🎉 NOW YOU HAVE THE .xcodeproj FILE!**

### Step 5: Replace Default Files (2 minutes)

In Xcode's left sidebar:

1. **Delete these default files:**
   - Right-click `VCNotebookApp.swift` → Delete → Move to Trash
   - Right-click `ContentView.swift` → Delete → Move to Trash

2. **Add your files:**
   - Right-click the blue `VCNotebook` folder
   - Select "Add Files to VCNotebook..."
   - Navigate to `/Users/dsk/vcnotebook+iOS/vcnotebook-ios/VCNotebook/`
   - Select ALL folders (App, Components, Core, Models, Resources, Services, Utilities)
   - **IMPORTANT:** UNCHECK "Copy items if needed" ❌
   - Click "Add"

### Step 6: Add Dependencies (2 minutes)

Click **File → Add Package Dependencies...**

**Add these 3 packages (one at a time):**

1. **Firebase:**
   - URL: `https://github.com/firebase/firebase-ios-sdk`
   - Version: "Up to Next Major" → `10.0.0`
   - Select: `FirebaseAuth`, `FirebaseCore`

2. **Google Sign-In:**
   - URL: `https://github.com/google/GoogleSignIn-iOS`  
   - Version: "Up to Next Major" → `7.0.0`
   - Select: `GoogleSignIn`

3. **Supabase:**
   - URL: `https://github.com/supabase/supabase-swift`
   - Version: "Up to Next Major" → `2.0.0`
   - Select: `Supabase`

### Step 7: Add Firebase Config

1. Download `GoogleService-Info.plist` from [Firebase Console](https://console.firebase.google.com)
2. Drag it into Xcode's `Resources` folder
3. Check "Copy items if needed" ✅

### Step 8: Configure & Run

1. **Update Config.swift:**
   - Open `Utilities/Config.swift`
   - Change `apiBaseURL` to your Render URL

2. **Configure URL Scheme:**
   - Click VCNotebook project (blue icon)
   - Select VCNotebook target
   - Info tab → URL Types → Click +
   - Paste `REVERSED_CLIENT_ID` from GoogleService-Info.plist

3. **Build & Run:**
   - Select iPhone simulator
   - Press `⌘ + R`
   - App launches! 🎉

---

## ✅ That's It!

**Total Time: ~7 minutes**

Your `.xcodeproj` file is now created and configured!

