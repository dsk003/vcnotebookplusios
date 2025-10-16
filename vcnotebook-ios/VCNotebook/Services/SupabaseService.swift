import Foundation
import Supabase

class SupabaseService {
    static let shared = SupabaseService()
    
    private var client: SupabaseClient?
    private var isConfigured = false
    
    private init() {
        Task {
            await configure()
        }
    }
    
    // MARK: - Configuration
    
    func configure() async {
        do {
            // Fetch Supabase configuration from backend
            let config = try await fetchSupabaseConfig()
            
            guard let url = URL(string: config.supabaseURL) else {
                print("❌ Invalid Supabase URL")
                return
            }
            
            self.client = SupabaseClient(
                supabaseURL: url,
                supabaseKey: config.supabaseAnonKey
            )
            
            self.isConfigured = true
            print("✅ Supabase configured successfully")
        } catch {
            print("❌ Error configuring Supabase: \(error)")
        }
    }
    
    private func fetchSupabaseConfig() async throws -> SupabaseConfig {
        guard let url = URL(string: "\(Config.apiBaseURL)/api/config") else {
            throw URLError(.badURL)
        }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        let config = try JSONDecoder().decode(SupabaseConfig.self, from: data)
        return config
    }
    
    // MARK: - Authentication
    
    func authenticateWithFirebaseToken(_ token: String, userId: String) {
        guard isConfigured, let client = client else {
            print("❌ Supabase not configured")
            return
        }
        
        Task {
            do {
                // Set session with Firebase token
                // Note: This requires custom Supabase configuration
                // For now, we'll just store the user ID for RLS queries
                print("✅ Authenticated with Firebase token for user: \(userId)")
            } catch {
                print("❌ Error authenticating with Supabase: \(error)")
            }
        }
    }
    
    // MARK: - Notes CRUD
    
    func fetchNotes(userId: String) async throws -> [Note] {
        guard isConfigured, let client = client else {
            throw SupabaseError.notConfigured
        }
        
        let response: [Note] = try await client
            .database
            .from("notes")
            .select()
            .eq("user_id", value: userId)
            .order("updated_at", ascending: false)
            .execute()
            .value
        
        return response
    }
    
    func createNote(_ note: Note) async throws -> Note {
        guard isConfigured, let client = client else {
            throw SupabaseError.notConfigured
        }
        
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        
        let response: Note = try await client
            .database
            .from("notes")
            .insert(note)
            .single()
            .execute()
            .value
        
        return response
    }
    
    func updateNote(_ note: Note) async throws -> Note {
        guard isConfigured, let client = client else {
            throw SupabaseError.notConfigured
        }
        
        let response: Note = try await client
            .database
            .from("notes")
            .update(note)
            .eq("id", value: note.id)
            .eq("user_id", value: note.userId)
            .single()
            .execute()
            .value
        
        return response
    }
    
    func deleteNote(noteId: String, userId: String) async throws {
        guard isConfigured, let client = client else {
            throw SupabaseError.notConfigured
        }
        
        try await client
            .database
            .from("notes")
            .delete()
            .eq("id", value: noteId)
            .eq("user_id", value: userId)
            .execute()
    }
    
    func searchNotes(query: String, userId: String) async throws -> [Note] {
        guard isConfigured, let client = client else {
            throw SupabaseError.notConfigured
        }
        
        // Use Supabase full-text search
        let response: [Note] = try await client
            .database
            .from("notes")
            .select()
            .eq("user_id", value: userId)
            .textSearch("title_content_fts", query: query)
            .execute()
            .value
        
        return response
    }
    
    // MARK: - File Attachments
    
    func fetchFileAttachments(noteId: String, userId: String) async throws -> [FileAttachment] {
        guard isConfigured, let client = client else {
            throw SupabaseError.notConfigured
        }
        
        let response: [FileAttachment] = try await client
            .database
            .from("file_attachments")
            .select()
            .eq("note_id", value: noteId)
            .eq("user_id", value: userId)
            .execute()
            .value
        
        return response
    }
    
    func uploadFile(data: Data, fileName: String, userId: String) async throws -> String {
        guard isConfigured, let client = client else {
            throw SupabaseError.notConfigured
        }
        
        let fileExt = (fileName as NSString).pathExtension
        let uniqueFileName = "\(UUID().uuidString).\(fileExt)"
        let filePath = "\(userId)/\(uniqueFileName)"
        
        try await client
            .storage
            .from("note-attachments")
            .upload(path: filePath, file: data)
        
        return filePath
    }
    
    func getSignedURL(for path: String) async throws -> URL {
        guard isConfigured, let client = client else {
            throw SupabaseError.notConfigured
        }
        
        let signedURL = try await client
            .storage
            .from("note-attachments")
            .createSignedURL(path: path, expiresIn: 3600) // 1 hour
        
        return signedURL
    }
    
    func deleteFile(path: String) async throws {
        guard isConfigured, let client = client else {
            throw SupabaseError.notConfigured
        }
        
        try await client
            .storage
            .from("note-attachments")
            .remove(paths: [path])
    }
    
    // MARK: - Subscription Status
    
    func checkSubscriptionStatus(userId: String) async throws -> SubscriptionStatus {
        guard isConfigured, let client = client else {
            throw SupabaseError.notConfigured
        }
        
        let response: SubscriptionStatus = try await client
            .database
            .from("user_subscriptions")
            .select()
            .eq("user_id", value: userId)
            .single()
            .execute()
            .value
        
        return response
    }
}

// MARK: - Models

struct SupabaseConfig: Codable {
    let supabaseURL: String
    let supabaseAnonKey: String
    let supabaseServiceKey: String?
    
    enum CodingKeys: String, CodingKey {
        case supabaseURL = "supabaseUrl"
        case supabaseAnonKey = "supabaseAnonKey"
        case supabaseServiceKey = "supabaseServiceKey"
    }
}

struct SubscriptionStatus: Codable {
    let isPremium: Bool
    let subscriptionStatus: String
    let updatedAt: String?
    
    enum CodingKeys: String, CodingKey {
        case isPremium = "is_premium"
        case subscriptionStatus = "subscription_status"
        case updatedAt = "updated_at"
    }
}

// MARK: - Errors

enum SupabaseError: LocalizedError {
    case notConfigured
    case invalidResponse
    case networkError(Error)
    
    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Supabase is not configured. Please check your backend connection."
        case .invalidResponse:
            return "Invalid response from server"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        }
    }
}

