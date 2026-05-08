import React, { useState, useEffect } from "react";
import { Badge, Dropdown, Button, Modal, Spinner } from "react-bootstrap";
import { Bell, Check, X, Eye, Clock } from "lucide-react";
import serviceApi from "../axiosSetup";
import { toast } from "react-toastify";

const ApprovalNotificationBell = ({ userRole, onApprovalAction }) => {
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [fullOrderDetails, setFullOrderDetails] = useState(null);
  const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Check if user is GlobalAdmin - ONLY GlobalAdmin can see approval notifications
  // Normalize role to lowercase for comparison
  const normalizedRole = userRole?.toLowerCase() || "";
  const isGlobalAdmin = normalizedRole === "globaladmin";

  console.log("[NotificationBell] User role:", userRole);
  console.log("[NotificationBell] Normalized role:", normalizedRole);
  console.log("[NotificationBell] Is GlobalAdmin:", isGlobalAdmin);

  useEffect(() => {
    if (isGlobalAdmin) {
      console.log("[NotificationBell] Starting to fetch pending approvals...");
      fetchPendingApprovals();
      // Refresh every 30 seconds
      const interval = setInterval(fetchPendingApprovals, 30000);
      return () => clearInterval(interval);
    } else {
      console.log("[NotificationBell] User is not GlobalAdmin, bell will not render");
    }
  }, [isGlobalAdmin]);

  const fetchPendingApprovals = async () => {
    if (!isGlobalAdmin) return;
    
    setLoading(true);
    try {
      console.log("[NotificationBell] Fetching logs with status: Proceed For Approval");
      const response = await serviceApi.get("/replacement-demo-logs/notifications/pending");
      console.log("[NotificationBell] Response:", response.data);
      if (response.data.success) {
        // Only logs with "Proceed For Approval" status will be returned from backend
        setPendingApprovals(response.data.data || []);
        console.log("[NotificationBell] Logs ready for approval:", response.data.data?.length || 0);
      }
    } catch (error) {
      console.error("[NotificationBell] Failed to fetch pending approvals:", error);
      console.error("[NotificationBell] Error details:", error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (log) => {
    setSelectedLog(log);
    setShowDetailModal(true);
    setFullOrderDetails(null);
    
    // Fetch full order details
    setOrderDetailsLoading(true);
    try {
      console.log("[NotificationBell] Fetching full order details for log:", log._id);
      const response = await serviceApi.get(`/replacement-demo-logs/${log._id}/full-order`);
      console.log("[NotificationBell] Full order response:", response.data);
      console.log("[NotificationBell] Order object:", response.data.order);
      console.log("[NotificationBell] Products:", response.data.order?.products);
      console.log("[NotificationBell] Shipping Address:", response.data.order?.shippingAddress);
      console.log("[NotificationBell] Billing Address:", response.data.order?.billingAddress);
      console.log("[NotificationBell] Freight charges:", response.data.order?.freightcs, response.data.order?.actualFreight);
      console.log("[NotificationBell] Installation:", response.data.order?.installation, response.data.order?.installchargesstatus);
      console.log("[NotificationBell] Total:", response.data.order?.total);
      if (response.data.success) {
        setFullOrderDetails(response.data.order);
      }
    } catch (error) {
      console.error("[NotificationBell] Failed to fetch full order details:", error);
      toast.error("Failed to load complete order details");
    } finally {
      setOrderDetailsLoading(false);
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

  const handleReject = async (log) => {
    const remarks = prompt("Please enter rejection reason:");
    if (!remarks || remarks.trim() === "") {
      toast.warning("Rejection reason is required");
      return;
    }

    setActionLoading(true);
    try {
      const response = await serviceApi.post(`/replacement-demo-logs/${log._id}/reject`, { remarks });
      if (response.data.success) {
        toast.success("Order rejected successfully!");
        fetchPendingApprovals();
        setShowDetailModal(false);
        if (onApprovalAction) onApprovalAction();
      }
    } catch (error) {
      console.error("Failed to reject:", error);
      toast.error(error.response?.data?.message || "Failed to reject order");
    } finally {
      setActionLoading(false);
    }
  };

  if (!isGlobalAdmin) return null;

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
      hour12: true, // 12-hour format with AM/PM
    });
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
              animation: pendingApprovals.length > 0 ? "bellRing 2s ease-in-out infinite" : "none",
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
          {pendingApprovals.length > 0 && (
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
              {pendingApprovals.length}
            </Badge>
          )}
        </Dropdown.Toggle>

        <Dropdown.Menu
          style={{
            minWidth: "400px",
            maxHeight: "500px",
            overflowY: "auto",
            borderRadius: "16px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            padding: 0,
            background: "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            marginTop: "12px",
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              color: "white",
              borderRadius: "12px 12px 0 0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h6 style={{ margin: 0, fontWeight: "700", fontSize: "1rem" }}>
              Ready For Approval
            </h6>
            <Badge bg="light" text="dark" style={{ fontSize: "0.85rem" }}>
              {pendingApprovals.length}
            </Badge>
          </div>

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center" }}>
              <Spinner animation="border" size="sm" variant="primary" />
              <p style={{ marginTop: "12px", color: "#6b7280", fontSize: "0.85rem" }}>
                Loading...
              </p>
            </div>
          ) : pendingApprovals.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center" }}>
              <Check size={48} color="#10b981" style={{ marginBottom: "12px" }} />
              <p style={{ color: "#6b7280", margin: 0, fontSize: "0.9rem" }}>
                No orders ready for approval
              </p>
              <p style={{ color: "#9ca3af", margin: "4px 0 0 0", fontSize: "0.8rem" }}>
                Orders with "Proceed For Approval" status will appear here
              </p>
            </div>
          ) : (
            pendingApprovals.map((log, index) => (
              <div
                key={log._id}
                style={{
                  padding: "16px 20px",
                  borderBottom: index < pendingApprovals.length - 1 ? "1px solid rgba(0, 0, 0, 0.06)" : "none",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(118, 75, 162, 0.08))";
                  e.currentTarget.style.transform = "translateX(4px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.transform = "translateX(0)";
                }}
                onClick={() => handleViewDetails(log)}
              >
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
              </div>
            ))
          )}

          {pendingApprovals.length > 0 && (
            <div style={{ padding: "12px 20px", background: "#f8fafc", borderRadius: "0 0 12px 12px" }}>
              <Button
                variant="link"
                size="sm"
                onClick={fetchPendingApprovals}
                style={{
                  width: "100%",
                  color: "#667eea",
                  textDecoration: "none",
                  fontWeight: "600",
                  fontSize: "0.85rem",
                }}
              >
                Refresh
              </Button>
            </div>
          )}
        </Dropdown.Menu>
      </Dropdown>

      {/* Detail Modal */}
      <Modal 
        show={showDetailModal} 
        onHide={() => setShowDetailModal(false)} 
        size="xl" 
        centered
        style={{
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        <Modal.Header
          closeButton
          style={{
            background: "linear-gradient(135deg, #667eea, #764ba2)",
            color: "white",
            borderBottom: "none",
            borderRadius: "0",
            padding: "24px 30px",
          }}
        >
          <Modal.Title style={{ fontWeight: "700", fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "10px" }}>
            <Bell size={28} />
            Approval Request Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: "30px", background: "#f8fafc", maxHeight: "70vh", overflowY: "auto", position: "relative", minHeight: "400px" }}>
          {orderDetailsLoading ? (
            <div style={{ 
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(248, 250, 252, 0.95)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              zIndex: 10,
            }}>
              <div style={{
                width: "60px",
                height: "60px",
                border: "3px solid rgba(102, 126, 234, 0.1)",
                borderTop: "3px solid #667eea",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }} />
              <style>
                {`
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}
              </style>
            </div>
          ) : selectedLog && fullOrderDetails ? (
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
                marginBottom: "0", 
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
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
              <p>No order details available</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ 
          borderTop: "1px solid rgba(0, 0, 0, 0.06)", 
          padding: "24px 30px",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderRadius: "0",
        }}>
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
