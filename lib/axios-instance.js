const axios = require('axios').default
const https = require('https')

let instance = null

// To avoid TCP port exhaustion on many runs at once
module.exports = () => {
  if (!instance) {
    instance = axios.create({
      httpsAgent: new https.Agent({
        keepAlive: true,
        maxSockets: 200
      })
    })
  }
  return instance
}
