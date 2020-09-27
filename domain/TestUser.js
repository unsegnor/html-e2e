require('chromedriver');
const {asyncFindAll} = require('async-javascript')
const {Builder, By, Key, until} = require('selenium-webdriver');
let chrome = require('selenium-webdriver/chrome');

module.exports = async function(){
    var driver = await getDriver()

    var instance = Object.freeze({
        open,
        mustBeAbleTo,
        getValueFor,
        setValueFor,
        doAction,
        close
    })

    async function open(url){
        await driver.get(url);
    }

    async function doAction(description){
        var button = await getActionButtonFor(description)
        if(button) await button.click()
        else{
            var inputOption = await getActionInputFor(description)
            await inputOption.click()
        }
    }

    async function setValueFor(property, value){
        var relatedInput = await getPropertyInput(property)
        await relatedInput.clear()
        await relatedInput.sendKeys(value)
    }

    async function getValueFor(property){
        var relatedInput = await getPropertyInput(property)
        var relatedInputValue = await relatedInput.getAttribute('value')
    
        return relatedInputValue
    }

    async function getPropertyInput(property){
        var labels = await driver.findElements(By.tagName('label'))
        var propertyLabels = await asyncFindAll(labels, async function(label){
            var labelText = await label.getText()
            return labelText.toLowerCase().replace(':','') == property.toLowerCase()
        })

        var relatedInput

        if(propertyLabels.length == 0){
            //Look for placeholders in inputs
            var inputs = await driver.findElements(By.tagName('input'))
            var relatedInputs = await asyncFindAll(inputs, async function(input){
                var inputType = await input.getAttribute('type')
                if(inputType == 'text' || inputType == 'password'){
                    var inputPlaceholder = await input.getAttribute('placeholder')
                    return inputPlaceholder.toLowerCase() == property.toLowerCase()
                }
            })
            
            if(relatedInputs.length == 0) throw new Error(`Property "${property}" not found`)
            relatedInput = relatedInputs[0]
        }
        else{
            var propertyLabel = propertyLabels[0]
            var relatedInputId = await propertyLabel.getAttribute('for')
            var relatedInputs = await driver.findElements(By.id(relatedInputId))
            if(relatedInputs.length == 0){
                var propertyLabelText = await propertyLabel.getText()
                throw new Error(`Missing input field for label "${propertyLabelText}"`)
            }

            relatedInput = relatedInputs[0]
        }

        return relatedInput
    }

    async function getActionButtonFor(description){
        var buttons = await driver.findElements(By.tagName('button'))
        var buttonOptions = await asyncFindAll(buttons, async function(button){
            var buttonText = await button.getText()
            var buttonDisabled = await button.getAttribute('disabled')
            return buttonText.toLowerCase() == description.toLowerCase() && !buttonDisabled
        })

        if(buttonOptions.length > 1) throw new Error(`There are several button options to ${description}`)
        return buttonOptions[0]
    }

    async function getActionInputFor(description){
        var inputs = await driver.findElements(By.tagName('input'))
        var inputOptions = await asyncFindAll(inputs, async function(input){
            var inputType = await input.getAttribute('type')
            if(inputType == 'button'){
                var inputText = await input.getAttribute('value')
                var inputDisabled = await input.getAttribute('disabled')
                return inputText.toLowerCase() == description.toLowerCase() && !inputDisabled
            }
        })

        if(inputOptions.length > 1) throw new Error(`There are several input options to ${description}`)
        return inputOptions[0]
    }

    async function mustBeAbleTo(description){
        var buttonOption = await getActionButtonFor(description)
        var inputOption = await getActionInputFor(description)

        if(buttonOption && inputOption) throw new Error(`There are several options to ${description}`)
        if(!buttonOption && !inputOption) throw new Error(`User is not able to ${description}`)
    }

    async function close(){
        await driver.quit()
    }

    async function getDriver(retries){
        var retries = (retries == undefined)?3:retries
        var newDriver
        try{
            newDriver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(new chrome.Options().headless())
            .build();
            return newDriver
        }catch(e){
            //TODO implement abstract retry mechanism
            if(retries == 0) throw e

            return new Promise(function(resolve){
                setTimeout(async function(){
                    console.log('Error intializing webdriver. Retrying (Remaining retries: ', retries-1, ')')
                    resolve(getDriver(retries-1))
                }, 200)
            })
        }
    }

    return instance
}