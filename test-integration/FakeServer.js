const express = require('express')
const getPort = require('get-port')

module.exports = async function(){

    let settedBody, htmlFile, apiData, apiResponseTime

    const app = express()
    const port = await getPort()

    app.get('/', (req, res) => {
        if(settedBody) res.send(`<html><head></head><body>${settedBody}</body></html>`)
        else if(htmlFile) res.sendFile(__dirname + '/' + htmlFile + '.html')
        else res.sendFile(__dirname + '/testView.html')
    })

    async function wait(milliseconds){
        return new Promise(function(resolve){
            setTimeout(function(){
                resolve()
            }, milliseconds)
        })
    }

    app.get('/api/data', async (req, res) => {
        if(apiResponseTime) await wait(apiResponseTime)
        if(apiData) res.json({data:apiData})
        else res.json({data:'defaultApiData'})
    })

    let server

    return new Promise(function(resolve, reject){
        var url = `http://localhost:${port}`

        server = app.listen(port, () => {
            resolve(Object.freeze({
                url,
                close,
                setBody,
                setHtmlFile,
                setApiData,
                setApiResponseTime
            }))
        })
    })

    function setBody(body){
        settedBody = body
    }

    function setHtmlFile(filePath){
        htmlFile = filePath
    }

    function setApiData(data){
        apiData = data
    }

    function setApiResponseTime(milliseconds){
        apiResponseTime = milliseconds
    }

    async function close(){
        return new Promise(function(resolve, reject){
            server.close(function(err){
                if(err) reject(err)
                resolve()
            })
        })
    }
}