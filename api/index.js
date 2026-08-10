const https = require('https');

module.exports = async function handler(req, res) {
  const targetUrl = `https://secrets-api.appbrewery.com${req.url.replace(/^\/api/, '')}`;
  const request = https.get(targetUrl, (proxyRes) => {
    res.statusCode = proxyRes.statusCode || 200;
    res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'application/json');
    proxyRes.pipe(res);
  });

  request.on('error', () => {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Unable to reach the Secrets API' }));
  });
};
