// Let's say we get a new document ready for publishing, and the current version is 5.3 - then we want the modifier that published version 5.0 (to alert the correct person that published the document, not the lates modifier. Hence this job)
const { logger } = require('@vtfk/logger')
const { convertToPdfExtensions, sourceAuth } = require('../../config')
const { createSharepointClient } = require('../sharepoint-client')
const { readFileSync, writeFileSync } = require('fs')

const sourceConfig = {
  clientId: sourceAuth.clientId,
  tenantId: sourceAuth.tenantId,
  tenantName: sourceAuth.tenantName,
  pfxcert: readFileSync(sourceAuth.pfxPath).toString('base64'),
  thumbprint: sourceAuth.pfxThumbprint
}
let sourceClient = null // Don't want to create it every time

const getDriveItemData = async (documentData) => {
  if (!sourceClient) sourceClient = createSharepointClient(sourceConfig)
  logger('info', ['getDriveItemData', 'Fetching driveItem and metadata for the version we need to publish'])
  const currentVersion = documentData.fields._UIVersionString
  const versionNumberToPublish = `${parseInt(currentVersion).toString()}.0`

  logger('info', ['getDriveItemData', `Version to publish is ${versionNumberToPublish}, current version is ${currentVersion}. fetching driveItem with info`])
  const { siteId, listId } = documentData.libraryConfig
  const driveItem = await sourceClient.getDriveItemFromListItem(siteId, listId, documentData.id)
  logger('info', ['getDriveItemData', 'Got driveItem, fetching versions'])

  const driveItemVersions = await sourceClient.getDriveItemVersions(driveItem)
  logger('info', ['getDriveItemData', `Got versions for driveItem, checking if the versionToPublish ${versionNumberToPublish} is the latest`])
  const actualLatestVersionNumber = driveItemVersions.value.map(driveItemVersion => Number(driveItemVersion.id)).sort((num1, num2) => { return num1 - num2 }).pop() // Støgg måte, henter ut alle versjonsnummer som tall, sorterer stigende, og bøffer ut siste element
  const actualLatestVersion = driveItemVersions.value.find(driveItemVersion => Number(driveItemVersion.id) === actualLatestVersionNumber) // Støgg måte for å hente ut versjonsnummeret som versjonsstreng (for å få med evt .0 i strengen. Number(14.0) => 14), så vi ønsker "14.0" for å ha brukbar versjonsstreng
  const versionToPublishIsLatestVersion = versionNumberToPublish === actualLatestVersion.id
  logger('info', ['getDriveItemData', `Actual latest version is ${actualLatestVersion.id}, version to publish is still ${versionNumberToPublish}`, `versionToPublishIsLatestVersion: ${versionToPublishIsLatestVersion}`])

  logger('info', 'Finding who modified the version we are going to publish')
  const versionToPublish = driveItemVersions.value.find(driveItemVersion => driveItemVersion.id === versionNumberToPublish)
  if (!versionToPublish.lastModifiedBy?.user?.email) throw new Error('Document was not published by a user, what?')
  const publisher = versionToPublish.lastModifiedBy.user
  const publishedDate = versionToPublish.lastModifiedDateTime
  logger('info', `It was selveste ${publisher.email} that last modified the version we are going to publish, fetching site user for publisher`)
  const publisherSiteUserList = (await sourceClient.getSiteUserFromEmail(documentData.libraryConfig.libraryUrl, publisher.email)).d.results // Used for personOrGroupColumn
  if (publisherSiteUserList.length !== 1) throw new Error(`Could not find any unique siteuser in ${documentData.libraryConfig.siteName} with email: ${publisher.email}`)
  const publisherSiteUser = publisherSiteUserList[0]

  // Then we get actual file and cache it locally
  logger('info', 'Fetching the file data', `${versionToPublishIsLatestVersion ? 'Publishing latest version, so we cannot use version endpoint' : 'Publishing previous version, so using version endpoint'}`)
  const fileExt = documentData.webUrl.substring(documentData.webUrl.lastIndexOf('.') + 1, documentData.webUrl.length) // file extension without .
  const driveItemName = driveItem.name.substring(0, driveItem.name.lastIndexOf('.')).substring(0, 256 - 40) // drive item document name - but 256-35 charactes long, to avoid too long filenames (total of 256 is usually max)
  const fileCacheDir = './documents/file-cache'
  let cachedFilePath
  let cachedFileExt
  const fileName = `${documentData.flowStatus.documentName}-${driveItemName}`
  if (convertToPdfExtensions.includes(fileExt)) {
    logger('info', ['getDriveItemData', `file extension "${fileExt}" can be converted to pdf, trying to convert and getting data`, `versionToPublishIsLatestVersion: ${versionToPublishIsLatestVersion}`])
    const savePath = `${fileCacheDir}/${fileName}.pdf`
    cachedFilePath = await sourceClient.getFileContentAsPdf(savePath, driveItem, versionToPublishIsLatestVersion ? null : versionNumberToPublish)
    cachedFileExt = 'pdf'
  } else {
    logger('info', ['getDriveItemData', `file extension "${fileExt}" cannot be converted to pdf, getting data without converting`, `versionToPublishIsLatestVersion: ${versionToPublishIsLatestVersion}`])
    const savePath = `${fileCacheDir}/${fileName}.${fileExt}`
    cachedFilePath = await sourceClient.getFileContent(savePath, driveItem, versionToPublishIsLatestVersion ? null : versionNumberToPublish)
    cachedFileExt = fileExt
  }
  if (!cachedFilePath || typeof cachedFilePath !== 'string') throw new Error('Something went wrong when fetching file data...')

  logger('info', ['getDriveItemData', 'Finished job getDriveItemData'])
  return {
    publisher,
    publisherSiteUser,
    publishedDate,
    currentVersion,
    actualLatestVersionNumber: actualLatestVersion.id,
    versionNumberToPublish,
    versionToPublishIsLatestVersion,
    cachedFile: {
      path: cachedFilePath,
      fileName,
      fileExt: cachedFileExt
    },
    driveItem
  }
}

module.exports = { getDriveItemData }
