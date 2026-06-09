import mixpanel from 'mixpanel-browser';

class MixpanelService {
  private initialized = false;

  init() {
    if (this.initialized || typeof window === 'undefined') return;
    
    const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
    if (!token) {
      console.warn('Mixpanel token not found');
      return;
    }

    mixpanel.init(token, {
      debug: process.env.NODE_ENV === 'development',
      track_pageview: false,
      persistence: 'localStorage',
    });

    this.initialized = true;
  }

  identify(userId: string, properties?: Record<string, any>) {
    if (!this.initialized) return;
    
    mixpanel.identify(userId);
    if (properties) {
      mixpanel.people.set(properties);
    }
  }

  track(eventName: string, properties?: Record<string, any>) {
    if (!this.initialized) return;
    
    mixpanel.track(eventName, {
      ...properties,
      timestamp: new Date().toISOString(),
    });
  }

  setUserProperties(properties: Record<string, any>) {
    if (!this.initialized) return;
    
    mixpanel.people.set(properties);
  }

  reset() {
    if (!this.initialized) return;
    
    mixpanel.reset();
  }

  // Simplified tracking methods for your key events
  
  trackPricingView() {
    this.track('pricing_viewed');
  }

  trackPlanClick(planName: string, price: string) {
    this.track('plan_clicked', {
      plan_name: planName,
      price: price,
    });
  }

  trackCheckoutStarted(planName: string, packageId: string, price: string) {
    this.track('checkout_started', {
      plan_name: planName,
      package_id: packageId,
      price: price,
    });
  }

  trackPromptGenerated(operationType: 'create' | 'extract' | 'refine', hasReferenceImage?: boolean) {
    this.track('prompt_generated', {
      operation_type: operationType,
      has_reference_image: hasReferenceImage || false,
    });
  }

  trackPromptEdited() {
    this.track('prompt_edited');
  }

  trackPromptRefined(refinementType: string) {
    this.track('prompt_refined', {
      refinement_type: refinementType,
    });
  }

  trackImageGenerated(properties: {
    model: string;
    creditsUsed: number;
    width?: number;
    height?: number;
  }) {
    this.track('image_generated', properties);
  }

  trackImageDownloaded() {
    this.track('image_downloaded');
  }

  trackDiscoverViewed() {
    this.track('discover_viewed');
  }

  trackImageViewed(source: 'homepage' | 'discover' | 'dashboard' | 'collection') {
    this.track('image_viewed', {
      source: source,
    });
  }

  trackImageLiked(isLiked: boolean) {
    this.track('image_liked', {
      action: isLiked ? 'liked' : 'unliked',
    });
  }

  trackFilterUsed(filterType: string, value: string | string[]) {
    this.track('filter_used', {
      filter_type: filterType,
      filter_value: value,
    });
  }
}

export const analytics = new MixpanelService();