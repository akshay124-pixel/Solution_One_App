import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Slider,
  CircularProgress,
  Chip,
  Button,
  Divider,
} from "@mui/material";
import {
  PlayArrow,
  Pause,
  VolumeUp,
  VolumeOff,
  Close,
  GetApp,
} from "@mui/icons-material";
import api from "../../api/api";
import { getPortalAccessToken } from "../../../portal/PortalAuthContext";
import { toast } from "react-toastify";
import "./RecordingPlayerModal.css";

const RecordingPlayerModal = ({ open, onClose, call }) => {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recordingUrl, setRecordingUrl] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const audioRef = useRef(null);
  const maxRetries = 2;
  
  useEffect(() => {
    if (open && call) {
      setError(null);
      setLoading(true);
      setRecordingUrl(null);
      setRetryCount(0);
      
      // Reset audio state
      setPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      
      // Multiple strategies to get recording URL
      fetchRecordingWithFallbacks();
    }
  }, [open, call]);
  
  // Cleanup effect for blob URLs
  useEffect(() => {
    return () => {
      // Clean up blob URL when component unmounts
      if (recordingUrl && recordingUrl.startsWith('blob:')) {
        URL.revokeObjectURL(recordingUrl);
      }
    };
  }, [recordingUrl]);
  
  const fetchRecordingWithFallbacks = async () => {
    if (!call) return;
    
    // Recording fetch logged only in development
    if (process.env.NODE_ENV === 'development') {
      console.log("🎵 Fetching recording for call:", call._id, `(retry: ${retryCount})`);
      console.log("🎵 Call data:", {
        recordingUrl: call.recordingUrl ? '[URL_PRESENT]' : '[NO_URL]',
        callStatus: call.callStatus,
        duration: call.duration
      });
    }
    
    try {
      // Strategy 1: Use enhanced server-side streaming endpoint (preferred)
      if (retryCount === 0) {
        const streamUrl = `/recordings/${call._id}/stream`;
        await fetchAndCreateBlobUrl(streamUrl);
        return;
      }

      // Strategy 2: Use direct recording URL from call if available
      if (call.recordingUrl && call.recordingUrl.trim()) {
        if (call.recordingUrl.startsWith('http') && call.recordingUrl.includes('cloudphone')) {
          if (retryCount === 1) {
            await fetchAndCreateBlobUrl(call.recordingUrl);
            return;
          } else {
            setRecordingUrl(call.recordingUrl);
            setLoading(false);
            return;
          }
        }
        await fetchAndCreateBlobUrl(call.recordingUrl);
        return;
      }

      // Strategy 3: Fetch from recording metadata API
      const metadataResponse = await api.get(`/recordings/${call._id}`);

      if (metadataResponse.data.success && metadataResponse.data.data?.recordingUrl) {
        if (metadataResponse.data.data.streamUrl) {
          await fetchAndCreateBlobUrl(metadataResponse.data.data.streamUrl);
          return;
        }

        if (metadataResponse.data.data.recordingUrl.startsWith('http') &&
            metadataResponse.data.data.recordingUrl.includes('cloudphone')) {
          if (retryCount === 0) {
            await fetchAndCreateBlobUrl(metadataResponse.data.data.recordingUrl);
            return;
          } else {
            setRecordingUrl(metadataResponse.data.data.recordingUrl);
            setLoading(false);
            return;
          }
        }
        
        await fetchAndCreateBlobUrl(metadataResponse.data.data.recordingUrl);
        return;
      }
      
      throw new Error("No recording URL available from any source");
      
    } catch (error) {
      console.error("❌ All recording fetch strategies failed:", error);
      
      // Final fallback: Check if call should have recording
      if (call.duration > 0 && (call.callStatus === "completed" || call.callStatus === "answered")) {
        setError("Recording should be available but cannot be accessed. The recording may be processing, expired, or temporarily unavailable. Please try again later or contact support.");
      } else {
        setError("No recording available for this call. Calls must be completed/answered and have duration > 0 to be recorded.");
      }
      setLoading(false);
    }
  };
  
  const fetchAndCreateBlobUrl = async (url) => {
    try {
      let fetchUrl = url;
      if (url.startsWith('/')) {
        fetchUrl = `${process.env.REACT_APP_PORTAL_URL || 'http://localhost:5050'}/api/dms${url}`;
      }

      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getPortalAccessToken()}`,
          'Accept': 'audio/*,*/*;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });

      if (process.env.NODE_ENV === 'development') {
        console.log("📡 Response status:", response.status);
      }

      if (!response.ok) {
        let errorText = "Unknown error";
        try {
          const errorData = await response.json();
          errorText = errorData.message || errorData.error || response.statusText;
        } catch {
          errorText = await response.text() || response.statusText;
        }
        console.error("❌ Response error:", errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      const audioBlob = await response.blob();

      if (audioBlob.size === 0) {
        throw new Error("Received empty audio file");
      }
      if (audioBlob.size < 100) {
        throw new Error("Audio file too small - likely corrupted or empty");
      }

      let finalBlob = audioBlob;
      if (!audioBlob.type || audioBlob.type === '' || audioBlob.type === 'application/octet-stream') {
        finalBlob = new Blob([audioBlob], { type: 'audio/mpeg' });
      } else if (audioBlob.type.includes('audio/mp3') || audioBlob.type.includes('audio/x-mpeg')) {
        finalBlob = new Blob([audioBlob], { type: 'audio/mpeg' });
      }

      const blobUrl = URL.createObjectURL(finalBlob);
      setRecordingUrl(blobUrl);
      setLoading(false);

    } catch (error) {
      console.error("❌ Failed to fetch audio data:", error);
      throw error;
    }
  };
  
  const handlePlayPause = async () => {
    if (!audioRef.current) {
      console.error("🎵 Audio ref not available");
      return;
    }

    try {
      if (playing) {
        audioRef.current.pause();
        setPlaying(false);
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
          setPlaying(true);
        }
      }
    } catch (error) {
      console.error("🎵 Play/Pause error:", error);
      setPlaying(false);
      if (error.name === 'NotAllowedError') {
        toast.error("Audio playback blocked by browser. Please click play again.");
      } else if (error.name === 'NotSupportedError') {
        toast.error("Audio format not supported. Try downloading the recording.");
      } else {
        toast.error("Audio playback failed. Please try again.");
      }
    }
  };
  
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setLoading(false);
    }
  };

  const handleCanPlay = () => {
    setLoading(false);
  };

  const handlePlay = () => {
    setPlaying(true);
  };

  const handlePause = () => {
    setPlaying(false);
  };

  const handleEnded = () => {
    setPlaying(false);
    setCurrentTime(0);
  };
  
  const handleSeek = (event, newValue) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newValue;
      setCurrentTime(newValue);
    }
  };
  
  const handleVolumeChange = (event, newValue) => {
    if (audioRef.current) {
      audioRef.current.volume = newValue;
      setVolume(newValue);
      setMuted(newValue === 0);
    }
  };
  
  const handleMuteToggle = () => {
    if (audioRef.current) {
      audioRef.current.muted = !muted;
      setMuted(!muted);
    }
  };
  
  const handleError = (e) => {
    console.error("🎵 Audio playback error:", e);
    console.error("🎵 Audio element details:", {
      error: e.target?.error,
      networkState: e.target?.networkState,
      readyState: e.target?.readyState,
      src: e.target?.src,
      errorCode: e.target?.error?.code,
      errorMessage: e.target?.error?.message,
      currentSrc: e.target?.currentSrc,
      duration: e.target?.duration,
      paused: e.target?.paused,
      ended: e.target?.ended
    });
    
    // Log additional debugging info
    console.error("🎵 Recording URL info:", {
      recordingUrl,
      isBlob: recordingUrl?.startsWith('blob:'),
      audioSrc: e.target?.src
    });
    
    // Provide specific error messages based on error type
    let errorMessage = "Failed to load recording. ";
    let debugInfo = "";
    
    if (e.target?.error?.code === 1) {
      errorMessage += "The recording download was aborted.";
      debugInfo = "MEDIA_ERR_ABORTED";
    } else if (e.target?.error?.code === 2) {
      errorMessage += "A network error occurred while downloading the recording.";
      debugInfo = "MEDIA_ERR_NETWORK";
    } else if (e.target?.error?.code === 3) {
      errorMessage += "The recording format is not supported by your browser. This may be due to codec issues or corrupted audio data.";
      debugInfo = "MEDIA_ERR_DECODE";
    } else if (e.target?.error?.code === 4) {
      errorMessage += "The recording source is not available or accessible.";
      debugInfo = "MEDIA_ERR_SRC_NOT_SUPPORTED";
    } else {
      errorMessage += "The recording may be unavailable, expired, or in an unsupported format.";
      debugInfo = "UNKNOWN_ERROR";
    }
    
    console.error("🎵 Error classification:", debugInfo);
    
    // For MEDIA_ERR_DECODE, try alternative approaches
    if (e.target?.error?.code === 3 && retryCount < maxRetries) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 MEDIA_ERR_DECODE: Trying alternative approach (retry ${retryCount + 1}/${maxRetries})`);
      }
      
      // Clean up failed blob URL
      if (recordingUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(recordingUrl);
      }
      setRecordingUrl(null);
      setError(null);
      setLoading(true);
      setRetryCount(prev => prev + 1);
      
      // Try direct URL approach for Smartflo recordings
      if (call?.recordingUrl?.startsWith('http') && call.recordingUrl.includes('cloudphone')) {
        console.log("🔄 Using direct Smartflo URL as decode fallback");
        setTimeout(() => {
          setRecordingUrl(call.recordingUrl);
          setLoading(false);
        }, 500);
        return;
      }
      
      // Otherwise retry with different blob approach
      setTimeout(() => {
        fetchRecordingWithFallbacks();
      }, 1000);
      
      return; // Don't set error state yet, let retry happen
    }
    
    // Check if it's other blob URL issues
    if (recordingUrl?.startsWith('blob:') && e.target?.error?.code === 4 && retryCount < maxRetries) {
      errorMessage += " The audio blob may be corrupted or invalid. Retrying...";
      
      // Try to revoke and recreate blob URL
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 Attempting to recreate blob URL (retry ${retryCount + 1}/${maxRetries})...`);
      }
      URL.revokeObjectURL(recordingUrl);
      setRecordingUrl(null);
      setError(null);
      setLoading(true);
      setRetryCount(prev => prev + 1);
      
      // Retry with a delay
      setTimeout(() => {
        fetchRecordingWithFallbacks();
      }, 1000);
      
      return; // Don't set error state yet, let retry happen
    }
    
    // Final error state
    setError(errorMessage);
    setLoading(false);
    setPlaying(false);
    
    // Show user-friendly toast message
    if (debugInfo === "MEDIA_ERR_DECODE") {
      toast.error("Audio format not supported. Try downloading the recording instead.");
    } else {
      toast.error(`Recording playback failed: ${debugInfo}`);
    }
  };
  
  const handleDownload = async () => {
    if (!call) {
      toast.error("No call information available");
      return;
    }
    
    try {
      toast.info("Preparing download...");
      
      // Strategy 1: If we have a blob URL, use it directly
      if (recordingUrl && recordingUrl.startsWith('blob:')) {
        const link = document.createElement("a");
        link.href = recordingUrl;
        link.setAttribute("download", `recording-${call._id}-${Date.now()}.mp3`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success("Recording download started!");
        return;
      }
      
      // Strategy 2: Fetch from server stream endpoint
      const streamUrl = `${process.env.REACT_APP_PORTAL_URL || 'http://localhost:5050'}/api/dms/recordings/${call._id}/stream`;
      
      const response = await fetch(streamUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getPortalAccessToken()}`,
          'Accept': 'audio/*,*/*;q=0.9',
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      // Get the blob from response
      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error("Downloaded file is empty");
      }

      // Create blob URL and trigger download
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", `recording-${call._id}-${Date.now()}.mp3`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      
      toast.success("Recording downloaded successfully!");
    } catch (error) {
      console.error("Download error:", error);
      
      // Fallback: Try direct URL if available
      if (call.recordingUrl && call.recordingUrl.startsWith('http')) {
        try {
          const link = document.createElement("a");
          link.href = call.recordingUrl;
          link.setAttribute("download", `recording-${call._id}-${Date.now()}.mp3`);
          link.setAttribute("target", "_blank");
          link.setAttribute("rel", "noopener noreferrer");
          document.body.appendChild(link);
          link.click();
          link.remove();
          toast.success("Recording download started via direct link!");
        } catch (fallbackError) {
          console.error("Fallback download error:", fallbackError);
          toast.error("Failed to download recording. Please try again later.");
        }
      } else {
        toast.error(`Failed to download recording: ${error.message}`);
      }
    }
  };
  
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };
  
  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlaying(false);
    setCurrentTime(0);
    setError(null);
    setRetryCount(0);
    
    // Clean up blob URL to prevent memory leaks
    if (recordingUrl && recordingUrl.startsWith('blob:')) {
      URL.revokeObjectURL(recordingUrl);
    }
    
    setRecordingUrl(null);
    onClose();
  };
  
  if (!call) return null;
  
  // Determine the audio source URL
  let audioSrc = recordingUrl;

  const getStatusColor = (status) => {
    const colors = {
      completed: "success",
      answered: "info",
      failed: "error",
      no_answer: "warning",
      busy: "warning",
      cancelled: "default",
    };
    return colors[status] || "default";
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "15px",
        },
      }}
    >
      <DialogTitle
        sx={{
          background: "linear-gradient(90deg, #6a11cb 0%, #2575fc 100%)",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 24px",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: "600" }}>
          Call Recording
        </Typography>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{
            color: "white",
            "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" },
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: "24px", backgroundColor: "#f5f7fa" }}>
        {/* Call Details */}
        <Box
          sx={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "20px",
            mb: 3,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="textSecondary">
              Customer
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: "600" }}>
              {call.leadId?.contactName || call.leadId?.customerName || "N/A"}
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="textSecondary">
              Phone Number
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: "600" }}>
              {call.destinationNumber}
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="textSecondary">
              Date & Time
            </Typography>
            <Typography variant="body2">
              {new Date(call.createdAt).toLocaleString()}
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="textSecondary">
              Duration
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: "600" }}>
              {formatTime(call.duration)}
            </Typography>
          </Box>

          <Box>
            <Chip
              label={call.callStatus}
              color={getStatusColor(call.callStatus)}
              size="small"
              sx={{ textTransform: "capitalize" }}
            />
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Audio Player */}
        <Box
          sx={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          {loading ? (
            <Box sx={{ textAlign: "center", py: 3 }}>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography variant="body2" color="textSecondary">
                Loading recording...
              </Typography>
            </Box>
          ) : error ? (
            <Box sx={{ textAlign: "center", py: 3 }}>
              <Typography color="error" variant="body2" sx={{ mb: 1 }}>
                ⚠️ Recording Unavailable
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ mb: 2, display: "block" }}>
                {error}
              </Typography>
              {call?.recordingUrl && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleDownload}
                  startIcon={<GetApp />}
                  sx={{
                    mt: 1,
                    borderColor: "#2575fc",
                    color: "#2575fc",
                    "&:hover": {
                      borderColor: "#1565e8",
                      backgroundColor: "rgba(37, 117, 252, 0.04)"
                    }
                  }}
                >
                  Try Direct Download
                </Button>
              )}
            </Box>
          ) : !audioSrc ? (
            <Box sx={{ textAlign: "center", py: 3 }}>
              <Typography color="warning.main" variant="body2" sx={{ mb: 1 }}>
                📵 No Recording Available
              </Typography>
              <Typography variant="caption" color="textSecondary">
                This call was not recorded or the recording is not accessible.
              </Typography>
            </Box>
          ) : (
            <>
              <audio
                ref={audioRef}
                src={audioSrc}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onCanPlay={handleCanPlay}
                onPlay={handlePlay}
                onPause={handlePause}
                onEnded={handleEnded}
                onError={handleError}
                preload="metadata"
                controls={false}
                {...(audioSrc?.startsWith('blob:') ? {} : 
                     audioSrc?.includes('cloudphone') ? {} : 
                     { crossOrigin: "anonymous" })}
              >
                {/* Fallback sources for better compatibility */}
                {audioSrc && (
                  <>
                    <source src={audioSrc} type="audio/mpeg" />
                    <source src={audioSrc} type="audio/mp3" />
                    <source src={audioSrc} type="audio/wav" />
                    <source src={audioSrc} type="audio/ogg" />
                  </>
                )}
                Your browser does not support the audio element.
              </audio>

              {/* Progress Bar */}
              <Box sx={{ mb: 2 }}>
                <Slider
                  value={currentTime}
                  max={duration || 100}
                  onChange={handleSeek}
                  disabled={loading || !!error}
                  sx={{
                    color: "#6a11cb",
                    "& .MuiSlider-thumb": {
                      width: 16,
                      height: 16,
                    },
                  }}
                />
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="textSecondary">
                    {formatTime(currentTime)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {formatTime(duration)}
                  </Typography>
                </Box>
              </Box>

              {/* Controls */}
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                gap={2}
              >
                <IconButton
                  onClick={handlePlayPause}
                  disabled={loading || !!error}
                  sx={{
                    width: 56,
                    height: 56,
                    background: "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)",
                    color: "white",
                    "&:hover": {
                      background: "linear-gradient(135deg, #5a0fb7 0%, #1565e8 100%)",
                    },
                    "&:disabled": {
                      background: "#e0e0e0",
                      color: "#9e9e9e",
                    },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} sx={{ color: "white" }} />
                  ) : playing ? (
                    <Pause />
                  ) : (
                    <PlayArrow />
                  )}
                </IconButton>

                <Box display="flex" alignItems="center" gap={1} sx={{ minWidth: 150 }}>
                  <IconButton onClick={handleMuteToggle} size="small">
                    {muted ? <VolumeOff /> : <VolumeUp />}
                  </IconButton>
                  <Slider
                    value={muted ? 0 : volume}
                    onChange={handleVolumeChange}
                    min={0}
                    max={1}
                    step={0.1}
                    sx={{
                      width: 100,
                      color: "#6a11cb",
                      "& .MuiSlider-thumb": {
                        width: 12,
                        height: 12,
                      },
                    }}
                  />
                </Box>
              </Box>
              
              {/* Recording Info */}
              {/* <Box sx={{ mt: 2, p: 2, backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
                <Typography variant="caption" color="textSecondary" display="block">
                  Recording Source: {
                    audioSrc?.startsWith('blob:') ? 'Authenticated Stream' : 
                    audioSrc?.includes('cloudphone') ? 'Smartflo Direct' :
                    audioSrc?.includes('smartflo') ? 'Smartflo' : 
                    'Local Server'
                  }
                </Typography>
                <Typography variant="caption" color="textSecondary" display="block">
                  Format: MP3 • Quality: Standard • {audioSrc?.startsWith('blob:') ? 'Authentication: ✅ Secured' : 'Direct URL: ✅ Token-based'}
                </Typography>
                <Typography variant="caption" color="textSecondary" display="block">
                  Debug: Retry Count: {retryCount} • URL Type: {
                    recordingUrl?.startsWith('blob:') ? 'Blob' : 
                    recordingUrl?.startsWith('http') ? 'Direct' : 
                    'API'
                  } • Playing: {playing ? '▶️' : '⏸️'}
                </Typography>
                <Typography variant="caption" color="textSecondary" display="block">
                  Audio State: Ready: {audioRef.current?.readyState || 0} • Network: {audioRef.current?.networkState || 0} • Paused: {audioRef.current?.paused ? 'Yes' : 'No'}
                </Typography>
              </Box> */}
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ padding: "16px 24px", backgroundColor: "#f5f7fa" }}>
        <Button
          onClick={handleDownload}
          startIcon={<GetApp />}
          disabled={!!error || !recordingUrl}
          sx={{
            background: "linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)",
            color: "white",
            textTransform: "none",
            fontWeight: "600",
            padding: "8px 20px",
            borderRadius: "8px",
            "&:hover": {
              background: "linear-gradient(90deg, #38d66c 0%, #2de0c8 100%)",
            },
            "&:disabled": {
              background: "#e0e0e0",
              color: "#9e9e9e",
            },
          }}
        >
          Download
        </Button>
        <Button
          onClick={handleClose}
          sx={{
            background: "linear-gradient(90deg, #6a11cb 0%, #2575fc 100%)",
            color: "white",
            textTransform: "none",
            fontWeight: "600",
            padding: "8px 20px",
            borderRadius: "8px",
            "&:hover": {
              background: "linear-gradient(90deg, #5a0fb7 0%, #1565e8 100%)",
            },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RecordingPlayerModal;
