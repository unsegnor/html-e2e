module.exports = function({webElement, By, headerRow}){
    return Object.freeze({
        get
    })

    async function get(columnName){
        var header = await headerRow.getByName(columnName)
        var cell = await webElement.findElement(By.css(`td:nth-child(${header.position+1})`))
        return await cell.getText()
    }
}