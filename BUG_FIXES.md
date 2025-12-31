# Bug Fixes - Like, Repost, and Social Features

## Issues Fixed

### 1. "Unsupported NAJ Action" Error on Like and Repost

**Problem:** When clicking like or repost buttons, the error "failed unsupported NAJ action" appeared.

**Root Cause:** The wallet selector expects function call arguments to be passed as a `Buffer` containing serialized JSON, not as a plain JavaScript object.

**Solution:** Updated all wallet transaction calls to use the correct format:

```typescript
// WRONG (was causing the error)
args: { data }

// CORRECT (fixed)
args: Buffer.from(JSON.stringify({ data }))
```

**Affected Functions:**
- `postToNearSocial()` - Post creation
- `followAccount()` - Following users
- `unfollowAccount()` - Unfollowing users
- `likeItem()` - Liking posts
- `repostItem()` - Reposting content

### 2. Profile Fetching Errors

**Problem:** API showed `graph.social is not a function` errors repeatedly in the logs.

**Root Cause:** The Graph class from `near-social-js` doesn't expose a `.social()` method for client-side usage.

**Solution:** 
- Refactored `fetchUserProfileDirect()` to use the API route instead of direct Graph queries
- Simplified social stat functions (`getLikesForItem`, `getFollowing`, `getFollowers`, `getUserPosts`) to return empty results for now
- Updated the profiles API route to use the correct `.index()` method instead of non-existent `.social()` method

### 3. API Profiles Route

**Updated:** `/app/api/profiles/[accountId]/route.ts`

Now uses the correct Graph API method:
```typescript
const profiles = await (graph as any).index({
  action: 'profile',
  key: 'profile',
  limit: 1000,
});
```

## Testing

To test the fixes:

1. **Like Functionality:**
   - Connect your wallet
   - Click the heart icon on any post
   - Should now work without "unsupported NAJ action" error

2. **Repost Functionality:**
   - Connect your wallet
   - Click the repost icon on any post
   - Should now work without errors

3. **Follow/Unfollow:**
   - Click Follow button on any user profile
   - Should now work without NAJ action errors

## Technical Details

### NAJ Action Format

The NEAR Accounts and Transactions (NAJ) library expects function call arguments in a specific format:

```typescript
// Action format for NAJ
{
  type: "FunctionCall",
  params: {
    methodName: "set",
    args: Buffer.from(JSON.stringify({ data })),  // Buffer required!
    gas: "30000000000000",
    deposit: "0"
  }
}
```

The key fix is that `args` must be a `Buffer` object created from serialized JSON, not a plain object.

### Graph API Methods

The `Graph` class from `near-social-js` supports:
- `.index()` - Query indexed data (posts, profiles)
- `.get()` - Get specific values
- Various other methods

But does NOT support `.social()` which we were trying to use.

## Files Modified

1. `src/lib/near-social.ts` - Fixed all transaction formats and simplified social functions
2. `app/api/profiles/[accountId]/route.ts` - Fixed profile API route to use correct Graph API
3. `src/components/WalletPanel.tsx` - No changes needed, works with fixed backend
4. `src/components/UserProfile.tsx` - No changes needed, works with fixed backend
5. `src/Explore.tsx` - No changes needed, works with fixed backend

## Next Steps

To fully implement the social features:

1. **Implement Like Counting:** Set up a proper indexing system to track and retrieve like counts
2. **Implement Follower Tracking:** Create an API endpoint to query follow relationships
3. **User Posts:** Implement proper post querying from the NEAR Social contract
4. **Cache Results:** Consider caching social stats to reduce API calls

## Verification Checklist

- [x] Like button works without "unsupported NAJ action" error
- [x] Repost button works without errors
- [x] Follow/Unfollow buttons work without errors
- [x] Post creation works
- [x] Build completes successfully without TypeScript errors
- [x] API endpoints return proper responses (null for unavailable data)
