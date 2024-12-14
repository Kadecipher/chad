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
function base64ToWordArray(base64) {
    try {
        return CryptoJS.enc.Base64.parse(base64);
    } catch (e) {
        return null;
    }
}

async function decrypt(ciphertextBase64) {
    try {
        const keyBase64 = await fetchKey();
        if (!keyBase64) {
            return null;
        }



        const key = CryptoJS.enc.Base64.parse(keyBase64.trim());
        const combined = CryptoJS.enc.Base64.parse(ciphertextBase64.trim());

        const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4), 16);
        const encryptedData = CryptoJS.lib.WordArray.create(combined.words.slice(4), combined.sigBytes - 16);


        const decrypted = CryptoJS.AES.decrypt({
            ciphertext: encryptedData
        }, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });

        const plaintext = decrypted.toString(CryptoJS.enc.Utf8);

        if (!plaintext) {
            throw new Error('Decryption result is empty or invalid');
        }

        return plaintext;
    } catch (e) {
        return null;
    }
}

function encryptCookieData(data, keyBase64) {
    const key = CryptoJS.enc.Base64.parse(keyBase64.trim());
    const iv = CryptoJS.lib.WordArray.random(16);

    const encryptedData = CryptoJS.AES.encrypt(data, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });

    const encryptedDataWithIV = iv.concat(encryptedData.ciphertext);

    return CryptoJS.enc.Base64.stringify(encryptedDataWithIV);
}

function decryptCookieData(encryptedDataBase64, keyBase64) {
    try {
        const key = CryptoJS.enc.Base64.parse(keyBase64.trim());
        const encryptedData = CryptoJS.enc.Base64.parse(encryptedDataBase64);

        const iv = CryptoJS.lib.WordArray.create(encryptedData.words.slice(0, 4), 16);
        const ciphertext = CryptoJS.lib.WordArray.create(encryptedData.words.slice(4), encryptedData.sigBytes - 16);

        const decrypted = CryptoJS.AES.decrypt({
            ciphertext: ciphertext
        }, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });

        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (e) {
        return null;
    }
}

function setEncryptedCookie(username, userId, keyBase64, days) {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + d.toUTCString();
    const sameSite = "SameSite=Lax";
    const secure = "Secure";

    const dataToEncrypt = `username=${username}&user_id=${userId}`;

    const encryptedData = encryptCookieData(dataToEncrypt, keyBase64);

    document.cookie = `encrypted_data=${encryptedData};${expires};path=/;${sameSite};${secure}`;
}

function getDecryptedCookie(keyBase64) {
    const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('encrypted_data='))
        ?.split('=')[1];

    if (cookieValue) {
        return decryptCookieData(cookieValue, keyBase64);
    }

    return null;
}

document.addEventListener('DOMContentLoaded', () => {
    const signinForm = document.getElementById('signin-form');
    const errorMessage = document.getElementById('error-message');

    signinForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const idOrUsername = document.getElementById('user-id').value;
        const password = document.getElementById('password').value;

        try {
            const data = await fetch('/api/get-users', {
                method: 'GET'
            }).then(response => response.json());
            const keyBase64 = await fetchKey();
            if (!keyBase64) {
                return;
            }

            let userFound = false;

            if (!Array.isArray(data.users)) {
                throw new Error('Invalid users data format.');
            }

            for (const user of data.users) {
                const decryptedData = await decrypt(user.encrypted);

                if (decryptedData) {
                    const [storedUsername, storedEmail, storedPassword] = decryptedData.split('\n');

                    if ((user.user_id === idOrUsername || storedUsername === idOrUsername) && storedPassword === password) {
                        setEncryptedCookie(storedUsername, user.user_id, keyBase64, 1);
                        window.location.href = 'home';
                        userFound = true;
                        break;
                    }
                }
            }

            if (!userFound) {
                errorMessage.style.display = 'block';
            }

        } catch (error) {}
    });
});