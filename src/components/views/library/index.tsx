'use client';

import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUserPreferences } from '@/hooks/use-cached-data';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import Masonry from 'react-masonry-css';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { LibraryImageCard, LibraryItem } from '@/components/images/library-image-card';
import { ImageConfigModal } from '@/components/images/image-config-modal';
import { SignInModal } from '@/components/auth/sign-in-modal';
import { PromptsTab } from './prompts-tab';
import { AllTab } from './all-tab';
import { CollectionsTab } from '@/components/collections/collections-tab';
import { cn } from '@/lib/utils';
import { orbitron } from '@/lib/fonts';

// --- Types ---
interface Job {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    original_prompt: string;
    refined_prompt: string | null;
    model: string;
    media_type?: 'image' | 'video';
    aspect_ratio: string;
    output_data: {
        images?: string[];
        video?: string;
    };
    created_at: string;
}

interface UserImage {
    id: string;
    title: string;
    description?: string;
    image_url: string;
    prompt: string;
    ai_model: string;
    likes_count: number;
    favorites_count: number;
    created_at: string;
}

// --- Sub-Components ---
const PageHeader = memo(() => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
            <h1 className={`text-3xl font-bold text-white ${orbitron.className}`}>Library</h1>
            <p className="text-gray-400 mt-1 text-sm">
                Your generated artworks and uploaded images
            </p>
        </div>
        <Button
            asChild
            className="h-11 bg-gradient-to-b from-[#f8f052] to-[#d4c800] hover:from-[#f9f262] hover:to-[#e0d400] text-black font-bold px-6 rounded-xl transition-all shadow-[0_4px_0_0_#8a8000] hover:shadow-[0_4px_0_0_#7a7000] active:shadow-[0_2px_0_0_#8a8000] active:translate-y-[2px] border-0"
        >
            <a href="/upload">
                <Plus className="h-4 w-4 mr-2" />
                Upload New
            </a>
        </Button>
    </div>
));
PageHeader.displayName = 'PageHeader';

