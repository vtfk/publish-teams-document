(async () => {
  const sourceLibrariesConfig = require('../config/source-libraries')
  const { logger, logConfig } = require('@vtfk/logger')
  const { createLocalLogger } = require('../lib/local-logger')
  const { setupSourceColumnDefinitions, setupSourcePublishView } = require('../lib/setup-column-definitions')
  const { readFileSync } = require('fs')
  const { createSharepointClient } = require('../lib/sharepoint-client')
  const Cache = require('file-system-cache').default
  const { sourceAuth } = require('../config')

  const sourceConfig = {
    clientId: sourceAuth.clientId,
    tenantId: sourceAuth.tenantId,
    tenantName: sourceAuth.tenantName,
    pfxcert: readFileSync(sourceAuth.pfxPath).toString('base64'),
    thumbprint: sourceAuth.pfxThumbprint
  }

  const sourceClient = createSharepointClient(sourceConfig)

  const fileCache = Cache({
    basePath: './.file-cache' // (optional) Path where cache files are stored (default).
  })

  // Set up logging
  logConfig({
    prefix: 'setupLibraries',
    teams: {
      onlyInProd: false
    },
    localLogger: createLocalLogger('setup-libraries')
  })

  const sourceLibraries = sourceLibrariesConfig.filter(lib => lib.enabled && !lib.skipSetup)

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
      lib.siteName = listAndSiteIdCache.siteName
      lib.tenantName = listAndSiteIdCache.tenantName
      lib.libraryName = listAndSiteIdCache.listName
    } else {
      try {
        const { siteId, listId, siteName, listName, tenantName } = await sourceClient.getListAndSiteId(lib.libraryUrl)
        if (!siteId || !listId) throw new Error('Aiaia, mangler siteId eller listId, sjekk ut!')
        fileCache.setSync(cacheListAndSiteKey, { siteId, listId, siteName, listName, tenantName })
        lib.siteId = siteId
        lib.listId = listId
        lib.siteName = siteName
        lib.tenantName = tenantName
        lib.libraryName = listName
      } catch (error) {
        logger('error', ['Ææææh, failed when getting list and site id for library, run setup again or wait for next run', lib.libraryUrl, error.response?.data || error.stack || error.toString()])
        continue
      }
    }

    const columnDefinitions = setupSourceColumnDefinitions(lib)

    await sourceClient.upsertColumns(lib, columnDefinitions)

    logger('info', [`Checking views, adding publish view if it is missing, and modifying if it is missing columns, also, deleting publish columns from default view if they are there. Library: ${lib.libraryUrl}`])
    const publishView = setupSourcePublishView(lib)
    try {
      logger('info', [`Removing fields from default view (if present). Library: ${lib.libraryUrl}`])
      const fieldsToRemove = columnDefinitions.map(colDef => colDef.body.name)
      const cleanupViewResult = await sourceClient.cleanUpDefaultView(lib.libraryUrl, lib.listId, fieldsToRemove, publishView.title)
      logger('info', [`Successfully removed views from default view. ${cleanupViewResult} Library: ${lib.libraryUrl}`])
    } catch (error) {
      logger('error', [`Error when removing fields from default view. Library: ${lib.libraryUrl}`, 'error', error.response?.data || error.stack || error.toString()])
    }
    try {
      logger('info', [`Checking if need to add, and adding view and viewfield (upserting) to publishView if needed. Library: ${lib.libraryUrl}`])
      const upsertViewResult = await sourceClient.upsertView(lib.libraryUrl, lib.listId, publishView, publishView.removeColumnsIfExists)
      logger('info', [`Successfully upserted view and viewfield to publishView. ${upsertViewResult} Library: ${lib.libraryUrl}`])
    } catch (error) {
      logger('error', [`Error when upserting fields in publish view. Library: ${lib.libraryUrl}`, 'error', error.response?.data || error.stack || error.toString()])
    }
  }
})()
