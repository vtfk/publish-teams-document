(async () => {
    const siteConfig = require('../publish-sites')
    const { logger } = require('@vtfk/logger')
    const { getGraphToken } = require('../lib/get-graph-token')
    const { pagedGraphRequest } = require('../lib/graph-request')
    const { columns } = require('../config')
    const { writeFileSync, mkdirSync, existsSync } = require('fs')
    

    const publishSites = siteConfig.filter(site => site.enabled)

    if(publishSites.length === 0) logger('info', ['index', 'no sites enabled'])

    for(const site of publishSites) {
        const select = "$select=createdDateTime,id,webUrl,createdBy,lastModifiedBy,fields"
        const resource = `sites/${site.siteId}/lists/${site.listID}/drive/list/items`
        const query = `expand=fields&${select}&$top=10`

        logger('info', ['dispatcher', 'fetching files ready for publishing from sharepoint'])

        const data = await pagedGraphRequest(resource, {queryParams: query, onlyFirstPage: false})
        const documentsToHandle = data.value.filter(document => document.fields[columns.publishChoice] && document.fields._UIVersionString && document.fields._UIVersionString < [columns.publishedVersion]) // Finner de dokumentene der brukeren har sagt at dokumentet skal publiseres.
       
        if(!existsSync('queue')){
            logger('info', ['dispatcher', 'queue folder dose not exist, creating one'])
            mkdirSync('queue')
        }

        logger('info', ['dispatcher', 'writing files to queue'])
        writeFileSync('queue/docs.json', JSON.stringify(documentsToHandle, null, 2))

        /*
            Filtrere datalista til å bare inneholder elementer som skal publiseres og er på en større versjon enn publisert versjon.
        */

        // let siteData
        // readFile('./site-data.json', 'utf-8', function(err, data) {
        //     logger('info', ['index', `reading files ready for publishing from sharepoint, found: ${data.count} files`])
        //     if(err) logger('warn', ['index', `error reading files, error: ${err}`])
        //     siteData = JSON.parse(data)
        //     console.log(siteData)
        // })
    }
})()