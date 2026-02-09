# Contributing to TonX86

Thank you for your interest in contributing to TonX86! This document provides guidelines for contributing to the project.

## Getting Started

1. **Fork the repository** and clone your fork
2. **Install dependencies**: `npm install`
3. **Build the project**: `npm run build`
4. **Run tests**: `npm test`
5. **Start development**: Press F5 in VS Code to launch Extension Development Host

## Important Requirements

### Commit Signing (Required)

**All commits must be signed with GPG or SSH keys.**

- ✅ Creates "Verified" badge on GitHub
- ✅ Ensures commit authenticity
- ✅ Required for merging to `main` branch

**Setup Guide:** See [.github/COMMIT_SIGNING.md](https://github.com/Toniboy1/TonX86/blob/main/.github/COMMIT_SIGNING.md)

Quick setup:
```bash
# Generate GPG key
gpg --full-generate-key

# Configure Git
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true
```

### Branch Protection

- **Repository Owner**: Can push directly to `main` (commits must be signed)
- **External Contributors**: Must submit pull requests with signed commits

See [.github/BRANCH_PROTECTION.md](https://github.com/Toniboy1/TonX86/blob/main/.github/BRANCH_PROTECTION.md) for details.

## Project Structure

```
packages/
├── extension/        - VS Code UI, LCD webview, keyboard capture
├── debug-adapter/    - DAP server, execution control
├── language-server/  - LSP for syntax support
├── simcore/          - CPU simulator, memory, I/O
└── docs/             - ISA reference
```

## Development Workflow

### Making Changes

1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the code style
3. Add tests for new functionality
4. Ensure all tests pass: `npm test`
5. Build successfully: `npm run build`
6. Run the linter: `npm run lint`

### Code Style

- Use TypeScript for all new code
- Follow existing code conventions
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions focused and concise

### Commit Messages

Follow conventional commit format:
- `feat: add new instruction XYZ`
- `fix: correct breakpoint handling in loops`
- `docs: update README with keyboard I/O`
- `test: add tests for LCD display`
- `refactor: simplify instruction parser`
- `perf: optimize execution loop`

### Testing

- Write tests for bug fixes and new features
- Place tests in `*.test.ts` files alongside code
- Run tests with `npm test`
- Aim for high test coverage on critical paths

### Documentation

Update relevant documentation:
- **README.md** - Features, configuration, examples
- **packages/docs/ISA.md** - Instruction set changes
- **.github/prompts/*.md** - AI context for major changes

## Submitting Changes

1. **Push your branch** to your fork
2. **Open a pull request** against `main`
3. **Fill out the PR template** completely
4. **Wait for CI checks** to pass
5. **Address review feedback** if requested

## Pull Request Guidelines

- One feature/fix per PR (keep scope focused)
- Include tests for new functionality
- Update documentation as needed
- Ensure CI passes (build, test, lint)
- Link related issues with "Fixes #123"

## Areas for Contribution

### Easy Wins (Good First Issues)
- Documentation improvements
- Example assembly programs
- Test coverage improvements
- Bug fixes

### Feature Development
- New instructions (MUL, DIV, shifts, etc.)
- Enhanced debugging features
- Additional I/O devices
- Performance optimizations

### Infrastructure
- CI/CD improvements
- Testing framework enhancements
- Build process optimization

## Getting Help

- Open a [Discussion](https://github.com/Toniboy1/TonX86/discussions) for questions
- Check existing [Issues](https://github.com/Toniboy1/TonX86/issues)
- Review the [Documentation](README.md)

## Code of Conduct

- Be respectful and constructive
- Welcome newcomers and help them learn
- Focus on what is best for the project
- Show empathy towards other contributors

## License

By contributing to TonX86, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to open a discussion or reach out to the maintainers!
