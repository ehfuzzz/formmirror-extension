# Security Policy

## Reporting Security Vulnerabilities

We take security seriously. If you discover a security vulnerability in FormMirror, please report it responsibly.

### How to Report

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, report privately via:

1. **GitHub Security Advisories**: Use [Private Vulnerability Reporting](https://github.com/formmirror/formmirror/security/advisories/new)
2. **Email**: security@formmirror.dev (coming soon)

### What to Include

Please provide:

- **Description**: Clear explanation of the vulnerability
- **Impact**: What could an attacker do?
- **Reproduction**: Step-by-step instructions to reproduce
- **Environment**: Browser version, OS, extension version
- **Suggested fix**: If you have ideas (optional but helpful)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 5 business days
- **Fix timeline**: Depends on severity (see below)

### Severity Levels

| Severity | Description | Fix Timeline |
|----------|-------------|--------------|
| **Critical** | Remote code execution, data exfiltration, privilege escalation | 1-3 days |
| **High** | Authentication bypass, significant privacy breach | 5-7 days |
| **Medium** | Limited data exposure, DoS, input validation issues | 14 days |
| **Low** | Minor issues with limited impact | 30 days |

### Disclosure Policy

- We follow **coordinated disclosure**
- We'll work with you on a fix before public disclosure
- We'll credit you in release notes (unless you prefer anonymity)
- Once fixed, we'll publish a security advisory

---

## Security Best Practices

### For Users

1. **Install from official sources** (Chrome Web Store or GitHub releases)
2. **Keep extension updated** to get security patches
3. **Review permissions** - we only request `activeTab`, `scripting`, `storage`
4. **Don't paste screenshots with passwords** (we skip password fields, but still)
5. **Trust the websites** you're filling (malicious sites can steal filled data)

### For Developers

1. **Review code changes** carefully before merging
2. **Run tests** before releasing (`npm test`)
3. **Check dependencies** for vulnerabilities (`npm audit`)
4. **Never add network requests** - breaks privacy guarantee
5. **Sanitize user input** in DOM operations

---

## Known Limitations

### Not Protected Against

⚠️ **Malicious websites**: Once we fill a form, the website can access that data (same as typing manually)

⚠️ **Compromised browser**: If Chrome itself is compromised, all extensions are at risk

⚠️ **Screen recording malware**: If your device has malware, it can capture screenshots

⚠️ **Physical access**: If someone has physical access to your device, they can extract data

### Architectural Safeguards

✅ **No network calls** - Everything runs locally (enforced by CSP)

✅ **No value storage** - We only save mapping rules, never your data

✅ **Minimal permissions** - Only what's needed for core functionality

✅ **Open source** - Code is auditable by anyone

✅ **Sandboxed workers** - OCR runs in isolated Web Workers

---

## Security Checklist

Before each release, we verify:

- [ ] No new network requests added
- [ ] No user values stored
- [ ] All dependencies updated and audited
- [ ] Tests pass (including security tests)
- [ ] CSP enforced
- [ ] No password/file input filling
- [ ] Event listeners properly cleaned up (no leaks)

---

## Past Security Issues

None reported yet. This section will list resolved vulnerabilities once we have any.

---

## Hall of Fame

Security researchers who responsibly disclose vulnerabilities will be recognized here (with permission).

*No entries yet - be the first!*

---

## Contact

- **Security Email**: security@formmirror.dev (coming soon)
- **GitHub**: [Private Vulnerability Reporting](https://github.com/formmirror/formmirror/security)
- **Public Issues**: Only for non-security bugs

---

**Thank you for helping keep FormMirror secure!** 🔒

