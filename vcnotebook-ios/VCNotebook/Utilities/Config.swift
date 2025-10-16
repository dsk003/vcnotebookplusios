import Foundation

struct Config {
    // MARK: - Backend API
    
    /// Backend API base URL
    /// Change this to your Render deployment URL
    static let apiBaseURL = "https://your-app.onrender.com"
    
    // For local development, use:
    // static let apiBaseURL = "http://localhost:3000"
    
    // MARK: - Supabase Configuration
    
    /// Supabase configuration loaded dynamically from backend
    static var supabaseURL: String = ""
    static var supabaseAnonKey: String = ""
    
    // MARK: - App Information
    
    static let appVersion: String = {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
    }()
    
    static let buildNumber: String = {
        Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
    }()
    
    static let bundleIdentifier: String = {
        Bundle.main.bundleIdentifier ?? ""
    }()
    
    // MARK: - Feature Flags
    
    /// Enable debug logging
    static let isDebugMode = true
    
    /// Enable analytics
    static let analyticsEnabled = true
    
    /// Max file upload size (50MB)
    static let maxFileUploadSize: Int64 = 50 * 1024 * 1024
    
    // MARK: - API Endpoints
    
    enum Endpoint {
        static let config = "/api/config"
        static let firebaseConfig = "/api/firebase-config"
        static let gaConfig = "/api/ga-config"
        static let checkoutCreate = "/api/checkout/create"
        static let subscriptionStatus = "/api/user/subscription-status"
        static let healthCheck = "/healthz"
    }
    
    // MARK: - UI Configuration
    
    /// Default theme colors
    enum Colors {
        static let primary = "Blue"
        static let secondary = "Purple"
        static let accent = "Orange"
    }
    
    /// Animation durations
    enum Animation {
        static let short = 0.2
        static let medium = 0.3
        static let long = 0.5
    }
    
    // MARK: - Debug Logging
    
    static func log(_ message: String, type: LogType = .info) {
        guard isDebugMode else { return }
        
        let emoji = type.emoji
        let timestamp = DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .medium)
        print("[\(timestamp)] \(emoji) \(message)")
    }
    
    enum LogType {
        case info
        case success
        case warning
        case error
        case debug
        
        var emoji: String {
            switch self {
            case .info: return "ℹ️"
            case .success: return "✅"
            case .warning: return "⚠️"
            case .error: return "❌"
            case .debug: return "🔍"
            }
        }
    }
}

// MARK: - URL Builder

extension Config {
    static func buildURL(endpoint: String, queryItems: [URLQueryItem]? = nil) -> URL? {
        var components = URLComponents(string: apiBaseURL + endpoint)
        components?.queryItems = queryItems
        return components?.url
    }
}

// MARK: - Environment

extension Config {
    enum Environment {
        case development
        case staging
        case production
        
        static var current: Environment {
            #if DEBUG
            return .development
            #else
            return .production
            #endif
        }
        
        var name: String {
            switch self {
            case .development: return "Development"
            case .staging: return "Staging"
            case .production: return "Production"
            }
        }
    }
}

