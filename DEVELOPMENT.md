# Development

## Prerequisites

- Node.js v20 (use `nvm use`)
- Yarn 4 (via Corepack)
- [yalc](https://github.com/wclr/yalc) (included as a devDependency)

## Getting Started

```bash
nvm use
yarn install
yarn dev
```

`yarn dev` runs vite in watch mode and **automatically publishes `@imagekit/editor` to the local yalc store** on every rebuild.

## Linking to External Projects

Use yalc to test `@imagekit/editor` in any project outside this monorepo:

### 1. Start dev mode (this repo)

```bash
yarn dev
```

This watches for source changes, rebuilds, and runs `yalc publish --push` automatically after each build.

### 2. Install yalc globally (required for consuming projects)

```bash
npm i -g yalc
```

### 3. Link in your consuming project

```bash
# In your external project directory
yalc link @imagekit/editor
```

This creates a symlink to the yalc store. Every time the editor rebuilds, your project receives the update automatically via `--push`.

### 4. Remove the link when done

```bash
# In your external project directory
yalc remove @imagekit/editor
```

## Build

```bash
yarn build
```

Produces the production bundle in `packages/imagekit-editor/dist/`.

## Package

```bash
yarn package
```

Creates a `.tgz` tarball in `builds/` for manual distribution or testing.
