# Troubleshooting Guide

## NPM Install Errors on Windows

### Error: better-sqlite3 build failure with Node.js v22

**Symptoms:**
```
gyp ERR! configure error
gyp ERR! stack TypeError [ERR_INVALID_ARG_TYPE]: The "original" argument must be of type function
```

**Cause:** Node.js v22 has compatibility issues with the version of node-gyp used by better-sqlite3.

**Solutions (try in order):**

#### Solution 1: Use Node.js v20 LTS (Recommended)

1. **Download Node.js v20 LTS** from https://nodejs.org/
   - Select "20.x.x LTS" version
   - Install it (will replace Node.js v22)

2. **Verify installation:**
   ```bash
   node --version
   # Should show v20.x.x
   ```

3. **Clean and reinstall:**
   ```bash
   # Delete node_modules folder (see below if you get permission errors)
   npm install
   ```

#### Solution 2: Clean Node Modules First

If you get permission errors deleting node_modules:

**Option A: Close all programs**
1. Close VS Code, any terminals, and file explorers
2. Delete `node_modules` folder manually
3. Run `npm install` again

**Option B: Use PowerShell as Administrator**
```powershell
# Run PowerShell as Administrator
cd "C:\Users\trigu\Downloads\workinrogress-main (2)\workinrogress-main"

# Force delete node_modules
Remove-Item -Path .\node_modules -Recurse -Force

# Clean npm cache
npm cache clean --force

# Reinstall
npm install
```

**Option C: Use rimraf (cross-platform delete)**
```bash
# Install rimraf globally
npm install -g rimraf

# Delete node_modules
rimraf node_modules

# Clean cache
npm cache clean --force

# Reinstall
npm install
```

#### Solution 3: Update better-sqlite3 (if using Node.js 22+)

Edit `package.json` and update better-sqlite3:
```json
"dependencies": {
  "better-sqlite3": "^11.0.0"
}
```

Then:
```bash
npm cache clean --force
npm install
```

---

## Windows Build Tools

If you continue to have build issues, you may need to install Windows Build Tools:

### Install Visual Studio Build Tools

1. **Download Visual Studio Build Tools:**
   - Go to https://visualstudio.microsoft.com/downloads/
   - Scroll down to "Tools for Visual Studio"
   - Download "Build Tools for Visual Studio 2022"

2. **Install with C++ tools:**
   - Run the installer
   - Select "Desktop development with C++"
   - Install

3. **Verify installation:**
   ```bash
   npm config get msvs_version
   ```

### Alternative: Use windows-build-tools package

```bash
# Run PowerShell as Administrator
npm install --global windows-build-tools
```

---

## Electron-specific Issues

### Error: Electron binary download fails

If electron fails to download:

1. **Check your internet connection**
2. **Try with different registry:**
   ```bash
   npm config set registry https://registry.npmjs.org/
   npm install
   ```

3. **Use electron-download mirror:**
   ```bash
   # Set environment variable before npm install
   set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
   npm install
   ```

4. **Skip electron postinstall temporarily:**
   ```bash
   npm install --ignore-scripts
   # Then manually run
   npm rebuild electron
   ```

---

## Path Issues

### Error: Path contains spaces or special characters

Your path has spaces: `workinrogress-main (2)`

**Solution:** Move the project to a path without spaces:

```bash
# Good paths:
C:\Users\trigu\projects\workinrogress-main
C:\dev\workinrogress-main
D:\projects\workinrogress-main

# Bad paths (avoid):
C:\Users\trigu\Downloads\workinrogress-main (2)\workinrogress-main
```

---

## Quick Fix Commands

Try these in order:

```bash
# 1. Clean everything
rimraf node_modules
npm cache clean --force

# 2. Reinstall with verbose logging
npm install --verbose

# 3. If that fails, rebuild only
npm rebuild

# 4. If using Electron, rebuild native modules
npm run postinstall
```

---

## Still Having Issues?

### Get detailed logs:

```bash
npm install --verbose --foreground-scripts 2>&1 | Out-File install-log.txt
```

Then check `install-log.txt` for detailed error information.

### Check your environment:

```bash
# Node version (should be v20.x.x)
node --version

# NPM version
npm --version

# Python version (should be 3.7-3.12)
python --version

# Check if Python is in PATH
where python
```

### Required software:
- ✅ Node.js v20 LTS (not v22)
- ✅ Python 3.7 - 3.12 (you have 3.12.4 - OK)
- ✅ Visual Studio Build Tools or windows-build-tools

---

## Recommended Installation Steps (Fresh Start)

1. **Install Node.js v20 LTS**
   - Download from https://nodejs.org/
   - Use the LTS version (not Current)

2. **Move project to simple path**
   ```bash
   # Example:
   mkdir C:\dev
   move "C:\Users\trigu\Downloads\workinrogress-main (2)\workinrogress-main" C:\dev\coverflow
   cd C:\dev\coverflow
   ```

3. **Clean install**
   ```bash
   # Delete old files
   Remove-Item -Path .\node_modules -Recurse -Force -ErrorAction SilentlyContinue
   Remove-Item -Path .\package-lock.json -Force -ErrorAction SilentlyContinue

   # Clear cache
   npm cache clean --force

   # Install
   npm install
   ```

4. **If better-sqlite3 still fails, install build tools**
   ```bash
   npm install --global windows-build-tools
   ```

5. **Try install again**
   ```bash
   npm install
   ```

---

## Contact

If none of these solutions work, please provide:
1. Output of `node --version`
2. Output of `npm --version`
3. Output of `python --version`
4. Full error log from `npm install --verbose`
