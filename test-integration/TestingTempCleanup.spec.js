const { TestUser } = require('../index')
const { expect } = require('chai')
const FakeServer = require('./FakeServer')
const fs = require('fs')
const os = require('os')

const ONE_MB = 1024 * 1024

describe('testing temp cleanup', function () {
  it('must not leave significant disk usage in temp or project dir after closing', async function () {
    const tempSizeBefore = dirSize(os.tmpdir())
    const projectSizeBefore = dirSize(__dirname)

    const server = await FakeServer()
    const user = await TestUser({ showBrowser: false })
    await user.open(server.url)
    await user.close()
    await server.close()

    const tempGrowth = dirSize(os.tmpdir()) - tempSizeBefore
    const projectGrowth = dirSize(__dirname) - projectSizeBefore

    expect(tempGrowth, `Temp dir grew by ${tempGrowth} bytes after closing (limit: ${ONE_MB} bytes)`).to.be.at.most(ONE_MB)
    expect(projectGrowth, `Project dir grew by ${projectGrowth} bytes after closing (limit: ${ONE_MB} bytes)`).to.be.at.most(ONE_MB)
  })
})

function dirSize (dirPath) {
  let total = 0
  let entries
  try {
    entries = fs.readdirSync(dirPath)
  } catch {
    return 0
  }
  for (const entry of entries) {
    const fullPath = `${dirPath}/${entry}`
    let stat
    try {
      stat = fs.statSync(fullPath)
    } catch {
      continue
    }
    total += stat.isDirectory() ? dirSize(fullPath) : stat.size
  }
  return total
}
