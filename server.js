const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from project root
app.use(express.static(path.join(__dirname)));

// Health check
app.get('/healthz', (_req, res) => {
  res.status(200).send('ok');
});

// Serve Supabase configuration
app.get('/api/config', (_req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  });
});

// Serve Firebase configuration
app.get('/api/firebase-config', (_req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
  });
});

// Dodo Payments API endpoints
app.post('/api/payments/create', async (req, res) => {
  try {
    console.log('=== PAYMENT CREATION REQUEST ===');
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);
    
    const { userEmail, userId } = req.body;
    
    if (!userEmail || !userId) {
      console.log('❌ Missing required fields:', { userEmail: !!userEmail, userId: !!userId });
      return res.status(400).json({ error: 'User email and ID are required' });
    }

    // Check if API key is available
    if (!process.env.DODO_PAYMENTS_API_KEY) {
      console.error('❌ DODO_PAYMENTS_API_KEY environment variable not set');
      return res.status(500).json({ 
        error: 'Payment system not configured',
        details: 'DODO_PAYMENTS_API_KEY environment variable is missing'
      });
    }

    // Check if product ID is available
    if (!process.env.PRODUCT_ID) {
      console.error('❌ PRODUCT_ID environment variable not set');
      return res.status(500).json({ 
        error: 'Product not configured',
        details: 'PRODUCT_ID environment variable is missing'
      });
    }

    console.log('✅ Environment variables check passed');
    console.log('API Key present:', !!process.env.DODO_PAYMENTS_API_KEY);
    console.log('Product ID present:', !!process.env.PRODUCT_ID);

    const paymentData = {
      payment_link: true,
      billing: {
        city: 'New York',
        country: 'US',
        state: 'NY',
        street: '123 Main St',
        zipcode: '10001'
      },
      customer: {
        email: userEmail,
        name: userEmail.split('@')[0]
      },
      product_cart: [
        {
          product_id: process.env.PRODUCT_ID,
          quantity: 1
        }
      ],
      success_url: `${req.protocol}://${req.get('host')}/payment-success`,
      cancel_url: `${req.protocol}://${req.get('host')}/`,
      metadata: {
        user_id: userId,
        user_email: userEmail,
        product: 'premium_upgrade'
      }
    };

    console.log('📤 Sending payment data to DodoPayments Checkout API:');
    console.log('Payment data:', JSON.stringify(paymentData, null, 2));
    console.log('API URL: https://test.dodopayments.com/checkouts');
    console.log('API Key (first 10 chars):', process.env.DODO_PAYMENTS_API_KEY?.substring(0, 10) + '...');

    const response = await fetch('https://test.dodopayments.com/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DODO_PAYMENTS_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    console.log('📥 DodoPayments API response:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ DodoPayments Checkout API error:');
      console.error('Status:', response.status);
      console.error('Status Text:', response.statusText);
      console.error('Error Response:', errorData);
      
      return res.status(500).json({ 
        error: 'Failed to create checkout',
        details: errorData,
        status: response.status,
        statusText: response.statusText
      });
    }

    const checkoutResponse = await response.json();
    console.log('✅ Checkout created successfully:');
    console.log('Checkout Response:', JSON.stringify(checkoutResponse, null, 2));
    
    // The checkout API might return different field names
    res.json({
      payment_id: checkoutResponse.payment_id || checkoutResponse.id,
      payment_url: checkoutResponse.payment_url || checkoutResponse.checkout_url || checkoutResponse.url
    });

  } catch (error) {
    console.error('❌ Payment creation error:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Webhook handler for payment status updates
app.post('/api/payments/webhook', async (req, res) => {
  try {
    console.log('=== WEBHOOK RECEIVED ===');
    console.log('Webhook headers:', req.headers);
    console.log('Webhook body:', req.body);
    
    const { event, data } = req.body;
    
    // Verify webhook signature if webhook secret is provided
    if (process.env.DODO_WEBHOOK_SECRET) {
      const signature = req.headers['webhook-signature'] || req.headers['x-webhook-signature'];
      if (!signature) {
        console.error('❌ Missing webhook signature');
        return res.status(400).json({ error: 'Missing webhook signature' });
      }
      
      // Note: You would implement proper signature verification here
      // For now, we'll just log that we received a signature
      console.log('✅ Webhook signature received:', signature.substring(0, 20) + '...');
    } else {
      console.log('⚠️ No webhook secret configured - skipping signature verification');
    }
    
    console.log('Payment webhook received:', { event, data });

    if (event === 'payment.completed') {
      const { customer_email, metadata } = data;
      
      // Here you would typically update your database to mark the user as premium
      console.log(`✅ Premium upgrade completed for user: ${customer_email}`);
      console.log(`User ID: ${metadata?.user_id}`);
      
      // You can add database logic here to update user premium status
      // await updateUserPremiumStatus(metadata.user_id, true);
    } else {
      console.log(`📝 Webhook event received: ${event}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Payment success page
app.get('/payment-success', (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Successful</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px; background: #f5f5f7; }
        .success-card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto; }
        .success-icon { font-size: 48px; color: #34c759; margin-bottom: 20px; }
        h1 { color: #1d1d1f; margin-bottom: 10px; }
        p { color: #86868b; margin-bottom: 30px; }
        .btn { background: #007aff; color: white; padding: 12px 24px; border: none; border-radius: 8px; text-decoration: none; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="success-card">
        <div class="success-icon">✅</div>
        <h1>Payment Successful!</h1>
        <p>Welcome to Premium! You now have access to all premium features.</p>
        <a href="/" class="btn">Return to Notes</a>
      </div>
    </body>
    </html>
  `);
});

// Fallback to index.html for root
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});


