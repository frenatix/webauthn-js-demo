const { get, run } = require('../db')
const { makeSelect } = require('../util/sql-util')

const COLUMNS = [
  { name: 'c_login', alias: 'login' },
  { name: 'c_id', alias: 'id' },
  { name: 'c_validuntil', alias: 'validUntil' }
]

const deleteChallenge = ({login}) => {
  return run("DELETE FROM t_challenge WHERE c_login = $login", {$login: login})
}

const createChallenge = ({ login, id }) => {
  return run("INSERT INTO t_challenge (c_login, c_id, c_validuntil) values($login, $id, DATETIME(CURRENT_TIMESTAMP, '+2 minutes', 'localtime'))", {
    $login: login,
    $id: id,
  })
}

const getChallengeByLogin = ({ login }) => {
  return get(`SELECT ${makeSelect(COLUMNS)} FROM t_challenge WHERE c_login = $login`, { $login: login })
}

const getChallengeById = ({id}) => {
  return get(`SELECT ${makeSelect(COLUMNS)} FROM t_challenge WHERE c_id = $id`, {$id: id})
}

module.exports = { createChallenge, getChallengeByLogin, deleteChallenge, getChallengeById }