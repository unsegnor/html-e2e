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
    close
  })

  async function open (url) {
    await driver.get(url)
  }

  async function doAction (description) {
    await waitFor(noRunningProgress.bind(this))
    const option = await Promise.race([
      waitFor(getActionButtonFor.bind(this, description)),
      waitFor(getActionInputFor.bind(this, description)),
      waitFor(getActionLinkFor.bind(this, description))
    ])

    if (!option) throw new Error(`user could not ${description}`)

    await option.click()
  }

  async function noRunningProgress(){
    const progressTags = await driver.findElements(By.css('progress'))
    return (progressTags.length == 0)
  }

  async function set (property, value) {
    await waitFor(noRunningProgress.bind(this))
    const relatedInput = await getPropertyInput(property)
    await relatedInput.clear()
    await relatedInput.sendKeys(value)
  }

  async function get (property) {
    await waitFor(noRunningProgress.bind(this))
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

  async function waitFor (fn) {
    try {
      return await driver.wait(async function () {
        return fn()
      }, 5000)
    } catch (e) {
      if (e.name != 'TimeoutError') throw e
    }
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
