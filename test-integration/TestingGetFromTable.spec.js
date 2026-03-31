const { TestUser } = require('../index')
const { expect } = require('chai')
const FakeServer = require('./FakeServer')
const expectToThrow = require('expect-to-throw')

describe('get from table row', function () {
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

  describe('get — reading plain text cells', function () {
    it('must return the value of a cell identified by table caption and row filter', async function () {
      server.setBody(tableWithCaption({
        caption: 'personas',
        headers: ['nombre', 'edad'],
        rows: [['María', '35'], ['Juan', '28']]
      }))
      await user.open(server.url)

      const maria = await user.get('personas', {nombre: 'María'})
      const edad = await maria.get('edad')

      expect(edad).to.equal('35')
    })

    it('must return the correct row when there are multiple rows', async function () {
      server.setBody(tableWithCaption({
        caption: 'personas',
        headers: ['nombre', 'edad'],
        rows: [['María', '35'], ['Juan', '28']]
      }))
      await user.open(server.url)

      const juan = await user.get('personas', {nombre: 'Juan'})
      const edad = await juan.get('edad')

      expect(edad).to.equal('28')
    })

    it('must match caption and column headers ignoring case', async function () {
      server.setBody(tableWithCaption({
        caption: 'PERSONAS',
        headers: ['NOMBRE', 'EDAD'],
        rows: [['María', '35']]
      }))
      await user.open(server.url)

      const maria = await user.get('personas', {nombre: 'María'})
      const edad = await maria.get('edad')

      expect(edad).to.equal('35')
    })

    it('must match caption ignoring surrounding spaces', async function () {
      server.setBody(tableWithCaption({
        caption: '  personas  ',
        headers: ['nombre', 'edad'],
        rows: [['María', '35']]
      }))
      await user.open(server.url)

      const maria = await user.get('personas', {nombre: 'María'})
      const edad = await maria.get('edad')

      expect(edad).to.equal('35')
    })
  })

  describe('set — editing an input inside a cell', function () {
    it('must set a value in an input inside the matching row and read it back', async function () {
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

      const tarea = await user.get('tareas', {nombre: 'Arreglar bug'})
      await tarea.set('estado', 'hecho')
      const estado = await tarea.get('estado')

      expect(estado).to.equal('hecho')
    })
  })

  describe('doAction — clicking a button inside a row', function () {
    it('must perform an action on a button inside the matching row', async function () {
      server.setBody(`
        <label for="result">resultado</label>
        <input type="text" id="result" value="">
        <table>
          <caption>tareas</caption>
          <thead><tr><th>nombre</th><th>acciones</th></tr></thead>
          <tbody>
            <tr>
              <td>Arreglar bug</td>
              <td><button onclick="document.getElementById('result').value = 'eliminado'">eliminar</button></td>
            </tr>
            <tr>
              <td>Escribir tests</td>
              <td><button onclick="document.getElementById('result').value = 'eliminado incorrecto'">eliminar</button></td>
            </tr>
          </tbody>
        </table>
      `)
      await user.open(server.url)

      const tarea = await user.get('tareas', {nombre: 'Arreglar bug'})
      await tarea.doAction('eliminar')
      const resultado = await user.get('resultado')

      expect(resultado).to.equal('eliminado')
    })
  })

  describe('error cases', function () {
    it('must throw when the filter does not match any row', async function () {
      server.setBody(tableWithCaption({
        caption: 'personas',
        headers: ['nombre', 'edad'],
        rows: [['María', '35']]
      }))
      await user.open(server.url)

      await expectToThrow('row not found', async function () {
        await user.get('personas', {nombre: 'Pedro'})
      })
    })

    it('must throw when no table has the given caption', async function () {
      server.setBody(tableWithCaption({
        caption: 'productos',
        headers: ['nombre', 'precio'],
        rows: [['Pan', '1.5']]
      }))
      await user.open(server.url)

      await expectToThrow('table "personas" not found', async function () {
        await user.get('personas', {nombre: 'María'})
      })
    })

    it('must throw when there is no table at all', async function () {
      server.setBody('<p>no table here</p>')
      await user.open(server.url)

      await expectToThrow('table "personas" not found', async function () {
        await user.get('personas', {nombre: 'María'})
      })
    })

    it('must throw when the HTML uses divs instead of a semantic table', async function () {
      server.setBody('<div>personas</div><div>María</div><div>35</div>')
      await user.open(server.url)

      await expectToThrow('table "personas" not found', async function () {
        await user.get('personas', {nombre: 'María'})
      })
    })
  })
})
