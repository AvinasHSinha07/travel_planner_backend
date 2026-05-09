import Stripe from 'stripe';
import { env } from '../config/env';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-01-27' as any,
});
