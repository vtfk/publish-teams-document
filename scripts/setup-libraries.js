
(async () => {
  const sourceLibrariesConfig = require('../config/source-libraries')
  const { logger, logConfig } = require('@vtfk/logger')
  const { createLocalLogger } = require('../lib/local-logger')
  const { singleGraphRequest } = require('../lib/graph-request')
  const { getListAndSiteId } = require('../lib/graph-actions')
  const { modifyColumn, getColumns, upsertView, cleanUpDefaultView } = require('../lib/sharepoint-requests')
  const { setupColumnDefinitions, setupPublishView } = require('../lib/setup-column-definitions')
  const { COLUMN_NAMES_PUBLISHING_CHOICES_NAME } = require('../config')
  const { writeFileSync } = require('fs')
  const Cache = require('file-system-cache').default

  const fileCache = Cache({
    basePath: "./.file-cache", // (optional) Path where cache files are stored (default).
  })

  // Simple helper function to check if two arrays has the exact same values
  const hasAllValues = (arr1, arr2) => { return arr2.every(value => arr1.includes(value)) }
  const hasSameValues = (arr1, arr2) => { return hasAllValues(arr1, arr2) && hasAllValues(arr2, arr1) }

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
    } else {
      try {
        const { siteId, listId } = await getListAndSiteId(lib.libraryUrl)
        if (!siteId || !listId) throw new Error('Aiaia, mangler siteId eller listId, sjekk ut!')
        fileCache.setSync(cacheListAndSiteKey, { siteId, listId })
        lib.siteId = siteId
        lib.listId = listId
      } catch (error) {
        logger('error', ['Ææææh, failed when getting list and site id for library, run setup again or wait for next run', lib.libraryUrl, error.response?.data || error.stack || error.toString()])
        continue
      }
    }

    let columns
    try {
      logger('info', ['Getting all columns (and formatting)'])
      columns = (await getColumns(lib.libraryUrl, lib.listId)).d.results
      writeFileSync('./ignore/columnsfromsp.json', JSON.stringify(columns, null, 2))
    } catch (error) {
      logger('error', ['Error when fetching columns for library in site', lib.libraryUrl, error.response?.data || error.stack || error.toString()])
      throw error
    }

    logger('info', [`Checking what columns needs to be added, and if they already exist, and if they need to be modified. Library: ${lib.libraryUrl}`])
    const columnDefinitions = setupColumnDefinitions(lib)
    const columnsToAdd = []
    for (const columnDef of columnDefinitions) {
      const correspondingColumn = columns.find(col => col.InternalName === columnDef.body.name)
      if (!correspondingColumn) {
        columnsToAdd.push(columnDef)
      } else {
        logger('info', [`Column ${columnDef.body.name} already exists in library ${lib.libraryUrl}, don't need to create, check if need to modify..`])
        const modification = {
          needsModifiation: false,
          body: {
            __metadata: {
              type: correspondingColumn.__metadata.type
            }
          }
        }
        if (columnDef.CustomFormatter && correspondingColumn.CustomFormatter !== columnDef.CustomFormatter) {
          logger('info', [`Ohohoh, CustomFormatter is missing or not correct on column ${columnDef.body.name} for library: ${lib.libraryUrl}, will fix`])
          modification.body.CustomFormatter = columnDef.CustomFormatter
          modification.needsModifiation = true
        }
        if (correspondingColumn.Title !== columnDef.body.displayName) {
          logger('info', [`Ohohoh, Title (display name) is not correct on column ${columnDef.body.name} for library: ${lib.libraryUrl}, will fix`])
          modification.body.Title = columnDef.body.displayName
          modification.needsModifiation = true
        }
        // Hacky tacky way of updating choices in publishing choice column - no need to generalize something so specific :)
        const publishingChoiceColumnDef = columnDefinitions.find(col => col.body.name === COLUMN_NAMES_PUBLISHING_CHOICES_NAME)
        if (correspondingColumn.StaticName === COLUMN_NAMES_PUBLISHING_CHOICES_NAME && !hasSameValues(correspondingColumn.Choices.results, publishingChoiceColumnDef.body.choice.choices)) {
          logger('info', [`Ohohoh, publish choices are not correct on column ${columnDef.body.name} for library: ${lib.libraryUrl}, will fix`])
          modification.body.Choices = {
            "__metadata": {
              "type": "Collection(Edm.String)"
            },
            results: publishingChoiceColumnDef.body.choice.choices
          }
          modification.needsModifiation = true
        }
        if (modification.needsModifiation) {
          try {
            await modifyColumn(lib.libraryUrl, lib.listId, correspondingColumn.Id, modification.body)
            logger('info', [`Successfully modified column ${columnDef.body.name} for library: ${lib.libraryUrl}`])
          } catch (error) {
            logger('error', [`Error when adding custom formatter to ${columnDef.body.name} for library ${lib.libraryUrl}, run setup again or wait for next run`, 'error', error.response?.data || error.stack || error.toString()])
          }
        } else {
          logger('info', [`Column ${columnDef.body.name} already has correct data library ${lib.libraryUrl}, don't need to create, don't need to modify. Wonderful!`])
        }
      }
    }

    logger('info', [`Need to add ${columnsToAdd.length} columns to library: ${lib.libraryUrl}. Trying to add them now.`])
    for (const columnDef of columnsToAdd) {
      try {
        const columnResource = `sites/${lib.siteId}/lists/${lib.listId}/columns`
        const requestOptions = {
          method: 'post',
          body: columnDef.body
        }
        logger('info', [`Creating column ${columnDef.body.name} in library: ${lib.libraryUrl}`])
        const columnRes = await singleGraphRequest(columnResource, requestOptions)

        writeFileSync('./ignore/columnsadded.json', JSON.stringify(columnRes, null, 2))

        if (columnDef.CustomFormatter) {
          logger('info', ['Custom formatter is enabled, will add', 'column name', columnDef.body.name, 'library', lib.libraryUrl])
          try {
            await modifyColumn(lib.libraryUrl, lib.listId, columnRes.id, { CustomFormatter: columnDef.CustomFormatter })
          } catch (error) {
            logger('error', [`Error when adding custom formatter to ${columnDef.body.name}, in library: ${lib.libraryUrl}. Run setup again or wait for next run`, 'error', error.response?.data || error.stack || error.toString()])
          }
        }
      } catch (error) {
        logger('error', [`Error when creating column ${columnDef.body.name} in library ${lib.libraryUrl}. Run setup again or wait for next run`, 'error', error.response?.data || error.stack || error.toString()])
      }
    }

    logger('info', [`Checking views, adding publish view if it is missing, and modifying if it is missing columns, also, deleting publish columns from default view if they are there. Library: ${lib.libraryUrl}`])
    try {
      logger('info', [`Removing fields from default view (if present). Library: ${lib.libraryUrl}`])
      const fieldsToRemove = columnDefinitions.map(colDef => colDef.body.name)
      const cleanupViewResult = await cleanUpDefaultView(lib.libraryUrl, lib.listId, fieldsToRemove)
      logger('info', [`Successfully removed views from default view. ${cleanupViewResult} Library: ${lib.libraryUrl}`])
    } catch (error) {
      logger('error', [`Error when removing fields from default view. Library: ${lib.libraryUrl}`, 'error', error.response?.data || error.stack || error.toString()])
    }
    try {
      logger('info', [`Checking if need to add, and adding view and viewfield (upserting) to publishView if needed. Library: ${lib.libraryUrl}`])
      const publishView = setupPublishView(lib)
      const upsertViewResult = await upsertView(lib.libraryUrl, lib.listId, publishView)
      logger('info', [`Successfully upserted view and viewfield to publishView. ${upsertViewResult} Library: ${lib.libraryUrl}`])
    } catch (error) {
      logger('error', [`Error when upserting fields in publish view. Library: ${lib.libraryUrl}`, 'error', error.response?.data || error.stack || error.toString()])
    }
  }
})()
