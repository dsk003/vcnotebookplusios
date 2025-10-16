import Foundation
import FirebaseAuth

struct AppUser: Identifiable {
    let id: String
    let email: String
    let displayName: String?
    let photoURL: URL?
    
    init(firebaseUser: User) {
        self.id = firebaseUser.uid
        self.email = firebaseUser.email ?? ""
        self.displayName = firebaseUser.displayName
        self.photoURL = firebaseUser.photoURL
    }
    
    var name: String {
        displayName ?? email.components(separatedBy: "@").first ?? "User"
    }
}

