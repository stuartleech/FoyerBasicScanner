# Foyer Membership Scanner

A lightweight barcode/QR code scanner app for Shopify POS that verifies active memberships via Beacon CRM API.

## Features

✅ **HID Scanner Compatible** - Works with any barcode/QR scanner in HID mode  
✅ **Instant Lookup** - Auto-submits on scan (Enter key)  
✅ **Clean UI** - Shows member name, email, membership #, and status  
✅ **Secure** - API keys kept server-side via Netlify Functions  
✅ **Ultra Minimal** - Single HTML file + one serverless function

## Files

- `index.html` - Main app interface
- `functions/checkMembership.js` - Netlify serverless function to query Beacon CRM
- `netlify.toml` - Netlify configuration

## Deployment to Netlify

### Option 1: Deploy from Git (Recommended)

1. Push this repo to GitHub/GitLab/Bitbucket
2. Go to [Netlify](https://app.netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Connect your Git repository
5. Netlify will auto-detect settings from `netlify.toml`
6. Click "Deploy site"

### Option 2: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

### Option 3: Drag and Drop

1. Create a zip file of this project
2. Go to [Netlify Drop](https://app.netlify.com/drop)
3. Drag and drop the zip file

## Usage

1. Open the deployed URL in Shopify POS browser
2. The input field will auto-focus
3. Scan a membership barcode/QR code with your HID scanner
4. The scanner will type the code and press Enter automatically
5. Member info will display instantly
6. The field clears and is ready for the next scan

## How It Works

1. Scanner in HID mode types the membership ID into the input field
2. When Enter is pressed, JavaScript sends the data to the Netlify serverless function
3. The function queries Beacon CRM API to lookup the member
4. Results are displayed showing member status, name, email, and membership number
5. Input field auto-clears and refocuses for the next scan

## Beacon CRM API

The app uses the following Beacon CRM endpoints:
- `GET /people?search=<membershipId>` - Search for member
- `GET /people/<personId>/memberships` - Check active memberships

Authentication is handled via Bearer token in the serverless function.

## Security Note

The API key is stored in the serverless function code. For enhanced security in production:
1. Use Netlify Environment Variables instead of hardcoded credentials
2. Go to Site Settings → Environment Variables
3. Add `BEACON_API_KEY` and `BEACON_ACCOUNT_ID`
4. Update the function to use `process.env.BEACON_API_KEY`

## Browser Compatibility

Works in all modern browsers including:
- Safari (iOS/iPadOS for Shopify POS)
- Chrome
- Firefox
- Edge

## Support

For issues with:
- **Beacon API**: Check [Beacon CRM API Docs](https://www.beaconcrm.org/integration/beacon-api)
- **Netlify Deployment**: See [Netlify Docs](https://docs.netlify.com)
- **Shopify POS**: See [Shopify HID Scanner Guide](https://help.shopify.com/en/manual/sell-in-person/hardware/barcode-scanners)
