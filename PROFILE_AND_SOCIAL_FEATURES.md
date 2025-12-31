# Profile and Social Features Implementation

This document describes the profile and social interaction features that have been implemented using the NEAR Social API.

## Features Implemented

### 1. Enhanced Social API Functions (`src/lib/near-social.ts`)

#### New Functions Added:
- **`getLikesForItem(item)`** - Fetches all likes for a specific post by querying the social contract with the pattern `*/index/like/{item.path}`, returning an array of accounts that liked the item
- **`getFollowing(accountId)`** - Retrieves the list of accounts that a user follows
- **`getFollowers(accountId)`** - Retrieves the list of accounts that follow a user (queries all follow relationships)
- **`getUserPosts(accountId, limit)`** - Fetches all posts from a specific user account
- **`getUserSocialStats(accountId)`** - Returns an object with `{ followers, following, posts }` counts

### 2. User Profile Component (`src/components/UserProfile.tsx`)

A comprehensive profile display page that shows:

**Profile Header:**
- User avatar with cover image gradient
- Display name and account ID (@username)
- Bio/description with tags
- Social links (Twitter, GitHub, website)
- Follow/Unfollow button (contextual based on connection state)

**Social Statistics:**
- Post count
- Followers count
- Following count

**User Posts Section:**
- Displays all user's posts chronologically
- Shows post content, images, and audio
- Like count with heart icon
- Like button that works when wallet is connected
- Reply, repost, and share buttons

**Interactions:**
- Users can like posts when wallet is connected
- Toast notifications for success/error
- Optimistic UI updates that rollback on error

### 3. Enhanced Wallet Panel (`src/components/WalletPanel.tsx`)

The wallet panel now includes:

**Social Profile Section:**
- User avatar (clickable to view full profile)
- Display name and username (clickable to view full profile)
- Profile description with tags
- **Social Stats Grid:**
  - Posts count
  - Followers count
  - Following count
  - Each stat is clickable to open the full profile view

### 4. Updated Header Component (`src/components/Header.tsx`)

- Integrated UserProfile modal display
- Added `onViewProfile` callback to WalletPanel
- Clicking on profile info in WalletPanel now opens the full profile view
- Modal management for profile viewing

### 5. Social Feed Integration (`src/Explore.tsx`)

**Made clickable:**
- User avatars in posts → Opens profile
- Author names in posts → Opens profile
- Suggested accounts in sidebar → Opens profile view

**Features:**
- Integrated UserProfile modal
- Users can view any account's full profile by clicking their avatar or name
- Like functionality works when wallet is connected
- Like counts are fetched and displayed in real-time

## How to Use

### Connecting Your Wallet

1. Click "Connect Wallet" in the header
2. Select your NEAR wallet and approve the connection
3. Your profile will load in the WalletPanel

### Viewing Profiles

You can click on a user's profile in multiple ways:

1. **From the Wallet Panel:**
   - Click the avatar, name, or any stat (Posts, Followers, Following)

2. **From the Social Feed:**
   - Click a post author's avatar or name
   - Click on suggested accounts in the sidebar

3. **From the Profile Page:**
   - View full profile with all posts, followers, and following info

### Liking Posts

1. Connect your wallet first
2. Find a post you want to like
3. Click the heart icon
4. The like count will update in real-time
5. Your like is stored on the NEAR Social contract

### Following Users

1. Click on a user's profile or suggested account
2. Click the "Follow" button (or "Following" if already following)
3. Your follow relationship is stored on NEAR Social

## API Documentation

The implementation uses the NEAR Social Graph API:

**Social Contract:** `social.near`

**Data Paths:**
- `{accountId}/profile/**` - User profile data
- `{accountId}/post/**` - User posts
- `{accountId}/graph/follow/{targetAccountId}` - Following relationships
- `*/graph/follow/{accountId}` - Followers (all accounts following)
- `*/index/like/{postPath}` - Likes for a post

## Technical Details

### Like Implementation

When a user likes a post:
1. The app calls `likeItem(signerId, item, walletSelector)`
2. This creates a transaction to the `social.near` contract
3. The data is stored at: `{signerId}/index/like/{postPath}`
4. The like count is fetched by querying `*/index/like/{postPath}`

### Follow Implementation

When following:
- Data stored at: `{userId}/graph/follow/{targetAccountId}`
- To check if following: Query the graph path
- To unfollow: Set the value to `null`

### Profile Data Structure

```typescript
interface NearSocialProfile {
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
```

## Error Handling

- Network errors are caught and displayed as toast notifications
- Failed actions rollback optimistic UI updates
- All async operations have proper loading states
- Wallet disconnection is handled gracefully

## Future Enhancements

Potential additions:
- Comments on posts
- Direct messaging
- Search and discovery
- Notifications
- Post editing and deletion
- Image/file upload handling
- Advanced profile customization
