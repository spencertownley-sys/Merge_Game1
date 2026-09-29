# Smoosh — API Design

---

## 1. Overview

- **Phase 1 (Web MVP):** no API. All state lives client-side in IndexedDB. This section documents the **client-side data interfaces** (the "local API" the game engine, skin system, and UI code call against) so Claude Code has a concrete contract to build, plus the **Phase 2+ REST API** for when a backend is added.
- **API style (Phase 2+):** REST
- **Base URL (Phase 2+):** `/api/v1`
- **Auth (Phase 2+):** Bearer token (Supabase session JWT) in `Authorization` header
- **Content type:** `application/json` except photo upload, which is `multipart/form-data`
- **Versioning strategy:** URL prefix `/v1/`

---

## 2. Phase 1 — Local Data Interfaces (client-side, no network)

These are TypeScript module interfaces, not HTTP endpoints. They wrap IndexedDB (see Tech Spec §2.1) and are the seam Claude Code should build so Phase 2 can later swap the implementation for real API calls with minimal UI changes.

> ⚠️ Revised 2026-09-28: the skin-set/photo interfaces below (§2.1) and the Phase 2+ skin-set endpoints (§3.2) belong to **Phase 1.5, the free/private photo-fusion feature**, not the initial Phase 1 build — see the PRD and CLAUDE.md for the current phasing. They're kept here so the contract is ready when that feature is built. This feature is free and gated only by a one-time 18+ self-attestation + privacy interstitial (§2.1 errors below), never a purchase — and everything it produces stays strictly on-device (see Tech Spec and Game Design doc §8 for the private-boundary rules that apply above this data layer).

### 2.1 `SkinRepository` (Phase 1.5)

```ts
interface SkinRepository {
  listSkinSets(): Promise<SkinSet[]>;
  getSkinSet(id: string): Promise<SkinSet | null>;
  createSkinSet(input: { name: string; mode: 'fusion' | 'ladder' }): Promise<SkinSet>;
  addPhoto(
    skinSetId: string,
    input: { croppedImageBlob: Blob; tierAssignment?: number },
  ): Promise<Photo>;
  removePhoto(skinSetId: string, photoId: string): Promise<void>;
  deleteSkinSet(id: string): Promise<void>;
}
```

Errors: `SKIN_SET_NOT_FOUND`, `AGE_ATTESTATION_REQUIRED` (skin editor is inaccessible until the player completes the one-time 18+ self-attestation + privacy interstitial — no purchase required, and no skin-set or photo-count limits to enforce either before or after).

### 2.2 `RunRepository`

```ts
interface RunRepository {
  saveRun(run: {
    mode: 'classic' | 'journey';
    levelId?: number;
    seed: number;
    score: number;
    topTier: number;
    mergeLog: MergeEvent[];
    weights?: Record<string, number>;
  }): Promise<Run>;
  getBestScore(mode: 'classic' | 'journey', levelId?: number): Promise<number>;
  listRecentRuns(limit?: number): Promise<Run[]>;
}
```

### 2.3 `JourneyRepository`

```ts
interface JourneyRepository {
  getProgress(levelId: number): Promise<{ stars: 0 | 1 | 2 | 3; bestScore: number } | null>;
  recordCompletion(levelId: number, result: { stars: 0 | 1 | 2 | 3; score: number }): Promise<void>;
  getAllProgress(): Promise<Record<number, { stars: 0 | 1 | 2 | 3; bestScore: number }>>;
}
```

### 2.4 `SettingsRepository`

```ts
interface SettingsRepository {
  get<K extends SettingKey>(key: K): Promise<SettingValue<K>>;
  set<K extends SettingKey>(key: K, value: SettingValue<K>): Promise<void>;
}
// SettingKey: 'sound' | 'music' | 'haptics' | 'reduceMotion' | 'simpleGraphics' | 'showTierNumbers'
```

### 2.5 Shared types

```ts
interface SkinSet {
  id: string;
  name: string;
  mode: 'fusion' | 'ladder';
  createdAt: string;
  photos: Photo[];
}
interface Photo {
  id: string;
  tierAssignment: number | null;
  croppedImageBlob: Blob;
  edgeColor: [number, number, number];
  hasFace: boolean;
}
interface Run {
  id: string;
  mode: string;
  levelId: number | null;
  seed: number;
  score: number;
  topTier: number;
  mergeLog: MergeEvent[];
  weights: Record<string, number> | null;
  playedAt: string;
}
interface MergeEvent {
  tier: number;
  atMs: number;
  parentIds: [number, number];
  resultId: number;
}
```

---

## 3. Phase 2+ — REST API

### 3.1 Authentication

Handled entirely by Supabase Auth client SDK (magic link, Apple, Google sign-in). The app does not implement its own `/auth/*` endpoints — the SDK issues the session JWT directly, which is then sent as a Bearer token to the endpoints below.

---

### 3.2 Skin Sets — ⚠️ Superseded, not planned

