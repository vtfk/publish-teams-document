/*
Sjekk om kolonne er der - om ikke legg de til
Går gjennom alle filer i biblioteket - setter standardverdier
*/

(async () => {
  const resetLibraries = require('../config/reset-libraries')
  const { logger, logConfig } = require('@vtfk/logger')
  const { createLocalLogger } = require('../lib/local-logger')
  const { graphRequest } = require('../lib/graph-request')
  const { getListAndSiteId } = require('../lib/graph-actions')
  const { columnDefinitions } = require('../config')

  // Set up logging
  logConfig({
    prefix: 'resetLibraries',
    teams: {
      onlyInProd: false
    },
    localLogger: createLocalLogger('reset-libraries')
  })

  if (resetLibraries.length === 0) logger('warn', ['no libraries to reset'])

  for (const lib of resetLibraries) {
    logger('info', ['Getting site and list id for easier and more consistent queries']) // Getting lists based on titles is actually display name, so can be anything...
    const { listId } = await getListAndSiteId(lib.libraryUrl)
    // Sjekk om kolonne er der

    const resource = 'sites/columns'
    let columns
    try {
      logger('info', 'Getting all columns')
      columns = (await graphRequest(resource)).value
    } catch (error) {
      logger('error', ['Error when fetching columns for library in site', lib.siteName, 'list', lib.listName, error.response.data || error.stack || error.toString()])
      process.exit(1)
    }

    const columnsToDelete = []
    for (const columnDef of Object.values(columnDefinitions)) {
      const matchingColumn = columns.find(col => col.name === columnDef.name)
      if (matchingColumn) columnsToDelete.push(matchingColumn)
    }

    for (const column of columnsToDelete) {
      try {
        const columnResource = `${webUrlToRelativePath(lib.libraryUrl)}/columns/${column.id}`
        const requestOptions = {
          method: 'delete'
        }
        logger('info', `Deleting column ${column.displayName}`)
        const res = await graphRequest(columnResource, requestOptions)
      } catch (error) {
        logger('error', [`Error when deleting column ${columnsToDelete.name}`, 'error', error.response.data || error.stack || error.toString()])
      }
    }
  }
})()
