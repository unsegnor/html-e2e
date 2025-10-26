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

  it('must handle buttons that are recreated during initial page load', async function () {
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
        const loadingDuration = 2000;
        const startTime = Date.now();
        
        const reloadInterval = setInterval(function() {
          const elapsed = Date.now() - startTime;
          
          if (elapsed > loadingDuration) {
            clearInterval(reloadInterval);
            return;
          }
          
          const container = document.getElementById('button-container');
          container.innerHTML = \`
            <button onclick="document.getElementById('result').value = 'clicked'">target action</button>
            <button>decoy button 1</button>
            <button>decoy button 2</button>
            <button>decoy button 3</button>
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
