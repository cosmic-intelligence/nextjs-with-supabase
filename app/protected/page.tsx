"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import Link from "next/link";
import { Sparkles, Settings, Loader2 } from "lucide-react";
import { SettingsForm, type ContextConfig } from "@/components/settings-form";
import { createClient } from "@/lib/supabase/client";
import { useSessions } from "@/hooks/useSessions";

export default function DashboardPage() {
  const [prompt, setPrompt] = useState("");
  const { sessions, sessionsLoading } = useSessions();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [context, setContext] = useState<ContextConfig>({
    organization: { name: "Voltra Athletics", description: "Voltra Athletics is a global performance and lifestyle sports company that designs, manufactures, and markets premium footwear, apparel, and accessories for athletes at every level. Our design language is confident and minimalist—built on clean lines, functional innovation, and everyday durability. We operate a large retail and e-commerce network, sponsor world-class athletes and grassroots clubs, and run a digital ecosystem of training content, challenges, and community events. Products span road running, training, court sports, and streetwear, with ongoing R&D in cushioning, energy return, and sustainable materials. Voltra's mission is simple: motivate people everywhere to move, improve, and chase their personal best—every day." },
    product: { name: "", description: "" },
    audience: {
      name: "",
      age_range: "",
      location: "",
      interests: [],
      tone: "Professional",
    },
    objective: "Awareness",
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (!context.product.name.trim()) {
      alert("Please select a product in Settings before generating");
      return;
    }
    if (!context.audience.name.trim()) {
      alert("Please select an audience in Settings before generating");
      return;
    }

    setIsGenerating(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Error getting user:", userError);
        alert("You must be logged in to create a session");
        return;
      }

      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          user_id: user.id,
          prompt: prompt.trim(),
          context: context,
        })
        .select()
        .single();

      if (sessionError) {
        console.error("Error creating session:", sessionError);
        alert("Failed to create session");
        return;
      }

      const { data: agentData, error: agentError } = await supabase.functions.invoke("agent", {
        body: {
          session_id: session.id,
          context: context,
          user_input: prompt.trim(),
        },
      });

      console.log('\n\n\n\n\n AGENT DATA: ', agentData, '\n\n\n\n\n')

      if (agentError) {
        console.error("Error invoking agent function:", agentError);
        alert("Failed to generate ideas. Please try again.");
        return;
      }

      window.location.href = `/protected/s/${session.id}`;
    } catch (error) {
      console.error("Unexpected error:", error);
      alert("An unexpected error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-12 py-12">
      <div className="flex flex-col items-center justify-center gap-6 max-w-4xl mx-auto w-full h-[70dvh] space-y-6">
        <h1 className="text-3xl font-bold">Generate Marketing Concepts</h1>
        <div className="w-full bg-muted/50 rounded-3xl p-4 shadow-sm">
          <Textarea
            placeholder={`10 ideas for ${context.product.name} — theme, timing, must-haves`}
            value={prompt}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
            className="min-h-[120px] text-base resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
          />
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"

                  >
                    <Settings className="h-4 w-4" />
                    <p>Settings</p>
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-full max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>
                      Configure your generation context and preferences
                    </DialogDescription>
                  </DialogHeader>
                  <SettingsForm
                    context={context}
                    setContext={setContext}
                    onSave={() => {
                      console.log("Saved context:", context);
                      setSettingsOpen(false);
                    }}
                    onCancel={() => setSettingsOpen(false)}
                  />
                </DialogContent>
              </Dialog>

              <div className="flex flex-wrap items-center gap-1.5">
                {context.product.name.trim() ? (
                  <Badge variant="secondary" className="text-xs">
                    {context.product.name}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    No product
                  </Badge>
                )}
                {context.audience.name.trim() ? (
                  <Badge variant="secondary" className="text-xs">
                    {context.audience.name}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    No audience
                  </Badge>
                )}
              </div>
            </div>

            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="rounded-full px-6 w-full sm:w-auto"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {isGenerating ? "Generating..." : "Generate"}
            </Button>
          </div>
        </div>

      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Recent Sessions</h2>
        {sessionsLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4 animate-pulse">
              <Sparkles className="h-12 w-12 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              Loading sessions...
            </p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground">
              Try a prompt above to generate ideas
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/protected/s/${session.id}`}
                className="group"
              >
                <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer">
                  <CardHeader className="space-y-3">
                    <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
                      {session.prompt.length > 60
                        ? `${session.prompt.substring(0, 60)}...`
                        : session.prompt}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {session.ideasCount} ideas • {session.developedCount} developed • {session.createdAt}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-0">
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      <Badge variant="secondary" className="text-xs">
                        {session.product}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {session.audience}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {session.objective}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
