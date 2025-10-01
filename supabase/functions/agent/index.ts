// Supabase Edge Function - Agent
// Deno runtime with OpenAI integration

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import OpenAI from "npm:openai@4.28.0";

type IdeaListItem = {
    id: string;
    title: string;
    summary: string;
    channel: string;
    hook: string;
    tags: string[];
};

type ConceptContent = {
    from_idea_ref?: string;
    title: string;
    summary: string;
    channel_format: { channel: string; format: string };
    audience_insight: string;
    key_message: string;
    rtbs: [string, string];
    beats: string[];
    hook: string;
    cta: string;
    kpi: { primary: string; target: string };
    copy_examples?: { headline: string; caption: string; alt_caption: string };
    assets?: string[];
    production_notes?: string;
    compliance?: string;
};

type AgentMessage =
    | { role: "assistant"; type: "text"; content: { text: string }; meta?: { model?: string; prompt_tokens?: number; completion_tokens?: number } }
    | { role: "assistant"; type: "idea_list"; content: { items: IdeaListItem[] }; meta?: { model?: string; prompt_tokens?: number; completion_tokens?: number } }
    | { role: "assistant"; type: "concept"; content: ConceptContent; meta?: { model?: string; prompt_tokens?: number; completion_tokens?: number } };

type SessionContext = {
    organization: { name: string; description: string };
    product: { name: string; description: string };
    audience: {
        name: string;
        age_range: string;
        location: string;
        interests: string[];
        tone: string;
    };
    objective: "Awareness" | "Engagement" | "Conversion";
};

type AutoAgentArgs = {
    context: SessionContext;
    user_input: string;
    selected_idea?: IdeaListItem;
};

const MODEL_CLASSIFIER = "gpt-4o-mini";
const MODEL_JSON = "gpt-4o-mini";


function buildIdeasPrompt(ctx: SessionContext, userInput: string): string {
    return `
ORG: ${ctx.organization.name} — ${ctx.organization.description}
PRODUCT: ${ctx.product.name} — ${ctx.product.description}
AUDIENCE: ${ctx.audience.name} (${ctx.audience.age_range}, ${ctx.audience.location})
INTERESTS: ${ctx.audience.interests.join(", ")} | TONE: ${ctx.audience.tone}
OBJECTIVE: ${ctx.objective}

USER PROMPT:
${userInput}

RETURN JSON ONLY with this EXACT schema:
{
  "items": [
    {
      "id": "string (idea_1, idea_2, ... idea_10)",
      "title": "string (max 8 words)",
      "summary": "string (40-60 words)",
      "channel": "string (TikTok|Instagram|Email|OOH)",
      "hook": "string (max 12 words)",
      "tags": ["string", "string", "string"]
    }
  ]
}

Rules:
- items MUST be an array of exactly 10 objects
- Each item MUST have all 6 keys: id, title, summary, channel, hook, tags
- title ≤ 8 words
- summary 40–60 words
- hook ≤ 12 words
- channel must be one of: TikTok, Instagram, Email, OOH
- tags must be an array of strings
- Keep Product & Audience unchanged; use org voice; no discounts unless allowed
`.trim();
}

function buildDevelopPrompt(
    ctx: SessionContext,
    idea: IdeaListItem
): string {
    return `
CONTEXT:
${JSON.stringify(ctx)}

SELECTED_IDEA:
${JSON.stringify(idea)}

TASK: Return JSON ONLY with this EXACT schema:
{
  "title": "string",
  "summary": "string (80-120 words)",
  "channel_format": {
    "channel": "string (TikTok|Instagram|Email|OOH)",
    "format": "string (Video|Story|Reel|Post|Newsletter|Billboard)"
  },
  "audience_insight": "string",
  "key_message": "string",
  "rtbs": ["string", "string"],
  "beats": ["string", "string", "string"],
  "hook": "string",
  "cta": "string",
  "kpi": {
    "primary": "string",
    "target": "string"
  },
  "copy_examples": {
    "headline": "string",
    "caption": "string",
    "alt_caption": "string"
  },
  "assets": ["string"],
  "production_notes": "string",
  "compliance": "string"
}

Rules:
- channel_format MUST be an object with exactly two keys: "channel" and "format"
- rtbs MUST be an array of exactly 2 strings
- beats MUST be an array of 3-5 strings
- Keep Product & Audience unchanged
- Summary 80–120 words
- Map CTA/KPI to objective: ${ctx.objective}
`.trim();
}

async function callJson(
    openai: OpenAI,
    system: string,
    user: string
): Promise<{ data: any; usage?: { prompt_tokens?: number; completion_tokens?: number } }> {
    const res = await openai.chat.completions.create({
        model: MODEL_JSON,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
            { role: "system", content: system },
            { role: "user", content: user },
        ],
    });
    return {
        data: JSON.parse(res.choices[0]?.message?.content ?? "{}"),
        usage: res.usage,
    };
}

async function toolGenerateIdeas(
    openai: OpenAI,
    ctx: SessionContext,
    userInput: string
): Promise<AgentMessage> {
    try {
        const system = "You generate 10 marketing ideas. Output JSON ONLY with { items:[...] } per the requested schema.";
        const { data, usage } = await callJson(openai, system, buildIdeasPrompt(ctx, userInput));

        return {
            role: "assistant",
            type: "idea_list",
            content: { items: data.items || [] },
            meta: {
                model: MODEL_JSON,
                prompt_tokens: usage?.prompt_tokens,
                completion_tokens: usage?.completion_tokens,
            },
        };
    } catch (error) {
        console.error("toolGenerateIdeas error:", error);
        return {
            role: "assistant",
            type: "text",
            content: { text: "Sorry—couldn't generate ideas. Try again." },
        };
    }
}

