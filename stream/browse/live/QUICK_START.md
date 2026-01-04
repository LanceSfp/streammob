# Quick Start: Adding Live Streams

## Stream Input Type: **HLS (M3U8)** - RECOMMENDED

The live player is optimized for **HLS (HTTP Live Streaming)** format, which uses `.m3u8` playlist files.

## How to Add a Live Stream

### Step 1: Get Your Stream URL

You need an HLS stream URL that looks like:
```
https://example.com/live/stream.m3u8
```

### Step 2: Use URL Parameters

Navigate to the live player with your stream URL:

```
stream/browse/live/index.html?src=YOUR_STREAM_URL&title=Channel Name
```

**Example:**
```
stream/browse/live/index.html?src=https://example.com/live/channel1.m3u8&title=News Channel
```

### Step 3: Add Links to Browse Page

Update the "Live Channels" section in `stream/browse/index.html`:

```html
<article class="row">
  <h2 class="row__title">Live Channels</h2>
  <div class="row__rail">
    <a href="live/index.html?src=https://example.com/live/channel1.m3u8&title=Channel 1" 
       class="tile"
       style="background-image: url('pbbaals.gif'); background-size: cover; background-position: center;">
    </a>
    <a href="live/index.html?src=https://example.com/live/channel2.m3u8&title=Channel 2" 
       class="tile"
       style="background-image: url('lslh.gif'); background-size: cover; background-position: center;">
    </a>
  </div>
</article>
```

## URL Parameters

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `src` | ✅ Yes | Stream URL (M3U8 file) | `https://example.com/stream.m3u8` |
| `title` | ❌ No | Channel name | `My Live Channel` |
| `subtitles` | ❌ No | VTT subtitle file URL | `https://example.com/subtitles.vtt` |

## Stream Format Examples

### ✅ HLS Stream (Best for Live)
```
https://example.com/live/stream.m3u8
https://your-project.supabase.co/storage/v1/object/public/stream/live.m3u8
```

### ⚠️ Regular Video (Not ideal for live)
```
https://example.com/video.mp4
```

## Complete Example

```html
<!-- In your browse page -->
<a href="live/index.html?src=https://example.com/live/news.m3u8&title=News Channel">
  Watch News Channel Live
</a>

<!-- With subtitles -->
<a href="live/index.html?src=https://example.com/live/news.m3u8&title=News Channel&subtitles=https://example.com/subtitles.vtt">
  Watch News Channel Live (with subtitles)
</a>
```

## Testing

1. Make sure your M3U8 URL is publicly accessible
2. Test the URL in a browser - it should show a text playlist
3. Use the live player with your URL
4. The player will automatically detect it's an M3U8 file and use HLS.js

## Notes

- **HLS/M3U8** is the recommended format for live streaming
- The player automatically detects `.m3u8` files
- Live streams don't support seeking (progress bar shows buffer status)
- Works best with adaptive bitrate HLS streams

