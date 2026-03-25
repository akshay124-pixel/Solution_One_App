import React, { useState, useEffect } from "react";
import api from "../../api/api";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Typography,
  Box,
  IconButton,
} from "@mui/material";
import { Close, PlayArrow, Phone, PhoneMissed } from "@mui/icons-material";
import { format } from "date-fns";
import RecordingPlayerModal from "../CallHistory/RecordingPlayerModal";

/**
 * Call Log Modal Component
 * Displays call history for a specific lead
 */
const CallLogModal = ({ open, onClose, leadId, leadName }) => {
  const [callLogs, setCallLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCall, setSelectedCall] = useState(null);
  const [playerOpen, setPlayerOpen] = useState(false);

  useEffect(() => {
    if (open && leadId) {
      fetchCallLogs();
    }
  }, [open, leadId]);

  const fetchCallLogs = async () => {
    setLoading(true);
    try {
      // Using api instance for automatic token handling and refresh
      const response = await api.get(`/api/dialer/call-logs/${leadId}`);

      if (response.data.success) {
        setCallLogs(response.data.data);
      }
    } catch (error) {
      console.error("Fetch call logs error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: "success",
      answered: "success",
      initiated: "info",
      ringing: "info",
      failed: "error",
      no_answer: "warning",
      busy: "warning",
      cancelled: "default",
    };
    return colors[status] || "default";
  };

  const getStatusIcon = (status) => {
    if (status === "completed" || status === "answered") {
      return <Phone fontSize="small" />;
    }
    return <PhoneMissed fontSize="small" />;
  };

  const handlePlayRecording = (call) => {
    setSelectedCall(call);
    setPlayerOpen(true);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{ sx: { borderRadius: "12px" } }}
    >
      <DialogTitle
        sx={{
          background: "linear-gradient(135deg, #2575fc, #6a11cb)",
          color: "white",
          fontWeight: 600,
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <Phone />
            <Typography variant="h6" fontWeight={600}>
              📞 Call History - {leadName}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: "white" }}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress sx={{ color: "#2575fc" }} />
          </Box>
        ) : callLogs.length === 0 ? (
          <Box textAlign="center" p={3}>
            <PhoneMissed sx={{ fontSize: 48, color: "#ccc", mb: 2 }} />
            <Typography color="textSecondary" fontWeight={500}>
              No call history available
            </Typography>
          </Box>
        ) : (
          <TableContainer 
            component={Paper} 
            variant="outlined"
            sx={{ borderRadius: "8px", overflow: "hidden" }}
          >
            <Table size="small">
              <TableHead>
                <TableRow sx={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)" }}>
                  <TableCell sx={{ fontWeight: 600, color: "white" }}>Date & Time</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "white" }}>Agent</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "white" }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "white" }}>Duration</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "white" }}>Disposition</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "white" }}>Recording</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {callLogs.map((log, index) => (
                  <TableRow 
                    key={log._id}
                    sx={{
                      "&:nth-of-type(odd)": { background: "#fafbfc" },
                      "&:hover": { background: "#f5f7fa" }
                    }}
                  >
                    <TableCell sx={{ fontWeight: 500 }}>
                      {format(new Date(log.createdAt), "MMM dd, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="#2575fc">
                        {log.userId?.username || "N/A"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(log.callStatus)}
                        label={log.callStatus.replace("_", " ")}
                        color={getStatusColor(log.callStatus)}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {formatDuration(log.duration)}
                    </TableCell>
                    <TableCell>{log.disposition || "-"}</TableCell>
                    <TableCell>
                      {log.recordingUrl ? (
                        <IconButton
                          size="small"
                          onClick={() => handlePlayRecording(log)}
                          sx={{
                            background: "linear-gradient(135deg, #10b981, #059669)",
                            color: "white",
                            width: 32,
                            height: 32,
                            "&:hover": {
                              background: "linear-gradient(135deg, #059669, #047857)",
                              transform: "scale(1.1)",
                            },
                            transition: "all 0.2s ease"
                          }}
                        >
                          <PlayArrow sx={{ fontSize: 16 }} />
                        </IconButton>
                      ) : (
                        <Chip 
                          label="No Recording" 
                          size="small" 
                          sx={{ 
                            fontSize: "0.7rem",
                            background: "#f5f5f5",
                            color: "#666"
                          }} 
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button 
          onClick={onClose}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            borderRadius: "8px"
          }}
        >
          Close
        </Button>
      </DialogActions>

      {/* Recording Player Modal */}
      <RecordingPlayerModal
        open={playerOpen}
        onClose={() => setPlayerOpen(false)}
        call={selectedCall}
      />
    </Dialog>
  );
};

export default CallLogModal;
