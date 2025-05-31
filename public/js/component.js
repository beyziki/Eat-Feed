/**
 * UI Component builders for the Order History application
 */
class OrderComponents {
    /**
     * Create an order card element
     * @param {Object} order - Order data
     * @returns {HTMLElement} - Order card DOM element
     */
    static createOrderCard(order) {
        const card = document.createElement('div');
        card.className = 'order-card';
        card.dataset.status = order.status;
        card.style.animationDelay = '0ms';
        
        // Use delay for nice staggered animation
        card.style.opacity = '0';
        card.style.transform = 'translateY(10px)';
        
        // Get status info from config
        const statusInfo = CONFIG.STATUS[order.status] || {
            icon: 'fa-question-circle',
            text: order.status
        };
        
        // Calculate order total
        const orderTotal = Utils.calculateTotal(order.items);
        
        // Build the card content
        card.innerHTML = `
            <div class="order-header">
                <div class="order-id">#${order.id}</div>
                <div class="order-date">${Utils.formatDate(order.date)}</div>
            </div>
            
            <div class="order-info">
                <div class="order-info-item">
                    <span class="info-label">City</span>
                    <div class="info-value">${order.city}</div>
                </div>
                <div class="order-info-item">
                    <span class="info-label">District</span>
                    <div class="info-value">${order.district}</div>
                </div>
                <div class="order-info-item">
                    <span class="info-label">Total</span>
                    <div class="info-value">${orderTotal.toFixed(2)} TL</div>
                </div>
                <div class="order-info-item">
                    <span class="info-label">Status</span>
                    <div class="order-status-badge status-${order.status}">
                        <i class="fas ${statusInfo.icon}"></i>
                        ${statusInfo.text}
                    </div>
                </div>
            </div>
            
            <button class="toggle-items" data-order-id="${order.id}">
                <i class="fas fa-chevron-down"></i> 
                View Order Details
            </button>
            
            <div class="order-items-container" id="items-${order.id}">
                <!-- Items will be inserted here -->
            </div>
        `;
        
        // Add click event to toggle items visibility
        const toggleBtn = card.querySelector('.toggle-items');
        const itemsContainer = card.querySelector('.order-items-container');
        
        toggleBtn.addEventListener('click', () => {
            const isExpanded = toggleBtn.classList.toggle('expanded');
            
            if (isExpanded) {
                // Fill in items container if it's empty
                if (!itemsContainer.children.length) {
                    const itemsFragment = document.createDocumentFragment();
                    
                    // Create each item element
                    order.items.forEach(item => {
                        const itemEl = this.createOrderItem(item, order.id);
                        itemsFragment.appendChild(itemEl);
                    });
                    
                    itemsContainer.appendChild(itemsFragment);
                }
                
                // Show the items with animation
                itemsContainer.classList.add('expanded');
                toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i> Hide Order Details';
            } else {
                // Hide the items
                itemsContainer.classList.remove('expanded');
                toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i> View Order Details';
            }
        });
        
        return card;
    }
    
    /**
     * Create an order item element
     * @param {Object} item - Order item data
     * @param {string} orderId - Parent order ID
     * @returns {HTMLElement} - Order item DOM element
     */
    static createOrderItem(item, orderId) {
        const itemEl = document.createElement('div');
        itemEl.className = 'order-item';
        
        itemEl.innerHTML = `
            <div class="item-header">
                <div class="item-details">
                    <div class="item-name">${item.product_name}</div>
                    <div class="item-meta">
                        <div>Quantity: ${item.quantity}</div>
                        <div>Unit Price: ${item.price.toFixed(2)} TL</div>
                    </div>
                </div>
                <div class="item-price">${(item.price * item.quantity).toFixed(2)} TL</div>
            </div>
            <div class="item-actions">
                <button class="btn btn-rate" data-product-id="${item.product_id}" data-product-name="${item.product_name}" data-order-id="${orderId}">
                    <i class="fas fa-star"></i> Rate
                </button>
            </div>
        `;
        
        // Add event listener to rating button
        const rateBtn = itemEl.querySelector('.btn-rate');
        rateBtn.addEventListener('click', () => {
            openRatingModal(
                item.product_id,
                item.product_name,
                orderId
            );
        });
        
        return itemEl;
    }
    
    /**
     * Create empty state element
     * @returns {HTMLElement} - Empty state DOM element
     */
    static createEmptyState() {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        
        emptyState.innerHTML = `
            <div class="empty-icon">
                <i class="fas fa-shopping-basket"></i>
            </div>
            <h3>No Orders Found</h3>
            <p>You don't have any orders matching your filters.</p>
        `;
        
        return emptyState;
    }
    
    /**
     * Create error state element
     * @param {string} message - Error message
     * @returns {HTMLElement} - Error state DOM element
     */
    static createErrorState(message) {
        const errorState = document.createElement('div');
        errorState.className = 'empty-state';
        
        errorState.innerHTML = `
            <div class="empty-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3>Something Went Wrong</h3>
            <p>${message || 'Failed to load orders. Please try again.'}</p>
        `;
        
        return errorState;
    }
}