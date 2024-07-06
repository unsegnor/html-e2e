const {TestUser} = require('html-e2e')

describe("anyTests", function(){
    it('anyTest', async function(){
        let testUser = await TestUser()
        testUser.close()
    })
})