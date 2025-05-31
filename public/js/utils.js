/**
 * Utility functions for the Order History application
 */
class Utils {
    /**
     * Format a date string to a localized date
     * @param {string} dateString - ISO date string
     * @returns {string} - Formatted date string
     */
    static formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('tr-TR', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateString;
        }
    }
    
    /**
     * Calculate total price for an order
     * @param {Array} items - Order items
     * @returns {number} - Total price
     */
    static calculateTotal(items) {
        return items.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);
    }
    
    /**
     * Debounce function to limit the rate at which a function can fire
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} - Debounced function
     */
    static debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    /**
     * Show a notification message
     * @param {string} message - Notification message
     * @param {string} type - Message type (success, error, info, warning)
     */
    static showNotification(message, type = 'info') {
        alert(message); // Simple alert for now, can be enhanced later
    }
    
    /**
     * Filter orders based on query and status
     * @param {Array} orders - Orders array
     * @param {string} query - Search query
     * @param {string} status - Filter status
     * @returns {Array} - Filtered orders
     */
    static filterOrders(orders, query, status) {
        return orders.filter(order => {
            // Filter by status if not 'all'
            if (status !== 'all' && order.status !== status) {
                return false;
            }
            
            // Return all if no query
            if (!query) return true;
            
            // Search through order properties
            const searchText = query.toLowerCase();
            
            // Check order ID
            if (order.id.toLowerCase().includes(searchText)) return true;
            
            // Check city and district
            if (order.city.toLowerCase().includes(searchText)) return true;
            if (order.district.toLowerCase().includes(searchText)) return true;
            
            // Check items
            return order.items.some(item => 
                item.product_name.toLowerCase().includes(searchText)
            );
        });
    }
    
    /**
     * Paginate an array of items
     * @param {Array} items - Array to paginate
     * @param {number} page - Current page number
     * @param {number} perPage - Items per page
     * @returns {Object} - Pagination result with items and page info
     */
    static paginate(items, page, perPage) {
        const totalItems = items.length;
        const totalPages = Math.ceil(totalItems / perPage) || 1;
        const currentPage = Math.min(Math.max(1, page), totalPages);
        
        const startIndex = (currentPage - 1) * perPage;
        const endIndex = Math.min(startIndex + perPage, totalItems);
        
        return {
            items: items.slice(startIndex, endIndex),
            currentPage,
            totalPages,
            totalItems,
            hasNext: currentPage < totalPages,
            hasPrev: currentPage > 1
        };
    }
    
    /**
     * Create pagination controls
     * @param {number} currentPage - Current page number
     * @param {number} totalPages - Total number of pages
     * @param {Function} onClick - Click handler for page buttons
     * @returns {HTMLElement} - Pagination DOM element
     */
    static createPagination(currentPage, totalPages, onClick) {
        const container = document.createDocumentFragment();
        
        // Previous button
        if (currentPage > 1) {
            const prevBtn = document.createElement('button');
            prevBtn.className = 'page-btn';
            prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
            prevBtn.addEventListener('click', () => onClick(currentPage - 1));
            container.appendChild(prevBtn);
        }
        
        // Page buttons
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        // Adjust start page if we're at the end
        if (endPage - startPage < 4 && startPage > 1) {
            startPage = Math.max(1, endPage - 4);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => onClick(i));
            container.appendChild(pageBtn);
        }
        
        // Next button
        if (currentPage < totalPages) {
            const nextBtn = document.createElement('button');
            nextBtn.className = 'page-btn';
            nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            nextBtn.addEventListener('click', () => onClick(currentPage + 1));
            container.appendChild(nextBtn);
        }
        
        return container;
    }
    
    /**
     * Add entrance animations to elements with staggered delay
     * @param {NodeList|Array} elements - Elements to animate
     * @param {number} delay - Base delay in milliseconds
     */
    static animateElements(elements, delay = 100) {
        Array.from(elements).forEach((el, index) => {
            setTimeout(() => {
                el.style.animationDelay = '0ms';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, index * delay);
        });
    }
}