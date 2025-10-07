const https = require('https');

// Beacon CRM API Configuration
const BEACON_API_KEY = 'c5c7b9ff7cb39fb9443f6059fae930b2353875f4f642803b66ac48528fc0c90cc255bf59f80032ba';
const BEACON_ACCOUNT_ID = '23039';
const BEACON_API_BASE = 'https://api.beaconcrm.org/v1';

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

    // Try to lookup the member by membership number first
    // Beacon API endpoint: GET /people?search=membershipNumber
    const searchUrl = `${BEACON_API_BASE}/people?search=${encodeURIComponent(scannedData)}`;
    
    const memberData = await makeBeaconRequest(searchUrl);

    // Check if we found a member
    if (memberData && memberData.data && memberData.data.length > 0) {
      const person = memberData.data[0];
      
      // Check for active membership
      const hasActiveMembership = await checkActiveMembership(person.id);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          member: {
            name: `${person.firstname || ''} ${person.lastname || ''}`.trim(),
            email: person.email || 'N/A',
            membershipNumber: scannedData,
            active: hasActiveMembership
          }
        })
      };
    } else {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Member not found',
          member: null
        })
      };
    }
  } catch (error) {
    console.error('Error checking membership:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Failed to check membership: ' + error.message
      })
    };
  }
};

// Helper function to make requests to Beacon API
function makeBeaconRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${BEACON_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`API returned status ${res.statusCode}: ${data}`));
          }
        } catch (e) {
          reject(new Error('Failed to parse API response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Helper function to check if person has active membership
async function checkActiveMembership(personId) {
  try {
    // Get person's memberships
    const membershipsUrl = `${BEACON_API_BASE}/people/${personId}/memberships`;
    const membershipsData = await makeBeaconRequest(membershipsUrl);
    
    if (membershipsData && membershipsData.data && membershipsData.data.length > 0) {
      // Check if any membership is currently active
      const now = new Date();
      return membershipsData.data.some(membership => {
        const expiryDate = membership.expiry_date ? new Date(membership.expiry_date) : null;
        return !expiryDate || expiryDate > now;
      });
    }
    
    return false;
  } catch (error) {
    console.error('Error checking memberships:', error);
    // If we can't check memberships, assume inactive
    return false;
  }
}

