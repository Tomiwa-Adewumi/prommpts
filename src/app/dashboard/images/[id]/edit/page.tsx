'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ArrowLeft, Save, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface ImageData {
    id: string;
    title: string;
    description?: string;
    prompt: string;
    tags: string[];
    image_url: string;
    ai_model: string;
    created_at: string;
    user_id: string;
}

export default function EditImagePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const [image, setImage] = useState<ImageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [prompt, setPrompt] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');

    useEffect(() => {
        const fetchImage = async () => {
            try {
                const response = await fetch(`/api/images/${resolvedParams.id}`);

                if (!response.ok) {
                    if (response.status === 404) {
                        toast.error('Image not found');
                        router.push('/dashboard/images');
                        return;
                    }
                    throw new Error('Failed to fetch image');
                }

                const data = await response.json();
                const imageData = data.image;

                // Check if user owns this image
                if (imageData.user_id !== data.currentUserId) {
                    toast.error('You can only edit your own images');
                    router.push('/dashboard/images');
                    return;
                }

                setImage(imageData);
                setTitle(imageData.title);
                setPrompt(imageData.prompt);
                setDescription(imageData.description || '');
                setTags(imageData.tags || []);
            } catch (error) {
                console.error('Error fetching image:', error);
                toast.error('Failed to load image');
                router.push('/dashboard/images');
            } finally {
                setLoading(false);
            }
        };

        fetchImage();
    }, [resolvedParams.id, router]);

    const handleAddTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        setTags(tags.filter(t => t !== tag));
    };

    const handleSave = async () => {
        if (!title.trim() || !prompt.trim()) {
            toast.error('Title and prompt are required');
            return;
        }

        setSaving(true);

        try {
            const response = await fetch(`/api/images/${resolvedParams.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: title.trim(),
                    prompt: prompt.trim(),
                    description: description.trim() || null,
                    tags
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update image');
            }

            toast.success('Image updated successfully!');
            router.push('/dashboard/images');
        } catch (error) {
            console.error('Error updating image:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to update image');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        router.push('/dashboard/images');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-yellow-500" />
                    <p className="text-gray-400">Loading image...</p>
                </div>
            </div>
        );
    }

    if (!image) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-950">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center mb-8">
                    <Button
                        onClick={handleCancel}
                        variant="ghost"
                        size="sm"
                        className="mr-4 h-10 w-10 rounded-full hover:bg-gray-800 transition-all duration-200 hover:scale-105"
                    >
                        <ArrowLeft className="w-4 h-4 text-gray-400" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-semibold text-white">Edit Image</h1>
                        <p className="text-gray-400 mt-1">Update your image details</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Image Preview */}
                    <div>
                        <Card className="bg-gray-900 border-gray-700">
                            <CardHeader>
                                <h3 className="text-lg font-semibold text-white">Image Preview</h3>
                            </CardHeader>
                            <CardContent>
                                <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-800">
                                    <Image
                                        src={image.image_url}
                                        alt={image.title}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                    />
                                </div>
                                <div className="mt-4 text-sm text-gray-400">
                                    <p><strong>Model:</strong> {image.ai_model}</p>
                                    <p><strong>Created:</strong> {new Date(image.created_at).toLocaleDateString()}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Edit Form */}
                    <div>
                        <Card className="bg-gray-900 border-gray-700">
                            <CardHeader>
                                <h3 className="text-lg font-semibold text-white">Edit Details</h3>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Title */}
                                <div>
                                    <label className="text-sm font-medium text-gray-300 block mb-2">
                                        Title *
                                    </label>
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Enter image title"
                                        className="bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>

                                {/* Prompt */}
                                <div>
                                    <label className="text-sm font-medium text-gray-300 block mb-2">
                                        Prompt *
                                    </label>
                                    <Textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="Enter your prompt"
                                        className="bg-gray-800 border-gray-700 text-white min-h-[120px]"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="text-sm font-medium text-gray-300 block mb-2">
                                        Description
                                    </label>
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Describe your image (optional)"
                                        className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                                    />
                                </div>

                                {/* Tags */}
                                <div>
                                    <label className="text-sm font-medium text-gray-300 block mb-2">
                                        Tags
                                    </label>
                                    <div className="flex gap-2 mb-2">
                                        <Input
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                            placeholder="Add tags..."
                                            className="bg-gray-800 border-gray-700 text-white"
                                        />
                                        <Button
                                            onClick={handleAddTag}
                                            variant="outline"
                                            className="border-gray-600 text-gray-300 hover:bg-gray-800"
                                        >
                                            Add
                                        </Button>
                                    </div>
                                    {tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {tags.map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-sm flex items-center gap-2"
                                                >
                                                    {tag}
                                                    <button
                                                        onClick={() => handleRemoveTag(tag)}
                                                        className="hover:text-red-400"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-4">
                                    <Button
                                        onClick={handleCancel}
                                        variant="outline"
                                        className="flex-1 bg-gray-700 text-white hover:bg-gray-600 border border-gray-600 hover:border-gray-500"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        disabled={!title.trim() || !prompt.trim() || saving}
                                        className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4 mr-2" />
                                                Save Changes
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
