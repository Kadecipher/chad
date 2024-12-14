document.addEventListener('DOMContentLoaded', () => {
    fetch('data/shop.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(products => {
            displayProducts(products);
        })
        .catch(error => {
            console.error('Error fetching products:', error);
        });
});

function displayProducts(products) {
    const shopContainer = document.getElementById('shop-container');
    
    products.forEach(product => {
        const productBox = document.createElement('div');
        productBox.className = 'product-box';
        
        productBox.innerHTML = `
            <img src="${product.image}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <p>Price: $${product.price}</p>
            <button data-id="${product.id}" data-price="${product.price}">Add To Cart</button>
        `;
        
        shopContainer.appendChild(productBox);
    });

    setupBuyButtons();
}

function setupBuyButtons() {
    document.querySelectorAll('.product-box button').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            const productPrice = this.getAttribute('data-price');
            const userId = getUserIdFromCookie();

            if (userId) {
                const cartItem = {
                    userId: userId,
                    productId: productId,
                    price: productPrice
                };

                // Send cart item to the server
                fetch('/add-to-cart', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(cartItem)
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Item added to cart!');
                    } else {
                        alert('Failed to add item to cart.');
                    }
                })
                .catch(error => {
                    console.error('Error adding to cart:', error);
                });
            } else {
                alert('User ID not found. Please sign in.');
            }
        });
    });
}
