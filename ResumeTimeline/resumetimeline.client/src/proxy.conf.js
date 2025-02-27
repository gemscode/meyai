const { env } = require('process');

const target = env.ASPNETCORE_HTTP_PORT ? `http://localhost:${env.ASPNETCORE_HTTP_PORT}` :
    env.ASPNETCORE_URLS ? env.ASPNETCORE_URLS.split(';')[0] : 'http://localhost:7246';


const PROXY_CONFIG = [
  {
    context: [
      "/weatherforecast",
    ],
    target,
    secure: false
  }
]

module.exports = PROXY_CONFIG;
