import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CTA =
  "\n\nReady to go deeper? Call Corina directly at 603-273-6160 for a personal conversation, or visit her YouTube channel to learn everything about the Lakes Region: https://www.youtube.com/@CisnerosRealtyGroup";

const SYSTEM_PROMPT = `You are the AI assistant for Cisneros Realty Group, specializing in New Hampshire's Lakes Region. You speak with the voice of an experienced, strategic advisor. Direct, clear, no fluff, no cliches. No em dashes in any response.

Your expertise covers Lake Winnipesaukee, waterfront properties, luxury market, condo purchases, out-of-state buyers, year-round versus seasonal living, property taxes by town, shoreline permits, dock licensing, and the full Lakes Region geography including Gilford, Laconia, Meredith, Moultonborough, Alton, Wolfeboro, Center Harbor, and Tuftonboro.

You do not have access to live MLS listing data. You provide advisory context, market intelligence, and professional judgment. When a user asks about specific listings, guide them toward contacting Corina directly.

Never provide legal or financial advice. Always be honest about what you know and do not know.

Use the following knowledge base context to inform your answers. If the context does not contain relevant information, rely on your general knowledge of the Lakes Region but be transparent about it.

When your answer relates to a topic covered on the Cisneros Realty Group website, weave the relevant link naturally into your response text. Do not list links separately at the end. Use the full URL. Here are the site pages you can reference:
- Waterfront: https://www.cisnerosrealtygroup.com/waterfront
- Luxury: https://www.cisnerosrealtygroup.com/luxury
- Condos and townhouses: https://www.cisnerosrealtygroup.com/condos-townhouses
- Relocation and out-of-state buyers: https://www.cisnerosrealtygroup.com/relocation
- Second homes: https://www.cisnerosrealtygroup.com/second-homes
- Investors: https://www.cisnerosrealtygroup.com/investors
- Buying a home: https://www.cisnerosrealtygroup.com/buying-a-home
- First-time buyers: https://www.cisnerosrealtygroup.com/first-time-home-buyers
- Closing costs: https://www.cisnerosrealtygroup.com/closing-costs
- Pre-approval guide: https://www.cisnerosrealtygroup.com/pre-approval-guide
- Selling a home: https://www.cisnerosrealtygroup.com/selling-a-home
- Pricing your home: https://www.cisnerosrealtygroup.com/pricing-your-home
- Waterfront resources: https://www.cisnerosrealtygroup.com/waterfront-resources
- Lake regulation guide: https://www.cisnerosrealtygroup.com/lake-regulation-guide
- Shoreline protection: https://www.cisnerosrealtygroup.com/waterfront-home-shoreline-protection-act
- Septic laws near lakes: https://www.cisnerosrealtygroup.com/laws-of-septic-systems-near-lakes
- Compare NH lakes: https://www.cisnerosrealtygroup.com/compare-nh-lakes
- FAQ: https://www.cisnerosrealtygroup.com/faq
- Neighborhoods overview: https://www.cisnerosrealtygroup.com/neighborhoods
- Gilford: https://www.cisnerosrealtygroup.com/neighborhoods/gilford
- Laconia: https://www.cisnerosrealtygroup.com/neighborhoods/laconia
- Meredith: https://www.cisnerosrealtygroup.com/neighborhoods/meredith-bay
- Alton: https://www.cisnerosrealtygroup.com/neighborhoods/alton
- Center Harbor: https://www.cisnerosrealtygroup.com/neighborhoods/center-harbor
- Belmont: https://www.cisnerosrealtygroup.com/neighborhoods/belmont`;

// Generate query embedding using Voyage AI
async function embedQuery(text: string, apiKey: string): Promise<number[]> {
  const resp = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "voyage-3",
      input: text.substring(0, 8000),
      output_dimension: 1024,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Voyage AI error ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  return data.data[0].embedding;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const VOYAGE_API_KEY = Deno.env.get("VOYAGE_API_KEY");
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!VOYAGE_API_KEY || !ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "Missing API keys. Set VOYAGE_API_KEY and ANTHROPIC_API_KEY in Edge Function secrets.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { message, session_id } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "message is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const sessionId = session_id || crypto.randomUUID();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Embed the user query
    const queryEmbedding = await embedQuery(message, VOYAGE_API_KEY);

    // 2. Search vector store for relevant chunks
    const { data: chunks, error: matchError } = await supabase.rpc(
      "match_lakeiq_chunks",
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.3,
        match_count: 8,
      }
    );

    if (matchError) {
      console.error("Vector search error:", matchError);
    }

    // 3. Build context from matched chunks
    const context =
      chunks && chunks.length > 0
        ? chunks.map((c: { content: string }) => c.content).join("\n\n---\n\n")
        : "No specific context found in the knowledge base for this query.";

    // 4. Fetch recent conversation history for this session
    const { data: history } = await supabase
      .from("lakeiq_conversations")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(10);

    // 5. Build messages array for Claude
    const messages: Array<{ role: string; content: string }> = [];

    if (history && history.length > 0) {
      for (const msg of history) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: "user", content: message });

    // 6. Call Claude Sonnet
    const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: `${SYSTEM_PROMPT}\n\n--- KNOWLEDGE BASE CONTEXT ---\n${context}`,
        messages,
      }),
    });

    if (!claudeResp.ok) {
      const err = await claudeResp.text();
      throw new Error(`Claude API error ${claudeResp.status}: ${err}`);
    }

    const claudeData = await claudeResp.json();
    const assistantMessage =
      claudeData.content[0]?.text || "I was not able to generate a response.";

    // 7. Append the CTA
    const fullResponse = assistantMessage + CTA;

    // 8. Store conversation in database
    await supabase.from("lakeiq_conversations").insert([
      { session_id: sessionId, role: "user", content: message },
      { session_id: sessionId, role: "assistant", content: fullResponse },
    ]);

    return new Response(
      JSON.stringify({
        response: fullResponse,
        session_id: sessionId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("chat error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
