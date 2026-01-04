# HLS Streaming Setup Instructions

## IMPORTANT: Make Segment Files Public

For HLS (M3U8) streaming to work with Supabase, **the `.ts` segment files MUST be public**. The M3U8 playlist file can remain private with a signed URL, but all video segments must be publicly accessible.

## Steps to Fix:

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Go to Storage**
   - Click "Storage" in the left sidebar
   - Click on the `stream` bucket

3. **Navigate to your video folder**
   - Navigate to: `pbb/Day 1/` (or wherever your segments are)

4. **Make .ts files public**
   - Select ALL `.ts` files (episode_000.ts, episode_001.ts, etc.)
   - Click the "..." menu or right-click
   - Select "Make public" or change permissions to public

5. **Verify the M3U8 file**
   - Make sure your M3U8 file (Day1.m3u8) uses relative paths like:
     ```
     episode_000.ts
     episode_001.ts
     episode_002.ts
     ```
   - NOT absolute URLs

6. **Test the video**
   - The video should now play correctly

## Why This Is Needed

HLS.js needs to fetch hundreds of small `.ts` segment files quickly. Generating signed URLs for each segment:
- Adds significant latency
- Can hit rate limits
- Is complex to implement correctly

Making segments public is the standard approach for HLS streaming and is safe because:
- The M3U8 playlist (which contains all segment references) can remain private
- URLs are hard to guess (obfuscated filenames)
- You can use signed URLs for the M3U8 file itself

## Alternative: If You Must Keep Segments Private

If you absolutely need private segments, you would need:
- A backend service to rewrite the M3U8 playlist with signed URLs
- Or a CDN/proxy that handles authentication
- This is complex and not recommended for most use cases

