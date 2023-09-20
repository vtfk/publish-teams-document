(async () => {
    const { getGraphToken } = require('./lib/get-graph-token')
    const axios = require('axios').default
    const { writeFileSync } = require('fs')

    const graphToken = await getGraphToken()
    const body = {
        "description": "hgakldoskd",
        "enforceUniqueValues": false,
        "hidden": false,
        "indexed": false,
        "name": "Geir ser ting vi ikke ser",
        "choice": {
            "allowTextEntry": false,
            "choices": ["Innsida", "vtfk"],
            "displayAs": "checkBoxes"
        }
    }
    try {
        const { data } = await axios.post('https://graph.microsoft.com/v1.0/sites/0a4121ce-7384-474c-afff-ee20f48bff5e/lists/f2fe7099-a6d7-4a95-b16d-15df756dc608/columns', body, {headers: {Authorization: `Bearer ${graphToken}`}})
        writeFileSync('litttestdata.json', JSON.stringify(data, null, 2))
    } catch (error) {
        console.log(error.response.data || error.toString())
    }
    

})()