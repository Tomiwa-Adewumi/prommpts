'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { AI_MODELS, SUGGESTED_TAGS } from '@/lib/validation/upload-schema';

interface SearchFiltersProps {
  onFiltersChange: (filters: {
    search: string;
    sortBy: string;
    aiModel: string;
    tags: string[];
  }) => void;
  initialFilters?: {
    search: string;
    sortBy: string;
    aiModel: string;
    tags: string[];
  };
}

export function SearchFilters({ onFiltersChange, initialFilters }: SearchFiltersProps) {
  const [search, setSearch] = useState(initialFilters?.search || '');
  const [sortBy, setSortBy] = useState(initialFilters?.sortBy || 'trending');
  const [aiModel, setAiModel] = useState(initialFilters?.aiModel || 'all');
  const [selectedTags, setSelectedTags] = useState<string[]>(initialFilters?.tags || []);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onFiltersChange({
        search,
        sortBy,
        aiModel,
        tags: selectedTags
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [search, sortBy, aiModel, selectedTags, onFiltersChange]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearch('');
    setSortBy('trending');
    setAiModel('all');
    setSelectedTags([]);
  };

  const hasActiveFilters = (aiModel !== 'all') || selectedTags.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {/* Semantic Search Input */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 h-4 w-4" />
          <Input
            placeholder="Describe what you're looking for..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 border-gray-700 text-white placeholder-gray-400 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-500/30"
          />
        </div>

        {/* Sort Dropdown */}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-40 bg-gray-800 border-gray-700 text-white shrink-0">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="trending" className="text-white hover:bg-gray-700">Trending</SelectItem>
            <SelectItem value="recent" className="text-white hover:bg-gray-700">Most Recent</SelectItem>
            <SelectItem value="popular" className="text-white hover:bg-gray-700">Most Liked</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter Sheet */}
        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="relative border-gray-600 text-gray-800 hover:bg-gray-800 hover:text-white shrink-0">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <div className="ml-2 h-4 w-4 bg-blue-500 text-white text-xs flex items-center justify-center rounded-full font-medium">
                  {((aiModel !== 'all') ? 1 : 0) + selectedTags.length}
                </div>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>
                Refine your search with advanced filters
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* AI Model Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">AI Model</label>
                <Select value={aiModel} onValueChange={setAiModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="All models" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All models</SelectItem>
                    {AI_MODELS.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tags Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Tags</label>
                <div className="space-y-3">
                  {/* Selected Tags */}
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => handleTagToggle(tag)}
                        >
                          {tag}
                          <X className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Available Tags */}
                  <div className="grid grid-cols-2 gap-2">
                    {SUGGESTED_TAGS.filter(tag => !selectedTags.includes(tag)).map((tag) => (
                      <Button
                        key={tag}
                        variant="outline"
                        size="sm"
                        className="justify-start text-xs"
                        onClick={() => handleTagToggle(tag)}
                      >
                        {tag}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="w-full"
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Pro Tip for Better Search */}
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-900/20 border border-blue-500/30 rounded-lg text-sm">
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
        <span className="text-blue-300">
          💡 Try using descriptive phrases like "shopping cart" instead of single words for better results
        </span>
      </div>
    </div>
  );
}