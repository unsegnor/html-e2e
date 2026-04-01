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

  function tableWithCaption (caption, {captionStyle = ''} = {}) {
    const styleAttr = captionStyle ? ` style="${captionStyle}"` : ''
    return `<table>
      <caption${styleAttr}>${caption}</caption>
      <thead><tr><th>nombre</th></tr></thead>
      <tbody><tr><td>María</td></tr></tbody>
    </table>`
  }

  function listWithHeading (heading, {headingStyle = ''} = {}) {
    const styleAttr = headingStyle ? ` style="${headingStyle}"` : ''
    return `<${headingStyle.includes('visually') ? 'h2' : 'h2'}${styleAttr}>${heading}</h2>
    <ul><li>item 1</li></ul>`
  }

  function listWithStyledHeading (heading, style) {
    return `<h2 style="${style}">${heading}</h2><ul><li>item 1</li></ul>`
  }

  function visuallyHiddenStyle () {
    return 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;'
  }

  describe('getAll — table with hidden caption', function () {
    it('must not find a table whose caption has display:none', async function () {
      server.setBody(tableWithCaption('tareas', {captionStyle: 'display: none'}))
      await user.open(server.url)

      await expectToThrow('"tareas" not found', async function () {
        await user.getAll('tareas')
      })
    })

    it('must not find a table whose caption has visibility:hidden', async function () {
      server.setBody(tableWithCaption('tareas', {captionStyle: 'visibility: hidden'}))
      await user.open(server.url)

      await expectToThrow('"tareas" not found', async function () {
        await user.getAll('tareas')
      })
    })

    it('must not find a table whose caption is visually-hidden (position absolute, clip, 1px)', async function () {
      server.setBody(tableWithCaption('tareas', {captionStyle: visuallyHiddenStyle()}))
      await user.open(server.url)

      await expectToThrow('"tareas" not found', async function () {
        await user.getAll('tareas')
      })
    })
  })

  describe('getAll — list with hidden heading', function () {
    it('must not find a list whose heading has display:none', async function () {
      server.setBody(listWithStyledHeading('tareas', 'display: none'))
      await user.open(server.url)

      await expectToThrow('"tareas" not found', async function () {
        await user.getAll('tareas')
      })
    })

    it('must not find a list whose heading has visibility:hidden', async function () {
      server.setBody(listWithStyledHeading('tareas', 'visibility: hidden'))
      await user.open(server.url)

      await expectToThrow('"tareas" not found', async function () {
        await user.getAll('tareas')
      })
    })

    it('must not find a list whose heading is visually-hidden (position absolute, clip, 1px)', async function () {
      server.setBody(listWithStyledHeading('tareas', visuallyHiddenStyle()))
      await user.open(server.url)

      await expectToThrow('"tareas" not found', async function () {
        await user.getAll('tareas')
      })
    })
  })

  describe('get — field with hidden label', function () {
    it('must not find a field whose label has display:none', async function () {
      server.setBody('<label for="f" style="display: none">nombre</label><input type="text" id="f" value="María">')
      await user.open(server.url)

      await expectToThrow('"nombre" not found', async function () {
        await user.get('nombre')
      })
    })

    it('must not find a field whose label has visibility:hidden', async function () {
      server.setBody('<label for="f" style="visibility: hidden">nombre</label><input type="text" id="f" value="María">')
      await user.open(server.url)

      await expectToThrow('"nombre" not found', async function () {
        await user.get('nombre')
      })
    })
  })

  describe('set — field with hidden label', function () {
    it('must not set a field whose label has display:none', async function () {
      server.setBody('<label for="f" style="display: none">nombre</label><input type="text" id="f">')
      await user.open(server.url)

      await expectToThrow('"nombre" not found', async function () {
        await user.set('nombre', 'nuevo valor')
      })
    })

    it('must not set a field whose label has visibility:hidden', async function () {
      server.setBody('<label for="f" style="visibility: hidden">nombre</label><input type="text" id="f">')
      await user.open(server.url)

      await expectToThrow('"nombre" not found', async function () {
        await user.set('nombre', 'nuevo valor')
      })
    })
  })

  describe('doAction — hidden buttons', function () {
    it('must not click a button with display:none', async function () {
      server.setBody('<button style="display: none">guardar</button>')
      await user.open(server.url)

      await expectToThrow('"guardar" not found', async function () {
        await user.doAction('guardar')
      })
    })

    it('must not click a button with visibility:hidden', async function () {
      server.setBody('<button style="visibility: hidden">guardar</button>')
      await user.open(server.url)

      await expectToThrow('"guardar" not found', async function () {
        await user.doAction('guardar')
      })
    })
  })

  describe('mustBeAbleTo — hidden buttons', function () {
    it('must not consider available a button with display:none', async function () {
      server.setBody('<button style="display: none">guardar</button>')
      await user.open(server.url)

      await expectToThrow('not able to', async function () {
        await user.mustBeAbleTo('guardar')
      })
    })

    it('must not consider available a button with visibility:hidden', async function () {
      server.setBody('<button style="visibility: hidden">guardar</button>')
      await user.open(server.url)

      await expectToThrow('not able to', async function () {
        await user.mustBeAbleTo('guardar')
      })
    })
  })
})
