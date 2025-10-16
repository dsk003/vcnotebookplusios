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
                    Config.log("User signed in: \(user.email ?? "unknown")", type: .success)
                    self?.setupSupabaseAuth(for: user)
                } else {
                    Config.log("User signed out", type: .info)
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
            Config.log("Missing Firebase Client ID", type: .error)
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
            Config.log("Could not find root view controller", type: .error)
            return
        }
        
        // Start sign in flow
        GIDSignIn.sharedInstance.signIn(withPresenting: rootViewController) { [weak self] result, error in
            guard let self = self else { return }
            
            if let error = error {
                Config.log("Google Sign-In error: \(error.localizedDescription)", type: .error)
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
                Config.log("Failed to get Google ID token", type: .error)
                return
            }
            
            let accessToken = user.accessToken.tokenString
            
            // Sign in to Firebase with Google credential
            let credential = GoogleAuthProvider.credential(withIDToken: idToken, accessToken: accessToken)
            
            Auth.auth().signIn(with: credential) { authResult, error in
                DispatchQueue.main.async {
                    self.isLoading = false
                    
                    if let error = error {
                        Config.log("Firebase Sign-In error: \(error.localizedDescription)", type: .error)
                        self.errorMessage = error.localizedDescription
                        return
                    }
                    
                    if let user = authResult?.user {
                        Config.log("Successfully signed in: \(user.email ?? "unknown")", type: .success)
                        Config.log("User UID: \(user.uid)", type: .info)
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
            
            Config.log("Successfully signed out", type: .success)
        } catch {
            Config.log("Sign out error: \(error.localizedDescription)", type: .error)
            DispatchQueue.main.async {
                self.errorMessage = error.localizedDescription
            }
        }
    }
    
    // MARK: - Supabase Authentication
    
    private func setupSupabaseAuth(for user: User) {
        user.getIDToken { token, error in
            if let error = error {
                Config.log("Error getting Firebase token: \(error.localizedDescription)", type: .error)
                return
            }
            
            guard let token = token else {
                Config.log("No Firebase token available", type: .error)
                return
            }
            
            Config.log("Got Firebase token for Supabase", type: .success)
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

