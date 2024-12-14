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

async function encryptData(username, email, password) {
    const keyBase64 = await fetchKey();
    if (!keyBase64) {
        throw new Error('Encryption key not available.');
    }

    const key = CryptoJS.enc.Base64.parse(keyBase64);
    const iv = CryptoJS.lib.WordArray.random(16);

    const plaintext = `${username}\n${email}\n${password}`;
    const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });

    const encryptedDataWithIV = iv.concat(encrypted.ciphertext);
    return CryptoJS.enc.Base64.stringify(encryptedDataWithIV);
}

document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signup-form');

    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const subscribeNewsletter = document.getElementById('subscribe-newsletter')?.checked;

        const errorMessage = document.getElementById('error-message');

        if (!subscribeNewsletter) {
            errorMessage.style.display = 'block';
            errorMessage.textContent = 'You must subscribe to the newsletter to sign up.';
            return;
        }

        if (!username || !email || !password) {
            errorMessage.style.display = 'block';
            errorMessage.textContent = 'All fields are required.';
            return;
        }

        if (password !== confirmPassword) {
            errorMessage.style.display = 'block';
            errorMessage.textContent = 'Passwords do not match.';
            return;
        }

        const newUser = {
            username,
            email,
            encrypted: await encryptData(username, email, password),
        };

        console.log('Sending user data:', newUser);

        try {
            const response = await fetch('/api/add-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newUser),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Sign-up failed.');
            }
            if (subscribeNewsletter) {
                try {
                    const mailchimpResponse = await fetch('connect.mailerlite.com/api/subscribers/140735016534541544', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI0IiwianRpIjoiNTZhY2Y5ZDAxOTQwMjc0ZjEzMTI4OTU4ODI4YmI0NzQ1NDhiYjE3NDZkZmQxNTA4Y2IyNmQ3NWVlNmQ0MDQyMjVhYTkwZjc4MzE1NmM0NTQiLCJpYXQiOjE3MzQyMTU0NzUuNTA1NTUzLCJuYmYiOjE3MzQyMTU0NzUuNTA1NTU2LCJleHAiOjQ4ODk4ODkwNzUuNTAxMzU5LCJzdWIiOiIxMjQ1MjM5Iiwic2NvcGVzIjpbXX0.acdVwdAG0SZwhtC_EzoDmHdO0dPITpyZ3mUwQW_LwP4Gkw-bTOywilk-g1P3yko8Yv29lgdqPnFfTYLK2kVMHwoZ-_-ttHs9WmPlH-sJpgRgWmLyFMnCe53F4kt3S1mvAByCK-QJTntWIugP_AKi9f2TGCoEsXuW9EIabs0EDUE2_94TagAdQqcDtVwvT1uPzkTgsyzYDvsoSrOlxe5U34jSr3x3SFdiN9ZKSgTfoYV15nxIAQmA3kpkS3ANLmN12ttd17O8VdiGxjlbc7pASQqkbme4r-SmELYtqs_s_5x_xIuFX3XN1TWKkOEMqiM2is81MKboz9v7USpr_CP4VEGeh7XW4r8_43OCaGe5dG0OAwcAsdkdxxuSN6Kri7TabjvOsExjpXQr6HQ81h4jldYu87_sdAiAJ3O6XmYXl2_0Ky48vUt1269_-yE7qrKtEvmv3P1uElFiqHOvCeIfXbz0l3PyrSHxe6HQLTiR9NZpK3johGDrROVwsEdWP-hDlQiYmu7YlmzTXXs5XEb0fqPeQ-PVtUWvbbp6_Stl3M8xeZ5ZRIs6-UErDZHAs7sFeZGDM2vInng6gJsqUfJ3A22x5_bTDOodGo8S1Vq-AhVNce6hRCt-3ojXkT1-pv33xvbAPD6Yw2ksuo0tFD5GMweUMZNXiDGCiSqRpFTwiO8',
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({
                            email_address: email,
                            status: 'active',
                        }),
                    });
                    
                    if (!mailchimpResponse.ok) {
                        throw new Error(`Error: ${mailchimpResponse.statusText}`);
                    }
                    
                    const data = await mailchimpResponse.json();
                    console.log(data);
                } catch (error) {
                    console.error('Request failed', error);
                }
                
            }
            const result = await response.json();
            console.log(result.message);
            window.location.href = 'home';
        } catch (error) {
            console.error('Error:', error.message);
            errorMessage.style.display = 'block';
            errorMessage.textContent = error.message;
        }
    });
});