/**
 * Clear cached Stripe product ID from database
 * This forces the system to re-discover the correct product by name
 */
const { createClient } = require('@supabase/supabase-js');

async function clearCachedProductId() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  console.log('Deleting cached stripe_product_id from app_settings...');

  const { error } = await supabase
    .from('app_settings')
    .delete()
    .eq('key', 'stripe_product_id');

  if (error) {
    console.error('Error deleting:', error);
    process.exit(1);
  }

  console.log('✓ Successfully deleted cached stripe_product_id');
  console.log('✓ Next time you update price in admin settings, it will find the correct product by name');
  console.log('  → Looking for: "Market Warrior 30-Day Trading Challenge"');
}

clearCachedProductId();
