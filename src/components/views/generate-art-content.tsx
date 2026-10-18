"use client"

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, useRef, memo, useCallback } from "react"
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useCredits } from '@/contexts/CreditContext'
import { useUserTier } from '@/hooks/useUserTier'
import { useGenerateArtCache } from '@/hooks/use-generate-art-cache'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectItemRaw,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { HomeSidebar } from '@/components/layout/home-sidebar'
import { SignInModal } from '@/components/auth/sign-in-modal'
import { CreditDisplay } from '@/components/ui/credit-display'
import { AnimatedGradient } from '@/components/ui/animated-gradient'
import { SubscriptionModal } from '@/components/payment/subscription-modal'
import { BuyCreditsModal } from '@/components/payment/buy-credits-modal'
import { Skeleton } from '@/components/ui/skeleton'
import {
  IMAGE_MODELS,
  VIDEO_MODELS,
  getAllModels,
  getImageModelsForTier,
  getVideoModelsForTier,
  isModelLocked,
  ImageModelConfig,
  VideoModelConfig,
  UserTier,
  PROVIDER_ICONS
} from '@/lib/models/media-models'
import { toast } from 'sonner'
import {
  Wand2,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  Video,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  Play,
  Pause,
  X,
  Download,
  Lock,
  Trash2,
  RotateCw,
  Copy,
  Edit2
} from "lucide-react"

