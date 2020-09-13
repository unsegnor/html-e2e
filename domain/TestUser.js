require('chromedriver');
const {asyncFindAll} = require('async-javascript')
const {Builder, By, Key, until} = require('selenium-webdriver');

module.exports = async function(){
    var driver = await getDriver()

    var instance = Object.freeze({
        open,
        mustBeAbleTo,
        close
    })

    async function open(url){
        await driver.get(url);
    }

    async function mustBeAbleTo(description){
        var buttons = await driver.findElements(By.tagName('button'))
        var buttonOptions = await asyncFindAll(buttons, async function(button){
            var buttonText = await button.getText()
            var buttonDisabled = await button.getAttribute('disabled')
            return buttonText.toLowerCase() == description.toLowerCase() && !buttonDisabled
        })

        if(buttonOptions.length > 1) throw new Error(`There are several button options to ${description}`)
        var buttonOption = buttonOptions[0]


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
        var inputOption = inputOptions[0]

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
            newDriver = await new Builder().forBrowser('chrome').build();
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