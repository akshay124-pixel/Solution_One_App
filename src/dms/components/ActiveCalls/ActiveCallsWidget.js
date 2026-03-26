import React, { useState, useEffect } from "react";
import api from "../../api/api";
import {
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  Button,
  CircularProgress,
  Tooltip,
  Divider,
} from "@mui/material";
import {
  CallEnd,
  Refresh,
  PhoneForwarded,
  PauseCircle,
  PlayCircle,
} from "@mui/icons-material";
import "./ActiveCallsWidget.css";

const ActiveCallsWidget = () => {
  const [activeCalls, setActiveCalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const API_BASE = process.env.REACT_APP_PORTAL_URL || "http://localhost:5050";
  
  useEffect(() => {
    fetchActiveCalls();
    
    // Auto-refresh every 5 seconds
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchActiveCalls();
      }, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);
  
  const fetchActiveCalls = async () => {
    try {
      const response = await api.get(`${API_BASE}/api/dms/active-calls/active`);
      if (response.data.success) {
        setActiveCalls(response.data.data);
      }
    } catch (error) {
      console.error("Fetch active calls error:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleHangup = async (callId) => {
    if (!window.confirm("Are you sure you want to hangup this call?")) {
      return;
    }
    
    try {
      const response = await api.post(
        `${API_BASE}/api/dms/active-calls/active/${callId}/hangup`,
        {}
      );
      if (response.data.success) {
        alert("Call hangup initiated");
        fetchActiveCalls();
      }
    } catch (error) {
      console.error("Hangup error:", error);
      alert("Failed to hangup call");
    }
  };
  
  const getCallDuration = (startTime) => {
    if (!startTime) return "00:00";
    
    const start = new Date(startTime);
    const now = new Date();
    const diff = Math.floor((now - start) / 1000);
    
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };
  
  const getStatusColor = (status) => {
    const colors = {
      ringing: "warning",
      answered: "success",
      connected: "success",
      hold: "info",
    };
    return colors[status?.toLowerCase()] || "default";
  };
  
  return (
    <Paper className="active-calls-widget" sx={{ p: 2, height: "100%" }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Active Calls ({activeCalls.length})
        </Typography>
        <Box>
          <Tooltip title={autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}>
            <IconButton
              size="small"
              color={autoRefresh ? "primary" : "default"}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? <PauseCircle /> : <PlayCircle />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh Now">
            <IconButton size="small" onClick={fetchActiveCalls} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {loading && activeCalls.length === 0 ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : activeCalls.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Typography color="textSecondary">No active calls</Typography>
        </Box>
      ) : (
        <List>
          {activeCalls.map((call, index) => (
            <React.Fragment key={call.call_id || call.id || index}>
              <ListItem
                className="active-call-item"
                sx={{
                  flexDirection: "column",
                  alignItems: "stretch",
                  bgcolor: "#f8f9fa",
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                <Box display="flex" justifyContent="space-between" width="100%" mb={1}>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {call.crmData?.leadId?.contactName ||
                        call.crmData?.leadId?.customerName ||
                        call.destination_number ||
                        "Unknown"}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {call.destination_number || call.agent_number}
                    </Typography>
                  </Box>
                  <Chip
                    label={call.status || "Active"}
                    size="small"
                    color={getStatusColor(call.status)}
                  />
                </Box>
                
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="textSecondary">
                    Duration: {getCallDuration(call.start_time || call.crmData?.startTime)}
                  </Typography>
                  
                  <Box>
                    <Tooltip title="Hangup Call">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleHangup(call.call_id || call.id)}
                      >
                        <CallEnd />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                
                {call.crmData?.userId && (
                  <Typography variant="caption" color="textSecondary" mt={1}>
                    Agent: {call.crmData.userId.username}
                  </Typography>
                )}
              </ListItem>
              
              {index < activeCalls.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default ActiveCallsWidget;
