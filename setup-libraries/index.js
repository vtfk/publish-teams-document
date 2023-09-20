/* 
Sjekk om kolonne er der - om ikke legg de til
Går gjennom alle filer i biblioteket - setter standardverdier
*/

(async () => {
  const siteConfig = require('../publish-sites')
  const { logger } = require('@vtfk/logger')
  const { pagedGraphRequest, singleGraphRequest } = require('../lib/graph-request')
  const { columnDefinitions } = require('../config')
  const { writeFileSync, mkdirSync, existsSync } = require('fs')

  const publishSites = siteConfig.filter(site => site.enabled)

  if (publishSites.length === 0) logger('warn', ['no sites enabled'])

  for (const site of publishSites) {
    // Sjekk om kolonne er der
    const resource = `sites/${site.siteId}/lists/${site.listID}/columns`
    let columns
    try {
      columns = (await singleGraphRequest(resource)).value
    } catch (error) {
      logger('error', ['Error when fetching columns for site', site.siteName, 'list', site.listName, error.response.data || error.stack || error.toString()])
      process.exit(1)
    }

    const columnsToAdd = []
    for (const columnDef of Object.values(columnDefinitions)) {
      // Hmm, skal vi ta hensyn til andre properties og mon tro?
      if (!columns.find(col => col.name === columnDef.name)) columnsToAdd.push(columnDef)
    }

    for (const columnDef of columnsToAdd) {
      try {
        const columnResource = `sites/${site.siteId}/lists/${site.listID}/columns`
        const requestOptions = {
          method: 'post',
          body: columnDef.body
        }
        writeFileSync('./columnsToAdd.json', JSON.stringify(columnsToAdd, null, 2))
        const res = await singleGraphRequest(columnResource, requestOptions)
        writeFileSync('./jfkdjfldjsf.json', JSON.stringify(res, null, 2))
      } catch (error) {
        logger('error', [`Error when creating column ${columnsToAdd.name}`, 'error', error.response.data || error.stack || error.toString()])
      }
    }
  }
})()