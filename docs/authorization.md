# Authorization model

Authorization is resolved by Express for every request. Browser checks improve usability but are
never treated as security controls.

Business access is tenant-scoped. `X-Business-ID` identifies the requested workspace; middleware
confirms an active membership and loads all assigned roles and permissions. Users can belong to
multiple businesses with different roles.

```mermaid
flowchart LR
  U[User] --> M1[Membership: Business A]
  U --> M2[Membership: Business B]
  M1 --> R1[Owner role]
  M1 --> R2[Custom role]
  M2 --> R3[Support role]
  R1 --> P[Business permissions]
  R2 --> P
  R3 --> P
```

System roles are protected templates; custom roles are database records. A manager may grant only
permissions they already possess, preventing privilege escalation. The final active owner cannot
be removed or suspended.

Platform administration uses separate role, permission, assignment, and middleware tables.
Business ownership never grants platform powers. Sensitive decisions require explicit platform
permissions and create audit events.
