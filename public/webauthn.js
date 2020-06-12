window.onload = function () {
  document.getElementById('register').onclick = function () {
    const username = readUsername()
    const useResidentKey = document.getElementById('use-resident-key').checked
    if (!username) {
      alert('username is empty')
    } else {
      register(username, useResidentKey)
    }
  }
  document.getElementById('login').onclick = function () {
    const username = readUsername()
    if (!username) {
      alert('username is empty')
    } else {
      login(username)
    }
  }
  document.getElementById('username-less-login').onclick = function () {
    login('')
  }
}

function readUsername() {
  return document.getElementById('username').value
}

function decodeBuffer(value) {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0))
}
function base64encode(arrayBuffer) {
  if (!arrayBuffer || arrayBuffer.length == 0) {
    return undefined
  }
  return btoa(String.fromCharCode.apply(null, new Uint8Array(arrayBuffer)))
}

function arrayBufferToString(arrayBuffer) {
  return String.fromCharCode.apply(null, new Uint8Array(arrayBuffer))
}

function register(username, useResidentKey) {
  fetch(`/api/register`, {
    method: 'PUT',
    body: JSON.stringify({ login: username, useResidentKey }),
    headers: {
      'content-type': 'application/json'
    }
  })
    .then((response) => {
      if (response.status !== 200) {
        if (response.status === 409) {
          throw new Error('Username already registered (409)')
        }
      }
      return response.json()
    })
    .then((data) => {
      const publicKey = {
        ...data.publicKey,
        challenge: decodeBuffer(data.publicKey.challenge),
        user: {
          ...data.publicKey.user,
          id: decodeBuffer(data.publicKey.user.id)
        }
      }
      navigator.credentials
        .create({ publicKey })
        .catch(() => {
          alert('aborted')
          throw new Error('aborted')
        })
        .then((rawAttestation) => {
          const attestation = {
            id: base64encode(rawAttestation.rawId),
            clientDataJSON: arrayBufferToString(rawAttestation.response.clientDataJSON),
            attestationObject: base64encode(rawAttestation.response.attestationObject)
          }

          return fetch(`/api/make-new-credential`, {
            method: 'PUT',
            body: JSON.stringify({ attestation }),
            headers: {
              'content-type': 'application/json'
            }
          })
        })
        .then((response) => {
          if (response.status === 200) {
            alert('Registration successful.')
          } else {
            throw new Error('Registration failed')
          }
        })
    })
    .catch((err) => {
      alert(err)
    })
}

function login(username) {
  fetch(`/api/login`, {
    method: 'PUT',
    body: JSON.stringify({ login: username }),
    headers: {
      'content-type': 'application/json'
    }
  })
    .then((response) => {
      if (response.status !== 200) {
        if (response.status === 404) {
          throw new Error('Username not found (404)')
        }
      }
      return response.json()
    })
    .then((data) => {
      const publicKey = {
        ...data.publicKey,
        challenge: decodeBuffer(data.publicKey.challenge),
        allowCredentials: data.publicKey.allowCredentials.map((cred) => ({ ...cred, id: decodeBuffer(cred.id) }))
      }
      navigator.credentials
        .get({
          publicKey
        })
        .then((rawAssertion) => {
          var assertion = {
            id: base64encode(rawAssertion.rawId),
            clientDataJSON: arrayBufferToString(rawAssertion.response.clientDataJSON),
            userHandle: base64encode(rawAssertion.response.userHandle),
            signature: base64encode(rawAssertion.response.signature),
            authenticatorData: base64encode(rawAssertion.response.authenticatorData)
          }

          return fetch(`/api/verify-assertion`, {
            method: 'PUT',
            body: JSON.stringify({ assertion }),
            headers: {
              'content-type': 'application/json'
            }
          })
        })
        .then((response) => {
          if (response.status === 200) {
            alert('Login successful')
          } else {
            throw new Error('Login failed')
          }
        })
    })
    .catch((err) => {
      alert(err)
    })
}
