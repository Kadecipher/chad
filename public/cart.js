document.addEventListener('DOMContentLoaded', () => {
    const cartTableBody = document.querySelector('#cart-table tbody');
    const cartTotalElement = document.getElementById('cart-total');

    // Fetch cart data
    fetch('/data/cart.json')
        .then(response => response.json())
        .then(cartItems => {
            if (!cartItems.length) {
                console.log('No items in cart.');
                return;
            }

            // Clear existing content
            cartTableBody.innerHTML = '';

            // Create rows for headers
            const headers = ['Product', 'Price', 'Quantity', 'Total', 'Action'];

            // Create rows
            let headerRow = '';
            let productRow = '';
            let priceRow = '';
            let quantityRow = '';
            let totalRow = '';
            let actionRow = '';

            cartItems.forEach(item => {
                productRow += `<td>${item.productId}</td>`;
                priceRow += `<td>${item.price}$</td>`;
                quantityRow += `<td><input type="number" min="1" value="1"></td>`;
                totalRow += `<td>${item.price}$</td>`;
                actionRow += `<td><button class="remove-button">Remove</button></td>`;
            });

            // Append rows with headers
            cartTableBody.innerHTML = `
                <tr>
                    <th>Product</th>
                    ${productRow}
                </tr>
                <tr>
                    <th>Price</th>
                    ${priceRow}
                </tr>
                <tr>
                    <th>Quantity</th>
                    ${quantityRow}
                </tr>
                <tr>
                    <th>Total</th>
                    ${totalRow}
                </tr>
                <tr>
                    <th>Action</th>
                    ${actionRow}
                </tr>
            `;

            // Update total on page load
            updateTotal();

            setupRemoveButtons();
            setupPayPalButtons();
        })
        .catch(error => console.error('Error fetching cart data:', error));

    // Update total price when quantity changes
    function updateTotal() {
        let total = 0;
        document.querySelectorAll('#cart-table tr:nth-child(4) td').forEach(cell => {
            if (cell.textContent.includes('$')) {
                total += parseFloat(cell.textContent.replace('$', ''));
            }
        });
        cartTotalElement.textContent = total.toFixed(2);
    }

    // Setup remove buttons
    function setupRemoveButtons() {
        document.querySelectorAll('.remove-button').forEach(button => {
            button.addEventListener('click', function() {
                const row = this.closest('tr');
                const totalCell = row.parentNode.querySelector('tr:nth-child(4) td');
                const price = parseFloat(totalCell.textContent.replace('$', ''));
                let currentTotal = parseFloat(cartTotalElement.textContent);

                currentTotal -= price;
                cartTotalElement.textContent = currentTotal.toFixed(2);

                row.remove();
                updateTotal();
            });
        });
    }

    // Setup PayPal buttons
    function setupPayPalButtons() {
        if (typeof paypal === 'undefined') {
            console.error('PayPal SDK not loaded.');
            return;
        }

        paypal.Buttons({
            createOrder: function(data, actions) {
                const totalAmount = parseFloat(cartTotalElement.textContent);
                return actions.order.create({
                    purchase_units: [{
                        amount: {
                            value: totalAmount.toFixed(2)
                        }
                    }]
                });
            },
            onApprove: function(data, actions) {
                return actions.order.capture().then(function(details) {
                    alert('Transaction completed by ' + details.payer.name.given_name);
                    sendEmailNotification();
                });
            }
        }).render('#paypal-button-container'); // Render the PayPal button inside the container
    }

    // Handle sending email notification
    function sendEmailNotification() {
        fetch('/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: 'chadmiller-auther@proton.me',
                subject: 'Purchase Completed',
                message: 'A purchase has been completed successfully.'
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Email sent successfully:', data);
        })
        .catch(error => {
            console.error('Error sending email:', error);
        });
    }
});
