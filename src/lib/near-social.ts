"use client";

/**
 * NEAR Social API utility functions
 * Interacts with NEAR Social contract to fetch and post social content
 */

const NEAR_SOCIAL_CONTRACT = "social.near";
const NEAR_INDEXER_URL = "https://api.near.social";
const NEAR_RPC_URL = process.env.NEXT_PUBLIC_NEAR_RPC_URL || "https://rpc.testnet.near.org";

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
 * Fetch posts from NEAR Social using the indexer API
 * Uses NEAR Social's indexer to query posts
 */
export async function fetchNearSocialPosts(limit: number = 20): Promise<NearSocialPost[]> {
  try {
    // Use NEAR Social indexer API (if available) or fallback to RPC
    // Try indexer first as it's optimized for social queries
    try {
      const indexerResponse = await fetch(`${NEAR_INDEXER_URL}/v1/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "query",
          index: {
            action: "post",
            key: "main",
          },
          options: {
            limit,
            order: "desc",
          },
        }),
      });

      if (indexerResponse.ok) {
        const indexerData = await indexerResponse.json();
        if (Array.isArray(indexerData)) {
          return indexerData.slice(0, limit).map((item: any) => ({
            accountId: item.accountId || item.account_id || "",
            blockHeight: item.blockHeight || item.block_height || 0,
            value: {
              type: "post",
              path: "main",
              blockHeight: item.blockHeight || item.block_height || 0,
              timestamp: item.timestamp || Date.now(),
              accountId: item.accountId || item.account_id || "",
              main: item.text || item.main || item.value?.main || "",
            },
          }));
        }
      }
    } catch (indexerError) {
      console.log("Indexer not available, trying RPC...", indexerError);
    }

    // Fallback: Use NEAR RPC to query the social contract directly
    const response = await fetch(NEAR_RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "dontcare",
        method: "query",
        params: {
          request_type: "call_function",
          finality: "final",
          account_id: NEAR_SOCIAL_CONTRACT,
          method_name: "get",
          args_base64: btoa(
            JSON.stringify({
              keys: ["*:post/main"],
            })
          ),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch posts: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Parse the response from NEAR RPC
    if (data.result && data.result.result) {
      const resultJson = JSON.parse(atob(data.result.result));
      
      // Transform the data structure
      const posts: NearSocialPost[] = [];
      let count = 0;
      
      for (const accountId in resultJson) {
        if (count >= limit) break;
        const accountData = resultJson[accountId];
        if (accountData.post?.main) {
          const mainContent = accountData.post.main;
          posts.push({
            accountId,
            blockHeight: 0,
            value: {
              type: "post",
              path: "main",
              blockHeight: 0,
              timestamp: Date.now(),
              accountId,
              main: typeof mainContent === "string" ? mainContent : JSON.stringify(mainContent),
            },
          });
          count++;
        }
      }
      
      return posts;
    }

    return [];
  } catch (error) {
    console.error("Error fetching NEAR Social posts:", error);
    // Return empty array on error to prevent app crash
    return [];
  }
}

/**
 * Fetch user profile from NEAR Social using RPC
 */
export async function fetchUserProfile(accountId: string): Promise<NearSocialProfile | null> {
  try {
    const response = await fetch(NEAR_RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "dontcare",
        method: "query",
        params: {
          request_type: "call_function",
          finality: "final",
          account_id: NEAR_SOCIAL_CONTRACT,
          method_name: "get",
          args_base64: btoa(
            JSON.stringify({
              keys: [`${accountId}/profile/**`],
            })
          ),
        },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data.result && data.result.result) {
      const resultJson = JSON.parse(atob(data.result.result));
      
      if (resultJson[accountId]?.profile) {
        return resultJson[accountId].profile;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error fetching profile for ${accountId}:`, error);
    return null;
  }
}

/**
 * Fetch posts by a specific account
 */
export async function fetchAccountPosts(accountId: string, limit: number = 20): Promise<NearSocialPost[]> {
  try {
    const query = {
      action: "query",
      index: {
        action: "post",
        key: "main",
        accountId,
        options: {
          limit,
          order: "desc",
        },
      },
    };

    const response = await fetch(`${NEAR_INDEXER_URL}/v1/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(query),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch posts: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data && Array.isArray(data)) {
      return data.map((item: any) => ({
        accountId: item.accountId || item.account_id,
        blockHeight: item.blockHeight || item.block_height,
        value: {
          type: item.type || "post",
          path: item.path || "main",
          blockHeight: item.blockHeight || item.block_height,
          timestamp: item.timestamp || Date.now(),
          accountId: item.accountId || item.account_id,
          content: item.content,
          main: item.main || item.text,
        },
      }));
    }

    return [];
  } catch (error) {
    console.error(`Error fetching posts for ${accountId}:`, error);
    return [];
  }
}

/**
 * Post content to NEAR Social using RPC call
 * Note: This requires the user to be authenticated and sign a transaction
 */
export async function postToNearSocial(
  accountId: string,
  text: string,
  imageUrl?: string,
  walletSelector: any
): Promise<boolean> {
  try {
    const wallet = await walletSelector.wallet();
    if (!wallet) {
      throw new Error("Wallet not connected");
    }

    const data: any = {
      [accountId]: {
        post: {
          main: JSON.stringify({
            type: "md",
            text,
            image: imageUrl ? { url: imageUrl } : undefined,
          }),
        },
      },
    };

    // Use the wallet to call the social contract
    await wallet.signAndSendTransaction({
      receiverId: NEAR_SOCIAL_CONTRACT,
      actions: [
        {
          type: "FunctionCall",
          params: {
            methodName: "set",
            args: {
              data,
            },
            gas: "30000000000000",
            deposit: "0",
          },
        },
      ],
    });

    return true;
  } catch (error) {
    console.error("Error posting to NEAR Social:", error);
    throw error;
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

/**
 * Get profile image URL from NEAR Social profile
 */
export function getProfileImageUrl(profile: NearSocialProfile | null, accountId: string): string {
  if (profile?.image?.ipfs_cid) {
    return `https://ipfs.near.social/ipfs/${profile.image.ipfs_cid}`;
  }
  // Fallback to a default avatar or generate one
  return `https://i.pravatar.cc/150?u=${accountId}`;
}

