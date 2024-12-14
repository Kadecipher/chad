let previewId;
let currentChapter = 0;
let currentPage = 0;
let bookData = null;
let contentWrapper;

document.addEventListener('DOMContentLoaded', async () => {
    contentWrapper = document.querySelector('.content-wrapper');
    const urlParams = new URLSearchParams(window.location.search);
    previewId = urlParams.get('id') || 'defaultId';

    if (previewId) {
        try {
            const response = await fetch(`/api/preview?id=${previewId}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            bookData = await response.json();
            loadPage(currentChapter, currentPage);
        } catch (error) {
            document.body.innerHTML = `<p>Error fetching book data</p>`;
        }
    }
    styleButtons();
});

function styleButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (prevBtn && nextBtn) {
        const buttons = [prevBtn, nextBtn];
        buttons.forEach((button) => {
            button.style.padding = '16px 32px';
            button.style.fontSize = '18px';
            button.style.borderRadius = '8px';
            button.style.minWidth = '60px';
        });
    }
}

async function loadPage(chapterIndex, pageIndex) {
    if (!bookData) return;

    const chapter = bookData.chapters[chapterIndex];
    const page = chapter?.pages?.[pageIndex];

    if (!chapter || !page) {
        return;
    }

    const chapterTitle = document.getElementById('chapterTitle');
    const pageContent = document.getElementById('pageContent');
    const pageNumber = document.getElementById('pageNumber');

    if (page.requireAccount) {
        const userId = await getUserIdFromCookie();
        if (!userId) {
            showSignInModal();
            chapterTitle.textContent = "Are u trying to pirate this by undoing my bluring";
            pageContent.innerHTML = `<p>It's truly impressive how some people will go to any length to avoid spending a few dollars on a book—going so far as to risk their devices, their privacy, and possibly their entire digital identity in the process. The audacity of thinking that pirating a book is somehow a "smart move" is beyond comprehension. Sure, it may feel like a little victory to get your hands on that coveted text without paying for it, but all you're really doing is undermining the hard work of authors, editors, and publishers who’ve dedicated countless hours to producing something worth reading. After all, it's not like the writer can magically live on air and applause, right?
Let’s not forget the irony here. You could’ve just bought the book and enjoyed a legitimate, stress-free reading experience, but instead, you chose the shady, secretive route as if you’re some kind of digital outlaw. The best part? The book, which could have enriched your life, is now just another item on a long list of stolen goods you’ll forget about in a week. It’s almost poetic how many times pirates end up with nothing but regret, not to mention the risk of your devices being infected or your personal data exposed. But hey, who needs ethical choices when you can act like you’re hacking the system, right?</p>`;
            pageNumber.textContent = "14";
            return;
        }
    }
    if (!page.isAvailable) {
        showPurchaseModal();
        chapterTitle.textContent = "Are u trying to pirate this by undoing my bluring";
        pageContent.innerHTML = `<p>It's truly impressive how some people will go to any length to avoid spending a few dollars on a book—going so far as to risk their devices, their privacy, and possibly their entire digital identity in the process. The audacity of thinking that pirating a book is somehow a "smart move" is beyond comprehension. Sure, it may feel like a little victory to get your hands on that coveted text without paying for it, but all you're really doing is undermining the hard work of authors, editors, and publishers who’ve dedicated countless hours to producing something worth reading. After all, it's not like the writer can magically live on air and applause, right?
Let’s not forget the irony here. You could’ve just bought the book and enjoyed a legitimate, stress-free reading experience, but instead, you chose the shady, secretive route as if you’re some kind of digital outlaw. The best part? The book, which could have enriched your life, is now just another item on a long list of stolen goods you’ll forget about in a week. It’s almost poetic how many times pirates end up with nothing but regret, not to mention the risk of your devices being infected or your personal data exposed. But hey, who needs ethical choices when you can act like you’re hacking the system, right?</p>`;
        pageNumber.textContent = "14";
        return;
    }
    chapterTitle.textContent = chapter.chapterTitle;
    pageContent.textContent = page.content || "Content unavailable.";
    pageNumber.textContent = `Page ${page.pageNumber}`;
}

async function nextPage() {
    if (!bookData) return;

    const chapter = bookData.chapters[currentChapter];
    if (!chapter) return;

    const page = chapter.pages[currentPage];
    if (!page?.isAvailable) {
        return;
    }

    if (page.requireAccount) {
        const userId = await getUserIdFromCookie(); 
        if (!userId) {
            return;
        }
    }

    if (currentPage < chapter.pages.length - 1) {
        currentPage++;
    } else if (currentChapter < bookData.chapters.length - 1) {
        currentChapter++;
        currentPage = 0;
    } else {
        return;
    }

    loadPage(currentChapter, currentPage);
}

async function prevPage() {
    if (!bookData) return;

    const chapter = bookData.chapters[currentChapter];
    if (!chapter) return;

    const page = chapter.pages[currentPage];
    if (!page?.isAvailable) {
        return;
    }

    if (page.requireAccount) {
        const userId = await getUserIdFromCookie(); 
        if (!userId) {
            return;
        }
    }

    if (currentPage > 0) {
        currentPage--;
    } else if (currentChapter > 0) {
        currentChapter--;
        currentPage = bookData.chapters[currentChapter].pages.length - 1;
    } else {
        return;
    }

    loadPage(currentChapter, currentPage);
}

document.getElementById('nextBtn').addEventListener('click', nextPage);
document.getElementById('prevBtn').addEventListener('click', prevPage);

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

        const user = JSON.parse(decryptedData);
        return user.userId || null;
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

function showSignInModal() {
    contentWrapper.style.filter = 'blur(5px)';

    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.padding = '20px';
    modal.style.backgroundColor = '#444';
    modal.style.color = 'white';
    modal.style.borderRadius = '8px';
    modal.style.zIndex = '9999';
    modal.classList.add('modal');

    const modalContent = document.createElement('p');
    modalContent.textContent = "This page requires an account. Please log in or sign up to view the content.";

    const signUpButton = document.createElement('button');
    signUpButton.textContent = 'Go to Sign In';
    signUpButton.style.marginTop = '10px';
    signUpButton.style.padding = '10px';
    signUpButton.style.backgroundColor = '#ED2939';
    signUpButton.style.border = 'none';
    signUpButton.style.color = 'white';
    signUpButton.style.borderRadius = '5px';
    signUpButton.style.cursor = 'pointer';
    signUpButton.classList.add('signUpBtn');

    signUpButton.addEventListener('click', () => {
        window.location.href = '/signin';
    });

    modal.appendChild(modalContent);
    modal.appendChild(signUpButton);

    document.body.appendChild(modal);
}

function showPurchaseModal() {
    contentWrapper.style.filter = 'blur(5px)';

    if (document.querySelector('.purchase-modal')) return;

    const modal = document.createElement('div');
    modal.classList.add('purchase-modal');
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.padding = '20px';
    modal.style.backgroundColor = '#444';
    modal.style.color = 'white';
    modal.style.borderRadius = '8px';
    modal.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    modal.style.zIndex = '9999';
    modal.classList.add('modal');

    const modalContent = document.createElement('p');
    modalContent.textContent = "This is the end of the preview. To see more, please purchase the book.";

    const purchaseButton = document.createElement('button');
    purchaseButton.textContent = 'Purchase Here';
    purchaseButton.style.marginTop = '10px';
    purchaseButton.style.padding = '10px 20px';
    purchaseButton.style.backgroundColor = '#ED2939';
    purchaseButton.style.border = 'none';
    purchaseButton.style.color = 'white';
    purchaseButton.style.borderRadius = '5px';
    purchaseButton.style.cursor = 'pointer';
    purchaseButton.classList.add('PurchaseBtn');
    purchaseButton.addEventListener('click', async () => {
        try {

            const response = await fetch('data/data.json');
            if (!response.ok) {
                throw new Error('Failed to fetch purchase data');
            }

            const purchaseData = await response.json();

            const matchedItem = purchaseData.find(item => item.id === parseInt(previewId, 10));

            if (matchedItem && matchedItem.linkHref) {

                window.location.href = matchedItem.linkHref;
            } else {

                alert('Purchase link not found for this item.');
            }
        } catch (error) {
            alert('An error occurred while processing your purchase. Please try again later.');
        }
    });

    modal.appendChild(modalContent);
    modal.appendChild(purchaseButton);

    document.body.appendChild(modal);
}