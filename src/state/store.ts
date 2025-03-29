import { configureStore } from '@reduxjs/toolkit';
import builderSlice, { BuilderState } from './slices/builderSlice';
import userReducer from './slices/userSlice';
import agentReducer from './slices/agentSlice';

export interface RootState {
  builder: BuilderState;
  user: {
    user: {
      id: string;
      name: string;
      email: string;
    } | null;
  };
  agents: {
    agents: Array<{
      id: string;
      name: string;
      description: string;
      status: string;
      type: string;
      createdAt: string;
    }>;
  };
}

export const store = configureStore({
  reducer: {
    builder: builderSlice,
    user: userReducer,
    agents: agentReducer,
  },
});

export type AppDispatch = typeof store.dispatch; 