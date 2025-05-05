document.addEventListener('DOMContentLoaded', function() {
    // Initialize wallet page
    initWallet();

    // Listen for load money button click
    document.getElementById('load-wallet-btn').addEventListener('click', handleLoadMoney);

    // Listen for amount button clicks
    const amountButtons = document.querySelectorAll('.amount-btn');
    amountButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            amountButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Set custom amount input
            document.getElementById('custom-amount').value = this.dataset.amount;
        });
    });
});

// Initialize wallet page
function initWallet() {
    // Load wallet balance
    const balance = loadWalletBalance();
    document.getElementById('balance').textContent = balance.toFixed(2);
    
    // Load transaction history
    updateTransactionHistory();
}

// Handle load money button click
function handleLoadMoney() {
    // Get amount
    let amount = 0;
    const customAmount = document.getElementById('custom-amount').value;
    const activeAmountBtn = document.querySelector('.amount-btn.active');
    
    if (customAmount && customAmount > 0) {
        amount = parseFloat(customAmount);
    } else if (activeAmountBtn) {
        amount = parseFloat(activeAmountBtn.dataset.amount);
    }
    
    // Validate amount
    if (!amount || amount <= 0) {
        showNotification('error', 'Please enter a valid amount');
        return;
    }
    
    // Get payment method
    const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
    
    // Process payment based on selected method
    if (paymentMethod === 'credit-card') {
        // Show credit card payment modal
        showCreditCardModal(amount);
    } else if (paymentMethod === 'bank-transfer') {
        // Show bank transfer instructions
        showBankTransferInstructions(amount);
    }
}

// Show credit card payment modal
function showCreditCardModal(amount) {
    // Create modal elements
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <div class="modal-body">
                <h3>Credit Card Payment</h3>
                <p>You're about to load <strong>₺${amount.toFixed(2)}</strong> to your wallet.</p>
                
                <form id="credit-card-form">
                    <div class="form-group">
                        <label for="card-number">Card Number</label>
                        <input type="text" id="card-number" placeholder="1234 5678 9012 3456" maxlength="19" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="card-expiry">Expiry Date</label>
                            <input type="text" id="card-expiry" placeholder="MM/YY" maxlength="5" required>
                        </div>
                        <div class="form-group">
                            <label for="card-cvv">CVV</label>
                            <input type="text" id="card-cvv" placeholder="123" maxlength="3" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="card-name">Name on Card</label>
                        <input type="text" id="card-name" placeholder="John Doe" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Pay ₺${amount.toFixed(2)}</button>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle close button
    const closeButton = modal.querySelector('.close-modal');
    closeButton.addEventListener('click', function() {
        document.body.removeChild(modal);
    });
    
    // Handle form submission
    const form = modal.querySelector('#credit-card-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Simulate payment processing
        simulatePaymentProcessing(modal, amount);
    });
    
    // Format card number with spaces
    const cardNumberInput = modal.querySelector('#card-number');
    cardNumberInput.addEventListener('input', function(e) {
        const value = e.target.value.replace(/\s+/g, '');
        const formattedValue = value.replace(/(\d{4})/g, '$1 ').trim();
        e.target.value = formattedValue;
    });
    
    // Format expiry date with slash
    const expiryInput = modal.querySelector('#card-expiry');
    expiryInput.addEventListener('input', function(e) {
        const value = e.target.value.replace(/\//g, '');
        if (value.length >= 2) {
            const month = value.substring(0, 2);
            const year = value.substring(2);
            e.target.value = `${month}/${year}`;
        }
    });
}

// Show bank transfer instructions
function showBankTransferInstructions(amount) {
    // Create modal elements
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <div class="modal-body">
                <h3>Bank Transfer Instructions</h3>
                <p>Please transfer <strong>₺${amount.toFixed(2)}</strong> to the following bank account:</p>
                
                <div class="bank-details">
                    <p><strong>Bank Name:</strong> EatFeed Bank</p>
                    <p><strong>Account Holder:</strong> EatFeed Ltd.</p>
                    <p><strong>IBAN:</strong> TR12 3456 7890 1234 5678 9012 34</p>
                    <p><strong>Reference:</strong> ${generateReferenceCode()}</p>
                </div>
                
                <p class="note">Please include the reference code in your transfer description so we can identify your payment.</p>
                
                <div class="bank-actions">
                    <button id="simulate-bank-transfer" class="btn btn-primary">Simulate Successful Transfer</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle close button
    const closeButton = modal.querySelector('.close-modal');
    closeButton.addEventListener('click', function() {
        document.body.removeChild(modal);
    });
    
    // Handle simulate transfer button
    const simulateButton = modal.querySelector('#simulate-bank-transfer');
    simulateButton.addEventListener('click', function() {
        // Simulate payment processing
        simulatePaymentProcessing(modal, amount);
    });
}

// Simulate payment processing
function simulatePaymentProcessing(modal, amount) {
    // Update button to show loading state
    const button = modal.querySelector('.btn-primary');
    const originalText = button.textContent;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    // Simulate processing delay
    setTimeout(() => {
        // Add amount to wallet
        const newBalance = addToWalletBalance(amount);
        
        // Remove modal
        document.body.removeChild(modal);
        
        // Show success notification
        showNotification('success', `₺${amount.toFixed(2)} added to your wallet successfully!`);
        
        // Update balance display
        document.getElementById('balance').textContent = newBalance.toFixed(2);
        
        // Reset form
        document.getElementById('custom-amount').value = '';
        document.querySelectorAll('.amount-btn').forEach(btn => btn.classList.remove('active'));
    }, 2000);
}

// Generate a random reference code for bank transfers
function generateReferenceCode() {
    return 'EF-' + Math.floor(100000000 + Math.random() * 900000000);
}

// Send wallet data to server
function sendWalletDataToServer(balance) {
    fetch('/api/wallet/update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            balance: balance
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Server updated successfully:', data);
    })
    .catch(error => {
        console.error('Error updating server:', error);
        // If server update fails, still continue with client-side updates
    });
}