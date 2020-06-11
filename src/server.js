require('dotenv').config()
const express = require('express')
const http = require('http')
const db = require('./db')
const {initDatabase} = require('./initdb')
const bodyParser = require('body-parser')

const app = express()

const init = async () => {
  
  // Init sqlite database
  await db.connect(process.env.SQLITE_DATABASE_PATH)
  await initDatabase()

  app.use(express.static('public'))
  app.use(bodyParser.json({ limit: '1mb', extended: true }))

  app.use('/api', require('./api'))

  const server = http.createServer(app)
  server.listen(process.env.SERVER_LISTEN_PORT, process.env.SERVER_LISTEN_ADDRESS, () => {
    console.log(`Server listening on ${process.env.SERVER_LISTEN_ADDRESS}:${process.env.SERVER_LISTEN_PORT}!`)
  })
}

init()
