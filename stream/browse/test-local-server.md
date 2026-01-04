# Testing Locally with HTTP Server

The CORS error you're seeing is **expected** when viewing HTML files locally with the `file://` protocol. Browsers block loading resources from different origins (like Supabase) for security reasons.

## Solution 1: Test on Your Live Website (Recommended)

When you upload your files to your website, the subtitles will work perfectly because:
- Your website and Supabase are both served over HTTPS
- CORS is properly configured on Supabase storage

**Just upload your files and test on your live site!**

---

## Solution 2: Test Locally with a Simple HTTP Server

If you want to test locally, you need to serve your files through an HTTP server instead of opening them directly.

### Option A: Python HTTP Server (Easiest)

1. **Open PowerShell or Command Prompt**
2. **Navigate to your website folder:**
   ```bash
   cd D:\App\Website
   ```

3. **Start a local server:**
   
   **Python 3:**
   ```bash
   python -m http.server 8000
   ```
   
   **Python 2:**
   ```bash
   python -m SimpleHTTPServer 8000
   ```

4. **Open your browser and go to:**
   ```
   http://localhost:8000/stream/browse/
   ```

5. **The subtitles should now work!**

### Option B: Node.js HTTP Server

1. **Install http-server globally:**
   ```bash
   npm install -g http-server
   ```

2. **Navigate to your website folder:**
   ```bash
   cd D:\App\Website
   ```

3. **Start the server:**
   ```bash
   http-server -p 8000
   ```

4. **Open your browser:**
   ```
   http://localhost:8000/stream/browse/
   ```

### Option C: VS Code Live Server Extension

1. **Install "Live Server" extension in VS Code**
2. **Right-click on `index.html`**
3. **Select "Open with Live Server"**

---

## Why This Happens

- **`file://` protocol**: Browsers treat each file as a unique security origin
- **CORS (Cross-Origin Resource Sharing)**: Browsers block requests to different origins from `file://` pages
- **HTTPS websites**: When served from a web server, CORS policies allow requests to Supabase

---

## Quick Fix: Re-convert VTT File

I've also updated the conversion script to better clean control characters. If you want to regenerate a cleaner VTT file:

```bash
node convert-stl-to-vtt.js "YOUR_STL_URL" pbbpreview.vtt
```

The updated script now removes control characters that might cause display issues.

---

## Bottom Line

**The error is normal when viewing locally. Your subtitles will work perfectly on your live website!** 🎉

