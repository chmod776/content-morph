import { getUncachableStripeClient } from '../stripeClient.js';

async function createProducts() {
  try {
    const stripe = await getUncachableStripeClient();
    console.log('Checking for existing Content Morph Pro product...');

    const existing = await stripe.products.search({
      query: "name:'Content Morph Pro' AND active:'true'",
    });

    if (existing.data.length > 0) {
      const product = existing.data[0];
      const prices = await stripe.prices.list({ product: product.id, active: true });
      console.log('Product already exists:', product.id);
      prices.data.forEach(p => {
        console.log(`  Price: $${p.unit_amount / 100}/${p.recurring?.interval} — ${p.id}`);
      });
      return;
    }

    console.log('Creating Content Morph Pro product...');
    const product = await stripe.products.create({
      name: 'Content Morph Pro',
      description: 'Unlimited access to Content Morph — transform your raw notes into platform-ready posts.',
    });
    console.log('Created product:', product.id);

    const monthly = await stripe.prices.create({
      product: product.id,
      unit_amount: 999,
      currency: 'usd',
      recurring: { interval: 'month' },
    });
    console.log('Created monthly price: $9.99/month —', monthly.id);

    const yearly = await stripe.prices.create({
      product: product.id,
      unit_amount: 7999,
      currency: 'usd',
      recurring: { interval: 'year' },
    });
    console.log('Created yearly price: $79.99/year —', yearly.id);

    console.log('\n✓ Done! Copy these price IDs into your app config if needed.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createProducts();
