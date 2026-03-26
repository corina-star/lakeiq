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
1. Lakefront vs. lake access. What is the real difference?
2. What are the hidden costs of owning a lake home?
3. Which Lakes Region town is right for you?
4. Buying from out of state. How does it work here?
5. Which town on Winnipesaukee should you buy in?
6. Winnipesaukee vs. Winnisquam. Which is right for you?
7. What should you know before making an offer?

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
- Supabase project: xznrlwhpstfhmxljidnj
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

PHASE: Phase 2 - chat API and embeddable widget are built and deployed.

RULES:
Make all changes, commit, and push without asking for approval.
No em dashes in any output or code comments.
