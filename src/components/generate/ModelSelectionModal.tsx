'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Crown, Star, Zap, Sparkles, Lock } from 'lucide-react';
import { AVAILABLE_MODELS, UserTier, Model } from '@/lib/models/tier-validation';

interface ModelSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModel: (model: Model) => void;
  userTier: UserTier;
  currentModel?: string;
}

// Use the centralized model configuration

const tierConfig = {
  free: {
    icon: <Zap className="w-3 h-3" />,
    label: 'Free',
    color: 'bg-gray-600',
    borderColor: 'border-gray-600',
    textColor: 'text-gray-500'
  },
  starter: {
    icon: <Star className="w-3 h-3" />,
    label: 'Starter',
    color: 'bg-blue-600',
    borderColor: 'border-blue-600',
    textColor: 'text-blue-500'
  },
  creator: {
    icon: <Sparkles className="w-3 h-3" />,
    label: 'Creator',
    color: 'bg-purple-600',
    borderColor: 'border-purple-600',
    textColor: 'text-purple-500'
  },
  pro: {
    icon: <Crown className="w-3 h-3" />,
    label: 'Pro',
    color: 'bg-yellow-600',
    borderColor: 'border-yellow-600',
    textColor: 'text-yellow-500'
  }
};

const tierOrder: UserTier[] = ['free', 'starter', 'creator', 'pro'];

export function ModelSelectionModal({ 
  isOpen, 
  onClose, 
  onSelectModel, 
  userTier,
  currentModel 
}: ModelSelectionModalProps) {
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (currentModel) {
      const model = AVAILABLE_MODELS.find(m => m.id === currentModel);
      if (model) {
        setSelectedModel(model);
      }
    }
  }, [currentModel]);

  const userTierIndex = tierOrder.indexOf(userTier);
  const categories = ['all', ...Array.from(new Set(AVAILABLE_MODELS.map(m => m.category)))];

  const isModelAvailable = (model: Model) => {
    const modelTierIndex = tierOrder.indexOf(model.tier);
    return modelTierIndex <= userTierIndex;
  };

  const getFilteredModels = () => {
    let filtered = AVAILABLE_MODELS;
    if (selectedCategory !== 'all') {
      filtered = AVAILABLE_MODELS.filter(m => m.category === selectedCategory);
    }
    return filtered.sort((a, b) => {
      const aTierIndex = tierOrder.indexOf(a.tier);
      const bTierIndex = tierOrder.indexOf(b.tier);
      return aTierIndex - bTierIndex;
    });
  };

  const handleSelectModel = () => {
    if (selectedModel) {
      onSelectModel(selectedModel);
      onClose();
    }
  };

  const handleUpgrade = () => {
    // Navigate to pricing page
    window.location.href = '/pricing';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-5xl max-h-[85vh] flex flex-col border border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h2 className="text-2xl font-semibold text-white">Choose AI Model</h2>
            <p className="text-gray-400 mt-1">Select the AI model for your image generation</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* User Tier Display */}
        <div className="px-6 py-3 bg-gray-800/30 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-md ${tierConfig[userTier].color} bg-opacity-20 ${tierConfig[userTier].borderColor} border`}>
                {tierConfig[userTier].icon}
              </div>
              <div>
                <p className="text-white text-sm font-medium">Current Plan: {tierConfig[userTier].label}</p>
                <p className="text-gray-500 text-xs">
                  {userTier === 'free' && 'Access to basic models'}
                  {userTier === 'starter' && 'Access to starter and basic models'}
                  {userTier === 'creator' && 'Access to creator, starter, and basic models'}
                  {userTier === 'pro' && 'Access to all premium models'}
                </p>
              </div>
            </div>
            {userTier !== 'pro' && (
              <Button
                onClick={handleUpgrade}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white hover:bg-gray-800 border-0"
              >
                Upgrade Plan
              </Button>
            )}
          </div>
        </div>

        {/* Category Filter */}
        <div className="px-6 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === category
                    ? 'bg-gray-700 text-white'
                    : 'bg-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                }`}
              >
                {category === 'all' ? 'All Models' : category}
              </button>
            ))}
          </div>
        </div>

        {/* Models Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {getFilteredModels().map((model) => {
              const available = isModelAvailable(model);
              const isSelected = selectedModel?.id === model.id;
              
              return (
                <div
                  key={model.id}
                  className={`relative p-4 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-yellow-500/50 bg-gray-800/80'
                      : available
                      ? 'border-gray-700 hover:border-gray-600 bg-gray-800/40 cursor-pointer'
                      : 'border-gray-800 bg-gray-900/30'
                  }`}
                  onClick={() => available && !isSelected && setSelectedModel(model)}
                >
                  {!available && (
                    <div className="absolute top-3 right-3">
                      <Lock className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-medium text-sm ${available ? 'text-white' : 'text-gray-500'}`}>
                          {model.name}
                        </h3>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${tierConfig[model.tier].textColor} ${tierConfig[model.tier].borderColor} border bg-gray-800/50`}>
                          {tierConfig[model.tier].label}
                        </span>
                      </div>
                      <p className={`text-xs ${available ? 'text-gray-400' : 'text-gray-600'} line-clamp-2`}>
                        {model.description}
                      </p>
                      <p className={`text-xs mt-1 ${available ? 'text-gray-500' : 'text-gray-700'}`}>
                        {model.category}
                      </p>
                    </div>
                  </div>

                  {model.features && available && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {model.features.slice(0, 2).map((feature, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 bg-gray-700/50 text-gray-400 text-xs rounded"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {available ? (
                    isSelected ? (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectModel();
                        }}
                        size="sm"
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-black text-xs h-8"
                      >
                        <Sparkles className="w-3 h-3 mr-1.5" />
                        Generate with this model
                      </Button>
                    ) : (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedModel(model);
                        }}
                        size="sm"
                        variant="outline"
                        className="w-full border-gray-600 text-gray-400 hover:text-white hover:border-gray-500 text-xs h-8"
                      >
                        Select
                      </Button>
                    )
                  ) : (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpgrade();
                      }}
                      size="sm"
                      variant="ghost"
                      className="w-full text-gray-500 hover:text-gray-400 hover:bg-gray-800/50 text-xs h-8"
                      disabled
                    >
                      <Lock className="w-3 h-3 mr-1.5" />
                      Upgrade to unlock
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer - Simplified */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
          <div className="text-xs text-gray-500">
            {selectedModel ? (
              <span>Selected: <span className="text-gray-300">{selectedModel.name}</span></span>
            ) : (
              'Choose a model to generate your image'
            )}
          </div>
          
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white hover:bg-gray-800"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}