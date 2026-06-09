'use client'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Upload } from 'lucide-react'

interface ExtractTabProps {
    image: string | null
    imagePreview: string | null
    context: string
    setContext: (value: string) => void
    onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
    onImageRemove: () => void
}

export function ExtractTab({
    image,
    imagePreview,
    context,
    setContext,
    onImageUpload,
    onImageRemove
}: ExtractTabProps) {
    return (
        <div className="space-y-4">
            {/* Image Upload */}
            <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                    Upload image to extract prompt
                </label>
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-gray-500 transition-colors">
                    {imagePreview ? (
                        <div className="space-y-4">
                            <img
                                src={imagePreview}
                                alt="Extraction Preview"
                                className="max-w-full h-32 object-cover rounded-lg mx-auto"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onImageRemove}
                                className="border-gray-600 text-gray-300 hover:bg-gray-800"
                            >
                                Remove Image
                            </Button>
                        </div>
                    ) : (
                        <div>
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-400 mb-2">
                                Drop an image here or click to browse
                            </p>
                            <input
                                type="file"
                                accept=".png,.jpeg,.jpg,.gif,.webp"
                                onChange={onImageUpload}
                                className="hidden"
                                id="extract-image-upload"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => document.getElementById('extract-image-upload')?.click()}
                                className="border-gray-600 text-gray-300 hover:bg-gray-800"
                            >
                                Choose File
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Context Input */}
            {image && (
                <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">
                        Additional context for extraction (optional)
                    </label>
                    <Textarea
                        placeholder="e.g., Focus on the lighting, ignore the background elements, what style is this?"
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        autoHeight={true}
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500"
                    />
                </div>
            )}
        </div>
    )
}
