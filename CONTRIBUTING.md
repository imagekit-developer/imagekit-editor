# Contributing to ImageKit Editor

Thank you for your interest in contributing to the ImageKit Editor! We welcome contributions from the community and are grateful for your support.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Issue Guidelines](#issue-guidelines)
- [Pull Request Guidelines](#pull-request-guidelines)

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Set up the development environment
4. Create a new branch for your changes
5. Make your changes
6. Test your changes
7. Submit a pull request

## Development Setup

### Prerequisites

- Node.js (version 20, for development)
- Yarn package manager
- Git

### Installation

1. Clone your fork:
```bash
git clone https://github.com/YOUR_USERNAME/imagekit-editor.git
cd imagekit-editor
```

2. Install dependencies:
```bash
yarn install
```

3. Start the development server:
```bash
yarn dev
```

4. Build the project:
```bash
yarn build
```

5. Generate a tarball for testing (optional):
```bash
yarn package
```

This builds the project and creates a `.tgz` file in the `builds/` directory that you can use to test the package locally in other projects before publishing.

## Project Structure

```
imagekit-editor/
├── packages/
│   ├── imagekit-editor/          # Published package
│   │   ├── dist/                 # Built files
│   │   └── package.json
│   └── imagekit-editor-dev/      # Development package
│       ├── src/                  # Source code
│       │   ├── components/       # React components
│       │   ├── hooks/           # Custom hooks
│       │   ├── schema/          # Validation schemas
│       │   ├── utils/           # Utility functions
│       │   ├── ImageKitEditor.tsx
│       │   ├── index.tsx
│       │   └── store.ts         # State management
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
├── README.md
├── CONTRIBUTING.md
└── package.json
```

## Making Changes

### Before You Start

1. Check if there's already an issue for what you want to work on
2. If not, create an issue to discuss your proposed changes
3. Wait for feedback from maintainers before starting work on large changes

### Development Workflow

1. Create a new branch from `main`:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes in the `packages/imagekit-editor-dev/src` directory

3. Test your changes:
```bash
yarn dev  # Start development server
yarn build  # Build the project
```

4. Commit your changes following our [commit message guidelines](#commit-message-guidelines)

5. Push your branch and create a pull request

## Testing

Currently, the project uses manual testing through the development server. When contributing:

1. Test your changes thoroughly in the development environment
2. Verify that the build process completes successfully
3. Test with different image types and transformations
4. Ensure TypeScript compilation passes without errors

## Submitting Changes

### Pull Request Process

1. Update the README.md if your changes affect the public API
2. Ensure your code follows the project's coding standards
3. Write clear, descriptive commit messages
4. Include a detailed description of your changes in the PR
5. Link any related issues in your PR description

### Pull Request Template

When creating a pull request, please include:

- **Description**: What changes does this PR introduce?
- **Motivation**: Why are these changes needed?
- **Testing**: How have you tested these changes?
- **Screenshots**: If applicable, include screenshots of UI changes
- **Breaking Changes**: List any breaking changes
- **Related Issues**: Link to related issues

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Provide proper type definitions
- Avoid using `any` type
- Use interfaces for object shapes
- Export types that might be useful for consumers

### React

- Use functional components with hooks
- Follow React best practices
- Use proper prop types and interfaces
- Implement proper error boundaries where needed

### Code Style

- Use 2 spaces for indentation
- Use semicolons
- Use double quotes for strings
- Use trailing commas in objects and arrays
- Follow ESLint and Prettier configurations

## Commit Message Guidelines

We follow conventional commit format:

```
<type>: <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat: add new transformation type for image rotation

fix: resolve issue with signed URL generation

docs: update API documentation for signer function

refactor: improve component structure for better maintainability
```

## Issue Guidelines

### Bug Reports

When reporting bugs, please include:

- Clear description of the issue
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser and version information
- Screenshots or error messages if applicable

### Feature Requests

When requesting features, please include:

- Clear description of the feature
- Use case and motivation
- Proposed implementation (if you have ideas)
- Any related issues or discussions

## Pull Request Guidelines

### Before Submitting

- [ ] Code follows the project's coding standards
- [ ] Changes have been tested thoroughly
- [ ] Documentation has been updated if needed
- [ ] Commit messages follow the conventional format
- [ ] No breaking changes without discussion
- [ ] TypeScript compilation passes
- [ ] Build process completes successfully

### Review Process

1. Maintainers will review your PR
2. Address any feedback or requested changes
3. Once approved, your PR will be merged
4. Your changes will be included in the next release

## Getting Help

If you need help or have questions:

- Check existing issues and discussions
- Create a new issue for bugs or feature requests
- Reach out to maintainers via email: [developer@imagekit.io](mailto:developer@imagekit.io)
- Join our community forum: [community.imagekit.io](https://community.imagekit.io)

## Recognition

Contributors will be recognized in our release notes and documentation. Thank you for helping make ImageKit Editor better!

---

By contributing to this project, you agree that your contributions will be licensed under the same MIT License that covers the project.
