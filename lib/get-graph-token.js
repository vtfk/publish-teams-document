const { getAccessToken } = require('@vestfoldfylke/msal-token')
const { logger } = require('@vtfk/logger')
const Cache = require('file-system-cache').default

const fileCache = Cache({
  basePath: './.file-cache' // (optional) Path where cache files are stored (default).
})

/**
 *
 * @param {Object} config
 * @param {string} config.clientId
 * @param {string} config.tenantId
 * @param {string} config.tenantName
 * @param {string} config.pfxBase64
 * @param {string} config.pfxThumbprint
 * @param {boolean} [config.forceNew]
 */
const getGraphToken = async (config) => {
  if (!config.tenantName) throw new Error('Missing required parameter config.tenantName')
  const cacheKey = `${config.tenantName}graphtoken`

  const cachedToken = fileCache.getSync(cacheKey)
  if (!config.forceNew && cachedToken) {
    logger('info', ['getGraphToken', 'found valid token in cache, will use that instead of fetching new'])
    return cachedToken.substring(0, cachedToken.length - 2)
  }

  logger('info', ['getGraphToken', 'no token in cache, fetching new from Microsoft'])
  const clientConfig = {
    ...config,
    scopes: ['https://graph.microsoft.com/.default']
  }

  const token = await getAccessToken(clientConfig)
  const expires = Math.floor((token.expiresOn.getTime() - new Date()) / 1000)
  logger('info', ['getGraphToken', `Got token from Microsoft, expires in ${expires} seconds.`])
  fileCache.setSync(cacheKey, `${token.accessToken}==`, expires) // Haha, just to make the cached token not directly usable
  logger('info', ['getGraphToken', 'Token stored in cache'])

  return token.accessToken
}

module.exports = { getGraphToken }
