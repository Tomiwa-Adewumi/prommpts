'use client';

import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Masonry from 'react-masonry-css';
import { Button } from '@/components/ui/button';
import { useLibraryCache } from '@/hooks/use-library-cache';
import { LibraryImageCard, LibraryItem } from '@/components/images/library-image-card';
import { setGalleryContext } from '@/lib/gallery-context';

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

interface AllTabData {
  jobs: Job[];
  images: UserImage[];
}

interface AllTabProps {
  onDelete: (id: string) => void;
  onConfig: (item: LibraryItem) => void;
  onUnauthenticatedAction: (action: 'view' | 'like' | 'save', destinationUrl?: string) => void;
  onCountChange?: (count: number) => void;
}

const LoadingSkeleton = () => (
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
);

export function AllTab({ onDelete, onConfig, onUnauthenticatedAction, onCountChange }: AllTabProps) {
  const router = useRouter();

  const { data, loading, refresh } = useLibraryCache<AllTabData>({
    key: 'library_all_items',
    fetchFn: async () => {
      const [jobsRes, imagesRes] = await Promise.all([
        fetch('/api/jobs/list?limit=100'),
        fetch('/api/user/images?page=1&limit=100&sortBy=recent')
      ]);

      const jobsData = jobsRes.ok ? await jobsRes.json() : { jobs: [] };
      const imagesData = imagesRes.ok ? await imagesRes.json() : { images: [] };

      return {
        jobs: jobsData.jobs || [],
        images: imagesData.images || []
      };
    },
    staleWhileRevalidate: true
  });

  // Transform and merge items
  const items = useMemo(() => {
    if (!data) return [];

    const mappedJobs: LibraryItem[] = (data.jobs || [])
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

    const mappedImages: LibraryItem[] = (data.images || []).map((img: UserImage) => ({
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

    const allItems = [...mappedJobs, ...mappedImages];
    allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return allItems;
  }, [data]);

  // Set gallery context whenever items change - enables instant navigation in detail page
  // Also report count to parent for tab count display
  useEffect(() => {
    if (items.length > 0) {
      setGalleryContext(items, 'all');
    }
    onCountChange?.(items.length);
  }, [items, onCountChange]);

  const handleDelete = async (id: string) => {
    onDelete(id);
    // Refresh cache after deletion
    await refresh();
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <p>No items found in your library.</p>
        <Button variant="link" onClick={() => router.push('/dashboard?view=generate')}>
          Create something new
        </Button>
      </div>
    );
  }

  return (
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
      {items.map(item => (
        <div key={item.id} className="masonry-item mb-1">
          <LibraryImageCard
            item={item}
            onDelete={handleDelete}
            onConfig={!item.jobId ? onConfig : undefined}
            onUnauthenticatedAction={onUnauthenticatedAction}
            filter="all"
          />
        </div>
      ))}
    </Masonry>
  );
}
