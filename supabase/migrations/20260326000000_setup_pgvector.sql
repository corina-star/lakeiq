-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge base documents table (source pages, uploaded docs)
CREATE TABLE IF NOT EXISTS lakeiq_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source_url text,
  title text,
  content text NOT NULL,
  doc_type text DEFAULT 'webpage',  -- webpage, pdf, manual
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Chunks table with vector embeddings
CREATE TABLE IF NOT EXISTS lakeiq_chunks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid REFERENCES lakeiq_documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  token_count integer,
  embedding vector(1536),  -- OpenAI text-embedding-3-small dimensions
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Index for fast similarity search
CREATE INDEX IF NOT EXISTS lakeiq_chunks_embedding_idx
  ON lakeiq_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Index for document lookup
CREATE INDEX IF NOT EXISTS lakeiq_chunks_document_id_idx
  ON lakeiq_chunks(document_id);

-- Chat history table
CREATE TABLE IF NOT EXISTS lakeiq_conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  role text NOT NULL,  -- user, assistant
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lakeiq_conversations_session_idx
  ON lakeiq_conversations(session_id, created_at);

-- Similarity search function
CREATE OR REPLACE FUNCTION match_lakeiq_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    lakeiq_chunks.id,
    lakeiq_chunks.document_id,
    lakeiq_chunks.content,
    1 - (lakeiq_chunks.embedding <=> query_embedding) AS similarity
  FROM lakeiq_chunks
  WHERE 1 - (lakeiq_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY lakeiq_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- RLS policies
ALTER TABLE lakeiq_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lakeiq_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lakeiq_conversations ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role manages lakeiq_documents"
  ON lakeiq_documents FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages lakeiq_chunks"
  ON lakeiq_chunks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages lakeiq_conversations"
  ON lakeiq_conversations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Anon can read chunks (for widget queries)
CREATE POLICY "Anon can read lakeiq_chunks"
  ON lakeiq_chunks FOR SELECT TO anon USING (true);
-- Anon can insert conversations (chat messages)
CREATE POLICY "Anon can insert lakeiq_conversations"
  ON lakeiq_conversations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can read own conversations"
  ON lakeiq_conversations FOR SELECT TO anon USING (true);
