const crypto = require('crypto')

const newChallenge = () => {
  return crypto.randomBytes(32)
}

module.exports = { newChallenge }
