"use client";

/**
 * NEAR Social API utility functions using near-social-js SDK
 * Interacts with NEAR Social contract for social features
 */

import { Graph, Social } from "near-social-js";

// Utility to convert string to bytes for wallet transactions
function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Utility to convert object to base64 string for args
function objectToBase64Args(obj: any): string {
  const jsonStr = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(jsonStr);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

const NEAR_SOCIAL_CONTRACT = "social.near";
// Mainnet RPC for social data fetching
const NEAR_INDEXER_URL = process.env.NEXT_PUBLIC_NEAR_SOCIAL_API || "https://rpc.mainnet.near.org";
const NEAR_RPC_URL = process.env.NEXT_PUBLIC_NEAR_RPC_URL || "https://rpc.mainnet.near.org";

export interface NearSocialPost {
  accountId: string;
  blockHeight: number;
  value: {
    type: string;
    path: string;
    blockHeight: number;
    timestamp: number;
    accountId: string;
    content?: {
      text?: string;
      image?: string;
      audio?: string;
    };
    main?: string;
  };
}

export interface NearSocialProfile {
  name?: string;
  description?: string;
  image?: {
    ipfs_cid?: string;
  };
  linktree?: {
    twitter?: string;
    github?: string;
    website?: string;
  };
}

/**
 * Create a Social instance for high-level operations
 * Note: This is for read-only operations. For writes, use wallet.signAndSendTransaction()
 */
function createSocialInstance(): Social {
  return new Social();
}

/**
 * Create a Graph instance for low-level operations
 * Note: This is for read-only operations. For writes, use wallet.signAndSendTransaction()
 */
function createGraphInstance(): Graph {
  return new Graph();
}

/**
 * Get profile image IPFS URL
 */
export function getProfileImageUrl(profile: NearSocialProfile | null, accountId?: string): string {
  // Try to get the user's profile image from IPFS
  if (profile?.image?.ipfs_cid) {
    return `https://ipfs.near.social/ipfs/${profile.image.ipfs_cid}`;
  }
  
  // Fallback to NEAR default profile picture
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cdefs%3E%3ClinearGradient id='grad1' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:rgb(16,185,129);stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:rgb(6,182,212);stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='200' height='200' fill='url(%23grad1)'/%3E%3Ctext x='50%25' y='50%25' font-size='80' font-weight='bold' fill='white' text-anchor='middle' dy='.3em'%3EN%3C/text%3E%3C/svg%3E`;
}

/**
 * Fetch posts from NEAR Social using Graph index API
 * This fetches all available posts from the network
 */
export async function fetchNearSocialPosts(limit: number = 50, from?: number | string): Promise<{ posts: NearSocialPost[]; next?: number | string }> {
  try {
    console.log('[fetchNearSocialPosts] Starting fetch with limit:', limit);
    const graph = createGraphInstance();
    
    // Use graph.index to get posts ordered by recency
    console.log('[fetchNearSocialPosts] Querying graph.index() for posts...');
    const indexResults = await graph.index({
      action: "post",
      key: "main",
      order: "desc",
      limit: limit,
    });

    console.log('[fetchNearSocialPosts] Index results:', indexResults ? (Array.isArray(indexResults) ? `${indexResults.length} entries` : 'non-array') : 'null');

    if (!indexResults || !Array.isArray(indexResults) || indexResults.length === 0) {
      console.log('[fetchNearSocialPosts] No posts found in index');
      return { posts: [] };
    }

    // Fetch full content for each post in parallel
    const fetchPromises = indexResults.map(async (entry: any) => {
      try {
        let { accountId, blockHeight } = entry;
        
        // Convert BigInt to number if needed
        if (typeof blockHeight === 'bigint') {
          blockHeight = Number(blockHeight);
        }
        
        if (!accountId) {
          console.warn('[fetchNearSocialPosts] Skipping entry with no accountId:', entry);
          return null;
        }

        console.log(`[fetchNearSocialPosts] Fetching post from ${accountId} at block ${blockHeight}`);
        
        // Get the post data directly using graph.get
        const postDataResult = await graph.get({
          keys: [`${accountId}/post/main`],
        });

        if (postDataResult && postDataResult[accountId]) {
          const accountData = postDataResult[accountId] as any;
          let postContent: any = null;
          let postText = "";

          // Extract post content from nested structure
          if (accountData.post && accountData.post.main) {
            postContent = accountData.post.main;
            
            // Parse the post content
            if (typeof postContent === 'string') {
              try {
                const parsed = JSON.parse(postContent);
                if (parsed.type === 'md' && parsed.text) {
                  postText = parsed.text;
                } else if (parsed.text) {
                  postText = parsed.text;
                } else {
                  postText = JSON.stringify(parsed);
                }
              } catch {
                postText = postContent;
              }
            } else if (typeof postContent === 'object') {
              postText = (postContent as any).text || (postContent as any).main || JSON.stringify(postContent);
            }
          }

          if (!postText) {
            console.warn(`[fetchNearSocialPosts] No post text found for ${accountId}`);
            return null;
          }

          const nearSocialPost: NearSocialPost = {
            accountId,
            blockHeight,
            value: {
              type: "post",
              path: `${accountId}/post/main`,
              blockHeight,
              timestamp: blockHeight * 1000,
              accountId,
              main: postText,
              content: typeof postContent === 'object' ? postContent : undefined,
            },
          };
          
          console.log(`[fetchNearSocialPosts] ✓ Fetched post from ${accountId}: "${postText.substring(0, 50)}..."`);
          return nearSocialPost;
        } else {
          console.warn(`[fetchNearSocialPosts] No account data for ${accountId}`);
          return null;
        }
      } catch (err) {
        console.error('[fetchNearSocialPosts] Error fetching individual post:', err);
        return null;
      }
    });

    const results = await Promise.all(fetchPromises);
    const validPosts = results.filter((p): p is NearSocialPost => p !== null);
    
    console.log(`[fetchNearSocialPosts] Successfully fetched ${validPosts.length}/${indexResults.length} posts`);
    return { posts: validPosts };
  } catch (error) {
    console.error('[fetchNearSocialPosts] Critical error fetching posts:', error);
    return { posts: [] };
  }
}

/**
 * Fetch user profile from NEAR Social using Social API
 */
export async function fetchUserProfile(accountId: string): Promise<NearSocialProfile | null> {
  try {
    console.log('[fetchUserProfile] Fetching profile for:', accountId);
    const social = createSocialInstance();
    const profile = await social.getProfile(accountId);
    
    if (!profile) {
      console.log('[fetchUserProfile] No profile found for:', accountId);
      return null;
    }
    
    console.log('[fetchUserProfile] Profile fetched:', profile);
    return profile;
  } catch (error) {
    console.error('[fetchUserProfile] Error fetching profile:', error);
    return null;
  }
}

/**
 * Fetch all posts using Graph.get() with wildcards
 * Alternative method to fetch posts from all accounts
 */
export async function fetchAllPostsViaGraph(limit: number = 100): Promise<NearSocialPost[]> {
  try {
    console.log('[fetchAllPostsViaGraph] Fetching all posts via graph.get()');
    const graph = createGraphInstance();
    
    // Use Graph.get() to fetch posts from all accounts matching pattern
    const data = await graph.get({
      keys: ['*/post/main']
    });

    if (!data || typeof data !== 'object') {
      console.log('[fetchAllPostsViaGraph] No posts found');
      return [];
    }

    const posts: NearSocialPost[] = [];
    const entries = Object.entries(data).slice(0, limit);
    
    for (const [key, postData] of entries) {
      try {
        const pathParts = key.split('/');
        if (pathParts.length < 3) continue;
        
        const accountId = pathParts[0];
        const postContent = postData as any;
        
        posts.push({
          accountId,
          blockHeight: postContent.blockHeight || 0,
          value: {
            type: "post",
            path: key,
            blockHeight: postContent.blockHeight || 0,
            timestamp: postContent.timestamp || Date.now(),
            accountId,
            main: typeof postContent.text === 'string' ? postContent.text : (typeof postContent === 'string' ? postContent : ""),
            content: postContent.content || undefined,
          },
        });
      } catch (err) {
        console.warn('[fetchAllPostsViaGraph] Error processing post:', err);
        continue;
      }
    }

    console.log('[fetchAllPostsViaGraph] Fetched', posts.length, 'posts');
    return posts;
  } catch (error) {
    console.error('[fetchAllPostsViaGraph] Error fetching posts:', error);
    return [];
  }
}

/**
 * Fetch posts by a specific account (uses mainnet RPC)
 */
export async function fetchAccountPosts(accountId: string, limit: number = 20): Promise<NearSocialPost[]> {
  try {
    // Posts are fetched via the main fetchNearSocialPosts endpoint
    // This function is kept for backward compatibility but will return empty
    // Use fetchNearSocialPosts() instead for all post queries
    console.warn('[Client] fetchAccountPosts is deprecated, use fetchNearSocialPosts instead');
    return [];
  } catch (error) {
    console.error(`Error fetching posts for ${accountId}:`, error);
    return [];
  }}

/**
 * Post content to NEAR Social using Social API
 */
export async function postToNearSocial(accountId: string, text: string, imageUrl?: string, walletSelector?: any): Promise<boolean> {
  try {
    console.log("[postToNearSocial] Starting post creation for account:", accountId);
    
    if (!walletSelector) throw new Error("Wallet selector is required to post");
    const wallet = await walletSelector.wallet();
    if (!wallet) throw new Error("Wallet not connected");

    const graph = createGraphInstance();
    
    // Create post data manually
    const data: any = {
      [accountId]: {
        post: {
          main: JSON.stringify({
            type: "md",
            text,
          }),
        },
        index: {
          post: JSON.stringify({ key: "main", value: { type: "md" } }),
        },
      },
    };

    // Sign and send transaction
    const result = await wallet.signAndSendTransaction({
      receiverId: NEAR_SOCIAL_CONTRACT,
      actions: [{
        type: "FunctionCall",
        params: {
          methodName: "set",
          args: stringToBytes(JSON.stringify({ data })),
          gas: "200000000000000",
          deposit: "0",
        },
      }],
    });

    console.log("[postToNearSocial] Transaction successful:", result);
    return true;
  } catch (error: any) {
    console.error("Error posting to NEAR Social:", error);
    throw error;
  }
}

/**
 * Follow an account using Social API
 */
export async function followAccount(signerId: string, targetAccountId: string, walletSelectorOrSetup?: any): Promise<boolean> {
  try {
    console.log('[followAccount] Following:', { signerId, targetAccountId });

    if (!walletSelectorOrSetup) throw new Error("Wallet selector is required to follow");
    
    // Handle both WalletSelector object and WalletSelectorSetup object
    let selector = walletSelectorOrSetup;
    let modal = undefined;
    if (walletSelectorOrSetup.selector) {
      // It's a WalletSelectorSetup object
      selector = walletSelectorOrSetup.selector;
      modal = walletSelectorOrSetup.modal;
    }
    
    let wallet = await selector.wallet();
    
    // If no wallet connected, show modal to let user select
    if (!wallet) {
      console.log('[followAccount] No wallet connected, showing modal');
      if (modal) {
        await modal.show();
      }
      wallet = await selector.wallet();
      if (!wallet) throw new Error("Wallet not connected - user cancelled");
    }

    // Check if wallet has a signAndSendTransaction method
    if (!wallet.signAndSendTransaction) {
      throw new Error("Wallet does not support signing transactions. Please update your wallet.");
    }

    const data: any = {
      [signerId]: {
        graph: {
          follow: {
            [targetAccountId]: "",
          },
        },
        index: {
          graph: JSON.stringify({
            key: "follow",
            value: {
              type: "follow",
              accountId: targetAccountId,
            },
          }),
        },
      },
    };

    // Sign and send transaction
    const argsBuffer = stringToBytes(JSON.stringify({ data }));
    const result = await wallet.signAndSendTransaction({
      receiverId: NEAR_SOCIAL_CONTRACT,
      actions: [{
        type: "FunctionCall",
        params: {
          methodName: "set",
          args: argsBuffer,
          gas: "100000000000000",
          deposit: "0",
        },
      }],
    });

    console.log('[followAccount] Follow successful:', result);
    return true;
  } catch (error: any) {
    console.error("Error following account:", error);
    throw error;
  }
}

/**
 * Unfollow an account using Social API
 */
export async function unfollowAccount(signerId: string, targetAccountId: string, walletSelectorOrSetup?: any): Promise<boolean> {
  try {
    console.log('[unfollowAccount] Unfollowing:', { signerId, targetAccountId });

    if (!walletSelectorOrSetup) throw new Error("Wallet selector is required to unfollow");
    
    // Handle both WalletSelector object and WalletSelectorSetup object
    let selector = walletSelectorOrSetup;
    let modal = undefined;
    if (walletSelectorOrSetup.selector) {
      // It's a WalletSelectorSetup object
      selector = walletSelectorOrSetup.selector;
      modal = walletSelectorOrSetup.modal;
    }
    
    let wallet = await selector.wallet();
    
    // If no wallet connected, show modal to let user select
    if (!wallet) {
      console.log('[unfollowAccount] No wallet connected, showing modal');
      if (modal) {
        await modal.show();
      }
      wallet = await selector.wallet();
      if (!wallet) throw new Error("Wallet not connected - user cancelled");
    }

    // Check if wallet has a signAndSendTransaction method
    if (!wallet.signAndSendTransaction) {
      throw new Error("Wallet does not support signing transactions. Please update your wallet.");
    }

    const data: any = {
      [signerId]: {
        graph: {
          follow: {
            [targetAccountId]: null,
          },
        },
        index: {
          graph: JSON.stringify({
            key: "follow",
            value: {
              type: "unfollow",
              accountId: targetAccountId,
            },
          }),
        },
      },
    };

    // Sign and send transaction
    const argsBuffer = stringToBytes(JSON.stringify({ data }));
    const result = await wallet.signAndSendTransaction({
      receiverId: NEAR_SOCIAL_CONTRACT,
      actions: [{
        type: "FunctionCall",
        params: {
          methodName: "set",
          args: argsBuffer,
          gas: "100000000000000",
          deposit: "0",
        },
      }],
    });

    console.log('[unfollowAccount] Unfollow successful:', result);
    return true;
  } catch (error: any) {
    console.error("Error unfollowing account:", error);
    throw error;
  }
}

/**
 * Like an item using Social API
 * Uses the high-level Social.like() method which handles transaction signing properly
 */
export async function likeItem(signerId: string, item: { type: string; path: string; blockHeight?: number }, walletSelectorOrSetup?: any, depositAmount: string = "0"): Promise<boolean> {
  try {
    console.log('[likeItem] Liking item:', { signerId, item, depositAmount });

    if (!walletSelectorOrSetup) throw new Error("Wallet selector is required to like");
    
    // Handle both WalletSelector object and WalletSelectorSetup object
    let selector = walletSelectorOrSetup;
    let modal = undefined;
    if (walletSelectorOrSetup.selector) {
      // It's a WalletSelectorSetup object
      selector = walletSelectorOrSetup.selector;
      modal = walletSelectorOrSetup.modal;
    }
    
    let wallet = await selector.wallet();
    
    // If no wallet connected, show modal to let user select
    if (!wallet) {
      console.log('[likeItem] No wallet connected, showing modal');
      if (modal) {
        await modal.show();
      }
      wallet = await selector.wallet();
      if (!wallet) throw new Error("Wallet not connected - user cancelled");
    }

    // Check if wallet has a signAndSendTransaction method
    if (!wallet.signAndSendTransaction) {
      throw new Error("Wallet does not support signing transactions. Please update your wallet.");
    }

    // Build the like data structure for NEAR Social contract
    const data: any = {
      [signerId]: {
        index: {
          like: JSON.stringify({
            key: {
              type: item.type || "social",
              path: item.path,
              blockHeight: item.blockHeight || 0,
            },
            value: {
              type: "like",
            },
          }),
        },
      },
    };

    // Sign and send transaction via wallet
    const result = await wallet.signAndSendTransaction({
      receiverId: NEAR_SOCIAL_CONTRACT,
      actions: [{
        type: "FunctionCall",
        params: {
          methodName: "set",
          args: stringToBytes(JSON.stringify({ data })),
          gas: "200000000000000",
          deposit: depositAmount || "0",
        },
      }],
    });

    console.log('[likeItem] Like successful:', result);
    return true;
  } catch (error: any) {
    console.error("Error liking item:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
    });
    throw error;
  }
}

/**
 * Repost an item using Social API
 */
export async function repostItem(signerId: string, item: { type: string; path: string; blockHeight?: number }, walletSelectorOrSetup?: any, depositAmount: string = "0"): Promise<boolean> {
  try {
    console.log('[repostItem] Reposting item:', { signerId, item, depositAmount });

    if (!walletSelectorOrSetup) throw new Error("Wallet selector is required to repost");
    
    // Handle both WalletSelector object and WalletSelectorSetup object
    let selector = walletSelectorOrSetup;
    let modal = undefined;
    if (walletSelectorOrSetup.selector) {
      // It's a WalletSelectorSetup object
      selector = walletSelectorOrSetup.selector;
      modal = walletSelectorOrSetup.modal;
    }
    
    let wallet = await selector.wallet();
    
    // If no wallet connected, show modal to let user select
    if (!wallet) {
      console.log('[repostItem] No wallet connected, showing modal');
      if (modal) {
        await modal.show();
      }
      wallet = await selector.wallet();
      if (!wallet) throw new Error("Wallet not connected - user cancelled");
    }

    // Check if wallet has a signAndSendTransaction method
    if (!wallet.signAndSendTransaction) {
      throw new Error("Wallet does not support signing transactions. Please update your wallet.");
    }

    // Create repost data structure matching near.social format
    const data: any = {
      [signerId]: {
        index: {
          repost: JSON.stringify({
            key: {
              type: item.type || "social",
              path: item.path,
              blockHeight: item.blockHeight || 0,
            },
            value: {
              type: "repost",
            },
          }),
        },
      },
    };

    // Sign and send transaction via wallet
    const result = await wallet.signAndSendTransaction({
      receiverId: NEAR_SOCIAL_CONTRACT,
      actions: [{
        type: "FunctionCall",
        params: {
          methodName: "set",
          args: stringToBytes(JSON.stringify({ data })),
          gas: "200000000000000",
          deposit: depositAmount || "0",
        },
      }],
    });

    console.log('[repostItem] Repost successful:', result);
    return true;
  } catch (error: any) {
    console.error("Error reposting item:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
    });
    throw error;
  }
}

/**
 * Get likes for a specific item using Social API
 * Uses the high-level Social.getLikes() method (matches near.social)
 */
export async function getLikesForItem(item: { type: string; path: string; blockHeight?: number }): Promise<any[]> {
  try {
    console.log('[getLikesForItem] Fetching likes for item:', item);
    const social = createSocialInstance();
    
    // Use Social.getLikes() - returns index entries of who liked the item
    const likes = await social.getLikes({
      type: item.type || 'social',
      path: item.path,
      blockHeight: item.blockHeight || 0,
    });
    
    console.log('[getLikesForItem] Likes fetched:', likes);
    
    // likes is an array of index entries with accountId and value
    // Format: [{ accountId: string, value: {...} }, ...]
    return Array.isArray(likes) ? likes : [];
  } catch (error) {
    console.error('[getLikesForItem] Error fetching likes:', error);
    return [];
  }
}

/**
 * Get reposts for a specific item using Graph API
 */
export async function getRepostsForItem(item: { type: string; path: string; blockHeight?: number }): Promise<any[]> {
  try {
    console.log('[getRepostsForItem] Fetching reposts for item:', item);
    const graph = createGraphInstance();
    
    // Query reposts from index
    const reposts = await graph.index({
      action: 'repost',
      key: item,
    });
    
    console.log('[getRepostsForItem] Reposts fetched:', reposts);
    return Array.isArray(reposts) ? reposts : [];
  } catch (error) {
    console.error('[getRepostsForItem] Error fetching reposts:', error);
    return [];
  }
}

/**
 * Get followers for an account using Social API
 */
export async function getFollowers(accountId: string): Promise<string[]> {
  try {
    console.log('[getFollowers] Fetching followers for:', accountId);
    const social = createSocialInstance();
    
    // Use Social API to get followers
    const followers = await social.getFollowers(accountId);
    
    console.log('[getFollowers] Followers:', followers);
    return Object.keys(followers || {});
  } catch (error) {
    console.error('[getFollowers] Error fetching followers:', error);
    return [];
  }
}

/**
 * Get following for an account using Social API
 */
export async function getFollowing(accountId: string): Promise<string[]> {
  try {
    console.log('[getFollowing] Fetching following for:', accountId);
    const social = createSocialInstance();
    
    // Use Social API to get following
    const following = await social.getFollowing(accountId);
    
    console.log('[getFollowing] Following:', following);
    return Object.keys(following || {});
  } catch (error) {
    console.error('[getFollowing] Error fetching following:', error);
    return [];
  }
}

/**
 * Get user's posts using Graph API
 */
export async function getUserPosts(accountId: string, limit: number = 10): Promise<NearSocialPost[]> {
  try {
    console.log('[getUserPosts] Fetching posts for:', accountId);
    const graph = createGraphInstance();
    
    // Query posts from a specific account
    const posts = await graph.get({
      keys: [`${accountId}/post/**`],
    });

    const postArray: NearSocialPost[] = [];
    if (posts && posts[accountId]) {
      const accountData = (posts[accountId] as any);
      if (accountData.post) {
        for (const [key, value] of Object.entries(accountData.post)) {
          postArray.push({
            accountId,
            blockHeight: 0,
            value: {
              type: "post",
              path: `${accountId}/post/${key}`,
              blockHeight: 0,
              timestamp: Date.now(),
              accountId,
              main: typeof value === 'string' ? value : JSON.stringify(value),
            },
          });
        }
      }
    }

    return postArray.slice(0, limit);
  } catch (error) {
    console.error('[getUserPosts] Error fetching user posts:', error);
    return [];
  }
}

/**
 * Get social stats for a user (followers, following, posts count)
 */
export async function getUserSocialStats(accountId: string): Promise<{ followers: number; following: number; posts: number }> {
  try {
    console.log('[getUserSocialStats] Fetching stats for:', accountId);
    
    const [followers, following, posts] = await Promise.all([
      getFollowers(accountId),
      getFollowing(accountId),
      getUserPosts(accountId, 1000),
    ]);

    const stats = {
      followers: Object.keys(followers).length,
      following: Object.keys(following).length,
      posts: posts.length,
    };

    console.log('[getUserSocialStats] Stats:', stats);
    return stats;
  } catch (error) {
    console.warn("[getUserSocialStats] Error fetching stats:", error);
    return { followers: 0, following: 0, posts: 0 };
  }
}

/**
 * Format timestamp to relative time (e.g., "2h ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}hrs ago`;
  if (minutes > 0) return `${minutes}mins ago`;
  return "Just now";
}

// Expose the configured endpoints so the UI can display / test them
export function getIndexerUrl(): string {
  return NEAR_INDEXER_URL;
}

export function getRpcUrl(): string {
  return NEAR_RPC_URL;
}

// Simple endpoint tests that attempt network calls and return status/messages
export async function testIndexer(): Promise<{ ok: boolean; status?: number; url: string; message?: string }> {
  const url = NEAR_RPC_URL;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: "dontcare", method: "view_state", params: { account_id: "social.near", prefix: "" } }),
    });
    return { ok: res.ok, status: res.status, url };
  } catch (err: any) {
    return { ok: false, url, message: err?.message ?? String(err) };
  }
}

export async function testRpc(): Promise<{ ok: boolean; status?: number; url: string; message?: string }> {
  const url = NEAR_RPC_URL;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: "dontcare", method: "block", params: { finality: "final" } }),
    });
    return { ok: res.ok, status: res.status, url };
  } catch (err: any) {
    return { ok: false, url, message: err?.message ?? String(err) };
  }
}

export async function getSuggestedAccounts(limit: number = 5, currentAccountId?: string): Promise<string[]> {
  try {
    const graph = createGraphInstance();
    const social = createSocialInstance();
    
    // Query recent posts to find active accounts
    const indexResults = await graph.index({
      action: "post",
      key: "main",
      order: "desc",
      limit: Math.min(limit * 5, 50) // Get more to filter
    });

    if (!indexResults || !Array.isArray(indexResults)) {
      return [];
    }

    // Extract unique account IDs
    const accountIds: string[] = [];
    const seen = new Set<string>();
    
    for (const entry of indexResults) {
      try {
        const { accountId } = entry as any;
        if (accountId && 
            !seen.has(accountId) && 
            accountId !== currentAccountId &&
            accountId !== "social.near") {
          accountIds.push(accountId);
          seen.add(accountId);
        }
      } catch {
        // Skip invalid entries
      }
      if (accountIds.length >= limit) break;
    }

    return accountIds.slice(0, limit);
  } catch (err) {
    console.warn("Error getting suggested accounts:", err);
    return [];
  }
}

/**
 * Get trending posts by likes
 */
export async function getTrendingPosts(limit: number = 10): Promise<NearSocialPost[]> {
  try {
    const graph = createGraphInstance();
    const social = createSocialInstance();
    
    // Query recent likes to find trending posts
    // Note: Graph.index requires both action and key parameters
    const likeIndexResults = await graph.index({
      action: "like",
      key: "", // Like index uses empty key to get all likes
      order: "desc",
      limit: Math.min(limit * 10, 100)
    });

    if (!likeIndexResults || !Array.isArray(likeIndexResults)) {
      return [];
    }

    // Extract unique posts from likes
    const postMap = new Map<string, { accountId: string; blockHeight: number; count: number }>();
    
    for (const entry of likeIndexResults) {
      try {
        const { accountId, value } = entry as any;
        if (!accountId || !value) continue;
        
        const parsedValue = typeof value === 'string' ? JSON.parse(value) : value;
        if (!parsedValue.path || !parsedValue.blockHeight) continue;
        
        const pathParts = parsedValue.path.split('/');
        if (pathParts.length < 2) continue;
        
        const postAccountId = pathParts[0];
        const blockHeight = parsedValue.blockHeight;
        const key = `${postAccountId}-${blockHeight}`;
        
        if (!postMap.has(key)) {
          postMap.set(key, { accountId: postAccountId, blockHeight, count: 0 });
        }
        const post = postMap.get(key)!;
        post.count++;
      } catch {
        // Skip invalid entries
      }
    }

    // Sort by like count and get top posts
    const sortedPosts = Array.from(postMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    // Fetch full post data
    const posts: NearSocialPost[] = [];
    for (const { accountId, blockHeight } of sortedPosts) {
      try {
        const post = await social.getPost(accountId, blockHeight);
        if (post) {
          posts.push({
            accountId,
            blockHeight,
            value: {
              type: "post",
              path: `${accountId}/post/main`,
              blockHeight,
              timestamp: blockHeight * 1000,
              accountId,
              main: typeof post.text === 'string' ? post.text : (typeof post.main === 'string' ? post.main : ""),
            },
          });
        }
      } catch (err) {
        console.error('Error fetching trending post:', err);
      }
    }

    return posts;
  } catch (err) {
    console.warn("Error getting trending posts:", err);
    return [];
  }
}

/**
 * Poke a user - send a friendly notification/interaction
 * Creates a poke action in the social graph
 */
export async function pokeUser(signerId: string, targetAccountId: string, walletSelectorOrSetup?: any, depositAmount: string = "0"): Promise<boolean> {
  try {
    console.log('[pokeUser] Poking user:', { signerId, targetAccountId, depositAmount });

    if (!walletSelectorOrSetup) throw new Error("Wallet selector is required to poke");
    
    // Handle both WalletSelector object and WalletSelectorSetup object
    let selector = walletSelectorOrSetup;
    let modal = undefined;
    if (walletSelectorOrSetup.selector) {
      // It's a WalletSelectorSetup object
      selector = walletSelectorOrSetup.selector;
      modal = walletSelectorOrSetup.modal;
    }
    
    let wallet = await selector.wallet();
    
    // If no wallet connected, show modal to let user select
    if (!wallet) {
      console.log('[pokeUser] No wallet connected, showing modal');
      if (modal) {
        await modal.show();
      }
      wallet = await selector.wallet();
      if (!wallet) throw new Error("Wallet not connected - user cancelled");
    }

    // Check if wallet has a signAndSendTransaction method
    if (!wallet.signAndSendTransaction) {
      throw new Error("Wallet does not support signing transactions. Please update your wallet.");
    }

    // Convert NEAR to yoctoNEAR
    const depositInYocto = parseFloat(depositAmount) === 0 ? "0" : String(BigInt(Math.floor(parseFloat(depositAmount) * 1e24)));

    // Create poke data - store in user's notifications
    const data: any = {
      [signerId]: {
        index: {
          notify: JSON.stringify({
            key: `poke:${targetAccountId}`,
            value: {
              type: "poke",
              accountId: targetAccountId,
              timestamp: Date.now(),
            },
          }),
        },
      },
    };

    const argsBuffer = stringToBytes(JSON.stringify({ data }));
    const result = await wallet.signAndSendTransaction({
      receiverId: NEAR_SOCIAL_CONTRACT,
      actions: [{
        type: "FunctionCall",
        params: {
          methodName: "set",
          args: argsBuffer,
          gas: "100000000000000",  // 100 Tgas
          deposit: depositInYocto,
        },
      }],
    });

    console.log('[pokeUser] Poke successful:', result);
    return true;
  } catch (error: any) {
    console.error("Error poking user:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
    });
    throw error;
  }
}

/**
 * Get pokes received by a user
 */
export async function getPokeCount(accountId: string): Promise<number> {
  try {
    console.log('[getPokeCount] Fetching poke count for:', accountId);
    const graph = createGraphInstance();

    // Query pokes from index
    const pokes = await graph.index({
      action: 'notify',
      key: { type: 'poke', accountId } as any,
    });

    console.log('[getPokeCount] Pokes fetched:', pokes);
    return Array.isArray(pokes) ? pokes.length : 0;
  } catch (error) {
    console.error('[getPokeCount] Error fetching poke count:', error);
    return 0;
  }
}

/**
 * Get notifications/pokes for a user
 */
export async function getNotifications(accountId: string): Promise<any[]> {
  try {
    console.log('[getNotifications] Fetching notifications for:', accountId);
    const graph = createGraphInstance();

    // Fetch notification data
    const result = await graph.get({
      keys: [`${accountId}/index/notify/**`],
    });

    if (!result || !result[accountId]) {
      return [];
    }

    const accountData = result[accountId] as any;
    const notifications: any[] = [];

    if (accountData.index?.notify) {
      for (const [key, value] of Object.entries(accountData.index.notify)) {
        try {
          const parsed = typeof value === 'string' ? JSON.parse(value) : value;
          notifications.push({
            key,
            ...parsed,
          });
        } catch (err) {
          console.warn('Error parsing notification:', err);
        }
      }
    }

    return notifications;
  } catch (error) {
    console.error('[getNotifications] Error fetching notifications:', error);
    return [];
  }
}

