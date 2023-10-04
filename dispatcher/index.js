(async () => {
  const libraryConfig = require('../publish-libraries')
  const { logger, logConfig } = require('@vtfk/logger')
  const { pagedGraphRequest } = require('../lib/graph-request')
  const { columnDefinitions } = require('../config')
  const { writeFileSync, mkdirSync, existsSync, appendFileSync } = require('fs')

  // Set up local logger
  const LOG_DIR = `./logs/dispatcher`
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
    prefix: 'Dispatcher',
    teams: {
      onlyInProd: false
    },
    localLogger
  })

  // Make sure directories are setup correct
  const syncDir = (dir) => {
    if (!existsSync(dir)) {
      logger('info', [`${dir} folder does not exist, creating...`])
      mkdirSync(dir)
    }
  }
  syncDir('./documents')
  syncDir('./documents/queue')
  syncDir('./documents/finished')
  syncDir('./documents/error')

  const publishLibraries = libraryConfig.filter(lib => lib.enabled)

  if (publishLibraries.length === 0) logger('warn', ['no libraries enabled'])

  for (const lib of publishLibraries) {
    const resourceBase = `sites/${lib.siteId}/lists/${lib.listId}/drive/list/items`
    const select = '$select=createdDateTime,id,webUrl,createdBy,lastModifiedBy,fields'
    const query = `$expand=fields&${select}&$top=10`

    const resource = `${resourceBase}?${query}`

    logger('info', ['fetching files from sharepoint library', `Sitename: ${lib.siteName}`, `Listname: ${lib.listName}`])

    const data = await pagedGraphRequest(resource, { onlyFirstPage: false })

    writeFileSync('./ignore/allDocs.json', JSON.stringify(data, null, 2))

    const isDocumentReady = (document) => {
      // Vi vil ha dokumenter som har publisering til en av destinasjonene og der nåværende hovedversjon er større enn publisert versjon
      // Når publisert versjon settes, tas det høyde for at versjoneringen økes i det vi setter data på elementet
      const sharepointFields = document.fields

      const shouldPublish = Array.isArray(sharepointFields[columnDefinitions.publishingChoices.name]) && sharepointFields[columnDefinitions.publishingChoices.name].length > 0
      const currentVersion = parseInt(sharepointFields._UIVersionString) // This is a string on the format "x.y" e.g "12.0" or "3.4"
      const publishedVersion = parseInt(sharepointFields[columnDefinitions.publishedVersion.name] ?? '0.0')

      logger('info', ['shouldPublish', shouldPublish, 'currentVersion', currentVersion, 'publishedVersion', publishedVersion])
      return shouldPublish && (currentVersion > publishedVersion)
    }

    const documentsToHandle = data.value.filter(isDocumentReady) // Finner de dokumentene der brukeren har sagt at dokumentet skal publiseres.

    for (const document of documentsToHandle) {
      // Opprett en jobb per dokument og legg i køen
      try {
        const file = `./documents/queue/${lib.siteName}-${lib.listName}-${document.fields.LinkFilename}-${document.fields.Modified.substring(0, document.fields.Modified.indexOf('T'))}.json`
        if (!existsSync(file)) writeFileSync(file, JSON.stringify(document, null, 2))
      } catch (error) {
        logger('error', ['Could not write document to file!! Oh no', 'file', file])
      }
    }
  }
})()
