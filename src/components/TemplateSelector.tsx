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
  Button
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../state/store';
import { fetchTemplates, setSelectedTemplate } from '../state/slices/builderSlice';

interface TemplateSelectorProps {
  onSelect: (templateId: string) => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onSelect }) => {
  const dispatch = useDispatch<AppDispatch>();
  const builder = useSelector((state: RootState) => state.builder);
  const { availableTemplates, selectedTemplate } = builder;

  useEffect(() => {
    // Fetch templates on component mount
    dispatch(fetchTemplates());
  }, [dispatch]);

  const handleTemplateSelect = (templateId: string) => {
    dispatch(setSelectedTemplate(templateId));
    onSelect(templateId);
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Select an Agent Template
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Choose a starting point for your agent. You can customize its capabilities later.
      </Typography>

      <Grid container spacing={3}>
        {availableTemplates.map((template) => (
          <Grid item xs={12} md={4} key={template.id}>
            <Card 
              variant={selectedTemplate === template.id ? 'elevation' : 'outlined'}
              elevation={selectedTemplate === template.id ? 3 : 0}
              sx={{
                borderColor: selectedTemplate === template.id ? 'primary.main' : 'divider',
                transition: 'all 0.3s ease'
              }}
            >
              <CardActionArea onClick={() => handleTemplateSelect(template.id)}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    {template.name}
                    {selectedTemplate === template.id && (
                      <Chip 
                        label="Selected" 
                        color="primary" 
                        size="small" 
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {template.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}

        {availableTemplates.length === 0 && (
          <Grid item xs={12}>
            <Box textAlign="center" py={3}>
              <Typography variant="body1" color="textSecondary">
                Loading templates...
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          variant="contained" 
          color="primary"
          disabled={!selectedTemplate}
          onClick={() => onSelect(selectedTemplate!)}
        >
          Continue
        </Button>
      </Box>
    </Paper>
  );
};

export default TemplateSelector;