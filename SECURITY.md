# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in TonX86, please report it responsibly.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via one of the following methods:

1. **Email** (preferred): Send details to the project maintainer
2. **Private Security Advisory**: Use GitHub's [private vulnerability reporting](https://github.com/Toniboy1/TonX86/security/advisories/new)

### What to Include

Please include the following information in your report:

- **Type of vulnerability** (e.g., code execution, information disclosure, denial of service)
- **Full paths** of source files related to the vulnerability
- **Location** of the affected code (tag/branch/commit or direct URL)
- **Steps to reproduce** the vulnerability
- **Proof-of-concept or exploit code** (if possible)
- **Impact** of the vulnerability
- **Suggested fix** (if you have one)

### Response Timeline

- **Initial Response**: Within 48 hours of receipt
- **Vulnerability Assessment**: Within 7 days
- **Fix Development**: Timeline depends on severity and complexity
- **Public Disclosure**: After fix is released and users have had time to update

### Security Best Practices

When using TonX86:

1. **Keep dependencies updated**: Run `npm audit` regularly
2. **Review assembly code**: Don't execute untrusted assembly programs
3. **Update the extension**: Keep TonX86 updated to the latest version
4. **Report issues**: If you notice suspicious behavior, report it

### Scope

Security issues we are interested in:

- **Code execution vulnerabilities** in assembly parsing or execution
- **Memory corruption** in the simulator
- **Denial of service** vulnerabilities
- **Information disclosure** from debug adapter or language server
- **Dependency vulnerabilities** in npm packages

Out of scope:

- Social engineering attacks
- Physical attacks
- Issues in third-party dependencies (report to the respective projects)

## Security Updates

Security updates will be released as patch versions and announced via:

- GitHub Security Advisories
- Release notes
- README.md (for critical issues)

## Acknowledgments

We appreciate security researchers who responsibly disclose vulnerabilities. Contributors will be acknowledged in release notes (unless they prefer to remain anonymous).

## Questions

If you have questions about this policy, please open a [Discussion](https://github.com/Toniboy1/TonX86/discussions).
