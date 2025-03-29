import { ToolContext } from '../services/tool-manager.service';

export interface Tool {
  execute(params: Record<string, any>, context: ToolContext): Promise<any>;
} 