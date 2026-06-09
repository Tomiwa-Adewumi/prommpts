'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Palette } from 'lucide-react'

const vibeOptions = [
    { id: 'professional', label: 'Professional', description: 'Clean, corporate, business-focused' },
    { id: 'creative', label: 'Creative', description: 'Artistic, innovative, out-of-the-box' },
    { id: 'minimal', label: 'Minimal', description: 'Simple, clean, less is more' },
    { id: 'playful', label: 'Playful', description: 'Fun, colorful, engaging' },
    { id: 'luxury', label: 'Luxury', description: 'Premium, elegant, sophisticated' },
    { id: 'modern', label: 'Modern', description: 'Contemporary, trendy, cutting-edge' },
    { id: 'vintage', label: 'Vintage', description: 'Retro, classic, nostalgic' },
    { id: 'bold', label: 'Bold', description: 'Strong, impactful, attention-grabbing' }
]

interface VibeSelectorProps {
    selectedVibes: string[]
    onVibeToggle: (vibeId: string) => void
    onCustomVibeAdd: (vibe: string) => void
}

export function VibeSelector({ selectedVibes, onVibeToggle, onCustomVibeAdd }: VibeSelectorProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [customVibe, setCustomVibe] = useState('')

    const addCustomVibe = () => {
        if (customVibe.trim() && !selectedVibes.includes(customVibe.trim().toLowerCase())) {
            onCustomVibeAdd(customVibe.trim().toLowerCase())
            setCustomVibe('')
        }
    }

    const removeVibe = (vibeId: string) => {
        onVibeToggle(vibeId)
    }

    return (
        <Card className="bg-gray-900 border-gray-700">
            <CardHeader
                className="cursor-pointer hover:bg-gray-800/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <CardTitle className="text-lg text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Palette className="w-5 h-5 text-yellow-500" />
                        Style & Vibe
                        <Badge variant="secondary" className="ml-2 bg-gray-700 text-gray-300 text-xs">
                            Optional
                        </Badge>
                    </div>
                    <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </CardTitle>
                {!isExpanded && (
                    <p className="text-sm text-gray-400">
                        Add style preferences to enhance your prompt
                    </p>
                )}
            </CardHeader>

            {isExpanded && (
                <CardContent className="space-y-4">
                    {/* Custom Vibe Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Add Custom Style</label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="e.g., cyberpunk, watercolor, cinematic..."
                                value={customVibe}
                                onChange={(e) => setCustomVibe(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addCustomVibe()}
                                className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500"
                            />
                            <Button
                                onClick={addCustomVibe}
                                disabled={!customVibe.trim()}
                                size="sm"
                                className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-4"
                            >
                                Add
                            </Button>
                        </div>
                    </div>

                    {/* Preset Vibes */}
                    <div>
                        <label className="text-sm font-medium text-gray-300 mb-3 block">Preset Styles</label>
                        <div className="grid grid-cols-2 gap-2">
                            {vibeOptions.map((vibe) => (
                                <button
                                    key={vibe.id}
                                    onClick={() => onVibeToggle(vibe.id)}
                                    className={`p-3 rounded-lg border transition-all text-left hover:scale-105 ${selectedVibes.includes(vibe.id)
                                            ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                                            : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                                        }`}
                                >
                                    <div className="font-medium text-sm">{vibe.label}</div>
                                    <div className="text-xs text-gray-400 mt-1">{vibe.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Selected Vibes */}
                    {selectedVibes.length > 0 && (
                        <div className="p-3 bg-gray-800 rounded-lg">
                            <p className="text-sm text-gray-400 mb-2">Selected styles:</p>
                            <div className="flex flex-wrap gap-1">
                                {selectedVibes.map((vibeId) => {
                                    const vibe = vibeOptions.find(v => v.id === vibeId);
                                    const isCustom = !vibe;
                                    return (
                                        <Badge
                                            key={vibeId}
                                            className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs flex items-center gap-1"
                                        >
                                            {isCustom ? vibeId : vibe?.label}
                                            <button
                                                onClick={() => removeVibe(vibeId)}
                                                className="ml-1 hover:bg-yellow-500/30 rounded-full p-0.5"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </Badge>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    )
}
