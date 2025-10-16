# iOS Payments Integration Guide - DodoPayments

## 💳 Overview

This guide shows how to integrate DodoPayments for premium subscriptions in your iOS app, using the same backend as your web app.

## 🏗️ Architecture

```
iOS App
   ↓
Backend API (/api/checkout/create)
   ↓
DodoPayments
   ↓
Checkout Page (Web View)
   ↓
Payment Success
   ↓
Webhook → Backend
   ↓
Supabase (user_subscriptions)
   ↓
Premium Access ✅
```

**Important:** DodoPayments doesn't have a native iOS SDK, so we'll use a web view to display the checkout page.

## 💻 Implementation

### 1. PaymentService.swift

```swift
import Foundation
import Combine

class PaymentService: ObservableObject {
    @Published var isPremium = false
    @Published var subscriptionStatus: String = "inactive"
    @Published var isLoadingStatus = false
    @Published var errorMessage: String?
    
    // MARK: - Check Subscription Status
    
    func checkSubscriptionStatus(userId: String) async {
        isLoadingStatus = true
        errorMessage = nil
        
        do {
            guard let url = URL(string: "\(Config.apiBaseURL)/api/user/subscription-status?userId=\(userId)") else {
                throw URLError(.badURL)
            }
            
            let (data, response) = try await URLSession.shared.data(from: url)
            
            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                throw URLError(.badServerResponse)
            }
            
            let status = try JSONDecoder().decode(SubscriptionResponse.self, from: data)
            
            DispatchQueue.main.async {
                self.isPremium = status.isPremium
                self.subscriptionStatus = status.subscriptionStatus
                self.isLoadingStatus = false
            }
            
            print("✅ Subscription status: \(status.isPremium ? "Premium" : "Free")")
        } catch {
            DispatchQueue.main.async {
                self.errorMessage = error.localizedDescription
                self.isLoadingStatus = false
            }
            print("❌ Error checking subscription: \(error)")
        }
    }
    
    // MARK: - Create Checkout Session
    
    func createCheckoutSession(userEmail: String, userId: String) async throws -> String {
        guard let url = URL(string: "\(Config.apiBaseURL)/api/checkout/create") else {
            throw URLError(.badURL)
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = CheckoutRequest(userEmail: userEmail, userId: userId)
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        
        let checkoutResponse = try JSONDecoder().decode(CheckoutResponse.self, from: data)
        
        guard let checkoutURL = checkoutResponse.checkoutUrl else {
            throw PaymentError.noCheckoutURL
        }
        
        print("✅ Checkout session created: \(checkoutURL)")
        return checkoutURL
    }
}

// MARK: - Models

struct CheckoutRequest: Codable {
    let userEmail: String
    let userId: String
}

struct CheckoutResponse: Codable {
    let checkoutUrl: String?
    
    enum CodingKeys: String, CodingKey {
        case checkoutUrl = "checkout_url"
    }
}

struct SubscriptionResponse: Codable {
    let isPremium: Bool
    let subscriptionStatus: String
    let updatedAt: String?
    
    enum CodingKeys: String, CodingKey {
        case isPremium = "is_premium"
        case subscriptionStatus = "subscription_status"
        case updatedAt = "updated_at"
    }
}

enum PaymentError: LocalizedError {
    case noCheckoutURL
    case checkoutFailed
    
    var errorDescription: String? {
        switch self {
        case .noCheckoutURL:
            return "Could not create checkout session"
        case .checkoutFailed:
            return "Checkout failed. Please try again."
        }
    }
}
```

### 2. CheckoutWebView.swift

```swift
import SwiftUI
import WebKit

struct CheckoutWebView: UIViewRepresentable {
    let url: URL
    @Binding var isPresented: Bool
    let onSuccess: () -> Void
    
    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView()
        webView.navigationDelegate = context.coordinator
        return webView
    }
    
    func updateUIView(_ webView: WKWebView, context: Context) {
        let request = URLRequest(url: url)
        webView.load(request)
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, WKNavigationDelegate {
        let parent: CheckoutWebView
        
        init(_ parent: CheckoutWebView) {
            self.parent = parent
        }
        
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if let url = navigationAction.request.url {
                // Check if user completed payment
                if url.path.contains("payment-success") {
                    parent.onSuccess()
                    parent.isPresented = false
                    decisionHandler(.cancel)
                    return
                }
                
                // Check if user cancelled
                if url.path.contains("cancel") {
                    parent.isPresented = false
                    decisionHandler(.cancel)
                    return
                }
            }
            
            decisionHandler(.allow)
        }
    }
}
```

