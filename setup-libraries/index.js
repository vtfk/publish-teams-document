/* 
Sjekk om kolonne er der - om ikke legg de til
Går gjennom alle filer i biblioteket - setter standardverdier
*/
(async () => {
  const librariesConfig = require('../publish-libraries')
  const { logger, logConfig } = require('@vtfk/logger')
  const { singleGraphRequest } = require('../lib/graph-request')
  const { modifyColumn } = require('../lib/sharepoint-requests')
  const { columnDefinitions } = require('../config')
  const { writeFileSync, appendFileSync, existsSync, mkdirSync } = require('fs')

  // Set up local logger
  const LOG_DIR = `./logs/setup-libraries`
  if (!existsSync('./logs')) mkdirSync('./logs')
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR)
  const today = new Date()
  const month = today.getMonth() + 1 > 9 ? `${today.getMonth() + 1}` : `0${today.getMonth() + 1}`
  const logName = `${today.getFullYear()} - ${month}`

  const localLogger = (entry) => {
    console.log(entry)
    if (LOG_DIR) {
      appendFileSync(`${LOG_DIR}/${logName}.log`, `${entry}\n`)
    }
  }
  logConfig({
    prefix: 'setup-libraries',
    teams: {
      onlyInProd: false
    },
    localLogger
  })

  const publishLibraries = librariesConfig.filter(lib => lib.enabled)

  if (publishLibraries.length === 0) logger('warn', ['no libraries enabled'])

  for (const lib of publishLibraries) {
    // Sjekk om kolonne er der
    const resource = `sites/${lib.siteId}/lists/${lib.listId}/columns`
    let columns
    try {
      logger('info', ['Getting all columns'])
      columns = (await singleGraphRequest(resource)).value
    } catch (error) {
      logger('error', ['Error when fetching columns for library in site', lib.siteName, 'list', lib.listName, error.response.data || error.stack || error.toString()])
      process.exit(1)
    }

    const columnsToAdd = []
    for (const columnDef of Object.values(columnDefinitions)) {
      // Hmm, skal vi ta hensyn til andre properties og mon tro?
      if (!columns.find(col => col.name === columnDef.name)) columnsToAdd.push(columnDef)
    }

    for (const columnDef of columnsToAdd) {
      try {
        const columnResource = `sites/${lib.siteId}/lists/${lib.listId}/columns`
        const requestOptions = {
          method: 'post',
          body: columnDef.body
        }
        logger('info', [`Creating column ${columnDef.name}`])
        const columnRes = await singleGraphRequest(columnResource, requestOptions)

        writeFileSync('./ignore/columnsadded.json', JSON.stringify(columnRes, null, 2))
        
        if (columnDef.CustomFormatter) {
          logger('info', ['Custom formatter is enabled, will add', 'column name', columnDef.name])
          try {
            await modifyColumn(lib, columnRes.id, { CustomFormatter: columnDef.CustomFormatter })
          } catch (error) {
            logger('error', [`Error when adding custom formatter to ${columnsToAdd.name}`, 'error', error.response.data || error.stack || error.toString()])
          }
        }
      } catch (error) {
        logger('error', [`Error when creating column ${columnsToAdd.name}`, 'error', error.response.data || error.stack || error.toString()])
      }
    }
  }
})()