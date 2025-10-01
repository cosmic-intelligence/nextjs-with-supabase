"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, use, useRef } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface IdeaListItem {
    id: string;
    title: string;
    summary: string;
    channel: string;
    hook: string;
    tags: string[];
}

interface ConceptContent {
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
    render_markdown?: string;
}

interface Message {
    id: string;
    session_id: string;
    created_at: string;
    role: "user" | "assistant";
    type: "text" | "idea_list" | "concept";
    content: any;
}

interface Session {
    id: string;
    user_id: string;
    created_at: string;
    prompt: string;
    context: any;
}

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [session, setSession] = useState<Session | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [developingIdeaId, setDevelopingIdeaId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient();

            const { data: sessionData, error: sessionError } = await supabase
                .from("sessions")
                .select("*")
                .eq("id", id)
                .single();

            if (sessionError) {
                console.error("Error fetching session:", sessionError);
                setLoading(false);
                return;
            }

            setSession(sessionData);

            const { data: messagesData, error: messagesError } = await supabase
                .from("messages")
                .select("*")
                .eq("session_id", id)
                .order("created_at", { ascending: true });

            if (messagesError) {
                console.error("Error fetching messages:", messagesError);
            } else {
                setMessages(messagesData || []);
            }

            setLoading(false);
        };

        fetchData();
    }, [id]);

    const handleDevelopConcept = async (idea: IdeaListItem) => {
        if (!session) return;

        setDevelopingIdeaId(idea.id);

        try {
            const supabase = createClient();
            const { data, error } = await supabase.functions.invoke('agent', {
                body: {
                    context: session.context,
                    user_input: `Develop this idea: ${idea.title}`,
                    session_id: session.id,
                    selected_idea: idea,
                },
            });

            if (error) {
                throw error;
            }

            if (data?.message) {
                setMessages(prev => [...prev, data.message]);
                setTimeout(() => scrollToBottom(), 100);
            }
        } catch (error) {
            console.error("Error developing concept:", error);
        } finally {
            setDevelopingIdeaId(null);
        }
    };

    const renderTextMessage = (message: Message) => {
        const isUser = message.role === "user";
        return (
            <div key={message.id} className={`flex ${isUser ? "justify-start" : "justify-end"}`}>
                <Card className={`max-w-2xl ${isUser ? "bg-muted/50" : ""}`}>
                    <CardContent className="p-4">
                        <p className="text-sm">
                            <strong>{isUser ? "You" : "Assistant"}:</strong> {message.content.text}
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderIdeaList = (message: Message) => {
        const items: IdeaListItem[] = message.content.items || [];
        return (
            <Card key={message.id}>
                <CardHeader className="space-y-2">
                    <div className="flex items-baseline gap-3">
                        <h2 className="text-xl font-semibold">Ideas ({items.length})</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Generated creative ideas for your campaign.
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {items.map((idea) => (
                            <Card key={idea.id} className="h-full transition-all hover:shadow-md flex flex-col">
                                <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
                                    <div className="space-y-2 flex-1">
                                        <h3 className="font-medium text-sm">{idea.title}</h3>
                                        <p className="text-muted-foreground line-clamp-3">
                                            {idea.summary}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        <Badge variant="outline" className="text-xs">
                                            {idea.channel}
                                        </Badge>
                                        {idea.tags?.map((tag) => (
                                            <Badge key={tag} variant="secondary" className="text-xs">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                    <Button
                                        size="sm"
                                        className="w-full mt-2"
                                        onClick={() => handleDevelopConcept(idea)}
                                        disabled={developingIdeaId !== null}
                                    >
                                        {developingIdeaId === idea.id ? (
                                            <>
                                                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                                Developing...
                                            </>
                                        ) : (
                                            "Develop Concept"
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    };

    const renderConcept = (message: Message) => {
        const concept: ConceptContent = message.content;
        return (
            <Card key={message.id}>
                <CardHeader className="space-y-4">
                    <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                            <h2 className="text-2xl font-semibold">{concept.title}</h2>
                            <Badge variant="default" className="shrink-0">
                                Concept
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline">{concept.channel_format.channel}</Badge>
                            <span className="text-muted-foreground text-sm">•</span>
                            <Badge variant="outline">{concept.channel_format.format}</Badge>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide">
                            Summary
                        </h3>
                        <p className="text-sm leading-relaxed">{concept.summary}</p>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide">
                            Audience Insight
                        </h3>
                        <p className="text-sm leading-relaxed italic">{concept.audience_insight}</p>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide">
                            Key Message
                        </h3>
                        <p className="text-sm leading-relaxed font-medium">{concept.key_message}</p>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-sm font-semblold uppercase text-muted-foreground tracking-wide">
                            Reasons to Believe
                        </h3>
                        <ul className="space-y-1.5 list-disc list-inside">
                            {concept.rtbs.map((rtb, idx) => (
                                <li key={idx} className="text-sm leading-relaxed">{rtb}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide">
                            Creative Beats
                        </h3>
                        <ol className="space-y-1.5 list-decimal list-inside">
                            {concept.beats.map((beat, idx) => (
                                <li key={idx} className="text-sm leading-relaxed">{beat}</li>
                            ))}
                        </ol>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide">
                                Hook
                            </h3>
                            <p className="text-sm leading-relaxed">&ldquo;{concept.hook}&rdquo;</p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide">
                                Call to Action
                            </h3>
                            <p className="text-sm leading-relaxed font-medium">{concept.cta}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide">
                            Primary KPI
                        </h3>
                        <p className="text-sm leading-relaxed">
                            <strong>{concept.kpi.primary}:</strong> {concept.kpi.target}
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="flex items-center justify-center py-16">
                <p className="text-muted-foreground">Session not found</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 py-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-6 border-b">
                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold">
                        {session.prompt.substring(0, 50)}
                        {session.prompt.length > 50 ? "..." : ""}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {new Date(session.created_at).toLocaleDateString()}
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {session.context.product?.name && (
                        <>
                            <Badge variant="outline">{session.context.product.name}</Badge>
                            <span className="text-muted-foreground">•</span>
                        </>
                    )}
                    {session.context.audience?.name && (
                        <>
                            <Badge variant="outline">{session.context.audience.name}</Badge>
                            <span className="text-muted-foreground">•</span>
                        </>
                    )}
                    <Badge variant="outline">{session.context.objective}</Badge>
                </div>
            </div>

            <div className="flex flex-col gap-8">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center p-8 bg-muted/30 rounded-lg border-2 border-dashed">
                        <p className="text-sm text-muted-foreground">
                            No messages yet in this session.
                        </p>
                    </div>
                ) : (
                    messages.map((message) => {
                        if (message.type === "text") {
                            return renderTextMessage(message);
                        } else if (message.type === "idea_list") {
                            return renderIdeaList(message);
                        } else if (message.type === "concept") {
                            return renderConcept(message);
                        }
                        return null;
                    })
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
}


