(async () => {
  const sourceLibrariesConfig = require('../config/source-libraries')
  const { logger, logConfig } = require('@vtfk/logger')
  const { createLocalLogger } = require('../lib/local-logger')
  const { mkdirSync, existsSync, readdirSync } = require('fs')
  const { queueReadyDocuments } = require('../lib/flows/queue-ready-documents')
  const handleDocument = require('../lib/flows/handle-document')

  // Set up logging
  logConfig({
    prefix: 'queueAndPublishReadyDocuments',
    teams: {
      onlyInProd: false
    },
    localLogger: createLocalLogger('queue-and-publish-ready-documents')
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
  syncDir('./documents/file-cache')

  // Queue ready documents
  /* TESTING BELOW, DONT GIDD TO RUN QUEUE */

  try {
    await queueReadyDocuments()
  } catch (error) {
    logger('error', ['Failed when queueing ready documents', 'error', error.response?.data || error.stack || error.toString()])
    // Ingen fare å kjøre på videre å ta de dokumentet som evt ligger der, så vi bare fortsetter.
  }

  // For hvert dokument i køen - sjekk om det skal kjøres - kjør handledocument
  const queue = readdirSync('./documents/queue')
  for (const document of queue) {
    logConfig({
      prefix: `queueAndPublishReadyDocuments - ${document}`
    })
    logger('info', ['Getting flowStatus, checking if ready for run'])
    let documentData
    try {
      documentData = require(`../documents/queue/${document}`)
      if (!documentData.flowStatus) throw new Error('Flowstatus is missing, doc has not been set up correctly...')
      const now = new Date()
      if (now < new Date(documentData.flowStatus.nextRun)) {
        logger('info', ['Not ready for retry, skipping document for now'])
        continue
      }
    } catch (error) {
      logger('error', ['Could not get document json, skipping document. Check error', error.stack || error.toString()])
      continue
    }
    logConfig({
      prefix: `queueAndPublishReadyDocuments - ${document} - ${documentData.webUrl}`
    })
    logger('info', ['Document is ready for run - lets gooo!'])
    try {
      await handleDocument(documentData)
    } catch (error) {
      logger('error', ['Unhandled error! Skipping document - jobs might run again... Please check', error.response?.data || error.stack || error.toString()])
      continue
    }
  }
})()
