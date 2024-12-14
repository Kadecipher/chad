let cachedKeyBase64 = null;
let API_KEY = null; 

async function fetchKey() {
    const configResponse = await fetch('/api/get-config');
    if (configResponse.ok) {
        const configData = await configResponse.json();
        API_KEY = configData.apiKey;
    } else {
        console.error("Failed to fetch API config");
    }
    if (cachedKeyBase64) {
        return cachedKeyBase64;
    }

    try {
        const response = await fetch('/api/get-secret-key', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}` 
            }
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        const keyBase64 = data.key.trim();

        cachedKeyBase64 = keyBase64;
        return cachedKeyBase64;
    } catch (error) {
        return null;
    }
}

function decryptCookieData(encryptedBase64, keyBase64) {
    try {
        if (!encryptedBase64 || !keyBase64) {
            throw new Error('Encrypted data or key is missing');
        }


        const key = CryptoJS.enc.Base64.parse(keyBase64);
        const combined = CryptoJS.enc.Base64.parse(encryptedBase64);

        const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4), 16);
        const encryptedData = CryptoJS.lib.WordArray.create(combined.words.slice(4), combined.sigBytes - 16);



        const decrypted = CryptoJS.AES.decrypt({
            ciphertext: encryptedData
        }, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7,
        });

        const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
        if (!plaintext) {
            throw new Error('Decryption resulted in an empty string.');
        }

        return plaintext;
    } catch (error) {
        return null;
    }
}

async function getUserIdFromCookie() {
    try {
        const keyBase64 = await fetchKey();
        if (!keyBase64) {
            return null;
        }


        const encryptedCookie = getCookie('encrypted_data');
        if (!encryptedCookie) {
            return null;
        }


        const decryptedData = decryptCookieData(encryptedCookie, keyBase64);
        if (!decryptedData) {
            return null;
        }

        const match = decryptedData.match(/user_id=(\d+)/);
        if (match) {
            return match[1];
        }

        return null;
    } catch (error) {
        return null;
    }
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        const cookieValue = parts.pop().split(';').shift();
        return cookieValue;
    }
    return null;
}

function deleteCookie(name) {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
}

function signOut() {
    deleteCookie('encrypted_data');
    window.location.href = '/home';
}

async function updateAuthButton() {
    try {
        const userId = await getUserIdFromCookie();

        const authButton = document.getElementById('auth-button');
        const authButtonDropdown = document.getElementById('auth-button-dropdown');

        if (authButton) {
            if (userId) {
                authButton.querySelector('a').href = '#';
                authButton.querySelector('a').textContent = 'Sign Out';
                authButton.querySelector('a').addEventListener('click', function(event) {
                    event.preventDefault();
                    signOut();
                });
            } else {
                authButton.querySelector('a').href = '/signin';
                authButton.querySelector('a').textContent = 'Sign In';
            }
        }

        if (authButtonDropdown) {
            if (userId) {
                authButtonDropdown.href = '#';
                authButtonDropdown.textContent = 'SIGN OUT';
                authButtonDropdown.addEventListener('click', function(event) {
                    event.preventDefault();
                    signOut();
                });
            } else {
                authButtonDropdown.href = '/signin';
                authButtonDropdown.textContent = 'SIGN IN';
            }
        }
    } catch (error) {}
}

document.addEventListener('DOMContentLoaded', updateAuthButton);