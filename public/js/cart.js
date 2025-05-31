document.addEventListener('DOMContentLoaded', function() {
    // Initialize cart page
    initCart();
    
    // Set up event listeners
    setupEventListeners();
});

// Initialize cart page
function initCart() {
    // Load cart items
    loadCart();
    
    // Load wallet balance
    const walletBalance = loadWalletBalance();
    document.getElementById('wallet-balance').textContent = walletBalance.toFixed(2);
    
    // Check if wallet balance is sufficient
    checkWalletBalance();
}

// Set up event listeners
function setupEventListeners() {
    // Continue shopping button
    const continueShoppingBtn = document.getElementById('continue-shopping-btn');
    if (continueShoppingBtn) {
        continueShoppingBtn.addEventListener('click', function() {
            window.location.href = 'menu.html';
        });
    }
    
    // Checkout button
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', function() {
            handleCheckout();
        });
    }
    
    // Payment method change
    const paymentMethods = document.querySelectorAll('input[name="payment-method"]');
    paymentMethods.forEach(method => {
        method.addEventListener('change', function() {
            checkWalletBalance();
        });
    });
    
    // Modal close buttons
    const closeModalButtons = document.querySelectorAll('.close-modal');
    closeModalButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.style.display = 'none';
        });
    });
    
    // Wallet payment confirmation
    const confirmWalletPaymentBtn = document.getElementById('confirm-wallet-payment');
    if (confirmWalletPaymentBtn) {
        confirmWalletPaymentBtn.addEventListener('click', function() {
            processWalletPayment();
        });
    }
    
    // Credit card form submission
    const cardPaymentForm = document.getElementById('card-payment-form');
    if (cardPaymentForm) {
        cardPaymentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            processCreditCardPayment();
        });
    }
    
    // View order button
    const viewOrderBtn = document.getElementById('view-order-btn');
    if (viewOrderBtn) {
        viewOrderBtn.addEventListener('click', function() {
            // For now, just close the modal and clear the cart
            document.getElementById('success-modal').style.display = 'none';
            window.location.href = 'index.html';
        });
    }
    
    // Close modal when clicking outside content
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// Check if wallet balance is sufficient for payment
function checkWalletBalance() {
    const totals = calculateCartTotal();
    const walletBalance = loadWalletBalance();
    const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
    const insufficientFundsWarning = document.getElementById('insufficient-funds-warning');
    
    if (paymentMethod === 'wallet' && walletBalance < totals.total) {
        // Show warning if wallet balance is insufficient
        if (insufficientFundsWarning) {
            insufficientFundsWarning.style.display = 'flex';
        }
        
        // Disable checkout button
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.disabled = true;
            checkoutBtn.classList.add('disabled');
        }
    } else {
        // Hide warning
        if (insufficientFundsWarning) {
            insufficientFundsWarning.style.display = 'none';
        }
        
        // Enable checkout button
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.disabled = false;
            checkoutBtn.classList.remove('disabled');
        }
    }
}

// Handle checkout button click
function handleCheckout() {
    if (cartItems.length === 0) {
        showNotification('error', 'Your cart is empty');
        return;
    }
    
    const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
    const checkoutModal = document.getElementById('checkout-modal');
    
    // Set up modal based on payment method
    if (paymentMethod === 'wallet') {
        setupWalletPaymentModal();
        document.getElementById('wallet-payment-section').style.display = 'block';
        document.getElementById('card-payment-section').style.display = 'none';
    } else if (paymentMethod === 'credit-card') {
        document.getElementById('wallet-payment-section').style.display = 'none';
        document.getElementById('card-payment-section').style.display = 'block';
        setupCardPaymentModal();
    }
    
    // Show checkout modal
    checkoutModal.style.display = 'flex';
}

// Set up wallet payment modal
function setupWalletPaymentModal() {
    const totals = calculateCartTotal();
    const walletBalance = loadWalletBalance();
    const remainingBalance = walletBalance - totals.total;
    
    document.getElementById('modal-total').textContent = totals.total.toFixed(2);
    document.getElementById('modal-balance').textContent = walletBalance.toFixed(2);
    document.getElementById('modal-remaining').textContent = remainingBalance.toFixed(2);
}

// Set up credit card payment modal
function setupCardPaymentModal() {
    const totals = calculateCartTotal();
    document.getElementById('card-modal-total').textContent = totals.total.toFixed(2);
}

// Process wallet payment
function processWalletPayment() {
    const totals = calculateCartTotal();
    const paymentResult = deductFromWalletBalance(totals.total);
    
    if (paymentResult.success) {
        // Payment successful
        completeOrder();
    } else {
        // Payment failed
        showNotification('error', paymentResult.message);
        
        // Close modal
        document.getElementById('checkout-modal').style.display = 'none';
    }
}

// Process credit card payment
function processCreditCardPayment() {
    // Get form data
    const cardNumber = document.getElementById('card-number').value;
    const cardExpiry = document.getElementById('card-expiry').value;
    const cardCVV = document.getElementById('card-cvv').value;
    const cardName = document.getElementById('card-name').value;
    
    // Validate form data
    if (!cardNumber || !cardExpiry || !cardCVV || !cardName) {
        showNotification('error', 'Please fill in all card details');
        return;
    }
    
    // Update button to show loading state
    const button = document.querySelector('#card-payment-form button[type="submit"]');
    const originalText = button.textContent;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    // Simulate processing delay
    setTimeout(() => {
        // Close checkout modal
        document.getElementById('checkout-modal').style.display = 'none';
        
        // Complete order
        completeOrder();
        
        // Reset button
        button.disabled = false;
        button.textContent = originalText;
    }, 2000);
}

// Complete order
function completeOrder() {
    // Generate order number
    const orderNumber = generateOrderNumber();
    
    // Save order to localStorage
    saveOrder(orderNumber);
    
    // Display success modal
    document.getElementById('order-number').textContent = orderNumber;
    document.getElementById('success-modal').style.display = 'flex';
    
    // Clear cart
    cartItems = [];
    saveCart();
    
    // Send order to server (in a real application)
    sendOrderToServer(orderNumber);
}

// Save order to localStorage
function saveOrder(orderNumber) {
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    
    const order = {
        id: orderNumber,
        items: cartItems,
        total: calculateCartTotal().total,
        date: new Date().toISOString(),
        status: 'processing'
    };
    
    orders.push(order);
    localStorage.setItem('orders', JSON.stringify(orders));
}

// Send order to server
function sendOrderToServer(orderNumber) {
    fetch('/api/orders/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            orderNumber: orderNumber,
            items: cartItems,
            total: calculateCartTotal().total
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Order created successfully:', data);
    })
    .catch(error => {
        console.error('Error creating order:', error);
        // If server update fails, still continue with client-side updates
    });
}