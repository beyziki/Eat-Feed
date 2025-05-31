/**
 * Configuration settings for the Order History application
 */
const CONFIG = {
    // API endpoints
    API: {
        ORDERS: '/getRealOrders',
        RATING: '/submitRating'
    },
    
    // Pagination settings
    PAGINATION: {
        ITEMS_PER_PAGE: 5
    },
    
    // Animation durations (in ms)
    ANIMATION: {
        CARD_STAGGER: 100,
        FILTER_TRANSITION: 300,
        MODAL_TRANSITION: 300
    },
    
    // Status text and icon mapping
    STATUS: {
        delivered: {
            icon: 'fa-check-circle',
            text: 'Delivered'
        },
        pending: {
            icon: 'fa-clock',
            text: 'Pending'
        },
        preparing: {
            icon: 'fa-kitchen-set',
            text: 'Preparing'
        },
        cancelled: {
            icon: 'fa-ban',
            text: 'Cancelled'
        }
    }
};