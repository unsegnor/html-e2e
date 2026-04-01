const { TestUser } = require('../index')
const { expect } = require('chai')
const FakeServer = require('./FakeServer')
const fs = require('fs')
const os = require('os')

describe('testing temp cleanup', function () {
  it('must not leave scoped_dir* directories in temp after closing', async function () {
    const scopedDirsBefore = scopedDirsInTemp()

    const server = await FakeServer()
    const user = await TestUser({ showBrowser: false })
    await user.open(server.url)
    await user.close()
    await server.close()

    const scopedDirsAfter = scopedDirsInTemp()
    const newDirs = scopedDirsAfter.filter(d => !scopedDirsBefore.includes(d))

    expect(newDirs, `Chrome left ${newDirs.length} temporary directories after closing: ${newDirs.join(', ')}`).to.have.lengthOf(0)
  })
})

function scopedDirsInTemp () {
  return fs.readdirSync(os.tmpdir()).filter(name => name.startsWith('scoped_dir'))
}
