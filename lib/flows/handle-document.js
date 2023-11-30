const { retryIntervalMinutes } = require('../../config')
const { logger } = require('@vtfk/logger')
const { writeFileSync, renameSync, unlinkSync, existsSync } = require('fs')
const { getDriveItemData } = require('../jobs/get-drive-item-data')
const { getChoiceColumnValues } = require('./queue-ready-documents')
const { publishToInnsida } = require('../jobs/publish-to-innsida')
const { publishToWeb } = require('../jobs/publish-to-web')
const { setStatusOnSource } = require('../jobs/set-status-on-source')
const { alertPublisher } = require('../jobs/alert-publisher')
const { statistics } = require('../jobs/statistics')
const { COLUMN_NAMES_PUBLISHING_CHOICES_NAME, INNSIDA_PUBLISH_CHOICE_NAME, WEB_PUBLISH_CHOICE_NAME } = require('../../config')

const shouldRunJob = (jobName, documentData) => {
  if (documentData.flowStatus.failed) return false
  if (documentData.flowStatus[jobName]?.jobFinished) return false
  // Conditional jobs
  if (jobName === 'publishToInnsida') {
    if (!documentData.libraryConfig.innsidaPublishing) return false
    if (Array.isArray(documentData.fields[COLUMN_NAMES_PUBLISHING_CHOICES_NAME]) && documentData.fields[COLUMN_NAMES_PUBLISHING_CHOICES_NAME].includes(INNSIDA_PUBLISH_CHOICE_NAME)) return true // publishing choices might be array
    if (getChoiceColumnValues(documentData.fields[COLUMN_NAMES_PUBLISHING_CHOICES_NAME]).includes(INNSIDA_PUBLISH_CHOICE_NAME)) return true // publishing choices might be string (delta and beta endpoint combination)
    return false
  }
  if (jobName === 'publishToWeb') {
    if (!documentData.libraryConfig.webPublishing) return false
    if (Array.isArray(documentData.fields[COLUMN_NAMES_PUBLISHING_CHOICES_NAME]) && documentData.fields[COLUMN_NAMES_PUBLISHING_CHOICES_NAME].includes(WEB_PUBLISH_CHOICE_NAME)) return true // publishing choices might be array
    if (getChoiceColumnValues(documentData.fields[COLUMN_NAMES_PUBLISHING_CHOICES_NAME]).includes(WEB_PUBLISH_CHOICE_NAME)) return true // publishing choices might be string (delta and beta endpoint combination)
    return false
  }
  return true
}

/* Retries forklart

flowStatus.runs er antall ganger flowen HAR kjørt. Den inkrementeres hver gang et nytt forsøk er gjort
retryIntervals er en liste med hvor mange ganger vi skal prøve på nytt. Altså hvis lista er 3 lang, så skal vi totalt kjøre 4 ganger
For å slippe plusser og minuser legger vi derfor til et element først i retryIntervals for å representere den første kjøringen (i config.js)
Første kjøring er kjøring 1 - men runs inkrementeres ikke før vi er ferdige å prøve kjøringen.
Feilhåndteringen får så vite hvor mange ganger jobben er kjørt, og kan bruke flowStatus.runs som index for å sjekke hvor lenge vi skal vente til neste kjøring. Om (flowStatus.runs >= retryIntervals.length), så skal vi ikke prøve mer, og kan gi error-beskjed

*/
const handleFailedJob = async (jobName, documentData, error) => {
  documentData.flowStatus.runs++
  const errorMsg = error.response?.data || error.stack || error.toString()
  documentData.flowStatus[jobName].error = errorMsg
  if (documentData.flowStatus.runs >= retryIntervalMinutes.length) {
    try {
      logger('error', ['Document needs care and love', `Failed in job ${jobName}`, `Runs: ${documentData.flowStatus.runs}/${retryIntervalMinutes.length}. Will not run again. Reset flowStatus.runs and move back to queue to try again`, 'error:', errorMsg])
      // Flytt filen til error folder
      writeFileSync(documentData.flowStatus.documentPath, JSON.stringify(documentData, null, 2))
      renameSync(documentData.flowStatus.documentPath, `./documents/error/${documentData.flowStatus.documentName}`)
    } catch (error) {
      logger('error', ['Dritt og møkk... vi fikk ikke lagret dokumentet til errorfolder. Ting vil potensielt bli kjørt dobbelt opp', `jobben den stoppet på: ${jobName}`, 'Error', error.stack || error.toString()])
    }
    return // Stop here
  }
  const minutesToWait = retryIntervalMinutes[documentData.flowStatus.runs]
  const now = new Date()
  documentData.flowStatus.nextRun = new Date(now.setMinutes(now.getMinutes() + minutesToWait)).toISOString()
  try {
    logger('warn', [`Failed in job ${jobName}`, `Runs: ${documentData.flowStatus.runs}/${retryIntervalMinutes.length}. Will retry in ${minutesToWait} minutes`, 'error:', errorMsg])
    // Lagre hele documentData oppå seg selv i queue
    writeFileSync(documentData.flowStatus.documentPath, JSON.stringify(documentData, null, 2))
  } catch (error) {
    logger('error', ['Dritt og møkk... vi fikk ikke lagret flowStatus til errorfolder. Ting vil potensielt bli kjørt dobbelt opp', `jobben den stoppet på: ${jobName}`, 'Error', error.stack || error.toString()])
  }
}

