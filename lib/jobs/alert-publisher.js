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
    intro: `Hei!<br><br><a href="${documentData.webUrl}?web=1">${documentData.fields.LinkFilename}</a> har nettopp blitt håndtert av dokumentpubliseringsjobben.
<br>Du får denne e-posten siden du enten står som ansvarlig for dokumentet, eller publiserte siste versjon.`,
    body: '',
    notConvertedToPdfWarning: '<br><br><strong>OBS! </strong>Det ble gjort endringer i dokumentet ditt like etter at du publiserte det. Det ble derfor ikke konvertert til PDF-format slik som ønsket. For å konvertere dokumentet til PDF-format, må du publisere dokumentet på nytt. Deretter må du lukke dokumentet og ikke gjøre noen endringer før du har mottatt en e-post med beskjed om at dokumentet ditt er klart til publisering på Innsida eller på nettsiden.',
    ending: '<br><br><strong>MERK: </strong>Hvis filnavnet endres vil koblingen mellom kildedokumentet og det publiserte dokumentet ikke fungere, og det vil bli publisert et nytt dokument',
    ending2: '<br><br><strong>MERK: </strong>Grunnen til at filnavnet på det publiserte dokumnetet er så "stygt", er for å unngå å miste koblingen mellom kildedokumentet og det publiserte dokumentet dersom kildedokumentet endrer plassering i dokumentbiblioteket'
  }

  // Innsida publiseringsmail-info
  const publishedVersion = getCorrectPublishedVersionNumber(getDriveItemDataResult.versionNumberToPublish, documentData.libraryConfig.hasVersioning)
  if (documentData.libraryConfig.innsidaPublishing && documentData.flowStatus.publishToInnsida?.result) {
    // Om aktivert og jobb gjennomført
    subject = `Dokumentet ${documentData.fields.LinkFilename} er ${documentData.flowStatus.alreadyPublishedToInnsida ? 'oppdatert' : 'klar til publisering'} på Innsida`
    if (documentData.flowStatus.alreadyPublishedToInnsida) {
      bodyObj.body += `<br><br><strong>Innsida</strong><br>Dokumentet er tidligere publisert på Innsida, og er nå oppdatert til nyeste versjon: ${publishedVersion}, du trenger ikke foreta deg noe på denne fronten 😀
<br>Publiseringen/oppdateringen ble gjort av: ${getDriveItemDataResult.publisher.displayName}
<br>Lenke til det publiserte/oppdaterte dokumentet på Innsida: <a href="${documentData.flowStatus.publishToInnsida.result.webUrl}">${documentData.flowStatus.publishToInnsida.result.webUrl}</a>`
    } else { // første gang det blir publisert
      bodyObj.body += `<br><br><strong>Innsida</strong><br>Dokumentet er klar til publisering på Innsida. Bruk lenken under. Eventuelle oppdateringer i originaldokumentet publiseres automatisk på Innsida.
<br>Publiseringen ble gjort av: ${getDriveItemDataResult.publisher.displayName}
<br>Lenke til det publiserte dokumentet på Innsida: <a href="${documentData.flowStatus.publishToInnsida.result.webUrl}">${documentData.flowStatus.publishToInnsida.result.webUrl}</a>`
    }
  }

  // Web publiseringsmail-info
  if (documentData.libraryConfig.webPublishing && documentData.flowStatus.publishToWeb?.result) {
    if (!subject) {
      subject = `Ditt dokument ${documentData.fields.LinkFilename} er ${documentData.flowStatus.alreadyPublishedToWeb ? 'oppdatert' : 'klar til publisering'} på ${WEB_PUBLISH_CHOICE_NAME}`
    } else {
      subject += `, og ${documentData.flowStatus.alreadyPublishedToWeb ? 'oppdatert' : 'klar til publisering'} på ${WEB_PUBLISH_CHOICE_NAME}`
    }
    if (documentData.flowStatus.alreadyPublishedToWeb) {
      bodyObj.body += `<br><br><strong>${WEB_PUBLISH_CHOICE_NAME}</strong><br>Dokumentet er tidligere publisert på ${WEB_PUBLISH_CHOICE_NAME}, og er nå oppdatert til nyeste versjon: ${publishedVersion}, du trenger ikke foreta deg noe på denne fronten 😀
<br>Publiseringen/oppdateringen ble gjort av: ${getDriveItemDataResult.publisher.displayName}
<br>Lenke til det publiserte/oppdaterte dokumentet på ${WEB_PUBLISH_CHOICE_NAME}: <a href="${documentData.flowStatus.publishToWeb.result.webUrl}">${documentData.flowStatus.publishToWeb.result.webUrl}</a>`
    } else { // første gang det blir publisert
      bodyObj.body += `<br><br><strong>${WEB_PUBLISH_CHOICE_NAME}</strong><br>Dokumentet er klar til publisering på ${WEB_PUBLISH_CHOICE_NAME}. Bruk lenken under. Eventuelle oppdateringer i originaldokumentet publiseres automatisk på ${WEB_PUBLISH_CHOICE_NAME}.
<br>Publiseringen ble gjort av: ${getDriveItemDataResult.publisher.displayName}
<br>Lenke til det publiserte dokumentet på ${WEB_PUBLISH_CHOICE_NAME}:  <a href="${documentData.flowStatus.publishToWeb.result.webUrl}">${documentData.flowStatus.publishToWeb.result.webUrl}</a>`
    }
  }

  // PDF-koonverterings-støtte info
  if (getDriveItemDataResult.couldNotBeConvertedToPdf) {
    bodyObj.body += bodyObj.notConvertedToPdfWarning
  }
  const mailPayload = {
    to: receivers,
    from: `Publiseringsroboten <${mailConfig.sender}>`,
    subject,
    template: {
      templateName: mailConfig.template,
      templateData: {
        body: `${bodyObj.intro}${bodyObj.body}${bodyObj.ending}`,
        signature: {
          name: 'Publiseringsroboten',
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
