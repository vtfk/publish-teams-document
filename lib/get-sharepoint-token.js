const NodeCache = require('node-cache')
const { sourceSharepointClient } = require('../config')
const { logger } = require('@vtfk/logger')
const spToken = require('@vtfk/sharepoint-rest-auth')
const { readFileSync } = require('fs')
const Cache = require('file-system-cache').default

const fileCache = Cache({
  basePath: "./.file-cache", // (optional) Path where cache files are stored (default).
})

const cache = new NodeCache({ stdTTL: 3000 })

const getSharepointToken = async (forceNew = false) => {
  const cacheKey = 'sharepointToken'

  const cachedToken = fileCache.getSync(cacheKey)
  if (!forceNew && cachedToken) {
    logger('info', ['getSharepointToken', 'found valid token in cache, will use that instead of fetching new'])
    return cachedToken.substring(0, cachedToken.length - 2)
  }

  logger('info', ['getsharepointToken', 'no token in cache, fetching new from Microsoft'])
  const pfxcert = readFileSync(sourceSharepointClient.pfxPath).toString('base64')

  const config = {
    thumbprint: sourceSharepointClient.pfxThumbprint, // Certificate thumbprint
    pfxcert, // PFX cert as base64
    clientId: sourceSharepointClient.clientId, // app reg client id
    tenantId: sourceSharepointClient.tenantId, // tenant id
    tenantName: sourceSharepointClient.tenantName // tenant name
  }

  const token = await spToken(config)
  const expires = Math.floor((token.expiresOn.getTime() - new Date()) / 1000)
  logger('info', ['getSharepointToken', `Got token from Microsoft, expires in ${expires} seconds.`])
  fileCache.setSync(cacheKey, `${token.accessToken}==`, expires) // Haha, just to make the cached token not directly usable
  logger('info', ['getSharepointToken', 'Token stored in cache'])

  return token.accessToken
}

module.exports = { getSharepointToken }
