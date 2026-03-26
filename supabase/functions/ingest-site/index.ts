import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pages to crawl on CisnerosRealtyGroup.com
const SITE_PAGES = [
  "https://www.cisnerosrealtygroup.com/",
  "https://www.cisnerosrealtygroup.com/about",
  "https://www.cisnerosrealtygroup.com/contact",
  "https://www.cisnerosrealtygroup.com/blog",
  "https://www.cisnerosrealtygroup.com/communities",
  "https://www.cisnerosrealtygroup.com/communities/gilford",
  "https://www.cisnerosrealtygroup.com/communities/laconia",
  "https://www.cisnerosrealtygroup.com/communities/meredith",
  "https://www.cisnerosrealtygroup.com/communities/moultonborough",
  "https://www.cisnerosrealtygroup.com/communities/wolfeboro",
  "https://www.cisnerosrealtygroup.com/communities/alton",
  "https://www.cisnerosrealtygroup.com/communities/center-harbor",
  "https://www.cisnerosrealtygroup.com/communities/tuftonboro",
  "https://www.cisnerosrealtygroup.com/buyers",
  "https://www.cisnerosrealtygroup.com/sellers",
  "https://www.cisnerosrealtygroup.com/waterfront",
  "https://www.cisnerosrealtygroup.com/condos",
  "https://www.cisnerosrealtygroup.com/luxury",
  "https://www.cisnerosrealtygroup.com/relocation",
];

// Strip HTML tags and clean text
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// Extract page title from HTML
function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].replace(/\s+/g, " ").trim() : "Untitled";
}

// Split text into chunks of roughly 500 tokens (approx 2000 chars)
function chunkText(text: string, maxChars = 2000, overlap = 200): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxChars;

    // Try to break at a sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf(". ", end);
      const lastNewline = text.lastIndexOf("\n", end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > start + maxChars * 0.5) {
        end = breakPoint + 1;
      }
    }

    chunks.push(text.substring(start, end).trim());
    start = end - overlap;
  }

  return chunks.filter(c => c.length > 50);
}

// Generate embeddings using OpenAI API
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const resp = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text.substring(0, 8000),
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Embedding API error ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  return data.data[0].embedding;
}

// Fetch a page and extract text content
async function fetchPage(url: string): Promise<{ title: string; content: string } | null> {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "LakeIQ-Bot/1.0 (site indexer)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    const title = extractTitle(html);
    const content = stripHtml(html);
    if (content.length < 100) return null;
    return { title, content };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({
        error: "OPENAI_API_KEY not configured. Add it to Supabase Edge Function secrets.",
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let body: any = {};
    try { body = await req.json(); } catch {}
    const pagesToCrawl = body.urls || SITE_PAGES;

    const results: Array<{ url: string; status: string; chunks: number }> = [];
    let totalChunks = 0;
    let totalPages = 0;
    const errors: string[] = [];

    for (const url of pagesToCrawl) {
      console.log(`Crawling: ${url}`);
      const page = await fetchPage(url);

      if (!page) {
        results.push({ url, status: "failed", chunks: 0 });
        errors.push(`Failed to fetch: ${url}`);
        continue;
      }

      // Check if document already exists
      const { data: existing } = await supabase
        .from("lakeiq_documents")
        .select("id")
        .eq("source_url", url)
        .limit(1);

      let docId: string;

      if (existing && existing.length > 0) {
        // Update existing document
        docId = existing[0].id;
        await supabase
          .from("lakeiq_documents")
          .update({
            title: page.title,
            content: page.content,
            updated_at: new Date().toISOString(),
          })
          .eq("id", docId);

        // Delete old chunks
        await supabase
          .from("lakeiq_chunks")
          .delete()
          .eq("document_id", docId);
      } else {
        // Insert new document
        const { data: newDoc, error: docError } = await supabase
          .from("lakeiq_documents")
          .insert({
            source_url: url,
            title: page.title,
            content: page.content,
            doc_type: "webpage",
          })
          .select("id")
          .single();

        if (docError) {
          errors.push(`Doc insert failed for ${url}: ${docError.message}`);
          results.push({ url, status: "error", chunks: 0 });
          continue;
        }
        docId = newDoc.id;
      }

      // Chunk the content
      const chunks = chunkText(page.content);
      let chunkCount = 0;

      for (let i = 0; i < chunks.length; i++) {
        try {
          const embedding = await generateEmbedding(chunks[i], OPENAI_API_KEY);
          const tokenEstimate = Math.ceil(chunks[i].length / 4);

          const { error: chunkError } = await supabase
            .from("lakeiq_chunks")
            .insert({
              document_id: docId,
              chunk_index: i,
              content: chunks[i],
              token_count: tokenEstimate,
              embedding: embedding,
              metadata: { source_url: url, title: page.title },
            });

          if (chunkError) {
            errors.push(`Chunk insert failed for ${url} chunk ${i}: ${chunkError.message}`);
          } else {
            chunkCount++;
            totalChunks++;
          }
        } catch (embErr) {
          errors.push(`Embedding failed for ${url} chunk ${i}: ${embErr instanceof Error ? embErr.message : String(embErr)}`);
        }
      }

      totalPages++;
      results.push({ url, status: "success", chunks: chunkCount });
      console.log(`Indexed: ${url} (${chunkCount} chunks)`);
    }

    return new Response(JSON.stringify({
      success: true,
      pages_crawled: totalPages,
      pages_failed: pagesToCrawl.length - totalPages,
      total_chunks: totalChunks,
      results,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ingest-site error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
