import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  People as PeopleIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import { type EmployeeHours } from '../types/api';

const EmployeeHoursPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['employeeHours'],
    queryFn: () => apiClient.getEmployeeHours(),
  });

  const employees: EmployeeHours[] = data?.employees || [];

  // Compute summary totals across all employees
  const totalEmployees = employees.length;
  const totalHours = employees.reduce(
    (sum: number, emp: EmployeeHours) => sum + emp.total_hours,
    0,
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Employee Hours
      </Typography>

      {/* Summary cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* @ts-expect-error - MUI Grid item prop type issue */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" gap={3}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Total Employees
                  </Typography>
                  <Typography variant="h4" component="div">
                    {totalEmployees}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    backgroundColor: '#1976d2',
                    borderRadius: 1,
                    p: 1,
                    color: 'white',
                    flexShrink: 0,
                  }}
                >
                  <PeopleIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        {/* @ts-expect-error - MUI Grid item prop type issue */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" gap={3}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Total Hours
                  </Typography>
                  <Typography variant="h4" component="div">
                    {totalHours.toFixed(2)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    backgroundColor: '#f57c00',
                    borderRadius: 1,
                    p: 1,
                    color: 'white',
                    flexShrink: 0,
                  }}
                >
                  <AccessTimeIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Employee hours table */}
      {employees.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee Email</TableCell>
                <TableCell align="right">Total Hours</TableCell>
                <TableCell align="right">Total Entries</TableCell>
                <TableCell>Last Entry Date</TableCell>
                <TableCell>Member Since</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.map((emp: EmployeeHours) => (
                <TableRow key={emp.email}>
                  <TableCell>{emp.email}</TableCell>
                  <TableCell align="right">{emp.total_hours.toFixed(2)}</TableCell>
                  <TableCell align="right">{emp.total_entries}</TableCell>
                  <TableCell>
                    {emp.last_entry_date
                      ? new Date(emp.last_entry_date).toLocaleDateString()
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {new Date(emp.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Paper sx={{ p: 3 }}>
          <Typography color="text.secondary" align="center">
            No employees found.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default EmployeeHoursPage;
