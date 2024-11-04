import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  IconButton,
  makeStyles,
  Avatar,
  Typography,
} from '@material-ui/core';
import { useApi } from '@backstage/core-plugin-api';
import { awsResourcesApiRef } from './AwsResourcesApi';
import { useAsync } from 'react-use';
import { awsIcons } from './icons/awsIcons';
import CloudIcon from '@material-ui/icons/Cloud';

// Styles to match the given design
const useStyles = makeStyles((theme) => ({
  cardContainer: {
    padding: theme.spacing(2),
  },
  card: {
    borderRadius: '50%',
    height: '60px', 
    width: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    backgroundColor: theme.palette.background.default,
  },
  count: {
    fontSize: '18px',
    fontWeight: 700,
    color: theme.palette.text.primary,
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    textAlign: 'center',
    marginTop: theme.spacing(0.5),
  },
  cardContent: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  iconImage: {
    maxWidth: '60%',
    maxHeight: '60%',
    objectFit: 'contain',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    marginRight: theme.spacing(2),
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
  },
}));

export const AwsResourcesWidget = () => {
  const classes = useStyles();
  const awsResourcesApi = useApi(awsResourcesApiRef);
  const [openDialog, setOpenDialog] = useState<string | null>(null);

  const { value: resourceCounts, loading, error } = useAsync(async () => {
    return await awsResourcesApi.getAwsResources();
  }, []);

  const handleDialogOpen = (type: string) => {
    setOpenDialog(type);
  };

  const handleDialogClose = () => {
    setOpenDialog(null);
  };

  if (loading) return <p>Loading AWS resources...</p>;
  if (error) return <p>Error fetching AWS resources: {error.message}</p>;

  return (
    <><Typography variant="h3">Cloud Usage</Typography><Card>
      <CardContent>
        <Grid container spacing={2} justifyContent="flex-start">
          {resourceCounts &&
            Object.keys(resourceCounts).map((resourceType) => (
              <Grid item xs={12} sm={6} md={4} key={resourceType}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <IconButton
                    onClick={() => handleDialogOpen(resourceType)}
                    className={classes.card}
                    aria-label={`View details for ${resourceType}`}
                  >
                    {awsIcons[resourceType] ? (
                      awsIcons[resourceType]
                    ) : (
                      <CloudIcon fontSize="large" />
                    )}
                  </IconButton>
                  <div>
                    <div className={classes.count}>
                      {resourceCounts[resourceType].count}
                    </div>
                    <div className={classes.label}>{resourceType}</div>
                  </div>
                </div>
              </Grid>
            ))}
        </Grid>
      </CardContent>

      {openDialog && (
        <Dialog open={!!openDialog} onClose={handleDialogClose} fullWidth maxWidth="sm">
          <DialogTitle>Details for {openDialog}</DialogTitle>
          <DialogContent>
            <List>
              {resourceCounts[openDialog]?.resources?.map((resource: any) => (
                <ListItem button component="a" href={resource.link} target="_blank" key={resource.id}>
                  <Avatar className={classes.avatar}>
                    {resource?.name?.includes('RDS:') ? awsIcons['rds'] : resource?.name?.includes('DynamoDB:') ? awsIcons['dynamoDBTables'] : awsIcons[openDialog] ? awsIcons[openDialog] : <CloudIcon />}
                  </Avatar>
                  <ListItemText primary={resource.name || resource.id} />
                </ListItem>
              ))}
            </List>
          </DialogContent>
        </Dialog>
      )}
    </Card></>
  );
};