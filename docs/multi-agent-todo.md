# Multi-Agent Implementation Plan: Phase 1 - Project Scaffolding & Shared Types

## Context for Agent 2 (Builder)
You are implementing Phase 1 of the Team Think MCP project. This phase focuses on creating the basic monorepo structure and defining shared types for WebSocket communication.

### Important Documents to Reference
- [X] Read @team-think-mcp/docs/BLUEPRINT.md to understand the overall project architecture
- [X] Read @team-think-mcp/docs/plan.md to see the full project plan

### Phase 1.1: Create Monorepo Structure

- [X] Create the base directory structure:
  - [X] Create `/team-think-mcp/server` directory
  - [X] Create `/team-think-mcp/extension` directory  
  - [X] Create `/team-think-mcp/shared` directory

### Phase 1.2: Define Shared TypeScript Types

First, set up the shared package:

- [X] Create `/team-think-mcp/shared/package.json` with:
  ```json
  {
    "name": "@team-think-mcp/shared",
    "version": "0.1.0",
    "main": "dist/index.js",
    "types": "dist/index.d.ts",
    "scripts": {
      "build": "tsc"
    },
    "devDependencies": {
      "@types/node": "^18.0.0",
      "typescript": "^5.0.0"
    }
  }
  ```

- [X] Create `/team-think-mcp/shared/tsconfig.json` with standard TypeScript configuration:
  ```json
  {
    "compilerOptions": {
      "target": "ES2020",
      "module": "commonjs",
      "lib": ["ES2020"],
      "outDir": "./dist",
      "rootDir": "./src",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "declaration": true,
      "declarationMap": true,
      "sourceMap": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
  }
  ```

- [X] Create `/team-think-mcp/shared/src` directory

- [X] Create `/team-think-mcp/shared/src/types` directory

- [X] Create `/team-think-mcp/shared/src/types/websocket-messages.ts` with the versioned message types:
  ```typescript
  // Base message interface with versioning
  interface BaseMessage {
    schema: '1.0';
    timestamp: number;
  }

  // MCP Server → Extension
  export interface SendPromptMessage extends BaseMessage {
    action: 'send-prompt';
    requestId: string;
    chatbot: 'gemini' | 'chatgpt';
    prompt: string;
    options?: {
      temperature?: number;
      model?: string;
    };
  }

  // Extension → MCP Server  
  export interface ChatResponseMessage extends BaseMessage {
    action: 'chat-response';
    requestId: string;
    response: string;
    error?: string;
  }

  // Union type for all messages
  export type WebSocketMessage = SendPromptMessage | ChatResponseMessage;
  ```

- [X] Create `/team-think-mcp/shared/src/index.ts` to export all types:
  ```typescript
  export * from './types/websocket-messages';
  ```

### Phase 1.3: Set Up Server Package

- [X] Create `/team-think-mcp/server/package.json` with:
  ```json
  {
    "name": "@team-think-mcp/server",
    "version": "0.1.0",
    "main": "dist/index.js",
    "scripts": {
      "build": "tsc",
      "start": "node dist/index.js",
      "dev": "ts-node src/index.ts"
    },
    "dependencies": {
      "@team-think-mcp/shared": "workspace:*",
      "ws": "^8.0.0"
    },
    "devDependencies": {
      "@types/node": "^18.0.0",
      "@types/ws": "^8.0.0",
      "ts-node": "^10.0.0",
      "typescript": "^5.0.0"
    }
  }
  ```

- [X] Create `/team-think-mcp/server/tsconfig.json` with:
  ```json
  {
    "compilerOptions": {
      "target": "ES2020",
      "module": "commonjs",
      "lib": ["ES2020"],
      "outDir": "./dist",
      "rootDir": "./src",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "resolveJsonModule": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"],
    "references": [
      { "path": "../shared" }
    ]
  }
  ```

- [X] Create `/team-think-mcp/server/src` directory

### Phase 1.3: Set Up Extension Package

- [X] Create `/team-think-mcp/extension/package.json` with:
  ```json
  {
    "name": "@team-think-mcp/extension",
    "version": "0.1.0",
    "scripts": {
      "build": "webpack --mode production",
      "dev": "webpack --mode development --watch"
    },
    "dependencies": {
      "@team-think-mcp/shared": "workspace:*"
    },
    "devDependencies": {
      "@types/chrome": "^0.0.250",
      "@types/webextension-polyfill": "^0.10.0",
      "ts-loader": "^9.0.0",
      "typescript": "^5.0.0",
      "webpack": "^5.0.0",
      "webpack-cli": "^5.0.0",
      "webextension-polyfill": "^0.10.0"
    }
  }
  ```

- [X] Create `/team-think-mcp/extension/tsconfig.json` with:
  ```json
  {
    "compilerOptions": {
      "target": "ES2020",
      "module": "ES2020",
      "lib": ["ES2020", "DOM"],
      "outDir": "./dist",
      "rootDir": "./src",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "moduleResolution": "node"
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"],
    "references": [
      { "path": "../shared" }
    ]
  }
  ```

- [X] Create `/team-think-mcp/extension/src` directory

### Phase 1.4: Create Root Configuration Files

- [X] Create `/team-think-mcp/package.json` for the monorepo:
  ```json
  {
    "name": "team-think-mcp",
    "version": "0.1.0",
    "private": true,
    "workspaces": [
      "shared",
      "server", 
      "extension"
    ],
    "scripts": {
      "build": "npm run build --workspaces",
      "build:shared": "npm run build -w @team-think-mcp/shared",
      "build:server": "npm run build -w @team-think-mcp/server",
      "build:extension": "npm run build -w @team-think-mcp/extension"
    },
    "devDependencies": {
      "typescript": "^5.0.0"
    }
  }
  ```

- [X] Create `/team-think-mcp/tsconfig.json` root TypeScript config:
  ```json
  {
    "files": [],
    "references": [
      { "path": "./shared" },
      { "path": "./server" },
      { "path": "./extension" }
    ]
  }
  ```

- [X] Create `/team-think-mcp/.gitignore`:
  ```
  node_modules/
  dist/
  *.log
  .DS_Store
  ```

### Verification Steps

After completing all tasks above:

- [X] Run `npm install` in the `/team-think-mcp` directory to set up the monorepo
- [X] Run `npm run build:shared` to verify the shared package builds successfully
- [X] Verify the directory structure matches the blueprint architecture

## Important Notes for Implementation

1. **Directory Creation Order**: Create parent directories before child directories
2. **File Creation Order**: Create package.json files before running npm install
3. **Reference the Blueprint**: The BLUEPRINT.md file contains detailed architecture information - use it to verify your implementation matches the design
4. **Small Steps**: Each checkbox is a small, verifiable step. Complete and verify each one before moving to the next
5. **Ask for Clarification**: If any step is unclear or seems incorrect, ask for clarification before proceeding

## Success Criteria

Phase 1 is complete when:
- The monorepo structure exists with server, extension, and shared directories
- All package.json and tsconfig.json files are created and properly configured
- The shared WebSocket message types are defined with version 1.0 schema
- The monorepo can be installed with `npm install` without errors
- The shared package can be built successfully