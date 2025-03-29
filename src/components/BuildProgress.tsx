import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Grid
} from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../state/store';

interface BuildProgressProps {
  onComplete: (agentId: string) => void;
}

const buildSteps = [
  { label: 'Analyzing Request', description: 'Extracting requirements and capabilities' },
  { label: 'Configuring Tools', description: 'Setting up integrations and services' },
  { label: 'Generating Code', description: 'Creating agent logic and structure' },
  { label: 'Testing', description: 'Validating functionality and performance' },
  { label: 'Finalizing', description: 'Packaging agent for deployment' }
];

const BuildProgress: React.FC<BuildProgressProps> = ({ onComplete }) => {
  const builder = useSelector((state: RootState) => state.builder);
  const { buildProgress, error, result, userRequest } = builder;
  
  const [activeStep, setActiveStep] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  
  // Update active step based on build progress
  useEffect(() => {
    if (buildProgress >= 100) {
      setActiveStep(buildSteps.length);
      setStepProgress(100);
      onComplete(result.agentId);
    } else {
      const step = Math.floor((buildProgress / 100) * buildSteps.length);
      setActiveStep(step);
      const remainder = buildProgress % (100 / buildSteps.length);
      setStepProgress(remainder * buildSteps.length);
    }
  }, [buildProgress, onComplete, result.agentId]);

  // Simulate progress updates if needed for demo
  useEffect(() => {
    if (buildProgress === 0 && !error) {
      const interval = setInterval(() => {
        // This is just for demonstration - in a real implementation,
        // progress would come from the backend
        setStepProgress(prev => {
          if (prev >= 100) {
            setActiveStep(current => {
              if (current < buildSteps.length - 1) {
                return current + 1;
              }
              clearInterval(interval);
              return current;
            });
            return 0;
          }
          return prev + 5;
        });
      }, 300);
      
      return () => clearInterval(interval);
    }
  }, [buildProgress, error]);

  // Render requirements extracted from the user request
  const renderRequirements = () => {
    // In a real app, these would come from the backend analysis
    // For demo, we'll extract some keywords from the user request
    const sampleRequirements = [
      'User authentication',
      'Real-time communication',
      'Automated scheduling',
      'Data encryption',
      'Cross-platform compatibility'
    ];
    
    return (
      <List dense>
        {sampleRequirements.map((req, index) => (
          <ListItem key={index}>
            <ListItemText primary={req} />
          </ListItem>
        ))}
      </List>
    );
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Building Your Agent
      </Typography>
      
      {error ? (
        <Box sx={{ mt: 2, mb: 3 }}>
          <Typography color="error" sx={{ mb: 2 }}>
            Error: {error}
          </Typography>
          <Button variant="outlined" color="primary">
            Try Again
          </Button>
        </Box>
      ) : (
        <>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
            {buildSteps.map((step, index) => (
              <Step key={index}>
                <StepLabel>{step.label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          {activeStep < buildSteps.length && (
            <>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {buildSteps[activeStep].description}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={stepProgress} 
                sx={{ height: 8, borderRadius: 4, my: 1 }}
              />
              <Typography variant="caption" color="textSecondary" align="right" sx={{ display: 'block' }}>
                {Math.round(buildProgress)}% complete
              </Typography>
            </>
          )}
          
          {activeStep === buildSteps.length && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" color="primary" gutterBottom>
                Agent Successfully Built!
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                sx={{ mt: 2 }}
                onClick={() => onComplete(result.agentId)}
              >
                View Agent Details
              </Button>
            </Box>
          )}
        </>
      )}
      
      <Divider sx={{ my: 3 }} />
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Request Analysis
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {userRequest}
              </Typography>
              <Typography variant="subtitle2" gutterBottom>
                Extracted Requirements:
              </Typography>
              {renderRequirements()}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Agent Configuration
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Template:
                </Typography>
                <Chip 
                  label={builder.selectedTemplate || 'Basic Agent'} 
                  color="primary" 
                  variant="outlined"
                />
              </Box>
              <Typography variant="subtitle2" gutterBottom>
                Selected Tools:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {builder.selectedTools.length > 0 ? (
                  builder.selectedTools.map((tool) => (
                    <Chip key={tool} label={tool} size="small" />
                  ))
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No tools selected
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default BuildProgress;