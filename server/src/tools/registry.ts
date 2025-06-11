import { McpTool } from '../mcp/types';

export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (args: Record<string, any>) => Promise<{
    content: Array<{
      type: "text";
      text: string;
    } | {
      type: "image";
      data: string;
      mimeType: string;
    }>;
    isError?: boolean;
  }>;
}

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  public register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool with name "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
    console.error(`Registered tool: ${tool.name}`);
  }

  public unregister(name: string): boolean {
    const result = this.tools.delete(name);
    if (result) {
      console.error(`Unregistered tool: ${name}`);
    }
    return result;
  }

  public get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  public list(): McpTool[] {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));
  }

  public has(name: string): boolean {
    return this.tools.has(name);
  }

  public getNames(): string[] {
    return Array.from(this.tools.keys());
  }

  public async execute(name: string, args: Record<string, any> = {}): Promise<{
    content: Array<{
      type: "text";
      text: string;
    } | {
      type: "image";
      data: string;
      mimeType: string;
    }>;
    isError?: boolean;
  }> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found`);
    }

    try {
      return await tool.execute(args);
    } catch (error) {
      console.error(`Error executing tool "${name}":`, error);
      return {
        content: [{
          type: "text",
          text: `Error executing tool: ${String(error)}`
        }],
        isError: true
      };
    }
  }

  public clear(): void {
    this.tools.clear();
    console.error('Cleared all tools from registry');
  }

  public size(): number {
    return this.tools.size;
  }
}