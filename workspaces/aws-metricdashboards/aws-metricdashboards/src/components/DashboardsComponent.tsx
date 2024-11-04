import React, { useEffect, useState } from 'react';
import {
  Typography,
  Card,
  CardContent,
  Grid,
  Link,
  Paper,
  MenuItem,
  Select,
  FormControl,
  Box,
} from '@material-ui/core';
import { makeStyles, Theme, createStyles } from '@material-ui/core/styles';
import { useApi } from '@backstage/core-plugin-api';
import {
  automaticDashboardApiRef,
  AutomaticDashboard,
  Resource,
  MetricDataResult,
} from './AutoDashboardsApi';
import { Progress } from '@backstage/core-components';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DashboardsComponentProps {}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    paper: {
      padding: theme.spacing(2),
      marginBottom: theme.spacing(2),
      textAlign: 'center',
      color: theme.palette.text.secondary,
    },
    dashboardName: {
      marginBottom: theme.spacing(1),
    },
    card: {
      padding: theme.spacing(2),
      marginBottom: theme.spacing(2),
      color: theme.palette.text.primary,
      height: '100%',
    },
    metricCard: {
      marginTop: theme.spacing(2),
    },
    link: {
      textDecoration: 'none',
    },
    filterContainer: {
      marginBottom: theme.spacing(2),
    },
  }),
);

/**
 * DashboardsComponent
 * Displays automatic dashboards.
 */
export const DashboardsComponent: React.FC<DashboardsComponentProps> = () => {
  const automaticDashboardApi = useApi(automaticDashboardApiRef);
  const classes = useStyles();
  const [dashboards, setDashboards] = useState<AutomaticDashboard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [regions, setRegions] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('All');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await automaticDashboardApi.getAutomaticDashboards();
        setDashboards(data);

        // Extract unique regions from dashboards data
        const uniqueRegions = Array.from(
          new Set(
            data.flatMap(dashboard =>
              dashboard.resources
                .map(resource => resource.region)
                .filter((region): region is string => region !== undefined) // Filter out undefined
            )
          )
        );
        setRegions(['All', ...uniqueRegions]);
      } catch (err) {
        console.error('Error fetching automatic dashboards or regions:', err);
        setError('Failed to load automatic dashboards or regions.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [automaticDashboardApi]);

  if (loading) {
    return <Progress />;
  }

  if (error) {
    return (
      <Typography variant="body2" color="error">
        {error}
      </Typography>
    );
  }

  // Filter out resources based on the selected region
  const dashboardsWithFilteredResources = dashboards.map(dashboard => ({
    ...dashboard,
    resources: dashboard.resources.filter(resource => 
      selectedRegion === 'All' || resource.region === selectedRegion
    ),
  })).filter(dashboard => dashboard.resources.length > 0);

  if (dashboardsWithFilteredResources.length === 0) {
    return (
      <Paper className={classes.paper} elevation={3}>
        <Typography variant="h6">No Dashboards Available</Typography>
      </Paper>
    );
  }

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Metrics
      </Typography>

      <Box marginBottom={2} display="flex" alignItems="center">
        <Typography variant="h6" style={{ fontSize: '1.1rem', marginRight: '8px' }}>
          Region:
        </Typography>
        <FormControl style={{ minWidth: 200 }}>
          <Select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value as string)}
            style={{ fontSize: '1.1rem' }}
          >
            {regions.map((region) => (
              <MenuItem key={region} value={region}>
                {region}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        {dashboardsWithFilteredResources.map(dashboard => (
          <>
            {dashboard.resources.map(resource => {
              let timestampNumber = 0;
              resource.metrics.forEach(metric => {
                metric.Values.forEach(item => {
                  timestampNumber += item;
                });
              });
              if (timestampNumber === 0) {
                return null;
              }
              return (
                <Grid item xs={12} md={4} key={resource.name}>
                  <ResourceCard resource={resource} dashboardName={dashboard.resourceType} />
                </Grid>
              );
            })}
          </>
        ))}
      </Grid>
    </div>
  );
};


interface ResourceCardProps {
  resource: Resource;
  dashboardName: string;
}

const ResourceCard: React.FC<ResourceCardProps> = ({ resource, dashboardName }) => {
  const classes = useStyles();
 
  return (
    <Card className={classes.card} elevation={3}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <Link
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className={classes.link}
          >
          {dashboardName} ( {resource.name} )
          </Link>
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
              Region: {resource.region}
            </Typography>
        {/* Render metrics */}
        {resource.metrics.map(metric => {
          let timestampNumber = 0
         
            metric.Values.forEach((item)=>{
              timestampNumber += item
          
          })
          if (timestampNumber === 0) {
        return
          }
          return(
          
          <div key={metric.Id} className={classes.metricCard}>
            <Typography variant="subtitle1" gutterBottom>
              {metric.Label}
            </Typography>
            <MetricChart metric={metric} />
          </div>
        )})}
      </CardContent>
    </Card>
  );
};

interface MetricChartProps {
  metric: MetricDataResult;
}

const MetricChart: React.FC<MetricChartProps> = ({ metric }) => {
  const data = metric.Timestamps.map((timestamp, index) => ({
    timestamp: new Date(timestamp).toLocaleTimeString(),
    value: metric.Values[index],
  }));
  
  let timestampNumber = 0
  data.forEach((item)=>{
    timestampNumber += item.value
  })  
  if (data.length === 0 || timestampNumber === 0) {
    return (
      <Typography variant="body2">No data available for this metric.</Typography>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <XAxis dataKey="timestamp" />
        <YAxis />
        <RechartsTooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="value"
          name={metric.Label}
          stroke="#8884d8"
          activeDot={{ r: 8 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