interface Job {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  original_prompt: string;
  refined_prompt: string | null;
  should_refine_prompt: boolean;
  model: string;
  media_type?: 'image' | 'video';
  aspect_ratio: string;
  duration?: number;
  quality?: string;
  output_data: {
    images?: string[];
    video?: string;
  };
  input_data?: {
    payload?: {
      image_url?: string;
      image_urls?: string[];
      image?: string;
      image_list?: string[];
      video_url?: string;
      resolution?: string;
    };
  };
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export function GenerateArtContent({ showSidebar = true }: { showSidebar?: boolean } = {}) {
  const { clerkUser, supabaseUser, isLoaded: authLoaded, isSignedIn, loading: authSyncing } = useAuth()
  const { tier: userTier, isLoading: tierLoading } = useUserTier()
  const { optimisticallySpendCredits, revertOptimisticSpend } = useCredits()
  const searchParams = useSearchParams()

  // Media type toggle: 'image' or 'video'
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image')

  // UI State
  const [prompt, setPrompt] = useState('')
  const [shouldRefinePrompt, setShouldRefinePrompt] = useState(false)
  const [selectedModel, setSelectedModel] = useState('nano-banana')
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('16:9')
  const [selectedDuration, setSelectedDuration] = useState<number>(4)
  const [selectedResolution, setSelectedResolution] = useState<string>('720p')
  const [selectedQuality, setSelectedQuality] = useState<string>('standard')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Track if we've already loaded a prompt (prevents duplicate toasts)
  const loadedPromptRef = useRef<string | null>(null)

  // Check for pending prompt from URL query params or localStorage
  useEffect(() => {
    // First check URL query param (from home page)
    const urlPrompt = searchParams.get('prompt')
    if (urlPrompt && loadedPromptRef.current !== urlPrompt) {
      loadedPromptRef.current = urlPrompt
      setPrompt(urlPrompt)
      toast.success('Prompt loaded!')
      return
    }

    // Fall back to localStorage (from prompts tab)
    const pendingPrompt = localStorage.getItem('pending_prompt')
    if (pendingPrompt && loadedPromptRef.current !== pendingPrompt) {
      loadedPromptRef.current = pendingPrompt
      setPrompt(pendingPrompt)
      localStorage.removeItem('pending_prompt')
      toast.success('Prompt loaded!')
    }
  }, [searchParams])

  // Media upload state
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([])
  const [uploadedVideoUrls, setUploadedVideoUrls] = useState<string[]>([])

  // Track loaded media for smooth transitions
  const [loadedMediaIds, setLoadedMediaIds] = useState<Set<string>>(new Set())
  const skipMediaClear = useRef(false)

  // ... (I need to jump to handleEdit location, so I'll do two separate replacements or use MultiReplace. 
  // Ideally MultiReplace is better but I can do state first then function.)
  // Actually let's just do state first.

  const [isUploading, setIsUploading] = useState(false)

  // Jobs fetching function for the cache hook
  const fetchJobsData = useCallback(async (): Promise<Job[]> => {
    const timestamp = Date.now();
    const response = await fetch(`/api/jobs/list?limit=50&_t=${timestamp}`, { cache: 'no-store' });
    const data = await response.json();
    if (data.success) {
      return data.jobs || [];
    }
    throw new Error('Failed to fetch jobs');
  }, []);

  // Jobs state with caching - prevents loading flash on page navigation
  const {
    data: jobs,
    setData: setJobs,
    loading: isLoading,
    refresh: refreshJobs
  } = useGenerateArtCache<Job[]>({
    key: 'generate-art-jobs-cache',
    fetchFn: fetchJobsData,
    duration: 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate: true
  });

  // Modal state for viewing media
  const [selectedMedia, setSelectedMedia] = useState<{
    url: string;
    isVideo: boolean;
    prompt: string;
    model: string;
    aspectRatio: string;
    jobId: string;
    job: Job;
  } | null>(null)

  // Preview upload state
  const [previewUpload, setPreviewUpload] = useState<{ url: string, isVideo: boolean } | null>(null)

  const handleRemoveMedia = (url: string, type: 'image' | 'video') => {
    if (type === 'image') {
      setUploadedImageUrls(prev => prev.filter(u => u !== url))
    } else {
      setUploadedVideoUrls(prev => prev.filter(u => u !== url))
    }
  }

  // Available models based on user tier and media type
  const availableImageModels = getAllModels().images
  const availableVideoModels = getAllModels().videos
  const availableModels = mediaType === 'image' ? availableImageModels : availableVideoModels

  // Get current model config
  const currentModelConfig = mediaType === 'image'
    ? IMAGE_MODELS[selectedModel]
    : VIDEO_MODELS[selectedModel]

  // Reset model and defaults when media type changes
  useEffect(() => {
    if (mediaType === 'image') {
      setSelectedModel('nano-banana')
      setSelectedAspectRatio('1:1')
    } else {
      setSelectedModel('kling-2.6')
      setSelectedAspectRatio('16:9')
      setSelectedDuration(4)
      setSelectedResolution('720p')
    }
  }, [mediaType])

  // Update defaults when model changes
  useEffect(() => {
    if (!currentModelConfig) return;

    // Set default quality (prefer first/lowest for cost) - applies to both image and video models
    if (currentModelConfig.qualities?.length) {
      setSelectedQuality(currentModelConfig.qualities[0]);
    }

    if (mediaType === 'video') {
      const videoConfig = currentModelConfig as VideoModelConfig;

      // Set default aspect ratio (prefer 16:9)
      if (videoConfig.aspectRatios?.length) {
        const defaultRatio = videoConfig.aspectRatios.includes('16:9') ? '16:9' : videoConfig.aspectRatios[0];
        setSelectedAspectRatio(defaultRatio);
      }

      // Set default duration (prefer lowest)
      if (videoConfig.durations?.length) {
        setSelectedDuration(Math.min(...videoConfig.durations));
      }

      // Set default resolution (prefer lowest for cost)
      if (videoConfig.resolutions?.length) {
        setSelectedResolution(videoConfig.resolutions[0]);
      }
    }
  }, [selectedModel, currentModelConfig, mediaType])

  // Clear uploaded media when model changes
  useEffect(() => {
    if (skipMediaClear.current) {
      skipMediaClear.current = false
      return
    }
    setUploadedImageUrls([])
    setUploadedVideoUrls([])
  }, [selectedModel])

  // Handle media upload to Supabase storage
  const handleMediaUpload = async (files: FileList | null, type: 'image' | 'video') => {
    if (!files || files.length === 0) return

    setIsUploading(true)
    const uploadedUrls: string[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `${crypto.randomUUID()}.${fileExt}`
        const filePath = `${type === 'image' ? 'reference-images' : 'reference-videos'}/${supabaseUser?.id}/${fileName}`

        // Upload to Supabase storage
        const formData = new FormData()
        formData.append('file', file)
        formData.append('path', filePath)
        formData.append('bucket', type === 'image' ? 'reference-images' : 'reference-videos')

        const response = await fetch('/api/upload-reference', {
          method: 'POST',
          body: formData
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Upload failed')
        }

        uploadedUrls.push(data.url)
      }

      // Update state with uploaded URLs
      if (type === 'image') {
        setUploadedImageUrls(prev => [...prev, ...uploadedUrls])
      } else {
        setUploadedVideoUrls(prev => [...prev, ...uploadedUrls])
      }

      toast.success(`${uploadedUrls.length} ${type}(s) uploaded successfully!`)
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload media')
    } finally {
      setIsUploading(false)
    }
  }

  // Grid items from jobs table (single source of truth)
  const gridItems = useMemo(() => {
    if (!jobs) return [];
    return jobs.map(job => ({
      id: job.id,
      status: job.status,
      url: job.output_data?.images?.[0] || job.output_data?.video,
      isVideo: job.media_type === 'video' || !!job.output_data?.video,
      prompt: job.refined_prompt || job.original_prompt,
      model: job.model,
      aspectRatio: job.aspect_ratio,
      createdAt: job.created_at,
      error: job.error_message,
      job: job
    })).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [jobs])

  // Request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // fetchJobs is now handled by the cache hook, this wrapper is for manual refresh
  const fetchJobs = async () => {
    try {
      await refreshJobs();
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      toast.error('Failed to load your creations');
    }
  }

  // Fetch jobs on mount or when auth changes
  useEffect(() => {
    if (authLoaded && !authSyncing && isSignedIn) {
      fetchJobs()
    }
  }, [authLoaded, isSignedIn, authSyncing])

  // Track active jobs count for polling
  const activeJobsCount = useMemo(() =>
    (jobs || []).filter(j => j.status === 'pending' || j.status === 'processing').length,
    [jobs]
  )

  // Poll for job updates (more reliable than realtime for authenticated tables)
  useEffect(() => {
    if (activeJobsCount === 0) return

    console.log('Starting polling for', activeJobsCount, 'active jobs')

    const pollJobs = async () => {
      try {
        const timestamp = Date.now()
        const response = await fetch(`/api/jobs/list?limit=50&_t=${timestamp}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        })

        if (!response.ok) return

        const data = await response.json()
        if (!data.success || !data.jobs) return

        const updatedJobs = data.jobs as Job[]

        // Check if any jobs have changed status
        setJobs(prevJobs => {
          if (!prevJobs) return updatedJobs; // If null, use updated jobs
          let hasChanges = false
          const newJobs = prevJobs.map(prevJob => {
            const updatedJob = updatedJobs.find(j => j.id === prevJob.id)
            const prevUrl = prevJob.output_data?.images?.[0] || prevJob.output_data?.video
            const newUrl = updatedJob?.output_data?.images?.[0] || updatedJob?.output_data?.video
            if (updatedJob && (
              updatedJob.status !== prevJob.status ||
              newUrl !== prevUrl
            )) {
              hasChanges = true

              // Show notifications for status changes
              if (updatedJob.status === 'completed' && prevJob.status !== 'completed') {
                console.log('Job completed:', updatedJob.id)
                const isVideo = updatedJob.media_type === 'video' || !!updatedJob.output_data?.video
                toast.success(isVideo ? 'Video generated successfully!' : 'Image generated successfully!', {
                  description: 'Your new masterpiece is ready.'
                })

                // Browser Notification
                if (Notification.permission === 'granted') {
                  try {
                    new Notification(isVideo ? '🎬 Video Ready!' : '✨ Image Ready!', {
                      body: isVideo ? 'Your generated video is complete' : 'Your generated image is complete',
                      icon: '/favicon/favicon.png',
                      tag: updatedJob.id
                    })
                  } catch (e) {
                    console.error('Notification error:', e)
                  }
                }
              } else if (updatedJob.status === 'failed' && prevJob.status !== 'failed') {
                toast.error('Generation failed', {
                  description: updatedJob.error_message || 'An unknown error occurred.'
                })
              } else if (updatedJob.status === 'processing' && prevJob.status === 'pending') {
                console.log('Job now processing:', updatedJob.id)
              }

              return updatedJob
            }
            return prevJob
          })

          return hasChanges ? newJobs : prevJobs
        })

      } catch (error) {
        console.error('Polling error:', error)
      }
    }

    // Poll immediately, then every 3 seconds
    pollJobs()
    const interval = setInterval(pollJobs, 3000)

    return () => {
      console.log('Stopping polling')
      clearInterval(interval)
    }
  }, [activeJobsCount])

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    if (!selectedModel) {
      toast.error('Please select a model')
      return
    }

    // Check if model requires images/videos
    if (currentModelConfig?.requiresImageInput && uploadedImageUrls.length === 0) {
      toast.error(`${currentModelConfig.name} requires at least one reference image`)
      return
    }

    // Get credit cost for the model
    const creditCost = currentModelConfig?.credits || 0

    setIsSubmitting(true)

    // Optimistically deduct credits before making the request
    if (creditCost > 0) {
      optimisticallySpendCredits(creditCost)
    }

    try {
      const response = await fetch('/api/jobs/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          shouldRefinePrompt,
          model: selectedModel,
          mediaType,
          aspectRatio: selectedAspectRatio,
          duration: mediaType === 'video' ? selectedDuration : undefined,
          resolution: mediaType === 'video' ? selectedResolution : undefined,
          quality: selectedQuality,
          referenceImageUrls: uploadedImageUrls,
          referenceVideoUrls: uploadedVideoUrls
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // Revert optimistic credit deduction on failure
        if (creditCost > 0) {
          revertOptimisticSpend(creditCost)
        }

        // Handle specific error types
        if (data.error === 'insufficient_credits') {
          throw new Error(`Not enough credits. You need ${data.required} credits but have ${data.available}.`)
        } else if (data.error === 'concurrent_limit_reached') {
          throw new Error(data.message || 'Concurrent generation limit reached')
        }
        throw new Error(data.error || 'Failed to create job')
      }

      toast.success(`${mediaType === 'image' ? 'Image' : 'Video'} generation started!`, {
        description: 'Your request is in the mainframe.'
      })

      // OPTIMISTIC UPDATE: Add the job immediately so the Matrix animation shows up
      if (data.jobId) {
        const optimisticJob: Job = {
          id: data.jobId,
          status: 'pending',
          original_prompt: prompt.trim(),
          refined_prompt: null,
          should_refine_prompt: shouldRefinePrompt,
          model: selectedModel,
          media_type: mediaType,
          aspect_ratio: selectedAspectRatio,
          duration: mediaType === 'video' ? selectedDuration : undefined,
          quality: selectedQuality,
          output_data: {},
          error_message: null,
          created_at: new Date().toISOString(),
          completed_at: null
        };
        setJobs(prev => prev ? [optimisticJob, ...(prev ?? [])] : [optimisticJob]);
      }

      // Clear form after submission
      setPrompt('')
      setUploadedImageUrls([])
      setUploadedVideoUrls([])

    } catch (error) {
      console.error('Submit error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to start generation')
    } finally {
      setIsSubmitting(false)
    }
  }

  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false)
  const [signInAction, setSignInAction] = useState<'view' | 'like' | 'save'>('view')
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false)
  const [isBuyCreditsModalOpen, setIsBuyCreditsModalOpen] = useState(false)
  const [requiredTier, setRequiredTier] = useState<string>('')

  const handleUnauthenticatedAction = (action: 'view' | 'like' | 'save', destinationUrl?: string) => {
    setSignInAction(action)
    setIsSignInModalOpen(true)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'processing':
        return <Loader2 className="w-5 h-5 text-[#F1E500] animate-spin" />
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Queued'
      case 'processing':
        return 'Generating...'
      case 'completed':
        return 'Complete'
      case 'failed':
        return 'Failed'
      default:
        return status
    }
  }

  const downloadMedia = async (url: string, isVideo: boolean) => {
    try {
      toast.loading('Downloading...')

      // Fetch the media as a blob
      const response = await fetch(url)
      if (!response.ok) throw new Error('Download failed')

      const blob = await response.blob()

      // Create a temporary URL for the blob
      const blobUrl = window.URL.createObjectURL(blob)

      // Create a temporary anchor element and trigger download
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `generated-${isVideo ? 'video' : 'image'}-${Date.now()}.${isVideo ? 'mp4' : 'png'}`
      document.body.appendChild(link)
      link.click()

      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)

      toast.dismiss()
      toast.success('Download started!')
    } catch (error) {
      toast.dismiss()
      console.error('Download error:', error)
      toast.error('Failed to download media')
    }
  }

  const handleRegenerate = async (job: Job) => {
    try {
      // Extract reference image/video URLs from input_data
      const referenceImageUrls: string[] = []
      const referenceVideoUrls: string[] = []

      if (job.input_data?.payload) {
        const payload = job.input_data.payload
        if (payload.image_url) referenceImageUrls.push(payload.image_url)
        if (payload.image_urls) referenceImageUrls.push(...payload.image_urls)
        if (payload.image) referenceImageUrls.push(payload.image)
        if (payload.image_list) referenceImageUrls.push(...payload.image_list)
        if (payload.video_url) referenceVideoUrls.push(payload.video_url)
      }

      toast.loading('Regenerating...')

      const response = await fetch('/api/jobs/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: job.original_prompt,
          shouldRefinePrompt: job.should_refine_prompt,
          model: job.model,
          mediaType: job.media_type,
          aspectRatio: job.aspect_ratio,
          duration: job.duration,
          resolution: job.input_data?.payload?.resolution,
          quality: job.quality,
          referenceImageUrls,
          referenceVideoUrls
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate')
      }

      toast.dismiss()
      toast.success('Regeneration started!', {
        description: 'Your new generation is in the queue.'
      })

      // Optimistic update
      if (data.jobId) {
        const optimisticJob: Job = {
          id: data.jobId,
          status: 'pending',
          original_prompt: job.original_prompt,
          refined_prompt: null,
          should_refine_prompt: job.should_refine_prompt,
          model: job.model,
          media_type: job.media_type,
          aspect_ratio: job.aspect_ratio,
          duration: job.duration,
          quality: job.quality,
          output_data: {},
          error_message: null,
          created_at: new Date().toISOString(),
          completed_at: null
        }
        setJobs(prev => [optimisticJob, ...(prev ?? [])])
      }
    } catch (error) {
      toast.dismiss()
      console.error('Regenerate error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to regenerate')
    }
  }

  const handleDelete = async (jobId: string) => {
    try {
      const response = await fetch('/api/jobs/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ jobId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete')
      }

      toast.success('Deleted successfully!')

      // Remove from local state
      setJobs(prev => prev ? prev.filter(j => j.id !== jobId) : [])

      // Close modal if it's the deleted job
      if (selectedMedia?.jobId === jobId) {
        setSelectedMedia(null)
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete')
    }
  }

  const handleRecreate = (job: Job) => {
    // Extract reference URLs from input_data
    const referenceImageUrls: string[] = []
    const referenceVideoUrls: string[] = []

    if (job.input_data?.payload) {
      const payload = job.input_data.payload
      if (payload.image_url) referenceImageUrls.push(payload.image_url)
      if (payload.image_urls) referenceImageUrls.push(...payload.image_urls)
      if (payload.image) referenceImageUrls.push(payload.image)
      if (payload.image_list) referenceImageUrls.push(...payload.image_list)
      if (payload.video_url) referenceVideoUrls.push(payload.video_url)
    }

    // Set the media type first
    if (job.media_type) {
      setMediaType(job.media_type)
    }

    // Populate the form with job parameters
    setPrompt(job.original_prompt)
    setShouldRefinePrompt(job.should_refine_prompt || false)
    setSelectedModel(job.model)
    setSelectedAspectRatio(job.aspect_ratio)

    if (job.duration) {
      setSelectedDuration(job.duration)
    }

    if (job.input_data?.payload?.resolution) {
      setSelectedResolution(job.input_data.payload.resolution)
    }

    if (job.quality) {
      setSelectedQuality(job.quality)
    }

    setUploadedImageUrls(referenceImageUrls)
    setUploadedVideoUrls(referenceVideoUrls)

    toast.success('Parameters loaded!', {
      description: 'Ready to generate with these settings.'
    })

    // Close modal if open
    setSelectedMedia(null)

    // Scroll to input
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    }, 100)
  }

  const handleEdit = (job: Job) => {
    const outputUrl = job.output_data?.images?.[0] || job.output_data?.video

    if (!outputUrl) {
      toast.error('No output media found')
      return
    }

    const isVideo = job.media_type === 'video' || !!job.output_data?.video
    let switchNeeded = false
    let switchTarget = ''

    // Smart Model Switching
    if (isVideo) {
      const currentModel = availableVideoModels.find(m => m.id === selectedModel)
      if (!currentModel || !currentModel.supportsVideoInput) {
        switchNeeded = true
        switchTarget = 'kling-o1-v2v'
      }
    } else {
      const currentModel = availableImageModels.find(m => m.id === selectedModel)
      if (!currentModel || !currentModel.supportsImageInput) {
        switchNeeded = true
        // Check user tier for "nano-banana-pro"
        const proModel = IMAGE_MODELS['nano-banana-pro']
        const canUsePro = proModel && !isModelLocked(userTier as UserTier, proModel.tier)
        switchTarget = canUsePro ? 'nano-banana-pro' : 'nano-banana'
      }
    }

    if (switchNeeded) {
      skipMediaClear.current = true
      setSelectedModel(switchTarget)
      setMediaType(isVideo ? 'video' : 'image')
    }

    if (isVideo) {
      setUploadedVideoUrls(prev => [...prev, outputUrl])
      toast.success(switchNeeded ? 'Switched to compatible video model!' : 'Video added to references!')
    } else {
      setUploadedImageUrls(prev => [...prev, outputUrl])
      toast.success(switchNeeded ? 'Switched to compatible image model!' : 'Image added to references!')
    }

    // Close modal if open
    setSelectedMedia(null)

    // Scroll to input
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    }, 100)
  }

  return (
    <div className="h-screen bg-black flex overflow-hidden">
      {/* Sidebar - conditionally rendered for SPA mode */}
      {showSidebar && <HomeSidebar onUnauthenticatedAction={handleUnauthenticatedAction} />}

      {/* Sign In Modal */}
      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
        action={signInAction}
      />

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        requiredTier={requiredTier}
      />

      {/* Buy Credits Modal */}
      <BuyCreditsModal
        isOpen={isBuyCreditsModalOpen}
        onClose={() => setIsBuyCreditsModalOpen(false)}
      />

      {/* Main content */}
      <div className={`flex-1 relative overflow-hidden flex flex-col ${showSidebar ? 'md:ml-20' : ''}`}>
        {/* Credit Display - Top Right */}
        <div className="fixed top-6 right-8 z-30">
          <CreditDisplay onBuyClick={() => setIsBuyCreditsModalOpen(true)} />
        </div>

        {/* Images Grid - Full Screen Background */}
        <div className="flex-1 overflow-y-auto scrollbar-hide pt-16 px-4 pb-32">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="aspect-square bg-black border border-white/5 relative">
                  <Skeleton className="w-full h-full bg-zinc-900/50" />
                  <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col gap-2">
                    <Skeleton className="w-2/3 h-2 bg-zinc-800" />
                    <Skeleton className="w-1/3 h-2 bg-zinc-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : gridItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-xl font-orbitron text-white uppercase tracking-widest">No Creations Found</p>
              <p className="text-sm text-zinc-500 mt-2">Describe what you want to see below to start creating</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1">
              {gridItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.url && item.status === 'completed') {
                      setSelectedMedia({
                        url: item.url,
                        isVideo: item.isVideo,
                        prompt: item.prompt,
                        model: item.model,
                        aspectRatio: item.aspectRatio,
                        jobId: item.id,
                        job: item.job
                      });
                    }
                  }}
                  className="group relative aspect-square bg-black rounded-none overflow-hidden hover:ring-2 hover:ring-[#F1E500]/50 transition-all cursor-pointer border border-white/5"
                >
                  {item.url ? (
                    item.isVideo ? (
                      <div className="relative w-full h-full">
                        {/* Video thumbnail - first frame */}
                        <video
                          src={item.url}
                          className={`w-full h-full object-cover transition-opacity duration-500 ${loadedMediaIds.has(item.id) ? 'opacity-100' : 'opacity-0'}`}
                          muted
                          playsInline
                          preload="metadata"
                          onLoadedData={() => {
                            setLoadedMediaIds(prev => new Set(prev).add(item.id))
                          }}
                        />
                        {/* Loading Gradient Overlay */}
                        {!loadedMediaIds.has(item.id) && (
                          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
                            <AnimatedGradient />
                            <div className="z-20 flex flex-col items-center animate-pulse">
                              <Loader2 className="w-5 h-5 text-[#F1E500] animate-spin" />
                              <span className="text-[10px] mt-2 uppercase tracking-[0.2em] text-[#F1E500] font-bold drop-shadow-[0_0_8px_rgba(241,229,0,0.5)]">
                                Loading...
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Play button overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors z-20">
                          <div className="w-14 h-14 rounded-full bg-[#F1E500] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="w-6 h-6 text-black ml-1" fill="black" />
                          </div>
                        </div>

                      </div>
                    ) : (
                      <div className="relative w-full h-full">
                        <img
                          src={item.url}
                          alt={item.prompt}
                          className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${loadedMediaIds.has(item.id) ? 'opacity-100' : 'opacity-0'}`}
                          onLoad={() => {
                            setLoadedMediaIds(prev => new Set(prev).add(item.id))
                          }}
                        />
                        {/* Loading Gradient Overlay */}
                        {!loadedMediaIds.has(item.id) && (
                          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
                            <AnimatedGradient />
                            <div className="z-20 flex flex-col items-center animate-pulse">
                              <Loader2 className="w-5 h-5 text-[#F1E500] animate-spin" />
                              <span className="text-[10px] mt-2 uppercase tracking-[0.2em] text-[#F1E500] font-bold drop-shadow-[0_0_8px_rgba(241,229,0,0.5)]">
                                Loading...
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="relative w-full h-full bg-black flex flex-col items-center justify-center space-y-3 p-4 overflow-hidden">
                      {/* Animated Gradient Effect for active jobs */}
                      {item.status !== 'failed' && <AnimatedGradient />}

                      <div className="z-10 flex flex-col items-center animate-pulse">
                        {getStatusIcon(item.status)}
                        <span className="text-[10px] mt-2 uppercase tracking-[0.2em] text-[#F1E500] font-bold drop-shadow-[0_0_8px_rgba(241,229,0,0.5)]">
                          {getStatusText(item.status)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Status Overlay - Top Left (Hidden during generation) */}
                  {item.status !== 'completed' && item.status !== 'pending' && item.status !== 'processing' && (
                    <div className="absolute top-3 left-3 z-20">
                      <div className="bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-[#F1E500]/30 flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'failed' ? 'bg-red-500' : 'bg-[#F1E500] animate-pulse'
                          }`} />
                        <span className="text-[9px] uppercase tracking-widest text-white font-bold">
                          {getStatusText(item.status)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Dispersed Hover Overlay - Clean Aesthetic */}
                  {item.status === 'completed' && item.url && (
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {/* Top Right Actions - Text + Icon style */}
                      <div className="absolute top-3 right-3 flex items-center gap-2 z-40">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(item.job);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-black/40 hover:bg-black/70 backdrop-blur-md rounded-full text-white transition-all border border-white/10 hover:border-white/30 shadow-lg"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase tracking-wide">Edit</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRecreate(item.job);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-black/40 hover:bg-black/70 backdrop-blur-md rounded-full text-white transition-all border border-white/10 hover:border-white/30 shadow-lg"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase tracking-wide">Recreate</span>
                        </button>
                      </div>

                      {/* Bottom Gradient for Readability */}
                      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-20" />

                      {/* Bottom Info & Actions */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between z-40">
                        {/* Left: Model Info */}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/90 drop-shadow-lg mb-1.5">
                          {item.model}
                        </span>

                        {/* Right: Icon Actions */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadMedia(item.url!, item.isVideo);
                            }}
                            className="text-white/80 hover:text-[#F1E500] transition-colors drop-shadow-lg hover:scale-110 transform duration-200"
                            title="Download"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRegenerate(item.job);
                            }}
                            className="text-white/80 hover:text-[#F1E500] transition-colors drop-shadow-lg hover:scale-110 transform duration-200"
                            title="Regenerate"
                          >
                            <RotateCw className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
                            className="text-white/80 hover:text-red-500 transition-colors drop-shadow-lg hover:scale-110 transform duration-200"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Failed State Overlay - Always Visible */}
                  {item.status === 'failed' && (
                    <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-30 animate-in fade-in duration-300 border border-red-500/20">
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-3 rounded-full bg-red-500/10 border border-red-500/30">
                          <XCircle className="w-6 h-6 text-red-500" />
                        </div>
                        <span className="text-xs font-medium text-red-200/80 uppercase tracking-widest">Failed</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRecreate(item.job);
                          }}
                          className="px-4 py-2 bg-[#F1E500] text-black text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-[#d4c800] transition-all shadow-lg hover:shadow-[#F1E500]/20"
                        >
                          Retry
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className="p-2 bg-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded-lg transition-colors border border-white/5"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Media Viewer Modal */}
        {selectedMedia && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedMedia(null)}
          >
            {/* Close button */}
            <button
              className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 transition-colors z-50"
              onClick={() => setSelectedMedia(null)}
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {/* Download button */}
            <button
              className="absolute top-4 right-16 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 transition-colors z-50"
              onClick={(e) => {
                e.stopPropagation()
                downloadMedia(selectedMedia.url, selectedMedia.isVideo)
              }}
            >
              <Download className="w-6 h-6 text-white" />
            </button>

            {/* Action buttons row */}
            <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
              <button
                className="p-2 rounded-full bg-zinc-800/80 hover:bg-[#F1E500] hover:text-black text-white transition-all"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRegenerate(selectedMedia.job)
                }}
                title="Regenerate"
              >
                <RotateCw className="w-6 h-6" />
              </button>
              <button
                className="p-2 rounded-full bg-zinc-800/80 hover:bg-[#F1E500] hover:text-black text-white transition-all"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRecreate(selectedMedia.job)
                }}
                title="Recreate"
              >
                <Copy className="w-6 h-6" />
              </button>
              <button
                className="p-2 rounded-full bg-zinc-800/80 hover:bg-[#F1E500] hover:text-black text-white transition-all"
                onClick={(e) => {
                  e.stopPropagation()
                  handleEdit(selectedMedia.job)
                }}
                title="Edit"
              >
                <Edit2 className="w-6 h-6" />
              </button>
              <button
                className="p-2 rounded-full bg-zinc-800/80 hover:bg-red-500 text-white transition-all"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(selectedMedia.jobId)
                }}
                title="Delete"
              >
                <Trash2 className="w-6 h-6" />
              </button>
            </div>

            {/* Media content */}
            <div
              className="relative max-w-5xl max-h-[85vh] w-full flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedMedia.isVideo ? (
                <video
                  src={selectedMedia.url}
                  className="max-w-full max-h-[70vh] rounded-xl shadow-2xl"
                  controls
                  autoPlay
                  loop
                />
              ) : (
                <img
                  src={selectedMedia.url}
                  alt={selectedMedia.prompt}
                  className="max-w-full max-h-[70vh] rounded-xl shadow-2xl object-contain"
                />
              )}

              {/* Info panel */}
              <div className="mt-4 w-full max-w-2xl bg-zinc-900/90 backdrop-blur-xl rounded-xl p-4 border border-white/10">
                <p className="text-white text-sm leading-relaxed mb-3">
                  {selectedMedia.prompt}
                </p>
                <div className="flex items-center gap-4 text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <span className="text-[#F1E500] font-bold uppercase">Model:</span>
                    {selectedMedia.model}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-[#F1E500] font-bold uppercase">Ratio:</span>
                    {selectedMedia.aspectRatio}
                  </span>
                  {selectedMedia.isVideo && (
                    <span className="flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-[#F1E500]" />
                      <span className="text-[#F1E500] font-bold uppercase">Video</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Preview Modal */}
        {previewUpload && (
          <div
            className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPreviewUpload(null)}
          >
            <button
              className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 transition-colors z-50"
              onClick={() => setPreviewUpload(null)}
            >
              <X className="w-6 h-6 text-white" />
            </button>

            <div className="relative max-w-5xl max-h-[85vh] w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
              {previewUpload.isVideo ? (
                <video src={previewUpload.url} controls autoPlay className="max-w-full max-h-[85vh] rounded-xl shadow-2xl" />
              ) : (
                <img src={previewUpload.url} alt="Preview" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain" />
              )}
            </div>
          </div>
        )}

        {/* Floating Input UI - Styled like the reference image */}
        <div className="fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 w-full max-w-3xl px-6 z-40 md:pl-24">
          <div className="flex items-center gap-3">
            {/* Media Type Toggle - Left Side Vertical */}
            <div className="flex flex-col bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 gap-1 self-center">
              <button
                onClick={() => setMediaType('image')}
                className={`flex flex-col items-center justify-center w-12 py-2 px-2 rounded-xl transition-all ${mediaType === 'image'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'
                  }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span className="text-[8px] font-medium mt-0.5 uppercase tracking-wide">Image</span>
              </button>
              <button
                onClick={() => setMediaType('video')}
                className={`flex flex-col items-center justify-center w-12 py-2 px-2 rounded-xl transition-all ${mediaType === 'video'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'
                  }`}
              >
                <Video className="w-4 h-4" />
                <span className="text-[8px] font-medium mt-0.5 uppercase tracking-wide">Video</span>
              </button>
            </div>

            {/* Main Input Container */}
            <div className="flex-1 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-[28px] shadow-2xl p-3 flex flex-col gap-3">
              {/* Prompt Input */}
              <div className="px-3 pt-1">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={mediaType === 'image' ? "Describe your image..." : "Describe your video..."}
                  className="min-h-[40px] max-h-[120px] bg-transparent border-none text-white placeholder:text-zinc-500 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-base leading-relaxed resize-none scrollbar-hide"
                  disabled={isSubmitting}
                />
              </div>

              {/* Media Upload Section - Show if model supports uploads */}
              {(currentModelConfig?.supportsImageInput || ('supportsVideoInput' in currentModelConfig && currentModelConfig.supportsVideoInput)) && (
                <div className="px-3 flex items-center gap-2 flex-wrap pb-2">
                  {/* Image Thumbnails */}
                  {uploadedImageUrls.map((url, index) => (
                    <div key={`img-${index}`} className="group relative w-12 h-12 rounded-lg overflow-hidden cursor-pointer border border-white/10 hover:border-white/30 transition-all bg-black/50">
                      <img
                        src={url}
                        alt="Reference"
                        className="w-full h-full object-cover"
                        onClick={() => setPreviewUpload({ url, isVideo: false })}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveMedia(url, 'image')
                        }}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}

                  {/* Video Thumbnails */}
                  {uploadedVideoUrls.map((url, index) => (
                    <div key={`vid-${index}`} className="group relative w-12 h-12 rounded-lg overflow-hidden cursor-pointer border border-white/10 hover:border-white/30 transition-all bg-black/50">
                      <video
                        src={url}
                        className="w-full h-full object-cover"
                        onClick={() => setPreviewUpload({ url, isVideo: true })}
                      />
                      <div className="absolute top-1 right-1 pointer-events-none">
                        <Video className="w-2.5 h-2.5 text-white/70" />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveMedia(url, 'video')
                        }}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}

                  {/* Image Add Button */}
                  {currentModelConfig.supportsImageInput && uploadedImageUrls.length < (('maxImages' in currentModelConfig && currentModelConfig.maxImages) || 1) && (
                    <label
                      className={`h-12 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/80 border border-zinc-700/50 hover:border-zinc-500 cursor-pointer flex items-center justify-center transition-all group relative overflow-hidden ${uploadedImageUrls.length === 0 ? 'w-auto px-4' : 'w-12'
                        }`}
                      title={currentModelConfig.requiresImageInput ? 'Add Images (Required)' : 'Add Images'}
                    >
                      {currentModelConfig.requiresImageInput && uploadedImageUrls.length === 0 && (
                        <span className="absolute top-0 right-0 flex h-2.5 w-2.5 z-10 -mr-1 -mt-1">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </span>
                      )}

                      <div className="flex items-center gap-3">
                        <div className="relative flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                          {uploadedImageUrls.length > 0 && (
                            <div className="absolute -bottom-2 -right-2 bg-zinc-800 rounded-full border border-black p-0.5">
                              <div className="bg-zinc-400 group-hover:bg-white w-2.5 h-2.5 rounded-full flex items-center justify-center transition-colors">
                                <span className="text-[8px] font-bold text-black leading-none pb-0.5">+</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {uploadedImageUrls.length === 0 && (
                          <div className="flex flex-col items-start whitespace-nowrap">
                            <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors">Add Images</span>
                            <span className={`text-[9px] uppercase tracking-wider font-bold ${currentModelConfig.requiresImageInput ? 'text-[#F1E500]' : 'text-zinc-500'}`}>
                              {currentModelConfig.requiresImageInput ? 'Required' : 'Optional'}
                            </span>
                          </div>
                        )}
                      </div>

                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        max={('maxImages' in currentModelConfig && currentModelConfig.maxImages) || 1}
                        className="hidden"
                        onChange={(e) => handleMediaUpload(e.target.files, 'image')}
                        disabled={isUploading || isSubmitting}
                      />
                    </label>
                  )}

                  {/* Video Add Button */}
                  {'supportsVideoInput' in currentModelConfig && currentModelConfig.supportsVideoInput && uploadedVideoUrls.length < (('maxVideos' in currentModelConfig && currentModelConfig.maxVideos) || 1) && (
                    <label
                      className={`h-12 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/80 border border-zinc-700/50 hover:border-zinc-500 cursor-pointer flex items-center justify-center transition-all group relative overflow-hidden ${uploadedVideoUrls.length === 0 ? 'w-auto px-4' : 'w-12'
                        }`}
                      title="Add Video"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative flex items-center justify-center">
                          <Video className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                          {uploadedVideoUrls.length > 0 && (
                            <div className="absolute -bottom-2 -right-2 bg-zinc-800 rounded-full border border-black p-0.5">
                              <div className="bg-zinc-400 group-hover:bg-white w-2.5 h-2.5 rounded-full flex items-center justify-center transition-colors">
                                <span className="text-[8px] font-bold text-black leading-none pb-0.5">+</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {uploadedVideoUrls.length === 0 && (
                          <div className="flex flex-col items-start whitespace-nowrap">
                            <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors">Add Videos</span>
                            <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-500">
                              Optional
                            </span>
                          </div>
                        )}
                      </div>

                      <input
                        type="file"
                        accept="video/*"
                        multiple
                        max={('maxVideos' in currentModelConfig && currentModelConfig.maxVideos) || 1}
                        className="hidden"
                        onChange={(e) => handleMediaUpload(e.target.files, 'video')}
                        disabled={isUploading || isSubmitting}
                      />
                    </label>
                  )}
                </div>
              )}

              {/* Controls Bar */}
              <div className="flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Model Selector Pill */}
                  <Select
                    value={selectedModel}
                    onValueChange={(value) => {
                      const model = availableModels.find(m => m.id === value);
                      if (model && isModelLocked(userTier as UserTier, model.tier)) {
                        setRequiredTier(model.tier);
                        setIsSubscriptionModalOpen(true);
                        return;
                      }
                      setSelectedModel(value);
                    }}
                    disabled={isSubmitting || tierLoading}
                  >
                    <SelectTrigger className="h-9 bg-zinc-800/50 hover:bg-zinc-800 border-none text-zinc-300 text-xs rounded-full px-4 gap-2 transition-colors min-w-[140px]">
                      <div className="flex items-center gap-2">
                        {currentModelConfig && (
                          <img
                            src={PROVIDER_ICONS[currentModelConfig.provider]}
                            alt=""
                            className="w-4 h-4 object-contain"
                          />
                        )}
                        <span className="font-medium whitespace-nowrap">
                          {currentModelConfig?.name || 'Model'}
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0a0a] border border-white/10 text-white rounded-2xl overflow-hidden min-w-[340px] p-2 shadow-2xl">
                      {availableModels.map((model) => {
                        const isSelected = selectedModel === model.id;
                        const isLocked = isModelLocked(userTier as UserTier, model.tier);

                        return (
                          <SelectItemRaw
                            key={model.id}
                            value={model.id}
                            className={`flex items-center justify-between py-2.5 px-3 transition-all outline-none rounded-xl cursor-pointer mb-1 group focus:bg-zinc-800 ${isSelected ? 'bg-zinc-800/80' : 'hover:bg-zinc-800/50'} ${isLocked ? 'opacity-75' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center border transition-all ${isSelected ? 'border-[#F1E500]/40' : 'border-white/5'} group-focus:border-[#F1E500]/30`}>
                                <img
                                  src={PROVIDER_ICONS[model.provider]}
                                  alt={model.provider}
                                  className={`w-5 h-5 object-contain ${isLocked ? 'opacity-50 grayscale' : ''}`}
                                />
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm text-white">{model.name}</span>
                                  {isLocked ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wide leading-none bg-zinc-800 text-zinc-500 flex items-center gap-1">
                                      <Lock className="w-2.5 h-2.5" />
                                      {model.tier}
                                    </span>
                                  ) : model.tier !== 'free' && (
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-black tracking-wide leading-none transition-colors ${isSelected ? 'bg-[#F1E500] text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                                      {model.tier}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-zinc-500 mt-0.5">
                                  {model.description}
                                </span>
                              </div>
                            </div>

                            {/* Checkmark or Lock on right */}
                            {isSelected && (
                              <Check className="w-5 h-5 text-[#F1E500] ml-3 flex-shrink-0" />
                            )}
                            {!isSelected && isLocked && (
                              <Lock className="w-4 h-4 text-zinc-600 ml-3 flex-shrink-0" />
                            )}
                          </SelectItemRaw>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  {/* Aspect Ratio Pill - Dynamic based on model */}
                  <Select value={selectedAspectRatio} onValueChange={setSelectedAspectRatio} disabled={isSubmitting}>
                    <SelectTrigger className="h-9 w-[70px] bg-zinc-800/50 hover:bg-zinc-800 border-none text-zinc-300 text-xs rounded-full px-3 justify-center transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0a0a] border border-white/10 text-white rounded-2xl overflow-hidden min-w-[100px] p-1.5 shadow-2xl">
                      {(currentModelConfig?.aspectRatios || ['1:1', '16:9', '9:16']).map((ratio) => (
                        <SelectItem
                          key={ratio}
                          value={ratio}
                          className="text-xs hover:bg-zinc-800/50 focus:bg-zinc-800 focus:text-white py-2.5 rounded-xl transition-all cursor-pointer mb-0.5 data-[state=checked]:bg-zinc-800/80"
                        >
                          <span className="font-bold">{ratio}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Duration Selector - Only for videos */}
                  {mediaType === 'video' && (currentModelConfig as VideoModelConfig)?.durations && (
                    <Select value={selectedDuration.toString()} onValueChange={(val) => setSelectedDuration(parseInt(val))} disabled={isSubmitting}>
                      <SelectTrigger className="h-9 w-[70px] bg-zinc-800/50 hover:bg-zinc-800 border-none text-zinc-300 text-xs rounded-full px-3 justify-center transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0a0a0a] border border-white/10 text-white rounded-2xl overflow-hidden min-w-[100px] p-1.5 shadow-2xl">
                        {(currentModelConfig as VideoModelConfig).durations.map((duration) => (
                          <SelectItem
                            key={duration}
                            value={duration.toString()}
                            className="text-xs hover:bg-zinc-800/50 focus:bg-zinc-800 focus:text-white py-2.5 rounded-xl transition-all cursor-pointer mb-0.5 data-[state=checked]:bg-zinc-800/80"
                          >
                            <span className="font-bold">{duration}s</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Resolution Selector - For video models with resolutions */}
                  {mediaType === 'video' && (currentModelConfig as VideoModelConfig)?.resolutions?.length > 0 && (
                    <Select value={selectedResolution} onValueChange={setSelectedResolution} disabled={isSubmitting}>
                      <SelectTrigger className="h-9 w-[80px] bg-zinc-800/50 hover:bg-zinc-800 border-none text-zinc-300 text-xs rounded-full px-3 justify-center transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0a0a0a] border border-white/10 text-white rounded-2xl overflow-hidden min-w-[100px] p-1.5 shadow-2xl">
                        {(currentModelConfig as VideoModelConfig).resolutions.map((res) => (
                          <SelectItem
                            key={res}
                            value={res}
                            className="text-xs hover:bg-zinc-800/50 focus:bg-zinc-800 focus:text-white py-2.5 rounded-xl transition-all cursor-pointer mb-0.5 data-[state=checked]:bg-zinc-800/80"
                          >
                            <span className="font-bold">{res}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Quality Selector - If model supports it */}
                  {currentModelConfig?.qualities && currentModelConfig.qualities.length > 0 && (
                    <Select value={selectedQuality} onValueChange={setSelectedQuality} disabled={isSubmitting}>
                      <SelectTrigger className="h-9 w-[100px] bg-zinc-800/50 hover:bg-zinc-800 border-none text-zinc-300 text-xs rounded-full px-3 justify-center transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0a0a0a] border border-white/10 text-white rounded-2xl overflow-hidden min-w-[120px] p-1.5 shadow-2xl">
                        {currentModelConfig.qualities.map((quality) => (
                          <SelectItem
                            key={quality}
                            value={quality}
                            className="text-xs hover:bg-zinc-800/50 focus:bg-zinc-800 focus:text-white py-2.5 rounded-xl transition-all cursor-pointer mb-0.5 data-[state=checked]:bg-zinc-800/80"
                          >
                            <span className="font-bold capitalize">{quality}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Refine Toggle Pill - Only for images */}
                  {mediaType === 'image' && (
                    <button
                      onClick={() => setShouldRefinePrompt(!shouldRefinePrompt)}
                      disabled={isSubmitting}
                      className={`h-9 flex items-center gap-2 px-4 rounded-full text-xs font-medium transition-all ${shouldRefinePrompt
                        ? 'bg-[#F1E500]/10 text-[#F1E500]'
                        : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
                        }`}
                    >
                      <Wand2 className={`w-3.5 h-3.5 ${shouldRefinePrompt ? 'animate-pulse' : ''}`} />
                      <span>Refine</span>
                    </button>
                  )}
                </div>

                {/* Generate Button - 3D Style */}
                <Button
                  onClick={handleSubmit}
                  disabled={!prompt.trim() || isSubmitting || tierLoading}
                  className="h-11 bg-gradient-to-b from-[#f8f052] to-[#d4c800] hover:from-[#f9f262] hover:to-[#e0d400] text-black font-bold px-6 rounded-xl transition-all shadow-[0_4px_0_0_#8a8000] hover:shadow-[0_4px_0_0_#7a7000] active:shadow-[0_2px_0_0_#8a8000] active:translate-y-[2px] disabled:opacity-50 border-0"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Generating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold uppercase tracking-wide">Generate</span>
                      <Sparkles className="w-4 h-4" />
                      <span className="opacity-70 text-sm font-bold">{currentModelConfig?.credits || 5}</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Skeleton for loading state - used by dashboard skeleton
export const GenerateArtViewSkeleton = memo(() => (
  <div className="h-screen bg-black flex overflow-hidden">
    <div className="flex-1 relative overflow-hidden flex flex-col">
      {/* Credit Display placeholder */}
      <div className="fixed top-6 right-8 z-30">
        <div className="h-10 w-24 bg-zinc-900/50 rounded-lg animate-pulse" />
      </div>

      {/* Grid skeleton */}
      <div className="flex-1 overflow-y-auto pt-16 px-4 pb-32">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="aspect-square bg-black border border-white/5 relative">
              <Skeleton className="w-full h-full bg-zinc-900/50" />
              <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col gap-2">
                <Skeleton className="w-2/3 h-2 bg-zinc-800" />
                <Skeleton className="w-1/3 h-2 bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom input bar skeleton */}
      <div className="fixed bottom-0 left-0 right-0 md:left-20 z-30 p-4 bg-gradient-to-t from-black via-black/95 to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="h-20 bg-zinc-900/50 rounded-2xl animate-pulse border border-white/5" />
        </div>
      </div>
    </div>
  </div>
));
GenerateArtViewSkeleton.displayName = 'GenerateArtViewSkeleton';
