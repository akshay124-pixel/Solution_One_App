import React, { useState, useEffect } from "react";
import api from "../../api/api";
import {
  Box,
  Paper,
  Button,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
} from "@mui/material";
import {
  Phone,
  CheckCircle,
  Cancel,
  Schedule,
  TrendingUp,
  ArrowBack,
  FileDownload,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { toast } from "react-toastify";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

/**
 * Call Analytics Dashboard Component
 * Displays call metrics, trends, and agent performance
 */
const CallAnalyticsDashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [agentPerformance, setAgentPerformance] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Date range filter states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Build query params for date filtering
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append("startDate", startDate);
      if (endDate) queryParams.append("endDate", endDate);
      const queryString = queryParams.toString();

      // Using api instance for automatic token handling and refresh
      const [summaryRes, agentRes, trendsRes] = await Promise.all([
        api.get(`/api/analytics/call-summary${queryString ? `?${queryString}` : ""}`),
        api.get(`/api/analytics/agent-performance${queryString ? `?${queryString}` : ""}`),
        api.get(`/api/analytics/call-trends?days=30${queryString ? `&${queryString}` : ""}`),
      ]);

      if (summaryRes.data.success) setSummary(summaryRes.data.data);
      if (agentRes.data.success) setAgentPerformance(agentRes.data.data);
      if (trendsRes.data.success) setTrends(trendsRes.data.data);
    } catch (error) {
      console.error("Fetch analytics error:", error);
      toast.error("Failed to fetch analytics data");
    } finally {
      setLoading(false);
    }
  };

  // Apply date filter
  const handleApplyFilter = () => {
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      toast.error("Start date must be before end date");
      return;
    }
    fetchAnalytics();
  };

  // Reset date filter
  const handleResetFilter = async () => {
    // Clear all filters
    setStartDate("");
    setEndDate("");
    
    // Fetch analytics without any filters
    setLoading(true);
    try {
      // Using api instance for automatic token handling and refresh
      const [summaryRes, agentRes, trendsRes] = await Promise.all([
        api.get("/api/analytics/call-summary"),
        api.get("/api/analytics/agent-performance"),
        api.get("/api/analytics/call-trends?days=30"),
      ]);

      if (summaryRes.data.success) setSummary(summaryRes.data.data);
      if (agentRes.data.success) setAgentPerformance(agentRes.data.data);
      if (trendsRes.data.success) setTrends(trendsRes.data.data);
      
      toast.success("Filters reset successfully!");
    } catch (error) {
      console.error("Fetch analytics error:", error);
      toast.error("Failed to fetch analytics data");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to parse duration string to seconds
  const parseDurationToSeconds = (durationStr) => {
    if (!durationStr || durationStr === "0:00:00") return 0;
    const parts = durationStr.split(":");
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const seconds = parseInt(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  };


// Helper function to check if agent has less than 3 hours in last 3 days
const isLowPerformance = (agent) => {
  const totalSeconds = parseDurationToSeconds(agent.totalDurationFormatted);
  const threeHoursInSeconds = 3 * 3600; // 3 hours = 10800 seconds
  return totalSeconds < threeHoursInSeconds;
};


  // Export filtered data to CSV
  const handleExportCSV = () => {
    if (!agentPerformance || agentPerformance.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      // Prepare CSV headers
      const headers = ["Agent Name", "Email", "Total Calls", "Completed Calls", "Connection Rate (%)", "Total Duration", "Avg Duration"];
      
      // Prepare CSV rows
      const rows = agentPerformance.map(agent => [
        agent.username || "N/A",
        agent.email || "N/A",
        agent.totalCalls || 0,
        agent.completedCalls || 0,
        agent.connectionRate || 0,
        agent.totalDurationFormatted || "0:00:00",
        agent.avgDurationFormatted || "0:00:00"
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      const dateStr = startDate && endDate 
        ? `${startDate}_to_${endDate}` 
        : new Date().toISOString().split("T")[0];
      
      link.setAttribute("href", url);
      link.setAttribute("download", `Call_Analytics_Report_${dateStr}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Report exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report");
    }
  };

  // Prepare chart data
  const chartData = {
    labels: trends.map((t) => t._id),
    datasets: [
      {
        label: "Total Calls",
        data: trends.map((t) => t.totalCalls),
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        tension: 0.4,
      },
      {
        label: "Completed Calls",
        data: trends.map((t) => t.completedCalls),
        borderColor: "rgb(54, 162, 235)",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Call Trends (Last 30 Days)",
      },
    },
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3} sx={{ background: "#f5f7fa", minHeight: "100vh" }}>
      {/* Header */}
     

      {/* Date Range Filter Section */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: { xs: 2, sm: 3 }, 
          mb: 3, 
          borderRadius: "15px",
          boxShadow: "0 6px 18px rgba(0, 0, 0, 0.1)",
          border: "none",
          background: "white"
        }}
      > 
        
        <Box 
          display="flex" 
          alignItems="center" 
          gap={2} 
          flexWrap="wrap"
          sx={{
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" }
          }}
        ><Button
          startIcon={<ArrowBack />}
          onClick={() => navigate("/dms/dashboard")}
          sx={{
            background: "white",
            color: "#2575fc",
            borderRadius: "8px",
            textTransform: "none",
            fontWeight: 600,
            px: 2,
            "&:hover": {
              background: "#f0f0f0",
            }
          }}
        >
          Back to Dashboard
        </Button>
    
          <Button
            variant="contained"
            startIcon={<FileDownload />}
            onClick={handleExportCSV}
            sx={{
              background: "linear-gradient(90deg, #10b981, #059669)",
              textTransform: "none",
              fontWeight: 700,
              px: 3,
              py: 1,
              borderRadius: "12px",
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
              width: { xs: "100%", sm: "auto" },
              ml: { xs: 0, sm: "auto" },
              "&:hover": {
                background: "linear-gradient(90deg, #059669, #047857)",
                transform: "translateY(-2px)",
                boxShadow: "0px 6px 12px rgba(0, 0, 0, 0.2)",
              },
              transition: "all 0.2s ease"
            }}
          >
            Export CSV
          </Button>  <TextField
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ 
              minWidth: { xs: "100%", sm: 150 },
              "& .MuiOutlinedInput-root": {
                borderRadius: "10px",
                "&:hover fieldset": {
                  borderColor: "#2575fc",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#2575fc",
                }
              }
            }}
          />
          <TextField
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ 
              minWidth: { xs: "100%", sm: 150 },
              "& .MuiOutlinedInput-root": {
                borderRadius: "10px",
                "&:hover fieldset": {
                  borderColor: "#2575fc",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#2575fc",
                }
              }
            }}
          />
          <Button
            variant="contained"
            onClick={handleApplyFilter}
            sx={{
              background: "linear-gradient(90deg, #6a11cb, #2575fc)",
              textTransform: "none",
              fontWeight: 700,
              px: 3,
              py: 1,
              borderRadius: "12px",
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
              width: { xs: "100%", sm: "auto" },
              "&:hover": {
                background: "linear-gradient(90deg, #2575fc, #6a11cb)",
                transform: "translateY(-2px)",
                boxShadow: "0px 6px 12px rgba(0, 0, 0, 0.2)",
              },
              transition: "all 0.2s ease"
            }}
          >
            Apply Filter
          </Button>
          <Button
            variant="outlined"
            onClick={handleResetFilter}
            sx={{
              borderColor: "#2575fc",
              color: "#2575fc",
              textTransform: "none",
              fontWeight: 700,
              px: 3,
              py: 1,
              borderRadius: "12px",
              borderWidth: "2px",
              width: { xs: "100%", sm: "auto" },
              "&:hover": {
                borderColor: "#2575fc",
                borderWidth: "2px",
                background: "rgba(37, 117, 252, 0.08)",
                transform: "translateY(-2px)",
              },
              transition: "all 0.2s ease"
            }}
          >
            Reset
          </Button>
        </Box>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              borderRadius: "15px",
              boxShadow: "0 6px 18px rgba(0, 0, 0, 0.1)",
              transition: "all 0.3s ease",
              "&:hover": { 
                transform: "translateY(-4px)", 
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)" 
              }
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom fontWeight={600} fontSize="0.9rem">
                    Total Calls
                  </Typography>
                  <Typography variant="h3" fontWeight={700} color="#2575fc">
                    {summary?.totalCalls || 0}
                  </Typography>
                </Box>
                <Box sx={{ 
                  background: "linear-gradient(135deg, #e3f2fd, #bbdefb)", 
                  borderRadius: "50%", 
                  p: 1.5,
                  boxShadow: "0 4px 8px rgba(37, 117, 252, 0.2)"
                }}>
                  <Phone sx={{ fontSize: 32, color: "#2575fc" }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              borderRadius: "15px",
              boxShadow: "0 6px 18px rgba(0, 0, 0, 0.1)",
              transition: "all 0.3s ease",
              "&:hover": { 
                transform: "translateY(-4px)", 
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)" 
              }
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom fontWeight={600} fontSize="0.9rem">
                    Completed
                  </Typography>
                  <Typography variant="h3" fontWeight={700} color="#10b981">
                    {summary?.completedCalls || 0}
                  </Typography>
                </Box>
                <Box sx={{ 
                  background: "linear-gradient(135deg, #e8f5e9, #c8e6c9)", 
                  borderRadius: "50%", 
                  p: 1.5,
                  boxShadow: "0 4px 8px rgba(16, 185, 129, 0.2)"
                }}>
                  <CheckCircle sx={{ fontSize: 32, color: "#10b981" }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              borderRadius: "15px",
              boxShadow: "0 6px 18px rgba(0, 0, 0, 0.1)",
              transition: "all 0.3s ease",
              "&:hover": { 
                transform: "translateY(-4px)", 
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)" 
              }
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom fontWeight={600} fontSize="0.9rem">
                    Connection Rate
                  </Typography>
                  <Typography variant="h3" fontWeight={700} color="#6a11cb">
                    {summary?.connectionRate || 0}%
                  </Typography>
                </Box>
                <Box sx={{ 
                  background: "linear-gradient(135deg, #f3e5f5, #e1bee7)", 
                  borderRadius: "50%", 
                  p: 1.5,
                  boxShadow: "0 4px 8px rgba(106, 17, 203, 0.2)"
                }}>
                  <TrendingUp sx={{ fontSize: 32, color: "#6a11cb" }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              borderRadius: "15px",
              boxShadow: "0 6px 18px rgba(0, 0, 0, 0.1)",
              transition: "all 0.3s ease",
              "&:hover": { 
                transform: "translateY(-4px)", 
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)" 
              }
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom fontWeight={600} fontSize="0.9rem">
                    Total Duration
                  </Typography>
                  <Typography variant="h3" fontWeight={700} color="#f59e0b">
                    {summary?.totalDurationFormatted || "0:00:00"}
                  </Typography>
                </Box>
                <Box sx={{ 
                  background: "linear-gradient(135deg, #fff3e0, #ffe0b2)", 
                  borderRadius: "50%", 
                  p: 1.5,
                  boxShadow: "0 4px 8px rgba(245, 158, 11, 0.2)"
                }}>
                  <Schedule sx={{ fontSize: 32, color: "#f59e0b" }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Call Trends Chart */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: { xs: 2, sm: 3 }, 
          mb: 3, 
          borderRadius: "15px",
          boxShadow: "0 6px 18px rgba(0, 0, 0, 0.1)",
          border: "none",
          background: "white"
        }}
      >
        <Typography 
          variant="h6" 
          gutterBottom 
          fontWeight={700} 
          sx={{ 
            mb: 3,
            background: "linear-gradient(135deg, #2575fc, #6a11cb)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontSize: { xs: "1.1rem", sm: "1.25rem" }
          }}
        >
          📈 Call Trends (Last 30 Days)
        </Typography>
        <Line data={chartData} options={chartOptions} />
      </Paper>

      {/* Agent Performance Table */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: { xs: 2, sm: 3 }, 
          borderRadius: "15px",
          boxShadow: "0 6px 18px rgba(0, 0, 0, 0.1)",
          border: "none",
          background: "white"
        }}
      > <Paper 
        elevation={0} 
        sx={{ 
          p: 2, 
          mb: 2, 
          borderRadius: "12px",
          background: "linear-gradient(90deg, #e8f5e9, #e3f2fd)",
          border: "1px solid #10b981",
          textAlign: "center"
        }}
      >
        <Typography 
          variant="body1" 
          sx={{ 
            fontWeight: 600, 
            color: "#10b981",
            fontSize: "1rem"
          }}
        >
          📊 This Agent Performance - Displaying Today's Performance Data Only - {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Typography>
        <Typography 
          variant="caption" 
          sx={{ 
            color: "#666", 
            display: "block",
            mt: 0.5
          }}
        >
          Use date range filters below to analyze performance for different time periods
        </Typography>
      </Paper>
        <Typography 
          variant="h6" 
          gutterBottom 
          fontWeight={700} 
          sx={{ 
            mb: 3,
            background: "linear-gradient(135deg, #2575fc, #6a11cb)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontSize: { xs: "1.1rem", sm: "1.25rem" }
          }}
        >
          👥 Agent Performance
        </Typography>
        <TableContainer sx={{ borderRadius: "12px", overflow: "hidden" }}>
          <Table>
            <TableHead>
              <TableRow sx={{ 
                background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                "& th": {
                  borderBottom: "none"
                }
              }}>
                <TableCell sx={{ fontWeight: 700, color: "white", fontSize: "0.95rem", py: 2 }}>Agent</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: "white", fontSize: "0.95rem", py: 2 }}>Total Calls</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: "white", fontSize: "0.95rem", py: 2 }}>Completed</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: "white", fontSize: "0.95rem", py: 2 }}>Connection Rate</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: "white", fontSize: "0.95rem", py: 2 }}>Total Duration</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: "white", fontSize: "0.95rem", py: 2 }}>Avg Duration</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {agentPerformance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="textSecondary" fontWeight={600}>
                      No agent performance data available
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                agentPerformance.map((agent, index) => {
                  const lowPerf = isLowPerformance(agent);
                  return (
                    <TableRow 
                      key={agent.userId} 
                      sx={{ 
                        backgroundColor: lowPerf ? "#ffebee" : (index % 2 === 0 ? "#fafbfc" : "white"),
                        "&:hover": { 
                          background: lowPerf ? "#ffcdd2" : "#f0f4ff",
                          transform: "scale(1.01)",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
                        },
                        transition: "all 0.2s ease",
                        borderLeft: lowPerf ? "4px solid #ef4444" : "4px solid transparent"
                      }}
                    >
                      <TableCell sx={{ py: 2 }}>
                        <Box>
                          <Typography variant="body2" fontWeight={700} color="#2575fc" fontSize="0.95rem">
                            {agent.username}
                          </Typography>
                          <Typography variant="caption" color="textSecondary" fontSize="0.8rem">
                            {agent.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
                        {agent.totalCalls}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
                        {agent.completedCalls}
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${agent.connectionRate}%`}
                          sx={{
                            background: agent.connectionRate > 50 
                              ? "linear-gradient(135deg, #10b981, #059669)" 
                              : "linear-gradient(135deg, #f59e0b, #d97706)",
                            color: "white",
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                          }}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
                        <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                          {agent.totalDurationFormatted}
                          {lowPerf && (
                            <Chip 
                              label="< 3hrs" 
                              size="small" 
                              sx={{ 
                                background: "linear-gradient(135deg, #ef4444, #dc2626)",
                                color: "white",
                                fontWeight: 700,
                                fontSize: "0.7rem",
                                boxShadow: "0 2px 4px rgba(239, 68, 68, 0.3)"
                              }} 
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
                        {agent.avgDurationFormatted}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default CallAnalyticsDashboard;