### 3. PremiumUpgradeView.swift

```swift
import SwiftUI

struct PremiumUpgradeView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var authManager: AuthenticationManager
    @StateObject private var paymentService = PaymentService()
    
    @State private var showingCheckout = false
    @State private var checkoutURL: URL?
    @State private var isCreatingCheckout = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 30) {
                    // Header
                    VStack(spacing: 12) {
                        Image(systemName: "star.circle.fill")
                            .font(.system(size: 80))
                            .foregroundColor(.yellow)
                        
                        Text("Upgrade to Premium")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        
                        Text("Unlock all features")
                            .font(.title3)
                            .foregroundColor(.secondary)
                    }
                    .padding(.top, 40)
                    
                    // Features
                    VStack(alignment: .leading, spacing: 20) {
                        FeatureRow(icon: "icloud", title: "Unlimited Notes", description: "Create as many notes as you want")
                        FeatureRow(icon: "photo.stack", title: "File Attachments", description: "Attach images, videos, and documents")
                        FeatureRow(icon: "arrow.triangle.2.circlepath", title: "Sync Across Devices", description: "Access your notes on web and iOS")
                        FeatureRow(icon: "shield.checkered", title: "Priority Support", description: "Get help when you need it")
                    }
                    .padding(.horizontal)
                    
                    // Pricing
                    VStack(spacing: 16) {
                        Text("$9.99/month")
                            .font(.system(size: 44, weight: .bold))
                        
                        Text("Cancel anytime")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 20)
                    
                    // CTA Button
                    if isCreatingCheckout {
                        ProgressView()
                            .padding()
                    } else {
                        Button(action: {
                            Task {
                                await createCheckout()
                            }
                        }) {
                            Text("Start Free Trial")
                                .font(.headline)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.blue)
                                .cornerRadius(12)
                        }
                        .padding(.horizontal)
                    }
                    
                    // Fine print
                    Text("By subscribing, you agree to our Terms of Service and Privacy Policy")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                        .padding(.bottom, 40)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                }
            }
            .sheet(isPresented: $showingCheckout) {
                if let url = checkoutURL {
                    CheckoutWebView(url: url, isPresented: $showingCheckout) {
                        // Payment successful
                        Task {
                            await paymentService.checkSubscriptionStatus(userId: authManager.getUserId())
                            dismiss()
                        }
                    }
                    .ignoresSafeArea()
                }
            }
            .alert("Error", isPresented: .constant(paymentService.errorMessage != nil)) {
                Button("OK") {
                    paymentService.errorMessage = nil
                }
            } message: {
                Text(paymentService.errorMessage ?? "")
            }
        }
    }
    
    private func createCheckout() async {
        isCreatingCheckout = true
        
        do {
            let checkoutURLString = try await paymentService.createCheckoutSession(
                userEmail: authManager.getUserEmail(),
                userId: authManager.getUserId()
            )
            
            if let url = URL(string: checkoutURLString) {
                checkoutURL = url
                showingCheckout = true
            }
        } catch {
            paymentService.errorMessage = error.localizedDescription
        }
        
        isCreatingCheckout = false
    }
}

struct FeatureRow: View {
    let icon: String
    let title: String
    let description: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.blue)
                .frame(width: 32)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
        }
    }
}
```

### 4. Premium Badge in Settings

