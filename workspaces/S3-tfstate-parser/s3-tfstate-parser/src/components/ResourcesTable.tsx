import React, { useEffect, useState, ChangeEvent } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { tfStateApiRef, TfStateResource } from './ResourcesApi';
import {
  Typography,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Link,
  TextField,
  makeStyles,
  Theme,
  createStyles,
} from '@material-ui/core';
import { Progress } from '@backstage/core-components';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    container: {
      padding: theme.spacing(4),
      backgroundColor: theme.palette.background.default,
    },
    tableContainer: {
      width: '100%',
      maxHeight: 400,
      minHeight: 400,
      borderRadius: theme.shape.borderRadius,
      boxShadow: theme.shadows[2],
    },
    categoryTitle: {
      textAlign: 'center',
      fontWeight: 700, // Bold font weight
      margin: theme.spacing(2, 0),
      color: theme.palette.primary.main,
    },
    gridItem: {
      padding: theme.spacing(2),
    },
    noData: {
      padding: theme.spacing(2),
      textAlign: 'center',
      color: theme.palette.text.secondary,
    },
    searchBar: {
      marginBottom: theme.spacing(3),
      backgroundColor: theme.palette.background.paper,
      borderRadius: theme.shape.borderRadius,
      boxShadow: theme.shadows[1],
    },
    tableHeaderCell: {
      fontWeight: 500, // Medium font weight
      backgroundColor: theme.palette.grey[200],
    },
    tableRow: {
      '&:nth-of-type(odd)': {
        backgroundColor: theme.palette.action.hover,
      },
    },
    link: {
      color: theme.palette.primary.main,
      '&:hover': {
        textDecoration: 'underline',
      },
    },
  }),
);

export const Resources = () => {
  const classes = useStyles();
  const api = useApi(tfStateApiRef);
  const [resources, setResources] = useState<TfStateResource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchResources = async () => {
    setLoading(true);
    try {
      const data = await api.getResources();
      setResources(data);
    } catch (err: any) {
      console.error('Failed to fetch tfstate resources:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.querySelectorAll('div > table').forEach(table => { 
      const parentDiv = table.parentElement; 
      if (parentDiv && parentDiv.tagName === 'DIV') {
        parentDiv.style.height = '100%';
      } 
    });
    fetchResources();
  }, [api]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value.toLowerCase());
  };

  const filterResources = (resource: TfStateResource) => {
    if (searchTerm === '') return true;
    return resource.name.toLowerCase().includes(searchTerm) ||
           resource.type.toLowerCase().includes(searchTerm) ||
           resource.id.toLowerCase().includes(searchTerm);
  };

  const categorizeResources = () => {
    return resources.reduce<Record<string, TfStateResource[]>>((acc, resource) => {
      if (!filterResources(resource)) return acc;
      const type = resource.type.split('_')[1];
      const category = type.charAt(0).toUpperCase() + type.slice(1);
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(resource);
      return acc;
    }, {});
  };

  if (loading) {
    return <Progress />;
  }

  if (error) {
    return <Typography variant="h6" color="error">{error}</Typography>;
  }

  const categorizedResources = categorizeResources();

  return (
    <div className={classes.container}>
      <Typography variant="h4" color="textPrimary">Terraform Managed Resources</Typography>
      <TextField
        label="Search Resources"
        variant="outlined"
        fullWidth
        value={searchTerm}
        onChange={handleSearchChange}
        className={classes.searchBar}
        placeholder="Search by name, type, or ID"
      />
      <Grid container spacing={2}>
        {Object.entries(categorizedResources).map(([category, resources]) => (
          resources.length > 0 ? (
            <Grid item xs={12} sm={6} className={classes.gridItem} key={category}>
              <Paper elevation={3}>
                <Typography variant="h6" className={classes.categoryTitle}>{category} Resources</Typography>
                <TableContainer component={Paper} className={classes.tableContainer}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell className={classes.tableHeaderCell}>Name</TableCell>
                        <TableCell className={classes.tableHeaderCell}>Type</TableCell>
                        <TableCell className={classes.tableHeaderCell}>ID</TableCell>
                        <TableCell className={classes.tableHeaderCell}></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {resources.map((resource, index) => (
                        <TableRow key={index} className={classes.tableRow}>
                          <TableCell>{resource.name}</TableCell>
                          <TableCell>{resource.type}</TableCell>
                          <TableCell>{resource.id}</TableCell>
                          <TableCell>
                            {resource.url && (
                              <Link href={resource.url} target="_blank" className={classes.link}>
                                View in AWS Console
                              </Link>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          ) : null
        ))}
      </Grid>
    </div>
  );
};
