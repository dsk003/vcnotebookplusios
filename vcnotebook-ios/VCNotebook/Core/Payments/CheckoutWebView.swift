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

