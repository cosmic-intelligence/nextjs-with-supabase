import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface SessionDisplay {
    id: string;
    prompt: string;
    ideasCount: number;
    developedCount: number;
    createdAt: string;
    product: string;
    audience: string;
    objective: string;
}

function formatTimeAgo(date: string): string {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;
    return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
}

export function useSessions() {
    const [sessions, setSessions] = useState<SessionDisplay[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(true);

    useEffect(() => {
        async function fetchSessions() {
            const supabase = createClient();

            try {
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (userError || !user) {
                    console.error("Error getting user:", userError);
                    setSessionsLoading(false);
                    return;
                }

                const { data: sessionsData, error: sessionsError } = await supabase
                    .from("sessions")
                    .select(`
            id,
            prompt,
            created_at,
            context,
            messages (
              id,
              type
            )
          `)
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false });

                if (sessionsError) {
                    console.error("Error fetching sessions:", sessionsError);
                    setSessionsLoading(false);
                    return;
                }

                const transformedSessions: SessionDisplay[] = (sessionsData || []).map((session: any) => {
                    const messages = session.messages || [];
                    const ideasCount = messages.filter((m: any) => m.type === "idea_list").length;
                    const developedCount = messages.filter((m: any) => m.type === "concept").length;

                    const context = session.context || {};
                    const product = context.product?.name || "N/A";
                    const audience = context.audience?.name || "N/A";
                    const objective = context.objective || "N/A";

                    return {
                        id: session.id,
                        prompt: session.prompt,
                        ideasCount,
                        developedCount,
                        createdAt: formatTimeAgo(session.created_at),
                        product,
                        audience,
                        objective,
                    };
                });

                setSessions(transformedSessions);
            } catch (error) {
                console.error("Unexpected error fetching sessions:", error);
            } finally {
                setSessionsLoading(false);
            }
        }

        fetchSessions();
    }, []);

    return { sessions, sessionsLoading };
}

