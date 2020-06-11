window.onload = function () {
  document.getElementById('register').onclick = function () {
    const login = document.getElementById('login').value
    if (!login) {
      alert('username is empty')
    } else {
      register(login)
    }
  }
}

function _decodeBuffer(value) {
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

function register(login) {
  fetch(`/api/register`, {
    method: 'PUT',
    body: JSON.stringify({ login }),
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
        challenge: _decodeBuffer(data.publicKey.challenge),
        user: {
          ...data.publicKey.user,
          id: this._decodeBuffer(data.publicKey.user.id)
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
