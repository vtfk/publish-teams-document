/*
A reusable client that is connected to a specific sharepoint tenant - gets correct tokens on its own
*/

const { graphRequest, pagedGraphRequest } = require('./graph-request')
const { getFileContent, getFileContentAsPdf, uploadFileToSharepoint, getLibraryWebUrlParts, getListAndSiteId, getDriveItemVersion, getDriveItemFromListItem, getDriveItemVersionFromListItem, getDriveItemVersions } = require('./graph-actions')
const { modifyColumn, getColumns, getViews, addView, removeView, removeViewField, addViewField, upsertView, cleanUpDefaultView, getList, getSiteUserFromLookupId, getSiteUserFromEmail } = require('./sharepoint-requests')
const { upsertColumns } = require('./upsert-columns')

/**
 *
 * @param {Object} authConfig
 * @param {string} authConfig.clientId
 * @param {string} authConfig.tenantId
 * @param {string} authConfig.tenantName
 * @param {string} authConfig.tenantId
 * @param {string} authConfig.pfxcert as base64 string
 * @param {string} [authConfig.pfxPassphrase]
 * @param {string} authConfig.pfxThumbprint
 */
const createSharepointClient = (authConfig) => {
  const client = {
    /**
     * Function for calling graph.
     *
     * @param {string} resource - Which resource to request e.g "users?$select=displayName"
     * @param {object} [options] - Options for the request
     * @param {boolean} [options.beta] - If you want to use the beta api
     * @param {boolean} [options.method] - If you want to use another http-method than GET (GET is default)
     * @param {boolean} [options.body] - If you want to post a http request body
     * @param {boolean} [options.advanced] - If you need to use advanced query agains graph
     * @param {boolean} [options.isNextLink] - If the resource is a nextLink (pagination)
     * @param {boolean} [options.responseType] - If you need a specific responseType (e.g. stream)
     * @return {object} Graph result
     *
     * @example
     *     await graphRequest('me/calendars?filter="filter',  { beta: false, advanced: false })
     */
    graphRequest: async (resource, options) => { return await graphRequest(authConfig, resource, options) },
    /**
     * Function for calling graph and continuing if result is paginated.
     *
     * @param {string} resource - Which resource to request e.g "users?$select=displayName"
     * @param {object} [options] - Options for the request
     * @param {boolean} [options.beta] - If you want to use the beta api
     * @param {boolean} [options.advanced] - If you need to use advanced query agains graph
     * @param {boolean} [options.onlyFirstPage] - If you only want to return the first page of the result
     * @return {object} Graph result
     *
     * @example
     *     await pagedGraphRequest('me/calendars?filter="filter',  { beta: false, advanced: false, queryParams: 'filter=DisplayName eq "Truls"' })
     */
    pagedGraphRequest: async (resource, options) => { return await pagedGraphRequest(authConfig, resource, options) },
    // Graph actions
    getFileContent: async (savePath, driveItem, version) => { return await getFileContent(authConfig, savePath, driveItem, version) },
    getFileContentAsPdf: async (savePath, driveItem, version) => { return await getFileContentAsPdf(authConfig, savePath, driveItem, version) },
    getLibraryWebUrlParts: (webUrl) => { return getLibraryWebUrlParts(webUrl) },
    getListAndSiteId: async (webUrl) => { return await getListAndSiteId(authConfig, webUrl) },
    getDriveItemVersion: async (driveItem, version) => { return await getDriveItemVersion(authConfig, driveItem, version) },
    getDriveItemFromListItem: async (siteId, listId, itemId) => { return await getDriveItemFromListItem(authConfig, siteId, listId, itemId) },
    getDriveItemVersionFromListItem: async (siteId, listId, itemId, version) => { return await getDriveItemVersionFromListItem(authConfig, siteId, listId, itemId, version) },
    uploadFileToSharepoint: async (siteId, listId, localfilePath, sharepointFileName) => { return await uploadFileToSharepoint(authConfig, siteId, listId, localfilePath, sharepointFileName) },
    getDriveItemVersions: async (driveItem) => { return await getDriveItemVersions(authConfig, driveItem) },
    // Sharepoint rest actions
    modifyColumn: async (libraryUrl, listId, columnId, body) => { return await modifyColumn(authConfig, libraryUrl, listId, columnId, body) },
    getColumns: async (libraryUrl, listId) => { return await getColumns(authConfig, libraryUrl, listId) },
    getViews: async (libraryUrl, listId) => { return await getViews(authConfig, libraryUrl, listId) },
    addView: async (libraryUrl, listId, viewTitle) => { return await addView(authConfig, libraryUrl, listId, viewTitle) },
    removeView: async (libraryUrl, listId, viewTitle) => { return await removeView(authConfig, libraryUrl, listId, viewTitle) },
    removeViewField: async (libraryUrl, listId, viewId, fieldName) => { return await removeViewField(authConfig, libraryUrl, listId, viewId, fieldName) },
    addViewField: async (libraryUrl, listId, viewId, fieldName) => { return await addViewField(authConfig, libraryUrl, listId, viewId, fieldName) },
    upsertView: async (libraryUrl, listId, view, removeColumnsIfExists) => { return await upsertView(authConfig, libraryUrl, listId, view, removeColumnsIfExists) },
    cleanUpDefaultView: async (libraryUrl, listId, removeFields, exceptViewTitle) => { return await cleanUpDefaultView(authConfig, libraryUrl, listId, removeFields, exceptViewTitle) },
    getList: async (libraryUrl, listId) => { return await getList(authConfig, libraryUrl, listId) },
    getSiteUserFromEmail: async (libraryUrl, userEmail) => { return await getSiteUserFromEmail(authConfig, libraryUrl, userEmail) },
    getSiteUserFromLookupId: async (libraryUrl, lookupId) => { return await getSiteUserFromLookupId(authConfig, libraryUrl, lookupId) },
    // Big bois
    /**
     *
     * @param {Object} lib
     * @param {string} lib.libraryUrl
     * @param {string} lib.siteId
     * @param {string} lib.listId
     * @param {Object} columnDefinitions
     */
    upsertColumns: async (lib, columnDefinitions) => { return await upsertColumns(authConfig, lib, columnDefinitions) }
  }
  return client
}

module.exports = { createSharepointClient }
