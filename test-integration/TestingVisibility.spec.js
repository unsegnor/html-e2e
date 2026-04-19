const { TestUser } = require('../index')
const FakeServer = require('./FakeServer')
const expectToThrow = require('expect-to-throw')

describe('visibility — elements hidden from the user must not be found', function () {
  let server, user

  this.beforeEach(async function () {
    server = await FakeServer()
    user = await TestUser({showBrowser: false})
  })

  this.afterEach(async function () {
    await user.close()
    await server.close()
  })

  function visuallyHiddenStyle () {
    return 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;'
  }

  const baseHiddenStyles = [
    {description: 'display:none', style: 'display: none'},
    {description: 'visibility:hidden', style: 'visibility: hidden'}
  ]

  const allHiddenStyles = [
    ...baseHiddenStyles,
    {description: 'visually-hidden (position absolute, clip, 1px)', style: visuallyHiddenStyle()}
  ]

  function tableWithCaption (caption, captionStyle) {
    return `<table>
      <caption style="${captionStyle}">${caption}</caption>
      <thead><tr><th>nombre</th></tr></thead>
      <tbody><tr><td>María</td></tr></tbody>
    </table>`
  }

  function listWithStyledHeading (heading, style) {
    return `<h2 style="${style}">${heading}</h2><ul><li>item 1</li></ul>`
  }

  describe('getAll — table with hidden caption', function () {
    for (const {description, style} of allHiddenStyles) {
      it(`must not find a table whose caption has ${description}`, async function () {
        server.setBody(tableWithCaption('tareas', style))
        await user.open(server.url)

        await expectToThrow('"tareas" not found', async function () {
          await user.getAll('tareas')
        })
      })
    }
  })

  describe('getAll — list with hidden heading', function () {
    for (const {description, style} of allHiddenStyles) {
      it(`must not find a list whose heading has ${description}`, async function () {
        server.setBody(listWithStyledHeading('tareas', style))
        await user.open(server.url)

        await expectToThrow('"tareas" not found', async function () {
          await user.getAll('tareas')
        })
      })
    }
  })

  describe('get — field with hidden label', function () {
    for (const {description, style} of baseHiddenStyles) {
      it(`must not find a field whose label has ${description}`, async function () {
        server.setBody(`<label for="f" style="${style}">nombre</label><input type="text" id="f" value="María">`)
        await user.open(server.url)

        await expectToThrow('"nombre" not found', async function () {
          await user.get('nombre')
        })
      })
    }
  })

  describe('set — field with hidden label', function () {
    for (const {description, style} of baseHiddenStyles) {
      it(`must not set a field whose label has ${description}`, async function () {
        server.setBody(`<label for="f" style="${style}">nombre</label><input type="text" id="f">`)
        await user.open(server.url)

        await expectToThrow('"nombre" not found', async function () {
          await user.set('nombre', 'nuevo valor')
        })
      })
    }
  })

  describe('doAction — hidden buttons', function () {
    for (const {description, style} of baseHiddenStyles) {
      it(`must not click a button with ${description}`, async function () {
        server.setBody(`<button style="${style}">guardar</button>`)
        await user.open(server.url)

        await expectToThrow('"guardar" not found', async function () {
          await user.doAction('guardar')
        })
      })
    }
  })

  describe('mustBeAbleTo — hidden buttons', function () {
    for (const {description, style} of baseHiddenStyles) {
      it(`must not consider available a button with ${description}`, async function () {
        server.setBody(`<button style="${style}">guardar</button>`)
        await user.open(server.url)

        await expectToThrow('not able to', async function () {
          await user.mustBeAbleTo('guardar')
        })
      })
    }
  })
})
