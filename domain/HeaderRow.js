module.exports = function({webElement, By}){

    var cache = []

    return Object.freeze({
        getByName
    })

    async function getByName(headerName){
        var found = false
        var position = 0
        var name = await get(position)
        while(name && !found){
            if(name.toLowerCase() == headerName.toLowerCase()){
                found = true
            }else{
                position++
                name = await get(position)
            }
        }
        return {
            name,
            position
        }
    }

    async function get(position){
        var cached = cache[position]
        if(cached) return cached

        var headerInPosition = await webElement.findElement(By.css(`th:nth-child(${position+1})`))
        var value = await headerInPosition.getText()
        cache[position] = value
        return value
    }
}