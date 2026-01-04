# Live Stream Player Guide

## Supported Stream Input Types

The live player supports the following stream formats:

### 1. **HLS (HTTP Live Streaming) - RECOMMENDED for Live Streams**
- **Format**: M3U8 playlist files
- **Extension**: `.m3u8`
- **Best for**: Live streaming, adaptive bitrate streaming
- **Example**: `https://example.com/live/stream.m3u8`

**Why HLS?**
- Industry standard for live streaming
- Adaptive bitrate (adjusts quality based on connection)
- Works on all modern browsers
- Low latency support
- Can handle interruptions and reconnections

### 2. **Regular Video Files** (Not ideal for live)
- **Formats**: MP4, WebM, etc.
- **Best for**: On-demand content, not live streams
- **Example**: `https://example.com/video.mp4`

## How to Add a Live Stream

### Method 1: URL Parameters (Recommended)

Navigate to the live player with URL parameters:

```
stream/browse/live/index.html?src=YOUR_STREAM_URL&title=Channel Name
```

**Example:**
```
stream/browse/live/index.html?src=https://example.com/live/stream.m3u8&title=My Live Channel
```

**Parameters:**
- `src` (required): The URL to your live stream (M3U8 file for HLS)
- `title` (optional): The name of the channel (defaults to "Live Channel")
- `subtitles` (optional): URL to a VTT subtitle file

### Method 2: Direct Link from Browse Page

You can create links in your browse page that point to live channels:

```html
<a href="live/index.html?src=https://example.com/live/channel1.m3u8&title=Channel 1">
  Watch Channel 1
</a>
```

## Stream URL Examples

### HLS Stream Examples:

```javascript
// Public HLS stream
https://example.com/live/stream.m3u8

// Supabase Storage HLS stream
https://your-project.supabase.co/storage/v1/object/public/stream/live/channel.m3u8

// CDN HLS stream
https://cdn.example.com/hls/stream.m3u8

// With authentication token
https://example.com/live/stream.m3u8?token=your-token-here
```

## Setting Up Your Live Stream

### Option 1: Use a Streaming Service

Popular services that provide HLS streams:
- **AWS MediaLive** / **AWS MediaStore**
- **Wowza Streaming Engine**
- **OBS Studio** (with HLS output plugin)
- **FFmpeg** (convert RTMP to HLS)
- **Cloudflare Stream**
- **Vimeo Live**

### Option 2: Self-Hosted with FFmpeg

Convert your stream to HLS:

```bash
ffmpeg -i rtmp://your-stream-source \
  -c:v libx264 -c:a aac \
  -f hls -hls_time 2 -hls_list_size 3 \
  -hls_flags delete_segments \
  /path/to/output/stream.m3u8
```

### Option 3: Supabase Storage

Upload your M3U8 file and segments to Supabase Storage:

1. Upload the M3U8 playlist file
2. Upload all video segment files (.ts files)
3. Make them public or use signed URLs
4. Use the public URL in the player

## Complete Example

```html
<!-- Link to live channel -->
<a href="live/index.html?src=https://example.com/live/channel1.m3u8&title=News Channel">
  Watch News Channel Live
</a>

<!-- With subtitles -->
<a href="live/index.html?src=https://example.com/live/channel1.m3u8&title=News Channel&subtitles=https://example.com/subtitles.vtt">
  Watch News Channel Live (with subtitles)
</a>
```

## Testing Your Stream

1. Make sure your M3U8 URL is accessible
2. Test the URL directly in a browser - it should show a text playlist
3. Check that all segment files (.ts) are accessible
4. Use the live player with your URL

## Troubleshooting

### Stream won't load
- Verify the M3U8 URL is accessible
- Check CORS headers if hosting on a different domain
- Ensure HLS.js library is loaded (included in index.html)

### Buffering issues
- Check your stream bitrate
- Verify network connection
- Consider using adaptive bitrate HLS

### Audio/Video sync issues
- Ensure your encoder settings match (same framerate, etc.)
- Check segment duration in M3U8 file

## Notes

- The player automatically detects M3U8 files and uses HLS.js for playback
- Live streams don't support seeking (progress bar shows buffer status)
- The player is optimized for low-latency live streaming
- Safari has native HLS support, other browsers use HLS.js

