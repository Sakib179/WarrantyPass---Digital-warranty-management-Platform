# WarrantyPass System Architecture & Technical Specification

## Overview
WarrantyPass is a production-grade digital warranty management platform servicing consumers, retail merchants, service centers, and platform administrators.

```
                  ┌─────────────────────────────────────────┐
                  │ Next.js Web App (Customer/Business/Admin)│
                  └────────────────────┬────────────────────┘
                                       │ HTTPS / REST API
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │      Express.js Modular V1 API          │
                  └──────┬─────────────┬─────────────┬──────┘
                         │             │             │
                         ▼             ▼             ▼
                 ┌──────────────┐┌───────────┐┌──────────────┐
                 │ PostgreSQL 16││ Redis Queue││ Object Storage│
                 │   + Prisma   ││ + BullMQ  ││   (S3/Local) │
                 └──────────────┘└───────────┘└──────────────┘
```

## Core Modules & Data Isolation
1. **Authentication & RBAC**: Session family security, Argon2id password hashing, business RBAC (`BUSINESS_PERMISSIONS`), and platform super-admin controls (`PLATFORM_PERMISSIONS`).
2. **Customer Digital Wallet & Vault**: Centralized management of verified merchant warranties and user-uploaded manual vault claims.
3. **Business Management & Issuance**: Product catalog, serial number tracking, warranty templates, and automated claim submission pipelines.
4. **Service Centers & Repairs**: Authorized service center directory, repair status history, cost management, and appointment scheduling.
5. **Transfers, Verification & Recalls**: Secondary market ownership transfers, public QR/URL authenticity verification, and targeted safety recall notifications.
6. **Notifications & Security**: Multi-channel notification dispatch, immutable essential alerts, append-only audit logging, and automated security event monitoring.
7. **Platform Administration**: Dedicated `/admin` portal isolated from business/customer dashboards with override audit logging (`ADMIN_OVERRIDE`).
