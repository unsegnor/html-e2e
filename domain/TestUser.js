let previousNodeEnv = process.env.NODE_ENV
process.env.NODE_ENV = 'test' //this is needed to get the install file from chromedriver/install
process.env.DETECT_CHROMEDRIVER_VERSION = true
const ChromedriverInstaller = require('chromedriver/install')
process.env.NODE_ENV = previousNodeEnv

const { asyncFindAll } = require('async-javascript')
const { Builder, By, Key, until } = require('selenium-webdriver')
const chrome = require('selenium-webdriver/chrome')
let isChromedriverInstalled = false

module.exports = async function (testUserOptions) {
  let _testUserOptions = testUserOptions ?? {showBrowser: false}
  let _showBrowser = _testUserOptions.showBrowser

  const driver = await getDriver()

  const instance = Object.freeze({
    open,
    mustBeAbleTo,
    get,
    getValueFor: get,
    set,
    setValueFor: set,
    doAction,
    getAll,
    getColumn,
    close
  })

  async function open (url) {
    await driver.get(url)
  }

  async function doAction (description) {
    await waitFor(noRunningProgress.bind(this))
    await retryOnStaleElement(async () => {
      const option = await Promise.race([
        waitFor(getActionButtonFor.bind(this, description)),
        waitFor(getActionInputFor.bind(this, description)),
        waitFor(getActionLinkFor.bind(this, description))
      ])

      if (!option) throw new Error(`user could not ${description}`)

      await option.click()
    })
  }

  async function noRunningProgress(){
    const progressTags = await driver.findElements(By.css('progress'))
    return (progressTags.length == 0)
  }

  async function set (property, value) {
    await waitFor(noRunningProgress.bind(this))
    await retryOnStaleElement(async () => {
      const relatedInput = await getPropertyInput(property)
      await relatedInput.clear()
      await relatedInput.sendKeys(value)
    })
  }

  async function get (property) {
    await waitFor(noRunningProgress.bind(this))
    return await retryOnStaleElement(async () => {
      const relatedInput = await getPropertyInput(property)
      const relatedInputValue = await relatedInput.getAttribute('value')

      return relatedInputValue
    })
  }

  async function getInputLookingForLabels(property){
    let relatedInput

    const labels = await driver.findElements(By.css('label'))
    const propertyLabels = await asyncFindAll(labels, async function (label) {
      const labelText = await label.getText()
      return labelText.toLowerCase().replace(':', '') == property.toLowerCase()
    })

    if (propertyLabels.length > 0){
      const propertyLabel = propertyLabels[0]
      const relatedInputId = await propertyLabel.getAttribute('for')
      var relatedInputs = await driver.findElements(By.id(relatedInputId))
      if (relatedInputs.length == 0) {
        const propertyLabelText = await propertyLabel.getText()
        throw new Error(`Missing input field for label "${propertyLabelText}"`)
      }

      relatedInput = relatedInputs[0]
    }

    return relatedInput
  }

  async function getInputLookingForPlaceholders(property){
    let relatedInput
    // Look for placeholders in inputs
    const inputs = await driver.findElements(By.css('input'))
    var relatedInputs = await asyncFindAll(inputs, async function (input) {
      const inputType = await input.getAttribute('type')
      if (inputType == 'text' || inputType == 'password') {
        const inputPlaceholder = await input.getAttribute('placeholder')
        return inputPlaceholder.toLowerCase().trim().replace('...', '') == property.toLowerCase()
      }
    })

    if (relatedInputs.length == 0){
      //Look for placeholders in textarea
      const textAreas = await driver.findElements(By.css('textarea'))
      relatedInputs = await asyncFindAll(textAreas, async function (textarea) {
          const inputPlaceholder = await textarea.getAttribute('placeholder')
          return inputPlaceholder.toLowerCase().trim().replace('...', '') == property.toLowerCase()
      })

      if (relatedInputs.length > 0) relatedInput = relatedInputs[0]
    }else{
      relatedInput = relatedInputs[0]
    }

    return relatedInput
  }

  async function getPropertyInput (property) {
    let relatedInput = await getInputLookingForLabels(property)
    if (!relatedInput) relatedInput = await getInputLookingForPlaceholders(property)
    if (!relatedInput) throw new Error(`Property "${property}" not found`)
    return relatedInput
  }

  async function waitFor (fn) {
    try {
      return await driver.wait(async function () {
        return fn()
      }, 5000)
    } catch (e) {
      if (e.name != 'TimeoutError') throw e
    }
  }

  async function retryOnStaleElement(fn, maxRetries = 5) {
    let lastError
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn()
      } catch (error) {
        if (error.name === 'StaleElementReferenceError' || error.name === 'ElementNotInteractableError') {
          lastError = error
          if (i < maxRetries - 1) {
            const delay = 200 * (i + 1)
            await new Promise(resolve => setTimeout(resolve, delay))
          }
          continue
        }
        throw error
      }
    }
    throw lastError
  }

  async function attributeHasValue({element, attribute, value}){
    const attributeValue = await element.getAttribute(attribute)
    if (!attributeValue) return false
    return attributeValue.toLowerCase().trim() == value.toLowerCase()
  }

  async function isDisabled(element){
    const attributeValue = await element.getAttribute('disabled')
    if (attributeValue) return true
  }

  async function getActionButtonFor (description) {
    const buttons = await driver.findElements(By.css('button'))
    const buttonOptions = await asyncFindAll(buttons, async function (button) {
      if (await isDisabled(button)) return false

      const buttonText = await button.getText()
      if (buttonText.toLowerCase().trim() == description.toLowerCase().trim()) return true

      if (await attributeHasValue({element: button, attribute: 'title', value: description})) return true
    })

    return buttonOptions[0]
  }

  async function getActionLinkFor (description) {
    const links = await driver.findElements(By.css('a'))
    const linkOptions = await asyncFindAll(links, async function (link) {
      if (await isDisabled(link)) return false

      const linkText = await link.getText()
      if (linkText.toLowerCase().trim() == description.toLowerCase().trim()) return true

      if (await attributeHasValue({element: link, attribute: 'title', value: description})) return true
    })

    return linkOptions[0]
  }

  async function getActionInputFor (description) {
    const inputs = await driver.findElements(By.css('input'))
    const inputOptions = await asyncFindAll(inputs, async function (input) {
      const inputType = await input.getAttribute('type')
      if (inputType == 'button' || inputType == 'submit') {
        if (await isDisabled(input)) return false
        if (await attributeHasValue({element: input, attribute: 'value', value: description})) return true
        if (await attributeHasValue({element: input, attribute: 'title', value: description})) return true
      }
    })

    return inputOptions[0]
  }

  async function getAll (label) {
    if (label) {
      const matchingTable = await findTableByCaption(label)
      if (matchingTable) {
        const headers = await getTableHeaders(matchingTable)
        const rows = await matchingTable.findElements(By.css('tbody tr'))
        return rows.map(row => makeRowObject(row, headers))
      }
    }

    const lists = await driver.findElements(By.css('ul, ol'))

    if (!label) {
      if (lists.length === 0) throw new Error('No list found')
      if (lists.length > 1) throw new Error('Multiple lists found, please specify a label')
      return getListItems(lists[0])
    }

    const matchingList = await findListByLabel(lists, label)
    if (matchingList) return getListItems(matchingList)

    throw new Error(`"${label}" not found`)
  }

  function makeRowObject (rowElement, headers) {
    return {
      get: async function (property) {
        const columnIndex = headers.indexOf(property.trim().toLowerCase())
        const cells = await rowElement.findElements(By.css('td'))
        const cell = cells[columnIndex]
        const inputs = await cell.findElements(By.css('input'))
        if (inputs.length > 0) return inputs[0].getAttribute('value')
        return cell.getText()
      },
      set: async function (property, value) {
        const columnIndex = headers.indexOf(property.trim().toLowerCase())
        const cells = await rowElement.findElements(By.css('td'))
        const inputs = await cells[columnIndex].findElements(By.css('input'))
        await inputs[0].clear()
        await inputs[0].sendKeys(value)
      },
      doAction: async function (text) {
        const buttons = await rowElement.findElements(By.css('button'))
        for (const button of buttons) {
          if ((await button.getText()).trim().toLowerCase() === text.trim().toLowerCase()) {
            return button.click()
          }
        }
        const links = await rowElement.findElements(By.css('a'))
        for (const link of links) {
          if ((await link.getText()).trim().toLowerCase() === text.trim().toLowerCase()) {
            return link.click()
          }
        }
        throw new Error(`Action "${text}" not found in row`)
      }
    }
  }

  async function getTableHeaders (table) {
    const headers = await table.findElements(By.css('thead th'))
    const texts = []
    for (const header of headers) {
      texts.push((await header.getText()).trim().toLowerCase())
    }
    return texts
  }

  async function findTableByCaption (label) {
    const tables = await driver.findElements(By.css('table'))
    for (const table of tables) {
      const captions = await table.findElements(By.css('caption'))
      if (captions.length > 0) {
        const captionText = await captions[0].getText()
        if (captionText.trim().toLowerCase() === label.trim().toLowerCase()) return table
      }
    }
    return null
  }

  async function getListItems (list) {
    const items = await list.findElements(By.css('li'))
    const texts = []
    for (const item of items) {
      texts.push(await item.getText())
    }
    return texts
  }

  async function findListByLabel (lists, label) {
    for (const list of lists) {
      const heading = await driver.executeScript(`
        let sibling = arguments[0].previousElementSibling
        while (sibling) {
          if (/^H[1-6]$/.test(sibling.tagName)) return sibling
          sibling = sibling.previousElementSibling
        }
        return null
      `, list)

      if (heading) {
        const headingText = await heading.getText()
        if (headingText.trim().toLowerCase() === label.trim().toLowerCase()) return list
      }
    }
    return null
  }

  async function getColumn (columnName) {
    const tables = await driver.findElements(By.css('table'))
    if (tables.length === 0) throw new Error('No table found')

    for (const table of tables) {
      const headers = await table.findElements(By.css('th'))
      for (let i = 0; i < headers.length; i++) {
        const headerText = await headers[i].getText()
        if (headerText.trim().toLowerCase() === columnName.trim().toLowerCase()) {
          return getColumnValues(table, i)
        }
      }
    }

    throw new Error(`Column "${columnName}" not found`)
  }

  async function getColumnValues (table, columnIndex) {
    const rows = await table.findElements(By.css('tbody tr'))
    const values = []
    for (const row of rows) {
      const cells = await row.findElements(By.css('td'))
      if (cells[columnIndex]) values.push(await cells[columnIndex].getText())
    }
    return values
  }

  async function mustBeAbleTo (description) {
    const options = await Promise.race([
      waitFor(getActionButtonFor.bind(this, description)),
      waitFor(getActionInputFor.bind(this, description))])
    if (!options || options.length == 0) throw new Error(`User is not able to ${description}`)
  }

  async function close () {
    await driver.quit()
  }

  async function ensureChromeDriverIsInstalled(){
    if(!isChromedriverInstalled){
      const installer = new ChromedriverInstaller()
      await installer.install()
      isChromedriverInstalled = true
    }
  }

  async function getDriver (retries) {
    await ensureChromeDriverIsInstalled()
    var retries = (retries == undefined) ? 3 : retries
    let newDriver
    try {
      let options = new chrome.Options()
      if(!_showBrowser) options.addArguments('--headless')
      newDriver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build()
      return newDriver
    } catch (e) {
      // TODO implement abstract retry mechanism
      if (retries == 0) throw e

      return new Promise(function (resolve) {
        setTimeout(async function () {
          console.log('Error intializing webdriver. Retrying (Remaining retries: ', retries - 1, ')')
          resolve(getDriver(retries - 1))
        }, 200)
      })
    }
  }

  return instance
}
