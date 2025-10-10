# Google Analytics Setup Guide

This guide will help you set up Google Analytics tracking for your Notes App using environment variables.

## Prerequisites

1. A Google account
2. Access to Google Analytics (analytics.google.com)

## Step 1: Create a Google Analytics Property

1. Go to [Google Analytics](https://analytics.google.com/)
2. Click "Start measuring" or "Create Account"
3. Set up your account:
   - Account name: Your organization name
   - Property name: "Notes App" (or your preferred name)
   - Reporting time zone: Select your timezone
   - Currency: Select your currency
4. Choose your business information
5. Accept the terms and create the property

## Step 2: Get Your Measurement ID

1. In your Google Analytics property, go to **Admin** (gear icon)
2. Under **Property**, click **Data Streams**
3. Click **Web** to add a web stream
4. Enter your website URL (e.g., `https://yourdomain.com`)
5. Give it a stream name (e.g., "Notes App Web")
6. Click **Create stream**
7. Copy the **Measurement ID** (format: `G-XXXXXXXXXX`)

## Step 3: Configure Your App with Environment Variables

### For Local Development

1. Create a `.env` file in your project root (if it doesn't exist)
2. Add your Google Analytics Measurement ID:

```bash
GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

3. Install dotenv package if you haven't already:

```bash
npm install dotenv
```

4. Update your `server.js` to load environment variables (if not already done):

```javascript
require('dotenv').config();
```

### For Production Deployment

#### Render.com
1. Go to your Render dashboard
2. Select your service
3. Go to **Environment** tab
4. Add a new environment variable:
   - **Key**: `GA_MEASUREMENT_ID`
   - **Value**: `G-XXXXXXXXXX` (your actual Measurement ID)
5. Deploy your service

#### Other Platforms
Set the environment variable `GA_MEASUREMENT_ID` with your Measurement ID value.

### Testing the Configuration

1. Start your server
2. Open `test-ga.html` in your browser
3. Click "Check Configuration" to verify the setup
4. The app will automatically load Google Analytics if the environment variable is set

## Step 4: Test Your Implementation

1. Deploy your app or run it locally
2. Open your app in a browser
3. Check the browser console for "Google Analytics initialized with ID: G-XXXXXXXXXX"
4. Perform some actions (sign in, create notes, search, etc.)
5. Go to Google Analytics > Reports > Realtime
6. You should see your activity appearing in real-time

### Using the Test Page

1. Open `test-ga.html` in your browser
2. Click "Check Configuration" to verify the setup
3. Use the test buttons to send sample events
4. Check Google Analytics Realtime reports to confirm tracking

## Tracked Events

The app tracks the following user interactions:

### Authentication Events
- `sign_in_attempt` - User attempts to sign in
- `sign_in_success` - User successfully signs in
- `sign_in_error` - Sign in fails
- `sign_out_attempt` - User attempts to sign out
- `sign_out_success` - User successfully signs out
- `sign_out_error` - Sign out fails

### Note Management Events
- `note_created` - User creates a new note
- `note_save_attempt` - User attempts to save a note
- `note_save_success` - Note is saved successfully
- `note_save_error` - Note save fails
- `note_delete_attempt` - User attempts to delete a note
- `note_delete_success` - Note is deleted successfully
- `note_delete_error` - Note deletion fails

### Search Events
- `search_performed` - User performs a search
- `search_cleared` - User clears the search

### File Upload Events
- `file_upload_initiated` - User clicks upload button
- `file_upload_started` - File upload process begins

### App Usage Events
- `app_accessed` - User accesses the main app interface
- `premium_upgrade_clicked` - User clicks premium upgrade button

## Customization

You can customize the tracking by modifying the `trackUserAction` calls in `script.js`. The method signature is:

```javascript
this.trackUserAction(action, category, label);
```

- `action`: The specific action taken
- `category`: The category of the action (e.g., 'Notes', 'Authentication')
- `label`: Additional context (optional)

## Privacy Considerations

- The app only tracks user interactions, not personal note content
- User authentication is handled by Firebase, not Google Analytics
- Consider adding a privacy policy to inform users about data collection
- You may want to implement cookie consent if required by your jurisdiction

## Benefits of Environment Variable Approach

- **Security**: No sensitive IDs in your source code
- **Flexibility**: Easy to enable/disable GA without code changes
- **Environment-specific**: Different GA IDs for development, staging, and production
- **Deployment-friendly**: Works seamlessly with Render.com and other platforms
- **No code changes needed**: Just set the environment variable and restart

## Troubleshooting

### No data appearing in Google Analytics
1. Check that your `GA_MEASUREMENT_ID` environment variable is set correctly
2. Restart your server after setting the environment variable
3. Check browser console for "Google Analytics initialized with ID: G-XXXXXXXXXX"
4. Ensure the gtag script is loading (check browser console for errors)
5. Wait 24-48 hours for data to appear in standard reports
6. Use the Realtime report to verify immediate tracking

### Environment Variable Issues
1. Verify the environment variable is set: `echo $GA_MEASUREMENT_ID`
2. Check that your server is loading the environment variable
3. For local development, ensure your `.env` file is in the project root
4. For production, verify the environment variable is set in your deployment platform

### Script errors
1. Check browser console for JavaScript errors
2. Verify the `/api/ga-config` endpoint is returning the correct data
3. Ensure the server is running and accessible

## Additional Resources

- [Google Analytics 4 Documentation](https://developers.google.com/analytics/devguides/collection/ga4)
- [gtag.js Reference](https://developers.google.com/analytics/devguides/collection/gtagjs)
- [Google Analytics Help Center](https://support.google.com/analytics/)
