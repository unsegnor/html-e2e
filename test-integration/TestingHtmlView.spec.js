const { TestUser } = require('../index')
const { expect } = require('chai')
const FakeServer = require('./FakeServer')
const expectToThrow = require('expect-to-throw')
const crypto = require('crypto');

describe('testing html view', function () {
  let server, user

  this.beforeEach(async function () {
    server = await FakeServer()
    user = await TestUser()
  })

  this.afterEach(async function () {
    // Close the user before the server or it will hang
    await user.close()
    await server.close()
  })

  // TODO explore combinations of tests according to dimensions:
  // method, type of element, asynchronous loaded, after web load, after action, case sensitive, element does not exist, exists once, exists twice, added spaces in the name
  // try with all combinations and pairwise
  //identifier: label, placeholder
  //element type: text, textarea, pass option...

  describe('mustBeAbleTo', function () {
    describe('must find options', function () {
      it('in buttons text', async function () {
        server.setBody('<button>perform available option in button</button>')
        await user.open(server.url)
        await user.mustBeAbleTo('perform available option in button')
      })

      it('in buttons text ignoring case', async function () {
        server.setBody('<button>perform AVAILABLE option in button</button>')
        await user.open(server.url)
        await user.mustBeAbleTo('perform available OPTION in button')
      })

      it('in input buttons value', async function () {
        server.setBody('<input type="button" value="perform available option in button value">')
        await user.open(server.url)
        await user.mustBeAbleTo('perform available option in button value')
      })

      it('in input buttons value ignoring case', async function () {
        server.setBody('<input type="button" value="perform AVAILABLE option in button value">')
        await user.open(server.url)
        await user.mustBeAbleTo('perform available OPTION in button value')
      })

      it('in buttons text filled up to 1 second after loading the webpage', async function () {
        server.setBody(`
                    <script>setTimeout(function(){ document.getElementById('button1').innerText = 'perform available option in button'}, 1000)</script>
                    <button id="button1">provisional text while loading</button>
                    `)
        await user.open(server.url)
        await user.mustBeAbleTo('perform available option in button')
      })

      it('in buttons text filled up to 1 second after performing an action', async function () {
        server.setBody(`
                    <button id="button0" onclick="setTimeout(function(){ document.getElementById('button1').innerText = 'perform available option in button'}, 1000)">load more actions</button>
                    <button id="button1">provisional text while loading</button>
                    `)
        await user.open(server.url)
        await user.doAction('load more actions')
        await user.mustBeAbleTo('perform available option in button')
      })

      it('in input buttons text filled up to 1 second after loading the webpage', async function () {
        server.setBody(`
                    <script>setTimeout(function(){ document.getElementById('button1').value = 'perform available option in input button'}, 1000)</script>
                    <input type="button" id="button1" value="provisional text while loading">
                    `)
        await user.open(server.url)
        await user.mustBeAbleTo('perform available option in input button')
      })

      it('in input buttons text filled up to 1 second after performing an action', async function () {
        server.setBody(`
                    <button id="button0" onclick="setTimeout(function(){ document.getElementById('button1').value = 'perform available option in input button'}, 1000)">load more actions</button>
                    <input type="button" id="button1" value="provisional text while loading">
                    `)
        await user.open(server.url)
        await user.doAction('load more actions')
        await user.mustBeAbleTo('perform available option in input button')
      })
    })

    describe('must throw', function () {
      describe('when the option is not available because', function () {
        it('does not exist', async function () {
          await user.open(server.url)
          await expectToThrow('user is not able to perform not existing option', async function () {
            await user.mustBeAbleTo('perform not existing option')
          })
        })

        it('exists as input but is disabled', async function () {
          server.setBody('<input type="button" value="perform disabled option as input" disabled>')
          await user.open(server.url)
          await expectToThrow('user is not able to perform disabled option as input', async function () {
            await user.mustBeAbleTo('perform disabled option as input')
          })
        })

        it('exists as button but is disabled', async function () {
          server.setBody('<button disabled>perform disabled option as button</button>')
          await user.open(server.url)
          await expectToThrow('user is not able to perform disabled option as button', async function () {
            await user.mustBeAbleTo('perform disabled option as button')
          })
        })
      })
    })
  })

//TODO: add support for progress
//TODO: add support for tables

function generateInputWithLabel({type, label='anyLabel:', value='anyValue', inputId='any_id', labelFor=inputId}){
  let labelhtml = `<label for="${labelFor}">${label}</label>`
  let inputElement = generateInput({type, value, id:inputId})
  return `${labelhtml}${inputElement}`
}

function generateInput({type, value, id, placeholder}){
  let placeholderHtml = placeholder ? `placeholder="${placeholder}"` : ''
  let _id = id ?? crypto.randomUUID()
  if (type == 'textarea') return `<textarea id="${_id}" ${placeholderHtml}>${value}</textarea>`
  if (type == 'text')  return `<input type="text" id="${_id}" value="${value}" ${placeholderHtml}>`
  if (type == 'password')  return `<input type="password" id="${_id}" value="${value}" ${placeholderHtml}>`
  throw new Error(`Unsupported type ${type}`)
}

//TODO: get all the data in the test from the testCase and make a testCase generator to generate all of them according to some testing rules (like textarea has no placeholder)

const identifierTestCases = [
  {condition: '', labelName:'age', property: 'age'},
  {condition: 'ignoring case', labelName:'Age', property: 'agE'},
  {condition: 'ignoring spaces', labelName:' age ', property: 'age'},
  {condition: 'with several words', labelName:' Date of birth ', property: 'date of birth'},
]

const labelTestCases = [
  ...identifierTestCases,
  {condition: 'ignoring colon', labelName:' Age: ', property: 'age'}, 
]

const placeholderTestCases = [
  ...identifierTestCases,
  {condition: 'ignoring dots', labelName:' Age... ', property: 'age'},
]

for(let elementType of [
  'text',
  'textarea',
  'password'
]){
  describe('get', function () {
      describe(`when the identifier of ${elementType} element is in a label`, function () {
        for(let labelTestCase of labelTestCases){
          it(`must return the input value ${labelTestCase.condition}`, async function () {
            await server.setBody(generateInputWithLabel({type: elementType, label: labelTestCase.labelName, value: '18'}))
            await user.open(server.url)
            const age = await user.get(labelTestCase.property)
            expect(age).to.equal('18')
          })
        }
        it('must throw when the label includes the property but is not the entire word', async function () {
          await server.setBody(generateInputWithLabel({type: elementType, label: 'Marriage:', value: '1987-01-23'}))
          await user.open(server.url)
  
          await expectToThrow('property "age" not found', async function () {
            await user.get('age')
          })
        })
        it('must throw when the field related to the label does not exist', async function () {
          await server.setBody(generateInputWithLabel({type: elementType, label: 'Age:', inputId: 'age', labelFor: 'notexistingField'}))
          await user.open(server.url)
  
          await expectToThrow('missing input field for label "Age:"', async function () {
            await user.get('age')
          })
        })
      })
      describe(`when the identifier of ${elementType} element is in a placeholder`, function () {
        for(let placeholderTestCase of placeholderTestCases){
          it(`must return the input value ${placeholderTestCase.condition}`, async function () {
            await server.setBody(generateInput({type: elementType, placeholder: placeholderTestCase.labelName, value: '18'}))
            await user.open(server.url)
            const age = await user.get(placeholderTestCase.property)
            expect(age).to.equal('18')
          })
        }
        it(`must return the input value when there is another ${elementType} element without placeholder`, async function () {
          let body = generateInput({type: elementType}) +
          generateInput({type: elementType, placeholder: 'age', value: '18'})
          await server.setBody(body)
          await user.open(server.url)
          const age = await user.get('age')
          expect(age).to.equal('18')
        })
      })
  })

  describe('set', function () {
    describe(`when the identifier of ${elementType} element is in a label`, function () {
      for(let labelTestCase of labelTestCases){
        it(`must set the value in the input ${labelTestCase.condition}`, async function () {
          await server.setBody(generateInputWithLabel({type: elementType, label: labelTestCase.labelName, value:'oldvalue'}))
          await user.open(server.url)
          await user.set(labelTestCase.property, '18')

          const age = await user.get(labelTestCase.property)
          expect(age).to.equal('18')
        })
      }
      it('must throw when the label includes the property but is not the entire word', async function () {
        await server.setBody(generateInputWithLabel({type: elementType, label: ' Marriage: ', value:'oldvalue'}))
        await user.open(server.url)

        await expectToThrow('property "age" not found', async function () {
          await user.set('age', 'newValue')
        })
      })
      it('must throw when the field related to the label does not exist', async function () {
        await server.setBody(generateInputWithLabel({type: elementType, label: 'Age:', inputId: 'age', labelFor: 'notexistingField', value: 'oldvalue'}))
        await user.open(server.url)

        await expectToThrow('missing input field for label "Age:"', async function () {
          await user.set('age', 'newValue')
        })
      })
    })
    describe(`when the identifier of ${elementType} element is in a placeholder`, function () {
      for(let placeholderTestCase of placeholderTestCases){
        it(`must set the value ${placeholderTestCase.condition}`, async function () {
          await server.setBody(generateInput({type: elementType, placeholder: placeholderTestCase.labelName, value: 'oldvalue'}))
          await user.open(server.url)

          await user.set(placeholderTestCase.property, '18')

          const age = await user.get(placeholderTestCase.property)
          expect(age).to.equal('18')
        })
      }
    })
  })
}

  describe('doAction', function () {
    describe('when the action is a button', function () {
      it('must click the button', async function () {
        server.setBody(`
                    <label for="result">Result</label>
                    <input type="text" id="result">
                    <button onclick="document.getElementById('result').value = 'clicked'">perform action with button</button>
                `)
        await user.open(server.url)
        await user.doAction('perform action with button')

        const clicked = await user.get('result')
        expect(clicked).to.equal('clicked')
      })

      it('must not be case sensitive', async function () {
        server.setBody(`
                    <label for="result">Result</label>
                    <input type="text" id="result">
                    <button onclick="document.getElementById('result').value = 'clicked'">perform ACTION with button</button>
                `)
        await user.open(server.url)
        await user.doAction('perform action with BUTTON')

        const clicked = await user.get('result')
        expect(clicked).to.equal('clicked')
      })

      it('must ignore spaces in the beginning or the end', async function () {
        server.setBody(`
                    <label for="result">Result</label>
                    <input type="text" id="result">
                    <button onclick="document.getElementById('result').value = 'clicked'">   perform ACTION with button   </button>
                `)
        await user.open(server.url)
        await user.doAction(' perform action with BUTTON ')

        const clicked = await user.get('result')
        expect(clicked).to.equal('clicked')
      })

      it('must look also for matching title when content is an icon', async function () {
        server.setBody(`
                    <label for="result">Result</label>
                    <input type="text" id="result">
                    <button onclick="document.getElementById('result').value = 'clicked'" title="perform action with button"><span class="glyphicon"></span></button>
                `)
        await user.open(server.url)
        await user.doAction('perform action with button')

        const clicked = await user.get('result')
        expect(clicked).to.equal('clicked')
      })

      it('must click buttons which text is filled up to 1 second after loading the webpage', async function () {
        server.setBody(`
                    <script>setTimeout(function(){ document.getElementById('button1').innerText = 'perform action with button'}, 1000)</script>
                    <button id="button1" onclick="document.getElementById('result').value = 'clicked'">provisional text while loading</button>
                    <label for="result">Result</label>
                    <input type="text" id="result">
                    `)
        await user.open(server.url)
        await user.doAction('perform action with button')

        const clicked = await user.get('result')
        expect(clicked).to.equal('clicked')
      })

      it('must click buttons which text is filled up to 1 second after performing an action', async function () {
        server.setBody(`
                    <button id="button0" onclick="setTimeout(function(){ document.getElementById('button1').innerText = 'perform action with button'}, 1000)">load more actions</button>
                    <button id="button1" onclick="document.getElementById('result').value = 'clicked'">provisional text while loading</button>
                    <label for="result">Result</label>
                    <input type="text" id="result">
                    `)
        await user.open(server.url)
        await user.doAction('load more actions')
        await user.doAction('perform action with button')

        const clicked = await user.get('result')
        expect(clicked).to.equal('clicked')
      })
    })
    describe('when the action is an input button', function () {
      it('must click the button', async function () {
        server.setBody(`
                    <label for="result">Result</label>
                    <input type="text" id="result">
                    <input type="button" onclick="document.getElementById('result').value = 'clicked'" value="perform action with input button">
                `)
        await user.open(server.url)
        await user.doAction('perform action with input button')

        const result = await user.get('result')
        expect(result).to.equal('clicked')
      })

      it('must click input buttons which text is filled up to 1 second after loading the webpage', async function () {
        server.setBody(`
                    <script>setTimeout(function(){ document.getElementById('button1').value = 'perform action with button'}, 1000)</script>
                    <input type="button" id="button1" onclick="document.getElementById('result').value = 'clicked'" value="provisional text while loading">
                    <label for="result">Result</label>
                    <input type="text" id="result">
                    `)
        await user.open(server.url)
        await user.doAction('perform action with button')

        const clicked = await user.get('result')
        expect(clicked).to.equal('clicked')
      })

      it('must click input buttons which text is filled up to 1 second after performing an action', async function () {
        server.setBody(`
                    <button id="button0" onclick="setTimeout(function(){ document.getElementById('button1').value = 'perform action with button'}, 1000)">load more actions</button>
                    <input type="button" id="button1" onclick="document.getElementById('result').value = 'clicked'" value="provisional text while loading">
                    <label for="result">Result</label>
                    <input type="text" id="result">
                    `)
        await user.open(server.url)
        await user.doAction('load more actions')
        await user.doAction('perform action with button')

        const clicked = await user.get('result')
        expect(clicked).to.equal('clicked')
      })
    })
    describe('when the action is an input submit', function () {
      it('must click the button', async function () {
        server.setBody(`
                    <label for="result">Result</label>
                    <input type="text" id="result">
                    <input type="submit" onclick="document.getElementById('result').value = 'clicked'" value="perform action with input button">
                `)
        await user.open(server.url)
        await user.doAction('perform action with input button')

        const result = await user.get('result')
        expect(result).to.equal('clicked')
      })
    })
    describe('when the action is a link', function () {
      it('must click the link', async function () {
        server.setBody(`
                    <label for="result">Result</label>
                    <input type="text" id="result">
                    <a href="#" onclick="document.getElementById('result').value = 'clicked'">perform action with input link</a>
                `)
        await user.open(server.url)
        await user.doAction('perform action with input link')

        const result = await user.get('result')
        expect(result).to.equal('clicked')
      })

      it('must click the link which text is filled up to 1 second after loading the webpage', async function () {
        server.setBody(`
                    <script>setTimeout(function(){ document.getElementById('link1').text = 'perform action with link'}, 1000)</script>
                    <a href="#" id="link1" onclick="document.getElementById('result').value = 'clicked'">provisional text while loading</a>
                    <label for="result">Result</label>
                    <input type="text" id="result">
                    `)
        await user.open(server.url)
        await user.doAction('perform action with link')

        const clicked = await user.get('result')
        expect(clicked).to.equal('clicked')
      })

      it('must click the link which text is filled up to 1 second after performing an action', async function () {
        server.setBody(`
                    <button id="button0" onclick="setTimeout(function(){ document.getElementById('link1').text = 'perform action with link'}, 1000)">load more actions</button>
                    <a href="#" id="link1" onclick="document.getElementById('result').value = 'clicked'">provisional text while loading</a>
                    <label for="result">Result</label>
                    <input type="text" id="result">
                    `)
        await user.open(server.url)
        await user.doAction('load more actions')
        await user.doAction('perform action with link')

        const clicked = await user.get('result')
        expect(clicked).to.equal('clicked')
      })

      it('must ignore case', async function () {
        server.setBody(`
                    <label for="result">Result</label>
                    <input type="text" id="result">
                    <a href="#" onclick="document.getElementById('result').value = 'clicked'">perform ACTION with input link</a>
                `)
        await user.open(server.url)
        await user.doAction('perform action with input LINK')

        const result = await user.get('result')
        expect(result).to.equal('clicked')
      })

      it('must ignore spaces in the beginning or the end', async function () {
        server.setBody(`
                    <label for="result">Result</label>
                    <input type="text" id="result">
                    <a href="#" onclick="document.getElementById('result').value = 'clicked'">   perform ACTION with input link   </a>
                `)
        await user.open(server.url)
        await user.doAction(' perform action with input LINK ')

        const result = await user.get('result')
        expect(result).to.equal('clicked')
      })

      it('must look also for a matching title when the content is an icon', async function () {
        server.setBody(`
                    <label for="result">Result</label>
                    <input type="text" id="result">
                    <a href="#" onclick="document.getElementById('result').value = 'clicked'" title="perform ACTION with input link">+</a>
                `)
        await user.open(server.url)
        await user.doAction('perform action with input LINK')

        const result = await user.get('result')
        expect(result).to.equal('clicked')
      })

      it('must throw when the link is disabled', async function () {
        server.setBody(`
                    <label for="result">Result</label>
                    <input type="text" id="result">
                    <a href="#" onclick="document.getElementById('result').value = 'clicked'" disabled>perform action with input link</a>
                `)
        await user.open(server.url)

        await expectToThrow('user could not perform action with input link', async function () {
          await user.doAction('perform action with input link')
        })
      })
    })
  })
})
