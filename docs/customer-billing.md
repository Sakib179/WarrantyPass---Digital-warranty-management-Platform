# Customer subscription and billing

The annual plan key is `manual-vault-annual`. Entitlement requires an authoritative database
subscription in `ACTIVE` or `TRIALING` state whose current period contains the current time.

`BillingProvider` isolates checkout and signature validation. The mock adapter immediately creates a
successful development payment and one-year subscription; production configuration rejects it.
Payments have unique references and idempotency keys. Billing events are unique per provider/event ID,
retain only a payload hash and safe state, and make duplicate delivery a successful no-op.

Webhooks verify an HMAC over exact captured bytes using constant-time comparison. WarrantyPass never
stores raw card/mobile-banking credentials. Cancellation occurs at period end; expired customers keep
read-only access to their existing vault.
