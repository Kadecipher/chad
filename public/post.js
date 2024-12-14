let postId;
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    postId = urlParams.get('id');

    if (postId) {
        fetchPosts(postId);
    } else {
        displayError('Post not found');
    }
});

function getPostIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

function fetchPosts(postId) {
    fetch('data/posts.json')
        .then(response => response.json())
        .then(posts => {
            const post = posts.find(post => post.id === postId);
            if (post) {
                displayPost(post);
                fetchMessages(postId);
            } else {
                displayError('Post not found');
            }
        })
        .catch(error => {
            displayError('Error loading post.');
        });
}

function fetchMessages(postId) {
    fetch('data/posts-messages.json')
        .then(response => response.text())
        .then(text => {
            if (!text.trim()) {
                throw new Error('Empty response');
            }
            try {
                const messages = JSON.parse(text);
                const messagesForPost = messages[postId] || [];
                displayMessages(messagesForPost);
                document.getElementById('create-post-container').style.display = 'block';
            } catch (error) {
                displayError('Error loading messages.');
            }
        })
        .catch(error => {
            displayError('Error loading messages.');
        });
}

function displayPost(post) {
    const postTitle = document.getElementById('post-title');
    const postContent = document.getElementById('post-content');

    if (!postTitle || !postContent) {
        return;
    }

    if (post.imageSrc) {
        const postImage = document.createElement('img');
        postImage.src = post.imageSrc;
        postImage.alt = 'Post Image';
        postImage.classList.add('post-image'); 

        postContent.prepend(postImage);
    }

    postTitle.textContent = post.title;

    if (post.description) {
        postContent.innerHTML += `<p class="hide14">${post.description}</p>`;
    }

    if (post.content) {
        postContent.innerHTML += `<p>${post.content}</p>`;
    }
}

function displayMessages(messages = []) {
    const messagesContainer = document.getElementById('messages-container');

    if (!messagesContainer) {
        return;
    }

    messagesContainer.innerHTML = '';

    if (messages.length > 0) {
        messages.forEach(message => {
            const messageSection = document.createElement('div');
            messageSection.classList.add('message-box');

            const userIdElement = document.createElement('p');
            userIdElement.classList.add('project_x');
            userIdElement.textContent = `User ID: ${message['user-id']}`;
            messageSection.appendChild(userIdElement);

            const messageTitle = document.createElement('h4');
            messageTitle.textContent = message.title || 'No Title';

            const messageContent = document.createElement('p');
            messageContent.textContent = message.content || 'Content not available';

            messageSection.appendChild(messageTitle);
            messageSection.appendChild(messageContent);

            messagesContainer.appendChild(messageSection);
        });
    }
}

function displayError(message) {
    const postTitle = document.getElementById('post-title');
    const postContent = document.getElementById('post-content');

    if (postTitle && postContent) {
        postTitle.textContent = message;
        postContent.textContent = '';
    }
}

document.getElementById('create-post-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const title = document.getElementById('message-title').value;
    const content = document.getElementById('message-content').value;

    if (!title || !content) {
        alert('Title and content are required.');
        return;
    }

    const userId = await getUserIdFromCookie();
    if (!userId) {
        alert('You must be logged in to post messages.');
        return;
    }

    const postId = getPostIdFromURL();

    if (!postId) {
        alert('Post ID is missing!');
        return;
    }


    const newMessage = {
        title: title,
        content: content,
        postId: postId,
        "user-id": userId
    };


    fetch('/update-messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: newMessage
            })
        })
        .then(response => response.json())
        .then(data => {
            alert('Message posted successfully!');
            document.getElementById('create-post-form').reset();

            const messageSection = document.createElement('div');
            messageSection.classList.add('message-box');

            const messageTitle = document.createElement('h4');
            messageTitle.textContent = newMessage.title;

            const messageContent = document.createElement('p');
            messageContent.textContent = newMessage.content;

            messageSection.appendChild(messageTitle);
            messageSection.appendChild(messageContent);

            const messagesContainer = document.getElementById('messages-container');
            if (messagesContainer) {
                messagesContainer.appendChild(messageSection);
            }
        })
});

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


        const decryptedData = decryptCookieData(encryptedCookie, keyBase64.trim());
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

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}