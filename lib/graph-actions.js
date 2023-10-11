const { singleGraphRequest, pagedGraphRequest } = require('./graph-request')
const { createWriteStream, statSync, readFileSync } = require('fs')
const axios = require('./axios-instance')()
const { destinationLibrary } = require('../config')

const getWebUrlParts = (webUrl) => {
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

const webUrlToRelativePath = (webUrl) => {
  const { domain, siteName, listName } = getWebUrlParts(webUrl)
  const relativePath = `sites/${domain}:/sites/${siteName}:/lists/${listName}`
  return relativePath
}

const getListAndSiteId = async (webUrl) => {
  const { siteName, domain } = getWebUrlParts(webUrl)
  const siteListsResource = `sites/${domain}:/sites/${siteName}:/lists`
  const siteLists = (await pagedGraphRequest(siteListsResource)).value

  const list = siteLists.find(list => list.webUrl === webUrl)
  if (!list) throw new Error(`No list or library found on webUrl: ${webUrl}, sure you got it right?`)
  if (!list.parentReference?.siteId) throw new Error(`No site found on webUrl: ${webUrl}, sure you got it right?`)
  const listId = list.id
  const siteId = list.parentReference.siteId.split(',')[1]

  return { siteId, listId }
}

const getFileContent = async (driveItem, version) => {
  const fileWriter = createWriteStream(`./ignore/fileresponse-${driveItem.name}`)
  const resource = version ? `/drives/${driveItem.parentReference.driveId}/items/${driveItem.id}/versions/${version}/content` : `/drives/${driveItem.parentReference.driveId}/items/${driveItem.id}/content`
  const fileStream = await singleGraphRequest(resource, { responseType: 'stream' })

  fileStream.pipe(fileWriter)
  fileWriter.on('finish', () => fileWriter.end())
}

const getFileContentAsPdf = async (driveItem, version) => {
  const pdfWriter = createWriteStream(`./ignore/pdfResponse-${driveItem.name}.pdf`)
  const resource = version ? `/drives/${driveItem.parentReference.driveId}/items/${driveItem.id}/versions/${version}/content?format=pdf` : `/drives/${driveItem.parentReference.driveId}/items/${driveItem.id}/versions/${version}/content?format=pdf`
  const pdfFileStream = await singleGraphRequest(resource, { responseType: 'stream' })

  pdfFileStream.pipe(pdfWriter)
  pdfWriter.on('finish', () => pdfWriter.end())
}

// We use uploadSession to be able to upload large files - must be uploaded in chunks (of same size) https://learn.microsoft.com/nb-no/onedrive/developer/rest-api/api/driveitem_createuploadsession?view=odsp-graph-online
const uploadFileToSharepointDestination = async (filePath, document) => {
  const resource = `sites/${destinationLibrary.siteId}/lists/${destinationLibrary.listId}/drive/items/root:/haha.pdf:/createUploadSession`
  const body = {
    item: {
      '@microsoft.graph.conflictBehavior': 'rename'
    }
  }
  const uploadSession = await singleGraphRequest(resource, { tenant: 'destination', method: 'post', body })

  const fileSize = statSync(filePath).size
  const chunkSize = 60 * 1024 * 1024 // 50MB
  let startChunkFrom = 0

  const fileBuffer = readFileSync(filePath)
  // Create chunks of bytes to be uploaded, and upload them on the go
  while (startChunkFrom < fileSize) {
    const chunk = fileBuffer.subarray(startChunkFrom, startChunkFrom + (chunkSize - 1)) // zero-indexed, so we subtract one :)
    const contentLength = chunk.length
    const contentRange = `bytes ${startChunkFrom}-${startChunkFrom + (chunk.length - 1)}/${fileSize}`
    console.log(contentRange)
    await axios.put(uploadSession.uploadUrl, chunk, { headers: { 'Content-Length': contentLength, 'Content-Range': contentRange } })

    startChunkFrom += (chunkSize - 1)
  }
}

module.exports = { getFileContent, getFileContentAsPdf, uploadFileToSharepointDestination, webUrlToRelativePath, getWebUrlParts, getListAndSiteId }

/*
const fs = require('fs');
const axios = require('axios');

const accessTokenFilePath = './access_token.json';

async function uploadFileToOneDrive(filePath, accessToken) {
    try {
        const fileStats = fs.statSync(filePath);
        const fileSize = fileStats.size;

        // Create upload session
        const url = 'https://graph.microsoft.com/v1.0/me/drive/root:/envato';
        const fileName = filePath.split('/').pop();
        const uploadSessionResponse = await axios.post(`${url}/${fileName}:/createUploadSession`, null, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        const uploadUrl = uploadSessionResponse.data.uploadUrl;

        // Upload file in chunks
        const chunkSize = 5 * 1024 * 1024; // 5MB chunk size
        let offset = 0;

        while (offset < fileSize) {
            const chunk = fs.readFileSync(filePath, {
                encoding: null,
                start: offset,
                end: offset + chunkSize - 1
            });

            const range = `bytes ${offset}-${offset + chunk.length - 1}/${fileSize}`;
            console.log(`Uploading range ${range}...`);

            await axios.put(uploadUrl, chunk, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Length': chunk.length,
                    'Content-Range': range
                }
            });

            offset += chunk.length;
        }

        console.log('File uploaded successfully');
        return true;
    } catch (error) {
        console.error('Error uploading file to OneDrive:', error.message);
        return false;
    }
}

/*
(async () => {
    try {
        const accessTokenData = fs.readFileSync(accessTokenFilePath, 'utf8');
        const { access_token: accessToken } = JSON.parse(accessTokenData);

        const success = await uploadFileToOneDrive('./sun-europe-trees-woods-yellow-above-natural-2023-02-27-20-26-28-utc.mp4', accessToken);
        if (!success) {
            const newAccessToken = await refreshAccessToken();
            await uploadFileToOneDrive('./sun-europe-trees-woods-yellow-above-natural-2023-02-27-20-26-28-utc.mp4', newAccessToken);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
})();
*/
