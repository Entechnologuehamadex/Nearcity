import { NextRequest, NextResponse } from 'next/server';
import { Graph } from 'near-social-js';

/**
 * Fetch recent posts from NEAR Social using Graph API  
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    console.log('[API /api/posts] Fetching posts with limit:', limit, 'offset:', offset);

    try {
      // Use default Graph API from near-social-js
      // It uses the official NEAR Social indexer
      const graph = new Graph();
      console.log('[API /api/posts] Graph instance created with defaults');

      // Query for recent posts
      console.log('[API /api/posts] Querying for posts');
      
      const posts = await graph.index({
        action: 'post',
        key: 'main',
        order: 'desc',
        limit: limit + offset,
      });

      console.log('[API /api/posts] Graph returned:', Array.isArray(posts) ? posts.length : typeof posts);

      if (!Array.isArray(posts)) {
        console.log('[API /api/posts] Posts is not array, type:', typeof posts, 'value:', posts);
        // If it's an object, try to extract posts
        if (typeof posts === 'object' && posts !== null) {
          const postsArray = Object.values(posts).filter(p => p && typeof p === 'object') as any[];
          if (postsArray.length > 0) {
            console.log('[API /api/posts] Extracted from object:', postsArray.length, 'posts');
            const sliced = postsArray.slice(offset, offset + limit);
            return NextResponse.json({ posts: sliced, next: undefined });
          }
        }
        return NextResponse.json({ posts: [], next: undefined });
      }

      console.log('[API /api/posts] Total posts from Graph:', posts.length);

      // Apply offset and limit
      const slicedPosts = posts.slice(offset, offset + limit);
      console.log('[API /api/posts] After offset/limit:', slicedPosts.length);

      // Format posts 
      const formattedPosts = slicedPosts.map((post: any) => {
        const accountId = post.accountId || post.account_id || '';
        
        return {
          accountId,
          blockHeight: post.blockHeight || 0,
          value: {
            type: post.value?.type || 'post',
            path: post.value?.path || 'main',
            blockHeight: post.blockHeight || post.value?.blockHeight || 0,
            timestamp: post.value?.timestamp || Date.now(),
            accountId,
            main: post.value?.main || post.main || '',
          },
        };
      });

      const next = offset + limit < posts.length ? offset + limit : undefined;

      console.log('[API /api/posts] Returning:', formattedPosts.length, 'formatted posts');
      return NextResponse.json({ posts: formattedPosts, next });
    } catch (graphError: any) {
      console.error('[API /api/posts] Graph error:', graphError?.message || graphError);
      console.error('[API /api/posts] Full error details:', graphError);
      
      // Return empty instead of error
      return NextResponse.json({ posts: [], next: undefined });
    }
  } catch (error: any) {
    console.error('[API /api/posts] Unexpected error:', error?.message || error);
    return NextResponse.json({ posts: [], next: undefined, error: error?.message });
  }
}
