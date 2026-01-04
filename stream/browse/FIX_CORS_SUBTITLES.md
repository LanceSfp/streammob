# Fix CORS Issue for Subtitles

The error you're seeing is a CORS (Cross-Origin Resource Sharing) issue. Supabase storage needs to be configured to allow requests from your domain.

## Solution 1: Configure CORS in Supabase (Recommended)

1. **Go to your Supabase Dashboard**
   - Navigate to: Storage → Settings → CORS Configuration

2. **Add your domain to allowed origins:**
   ```
   https://www.lancesfp.fun
   https://lancesfp.fun
   ```

3. **Or allow all origins (for development):**
   ```
   *
   ```

4. **Save the configuration**

## Solution 2: Use Public URL Instead of Signed URL

If your VTT file doesn't need to be private, you can make it public and use the public URL:

1. **In Supabase Storage:**
   - Go to your `stream` bucket
   - Find `pbbpreview.vtt`
   - Make it public (or get the public URL)

2. **Update the HTML** to use the public URL:
   ```html
   <track kind="subtitles" src="https://zsbimpglrsvpwsbyzkbj.supabase.co/storage/v1/object/public/stream/pbbpreview.vtt" srclang="en" label="English" default>
   ```

## Solution 3: Host VTT File on Your Own Server

Upload the VTT file to your website's server and reference it locally:

1. **Upload `pbbpreview.vtt`** to your website (same domain as your HTML)

2. **Update the HTML:**
   ```html
   <track kind="subtitles" src="pbbpreview.vtt" srclang="en" label="English" default>
   ```

   Or if in a subdirectory:
   ```html
   <track kind="subtitles" src="/stream/browse/pbbpreview.vtt" srclang="en" label="English" default>
   ```

## Solution 4: Use JavaScript to Load Subtitles (Fallback)

If CORS can't be configured, we can load the VTT file via JavaScript and inject it. This is what I've added as a fallback in the code.

## Quick Fix Applied

I've added `crossorigin="anonymous"` to the video element, which tells the browser to request CORS headers. This should work if Supabase has CORS properly configured.

**Next Steps:**
1. Check Supabase CORS settings (Solution 1) - This is the best long-term solution
2. Or use the public URL (Solution 2) - Quick fix if file doesn't need to be private
3. Or host the VTT file on your server (Solution 3) - Most reliable

The `crossorigin="anonymous"` attribute I added should help, but you'll still need to configure CORS in Supabase for it to work.

