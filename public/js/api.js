/**
 * API service for handling all server requests
 */
class ApiService {
    /**
     * Fetch orders from the API
     * @param {string} userId - User ID for fetching orders
     * @returns {Promise<Array>} - Array of order objects
     */
    static async getOrders(userId) {
        try {
            const response = await fetch(`${CONFIG.API.ORDERS}?userId=${userId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch orders');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching orders:', error);
            throw error;
        }
    }
    
    /**
     * Submit a rating for a product
     * @param {Object} ratingData - Rating data to submit
     * @returns {Promise<Object>} - Server response
     */
    static async submitRating(ratingData) {
        try {
            const response = await fetch(CONFIG.API.RATING, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(ratingData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Error submitting rating:', error);
            throw error;
        }
    }
}