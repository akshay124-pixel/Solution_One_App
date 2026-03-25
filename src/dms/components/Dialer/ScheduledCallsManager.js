import { useState, useEffect, useMemo } from "react";
import api from "../../api/api";
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Tooltip,
  CircularProgress,
  Alert,
  Badge,
  Avatar,
} from "@mui/material";
import {
  Schedule,
  Phone,
  Edit,
  Delete,
  CheckCircle,
  Cancel,
  Refresh,
  FilterList,
  ArrowBack,
  Event,
  TrendingUp,
  AccessTime,
  Warning,
  Person,
  Group,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

/**
 * Scheduled Calls Manager Component
 * Comprehensive dashboard for managing all scheduled calls
 * Features: View, edit, delete, complete, and track scheduled calls
 */
const ScheduledCallsManager = () => {
  const navigate = useNavigate();
  const [scheduledCalls, setScheduledCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0); // 0: Upcoming, 1: Completed, 2: Missed
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterPurpose, setFilterPurpose] = useState("all");
  const [filterAgent, setFilterAgent] = useState("all"); // NEW: Filter by agent
  const [searchTerm, setSearchTerm] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [callToDelete, setCallToDelete] = useState(null);
  
  // Get user role — read dmsRole (Superadmin/Admin/Others) set by portal syncLocalStorage
  const userRole = localStorage.getItem("dmsRole") || localStorage.getItem("role") || "Others";
  const isAdmin = userRole === "Admin" || userRole === "Superadmin" || userRole === "Globaladmin";

  useEffect(() => {
    fetchScheduledCalls();
    // Refresh every 60 seconds
    const interval = setInterval(fetchScheduledCalls, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchScheduledCalls = async () => {
    try {
      // Using api instance for automatic token handling and refresh
      const response = await api.get("/api/dialer/scheduled-calls");
      if (response.data.success) {
        setScheduledCalls(response.data.data);
      }
    } catch (error) {
      console.error("Fetch scheduled calls error:", error);
      toast.error("Failed to fetch scheduled calls");
    } finally {
      setLoading(false);
    }
  };

  // Filter and categorize calls
  const categorizedCalls = useMemo(() => {
    const now = new Date();
    const upcoming = [];
    const completed = [];
    const missed = [];

    scheduledCalls.forEach((call) => {
      const scheduledTime = new Date(call.scheduledTime);
      
      if (call.status === "completed") {
        completed.push(call);
      } else if (call.status === "cancelled") {
        // Skip cancelled calls
      } else if (scheduledTime < now && call.status === "pending") {
        missed.push(call);
      } else {
        upcoming.push(call);
      }
    });

    return { upcoming, completed, missed };
  }, [scheduledCalls]);

  // Get unique agents for filter (Admin only)
  const uniqueAgents = useMemo(() => {
    if (!isAdmin) return [];
    const agents = scheduledCalls
      .map((call) => call.userId)
      .filter((user) => user && user.username)
      .reduce((acc, user) => {
        if (!acc.find((u) => u._id === user._id)) {
          acc.push(user);
        }
        return acc;
      }, []);
    return agents;
  }, [scheduledCalls, isAdmin]);

  // Apply filters
  const filteredCalls = useMemo(() => {
    let calls = [];
    if (activeTab === 0) calls = categorizedCalls.upcoming;
    else if (activeTab === 1) calls = categorizedCalls.completed;
    else calls = categorizedCalls.missed;

    // Apply priority filter
    if (filterPriority !== "all") {
      calls = calls.filter((call) => call.priority === filterPriority);
    }

    // Apply purpose filter
    if (filterPurpose !== "all") {
      calls = calls.filter((call) => call.purpose === filterPurpose);
    }

    // Apply agent filter (Admin only)
    if (isAdmin && filterAgent !== "all") {
      calls = calls.filter((call) => call.userId?._id === filterAgent);
    }

    // Apply search filter
    if (searchTerm) {
      calls = calls.filter((call) =>
        call.leadId?.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.leadId?.mobileNumber?.includes(searchTerm) ||
        call.userId?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by scheduled time
    return calls.sort((a, b) => {
      if (activeTab === 0) {
        // Upcoming: earliest first, but prioritize high priority
        if (a.priority === "urgent" && b.priority !== "urgent") return -1;
        if (a.priority !== "urgent" && b.priority === "urgent") return 1;
        if (a.priority === "high" && b.priority !== "high" && b.priority !== "urgent") return -1;
        if (a.priority !== "high" && b.priority === "high") return 1;
        return new Date(a.scheduledTime) - new Date(b.scheduledTime);
      }
      // Completed/Missed: most recent first
      return new Date(b.scheduledTime) - new Date(a.scheduledTime);
    });
  }, [categorizedCalls, activeTab, filterPriority, filterPurpose, filterAgent, searchTerm, isAdmin]);

  // Statistics
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      total: categorizedCalls.upcoming.length,
      today: categorizedCalls.upcoming.filter(
        (call) => new Date(call.scheduledTime) >= today && new Date(call.scheduledTime) < tomorrow
      ).length,
      highPriority: categorizedCalls.upcoming.filter(
        (call) => call.priority === "high" || call.priority === "urgent"
      ).length,
      missed: categorizedCalls.missed.length,
      completed: categorizedCalls.completed.length,
    };
  }, [categorizedCalls]);

  const handleMarkComplete = async (callId) => {
    try {
      // Using api instance for automatic token handling and refresh
      await api.patch(`/api/dialer/scheduled-calls/${callId}/complete`, {});
      toast.success("Call marked as completed!");
      fetchScheduledCalls();
    } catch (error) {
      console.error("Mark complete error:", error);
      toast.error("Failed to mark call as completed");
    }
  };

  const handleDelete = async () => {
    if (!callToDelete) return;

    try {
      // Using api instance for automatic token handling and refresh
      await api.delete(`/api/dialer/scheduled-calls/${callToDelete}`);
      toast.success("Scheduled call deleted!");
      setDeleteDialogOpen(false);
      setCallToDelete(null);
      fetchScheduledCalls();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete scheduled call");
    }
  };

  const handleInitiateCall = async (call) => {
    try {
      // Using api instance for automatic token handling and refresh
      const response = await api.post("/api/dialer/click-to-call", { leadId: call.leadId._id });

      if (response.data.success) {
        toast.success("Call initiated! Your phone will ring first.");
        // Optionally mark as completed
        handleMarkComplete(call._id);
      }
    } catch (error) {
      console.error("Call error:", error);
      toast.error(error.response?.data?.message || "Failed to initiate call");
    }
  };

  // Priority configurations
  const priorityConfig = {
    low: { color: "#10b981", bg: "#d1fae5", label: "Low" },
    medium: { color: "#f59e0b", bg: "#fef3c7", label: "Medium" },
    high: { color: "#ef4444", bg: "#fee2e2", label: "High" },
    urgent: { color: "#dc2626", bg: "#fecaca", label: "Urgent" },
  };

  // Purpose labels
  const purposeLabels = {
    follow_up: "📞 Follow-up",
    demo: "🎯 Demo",
    negotiation: "💼 Negotiation",
    closing: "✅ Closing",
    support: "🛠️ Support",
    feedback: "💬 Feedback",
    renewal: "🔄 Renewal",
    upsell: "📈 Upsell",
    other: "📋 Other",
  };

  // Time until call helper
  const getTimeUntilCall = (scheduledTime) => {
    const now = new Date();
    const scheduled = new Date(scheduledTime);
    const diff = scheduled - now;

    if (diff < 0) return "Overdue";

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `in ${days}d ${hours % 24}h`;
    if (hours > 0) return `in ${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `in ${minutes}m`;
    return "Now";
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
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate("/dms/dashboard")}
            sx={{
              background: "white",
              color: "#2575fc",
              borderRadius: "10px",
              textTransform: "none",
              fontWeight: 700,
              px: 2,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              "&:hover": {
                background: "#f0f4ff",
                transform: "translateY(-2px)",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              },
              transition: "all 0.3s ease"
            }}
          >
            Back
          </Button>
          <Typography variant="h4" fontWeight={700} color="#2575fc">
            📅 Scheduled Calls Manager
          </Typography>
        </Box>
        <Button
          startIcon={<Refresh />}
          onClick={fetchScheduledCalls}
          sx={{
            background: "linear-gradient(135deg, #2575fc, #6a11cb)",
            color: "white",
            borderRadius: "10px",
            textTransform: "none",
            fontWeight: 700,
            px: 3,
            boxShadow: "0 4px 12px rgba(37, 117, 252, 0.3)",
            "&:hover": {
              background: "linear-gradient(135deg, #1a5fd9, #5a0fb0)",
              transform: "translateY(-2px)",
              boxShadow: "0 6px 16px rgba(37, 117, 252, 0.4)",
            },
            transition: "all 0.3s ease"
          }}
        >
          Refresh
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={2.4}>
          <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
            <Card sx={{ borderRadius: "15px", boxShadow: "0 6px 18px rgba(0, 0, 0, 0.1)" }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" variant="body2" fontWeight={600}>
                      Total Upcoming
                    </Typography>
                    <Typography variant="h3" fontWeight={700} color="#2575fc">
                      {stats.total}
                    </Typography>
                  </Box>
                  <Schedule sx={{ fontSize: 40, color: "#2575fc", opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
            <Card sx={{ borderRadius: "15px", boxShadow: "0 6px 18px rgba(0, 0, 0, 0.1)" }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" variant="body2" fontWeight={600}>
                      Today
                    </Typography>
                    <Typography variant="h3" fontWeight={700} color="#10b981">
                      {stats.today}
                    </Typography>
                  </Box>
                  <Event sx={{ fontSize: 40, color: "#10b981", opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
            <Card sx={{ borderRadius: "15px", boxShadow: "0 6px 18px rgba(0, 0, 0, 0.1)" }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" variant="body2" fontWeight={600}>
                      High Priority
                    </Typography>
                    <Typography variant="h3" fontWeight={700} color="#ef4444">
                      {stats.highPriority}
                    </Typography>
                  </Box>
                  <Warning sx={{ fontSize: 40, color: "#ef4444", opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
            <Card sx={{ borderRadius: "15px", boxShadow: "0 6px 18px rgba(0, 0, 0, 0.1)" }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" variant="body2" fontWeight={600}>
                      Missed
                    </Typography>
                    <Typography variant="h3" fontWeight={700} color="#f59e0b">
                      {stats.missed}
                    </Typography>
                  </Box>
                  <AccessTime sx={{ fontSize: 40, color: "#f59e0b", opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
            <Card sx={{ borderRadius: "15px", boxShadow: "0 6px 18px rgba(0, 0, 0, 0.1)" }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" variant="body2" fontWeight={600}>
                      Completed
                    </Typography>
                    <Typography variant="h3" fontWeight={700} color="#6a11cb">
                      {stats.completed}
                    </Typography>
                  </Box>
                  <CheckCircle sx={{ fontSize: 40, color: "#6a11cb", opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Filters and Search */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2.5, 
          mb: 3, 
          borderRadius: "15px",
          boxShadow: "0 6px 18px rgba(0, 0, 0, 0.1)"
        }}
      >
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <FilterList sx={{ color: "#2575fc" }} />
          <TextField
            placeholder={isAdmin ? "Search by name, phone, agent, or notes..." : "Search by name, phone, or notes..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ minWidth: 250, flex: 1 }}
          />
          <TextField
            select
            label="Priority"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            size="small"
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="all">All Priorities</MenuItem>
            <MenuItem value="urgent">Urgent</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="low">Low</MenuItem>
          </TextField>
          <TextField
            select
            label="Purpose"
            value={filterPurpose}
            onChange={(e) => setFilterPurpose(e.target.value)}
            size="small"
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="all">All Purposes</MenuItem>
            {Object.entries(purposeLabels).map(([key, label]) => (
              <MenuItem key={key} value={key}>{label}</MenuItem>
            ))}
          </TextField>
          {isAdmin && uniqueAgents.length > 0 && (
            <TextField
              select
              label="👤 Agent"
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}
              size="small"
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="all">
                <Box display="flex" alignItems="center" gap={1}>
                  <Group fontSize="small" />
                  All Agents
                </Box>
              </MenuItem>
              {uniqueAgents.map((agent) => (
                <MenuItem key={agent._id} value={agent._id}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Person fontSize="small" />
                    {agent.username}
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          )}
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper 
        elevation={0} 
        sx={{ 
          borderRadius: "15px",
          boxShadow: "0 6px 18px rgba(0, 0, 0, 0.1)",
          overflow: "hidden"
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            background: "linear-gradient(135deg, #2575fc, #6a11cb)",
            "& .MuiTab-root": {
              color: "rgba(255, 255, 255, 0.7)",
              fontWeight: 700,
              textTransform: "none",
              fontSize: "1rem",
            },
            "& .Mui-selected": {
              color: "white !important",
            },
            "& .MuiTabs-indicator": {
              backgroundColor: "white",
              height: 3,
            }
          }}
        >
          <Tab 
            label={
              <Badge badgeContent={stats.total} color="error">
                <Box px={2}>Upcoming</Box>
              </Badge>
            } 
          />
          <Tab label={`Completed (${stats.completed})`} />
          <Tab 
            label={
              <Badge badgeContent={stats.missed} color="warning">
                <Box px={2}>Missed</Box>
              </Badge>
            } 
          />
        </Tabs>

        {/* Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ background: "#fafbfc" }}>
                <TableCell sx={{ fontWeight: 700, color: "#2575fc" }}>Lead</TableCell>
                {isAdmin && (
                  <TableCell sx={{ fontWeight: 700, color: "#2575fc" }}>👤 Agent</TableCell>
                )}
                <TableCell sx={{ fontWeight: 700, color: "#2575fc" }}>Scheduled Time</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#2575fc" }}>Priority</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#2575fc" }}>Purpose</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#2575fc" }}>Notes</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#2575fc" }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: "#2575fc" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCalls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 8 : 7} align="center" sx={{ py: 6 }}>
                    <Typography variant="body1" color="textSecondary" fontWeight={600}>
                      No scheduled calls found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCalls.map((call, index) => {
                  const timeUntil = getTimeUntilCall(call.scheduledTime);
                  const isOverdue = timeUntil === "Overdue";
                  const isUrgent = call.priority === "urgent" || call.priority === "high";

                  return (
                    <TableRow 
                      key={call._id}
                      sx={{
                        background: isOverdue ? "#fff5f5" : (index % 2 === 0 ? "white" : "#fafbfc"),
                        borderLeft: isUrgent ? "4px solid #ef4444" : "4px solid transparent",
                        "&:hover": {
                          background: "#f0f4ff",
                          transform: "scale(1.01)",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
                        },
                        transition: "all 0.2s ease"
                      }}
                    >
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={700} color="#2575fc">
                            {call.leadId?.customerName || "Unknown"}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {call.leadId?.mobileNumber}
                          </Typography>
                        </Box>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                                fontSize: "0.875rem",
                                fontWeight: 700,
                              }}
                            >
                              {call.userId?.username?.charAt(0).toUpperCase() || "?"}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={600} color="#333">
                                {call.userId?.username || "Unknown"}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {call.userId?.email || ""}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                      )}
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {new Date(call.scheduledTime).toLocaleString()}
                          </Typography>
                          <Chip
                            label={timeUntil}
                            size="small"
                            sx={{
                              mt: 0.5,
                              background: isOverdue ? "#fee2e2" : "#e0f2fe",
                              color: isOverdue ? "#dc2626" : "#0284c7",
                              fontWeight: 700,
                              fontSize: "0.7rem"
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={priorityConfig[call.priority]?.label || call.priority}
                          size="small"
                          sx={{
                            background: priorityConfig[call.priority]?.bg,
                            color: priorityConfig[call.priority]?.color,
                            fontWeight: 700,
                            border: `2px solid ${priorityConfig[call.priority]?.color}`,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {purposeLabels[call.purpose] || call.purpose}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={call.notes || "No notes"}>
                          <Typography 
                            variant="caption" 
                            color="textSecondary"
                            sx={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              maxWidth: 200
                            }}
                          >
                            {call.notes || "—"}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={call.status}
                          size="small"
                          sx={{
                            background: 
                              call.status === "completed" ? "#d1fae5" :
                              call.status === "pending" ? "#fef3c7" : "#fee2e2",
                            color:
                              call.status === "completed" ? "#10b981" :
                              call.status === "pending" ? "#f59e0b" : "#ef4444",
                            fontWeight: 700,
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box display="flex" gap={1} justifyContent="flex-end">
                          {activeTab === 0 && (
                            <>
                              <Tooltip title="Initiate Call">
                                <IconButton
                                  size="small"
                                  onClick={() => handleInitiateCall(call)}
                                  sx={{
                                    background: "linear-gradient(135deg, #10b981, #059669)",
                                    color: "white",
                                    width:"40px",
                                    "&:hover": {
                                      background: "linear-gradient(135deg, #059669, #047857)",
                                      transform: "scale(1.1)",
                                    }
                                  }}
                                >
                                  <Phone sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>


                              
                              <Tooltip title="Mark Complete">
                                <IconButton
                                  size="small"
                                  onClick={() => handleMarkComplete(call._id)}
                                  sx={{
                                    background: "#e0f2fe",
                                    color: "#0284c7",
                                    width:"40px",
                                    "&:hover": {
                                      background: "#0284c7",
                                      color: "white",
                                       width:"40px",
                                      transform: "scale(1.1)",
                                    }
                                  }}
                                >
                                  <CheckCircle sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
  <button
          className="bin-button"
         onClick={() => {
                                setCallToDelete(call._id);
                                setDeleteDialogOpen(true);
                              }}
          style={{ width: "40px", height: "40px", padding: "0" }}
          title="Delete Entry"
        >
          <svg
            className="bin-top"
            viewBox="0 0 39 7"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line y1="5" x2="39" y2="5" stroke="white" strokeWidth="4"></line>
            <line
              x1="12"
              y1="1.5"
              x2="26.0357"
              y2="1.5"
              stroke="white"
              strokeWidth="3"
            ></line>
          </svg>
          <svg
            className="bin-bottom"
            viewBox="0 0 33 39"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <mask id="path-1-inside-1_8_19" fill="white">
              <path d="M0 0H33V35C33 37.2091 31.2091 39 29 39H4C1.79086 39 0 37.2091 0 35V0Z"></path>
            </mask>
            <path
              d="M0 0H33H0ZM37 35C37 39.4183 33.4183 43 29 43H4C-0.418278 43 -4 39.4183 -4 35H4H29H37ZM4 43C-0.418278 43 -4 39.4183 -4 35V0H4V35V43ZM37 0V35C37 39.4183 33.4183 43 29 43V35V0H37Z"
              fill="white"
              mask="url(#path-1-inside-1_8_19)"
            ></path>
            <path d="M12 6L12 29" stroke="white" strokeWidth="4"></path>
            <path d="M21 6V29" stroke="white" strokeWidth="4"></path>
          </svg>
        </button>

                          
                        
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Delete Confirmation Dialog */}
   <Dialog
  open={deleteDialogOpen}
  onClose={() => setDeleteDialogOpen(false)}
  PaperProps={{
    sx: {
      borderRadius: "14px",
      paddingBottom: "10px",
      boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
      animation: "fadeInScale 0.25s ease-out",
    },
  }}
>
  {/* Header */}
  <DialogTitle
    sx={{
      background: "linear-gradient(135deg, #dc2626, #b91c1c)",
      color: "white",
      fontWeight: 700,
      fontSize: "1.3rem",
      display: "flex",
      alignItems: "center",
      gap: 1,
      borderTopLeftRadius: "14px",
      borderTopRightRadius: "14px",
      py: 2,
    }}
  >
    ❗ Delete Scheduled Call
  </DialogTitle>

  {/* Body */}
  <DialogContent
    sx={{
      mt: 2,
      pb: 1,
      display: "flex",
      alignItems: "flex-start",
      gap: 2,
    }}
  >
    <Box
      sx={{
        fontSize: "1.8rem",
        color: "#dc2626",
        mt: "-3px",
      }}
    >
      ⚠️
    </Box>

    <Typography sx={{ fontSize: "1rem", color: "#374151", lineHeight: 1.5 }}>
      Are you sure you want to delete this scheduled call?
      <br />
      <strong style={{ color: "#b91c1c" }}>This action cannot be undone.</strong>
    </Typography>
  </DialogContent>

  {/* Footer */}
  <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
    <Button
      onClick={() => setDeleteDialogOpen(false)}
      sx={{
        textTransform: "none",
        fontWeight: 600,
        borderRadius: "8px",
        color: "#374151",
        px: 3,
        "&:hover": {
          background: "#f3f4f6",
        },
      }}
    >
      Cancel
    </Button>

    <Button
      onClick={handleDelete}
      variant="contained"
      sx={{
        textTransform: "none",
        fontWeight: 700,
        borderRadius: "8px",
        background: "linear-gradient(135deg, #ef4444, #b91c1c)",
        px: 3,
        boxShadow: "0 4px 12px rgba(239,68,68,0.4)",
        "&:hover": {
          background: "linear-gradient(135deg, #dc2626, #991b1b)",
          boxShadow: "0 6px 14px rgba(220,38,38,0.45)",
        },
      }}
    >
      Delete
    </Button>
  </DialogActions>
</Dialog>

    </Box>
  );
};

export default ScheduledCallsManager;
