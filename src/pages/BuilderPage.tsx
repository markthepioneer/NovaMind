import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import ChatBuilder from './Builder/chat/ChatBuilder';

const BuilderPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4, height: '100vh' }}>
      <Typography variant="h4" gutterBottom>
        Build Your AI Agent
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Describe your requirements, and I'll help you build a custom AI agent.
      </Typography>
      <Box sx={{ height: 'calc(100vh - 200px)' }}>
        <ChatBuilder />
      </Box>
    </Container>
  );
};

export default BuilderPage; 