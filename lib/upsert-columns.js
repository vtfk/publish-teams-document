const { logger } = require('@vtfk/logger')
const { graphRequest } = require('../lib/graph-request')
const { modifyColumn, getColumns } = require('../lib/sharepoint-requests')
const { writeFileSync } = require('fs')

// Simple helper function to check if two arrays has the exact same values
const hasAllValues = (arr1, arr2) => { return arr2.every(value => arr1.includes(value)) }
const hasSameValues = (arr1, arr2) => { return hasAllValues(arr1, arr2) && hasAllValues(arr2, arr1) }

// Creates column from definition if it does not exist - if it exists, checks these fields, and modifies if they are not correct: Title (displayName), CustomFormatter, Description, Choice Values. Does NOT verify, modify, or check column type, that is your responsibility.
// Column types must match columndef - if created manually and wrong, will fail for now
// Never deletes any columns - responsibility of library user, for now

/**
 *
 * @param {Object} lib
 * @param {string} lib.libraryUrl
 * @param {string} lib.siteId
 * @param {string} lib.listId
 * @param {Object} columnDefinitions
 */
const upsertColumns = async (authConfig, lib, columnDefinitions) => {
  let columns
  try {
    logger('info', ['Getting all columns (and formatting)'])
    columns = (await getColumns(authConfig, lib.libraryUrl, lib.listId)).d.results
  } catch (error) {
    logger('error', ['Error when fetching columns for library in site', lib.libraryUrl, error.response?.data || error.stack || error.toString()])
    throw error
  }

  logger('info', [`Checking what columns needs to be added, and if they already exist, and if they need to be modified. Library: ${lib.libraryUrl}`])
  const columnsToAdd = []
  for (const columnDef of columnDefinitions) {
    const correspondingColumn = columns.find(col => col.InternalName === columnDef.body.name)
    if (!correspondingColumn) {
      columnsToAdd.push(columnDef)
    } else {
      logger('info', [`Column ${columnDef.body.name} already exists in library ${lib.libraryUrl}, don't need to create, check if need to modify..`])
      const modification = {
        needsModifiation: false,
        body: {
          __metadata: {
            type: correspondingColumn.__metadata.type
          }
        }
      }
      if (columnDef.CustomFormatter && correspondingColumn.CustomFormatter !== columnDef.CustomFormatter) {
        logger('info', [`Ohohoh, CustomFormatter is missing or not correct on column ${columnDef.body.name} for library: ${lib.libraryUrl}, will fix`])
        modification.body.CustomFormatter = columnDef.CustomFormatter
        modification.needsModifiation = true
      }
      if (correspondingColumn.Title !== columnDef.body.displayName) {
        logger('info', [`Ohohoh, Title (display name) is not correct on column ${columnDef.body.name} for library: ${lib.libraryUrl}, will fix`])
        modification.body.Title = columnDef.body.displayName
        modification.needsModifiation = true
      }
      if (correspondingColumn.Description !== columnDef.body.description) {
        logger('info', [`Ohohoh, Description (beskrivelse) is not correct on column ${columnDef.body.name} for library: ${lib.libraryUrl}, will fix`])
        modification.body.Description = columnDef.body.description
        modification.needsModifiation = true
      }
      // Hacky tacky way of updating choices in choice column (choices must be array of strings for now)
      if (columnDef.body.choice && !hasSameValues(correspondingColumn.Choices.results, columnDef.body.choice.choices)) {
        logger('info', [`Ohohoh, publish choices are not correct on column ${columnDef.body.name} for library: ${lib.libraryUrl}, will fix`])
        modification.body.Choices = {
          __metadata: {
            type: 'Collection(Edm.String)'
          },
          results: columnDef.body.choice.choices
        }
        modification.needsModifiation = true
      }
      if (modification.needsModifiation) {
        try {
          await modifyColumn(authConfig, lib.libraryUrl, lib.listId, correspondingColumn.Id, modification.body)
          logger('info', [`Successfully modified column ${columnDef.body.name} for library: ${lib.libraryUrl}`])
        } catch (error) {
          logger('error', [`Error when adding custom formatter to ${columnDef.body.name} for library ${lib.libraryUrl}, run function again or wait for next run`, 'error', error.response?.data || error.stack || error.toString()])
        }
      } else {
        logger('info', [`Column ${columnDef.body.name} already has correct data library ${lib.libraryUrl}, don't need to create, don't need to modify. Wonderful!`])
      }
    }
  }

  // Okidoki, then we add what we need to
  logger('info', [`Need to add ${columnsToAdd.length} columns to library: ${lib.libraryUrl}. Trying to add them now.`])
  for (const columnDef of columnsToAdd) {
    try {
      const columnResource = `sites/${lib.siteId}/lists/${lib.listId}/columns`
      const requestOptions = {
        method: 'post',
        body: columnDef.body
      }
      logger('info', [`Creating column ${columnDef.body.name} in library: ${lib.libraryUrl}`])
      const columnRes = await graphRequest(authConfig, columnResource, requestOptions)

      writeFileSync('./ignore/columnsadded.json', JSON.stringify(columnRes, null, 2))

      if (columnDef.CustomFormatter) {
        logger('info', ['Custom formatter is enabled, will add', 'column name', columnDef.body.name, 'library', lib.libraryUrl])
        try {
          await modifyColumn(authConfig, lib.libraryUrl, lib.listId, columnRes.id, { CustomFormatter: columnDef.CustomFormatter })
        } catch (error) {
          logger('error', [`Error when adding custom formatter to ${columnDef.body.name}, in library: ${lib.libraryUrl}. Run function again or wait for next run`, 'error', error.response?.data || error.stack || error.toString()])
        }
      }
    } catch (error) {
      logger('error', [`Error when creating column ${columnDef.body.name} in library ${lib.libraryUrl}. Run function again or wait for next run`, 'error', error.response?.data || error.stack || error.toString()])
    }
  }
}

module.exports = { upsertColumns, hasSameValues }
