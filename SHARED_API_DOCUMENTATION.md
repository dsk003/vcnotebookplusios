# Shared API Documentation - Web & iOS

## 📚 Overview

This document describes the backend API that is shared between the web app and iOS app. Both clients use the same endpoints with the same authentication and data structures.

## 🌐 Base URL

**Production:** `https://your-app.onrender.com`  
**Local Development:** `http://localhost:3000`

## 🔐 Authentication

The backend uses Firebase Authentication. After a user signs in with Google (on either web or iOS), they receive a Firebase UID that is used for all API requests.

### Authentication Flow

1. User signs in with Google (Firebase Auth)
2. Client receives Firebase User object with UID
3. Client uses UID in all API requests (via Supabase RLS)
4. Backend validates requests through Row Level Security

**Note:** No API keys or tokens are needed in request headers. Authentication is handled by Supabase RLS policies based on the user_id field.

---

## 📋 API Endpoints

### Health Check

**Endpoint:** `GET /healthz`

Check if the server is running.

**Response:**
```
ok
```

**Status Codes:**
- `200` - Server is healthy
- `502` - Server is down

---

### Get Supabase Configuration

**Endpoint:** `GET /api/config`

Returns Supabase configuration for the client to initialize Supabase.

**Response:**
```json
{
  "supabaseUrl": "https://xxxxx.supabase.co",
  "supabaseAnonKey": "eyJhbGc...",
  "supabaseServiceKey": "eyJhbGc..."
}
```

**Status Codes:**
- `200` - Success
- `500` - Server error

**Usage:**
- **Web:** Called on app initialization
- **iOS:** Called on app launch to configure SupabaseClient

---

### Get Firebase Configuration

**Endpoint:** `GET /api/firebase-config`

Returns Firebase configuration for web client initialization.

**Response:**
```json
{
  "apiKey": "AIzaSy...",
  "authDomain": "project.firebaseapp.com",
  "projectId": "project-id",
  "storageBucket": "project.appspot.com",
  "messagingSenderId": "123456789",
  "appId": "1:123456789:web:..."
}
```

**Status Codes:**
- `200` - Success
- `500` - Server error

**Usage:**
- **Web:** Required for Firebase initialization
- **iOS:** Not needed (uses GoogleService-Info.plist)

---

### Get Google Analytics Configuration

**Endpoint:** `GET /api/ga-config`

Returns Google Analytics configuration.

**Response:**
```json
{
  "measurementId": "G-XXXXXXXXXX",
  "enabled": true
}
```

**Status Codes:**
- `200` - Success

**Usage:**
- **Web:** For Google Analytics tracking
- **iOS:** Can be used for Firebase Analytics (optional)

---

### Create Payment Checkout

**Endpoint:** `POST /api/checkout/create`

Creates a DodoPayments checkout session for premium upgrade.

**Request Body:**
```json
{
  "userEmail": "user@example.com",
  "userId": "firebase-user-uid"
}
```

**Response:**
```json
{
  "checkout_url": "https://test.dodopayments.com/checkout/..."
}
```

**Status Codes:**
- `200` - Checkout created successfully
- `400` - Missing required fields
- `500` - Server error or payment system not configured

**Usage:**
- **Web:** Opens checkout URL in same tab
- **iOS:** Opens checkout URL in web view (SafariViewController or WKWebView)

**After Payment:**
- User completes payment on DodoPayments
- DodoPayments calls webhook: `POST /api/payments/webhook`
- Backend updates `user_subscriptions` table
- Client checks subscription status with next endpoint

---

### Check Subscription Status

**Endpoint:** `GET /api/user/subscription-status`

Check if a user has an active premium subscription.

**Query Parameters:**
- `userId` - Firebase user UID (required)

**Example:**
```
GET /api/user/subscription-status?userId=abc123
```

**Response:**
```json
{
  "is_premium": true,
  "subscription_status": "active",
  "updated_at": "2025-10-16T12:00:00Z"
}
```

**Status Codes:**
- `200` - Success
- `400` - Missing userId
- `500` - Server error

**Usage:**
- **Web:** Check on app load and after payment
- **iOS:** Check on app launch and after payment

---

### Payment Webhook (Internal)

**Endpoint:** `POST /api/payments/webhook`

Receives payment notifications from DodoPayments.

**This endpoint is called by DodoPayments, not by clients.**

**Expected Webhook Events:**
- `payment.succeeded` - Payment completed
- `subscription.activated` - Subscription started
- `subscription.cancelled` - Subscription ended
- `subscription.expired` - Subscription expired

**Webhook Handler:**
1. Receives event from DodoPayments
2. Validates webhook signature (if configured)
3. Updates `user_subscriptions` table in Supabase
4. Returns 200 OK

---

## 💾 Database Schema

### Supabase Tables

All database operations go through Supabase, not the Node.js backend.

#### `notes` Table

```sql
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**RLS Policy:** Users can only access their own notes (`user_id = auth.uid()` or via Firebase UID)

**Operations:**
- **Create:** `INSERT INTO notes ...`
- **Read:** `SELECT * FROM notes WHERE user_id = ?`
- **Update:** `UPDATE notes SET ... WHERE id = ? AND user_id = ?`
- **Delete:** `DELETE FROM notes WHERE id = ? AND user_id = ?`
- **Search:** `SELECT * FROM notes WHERE user_id = ? AND title_content_fts @@ to_tsquery(?)`

#### `file_attachments` Table

```sql
CREATE TABLE file_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    storage_bucket TEXT NOT NULL DEFAULT 'note-attachments',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**RLS Policy:** Users can only access their own file attachments

