
(async () => {
  const { logger, logConfig } = require('@vtfk/logger')
  const { createLocalLogger } = require('../lib/local-logger')
  const { setupDestinationColumnDefinitions } = require('../lib/setup-column-definitions')
  const { readFileSync } = require('fs')
  const { createSharepointClient } = require('../lib/sharepoint-client')
  const { destinationAuth, destinationLibrary } = require('../config')

  const destinationConfig = {
    clientId: destinationAuth.clientId,
    tenantId: destinationAuth.tenantId,
    tenantName: destinationAuth.tenantName,
    pfxcert: readFileSync(destinationAuth.pfxPath).toString('base64'),
    thumbprint: destinationAuth.pfxThumbprint
  }

  const destinationClient = createSharepointClient(destinationConfig)

  // Set up logging
  logConfig({
    prefix: 'setupDestinationLibrary',
    teams: {
      onlyInProd: false
    },
    localLogger: createLocalLogger('setup-destination-library')
  })

  const columnDefinitions = setupDestinationColumnDefinitions()
  await destinationClient.upsertColumns(destinationLibrary, columnDefinitions)

  logger('info', ['Finished setting up destination library'])
})()
