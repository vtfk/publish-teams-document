require('dotenv').config()

const retryList = (process.env.RETRY_INTERVALS_MINUTES && process.env.RETRY_INTERVALS_MINUTES.split(',').map(numStr => Number(numStr))) || [15, 60, 240, 3600]
retryList.unshift(0)
module.exports = {
  COLUMN_NAMES_PUBLISHED_WEB_URL_NAME: process.env.COLUMN_NAMES_PUBLISHED_WEB_URL_NAME || 'ptd_web_url',
  COLUMN_NAMES_PUBLISHED_SHAREPOINT_URL_NAME: process.env.COLUMN_NAMES_PUBLISHED_SHAREPOINT_URL_NAME || 'ptd_sharepoint_url',
  COLUMN_NAMES_PUBLISHED_VERSION_NAME: process.env.COLUMN_NAMES_PUBLISHED_VERSION_NAME || 'ptd_publisert_versjon',
  COLUMN_NAMES_PUBLISHING_CHOICES_NAME: process.env.COLUMN_NAMES_PUBLISHING_CHOICES_NAME || 'ptd_publisering',
  COLUMN_NAMES_DOCUMENT_RESPONSIBLE_NAME: process.env.COLUMN_NAMES_DOCUMENT_RESPONSIBLE_NAME || 'ptd_doc_responsible',
  COLUMN_NAMES_PUBLISHED_BY_NAME: process.env.COLUMN_NAMES_PUBLISHED_BY_NAME || 'ptd_published_by',
  INNSIDA_PUBLISH_CHOICE_NAME: process.env.INNSIDA_PUBLISH_CHOICE || 'Innsida',
  WEB_PUBLISH_CHOICE_NAME: process.env.WEB_PUBLISH_CHOICE_NAME || 'vestfoldfylke.no',

  webPublishBaseUrl: process.env.WEB_PUBLISH_BASE_URL || 'https://www2.suppe.no/docs',
  webPublishDestinationPath: process.env.WEB_PUBLISH_DESTINATION_PATH || './webPublishing',
  retryIntervalMinutes: retryList,
  deleteFinishedAfterDays: process.env.DELETE_FINISHED_AFTER_DAYS || '30',
  disableDeltaQuery: (process.env.DISABLE_DELTA_QUERY && process.env.DISABLE_DELTA_QUERY === 'true') || false,
  graphBaseUrl: process.env.GRAPH_URL || 'tullballfinnes.sharepoint.com',
  // Source (where to get files)
  sourceAuth: {
    clientId: process.env.SOURCE_AUTH_CLIENT_ID ?? 'superId',
    tenantId: process.env.SOURCE_AUTH_TENANT_ID ?? 'tenant id',
    tenantName: process.env.SOURCE_AUTH_TENANT_NAME ?? 'tenant name',
    pfxPath: process.env.SOURCE_AUTH_PFX_PATH ?? '',
    pfxPassphrase: process.env.SOURCE_AUTH_PFX_PASSPHRASE ?? null,
    pfxThumbprint: process.env.SOURCE_AUTH_PFX_THUMBPRINT ?? ''
  },
  // Destination
  destinationAuth: {
    clientId: process.env.DESTINATION_AUTH_CLIENT_ID ?? 'superId',
    tenantId: process.env.DESTINATION_AUTH_TENANT_ID ?? 'tenant id',
    tenantName: process.env.DESTINATION_AUTH_TENANT_NAME ?? 'tenant name',
    pfxPath: process.env.DESTINATION_AUTH_PFX_PATH ?? '',
    pfxPassphrase: process.env.DESTINATION_AUTH_PFX_PASSPHRASE ?? null,
    pfxThumbprint: process.env.DESTINATION_AUTH_PFX_THUMBPRINT ?? ''
  },
  destinationLibrary: {
    libraryUrl: process.env.DESTINATION_LIBRARY_URL || 'site hvor skal dokumenter havne på sharepoint',
    siteId: process.env.DESTINATION_SITE_ID || 'site hvor skal dokumenter havne på sharepoint',
    listId: process.env.DESTINATION_LIST_ID || 'dokumentbibliotek der dokumenter skal havne på sharepoint'
  },
  convertToPdfExtensions: (process.env.CONVERT_TO_PDF_EXTENSIONS && process.env.CONVERT_TO_PDF_EXTENSIONS.split(',')) || ['csv', 'doc', 'docx', 'odp', 'ods', 'odt', 'pot', 'potm', 'potx', 'pps', 'ppsx', 'ppsxm', 'ppt', 'pptm', 'pptx', 'rtf', 'xls', 'xlsx'], // Se supported formats here: https://learn.microsoft.com/en-us/graph/api/driveitem-get-content-format?view=graph-rest-1.0&tabs=http#format-options
  mailConfig: {
    url: process.env.MAIL_URL || 'postmann-pat.vtfk.no',
    key: process.env.MAIL_KEY || 'secretkey',
    sender: process.env.MAIL_SENDER || 'noreply@vestfoldfylke.no',
    template: process.env.MAIL_TEMPLATE || 'vestfoldfylke'
  },
  statisticsConfig: {
    url: process.env.STATISTICS_URL || 'statistikkmann-pat.vtfk.no',
    key: process.env.STATISTICS_KEY || 'secretkey'
  }
}
