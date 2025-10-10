// Load environment variables from .env file
require('dotenv').config();

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

// Serve Google Analytics configuration
app.get('/api/ga-config', (_req, res) => {
  res.json({
    measurementId: process.env.GA_MEASUREMENT_ID || null,
    enabled: !!process.env.GA_MEASUREMENT_ID
  });
});

// DodoPayments Checkout API endpoint
app.post('/api/checkout/create', async (req, res) => {
  try {
    console.log('=== CHECKOUT CREATION REQUEST ===');
    console.log('Request body:', req.body);
    
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

    const checkoutData = {
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
      return_url: `${req.protocol}://${req.get('host')}/`,
      success_url: `${req.protocol}://${req.get('host')}/payment-success`,
      cancel_url: `${req.protocol}://${req.get('host')}/`,
      metadata: {
        user_id: userId,
        user_email: userEmail,
        product: 'premium_upgrade'
      }
    };

    console.log('📤 Sending checkout data to DodoPayments:');
    console.log('Checkout data:', JSON.stringify(checkoutData, null, 2));
    console.log('API URL: https://test.dodopayments.com/checkouts');

    const response = await fetch('https://test.dodopayments.com/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DODO_PAYMENTS_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(checkoutData)
    });

    console.log('📥 DodoPayments response:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ DodoPayments API error:');
      console.error('Status:', response.status);
      console.error('Error Response:', errorData);
      
      return res.status(500).json({ 
        error: 'Failed to create checkout',
        details: errorData,
        status: response.status
      });
    }

    const checkoutResponse = await response.json();
    console.log('✅ Checkout created successfully:');
    console.log('Checkout Response:', JSON.stringify(checkoutResponse, null, 2));
    
    // Return the checkout URL for redirect
    res.json({
      checkout_url: checkoutResponse.payment_url || checkoutResponse.checkout_url || checkoutResponse.url
    });

  } catch (error) {
    console.error('❌ Checkout creation error:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

// API endpoint to check user subscription status
app.get('/api/user/subscription-status', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Create Supabase client
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select('is_premium, subscription_status, updated_at')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching subscription status:', error);
      return res.status(500).json({ error: 'Failed to fetch subscription status' });
    }

    res.json({
      is_premium: subscription?.is_premium || false,
      subscription_status: subscription?.subscription_status || 'inactive',
      updated_at: subscription?.updated_at || null
    });

  } catch (error) {
    console.error('Error in subscription status check:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Webhook handler for payment status updates
app.post('/api/payments/webhook', async (req, res) => {
  try {
    console.log('=== WEBHOOK RECEIVED ===');
    console.log('Webhook headers:', req.headers);
    console.log('Webhook body:', req.body);
    
    const webhookData = req.body;
    
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
    
    console.log('Payment webhook received:', webhookData);

    // Handle DodoPayments webhook format
    // Check if this is a payment succeeded webhook
    if (webhookData.type === 'payment.succeeded' && webhookData.data) {
      const { customer, metadata, subscription_id, status, payment_id } = webhookData.data;
      
      console.log(`💳 Payment succeeded webhook received:`);
      console.log(`Status: ${status}`);
      console.log(`Customer: ${customer?.email}`);
      console.log(`User ID: ${metadata?.user_id}`);
      console.log(`Subscription ID: ${subscription_id}`);
      console.log(`Payment ID: ${payment_id}`);
      
      if (status === 'succeeded') {
        console.log(`✅ Payment succeeded for user: ${customer?.email}`);
        
        // Update user subscription status in database
        await updateUserSubscriptionStatus(
          metadata?.user_id, 
          customer?.email, 
          true, 
          subscription_id, 
          payment_id
        );
      }
      
    } else if (webhookData.payload_type === 'Subscription' && webhookData.data) {
      const { customer, metadata, subscription_id, status } = webhookData.data;
      
      console.log(`📋 Subscription webhook received:`);
      console.log(`Status: ${status}`);
      console.log(`Customer: ${customer?.email}`);
      console.log(`User ID: ${metadata?.user_id}`);
      console.log(`Subscription ID: ${subscription_id}`);
      
      if (status === 'active') {
        console.log(`✅ Premium subscription activated for user: ${customer?.email}`);
        
        // Update user subscription status in database
        await updateUserSubscriptionStatus(
          metadata?.user_id, 
          customer?.email, 
          true, 
          subscription_id, 
          null // No payment_id for subscription webhooks
        );
        
      } else if (status === 'cancelled' || status === 'expired') {
        console.log(`❌ Premium subscription cancelled/expired for user: ${customer?.email}`);
        
        // Update user subscription status to inactive
        await updateUserSubscriptionStatus(
          metadata?.user_id, 
          customer?.email, 
          false, 
          subscription_id, 
          null
        );
      }
      
    } else if (webhookData.event) {
      // Handle traditional event-based webhooks
      const { event, data } = webhookData;
      
      if (event === 'payment.completed' || event === 'subscription.created' || event === 'subscription.activated') {
        const { customer_email, metadata, subscription_id, payment_id } = data;
        
        console.log(`✅ Premium upgrade completed for user: ${customer_email}`);
        console.log(`User ID: ${metadata?.user_id}`);
        console.log(`Subscription ID: ${subscription_id}`);
        console.log(`Payment ID: ${payment_id}`);
        
        // Update user subscription status in database
        await updateUserSubscriptionStatus(metadata?.user_id, customer_email, true, subscription_id, payment_id);
        
      } else if (event === 'subscription.cancelled' || event === 'subscription.expired' || event === 'payment.failed') {
        const { customer_email, metadata, subscription_id } = data;
        
        console.log(`❌ Premium subscription cancelled/expired for user: ${customer_email}`);
        console.log(`User ID: ${metadata?.user_id}`);
        console.log(`Subscription ID: ${subscription_id}`);
        
        // Update user subscription status to inactive
        await updateUserSubscriptionStatus(metadata?.user_id, customer_email, false, subscription_id, null);
        
      } else {
        console.log(`📝 Webhook event received: ${event}`);
      }
    } else {
      console.log('📝 Unknown webhook format received');
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Function to update user subscription status
async function updateUserSubscriptionStatus(userId, userEmail, isPremium, subscriptionId = null, paymentId = null) {
  try {
    console.log('=== UPDATE USER SUBSCRIPTION STATUS ===');
    console.log('Parameters:', { userId, userEmail, isPremium, subscriptionId, paymentId });
    
    // Check environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase environment variables');
      console.log('SUPABASE_URL:', !!process.env.SUPABASE_URL);
      console.log('SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
      return;
    }

    // Create Supabase client for webhook operations
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    if (!supabase) {
      console.error('❌ Supabase client not initialized');
      return;
    }

    console.log('✅ Supabase client created successfully');

    const subscriptionData = {
      user_id: userId,
      user_email: userEmail,
      is_premium: isPremium,
      subscription_status: isPremium ? 'active' : 'inactive',
      updated_at: new Date().toISOString()
    };

    if (subscriptionId) {
      subscriptionData.subscription_id = subscriptionId;
    }

    if (paymentId) {
      subscriptionData.payment_id = paymentId;
    }

    console.log('📝 Subscription data to save:', subscriptionData);

    // Try to update existing record first
    console.log('🔍 Checking for existing user subscription...');
    const { data: existingUser, error: selectError } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('❌ Error checking existing user:', selectError);
    }

    console.log('🔍 Existing user check result:', { existingUser, selectError });

    if (existingUser) {
      // Update existing record
      console.log('📝 Updating existing user subscription...');
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update(subscriptionData)
        .eq('user_id', userId);

      if (updateError) {
        console.error('❌ Error updating user subscription:', updateError);
      } else {
        console.log('✅ User subscription updated successfully');
      }
    } else {
      // Insert new record
      console.log('📝 Creating new user subscription...');
      const { error: insertError } = await supabase
        .from('user_subscriptions')
        .insert(subscriptionData);

      if (insertError) {
        console.error('❌ Error inserting user subscription:', insertError);
      } else {
        console.log('✅ User subscription created successfully');
      }
    }

  } catch (error) {
    console.error('❌ Error in updateUserSubscriptionStatus:', error);
    console.error('Error stack:', error.stack);
  }
}

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


