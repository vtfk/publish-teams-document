require('dotenv').config()

const retryList = (process.env.RETRY_INTERVALS_MINUTES && process.env.RETRY_INTERVALS_MINUTES.split(',').map(numStr => Number(numStr))) || [15, 60, 240, 3600]
retryList.unshift(0)
module.exports = {
  COLUMN_NAMES_PUBLISHED_WEB_URL_NAME: process.env.COLUMN_NAMES_PUBLISHED_WEB_URL_NAME || 'ptd_web_url',
  COLUMN_NAMES_PUBLISHED_SHAREPOINT_URL_NAME: process.env.COLUMN_NAMES_PUBLISHED_SHAREPOINT_URL_NAME || 'ptd_sharepoint_url',
  COLUMN_NAMES_PUBLISHED_VERSION_NAME: process.env.COLUMN_NAMES_PUBLISHED_VERSION_NAME || 'ptd_publisert_versjon',
  COLUMN_NAMES_PUBLISHING_CHOICES_NAME: process.env.COLUMN_NAMES_PUBLISHING_CHOICES_NAME || 'ptd_publisering',
  INNSIDA_PUBLISH_CHOICE_NAME: process.env.INNSIDA_PUBLISH_CHOICE || 'Innsida',
  WEB_PUBLISH_CHOICE_NAME: process.env.INNSIDA_PUBLISH_CHOICE || 'vestfoldfylke.no',

  retryIntervalMinutes: retryList,
  disableDeltaQuery: (process.env.DISABLE_DELTA_QUERY && process.env.DISABLE_DELTA_QUERY === 'true') || false,
  graphBaseUrl: process.env.GRAPH_URL || 'tullballfinnes.sharepoint.com',
  statistics: {
    //   url: process.env.STATISTICS_URL || 'url to statistics endpoint',
    //   subscriptionKey: process.env.STATISTICS_SUBSCRIPTION_KEY || 'key to statistics endpoint'
  },
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
  convertToPdfExtensions: (process.env.CONVERT_TO_PDF_EXTENSIONS && process.env.CONVERT_TO_PDF_EXTENSIONS.split(',')) || ['csv', 'doc', 'docx', 'odp', 'ods', 'odt', 'pot', 'potm', 'potx', 'pps', 'ppsx', 'ppsxm', 'ppt', 'pptm', 'pptx', 'rtf', 'xls', 'xlsx'] // Se supported formats here: https://learn.microsoft.com/en-us/graph/api/driveitem-get-content-format?view=graph-rest-1.0&tabs=http#format-options
}
