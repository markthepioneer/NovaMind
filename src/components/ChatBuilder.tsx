import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  List,
  ListItem,
  Divider,
  IconButton,
  Card,
  CardContent
} from '@mui/material';
import { Send as SendIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../state/store';
import * as builderActions from '../state/slices/builderSlice';
import { builderApi } from '../services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface ChatBuilderProps {
  onBuildComplete: (agentId: string) => void;
}

const ChatBuilder: React.FC<ChatBuilderProps> = ({ onBuildComplete }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'system',
      content: 'Welcome to the Agent Builder. Describe the agent you want to build, and I\'ll help you create it.',
      timestamp: new Date()
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);
  const builder = useSelector((state: RootState) => state.builder);
  
  // Scroll to the bottom of the chat when messages change
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  // Add system message when builder state changes
  useEffect(() => {
    if (builder.buildProgress > 0 && builder.buildProgress < 100) {
      addMessage('system', `Building agent... ${builder.buildProgress}% complete`);
    }
    
    if (builder.error) {
      addMessage('system', `Error: ${builder.error}`);
    }
    
    if (builder.result && !builder.isBuilding) {
      addMessage('system', 'Agent built successfully!');
      if (builder.result.agentId) {
        onBuildComplete(builder.result.agentId);
      }
    }
  }, [builder.buildProgress, builder.error, builder.result, builder.isBuilding]);

  const addMessage = (role: 'user' | 'assistant' | 'system', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Ensure form doesn't reload the page
    e.preventDefault();
    if (!input.trim()) return;
    
    const userMessage = input.trim();
    setInput('');
    addMessage('user', userMessage);
    setIsProcessing(true);
    
    try {
      // First, process with LLM to refine the request
      const assistantResponse = await processWithLLM(userMessage);
      addMessage('assistant', assistantResponse);
      
      // Check if user message looks like a build request
      if (isBuildRequest(userMessage, assistantResponse)) {
        // Wait for user confirmation
        addMessage('system', 'Would you like me to build this agent? Type "yes" to proceed.');
      }
    } catch (error) {
      addMessage('system', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const processWithLLM = async (message: string): Promise<string> => {
    try {
      // Convert messages to the format expected by the API
      const historyForApi = messages
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        }));

      // Call the chat processing API
      const response = await builderApi.processInput(message, historyForApi);
      
      // Handle build confirmation
      if (message.toLowerCase() === 'yes' && 
          (messages.some(m => m.content.includes('Would you like me to build this agent?')) ||
          messages.some(m => m.content.includes('ready to build'))) ||
          message.toLowerCase() === 'build it') {
          
        // Find the original agent description from chat history
        let agentDescription = extractAgentDescription(messages);
        
        if (agentDescription) {
          // Start the build process
          dispatch(builderActions.buildAgentAsync({ 
            userRequest: agentDescription,
            userId: 'current-user', // Replace with actual user ID
            selectedTemplate: builder.selectedTemplate || 'basic',
            selectedTools: response.recommendedTools || builder.selectedTools
          }));
          return 'Starting the build process. This may take a few moments...';
        } else {
          return "I couldn't find a clear agent description in our conversation. Can you describe what you want the agent to do?";
        }
      }
      
      // If the response contains recommended tools, update the store
      if (response.recommendedTools && response.recommendedTools.length > 0) {
        response.recommendedTools.forEach((tool: string) => {
          if (!builder.selectedTools.includes(tool)) {
            dispatch(builderActions.addSelectedTool(tool));
          }
        });
      }
      
      return response.response;
    } catch (error) {
      console.error('Error processing with LLM:', error);
      return 'Sorry, I encountered an error processing your request. Please try again.';
    }
  };
  
  const extractAgentDescription = (messageHistory: Message[]): string | null => {
    // Find messages that look like agent descriptions
    const userMessages = messageHistory.filter(m => m.role === 'user');
    
    // Check the last few user messages for a substantial description
    for (let i = userMessages.length - 1; i >= 0; i--) {
      const msg = userMessages[i].content;
      // Look for messages that are descriptive enough
      if (msg.length > 30 && 
         (msg.toLowerCase().includes('agent') || 
          msg.toLowerCase().includes('build') || 
          msg.toLowerCase().includes('create'))) {
        return msg;
      }
    }
    
    // If no specific message found, combine the last few user messages
    if (userMessages.length >= 2) {
      return userMessages.slice(-3).map(m => m.content).join(' ');
    }
    
    return null;
  };

  const isBuildRequest = (userMessage: string, assistantResponse: string): boolean => {
    // Simple heuristic: if the user message contains build-related terms
    // or the assistant response mentions building
    return (
      userMessage.toLowerCase().includes('build') ||
      userMessage.toLowerCase().includes('create') ||
      userMessage.toLowerCase().includes('make') ||
      assistantResponse.toLowerCase().includes('build an agent')
    );
  };

  const summarizeRequest = (message: string): string => {
    // Simple summarization for demo purposes
    // In a real implementation, this would be handled by the LLM
    const cleanMessage = message.toLowerCase()
      .replace('build', '')
      .replace('create', '')
      .replace('an agent', '')
      .replace('that', '')
      .replace('which', '')
      .trim();
      
    return cleanMessage.length > 50 
      ? cleanMessage.substring(0, 50) + '...' 
      : cleanMessage;
  };

  const handleReset = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'system',
        content: 'Welcome to the Agent Builder. Describe the agent you want to build, and I\'ll help you create it.',
        timestamp: new Date()
      }
    ]);
    dispatch(builderActions.resetBuilder());
  };

  return (
    <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
        <Typography variant="h6">Agent Builder Chat</Typography>
        <Typography variant="body2" color="textSecondary">
          Describe what you need, and I'll help build your agent
        </Typography>
      </Box>
      
      <Box 
        ref={messageListRef}
        sx={{ 
          flexGrow: 1, 
          overflow: 'auto', 
          p: 2, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 2,
          maxHeight: '500px'
        }}
      >
        {messages.map((message) => (
          <Box
            key={message.id}
            sx={{
              alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%'
            }}
          >
            <Card
              variant="outlined"
              sx={{
                backgroundColor: message.role === 'user' 
                  ? 'primary.light' 
                  : message.role === 'system' 
                    ? 'grey.100' 
                    : 'background.paper',
                borderRadius: 2
              }}
            >
              <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                <Typography variant="body1">
                  {message.content}
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                  {message.timestamp.toLocaleTimeString()}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>
      
      <Box sx={{ p: 2, borderTop: '1px solid rgba(0, 0, 0, 0.12)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Describe the agent you want to build..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing}
            size="small"
          />
          <IconButton 
            color="primary" 
            onClick={handleReset}
            title="Reset conversation"
          >
            <RefreshIcon />
          </IconButton>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isProcessing || !input.trim()}
            endIcon={isProcessing ? <CircularProgress size={20} /> : <SendIcon />}
          >
            Send
          </Button>
        </form>
      </Box>
    </Paper>
  );
};

export default ChatBuilder;