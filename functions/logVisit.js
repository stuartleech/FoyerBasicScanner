const https = require('https');

// Beacon CRM API Configuration
const BEACON_API_KEY = 'c5c7b9ff7cb39fb9443f6059fae930b2353875f4f642803b66ac48528fc0c90cc255bf59f80032ba';
const BEACON_ACCOUNT_ID = '23039';

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
    const { personId } = JSON.parse(event.body);

    if (!personId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Person ID is required' })
      };
    }

    // Create Activity record
    const activityUrl = `https://api.beaconcrm.org/v1/account/${BEACON_ACCOUNT_ID}/entity/activity`;
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const activityData = {
      type: ['Visit'],
      content: 'Annual pass scanned at FOH',
      date: currentDate,
      related_entity_ids: [personId]
    };

    const result = await makeBeaconRequest(activityUrl, 'POST', activityData);

    if (result && result.entity) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          activityId: result.entity.id
        })
      };
    } else {
      throw new Error('Failed to create activity record');
    }
  } catch (error) {
    console.error('Error logging visit:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Failed to log visit: ' + error.message
      })
    };
  }
};

// Helper function to make requests to Beacon API
function makeBeaconRequest(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const bodyString = body ? JSON.stringify(body) : null;
    
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${BEACON_API_KEY}`,
        'Content-Type': 'application/json',
        'Beacon-Application': 'developer_api'
      }
    };

    if (bodyString) {
      options.headers['Content-Length'] = Buffer.byteLength(bodyString);
    }

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('API Response Status:', res.statusCode);
        console.log('API Response Data:', data);
        
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`API returned status ${res.statusCode}: ${data}`));
          }
        } catch (e) {
          console.error('Parse error. Raw response:', data);
          reject(new Error(`Failed to parse API response. Status: ${res.statusCode}, Data: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (bodyString) {
      req.write(bodyString);
    }

    req.end();
  });
}

