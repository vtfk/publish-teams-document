const { graphRequest, pagedGraphRequest } = require('./graph-request')
const { createWriteStream, statSync, readFileSync } = require('fs')
const { pipeline } = require('node:stream/promises')
const axios = require('./axios-instance')()

const getLibraryWebUrlParts = (webUrl) => {
  if (webUrl.endsWith('/')) webUrl = webUrl.substring(0, webUrl.length - 1)
  if (!webUrl.includes('/sites/') || !webUrl.startsWith('https://')) throw new Error(`url is not valid: ${webUrl}, must be on format https://{tenant}.sharepoint.com/sites/{sitename}/{libraryname}`)
  const parts = webUrl.replace('https://', '').split('/')
  if (!parts.length === 4) throw new Error(`url is not valid: ${webUrl}, must be on format https://{tenant}.sharepoint.com/sites/{sitename}/{libraryname}`)
  const domain = parts[0]
  if (!domain.includes('.sharepoint.com')) throw new Error(`url is not valid: ${webUrl}, must be on format https://{tenant}.sharepoint.com/sites/{sitename}/{libraryname}`)
  const tenantName = domain.split('.')[0]
  const siteName = parts[2]
  const listName = parts[3]
  return {
    domain,
    tenantName,
    siteName,
    listName
  }
}

const getListAndSiteId = async (authConfig, webUrl) => {
  const { siteName, domain, tenantName, listName } = getLibraryWebUrlParts(webUrl)
  const siteListsResource = `sites/${domain}:/sites/${siteName}:/lists`
  const siteLists = (await pagedGraphRequest(authConfig, siteListsResource)).value

  const list = siteLists.find(list => list.webUrl === webUrl)
  if (!list) throw new Error(`No list or library found on webUrl: ${webUrl}, sure you got it right?`)
  if (!list.parentReference?.siteId) throw new Error(`No site found on webUrl: ${webUrl}, sure you got it right?`)
  const listId = list.id
  const siteId = list.parentReference.siteId.split(',')[1]

  return { siteId, listId, siteName, listName, tenantName }
}

const getDriveItemVersion = async (authConfig, driveItem, version) => {
  const resource = `/drives/${driveItem.parentReference.driveId}/items/${driveItem.id}/versions/${version}`
  const driveItemResponse = await graphRequest(authConfig, resource)
  return driveItemResponse
}

const getDriveItemVersions = async (authConfig, driveItem) => {
  const resource = `/drives/${driveItem.parentReference.driveId}/items/${driveItem.id}/versions`
  const driveItemResponse = await graphRequest(authConfig, resource)
  return driveItemResponse
}

const getDriveItemFromListItem = async (authConfig, siteId, listId, itemId) => {
  const resource = `/sites/${siteId}/lists/${listId}/items/${itemId}/driveItem`
  const driveItemResponse = await graphRequest(authConfig, resource)
  return driveItemResponse
}

const getDriveItemVersionFromListItem = async (authConfig, siteId, listId, itemId, version) => {
  const resource = version ? `/sites/${siteId}/lists/${listId}/items/${itemId}/driveItem/versions/${version}` : `/sites/${siteId}/lists/${listId}/items/${itemId}/driveItem`
  const driveItemResponse = await graphRequest(authConfig, resource)
  return driveItemResponse
}

const getFileContent = async (authConfig, savePath, driveItem, version) => {
  const resource = version ? `/drives/${driveItem.parentReference.driveId}/items/${driveItem.id}/versions/${version}/content` : `/drives/${driveItem.parentReference.driveId}/items/${driveItem.id}/content`
  const fileStream = await graphRequest(authConfig, resource, { responseType: 'stream' })
  await pipeline(
    fileStream,
    createWriteStream(savePath, { autoClose: true, flags: 'w' })
  )
  return savePath
}

const getFileContentAsPdf = async (authConfig, savePath, driveItem, version) => {
  const resource = version ? `/drives/${driveItem.parentReference.driveId}/items/${driveItem.id}/versions/${version}/content?format=pdf` : `/drives/${driveItem.parentReference.driveId}/items/${driveItem.id}/content?format=pdf`
  const fileStream = await graphRequest(authConfig, resource, { responseType: 'stream' })
  await pipeline(
    fileStream,
    createWriteStream(savePath, { autoClose: true, flags: 'w' })
  )
  return savePath
}

// We use uploadSession to be able to upload large files - must be uploaded in chunks (of same size) https://learn.microsoft.com/nb-no/onedrive/developer/rest-api/api/driveitem_createuploadsession?view=odsp-graph-online
const uploadFileToSharepoint = async (authConfig, siteId, listId, filePath, fileName) => {
  const resource = `sites/${siteId}/lists/${listId}/drive/items/root:/${fileName}:/createUploadSession`
  const body = {
    item: {
      '@microsoft.graph.conflictBehavior': 'replace'
    }
  }
  const uploadSession = await graphRequest(authConfig, resource, { tenant: 'destination', method: 'post', body })

  const fileSize = statSync(filePath).size
  const chunkSize = 60 * 1024 * 1024 // 60MB
  let startChunkFrom = 0

  const fileBuffer = readFileSync(filePath)
  const start = new Date()
  let response
  // Create chunks of bytes to be uploaded, and upload them on the go
  while (startChunkFrom < fileSize) {
    const chunk = fileBuffer.subarray(startChunkFrom, startChunkFrom + (chunkSize - 1)) // zero-indexed, so we subtract one :)
    const contentLength = chunk.length
    const contentRange = `bytes ${startChunkFrom}-${startChunkFrom + (chunk.length - 1)}/${fileSize}`
    const { data } = await axios.put(uploadSession.uploadUrl, chunk, { headers: { 'Content-Length': contentLength, 'Content-Range': contentRange } })
    response = data
    startChunkFrom += (chunkSize - 1)
  }
  const end = new Date()
  const uploadTime = `${(end - start) / 1000} seconds`

  return {
    fileSize,
    uploadTime,
    response
  }
}

module.exports = { getFileContent, getFileContentAsPdf, uploadFileToSharepoint, getLibraryWebUrlParts, getListAndSiteId, getDriveItemVersion, getDriveItemFromListItem, getDriveItemVersionFromListItem, getDriveItemVersions }
