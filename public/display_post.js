document.addEventListener('DOMContentLoaded', () => {
    fetch('data/posts.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(data => {
            try {
                const posts = JSON.parse(data);
                displayPosts(posts);
            } catch (error) {
            }
        })
});

function displayPosts(posts) {
    const postContainer = document.getElementById('blog-container');
    postContainer.innerHTML = '';

    posts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.classList.add('blog-item');

        if (post.image) {
            const postImage = document.createElement('img');
            postImage.src = post.image;
            postImage.alt = post.title;
            postElement.appendChild(postImage);
        }

        const postDetails = document.createElement('div');
        postDetails.classList.add('blog-details');

        if (post.message && post.message.trim() !== '') {
            const postMessage = document.createElement('div');
            postMessage.classList.add('post-message');
            postMessage.textContent = post.message;
            postDetails.appendChild(postMessage);
        }

        const postDescription = document.createElement('p');
        postDescription.textContent = post.description;

        const postTitle = document.createElement('h3');
        const postLink = document.createElement('a');
        postLink.href = `post?id=${post.id}`;
        postLink.textContent = post.title;

        postTitle.appendChild(postLink);
        postDetails.appendChild(postDescription);
        postDetails.appendChild(postTitle);
        postElement.appendChild(postDetails);
        postContainer.appendChild(postElement);
    });
}