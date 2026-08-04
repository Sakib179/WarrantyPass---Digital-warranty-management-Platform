# Email delivery

Email has in-memory and SMTP providers. Docker development uses Mailpit; production requires SMTP.
Branded HTML and text templates cover verification, recovery, password-change alerts, email change,
invitations, and business verification decisions.

Links contain single-use tokens and use the configured web origin. Tokens are never logged.
Production should add a transactional outbox/queue so provider outages cannot lose durable
notifications.

Mailpit is available at `http://localhost:8025`; its SMTP port is `localhost:1025`.
