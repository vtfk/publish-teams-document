const { getSharepointToken } = require('./get-sharepoint-token')
const axios = require('./axios-instance')()
const { sharepointClient } = require('../config')
const { writeFileSync  } = require('fs')

const modifyColumn = async (library, columnId, body) => {
  const sharepointToken = await getSharepointToken()
  const baseUrl = `https://${sharepointClient.tenantName}.sharepoint.com/sites/${library.siteName}`
  const query = `_api/web/lists(guid'${library.listId}')/fields('${columnId}')`

  const { data } = await axios.post(`${baseUrl}/${query}`, body, { headers: { Authorization: `Bearer ${sharepointToken}`, Accept: 'application/json;odata=verbose', "X-HTTP-Method": "MERGE" } })
  return data
}

const doSomething = async (stuff) => {
  const sharepointToken = await getSharepointToken()

  const siteConfig = {
    siteName: "BDK-Jrgensteste-team",
    listId: "f2fe7099-a6d7-4a95-b16d-15df756dc608"
  }

  const baseUrl = `https://${sharepointClient.tenantName}.sharepoint.com/sites/${siteConfig.siteName}`
  const query = `_api/web/lists(guid'${siteConfig.listId}')/fields('574c5ba5-255d-4b7e-8ea1-66cd928cf45a')`
  const queryGet = `_api/web/lists(guid'${siteConfig.listId}')/fields`
  // const query = `_api/web/lists(guid'${fileUpload.listId}')/items(${fileUpload.spItemId})/AttachmentFiles/add(FileName='${fileUpload.file.desc}')`
  const payloadx = {
    "CustomFormatter": "{\"elmType\":\"div\",\"style\":{\"flex-wrap\":\"wrap\",\"display\":\"flex\"},\"children\":[{\"forEach\":\"__INTERNAL__ in @currentField\",\"elmType\":\"div\",\"style\":{\"box-sizing\":\"border-box\",\"padding\":\"20px 20px 20px 20px\",\"overflow\":\"hidden\",\"text-overflow\":\"ellipsis\",\"display\":\"flex\",\"border-radius\":\"16px\",\"height\":\"24px\",\"align-items\":\"center\",\"white-space\":\"nowrap\",\"margin\":\"4px 4px 4px 4px\"},\"attributes\":{\"class\":{\"operator\":\":\",\"operands\":[{\"operator\":\"==\",\"operands\":[\"[$__INTERNAL__]\",\"Innsida\"]},\"sp-css-backgroundColor-BgCornflowerBlue sp-css-color-CornflowerBlueFont\",{\"operator\":\":\",\"operands\":[{\"operator\":\"==\",\"operands\":[\"[$__INTERNAL__]\",\"vtfk.no\"]},\"sp-css-backgroundColor-BgMintGreen sp-css-color-MintGreenFont\",\"sp-field-borderAllRegular sp-field-borderAllSolid sp-css-borderColor-neutralSecondary\"]}]}},\"txtContent\":\"[$__INTERNAL__]\"}],\"templateId\":\"BgColorChoicePill\"}",
  }
  const payload = {
    "CustomFormatter": ""
  }
  // const { data } = await axios.get(`${baseUrl}/${query}`, { headers: { Authorization: `Bearer ${sharepointToken}`, Accept: 'application/json;odata=verbose' } })
  {
    const { data } = await axios.post(`${baseUrl}/${query}`, payloadx, { headers: { Authorization: `Bearer ${sharepointToken}`, Accept: 'application/json;odata=verbose', "X-HTTP-Method": "MERGE" } })
    writeFileSync('./ignore/sp-res.json', JSON.stringify(data, null, 2))
  }

  const { data } = await axios.get(`${baseUrl}/${queryGet}`, { headers: { Authorization: `Bearer ${sharepointToken}`, Accept: 'application/json;odata=verbose', "X-HTTP-Method": "MERGE" } })

  writeFileSync('./ignore/sp-get.json', JSON.stringify(data, null, 2))

  return data

}

module.exports = { doSomething, modifyColumn }