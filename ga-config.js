// Google Analytics Configuration
// This file is now used for client-side GA configuration
// The actual Measurement ID is loaded from server environment variables

const GA_CONFIG = {
    // Configuration will be loaded dynamically from server
    measurementId: null,
    enabled: false,
    
    // Optional: Configure additional tracking parameters
    config: {
        // Enable enhanced measurement
        enhanced_measurement: true,
        
        // Set custom parameters
        custom_map: {
            'custom_parameter_1': 'user_type',
            'custom_parameter_2': 'app_version'
        }
    }
};

// Function to load GA config from server
async function loadGAConfig() {
    try {
        const response = await fetch('/api/ga-config');
        const serverConfig = await response.json();
        
        GA_CONFIG.measurementId = serverConfig.measurementId;
        GA_CONFIG.enabled = serverConfig.enabled;
        
        return GA_CONFIG;
    } catch (error) {
        console.error('Error loading GA configuration:', error);
        return GA_CONFIG;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GA_CONFIG, loadGAConfig };
}
