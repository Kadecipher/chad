document.addEventListener('DOMContentLoaded', function() {
    const menu = document.getElementById('menu');

    function replaceMenuItems() {
        const newMenuItems = `
            <li><a href="media&videos">MEDIA AND VIDEOS</a></li>
            <li><a id="back-button">BACK</a></li>
        `;

        menu.innerHTML = newMenuItems;

        document.getElementById('back-button').addEventListener('click', function() {
            restoreOriginalMenu();
        });

        updateAuthButton();
    }

    function restoreOriginalMenu() {
        const originalMenuItems = `
            <li><a href="home">HOME</a></li>
            <li><a href="publications">PUBLICATIONS</a></li>
            <li><a href="blog">BLOG</a></li>
            <li><a id="auth-button-dropdown" href="#">SIGN IN</a></li>
            <li><a id="more-button">MORE</a></li>
        `;

        menu.innerHTML = originalMenuItems;

        document.getElementById('more-button').addEventListener('click', function() {
            replaceMenuItems();
        });

        updateAuthButton();
    }

    restoreOriginalMenu();

    updateAuthButton();
});