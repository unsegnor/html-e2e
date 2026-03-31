const { TestUser } = require('../index')
const { expect } = require('chai')
const FakeServer = require('./FakeServer')
const expectToThrow = require('expect-to-throw')

describe('getAll from table', function () {
  let server, user

  this.beforeEach(async function () {
    server = await FakeServer()
    user = await TestUser({showBrowser: false})
  })

  this.afterEach(async function () {
    await user.close()
    await server.close()
  })

  function tableWithCaption ({caption, headers, rows}) {
    const headerCells = headers.map(h => `<th>${h}</th>`).join('')
    const bodyRows = rows.map(row => {
      const cells = row.map(cell => `<td>${cell}</td>`).join('')
      return `<tr>${cells}</tr>`
    }).join('')
    return `<table><caption>${caption}</caption><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`
  }

  describe('returns one row object per table row', function () {
    it('must return an array with as many objects as rows in the table', async function () {
      server.setBody(tableWithCaption({
        caption: 'personas',
        headers: ['nombre', 'edad'],
        rows: [['María', '35'], ['Juan', '28']]
      }))
      await user.open(server.url)

      const personas = await user.getAll('personas')

      expect(personas).to.have.length(2)
    })

    it('must return an empty array when the table has no rows', async function () {
      server.setBody(tableWithCaption({caption: 'personas', headers: ['nombre', 'edad'], rows: []}))
      await user.open(server.url)

      const personas = await user.getAll('personas')

      expect(personas).to.have.length(0)
    })
  })

  describe('get — reading cell text', function () {
    it('must return the text of the cell in the named column for each row', async function () {
      server.setBody(tableWithCaption({
        caption: 'personas',
        headers: ['nombre', 'edad'],
        rows: [['María', '35'], ['Juan', '28']]
      }))
      await user.open(server.url)

      const personas = await user.getAll('personas')

      expect(await personas[0].get('nombre')).to.equal('María')
      expect(await personas[1].get('nombre')).to.equal('Juan')
    })

    it('must return the correct value for each column in each row', async function () {
      server.setBody(tableWithCaption({
        caption: 'personas',
        headers: ['nombre', 'edad'],
        rows: [['María', '35'], ['Juan', '28']]
      }))
      await user.open(server.url)

      const personas = await user.getAll('personas')

      expect(await personas[0].get('edad')).to.equal('35')
      expect(await personas[1].get('edad')).to.equal('28')
    })
  })

  describe('set — editing an input inside a cell', function () {
    it('must set the value of an input in the named column and read it back', async function () {
      server.setBody(`
        <table>
          <caption>tareas</caption>
          <thead><tr><th>nombre</th><th>estado</th></tr></thead>
          <tbody>
            <tr>
              <td>Arreglar bug</td>
              <td><input type="text" value="pendiente"></td>
            </tr>
          </tbody>
        </table>
      `)
      await user.open(server.url)

      const tareas = await user.getAll('tareas')
      await tareas[0].set('estado', 'hecho')
      const estado = await tareas[0].get('estado')

      expect(estado).to.equal('hecho')
    })
  })

  describe('doAction — clicking a button inside a row', function () {
    it('must click the button in the matching row and not in other rows', async function () {
      server.setBody(`
        <label for="result">resultado</label>
        <input type="text" id="result" value="">
        <table>
          <caption>tareas</caption>
          <thead><tr><th>nombre</th><th>acciones</th></tr></thead>
          <tbody>
            <tr>
              <td>Arreglar bug</td>
              <td><button onclick="document.getElementById('result').value = 'correcto'">eliminar</button></td>
            </tr>
            <tr>
              <td>Escribir tests</td>
              <td><button onclick="document.getElementById('result').value = 'incorrecto'">eliminar</button></td>
            </tr>
          </tbody>
        </table>
      `)
      await user.open(server.url)

      const tareas = await user.getAll('tareas')
      await tareas[0].doAction('eliminar')
      const resultado = await user.get('resultado')

      expect(resultado).to.equal('correcto')
    })
  })

  describe('case insensitive matching', function () {
    it('must match the caption ignoring case', async function () {
      server.setBody(tableWithCaption({
        caption: 'PERSONAS',
        headers: ['nombre', 'edad'],
        rows: [['María', '35']]
      }))
      await user.open(server.url)

      const personas = await user.getAll('personas')

      expect(await personas[0].get('nombre')).to.equal('María')
    })

    it('must match the caption ignoring surrounding spaces', async function () {
      server.setBody(tableWithCaption({
        caption: '  personas  ',
        headers: ['nombre', 'edad'],
        rows: [['María', '35']]
      }))
      await user.open(server.url)

      const personas = await user.getAll('personas')

      expect(await personas[0].get('nombre')).to.equal('María')
    })

    it('must match column headers ignoring case', async function () {
      server.setBody(tableWithCaption({
        caption: 'personas',
        headers: ['NOMBRE', 'EDAD'],
        rows: [['María', '35']]
      }))
      await user.open(server.url)

      const personas = await user.getAll('personas')

      expect(await personas[0].get('nombre')).to.equal('María')
    })
  })

  describe('error cases', function () {
    it('must throw when no table has the given caption', async function () {
      server.setBody(tableWithCaption({caption: 'productos', headers: ['nombre'], rows: [['Pan']]}))
      await user.open(server.url)

      await expectToThrow('"personas" not found', async function () {
        await user.getAll('personas')
      })
    })

    it('must throw when there is no table at all', async function () {
      server.setBody('<p>no table here</p>')
      await user.open(server.url)

      await expectToThrow('"personas" not found', async function () {
        await user.getAll('personas')
      })
    })

    it('must throw when the HTML uses divs instead of a semantic table', async function () {
      server.setBody('<div>personas</div><div>María</div><div>35</div>')
      await user.open(server.url)

      await expectToThrow('"personas" not found', async function () {
        await user.getAll('personas')
      })
    })
  })
})
