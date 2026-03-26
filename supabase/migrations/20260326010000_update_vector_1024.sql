-- Migration: Switch from OpenAI 1536-dim embeddings to Voyage AI 1024-dim embeddings
-- Model: voyage-3 at 1024 dimensions

-- Drop the existing index (cannot alter column type with index present)
DROP INDEX IF EXISTS lakeiq_chunks_embedding_idx;

-- Clear existing embeddings (they are 1536-dim and incompatible)
UPDATE lakeiq_chunks SET embedding = NULL;

-- Alter the embedding column to 1024 dimensions
ALTER TABLE lakeiq_chunks
  ALTER COLUMN embedding TYPE vector(1024);

-- Recreate the similarity search index for 1024 dimensions
CREATE INDEX lakeiq_chunks_embedding_idx
  ON lakeiq_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Update the match function to use 1024 dimensions
CREATE OR REPLACE FUNCTION match_lakeiq_chunks(
  query_embedding vector(1024),
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
