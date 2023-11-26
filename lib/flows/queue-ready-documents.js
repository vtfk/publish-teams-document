const sourceLibrariesConfig = require('../../config/source-libraries')
const { logger } = require('@vtfk/logger')
const { pagedGraphRequest } = require('../graph-request')
const { getListAndSiteId, getWebUrlParts } = require('../graph-actions')
const { COLUMN_NAMES_PUBLISHING_CHOICES_NAME, COLUMN_NAMES_PUBLISHED_VERSION_NAME, sourceGraphClient, disableDeltaQuery } = require('../../config')
const { writeFileSync, existsSync } = require('fs')
const Cache = require('file-system-cache').default
const crypto = require('crypto');
const { getList } = require('../sharepoint-requests')

const generateHash = (string) => { // Use this to avoid too long filenames (256 characters) - while preserving consistency on filenames (same input produces same key)
  return crypto.createHash('md5').update(string).digest('hex')
}

const fileCache = Cache({
  basePath: "./.file-cache", // (optional) Path where cache files are stored (default).
})

// Function for extracting choice column values
const getChoiceColumnValues = (choiceColumn) => {
  // This funny format "ptd_publisering": ";#Innsida;#vtfk.no;#" from beta endpoint
  if (typeof choiceColumn !== 'string') return []
  const choices = choiceColumn.split(';#').filter(choice => choice.trim().length > 0)
  return choices
}

// Function for checking if document is ready for publishing
const isDocumentReadyForPublishing = (document) => {
  // Vi vil ha dokumenter som har publisering til en av destinasjonene og der nåværende hovedversjon er større enn publisert versjon
  // Når publisert versjon settes, tas det høyde for at versjoneringen økes i det vi setter data på elementet
  const sharepointFields = document.fields
  const shouldPublish = Array.isArray(sharepointFields[COLUMN_NAMES_PUBLISHING_CHOICES_NAME]) && sharepointFields[COLUMN_NAMES_PUBLISHING_CHOICES_NAME].length > 0
  // When using beta endpoint and delta, choice column is not returned as array
  const shouldPublishBeta = getChoiceColumnValues(sharepointFields[COLUMN_NAMES_PUBLISHING_CHOICES_NAME]).length > 0
  const currentVersion = parseInt(sharepointFields._UIVersionString) // This is a string on the format "x.y" e.g "12.0" or "3.4"
  const publishedVersion = parseInt(sharepointFields[COLUMN_NAMES_PUBLISHED_VERSION_NAME] ?? '0.0')

  return (shouldPublish || shouldPublishBeta) && (currentVersion > publishedVersion)
}