async function toolDevelopConcept(
    openai: OpenAI,
    ctx: SessionContext,
    idea: IdeaListItem
): Promise<AgentMessage> {
    try {
        const system = "You develop one idea into a full concept. Output JSON ONLY with the exact concept schema.";
        const { data, usage } = await callJson(openai, system, buildDevelopPrompt(ctx, idea));

        return {
            role: "assistant",
            type: "concept",
            content: data as ConceptContent,
            meta: {
                model: MODEL_JSON,
                prompt_tokens: usage?.prompt_tokens,
                completion_tokens: usage?.completion_tokens,
            },
        };
    } catch (error) {
        console.error("toolDevelopConcept error:", error);
        return {
            role: "assistant",
            type: "text",
            content: { text: "Sorry—couldn't develop that concept. Try again." },
        };
    }
}

async function autoAgent(openai: OpenAI, args: AutoAgentArgs): Promise<AgentMessage> {
    const { context, user_input, selected_idea } = args;

    const tools = [
        {
            type: "function" as const,
            function: {
                name: "GenerateIdeas",
                description: "Create 10 ideas as an idea_list",
                parameters: {
                    type: "object",
                    properties: {},
                    additionalProperties: false,
                },
            },
        },
        {
            type: "function" as const,
            function: {
                name: "DevelopConcept",
                description: "Expand a selected idea into a full concept",
                parameters: {
                    type: "object",
                    properties: {},
                    additionalProperties: false,
                },
            },
        },
    ];

    const system = `
You are an intent router. Do exactly ONE of:
- Call GenerateIdeas (if user_input looks like a brief for concepts)
- Call DevelopConcept (if a selected_idea is present or user asks to expand an idea)
- Reply with a short helpful text (no tool) for general questions/clarifications.

Prefer DevelopConcept if selected_idea exists and no clarification is needed.
`.trim();

    const user = `
CONTEXT: ${JSON.stringify(context)}
SELECTED_IDEA: ${selected_idea ? JSON.stringify(selected_idea) : "none"}
USER_INPUT: ${user_input}
`.trim();

    try {
        const cls = await openai.chat.completions.create({
            model: MODEL_CLASSIFIER,
            temperature: 0.2,
            tool_choice: "auto",
            tools,
            messages: [
                { role: "system", content: system },
                { role: "user", content: user },
            ],
        });

        const choice = cls.choices[0];
        const toolCall = choice?.message?.tool_calls?.[0];

        if (toolCall) {
            const name = toolCall.function.name;
            if (name === "DevelopConcept") {
                if (!selected_idea) {
                    return {
                        role: "assistant",
                        type: "text",
                        content: { text: "Pick an idea to develop." },
                    };
                }
                return toolDevelopConcept(openai, context, selected_idea);
            }

            return toolGenerateIdeas(openai, context, user_input);
        }

        const text = (choice?.message?.content || "How can I help with your campaign?").trim();
        return {
            role: "assistant",
            type: "text",
            content: { text },
        };
    } catch (error) {
        console.error("autoAgent error:", error);
        return {
            role: "assistant",
            type: "text",
            content: { text: "Sorry—something went wrong. Please try again." },
        };
    }
}

serve(async (req) => {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type",
    };

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
        if (!openaiApiKey) {
            console.error("OPENAI_API_KEY not configured");
            return new Response(
                JSON.stringify({
                    error: "OPENAI_API_KEY not configured",
                }),
                {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const openai = new OpenAI({ apiKey: openaiApiKey });

        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (!supabaseUrl || !supabaseServiceKey) {
            console.error("Supabase configuration not found");
            return new Response(
                JSON.stringify({
                    error: "Supabase configuration not found",
                }),
                {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const body = await req.json();

        if (!body.context || !body.user_input || !body.session_id) {
            console.error("Missing required fields - context:", !!body.context, "user_input:", !!body.user_input, "session_id:", !!body.session_id);
            return new Response(
                JSON.stringify({
                    error: "Missing required fields: context, user_input, and session_id",
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        await supabase.from("messages").insert({
            session_id: body.session_id,
            role: "user",
            type: "text",
            content: { text: body.user_input },
        });


        const agentArgs: AutoAgentArgs = {
            context: body.context,
            user_input: body.user_input,
            selected_idea: body.selected_idea,
        };

        console.log("Calling autoAgent...");
        const message = await autoAgent(openai, agentArgs);

        const { data: storedMessage, error: insertError } = await supabase
            .from("messages")
            .insert({
                session_id: body.session_id,
                role: "assistant",
                type: message.type,
                content: message.content,
            })
            .select()
            .single();

        if (insertError) {
            console.error("Error storing message:", insertError);
        }

        return new Response(JSON.stringify({ message: storedMessage }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("=== Agent Error ===");
        console.error("Error details:", error);

        return new Response(
            JSON.stringify({
                message: {
                    role: "assistant",
                    type: "text",
                    content: {
                        text: "Sorry—something went wrong. Please try again.",
                    },
                },
            }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});




