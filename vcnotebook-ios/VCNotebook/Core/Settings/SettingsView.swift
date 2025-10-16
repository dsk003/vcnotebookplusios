import SwiftUI

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
                } header: {
                    Text("Subscription")
                }
                
                // App Info
                Section {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text(Config.appVersion)
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        Text("Build")
                        Spacer()
                        Text(Config.buildNumber)
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        Text("Environment")
                        Spacer()
                        Text(Config.Environment.current.name)
                            .foregroundColor(.secondary)
                    }
                } header: {
                    Text("App Information")
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

struct SettingsView_Previews: PreviewProvider {
    static var previews: some View {
        SettingsView()
            .environmentObject(AuthenticationManager())
    }
}

