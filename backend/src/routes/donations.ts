import { Router, Request, Response } from 'express';
import Stripe from 'stripe';

const router = Router();

// Lazy-init so missing key doesn't crash the server at startup
function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key, { apiVersion: '2026-06-24.dahlia' });
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

// POST /api/donations/checkout
// Creates a Stripe Checkout Session for a one-time donation
router.post('/checkout', async (req: Request, res: Response) => {
  const { amount } = req.body; // amount in dollars (e.g. 50)

  if (!amount || isNaN(Number(amount)) || Number(amount) < 1) {
    return res.status(400).json({ error: 'A valid donation amount is required.' });
  }

  const amountCents = Math.round(Number(amount) * 100);

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            product_data: {
              name: 'Support MVP Club',
              description:
                'Your donation keeps MVP Club free for every founder and the startup community. Thank you.',
              images: [],
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${FRONTEND_URL}/donate/success?session_id={CHECKOUT_SESSION_ID}&amount=${amount}`,
      cancel_url:  `${FRONTEND_URL}/donate/cancel`,
      submit_type: 'donate',
      metadata: { amount: String(amount) },
    });

    return res.json({ url: session.url });
  } catch (err: unknown) {
    console.error('[Stripe] checkout error:', err);
    const msg = (err as { message?: string })?.message ?? 'Failed to create checkout session.';
    return res.status(500).json({ error: msg });
  }
});

export default router;
