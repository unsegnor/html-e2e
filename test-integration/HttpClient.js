const http = require('http')

module.exports = function () {
  return Object.freeze({
    get
  })

  async function get (url) {
    return new Promise(function (resolve) {
      http.get(url, function (response) {
        let data = ''
        response.on('data', function (chunk) {
          data += chunk
        })
        response.on('end', function () {
          resolve(data)
        })
      })
    })
  }
}