**Storage:** Files stored in Supabase Storage bucket `note-attachments`

**Operations:**
- **Upload:** `storage.from('note-attachments').upload(path, file)`
- **List:** `SELECT * FROM file_attachments WHERE note_id = ? AND user_id = ?`
- **Download:** `storage.from('note-attachments').download(path)`
- **Delete:** `storage.from('note-attachments').remove([path])`
- **Signed URL:** `storage.from('note-attachments').createSignedUrl(path, expiresIn)`

#### `user_subscriptions` Table

```sql
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE NOT NULL,
    user_email TEXT NOT NULL,
    is_premium BOOLEAN DEFAULT FALSE,
    subscription_status TEXT DEFAULT 'inactive',
    subscription_id TEXT,
    payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**RLS Policy:** Users can read their own subscription status

**Updated By:** Backend webhook handler only

---

## 🔒 Security Considerations

### Environment Variables

**Never expose these in clients:**
- ❌ `FIREBASE_API_KEY` - Exposed to web, but scoped
- ❌ `SUPABASE_SERVICE_ROLE_KEY` - Backend only
- ❌ `DODO_PAYMENTS_API_KEY` - Backend only
- ❌ `DODO_WEBHOOK_SECRET` - Backend only

**Safe to expose:**
- ✅ `SUPABASE_URL` - Public
- ✅ `SUPABASE_ANON_KEY` - Public (protected by RLS)
- ✅ `FIREBASE_PROJECT_ID` - Public

### Row Level Security (RLS)

All database tables use RLS policies to ensure:
- Users can only access their own data
- User cannot modify other users' notes
- Premium status cannot be forged

### HTTPS Only

- ✅ Production backend uses HTTPS (Render)
- ✅ All API requests use HTTPS
- ✅ Supabase uses HTTPS

---

## 📱 Platform-Specific Differences

### Firebase Authentication

| Feature | Web | iOS |
|---------|-----|-----|
| SDK | Firebase JS SDK | Firebase iOS SDK |
| Config Source | `/api/firebase-config` | `GoogleService-Info.plist` |
| Sign-In Method | `signInWithPopup()` | `GIDSignIn.sharedInstance.signIn()` |
| Token Handling | Automatic | Automatic |

### Supabase Client

| Feature | Web | iOS |
|---------|-----|-----|
| SDK | `@supabase/supabase-js` | `supabase-swift` |
| Config Source | `/api/config` | `/api/config` |
| Client Init | `createClient()` | `SupabaseClient()` |
| Authentication | Firebase token | Firebase token |

### Payments

| Feature | Web | iOS |
|---------|-----|-----|
| Implementation | Direct redirect | Web View (WKWebView) |
| Checkout URL | Same tab | In-app browser |
| Success Detection | URL redirect | URL navigation delegate |
| Alternative | None | Could use In-App Purchase |

---

## 🧪 Testing

### Test API Endpoints

```bash
# Health check
curl https://your-app.onrender.com/healthz

# Get Supabase config
curl https://your-app.onrender.com/api/config

# Get Firebase config
curl https://your-app.onrender.com/api/firebase-config

# Check subscription (replace USER_ID)
curl "https://your-app.onrender.com/api/user/subscription-status?userId=YOUR_USER_ID"
```

### Test Database Queries

Use Supabase Dashboard SQL Editor or your client SDK.

### Test Payments

Use DodoPayments test mode with test cards.

---

## 🐛 Troubleshooting

### 502 Bad Gateway
- Backend server not running
- Check Render deployment logs
- Verify environment variables set

### CORS Errors (Web Only)
- Backend should allow all origins in development
- Production should whitelist your domain

### Authentication Failed
- Check Firebase configuration
- Verify Google Sign-In is enabled
- Ensure user UID matches between Firebase and Supabase

### Data Not Syncing
- Check RLS policies in Supabase
- Verify user_id field matches Firebase UID
- Check network requests in browser/Xcode debugger

### Payment Not Working
- Verify `DODO_PAYMENTS_API_KEY` is set
- Check `PRODUCT_ID` is configured
- Test webhook with ngrok/Render logs

---

## 📚 SDK Documentation

- **Firebase Web:** https://firebase.google.com/docs/web/setup
- **Firebase iOS:** https://firebase.google.com/docs/ios/setup
- **Supabase JS:** https://supabase.com/docs/reference/javascript
- **Supabase Swift:** https://github.com/supabase/supabase-swift
- **Google Sign-In iOS:** https://developers.google.com/identity/sign-in/ios

---

## 🔄 API Versioning

Currently, there is no API versioning. All clients use the same endpoints.

**Future consideration:** Add `/api/v1/` prefix for versioning.

---

## 📞 Support

- Backend issues: Check Render logs
- Database issues: Check Supabase dashboard
- Authentication issues: Check Firebase console
- Payment issues: Check DodoPayments dashboard

---

**This API is shared between web and iOS - any changes affect both platforms!** 🌐📱

