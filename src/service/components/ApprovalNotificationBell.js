import React, { useState, useEffect } from "react";
import { Badge, Dropdown, Button, Modal, Spinner, Form } from "react-bootstrap";
import { Bell, Check, X, Eye, Clock, AlertCircle, Download, RotateCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import serviceApi from "../axiosSetup";
import {
  createAuthenticatedSocket,
  teardownSocket,
  getModuleSocketPath,
} from "../../utils/moduleSocket";
import soApi from "../../so/axiosSetup";
import furniApi from "../../furni/axiosSetup";
import { toast } from "react-toastify";

const ApprovalNotificationBell = ({ userRole, onApprovalAction }) => {
  const navigate = useNavigate();
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [fullOrderDetails, setFullOrderDetails] = useState(null);
  const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notificationType, setNotificationType] = useState(null); // 'approval' or 'followup'
  
  // Rejection states
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionRemarks, setRejectionRemarks] = useState("");
  const [logToReject, setLogToReject] = useState(null);

  // Normalize role to lowercase for comparison
  const normalizedRole = userRole?.toLowerCase() || "";
  const isGlobalAdmin = normalizedRole === "globaladmin";
  const isSuperAdmin = normalizedRole === "superadmin";

  console.log("[NotificationBell] User role:", userRole);
  console.log("[NotificationBell] Normalized role:", normalizedRole);
  console.log("[NotificationBell] Is GlobalAdmin:", isGlobalAdmin);
  console.log("[NotificationBell] Is SuperAdmin:", isSuperAdmin);

  // Fetch notifications based on role and setup Socket.io
  useEffect(() => {
    if (isGlobalAdmin) {
      console.log("[NotificationBell] GlobalAdmin - Fetching initial pending approvals...");
      fetchPendingApprovals(true);
    } else if (isSuperAdmin) {
      console.log("[NotificationBell] SuperAdmin - Fetching notifications...");
      fetchSuperAdminNotifications(true);
    }

    if (!isGlobalAdmin && !isSuperAdmin) return;

    const socketPath = getModuleSocketPath("service");
    const socket = createAuthenticatedSocket({ module: "service" });

    socket.on("connect", () => {
      console.log("[ServiceSocket] Connected to real-time server");
    });

    socket.on("followUpNotification", (notification) => {
      if (isSuperAdmin) {
        console.log("[ServiceSocket] New follow-up received:", notification);
        setNotifications((prev) => {
          if (prev.find((n) => n._id === notification._id)) return prev;
          toast.info(`🔔 New Follow-up: ${notification.complaintNumber}`, {
            position: "top-right",
            autoClose: 5000,
          });
          return [notification, ...prev];
        });
      }
    });

    socket.on("newPartReplacementRequest", (notification) => {
      if (isSuperAdmin) {
        console.log("[ServiceSocket] New part request received:", notification);
        fetchSuperAdminNotifications(false);
        toast.success(`🛠️ New Part Request: ${notification.complaintNumber}`, {
          position: "top-right",
          autoClose: 5000,
        });
      }
    });

    socket.on("partReplacementUpdate", (notification) => {
      if (isSuperAdmin) {
        console.log("[ServiceSocket] Part status update received:", notification);
        fetchSuperAdminNotifications(false);
        toast.info(`📦 Part Update: ${notification.complaintNumber} is now ${notification.status}`, {
          position: "top-right",
          autoClose: 5000,
        });
      }
    });

    socket.on("approvalNotification", (notification) => {
      if (isGlobalAdmin || isSuperAdmin) {
        console.log("[ServiceSocket] New approval received:", notification);
        setPendingApprovals((prev) => {
          if (prev.find((n) => n._id === notification._id)) return prev;
          toast.info(`🔔 New Approval Required: ${notification.orderId}`, {
            position: "top-right",
            autoClose: 5000,
          });
          return [notification, ...prev];
        });
      }
    });

    socket.on("connect_error", (err) => {
      console.error("[ServiceSocket] Connection error:", err.message);
    });

    return () => {
      teardownSocket(
        socket,
        ["connect", "connect_error", "followUpNotification", "newPartReplacementRequest", "partReplacementUpdate", "approvalNotification"],
        socketPath
      );
    };
  }, [isGlobalAdmin, isSuperAdmin]);

  const fetchPendingApprovals = async (showLoading = true) => {
    if (!isGlobalAdmin) return;
    
    if (showLoading) setLoading(true);
    try {
      console.log("[NotificationBell] Fetching logs with status: Proceed For Approval");
      const response = await serviceApi.get("/replacement-demo-logs/notifications/pending");
      console.log("[NotificationBell] Response:", response.data);
      if (response.data.success) {
        setPendingApprovals(response.data.data || []);
        setNotificationType('approval');
        console.log("[NotificationBell] Logs ready for approval:", response.data.data?.length || 0);
      }
    } catch (error) {
      console.error("[NotificationBell] Failed to fetch pending approvals:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchSuperAdminNotifications = async (showLoading = true) => {
    if (!isSuperAdmin) return;

    if (showLoading) setLoading(true);
    try {
      const response = await serviceApi.get("/notifications");
      if (response.data.success) {
        setNotifications(response.data.data || []);
      }
    } catch (error) {
      console.error("[NotificationBell] Failed to fetch super admin notifications:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleViewDetails = async (log) => {
    // Part replacement notifications — just mark as read, no modal
    if (isSuperAdmin && (log.type === "part_new" || log.type === "part_update")) {
      if (!log.isRead) {
        handleMarkAsRead(log._id);
      }
      return;
    }

    setSelectedLog(log);
    setShowDetailModal(true);
    setFullOrderDetails(null);
    
    if (isGlobalAdmin) {
      // Fetch full order details for approval notifications (GlobalAdmin only)
      setOrderDetailsLoading(true);
      try {
        console.log("[NotificationBell] Fetching full order details for log:", log._id);
        const response = await serviceApi.get(`/replacement-demo-logs/${log._id}/full-order`);
        console.log("[NotificationBell] Full order response:", response.data);
        if (response.data.success) {
          setFullOrderDetails({
            ...response.data.order,
            _orderSource: response.data.orderSource
          });
        }
      } catch (error) {
        console.error("[NotificationBell] Failed to fetch full order details:", error);
        toast.error("Failed to load complete order details");
      } finally {
        setOrderDetailsLoading(false);
      }
    } else if (isSuperAdmin && (log.type === "followup" || (!log.type?.startsWith("part") && log.serviceLogId))) {
      // Fetch full service log details for follow-up notifications
      setOrderDetailsLoading(true);
      try {
        // Use serviceLogId (from DB) or fall back to _id (from socket payload before fix)
        const serviceLogId = log.serviceLogId || log._id;
        const response = await serviceApi.get(`/service-logs/${serviceLogId}`);
        if (response.data.success) {
          const sl = response.data.log;
          setFullOrderDetails({
            _id: log._id,
            complaintNumber: sl.complaintNumber || log.complaintNumber,
            customerName: sl.serviceRequestName || sl.customerName || log.customerName,
            followUpDate: sl.followUpDate || log.followUpDate,
            serviceStatus: sl.serviceStatus || log.serviceStatus,
            issue: sl.issue || log.issue,
            city: sl.city || log.city,
            state: sl.state || log.state,
            address: sl.address || log.address,
            orderId: sl.orderId || log.orderId,
            message: log.message,
            type: log.type,
            status: sl.status || log.status,
            remarks: sl.remarks || log.remarks,
          });
        } else {
          // Fallback to notification data if API fails
          setFullOrderDetails({
            _id: log._id,
            complaintNumber: log.complaintNumber,
            customerName: log.customerName,
            followUpDate: log.followUpDate,
            serviceStatus: log.serviceStatus,
            issue: log.issue,
            city: log.city,
            state: log.state,
            address: log.address,
            orderId: log.orderId,
            message: log.message,
            type: log.type,
            status: log.status,
            remarks: log.remarks,
          });
        }
      } catch (error) {
        console.error("[NotificationBell] Failed to fetch service log details:", error);
        // Fallback to notification data
        setFullOrderDetails({
          _id: log._id,
          complaintNumber: log.complaintNumber,
          customerName: log.customerName,
          followUpDate: log.followUpDate,
          serviceStatus: log.serviceStatus,
          issue: log.issue,
          city: log.city,
          state: log.state,
          address: log.address,
          orderId: log.orderId,
          message: log.message,
          type: log.type,
          status: log.status,
          remarks: log.remarks,
        });
      } finally {
        setOrderDetailsLoading(false);
      }
    }
  };

  const handleApprove = async (log) => {
    setActionLoading(true);
    try {
      const response = await serviceApi.post(`/replacement-demo-logs/${log._id}/approve`);
      if (response.data.success) {
        toast.success("Order approved successfully!");
        fetchPendingApprovals();
        setShowDetailModal(false);
        if (onApprovalAction) onApprovalAction();
      }
    } catch (error) {
      console.error("Failed to approve:", error);
      toast.error(error.response?.data?.message || "Failed to approve order");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = (log) => {
    setLogToReject(log);
    setRejectionRemarks("");
    setShowRejectionModal(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectionRemarks || rejectionRemarks.trim() === "") {
      toast.warning("Rejection reason is required");
      return;
    }

    setActionLoading(true);
    try {
      const response = await serviceApi.post(`/replacement-demo-logs/${logToReject._id}/reject`, { 
        remarks: rejectionRemarks 
      });
      
      if (response.data.success) {
        toast.success("Order rejected successfully!");
        fetchPendingApprovals();
        setShowDetailModal(false);
        setShowRejectionModal(false);
        if (onApprovalAction) onApprovalAction();
      }
    } catch (error) {
      console.error("Failed to reject:", error);
      toast.error(error.response?.data?.message || "Failed to reject order");
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewServiceRequest = (log) => {
    // Navigate to service dashboard
    // The user can then view the service log in the dashboard
    setShowDetailModal(false);
    navigate("/service");
    toast.info(`Viewing service request: ${log.complaintNumber}`);
  };

  if (!isGlobalAdmin && !isSuperAdmin) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    
    // Format: "07 May 2026, 03:20 PM"
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const unreadCount = isSuperAdmin 
    ? notifications.filter(n => !n.isRead).length
    : pendingApprovals.length;
  const headerTitle = isSuperAdmin ? "Service Notifications" : "Ready For Approval";
  
  // Updated theme-consistent gradients (removing pink)
  const headerGradient = isSuperAdmin 
    ? "linear-gradient(135deg, #2575fc, #6a11cb)" 
    : "linear-gradient(135deg, #667eea, #764ba2)";
  
  const primaryThemeColor = "#2575fc";
  const secondaryThemeColor = isSuperAdmin ? "#6a11cb" : "#764ba2";

  const currentNotifications = isSuperAdmin 
    ? notifications
    : pendingApprovals;

  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await serviceApi.patch(`/notifications/${notificationId}/read`);
      if (response.data.success) {
        fetchSuperAdminNotifications(false);
      }
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleClearAll = async () => {
    try {
      const response = await serviceApi.delete("/notifications/clear-all");
      if (response.data.success) {
        toast.success("All notifications cleared");
        fetchSuperAdminNotifications(false);
      }
    } catch (error) {
      console.error("Failed to clear notifications:", error);
      toast.error("Failed to clear notifications");
    }
  };

  return (
    <>
      <Dropdown align="end">
        <Dropdown.Toggle
          as="div"
          id="notification-bell-dropdown"
          style={{
            position: "relative",
            background: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "50%",
            width: "52px",
            height: "52px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.4)",
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            padding: 0,
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-3px) scale(1.05)";
            e.currentTarget.style.boxShadow = "0 12px 40px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.5)";
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0) scale(1)";
            e.currentTarget.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.4)";
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
          }}
        >
          <Bell 
            size={24} 
            color="white" 
            style={{
              filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))",
              animation: currentNotifications.length > 0 ? "bellRing 2s ease-in-out infinite" : "none",
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
          {unreadCount > 0 && (
            <Badge
              bg="danger"
              style={{
                position: "absolute",
                top: "-2px",
                right: "-2px",
                borderRadius: "50%",
                width: "24px",
                height: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.7rem",
                fontWeight: "700",
                background: "linear-gradient(135deg, #ff6b6b, #ee5a6f)",
                border: "2px solid rgba(255, 255, 255, 0.9)",
                boxShadow: "0 4px 12px rgba(238, 90, 111, 0.4)",
                animation: "badgePulse 2s ease-in-out infinite",
              }}
            >
              {unreadCount}
            </Badge>
          )}
        </Dropdown.Toggle>

        <Dropdown.Menu
          style={{
            minWidth: "400px",
            borderRadius: "16px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            padding: 0,
            background: "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            marginTop: "12px",
            overflow: "hidden", // Ensure header doesn't overflow
          }}
        >
          {/* Fixed Header */}
          <div
            style={{
              padding: "16px 20px",
              background: headerGradient,
              color: "white",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
              position: "sticky",
              top: 0,
              zIndex: 10,
            }}
          >
            <div>
              <h6 style={{ margin: 0, fontWeight: "700", fontSize: "1rem", letterSpacing: "0.5px" }}>
                {headerTitle}
              </h6>
              {isSuperAdmin && (
                <div style={{ fontSize: "0.75rem", opacity: 0.9, marginTop: "2px" }}>
                  {currentNotifications.length} active {currentNotifications.length === 1 ? "notification" : "notifications"}
                </div>
              )}
            </div>
              {isSuperAdmin && currentNotifications.length > 0 && (
                <div style={{ display: "flex", gap: "8px" }}>
                  <Button
                    variant="link"
                    size="sm"
                    className="btn-hover-ani"
                    style={{ color: "white", padding: 0, textDecoration: "none", fontSize: "0.75rem", fontWeight: "600" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearAll();
                    }}
                  >
                    Clear All
                  </Button>
                </div>
              )}
              {isGlobalAdmin && (
                <Badge bg="light" text="dark" style={{ fontSize: "0.85rem", borderRadius: "4px", padding: "4px 8px" }}>
                  {unreadCount}
                </Badge>
              )}
          </div>

          {/* Scrollable Content */}
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: "40px", textAlign: "center" }}>
                <Spinner animation="border" size="sm" variant="primary" />
                <p style={{ marginTop: "12px", color: "#6b7280", fontSize: "0.85rem" }}>
                  Loading...
                </p>
              </div>
            ) : currentNotifications.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center" }}>
                <Check size={48} color="#10b981" style={{ marginBottom: "12px" }} />
                <p style={{ color: "#6b7280", margin: 0, fontSize: "0.9rem" }}>
                  {isSuperAdmin ? "All caught up!" : "No orders ready for approval"}
                </p>
                <p style={{ color: "#9ca3af", margin: "4px 0 0 0", fontSize: "0.8rem" }}>
                  {isSuperAdmin 
                    ? "No new service notifications or follow-ups" 
                    : "Orders with 'Proceed For Approval' status will appear here"}
                </p>
              </div>
            ) : (
              currentNotifications.map((log, index) => (
                <div
                  key={log._id}
                  style={{
                    padding: "16px 20px",
                    borderBottom: index < currentNotifications.length - 1 ? "1px solid rgba(0, 0, 0, 0.06)" : "none",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    position: "relative",
                    overflow: "hidden",
                    backgroundColor: isSuperAdmin && !log.isRead ? "rgba(37, 117, 252, 0.03)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isSuperAdmin 
                      ? "linear-gradient(135deg, rgba(37, 117, 252, 0.08), rgba(106, 17, 203, 0.08))"
                      : "linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(118, 75, 162, 0.08))";
                    e.currentTarget.style.transform = "translateX(4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isSuperAdmin && !log.isRead ? "rgba(37, 117, 252, 0.03)" : "transparent";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                  onClick={() => handleViewDetails(log)}
                >
                  {isSuperAdmin ? (
                    // New UI for Super Admin (Unified Notifications)
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          {!log.isRead && (
                            <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: log.type === "followup" ? primaryThemeColor : "#10b981", flexShrink: 0 }}></div>
                          )}
                          <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {log.complaintNumber}
                          </div>
                        </div>
                        
                        <div style={{ fontSize: "0.85rem", color: log.type === "part_new" ? "#059669" : log.type === "part_update" ? "#2563eb" : "#475569", fontWeight: "600" }}>
                          {log.message}
                        </div>
                        
                        <div style={{ fontSize: "0.85rem", color: "#475569", marginBottom: "2px", fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          Customer: {log.customerName || "Unknown"}
                        </div>
                        
                        {log.remarks && (
                          <div style={{ fontSize: "0.8rem", color: "#64748b", fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            "{log.remarks}"
                          </div>
                        )}

                        <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                          <Clock size={12} />
                          {formatDate(log.createdAt)}
                          {log.updatedBy && <span>• By: {log.updatedBy}</span>}
                          {log.createdBy && log.type === "part_new" && <span>• By: {log.createdBy}</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0, marginLeft: "12px" }}>
                        {!log.isRead && (
                          <Button
                            variant="light"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(log._id);
                            }}
                            style={{ 
                              padding: "4px", 
                              borderRadius: "50%", 
                              width: "28px", 
                              height: "28px", 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center",
                              background: "#f0fdf4",
                              color: "#166534",
                              border: "1px solid #bbf7d0"
                            }}
                            title="Mark as read"
                          >
                            <Check size={14} strokeWidth={3} />
                          </Button>
                        )}
                        <div style={{ 
                          padding: "4px 10px", 
                          background: log.type?.startsWith("part") ? "rgba(16, 185, 129, 0.15)" : "rgba(37, 117, 252, 0.15)",
                          color: log.type?.startsWith("part") ? "#059669" : "#1e40af",
                          borderRadius: "6px", 
                          fontSize: "0.7rem", 
                          fontWeight: "700",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          border: log.type?.startsWith("part") ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(37, 117, 252, 0.2)"
                        }}>
                          {log.type === "part_new" ? "New Request" : log.type === "part_update" ? log.status : "Follow-up"}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Old UI for Global Admin (Approvals)
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                        <div>
                          <div style={{ fontWeight: "600", color: "#1e293b", fontSize: "0.95rem", marginBottom: "4px" }}>
                            {log.orderId}
                          </div>
                          <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                            {log.orderDetails?.customername || "N/A"}
                          </div>
                        </div>
                        <Badge
                          style={{
                            background: log.orderDetails?.orderType === "Replacement" ? "#dc2626" : "#0891b2",
                            fontSize: "0.75rem",
                          }}
                        >
                          {log.orderDetails?.orderType}
                        </Badge>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "#94a3b8" }}>
                        <Clock size={14} />
                        {formatDate(log.createdAt)}
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Refresh Button at Bottom */}
          <div 
            style={{ 
              padding: "12px", 
              borderTop: "1px solid rgba(0, 0, 0, 0.05)", 
              textAlign: "center",
              background: "white" 
            }}
          >
            <Button
              variant="link"
              style={{ 
                textDecoration: "none", 
                fontWeight: "600", 
                fontSize: "0.9rem", 
                color: primaryThemeColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                width: "100%",
                padding: "8px",
                transition: "opacity 0.2s ease"
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.7"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
              onClick={(e) => {
                e.stopPropagation();
                if (isGlobalAdmin) fetchPendingApprovals();
                if (isSuperAdmin) fetchSuperAdminNotifications();
              }}
            >
              <RotateCw size={16} className={loading ? "spin-animation" : ""} />
              Refresh
            </Button>
          </div>
        </Dropdown.Menu>
      </Dropdown>

      {/* Detail Modal - Works for both approval and follow-up notifications */}
      <Modal 
        show={showDetailModal} 
        onHide={() => setShowDetailModal(false)} 
        size={isGlobalAdmin ? "xl" : "lg"} 
        centered
        style={isGlobalAdmin ? {
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        } : {}}
      >
        <Modal.Header 
          closeButton 
          style={{ 
            background: headerGradient, 
            border: "none",
            borderRadius: isGlobalAdmin ? "0" : "5px 5px 0 0",
            padding: isGlobalAdmin ? "24px 30px" : "16px 24px",
            color: "white"
          }}
        >
          <Modal.Title style={{ color: "white", fontWeight: "700", display: "flex", alignItems: "center", gap: "10px" }}>
            {isGlobalAdmin && <Bell size={28} />}
            {isSuperAdmin ? "Follow-up Details" : "Approval Request Details"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: isGlobalAdmin ? "30px" : "24px", background: "#f8fafc", maxHeight: "75vh", overflowY: "auto" }}>
          {orderDetailsLoading ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <Spinner animation="border" variant="primary" />
              <p style={{ marginTop: "12px", color: "#6b7280" }}>Loading details...</p>
            </div>
          ) : fullOrderDetails ? (
            <div style={{ animation: "fadeIn 0.3s ease-out" }}>
              {isSuperAdmin ? (
                // New UI for Super Admin (Follow-up notification details)
                <div>
                  <div style={{ 
                    marginBottom: "24px", 
                    padding: "16px", 
                    background: "rgba(37, 117, 252, 0.05)", 
                    borderRadius: "12px", 
                    borderLeft: `4px solid ${primaryThemeColor}`,
                    display: "flex",
                    alignItems: "center",
                    gap: "12px"
                  }}>
                    <AlertCircle size={20} color={primaryThemeColor} />
                    <span style={{ fontSize: "0.95rem", fontWeight: "600", color: primaryThemeColor }}>
                      Follow-up scheduled for today
                    </span>
                  </div>

                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "1fr 1fr", 
                    gap: "24px", 
                    background: "white", 
                    padding: "24px", 
                    borderRadius: "16px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)"
                  }}>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Complaint Number</label>
                      <div style={{ fontSize: "1rem", color: "#1e293b", fontWeight: "600", marginTop: "4px" }}>{fullOrderDetails.complaintNumber || "N/A"}</div>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Order ID</label>
                      <div style={{ fontSize: "1rem", color: "#1e293b", fontWeight: "600", marginTop: "4px" }}>{fullOrderDetails.orderId || "N/A"}</div>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Customer Name</label>
                      <div style={{ fontSize: "1rem", color: "#1e293b", fontWeight: "600", marginTop: "4px" }}>{fullOrderDetails.customerName || "N/A"}</div>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Service Status</label>
                      <div style={{ marginTop: "4px" }}>
                        <Badge style={{ background: primaryThemeColor, color: "white", fontWeight: "700", padding: "6px 12px", borderRadius: "6px", boxShadow: "0 2px 6px rgba(37, 117, 252, 0.3)" }}>
                          {fullOrderDetails.serviceStatus || "N/A"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Follow-up Date</label>
                      <div style={{ fontSize: "1rem", color: "#1e293b", fontWeight: "600", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Clock size={16} />
                        {formatDate(fullOrderDetails.followUpDate)}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Location</label>
                      <div style={{ fontSize: "1rem", color: "#1e293b", fontWeight: "600", marginTop: "4px" }}>
                        {fullOrderDetails.city && fullOrderDetails.state ? `${fullOrderDetails.city}, ${fullOrderDetails.state}` : "N/A"}
                      </div>
                    </div>
                  </div>

                  {fullOrderDetails.issue && (
                    <div style={{ marginTop: "24px", background: "white", padding: "20px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)" }}>
                      <label style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "8px" }}>Issue Description</label>
                      <div style={{ fontSize: "0.95rem", color: "#475569", lineHeight: "1.6" }}>{fullOrderDetails.issue}</div>
                    </div>
                  )}

                  {fullOrderDetails.address && (
                    <div style={{ marginTop: "16px", background: "white", padding: "20px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)" }}>
                      <label style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "8px" }}>Service Address</label>
                      <div style={{ fontSize: "0.95rem", color: "#475569", lineHeight: "1.6" }}>{fullOrderDetails.address}</div>
                    </div>
                  )}
                </div>
              ) : (
                // Old UI for Global Admin (Approval notification details)
                <>
                  {/* Order Information */}
                  <div style={{ 
                    marginBottom: "24px", 
                    padding: "24px", 
                    background: "rgba(255, 255, 255, 0.9)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    borderRadius: "0",
                    border: "1px solid rgba(102, 126, 234, 0.1)",
                    boxShadow: "0 8px 32px rgba(102, 126, 234, 0.08)",
                  }}>
                    <h6 style={{ fontWeight: "700", marginBottom: "20px", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                      📋 Order Information
                    </h6>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div>
                        <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "4px" }}>Log Number</div>
                        <div style={{ fontWeight: "600", color: "#1e293b" }}>{selectedLog.logNumber}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "4px" }}>Order ID</div>
                        <div style={{ fontWeight: "600", color: "#1e293b" }}>{selectedLog.orderId}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "4px" }}>Order Type</div>
                        <Badge
                          style={{
                            background: selectedLog.orderDetails?.orderType === "Replacement" ? "#dc2626" : "#0891b2",
                            fontSize: "0.85rem",
                            padding: "6px 12px",
                          }}
                        >
                          {selectedLog.orderDetails?.orderType}
                        </Badge>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "4px" }}>Total Amount</div>
                        <div style={{ fontWeight: "600", color: "#1e293b" }}>
                          ₹{selectedLog.orderDetails?.total?.toLocaleString() || "0"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "4px" }}>Order Date</div>
                        <div style={{ fontWeight: "600", color: "#1e293b" }}>
                          {fullOrderDetails.soDate ? formatDate(fullOrderDetails.soDate) : "N/A"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "4px" }}>Bill Number</div>
                        <div style={{ fontWeight: "600", color: "#1e293b" }}>
                          {fullOrderDetails.billNumber || "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer Details */}
                  <div style={{ 
                    marginBottom: "24px", 
                    padding: "24px", 
                    background: "rgba(255, 251, 235, 0.9)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    borderRadius: "0",
                    border: "1px solid rgba(251, 191, 36, 0.2)",
                    boxShadow: "0 8px 32px rgba(251, 191, 36, 0.08)",
                  }}>
                    <h6 style={{ fontWeight: "700", marginBottom: "20px", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                      👤 Customer Details
                    </h6>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div>
                        <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "4px" }}>Customer Name</div>
                        <div style={{ fontWeight: "600", color: "#1e293b" }}>
                          {fullOrderDetails.customername || fullOrderDetails.name || "N/A"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "4px" }}>Contact Number</div>
                        <div style={{ fontWeight: "600", color: "#1e293b" }}>
                          {fullOrderDetails.contactNo || "N/A"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "4px" }}>Email</div>
                        <div style={{ fontWeight: "600", color: "#1e293b" }}>
                          {fullOrderDetails.customerEmail || fullOrderDetails.email || "N/A"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "4px" }}>Sales Person</div>
                        <div style={{ fontWeight: "600", color: "#1e293b" }}>
                          {fullOrderDetails.salesPerson || "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div style={{ 
                    marginBottom: "24px", 
                    padding: "24px", 
                    background: "rgba(240, 249, 255, 0.9)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    borderRadius: "0",
                    border: "1px solid rgba(56, 189, 248, 0.2)",
                    boxShadow: "0 8px 32px rgba(56, 189, 248, 0.08)",
                  }}>
                    <h6 style={{ fontWeight: "700", marginBottom: "20px", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                      🚚 Shipping Address
                    </h6>
                    <div style={{ fontSize: "0.95rem", color: "#1e293b", lineHeight: "1.8" }}>
                      {fullOrderDetails.shippingAddress ? (
                        <div style={{ whiteSpace: "pre-wrap", marginBottom: "12px" }}>{fullOrderDetails.shippingAddress}</div>
                      ) : (
                        <div style={{ marginBottom: "12px" }}>
                          <div><strong>Address:</strong> {fullOrderDetails.address || "N/A"}</div>
                        </div>
                      )}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "12px" }}>
                        <div>
                          <strong>City:</strong> {fullOrderDetails.city || "N/A"}
                        </div>
                        <div>
                          <strong>State:</strong> {fullOrderDetails.state || "N/A"}
                        </div>
                        <div>
                          <strong>Pincode:</strong> {fullOrderDetails.pinCode || fullOrderDetails.pincode || "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Billing Address */}
                  <div style={{ 
                    marginBottom: "24px", 
                    padding: "24px", 
                    background: "rgba(254, 243, 199, 0.9)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    borderRadius: "0",
                    border: "1px solid rgba(251, 191, 36, 0.2)",
                    boxShadow: "0 8px 32px rgba(251, 191, 36, 0.08)",
                  }}>
                    <h6 style={{ fontWeight: "700", marginBottom: "20px", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                      📄 Billing Address
                    </h6>
                    <div style={{ fontSize: "0.95rem", color: "#1e293b", lineHeight: "1.8" }}>
                      {fullOrderDetails.billingAddress ? (
                        <div style={{ whiteSpace: "pre-wrap", marginBottom: "12px" }}>{fullOrderDetails.billingAddress}</div>
                      ) : (
                        <div style={{ marginBottom: "12px" }}>
                          <div><strong>Address:</strong> {fullOrderDetails.address || "N/A"}</div>
                        </div>
                      )}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "12px" }}>
                        <div>
                          <strong>City:</strong> {fullOrderDetails.city || "N/A"}
                        </div>
                        <div>
                          <strong>State:</strong> {fullOrderDetails.state || "N/A"}
                        </div>
                        <div>
                          <strong>Pincode:</strong> {fullOrderDetails.pinCode || fullOrderDetails.pincode || "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Products */}
                  <div style={{ 
                    marginBottom: "24px", 
                    padding: "24px", 
                    background: "rgba(243, 244, 246, 0.9)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    borderRadius: "0",
                    border: "1px solid rgba(156, 163, 175, 0.2)",
                    boxShadow: "0 8px 32px rgba(156, 163, 175, 0.08)",
                  }}>
                    <h6 style={{ fontWeight: "700", marginBottom: "20px", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                      📦 Products
                    </h6>
                    {fullOrderDetails.products && fullOrderDetails.products.length > 0 ? (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ background: "#e5e7eb", borderBottom: "2px solid #9ca3af" }}>
                              <th style={{ padding: "12px", textAlign: "left", fontSize: "0.85rem", fontWeight: "700" }}>#</th>
                              <th style={{ padding: "12px", textAlign: "left", fontSize: "0.85rem", fontWeight: "700" }}>Product Name</th>
                              <th style={{ padding: "12px", textAlign: "left", fontSize: "0.85rem", fontWeight: "700" }}>Category</th>
                              <th style={{ padding: "12px", textAlign: "right", fontSize: "0.85rem", fontWeight: "700" }}>Quantity</th>
                              <th style={{ padding: "12px", textAlign: "right", fontSize: "0.85rem", fontWeight: "700" }}>Price</th>
                              <th style={{ padding: "12px", textAlign: "right", fontSize: "0.85rem", fontWeight: "700" }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fullOrderDetails.products.map((product, index) => (
                              <tr key={index} style={{ borderBottom: "1px solid #e5e7eb" }}>
                                <td style={{ padding: "12px", fontSize: "0.9rem" }}>{index + 1}</td>
                                <td style={{ padding: "12px", fontSize: "0.9rem", fontWeight: "600" }}>
                                  {product.productType || product.productName || product.name || "N/A"}
                                  {product.brand && <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Brand: {product.brand}</div>}
                                  {product.size && product.size !== "N/A" && <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Size: {product.size}</div>}
                                </td>
                                <td style={{ padding: "12px", fontSize: "0.9rem" }}>
                                  {product.category || product.spec || "N/A"}
                                </td>
                                <td style={{ padding: "12px", fontSize: "0.9rem", textAlign: "right" }}>
                                  {product.qty || product.quantity || 0}
                                </td>
                                <td style={{ padding: "12px", fontSize: "0.9rem", textAlign: "right" }}>
                                  ₹{(product.unitPrice || product.price || 0).toLocaleString()}
                                </td>
                                <td style={{ padding: "12px", fontSize: "0.9rem", textAlign: "right", fontWeight: "600" }}>
                                  ₹{((product.qty || product.quantity || 0) * (product.unitPrice || product.price || 0)).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            {(() => {
                              // Calculate subtotal from products
                              const productsSubtotal = fullOrderDetails.products.reduce((sum, p) => {
                                return sum + ((p.qty || p.quantity || 0) * (p.unitPrice || p.price || 0));
                              }, 0);
                              
                              // Calculate GST (18% of products subtotal)
                              const gstAmount = productsSubtotal * 0.18;
                              
                              // Installation and freight
                              const installAmount = parseFloat(fullOrderDetails.installation) || 0;
                              const freightAmount = fullOrderDetails.actualFreight || parseFloat(fullOrderDetails.freightcs) || 0;
                              
                              return (
                                <>
                                  <tr style={{ borderTop: "1px solid #e5e7eb" }}>
                                    <td colSpan="5" style={{ padding: "12px", fontSize: "0.9rem", fontWeight: "600", textAlign: "right" }}>
                                      Subtotal (Products):
                                    </td>
                                    <td style={{ padding: "12px", fontSize: "0.9rem", fontWeight: "600", textAlign: "right" }}>
                                      ₹{productsSubtotal.toLocaleString()}
                                    </td>
                                  </tr>
                                  
                                  <tr style={{ borderTop: "1px solid #e5e7eb" }}>
                                    <td colSpan="5" style={{ padding: "12px", fontSize: "0.9rem", fontWeight: "600", textAlign: "right", color: "#7c3aed" }}>
                                      GST (18%):
                                    </td>
                                    <td style={{ padding: "12px", fontSize: "0.9rem", fontWeight: "600", textAlign: "right", color: "#7c3aed" }}>
                                      ₹{gstAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                    </td>
                                  </tr>
                                  
                                  {(fullOrderDetails.installation || fullOrderDetails.installchargesstatus === "Extra") && (
                                    <tr style={{ borderTop: "1px solid #e5e7eb" }}>
                                      <td colSpan="5" style={{ padding: "12px", fontSize: "0.9rem", fontWeight: "600", textAlign: "right", color: "#0891b2" }}>
                                        Installation Charges ({fullOrderDetails.installchargesstatus || "N/A"}):
                                      </td>
                                      <td style={{ padding: "12px", fontSize: "0.9rem", fontWeight: "600", textAlign: "right", color: "#0891b2" }}>
                                        {fullOrderDetails.installation ? `₹${parseFloat(fullOrderDetails.installation).toLocaleString()}` : "Included"}
                                      </td>
                                    </tr>
                                  )}
                                  
                                  {(fullOrderDetails.freightcs || fullOrderDetails.actualFreight > 0 || fullOrderDetails.freightstatus === "Extra") && (
                                    <tr style={{ borderTop: "1px solid #e5e7eb" }}>
                                      <td colSpan="5" style={{ padding: "12px", fontSize: "0.9rem", fontWeight: "600", textAlign: "right", color: "#0891b2" }}>
                                        Freight Charges ({fullOrderDetails.freightstatus || "N/A"}):
                                      </td>
                                      <td style={{ padding: "12px", fontSize: "0.9rem", fontWeight: "600", textAlign: "right", color: "#0891b2" }}>
                                        {fullOrderDetails.actualFreight > 0 
                                          ? `₹${fullOrderDetails.actualFreight.toLocaleString()}` 
                                          : fullOrderDetails.freightcs 
                                            ? `₹${parseFloat(fullOrderDetails.freightcs).toLocaleString()}` 
                                            : "To Pay"}
                                      </td>
                                    </tr>
                                  )}
                                  
                                  <tr style={{ background: "#f3f4f6", borderTop: "2px solid #9ca3af" }}>
                                    <td colSpan="5" style={{ padding: "12px", fontSize: "0.95rem", fontWeight: "700", textAlign: "right" }}>
                                      Grand Total:
                                    </td>
                                    <td style={{ padding: "12px", fontSize: "0.95rem", fontWeight: "700", textAlign: "right", color: "#059669" }}>
                                      ₹{fullOrderDetails.total?.toLocaleString() || "0"}
                                    </td>
                                  </tr>
                                </>
                              );
                            })()}
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <div style={{ color: "#64748b", textAlign: "center", padding: "20px" }}>
                        No products available
                      </div>
                    )}
                  </div>

                  {/* Timeline */}
                  <div style={{ 
                    marginBottom: "24px", 
                    padding: "24px", 
                    background: "rgba(240, 249, 255, 0.9)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    borderRadius: "0",
                    border: "1px solid rgba(56, 189, 248, 0.2)",
                    boxShadow: "0 8px 32px rgba(56, 189, 248, 0.08)",
                  }}>
                    <h6 style={{ fontWeight: "700", marginBottom: "16px", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                      ⏰ Timeline
                    </h6>
                    <div style={{ fontSize: "0.9rem", color: "#64748b" }}>
                      <div style={{ marginBottom: "8px" }}>
                        <strong>Created:</strong> {formatDate(selectedLog.createdAt)}
                      </div>
                      <div>
                        <strong>Last Updated:</strong> {formatDate(selectedLog.updatedAt)}
                      </div>
                    </div>
                  </div>

                  {/* Remarks */}
                  {fullOrderDetails.remarks && (
                    <div style={{ 
                      marginBottom: "24px", 
                      padding: "24px", 
                      background: "rgba(254, 249, 195, 0.9)",
                      backdropFilter: "blur(10px)",
                      WebkitBackdropFilter: "blur(10px)",
                      borderRadius: "0",
                      border: "1px solid rgba(234, 179, 8, 0.2)",
                      boxShadow: "0 8px 32px rgba(234, 179, 8, 0.08)",
                    }}>
                      <h6 style={{ fontWeight: "700", marginBottom: "16px", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                        💬 Remarks
                      </h6>
                      <div style={{ 
                        fontSize: "0.95rem", 
                        color: "#1e293b", 
                        lineHeight: "1.8",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word"
                      }}>
                        {fullOrderDetails.remarks}
                      </div>
                    </div>
                  )}

                  {/* Attachment Download */}
                  {fullOrderDetails.poFilePath && (
                    <div style={{ 
                      marginBottom: "24px", 
                      padding: "24px", 
                      background: "rgba(243, 232, 255, 0.9)",
                      backdropFilter: "blur(10px)",
                      WebkitBackdropFilter: "blur(10px)",
                      borderRadius: "0",
                      border: "1px solid rgba(168, 85, 247, 0.2)",
                      boxShadow: "0 8px 32px rgba(168, 85, 247, 0.08)",
                    }}>
                      <h6 style={{ fontWeight: "700", marginBottom: "16px", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                        📎 Attachment
                      </h6>
                      <Button
                        className="btn-hover-animation"
                        onClick={async () => {
                          try {
                            const fullPath = fullOrderDetails.poFilePath;
                            const filename = fullPath.split('/').pop();
                            if (!filename) {
                              toast.error("Invalid file name!");
                              return;
                            }
                            const orderSource = fullOrderDetails._orderSource || "SO";
                            const api = orderSource === "Furni" ? furniApi : soApi;
                            const response = await api.get(`${fullPath}`, { responseType: "blob" });
                            const blob = response.data;
                            const ext = filename.includes(".") ? "." + filename.split(".").pop() : "";
                            const orderId = fullOrderDetails.orderId || selectedLog.orderId || "Order";
                            const downloadFilename = `Approval_Attachment_${orderId}${ext}`;
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = downloadFilename;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(url);
                            toast.success("File downloaded successfully!");
                          } catch (error) {
                            console.error("Download error:", error);
                            toast.error(error.response?.data?.message || "Failed to download file.");
                          }
                        }}
                        style={{
                                             background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                                             border: "none",
                                             padding: "12px 24px",
                                             borderRadius: "8px",
                                             fontWeight: "600",
                                             display: "flex",
                                             alignItems: "center",
                                             gap: "8px",
                                             boxShadow: "0 4px 16px rgba(139, 92, 246, 0.3)",
                                             transition: "all 0.3s ease",
                                             color: "white",
                                           }}
                                           onMouseEnter={(e) => {
                                             e.currentTarget.style.transform = "translateY(-2px)";
                                             e.currentTarget.style.boxShadow = "0 6px 20px rgba(139, 92, 246, 0.4)";
                                           }}
                                           onMouseLeave={(e) => {
                                             e.currentTarget.style.transform = "translateY(0)";
                                             e.currentTarget.style.boxShadow = "0 4px 16px rgba(139, 92, 246, 0.3)";
                                           }}
                                         >
                                           <svg 
                                             width="18" 
                                             height="18" 
                                             viewBox="0 0 24 24" 
                                             fill="none" 
                                             stroke="currentColor" 
                                             strokeWidth="2" 
                                             strokeLinecap="round" 
                                             strokeLinejoin="round"
                                           >
                                             <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                             <polyline points="7 10 12 15 17 10"></polyline>
                                             <line x1="12" y1="15" x2="12" y2="3"></line>
                                           </svg>
                                           Download Attachment
                                         </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
              <p>No details available</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ border: "none", padding: "20px 24px", background: "#f8fafc" }}>
          {isSuperAdmin ? (
            <Button 
              variant="outline-secondary" 
              className="btn-hover-animation"
              onClick={() => setShowDetailModal(false)}
              style={{ borderRadius: "10px", fontWeight: "600", padding: "10px 20px", width: "100%" }}
            >
              Close
            </Button>
          ) : (
            <>
              <Button
                        variant="secondary"
                        onClick={() => setShowDetailModal(false)}
                        disabled={actionLoading}
                        style={{ 
                          padding: "12px 28px", 
                          borderRadius: "0", 
                          fontWeight: "600",
                          border: "none",
                          background: "rgba(100, 116, 139, 0.1)",
                          color: "#475569",
                          transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                          position: "relative",
                          overflow: "hidden",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(100, 116, 139, 0.2)";
                          e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(100, 116, 139, 0.2)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(100, 116, 139, 0.1)";
                          e.currentTarget.style.transform = "translateY(0) scale(1)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                        onMouseDown={(e) => {
                          e.currentTarget.style.transform = "translateY(0) scale(0.98)";
                        }}
                        onMouseUp={(e) => {
                          e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                        }}
                      >
                        Close
                      </Button>
              <Button
                         onClick={() => handleReject(selectedLog)}
                         disabled={actionLoading}
                         style={{
                           background: "linear-gradient(135deg, #ef4444, #dc2626)",
                           border: "none",
                           padding: "12px 28px",
                           borderRadius: "0",
                           fontWeight: "600",
                           display: "flex",
                           alignItems: "center",
                           gap: "8px",
                           boxShadow: "0 4px 16px rgba(239, 68, 68, 0.3)",
                           transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                           position: "relative",
                           overflow: "hidden",
                         }}
                         onMouseEnter={(e) => {
                           e.currentTarget.style.transform = "translateY(-3px) scale(1.03)";
                           e.currentTarget.style.boxShadow = "0 8px 24px rgba(239, 68, 68, 0.5)";
                           e.currentTarget.style.background = "linear-gradient(135deg, #dc2626, #b91c1c)";
                         }}
                         onMouseLeave={(e) => {
                           e.currentTarget.style.transform = "translateY(0) scale(1)";
                           e.currentTarget.style.boxShadow = "0 4px 16px rgba(239, 68, 68, 0.3)";
                           e.currentTarget.style.background = "linear-gradient(135deg, #ef4444, #dc2626)";
                         }}
                         onMouseDown={(e) => {
                           e.currentTarget.style.transform = "translateY(0) scale(0.97)";
                           e.currentTarget.style.boxShadow = "0 2px 8px rgba(239, 68, 68, 0.4)";
                         }}
                         onMouseUp={(e) => {
                           e.currentTarget.style.transform = "translateY(-3px) scale(1.03)";
                           e.currentTarget.style.boxShadow = "0 8px 24px rgba(239, 68, 68, 0.5)";
                         }}
                       >
                         <X size={18} style={{ 
                           transition: "transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                         }} />
                         {actionLoading ? "Processing..." : "Reject"}
                       </Button>
                       <Button
                         onClick={() => handleApprove(selectedLog)}
                         disabled={actionLoading}
                         style={{
                           background: "linear-gradient(135deg, #10b981, #059669)",
                           border: "none",
                           padding: "12px 28px",
                           borderRadius: "0",
                           fontWeight: "600",
                           display: "flex",
                           alignItems: "center",
                           gap: "8px",
                           boxShadow: "0 4px 16px rgba(16, 185, 129, 0.3)",
                           transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                           position: "relative",
                           overflow: "hidden",
                         }}
                         onMouseEnter={(e) => {
                           e.currentTarget.style.transform = "translateY(-3px) scale(1.03)";
                           e.currentTarget.style.boxShadow = "0 8px 24px rgba(16, 185, 129, 0.5)";
                           e.currentTarget.style.background = "linear-gradient(135deg, #059669, #047857)";
                         }}
                         onMouseLeave={(e) => {
                           e.currentTarget.style.transform = "translateY(0) scale(1)";
                           e.currentTarget.style.boxShadow = "0 4px 16px rgba(16, 185, 129, 0.3)";
                           e.currentTarget.style.background = "linear-gradient(135deg, #10b981, #059669)";
                         }}
                         onMouseDown={(e) => {
                           e.currentTarget.style.transform = "translateY(0) scale(0.97)";
                           e.currentTarget.style.boxShadow = "0 2px 8px rgba(16, 185, 129, 0.4)";
                         }}
                         onMouseUp={(e) => {
                           e.currentTarget.style.transform = "translateY(-3px) scale(1.03)";
                           e.currentTarget.style.boxShadow = "0 8px 24px rgba(16, 185, 129, 0.5)";
                         }}
                       >
                         <Check size={18} style={{ 
                           transition: "transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                         }} />
                         {actionLoading ? "Processing..." : "Approve"}
                       </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>

      {/* Rejection Reason Modal */}
      <Modal 
        show={showRejectionModal} 
        onHide={() => setShowRejectionModal(false)} 
        centered
        backdrop="static"
        size="md"
      >
        <Modal.Header 
          closeButton 
          style={{ 
            background: "linear-gradient(135deg, #ef4444, #dc2626)", 
            color: "white",
            border: "none"
          }}
        >
          <Modal.Title style={{ fontWeight: "700", display: "flex", alignItems: "center", gap: "10px" }}>
            <X size={24} />
            Rejection Reason
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: "24px", background: "#f8fafc" }}>
          <p style={{ color: "#475569", marginBottom: "16px", fontSize: "0.95rem" }}>
            Please provide a detailed reason for rejecting this replacement order. This will be visible to the team.
          </p>
          <Form.Group>
            <Form.Control
              as="textarea"
              rows={4}
              placeholder="Enter rejection reason here..."
              value={rejectionRemarks}
              onChange={(e) => setRejectionRemarks(e.target.value)}
              style={{
                borderRadius: "12px",
                padding: "16px",
                border: "1px solid #cbd5e1",
                fontSize: "0.95rem",
                boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.02)",
                resize: "none"
              }}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer style={{ border: "none", padding: "16px 24px", background: "#f8fafc" }}>
          <Button 
            variant="outline-secondary" 
            onClick={() => setShowRejectionModal(false)}
            style={{ borderRadius: "10px", fontWeight: "600", padding: "10px 20px" }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmReject}
            disabled={actionLoading || !rejectionRemarks.trim()}
            style={{ 
              background: "linear-gradient(135deg, #ef4444, #dc2626)", 
              border: "none", 
              borderRadius: "10px", 
              fontWeight: "600", 
              padding: "10px 24px",
              boxShadow: "0 4px 12px rgba(239, 68, 68, 0.2)",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            {actionLoading ? <Spinner animation="border" size="sm" /> : <Check size={18} />}
            Confirm Rejection
          </Button>
        </Modal.Footer>
      </Modal>

      <style>
       {`
          /* Hide dropdown arrow completely */
          #notification-bell-dropdown::after {
            display: none !important;
            content: none !important;
          }
          
          .dropdown-toggle::after {
            display: none !important;
          }
          
          @keyframes badgePulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.15);
              opacity: 0.9;
            }
          }
          
          @keyframes bellRing {
            0%, 100% {
              transform: translate(-50%, -50%) rotate(0deg);
            }
            10%, 30% {
              transform: translate(-50%, -50%) rotate(-15deg);
            }
            20%, 40% {
              transform: translate(-50%, -50%) rotate(15deg);
            }
            50% {
              transform: translate(-50%, -50%) rotate(0deg);
            }
          }
          
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .dropdown-menu {
            animation: slideDown 0.3s ease-out;
          }
        `}
      </style>
    </>
  );
};

export default ApprovalNotificationBell;
