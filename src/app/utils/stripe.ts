import Stripe from 'stripe';
import { env } from '../config/env';

export const stripe: any = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-01-27.acacia' as any,
    })
  : null;
