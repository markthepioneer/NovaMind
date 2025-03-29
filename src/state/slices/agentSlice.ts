import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'error';
  type: string;
  createdAt: string;
  lastActive?: string;
  metrics?: {
    conversations: number;
    avgResponseTime: number;
    successRate: number;
  };
}

export interface AgentState {
  agents: Agent[];
  isLoading: boolean;
  error: string | null;
}

const initialState: AgentState = {
  agents: [],
  isLoading: false,
  error: null
};

const agentSlice = createSlice({
  name: 'agents',
  initialState,
  reducers: {
    setAgents: (state, action: PayloadAction<Agent[]>) => {
      state.agents = action.payload;
    },
    addAgent: (state, action: PayloadAction<Agent>) => {
      state.agents.push(action.payload);
    },
    addMockAgent: (state, action: PayloadAction<Agent>) => {
      state.agents.push(action.payload);
    },
    updateAgent: (state, action: PayloadAction<Agent>) => {
      const index = state.agents.findIndex(agent => agent.id === action.payload.id);
      if (index !== -1) {
        state.agents[index] = action.payload;
      }
    },
    removeAgent: (state, action: PayloadAction<string>) => {
      state.agents = state.agents.filter(agent => agent.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    }
  }
});

export const {
  setAgents,
  addAgent,
  addMockAgent,
  updateAgent,
  removeAgent,
  setLoading,
  setError
} = agentSlice.actions;

export default agentSlice.reducer; 