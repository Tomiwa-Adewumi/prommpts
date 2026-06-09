export interface User {
  id: string;
  clerkId: string;
  email: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  bio?: string;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Image {
  id: string;
  userId: string;
  title: string;
  description?: string;
  imageUrl: string;
  prompt: string;
  negativePrompt?: string;
  aiModel: string;
  modelVersion?: string;
  seed?: number;
  steps?: number;
  cfgScale?: number;
  width: number;
  height: number;
  fileSize: number;
  fileFormat: string;
  isPublic: boolean;
  isHidden: boolean;
  isFeatured: boolean;
  likesCount: number;
  favoritesCount: number;
  viewsCount: number;
  engagementScore: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  user: User;
}

export interface Course {
  id: string;
  adminId: string;
  title: string;
  description: string;
  courseImageUrl?: string;
  price: number;
  isAvailable: boolean;
  isFeatured: boolean;
  enrollmentCount: number;
  rating: number;
  ratingCount: number;
  durationHours?: number;
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  admin: User;
}

export interface Like {
  id: string;
  userId: string;
  imageId: string;
  createdAt: string;
}

export interface Favorite {
  id: string;
  userId: string;
  imageId: string;
  createdAt: string;
}

export interface ErrorLog {
  id: string;
  name: string;
  error_description: string;
  device_type: string;
  page_url: string;
  screen_width: number;
  screen_height: number;
  created_at: string;
}