// Let's say we get a new document ready for publishing, and the current version is 5.3 - then we want the modifier that published version 5.0 (to alert the correct person that published the document, not the lates modifier. Hence this job)
const { logger } = require('@vtfk/logger')
const { destinationAuth, destinationLibrary } = require('../../config')
const { createSharepointClient } = require('../sharepoint-client')
const { readFileSync } = require('fs')
const getCorrectPublishedVersionNumber = require('../get-correct-published-version-number')

const destinationConfig = {
  clientId: destinationAuth.clientId,
  tenantId: destinationAuth.tenantId,
  tenantName: destinationAuth.tenantName,
  pfxcert: readFileSync(destinationAuth.pfxPath).toString('base64'),
  thumbprint: destinationAuth.pfxThumbprint
}
let destinationClient = null // Don't want to create it every time

const publishToInnsida = async (documentData) => {
  if (!destinationClient) destinationClient = createSharepointClient(destinationConfig)
  logger('info', ['publishToInnsida', 'Uploading file to Innsida documentLibrary'])
  const { cachedFile } = documentData.flowStatus.getDriveItemData.result
  const uploadResult = await destinationClient.uploadFileToSharepoint(destinationLibrary.siteId, destinationLibrary.listId, cachedFile.path, `${cachedFile.fileName}.${cachedFile.fileExt}`)
  logger('info', ['publishToInnsida', 'Successfully uploaded file to Innsida documentLibrary, setting metadata on listItem for the uploaded file'])

  const webUrl = `${uploadResult.response.webUrl}?web=1`
  const getDriveItemDataResult = documentData.flowStatus.getDriveItemData.result
  const metadata = {
    kildesite_navn: documentData.libraryConfig.siteName,
    kildebibliotek_navn: documentData.libraryConfig.libraryName,
    kilde_publisher: getDriveItemDataResult.publisher.email,
    kilde_published_version: getCorrectPublishedVersionNumber(getDriveItemDataResult.versionNumberToPublish, documentData.libraryConfig.hasVersioning), // Setter det samme som brukeren kommer til å se
    kilde_published_date: getDriveItemDataResult.publishedDate,
    innsida_weburl: webUrl,
    kildetenant_name: documentData.libraryConfig.tenantName,
    kildesite_id: documentData.libraryConfig.siteId,
    kildelist_id: documentData.libraryConfig.listId,
    kildeitem_id: documentData.fields.id,
    kildedrive_id: getDriveItemDataResult.driveItem.parentReference.driveId,
    kildedrive_item_id: getDriveItemDataResult.driveItem.id
  }

  const resource = `drives/${uploadResult.response.parentReference.driveId}/items/${uploadResult.response.id}/listItem/fields`
  const updateFieldsResult = await destinationClient.graphRequest(resource, { method: 'patch', body: metadata })
  logger('info', ['publishToInnsida', 'Successfully set metadata on the uploaded document, finished job publishToInnsida'])

  return { webUrl, uploadResult, updateFieldsResult }
}

module.exports = { publishToInnsida }
