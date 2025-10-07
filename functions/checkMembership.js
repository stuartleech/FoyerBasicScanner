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
    const { scannedData } = JSON.parse(event.body);

    if (!scannedData) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No scanned data provided' })
      };
    }

    // Filter memberships by member_number
    const filterUrl = `https://api.beaconcrm.org/v1/account/${BEACON_ACCOUNT_ID}/entities/membership/filter`;
    const filterBody = {
      filter_conditions: [
        {
          field: "member_number",
          operator: "==",
          value: parseInt(scannedData) || scannedData
        }
      ]
    };

    const membershipData = await makeBeaconRequest(filterUrl, 'POST', filterBody);

    // Check if we found a membership
    if (membershipData && membershipData.entities && membershipData.entities.length > 0) {
      const membership = membershipData.entities[0];
      
      // Extract member info from the membership
      let memberName = 'N/A';
      let memberEmail = 'N/A';
      
      // Check if there are references (member details)
      if (membershipData.references && membershipData.references.length > 0) {
        const person = membershipData.references.find(ref => ref.entity_type === 'person');
        if (person && person.entity) {
          const nameObj = person.entity.name;
          if (nameObj) {
            memberName = nameObj.full || `${nameObj.first || ''} ${nameObj.last || ''}`.trim();
          }
          if (person.entity.emails && person.entity.emails.length > 0) {
            memberEmail = person.entity.emails[0].email;
          }
        }
      }
      
      // Check if membership is active
      const status = membership.entity.status || [];
      const isActive = status.includes('Active');
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          member: {
            name: memberName,
            email: memberEmail,
            membershipNumber: membership.entity.member_number,
            active: isActive
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
