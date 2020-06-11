const { exec } = require('./db')

const initDatabase = async () => {
  await exec(`
  CREATE TABLE IF NOT EXISTS t_user  (
    c_uid INTEGER NOT NULL,
    c_login varchar(255) UNIQUE NOT NULL,
    c_credentialid VARCHAR(255) NOT NULL,
    c_publickey JSON NOT NULL,
    c_signcount INTEGER NOT NULL,

    PRIMARY KEY (c_uid)
  )`)
  await exec(`
  CREATE TABLE IF NOT EXISTS t_challenge  (
    c_login varchar(255) UNIQUE NOT NULL,
    c_id VARCHAR(255) NOT NULL,
    c_validuntil DATETIME NOT NULL
  )`)
}

module.exports = { initDatabase }
