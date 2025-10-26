const { TestUser } = require('../index')
const { expect } = require('chai')
const FakeServer = require('./FakeServer')
const crypto = require('crypto');

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

  function getActionElementWithResult({type, text, id}){
    return `${getResultFieldWithLabel()}${getActionElementToWriteOnResult({type, text, id})}`
  }

  function getActionElementToWriteOnResult({type, text, id}){
    let _id = id ?? crypto.randomUUID()
    switch (type){
      case 'button': return `<button id="${_id}" onclick="document.getElementById('result').value = 'clicked'">${text}</button>`
      case 'input button': return `<input type="button" id="${_id}" onclick="document.getElementById('result').value = 'clicked'" value="${text}">`
      case 'input submit': return `<input type="submit" id="${_id}" onclick="document.getElementById('result').value = 'clicked'" value="${text}">`
      case 'link': return `<a href="#" id="${_id}" onclick="document.getElementById('result').value = 'clicked'">${text}</a>`
      default: throw new Error(`Unsupported type ${type}`)
    }
  }

  function getResultFieldWithLabel(){
    return '<label for="result">Result</label><input type="text" id="result">'
  }

  function generateInputWithLabel({type, label='anyLabel:', value='anyValue', inputId='any_id'}){
    let labelhtml = `<label for="${inputId}">${label}</label>`
    let inputElement = generateInput({type, value, id:inputId})
    return `${labelhtml}${inputElement}`
  }

  function generateInput({type, value, id}){
    let _id = id ?? crypto.randomUUID()
    if (type == 'textarea') return `<textarea id="${_id}">${value}</textarea>`
    if (type == 'text')  return `<input type="text" id="${_id}" value="${value}">`
    if (type == 'password')  return `<input type="password" id="${_id}" value="${value}">`
    throw new Error(`Unsupported type ${type}`)
  }

  function getElementTypeTextProperty(type){
    switch (type){
      case 'button': return 'innerText'
      case 'input button': return 'value'
      case 'input submit': return 'value'
      case 'link': return 'innerText'
      default: throw new Error(`There is no text property defined for type ${type}`)
    }
  }

  for(let elementType of [
    'button',
    'input button',
    'input submit',
    'link'
  ]){
    it(`must handle ${elementType} that are recreated during initial page load`, async function () {
      const actionHtml = getActionElementWithResult({type: elementType, text: 'target action', id: 'target-action'})
      const textProperty = getElementTypeTextProperty(elementType)
      
      await server.setBody(`
        <div id="action-container">
          ${actionHtml}
        </div>
        <script>
          const loadingDuration = 2000;
          const startTime = Date.now();
          
          const reloadInterval = setInterval(function() {
            const elapsed = Date.now() - startTime;
            
            if (elapsed > loadingDuration) {
              clearInterval(reloadInterval);
              return;
            }
            
            const container = document.getElementById('action-container');
            const targetAction = document.getElementById('target-action');
            if (targetAction) {
              targetAction.${textProperty} = 'target action';
            }
            container.innerHTML = '';
            container.innerHTML = '${actionHtml.replace(/'/g, "\\'")}';
          }, 50);
        </script>
      `)
      await user.open(server.url)
      await user.doAction('target action')

      const clicked = await user.get('result')
      expect(clicked).to.equal('clicked')
    })
  }

  for(let elementType of [
    'text',
    'textarea',
    'password'
  ]){
    it(`must handle ${elementType} inputs that are recreated during initial page load when getting value`, async function () {
      const inputHtml = generateInputWithLabel({type: elementType, label: 'test property', value: '18', inputId: 'test-input'})
      
      await server.setBody(`
        <div id="input-container">
          ${inputHtml}
        </div>
        <script>
          const loadingDuration = 2000;
          const startTime = Date.now();
          
          const reloadInterval = setInterval(function() {
            const elapsed = Date.now() - startTime;
            
            if (elapsed > loadingDuration) {
              clearInterval(reloadInterval);
              return;
            }
            
            const container = document.getElementById('input-container');
            const testInput = document.getElementById('test-input');
            if (testInput) {
              testInput.value = '18';
            }
            container.innerHTML = '';
            container.innerHTML = '${inputHtml.replace(/'/g, "\\'")}';
          }, 50);
        </script>
      `)
      await user.open(server.url)
      const value = await user.get('test property')

      expect(value).to.equal('18')
    })

    it(`must handle ${elementType} inputs that are recreated during initial page load when setting value`, async function () {
      const inputHtml = generateInputWithLabel({type: elementType, label: 'test property', value: 'old', inputId: 'test-input'})
      
      await server.setBody(`
        <div id="input-container">
          ${inputHtml}
        </div>
        <script>
          const loadingDuration = 2000;
          const startTime = Date.now();
          
          const reloadInterval = setInterval(function() {
            const elapsed = Date.now() - startTime;
            
            if (elapsed > loadingDuration) {
              clearInterval(reloadInterval);
              return;
            }
            
            const container = document.getElementById('input-container');
            const testInput = document.getElementById('test-input');
            if (testInput) {
              testInput.value = 'old';
            }
            container.innerHTML = '';
            container.innerHTML = '${inputHtml.replace(/'/g, "\\'")}';
          }, 50);
        </script>
      `)
      await user.open(server.url)
      await user.set('test property', 'new')
      const value = await user.get('test property')

      expect(value).to.equal('new')
    })
  }
})
