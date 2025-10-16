# iOS Authentication Implementation Guide

## 🔐 Overview

This guide shows how to implement Google Sign-In for your iOS app using Firebase Authentication, sharing the same authentication backend as your web app.

## 📋 Prerequisites

- Firebase iOS SDK installed
- Google Sign-In SDK installed
- GoogleService-Info.plist added to project
- URL schemes configured in Info.plist

## 🏗️ Architecture

```
User Taps "Sign In"
        ↓
Google Sign-In (iOS)
        ↓
Firebase Authentication
        ↓
Get User UID
        ↓
Send to Supabase (via backend)
        ↓
User Authenticated ✅
```

## 💻 Implementation

### 1. AppDelegate.swift

```swift
import UIKit
import Firebase
import GoogleSignIn

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        // Configure Firebase
        FirebaseApp.configure()
        
        return true
    }
    
    func application(_ app: UIApplication,
                     open url: URL,
                     options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Handle Google Sign-In redirect
        return GIDSignIn.sharedInstance.handle(url)
    }
}
```

### 2. AuthenticationManager.swift

```swift
import Foundation
import Firebase
import FirebaseAuth
import GoogleSignIn
import Combine

class AuthenticationManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private var authStateHandle: AuthStateDidChangeListenerHandle?
    
    init() {
        setupAuthStateListener()
    }
    
    deinit {
        if let handle = authStateHandle {
            Auth.auth().removeStateDidChangeListener(handle)
        }
    }
    
    // MARK: - Auth State Listener
    
    private func setupAuthStateListener() {
        authStateHandle = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            DispatchQueue.main.async {
                self?.currentUser = user
                self?.isAuthenticated = user != nil
                
                if let user = user {
                    print("✅ User signed in: \(user.email ?? "unknown")")
                    self?.setupSupabaseAuth(for: user)
                } else {
                    print("❌ User signed out")
                }
            }
        }
    }
    
    // MARK: - Google Sign-In
    
    func signInWithGoogle() {
        isLoading = true
        errorMessage = nil
        
        guard let clientID = FirebaseApp.app()?.options.clientID else {
            self.errorMessage = "Missing Firebase Client ID"
            self.isLoading = false
            return
        }
        
        // Configure Google Sign-In
        let config = GIDConfiguration(clientID: clientID)
        GIDSignIn.sharedInstance.configuration = config
        
        // Get root view controller
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootViewController = windowScene.windows.first?.rootViewController else {
            self.errorMessage = "Could not find root view controller"
            self.isLoading = false
            return
        }
        
        // Start sign in flow
        GIDSignIn.sharedInstance.signIn(withPresenting: rootViewController) { [weak self] result, error in
            guard let self = self else { return }
            
            if let error = error {
                print("❌ Google Sign-In error: \(error.localizedDescription)")
                DispatchQueue.main.async {
                    self.errorMessage = error.localizedDescription
                    self.isLoading = false
                }
                return
            }
            
            guard let user = result?.user,
                  let idToken = user.idToken?.tokenString else {
                DispatchQueue.main.async {
                    self.errorMessage = "Failed to get Google ID token"
                    self.isLoading = false
                }
                return
            }
            
            let accessToken = user.accessToken.tokenString
            
            // Sign in to Firebase with Google credential
            let credential = GoogleAuthProvider.credential(withIDToken: idToken, accessToken: accessToken)
            
            Auth.auth().signIn(with: credential) { authResult, error in
                DispatchQueue.main.async {
                    self.isLoading = false
                    
                    if let error = error {
                        print("❌ Firebase Sign-In error: \(error.localizedDescription)")
                        self.errorMessage = error.localizedDescription
                        return
                    }
                    
                    if let user = authResult?.user {
                        print("✅ Successfully signed in: \(user.email ?? "unknown")")
                        print("✅ User UID: \(user.uid)")
                    }
                }
            }
        }
    }
    
    // MARK: - Sign Out
    
    func signOut() {
        do {
            try Auth.auth().signOut()
            GIDSignIn.sharedInstance.signOut()
            
            DispatchQueue.main.async {
                self.currentUser = nil
                self.isAuthenticated = false
                self.errorMessage = nil
            }
            
            print("✅ Successfully signed out")
        } catch {
            print("❌ Sign out error: \(error.localizedDescription)")
            DispatchQueue.main.async {
                self.errorMessage = error.localizedDescription
            }
        }
    }
    
    // MARK: - Supabase Authentication
    
    private func setupSupabaseAuth(for user: User) {
        user.getIDToken { token, error in
            if let error = error {
                print("❌ Error getting Firebase token: \(error.localizedDescription)")
                return
            }
            
            guard let token = token else {
                print("❌ No Firebase token available")
                return
            }
            
            print("✅ Got Firebase token for Supabase")
            // TODO: Send token to Supabase (implement in SupabaseService)
            SupabaseService.shared.authenticateWithFirebaseToken(token, userId: user.uid)
        }
    }
    
    // MARK: - User Info
    
    func getUserDisplayName() -> String {
        return currentUser?.displayName ?? currentUser?.email ?? "User"
    }
    
    func getUserEmail() -> String {
        return currentUser?.email ?? ""
    }
    
    func getUserId() -> String {
        return currentUser?.uid ?? ""
    }
}
```

