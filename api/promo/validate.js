/**
 * Promo Code Validation API
 */

const { createClient } = require('@supabase/supabase-js');

// Pricing
const BASE_PRICE = 3333;
const VAT_RATE = 0.20;
const VAT_AMOUNT = Math.round(BASE_PRICE * VAT_RATE);
const TOTAL_PRICE = BASE_PRICE + VAT_AMOUNT; // 3999

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ valid: false, error: 'Method not allowed' });
  }
  
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ valid: false, error: 'No code provided' });
    }
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    const { data: promo, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();
    
    if (error || !promo) {
      return res.status(200).json({ valid: false, error: 'Invalid promo code' });
    }
    
    // Check usage limit
    if (promo.max_uses && promo.uses_count >= promo.max_uses) {
      return res.status(200).json({ valid: false, error: 'Promo code has reached its usage limit' });
    }
    
    // Check expiry
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return res.status(200).json({ valid: false, error: 'Promo code has expired' });
    }
    
    const discountPercent = promo.discount_percent || 0;
    const discountAmount = Math.round(TOTAL_PRICE * (discountPercent / 100));
    const finalPrice = TOTAL_PRICE - discountAmount;
    
    return res.status(200).json({
      valid: true,
      code: promo.code,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      original_price: TOTAL_PRICE,
      final_price: finalPrice
    });
    
  } catch (error) {
    console.error('Promo validation error:', error);
    return res.status(500).json({ valid: false, error: 'Validation failed' });
  }
};
