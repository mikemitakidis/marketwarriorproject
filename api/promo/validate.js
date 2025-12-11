// Promo Code Validation API
// Route: /api/promo/validate

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { code } = req.body;
        
        if (!code) {
            return res.status(400).json({ valid: false, error: 'No code provided' });
        }
        
        // Valid promo codes with their discounts
        const promoCodes = {
            'WARRIOR10': { discount: 10, description: '10% off' },
            'LAUNCH20': { discount: 20, description: '20% off - Launch Special' },
            'EARLY25': { discount: 25, description: '25% off - Early Bird' },
            'VIP30': { discount: 30, description: '30% off - VIP Access' },
            'FRIEND15': { discount: 15, description: '15% off - Friend Referral' }
        };
        
        const upperCode = code.toUpperCase().trim();
        const promoData = promoCodes[upperCode];
        
        if (promoData) {
            const originalPrice = 39.99;
            const discountAmount = originalPrice * (promoData.discount / 100);
            const finalPrice = originalPrice - discountAmount;
            
            return res.status(200).json({
                valid: true,
                code: upperCode,
                discount_percent: promoData.discount,
                discount_amount: Math.round(discountAmount * 100) / 100,
                description: promoData.description,
                originalPrice: originalPrice,
                finalPrice: Math.round(finalPrice * 100) / 100,
                currency: 'USD',
                symbol: '$'
            });
        }
        
        return res.status(200).json({
            valid: false,
            error: 'Invalid promo code'
        });
        
    } catch (error) {
        console.error('Promo validation error:', error);
        return res.status(500).json({ valid: false, error: 'Server error' });
    }
};
