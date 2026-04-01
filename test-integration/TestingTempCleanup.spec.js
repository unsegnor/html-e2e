const { TestUser } = require('../index')
const { expect } = require('chai')
const FakeServer = require('./FakeServer')
const fs = require('fs')
const os = require('os')

const ONE_MB = 1024 * 1024

describe('testing temp cleanup', function () {
  it('must not leave significant disk usage in temp after closing', async function () {
    const sizeBefore = tempDirSize()

    const server = await FakeServer()
    const user = await TestUser({ showBrowser: false })
    await user.open(server.url)
    await user.close()
    await server.close()

    const sizeAfter = tempDirSize()
    const growth = sizeAfter - sizeBefore

    expect(growth, `Temp dir grew by ${growth} bytes after closing (limit: ${ONE_MB} bytes)`).to.be.at.most(ONE_MB)
  })
})

function tempDirSize () {
  return dirSize(os.tmpdir())
}

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
