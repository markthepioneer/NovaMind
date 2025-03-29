import axios from 'axios';
import { BuilderService } from './builder.service';
import { Template, Tool, AgentBuildResult } from '../types/agent';

// Create an axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for auth tokens
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Initialize builder service
const builderService = new BuilderService();

// Builder API
export const builderApi = {
  // Process user input with LLM
  processInput: async (input: string, history: any[] = []) => {
    try {
      const response = await api.post('/chat/process', { input, history });
      return response.data;
    } catch (error) {
      console.error('Error processing input:', error);
      throw error;
    }
  },

  // Build an agent from user request
  buildAgent: async (request: string, userId: string): Promise<AgentBuildResult> => {
    try {
      return await builderService.buildAgent(request, userId);
    } catch (error) {
      console.error('Error building agent:', error);
      throw error;
    }
  },

  // Validate agent code
  validateAgent: async (code: string) => {
    try {
      const response = await api.post('/builder/validate', { code });
      return response.data;
    } catch (error) {
      console.error('Error validating agent:', error);
      throw error;
    }
  },

  // Get available templates
  getTemplates: async (): Promise<Template[]> => {
    try {
      const response = await api.get('/builder/templates');
      return response.data;
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }
  },

  // Get available tools
  getTools: async (): Promise<Tool[]> => {
    try {
      const response = await api.get('/builder/tools');
      return response.data;
    } catch (error) {
      console.error('Error fetching tools:', error);
      throw error;
    }
  }
};

// Agents API
export const agentsApi = {
  // Get all agents
  getAgents: async () => {
    try {
      const response = await api.get('/agents');
      return response.data;
    } catch (error) {
      console.error('Error fetching agents:', error);
      throw error;
    }
  },

  // Get agent by ID
  getAgent: async (agentId: string) => {
    try {
      const response = await api.get(`/agents/${agentId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching agent ${agentId}:`, error);
      throw error;
    }
  },

  // Deploy agent
  deployAgent: async (agentId: string, config: any) => {
    try {
      const response = await api.post(`/agents/${agentId}/deploy`, config);
      return response.data;
    } catch (error) {
      console.error(`Error deploying agent ${agentId}:`, error);
      throw error;
    }
  },

  // Start chat with agent
  startChat: async (agentId: string, message: string) => {
    try {
      const response = await api.post(`/agents/${agentId}/chat`, { message });
      return response.data;
    } catch (error) {
      console.error(`Error chatting with agent ${agentId}:`, error);
      throw error;
    }
  }
};

export default api;