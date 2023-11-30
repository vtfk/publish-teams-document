// Let's say we get a new document ready for publishing, and the current version is 5.3 - then we want the modifier that published version 5.0 (to alert the correct person that published the document, not the lates modifier. Hence this job)
const { logger } = require('@vtfk/logger')
const { sourceAuth, COLUMN_NAMES_PUBLISHED_SHAREPOINT_URL_NAME, COLUMN_NAMES_PUBLISHED_WEB_URL_NAME, COLUMN_NAMES_PUBLISHED_VERSION_NAME, COLUMN_NAMES_PUBLISHED_BY_NAME } = require('../../config')
const { createSharepointClient } = require('../sharepoint-client')
const { readFileSync } = require('fs')
const getCorrectPublishedVersionNumber = require('../get-correct-published-version-number')

const sourceConfig = {
  clientId: sourceAuth.clientId,
  tenantId: sourceAuth.tenantId,
  tenantName: sourceAuth.tenantName,
  pfxcert: readFileSync(sourceAuth.pfxPath).toString('base64'),
  thumbprint: sourceAuth.pfxThumbprint
}
let sourceClient = null // Don't want to create it every time

const setStatusOnSource = async (documentData) => {
  if (!sourceClient) sourceClient = createSharepointClient(sourceConfig)
  logger('info', ['setStatusOnSource', 'Setting new metadata on listItem for the source item'])

  const getDriveItemDataResult = documentData.flowStatus.getDriveItemData.result
  const metadata = {
    [COLUMN_NAMES_PUBLISHED_VERSION_NAME]: getCorrectPublishedVersionNumber(getDriveItemDataResult.versionNumberToPublish, documentData.libraryConfig.hasVersioning), // Setter riktig i forhold til versjonering
    [`${COLUMN_NAMES_PUBLISHED_BY_NAME}LookupId`]: getDriveItemDataResult.publisherSiteUser.Id // Setter sist publisert av kolonnen som personOrGroup
  }
  if (documentData.libraryConfig.innsidaPublishing && documentData.flowStatus.publishToInnsida?.result) metadata[COLUMN_NAMES_PUBLISHED_SHAREPOINT_URL_NAME] = documentData.flowStatus.publishToInnsida.result.webUrl
  if (documentData.libraryConfig.webPublishing && documentData.flowStatus.publishToWeb?.result) metadata[COLUMN_NAMES_PUBLISHED_WEB_URL_NAME] = documentData.flowStatus.publishToWeb.result.webUrl

  const resource = `sites/${documentData.libraryConfig.siteId}/lists/${documentData.libraryConfig.listId}/items/${documentData.fields.id}/fields`
  const updateFieldsResult = await sourceClient.graphRequest(resource, { method: 'patch', body: metadata })
  logger('info', ['setStatusOnSource', 'Successfully set metadata on source item'])

  logger('info', ['setStatusOnSource', 'Finished job setStatusOnSource'])
  return { updateFieldsResult }
}

module.exports = { setStatusOnSource }
