import React, { useEffect, useState } from 'react';
import { useApi, errorApiRef } from '@backstage/core-plugin-api';
import { awsHealthApiRef } from './api/AwsHealthApi';
import { Progress, Table, TableColumn } from '@backstage/core-components';
import {
  Button,
  Box,
  MenuItem,
  Select,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@material-ui/core';

type AwsHealthEventRow = {
  service: string;
  eventTypeCode: string;
  eventTypeCategory: string;
  startTime?: string;
  link: string;
  details: string;
  statusCode: string;
};

export const AwsHealthComponent = () => {
  const awsHealthApi = useApi(awsHealthApiRef);
  const errorApi = useApi(errorApiRef);
  const [events, setEvents] = useState<AwsHealthEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventType, setEventType] = useState('issues');
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogContent, setDialogContent] = useState<string>('');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let data: any[];
      switch (eventType) {
        case 'issues':
          data = await awsHealthApi.getIssues();
          break;
        case 'scheduledChanges':
          data = await awsHealthApi.getScheduledChanges();
          break;
        case 'notifications':
          data = await awsHealthApi.getNotifications();
          break;
        case 'eventLog':
          data = await awsHealthApi.getEventLog();
          break;
        default:
          data = [];
      }

      const mappedData = data.map(event => ({
        service: event.service,
        eventTypeCode: event.eventTypeCode,
        eventTypeCategory: event.eventTypeCategory,
        startTime: event.startTime,
        link: event.link,
        details: event.details,
        statusCode: event.statusCode,
      }));
      setEvents(mappedData);
    } catch (error: Error | any) {
      errorApi.post(new Error(`Failed to fetch AWS Health events: ${error.message}`));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [eventType]);

  const handleEventTypeChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setEventType(event.target.value as string);
  };

  const handleOpenDialog = (details: string) => {
    setDialogContent(details);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setDialogContent('');
  };

  const columns: TableColumn<AwsHealthEventRow>[] = [
    {
      title: 'Service',
      field: 'service',
    },
    {
      title: 'Category',
      field: 'eventTypeCategory',
    },
    {
      title: 'Status',
      field: 'statusCode',
    },
    {
      title: 'Start Time',
      field: 'startTime',
      render: rowData =>
        rowData.startTime ? new Date(rowData.startTime).toLocaleString() : 'N/A',
    },
    {
      title: 'Details',
      field: 'details',
      render: rowData => (
        <Button onClick={() => handleOpenDialog(rowData.details)} color="primary">
          View Details
        </Button>
      ),
    },
    {
      title: 'Link',
      field: 'link',
      render: rowData => (
        <a href={rowData.link} target="_blank" rel="noopener noreferrer">
          View in AWS Console
        </a>
      ),
    },
  ];

  return (
    <Box>
      <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">AWS Health Events</Typography>
        <Select value={eventType} onChange={handleEventTypeChange}>
          <MenuItem value="issues">Issues</MenuItem>
          <MenuItem value="scheduledChanges">Scheduled Changes</MenuItem>
          <MenuItem value="notifications">Notifications</MenuItem>
          <MenuItem value="eventLog">Event Log</MenuItem>
        </Select>
        <Button variant="contained" color="primary" onClick={fetchEvents} disabled={loading}>
          Refresh
        </Button>
      </Box>
      {loading ? (
        <Progress />
      ) : (
        <Table
          title={`AWS Health - ${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`}
          options={{ search: true, paging: true }}
          columns={columns}
          data={events}
        />
      )}
      
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Event Details</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {dialogContent}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
