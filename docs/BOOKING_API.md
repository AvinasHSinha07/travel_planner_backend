# Booking API (checkout contract)

## `POST /api/v1/booking`

**Auth:** session required (`USER`, `ADMIN`, or `TRAVEL_AGENT`).

**Body:**

| Field | Type | Required | Notes |
|-------|------|----------|--------|
| `type` | `FLIGHT` \| `HOTEL` \| `ACTIVITY` \| `PACKAGE` | yes | |
| `totalAmount` | number (positive) | yes | USD; charged as Stripe line item |
| `tripId` | UUID | no | Links booking to a trip; webhook may set trip `BOOKED` |
| `destinationId` | UUID | no | For destination-page checkouts without a trip; stored in `booking.metadata` and Stripe metadata |

**Success `data` (stable names for frontend):**

```json
{
  "checkoutUrl": "https://checkout.stripe.com/...",
  "url": "https://checkout.stripe.com/...",
  "bookingId": "uuid"
}
```

`url` is always the same value as `checkoutUrl` so clients can use either field.

**Errors:** `503` if Stripe is not configured; validation errors `400`.

## `PATCH /api/v1/booking/:id/status`

**Auth:** `ADMIN` or `TRAVEL_AGENT` only.

**Body:** `{ "status": "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED" }`

**Success:** updated booking (staff shape with `user` and `trip`).

## Stripe webhook

`POST /api/v1/booking/webhook` — raw body; not behind the JSON parser. On `checkout.session.completed`, the server confirms the booking, may set the linked trip to `BOOKED`, creates a `BOOKING` notification, and enqueues a confirmation email when the queue is available.
