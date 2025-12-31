import { NextRequest, NextResponse } from 'next/server';
import { Graph } from 'near-social-js';

export async function GET(request: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  try {
    // FIX: Await params as per Next.js 15 requirement
    const { accountId } = await params;
    
    console.log('[API /api/profiles] Fetching profile for:', accountId);

    try {
      // Use Graph to query the social data
      const graph = new Graph();
      console.log('[API /api/profiles] Graph instance created');
      
      // Use index API to find profile data
      const profiles = await (graph as any).index({
        action: 'profile',
        key: 'profile',
        limit: 1000,
      });

      console.log('[API /api/profiles] Profile index returned:', Array.isArray(profiles) ? profiles.length : typeof profiles);

      if (Array.isArray(profiles)) {
        // Find the profile for this account
        const profileData = profiles.find((p: any) => p.accountId === accountId);
        if (profileData) {
          console.log('[API /api/profiles] Found profile:', profileData);
          return NextResponse.json(profileData.value?.profile || null);
        }
      } else if (typeof profiles === 'object' && profiles !== null) {
        // If it's an object, try to extract the profile
        for (const [key, value] of Object.entries(profiles)) {
          const profileObj = value as any;
          if (profileObj?.accountId === accountId && profileObj?.value?.profile) {
            console.log('[API /api/profiles] Found profile from object');
            return NextResponse.json(profileObj.value.profile);
          }
        }
      }

      console.log('[API /api/profiles] No profile found for:', accountId);
      return NextResponse.json(null);
    } catch (err: any) {
      console.warn('[API /api/profiles] Graph API method failed:', err?.message);
      console.log('[API /api/profiles] Returning null for:', accountId);
      return NextResponse.json(null);
    }
  } catch (error: any) {
    console.error('[API /api/profiles] Unexpected error:', error?.message || error);
    return NextResponse.json(null);
  }
}
