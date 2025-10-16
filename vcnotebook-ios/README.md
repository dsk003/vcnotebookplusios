# 🚀 VCNotebook iOS - Automated Xcode Project Setup

## ⚡ One-Click Setup

I've created an automated script that generates the Xcode project for you!

### 📋 Steps to Generate .xcodeproj File:

#### Option 1: Double-Click (Easiest)
1. **Double-click** `generate-xcode-project.sh`
2. Click **"Open"** if macOS asks for permission
3. Wait for the script to finish
4. The `.xcodeproj` file will be created automatically!

#### Option 2: Terminal Command
```bash
cd /Users/dsk/vcnotebook+iOS/vcnotebook-ios/
./generate-xcode-project.sh
```

### ✅ What the Script Does:

1. ✅ Installs Homebrew (if not installed)
2. ✅ Installs XcodeGen tool
3. ✅ Generates `VCNotebook.xcodeproj` from `project.yml`
4. ✅ Configures all Swift Package dependencies
5. ✅ Sets up build settings and schemes

### 📦 What Gets Installed:

The script will automatically add these dependencies:
- Firebase iOS SDK (for authentication)
- Google Sign-In (for login)
- Supabase Swift (for database)

### ⏱️ Time Required:
- First run: ~5 minutes (installs tools)
- Subsequent runs: ~10 seconds

### 🎯 After Project is Generated:

1. **Open the project:**
   ```
   Double-click: VCNotebook.xcodeproj
   ```

2. **Add Firebase config:**
   - Download `GoogleService-Info.plist` from Firebase Console
   - Drag it into `VCNotebook/Resources/` folder in Xcode

3. **Update backend URL:**
   - Open `VCNotebook/Utilities/Config.swift`
   - Change the `apiBaseURL` to your Render URL

4. **Build and Run:**
   - Press `⌘ + R` in Xcode
   - Your app will launch in the simulator!

### 📂 Project Structure After Generation:

```
vcnotebook-ios/
├── VCNotebook.xcodeproj         ← CREATED BY SCRIPT
├── project.yml                   ← Project configuration
├── generate-xcode-project.sh    ← Generator script
└── VCNotebook/
    ├── App/
    ├── Core/
    ├── Models/
    ├── Services/
    ├── Utilities/
    ├── Components/
    └── Resources/
        ├── Info.plist           ← Required for iOS
        └── GoogleService-Info.plist  ← YOU NEED TO ADD THIS
```

### 🔧 Customization:

To change project settings, edit `project.yml`:
- Bundle identifier
- Team ID
- Deployment target
- Dependencies

Then run the script again to regenerate the project.

### ⚠️ Important Notes:

1. **Run the script from the vcnotebook-ios folder**
2. **Don't commit .xcodeproj to git** (it's auto-generated)
3. **Keep project.yml in git** (it's the source of truth)

### 🐛 Troubleshooting:

**"Permission denied" error:**
```bash
chmod +x generate-xcode-project.sh
./generate-xcode-project.sh
```

**"xcodegen: command not found":**
```bash
brew install xcodegen
```

**"No such file or directory":**
- Make sure you're in the vcnotebook-ios folder
- Run: `cd /Users/dsk/vcnotebook+iOS/vcnotebook-ios/`

### 📚 Full Setup Guide:

For detailed setup instructions, see:
- `../XCODE_SETUP_FOR_BEGINNERS.md` - Step-by-step guide
- `../QUICK_START_XCODE.md` - Quick reference

---

## 🎉 That's It!

Just run the script, and you'll have a ready-to-use Xcode project!

**No manual Xcode project creation needed!** 🚀

