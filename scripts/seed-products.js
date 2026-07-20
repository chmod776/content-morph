import { getUncachableStripeClient } from '../stripeClient.js';

// $20.91/month → after Stripe fee (2.9% + $0.30) you net exactly $20.00
// Math: (20 + 0.30) / (1 - 0.029) = 20.9062... → rounded up to $20.91
const TARGET_AMOUNT = 2091; // cents

async function seedProducts() {
  try {
    const stripe = await getUncachableStripeClient();
    console.log('Looking for existing Content Morph Pro product...');

    const existing = await stripe.products.search({
      query: "name:'Content Morph Pro' AND active:'true'",
    });

    let product;
    if (existing.data.length > 0) {
      product = existing.data[0];
      console.log('Found existing product:', product.id);

      // Archive all existing prices so we start fresh
      const oldPrices = await stripe.prices.list({ product: product.id, active: true });
      for (const p of oldPrices.data) {
        await stripe.prices.update(p.id, { active: false });
        console.log('Archived old price:', p.id, `($${p.unit_amount / 100}/${p.recurring?.interval})`);
      }
    } else {
      console.log('Creating Content Morph Pro product...');
      product = await stripe.products.create({
        name: 'Content Morph Pro',
        description: 'Unlimited access to Content Morph — transform your raw notes into platform-ready posts.',
      });
      console.log('Created product:', product.id);
    }

    const monthly = await stripe.prices.create({
      product: product.id,
      unit_amount: TARGET_AMOUNT,
      currency: 'usd',
      recurring: { interval: 'month' },
    });
    console.log(`\n✓ Created price: $${TARGET_AMOUNT / 100}/month — ${monthly.id}`);
    console.log('  You net $20.00 after Stripe fee (2.9% + $0.30)');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

seedProducts();
