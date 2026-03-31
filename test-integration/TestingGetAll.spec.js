const { TestUser } = require('../index')
const { expect } = require('chai')
const FakeServer = require('./FakeServer')
const expectToThrow = require('expect-to-throw')

describe('getAll', function () {
  let server, user

  this.beforeEach(async function () {
    server = await FakeServer()
    user = await TestUser({showBrowser: false})
  })

  this.afterEach(async function () {
    await user.close()
    await server.close()
  })

  function listWithLabel ({label, items, labelTag = 'h2'}) {
    const listItems = items.map(item => `<li>${item}</li>`).join('')
    return `<${labelTag}>${label}</${labelTag}><ul>${listItems}</ul>`
  }

  function listWithoutLabel (items) {
    const listItems = items.map(item => `<li>${item}</li>`).join('')
    return `<ul>${listItems}</ul>`
  }

  const labelMatchingCases = [
    {condition: 'ignoring case', labelInHtml: 'PENDING Tasks', query: 'pending tasks'},
    {condition: 'ignoring surrounding spaces', labelInHtml: '  Tasks  ', query: 'tasks'}
  ]

  describe('when there is only one list', function () {
    it('must return all items as an array of strings without specifying a label', async function () {
      server.setBody(listWithoutLabel(['buy milk', 'walk dog', 'read book']))
      await user.open(server.url)

      const items = await user.getAll()

      expect(items).to.deep.equal(['buy milk', 'walk dog', 'read book'])
    })

    for (const labelTag of ['h1', 'h2', 'h3']) {
      it(`must return all items identified by its visible ${labelTag} label`, async function () {
        server.setBody(listWithLabel({label: 'Tasks', items: ['task 1', 'task 2'], labelTag}))
        await user.open(server.url)

        const items = await user.getAll('tasks')

        expect(items).to.deep.equal(['task 1', 'task 2'])
      })
    }

    for (const {condition, labelInHtml, query} of labelMatchingCases) {
      it(`must match the label ${condition}`, async function () {
        server.setBody(listWithLabel({label: labelInHtml, items: ['task 1', 'task 2']}))
        await user.open(server.url)

        const items = await user.getAll(query)

        expect(items).to.deep.equal(['task 1', 'task 2'])
      })
    }

    it('must return an empty array when the list has no items', async function () {
      server.setBody(listWithLabel({label: 'Tasks', items: []}))
      await user.open(server.url)

      const items = await user.getAll('tasks')

      expect(items).to.deep.equal([])
    })

    it('must throw when no label is specified and there is no list', async function () {
      server.setBody('<p>no list here</p>')
      await user.open(server.url)

      await expectToThrow('no list found', async function () {
        await user.getAll()
      })
    })

    it('must throw when the label does not match any list', async function () {
      server.setBody(listWithLabel({label: 'Tasks', items: ['task 1']}))
      await user.open(server.url)

      await expectToThrow('list "users" not found', async function () {
        await user.getAll('users')
      })
    })
  })

  describe('when there are multiple lists', function () {
    const twoLists =
      listWithLabel({label: 'Tasks', items: ['task 1', 'task 2']}) +
      listWithLabel({label: 'Users', items: ['alice', 'bob', 'carol']})

    const listSelectionCases = [
      {query: 'tasks', expected: ['task 1', 'task 2']},
      {query: 'users', expected: ['alice', 'bob', 'carol']}
    ]

    for (const {query, expected} of listSelectionCases) {
      it(`must return items from the list identified by label "${query}"`, async function () {
        server.setBody(twoLists)
        await user.open(server.url)

        const items = await user.getAll(query)

        expect(items).to.deep.equal(expected)
      })
    }

    it('must throw when no label is specified', async function () {
      server.setBody(twoLists)
      await user.open(server.url)

      await expectToThrow('multiple lists found', async function () {
        await user.getAll()
      })
    })

    it('must throw when the label does not match any list', async function () {
      server.setBody(twoLists)
      await user.open(server.url)

      await expectToThrow('list "products" not found', async function () {
        await user.getAll('products')
      })
    })
  })
})
