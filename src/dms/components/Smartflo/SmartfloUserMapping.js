import React, { useState, useEffect } from "react";
import api from "../../api/api";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  CircularProgress,
  Chip,
  Snackbar,
  Alert,
} from "@mui/material";
import { Edit, Phone, PhoneDisabled, ArrowBack } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";


const SmartfloUserMapping = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editDialog, setEditDialog] = useState({ open: false, user: null });
  const [formData, setFormData] = useState({
    smartfloAgentNumber: "",
    smartfloEnabled: false,
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Using api instance for automatic token handling and refresh
      const response = await api.get("/api/smartflo/users");

      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error) {
      console.error("Fetch users error:", error);
      showSnackbar("Failed to fetch users", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user) => {
    setFormData({
      smartfloAgentNumber: user.smartfloAgentNumber || "",
      smartfloEnabled: user.smartfloEnabled || false,
    });
    setEditDialog({ open: true, user });
  };

  const handleCloseDialog = () => {
    setEditDialog({ open: false, user: null });
    setFormData({
      smartfloAgentNumber: "",
      smartfloEnabled: false,
    });
  };

  const handleSave = async () => {
    try {
      const payload = {
        smartfloAgentNumber: formData.smartfloAgentNumber.trim(),
        smartfloEnabled: formData.smartfloEnabled,
      };

      // Using api instance for automatic token handling and refresh
      const response = await api.put(
        `/api/smartflo/users/${editDialog.user._id}/map`,
        payload
      );

      if (response.data.success) {
        showSnackbar("User mapping updated successfully", "success");
        fetchUsers();
        handleCloseDialog();
      }
    } catch (error) {
      console.error("Update mapping error:", error);
      showSnackbar(error.response?.data?.message || "Failed to update mapping", "error");
    }
  };
  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box p={3} sx={{ background: "#f5f7fa", minHeight: "100vh" }}>
      {/* Header */}
      <Box 
        display="flex" 
        alignItems="center" 
        gap={2} 
        mb={3}
      
      >
        <Button
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
        {/* <Typography variant="h4" sx={{ flexGrow: 1, fontWeight: 600, color: "white" }}>
          👥 Smartflo User Mapping
        </Typography> */}
      </Box>
      
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          border: "1px solid #e0e0e0"
        }}
      >
        <Typography variant="h6" gutterBottom fontWeight={600} color="#2575fc">
          📞 User Mapping Configuration
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          Map CRM users to Smartflo agents to enable telephony features
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress sx={{ color: "#2575fc" }} />
          </Box>
        ) : (
          <TableContainer   sx={{
    maxHeight: "680px",
    borderRadius: "12px",
    overflowY: "auto",
    scrollbarWidth: "thin",
    "&::-webkit-scrollbar": { width: "6px" },
    "&::-webkit-scrollbar-thumb": {
      background: "#c5c5c5",
      borderRadius: "8px",
    },
  }}>
            <Table >
              <TableHead>
                <TableRow sx={{  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
          position: "sticky",
          top: 0,
          zIndex: 10, }}>
                  <TableCell sx={{ fontWeight: 600, color: "white" }}>Username</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "white" }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "white" }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "white" }}>Agent Number</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "white" }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "white" }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow 
                    key={user._id} 
                    sx={{ 
                      "&:hover": { background: "#f5f7fa" },
                      "&:nth-of-type(odd)": { background: "#fafbfc" }
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="#2575fc">
                        {user.username}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {user.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.role} 
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {user.smartfloAgentNumber || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {user.smartfloEnabled ? (
                        <Chip 
                          icon={<Phone />} 
                          label="Enabled" 
                          color="success" 
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      ) : (
                        <Chip 
                          icon={<PhoneDisabled />} 
                          label="Disabled" 
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      )}
                    </TableCell>
                   <TableCell>
  


  <button
           onClick={() => handleEditClick(user)}
          className="editBtn"
          style={{ width: "40px", height: "40px", padding: "0" }}
          title="Configuration Mapping"
        >
          <svg height="1em" viewBox="0 0 512 512">
            <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"></path>
          </svg>
        </button>
      








</TableCell>


                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Edit Dialog */}
     
      <Dialog
        open={editDialog.open}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "12px" } }}
      >
        <DialogTitle
          sx={{
            fontWeight: 600,
            background: "linear-gradient(135deg, #2575fc, #6a11cb)",
            color: "white",
          }}
        >
          🔗 Map User to Smartflo Agent
        </DialogTitle>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <Box
              sx={{
                p: 2,
                background: "#e3f2fd",
                borderRadius: "8px",
                borderLeft: "4px solid #2575fc",
              }}
            >
              <Typography variant="body2" color="textSecondary">
                Mapping user:
              </Typography>
              <Typography variant="body1" fontWeight={600} color="#2575fc">
                {editDialog.user?.username}
              </Typography>
            </Box>

            <TextField
              label="Agent Phone Number (Smartflo)"
              value={formData.smartfloAgentNumber}
              onChange={(e) =>
                setFormData({ ...formData, smartfloAgentNumber: e.target.value })
              }
              fullWidth
              required
              placeholder="+919876543210"
              helperText="This must be a valid Smartflo agent number / phone"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.smartfloEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, smartfloEnabled: e.target.checked })
                  }
                />
              }
              label="Enable Smartflo for this user"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleCloseDialog}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "8px",
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!formData.smartfloAgentNumber}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "8px",
              background: "linear-gradient(135deg, #2575fc, #6a11cb)",
              "&:hover": {
                background: "linear-gradient(135deg, #1a5fd9, #5a0fb0)",
              },
            }}
          >
            Save Mapping
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SmartfloUserMapping;
