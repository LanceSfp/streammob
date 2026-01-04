# Quick Start: Convert STL to WebVTT

## Step-by-Step Instructions

### Step 1: Check if Node.js is installed

Open your terminal/command prompt and type:
```bash
node --version
```

If you see a version number (like `v18.0.0`), you're good! ✅
If you see an error, install Node.js from: https://nodejs.org/

### Step 2: Navigate to the browse folder

In your terminal, go to the folder where the script is:
```bash
cd D:\App\Website\stream\browse
```

### Step 3: Run the conversion

**Option A: Convert directly from URL (Easiest)**
```bash
node convert-stl-to-vtt.js "https://zsbimpglrsvpwsbyzkbj.supabase.co/storage/v1/object/sign/stream/pbbpreview.stl?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wZWM5YjY2MS05MzE0LTQwODAtYmU4NS1iMjJjYTc3YmUxMTMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdHJlYW0vcGJicHJldmlldy5zdGwiLCJpYXQiOjE3NjY1NDkwODgsImV4cCI6MjA4MTkwOTA4OH0.uM11vA-D2FQe81nUXfrBpazsxVb2JxUXD8ejw2O3PFg" pbbpreview.vtt
```

**Option B: Download STL first, then convert**
1. Download the STL file from your Supabase URL
2. Save it as `pbbpreview.stl` in the `stream/browse/` folder
3. Run:
```bash
node convert-stl-to-vtt.js pbbpreview.stl pbbpreview.vtt
```

### Step 4: Check the output

You should see:
```
✓ Conversion complete!
  Input: [your input]
  Output: pbbpreview.vtt
  Subtitles: [number]
```

A file named `pbbpreview.vtt` should now be in your `stream/browse/` folder.

### Step 5: Upload to Supabase

1. Go to your Supabase dashboard
2. Navigate to Storage → stream bucket
3. Upload `pbbpreview.vtt`
4. Copy the public URL (or signed URL)

### Step 6: Update your HTML

Replace the video element in `index.html` with:
```html
<video class="hero-banner__video" id="hero-video" autoplay loop playsinline preload="auto" webkit-playsinline>
  <source src="https://zsbimpglrsvpwsbyzkbj.supabase.co/storage/v1/object/sign/stream/pbbpreview.mp4?token=YOUR_VIDEO_TOKEN" type="video/mp4">
  <track kind="subtitles" src="https://zsbimpglrsvpwsbyzkbj.supabase.co/storage/v1/object/sign/stream/pbbpreview.vtt?token=YOUR_VTT_TOKEN" srclang="en" label="English" default>
</video>
```

**Important:** Remove the custom subtitle overlay div and JavaScript if you're using native WebVTT!

---

## Common Issues & Solutions

### "node: command not found"
- **Solution:** Install Node.js from https://nodejs.org/
- Restart your terminal after installation

### "Cannot find module 'fs'"
- **Solution:** Make sure you're using Node.js (not browser JavaScript)
- The script must run in Node.js, not in the browser

### "Failed to download"
- **Solution:** Check your internet connection
- Try downloading the STL file manually first, then use Option B

### "No subtitles found"
- **Solution:** The STL file might be in a different format
- Try opening it in a text editor to check its structure
- The script includes fallback parsing

### Still having issues?
Tell me what error message you're seeing, and I'll help you fix it!

