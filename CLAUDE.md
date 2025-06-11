# Team Think MCP - Claude Code Environment Notes

## Environment Setup
- **Platform**: WSL on Windows 11
- **Node.js**: v24.1.0 (installed via nvm)
- **npm**: 11.3.0
- **Working Directory**: `/mnt/c/VS Code Projects/Code Web Chat/CodeWebChat/team-think-mcp/`

## Important Environment Notes

### Package Management
- **npm workspaces** are configured and working
- **pnpm is NOT available** in this environment
- Use `npm` for all package management tasks
- **Workspace Dependencies**: Use `"*"` instead of `"workspace:*"` for internal package references in package.json files

### Build Commands
```bash
# Install all dependencies (run from root)
cd "/mnt/c/VS Code Projects/Code Web Chat/CodeWebChat/team-think-mcp" && npm install

# Build individual packages
npm run build:shared    # Build shared types package
npm run build:server    # Build MCP server
npm run build:extension # Build browser extension

# Build all packages
npm run build
```

### Development Workflow
- All packages are properly configured with TypeScript
- Shared package must be built before server/extension can reference it
- Use absolute paths when navigating directories in bash commands
- The monorepo structure is ready for development

## File Structure
```
team-think-mcp/
├── docs/              # Project documentation
├── shared/            # Shared TypeScript types
├── server/            # MCP server implementation
├── extension/         # Browser extension
├── package.json       # Root package.json with workspaces
└── CLAUDE.md         # This file
```