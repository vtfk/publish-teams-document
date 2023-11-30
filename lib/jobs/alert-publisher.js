// Let's say we get a new document ready for publishing, and the current version is 5.3 - then we want the modifier that published version 5.0 (to alert the correct person that published the document, not the lates modifier. Hence this job)
const { logger } = require('@vtfk/logger')
const axios = require('../axios-instance')()
const { mailConfig, sourceAuth, COLUMN_NAMES_DOCUMENT_RESPONSIBLE_NAME, WEB_PUBLISH_CHOICE_NAME } = require('../../config')
const getCorrectPublishedVersionNumber = require('../get-correct-published-version-number')
const { createSharepointClient } = require('../sharepoint-client')
const { readFileSync } = require('fs')

const sourceConfig = {
  clientId: sourceAuth.clientId,
  tenantId: sourceAuth.tenantId,
  tenantName: sourceAuth.tenantName,
  pfxcert: readFileSync(sourceAuth.pfxPath).toString('base64'),
  thumbprint: sourceAuth.pfxThumbprint
}
let sourceClient = null // Don't want to create it every time

const alertPublisher = async (documentData) => {
  if (!sourceClient) sourceClient = createSharepointClient(sourceConfig)
  logger('info', ['alertPublisher', 'Finding email receivers'])
  const getDriveItemDataResult = documentData.flowStatus.getDriveItemData.result
  const receivers = [getDriveItemDataResult.publisher.email]
  if (documentData.libraryConfig.hasDocumentResponsible && documentData.fields[`${COLUMN_NAMES_DOCUMENT_RESPONSIBLE_NAME}LookupId`] && documentData.fields[`${COLUMN_NAMES_DOCUMENT_RESPONSIBLE_NAME}LookupId`].length > 0) {
    const docResponsibleLookupId = documentData.fields[`${COLUMN_NAMES_DOCUMENT_RESPONSIBLE_NAME}LookupId`]
    logger('info', ['alertPublisher', `Document has responsible, looking up email for user with lookupId ${docResponsibleLookupId}, in site ${documentData.libraryConfig.siteName}`])
    const docResponsible = (await sourceClient.getSiteUserFromLookupId(documentData.libraryConfig.libraryUrl, docResponsibleLookupId)).d
    logger('info', ['alertPublisher', `Found documentResponsible: ${docResponsible.Email}, adding as receiver, if not same as publisher`])
    if (!receivers.includes(docResponsible.Email)) receivers.push(docResponsible.Email)
  }
  let subject
  const bodyObj = {
    intro: `Hei!<br><br>Dokumentet <a href="${documentData.webUrl}?web=1">${documentData.fields.LinkFilename}</a> har nettopp blitt håndtert av dokumentpubliseringsjobben.
<br>Du får denne e-posten siden du enten står som ansvarlig for dokumentet, eller publiserte siste versjon.`,
    body: '',
    ending: '<br><br><strong>MERK: </strong>Hvis filnavnet endres vil koblingen mellom kildedokumentet og det publiserte dokumenetet ikke fungere, og det vil bli publisert et nytt dokument',
    ending2: '<br><br><strong>MERK: </strong>Grunnen til at filnavnet på det publiserte dokumnetet er så "stygt", er for å unngå å miste koblingen mellom kildedokumentet og det publiserte dokumentet dersom kildedokumentet endrer navn'
  }
  // Sender en mail per publisering (web, Innsida)
  const publishedVersion = getCorrectPublishedVersionNumber(getDriveItemDataResult.versionNumberToPublish, documentData.libraryConfig.hasVersioning)
  if (documentData.libraryConfig.innsidaPublishing && documentData.flowStatus.publishToInnsida?.result) {
    // Om aktivert og jobb gjennomført
    subject = `Dokument ${documentData.fields.LinkFilename} er ${documentData.flowStatus.alreadyPublishedToInnsida ? 'oppdatert' : 'publisert'} på Innsida`
    if (documentData.flowStatus.alreadyPublishedToInnsida) {
      bodyObj.body += `<br><br><strong>Innsida</strong><br>Dokumentet er tidligere publisert på Innsida, og er nå oppdatert til nyeste versjon: ${publishedVersion}, du trenger ikke foreta deg noe på denne fronten 😀
<br>Publiseringen/oppdateringen ble gjort av: ${getDriveItemDataResult.publisher.displayName}
<br>Lenke til det publiserte/oppdaterte dokumentet på Innsida: <a href="${documentData.flowStatus.publishToInnsida.result.webUrl}">${documentData.flowStatus.publishToInnsida.result.webUrl}</a>`
    } else { // første gang det blir publisert
      bodyObj.body += `<br><br><strong>Innsida</strong><br>Hipp hurra! Dokumentet er nå publisert på Innsida, og kan lenkes til på Innsida-sider ved hjelp av lenken under. Oppdateringer på kildedokumentet vil automatisk bli publisert på Innsida.
<br>Publiseringen ble gjort av: ${getDriveItemDataResult.publisher.displayName}
<br>Lenke til det publiserte dokumentet på Innsida: <a href="${documentData.flowStatus.publishToInnsida.result.webUrl}">${documentData.flowStatus.publishToInnsida.result.webUrl}</a>`
    }
  }
  if (documentData.libraryConfig.webPublishing) {
    if (!subject) {
      subject = `Ditt dokument ${documentData.fields.LinkFilename} er ${documentData.flowStatus.alreadyPublishedToWeb ? 'oppdatert' : 'publisert'} på ${WEB_PUBLISH_CHOICE_NAME}`
    } else {
      subject += `, og ${documentData.flowStatus.alreadyPublishedToWeb ? 'oppdatert' : 'publisert'} på ${WEB_PUBLISH_CHOICE_NAME}`
    }
    if (documentData.flowStatus.alreadyPublishedToWeb) {
      bodyObj.body += `<br><br><strong>${WEB_PUBLISH_CHOICE_NAME}</strong><br>Dokumentet er tidligere publisert på ${WEB_PUBLISH_CHOICE_NAME}, og er nå oppdatert til nyeste versjon: ${publishedVersion}, du trenger ikke foreta deg noe på denne fronten 😀
<br>Publiseringen/oppdateringen ble gjort av: ${getDriveItemDataResult.publisher.displayName}
<br>Lenke til det publiserte/oppdaterte dokumentet på ${WEB_PUBLISH_CHOICE_NAME}: <a href="${documentData.flowStatus.publishToWeb.result.webUrl}">${documentData.flowStatus.publishToWeb.result.webUrl}</a>`
    } else { // første gang det blir publisert
      bodyObj.body += `<br><br><strong>${WEB_PUBLISH_CHOICE_NAME}</strong><br>Hipp hurra! Dokumentet er nå publisert på ${WEB_PUBLISH_CHOICE_NAME}, og kan lenkes til på Innsida-sider ved hjelp av lenken under. Oppdateringer på kildedokumentet vil automatisk bli publisert på Innsida.
<br>Publiseringen ble gjort av: ${getDriveItemDataResult.publisher.displayName}
<br>Lenke til det publiserte dokumentet på ${WEB_PUBLISH_CHOICE_NAME}:  <a href="${documentData.flowStatus.publishToWeb.result.webUrl}">${documentData.flowStatus.publishToWeb.result.webUrl}</a>`
    }
  }
  const mailPayload = {
    to: receivers,
    from: 'Publiseringsroboten <noreply@vestfoldfylke.no>',
    subject,
    template: {
      templateName: 'vestfoldfylke',
      templateData: {
        body: `${bodyObj.intro}${bodyObj.body}${bodyObj.ending}`,
        signature: {
          name: 'Publiseringsroboten',
          title: 'Unnasluntrer',
          company: 'Robotavdelingen'
        }
      }
    }
  }

  logger('info', ['alertPublisher', `Sending email to ${receivers.join(', ')}`])
  const { data } = await axios.post(mailConfig.url, mailPayload, { headers: { 'x-functions-key': mailConfig.key } })
  logger('info', ['alertPublisher', `Email sent to ${receivers.join(', ')}, great success`])
  return {
    receivers,
    mailRes: data
  }
}

module.exports = { alertPublisher }
