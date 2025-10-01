"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    RadioGroup,
    RadioGroupItem,
} from "@/components/ui/radio-group";
import { X } from "lucide-react";

export type ContextConfig = {
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
    constraints?: Record<string, any> | null;
};

// These would come from the database in real world app
const MOCK_PRODUCTS = [
    { id: "1", name: "AeroDash Pro — Road Running Shoe", description: "AeroDash Pro is Voltra's everyday road runner built for high-mileage consistency. A responsive nitrogen-infused foam delivers light rebound, while a sculpted stability rail keeps form tidy as fatigue sets in. The engineered knit upper breathes in heat, locks down in corners, and resists stretch across long weeks of training. A durable rubber outsole with decoupled crash pads smooths landings and improves grip on wet pavement. Designed to transition from tempo runs to easy miles without swapping shoes, AeroDash Pro is the do-it-all trainer that helps runners stack days and chase personal bests in confident, minimalist style." },
    { id: "2", name: "SkyCourt Reactor — Performance Basketball Shoe", description: "SkyCourt Reactor is a lightweight, explosive court shoe for players who live above the rim. A tensioned midfoot plate channels force for quicker first steps and vertical pop, while high-cut foam pods stabilize the ankle without bulky weight. The upper blends ripstop mesh with targeted overlays for lockdown that moves cleanly with crossovers and step-backs. A full-length herringbone outsole grips on dusty rec centers and pro-level hardwood alike. From pickup to playoffs, SkyCourt Reactor turns energy into separation—built for speed, control, and the moments that change momentum." },
    { id: "3", name: "Voltra Pulse — Connected Training App + Band", description: "Voltra Pulse combines a minimalist wrist band with an adaptive coaching app to turn everyday workouts into measurable progress. Real-time heart-rate zones, GPS run tracking, and cadence cues meet recovery scoring and personalized plans that adjust to sleep, stress, and training load. The band's week-long battery, water resistance, and single-button UI keep friction low; the app layers in form tips, audio intervals, and community challenges. Integrations with Apple Health/Google Fit make data portable, while privacy controls keep it personal. Voltra Pulse is your steady coach—quietly calibrating effort so athletes at any level can train smarter and feel improvement every week." },
];

const MOCK_AUDIENCES = [
    {
        id: "1",
        name: "Urban Runners 25–34 Denver",
        age_range: "25–34",
        location: "Denver, CO",
        interests: [
            "run clubs",
            "5K–half marathons",
            "early-morning workouts",
            "trail & road mix",
            "strength & mobility",
            "performance footwear"
        ],
        tone: "Bold",
    },
];

type SettingsFormProps = {
    context: ContextConfig;
    setContext: React.Dispatch<React.SetStateAction<ContextConfig>>;
    onSave: () => void;
    onCancel: () => void;
};

