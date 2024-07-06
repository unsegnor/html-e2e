const {TestUser} = require('html-e2e')

describe("anyTests", function(){
    let testUser

    this.beforeEach(async function(){
        testUser = await TestUser()
    })

    it('anyTest', async function(){

    })
})