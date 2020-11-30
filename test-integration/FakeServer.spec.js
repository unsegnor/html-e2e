const { performance } = require('perf_hooks');
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

    it('must show the html file when it is set', async function(){
        server.setHtmlFile('testHtmlFile')
        var client = HttpClient()
        var content = await client.get(server.url)
        expect(content).to.contain('testHtmlFileContent')
    })

    it('must return default api data in the /api/data endpoint when it is not specified', async function(){
        var client = HttpClient()
        var content = await client.get(server.url + '/api/data')
        expect(content).to.equal('{"data":"defaultApiData"}')
    })

    it('must return the specified data in the /api/data endpoint', async function(){
        server.setApiData('testData')
        var client = HttpClient()
        var content = await client.get(server.url + '/api/data')
        expect(content).to.equal('{"data":"testData"}')
    })

    it('must respond to /api/data endpoint after the response time when defined', async function(){
        var responseTime = 1000
        server.setApiResponseTime(responseTime)
        var client = HttpClient()
        var t0 = performance.now()
        var content = await client.get(server.url + '/api/data')
        var t1 = performance.now()
        var actualResponseTime = t1-t0
        expect(actualResponseTime).to.be.greaterThan(responseTime)
        expect(content).to.equal('{"data":"defaultApiData"}')
    })

    it('must respond immediately when response time is not defined', async function(){
        var client = HttpClient()
        var t0 = performance.now()
        var content = await client.get(server.url + '/api/data')
        var t1 = performance.now()
        var actualResponseTime = t1-t0
        expect(actualResponseTime).to.be.lessThan(1000)
        expect(content).to.equal('{"data":"defaultApiData"}')
    })
})