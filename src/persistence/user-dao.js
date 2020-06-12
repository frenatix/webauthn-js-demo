const { get, all, run } = require('../db')
const { makeSelect } = require('../util/sql-util')

const COLUMNS = [
  { name: 'c_uid', alias: 'uid' },
  { name: 'c_login', alias: 'login' },
  { name: 'c_credentialid', alias: 'credentialId' },
  { name: 'c_publickey', alias: 'publicKey' },
  { name: 'c_signcount', alias: 'signCount' }
]

const convertRow = (row) => {
  return {
    ...row,
    publicKey: JSON.parse(row.publicKey)
  }
}

const createUser = ({ login, credentialId, publicKey, signCount }) => {
  return run(
    'INSERT INTO t_user (c_login, c_credentialid, c_publickey, c_signcount) values($login, $credentialId, $publicKey, $signCount)',
    {
      $login: login,
      $credentialId: credentialId,
      $publicKey: JSON.stringify(publicKey),
      $signCount: signCount
    }
  )
}

const getUserByLogin = ({ login }) => {
  return get(`SELECT ${makeSelect(COLUMNS)} FROM t_user WHERE c_login = $login`, { $login: login }, (row) => {
    if (!row) return
    return convertRow(row)
  })
}

const getUserByCredentialId = ({ credentialId }) => {
  return get(
    `SELECT ${makeSelect(COLUMNS)} FROM t_user WHERE c_credentialid = $credentialId`,
    { $credentialId: credentialId },
    (row) => {
      if (!row) return
      return convertRow(row)
    }
  )
}

const getAllUsers = () => {
  return all(`SELECT ${makeSelect(COLUMNS)} FROM t_user`, {}, (rows) => {
    if (!rows) return
    return rows.map((row) => convertRow(row))
  })
}

module.exports = { createUser, getUserByLogin, getAllUsers, getUserByCredentialId }
