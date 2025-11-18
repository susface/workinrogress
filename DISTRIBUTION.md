# Distribution Guide

## Why Discord/Antivirus Flag the .exe as Malicious

### The Problem
When you share the built .exe file with friends, Discord and antivirus software may flag it as potentially malicious. **This is a FALSE POSITIVE** and happens for these reasons:

1. **Unsigned Binary** - The executable is not digitally signed with a code signing certificate
2. **Lack of Reputation** - New/unknown executables don't have established trust with antivirus vendors
3. **Discord's Caution** - Discord aggressively scans executables to protect users from malware
4. **Electron Apps** - Some AVs are suspicious of Electron apps because they can run arbitrary JavaScript

### This is NORMAL for unsigned indie applications!

## Solutions

### Option 1: Distribute via Trusted Platforms (RECOMMENDED)
Upload your installer to trusted platforms that scan and verify files:
- **GitHub Releases** - Most trusted, free hosting
- **itch.io** - Gaming platform that verifies uploads
- **SourceForge** - Established platform with virus scanning

**Steps for GitHub Releases:**
1. Create a GitHub repository for your project
2. Go to Releases → Create new release
3. Upload the installer .exe file
4. Share the GitHub release link with friends

### Option 2: Code Signing Certificate (Professional Solution)
Purchase a code signing certificate to digitally sign your executable:

**Providers:**
- Sectigo (formerly Comodo) - ~$200-400/year
- DigiCert - ~$400-600/year
- SSL.com - ~$200-300/year

**Process:**
1. Purchase certificate
2. Verify your identity (required by law)
3. Receive certificate file
4. Configure in package.json:
```json
"win": {
  "certificateFile": "path/to/cert.p12",
  "certificatePassword": "your-password",
  "signingHashAlgorithms": ["sha256"],
  "sign": "./customSign.js"
}
```

**Note:** This is expensive and takes time (1-7 days for verification)

### Option 3: User Workarounds (For Friends)

**For Discord:**
1. Upload the .exe file
2. Discord will scan and flag it
3. Have the recipient click "Keep File" or "Download Anyway"
4. Alternatively: Upload to Google Drive/Dropbox and share link instead

**For Windows Defender:**
1. Click "More Info" when SmartScreen appears
2. Click "Run Anyway"

**For Other Antivirus:**
1. Add exception/whitelist for the file
2. Or temporarily disable AV during install (not recommended)

### Option 4: Self-Signed Certificate (Free but Limited)
Create a self-signed certificate (won't eliminate warnings but shows effort):

```bash
# Using Windows SDK
makecert -r -pe -n "CN=Your Name" -ss My -sr CurrentUser

# Then sign the exe
signtool sign /a /n "Your Name" /t http://timestamp.digicert.com YourInstaller.exe
```

**Limitation:** Users still get warnings because it's not from a trusted CA

## Best Practices for Distribution

1. **Include SHA256 Hash** - Let users verify file integrity
   ```bash
   certutil -hashfile CoverFlowGameLauncher-Setup.exe SHA256
   ```

2. **Create Release Notes** - Explain what the software does

3. **Add Antivirus Scan Results** - Upload to VirusTotal and share report

4. **Open Source** - Make code publicly available (builds trust)

5. **Gradual Distribution** - Start with GitHub/itch.io to build reputation

## Recommended Distribution Method

**For sharing with friends:**
```
1. Build the installer: npm run build:win
2. Upload to GitHub Releases
3. Share the release page link:
   https://github.com/yourusername/yourrepo/releases/latest
4. Include installation instructions
```

**What to tell friends:**
```
"Windows/Discord may show a security warning because this is an
unsigned indie application. This is normal for free software.
Click 'More Info' then 'Run Anyway' to install. The source code
is available at [GitHub link] if you want to review it."
```

## Security Notes

**Your application is safe because:**
- ✅ No code obfuscation
- ✅ No external network calls except to thunderstore.io (for mods)
- ✅ Uses legitimate libraries (Electron, better-sqlite3)
- ✅ No collection of personal data
- ✅ Open source code available for review

**To prove safety:**
1. Upload installer to VirusTotal: https://www.virustotal.com
2. Share the VirusTotal report link with users
3. Most legitimate AVs will show 0 detections

## Alternative: Portable Version

Consider building a portable .zip instead:
```json
"win": {
  "target": ["zip", "nsis"]
}
```

Zip files are less likely to be flagged than installers!

## Summary

**Free Solutions:**
- GitHub Releases ⭐ BEST
- itch.io
- VirusTotal scan results

**Paid Solution:**
- Code signing certificate ($200-600/year)

**Quick Fix:**
- Tell friends to click "Run Anyway"
