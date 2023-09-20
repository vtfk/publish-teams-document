const { getGraphToken } = require('./get-graph-token')
const axios = require('axios').default
const { graphClient: { baseurl } } = require('../config')
const { logger } = require('@vtfk/logger')



const sleep = ms => new Promise(r => {successTimeout = setTimeout(r, ms)})

/**
 * Function for calling graph.
 *
 * @param {string} resource - Which resource to request
 * @param {object} [options] - Options for the request
 * @param {boolean} [options.queryParams] - Optional query parameters (filter etc)
 * @param {boolean} [options.beta] - If you want to use the beta api
 * @param {boolean} [options.advanced] - If you need to use advanced query agains graph
 * @param {boolean} [options.isNextLink] - If you need to use advanced query agains graph
 * @return {object} Graph result
 *
 * @example
 *     await singleGraphRequest('me/calendars?filter="filter',  { beta: false, advanced: false, queryParams: 'filter=DisplayName eq "Truls"' })
 */
const singleGraphRequest = async (resource, options) => {
  if (!resource) throw new Error('Required parameter "resource" is missing')
  const { queryParams, beta, advanced } = options ?? {}
  const token = await getGraphToken()
  logger('info', ['singleGraphRequest', resource, options.queryParams])
  const headers = advanced ? { Authorization: `Bearer ${token}`, Accept: 'application/json;odata.metadata=minimal;odata.streaming=true', 'accept-encoding': null, ConsistencyLevel: 'eventual' } : { Authorization: `Bearer ${token}`, Accept: 'application/json;odata.metadata=minimal;odata.streaming=true', 'accept-encoding': null }
  const qp = queryParams ? `?${queryParams}` : ''
  let url = `${baseurl}/${beta ?? 'v1.0'}/${resource}${qp}`
  console.log(url)
  if (options.isNextLink) url = resource
  const { data } = await axios.get(url, { headers, timeout: 5000 })
  logger('info', ['singleGraphRequest', 'got data'])
  return data
}

/**
 * Function for calling graph and continuing if result is paginated.
 *
 * @param {string} resource - Which resource to request
 * @param {object} [options] - Options for the request
 * @param {boolean} [options.queryParams] - Optional query parameters (filter etc)
 * @param {boolean} [options.beta] - If you want to use the beta api
 * @param {boolean} [options.advanced] - If you need to use advanced query agains graph
 * @param {boolean} [options.onlyFirstPage] - If you only want to return the first page of the result
 * @return {object} Graph result
 *
 * @example
 *     await pagedGraphRequest('me/calendars?filter="filter',  { beta: false, advanced: false, queryParams: 'filter=DisplayName eq "Truls"' })
 */
const pagedGraphRequest = async (resource, options) => {
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
        res = await singleGraphRequest(resource, options)
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
    // for only fetching a little bit
    if (onlyFirstPage) {
      logger('info', ['pagedGraphRequest', `onlyFirstPage is true, quick returning - enjoying your testing! 😁`])
      finished = true
    }
  }
  result.count = result.value.length
  logger('info', ['pagedGraphRequest', `Found a total of ${result.count} elements`])
  return result
}


module.exports = { pagedGraphRequest, singleGraphRequest }