const { TestUser } = require('../index')
const { expect } = require('chai')
const FakeServer = require('./FakeServer')

describe.only('stale element reproduction', function () {
  let server, user

  this.beforeEach(async function () {
    server = await FakeServer()
    user = await TestUser({showBrowser: false})
  })

  this.afterEach(async function () {
    await user.close()
    await server.close()
  })

  it('must handle buttons that are removed and recreated while searching for them', async function () {
    await server.setBody(`
      <div id="button-container">
        <button onclick="document.getElementById('result').value = 'clicked'">target action</button>
        <button>decoy button 1</button>
        <button>decoy button 2</button>
        <button>decoy button 3</button>
      </div>
      <label for="result">Result</label>
      <input type="text" id="result">
      <script>
        let counter = 0;
        setInterval(function() {
          counter++;
          const container = document.getElementById('button-container');
          container.innerHTML = \`
            <button onclick="document.getElementById('result').value = 'clicked'">target action</button>
            <button>decoy button 1</button>
            <button>decoy button 2</button>
            <button>decoy button 3</button>
            <button>dynamic button \${counter}</button>
          \`;
        }, 50);
      </script>
    `)
    await user.open(server.url)
    await user.doAction('target action')

    const clicked = await user.get('result')
    expect(clicked).to.equal('clicked')
  })
})
