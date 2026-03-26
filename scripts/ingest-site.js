#!/usr/bin/env node

// Local ingestion script for crawling CisnerosRealtyGroup.com
// and chunking content into the Supabase vector store.
//
// Usage:
//   npm install
//   node scripts/ingest-site.js
//
// Requires .env with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VOYAGE_API_KEY

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !VOYAGE_API_KEY) {
  console.error("Missing required env vars. Check .env file.");
  console.error("Need: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VOYAGE_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

function stripHtml(html) {
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

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].replace(/\s+/g, " ").trim() : "Untitled";
}

function chunkText(text, maxChars = 2000, overlap = 200) {
  if (text.length <= maxChars) return [text];

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxChars;

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

  return chunks.filter((c) => c.length > 50);
}

// Generate embeddings using Voyage AI (voyage-3, 1024 dimensions)
async function generateEmbedding(text) {
  const resp = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VOYAGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "voyage-3",
      input: text.substring(0, 16000),
      output_dimension: 1024,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Voyage AI embedding error ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  return data.data[0].embedding;
}

async function fetchPage(url) {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "LakeIQ-Bot/1.0 (site indexer)" },
      signal: AbortSignal.timeout(15000),
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

async function ingest() {
  console.log(`Starting ingestion of ${SITE_PAGES.length} pages...\n`);

  let totalChunks = 0;
  let totalPages = 0;
  const errors = [];

  for (const url of SITE_PAGES) {
    process.stdout.write(`Crawling: ${url} ... `);
    const page = await fetchPage(url);

    if (!page) {
      console.log("FAILED");
      errors.push(`Failed to fetch: ${url}`);
      continue;
    }

    // Check if document already exists
    const { data: existing } = await supabase
      .from("lakeiq_documents")
      .select("id")
      .eq("source_url", url)
      .limit(1);

    let docId;

    if (existing && existing.length > 0) {
      docId = existing[0].id;
      await supabase
        .from("lakeiq_documents")
        .update({
          title: page.title,
          content: page.content,
          updated_at: new Date().toISOString(),
        })
        .eq("id", docId);

      await supabase.from("lakeiq_chunks").delete().eq("document_id", docId);
    } else {
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
        console.log(`ERROR: ${docError.message}`);
        errors.push(`Doc insert failed for ${url}: ${docError.message}`);
        continue;
      }
      docId = newDoc.id;
    }

    const chunks = chunkText(page.content);
    let chunkCount = 0;

    for (let i = 0; i < chunks.length; i++) {
      try {
        const embedding = await generateEmbedding(chunks[i]);
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
          errors.push(
            `Chunk insert failed for ${url} chunk ${i}: ${chunkError.message}`
          );
        } else {
          chunkCount++;
          totalChunks++;
        }
      } catch (embErr) {
        errors.push(
          `Embedding failed for ${url} chunk ${i}: ${embErr.message}`
        );
      }
    }

    totalPages++;
    console.log(`OK (${chunkCount} chunks)`);
  }

  console.log(`\n--- Ingestion Complete ---`);
  console.log(`Pages crawled: ${totalPages}/${SITE_PAGES.length}`);
  console.log(`Total chunks: ${totalChunks}`);
  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    errors.forEach((e) => console.log(`  - ${e}`));
  }
}

ingest().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
