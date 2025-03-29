import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../state/store';
import { buildAgentAsync } from '../../../state/slices/builderSlice';

const ChatBuilder: React.FC = () => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();
  const { chatHistory, error } = useSelector((state: RootState) => state.builder);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    try {
      await dispatch(buildAgentAsync({
        userRequest: input,
        userId: 'test-user', // Replace with actual user ID
      }));
      setInput('');
    } catch (error) {
      console.error('Error building agent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          mb: 2,
          p: 2,
          overflowY: 'auto',
          bgcolor: 'grey.50',
          borderRadius: 2,
        }}
      >
        <List>
          {chatHistory.map((message, index) => (
            <React.Fragment key={message.id}>
              <ListItem alignItems="flex-start">
                <ListItemText
                  primary={message.role === 'user' ? 'You' : 'Assistant'}
                  secondary={message.content}
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontWeight: 'bold',
                      color: message.role === 'user' ? 'primary.main' : 'secondary.main',
                    },
                  }}
                />
              </ListItem>
              {index < chatHistory.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
        {isLoading && (
          <Box display="flex" justifyContent="center" my={2}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </Paper>

      <Paper
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderRadius: 2,
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe the AI agent you want to build..."
          variant="outlined"
          disabled={isLoading}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={!input.trim() || isLoading}
          endIcon={<SendIcon />}
        >
          Build
        </Button>
      </Paper>
    </Box>
  );
};

export default ChatBuilder; 