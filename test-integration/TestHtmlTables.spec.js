const { TestUser } = require('../index')
const { expect } = require('chai')
const FakeServer = require('./FakeServer')
const expectToThrow = require('expect-to-throw')

describe('testing html tables', function () {
  let server, user

  this.beforeEach(async function () {
    server = await FakeServer()
    user = await TestUser()
  })

  this.afterEach(async function () {
    // Close the user before the server or it will hang
    await user.close()
    await server.close()
  })

  describe('get', function () {
    it('must return the value in the last row of a table', async function () {
      await server.setBody(`
                  <table>
                    <caption>Rows</caption>
                    <tr><th>Header1</th><th>Header2</th></tr>
                    <tr><td>FirstValue1</td><td>FirstValue2</td></tr>
                    <tr><td>SecondValue1</td><td>SecondValue2</td></tr>
                    <tr><td>LastValue1</td><td>LastValue2</td></tr>
                  </table>
                  `)
      await user.open(server.url)
      var rows = await user.get('rows')
      var lastRow = await rows.last()
      var header2Value = await lastRow.get('header2')
      expect(header2Value).to.equal('LastValue2')
    })

    it('must throw when there are no tables', async function () {
      await expectToThrow('Property "rows" not found', async function(){
        await server.setBody(`
                    <h1>Hola</h1>
                    `)
        await user.open(server.url)
        var rows = await user.get('rows')
      })
    })
    it('must throw when there are no tables with the expected caption', async function () {
      await expectToThrow('Property "rows" not found', async function(){
        await server.setBody(`
                    <table>
                      <tr><th>Header1</th><th>Header2</th></tr>
                      <tr><td>FirstValue1</td><td>FirstValue2</td></tr>
                      <tr><td>SecondValue1</td><td>SecondValue2</td></tr>
                      <tr><td>LastValue1</td><td>LastValue2</td></tr>
                    </table>
                    `)
        await user.open(server.url)
        var rows = await user.get('rows')
      })
    })
    it('must throw when the table has no rows at all', async function () {
      await expectToThrow('Missing header row on the table "rows"', async function(){
        await server.setBody(`
                    <table>
                      <caption>Rows</caption>
                    </table>
                    `)
        await user.open(server.url)
        var rows = await user.get('rows')
        var lastRow = await rows.last()
      })
    })
    it('must throw when the table has header but not rows', async function () {
      await expectToThrow('No rows on the table "rows"', async function(){
        await server.setBody(`
                    <table>
                      <caption>Rows</caption>
                      <tr><th>Header1</th><th>Header2</th></tr>
                    </table>
                    `)
        await user.open(server.url)
        var rows = await user.get('rows')
        var lastRow = await rows.last()
      })
    })
    xit('must throw when there is no header row', async function () {
      await expectToThrow('Missing header row on the table "rows"', async function(){
        await server.setBody(`
                    <table>
                      <tr><td>FirstValue1</td><td>FirstValue2</td></tr>
                      <tr><td>SecondValue1</td><td>SecondValue2</td></tr>
                      <tr><td>LastValue1</td><td>LastValue2</td></tr>
                    </table>
                    `)
        await user.open(server.url)
        var rows = await user.get('rows')
        var lastRow = await rows.last()
      })
    })
  })
})
