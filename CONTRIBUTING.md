# Contributing to TonX86

Thank you for your interest in contributing to TonX86! This guide will help you get started.

## Getting Started

1. **Fork the repository** and clone your fork
2. **Install dependencies**: `npm install`
3. **Build the project**: `npm run build`
4. **Run tests**: `npm test`
5. **Start development**: Press F5 in VS Code to launch Extension Development Host

## Important Requirements

### Commit Signing

**All commits must be signed with GPG or SSH keys** to ensure authenticity and display a "Verified" badge on GitHub.

**Quick setup:**
```bash
# Generate GPG key
gpg --full-generate-key

# Configure Git to sign commits
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true
```

For detailed instructions, see [GitHub's guide on commit signing](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits).

### Branch Protection

- **Repository Owner**: Can push directly to `main` (commits must be signed)
- **External Contributors**: Must submit pull requests with signed commits

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

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

- `feat: add new instruction XYZ` - New feature
- `fix: correct breakpoint handling in loops` - Bug fix
- `docs: update README with keyboard I/O` - Documentation
- `test: add tests for LCD display` - Tests
- `refactor: simplify instruction parser` - Refactoring
- `perf: optimize execution loop` - Performance improvement

See [VERSION.md](VERSION.md) for complete guidelines.

### Testing

- Write tests for bug fixes and new features
- Place tests in `*.test.ts` files alongside code
- Run tests with `npm test`
- Aim for 80%+ test coverage on critical paths
- Current coverage is shown on the [Codecov badge](https://codecov.io/gh/Toniboy1/TonX86) in the README

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
- All commits must be signed

## Areas for Contribution

### Good First Issues
- Documentation improvements
- Example assembly programs
- Test coverage improvements
- Bug fixes

### Feature Development
- New instructions (e.g., string operations)
- Enhanced debugging features
- Additional I/O devices
- Performance optimizations

### Infrastructure
- CI/CD improvements
- Testing framework enhancements
- Build process optimization

## Quality Standards

All contributions must:
- ✅ Pass TypeScript compilation
- ✅ Pass all tests (417/417 currently)
- ✅ Maintain 80%+ code coverage
- ✅ Pass ESLint checks
- ✅ Include tests for new features
- ✅ Update relevant documentation
- ✅ Use signed commits

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
