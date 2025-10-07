const https = require('https');
const http = require('http');

exports.handler = async (event) => {
  // Handle CORS for preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { scannedData } = JSON.parse(event.body);

    if (!scannedData) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No scanned data provided' })
      };
    }

    let resolvedUrl = scannedData;
    let membershipNumber = null;

    // If it's a me-qr shortcode, resolve it first
    if (scannedData.includes('me-qr.com/')) {
      console.log('Resolving me-qr shortcode:', scannedData);
      resolvedUrl = await resolveRedirect(scannedData);
      console.log('Resolved to:', resolvedUrl);
    }

    // Extract membership number from the URL
    if (resolvedUrl.includes('MembershipNumber=')) {
      const match = resolvedUrl.match(/MembershipNumber=(\d+)/);
      if (match) {
        membershipNumber = match[1];
        console.log('Extracted membership number:', membershipNumber);
      }
    }

    if (membershipNumber) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          membershipNumber: membershipNumber,
          resolvedUrl: resolvedUrl
        })
      };
    } else {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Could not extract membership number from URL'
        })
      };
    }
  } catch (error) {
    console.error('Error extracting membership:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Failed to extract membership number: ' + error.message
      })
    };
  }
};

// Helper function to follow redirects
function resolveRedirect(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'HEAD',
      timeout: 10000
    };

    const req = client.request(options, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Recursive redirect following
        resolveRedirect(res.headers.location)
          .then(resolve)
          .catch(reject);
      } else {
        resolve(res.responseUrl || url);
      }
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}
