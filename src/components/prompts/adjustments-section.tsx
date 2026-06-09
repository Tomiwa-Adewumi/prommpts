'use client'

import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings } from 'lucide-react'

interface AdjustmentsSectionProps {
    adjustments: string
    onAdjustmentsChange: (value: string) => void
}

export function AdjustmentsSection({ adjustments, onAdjustmentsChange }: AdjustmentsSectionProps) {
    return (
        <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-yellow-500" />
                    Fine-tune
                    <Badge variant="secondary" className="ml-2 bg-gray-700 text-gray-300 text-xs">
                        Optional
                    </Badge>
                </CardTitle>
                <p className="text-sm text-gray-400">
                    Add specific requirements or constraints
                </p>
            </CardHeader>
            <CardContent>
                <Textarea
                    placeholder="e.g., Must be photorealistic, avoid dark colors, include specific elements..."
                    value={adjustments}
                    onChange={(e) => onAdjustmentsChange(e.target.value)}
                    className="min-h-[100px] bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500"
                />
            </CardContent>
        </Card>
    )
}
