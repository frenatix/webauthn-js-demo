const router = require('express').Router()
const Persistence = require('../persistence')
const { newChallenge } = require('../util/common-util')
const base64url = require('base64url')
const webauthn = require('@frenatix/webauthn-js')

const WEBAUTHN_DOMAIN = process.env.WEBAUTHN_DOMAIN

router.put('/register', async (req, res) => {
  try {
    const { login, useResidentKey } = req.body
    console.log(`Call /api/register with login: ${login}, useResidentKey: ${useResidentKey}`)

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
          requireResidentKey: useResidentKey, // true is username-less
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

    const credential = await webauthn.registerNewCredential({
      response: attestation,
      getValidChallengeToken: async (challenge) => {
        const challengeToken = await Persistence.ChallengeDAO.getChallengeById({ id: challenge })
        // TODO Check if challenge is still valid
        return challengeToken
      },
      expectedHostname: WEBAUTHN_DOMAIN,
      isValidCredentialId: async (credentialId) => {
        // Check if there's already an user with this credentialId
        const user = await Persistence.UserDAO.getUserByCredentialId({ credentialId })
        return user ? false : true
      },
      saveUserCredential: async ({ id, publicKeyJwk, signCount, challengeToken }) => {
        await Persistence.UserDAO.createUser({
          login: challengeToken.login,
          credentialId: id,
          publicKey: publicKeyJwk,
          signCount: signCount
        })
        return true
      }
    })
    console.log('Credential created', credential)

    // Load user by credentialId
    const user = await Persistence.UserDAO.getUserByCredentialId({ credentialId: credential.id })
    res.json({ login: user.login })
  } catch (e) {
    console.log('Error on /api/make-new-credential', e)
    res.sendStatus(500)
  }
})

router.put('/login', async (req, res) => {
  try {
    const { login } = req.body
    console.log('Login', login)
    const isUsernameLess = login === ''

    let credentialId
    if (!isUsernameLess && login) {
      const user = await Persistence.UserDAO.getUserByLogin({ login })
      if (!user) {
        res.sendStatus(404)
        return
      }
      credentialId = user.credentialId
    }
    const challengeBytes = newChallenge()
    const challenge = Buffer.from(challengeBytes).toString('base64')
    console.log(`New challenge: ${challenge}`)
    await Persistence.ChallengeDAO.createChallenge({ login, id: base64url.encode(challengeBytes) })

    res.json({
      publicKey: {
        allowCredentials: isUsernameLess
          ? []
          : [
              {
                type: 'public-key',
                id: credentialId
              }
            ],
        challenge,
        userVerification: 'preferred',
        timeout: 60000,
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
    console.log('Verfiy assertion', assertion)

    const user = await Persistence.UserDAO.getUserByCredentialId({ credentialId: assertion.id })
    if (!user) {
      console.error('User not found')
      res.sendStatus(404)
      return
    }
    await webauthn.verifyAssertion({
      response: assertion,
      credential: {
        publicKeyJwk: user.publicKey,
        signCount: user.signCount
      },
      getValidChallengeToken: async (challenge) => {
        const challengeToken = await Persistence.ChallengeDAO.getChallengeById({ id: challenge })
        if (challengeToken.login !== '' && challengeToken.login !== user.login) {
          console.error('User und challenge mismatch')
          return undefined
        }
        // TODO Check if challenge is still valid
        return challengeToken
      },
      expectedHostname: WEBAUTHN_DOMAIN,
      isAllowedCredentialId: () => true, // Every credential ID is welcome :)
      updateSignCount: async ({ credentialId, oldSignCount, newSignCount }) => {
        console.log(`Update signCount from ${oldSignCount} to ${newSignCount}`)
        await Persistence.UserDAO.updateSignCount({ credentialId, oldSignCount, newSignCount })
      }
    })
    res.json({ login: user.login })
  } catch (e) {
    console.log('Error on /api/verify-assertion', e)
    res.senStatus(500)
  }
})

module.exports = router
