# Contributing to Claude Copilot

Thank you for your interest in contributing to Claude Copilot!

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Follow the installation instructions in the README

## Development Setup

```bash
# Install MCP server dependencies
cd mcp-servers/copilot-memory && npm install && npm run build
cd ../skills-copilot && npm install && npm run build
```

## Security Guidelines

**Before submitting any PR, ensure you have NOT committed:**

- API keys or tokens
- Database connection strings
- Passwords or secrets
- `.mcp.json` files (may contain credentials)
- `.env` files (use `.env.example` for templates)
- Private keys (`.pem`, `.key` files)

If you accidentally commit secrets:
1. Do NOT push to remote
2. Remove the file and amend your commit
3. If already pushed, contact maintainers immediately

## Code Standards

### Agents (`.claude/agents/`)

- Keep agents generic (no company-specific content)
- Use industry-standard methodologies
- Include routing to other agents
- Document decision authority
- Follow the required sections format

### MCP Servers (`mcp-servers/`)

- Use TypeScript
- Include comprehensive error handling
- Add JSDoc comments for public APIs
- Write tests for new functionality

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes following the code standards
3. Update documentation if needed
4. Run tests: `npm test` in relevant MCP server directories
5. Submit a PR with a clear description

### PR Checklist

- [ ] No secrets or credentials in code
- [ ] Tests pass
- [ ] Documentation updated (if applicable)
- [ ] Follows existing code style

## Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- For security vulnerabilities, see [SECURITY.md](SECURITY.md)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
