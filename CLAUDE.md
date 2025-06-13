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

### Testing Commands
```bash
# Run all tests (server package has comprehensive test suite)
cd "/mnt/c/VS Code Projects/Code Web Chat/CodeWebChat/team-think-mcp/server" && npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Test WebSocket authentication (requires server running)
npm run test:auth <token>
```

### Development Workflow
- All packages are properly configured with TypeScript
- Shared package must be built before server/extension can reference it
- Use absolute paths when navigating directories in bash commands
- The monorepo structure is ready for development
- **Queue Manager is production-ready**: 20 comprehensive tests covering concurrency, timeouts, race conditions, and memory leak prevention

## File Structure
```
team-think-mcp/
├── docs/              # Project documentation
│   ├── BLUEPRINT.md   # Architecture and design overview
│   ├── plan.md        # Implementation phases and requirements
│   ├── multi-agent-todo.md # Completed Phase 2.4 todo list
│   └── fix-testing-setup.md # Testing environment setup guide
├── shared/            # Shared TypeScript types
│   └── src/types/websocket-messages.ts # WebSocket message definitions
├── server/            # MCP server implementation
│   ├── src/queue/     # ✅ Production-ready request queue manager
│   │   ├── queue-manager.ts # Main queue implementation
│   │   ├── types.ts         # Queue type definitions
│   │   └── index.ts         # Lazy singleton export
│   ├── src/websocket/ # WebSocket server with authentication
│   ├── src/mcp/       # MCP protocol implementation
│   └── src/utils/     # Logging and security utilities
├── extension/         # Browser extension (in development)
├── package.json       # Root package.json with workspaces
└── CLAUDE.md         # This file
```