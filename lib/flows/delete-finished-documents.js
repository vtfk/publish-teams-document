const { logger } = require('@vtfk/logger')
const { deleteFinishedAfterDays } = require('../../config')
const { readdirSync, unlinkSync } = require('fs')

const deleteFinishedDocuments = () => {
  const finishedDocs = readdirSync('./documents/finished')
  const now = new Date()
  for (const document of finishedDocs) {
    const { flowStatus: { createdTimeStamp } } = require(`../../documents/finished/${document}`)
    const daysOld = Math.floor((now - new Date(createdTimeStamp)) / (1000 * 60 * 60 * 24)) // No worries with daylightsavings here :) We can live with a day fra eller til
    if (daysOld > Number(deleteFinishedAfterDays)) {
      logger('info', ['deleteFinishedDocuments', `${document} is ${daysOld} days old, which is above timelimit for deletion: ${deleteFinishedAfterDays}, deleting.`])
      try {
        unlinkSync(`./documents/finished/${document}`)
      } catch (error) {
        logger('warn', ['deleteFinishedDocuments', `What, ${document} avoided deletion! It will live to see another day (but probably not for long)`, error.stack || error.toString()])
      }
    } else {
      logger('info', ['deleteFinishedDocuments', `${document} is ${daysOld} days old, which is not above timelimit for deletion: ${deleteFinishedAfterDays}, will leave you alone for now document...`])
    }
  }
  logger('info', ['deleteFinishedDocuments', 'finished deleting documents'])
}

module.exports = { deleteFinishedDocuments }
