const { COLUMN_NAMES_PUBLISHED_SHAREPOINT_URL_NAME, COLUMN_NAMES_PUBLISHED_VERSION_NAME, COLUMN_NAMES_PUBLISHED_WEB_URL_NAME, COLUMN_NAMES_PUBLISHING_CHOICES_NAME, INNSIDA_PUBLISH_CHOICE_NAME, WEB_PUBLISH_CHOICE_NAME } = require('../config')

const setupColumnDefinitions = (sourceLibraryConfig) => {
  const publishingChoiceValues = []
  if (sourceLibraryConfig.innsidaPublishing) publishingChoiceValues.push(INNSIDA_PUBLISH_CHOICE_NAME)
  if (sourceLibraryConfig.webPublishing) publishingChoiceValues.push(WEB_PUBLISH_CHOICE_NAME)
  
  const columnDefinitions = [ // To be able to change column names (or adapt to changes in Sharepoint)
    {
      body: {
        description: 'Hvor skal dokumentet publiseres',
        displayName: 'Publisering',
        enforceUniqueValues: false,
        hidden: false,
        indexed: false,
        name: COLUMN_NAMES_PUBLISHING_CHOICES_NAME,
        choice: {
          allowTextEntry: false,
          choices: publishingChoiceValues,
          displayAs: 'checkBoxes'
        }
      },
      CustomFormatter: `{"elmType":"div","style":{"flex-wrap":"wrap","display":"flex"},"children":[{"forEach":"__INTERNAL__ in @currentField","elmType":"div","style":{"box-sizing":"border-box","padding":"4px 8px 5px 8px","overflow":"hidden","text-overflow":"ellipsis","display":"flex","border-radius":"16px","height":"24px","align-items":"center","white-space":"nowrap","margin":"4px 4px 4px 4px"},"attributes":{"class":{"operator":":","operands":[{"operator":"==","operands":["[$__INTERNAL__]","${INNSIDA_PUBLISH_CHOICE_NAME}"]},"sp-css-backgroundColor-BgCornflowerBlue sp-css-color-CornflowerBlueFont",{"operator":":","operands":[{"operator":"==","operands":["[$__INTERNAL__]","${WEB_PUBLISH_CHOICE_NAME}"]},"sp-css-backgroundColor-BgMintGreen sp-css-color-MintGreenFont","sp-field-borderAllRegular sp-field-borderAllSolid sp-css-borderColor-neutralSecondary"]}]}},"txtContent":"[$__INTERNAL__]"}],"templateId":"BgColorChoicePill"}`
    },
    {
      body: {
        description: 'Forrige publiserte versjon (oppdateres av systemet)',
        displayName: 'Publisert versjon',
        enforceUniqueValues: false,
        hidden: false,
        indexed: false,
        name: COLUMN_NAMES_PUBLISHED_VERSION_NAME,
        text: {
          allowMultipleLines: false,
          appendChangesToExistingText: false,
          linesForEditing: 0,
          maxLength: 255
        }
      }
    }
  ]
  // Conditional columns
  const innsidaUrlCoiumn = {
    body: {
      description: 'Lenke til det publiserte dokumentet i Sharepoint for Innsida',
      displayName: 'Innsida url',
      enforceUniqueValues: false,
      hidden: false,
      indexed: false,
      name: COLUMN_NAMES_PUBLISHED_SHAREPOINT_URL_NAME,
      text: {
        allowMultipleLines: false,
        appendChangesToExistingText: false,
        linesForEditing: 0,
        maxLength: 255
      }
    }
  }
  const webUrlColumn = {
    body: {
      description: 'Lenke til det publiserte dokumentet på internett (nettsider)',
      displayName: 'Web url (nettsider)',
      enforceUniqueValues: false,
      hidden: false,
      indexed: false,
      name: COLUMN_NAMES_PUBLISHED_WEB_URL_NAME,
      text: {
        allowMultipleLines: false,
        appendChangesToExistingText: false,
        linesForEditing: 0,
        maxLength: 255
      }
    }
  }
  // Add if needed
  if (sourceLibraryConfig.innsidaPublishing) columnDefinitions.push(innsidaUrlCoiumn)
  if (sourceLibraryConfig.webPublishing) columnDefinitions.push(webUrlColumn)

  return columnDefinitions
}

const setupPublishView = (sourceLibraryConfig) => {
  const publishView = {
    title: 'Dokumentpublisering',
    columns: [
      "DocIcon",
      "LinkFilename",
      "Modified",
      "Editor",
      "_UIVersionString",
      COLUMN_NAMES_PUBLISHING_CHOICES_NAME,
      COLUMN_NAMES_PUBLISHED_VERSION_NAME
    ]
  }
  // Conditional view columns
  if (sourceLibraryConfig.innsidaPublishing) publishView.columns.push(COLUMN_NAMES_PUBLISHED_SHAREPOINT_URL_NAME)
  if (sourceLibraryConfig.webPublishing) publishView.columns.push(COLUMN_NAMES_PUBLISHED_WEB_URL_NAME)

  return publishView
}

module.exports = { setupColumnDefinitions, setupPublishView }