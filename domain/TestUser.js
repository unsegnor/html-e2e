let previousNodeEnv = process.env.NODE_ENV
process.env.NODE_ENV = 'test' //this is needed to get the install file from chromedriver/install
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
    close
  })

  async function open (url) {
    await driver.get(url)
  }

  async function doAction (description) {
    const option = await Promise.race([
      waitTo(getActionButtonFor.bind(this, description)),
      waitTo(getActionInputFor.bind(this, description)),
      waitTo(getActionLinkFor.bind(this, description))
    ])

    if (!option) throw new Error(`user could not ${description}`)

    await option.click()
  }

  async function set (property, value) {
    const relatedInput = await getPropertyInput(property)
    await relatedInput.clear()
    await relatedInput.sendKeys(value)
  }

  async function get (property) {
    const relatedInput = await getPropertyInput(property)
    const relatedInputValue = await relatedInput.getAttribute('value')

    return relatedInputValue
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

  async function waitTo (fn) {
    try {
      return await driver.wait(async function () {
        return fn()
      }, 5000)
    } catch (e) {
      if (e.name != 'TimeoutError') throw e
    }
  }

  async function getActionButtonFor (description) {
    const buttons = await driver.findElements(By.css('button'))
    const buttonOptions = await asyncFindAll(buttons, async function (button) {
      const buttonText = await button.getText()
      const buttonDisabled = await button.getAttribute('disabled')
      if (buttonDisabled) return false
      if (buttonText.toLowerCase().trim() == description.toLowerCase().trim()) return true

      const title = await button.getAttribute('title')
      return title.toLowerCase() == description.toLowerCase()
    })

    return buttonOptions[0]
  }

  async function getActionLinkFor (description) {
    const links = await driver.findElements(By.css('a'))
    const linkOptions = await asyncFindAll(links, async function (link) {
      const linkText = await link.getText()
      const isLinkDisabled = await link.getAttribute('disabled')
      if (isLinkDisabled) return false
      if (linkText.toLowerCase().trim() == description.toLowerCase().trim()) return true

      const title = await link.getAttribute('title')
      return title.toLowerCase() == description.toLowerCase()
    })

    return linkOptions[0]
  }

  async function getActionInputFor (description) {
    const inputs = await driver.findElements(By.css('input'))
    const inputOptions = await asyncFindAll(inputs, async function (input) {
      const inputType = await input.getAttribute('type')
      if (inputType == 'button' || inputType == 'submit') {
        const inputText = await input.getAttribute('value')
        const inputDisabled = await input.getAttribute('disabled')
        return inputText.toLowerCase().trim() == description.toLowerCase().trim() && !inputDisabled
      }
    })

    return inputOptions[0]
  }

  async function mustBeAbleTo (description) {
    const options = await Promise.race([
      waitTo(getActionButtonFor.bind(this, description)),
      waitTo(getActionInputFor.bind(this, description))])
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
