const { ConfidentialClientApplication } = require('@azure/msal-node')
const NodeCache = require('node-cache')
const { sourceGraphClient, destinationGraphClient } = require('../config')
const { logger } = require('@vtfk/logger')
const Cache = require('file-system-cache').default

const fileCache = Cache({
  basePath: "./.file-cache", // (optional) Path where cache files are stored (default).
})

const cache = new NodeCache({ stdTTL: 3000 })

const sourceClientAuth = {
  clientId: sourceGraphClient.clientId,
  authority: `https://login.microsoftonline.com/${sourceGraphClient.tenantId}/`,
  clientSecret: sourceGraphClient.clientSecret
}

const destinationClientAuth = {
  clientId: destinationGraphClient.clientId,
  authority: `https://login.microsoftonline.com/${destinationGraphClient.tenantId}/`,
  clientSecret: destinationGraphClient.clientSecret
}

const getGraphToken = async (options = { forceNew: false, tenant: 'source' }) => {
  const cacheKey = `${options.tenant}graphtoken`

  const cachedToken = fileCache.getSync(cacheKey)
  if (!options.forceNew && cachedToken) {
    logger('info', ['getGraphToken', 'found valid token in cache, will use that instead of fetching new'])
    return cachedToken.substring(0, cachedToken.length - 2)
  }

  logger('info', ['getGraphToken', 'no token in cache, fetching new from Microsoft'])
  const config = {
    auth: options.tenant === 'source' ? sourceClientAuth : destinationClientAuth
  }

  // Create msal application object
  const cca = new ConfidentialClientApplication(config)
  const clientCredentials = {
    scopes: [sourceGraphClient.scope]
  }

  const token = await cca.acquireTokenByClientCredential(clientCredentials)
  const expires = Math.floor((token.expiresOn.getTime() - new Date()) / 1000)
  logger('info', ['getGraphToken', `Got token from Microsoft, expires in ${expires} seconds.`])
  fileCache.setSync(cacheKey, `${token.accessToken}==`, expires) // Haha, just to make the cached token not directly usable
  logger('info', ['getGraphToken', 'Token stored in cache'])

  return token.accessToken
}
module.exports = {
  getGraphToken
}
