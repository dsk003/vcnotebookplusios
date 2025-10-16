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
            guard let url = Config.buildURL(endpoint: Config.Endpoint.subscriptionStatus, queryItems: [
                URLQueryItem(name: "userId", value: userId)
            ]) else {
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
            
            Config.log("Subscription status: \(status.isPremium ? "Premium" : "Free")", type: .success)
        } catch {
            DispatchQueue.main.async {
                self.errorMessage = error.localizedDescription
                self.isLoadingStatus = false
            }
            Config.log("Error checking subscription: \(error)", type: .error)
        }
    }
    
    // MARK: - Create Checkout Session
    
    func createCheckoutSession(userEmail: String, userId: String) async throws -> String {
        guard let url = Config.buildURL(endpoint: Config.Endpoint.checkoutCreate) else {
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
        
        Config.log("Checkout session created: \(checkoutURL)", type: .success)
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

