const {expect} = require('chai')
const FakeServer = require('./FakeServer')
const HttpClient = require('./HttpClient')

describe('FakeServer', function(){
    let server

    this.beforeEach(async function(){
        server = await FakeServer()
    })

    this.afterEach(async function(){
        await server.close()
    })

    it('must run a fake http server on the given url', async function(){
        var client = HttpClient()
        var content = await client.get(server.url)
        expect(content).to.contain("<html>")
    })

    it('must show the fake body when it is set', async function(){
        var body = '<p>This is the new body</p>'
        server.setBody(body)
        var client = HttpClient()
        var content = await client.get(server.url)
        expect(content).to.contain(body)
    })
})