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

  describe('when there is only one list', function () {
    it('must return all items as an array of strings without specifying a label', async function () {
      server.setBody(listWithoutLabel(['buy milk', 'walk dog', 'read book']))
      await user.open(server.url)

      const items = await user.getAll()

      expect(items).to.deep.equal(['buy milk', 'walk dog', 'read book'])
    })

    it('must return all items identified by its visible h2 label', async function () {
      server.setBody(listWithLabel({label: 'Tasks', items: ['task 1', 'task 2', 'task 3']}))
      await user.open(server.url)

      const items = await user.getAll('tasks')

      expect(items).to.deep.equal(['task 1', 'task 2', 'task 3'])
    })

    it('must return all items identified by its visible h1 label', async function () {
      server.setBody(listWithLabel({label: 'Tasks', items: ['task 1', 'task 2'], labelTag: 'h1'}))
      await user.open(server.url)

      const items = await user.getAll('tasks')

      expect(items).to.deep.equal(['task 1', 'task 2'])
    })

    it('must return all items identified by its visible h3 label', async function () {
      server.setBody(listWithLabel({label: 'Tasks', items: ['task 1', 'task 2'], labelTag: 'h3'}))
      await user.open(server.url)

      const items = await user.getAll('tasks')

      expect(items).to.deep.equal(['task 1', 'task 2'])
    })

    it('must match the label ignoring case', async function () {
      server.setBody(listWithLabel({label: 'PENDING Tasks', items: ['task 1', 'task 2']}))
      await user.open(server.url)

      const items = await user.getAll('pending tasks')

      expect(items).to.deep.equal(['task 1', 'task 2'])
    })

    it('must match the label ignoring surrounding spaces', async function () {
      server.setBody(listWithLabel({label: '  Tasks  ', items: ['task 1', 'task 2']}))
      await user.open(server.url)

      const items = await user.getAll('tasks')

      expect(items).to.deep.equal(['task 1', 'task 2'])
    })

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
    it('must return items from the correct list identified by its label', async function () {
      server.setBody(
        listWithLabel({label: 'Tasks', items: ['task 1', 'task 2']}) +
        listWithLabel({label: 'Users', items: ['alice', 'bob', 'carol']})
      )
      await user.open(server.url)

      const items = await user.getAll('tasks')

      expect(items).to.deep.equal(['task 1', 'task 2'])
    })

    it('must return items from the other list when a different label is specified', async function () {
      server.setBody(
        listWithLabel({label: 'Tasks', items: ['task 1', 'task 2']}) +
        listWithLabel({label: 'Users', items: ['alice', 'bob', 'carol']})
      )
      await user.open(server.url)

      const items = await user.getAll('users')

      expect(items).to.deep.equal(['alice', 'bob', 'carol'])
    })

    it('must throw when no label is specified', async function () {
      server.setBody(
        listWithLabel({label: 'Tasks', items: ['task 1']}) +
        listWithLabel({label: 'Users', items: ['alice']})
      )
      await user.open(server.url)

      await expectToThrow('multiple lists found', async function () {
        await user.getAll()
      })
    })

    it('must throw when the label does not match any list', async function () {
      server.setBody(
        listWithLabel({label: 'Tasks', items: ['task 1']}) +
        listWithLabel({label: 'Users', items: ['alice']})
      )
      await user.open(server.url)

      await expectToThrow('list "products" not found', async function () {
        await user.getAll('products')
      })
    })
  })
})
