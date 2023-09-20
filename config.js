require('dotenv').config()

module.exports = {
    statistics: {
    //   url: process.env.STATISTICS_URL || 'url to statistics endpoint',
    //   subscriptionKey: process.env.STATISTICS_SUBSCRIPTION_KEY || 'key to statistics endpoint'
    },
    graphClient: {
      clientId: process.env.GRAPH_CLIENT_ID ?? 'superId',
      clientSecret: process.env.GRAPH_CLIENT_SECRET ?? 'hemmelig hemmelig',
      tenantId: process.env.GRAPH_TENANT_ID ?? 'tenant id',
      scope: process.env.GRAPH_SCOPE ?? 'etSkikkeligSkuup',
      baseurl: process.env.GRAPH_URL || 'tullballfinnes.sharepoint.com',
    },
    columns: {
      publishChoice: process.env.COLUMNS_PUBLISH_CHOICE || 'ptd_publisering',
      publishedVersion: process.env.COLUMNS_PUBLISHED_VERSION || 'ptd_publisert_versjon'
    },
    nodeEnv: process.env.NODE_ENV ?? 'dev',
    // robotEmail: process.env.ROBOT_EMAIL ?? 'robot@robot.com',
    // roomServiceTeamsWebhook: process.env.ROOMSERVICE_TEAMS_WEBHOOK_URL ?? 'teams.com'
  }