### 3. AuthenticationView.swift

```swift
import SwiftUI

struct AuthenticationView: View {
    @StateObject private var authManager = AuthenticationManager()
    
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                gradient: Gradient(colors: [Color.blue.opacity(0.6), Color.purple.opacity(0.6)]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 40) {
                // App Icon/Logo
                VStack(spacing: 16) {
                    Image(systemName: "note.text")
                        .font(.system(size: 80))
                        .foregroundColor(.white)
                    
                    Text("Notes App")
                        .font(.system(size: 36, weight: .bold))
                        .foregroundColor(.white)
                    
                    Text("Sign in to access your notes")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.9))
                }
                .padding(.top, 80)
                
                Spacer()
                
                // Sign in button
                VStack(spacing: 20) {
                    if let errorMessage = authManager.errorMessage {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundColor(.red)
                            .padding()
                            .background(Color.white.opacity(0.9))
                            .cornerRadius(8)
                    }
                    
                    Button(action: {
                        authManager.signInWithGoogle()
                    }) {
                        HStack(spacing: 12) {
                            if authManager.isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .gray))
                            } else {
                                // Google logo
                                Image(systemName: "g.circle.fill")
                                    .font(.title2)
                                
                                Text("Sign in with Google")
                                    .font(.headline)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.white)
                        .foregroundColor(.black)
                        .cornerRadius(12)
                        .shadow(color: .black.opacity(0.2), radius: 10, x: 0, y: 5)
                    }
                    .disabled(authManager.isLoading)
                    .padding(.horizontal, 40)
                    
                    Text("Your notes are securely stored\nand synced across devices")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.8))
                        .multilineTextAlignment(.center)
                }
                .padding(.bottom, 60)
            }
        }
    }
}

struct AuthenticationView_Previews: PreviewProvider {
    static var previews: some View {
        AuthenticationView()
    }
}
```

### 4. VCNotebookApp.swift (Main App)

```swift
import SwiftUI
import Firebase

@main
struct VCNotebookApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var authManager = AuthenticationManager()
    
    var body: some Scene {
        WindowGroup {
            Group {
                if authManager.isAuthenticated {
                    MainTabView()
                        .environmentObject(authManager)
                } else {
                    AuthenticationView()
                }
            }
        }
    }
}
```

## 🔑 Key Points

### Firebase vs Web Authentication

Your iOS app uses the **same Firebase project** as your web app:
- ✅ User accounts are shared
- ✅ Same user UID on both platforms
- ✅ Authentication state syncs automatically

### Supabase Integration

After Firebase authentication:
1. iOS gets Firebase token
2. Send token to your backend or directly to Supabase
3. Backend validates token and creates/updates user in Supabase
4. iOS can now make authenticated Supabase requests

### Security Best Practices

1. **Never store tokens in UserDefaults** - Use Keychain instead
2. **Refresh tokens automatically** - Firebase handles this
3. **Handle token expiration** - Re-authenticate if needed
4. **Use HTTPS only** - Your backend already does this ✅

## 🧪 Testing

### Test Checklist:
- [ ] Sign in with Google works
- [ ] User email displays correctly
- [ ] Sign out works
- [ ] App remembers signed-in state after restart
- [ ] Error messages display correctly
- [ ] Works on real device (not just simulator)

### Test Different Scenarios:
- [ ] First-time sign in
- [ ] Returning user
- [ ] Cancel sign in
- [ ] Sign in with different Google account
- [ ] Network offline during sign in

## 🐛 Troubleshooting

### "Missing Firebase Client ID"
- Check GoogleService-Info.plist is added to project
- Verify it's included in target membership

### "Could not find root view controller"
- Make sure you're calling signIn after view appears
- Check window scene is properly configured

### Google Sign-In sheet doesn't appear
- Verify URL schemes in Info.plist
- Check REVERSED_CLIENT_ID is correct
- Make sure app delegate handles URL opening

### "The operation couldn't be completed"
- Check bundle ID matches Firebase project
- Verify OAuth consent screen is configured
- Make sure Google Sign-In is enabled in Firebase

## 📱 iOS-Specific Features

Consider adding these iOS-native features:
- **Face ID / Touch ID** - Quick re-authentication
- **Keychain Integration** - Secure token storage
- **Sign in with Apple** - Alternative sign-in method
- **Background Token Refresh** - Keep user signed in

## 🔄 Syncing with Web App

Both apps share authentication:
- User signs in on web → Can use iOS immediately
- User signs in on iOS → Can use web immediately
- Sign out on one device → Must sign in again on other
- User data (notes, files) syncs automatically via Supabase

## 📚 Next Steps

After authentication is working:
1. Implement SupabaseService (see IOS_SUPABASE_GUIDE.md)
2. Create Notes views (see IOS_NOTES_GUIDE.md)
3. Add file upload (see IOS_FILE_UPLOAD_GUIDE.md)
4. Integrate payments (see IOS_PAYMENTS_GUIDE.md)

---

**Authentication is the foundation!** Make sure this works perfectly before building other features. 🔐

