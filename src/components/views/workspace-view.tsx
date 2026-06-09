'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AnimatedGradient } from '@/components/ui/animated-gradient';
import { toast } from 'sonner';
import {
  Loader2,
  Link as LinkIcon,
  Sparkles,
  Download,
  X,
  BarChart3,
  Instagram,
  Plus,
  Upload,
  Globe,
  Send,
} from 'lucide-react';

interface WorkspaceData {
  url: string;
  brandColors: string[];
  logos: string[];
  generatedImages: string[];
  isCreated: boolean;
}

interface WorkspaceViewProps {
  view?: string;
}

export function WorkspaceView({ view = 'create' }: WorkspaceViewProps) {
  const [workspace, setWorkspace] = useState<WorkspaceData>({
    url: '',
    brandColors: [],
    logos: [],
    generatedImages: [],
    isCreated: false,
  });
  const [prompt, setPrompt] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'create' | 'analytics'>(view as 'create' | 'analytics');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalUrl, setModalUrl] = useState('');
  const [extractionStep, setExtractionStep] = useState<'idle' | 'extracting' | 'colors' | 'logos' | 'done'>('idle');

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('workspace-data-v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setWorkspace(parsed);
      } catch (e) {
        console.error('Failed to parse workspace data:', e);
      }
    }
  }, []);

  // Save to localStorage whenever workspace changes
  useEffect(() => {
    localStorage.setItem('workspace-data-v2', JSON.stringify(workspace));
  }, [workspace]);

  // Handle creating workspace from modal
  const handleCreateWorkspace = async () => {
    if (!modalUrl.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    setShowCreateModal(false);
    setIsExtracting(true);
    setExtractionStep('extracting');

    try {
      // Step 1: Extracting assets
      await new Promise(resolve => setTimeout(resolve, 1500));
      setExtractionStep('colors');

      // Step 2: Show colors
      await new Promise(resolve => setTimeout(resolve, 1200));
      setExtractionStep('logos');

      // Step 3: Show logos
      await new Promise(resolve => setTimeout(resolve, 1000));
      setExtractionStep('done');

      // Final state
      setWorkspace({
        url: modalUrl,
        brandColors: ['#C41E3A', '#1E3A8A', '#FFFFFF'], // APEX colors: red, blue, white
        logos: ['/apex/referrences/apex logo.png', '/apex/referrences/unb logo.png'],
        generatedImages: [],
        isCreated: true,
      });

      toast.success('Workspace created!', {
        description: 'Brand assets extracted successfully',
      });
    } catch (error) {
      toast.error('Failed to create workspace');
    } finally {
      setIsExtracting(false);
      setExtractionStep('idle');
    }
  };

  // All known people with their variations and file mappings
  const peopleData: Record<string, { firstName: string; lastName: string; fullName: string; photoFile: string; generatedFile: string | null }> = {
    'amy': { firstName: 'Amy', lastName: 'Morin', fullName: 'Amy Morin', photoFile: 'amy morin.jpeg', generatedFile: 'Amy Morin - Apex.jpeg' },
    'morin': { firstName: 'Amy', lastName: 'Morin', fullName: 'Amy Morin', photoFile: 'amy morin.jpeg', generatedFile: 'Amy Morin - Apex.jpeg' },
    'amy morin': { firstName: 'Amy', lastName: 'Morin', fullName: 'Amy Morin', photoFile: 'amy morin.jpeg', generatedFile: 'Amy Morin - Apex.jpeg' },
    'cameron': { firstName: 'Cameron', lastName: 'Mcneil', fullName: 'Cameron Mcneil', photoFile: 'Cameron Mcneil.jpeg', generatedFile: null },
    'mcneil': { firstName: 'Cameron', lastName: 'Mcneil', fullName: 'Cameron Mcneil', photoFile: 'Cameron Mcneil.jpeg', generatedFile: null },
    'cameron mcneil': { firstName: 'Cameron', lastName: 'Mcneil', fullName: 'Cameron Mcneil', photoFile: 'Cameron Mcneil.jpeg', generatedFile: null },
    'christine': { firstName: 'Christine', lastName: 'Little', fullName: 'Christine Little', photoFile: 'christine little.jpeg', generatedFile: 'Christine Little -Apex.jpeg' },
    'little': { firstName: 'Christine', lastName: 'Little', fullName: 'Christine Little', photoFile: 'christine little.jpeg', generatedFile: 'Christine Little -Apex.jpeg' },
    'christine little': { firstName: 'Christine', lastName: 'Little', fullName: 'Christine Little', photoFile: 'christine little.jpeg', generatedFile: 'Christine Little -Apex.jpeg' },
    'christopher': { firstName: 'Christopher', lastName: 'Dedam', fullName: 'Christopher Dedam', photoFile: 'christopher dedam.jpeg', generatedFile: null },
    'dedam': { firstName: 'Christopher', lastName: 'Dedam', fullName: 'Christopher Dedam', photoFile: 'christopher dedam.jpeg', generatedFile: null },
    'christopher dedam': { firstName: 'Christopher', lastName: 'Dedam', fullName: 'Christopher Dedam', photoFile: 'christopher dedam.jpeg', generatedFile: null },
    'constantine': { firstName: 'Constantine', lastName: 'Passaris', fullName: 'Constantine Passaris', photoFile: 'constantine passaris.jpeg', generatedFile: 'Constantine Passaris - Apex.jpeg' },
    'passaris': { firstName: 'Constantine', lastName: 'Passaris', fullName: 'Constantine Passaris', photoFile: 'constantine passaris.jpeg', generatedFile: 'Constantine Passaris - Apex.jpeg' },
    'constantine passaris': { firstName: 'Constantine', lastName: 'Passaris', fullName: 'Constantine Passaris', photoFile: 'constantine passaris.jpeg', generatedFile: 'Constantine Passaris - Apex.jpeg' },
    'jason': { firstName: 'Jason', lastName: 'Cleaversmith', fullName: 'Jason Cleaversmith', photoFile: 'jason cleaversmith.jpeg', generatedFile: 'Jason Cleaversmith - Apex.jpeg' },
    'cleaversmith': { firstName: 'Jason', lastName: 'Cleaversmith', fullName: 'Jason Cleaversmith', photoFile: 'jason cleaversmith.jpeg', generatedFile: 'Jason Cleaversmith - Apex.jpeg' },
    'jason cleaversmith': { firstName: 'Jason', lastName: 'Cleaversmith', fullName: 'Jason Cleaversmith', photoFile: 'jason cleaversmith.jpeg', generatedFile: 'Jason Cleaversmith - Apex.jpeg' },
    'fitzpatrick': { firstName: 'Jason', lastName: 'Fitzpatrick', fullName: 'Jason Fitzpatrick', photoFile: 'jason fitzpatrick.jpeg', generatedFile: null },
    'jason fitzpatrick': { firstName: 'Jason', lastName: 'Fitzpatrick', fullName: 'Jason Fitzpatrick', photoFile: 'jason fitzpatrick.jpeg', generatedFile: null },
    'jeremy': { firstName: 'Jeremy', lastName: 'Heartz', fullName: 'Jeremy Heartz', photoFile: 'jeremy heartz.jpeg', generatedFile: 'Jeremy Heartz - Apex.jpeg' },
    'heartz': { firstName: 'Jeremy', lastName: 'Heartz', fullName: 'Jeremy Heartz', photoFile: 'jeremy heartz.jpeg', generatedFile: 'Jeremy Heartz - Apex.jpeg' },
    'jeremy heartz': { firstName: 'Jeremy', lastName: 'Heartz', fullName: 'Jeremy Heartz', photoFile: 'jeremy heartz.jpeg', generatedFile: 'Jeremy Heartz - Apex.jpeg' },
    'oriana': { firstName: 'Oriana', lastName: 'Cordido', fullName: 'Oriana Cordido', photoFile: 'oriana cordido.jpeg', generatedFile: null },
    'cordido': { firstName: 'Oriana', lastName: 'Cordido', fullName: 'Oriana Cordido', photoFile: 'oriana cordido.jpeg', generatedFile: null },
    'oriana cordido': { firstName: 'Oriana', lastName: 'Cordido', fullName: 'Oriana Cordido', photoFile: 'oriana cordido.jpeg', generatedFile: null },
    'reefah': { firstName: 'Reefah', lastName: 'Shehnaz', fullName: 'Reefah Shehnaz', photoFile: 'reefah shehnaz.jpeg', generatedFile: null },
    'shehnaz': { firstName: 'Reefah', lastName: 'Shehnaz', fullName: 'Reefah Shehnaz', photoFile: 'reefah shehnaz.jpeg', generatedFile: null },
    'reefah shehnaz': { firstName: 'Reefah', lastName: 'Shehnaz', fullName: 'Reefah Shehnaz', photoFile: 'reefah shehnaz.jpeg', generatedFile: null },
    'sherisse': { firstName: 'Sherisse', lastName: 'Collins', fullName: 'Sherisse Collins', photoFile: 'Sherisse Collins.jpeg', generatedFile: null },
    'collins': { firstName: 'Sherisse', lastName: 'Collins', fullName: 'Sherisse Collins', photoFile: 'Sherisse Collins.jpeg', generatedFile: null },
    'sherisse collins': { firstName: 'Sherisse', lastName: 'Collins', fullName: 'Sherisse Collins', photoFile: 'Sherisse Collins.jpeg', generatedFile: null },
    'tara': { firstName: 'Tara', lastName: 'Leavitt', fullName: 'Tara Leavitt', photoFile: 'tara leavitt.jpeg', generatedFile: 'Tara Leavitt - Apex.jpeg' },
    'leavitt': { firstName: 'Tara', lastName: 'Leavitt', fullName: 'Tara Leavitt', photoFile: 'tara leavitt.jpeg', generatedFile: 'Tara Leavitt - Apex.jpeg' },
    'tara leavitt': { firstName: 'Tara', lastName: 'Leavitt', fullName: 'Tara Leavitt', photoFile: 'tara leavitt.jpeg', generatedFile: 'Tara Leavitt - Apex.jpeg' },
  };

  // Find person in prompt
  const findPersonInPrompt = (promptText: string): typeof peopleData[string] | null => {
    const lowerPrompt = promptText.toLowerCase();
    
    // First try to find full names (more specific)
    for (const [key, data] of Object.entries(peopleData)) {
      if (key.includes(' ') && lowerPrompt.includes(key)) {
        return data;
      }
    }
    
    // Then try single names
    for (const [key, data] of Object.entries(peopleData)) {
      if (!key.includes(' ') && lowerPrompt.includes(key)) {
        return data;
      }
    }
    
    return null;
  };

  // Check if prompt mentions pitch competition/poster/apex
  const isPitchCompetitionRequest = (promptText: string): boolean => {
    const lowerPrompt = promptText.toLowerCase();
    return lowerPrompt.includes('pitch competition') || 
           lowerPrompt.includes('pitch comp') || 
           lowerPrompt.includes('poster') ||
           lowerPrompt.includes('apex');
  };

  // Helper function to upload a public image to storage
  const uploadPublicImageToStorage = async (publicPath: string): Promise<string> => {
    const response = await fetch(publicPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${publicPath}`);
    }

    const blob = await response.blob();
    const filename = publicPath.split('/').pop() || 'image.jpg';
    const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', 'reference-images');

    const uploadResponse = await fetch('/api/upload-reference', {
      method: 'POST',
      body: formData,
    });

    const uploadData = await uploadResponse.json();

    if (!uploadResponse.ok) {
      throw new Error(uploadData.error || 'Failed to upload image');
    }

    return uploadData.url;
  };

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    // Find person in prompt
    const person = findPersonInPrompt(prompt);
    if (!person) {
      toast.error('I couldn\'t find that person. Try mentioning someone from your organization.');
      return;
    }

    setIsGenerating(true);

    try {
      if (isPitchCompetitionRequest(prompt) && person.generatedFile) {
        // Use pre-generated image with 5 second delay
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const imageUrl = `/generated/${person.generatedFile}`;
        
        setWorkspace(prev => ({
          ...prev,
          generatedImages: [imageUrl, ...prev.generatedImages],
        }));

        toast.success('Content generated!');
      } else {
        // Generate with AI
        await generateWithAI(person, prompt);
      }
    } catch (error) {
      console.error('Generate error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate');
    } finally {
      setIsGenerating(false);
      setPrompt('');
    }
  }, [prompt]);

  const generateWithAI = async (person: typeof peopleData[string], userPrompt: string) => {
    try {
      const personImagePath = `/apex/Judges/${person.photoFile}`;
      const referenceImages = [
        '/apex/referrences/apex branding.jpg',
        '/apex/referrences/apex logo.png',
        '/apex/referrences/unb logo.png',
      ];

      const allPublicPaths = [personImagePath, ...referenceImages];
      const uploadedUrls = await Promise.all(
        allPublicPaths.map(path => uploadPublicImageToStorage(path))
      );

      const backendPrompt = `${userPrompt}

The person in this image is ${person.fullName}. CRITICAL: The person's photo must be preserved exactly as provided with absolutely no modifications, alterations, or artistic changes to their face or appearance. Use the photo as-is. Do not add any placeholder text or lorem ipsum.`;

      const response = await fetch('/api/jobs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: backendPrompt,
          shouldRefinePrompt: false,
          model: 'nano-banana-pro',
          mediaType: 'image',
          aspectRatio: '2:3',
          quality: '2K',
          referenceImageUrls: uploadedUrls,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || 'Failed to create job');

      const jobId = data.jobId;
      if (!jobId) throw new Error('No job ID returned');

      // Poll for completion
      const maxAttempts = 60;
      let attempts = 0;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const jobResponse = await fetch(`/api/jobs/list?limit=1&_t=${Date.now()}`, { cache: 'no-store' });
        const jobData = await jobResponse.json();

        if (!jobData.success) throw new Error('Failed to check job status');

        const job = jobData.jobs?.find((j: any) => j.id === jobId);
        if (!job) { attempts++; continue; }

        if (job.status === 'completed') {
          const imageUrl = job.output_data?.images?.[0];
          if (!imageUrl) throw new Error('No image in completed job');
          
          setWorkspace(prev => ({
            ...prev,
            generatedImages: [imageUrl, ...prev.generatedImages],
          }));
          
          toast.success('Content generated!');
          return;
        }

        if (job.status === 'failed') throw new Error(job.error_message || 'Job failed');
        attempts++;
      }

      throw new Error('Generation timed out');
    } catch (error) {
      throw error;
    }
  };

  const downloadImage = async (url: string) => {
    try {
      toast.loading('Downloading...');
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `workspace-content-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      toast.dismiss();
      toast.success('Download started!');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to download');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  // Analytics view
  if (currentView === 'analytics') {
    return (
      <div className="h-screen bg-black text-white flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Analytics</h1>
              <p className="text-sm text-zinc-400 mt-1">Track your workspace performance</p>
            </div>
            <Button
              onClick={() => setCurrentView('create')}
              variant="outline"
              className="bg-zinc-900 border-white/10 text-white hover:bg-zinc-800"
            >
              Back to Workspace
            </Button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-6 max-w-md">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Instagram className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">Connect to Instagram</h2>
              <p className="text-zinc-400 text-sm">
                Connect your Instagram account to track engagement and analytics
              </p>
            </div>
            <Button
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8"
              onClick={() => toast.info('Instagram integration coming soon!')}
            >
              <Instagram className="w-4 h-4 mr-2" />
              Connect to Instagram
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state - no workspace created yet
  if (!workspace.isCreated && !isExtracting) {
    return (
      <div className="h-screen bg-black text-white flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Workspace</h1>
              <p className="text-sm text-zinc-400 mt-1">AI-powered brand content generation</p>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-6 max-w-md">
            <div className="w-24 h-24 mx-auto bg-zinc-900 rounded-2xl border border-white/10 flex items-center justify-center">
              <Sparkles className="w-12 h-12 text-zinc-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Workspace Empty</h2>
              <p className="text-zinc-400">
                Create a workspace to start generating brand-aware content with AI
              </p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#F1E500] hover:bg-[#d4c800] text-black font-bold px-8 py-6 text-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Workspace
            </Button>
          </div>
        </div>

        {/* Create Workspace Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Create Workspace</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-zinc-400 text-sm">
                Connect your brand to start generating on-brand content
              </p>

              {/* Website URL Option */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-xl border border-white/10">
                  <div className="w-10 h-10 bg-[#F1E500]/10 rounded-lg flex items-center justify-center">
                    <Globe className="w-5 h-5 text-[#F1E500]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">Website URL</h3>
                    <p className="text-xs text-zinc-500">We'll extract your brand assets automatically</p>
                  </div>
                </div>
                
                <Input
                  type="url"
                  placeholder="https://your-website.com"
                  value={modalUrl}
                  onChange={(e) => setModalUrl(e.target.value)}
                  className="bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-500"
                />
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-zinc-500 uppercase">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Upload Option */}
              <div className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-xl border border-white/10 border-dashed cursor-pointer hover:border-white/20 transition-colors"
                   onClick={() => toast.info('Upload feature coming soon!')}>
                <div className="w-10 h-10 bg-zinc-700 rounded-lg flex items-center justify-center">
                  <Upload className="w-5 h-5 text-zinc-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-zinc-400">Upload Assets</h3>
                  <p className="text-xs text-zinc-500">Upload logos, colors, and brand guidelines</p>
                </div>
              </div>

              <Button
                onClick={handleCreateWorkspace}
                disabled={!modalUrl.trim()}
                className="w-full bg-[#F1E500] hover:bg-[#d4c800] text-black font-bold"
              >
                Create Workspace
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Extraction loading state
  if (isExtracting) {
    return (
      <div className="h-screen bg-black text-white flex flex-col items-center justify-center">
        <div className="text-center space-y-8 max-w-md">
          <div className="relative w-24 h-24 mx-auto">
            <AnimatedGradient />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-[#F1E500] animate-spin" />
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-xl font-bold">
              {extractionStep === 'extracting' && 'Extracting brand assets...'}
              {extractionStep === 'colors' && 'Analyzing brand colors...'}
              {extractionStep === 'logos' && 'Detecting logos...'}
              {extractionStep === 'done' && 'Setting up workspace...'}
            </h2>
            <p className="text-zinc-400 text-sm">{modalUrl}</p>
          </div>

          {/* Progress indicators */}
          <div className="flex items-center justify-center gap-2">
            <div className={`w-2 h-2 rounded-full transition-colors ${extractionStep !== 'idle' ? 'bg-[#F1E500]' : 'bg-zinc-700'}`} />
            <div className={`w-2 h-2 rounded-full transition-colors ${['colors', 'logos', 'done'].includes(extractionStep) ? 'bg-[#F1E500]' : 'bg-zinc-700'}`} />
            <div className={`w-2 h-2 rounded-full transition-colors ${['logos', 'done'].includes(extractionStep) ? 'bg-[#F1E500]' : 'bg-zinc-700'}`} />
            <div className={`w-2 h-2 rounded-full transition-colors ${extractionStep === 'done' ? 'bg-[#F1E500]' : 'bg-zinc-700'}`} />
          </div>
        </div>
      </div>
    );
  }

  // Main workspace view
  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Header with brand assets */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Workspace</h1>
            <p className="text-sm text-zinc-400 mt-1">{workspace.url}</p>
          </div>
          <Button
            onClick={() => setCurrentView('analytics')}
            variant="outline"
            className="bg-zinc-900 border-white/10 text-white hover:bg-zinc-800"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
        </div>

        {/* Brand assets bar */}
        <div className="flex items-center gap-6">
          {/* Colors */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Colors</span>
            <div className="flex gap-1">
              {workspace.brandColors.map((color, index) => (
                <div
                  key={index}
                  className="w-6 h-6 rounded-md border border-white/20"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-white/10" />

          {/* Logos */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Assets</span>
            <div className="flex gap-2">
              {workspace.logos.map((logo, index) => (
                <div
                  key={index}
                  className="w-8 h-8 rounded-lg bg-white/10 p-1 flex items-center justify-center"
                >
                  <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main content area - Generated images */}
      <div className="flex-1 overflow-y-auto p-6 pb-32">
        {workspace.generatedImages.length === 0 && !isGenerating ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              <Sparkles className="w-12 h-12 text-zinc-700 mx-auto" />
              <p className="text-zinc-500">
                Start a conversation below to generate brand content
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Loading card */}
            {isGenerating && (
              <div className="relative aspect-[2/3] bg-black rounded-xl overflow-hidden border border-white/10">
                <AnimatedGradient />
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
                  <div className="flex flex-col items-center animate-pulse">
                    <Loader2 className="w-8 h-8 text-[#F1E500] animate-spin" />
                    <span className="text-[10px] mt-3 uppercase tracking-[0.2em] text-[#F1E500] font-bold">
                      Generating...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {workspace.generatedImages.map((imageUrl, index) => (
              <div
                key={index}
                className="group relative aspect-[2/3] bg-zinc-800 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-[#F1E500] transition-all"
                onClick={() => setSelectedImage(imageUrl)}
              >
                <img
                  src={imageUrl}
                  alt={`Generated content ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadImage(imageUrl);
                    }}
                    size="sm"
                    className="bg-white/20 backdrop-blur-sm hover:bg-white/30"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating chat input */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-40">
        <div className="bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-3">
          <div className="flex items-center gap-3">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="What would you like to create?"
              className="flex-1 min-h-[44px] max-h-[120px] bg-transparent border-none text-white placeholder:text-zinc-500 focus-visible:ring-0 resize-none"
              disabled={isGenerating}
            />
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="h-11 w-11 p-0 bg-[#F1E500] hover:bg-[#d4c800] text-black rounded-xl"
            >
              {isGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <button
            className="absolute top-4 right-16 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              downloadImage(selectedImage);
            }}
          >
            <Download className="w-6 h-6 text-white" />
          </button>

          <div className="relative max-w-3xl max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedImage}
              alt="Generated content"
              className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