const queueReadyDocuments = async () => {
  const sourceLibraries = sourceLibrariesConfig.filter(lib => lib.enabled)
  if (sourceLibraries.length === 0) logger('warn', ['no libraries enabled'])

  for (const lib of sourceLibraries) {
    // Getting graph listId and siteId, need for queries
    logger('info', ['Getting site and list id for easier and more consistent queries']) // Getting lists based on titles is actually display name, so can be anything...
    const cacheListAndSiteKey = `listAndSiteId-${lib.libraryUrl}`
    const listAndSiteIdCache = fileCache.getSync(cacheListAndSiteKey)
    if (listAndSiteIdCache) {
      logger('info', [`Found list and site id in cache, using cache for ${lib.libraryUrl}`])
      lib.siteId = listAndSiteIdCache.siteId
      lib.listId = listAndSiteIdCache.listId
    } else {
      try {
        const { siteId, listId } = await getListAndSiteId(lib.libraryUrl)
        if (!siteId || !listId) throw new Error('Aiaia, mangler siteId eller listId, sjekk ut!')
        fileCache.setSync(cacheListAndSiteKey, { siteId, listId })
        lib.siteId = siteId
        lib.listId = listId
      } catch (error) {
        logger('error', ['Ææææh, failed when getting list and site id for library, skipping to next library for now', lib.libraryUrl, error.response?.data || error.stack || error.toString()])
        continue
      }
    }
    
    // Getting SP rest List metadata (check if we have minor versions, and maybe other stuff in the future)
    logger('info', ['Getting listData and caching for easier handling and fewer requests']) 
    const cacheListDataKey = `listData-${lib.libraryUrl}`
    const listDataCache = fileCache.getSync(cacheListDataKey)
    if (listDataCache) {
      logger('info', [`Found list data in cache, using cache for ${lib.libraryUrl}`])
      lib.hasVersioning = listDataCache.EnableMinorVersions
    } else {
      try {
        const listData = await getList(lib.libraryUrl, lib.listId)
        if (typeof listData.d.EnableMinorVersions !== 'boolean') throw new Error('Aiaia, listData.d.EnableMinorVersions var itj boolean - sjekk ut')
        fileCache.setSync(cacheListDataKey, listData.d, 86400) // Just cache it for 24 hours - someone might turn on versioning suddenly...
        lib.hasVersioning = listData.d.EnableMinorVersions
      } catch (error) {
        logger('error', ['Ææææh, failed when getting list data for library, skipping to next library for now', lib.libraryUrl, error.response?.data || error.stack || error.toString()])
        continue
      }
    }


    logger('info', ['fetching files from sharepoint library', `Library: ${lib.libraryUrl}`])
    /*
      Vi sjekker først om vi har en delta-link - deltalenken gir oss kun det som har fått endringer siden sist vi spurte med forrige deltalenke.
      Dersom vi ikke har deltalenke må vi hente alt, men da ber vi om en deltalenke i tillegg, og cacher denne, slik at den kan brukes ved neste spørring.
    */
    const deltaResourceCacheKey = `delta-${lib.siteId}-${lib.listId}`
    const resourceBase = `sites/${lib.siteId}/lists/${lib.listId}/items/delta`
    const select = '$select=createdDateTime,id,webUrl,createdBy,lastModifiedBy,fields'
    const query = `$expand=fields,driveItem&${select}&$top=100` // REMEMBER TO TOP MORE THAN 10...


    // Mulig å drite i delta spørring hvis man trenger å teste (så slipper man å lage ny versjon av et dokument for hver kjøring...)
    const resource = disableDeltaQuery ? `${resourceBase}?${query}` : fileCache.getSync(deltaResourceCacheKey, `${resourceBase}?${query}`)

    const data = await pagedGraphRequest(resource, { beta: true, onlyFirstPage: false }) // Beta må være true for å bruke delta på lists inntil videre
    // Husk å cache deltalenke (resource delen her)
    if (data['@odata.deltaLink']) {
      const deltaResource = data['@odata.deltaLink'].replace(`${sourceGraphClient.baseurl}/beta/`, '') // Strip away the first part
      fileCache.setSync(deltaResourceCacheKey, deltaResource)
    }
    
    const documentsToHandle = data.value.filter(isDocumentReadyForPublishing)

    logger('info', [`Found ${documentsToHandle.length} ready documents for publishing`, `Library: ${lib.libraryUrl}`])

    for (const document of documentsToHandle) {
      // Opprett en jobb per dokument og legg i køen
      // Set up flowstatus for document
      const now = new Date()
      const fileName = `${generateHash(document.webUrl)}.json`
      const filePath = `./documents/queue/${fileName}`
      const documentData = {
        flowStatus: {
          documentName: fileName,
          documentPath: filePath,
          createdTimeStamp: now.toISOString(),
          finished: false,
          failed: false,
          runs: 0,
          nextRun: now.toISOString()
        },
        libraryConfig: lib,
        ...document
      }
      try {
        // Dersom delta gir oss det samme dokumentet betyr det at det har skjedd endringer på dokumentet siden sist det ble lagt i køen - da tar vi like greit å overskriver hele, og ber den starte alle jobbene på nytt, uavhengig av hvor mange av jobbene på dokumentet som var ferdig (det ligger bare i køen om det feila på forrige kjøring).
        // Det betyr også at alt må kjøres sekvensielt - men det er kanskje like greit? Hent dokumenter for biblioteket - håndter hvert dokument. Gå videre til neste bibliotek og gjør det samme :) ACOS-tankegangen. Om de ikke kjøres sekvensielt, og køen hadde blitt fylt raskere enn dokumenter blir tatt har vi uansett samme delay...
        // Dersom hash finnes allerede - sjekk at det faktisk er samme fila (one chance in 9 trillion that its not the same file...)
        if (existsSync(filePath)) {
          const { webUrl } = require(`../../documents/queue/${fileName}`)
          if (webUrl !== document.webUrl) {
            logger('error', ['HOOOOLY JEFF, hash generated the same key for two different weburls, one in a 9 trillion chance, save these two webUrls and the hash function for future research', webUrl, document.webUrl, 'shutting down script forresten, this needs attention'])
            break // STOP, this is so cool we have to see it
          }
        }
        writeFileSync(filePath, JSON.stringify(documentData, null, 2)) // Overskriver hvis det ligger der
      } catch (error) {
        logger('error', ['Could not write document to file!! Oh no - might miss a published file', 'file', fileName, 'error', error.stack || error.toString()])
      }
    }
  }
}

module.exports = { queueReadyDocuments }