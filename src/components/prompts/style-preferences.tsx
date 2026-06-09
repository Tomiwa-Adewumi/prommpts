'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings } from 'lucide-react'

interface StylePreferences {
    realism: 'low' | 'medium' | 'high'
    camera_type: string
    aspect_ratio: string
    prompt_tone: string
}

interface StylePreferencesProps {
    stylePreferences: StylePreferences
    onStylePreferencesChange: (preferences: StylePreferences) => void
}

export function StylePreferencesSection({
    stylePreferences,
    onStylePreferencesChange
}: StylePreferencesProps) {
    const [isExpanded, setIsExpanded] = useState(false)

    const updatePreference = (key: keyof StylePreferences, value: string) => {
        onStylePreferencesChange({
            ...stylePreferences,
            [key]: value
        })
    }

    return (
        <Card className="bg-gray-900 border-gray-700">
            <CardHeader
                className="cursor-pointer hover:bg-gray-800/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <CardTitle className="text-lg text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-yellow-500" />
                        Style Preferences
                        <Badge variant="secondary" className="ml-2 bg-gray-700 text-gray-300 text-xs">
                            Advanced
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
                        Fine-tune technical specifications and model preferences
                    </p>
                )}
            </CardHeader>

            {isExpanded && (
                <CardContent className="space-y-4">
                    {/* Realism Level */}
                    <div>
                        <label className="text-sm font-medium text-gray-300 mb-2 block">
                            Realism Level
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['low', 'medium', 'high'] as const).map((level) => (
                                <button
                                    key={level}
                                    onClick={() => updatePreference('realism', level)}
                                    className={`p-2 rounded-lg border transition-all text-sm capitalize ${stylePreferences.realism === level
                                            ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                                            : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                                        }`}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Camera Type */}
                    <div>
                        <label className="text-sm font-medium text-gray-300 mb-2 block">
                            Camera Type
                        </label>
                        <Input
                            placeholder="e.g., DSLR, film, point-and-shoot, iPhone..."
                            value={stylePreferences.camera_type}
                            onChange={(e) => updatePreference('camera_type', e.target.value)}
                            className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500"
                        />
                    </div>

                    {/* Aspect Ratio */}
                    <div>
                        <label className="text-sm font-medium text-gray-300 mb-2 block">
                            Aspect Ratio
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {['1:1', '3:4', '4:3', '16:9', '21:9'].map((ratio) => (
                                <button
                                    key={ratio}
                                    onClick={() => updatePreference('aspect_ratio', ratio)}
                                    className={`p-2 rounded-lg border transition-all text-sm ${stylePreferences.aspect_ratio === ratio
                                            ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                                            : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                                        }`}
                                >
                                    {ratio}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Prompt Tone */}
                    <div>
                        <label className="text-sm font-medium text-gray-300 mb-2 block">
                            Prompt Tone
                        </label>
                        <Input
                            placeholder="e.g., retro, modern, cinematic, vintage..."
                            value={stylePreferences.prompt_tone}
                            onChange={(e) => updatePreference('prompt_tone', e.target.value)}
                            className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500"
                        />
                    </div>
                </CardContent>
            )}
        </Card>
    )
}
