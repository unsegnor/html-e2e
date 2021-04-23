const Row = require('./Row')
const HeaderRow = require('./HeaderRow')

module.exports = function({webElement, By}){
    return Object.freeze({
        last
    })

    async function last(){
        var headerRow = await getHeaderRow()
        var lastTr = await webElement.findElement(By.css('tr:last-child'))
        return Row({webElement: lastTr, By, headerRow})
    }

    async function getHeaderRow(){
        var headerRow = await webElement.findElement(By.css('tr:first-child'))
        return HeaderRow({webElement: headerRow, By})
    }
}