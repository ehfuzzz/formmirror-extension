# Contributing to FormMirror

Thank you for your interest in contributing! FormMirror is a privacy-first, open-source project, and we welcome contributions from the community.

---

## 🌟 Ways to Contribute

- **Bug Reports**: Found an issue? [Open a bug report](https://github.com/formmirror/formmirror/issues/new?labels=bug)
- **Feature Requests**: Have an idea? [Suggest a feature](https://github.com/formmirror/formmirror/issues/new?labels=enhancement)
- **Code**: Submit pull requests for bug fixes or new features
- **Documentation**: Improve README, code comments, or add tutorials
- **Synonyms**: Add field label synonyms for better matching
- **Languages**: Add Tesseract language support
- **Testing**: Write tests or report test failures

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Chrome** (latest stable)
- **Git**

### Setup

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/formmirror.git
cd formmirror

# Install dependencies
npm install

# Start development server
npm run dev

# Load the extension in Chrome:
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the `dist/` directory
```

### Project Structure

```
formmirror/
├── src/
│   ├── core/           # Core logic (OCR, matching, filling)
│   │   ├── ocr.ts      # OCR engine
│   │   ├── kv-extract.ts # Key-value extraction
│   │   ├── dom-scan.ts # Field discovery
│   │   ├── match.ts    # Similarity scoring
│   │   ├── fill.ts     # Form filling
│   │   ├── rules.ts    # Storage (no values)
│   │   ├── types.ts    # TypeScript types
│   │   └── synonyms.json # Label synonyms
│   ├── popup/          # Popup UI (Preact)
│   ├── content/        # Content script + overlay
│   ├── background/     # Service worker
│   └── workers/        # Web Workers (OCR, preprocessing)
├── tests/              # Unit & integration tests
├── public/             # Static assets (icons, models)
└── docs/               # Documentation
```

---

## 🛠️ Development Workflow

### Making Changes

1. **Create a branch**: `git checkout -b feature/your-feature-name`
2. **Make changes**: Edit code, add tests
3. **Test locally**: Load in Chrome, test manually + automated tests
4. **Commit**: Use clear, descriptive commit messages
5. **Push**: `git push origin feature/your-feature-name`
6. **Pull Request**: Open a PR on GitHub

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: add date normalization for EU formats`
- `fix: prevent crash when label has no text`
- `docs: update README with new screenshots`
- `test: add unit tests for match.ts`
- `refactor: simplify OCR worker initialization`

### Code Style

- **TypeScript**: Use strict mode, avoid `any` when possible
- **Formatting**: Run `npm run format` (Prettier)
- **Linting**: Run `npm run lint` (ESLint)
- **Comments**: Explain *why*, not *what* (code should be self-documenting)

### Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:ui

# Run E2E tests
npm run test:e2e

# Type checking
npm run type-check
```

**Test Requirements**:
- New features must include tests
- Bug fixes should include regression tests
- Aim for >80% coverage on core logic

---

## 📝 Adding Synonyms

Synonyms improve matching accuracy. Edit `src/core/synonyms.json`:

```json
{
  "email": ["email address", "e-mail", "electronic mail"],
  "phone": ["telephone", "mobile", "cell", "contact number"],
  "your new term": ["synonym1", "synonym2"]
}
```

**Guidelines**:
- Include common variations (e.g., "zip code" vs "zipcode")
- Add regional differences (e.g., "postal code" for non-US)
- Avoid overly broad terms that might cause false matches

---

## 🌍 Adding Languages

FormMirror uses Tesseract.js for OCR, which supports 100+ languages.

### Steps

1. **Download traineddata**: Get the `.traineddata` file from [tessdata](https://github.com/tesseract-ocr/tessdata)
2. **Add to assets**: Place in `public/assets/tesseract/lang-data/`
3. **Update settings**: Add language option to settings UI (future)
4. **Test**: Verify OCR works with sample images in that language

---

## 🐛 Reporting Bugs

### Before Reporting

1. **Search existing issues**: Your bug might already be reported
2. **Test in latest version**: Update the extension and try again
3. **Isolate the issue**: Can you reproduce it consistently?

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what went wrong.

**To Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What should have happened?

**Screenshots**
If applicable, add screenshots (redact sensitive info!)

**Environment**
- Chrome version:
- Extension version:
- OS:

**Additional context**
Any other details (console errors, etc.)
```

---

## 💡 Feature Requests

We love new ideas! When suggesting a feature:

- **Explain the use case**: Why is this useful?
- **Consider privacy**: Does it require network access? (We avoid that)
- **Sketch the UX**: How would users interact with it?
- **Estimate scope**: Small tweak or major feature?

---

## 🔒 Security

**Please DO NOT open public issues for security vulnerabilities.**

Report privately via:
- **Email**: security@formmirror.dev (coming soon)
- **GitHub**: Use [Private Vulnerability Reporting](https://github.com/formmirror/formmirror/security/advisories/new)

See [SECURITY.md](./SECURITY.md) for our security policy.

---

## 📜 Code of Conduct

### Our Pledge

We're committed to a welcoming, inclusive, and harassment-free community.

### Guidelines

- **Be respectful**: Disagree with ideas, not people
- **Be inclusive**: Welcome newcomers, help beginners
- **Be patient**: Not everyone has the same background or expertise
- **Be constructive**: Focus on solutions, not blame

### Unacceptable Behavior

- Harassment, discrimination, or personal attacks
- Trolling, insulting comments, or off-topic disruptions
- Publishing others' private information without consent

**Enforcement**: Violations may result in temporary or permanent bans. Contact maintainers if you witness unacceptable behavior.

---

## 📦 Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines (`npm run lint`, `npm run format`)
- [ ] Tests pass (`npm test`)
- [ ] Documentation updated (if needed)
- [ ] Commit messages are clear
- [ ] PR description explains changes

### PR Template

```markdown
## Description
Brief summary of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How did you test this? (manual, automated, etc.)

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No privacy violations (e.g., no network calls)
```

### Review Process

1. **Automated checks**: CI runs linting, tests, build
2. **Code review**: Maintainers review for quality, privacy, security
3. **Feedback**: Address requested changes
4. **Approval**: Once approved, we'll merge!

**Timelines**: We aim to review PRs within 3-5 days. Complex PRs may take longer.

---

## 🎓 Learning Resources

New to Chrome extensions? Check out:

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Tesseract.js Docs](https://tesseract.projectnaptha.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 📧 Contact

- **Discussions**: [GitHub Discussions](https://github.com/formmirror/formmirror/discussions)
- **Issues**: [GitHub Issues](https://github.com/formmirror/formmirror/issues)
- **Email**: contribute@formmirror.dev (coming soon)

---

## 🙏 Recognition

Contributors are listed in:
- [CONTRIBUTORS.md](./CONTRIBUTORS.md)
- Release notes
- GitHub contributors page

Thank you for helping make FormMirror better! 🎉

---

**Happy hacking, and remember: privacy first!** 🔒

