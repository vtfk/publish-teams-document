require('dotenv').config()

module.exports = {
  COLUMN_NAMES_PUBLISHED_WEB_URL_NAME: process.env.COLUMN_NAMES_PUBLISHED_WEB_URL_NAME || 'ptd_web_url',
  COLUMN_NAMES_PUBLISHED_SHAREPOINT_URL_NAME: process.env.COLUMN_NAMES_PUBLISHED_SHAREPOINT_URL_NAME || 'ptd_sharepoint_url',
  COLUMN_NAMES_PUBLISHED_VERSION_NAME: process.env.COLUMN_NAMES_PUBLISHED_VERSION_NAME || 'ptd_publisert_versjon',
  COLUMN_NAMES_PUBLISHING_CHOICES_NAME: process.env.COLUMN_NAMES_PUBLISHING_CHOICES_NAME || 'ptd_publisering',
  INNSIDA_PUBLISH_CHOICE_NAME: process.env.INNSIDA_PUBLISH_CHOICE || 'Innsida',
  WEB_PUBLISH_CHOICE_NAME: process.env.INNSIDA_PUBLISH_CHOICE || 'vestfoldfylke.no',

  disableDeltaQuery: (process.env.DISABLE_DELTA_QUERY && process.env.DISABLE_DELTA_QUERY === 'true') || false,
  
  statistics: {
    //   url: process.env.STATISTICS_URL || 'url to statistics endpoint',
    //   subscriptionKey: process.env.STATISTICS_SUBSCRIPTION_KEY || 'key to statistics endpoint'
  },
  // Source (where to get files)
  sourceGraphClient: {
    clientId: process.env.SOURCE_GRAPH_CLIENT_ID ?? 'superId',
    clientSecret: process.env.SOURCE_GRAPH_CLIENT_SECRET ?? 'hemmelig hemmelig',
    tenantId: process.env.SOURCE_GRAPH_TENANT_ID ?? 'tenant id',
    scope: process.env.GRAPH_SCOPE ?? 'etSkikkeligSkuup',
    baseurl: process.env.GRAPH_URL || 'tullballfinnes.sharepoint.com'
  },
  // Source (where to get files)
  sourceSharepointClient: {
    clientId: process.env.SOURCE_GRAPH_CLIENT_ID ?? 'superId',
    tenantId: process.env.SOURCE_GRAPH_TENANT_ID ?? 'tenant id',
    tenantName: process.env.SOURCE_SP_TENANT_NAME ?? 'tenant name',
    pfxPath: process.env.SOURCE_SP_PFX_PATH ?? '',
    pfxBase64: process.env.SOURCE_SP_PFX_BASE64 ?? '',
    pfxPassphrase: process.env.SOURCE_SP_PFX_PASSPHRASE ?? null,
    pfxThumbprint: process.env.SOURCE_SP_PFX_THUMBPRINT ?? ''
  },
  // Destination (where to upload files)
  destinationGraphClient: {
    clientId: process.env.DESTINATION_GRAPH_CLIENT_ID ?? 'superId',
    clientSecret: process.env.DESTINATION_GRAPH_CLIENT_SECRET ?? 'hemmelig hemmelig',
    tenantId: process.env.DESTINATION_GRAPH_TENANT_ID ?? 'tenant id',
    scope: process.env.GRAPH_SCOPE ?? 'etSkikkeligSkuup',
    baseurl: process.env.GRAPH_URL || 'tullballfinnes.sharepoint.com'
  },
  destinationLibrary: {
    siteId: process.env.DESTINATION_SITE_ID || 'site hvor skal dokumenter havne på sharepoint',
    listId: process.env.DESTINATION_LIST_ID || 'dokumentbibliotek der dokumenter skal havne på sharepoint'
  },
  convertToPdfExtensions: (process.env.CONVERT_TO_PDF_EXTENSIONS && process.env.CONVERT_TO_PDF_EXTENSIONS.split(',')) || ['csv', 'doc', 'docx', 'odp', 'ods', 'odt', 'pot', 'potm', 'potx', 'pps', 'ppsx', 'ppsxm', 'ppt', 'pptm', 'pptx', 'rtf', 'xls', 'xlsx'] // Se supported formats here: https://learn.microsoft.com/en-us/graph/api/driveitem-get-content-format?view=graph-rest-1.0&tabs=http#format-options
}
