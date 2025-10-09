const express = require('express');
const path = require('path');
const DodoPayments = require('dodopayments');

const app = express();
const port = process.env.PORT || 3000;

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

// Initialize DodoPayments client
const dodoClient = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
});

// Dodo Payments Subscription API endpoints
app.post('/api/payments/create', async (req, res) => {
  try {
    console.log('Subscription creation request received:', req.body);
    
    const { userEmail, userId, billingAddress } = req.body;
    
    if (!userEmail || !userId) {
      console.log('Missing required fields:', { userEmail: !!userEmail, userId: !!userId });
      return res.status(400).json({ error: 'User email and ID are required' });
    }

    // Check if API key is available
    if (!process.env.DODO_PAYMENTS_API_KEY) {
      console.error('DODO_PAYMENTS_API_KEY environment variable not set');
      return res.status(500).json({ error: 'Payment service not configured' });
    }

    // Default billing address if not provided
    const defaultBilling = {
      city: 'New York',
      country: 'US',
      state: 'NY',
      street: '123 Main St',
      zipcode: '10001'
    };

    const subscriptionData = {
      billing: billingAddress || defaultBilling,
      customer: { 
        customer_id: userId,
        email: userEmail,
        name: userEmail.split('@')[0]
      },
      product_id: 'pdt_HL2gMRuyqiWflH2VZaLEU',
      quantity: 1,
      success_url: `${req.protocol}://${req.get('host')}/payment-success`,
      cancel_url: `${req.protocol}://${req.get('host')}/payment-cancel`
    };

    console.log('Creating subscription with data:', {
      ...subscriptionData,
      // Don't log the full API key for security
      api_key: process.env.DODO_PAYMENTS_API_KEY ? 'SET' : 'NOT_SET'
    });

    const subscription = await dodoClient.subscriptions.create(subscriptionData);

    console.log('Subscription created successfully:', subscription);
    
    // Return the payment_id for redirect
    res.json({
      payment_id: subscription.payment_id,
      subscription_id: subscription.id,
      payment_url: subscription.payment_url || `https://checkout.dodopayments.com/pay/${subscription.payment_id}`
    });

  } catch (error) {
    console.error('Subscription creation error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      response: error.response?.data
    });
    res.status(500).json({ 
      error: 'Failed to create subscription',
      details: error.message,
      response: error.response?.data
    });
  }
});

// Webhook handler for subscription status updates
app.post('/api/payments/webhook', async (req, res) => {
  try {
    const { event, data } = req.body;
    
    console.log('Subscription webhook received:', { event, data });

    if (event === 'subscription.created' || event === 'subscription.activated') {
      const { customer, subscription_id } = data;
      
      // Here you would typically update your database to mark the user as premium
      // For now, we'll just log the successful subscription
      console.log(`Premium subscription activated for user: ${customer.email}`);
      console.log(`Subscription ID: ${subscription_id}`);
      
      // You can add database logic here to update user premium status
      // await updateUserPremiumStatus(customer.customer_id, true, subscription_id);
    }

    if (event === 'subscription.cancelled' || event === 'subscription.expired') {
      const { customer, subscription_id } = data;
      
      console.log(`Premium subscription cancelled/expired for user: ${customer.email}`);
      console.log(`Subscription ID: ${subscription_id}`);
      
      // You can add database logic here to revoke user premium status
      // await updateUserPremiumStatus(customer.customer_id, false, subscription_id);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
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
        <h1>Subscription Activated!</h1>
        <p>Welcome to Premium! Your subscription is now active and you have access to all premium features.</p>
        <a href="/" class="btn">Return to Notes</a>
      </div>
    </body>
    </html>
  `);
});

// Payment cancel page
app.get('/payment-cancel', (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Cancelled</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px; background: #f5f5f7; }
        .cancel-card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto; }
        .cancel-icon { font-size: 48px; color: #ff3b30; margin-bottom: 20px; }
        h1 { color: #1d1d1f; margin-bottom: 10px; }
        p { color: #86868b; margin-bottom: 30px; }
        .btn { background: #007aff; color: white; padding: 12px 24px; border: none; border-radius: 8px; text-decoration: none; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="cancel-card">
        <div class="cancel-icon">❌</div>
        <h1>Payment Cancelled</h1>
        <p>No charges were made. You can try again anytime.</p>
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


