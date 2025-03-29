import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { builderApi } from '../../services/api';

export interface BuilderState {
  userRequest: string;
  isBuilding: boolean;
  buildProgress: number;
  error: string | null;
  result: any;
  chatHistory: ChatMessage[];
  availableTemplates: Template[];
  availableTools: Tool[];
  selectedTemplate: string | null;
  selectedTools: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface Template {
  id: string;
  name: string;
  description: string;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
}

const initialState: BuilderState = {
  userRequest: '',
  isBuilding: false,
  buildProgress: 0,
  error: null,
  result: null,
  chatHistory: [],
  availableTemplates: [],
  availableTools: [],
  selectedTemplate: null,
  selectedTools: []
};

export interface BuildAgentPayload {
  userRequest: string;
  userId: string;
  selectedTemplate?: string;
  selectedTools?: string[];
}

// Async thunks
export const fetchTemplates = createAsyncThunk(
  'builder/fetchTemplates',
  async (_, { rejectWithValue }) => {
    try {
      return await builderApi.getTemplates();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch templates');
    }
  }
);

export const fetchTools = createAsyncThunk(
  'builder/fetchTools',
  async (_, { rejectWithValue }) => {
    try {
      return await builderApi.getTools();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch tools');
    }
  }
);

export const processUserInput = createAsyncThunk(
  'builder/processInput',
  async (input: string, { rejectWithValue }) => {
    try {
      return await builderApi.processInput(input);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to process input');
    }
  }
);

export const buildAgentAsync = createAsyncThunk(
  'builder/buildAgentAsync',
  async (payload: BuildAgentPayload, { rejectWithValue }) => {
    try {
      return await builderApi.buildAgent(payload.userRequest, payload.userId);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to build agent');
    }
  }
);

const builderSlice = createSlice({
  name: 'builder',
  initialState,
  reducers: {
    setUserRequest(state, action: PayloadAction<string>) {
      state.userRequest = action.payload;
    },
    buildAgent(state, action: PayloadAction<BuildAgentPayload>) {
      state.isBuilding = true;
      state.buildProgress = 0;
      state.error = null;
    },
    setBuildProgress(state, action: PayloadAction<number>) {
      state.buildProgress = action.payload;
    },
    setBuildError(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.isBuilding = false;
    },
    setBuildResult(state, action: PayloadAction<any>) {
      state.result = action.payload;
      state.isBuilding = false;
      state.buildProgress = 100;
    },
    resetBuilder(state) {
      return initialState;
    },
    addChatMessage(state, action: PayloadAction<ChatMessage>) {
      state.chatHistory.push(action.payload);
    },
    setSelectedTemplate(state, action: PayloadAction<string>) {
      state.selectedTemplate = action.payload;
    },
    addSelectedTool(state, action: PayloadAction<string>) {
      if (!state.selectedTools.includes(action.payload)) {
        state.selectedTools.push(action.payload);
      }
    },
    removeSelectedTool(state, action: PayloadAction<string>) {
      state.selectedTools = state.selectedTools.filter(tool => tool !== action.payload);
    }
  },
  extraReducers: (builder) => {
    // Handle fetchTemplates
    builder.addCase(fetchTemplates.pending, (state) => {
      // Optional loading state
    });
    builder.addCase(fetchTemplates.fulfilled, (state, action) => {
      state.availableTemplates = action.payload;
    });
    builder.addCase(fetchTemplates.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // Handle fetchTools
    builder.addCase(fetchTools.pending, (state) => {
      // Optional loading state
    });
    builder.addCase(fetchTools.fulfilled, (state, action) => {
      state.availableTools = action.payload;
    });
    builder.addCase(fetchTools.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // Handle buildAgentAsync
    builder.addCase(buildAgentAsync.pending, (state) => {
      state.isBuilding = true;
      state.buildProgress = 0;
      state.error = null;
    });
    builder.addCase(buildAgentAsync.fulfilled, (state, action) => {
      state.isBuilding = false;
      state.buildProgress = 100;
      state.result = action.payload;
    });
    builder.addCase(buildAgentAsync.rejected, (state, action) => {
      state.isBuilding = false;
      state.error = action.payload as string;
    });
  }
});

export const {
  setUserRequest,
  buildAgent,
  setBuildProgress,
  setBuildError,
  setBuildResult,
  resetBuilder,
  addChatMessage,
  setSelectedTemplate,
  addSelectedTool,
  removeSelectedTool
} = builderSlice.actions;

export default builderSlice.reducer; 