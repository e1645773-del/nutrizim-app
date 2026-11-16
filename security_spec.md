# NutriZim Firestore Security Specification

## 1. Data Invariants
1. `app_stats/global` is publicly readable (`get`) for the live early-bird slots counter, cannot be deleted, cannot be listed as a collection, and can only be initialized once or incremented by `+1` atomically alongside the first-time creation of `users/{request.auth.uid}`.
2. `users/{userId}` contains PII (`email`) and tier/payment status. Read/write access is strictly isolated to `request.auth.uid == userId` (plus verified admin `e1645773@gmail.com`).
3. Early-bird tier enforcement: a newly created `users/{userId}` can only claim `tier == 'alpha_free'` when `userNumber <= 10`. Users with `userNumber > 10` must be created with `tier == 'pending_payment'`.
4. All subcollections (`/users/{userId}/food_logs/{logId}`, `/users/{userId}/weight_logs/{weightId}`, `/users/{userId}/coach_messages/{messageId}`) enforce Master Gate parent ownership (`exists(/databases/$(database)/documents/users/$(userId)) && request.auth.uid == userId`), verified email (`request.auth.token.email_verified == true`), server timestamps (`request.time`), strict key allowlists, and string/numeric bounds.

## 2. Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated read of PII**: Unauthenticated `get(/users/userA)` -> DENIED.
2. **Cross-user PII snooping**: Authenticated `userB` reads `get(/users/userA)` -> DENIED.
3. **Collection scraping**: `userA` runs `list(/users)` -> DENIED.
4. **Tier Escalation on Registration**: User #11 tries creating `users/user11` with `userNumber: 11, tier: 'alpha_free'` -> DENIED.
5. **Fake Alpha Rank Spoofing**: User tries creating `users/user11` with `userNumber: 1` when `app_stats/global.totalRegisteredUsers == 10` -> DENIED.
6. **Counter Tampering**: User tries updating `app_stats/global` with `totalRegisteredUsers: 0` or `alphaCap: 999` -> DENIED.
7. **Shadow Field Injection**: User creates `food_logs/log1` with extra ghost key `isAdmin: true` -> DENIED (`hasOnly` check).
8. **Unverified Email Spoof**: User with `email: 'e1645773@gmail.com'` and `email_verified: false` tries admin read -> DENIED.
9. **ID Poisoning**: User tries creating `food_logs/<1500-char-id>` -> DENIED (`isValidId` <= 128 chars).
10. **Client Timestamp Forgery**: User creates `food_logs/log1` with forged past `createdAt` instead of `request.time` -> DENIED.
11. **Negative / Absurd Portion Poisoning**: User logs `portionAmount: -500` or `kcalPer100: 99999` -> DENIED.
12. **Orphaned Subcollection Write**: User creates `users/userA/food_logs/log1` before `users/userA` exists -> DENIED.
