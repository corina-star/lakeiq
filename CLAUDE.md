Project: LakeIQ
Purpose: Custom AI chat assistant for CisnerosRealtyGroup.com replacing Scroll AI
Owner: Corina Cisneros, Cisneros Realty Group, eXp Luxury, NH Lakes Region

WHAT WE ARE BUILDING:
A self-owned AI chat widget. Four components:
1. Supabase vector knowledge base (pgvector) ingesting site content and uploaded docs
2. Claude Sonnet API as the brain, trained on Lakes Region advisory content
3. Embeddable JavaScript widget with rotating placeholder questions
4. Eventually a live IDX feed connector (Phase 2, after Phase 1 is proven)

WIDGET IDENTITY:
- Name: LAKES IQ AI BETA
- Gold button: ASK AI
- Input bar placeholder rotates every 5 seconds through 7 questions
- On click: expands into full chat window below, anchored in place
- Deploys on every page of site, home page first

ROTATING PLACEHOLDER QUESTIONS:
1. What should I know about docks and shoreline permits before I buy?
2. What is the difference between lakefront and lake access?
3. What are the hidden costs of owning a waterfront property?
4. How do I know if a home in the Lakes Region is priced right?
5. Which Lakes Region towns are best for year-round living?
6. What should I look for when buying a condo in New Hampshire?
7. How does the buying process work when I am purchasing from out of state?

EVERY AI RESPONSE ENDS WITH:
Ready to go deeper? Call Corina directly at 603-273-6160 for a personal conversation, or visit her YouTube channel to learn everything about the Lakes Region: https://www.youtube.com/@CisnerosRealtyGroup

BRAND PALETTE:
- Gold: #B19A55
- Charcoal: #3D3D3D
- Black: #000000
- Light Grey: #E2E3E4
- White: #FFFFFF
- Font: Inter or Lato

TECH STACK:
- Supabase project: pvrluwgwqvrqjwkrykcw
- LLM: Claude Sonnet (claude-sonnet-4-6)
- Frontend: Vanilla JavaScript widget, embeds in Luxury Presence site
- Vector store: Supabase pgvector
- Document storage: Supabase Storage

SYSTEM PROMPT VOICE:
You are the AI assistant for Cisneros Realty Group, specializing in New Hampshire's Lakes Region. You speak with the voice of an experienced, strategic advisor. Direct, clear, no fluff, no cliches. No em dashes in any response.

Your expertise covers Lake Winnipesaukee, waterfront properties, luxury market, condo purchases, out-of-state buyers, year-round versus seasonal living, property taxes by town, shoreline permits, dock licensing, and the full Lakes Region geography including Gilford, Laconia, Meredith, Moultonborough, Alton, Wolfeboro, Center Harbor, and Tuftonboro.

You do not have access to live MLS listing data. You provide advisory context, market intelligence, and professional judgment. When a user asks about specific listings, guide them toward contacting Corina directly.

Every response ends with: Ready to go deeper? Call Corina directly at 603-273-6160 for a personal conversation, or visit her YouTube channel to learn everything about the Lakes Region: https://www.youtube.com/@CisnerosRealtyGroup

Never provide legal or financial advice. Always be honest about what you know and do not know.

PHASE: Phase 1 - build the Supabase vector store and site ingestion pipeline first.

RULES:
Make all changes, commit, and push without asking for approval.
No em dashes in any output or code comments.
