# Security Specification & Hardened Auditing Matrix

This specification details the security invariants, threat vectors, and verification payloads designed for SegurApp Recorridos.

## 1. Data Invariants

1. **User Identity Isolation**: A user can only write, read, or modify their own user document under `/users/{userId}`.
2. **Ride Ownership Integrity**: A ride request in `/recorridos/{recorridoId}` can only be created by an authenticated user, and the `usuarioId` field must match the creator's authenticated UID.
3. **Temporal Sanity**: `createdAt` timestamps must correspond precisely to `request.time`.
4. **Input Size Validation**: Input text fields are bounded securely to prevent excessive memory/storage waste (Denial of Wallet attacks).
5. **Terminal State Lockdown**: Ride requests cannot be modified once they reach a terminal status (`completed` or `cancelled`).

---

## 2. The "Dirty Dozen" Threat Payloads

Here are 12 specific payloads representing malicious attempts to bypass security rules:

### T01 - Anonymous User Profiling
* **Attack**: Unauthenticated write to `/users/attacker_uid`.
* **Payload**: `{ "nombre": "Hacker", "telefono": "3000000000" }`
* **Expected Result**: `PERMISSION_DENIED` (Requires authentication).

### T02 - User Identity Spoofing
* **Attack**: User `bob_uid` attempting to create a profile under `/users/alice_uid`.
* **Payload**: `{ "nombre": "Alice Spoofed", "telefono": "3001234567" }`
* **Expected Result**: `PERMISSION_DENIED` (UID in path must match `request.auth.uid`).

### T03 - Ghost Fields in User Profile (Shadow Update)
* **Attack**: User attempting to inject a secret administrative field `isAdmin`.
* **Payload**: `{ "nombre": "John", "telefono": "3111111111", "isAdmin": true }`
* **Expected Result**: `PERMISSION_DENIED` (Exact schema validation).

### T04 - Excessively Long Username (PII Poisoning)
* **Attack**: Writing a username that is 10,000 characters long.
* **Payload**: `{ "nombre": "A...[10k characters]...", "telefono": "3111111111" }`
* **Expected Result**: `PERMISSION_DENIED` (Size constraints).

### T05 - Hijacking Another User's Ride Request Creation
* **Attack**: Creating a recorrido document under `/recorridos/ride_123` with a mismatched `usuarioId`.
* **Payload**: `{ "usuarioId": "victim_uid", "nombre": "Victim", "telefono": "3123456789", "dePartida": "Carrera 5", "status": "pending" }`
* **Expected Result**: `PERMISSION_DENIED` (Field `usuarioId` must equal `request.auth.uid`).

### T06 - Creation with Forged Client Timestamp
* **Attack**: Specifying a backdated or future date instead of `request.time`.
* **Payload**: `{ "usuarioId": "user_123", "nombre": "User", "telefono": "3112223333", "dePartida": "Centro", "status": "pending", "createdAt": "2020-01-01T00:00:00Z" }`
* **Expected Result**: `PERMISSION_DENIED` (Must use `request.time`).

### T07 - Status Skipping / Remote Hijack
* **Attack**: Creating a request directly as `completed` to spoof service delivery.
* **Payload**: `{ "usuarioId": "user_123", "nombre": "User", "telefono": "3112223333", "dePartida": "Centro", "status": "completed" }`
* **Expected Result**: `PERMISSION_DENIED` (Must transition legally, starting at `pending`).

### T08 - Illegal State Transition (Terminal State Lockout Bypass)
* **Attack**: Modifying a ride request that is already `completed` back to `pending`.
* **Payload**: Update to `{ "status": "pending" }` when existing document state is `completed`.
* **Expected Result**: `PERMISSION_DENIED`.

### T09 - Rogue Update to System/Immortal Fields
* **Attack**: Attempting to alter the immutable `usuarioId` field after creation.
* **Payload**: Update to `{ "usuarioId": "malicious_uid" }`.
* **Expected Result**: `PERMISSION_DENIED` (Immutable field check).

### T10 - SQL Injection/Poisoning in Document ID
* **Attack**: Registering a ride request with a highly long or malicious document ID.
* **Path**: `/recorridos/SELECT_*_FROM_USERS_WHERE_1=1` (or size > 128)
* **Expected Result**: `PERMISSION_DENIED` (Path ID validation).

### T11 - Unbounded Arrays (Denial of Wallet)
* **Attack**: Attacking Firestore by pushing massive items inside lists or arrays.
* **Payload**: Custom lists exceeding strict sizes.
* **Expected Result**: `PERMISSION_DENIED`.

### T12 - Unauthorized List Scrape (PII Blanket Test)
* **Attack**: Attempting to run a blank `getDocs` on `/users` or `/recorridos` as a different user to harvest user data.
* **Query**: `db.collection('recorridos').get()`
* **Expected Result**: `PERMISSION_DENIED` (List rules require checking relational ownership against `request.auth.uid`).

---

## 3. Test Runner Definition

The following test suite (`firestore.rules.test.ts`) verifies these assertions using the Firebase Rules Unit Testing SDK:

```typescript
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import * as fs from "fs";

let testEnv: RulesTestEnvironment;

describe("SegurApp Firestore Rules tests", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "segurapp-recorridos-test",
      firestore: {
        rules: fs.readFileSync("firestore.rules", "utf8"),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it("T01: Denies profile creation to unauthenticated users", async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const userDoc = doc(unauthedDb, "users/attacker_uid");
    await assertFails(setDoc(userDoc, { nombre: "Attacker", telefono: "3000000" }));
  });

  it("T02: Denies Bob from creating Alice's profile", async () => {
    const bobDb = testEnv.authenticatedContext("bob_uid").firestore();
    const aliceDoc = doc(bobDb, "users/alice_uid");
    await assertFails(setDoc(aliceDoc, { nombre: "Alice Spoofed", telefono: "3001112233" }));
  });
});
```
