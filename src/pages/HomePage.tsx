import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Container,
  Paper
} from '@mui/material';
import {
  Build as BuildIcon,
  CloudUpload as DeployIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import { RootState } from '../state/store';

interface Feature {
  title: string;
  description: string;
  icon: React.ReactNode;
  action: string;
  path: string;
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.user);
  const { agents } = useSelector((state: RootState) => state.agents);

  const features: Feature[] = [
    {
      title: 'Build Your Agent',
      description: 'Create custom AI agents tailored to your specific needs using our intuitive builder interface.',
      icon: <BuildIcon fontSize="large" />,
      action: 'Start Building',
      path: '/builder'
    },
    {
      title: 'Deploy & Manage',
      description: 'Deploy your agents to production and monitor their performance in real-time.',
      icon: <DeployIcon fontSize="large" />,
      action: 'View Deployments',
      path: '/deployment'
    },
    {
      title: 'Settings & Integration',
      description: 'Configure your workspace settings and integrate with external services.',
      icon: <SettingsIcon fontSize="large" />,
      action: 'Configure',
      path: '/settings'
    },
    {
      title: 'Analytics Dashboard',
      description: 'Track agent performance, usage metrics, and system health.',
      icon: <DashboardIcon fontSize="large" />,
      action: 'View Analytics',
      path: '/analytics'
    }
  ];

  return (
    <Container maxWidth="lg">
      {/* Welcome Section */}
      <Box sx={{ my: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Welcome to NovaMind
        </Typography>
        <Typography variant="h6" color="textSecondary" paragraph>
          Your AI Agent Creation Platform
        </Typography>
        {!user && (
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={() => navigate('/auth')}
            sx={{ mt: 2 }}
          >
            Get Started
          </Button>
        )}
      </Box>

      {/* Features Grid */}
      <Grid container spacing={4} sx={{ mb: 6 }}>
        {features.map((feature) => (
          <Grid item xs={12} sm={6} md={3} key={feature.title}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  {feature.icon}
                </Box>
                <Typography variant="h6" component="h2" align="center" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="textSecondary" align="center">
                  {feature.description}
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => navigate(feature.path)}
                >
                  {feature.action}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Stats Section */}
      {user && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Your Workspace
          </Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} sm={4}>
              <Typography variant="h3" align="center">
                {agents?.length || 0}
              </Typography>
              <Typography variant="subtitle1" align="center" color="textSecondary">
                Active Agents
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="h3" align="center">
                {/* Placeholder for API calls stat */}
                0
              </Typography>
              <Typography variant="subtitle1" align="center" color="textSecondary">
                API Calls Today
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="h3" align="center">
                {/* Placeholder for uptime stat */}
                100%
              </Typography>
              <Typography variant="subtitle1" align="center" color="textSecondary">
                System Uptime
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Container>
  );
};

export default HomePage; 