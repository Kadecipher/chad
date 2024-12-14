function decryptCookieData(encryptedBase64, keyBase64) {
    try {
        const key = CryptoJS.enc.Base64.parse(keyBase64.trim());
        const combined = CryptoJS.enc.Base64.parse(encryptedBase64.trim());

        const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4), 16);
        const encryptedData = CryptoJS.lib.WordArray.create(combined.words.slice(4), combined.sigBytes - 16);

        console.log("Decrypting with Key:", CryptoJS.enc.Hex.stringify(key));
        console.log("Extracted IV (Hex):", CryptoJS.enc.Hex.stringify(iv));
        console.log("Extracted Encrypted Data (Hex):", CryptoJS.enc.Hex.stringify(encryptedData));

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
        console.error('Error decrypting cookie data:', error);
        return null;
    }
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

async function getUserIp() {
    try {
        const response = await fetch('/api/ip');
        if (!response.ok) throw new Error('Failed to fetch IP');

        const data = await response.json();
        console.log('Fetched IP:', data.ip);
        return data.ip;
    } catch (error) {
        console.error('Error fetching IP address:', error);
        return null;
    }
}

async function checkUserId() {
    try {
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
        const response = await fetch('/api/get-secret-key', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}` 
            }
        });
        const keyBase64 = await response.text();
        console.log('Base64 Key:', keyBase64);

        const cookieValue = getCookie('encrypted_data');
        console.log('Encrypted cookie value:', cookieValue);

        if (cookieValue) {

            const userId = getUserIdFromCookie(keyBase64);
            console.log('Decrypted User ID:', userId);

            if (userId) {

                if (userId !== '0' && userId !== '1' && userId !== '2') {
                    window.location.href = 'home';
                    console.log('Redirecting to home');
                } else {

                    const ipAddress = await getUserIp();
                    console.log('User IP Address:', ipAddress);

                    // if (allowedIps.includes(ipAddress)) {
                    //  console.log('IP is allowed');
                    enableAdminMode();

                    // console.log('IP is not allowed');
                    //  alert('Access denied: Your IP is not allowed.'); 
                    //}
                }
            } else {
                console.log('User ID not found in the cookie');
                alert('Invalid user data or cookie corrupted.');
            }
        } else {
            console.log('No encrypted cookie found');
            alert('You must be logged in to access this page.');
        }
    } catch (error) {
        console.error('Error checking user ID:', error);
        alert('An error occurred while processing the user data.');
    }
}

checkUserId();

function enableAdminMode() {

    const contentWrapper = document.querySelector('.content-wrapper');
    contentWrapper.innerHTML = '';

    if (window.location.href === 'http://localhost:3000/home' || window.location.href === 'http://localhost:3000/') {
        contentWrapper.innerHTML = `
   <div class="Admin-mode-inputs">
    <label for="profile-image-input" class="custom-file-upload">Update Banner Image</label>
    <input type="file" id="profile-image-input" accept="image/*">
</div>
<div class="Admin-mode-inputs">
    <label for="description-input">Update Description</label>
    <input type="text" id="description-input" value="">
</div>
<div class="Admin-mode-inputs">
    <label for="weird-man-input" class="custom-file-upload">Update Profile Image</label>
    <input type="file" id="weird-man-input" accept="image/*">
</div>
<div class="Admin-mode-inputs">
    <button id="save-updates">Save Changes</button>
</div>

<style>
    .Admin-mode-inputs {
        background: #1a1a1a;
        border: 3px solid #444;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        padding: 20px;
        margin: 20px auto;
        max-width: 500px;
        text-align: center;
    }

    .Admin-mode-inputs label {
        display: block;
        margin: 10px 0 5px;
        font-weight: bold;
        color: #fff;
    }

    .Admin-mode-inputs input[type="text"] {
        width: 100%;
        padding: 10px;
        background-color: #ED2939;
        color: white;
        border: 1px solid #ED2939;
        border-radius: 4px;
        margin-bottom: 15px;
    }

    .Admin-mode-inputs label.custom-file-upload {
        display: inline-block;
        padding: 10px 20px;
        background-color: #ED2939;
        color: white;
        border: 2px solid #ED2939;
        border-radius: 5px;
        cursor: pointer;
        margin-bottom: 15px;
        transition: background-color 0.3s, color 0.3s;
    }

    .Admin-mode-inputs input[type="file"] {
        display: none;
    }

    .Admin-mode-inputs label.custom-file-upload:hover {
        background-color: #abb8c3;
        color: #ED2939;
    }

    .Admin-mode-inputs #save-updates {
        background-color: #ED2939;
        color: white;
        padding: 10px 15px;
        border: 2px solid #ED2939;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
        transition: background-color 0.3s, color 0.3s;
    }

    .Admin-mode-inputs #save-updates:hover {
        background-color: #abb8c3;
        color: #ED2939;
    }

    .error {
        color: #FF5722;
        margin-top: 10px;
        text-align: center;
    }
</style>
`;

        document.getElementById('save-updates').addEventListener('click', saveUpdates);
    }
}

function uploadImage(fileInput, existingImageName) {
    if (!fileInput || fileInput.files.length === 0) {
        console.error("No file selected");
        return Promise.reject("No file selected");
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("image", file);
    formData.append("imageName", existingImageName);

    console.log('Uploading image:', file.name);
    console.log('With existing image name:', existingImageName);

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/admin/save-image", true);

        xhr.onload = function() {
            if (xhr.status === 200) {
                console.log("Image uploaded and replaced successfully:", xhr.responseText);
                resolve(xhr.responseText);
            } else {
                console.error("Upload failed:", xhr.statusText);
                reject(xhr.statusText);
            }
        };

        xhr.onerror = function() {
            console.error("Network error");
            reject("Network error");
        };

        xhr.send(formData);
    });
}

function saveUpdates() {
    try {
        const profileImageInput = document.getElementById("profile-image-input");
        const weirdManImageInput = document.getElementById("weird-man-input");
        const description = document.getElementById("description-input").value;

        const existingProfileImageName = "profile.png";
        const existingWeirdManImageName = "weird-man.png";

        let uploadPromises = [];
        let infoUpdates = {};

        if (profileImageInput.files.length > 0) {
            uploadPromises.push(uploadImage(profileImageInput, existingProfileImageName));
        }

        if (weirdManImageInput.files.length > 0) {
            uploadPromises.push(uploadImage(weirdManImageInput, existingWeirdManImageName));
        }

        if (description.trim() !== "") {
            infoUpdates.description = description;
        }

        Promise.all(uploadPromises)
            .then(responses => {
                console.log("All uploads completed: ", responses);

                if (Object.keys(infoUpdates).length > 0) {
                    return saveInfoUpdates(infoUpdates);
                }
                return Promise.resolve();
            })
            .then(() => {
                alert('Updates saved successfully!');
                window.location.href = 'home';
            })
            .catch(error => {
                console.error("Update failed: ", error);
                alert('Failed to save updates.');
            });
    } catch (error) {
        console.error("Error:", error.message);
        alert('An unexpected error occurred.');
    }
}

async function saveInfoUpdates(newInfo) {
    try {
        const response = await fetch('http://localhost:3000/api/admin/update-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newInfo),
        });

        if (!response.ok) {
            const errorResponse = await response.text();
            throw new Error(`Network response was not ok: ${errorResponse}`);
        }

        const result = await response.json();
        console.log('Info update successful:', result);
    } catch (error) {
        console.error('Error updating info.json:', error);
        alert('Failed to save updates.');
    }
}

checkUserId();