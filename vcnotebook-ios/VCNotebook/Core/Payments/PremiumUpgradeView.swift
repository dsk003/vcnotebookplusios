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

struct PremiumUpgradeView_Previews: PreviewProvider {
    static var previews: some View {
        PremiumUpgradeView()
            .environmentObject(AuthenticationManager())
    }
}

