#!/usr/bin/env node

/**
 * Environment Variables Verification Script
 * Run this before deploying to ensure all required variables are set
 */

require('dotenv').config();

console.log('\n🔍 Verifying Environment Variables...\n');

const requiredVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const optionalVars = [
  'GA_MEASUREMENT_ID',
  'DODO_PAYMENTS_API_KEY',
  'PRODUCT_ID',
  'DODO_WEBHOOK_SECRET',
  'NODE_VERSION',
  'PORT'
];

let allRequired = true;
let hasOptional = false;

console.log('📋 Required Environment Variables:');
console.log('================================');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  console.log(`${status} ${varName}: ${value ? 'Set (' + value.substring(0, 10) + '...)' : 'MISSING'}`);
  
  if (!value) {
    allRequired = false;
  }
});

console.log('\n📋 Optional Environment Variables:');
console.log('================================');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '⚠️';
  console.log(`${status} ${varName}: ${value ? 'Set' : 'Not Set'}`);
  
  if (value) {
    hasOptional = true;
  }
});

console.log('\n================================');
console.log('📊 Summary:');
console.log('================================');

if (allRequired) {
  console.log('✅ All required environment variables are set!');
  console.log('✅ Your app should work correctly.');
  
  if (hasOptional) {
    console.log('✅ Optional features are configured.');
  } else {
    console.log('⚠️  Optional features are not configured (GA, Payments).');
  }
  
  console.log('\n🚀 You can now deploy to Render!');
  console.log('\nNext steps:');
  console.log('1. Push your code to Git');
  console.log('2. Set these environment variables in Render dashboard');
  console.log('3. Deploy your service');
  
  process.exit(0);
} else {
  console.log('❌ Some required environment variables are missing!');
  console.log('\n📝 To fix:');
  console.log('1. Create a .env file in your project root');
  console.log('2. Add the missing variables');
  console.log('3. For Render deployment, set them in the dashboard instead');
  console.log('\n⚠️  DO NOT commit your .env file to Git!');
  
  process.exit(1);
}

