const { getGraphToken } = require('./get-graph-token')
const axios = require('./axios-instance')()
const { graphBaseUrl } = require('../config')
const { logger } = require('@vtfk/logger')

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
const graphRequest = async (authConfig, resource, options = { method: 'get', body: {} }) => {
  if (!resource) throw new Error('Required parameter "resource" is missing')
  let { beta, advanced, body, method } = options ?? {}
  if (!method) method = 'get'
  const token = await getGraphToken(authConfig)
  logger('info', ['graphRequest', `method: ${method}`, `beta: ${Boolean(beta)}`, `advanced: ${Boolean(advanced)}`, resource.includes('skiptoken=') ? resource.substring(0, resource.indexOf('skiptoken=')) : resource])
  const headers = advanced ? { Authorization: `Bearer ${token}`, Accept: 'application/json;odata.metadata=minimal;odata.streaming=true', 'accept-encoding': null, ConsistencyLevel: 'eventual' } : { Authorization: `Bearer ${token}`, Accept: 'application/json;odata.metadata=minimal;odata.streaming=true', 'accept-encoding': null }
  let url = `${graphBaseUrl}/${beta ? 'beta' : 'v1.0'}/${resource}`
  if (options.isNextLink) url = resource

  const axiosOptions = { headers, timeout: 10000 }
  if (options.responseType) axiosOptions.responseType = options.responseType
  const { data } = ['post', 'put', 'patch'].includes(method) ? await axios[method](url, body, axiosOptions) : await axios[method](url, axiosOptions)
  logger('info', ['graphRequest', 'got data'])
  return data
}

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
const pagedGraphRequest = async (authConfig, resource, options = {}) => {
  const { onlyFirstPage } = options ?? {}
  const retryLimit = 3
  let page = 0
  let finished = false
  const result = {
    count: 0,
    value: []
  }
  while (!finished) {
    let retries = 0
    let res
    let ok = false
    while (!ok && retries < retryLimit) {
      try {
        res = await graphRequest(authConfig, resource, options)
        ok = true
        page++
      } catch (error) {
        retries++
        if (retries === retryLimit) {
          logger('warn', [`ÅNEI, nå har vi feilet ${retries} ganger`, error.toString(), 'Vi prøver ikke mer...'])
          throw error
        } else {
          logger('warn', ['ÅNEI, graph feila', error.toString(), 'Vi prøver en gang til'])
        }
      }
    }

    logger('info', ['pagedGraphRequest', `Got ${res.value.length} elements from page ${page}, will check for more`])
    finished = res['@odata.nextLink'] === undefined
    resource = res['@odata.nextLink']
    options.isNextLink = true
    result.value = result.value.concat(res.value)
    if (res['@odata.deltaLink']) result['@odata.deltaLink'] = res['@odata.deltaLink'] // Add delta link to result if present
    // for only fetching a little bit
    if (onlyFirstPage) {
      logger('info', ['pagedGraphRequest', 'onlyFirstPage is true, quick returning - enjoying your testing! 😁'])
      finished = true
    }
  }
  result.count = result.value.length
  logger('info', ['pagedGraphRequest', `Found a total of ${result.count} elements`])
  return result
}

module.exports = { pagedGraphRequest, graphRequest }
