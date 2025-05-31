/**
 * Main application logic for the Order History
 */
class OrderHistory {
    constructor() {
        this.orders = [];
        this.filteredOrders = [];
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.currentPage = 1;
        this.userId = localStorage.getItem('userId') || 'demo-user'; // Use demo-user for testing
        
        // DOM elements
        this.ordersListEl = document.getElementById('ordersList');
        this.emptyStateEl = document.getElementById('emptyState');
        this.paginationEl = document.getElementById('pagination');
        this.searchEl = document.getElementById('orderSearch');
        this.filterBtns = document.querySelectorAll('.filter-btn');
        
        // Bind event handlers
        this.bindEventListeners();
        
        // Initialize the application
        this.init();
    }
    
    /**
     * Initialize the application
     */
    async init() {
        await this.loadOrders();
        this.renderOrders();
    }
    
    /**
     * Bind event listeners to DOM elements
     */
    bindEventListeners() {
        // Search input
        this.searchEl.addEventListener('input', Utils.debounce(() => {
            this.searchQuery = this.searchEl.value.trim();
            this.currentPage = 1; // Reset to first page on search
            this.renderOrders();
        }, 300));
        
        // Filter buttons
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                this.currentFilter = btn.dataset.filter;
                this.currentPage = 1; // Reset to first page on filter change
                this.renderOrders();
            });
        });
        
        // Initialize the rating modal events
        this.initRatingModal();
    }
    
    /**
     * Initialize the rating modal
     */
    initRatingModal() {
        const ratingForm = document.getElementById('ratingForm');
        const starIcons = document.querySelectorAll('.star-rating i');
        
        // Handle star rating selection
        starIcons.forEach(star => {
            star.addEventListener('click', () => {
                const rating = parseInt(star.dataset.rating);
                document.getElementById('ratingScore').value = rating;
                
                // Update star visuals
                starIcons.forEach(s => {
                    const starRating = parseInt(s.dataset.rating);
                    if (starRating <= rating) {
                        s.className = 'fas fa-star';
                    } else {
                        s.className = 'far fa-star';
                    }
                });
            });
        });
        
        // Handle form submission
        ratingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitButton = ratingForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            
            const productId = document.getElementById('ratingProductId').value;
            const productName = document.getElementById('ratingProductName').value;
            const orderId = document.getElementById('ratingOrderId').value;
            const rating = document.getElementById('ratingScore').value;
            const comment = document.getElementById('ratingComment').value;
            
            if (!rating) {
                Utils.showNotification('Please select a rating', 'error');
                submitButton.disabled = false;
                return;
            }
            
            try {
                const result = await ApiService.submitRating({
                    user_id: this.userId,
                    username: localStorage.getItem('username') || 'User',
                    product_name: productName,
                    rating,
                    comment,
                    order_id: orderId
                });
                
                if (result.success) {
                    Utils.showNotification(result.message || 'Rating submitted successfully!', 'success');
                    closeModal();
                } else {
                    Utils.showNotification(result.message || 'Failed to submit rating', 'error');
                }
            } catch (error) {
                console.error('Error submitting rating:', error);
                Utils.showNotification('An error occurred. Please try again.', 'error');
            } finally {
                submitButton.disabled = false;
            }
        });
    }
    
    /**
     * Load orders from the API or fallback to mock data
     */
    async loadOrders() {
        this.ordersListEl.innerHTML = `
            <div class="skeleton-loader">
                <div class="skeleton-order">
                    <div class="skeleton-header"></div>
                    <div class="skeleton-content"></div>
                    <div class="skeleton-content short"></div>
                </div>
                <div class="skeleton-order">
                    <div class="skeleton-header"></div>
                    <div class="skeleton-content"></div>
                    <div class="skeleton-content short"></div>
                </div>
            </div>
        `;
        
        try {
            this.orders = await ApiService.getOrders(this.userId);
        } catch (error) {
            console.error('Failed to load orders, using mock data instead:', error);
            
            // Fallback to mock data for demo purposes
            this.orders = this.getMockOrders();
            
            // Show error message
            this.ordersListEl.innerHTML = '';
            this.ordersListEl.appendChild(
                OrderComponents.createErrorState('Using demo data. Real API connection failed.')
            );
            
            // Wait a bit before showing the mock data
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
    }
    
    /**
     * Generate mock orders for demo purposes
     * @returns {Array} - Mock orders
     */
    getMockOrders() {
        // Mock data for demo purposes
        return [
            {
                id: 'ORD-12345',
                date: new Date().toISOString(),
                status: 'delivered',
                city: 'Istanbul',
                district: 'Kadikoy',
                items: [
                    {
                        product_id: 'P001',
                        product_name: 'Margherita Pizza',
                        quantity: 2,
                        price: 89.90
                    },
                    {
                        product_id: 'P002',
                        product_name: 'Tiramisu',
                        quantity: 1,
                        price: 45.50
                    }
                ]
            },
            {
                id: 'ORD-12346',
                date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
                status: 'pending',
                city: 'Istanbul',
                district: 'Besiktas',
                items: [
                    {
                        product_id: 'P003',
                        product_name: 'Beef Burger',
                        quantity: 1,
                        price: 75.90
                    },
                    {
                        product_id: 'P004',
                        product_name: 'French Fries',
                        quantity: 1,
                        price: 25.90
                    }
                ]
            },
            {
                id: 'ORD-12347',
                date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
                status: 'preparing',
                city: 'Istanbul',
                district: 'Sisli',
                items: [
                    {
                        product_id: 'P005',
                        product_name: 'Chicken Wrap',
                        quantity: 2,
                        price: 55.50
                    }
                ]
            },
            {
                id: 'ORD-12348',
                date: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
                status: 'cancelled',
                city: 'Istanbul',
                district: 'Uskudar',
                items: [
                    {
                        product_id: 'P006',
                        product_name: 'Vegetable Soup',
                        quantity: 1,
                        price: 35.90
                    },
                    {
                        product_id: 'P007',
                        product_name: 'Grilled Salmon',
                        quantity: 1,
                        price: 129.90
                    }
                ]
            }
        ];
    }
    
    /**
     * Render orders based on current filters and search
     */
    renderOrders() {
        // Clear orders list
        this.ordersListEl.innerHTML = '';
        
        // Apply filters and search
        this.filteredOrders = Utils.filterOrders(
            this.orders,
            this.searchQuery,
            this.currentFilter
        );
        
        // Handle empty results
        if (this.filteredOrders.length === 0) {
            this.emptyStateEl.style.display = 'block';
            this.paginationEl.style.display = 'none';
            return;
        }
        
        // Hide empty state
        this.emptyStateEl.style.display = 'none';
        
        // Paginate orders
        const pagination = Utils.paginate(
            this.filteredOrders,
            this.currentPage,
            CONFIG.PAGINATION.ITEMS_PER_PAGE
        );
        
        // Create elements for current page orders
        const fragment = document.createDocumentFragment();
        pagination.items.forEach(order => {
            const orderCard = OrderComponents.createOrderCard(order);
            fragment.appendChild(orderCard);
        });
        
        // Add orders to container
        this.ordersListEl.appendChild(fragment);
        
        // Animate cards entrance
        const orderCards = this.ordersListEl.querySelectorAll('.order-card');
        Utils.animateElements(orderCards, CONFIG.ANIMATION.CARD_STAGGER);
        
        // Update pagination
        this.renderPagination(pagination);
    }
    
    /**
     * Render pagination controls
     * @param {Object} pagination - Pagination data
     */
    renderPagination(pagination) {
        // Clear pagination container
        this.paginationEl.innerHTML = '';
        
        // Show pagination only if needed
        if (pagination.totalPages <= 1) {
            this.paginationEl.style.display = 'none';
            return;
        }
        
        // Show pagination
        this.paginationEl.style.display = 'flex';
        
        // Create pagination controls
        const paginationEl = Utils.createPagination(
            pagination.currentPage,
            pagination.totalPages,
            (page) => {
                this.currentPage = page;
                this.renderOrders();
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        );
        
        // Add pagination to container
        this.paginationEl.appendChild(paginationEl);
    }
}

// Modal functions (globally accessible)
function openRatingModal(productId, productName, orderId) {
    // Reset form
    document.getElementById('ratingProductId').value = productId;
    document.getElementById('ratingProductName').value = productName;
    document.getElementById('ratingOrderId').value = orderId;
    document.getElementById('ratingScore').value = '';
    document.getElementById('ratingComment').value = '';
    
    // Reset stars
    document.querySelectorAll('.star-rating i').forEach(star => {
        star.className = 'far fa-star';
    });
    
    // Show modal with animation
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.add('active');
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.remove('active');
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Create the app instance
    const app = new OrderHistory();
    
    // Close modal when clicking outside
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modalOverlay')) {
            closeModal();
        }
    });
    
    // Prevent form click from closing modal
    document.querySelector('.rating-modal').addEventListener('click', (e) => {
        e.stopPropagation();
    });
});