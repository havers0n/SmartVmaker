# Scripts

Utility scripts for development and testing.

## Available Scripts

### `ingest_yt_samples.js`

**Purpose**: Ingests YouTube sample data into NDJSON format for testing.

**Usage**:

```bash
node scripts/ingest_yt_samples.js
```

**Description**: Processes YouTube samples and saves them to `data/yt_samples.ndjson` for use in video generation testing.

---

### `checkSupabaseConnection.js`

**Purpose**: Tests Supabase database connection.

**Usage**:

```bash
node scripts/checkSupabaseConnection.js
```

**Description**: Verifies that Supabase credentials are configured correctly and the database connection is working.

**Requirements**:

- `SUPABASE_URL` in `.env`
- `SUPABASE_SERVICE_ROLE_KEY` in `.env`

---

### `test-image-api.js`

**Purpose**: Tests the MiniMax Text-to-Image API endpoint.

**Usage**:

```bash
node scripts/test-image-api.js
```

**Description**: Sends a test request to the `/api/generate-image` endpoint to verify image generation functionality.

**Requirements**:

- Server must be running (`npm start`)
- `MINIMAX_API_KEY` in `.env`

---

## Notes

- All scripts should be run from the project root directory
- Ensure `.env` is properly configured before running scripts
- Scripts use ES modules (`type: "module"` in `package.json`)
