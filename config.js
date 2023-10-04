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
  sharepointClient: {
    clientId: process.env.GRAPH_CLIENT_ID ?? 'superId',
    tenantId: process.env.GRAPH_TENANT_ID ?? 'tenant id',
    tenantName: process.env.SP_TENANT_NAME ?? 'tenant name',
    pfxPath: process.env.SP_PFX_PATH ?? '',
    pfxBase64: process.env.SP_PFX_BASE64 ?? '',
    pfxPassphrase: process.env.SP_PFX_PASSPHRASE ?? null,
    pfxThumbprint: process.env.SP_PFX_THUMBPRINT ?? ''
  },
  publishChoices: {
    internalChoiceValue: process.env.PUBLISH_CHOICES_INTERNAL_CHOICE_VALUE || 'Innsida',
    publicWebChoiceValue: process.env.PUBLISH_CHOICES_PUBLIC_WEB_CHOICE_VALUE || 'vtfk.no'
  },
  columnDefinitions: { // To be able to change column names (or adapt to changes in Sharepoint)
    publishingChoices: {
      name: process.env.COLUMN_NAMES_PUBLISHING_CHOICES_NAME || 'ptd_publisering',
      body: {
        description: 'Hvor skal dokumentet publiseres',
        displayName: 'Publisering',
        enforceUniqueValues: false,
        hidden: false,
        indexed: false,
        name: process.env.COLUMN_NAMES_PUBLISHING_CHOICES_NAME || 'ptd_publisering',
        choice: {
          allowTextEntry: false,
          choices: (process.env.COLUMN_NAMES_PUBLISHING_CHOICES_VALUES && process.env.COLUMN_NAMES_PUBLISHING_VALUES.split(',')) || ['Innsida', 'vtfk.no'],
          displayAs: 'checkBoxes'
        }
      },
      CustomFormatter: "{\"elmType\":\"div\",\"style\":{\"flex-wrap\":\"wrap\",\"display\":\"flex\"},\"children\":[{\"forEach\":\"__INTERNAL__ in @currentField\",\"elmType\":\"div\",\"style\":{\"box-sizing\":\"border-box\",\"padding\":\"4px 8px 5px 8px\",\"overflow\":\"hidden\",\"text-overflow\":\"ellipsis\",\"display\":\"flex\",\"border-radius\":\"16px\",\"height\":\"24px\",\"align-items\":\"center\",\"white-space\":\"nowrap\",\"margin\":\"4px 4px 4px 4px\"},\"attributes\":{\"class\":{\"operator\":\":\",\"operands\":[{\"operator\":\"==\",\"operands\":[\"[$__INTERNAL__]\",\"Innsida\"]},\"sp-css-backgroundColor-BgCornflowerBlue sp-css-color-CornflowerBlueFont\",{\"operator\":\":\",\"operands\":[{\"operator\":\"==\",\"operands\":[\"[$__INTERNAL__]\",\"vtfk.no\"]},\"sp-css-backgroundColor-BgMintGreen sp-css-color-MintGreenFont\",\"sp-field-borderAllRegular sp-field-borderAllSolid sp-css-borderColor-neutralSecondary\"]}]}},\"txtContent\":\"[$__INTERNAL__]\"}],\"templateId\":\"BgColorChoicePill\"}"
    },
    publishedVersion: {
      name: process.env.COLUMN_NAMES_PUBLISHED_VERSION_NAME || 'ptd_publisert_versjon',
      body: {
        description: 'Forrige publiserte versjon (oppdateres av systemet)',
        displayName: 'Publisert versjon',
        enforceUniqueValues: false,
        hidden: false,
        indexed: false,
        name: process.env.COLUMN_NAMES_PUBLISHED_VERSION_NAME || 'ptd_publisert_versjon',
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
