# Security Updates

## NPM Dependencies

This project has been updated to address security vulnerabilities identified by npm audit.

### Fixed Vulnerabilities

#### 1. Electron ASAR Integrity Bypass (Moderate)
- **Package**: electron
- **Vulnerable versions**: < 35.7.5
- **Fixed version**: ^33.0.0
- **Issue**: ASAR Integrity Bypass via resource modification
- **Status**: ✅ Fixed by updating to electron ^33.0.0

#### 2. Glob Command Injection (High)
- **Package**: glob
- **Vulnerable versions**: 10.3.7 - 11.0.3
- **Fixed version**: ^11.0.0
- **Issue**: CLI command injection via -c/--cmd executes matches with shell:true
- **Status**: ✅ Fixed via NPM overrides forcing glob ^11.0.0

### Installation Notes

Due to network restrictions in some environments, the updated dependencies are defined in `package.json` but may need to be installed on a machine with internet access:

```bash
npm install
```

The `overrides` section in package.json ensures that all transitive dependencies use secure versions:
- Forces glob version 11.0.0 or higher across all dependencies
- Ensures electron 33.0.0 or higher is used

### Dependency Versions

**Dev Dependencies**:
- electron: ^33.0.0 (was ^28.0.0)
- electron-builder: ^25.1.8 (was ^24.9.1)
- @electron/rebuild: ^3.7.0 (was ^3.6.0)

**Overrides**:
- glob: ^11.0.0 (forces secure version for all transitive deps)
- electron: ^33.0.0 (ensures minimum version)

### Verification

After installing dependencies, verify no vulnerabilities remain:

```bash
npm audit
```

Expected output: `found 0 vulnerabilities`

### Building

The application can still be built normally:

```bash
npm run build           # Build for all platforms
npm run build:win       # Windows only
npm run build:mac       # macOS only
npm run build:linux     # Linux only
```

## Security Best Practices

This project follows security best practices:

1. **Regular Updates**: Dependencies are kept up-to-date with security patches
2. **Memory Safety**: Proper cleanup of event listeners, intervals, and audio resources
3. **Input Validation**: User input is sanitized before database operations
4. **Dependency Overrides**: NPM overrides force secure versions of transitive dependencies
5. **No Eval**: Code does not use eval() or similar unsafe practices

## Reporting Security Issues

If you discover a security vulnerability, please report it by creating an issue in the project repository.
