const {asyncSome, asyncFind} = require('async-javascript')
const {Builder, By, Key, until} = require('selenium-webdriver');
 
/*(async function example() {
  let driver = await new Builder().forBrowser('firefox').build();
  try {
    await driver.get('http://www.google.com/ncr');
    await driver.findElement(By.name('q')).sendKeys('webdriver', Key.RETURN);
    await driver.wait(until.titleIs('webdriver - Google Search'), 1000);
  } finally {
    await driver.quit();
  }
})();*/

process.env['PATH'] = process.env['PATH'] + ':/home/vcalatayud/browserdrivers'

module.exports = async function(){
    let driver = await new Builder().forBrowser('chrome').build();

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
        var buttonOption = await asyncFind(buttons, async function(button){
            var buttonText = await button.getText()
            var buttonDisabled = await button.getAttribute('disabled')
            return buttonText.toLowerCase() == description.toLowerCase() && !buttonDisabled
        })

        var inputs = await driver.findElements(By.tagName('input'))
        var inputOption = await asyncFind(inputs, async function(input){
            var inputType = await input.getAttribute('type')
            if(inputType == 'button'){
                var inputText = await input.getAttribute('value')
                var inputDisabled = await input.getAttribute('disabled')
                return inputText.toLowerCase() == description.toLowerCase() && !inputDisabled
            }
        })

        if(!buttonOption && !inputOption) throw new Error(`User is not able to ${description}`)
    }

    async function close(){
        await driver.quit()
    }

    return instance
}