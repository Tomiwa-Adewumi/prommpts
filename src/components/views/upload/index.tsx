'use client';

import { useState, memo, Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { ImageDropzone } from '@/components/upload/image-dropzone';
import { MetadataForm } from '@/components/upload/metadata-form';
import { ProcessedImageResult } from '@/lib/images/processing';
import { ImageUploadData } from '@/lib/validation/upload-schema';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { orbitron } from '@/lib/fonts';
import { Modal } from '@/components/ui/modal';

// Dynamic import for Beams to avoid SSR issues with Three.js
const Beams = lazy(() => import('@/components/ui/animated-bg/Beams'));

// --- Main UploadView Component ---
export function UploadView() {
    const router = useRouter();
    const [processedImage, setProcessedImage] = useState<ProcessedImageResult | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<string>('');
    const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);

    const handleImageProcessed = (result: ProcessedImageResult) => {
        setProcessedImage(result);
        setError(null);
    };

    const handleMetadataSubmit = async (metadata: ImageUploadData) => {
        if (!processedImage) {
            setError('Please select an image first');
            return;
        }

        setIsUploading(true);
        setError(null);
        setUploadProgress('Preparing upload...');

        try {
            // Validate file size before upload
            if (processedImage.file.size > 20 * 1024 * 1024) {
                throw new Error('File size exceeds 20MB limit. Please select a smaller image.');
            }

            // Create FormData for upload
            const formData = new FormData();
            formData.append('image', processedImage.file);
            formData.append('metadata', JSON.stringify(metadata));

            setUploadProgress('Uploading image...');

            // Upload to API with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const result = await response.json();
                    throw new Error(result.error || `Upload failed with status ${response.status}`);
                }

                const result = await response.json();
                setUploadProgress('Upload successful! Redirecting...');

                // Small delay to show success message, then switch to library view
                setTimeout(() => {
                    router.push('/dashboard?view=library');
                }, 1000);

            } catch (fetchError) {
                clearTimeout(timeoutId);

                if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                    throw new Error('Upload timed out. Please check your connection and try again.');
                }
                throw fetchError;
            }

        } catch (err) {
            if (err instanceof Error) {
                // Handle specific error types
                if (err.message.includes('NetworkError') || err.message.includes('Failed to fetch')) {
                    setError('Network error. Please check your internet connection and try again.');
                } else if (err.message.includes('timeout')) {
                    setError('Upload timed out. Your file might be too large or your connection is slow. Please try again.');
                } else {
                    setError(err.message);
                }
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setIsUploading(false);
            setUploadProgress('');
        }
    };

    return (
        <>
            {/* Animated Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <Suspense fallback={null}>
                    <Beams
                        beamWidth={3}
                        beamHeight={35}
                        beamNumber={15}
                        lightColor="#f8f052"
                        speed={1.5}
                        noiseIntensity={1.5}
                        scale={0.12}
                        rotation={-20}
                    />
                </Suspense>
                {/* Gradient overlay to fade the beams */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/90" />
            </div>

            {/* Content */}
            <div className="relative z-10 pb-24 md:pb-8 p-4 md:p-8">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4 border-b border-white/10 pb-6">
                        <div>
                            <h1 className={`text-3xl font-bold text-white ${orbitron.className}`}>Upload Image</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-gray-400">
                                    Share your AI-generated artwork with the community
                                </p>
                                <span className="text-gray-600">•</span>
                                <button
                                    onClick={() => setIsGuidelinesOpen(true)}
                                    className="text-sm text-yellow-500 hover:text-yellow-400 flex items-center gap-1 transition-colors"
                                >
                                    <Info className="w-4 h-4" />
                                    Guidelines
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                            <p className="text-red-400 font-medium">Upload Error</p>
                            <p className="text-red-300 text-sm mt-1">{error}</p>
                        </div>
                    )}

                    {/* Progress Display */}
                    {uploadProgress && (
                        <div className="mb-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                            <div className="text-blue-300 font-medium flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
                                {uploadProgress}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column - Image Upload */}
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold mb-4 text-white">Select Image</h2>
                                <ImageDropzone
                                    onImageProcessed={handleImageProcessed}
                                    maxFiles={1}
                                    disabled={isUploading}
                                />
                            </div>
                        </div>

                        {/* Right Column - Metadata Form */}
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold mb-4 text-white">Image Information</h2>
                                <MetadataForm
                                    onSubmit={handleMetadataSubmit}
                                    isLoading={isUploading}
                                    disabled={!processedImage || isUploading}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Guidelines Modal */}
            <Modal
                isOpen={isGuidelinesOpen}
                onClose={() => setIsGuidelinesOpen(false)}
                title={<span className={orbitron.className}>Upload Guidelines</span>}
                className="bg-zinc-900 border-white/10 max-w-lg"
            >
                <div className="space-y-4">
                    <p className="text-gray-300">
                        Please follow these guidelines to ensure a high-quality library for everyone:
                    </p>
                    <ul className="space-y-3 text-sm text-gray-300">
                        <li className="flex gap-2">
                            <span className="text-yellow-500">•</span>
                            <span>Only upload images you have created or have permission to share</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="text-yellow-500">•</span>
                            <span>Supported formats: JPEG, PNG, WebP (max 10MB)</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="text-yellow-500">•</span>
                            <span>Include detailed prompts to help others learn</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="text-yellow-500">•</span>
                            <span>Use relevant tags to make your images discoverable</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="text-yellow-500">•</span>
                            <span>Be respectful and follow community guidelines</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="text-yellow-500">•</span>
                            <span>If upload fails, check your internet connection and try again</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="text-yellow-500">•</span>
                            <span>Large files may take longer to upload - please be patient</span>
                        </li>
                    </ul>
                    <div className="pt-4 flex justify-end">
                        <Button
                            onClick={() => setIsGuidelinesOpen(false)}
                            className="bg-gradient-to-b from-[#f8f052] to-[#d4c800] hover:from-[#f9f262] hover:to-[#e0d400] text-black font-bold border-0"
                        >
                            Got it
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

// Loading skeleton for display while view is initializing
export const UploadViewSkeleton = memo(() => (
    <div className="pb-24 md:pb-8 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
            {/* Header skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4 border-b border-white/10 pb-6">
                <div>
                    <div className="h-8 bg-black/30 rounded w-48 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-black/30 rounded w-64 animate-pulse"></div>
                </div>
            </div>

            {/* Upload form skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div>
                        <div className="h-6 bg-black/30 rounded w-32 mb-4 animate-pulse"></div>
                        <div className="h-48 bg-black/30 rounded-lg animate-pulse border-2 border-dashed border-white/10"></div>
                    </div>
                </div>
                <div className="space-y-6">
                    <div>
                        <div className="h-6 bg-black/30 rounded w-40 mb-4 animate-pulse"></div>
                        <div className="space-y-4">
                            <div className="h-10 bg-black/30 rounded animate-pulse"></div>
                            <div className="h-24 bg-black/30 rounded animate-pulse"></div>
                            <div className="h-10 bg-black/30 rounded animate-pulse"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
));
UploadViewSkeleton.displayName = 'UploadViewSkeleton';
