const router = require('express').Router()
const Persistence = require('../persistence')
const { newChallenge } = require('../util/common-util')
const base64url = require('base64url')
const webauthn = require('@frenatix/webauthn-js')

router.put('/register', async (req, res) => {
  try {
    const { login } = req.body
    console.log(`Call /api/register with login: ${login}`)

    if (!login) {
      console.error("login can't be empty")
      res.sendStatus(400)
      return
    }

    // Check if user already exists
    const user = await Persistence.UserDAO.getUserByLogin({ login })
    if (user) {
      console.warn('login already exists')
      res.sendStatus(409)
      return
    }

    // Create/replace new challenge for login
    const challengeBytes = newChallenge()
    const challenge = Buffer.from(challengeBytes).toString('base64')
    console.log(`New challenge: ${challenge}`)
    await Persistence.ChallengeDAO.deleteChallenge({ login })
    await Persistence.ChallengeDAO.createChallenge({ login, id: base64url.encode(challengeBytes) })

    res.json({
      publicKey: {
        rp: {
          name: 'webauthn demo server'
        },
        user: {
          id: Buffer.from(Uint8Array.from(login, (c) => c.charCodeAt(0))).toString('base64'),
          name: login,
          displayName: login
        },
        pubKeyCredParams: [
          {
            // External authenticators
            type: 'public-key',
            alg: -7
          },
          {
            // Windows Hello
            type: 'public-key',
            alg: -257
          }
        ],
        authenticatorSelection: {
          requireResidentKey: false, // true is username-less
          userVerification: 'preferred'
        },
        challenge,
        timeout: 60000,
        attestation: 'none'
      }
    })
  } catch (e) {
    console.log('Error on /api/register', e)
    res.sendStatus(500)
  }
})

router.put('/make-new-credential', async (req, res) => {
  try {
    const { attestation } = req.body
    console.log('Make new credential', attestation)

    // Check if the challenge was created by us
    const credentialJson = JSON.parse(attestation.clientDataJSON)
    const challenge = await Persistence.ChallengeDAO.getChallengeById({ id: credentialJson.challenge })
    if (!challenge) {
      console.error(`Challenge with id ${credentialJson.challenge} not found`)
      res.sendStatus(404)
      return
    }

    // TODO Check if challenge is still valid

    const credential = await webauthn.registerNewCredential({
      response: attestation,
      expectedChallenge: challenge.id,
      expectedHostname: 'localhost',
      isValidCredentialId: () => true,
      saveUserCredential: async ({ id, publicKeyJwk, signCount }) => {
        await Persistence.UserDAO.createUser({
          login: challenge.login,
          credentialId: id,
          publicKey: publicKeyJwk,
          signCount: signCount
        })
      }
    })
    console.log('Credential created', credential)

    res.sendStatus(200)
  } catch (e) {
    console.log('Error on /api/make-new-credential', e)
    res.sendStatus(500)
  }
})

router.put('/login', async (req, res) => {
  try {
    const { login } = req.body
    console.log('Login', login)

    const user = await Persistence.UserDAO.getUserByLogin({ login })
    if (!user) {
      res.sendStatus(404)
      return
    }
    const challengeBytes = newChallenge()
    const challenge = Buffer.from(challengeBytes).toString('base64')
    console.log(`New challenge: ${challenge}`)
    await Persistence.ChallengeDAO.deleteChallenge({ login })
    await Persistence.ChallengeDAO.createChallenge({ login, id: base64url.encode(challengeBytes) })

    res.json({
      publicKey: {
        allowCredentials: [
          {
            type: 'public-key',
            id: user.credentialId
          }
        ],
        challenge,
        userVerification: 'preferred'
      }
    })
  } catch (e) {
    console.log('Error on /api/login', e)
    res.senStatus(500)
  }
})

router.put('/verify-assertion', async (req, res) => {
  try {
    const { assertion } = req.body
    console.log('assertion', assertion)

    // Check if the challenge was created by us
    const credentialJson = JSON.parse(assertion.clientDataJSON)
    const challenge = await Persistence.ChallengeDAO.getChallengeById({ id: credentialJson.challenge })
    if (!challenge) {
      console.error(`Challenge with id ${credentialJson.challenge} not found`)
      res.sendStatus(404)
      return
    }

    const user = await Persistence.UserDAO.getUserByCredentialId({ credentialId: assertion.id })
    if (!user) {
      console.error('User not found')
      res.sendStatus(404)
      return
    }
    webauthn.verifyAssertion({
      response: assertion,
      credential: {
        publicKeyJwk: user.publicKey,
        signCount: user.signCount
      },
      expectedChallenge: challenge.id,
      expectedHostname: 'localhost',
      isAllowedCredentialId: () => true,
    })
    res.sendStatus(200)
  } catch (e) {
    console.log('Error on /api/verify-assertion', e)
    res.senStatus(500)
  }
})

module.exports = router
