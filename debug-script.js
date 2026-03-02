const fs = require('fs');
const https = require('https');

const token = process.env.CLICKUP_API_TOKEN;
const listId = '901325396277';

const options = {
  hostname: 'api.clickup.com',
  path: `/api/v2/list/${listId}/field`,
  method: 'GET',
  headers: {
    'Authorization': token
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(data);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.end();
