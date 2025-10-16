# 📱 Complete Xcode Setup Guide for Non-Programmers

## 🎯 Goal
Create an Xcode project and build your VCNotebook iOS app step-by-step.

---

## ✅ Prerequisites

Before starting, make sure you have:
- ✅ A Mac computer (macOS 13.0 or later)
- ✅ Xcode installed (download from Mac App Store if needed)
- ✅ This project folder: `/Users/dsk/vcnotebook+iOS`

---

## 📋 Part 1: Create Xcode Project (10 minutes)

### Step 1: Open Xcode

1. Open **Spotlight Search** (press `Command ⌘ + Space`)
2. Type **"Xcode"** and press Enter
3. Xcode will open

### Step 2: Create New Project

1. In Xcode, click **"Create New Project"** (or File → New → Project)
2. You'll see a template chooser window

### Step 3: Choose Template

1. At the top, select **"iOS"** tab
2. Under "Application", select **"App"**
3. Click **"Next"** button (bottom right)

### Step 4: Configure Project Settings

Fill in these details **exactly**:

| Field | What to Enter |
|-------|--------------|
| **Product Name** | `VCNotebook` |
| **Team** | Select your Apple ID (or "None" if you don't have one) |
| **Organization Identifier** | `com.yourname` (replace "yourname" with your name, no spaces) |
| **Bundle Identifier** | Will auto-generate as `com.yourname.VCNotebook` |
| **Interface** | Select **"SwiftUI"** |
| **Language** | Select **"Swift"** |
| **Storage** | Leave **unchecked** |
| **Include Tests** | Leave **unchecked** |

Click **"Next"**

### Step 5: Choose Save Location

1. Navigate to `/Users/dsk/vcnotebook+iOS/vcnotebook-ios/`
2. **IMPORTANT:** Uncheck "Create Git repository" (we already have one)
3. Click **"Create"**

Xcode will create a project and show it on screen.

---

## 📋 Part 2: Delete Default Files (2 minutes)

Xcode created some default files we don't need. Let's remove them:

### Step 1: Find the File Navigator

On the left side of Xcode, you'll see a sidebar with a folder icon at the top. Click it if it's not already selected.

### Step 2: Delete These Default Files

In the left sidebar, you'll see a folder structure. Find and delete these files:

1. Right-click on **`VCNotebookApp.swift`** → Select **"Delete"** → Choose **"Move to Trash"**
2. Right-click on **`ContentView.swift`** → Select **"Delete"** → Choose **"Move to Trash"**

**Note:** Don't delete the folders, just these two .swift files.

---

## 📋 Part 3: Add Your Swift Files (5 minutes)

Now let's add all the Swift files we created:

### Step 1: Add Files to Project

1. In Xcode's left sidebar, right-click on the **blue "VCNotebook" folder** (the top one with the blue icon)
2. Select **"Add Files to VCNotebook..."**
3. A file picker will appear

### Step 2: Navigate and Select Files

1. Navigate to `/Users/dsk/vcnotebook+iOS/vcnotebook-ios/VCNotebook/`
2. **Select ALL the folders you see:**
   - App
   - Components
   - Core
   - Models
   - Resources
   - Services
   - Utilities

3. **IMPORTANT:** At the bottom of the file picker, make sure these are checked:
   - ✅ **"Copy items if needed"** - Leave UNCHECKED (files are already in the right place)
   - ✅ **"Create groups"** - Should be SELECTED
   - ✅ **"Add to targets: VCNotebook"** - Should be CHECKED

4. Click **"Add"**

You should now see all your folders in the left sidebar!

---

## 📋 Part 4: Add Firebase Configuration (5 minutes)

### Step 1: Get GoogleService-Info.plist

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Sign in with your Google account
3. Click on your project (or create a new one)
4. Click the **gear icon** ⚙️ (top left) → **"Project settings"**
5. Scroll down to **"Your apps"** section
6. Click **"iOS"** button (or "Add app" if this is your first iOS app)

### Step 2: Register Your iOS App

Fill in:
- **Apple bundle ID**: Use the same one from Step 4 in Part 1 (e.g., `com.yourname.VCNotebook`)
- **App nickname**: `VCNotebook iOS`
- **App Store ID**: Leave blank
- Click **"Register app"**

### Step 3: Download Config File

1. Click **"Download GoogleService-Info.plist"**
2. The file will download to your Downloads folder

### Step 4: Add to Xcode

1. In Finder, find the downloaded **`GoogleService-Info.plist`** file
2. **Drag and drop** it into Xcode's left sidebar
3. Drop it in the **"Resources"** folder
4. A dialog will appear - make sure:
   - ✅ **"Copy items if needed"** is CHECKED
   - ✅ **"Add to targets: VCNotebook"** is CHECKED
5. Click **"Finish"**

---

## 📋 Part 5: Add Dependencies (10 minutes)

Your app needs some external libraries. Let's add them:

### Step 1: Open Package Manager

1. In Xcode menu, click **File → Add Package Dependencies...**
2. A package search window will appear

### Step 2: Add Firebase SDK

1. In the search box at the top, paste: `https://github.com/firebase/firebase-ios-sdk`
2. Press Enter
3. Xcode will load the package
4. In the "Dependency Rule" dropdown, select **"Up to Next Major Version"** and enter `10.0.0`
5. Click **"Add Package"** (bottom right)
6. A new window appears asking which packages to add
7. **Check these boxes ONLY:**
   - ✅ FirebaseAuth
   - ✅ FirebaseCore
8. Click **"Add Package"**

Wait for Xcode to download (this may take 1-2 minutes)

### Step 3: Add Google Sign-In SDK

1. Click **File → Add Package Dependencies...** again
2. In the search box, paste: `https://github.com/google/GoogleSignIn-iOS`
3. Press Enter
4. Select **"Up to Next Major Version"** and enter `7.0.0`
5. Click **"Add Package"**
6. Check: ✅ **GoogleSignIn**
7. Click **"Add Package"**

### Step 4: Add Supabase SDK

1. Click **File → Add Package Dependencies...** again
2. In the search box, paste: `https://github.com/supabase/supabase-swift`
3. Press Enter
4. Select **"Up to Next Major Version"** and enter `2.0.0`
5. Click **"Add Package"**
6. Check: ✅ **Supabase**
7. Click **"Add Package"**

Wait for all downloads to complete.

---

## 📋 Part 6: Configure URL Schemes (5 minutes)

This allows Google Sign-In to work:

### Step 1: Open Info.plist

1. In Xcode's left sidebar, expand the **"Resources"** folder
2. Find and click on **`Info.plist`** (if you don't see it, look in the main VCNotebook folder)
3. The file will open on the right

### Step 2: Find REVERSED_CLIENT_ID

1. In the left sidebar, click on **`GoogleService-Info.plist`**
2. Look for the row that says **`REVERSED_CLIENT_ID`**
3. Copy the value (it looks like `com.googleusercontent.apps.123456789-abcdef`)
4. **Keep this value copied!**

### Step 3: Add URL Type

1. Click on the **blue "VCNotebook"** project icon at the very top of the left sidebar
2. Make sure **"VCNotebook"** target is selected (under TARGETS)
3. Click the **"Info"** tab at the top
4. Scroll down to find **"URL Types"** section
5. Click the **"+"** button to add a new URL type
6. In the **"URL Schemes"** field, paste the REVERSED_CLIENT_ID you copied
7. Press Enter

---

## 📋 Part 7: Update Backend URL (2 minutes)

Tell your iOS app where your backend server is:

### Step 1: Open Config.swift

1. In left sidebar, expand **Utilities** folder
2. Click on **`Config.swift`**

### Step 2: Update the URL

Find this line (around line 9):
```swift
static let apiBaseURL = "https://your-app.onrender.com"
```

Change it to your **actual Render URL**. For example:
```swift
static let apiBaseURL = "https://vcnotebook.onrender.com"
```

**How to find your Render URL:**
1. Go to [https://dashboard.render.com](https://dashboard.render.com)
2. Click on your service
3. Copy the URL at the top (looks like: `https://yourapp.onrender.com`)

Press `Command ⌘ + S` to save the file.

---

## 📋 Part 8: Build and Run! (5 minutes)

### Step 1: Select a Simulator

1. At the top of Xcode, find the device selector (it says something like "VCNotebook > iPhone 15 Pro")
2. Click on it
3. Choose **"iPhone 15 Pro"** (or any iPhone simulator you prefer)

### Step 2: Build the App

1. Click the **Play ▶️ button** at the top left of Xcode (or press `Command ⌘ + R`)
2. Xcode will compile your app (this takes 1-2 minutes the first time)
3. Watch the progress bar at the top

### Step 3: First Launch

If you see errors, don't panic! Common issues:

**Error: "No such module 'Firebase'"**
- Solution: Wait for all packages to finish downloading, then try again

**Error: "Failed to register bundle identifier"**
- Solution: In Xcode, go to VCNotebook target → Signing & Capabilities → change the Bundle Identifier to something unique (e.g., `com.yourname.VCNotebook123`)

**Error: "GoogleService-Info.plist not found"**
- Solution: Make sure you added the file to the Resources folder and checked "Add to targets"

### Step 4: Success! 🎉

If everything worked:
1. The iOS Simulator will launch
2. Your app will appear
3. You'll see the sign-in screen with "Sign in with Google" button

---

## 🧪 Testing Your App

### Test 1: Sign In

1. Click **"Sign in with Google"**
2. A Google sign-in page will appear
3. Sign in with your Google account
4. You should see the main app with three tabs: Notes, Search, Settings

### Test 2: Create a Note

1. Tap the **"+"** button (top right)
2. Type a title: "My first iOS note"
3. Type some content: "This works!"
4. Tap **"Save"**
5. You should see your note in the list

### Test 3: Check Web Sync

1. Open your web app: `https://your-render-url.com`
2. Sign in with the same Google account
3. You should see the same note!

### Test 4: Premium (Optional)

1. Tap **"Settings"** tab
2. Tap **"Upgrade to Premium"**
3. A payment page will open in the app

---

## 🐛 Troubleshooting

### Problem: Build Failed

**Solution:**
1. Click **Product → Clean Build Folder** (or press `Shift ⌘ + K`)
2. Wait for it to finish
3. Try building again (`Command ⌘ + R`)

### Problem: Simulator is Slow

**Solution:**
1. Close other apps
2. In Xcode, select a simpler device like "iPhone SE (3rd generation)"
3. Restart Xcode

### Problem: Sign In Doesn't Work

**Solution:**
1. Check that GoogleService-Info.plist is added correctly
2. Check that URL Schemes are configured
3. Make sure you're using the same Firebase project as your web app

### Problem: Notes Don't Sync

**Solution:**
1. Check that Config.swift has the correct backend URL
2. Make sure your backend is running (test at `https://your-url.onrender.com/healthz`)
3. Pull to refresh the notes list

---

## 📱 Deploy to Real iPhone (Optional)

### Requirements:
- An iPhone with a cable
- Apple Developer account ($99/year for App Store, or free for testing on your own device)

### Steps:

1. **Connect iPhone** to your Mac with a cable
2. **Trust Computer** on your iPhone when prompted
3. **Select iPhone** in Xcode's device selector (it will appear when connected)
4. **Change Signing**:
   - Click on VCNotebook project (blue icon)
   - Select VCNotebook target
   - Click "Signing & Capabilities" tab
   - Check "Automatically manage signing"
   - Select your team
5. **Build and Run** (Command ⌘ + R)
6. **Trust Developer** on your iPhone:
   - Go to Settings → General → VPN & Device Management
   - Tap on your developer name
   - Tap "Trust"
7. **Run app** - It's now on your iPhone!

---

## ✅ Checklist

Use this to make sure you did everything:

- [ ] Created Xcode project with correct name and settings
- [ ] Deleted default files
- [ ] Added all Swift files from folders
- [ ] Downloaded and added GoogleService-Info.plist
- [ ] Added Firebase SDK package
- [ ] Added Google Sign-In SDK package
- [ ] Added Supabase SDK package
- [ ] Configured URL Schemes with REVERSED_CLIENT_ID
- [ ] Updated Config.swift with backend URL
- [ ] Built and ran in simulator successfully
- [ ] Tested sign in
- [ ] Tested creating a note
- [ ] Verified sync with web app

---

## 🎉 You're Done!

Congratulations! You've successfully:
✅ Created an Xcode project  
✅ Configured all dependencies  
✅ Built your iOS app  
✅ Tested it on the simulator  

Your app now works on iOS and syncs with your web app!

---

## 📚 What's Next?

- **Test on Real Device**: Follow "Deploy to Real iPhone" section
- **Customize**: Change app icon and colors
- **TestFlight**: Share with beta testers
- **App Store**: Submit for review (requires $99/year Apple Developer account)

---

## 💡 Quick Tips

- **Save Often**: Press `Command ⌘ + S` to save your files
- **Build Often**: Press `Command ⌘ + R` to build and run
- **Clean Build**: If something breaks, try `Shift ⌘ + K` then `Command ⌘ + R`
- **Restart Xcode**: When in doubt, quit Xcode and reopen it

---

## 📞 Need Help?

If you get stuck:
1. Read the error message carefully
2. Try Clean Build Folder (`Shift ⌘ + K`)
3. Check that all packages are downloaded
4. Restart Xcode
5. Check that GoogleService-Info.plist is in Resources folder

---

**You've got this! Take it step by step, and you'll have your app running in no time! 🚀**
