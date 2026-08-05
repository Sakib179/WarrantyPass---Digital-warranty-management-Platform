# WarrantyPass Security Architecture & Compliance Review

## Security Controls Overview
- **Authentication**: JWT access tokens & refresh tokens with single-use rotation and token family reuse detection.
- **Tenant Isolation**: All business API endpoints require `requireBusinessMembership` middleware and enforce RBAC permission matrices.
- **Data Protection**: Sensitive credentials (passwords, tokens) are stored exclusively as one-way cryptographic hashes.
- **Platform Separation**: Platform super-admin endpoints (`/api/v1/admin/*`) are strictly separated from customer/business endpoints and protected by `PLATFORM_PERMISSIONS`.
- **Audit Trails**: Non-repudiable append-only audit logging for high-risk operations including user suspensions, business status changes, and manual subscription overrides.
- **Rate Limiting**: Public authenticity verification endpoints throttled by IP to prevent serial number harvesting.
