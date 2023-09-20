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
    baseurl: process.env.GRAPH_URL || 'tullballfinnes.sharepoint.com'
  },
  publishChoices: {
    internalChoiceValue: process.env.PUBLISH_CHOICES_INTERNAL_CHOICE_VALUE || 'Innsida',
    publicWebChoiceValue: process.env.PUBLISH_CHOICES_PUBLIC_WEB_CHOICE_VALUE || 'vtfk.no'
  },
  columnDefinitions: { // To be able to change column names (or adapt to changes in Sharepoint)
    publishingChoices: {
      name: process.env.COLUMN_NAMES_PUBLISHING_CHOICES_NAME || 'ptd_publisering_huhu',
      body: {
        description: 'Hvor skal dokumentet publiseres',
        displayName: 'Publisering',
        enforceUniqueValues: false,
        hidden: false,
        indexed: false,
        name: process.env.COLUMN_NAMES_PUBLISHING_NAME || 'ptd_publisering_huhu',
        choice: {
          allowTextEntry: false,
          choices: (process.env.COLUMN_NAMES_PUBLISHING_CHOICES_VALUES && process.env.COLUMN_NAMES_PUBLISHING_VALUES.split(',')) || ['Innsida', 'vtfk.no'],
          displayAs: 'checkBoxes'
        }
      }
    },
    publishedVersion: {
      name: process.env.COLUMN_NAMES_PUBLISHED_VERSION_NAME || 'ptd_publisert_versjon_hei',
      body: {
        description: 'Forrige publiserte versjon (oppdateres av systemet)',
        displayName: 'Publisert versjon',
        enforceUniqueValues: false,
        hidden: false,
        indexed: false,
        name: process.env.COLUMN_NAMES_PUBLISHED_VERSION_NAME || 'ptd_publisert_versjon_hei',
        text: {
          allowMultipleLines: false,
          appendChangesToExistingText: false,
          linesForEditing: 0,
          maxLength: 255
        }
      }
    },
  },
  nodeEnv: process.env.NODE_ENV ?? 'dev'
  // robotEmail: process.env.ROBOT_EMAIL ?? 'robot@robot.com',
  // roomServiceTeamsWebhook: process.env.ROOMSERVICE_TEAMS_WEBHOOK_URL ?? 'teams.com'
}