const LibraryControls = memo(({
    totalCount,
    filter,
    onFilterChange,
    isRefreshing,
    onRefresh
}: {
    totalCount: number;
    filter: string;
    onFilterChange: (value: string) => void;
    isRefreshing: boolean;
    onRefresh: () => void;
}) => {
    const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, opacity: 0 });
    const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
    const TABS = useMemo(() => [
        { id: 'all', label: 'All' },
        { id: 'prompts', label: 'Prompts' },
        { id: 'collections', label: 'Collections' }
    ], []);

    useEffect(() => {
        const activeIndex = TABS.findIndex(t => t.id === filter);
        const activeTab = tabsRef.current[activeIndex];

        if (activeTab) {
            setPillStyle({
                left: activeTab.offsetLeft,
                width: activeTab.offsetWidth,
                opacity: 1
            });
        }
    }, [filter, TABS]);

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400 font-medium">
                    {totalCount} item{totalCount !== 1 ? 's' : ''}
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onRefresh}
                    className={cn("h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10 transition-colors", isRefreshing && "animate-spin")}
                    disabled={isRefreshing}
                >
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>

            <div className="relative flex items-center bg-zinc-900/50 p-1 rounded-lg border border-white/5 isolate">
                <div
                    className="absolute bg-zinc-800 rounded-md transition-all duration-300 ease-out h-[calc(100%-8px)] top-1"
                    style={{
                        left: pillStyle.left,
                        width: pillStyle.width,
                        opacity: pillStyle.opacity
                    }}
                />
                {TABS.map((tab, index) => (
                    <button
                        key={tab.id}
                        ref={el => { tabsRef.current[index] = el }}
                        onClick={() => onFilterChange(tab.id)}
                        className={cn(
                            "relative z-10 px-4 py-1.5 text-sm font-medium rounded-md transition-colors duration-200",
                            filter === tab.id
                                ? "text-white"
                                : "text-zinc-400 hover:text-zinc-200"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>
    );
});
LibraryControls.displayName = 'LibraryControls';

const LoadingSkeleton = memo(() => (
    <Masonry
        breakpointCols={{
            default: 5,
            1400: 4,
            1100: 3,
            768: 2,
            500: 2
        }}
        className="masonry-grid"
        columnClassName="masonry-column"
    >
        {Array.from({ length: 15 }).map((_, i) => (
            <div
                key={i}
                className="masonry-item bg-zinc-900/50 aspect-square animate-pulse mb-1 border border-white/5"
            />
        ))}
    </Masonry>
));
LoadingSkeleton.displayName = 'LoadingSkeleton';

// --- Main LibraryView Component ---
export function LibraryView() {
    const router = useRouter();
    const { supabaseUser } = useAuth();

    // State
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [refreshing, setRefreshing] = useState(false);
    const [sortBy, setSortBy] = useUserPreferences('library_sort', 'newest');

    // Tab counts
    const [tabCounts, setTabCounts] = useState<{ all: number; prompts: number; collections: number }>({
        all: 0,
        prompts: 0,
        collections: 0
    });

    const handleAllCountChange = useCallback((count: number) => {
        setTabCounts(prev => prev.all !== count ? { ...prev, all: count } : prev);
    }, []);

    const handlePromptsCountChange = useCallback((count: number) => {
        setTabCounts(prev => prev.prompts !== count ? { ...prev, prompts: count } : prev);
    }, []);

    const handleCollectionsCountChange = useCallback((count: number) => {
        setTabCounts(prev => prev.collections !== count ? { ...prev, collections: count } : prev);
    }, []);

    // Modals
    const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
    const [signInAction, setSignInAction] = useState<'view' | 'like' | 'save'>('view');
    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [selectedConfigItem, setSelectedConfigItem] = useState<{
        id: string;
        title: string;
        prompt: string;
        model: string;
    } | null>(null);

    const fetchData = useCallback(async (isRefresh = false) => {
        if (!supabaseUser?.id) return;

        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            const [jobsRes, imagesRes] = await Promise.all([
                fetch('/api/jobs/list?limit=100'),
                fetch('/api/user/images?page=1&limit=100&sortBy=recent')
            ]);

            let newItems: LibraryItem[] = [];

            if (jobsRes.ok) {
                const jobsData = await jobsRes.json();
                const mappedJobs: LibraryItem[] = (jobsData.jobs || [])
                    .filter((job: Job) => job.status === 'completed' && (job.output_data?.images?.length || job.output_data?.video))
                    .map((job: Job) => ({
                        id: job.id,
                        url: job.media_type === 'video' ? job.output_data.video! : job.output_data.images![0],
                        prompt: job.refined_prompt || job.original_prompt,
                        model: job.model,
                        aspectRatio: job.aspect_ratio,
                        mediaType: job.media_type || 'image',
                        createdAt: job.created_at,
                        status: job.status,
                        jobId: job.id,
                        isOwner: true,
                    }));
                newItems = [...newItems, ...mappedJobs];
            }

            if (imagesRes.ok) {
                const imagesData = await imagesRes.json();
                const mappedImages: LibraryItem[] = (imagesData.images || []).map((img: UserImage) => ({
                    id: img.id,
                    url: img.image_url,
                    prompt: img.prompt,
                    model: img.ai_model,
                    mediaType: 'image',
                    createdAt: img.created_at,
                    title: img.title,
                    description: img.description,
                    isOwner: true,
                    status: 'completed'
                }));
                newItems = [...newItems, ...mappedImages];
            }

            newItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setItems(newItems);

        } catch (error) {
            console.error("Failed to fetch library items", error);
            toast.error("Failed to load library");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [supabaseUser?.id]);

    useEffect(() => {
        if (supabaseUser?.id) {
            fetchData();
        }
    }, [supabaseUser?.id, fetchData]);

    const filteredItems = useMemo(() => {
        if (filter === 'all') return items;
        if (filter === 'collections') return items.filter(i => !i.jobId);
        return items;
    }, [items, filter]);

    useEffect(() => {
        const collectionsCount = items.filter(i => !i.jobId).length;
        setTabCounts(prev => ({ ...prev, collections: collectionsCount }));
    }, [items]);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this item?')) return;

        setItems(prev => prev.filter(item => item.id !== id));
        toast.success("Item deleted");

        const item = items.find(i => i.id === id);
        if (item?.jobId) {
            try { await fetch(`/api/jobs/${id}`, { method: 'DELETE' }); } catch (e) { }
        } else {
            try { await fetch(`/api/images/${id}`, { method: 'DELETE' }); } catch (e) { }
        }
    };

    const handleUnauthenticatedAction = (action: 'view' | 'like' | 'save', destinationUrl?: string) => {
        setSignInAction(action);
        setIsSignInModalOpen(true);
    };

    const handleOpenConfig = (item: LibraryItem) => {
        setSelectedConfigItem({
            id: item.id,
            title: item.title || '',
            prompt: item.prompt,
            model: item.model
        });
        setConfigModalOpen(true);
    };

    const handleUpdateConfig = (id: string, updates: { prompt: string; ai_model: string }) => {
        setItems(prev => prev.map(item =>
            item.id === id
                ? { ...item, prompt: updates.prompt, model: updates.ai_model }
                : item
        ));
    };

    return (
        <>
            <div className="pb-24 md:pb-8 p-4 md:p-8">
                <PageHeader />

                <LibraryControls
                    totalCount={tabCounts[filter as keyof typeof tabCounts] || 0}
                    filter={filter}
                    onFilterChange={setFilter}
                    isRefreshing={refreshing}
                    onRefresh={() => fetchData(true)}
                />

                {/* All tabs stay mounted */}
                <div style={{ display: filter === 'all' ? 'block' : 'none' }}>
                    <AllTab
                        onDelete={handleDelete}
                        onConfig={handleOpenConfig}
                        onUnauthenticatedAction={handleUnauthenticatedAction}
                        onCountChange={handleAllCountChange}
                    />
                </div>

                <div style={{ display: filter === 'prompts' ? 'block' : 'none' }}>
                    <PromptsTab onCountChange={handlePromptsCountChange} />
                </div>

                <div style={{ display: filter === 'collections' ? 'block' : 'none' }}>
                    <CollectionsTab onCountChange={handleCollectionsCountChange} />
                </div>
            </div>

            <SignInModal
                isOpen={isSignInModalOpen}
                onClose={() => setIsSignInModalOpen(false)}
                action={signInAction}
            />

            {selectedConfigItem && (
                <ImageConfigModal
                    isOpen={configModalOpen}
                    onClose={() => setConfigModalOpen(false)}
                    image={selectedConfigItem}
                    onUpdate={handleUpdateConfig}
                />
            )}
        </>
    );
}

// Loading skeleton for display while view is initializing
export const LibraryViewSkeleton = memo(() => (
    <div className="pb-24 md:pb-8 p-4 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
            <div>
                <h1 className={`text-3xl font-bold text-white ${orbitron.className}`}>Library</h1>
                <p className="text-gray-400 mt-1 text-sm">
                    Your generated artworks and uploaded images
                </p>
            </div>
            <Button
                className="h-11 bg-gradient-to-b from-[#f8f052] to-[#d4c800] text-black font-bold px-6 rounded-xl transition-all shadow-[0_4px_0_0_#8a8000] border-0 pointer-events-none opacity-70"
            >
                <Plus className="h-4 w-4 mr-2" />
                Upload New
            </Button>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400 font-medium">
                    <span className="inline-block w-8 h-4 bg-zinc-800 rounded animate-pulse" /> items
                </span>
            </div>
            <div className="h-10 w-64 bg-zinc-900/50 rounded-lg animate-pulse" />
        </div>
        <LoadingSkeleton />
    </div>
));
LibraryViewSkeleton.displayName = 'LibraryViewSkeleton';
