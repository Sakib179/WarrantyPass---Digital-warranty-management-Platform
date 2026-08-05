# Customer wallet and Manual Warranty Vault

`CustomerProduct` is the customer-owned aggregate. A warranty references both the authenticated
customer and product, so ownership is enforced without accepting a customer ID from the client.
Business-issued, user-uploaded, and platform-imported sources remain distinct. User records always say
**User Uploaded — Not Verified by Business**; saving one is not evidence of product authenticity.

List routes mask serial numbers. Full values require an authenticated detail lookup. Cross-customer
requests return the same generic 404 as missing resources.

Search, filters, allowlisted sorting, and pagination execute in PostgreSQL. Shared Zod contracts
validate query parameters, and the UI stores state in the URL.

Operational status is calculated by the API. Safety overrides take priority: revoked, invalid/rejected,
and voided. Date rules then apply: not started, expired, expiring soon, and active. The configurable
window defaults to 30 days.

Manual creation requires an authoritative annual entitlement. A transaction creates the product and
warranty together. Only fully user-uploaded aggregates may be edited or archived. Expired subscribers
retain read access; new records, OCR, and document mutations are blocked, and nothing is deleted.

Purchase/start/end fields use PostgreSQL `DATE` and `YYYY-MM-DD` DTOs. Calculations operate at UTC
midnight, while timestamp presentation uses Asia/Dhaka. Month/year addition clamps to the last valid
target-month day.