export function SettingsForm({ context, setContext, onSave, onCancel }: SettingsFormProps) {
    const [selectedProductId, setSelectedProductId] = useState("");
    const [selectedAudienceId, setSelectedAudienceId] = useState("");
    const [isCreatingAudience, setIsCreatingAudience] = useState(false);
    const [interestInput, setInterestInput] = useState("");

    const handleProductChange = (productId: string) => {
        setSelectedProductId(productId);
        const product = MOCK_PRODUCTS.find(p => p.id === productId);
        if (product) {
            setContext(prev => ({
                ...prev,
                product: { name: product.name, description: product.description }
            }));
        }
    };

    const handleAudienceChange = (audienceId: string) => {
        setSelectedAudienceId(audienceId);
        setIsCreatingAudience(false);
        const audience = MOCK_AUDIENCES.find(a => a.id === audienceId);
        if (audience) {
            setContext(prev => ({
                ...prev,
                audience: {
                    name: audience.name,
                    age_range: audience.age_range,
                    location: audience.location,
                    interests: audience.interests,
                    tone: audience.tone,
                }
            }));
        }
    };

    const handleCreateAudience = () => {
        setSelectedAudienceId("");
        setIsCreatingAudience(true);
        setContext(prev => ({
            ...prev,
            audience: {
                name: "",
                age_range: "",
                location: "",
                interests: [],
                tone: "Bold",
            }
        }));
    };

    const addChip = (field: "interests", value: string) => {
        if (value.trim()) {
            setContext(prev => ({
                ...prev,
                audience: {
                    ...prev.audience,
                    [field]: [...(prev.audience[field] || []), value.trim()]
                }
            }));
        }
    };

    const removeChip = (field: "interests", index: number) => {
        setContext(prev => ({
            ...prev,
            audience: {
                ...prev.audience,
                [field]: (prev.audience[field] || []).filter((_, i) => i !== index)
            }
        }));
    };

    return (
        <div className="py-4 space-y-6">
            <div className="space-y-2">
                <div>
                    <Label className="text-xs text-muted-foreground">Company Name</Label>
                    <p className="text-sm font-medium">{context.organization.name}</p>
                </div>
                <div>
                    <Label className="text-xs text-muted-foreground">Company Description</Label>
                    <p className="text-sm">{context.organization.description}</p>
                </div>
            </div>

            <div className="space-y-3">
                <Label htmlFor="product">Select A Product</Label>
                <Select value={selectedProductId} onValueChange={handleProductChange}>
                    <SelectTrigger id="product">
                        <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                        {MOCK_PRODUCTS.map(product => (
                            <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {context.product.name && (
                    <div className="space-y-2">
                        <div>
                            <Label className="text-xs text-muted-foreground">Product Description</Label>
                            <p className="text-sm">{context.product.description}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-3">
                <Label htmlFor="audience">Select An Audience</Label>
                <Select value={selectedAudienceId} onValueChange={handleAudienceChange}>
                    <SelectTrigger id="audience">
                        <SelectValue placeholder="Select or create audience" />
                    </SelectTrigger>
                    <SelectContent>
                        {MOCK_AUDIENCES.map(audience => (
                            <SelectItem key={audience.id} value={audience.id}>{audience.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button
                    type="button"
                    variant="outline"
                    onClick={handleCreateAudience}
                    className="w-full"
                >
                    Create New Audience
                </Button>

                {(selectedAudienceId || isCreatingAudience) && (
                    <div className="space-y-3 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs">Name</Label>
                                <Input
                                    value={context.audience.name}
                                    onChange={(e) => setContext(prev => ({
                                        ...prev,
                                        audience: { ...prev.audience, name: e.target.value }
                                    }))}
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Age Range</Label>
                                <Input
                                    value={context.audience.age_range}
                                    onChange={(e) => setContext(prev => ({
                                        ...prev,
                                        audience: { ...prev.audience, age_range: e.target.value }
                                    }))}
                                    placeholder="e.g., 25–34"
                                />
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs">Location</Label>
                            <Input
                                value={context.audience.location}
                                onChange={(e) => setContext(prev => ({
                                    ...prev,
                                    audience: { ...prev.audience, location: e.target.value }
                                }))}
                                placeholder="City, State"
                            />
                        </div>

                        <div>
                            <Label className="text-xs">Interests</Label>
                            <div className="flex gap-2 mb-2">
                                <Input
                                    value={interestInput}
                                    onChange={(e) => setInterestInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addChip('interests', interestInput);
                                            setInterestInput("");
                                        }
                                    }}
                                    placeholder="Type and press Enter"
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => {
                                        addChip('interests', interestInput);
                                        setInterestInput("");
                                    }}
                                >
                                    Add
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {context.audience.interests.map((interest, i) => (
                                    <Badge key={i} variant="secondary" className="gap-1">
                                        {interest}
                                        <X
                                            className="h-3 w-3 cursor-pointer"
                                            onClick={() => removeChip('interests', i)}
                                        />
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs">Tone</Label>
                            <Select
                                value={context.audience.tone}
                                onValueChange={(value) => setContext(prev => ({
                                    ...prev,
                                    audience: { ...prev.audience, tone: value }
                                }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Bold">Bold</SelectItem>
                                    <SelectItem value="Playful">Playful</SelectItem>
                                    <SelectItem value="Professional">Professional</SelectItem>
                                    <SelectItem value="Empathetic">Empathetic</SelectItem>
                                    <SelectItem value="Luxury">Luxury</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-3">
                <Label>Objective</Label>
                <RadioGroup
                    value={context.objective}
                    onValueChange={(value: "Awareness" | "Engagement" | "Conversion") =>
                        setContext(prev => ({ ...prev, objective: value }))
                    }
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Awareness" id="awareness" />
                        <Label htmlFor="awareness" className="font-normal cursor-pointer">Awareness</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Engagement" id="engagement" />
                        <Label htmlFor="engagement" className="font-normal cursor-pointer">Engagement</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Conversion" id="conversion" />
                        <Label htmlFor="conversion" className="font-normal cursor-pointer">Conversion</Label>
                    </div>
                </RadioGroup>
            </div>

            <div className="flex w-full justify-center gap-2 pt-2">
                <Button onClick={onSave}>
                    Save Settings
                </Button>
                <Button variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </div>
    );
}
