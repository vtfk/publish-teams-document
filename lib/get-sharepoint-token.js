const NodeCache = require('node-cache')
const { sharepointClient } = require('../config')
const { logger } = require('@vtfk/logger')
const spToken = require('@vtfk/sharepoint-rest-auth')
const { readFileSync } = require('fs')

const cache = new NodeCache({ stdTTL: 3000 })

const getSharepointToken = async (forceNew = false) => {
  const cacheKey = 'sharepointToken'

  if (!forceNew && cache.get(cacheKey)) {
    logger('info', ['getSharepointToken', 'found valid token in cache, will use that instead of fetching new'])
    return (cache.get(cacheKey))
  }

  logger('info', ['getsharepointToken', 'no token in cache, fetching new from Microsoft'])
  const pfxcert = readFileSync(sharepointClient.pfxPath).toString('base64')

  const config = {
    thumbprint: sharepointClient.pfxThumbprint, // Certificate thumbprint
    pfxcert, // PFX cert as base64
    clientId: sharepointClient.clientId, // app reg client id
    tenantId: sharepointClient.tenantId, // tenant id
    tenantName: sharepointClient.tenantName // tenant name
  }

  const token = await spToken(config)
  const expires = Math.floor((token.expiresOn.getTime() - new Date()) / 1000)
  logger('info', ['getSharepointToken', `Got token from Microsoft, expires in ${expires} seconds.`])
  cache.set(cacheKey, token.accessToken, expires)
  logger('info', ['getSharepointToken', 'Token stored in cache'])

  return token.accessToken
}

module.exports = { getSharepointToken }