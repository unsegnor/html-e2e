const { TestUser } = require('../index')

describe('TestUserConcurrency tests', function () {
  it('creating and closing 1', async function () {
    const user = await TestUser()
    await user.close()
  })

  it('creating and closing 2', async function () {
    const user = await TestUser()
    await user.close()
    const user2 = await TestUser()
    await user2.close()
  })

  it('creating and closing 20', async function () {
    for (let i = 0; i < 20; i++) {
      const user = await TestUser()
      await user.close()
    }
  })
})
