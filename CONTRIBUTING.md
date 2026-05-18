# Contributing to Micro-Courant

Thank you for your interest in contributing to Micro-Courant! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- Rust >= 1.70.0
- Docker & Docker Compose
- Soroban CLI

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/micro-courant/micro-courant.git
cd micro-courant

# Install dependencies
npm run install:all

# Start local infrastructure
npm run docker:up

# Build contracts
npm run build:contracts
```

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - Feature branches
- `bugfix/*` - Bug fix branches
- `hotfix/*` - Critical production fixes

### Creating a Feature Branch

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

### Making Changes

1. Make your changes following the coding standards
2. Add tests for new functionality
3. Ensure all tests pass: `npm test`
4. Format code: `npm run format`
5. Lint code: `npm run lint`

### Commit Messages

Follow conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Example:

```
feat(billing): add real-time balance deduction

Implement real-time balance deduction engine with Redis caching
for improved performance during high-frequency meter ingestion.

Closes #123
```

### Pull Request Process

1. Update documentation if needed
2. Ensure all CI checks pass
3. Update PR description with:
   - Description of changes
   - Related issues
   - Testing performed
   - Screenshots (if UI changes)
4. Request review from maintainers
5. Address review feedback

### PR Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues

Closes #issue_number

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review performed
- [ ] Commented complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] All tests passing
```

## Coding Standards

### Rust (Smart Contracts)

- Use `cargo fmt` for formatting
- Run `cargo clippy` for linting
- Write comprehensive unit tests
- Document public functions with `///`
- Use meaningful variable names
- Keep functions focused and small

### JavaScript/TypeScript

- Use ESLint for linting
- Use Prettier for formatting
- Write TypeScript with strict mode
- Add JSDoc comments for public APIs
- Follow functional programming patterns where appropriate

### React Components

- Use functional components with hooks
- Follow component composition patterns
- Implement proper error boundaries
- Add loading states
- Make components responsive and accessible

## Testing Guidelines

### Unit Tests

- Test individual functions and components
- Mock external dependencies
- Aim for high code coverage
- Test edge cases and error conditions

### Integration Tests

- Test component interactions
- Test API endpoints
- Test database operations
- Test smart contract interactions

### End-to-End Tests

- Test complete user flows
- Test critical paths
- Test error scenarios
- Test offline functionality

## Smart Contract Development

### Contract Structure

```
contracts/
├── energy_meter_registry/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       ├── test.rs
│       └── storage.rs
├── consumption_billing/
├── p2p_energy_trading/
├── subsidy_governance/
└── grid_settlement/
```

### Contract Requirements

- Upgrade-safe architecture
- Role-based permissions
- Event emission for all state changes
- Deterministic calculations
- Comprehensive testing
- Gas optimization

### Testing Contracts

```bash
# Run all contract tests
cd contracts
cargo test

# Run specific contract tests
cargo test --package energy_meter_registry

# Run with output
cargo test -- --nocapture
```

## Backend Development

### Service Structure

```
backend/
├── telemetry/
│   ├── src/
│   ├── tests/
│   ├── package.json
│   └── Dockerfile
├── api-gateway/
└── billing-engine/
```

### API Standards

- RESTful design
- Proper HTTP status codes
- Consistent error responses
- Request validation
- Rate limiting
- Audit logging

### Database Migrations

- Use migration files for schema changes
- Version control all migrations
- Test migrations on staging
- Document breaking changes

## Frontend Development

### Dashboard Structure

```
frontend/
├── household-dashboard/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   ├── package.json
│   └── Dockerfile
├── operator-dashboard/
└── governance-dashboard/
```

### UI/UX Guidelines

- Mobile-first design
- Offline-first capability
- Low-bandwidth optimization
- Accessible (WCAG 2.1 AA)
- Simple, intuitive UX
- Clear error messages

## Documentation

### Required Documentation

- API documentation
- Architecture documentation
- User guides
- Developer guides
- Deployment guides
- Changelog

### Writing Documentation

- Use clear, concise language
- Include code examples
- Add diagrams where helpful
- Keep documentation up to date
- Use Markdown format

## Issue Reporting

### Bug Reports

Include:

- Description of the bug
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details
- Screenshots/logs if applicable

### Feature Requests

Include:

- Description of the feature
- Use case
- Proposed implementation
- Potential impact

## Release Process

### Versioning

Follow Semantic Versioning (semver):

- MAJOR: Breaking changes
- MINOR: New features (backwards compatible)
- PATCH: Bug fixes (backwards compatible)

### Release Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Tagged release
- [ ] Deployed to staging
- [ ] Tested on staging
- [ ] Deployed to production

## Community

### Communication Channels

- GitHub Issues
- GitHub Discussions
- Discord server
- Monthly community calls

### Getting Help

- Check documentation first
- Search existing issues
- Ask in discussions
- Create new issue if needed

## License

By contributing to Micro-Courant, you agree that your contributions will be licensed under the MIT License.
