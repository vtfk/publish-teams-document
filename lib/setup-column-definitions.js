const { COLUMN_NAMES_PUBLISHED_SHAREPOINT_URL_NAME, COLUMN_NAMES_PUBLISHED_VERSION_NAME, COLUMN_NAMES_PUBLISHED_WEB_URL_NAME, COLUMN_NAMES_PUBLISHING_CHOICES_NAME, INNSIDA_PUBLISH_CHOICE_NAME, WEB_PUBLISH_CHOICE_NAME, COLUMN_NAMES_DOCUMENT_RESPONSIBLE_NAME, COLUMN_NAMES_PUBLISHED_BY_NAME } = require('../config')

const setupSourceColumnDefinitions = (sourceLibraryConfig) => {
  const publishingChoiceValues = []
  if (sourceLibraryConfig.innsidaPublishing) publishingChoiceValues.push(INNSIDA_PUBLISH_CHOICE_NAME)
  if (sourceLibraryConfig.webPublishing) publishingChoiceValues.push(WEB_PUBLISH_CHOICE_NAME)

  const columnDefinitions = [ // To be able to change column names (or adapt to changes in Sharepoint)
    {
      body: {
        description: 'Hvor skal dokumentet publiseres',
        displayName: 'Publiseres til',
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
    },
    {
      body: {
        description: 'Hvem publiserte siste versjon',
        displayName: 'Sist publisert av',
        enforceUniqueValues: false,
        hidden: false,
        indexed: false,
        name: COLUMN_NAMES_PUBLISHED_BY_NAME,
        personOrGroup: {
          allowMultipleSelection: false,
          displayAs: 'nameWithPresence',
          chooseFromType: 'peopleOnly'
        }
      }
    }
  ]
  // Conditional columns
  const innsidaUrlCoiumn = {
    body: {
      description: 'Lenke til bruk på Innsida',
      displayName: 'Url til Innsida',
      enforceUniqueValues: false,
      hidden: false,
      indexed: false,
      name: COLUMN_NAMES_PUBLISHED_SHAREPOINT_URL_NAME,
      text: {
        allowMultipleLines: true,
        appendChangesToExistingText: false,
        linesForEditing: 0,
        maxLength: 1000
      }
    }
  }
  const webUrlColumn = {
    body: {
      description: `Lenke til bruk på nettsiden (${WEB_PUBLISH_CHOICE_NAME})`,
      displayName: 'Url til nettsiden',
      enforceUniqueValues: false,
      hidden: false,
      indexed: false,
      name: COLUMN_NAMES_PUBLISHED_WEB_URL_NAME,
      text: {
        allowMultipleLines: true,
        appendChangesToExistingText: false,
        linesForEditing: 0,
        maxLength: 1000
      }
    }
  }
  const documentResponsibleColumn = {
    body: {
      description: 'Ansvarlig for dokumentet (får varsling ved nye publiseringer av dette dokumentet)',
      displayName: 'Dokumentansvarlig',
      enforceUniqueValues: false,
      hidden: false,
      indexed: false,
      name: COLUMN_NAMES_DOCUMENT_RESPONSIBLE_NAME,
      personOrGroup: {
        allowMultipleSelection: false,
        displayAs: 'nameWithPresence',
        chooseFromType: 'peopleOnly'
      }
    }
  }
  // Add if needed
  if (sourceLibraryConfig.innsidaPublishing) columnDefinitions.push(innsidaUrlCoiumn)
  if (sourceLibraryConfig.webPublishing) columnDefinitions.push(webUrlColumn)
  if (sourceLibraryConfig.hasDocumentResponsible) columnDefinitions.push(documentResponsibleColumn)

  return columnDefinitions
}

const setupSourcePublishView = (sourceLibraryConfig) => {
  const publishView = {
    title: 'Dokumentpublisering',
    columns: [
      'DocIcon',
      'LinkFilename',
      'Modified',
      'Editor',
      '_UIVersionString',
      COLUMN_NAMES_PUBLISHING_CHOICES_NAME,
      COLUMN_NAMES_PUBLISHED_VERSION_NAME,
      COLUMN_NAMES_PUBLISHED_BY_NAME
    ],
    removeColumnsIfExists: []
  }
  // Conditional view columns
  if (sourceLibraryConfig.innsidaPublishing) {
    publishView.columns.push(COLUMN_NAMES_PUBLISHED_SHAREPOINT_URL_NAME)
  } else {
    publishView.removeColumnsIfExists.push(COLUMN_NAMES_PUBLISHED_SHAREPOINT_URL_NAME)
  }
  if (sourceLibraryConfig.webPublishing) {
    publishView.columns.push(COLUMN_NAMES_PUBLISHED_WEB_URL_NAME)
  } else {
    publishView.removeColumnsIfExists.push(COLUMN_NAMES_PUBLISHED_WEB_URL_NAME)
  }
  if (sourceLibraryConfig.hasDocumentResponsible) {
    publishView.columns.push(COLUMN_NAMES_DOCUMENT_RESPONSIBLE_NAME)
  } else {
    publishView.removeColumnsIfExists.push(COLUMN_NAMES_DOCUMENT_RESPONSIBLE_NAME)
  }

  return publishView
}

const setupDestinationColumnDefinitions = () => {
  const columnDefinitions = [ // To be able to change column names (or adapt to changes in Sharepoint)
    {
      body: {
        description: 'Hvilken site kommer dokumentet fra',
        displayName: 'Kildesite-navn',
        enforceUniqueValues: false,
        hidden: false,
        indexed: false,
        name: 'kildesite_navn',
        text: {
          allowMultipleLines: false,
          appendChangesToExistingText: false,
          linesForEditing: 0,
          maxLength: 255
        }
      }
    },
    {
      body: {
        description: 'Hvilket bilbiotek kommer dokumentet fra',
        displayName: 'Kildebibliotek-navn',
        enforceUniqueValues: false,
        hidden: false,
        indexed: false,
        name: 'kildebibliotek_navn',
        text: {
          allowMultipleLines: false,
          appendChangesToExistingText: false,
          linesForEditing: 0,
          maxLength: 255
        }
      }
    },
    {
      body: {
        description: 'Personen som publiserte dokumentet',
        displayName: 'Publisert av',
        enforceUniqueValues: false,
        hidden: false,
        indexed: false,
        name: 'kilde_publisher',
        text: {
          allowMultipleLines: false,
          appendChangesToExistingText: false,
          linesForEditing: 0,
          maxLength: 255
        }
        /* Drit å oppdatere sånt felt inntil videre...
        personOrGroup: {
          allowMultipleSelection: false,
          displayAs: 'nameWithPresence',
          chooseFromType: 'peopleOnly'
        } */
      }
    },
    {
      body: {
        description: 'Publisert versjon i kildebiblioteket',
        displayName: 'Publisert versjon',
        enforceUniqueValues: false,
        hidden: false,
        indexed: false,
        name: 'kilde_published_version',
        text: {
          allowMultipleLines: false,
          appendChangesToExistingText: false,
          linesForEditing: 0,
          maxLength: 255
        }
      }
    },
    {
      body: {
        description: 'Når ble dokumentet publisert',
        displayName: 'Publisert dato',
        enforceUniqueValues: false,
        hidden: false,
        indexed: false,
        name: 'kilde_published_date',
        dateTime: {
          displayAs: 'default',
          format: 'dateTime'
        }
      }
    },
    {
      body: {
        description: 'Lenke til dette dokumentet',
        displayName: 'Innisda lenke',
        enforceUniqueValues: false,
        hidden: false,
        indexed: false,
        name: 'innsida_weburl',
        text: {
          allowMultipleLines: true,
          appendChangesToExistingText: false,
          linesForEditing: 0,
          maxLength: 1000
        }
      }
    },
    {
      body: {
        description: 'Hvilken tenant kommer dokumentet fra',
        displayName: 'Kilde tenant',
        enforceUniqueValues: false,
        hidden: false,
        indexed: false,
        name: 'kildetenant_name',
        text: {
          allowMultipleLines: false,
          appendChangesToExistingText: false,
          linesForEditing: 0,
          maxLength: 255
        }
      }
    },
    {
      body: {
        description: 'SiteId for der dokumentet kommer fra',
        displayName: 'Kilde siteId',
        enforceUniqueValues: false,
        hidden: false,
        indexed: false,
        name: 'kildesite_id',
        text: {
          allowMultipleLines: false,
          appendChangesToExistingText: false,
          linesForEditing: 0,
          maxLength: 255
        }
      }
    },
    {
      body: {
        description: 'ListId for der dokumentet kommer fra',
        displayName: 'Kilde listId',
        enforceUniqueValues: false,
        hidden: false,
        indexed: false,
        name: 'kildelist_id',
        text: {
          allowMultipleLines: false,
          appendChangesToExistingText: false,
          linesForEditing: 0,
          maxLength: 255
        }
      }
    },
    {
      body: {
        description: 'ItemId for der dokumentet kommer fra',
        displayName: 'Kilde itemId',
        enforceUniqueValues: false,
        hidden: false,
        indexed: false,
        name: 'kildeitem_id',
        text: {
          allowMultipleLines: false,
          appendChangesToExistingText: false,
          linesForEditing: 0,
          maxLength: 255
        }
      }
    },
    {
      body: {
        description: 'DriveId for der dokumentet kommer fra',
        displayName: 'Kilde driveId',
        enforceUniqueValues: false,
        hidden: false,
        indexed: false,
        name: 'kildedrive_id',
        text: {
          allowMultipleLines: false,
          appendChangesToExistingText: false,
          linesForEditing: 0,
          maxLength: 255
        }
      }
    },
    {
      body: {
        description: 'DriveItemId for der dokumentet kommer fra',
        displayName: 'Kilde driveItemId',
        enforceUniqueValues: false,
        hidden: false,
        indexed: false,
        name: 'kildedrive_item_id',
        text: {
          allowMultipleLines: false,
          appendChangesToExistingText: false,
          linesForEditing: 0,
          maxLength: 255
        }
      }
    }
  ]
  return columnDefinitions
}

module.exports = { setupSourceColumnDefinitions, setupSourcePublishView, setupDestinationColumnDefinitions }
