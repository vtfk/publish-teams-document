const { logger } = require('@vtfk/logger')
const { existsSync, mkdirSync, copyFileSync } = require('fs')
const { webPublishDestinationPath, webPublishBaseUrl } = require('../../config')

// Make sure directories are setup correct
const syncDir = (dir) => {
  if (!existsSync(dir)) {
    logger('info', [`${dir} folder does not exist, creating...`])
    mkdirSync(dir)
  }
}

const publishToWeb = async (documentData) => {
  const siteDir = `${webPublishDestinationPath}/${documentData.libraryConfig.siteName}`
  logger('info', ['publishToWeb', `Checking that directory "${siteDir}" exists`])
  syncDir(siteDir)
  logger('info', ['publishToWeb', 'Copying cached file to website share'])
  const { cachedFile } = documentData.flowStatus.getDriveItemData.result
  const filePath = `${siteDir}/${cachedFile.fileName}.${cachedFile.fileExt}`
  copyFileSync(cachedFile.path, filePath)
  const webUrl = encodeURI(`${webPublishBaseUrl}/${documentData.libraryConfig.siteName}/${cachedFile.fileName}.${cachedFile.fileExt}`)
  logger('info', ['publishToWeb', 'Successfully copied file to unc (share folder), finished job publishToWeb'])

  return { filePath, webUrl }
}

module.exports = { publishToWeb }