```swift
struct SettingsView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @StateObject private var paymentService = PaymentService()
    @State private var showingUpgrade = false
    
    var body: some View {
        NavigationView {
            List {
                // User Info
                Section {
                    HStack {
                        Image(systemName: "person.circle.fill")
                            .font(.largeTitle)
                            .foregroundColor(.blue)
                        
                        VStack(alignment: .leading) {
                            Text(authManager.getUserDisplayName())
                                .font(.headline)
                            Text(authManager.getUserEmail())
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                // Premium Status
                Section {
                    if paymentService.isPremium {
                        HStack {
                            Label("Premium", systemImage: "star.fill")
                                .foregroundColor(.yellow)
                            Spacer()
                            Text("Active")
                                .foregroundColor(.green)
                        }
                    } else {
                        Button(action: { showingUpgrade = true }) {
                            HStack {
                                Label("Upgrade to Premium", systemImage: "star.circle")
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }
                
                // Sign Out
                Section {
                    Button(role: .destructive, action: {
                        authManager.signOut()
                    }) {
                        Text("Sign Out")
                    }
                }
            }
            .navigationTitle("Settings")
            .task {
                await paymentService.checkSubscriptionStatus(userId: authManager.getUserId())
            }
            .sheet(isPresented: $showingUpgrade) {
                PremiumUpgradeView()
                    .environmentObject(authManager)
            }
        }
    }
}
```

## 🔄 Payment Flow

1. User taps "Upgrade to Premium"
2. iOS app calls `/api/checkout/create` on your backend
3. Backend creates DodoPayments checkout session
4. Backend returns checkout URL
5. iOS opens checkout URL in web view
6. User completes payment on DodoPayments
7. DodoPayments redirects to success URL
8. Web view detects success URL
9. iOS app refreshes subscription status
10. User now has premium access ✅

## 🔐 Security

**Important security notes:**

1. **Never expose DodoPayments API key in iOS app**
   - ✅ API key stays on backend
   - ✅ iOS only calls your backend API
   - ✅ Backend handles all payment logic

2. **Verify subscription status server-side**
   - Backend webhook updates Supabase
   - iOS reads from Supabase (RLS protected)
   - User can't fake premium status

3. **Use HTTPS only**
   - Your Render backend already uses HTTPS ✅

## 🧪 Testing

### Test Checkout Flow:
- [ ] Tap "Upgrade to Premium" opens web view
- [ ] Can complete test payment
- [ ] Success redirect works
- [ ] Premium status updates immediately
- [ ] Cancel works correctly

### Test Premium Features:
- [ ] Premium status persists after app restart
- [ ] Premium badge shows in settings
- [ ] Premium features are unlocked
- [ ] Status syncs between web and iOS

### Test Edge Cases:
- [ ] Network offline during checkout
- [ ] User closes web view mid-checkout
- [ ] Payment fails
- [ ] Subscription expires
- [ ] User downgrade

## 💡 Alternative: Native In-App Purchase

If you prefer Apple's In-App Purchase instead of DodoPayments:

**Pros:**
- Native iOS experience
- Apple handles everything
- Integrated with App Store

**Cons:**
- 15-30% Apple commission
- Different system than web
- More complex to implement
- Need to handle two payment systems

**Recommendation:** Start with DodoPayments (web view) for consistency with web app. Add IAP later if needed.

## 🔄 Syncing Premium Status

Premium status syncs automatically:
- ✅ Purchase on web → Access on iOS
- ✅ Purchase on iOS → Access on web
- ✅ Single subscription, both platforms

This works because both platforms check the same `user_subscriptions` table in Supabase.

## 📱 UI/UX Best Practices

1. **Clear value proposition** - Show what user gets
2. **Easy to understand pricing** - No hidden fees
3. **One-tap upgrade** - Minimize friction
4. **Secure payment** - Use trusted payment provider
5. **Cancel anytime** - Build trust

## 🚀 Going Further

Consider adding:
- **Free trial** - Let users try premium
- **Multiple tiers** - Basic, Pro, Enterprise
- **Family sharing** - Share with family members
- **Referral program** - Reward referrals
- **Restore purchases** - For reinstalls

## 🐛 Troubleshooting

### Web view doesn't open
- Check URL is valid
- Verify backend is running
- Test URL in Safari first

### Payment success not detected
- Check redirect URL configuration in DodoPayments
- Verify URL matching in Coordinator
- Test with success URL

### Premium status not updating
- Check backend webhook is receiving events
- Verify Supabase update is working
- Refresh app to fetch latest status

---

**That's it!** Your iOS app now shares the same payment system as your web app. 💳✨

