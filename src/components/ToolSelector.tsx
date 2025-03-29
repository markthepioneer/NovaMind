import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Paper,
  Button,
  FormControlLabel,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Api as ApiIcon,
  Storage as StorageIcon,
  ChatBubble as ChatIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../state/store';
import { 
  fetchTools, 
  addSelectedTool, 
  removeSelectedTool,
  Tool
} from '../state/slices/builderSlice';

interface ToolSelectorProps {
  onContinue: () => void;
}

// Map tool categories to icons
const getToolIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'api':
      return <ApiIcon />;
    case 'storage':
      return <StorageIcon />;
    case 'communication':
      return <ChatIcon />;
    case 'productivity':
      return <ScheduleIcon />;
    default:
      return <NotificationIcon />;
  }
};

const ToolSelector: React.FC<ToolSelectorProps> = ({ onContinue }) => {
  const dispatch = useDispatch<AppDispatch>();
  const builder = useSelector((state: RootState) => state.builder);
  const { availableTools, selectedTools } = builder;

  useEffect(() => {
    // Fetch tools on component mount
    dispatch(fetchTools());
  }, [dispatch]);

  const handleToolToggle = (toolId: string) => {
    if (selectedTools.includes(toolId)) {
      dispatch(removeSelectedTool(toolId));
    } else {
      dispatch(addSelectedTool(toolId));
    }
  };

  // Group tools by category
  const toolsByCategory = availableTools.reduce((acc, tool) => {
    const category = tool.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(tool);
    return acc;
  }, {} as Record<string, Tool[]>);

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Select Tools for Your Agent
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Choose the tools and integrations your agent will use.
      </Typography>

      <Grid container spacing={3}>
        {Object.entries(toolsByCategory).map(([category, tools]) => (
          <Grid item xs={12} md={6} key={category}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  {category}
                </Typography>
                <List dense>
                  {tools.map((tool) => (
                    <React.Fragment key={tool.id}>
                      <ListItem>
                        <ListItemIcon>
                          {getToolIcon(category)}
                        </ListItemIcon>
                        <ListItemText 
                          primary={tool.name}
                          secondary={tool.description}
                        />
                        <Checkbox
                          edge="end"
                          checked={selectedTools.includes(tool.id)}
                          onChange={() => handleToolToggle(tool.id)}
                          inputProps={{ 'aria-labelledby': `tool-${tool.id}` }}
                        />
                      </ListItem>
                      <Divider variant="inset" component="li" />
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {availableTools.length === 0 && (
          <Grid item xs={12}>
            <Box textAlign="center" py={3}>
              <Typography variant="body1" color="textSecondary">
                Loading tools...
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="body2">
          {selectedTools.length} tools selected
        </Typography>
        <Button 
          variant="contained" 
          color="primary"
          onClick={onContinue}
        >
          Continue
        </Button>
      </Box>
    </Paper>
  );
};

export default ToolSelector;