const { TestUser } = require('../index')
const { expect } = require('chai')
const FakeServer = require('./FakeServer')
const expectToThrow = require('expect-to-throw')

describe('getColumn', function () {
  let server, user

  this.beforeEach(async function () {
    server = await FakeServer()
    user = await TestUser({showBrowser: false})
  })

  this.afterEach(async function () {
    await user.close()
    await server.close()
  })

  function table ({headers, rows}) {
    const headerCells = headers.map(h => `<th>${h}</th>`).join('')
    const bodyRows = rows.map(row => {
      const cells = row.map(cell => `<td>${cell}</td>`).join('')
      return `<tr>${cells}</tr>`
    }).join('')
    return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`
  }

  const columnMatchingCases = [
    {condition: 'ignoring case', headerInHtml: 'NAME', query: 'name'},
    {condition: 'ignoring surrounding spaces', headerInHtml: '  Name  ', query: 'name'}
  ]

  describe('when there is one table', function () {
    it('must return all values in the column identified by its visible header', async function () {
      server.setBody(table({
        headers: ['Name', 'Age'],
        rows: [['Alice', '30'], ['Bob', '25'], ['Carol', '40']]
      }))
      await user.open(server.url)

      const names = await user.getColumn('name')

      expect(names).to.deep.equal(['Alice', 'Bob', 'Carol'])
    })

    it('must return values from the correct column when there are multiple columns', async function () {
      server.setBody(table({
        headers: ['Name', 'Days left'],
        rows: [['Fix bug', '3'], ['Write tests', '1']]
      }))
      await user.open(server.url)

      const daysLeft = await user.getColumn('days left')

      expect(daysLeft).to.deep.equal(['3', '1'])
    })

    it('must return an empty array when the table has no rows', async function () {
      server.setBody(table({headers: ['Name', 'Age'], rows: []}))
      await user.open(server.url)

      const names = await user.getColumn('name')

      expect(names).to.deep.equal([])
    })

    for (const {condition, headerInHtml, query} of columnMatchingCases) {
      it(`must match the column header ${condition}`, async function () {
        server.setBody(table({headers: [headerInHtml, 'Age'], rows: [['Alice', '30']]}))
        await user.open(server.url)

        const names = await user.getColumn(query)

        expect(names).to.deep.equal(['Alice'])
      })
    }

    it('must throw when the column does not exist', async function () {
      server.setBody(table({headers: ['Name', 'Age'], rows: [['Alice', '30']]}))
      await user.open(server.url)

      await expectToThrow('column "score" not found', async function () {
        await user.getColumn('score')
      })
    })
  })

  describe('when there is no table', function () {
    it('must throw', async function () {
      server.setBody('<p>no table here</p>')
      await user.open(server.url)

      await expectToThrow('no table found', async function () {
        await user.getColumn('name')
      })
    })
  })

  describe('when the HTML is not semantically correct', function () {
    it('must throw when column headers are in divs instead of th', async function () {
      server.setBody(`
        <div>Name</div><div>Age</div>
        <div>Alice</div><div>30</div>
      `)
      await user.open(server.url)

      await expectToThrow('no table found', async function () {
        await user.getColumn('name')
      })
    })

    it('must throw when rows are in divs instead of tr/td', async function () {
      server.setBody(`
        <table>
          <thead><tr><th>Name</th></tr></thead>
        </table>
        <div>Alice</div>
        <div>Bob</div>
      `)
      await user.open(server.url)

      const names = await user.getColumn('name')

      expect(names).to.deep.equal([])
    })
  })
})
