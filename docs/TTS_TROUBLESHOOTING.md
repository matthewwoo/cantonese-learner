# TTS (Text-to-Speech) Troubleshooting Guide

## Common Issues and Solutions

### 1. No Audio Playing
**Symptoms:** Clicking the 🔊 button but no sound is heard

**Possible Causes:**
- Browser autoplay restrictions
- No Chinese/Cantonese voices installed
- Browser doesn't support Web Speech API
- Audio is muted or volume is too low

**Solutions:**
1. **Check browser support:** Use Chrome, Edge, or Safari (Firefox has limited TTS support)
2. **Enable autoplay:** Click anywhere on the page first, then try TTS
3. **Check system audio:** Ensure your device volume is up and not muted
4. **Use the TTS Debugger:** Click "Show TTS Debugger" in the chat to test and diagnose issues

### 2. Wrong Language/Voice
**Symptoms:** TTS speaks in English or wrong dialect

**Solutions:**
1. **Install Chinese voices:** 
   - Windows: Settings > Time & Language > Language > Add language > Chinese (Hong Kong)
   - macOS: System Preferences > Language & Region > Add Chinese (Hong Kong)
   - Chrome: May use Google's online voices automatically
2. **Check voice selection:** Use the TTS Debugger to see available voices

### 3. TTS Not Working in Specific Browsers

**Chrome/Edge:** ✅ Best support
- Should work out of the box
- Uses Google's online voices

**Safari:** ✅ Good support
- May require user interaction first
- Uses system voices

**Firefox:** ⚠️ Limited support
- Web Speech API support is incomplete
- May not work reliably

**Mobile browsers:** ⚠️ Variable support
- iOS Safari: Limited TTS support
- Android Chrome: Should work

### 4. Browser Console Errors

**Common errors:**
- `speechSynthesis is not supported`: Browser doesn't support TTS
- `voices not loaded`: Voices haven't loaded yet
- `autoplay blocked`: Browser blocked autoplay

**Solutions:**
1. Check browser console for specific error messages
2. Try refreshing the page
3. Ensure user interaction before TTS (click somewhere first)

### 5. Using the TTS Debugger

The TTS Debugger (available in the chat page) can help diagnose issues:

1. **Click "Show TTS Debugger"** in the chat interface
2. **Check Voice Information** to see available voices
3. **Test with sample text** using the test controls
4. **Review debug log** for error messages
5. **Try common words** to test basic functionality

### 6. Manual Testing

You can test TTS manually in the browser console:

```javascript
// Test basic TTS support
if ('speechSynthesis' in window) {
  console.log('TTS supported');
  
  // Test speaking
  const utterance = new SpeechSynthesisUtterance('你好');
  utterance.lang = 'zh-HK';
  speechSynthesis.speak(utterance);
} else {
  console.log('TTS not supported');
}
```

### 7. System-Level Solutions

**Windows:**
1. Install Chinese language pack
2. Add Chinese (Hong Kong) as a language
3. Restart browser after language installation

**macOS:**
1. System Preferences > Language & Region
2. Add Chinese (Hong Kong)
3. Restart browser

**Linux:**
1. Install speech synthesis packages: `sudo apt-get install speech-dispatcher`
2. Install Chinese voices if available

### 8. Alternative Solutions

If TTS still doesn't work:

1. **Use a different browser** (Chrome recommended)
2. **Check system language settings**
3. **Try on a different device**
4. **Report the issue** with browser and OS information

### 9. Getting Help

When reporting TTS issues, include:
- Browser name and version
- Operating system
- Error messages from browser console
- Output from TTS Debugger
- Steps to reproduce the issue

## Quick Fix Checklist

- [ ] Try clicking somewhere on the page before using TTS
- [ ] Check if audio is muted
- [ ] Use Chrome or Edge browser
- [ ] Open TTS Debugger and run tests
- [ ] Check browser console for errors
- [ ] Try refreshing the page
- [ ] Test with simple text like "你好"
