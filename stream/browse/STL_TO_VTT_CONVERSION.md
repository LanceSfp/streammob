# STL to WebVTT Conversion Guide

This guide explains how to convert your STL subtitle file to WebVTT format for use with HTML5 video.

## Method 1: Using the Node.js Script (Recommended)

### Prerequisites
- Node.js installed on your computer ([Download here](https://nodejs.org/))

### Steps

1. **Open your terminal/command prompt** in the `stream/browse/` directory

2. **Run the conversion script:**
   ```bash
   node convert-stl-to-vtt.js "https://zsbimpglrsvpwsbyzkbj.supabase.co/storage/v1/object/sign/stream/pbbpreview.stl?token=YOUR_TOKEN" pbbpreview.vtt
   ```
   
   Or if you've downloaded the STL file locally:
   ```bash
   node convert-stl-to-vtt.js pbbpreview.stl pbbpreview.vtt
   ```

3. **The script will:**
   - Download/read the STL file
   - Parse the subtitle data
   - Convert it to WebVTT format
   - Save it as `pbbpreview.vtt`

4. **Upload the `.vtt` file** to your Supabase storage (same location as your video)

5. **Update your HTML** to use the VTT file instead of STL

---

## Method 2: Online Converters

### Option A: Subtitle Edit (Desktop App)
1. Download [Subtitle Edit](https://github.com/SubtitleEdit/subtitleedit/releases) (free, open-source)
2. Open your STL file in Subtitle Edit
3. Go to `File` → `Save As...`
4. Choose "WebVTT" format
5. Save the file

### Option B: Online Tools
- **Subtitle Converter**: https://www.3playmedia.com/tools/subtitle-converter/
- **Convertio**: https://convertio.co/stl-vtt/
- **CloudConvert**: https://cloudconvert.com/stl-to-vtt

**Note:** Some online tools may have file size limits or require uploading files.

---

## Method 3: Python Script (Alternative)

If you prefer Python, here's a simple script:

```python
import re
import sys

def parse_stl_timecode(time_str):
    parts = time_str.split(':')
    if len(parts) >= 3:
        hours = int(parts[0])
        minutes = int(parts[1])
        seconds = int(parts[2])
        frames = int(parts[3]) if len(parts) > 3 else 0
        frame_ms = (frames / 25) * 1000
        return (hours * 3600 + minutes * 60 + seconds) * 1000 + frame_ms
    return 0

def ms_to_vtt_time(ms):
    hours = ms // 3600000
    minutes = (ms % 3600000) // 60000
    secs = (ms % 60000) // 1000
    millis = ms % 1000
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"

def convert_stl_to_vtt(input_file, output_file):
    with open(input_file, 'rb') as f:
        content = f.read().decode('latin-1', errors='ignore')
    
    # Parse STL format (simplified)
    subtitles = []
    lines = content.split('\n')
    current_sub = None
    text_buffer = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        timecodes = re.findall(r'\d{1,2}:\d{2}:\d{2}:?\d{0,2}', line)
        if len(timecodes) >= 2:
            if current_sub and text_buffer:
                current_sub['text'] = ' '.join(text_buffer).strip()
                if current_sub['text']:
                    subtitles.append(current_sub)
            
            current_sub = {
                'start': parse_stl_timecode(timecodes[0]),
                'end': parse_stl_timecode(timecodes[1]),
                'text': ''
            }
            text_buffer = []
        elif current_sub and line and not re.match(r'^[\d\s:]+$', line):
            text_buffer.append(line)
    
    if current_sub and text_buffer:
        current_sub['text'] = ' '.join(text_buffer).strip()
        if current_sub['text']:
            subtitles.append(current_sub)
    
    # Write VTT file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('WEBVTT\n\n')
        for i, sub in enumerate(subtitles):
            start = ms_to_vtt_time(sub['start'])
            end = ms_to_vtt_time(sub['end'])
            text = sub['text'].replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            f.write(f"{i+1}\n{start} --> {end}\n{text}\n\n")
    
    print(f"Converted {len(subtitles)} subtitles to {output_file}")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python convert_stl_to_vtt.py input.stl output.vtt")
        sys.exit(1)
    convert_stl_to_vtt(sys.argv[1], sys.argv[2])
```

Save as `convert_stl_to_vtt.py` and run:
```bash
python convert_stl_to_vtt.py pbbpreview.stl pbbpreview.vtt
```

---

## After Conversion: Update Your HTML

Once you have the `.vtt` file, update your video element:

```html
<video class="hero-banner__video" id="hero-video" autoplay loop playsinline>
  <source src="your-video.mp4" type="video/mp4">
  <track kind="subtitles" src="pbbpreview.vtt" srclang="en" label="English" default>
</video>
```

The browser will automatically display the subtitles using the native HTML5 subtitle support!

---

## Troubleshooting

### Issue: "No subtitles found"
- The STL file might be in a different format
- Try opening it in a text editor to inspect the structure
- The script includes fallback parsing for dialogue patterns

### Issue: Timecodes are wrong
- STL files can use different frame rates (25fps, 30fps, etc.)
- Adjust the frame rate conversion in the script if needed

### Issue: Special characters not displaying
- Make sure the VTT file is saved with UTF-8 encoding
- The script automatically escapes HTML entities

---

## Quick Start (Recommended)

1. **Download the STL file** from your Supabase URL
2. **Run the Node.js script:**
   ```bash
   node convert-stl-to-vtt.js pbbpreview.stl pbbpreview.vtt
   ```
3. **Upload `pbbpreview.vtt`** to Supabase storage
4. **Update your HTML** to use the VTT file
5. **Done!** Subtitles will work natively in the browser

