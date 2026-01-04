/**
 * STL to WebVTT Converter
 * 
 * Usage:
 *   node convert-stl-to-vtt.js input.stl output.vtt
 * 
 * Or with the URL:
 *   node convert-stl-to-vtt.js https://your-url.stl output.vtt
 */

const fs = require('fs');
const https = require('https');
const http = require('http');

// Parse STL timecode to seconds
function parseSTLTimecode(timeStr) {
  // STL format: HH:MM:SS:FF (frames at 25fps typically)
  const parts = timeStr.split(':');
  if (parts.length >= 3) {
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const seconds = parseInt(parts[2], 10) || 0;
    const frames = parts[3] ? parseInt(parts[3], 10) : 0;
    
    // Convert frames to milliseconds (assuming 25fps)
    const frameMs = (frames / 25) * 1000;
    const totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000 + frameMs;
    
    return totalMs;
  }
  return 0;
}

// Convert milliseconds to WebVTT time format (HH:MM:SS.mmm)
function msToVTTTime(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

// Parse STL subtitle file
function parseSTL(stlText) {
  const subtitles = [];
  
  // Clean the text - remove null bytes and control characters
  let cleanText = stlText.replace(/\0/g, '');
  cleanText = cleanText.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  
  const lines = cleanText.split(/\r?\n/);
  
  let currentSubtitle = null;
  let textBuffer = [];
  let subtitleIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;
    
    // Look for timecode patterns (HH:MM:SS:FF or HH:MM:SS)
    const timecodePattern = /(\d{1,2}):(\d{2}):(\d{2}):?(\d{2})?/g;
    const timecodeMatches = [...line.matchAll(timecodePattern)];
    
    if (timecodeMatches.length >= 2) {
      // Found start and end timecodes
      const startTime = timecodeMatches[0][0];
      const endTime = timecodeMatches[1][0];
      
      // Save previous subtitle
      if (currentSubtitle && textBuffer.length > 0) {
        currentSubtitle.text = textBuffer.join(' ').trim();
        if (currentSubtitle.text && currentSubtitle.text.length > 0) {
          subtitles.push(currentSubtitle);
        }
      }
      
      // Start new subtitle
      currentSubtitle = {
        start: parseSTLTimecode(startTime),
        end: parseSTLTimecode(endTime),
        text: ''
      };
      textBuffer = [];
      subtitleIndex++;
    } else if (currentSubtitle) {
      // This might be text content
      // Filter out lines that are just numbers or timecodes
      if (!/^[\d\s:]+$/.test(line) && line.length > 1) {
        // Remove any remaining control characters but keep readable text
        line = line.replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '');
        if (line.length > 0) {
          textBuffer.push(line);
        }
      }
    }
  }
  
  // Add last subtitle
  if (currentSubtitle && textBuffer.length > 0) {
    currentSubtitle.text = textBuffer.join(' ').trim();
    if (currentSubtitle.text && currentSubtitle.text.length > 0) {
      subtitles.push(currentSubtitle);
    }
  }
  
  // If no subtitles found with timecodes, try alternative parsing
  if (subtitles.length === 0) {
    console.warn('No timecodes found, trying alternative parsing...');
    
    // Look for dialogue patterns like "Vianca: Kuya!"
    const dialoguePattern = /([A-Za-z]+):\s*([^\n]+)/g;
    let match;
    let timeOffset = 0;
    
    while ((match = dialoguePattern.exec(cleanText)) !== null && subtitles.length < 200) {
      const speaker = match[1];
      const text = match[2].trim();
      if (text && text.length > 0) {
        subtitles.push({
          start: timeOffset * 1000,
          end: (timeOffset + 3) * 1000, // 3 seconds per subtitle
          text: speaker + ': ' + text
        });
        timeOffset += 3.5; // Small gap between subtitles
      }
    }
  }
  
  return subtitles;
}

// Convert subtitles to WebVTT format
function convertToVTT(subtitles) {
  let vtt = 'WEBVTT\n\n';
  
  subtitles.forEach((sub, index) => {
    const startTime = msToVTTTime(sub.start);
    const endTime = msToVTTTime(sub.end);
    
    // Clean text: remove control characters and null bytes
    let text = sub.text
      .replace(/\0/g, '') // Remove null bytes
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Remove control characters
      .trim();
    
    // Skip if text is empty after cleaning
    if (!text) return;
    
    // Escape HTML entities and format text
    text = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
    
    vtt += `${index + 1}\n`;
    vtt += `${startTime} --> ${endTime}\n`;
    vtt += `${text}\n\n`;
  });
  
  return vtt;
}

// Download file from URL
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      let data = '';
      response.setEncoding('binary');
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        resolve(Buffer.from(data, 'binary'));
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node convert-stl-to-vtt.js <input.stl or URL> <output.vtt>');
    console.log('\nExample:');
    console.log('  node convert-stl-to-vtt.js input.stl output.vtt');
    console.log('  node convert-stl-to-vtt.js https://example.com/subtitle.stl output.vtt');
    process.exit(1);
  }
  
  const input = args[0];
  const output = args[1];
  
  try {
    let stlContent;
    
    // Check if input is a URL
    if (input.startsWith('http://') || input.startsWith('https://')) {
      console.log(`Downloading STL file from: ${input}`);
      const buffer = await downloadFile(input);
      stlContent = buffer.toString('binary');
    } else {
      // Read from local file
      console.log(`Reading STL file: ${input}`);
      stlContent = fs.readFileSync(input, 'binary');
    }
    
    console.log('Parsing STL file...');
    const subtitles = parseSTL(stlContent);
    
    if (subtitles.length === 0) {
      console.error('Error: No subtitles found in STL file');
      process.exit(1);
    }
    
    console.log(`Found ${subtitles.length} subtitles`);
    
    console.log('Converting to WebVTT format...');
    const vttContent = convertToVTT(subtitles);
    
    console.log(`Writing WebVTT file: ${output}`);
    fs.writeFileSync(output, vttContent, 'utf8');
    
    console.log('✓ Conversion complete!');
    console.log(`  Input: ${input}`);
    console.log(`  Output: ${output}`);
    console.log(`  Subtitles: ${subtitles.length}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the converter
main();

