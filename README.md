# LakeIQ

Custom AI chat assistant for CisnerosRealtyGroup.com.

## Phase 1: Vector Knowledge Base

### Setup

1. Run the migration SQL in Supabase Dashboard > SQL Editor:
   - File: `supabase/migrations/20260326000000_setup_pgvector.sql`

2. Add these secrets in Supabase Dashboard > Settings > Edge Functions > Secrets:
   - `OPENAI_API_KEY` - for generating text embeddings (text-embedding-3-small)

3. Deploy the ingest-site function via Supabase Dashboard or CLI

4. Run the initial crawl:
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
