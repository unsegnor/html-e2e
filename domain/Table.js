const Row = require('./Row')
const HeaderRow = require('./HeaderRow')

module.exports = function({webElement, By}){
    return Object.freeze({
        last
    })

    async function last(){
        var headerRow = await getHeaderRow()
        var lastTr = await webElement.findElement(By.css('tr:last-child'))
        var cells = await lastTr.findElements(By.css('td'))
        if(cells.length == 0){
            var tableName = await getName()
            throw new Error(`No rows on the table "${tableName}"`)
        }
        return Row({webElement: lastTr, By, headerRow})
    }

    async function getHeaderRow(){
        try{
            var headerRow = await webElement.findElement(By.css('tr:first-child'))
            return HeaderRow({webElement: headerRow, By})
        }catch{
            var tableName = await getName()
            throw new Error(`Missing header row on the table "${tableName}"`)
        }
    }

    async function getName(){
        var captionElement = await webElement.findElement(By.css('caption'))
        var name = await captionElement.getText()
        return name
    }
}