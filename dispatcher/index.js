(async () => {
  const siteConfig = require('../publish-sites')
  const { logger } = require('@vtfk/logger')
  const { pagedGraphRequest } = require('../lib/graph-request')
  const { columnDefinitions } = require('../config')
  const { writeFileSync, mkdirSync, existsSync } = require('fs')

  // Make sure directories are setup correct
  const syncDir = (dir) => {
    if (!existsSync(dir)) {
      logger('info', ['dispatcher', `${dir} folder does not exist, creating...`])
      mkdirSync(dir)
    }
  }
  syncDir('./documents')
  syncDir('./documents/queue')
  syncDir('./documents/finished')
  syncDir('./documents/error')

  const publishSites = siteConfig.filter(site => site.enabled)

  if (publishSites.length === 0) logger('warn', ['no sites enabled'])

  for (const site of publishSites) {
    const select = '$select=createdDateTime,id,webUrl,createdBy,lastModifiedBy,fields'
    const resource = `sites/${site.siteId}/lists/${site.listID}/drive/list/items`
    const query = `expand=fields&${select}&$top=10`

    logger('info', ['dispatcher', 'fetching files from sharepoint', `Sitename: ${site.siteName}`, `Listname: ${site.listName}`])

    const data = await pagedGraphRequest(resource, { queryParams: query, onlyFirstPage: false })

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
        const file = `./documents/queue/${site.siteName}-${site.listName}-${document.fields.LinkFilename}-${document.fields.Modified.substring(0, document.fields.Modified.indexOf('T'))}.json`
        if (!existsSync(file)) writeFileSync(file, JSON.stringify(document, null, 2))
      } catch (error) {
        logger('error', ['Could not write document to file!! Oh no', 'file', file])
      }
    }
  }
})()
