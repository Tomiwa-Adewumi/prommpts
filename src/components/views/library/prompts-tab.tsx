'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Copy, Trash2, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Masonry from 'react-masonry-css';
import { useLibraryCache } from '@/hooks/use-library-cache';

interface UserPrompt {
  id: string;
  user_id: string;
  prompt_text: string;
  created_at: string;
  updated_at: string;
}

interface PromptCardProps {
  prompt: UserPrompt;
  onCopy: (text: string) => void;
  onRun: (text: string) => void;
  onDelete: (id: string) => void;
  index: number;
}

function PromptCard({ prompt, onCopy, onRun, onDelete, index }: PromptCardProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;

    const div = divRef.current;
    const rect = div.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    div.style.setProperty('--x', `${x}px`);
    div.style.setProperty('--y', `${y}px`);
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group relative mb-4 break-inside-avoid rounded-xl bg-zinc-900"
      style={{
        animation: `fadeIn 0.5s ease-out ${index * 0.1}s backwards`
      }}
    >
      {/* Animated Gradient Border Layer */}
      <div
        className="absolute -inset-[1px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at var(--x) var(--y), #F1E500, transparent 40%)`,
          opacity: opacity,
          zIndex: 0
        }}
      />

      {/* Static Border (base state) */}
      <div className="absolute inset-0 rounded-xl border border-white/10" />

      {/* Content Container (Inner Card) */}
      <div className="relative z-10 rounded-xl bg-zinc-900/90 backdrop-blur-sm p-5 h-full">
        {/* Prompt Text */}
        <p className="text-gray-300 text-sm leading-relaxed font-mono mb-6 line-clamp-[10]">
          {prompt.prompt_text}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <span className="text-xs text-zinc-600 font-medium">
            {new Date(prompt.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            })}
          </span>

          <div className="flex items-center gap-1">
            {/* Run Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
              onClick={() => onRun(prompt.prompt_text)}
              title="Run with this prompt"
            >
              <Zap className="h-4 w-4 fill-current" />
            </Button>

            {/* Copy Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
              onClick={() => onCopy(prompt.prompt_text)}
              title="Copy prompt"
            >
              <Copy className="h-4 w-4" />
            </Button>

            {/* Delete Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              onClick={() => onDelete(prompt.id)}
              title="Delete prompt"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PromptsTab({ onCountChange }: { onCountChange?: (count: number) => void }) {
  const router = useRouter();

  const { data: prompts, loading, refresh } = useLibraryCache<UserPrompt[]>({
    key: 'library_prompts',
    fetchFn: async () => {
      const response = await fetch('/api/prompts?limit=100');
      if (!response.ok) {
        throw new Error('Failed to fetch prompts');
      }
      const data = await response.json();
      return data.prompts || [];
    },
    staleWhileRevalidate: true
  });

  // Report count to parent for tab count display
  useEffect(() => {
    onCountChange?.(prompts?.length || 0);
  }, [prompts, onCountChange]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Prompt copied to clipboard!');
  };

  const handleRun = (text: string) => {
    // Store prompt in localStorage to avoid URL length limits
    localStorage.setItem('pending_prompt', text);
    router.push('/dashboard?view=generate');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;

    try {
      const response = await fetch(`/api/prompts/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete prompt');
      }

      toast.success('Prompt deleted');
      // Refresh cache after deletion
      await refresh();
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast.error('Failed to delete prompt');
    }
  };

  const breakpointColumnsObj = {
    default: 3,
    1100: 2,
    700: 1
  };

  if (loading) {
    return (
      <Masonry
        breakpointCols={breakpointColumnsObj}
        className="flex w-auto -ml-4"
        columnClassName="pl-4 bg-clip-padding"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="mb-4 bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-xl p-6 h-48 animate-pulse"
          />
        ))}
      </Masonry>
    );
  }

  if (!prompts || prompts.length === 0) {
    if (loading) {
      return null; // Loading skeleton is already shown above
    }
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Clock className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg">No prompts saved yet</p>
        <p className="text-sm text-zinc-600 mt-2">Your saved prompts will appear here</p>
      </div>
    );
  }

  return (
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className="flex w-auto -ml-4"
      columnClassName="pl-4 bg-clip-padding"
    >
      {prompts.map((prompt, index) => (
        <PromptCard
          key={prompt.id}
          prompt={prompt}
          index={index}
          onCopy={handleCopy}
          onRun={handleRun}
          onDelete={handleDelete}
        />
      ))}
    </Masonry>
  );
}
