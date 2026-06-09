import { NextResponse } from 'next/server'

interface RateLimitEntry {
    count: number
    resetTime: number
}

class RateLimiter {
    private store: Map<string, RateLimitEntry> = new Map()
    private cleanupInterval: NodeJS.Timeout | null = null

    constructor() {
        // Clean up expired entries every minute
        this.cleanupInterval = setInterval(() => {
            this.cleanup()
        }, 60000)
    }

    private cleanup() {
        const now = Date.now()
        for (const [key, entry] of this.store.entries()) {
            if (entry.resetTime <= now) {
                this.store.delete(key)
            }
        }
    }

    check(identifier: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetTime: number } {
        const now = Date.now()
        const entry = this.store.get(identifier)

        if (!entry || entry.resetTime <= now) {
            // Create new entry
            this.store.set(identifier, {
                count: 1,
                resetTime: now + windowMs
            })
            return { allowed: true, remaining: limit - 1, resetTime: now + windowMs }
        }

        // Check if within limit
        if (entry.count < limit) {
            entry.count++
            return { allowed: true, remaining: limit - entry.count, resetTime: entry.resetTime }
        }

        return { allowed: false, remaining: 0, resetTime: entry.resetTime }
    }

    reset(identifier: string) {
        this.store.delete(identifier)
    }

    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval)
            this.cleanupInterval = null
        }
        this.store.clear()
    }
}

// Create singleton instances for different rate limit types
const rateLimiters = {
    gemini: new RateLimiter(),
    prompt: new RateLimiter(),
    media: new RateLimiter()
}

interface RateLimitConfig {
    type: 'gemini' | 'prompt' | 'media'
    identifier: string
    limit: number
    windowMs: number
}

export function checkRateLimit(config: RateLimitConfig): { allowed: boolean; remaining: number; resetTime: number } {
    const limiter = rateLimiters[config.type]
    return limiter.check(config.identifier, config.limit, config.windowMs)
}

export function resetRateLimit(type: 'gemini' | 'prompt' | 'media', identifier: string) {
    const limiter = rateLimiters[type]
    limiter.reset(identifier)
}

export function createRateLimitResponse(message?: string): NextResponse {
    return NextResponse.json(
        {
            success: false,
            error: message || 'Too many requests. Please try again later.',
            rateLimitExceeded: true
        },
        {
            status: 429,
            headers: {
                'Retry-After': '60'
            }
        }
    )
}

// Helper function to get rate limit headers
export function getRateLimitHeaders(remaining: number, resetTime: number, limit: number): Record<string, string> {
    return {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': Math.floor(resetTime / 1000).toString()
    }
}

// Rate limit configurations for different tiers
export const RATE_LIMITS = {
    gemini: {
        free: { limit: 10, windowMs: 60 * 60 * 1000 }, // 5 per hour
        starter: { limit: 20, windowMs: 60 * 60 * 1000 }, // 20 per hour
        creator: { limit: 50, windowMs: 60 * 60 * 1000 }, // 50 per hour
        pro: { limit: 100, windowMs: 60 * 60 * 1000 } // 100 per hour
    },
    prompt: {
        free: { limit: 20, windowMs: 60 * 60 * 1000 }, // 10 per hour
        starter: { limit: 30, windowMs: 60 * 60 * 1000 }, // 30 per hour
        creator: { limit: 100, windowMs: 60 * 60 * 1000 }, // 100 per hour
        pro: { limit: 500, windowMs: 60 * 60 * 1000 } // 500 per hour
    },
    media: {
        free: { limit: 10, windowMs: 60 * 60 * 1000 }, // 5 per hour
        starter: { limit: 15, windowMs: 60 * 60 * 1000 }, // 15 per hour
        creator: { limit: 50, windowMs: 60 * 60 * 1000 }, // 50 per hour
        pro: { limit: 200, windowMs: 60 * 60 * 1000 } // 200 per hour
    }
}

// Get user tier from subscription
export function getUserTierFromSubscription(subscriptionPackageName?: string): 'free' | 'starter' | 'creator' | 'pro' {
    if (!subscriptionPackageName) return 'free'
    
    const tierMap: Record<string, 'free' | 'starter' | 'creator' | 'pro'> = {
        'Starter': 'starter',
        'Creator': 'creator',
        'Pro': 'pro'
    }
    
    return tierMap[subscriptionPackageName] || 'free'
}