const finishDocument = (documentData) => {
  logger('info', ['finishDocument', 'All jobs finished, cleaning up cached files and moving from queue'])
  const getDriveItemDataResult = documentData.flowStatus.getDriveItemData.result
  logger('info', ['finishDocument', `Deleting cached file ${getDriveItemDataResult.cachedFile.path} if it exists`])
  if (existsSync(getDriveItemDataResult.cachedFile.path)) unlinkSync(getDriveItemDataResult.cachedFile.path)
  logger('info', ['finishDocument', `Successfully deleted cached file ${getDriveItemDataResult.cachedFile.path} (if it existed), writing result to finished`])
  writeFileSync(`./documents/finished/${documentData.flowStatus.documentName}.json`, JSON.stringify(documentData, null, 2))
  logger('info', ['finishDocument', `Successfully created document in finished dir, deleting original from queue (if it exists)`])
  if (existsSync(documentData.flowStatus.documentPath)) unlinkSync(documentData.flowStatus.documentPath)
  logger('info', ['finishDocument', `Successfully deleted docuument from queue, all is good :)`])
}

module.exports = async (documentData) => {
  documentData.flowStatus.failed = false
  {
    const jobName = 'getDriveItemData'
    if (shouldRunJob(jobName, documentData)) {
      if (!documentData.flowStatus[jobName]) documentData.flowStatus[jobName] = { jobFinished: false }
      try {
        const result = await getDriveItemData(documentData)
        documentData.flowStatus[jobName].result = result
        documentData.flowStatus[jobName].jobFinished = true
      } catch (error) {
        documentData.flowStatus.failed = true
        handleFailedJob(jobName, documentData, error)
      }
    }
  }
  {
    const jobName = 'publishToInnsida' // Conditional (sjekk shouldRunJob om du lurer)
    if (shouldRunJob(jobName, documentData)) {
      if (!documentData.flowStatus[jobName]) documentData.flowStatus[jobName] = { jobFinished: false }
      try {
        const result = await publishToInnsida(documentData)
        documentData.flowStatus[jobName].result = result
        documentData.flowStatus[jobName].jobFinished = true
      } catch (error) {
        documentData.flowStatus.failed = true
        handleFailedJob(jobName, documentData, error)
      }
    }
  }
  {
    const jobName = 'publishToWeb' // Conditional (sjekk shouldRunJob om du lurer)
    if (shouldRunJob(jobName, documentData)) {
      if (!documentData.flowStatus[jobName]) documentData.flowStatus[jobName] = { jobFinished: false }
      try {
        const result = await publishToWeb(documentData)
        documentData.flowStatus[jobName].result = result
        documentData.flowStatus[jobName].jobFinished = true
      } catch (error) {
        documentData.flowStatus.failed = true
        handleFailedJob(jobName, documentData, error)
      }
    }
  }
  {
    const jobName = 'setStatusOnSource'
    if (shouldRunJob(jobName, documentData)) {
      if (!documentData.flowStatus[jobName]) documentData.flowStatus[jobName] = { jobFinished: false }
      try {
        const result = await setStatusOnSource(documentData)
        documentData.flowStatus[jobName].result = result
        documentData.flowStatus[jobName].jobFinished = true
      } catch (error) {
        documentData.flowStatus.failed = true
        handleFailedJob(jobName, documentData, error)
      }
    }
  }
  {
    const jobName = 'alertPublisher'
    if (shouldRunJob(jobName, documentData)) {
      if (!documentData.flowStatus[jobName]) documentData.flowStatus[jobName] = { jobFinished: false }
      try {
        const result = await alertPublisher(documentData)
        documentData.flowStatus[jobName].result = result
        documentData.flowStatus[jobName].jobFinished = true
      } catch (error) {
        documentData.flowStatus.failed = true
        handleFailedJob(jobName, documentData, error)
      }
    }
  }
  {
    const jobName = 'statistics'
    if (shouldRunJob(jobName, documentData)) {
      if (!documentData.flowStatus[jobName]) documentData.flowStatus[jobName] = { jobFinished: false }
      try {
        const result = await statistics(documentData)
        documentData.flowStatus[jobName].result = result
        documentData.flowStatus[jobName].jobFinished = true
      } catch (error) {
        documentData.flowStatus.failed = true
        handleFailedJob(jobName, documentData, error)
      }
    }
  }
  {
    const jobName = 'finishDocument'
    if (shouldRunJob(jobName, documentData)) {
      if (!documentData.flowStatus[jobName]) documentData.flowStatus[jobName] = { jobFinished: false }
      try {
        const result = await finishDocument(documentData)
        documentData.flowStatus[jobName].result = result
        documentData.flowStatus[jobName].jobFinished = true
      } catch (error) {
        documentData.flowStatus.failed = true
        handleFailedJob(jobName, documentData, error)
      }
    }
  }
}
