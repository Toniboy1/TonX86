# Contributing Workflow

This document explains what happens after you submit a contribution to TonX86 and how our automation ensures code quality.

## After You Submit a Pull Request

When you create a pull request, several automated checks run to ensure your contribution meets our quality standards.

### 1. Continuous Integration (CI) Pipeline

The CI pipeline runs automatically on every push and pull request.

**What It Does:**
- ✅ **Build Verification** - Tests build on Node.js 18 & 20
- ✅ **TypeScript Compilation** - All packages compile without errors
- ✅ **Linting** - Code follows ESLint style guidelines
- ✅ **Test Execution** - All 417+ tests must pass
- ✅ **Code Coverage** - Measures test coverage and generates reports
- ✅ **Security Audit** - Checks for known vulnerabilities in dependencies
- ✅ **Coverage Comments** - Posts coverage report directly on your PR

**Timeline:** Usually completes in 3-5 minutes.

**Where To View:**
- Check the "Checks" tab on your pull request
- Click on "CI" to see detailed logs
- Coverage report appears as a PR comment automatically

### 2. CodeQL Security Analysis

Our security scanner runs automatically 2x per week and on security-relevant changes.

**What It Does:**
- Analyzes code for security vulnerabilities
- Detects common security patterns
- Scans for injection vulnerabilities, XSS, etc.
- Provides actionable security recommendations

**Where To View:**
- [Security Tab](https://github.com/Toniboy1/TonX86/security/code-scanning) in the repository

### 3. Coverage Reports

Test coverage is tracked for all contributions.

**Coverage Requirements:**
- **Minimum Required:** 80% for branches, functions, lines, and statements
- **Current Coverage:** See the [Codecov badge](https://codecov.io/gh/Toniboy1/TonX86) in the main README

**How To View Coverage:**
1. Wait for CI to complete on your PR
2. Check the automated coverage comment on your PR
3. Download HTML coverage report from [Actions](https://github.com/Toniboy1/TonX86/actions) artifacts

**Running Coverage Locally:**
```bash
cd packages/simcore
npm test -- --coverage

cd packages/debug-adapter
npm test -- --coverage

cd packages/language-server
npm test -- --coverage
```

### 4. Automated Dependency Updates

**Dependabot** runs weekly to keep dependencies up to date.

**What It Does:**
- Checks for outdated dependencies
- Groups minor and patch updates
- Creates automated pull requests
- Reports security vulnerabilities

**Your Role:**
- Dependabot PRs are handled by maintainers
- Contributors don't need to worry about dependency updates

## Quality Requirements

All contributions must meet these standards before merging:

### ✅ Compilation
- All TypeScript must compile without errors
- Run `npm run build` to verify

### ✅ Tests
- All existing tests must pass
- New features require new tests
- Run `npm test` to verify

### ✅ Code Coverage
- Maintain 80%+ coverage on new code
- Run `npm test -- --coverage` to check

### ✅ Linting
- Code must follow ESLint rules
- Run `npm run lint` to verify
- Run `npm run lint -- --fix` to auto-fix issues

### ✅ Documentation
- Update relevant README files
- Document public APIs  
- Add JSDoc comments for complex functions

## Running All Checks Locally

Before submitting your PR, run:

```bash
npm run check
```

This runs:
1. Build verification
2. Linting
3. Tests
4. Type checking

## Branch Protection Rules

The `main` branch is protected with the following rules:

**Required Checks:**
- CI must pass
- No merge conflicts
- Branch must be up to date

**Required Reviews:**
- External contributors: 1 maintainer approval required
- Maintainers: Can merge their own PRs after checks pass

**Additional Protections:**
- All commits must be GPG/SSH signed ([Learn How](COMMIT_SIGNING.md))
- Direct pushes to `main` are blocked for external contributors
- Force pushes are not allowed
- Branch deletion is not allowed

## Release Process

When a new version is tagged, the release workflow automatically:

1. **Builds** all packages
2. **Packages** the extension as `.vsix`
3. **Creates** a GitHub release
4. **Attaches** the `.vsix` artifact
5. **Publishes** to VS Code Marketplace (when configured)

**Version Tags:** Follow semver (e.g., `v0.4.2`)

## Getting Help

If any checks fail:

1. **Check the logs** in the Actions tab
2. **Read the error messages** carefully
3. **Run tests locally** to debug
4. **Ask for help** in the PR comments

Common issues:
- **Build fails:** Check TypeScript errors
- **Tests fail:** Run `npm test` locally to debug
- **Lint fails:** Run `npm run lint -- --fix`
- **Coverage drops:** Add tests for new code

## Timeline Expectations

**Typical PR Timeline:**
1. Submit PR → Checks run (3-5 minutes)
2. Maintainer review (24-48 hours typically)
3. Address feedback (as needed)
4. Final approval → Merge
5. Appears in next release

**After Merge:**
- Your contribution is part of the project! 🎉
- Credit is preserved in git history
- Appears in release notes
- Included in next published version

## Questions?

- Check [CONTRIBUTING.md](../CONTRIBUTING.md) for general guidelines
- Review [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community standards
- Open a [Discussion](https://github.com/Toniboy1/TonX86/discussions) for questions
- File an [Issue](https://github.com/Toniboy1/TonX86/issues) for bugs

Thank you for contributing to TonX86! 🚀
