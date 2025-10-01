# Station & Client Code Interview Project

App: [https://nextjs-with-supabase-git-main-cosmic-intelligences-projects.vercel.app](https://nextjs-with-supabase-git-main-cosmic-intelligences-projects.vercel.app)
Code: [https://github.com/cosmic-intelligence/nextjs-with-supabase](https://github.com/cosmic-intelligence/nextjs-with-supabase)

This is a lightweight concept generator for a Fortune 500 marketer to quickly ideate and develop marketing concepts. The app centers on a Compose screen and a Session view. You interact with an agent that can:

* generate marketing ideas
* develop a selected idea into a full concept
* answer follow-up questions


## Documented assumptions & key decisions

- Used the Supabase + Next.js starter to move fast with auth and basic UI in place.
- Because the instructions were open-ended, I seeded a configurable fake company persona (**Voltra Athletics**) and three products so ideas stay grounded in real-world context instead of random output.
- Started with a traditional wizard and dashboard and a multi-table design, then switched to an agent-first flow, which simplified the user flow and reduced the schema to two tables: `sessions` and `messages`.
- Split the creative process into two steps: first, the agent generates 10 quick ideas from your product and audience inputs; then you can pick any idea and expand it into a complete campaign concept with full details. 


## Development details

### `app/protected/page.tsx` (Compose screen)
- Uses local state; in a production app would use Zustand or similar for global state management
- Component logic (data fetching, session creation) could be abstracted to custom hooks and service utilities for better separation of concerns
- `handleGenerate` makes two separate calls (create session --> invoke agent); could be consolidated into a single edge function that handles both operations
- Some TypeScript types could be stricter (prioritized speed over complete type safety)

### `app/protected/s/[id]/page.tsx` (Session view)
- Business logic lives in the component; should be extracted to custom hooks and service layer
- User interaction polish needed: loading states during concept development, auto-scroll behavior could be smoother
- TypeScript types are functional but could be more comprehensive

### `supabase/functions/agent/index.ts` (Agent backend)
- Schema validation relies on prompts; production version would use Zod schemas + OpenAI structured outputs for strict type enforcement
- Responses are returned in one shot; ideally would stream via server-sent events for better UX and per-tool-call feedback
- Agent has no conversation memory, doesn't pass prior messages to LLM. I would implement session-based context window for true multi-turn conversations
- All orchestration logic lives in one file; production architecture would separate intent routing, tool execution, and response handling into cleaner modules
- Prioritized simplicity and speed over robust error handling and retry logic


## Database schema

```sql
CREATE TABLE public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  prompt text NOT NULL,
  context jsonb NOT NULL,
  CONSTRAINT sessions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  role text NOT NULL CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text])),
  type text NOT NULL CHECK (type = ANY (ARRAY['text'::text, 'idea_list'::text, 'concept'::text])),
  content jsonb NOT NULL,
  CONSTRAINT messages_pkey PRIMARY KEY (id)
);
```