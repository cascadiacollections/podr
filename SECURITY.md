# 🔒 Security Policy

## 📢 Reporting a Vulnerability

We take the security of Podr seriously. If you discover a security vulnerability, please follow these steps:

### 🚨 For Critical Vulnerabilities

1. **DO NOT** open a public GitHub issue
2. Email security details to: [kevintcoughlin@users.noreply.github.com](mailto:kevintcoughlin@users.noreply.github.com)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

### 📝 For Non-Critical Issues

For less critical security concerns:
- Open a [GitHub Security Advisory](https://github.com/cascadiacollections/podr/security/advisories/new)
- Or create a private issue using the security label

## ⏱️ Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 7 days
- **Status Updates**: Every 7 days until resolved
- **Fix Timeline**: Based on severity (see below)

## 🎯 Severity Levels

| Severity | Response Time | Examples |
|----------|---------------|----------|
| 🔴 **Critical** | 24-48 hours | RCE, Authentication bypass, Data breach |
| 🟠 **High** | 3-7 days | XSS, CSRF, SQL injection |
| 🟡 **Medium** | 7-14 days | Information disclosure, DoS |
| 🟢 **Low** | 14-30 days | Minor information leaks |

## ✅ Supported Versions

We actively maintain security updates for:

| Version | Supported          |
| ------- | ------------------ |
| Latest  | ✅ Yes             |
| < 1.0   | ❌ No              |

## 🛡️ Security Best Practices

### For Contributors

- Run `yarn audit` before submitting PRs
- Keep dependencies up to date
- Follow secure coding guidelines in [CONTRIBUTING.md](CONTRIBUTING.md)
- Use TypeScript strict mode
- Validate all user inputs
- Sanitize outputs
- Use Content Security Policy (CSP) headers

### For Users

- Always use the latest version
- Review security advisories regularly
- Report suspicious behavior
- Enable automatic updates in your deployment

## 🔐 Security Features

Current security measures in Podr:

- ✅ **Automated Dependency Scanning**: Dependabot daily scans
- ✅ **Code Analysis**: CodeQL weekly scans
- ✅ **Security Headers**: CSP, X-Frame-Options, etc.
- ✅ **Audit Logs**: CI/CD security audit on every build
- ✅ **Minimal Permissions**: GitHub Actions use least privilege
- ✅ **HTTPS Only**: All production traffic encrypted
- ✅ **Subresource Integrity**: For CDN resources

## 📚 Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)

## 🙏 Acknowledgments

We appreciate security researchers who responsibly disclose vulnerabilities. Contributors will be acknowledged in:
- Our security advisories
- Release notes
- This document (with permission)

## 📄 Disclosure Policy

- We follow **responsible disclosure** practices
- Security fixes are released via GitHub Security Advisories
- CVEs are requested for significant vulnerabilities
- Public disclosure occurs after fix is released and users have time to update

## 📞 Contact

- **Email**: kevintcoughlin@users.noreply.github.com
- **GitHub**: [@kevintcoughlin](https://github.com/kevintcoughlin)
- **Security Advisories**: [View all advisories](https://github.com/cascadiacollections/podr/security/advisories)

---

**Last Updated**: October 2025

Thank you for helping keep Podr and its users safe! 🙏
