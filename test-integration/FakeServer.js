const express = require('express')
const getPort = require('get-port')

module.exports = async function(){

    let settedBody

    const app = express()
    const port = await getPort()

    app.get('/', (req, res) => {
        if(settedBody) res.send(`<html><head></head><body>${settedBody}</body></html>`)
        else res.sendFile(__dirname + '/testView.html')
    })

    let server

    return new Promise(function(resolve, reject){
        var url = `http://localhost:${port}`

        server = app.listen(port, () => {
            resolve(Object.freeze({
                url,
                close,
                setBody
            }))
        })
    })

    function setBody(body){
        settedBody = body
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