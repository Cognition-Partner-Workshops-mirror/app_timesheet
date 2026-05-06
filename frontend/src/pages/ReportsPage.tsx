import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  Description as CsvIcon,
  Assessment as ReportIcon,
  AccessTime as ClockIcon,
  Assignment as EntryIcon,
  Functions as AvgIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import { type ClientReport } from '../types/api';
import { bankingColors } from '../theme';

const ReportsPage: React.FC = () => {
  const [selectedClientId, setSelectedClientId] = useState<number>(0);
  const [error, setError] = useState('');

  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => apiClient.getClients(),
  });

  const { data: reportData, isLoading: reportLoading } = useQuery({
    queryKey: ['clientReport', selectedClientId],
    queryFn: () => apiClient.getClientReport(selectedClientId),
    enabled: selectedClientId > 0,
  });

  const clients = clientsData?.clients || [];
  const report = reportData as ClientReport | undefined;

  const handleExportCsv = async () => {
    if (!selectedClientId) return;
    
    try {
      const blob = await apiClient.exportClientReportCsv(selectedClientId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const client = clients.find((c: { id: number; name: string }) => c.id === selectedClientId);
      a.download = `${client?.name?.replace(/[^a-zA-Z0-9]/g, '_')}_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      setError('Failed to export CSV report');
      console.error('Export error:', err);
    }
  };

  const handleExportPdf = async () => {
    if (!selectedClientId) return;

    try {
      const blob = await apiClient.exportClientReportPdf(selectedClientId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const client = clients.find((c: { id: number; name: string }) => c.id === selectedClientId);
      a.download = `${client?.name?.replace(/[^a-zA-Z0-9]/g, '_')}_report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      setError('Failed to export PDF report');
      console.error('Export error:', err);
    }
  };

  const selectedClient = clients.find((c: { id: number; name: string }) => c.id === selectedClientId);

  if (clientsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress sx={{ color: bankingColors.teal }} />
      </Box>
    );
  }

  const reportStats = report ? [
    {
      title: 'Total Hours',
      value: report.totalHours.toFixed(2),
      icon: <ClockIcon sx={{ fontSize: 24 }} />,
      gradient: `linear-gradient(135deg, ${bankingColors.deepBlue} 0%, ${bankingColors.accentBlue} 100%)`,
      shadowColor: bankingColors.accentBlue,
    },
    {
      title: 'Total Entries',
      value: report.entryCount,
      icon: <EntryIcon sx={{ fontSize: 24 }} />,
      gradient: `linear-gradient(135deg, ${bankingColors.tealDark} 0%, ${bankingColors.teal} 100%)`,
      shadowColor: bankingColors.teal,
    },
    {
      title: 'Avg Hours/Entry',
      value: report.entryCount > 0 ? (report.totalHours / report.entryCount).toFixed(2) : '0.00',
      icon: <AvgIcon sx={{ fontSize: 24 }} />,
      gradient: `linear-gradient(135deg, #E65100 0%, ${bankingColors.gold} 100%)`,
      shadowColor: bankingColors.gold,
    },
  ] : [];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: bankingColors.navy }}>Reports</Typography>
        <Typography variant="body2" sx={{ color: bankingColors.textSecondary }}>
          Generate detailed time reports and export data
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {clients.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
          <ReportIcon sx={{ fontSize: 48, color: alpha(bankingColors.navy, 0.12), mb: 1.5 }} />
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            You need to create at least one client before generating reports.
          </Typography>
          <Button variant="contained" href="/clients">
            Create Client
          </Button>
        </Paper>
      ) : (
        <>
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Select Client</InputLabel>
                  <Select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(Number(e.target.value))}
                    label="Select Client"
                  >
                    <MenuItem value={0}>Choose a client...</MenuItem>
                    {clients.map((c: { id: number; name: string }) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Box display="flex" gap={1.5}>
                  <Tooltip title="Export as CSV">
                    <span>
                      <Button
                        variant="outlined"
                        startIcon={<CsvIcon />}
                        onClick={handleExportCsv}
                        disabled={!selectedClientId || reportLoading}
                        size="small"
                      >
                        CSV
                      </Button>
                    </span>
                  </Tooltip>
                  <Tooltip title="Export as PDF">
                    <span>
                      <Button
                        variant="outlined"
                        startIcon={<PdfIcon />}
                        onClick={handleExportPdf}
                        disabled={!selectedClientId || reportLoading}
                        size="small"
                        sx={{
                          borderColor: alpha(bankingColors.error, 0.3),
                          color: bankingColors.error,
                          '&:hover': {
                            borderColor: bankingColors.error,
                            background: alpha(bankingColors.error, 0.05),
                          },
                        }}
                      >
                        PDF
                      </Button>
                    </span>
                  </Tooltip>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {selectedClient && reportLoading && (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress sx={{ color: bankingColors.teal }} />
            </Box>
          )}

          {selectedClient && report && (
            <>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                {reportStats.map((stat, index) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                    <Card
                      sx={{
                        position: 'relative',
                        overflow: 'hidden',
                        background: alpha('#FFFFFF', 0.8),
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '4px',
                          background: stat.gradient,
                        },
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Box>
                            <Typography
                              variant="overline"
                              sx={{ color: bankingColors.textSecondary, fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.08em' }}
                            >
                              {stat.title}
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800, color: bankingColors.navy, mt: 0.5 }}>
                              {stat.value}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              width: 44,
                              height: 44,
                              borderRadius: '6px',
                              background: stat.gradient,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#FFFFFF',
                              boxShadow: `0 4px 16px ${alpha(stat.shadowColor, 0.3)}`,
                            }}
                          >
                            {stat.icon}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Hours</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Created</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {report.workEntries.length > 0 ? (
                        report.workEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>
                              <Typography variant="body2">
                                {new Date(entry.date).toLocaleDateString()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={`${entry.hours}h`}
                                size="small"
                                sx={{
                                  background: alpha(bankingColors.teal, 0.1),
                                  color: bankingColors.tealDark,
                                  fontWeight: 700,
                                  border: `1px solid ${alpha(bankingColors.teal, 0.2)}`,
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              {entry.description ? (
                                <Typography variant="body2" color="text.secondary">
                                  {entry.description}
                                </Typography>
                              ) : (
                                <Typography variant="body2" sx={{ color: alpha(bankingColors.textSecondary, 0.5) }}>--</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {new Date(entry.created_at).toLocaleDateString()}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            <Box sx={{ py: 5 }}>
                              <ReportIcon sx={{ fontSize: 48, color: alpha(bankingColors.navy, 0.12), mb: 1.5 }} />
                              <Typography color="text.secondary">
                                No work entries found for this client.
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </>
          )}

          {!selectedClient && (
            <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
              <ReportIcon sx={{ fontSize: 48, color: alpha(bankingColors.navy, 0.12), mb: 1.5 }} />
              <Typography color="text.secondary">
                Select a client to view their time report.
              </Typography>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
};

export default ReportsPage;
