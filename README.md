# LakeIQ

Custom AI chat assistant for CisnerosRealtyGroup.com.

## Phase 1: Vector Knowledge Base

### Setup

1. Run the migration SQL in Supabase Dashboard > SQL Editor:
   - File: `supabase/migrations/20260326000000_setup_pgvector.sql`

2. Copy `.env.example` to `.env` and fill in your keys:
   ```
   cp .env.example .env
   ```
   - Get your Supabase keys from Dashboard > Settings > API
   - Add your OpenAI API key for embeddings

3. Install dependencies and run the ingestion:
   ```
   brew install node   # if not already installed
   npm install
   npm run ingest
   ```

### Alternative: Supabase Edge Function

1. Add `OPENAI_API_KEY` in Supabase Dashboard > Settings > Edge Functions > Secrets

2. Deploy the ingest-site function via Supabase Dashboard or CLI

3. Run the initial crawl:
   ```
   curl -X POST https://xznrlwhpstfhmxljidnj.supabase.co/functions/v1/ingest-site
   ```

### Architecture

- `lakeiq_documents` - source pages and uploaded documents
- `lakeiq_chunks` - text chunks with vector embeddings (1536 dimensions)
- `lakeiq_conversations` - chat history by session
- `match_lakeiq_chunks()` - cosine similarity search function

### Pages Crawled

19 pages from CisnerosRealtyGroup.com including:
- Homepage, About, Contact
- 8 community pages (Gilford, Laconia, Meredith, etc.)
- Buyers, Sellers, Waterfront, Condos, Luxury, Relocation
