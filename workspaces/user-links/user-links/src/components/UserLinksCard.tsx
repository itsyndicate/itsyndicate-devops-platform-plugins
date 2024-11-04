import React, { useState, useEffect } from 'react';
import { useApi, errorApiRef, identityApiRef } from '@backstage/core-plugin-api';
import { userLinksApiRef } from '../api/UserLinksApi';
import { Progress, InfoCard } from '@backstage/core-components';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, IconButton, List, ListItem, Typography, Tooltip } from '@material-ui/core';
import { Delete as DeleteIcon } from '@material-ui/icons';
import { useSnackbar } from 'notistack';
import { useEntity } from '@backstage/plugin-catalog-react';
import { SocialIcon } from 'react-social-icons';

export type UserLink = {
  id: number;
  userId: string;
  name: string; 
  link: string;
  description?: string;
};

export const UserLinksCard = () => {
  const userLinksApi = useApi(userLinksApiRef);
  const errorApi = useApi(errorApiRef);
  const identityApi = useApi(identityApiRef);
  const { entity } = useEntity();
  const [userLinks, setUserLinks] = useState<UserLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorOccurred, setErrorOccurred] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLink, setNewLink] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const [identityId, setIdentityId] = useState<string | null>(null);

  useEffect(() => {
    const fetchIdentity = async () => {
      try {
        const identity = await identityApi.getBackstageIdentity();
        const id = identity.userEntityRef.split('/').pop() ?? null;
        setIdentityId(id);
      } catch (error) {
        errorApi.post(new Error('Failed to fetch user identity'));
      }
    };
    fetchIdentity();
  }, [identityApi, errorApi]);

  const entityI= entity.metadata.name;
  const entityId= entityI.toLowerCase()
  const canShowSettings = identityId?.toLowerCase() === entityId;

  const fetchUserLinks = async () => {
    setLoading(true);
    setErrorOccurred(false);
    try {
      const links = await userLinksApi.getUserLinks(entityId);
      setUserLinks(links);
      if (links.length === 0) {
        setErrorOccurred(true);
      }
    } catch (error) {
      setErrorOccurred(true);
      errorApi.post(new Error(`Failed to fetch user links: ${error.message}`));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserLinks();
  }, [entityId]);

  const handleSaveLink = async () => {
    try {
      await userLinksApi.addUserLink({ userId: entityId, name: newName, link: newLink, description: newDescription });
      enqueueSnackbar('Link added successfully', { variant: 'success' });
      fetchUserLinks();
      setDialogOpen(false);
      setNewName('');
      setNewLink('');
      setNewDescription('');
    } catch (error) {
      console.error('Error creating link:', error);
      enqueueSnackbar(`Failed to add link: ${error.message}`, { variant: 'error' });
    }
  };

  const handleDeleteLink = async (id: number) => {
    try {
      await userLinksApi.deleteUserLink(id);
      enqueueSnackbar('Link deleted successfully', { variant: 'success' });
      fetchUserLinks();
    } catch (error) {
      enqueueSnackbar('Failed to delete link', { variant: 'error' });
    }
  };

  return (
    <Box>
      <InfoCard title="User Links">
        {loading ? (
          <Progress />
        ) : errorOccurred ? (
          <Typography variant="body1" color="textSecondary">
            No links available.
          </Typography>
        ) : (
          <List>
            {userLinks.map(link => (
              <ListItem key={link.id} alignItems="flex-start">
                <Box display="flex" flexDirection="row" alignItems="center" justifyContent="flex-start">
                  <SocialIcon url={link.link} style={{ height: 25, width: 25, marginRight: 10 }} />
                  <Box display="flex" flexDirection="column" alignItems="flex-start">
                    <Tooltip title={link.link} arrow>
                      <a href={link.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', marginBottom: 4 }}>
                        <Typography variant="h6" color="primary">
                          {link.name}
                        </Typography>
                      </a>
                    </Tooltip>
                    {link.description && (
                      <Typography variant="body2" color="textSecondary">
                        {link.description}
                      </Typography>
                    )}
                  </Box>
                </Box>
                {canShowSettings && (
                  <IconButton onClick={() => handleDeleteLink(link.id)} style={{ marginLeft: 'auto' }}>
                    <DeleteIcon />
                  </IconButton>
                )}
              </ListItem>
            ))}
          </List>
        )}

        {canShowSettings && (
          <Button variant="contained" color="primary" onClick={() => setDialogOpen(true)}>
            Add New Link
          </Button>
        )}
      </InfoCard>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add New Link</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Link"
            value={newLink}
            onChange={e => setNewLink(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Description"
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
            fullWidth
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleSaveLink} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