> ⚠️ Revised 2026-09-28: this whole subsection assumes skin sets and photos are uploaded to server storage and synced across devices. That's no longer the design. Photo personalization (Phase 1.5) is strictly private and on-device-only — original photos, aligned crops, and fused results are never uploaded, synced, or stored anywhere but the player's own device (see Game Design doc §8 and CLAUDE.md's Phase 1.5 appendix). These endpoints are kept below only as a record of the earlier cloud-sync design; they are **not** part of any current or planned build. If cloud sync of skin sets is ever revisited, it would need its own privacy/legal review before any of this is implemented — see the PRD §6 risk notes.

#### GET /skin-sets

List the authenticated user's skin sets.

**Response 200:**

```json
{
  "data": [
    { "id": "...", "name": "Weekend Crew", "mode": "fusion", "photoCount": 5, "createdAt": "..." }
  ]
}
```

#### POST /skin-sets

**Request:**

```json
{ "name": "Weekend Crew", "mode": "fusion" }
```

**Response 201:** `{ "id": "...", "name": "...", "mode": "...", "createdAt": "..." }`
**Errors:** 400 (validation), 409 (`SKIN_SET_LIMIT_EXCEEDED` on free tier)

#### POST /skin-sets/:id/photos

Uploads one **already-processed** 512×512 crop. The server validates dimensions/format and rejects anything that looks like an original, uncropped upload.

**Request:** `multipart/form-data` — `image` (file), `tierAssignment` (optional int), `edgeColor` (string "r,g,b"), `hasFace` (boolean)

**Response 201:** `{ "id": "...", "storagePath": "...", "tierAssignment": null, "hasFace": true }`
**Errors:** 400 (bad dimensions/format), 401

#### DELETE /skin-sets/:id/photos/:photoId

Deletes a photo and its stored crop.
**Response 204 / 404 / 403**

#### DELETE /skin-sets/:id

Deletes a skin set and all its photos (storage objects included).
**Response 204 / 404 / 403**

---

### 3.3 Runs & Leaderboards

#### POST /runs

Submit a completed run.

**Request:**

```json
{
  "mode": "daily",
  "seed": 20260928,
  "score": 412,
  "topTier": 8,
  "dropCount": 47,
  "elapsedMs": 183000,
  "mergeLog": [{ "tier": 6, "atMs": 41200, "parentIds": [12, 14], "resultId": 19 }]
}
```

**Response 201:** `{ "id": "...", "score": 412, "accepted": true }`

The server runs a lightweight plausibility check (score achievable given `dropCount`/`elapsedMs` per the scoring formula in the game design doc §6) before accepting a run onto any leaderboard. A failing check still saves the run but with `accepted: false` and it is excluded from leaderboards.

**Errors:** 400 (validation), 401, 429 (rate limited)

#### GET /leaderboard/daily

**Query params:** `date` (default today)
**Response 200:**

```json
{
  "date": "2026-09-28",
  "seed": 20260928,
  "entries": [{ "userId": "...", "displayName": "...", "score": 412, "rank": 1 }]
}
```

#### GET /journey-progress

**Response 200:** `{ "data": [ { "levelId": 1, "stars": 3, "bestScore": 220 }, ... ] }`

#### PUT /journey-progress/:levelId

**Request:** `{ "stars": 2, "score": 180 }` — server keeps the max of existing and new stars/score.
**Response 200:** `{ "levelId": 1, "stars": 3, "bestScore": 220 }`

---

### 3.4 Async Challenges (Phase 3)

#### POST /challenges

**Request:** `{ "skinSetId": "..." }` (optional — omit for default skins)
**Response 201:** `{ "id": "...", "seed": 88213, "shareUrl": "https://.../challenge/abc123" }`

#### GET /challenges/:id

**Response 200:** `{ "id": "...", "seed": 88213, "skinSet": { ... } | null, "results": [ { "userId": "...", "score": ... } ] }`
**Errors:** 404, 410 (expired)

#### POST /challenges/:id/results

**Request:** `{ "score": 390, "topTier": 7 }`
**Response 201:** `{ "id": "...", "score": 390 }`

---

### 3.5 Reports & Moderation (Phase 3 — required before any UGC is visible to another user)

#### POST /reports

**Request:**

```json
{ "targetType": "skin_photo", "targetId": "...", "reason": "impersonation" }
```

**Response 201:** `{ "id": "...", "status": "open" }`

#### GET /reports (moderator only)

**Response 200:** `{ "data": [ { "id": "...", "targetType": "...", "targetId": "...", "reason": "...", "status": "open", "createdAt": "..." } ] }`
**Errors:** 403 (non-moderator)

#### PATCH /reports/:id (moderator only)

**Request:** `{ "status": "actioned" }`
**Response 200:** `{ "id": "...", "status": "actioned" }`

---

## 4. Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [{ "field": "score", "message": "must be a non-negative integer" }]
  }
}
```

### Standard Error Codes

| HTTP | Code               | Meaning                       |
| ---- | ------------------ | ----------------------------- |
| 400  | `VALIDATION_ERROR` | Invalid input                 |
| 401  | `UNAUTHORIZED`     | Not authenticated             |
| 403  | `FORBIDDEN`        | Authenticated but not allowed |
| 404  | `NOT_FOUND`        | Resource doesn't exist        |
| 409  | `CONFLICT`         | Limit exceeded or duplicate   |
| 410  | `GONE`             | Challenge expired             |
| 429  | `RATE_LIMITED`     | Too many requests             |
| 500  | `INTERNAL_ERROR`   | Server error                  |

Additional domain-specific codes used in `error.code`: `AGE_ATTESTATION_REQUIRED`.

---

## 5. Rate Limiting (Phase 2+)

- **Limit:** 60 requests/minute per authenticated user on write endpoints (`POST`, `PUT`, `PATCH`, `DELETE`); read endpoints limited to 120/minute.
- **Headers returned:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Behavior when exceeded:** 429 response with `RATE_LIMITED`

---

## 6. Webhooks

None planned. Async challenges and daily leaderboards are pull-based (client polls or fetches on demand); no outbound webhooks are needed at this scale.
