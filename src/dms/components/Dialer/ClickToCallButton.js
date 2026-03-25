import { useState } from "react";
import api from "../../api/api";
import { Button, CircularProgress } from "@mui/material";
import { Phone } from "@mui/icons-material";
import { toast } from "react-toastify";

/**
 * Click-to-Call Button Component
 * Initiates outbound call via Smartflo
 */
const ClickToCallButton = ({ leadId, phoneNumber, onCallInitiated, compact = false }) => {
  const [calling, setCalling] = useState(false);

  const handleCall = async () => {
    if (!phoneNumber) {
      toast.error("No phone number available for this lead");
      return;
    }

    setCalling(true);

    try {
      // Using api instance for automatic token handling and refresh
      const response = await api.post("/api/dialer/click-to-call", { leadId });

      if (response.data.success) {
        toast.success("Call initiated! Your phone will ring first.");

        // Callback to parent component
        if (onCallInitiated) {
          onCallInitiated(response.data);
        }
      }
    } catch (error) {
      console.error("Call error:", error);
      toast.error(error.response?.data?.message || "Failed to initiate call");
    } finally {
      setCalling(false);
    }
  };

  if (compact) {
    // Compact version for dashboard actions
    return (
      <Button
        variant="contained"
 color="info"
        onClick={handleCall}
        disabled={calling || !phoneNumber}
        sx={{
          minWidth: "40px",
          width: "40px",
          height: "40px",
          borderRadius: "22px",
          padding: 0,
        }}
        title={phoneNumber ? `Call ${phoneNumber}` : "No phone number"}
      >
        {calling ? <CircularProgress size={20} color="inherit" /> : <Phone />}
      </Button>
    );
  }

  return (
   <Button
  variant="contained"
  color="primary"
  startIcon={
    calling ? (
      <CircularProgress size={20} color="inherit" />
    ) : (
      <Phone />
    )
  }
  onClick={handleCall}
  disabled={calling || !phoneNumber}
  sx={{
    minWidth: 140,
    paddingY: 1.2,
    paddingX: 2.5,
    fontWeight: 600,
    letterSpacing: 0.5,
    borderRadius: "12px",
    textTransform: "none",
   
    transition: "0.25s ease",
    "&:hover": {
     
      transform: "translateY(-1px)",
    },
  }}
>
  {calling ? "Calling..." : "Call Now"}
</Button>

  );
};

export default ClickToCallButton;
