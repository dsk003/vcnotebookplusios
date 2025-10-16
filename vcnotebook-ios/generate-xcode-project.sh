#!/bin/bash

# Script to generate Xcode project for VCNotebook iOS app
# This creates the .xcodeproj file automatically

echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║     📱 VCNotebook - Xcode Project Generator             ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew is not installed."
    echo ""
    echo "📦 Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Check if xcodegen is installed
if ! command -v xcodegen &> /dev/null; then
    echo "📦 Installing XcodeGen..."
    brew install xcodegen
    echo "✅ XcodeGen installed successfully!"
    echo ""
fi

# Generate the Xcode project
echo "🔨 Generating Xcode project..."
cd "$(dirname "$0")"
xcodegen generate

if [ $? -eq 0 ]; then
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║                                                          ║"
    echo "║     ✅ SUCCESS! Xcode Project Created!                   ║"
    echo "║                                                          ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    echo "📂 Project file created: VCNotebook.xcodeproj"
    echo ""
    echo "🚀 Next Steps:"
    echo "1. Double-click VCNotebook.xcodeproj to open in Xcode"
    echo "2. Add GoogleService-Info.plist to Resources folder"
    echo "3. Update Config.swift with your Render URL"
    echo "4. Press ⌘+R to build and run!"
    echo ""
    echo "📖 Full setup guide: ../XCODE_SETUP_FOR_BEGINNERS.md"
    echo ""
    
    # Ask if user wants to open Xcode now
    read -p "Would you like to open the project in Xcode now? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open VCNotebook.xcodeproj
        echo "✅ Opening Xcode..."
    fi
else
    echo ""
    echo "❌ Error: Failed to generate Xcode project"
    echo "Please check the error messages above"
    exit 1
fi

