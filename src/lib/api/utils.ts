import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/database/supabase';
import { getCurrentUser } from '@/lib/auth/user-sync';
import { z } from 'zod';


export async function requireUser() {
    const clerkUser = await currentUser();
    if (!clerkUser?.id) {
        throw { status: 401, message: 'Authentication required. Please sign in.' };
    }

    const user = await getCurrentUser(clerkUser.id);
    if (!user) {
        throw { status: 404, message: 'User not found. Please try signing in again.' };
    }

    return user;
}


export function getPromptsQuery() {
    return supabaseAdmin.from('prompts');
}


type ApiContext = { params: Promise<Record<string, string | string[]>> };
type ApiHandler = (req: NextRequest, ctx: ApiContext) => Promise<NextResponse>;

export function withErrorHandling(handler: ApiHandler): ApiHandler {
    return async (req: NextRequest, ctx: ApiContext) => {
        try {
            return await handler(req, ctx);
        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            const status = (err as any)?.status || 500;
            return NextResponse.json(
                { error: error.message || 'Internal server error' },
                { status }
            );
        }
    };
}

export const promptSchemas = {
    create: z.object({
        prompt: z.string().min(1, 'Prompt is required'),
    }),

    update: z.object({
        prompt_text: z.string().min(1, 'Prompt text is required'),
    }),
};


export async function validateBody<T>(request: NextRequest, schema: z.ZodSchema<T>): Promise<T> {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
        throw {
            status: 400,
            message: 'Invalid data',
            details: result.error.message
        };
    }

    return result.data;
}
