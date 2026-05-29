import React from "react";
import { Table, Button, Badge } from "react-bootstrap";
import { FaEye, FaCheck, FaTimes } from "react-icons/fa";

const ReplacementDemoLogsTable = ({ logs, onView, onEdit, onApprove, onReject, onDelete, loading, userRole, page, setPage, totalPages, totalRecords }) => {
  // Check if user is Global Admin - ONLY GlobalAdmin can approve/reject/delete
  // Normalize role to lowercase for comparison
  const normalizedRole = userRole?.toLowerCase() || "";
  const isGlobalAdmin = normalizedRole === "globaladmin";

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      Pending: { bg: "#f59e0b", text: "white", icon: "⏳" },
      "Proceed For Approval": { bg: "#3b82f6", text: "white", icon: "📋" },
      Approved: { bg: "#10b981", text: "white", icon: "✅" },
      Rejected: { bg: "#ef4444", text: "white", icon: "❌" },
      Closed: { bg: "#6b7280", text: "white", icon: "🔒" },
    };
    const config = statusConfig[status] || { bg: "#6b7280", text: "white", icon: "📋" };
    return (
      <Badge 
        style={{ 
          backgroundColor: config.bg, 
          color: config.text,
          fontSize: "0.85rem", 
          padding: "6px 12px",
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          borderRadius: "6px",
          fontWeight: "600",
          minWidth: "140px",
          justifyContent: "center"
        }}
      >
        <span>{config.icon}</span>
        {status}
      </Badge>
    );
  };

  const getOrderTypeBadge = (orderType) => {
    const config = orderType === "Replacement" 
      ? { bg: "#dc2626", icon: "🔄" }
      : { bg: "#0891b2", icon: "🎯" };
    return (
      <Badge 
        style={{ 
          backgroundColor: config.bg, 
          color: "white", 
          fontSize: "0.85rem", 
          padding: "6px 12px",
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          borderRadius: "6px",
          fontWeight: "600"
        }}
      >
        <span>{config.icon}</span>
        {orderType}
      </Badge>
    );
  };

  const renderLoadingOverlay = () => (
    <div style={{
      position: "absolute",
      top: "50px",
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(255, 255, 255, 0.6)",
      backdropFilter: "blur(1px)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10
    }}>
      <div 
        style={{
          width: "40px",
          height: "40px",
          border: "3px solid #f3f4f6",
          borderTop: "3px solid #667eea",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          margin: "0 auto 16px",
        }}
      />
      <p style={{ color: "#6b7280", fontSize: "0.875rem", fontWeight: "500", margin: 0 }}>
        Loading replacement logs...
      </p>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );

  const renderEmptyState = () => (
    <tr>
      <td colSpan="9" style={{ padding: 0 }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "550px",
          padding: "40px 20px",
          background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)"
        }}>
          <div style={{
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "24px",
            boxShadow: "0 10px 30px rgba(102, 126, 234, 0.2)"
          }}>
            <span style={{ fontSize: "3.5rem" }}>📋</span>
          </div>
          <p style={{
            color: "#1f2937",
            fontSize: "1.5rem",
            fontWeight: "700",
            margin: "0 0 8px 0",
            letterSpacing: "-0.5px"
          }}>
            No Replacement Logs Found
          </p>
          <p style={{
            color: "#9ca3af",
            fontSize: "0.95rem",
            margin: 0,
            maxWidth: "400px",
            textAlign: "center",
            lineHeight: "1.6"
          }}>
            Logs will automatically appear here when new Replacement orders are created and submitted for approval.
          </p>
          <div style={{
            marginTop: "32px",
            padding: "12px 24px",
            borderRadius: "8px",
            background: "#e0f2fe",
            border: "1px solid #bae6fd",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#0c4a6e"
          }}>
            <span style={{ fontSize: "1.1rem" }}>💡</span>
            <span style={{ fontWeight: "500" }}>Pro Tip: Make sure your orders are marked as "Replacement" type</span>
          </div>
        </div>
      </td>
    </tr>
  );


  return (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
        overflow: "hidden",
        border: "none",
        display: "flex",
        flexDirection: "column",
        position: "relative"
      }}
    >
      {loading && renderLoadingOverlay()}
      <div 
        className="replacement-demo-table-container"
        style={{ 
          overflowX: "auto", 
          overflowY: "auto", 
          height: "600px",
          scrollbarWidth: "thin",
          scrollbarColor: "#667eea #e6f0fa",
          width: "100%",
          position: "relative"
        }}
      >
        <Table hover style={{ margin: 0, width: "100%", minWidth: "1200px" }}>
          <thead
            className="gradient-table-header"
            style={{
              background: "linear-gradient(135deg, #2575fc, #6a11cb)",
              color: "white",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              position: "sticky",
              top: 0,
              zIndex: 2
            }}
          >
            <tr>
              <th style={headerStyle}>#</th>
              <th style={headerStyle}>Log Number</th>
              <th style={headerStyle}>Order ID</th>
              <th style={headerStyle}>Order Type</th>
              <th style={headerStyle}>Customer Name</th>
              <th style={headerStyle}>Sales Person</th>
              <th style={headerStyle}>Approval Status</th>
              <th style={headerStyle}>Created Date</th>
              <th style={headerStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(!logs || logs.length === 0) && !loading ? renderEmptyState() : logs.map((log, index) => {
              const canApprove = isGlobalAdmin && log.approvalStatus === "Proceed For Approval";
              
              return (
                <tr 
                  key={log._id || index}
                  style={{
                    borderBottom: "1px solid #e6f0fa",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f0f7ff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <td style={cellStyle}>{index + 1}</td>
                  <td style={{ ...cellStyle, fontWeight: "700", color: "#7c3aed" }}>
                    {log.logNumber || "N/A"}
                  </td>
                  <td style={{ ...cellStyle, fontWeight: "600", color: "#1f2937" }}>
                    {log.orderId || "N/A"}
                  </td>
                  <td style={{ ...cellStyle, textAlign: "center" }}>
                    {getOrderTypeBadge(log.orderDetails?.orderType || "N/A")}
                  </td>
                  <td style={{ ...cellStyle, fontWeight: "500" }}>
                    {log.orderDetails?.customername || "N/A"}
                  </td>
                  <td style={cellStyle}>
                    {log.orderDetails?.salesPerson || "N/A"}
                  </td>
                  <td style={{ ...cellStyle, textAlign: "center" }}>
                    {getStatusBadge(log.approvalStatus)}
                  </td>
                  <td style={{ ...cellStyle, color: "#6b7280" }}>
                    {formatDate(log.createdAt)}
                  </td>
                  <td style={{ padding: "5px", height: "50px", textAlign: "center" }}>
                    <div style={{ 
                      display: "flex", 
                      gap: "10px",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "50px",
                      flexWrap: "nowrap"
                    }}>
                      {/* View Button */}
                      <Button
                        variant="primary"
                        onClick={() => onView(log)}
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          padding: "0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#007bff",
                          border: "none",
                          flexShrink: 0,
                          cursor: "pointer",
                          transition: "transform 0.2s ease, box-shadow 0.2s ease",
                        }}
                        title="View Details"
                      >
                        <FaEye />
                      </Button>
                      
                      {/* Edit Button */}
                      <button
                        className="editBtn"
                        onClick={() => onEdit(log)}
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          padding: "0",
                          background: "#6b7280",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          transition: "transform 0.2s ease, box-shadow 0.2s ease",
                        }}
                        title="Edit Log"
                      >
                        <svg height="1em" viewBox="0 0 512 512" fill="#ffffff">
                          <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z" />
                        </svg>
                      </button>

                      {/* Approve Button - Only for GlobalAdmin when status is "Proceed For Approval" */}
                      {canApprove && onApprove && (
                        <button
                          onClick={() => onApprove(log)}
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            padding: "0",
                            background: "#10b981",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            transition: "transform 0.2s ease, box-shadow 0.2s ease",
                          }}
                          title="Approve"
                        >
                          <FaCheck color="white" size={18} />
                        </button>
                      )}

                      {/* Reject Button - Only for GlobalAdmin when status is "Proceed For Approval" */}
                      {canApprove && onReject && (
                        <button
                          onClick={() => onReject(log)}
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            padding: "0",
                            background: "#ef4444",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            transition: "transform 0.2s ease, box-shadow 0.2s ease",
                          }}
                          title="Reject"
                        >
                          <FaTimes color="white" size={18} />
                        </button>
                      )}

                      {/* Delete Button - Only for GlobalAdmin */}
                      {isGlobalAdmin && onDelete && (
                        <button
                          className="bin-button"
                          onClick={() => onDelete(log)}
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            padding: "0",
                            background: "#dc2626",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            transition: "transform 0.2s ease, box-shadow 0.2s ease",
                          }}
                          title="Delete Log"
                        >
                          <svg
                            className="bin-top"
                            viewBox="0 0 39 7"
                            fill="none"
                            style={{ width: "20px", height: "5px" }}
                          >
                            <line y1="5" x2="39" y2="5" stroke="white" strokeWidth="4" />
                            <line x1="12" y1="1.5" x2="26.0357" y2="1.5" stroke="white" strokeWidth="3" />
                          </svg>
                          <svg
                            className="bin-bottom"
                            viewBox="0 0 33 39"
                            fill="none"
                            style={{ width: "20px", height: "20px" }}
                          >
                            <mask id="path-1-inside-1_8_19" fill="white">
                              <path d="M0 0H33V35C33 37.2091 31.2091 39 29 39H4C1.79086 39 0 37.2091 0 35V0Z" />
                            </mask>
                            <path
                              d="M0 0H33H0ZM37 35C37 39.4183 33.4183 43 29 43H4C-0.418278 43 -4 39.4183 -4 35H4H29H37ZM4 43C-0.418278 43 -4 39.4183 -4 35V0H4V35V43ZM37 0V35C37 39.4183 33.4183 43 29 43V35V0H37Z"
                              fill="white"
                              mask="url(#path-1-inside-1_8_19)"
                            />
                            <path d="M12 6L12 29" stroke="white" strokeWidth="4" />
                            <path d="M21 6V29" stroke="white" strokeWidth="4" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
      
      {/* Pagination Controls */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        padding: "15px 20px", 
        borderTop: "1px solid #e2e8f0", 
        background: "#f8fafc", 
        borderBottomLeftRadius: "12px", 
        borderBottomRightRadius: "12px",
        flexWrap: "wrap",
        gap: "15px"
      }}>
        <div style={{ fontSize: "0.875rem", color: "#64748b", display: "flex", alignItems: "center", gap: "15px" }}>
          <span>
            Total Records: <span style={{ fontWeight: "600", color: "#1e293b" }}>{totalRecords || 0}</span>
          </span>
          <span style={{ width: "1px", height: "14px", background: "#cbd5e1" }}></span>
          <span>
            Page <span style={{ fontWeight: "600", color: "#1e293b" }}>{page}</span> of <span style={{ fontWeight: "600", color: "#1e293b" }}>{Math.max(1, totalPages)}</span>
          </span>
        </div>
        
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <Button
            variant="outline-secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            style={{ padding: "6px 12px", fontWeight: "500", background: "white", borderRadius: "6px", border: "1px solid #cbd5e1", color: "#475569" }}
          >
            Prev
          </Button>
          
          <div style={{ display: "flex", gap: "4px" }}>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let startPage = Math.max(1, page - 2);
              let endPage = Math.min(totalPages, startPage + 4);
              if (endPage - startPage < 4) {
                startPage = Math.max(1, endPage - 4);
              }
              const pageNum = startPage + i;
              if (pageNum > totalPages) return null;
              
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? "primary" : "outline-secondary"}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  style={{ 
                    width: "32px", 
                    height: "32px",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: pageNum === page ? "600" : "500",
                    borderRadius: "6px",
                    background: pageNum === page ? "#3b82f6" : "white",
                    color: pageNum === page ? "white" : "#475569",
                    border: pageNum === page ? "none" : "1px solid #cbd5e1"
                  }}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline-primary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
            style={{ padding: "6px 12px", fontWeight: "500", background: "white", borderRadius: "6px", border: "1px solid #93c5fd", color: "#2563eb" }}
          >
            Next
          </Button>
        </div>
      </div>
      
      <style>
        {`
          /* Custom scrollbar styling */
          .replacement-demo-table-container::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .replacement-demo-table-container::-webkit-scrollbar-track {
            background: #e6f0fa;
            border-radius: 4px;
          }
          .replacement-demo-table-container::-webkit-scrollbar-thumb {
            background: #667eea;
            border-radius: 4px;
          }
          .replacement-demo-table-container::-webkit-scrollbar-thumb:hover {
            background: #5a67d8;
          }
          
          /* Gradient header styling */
          .gradient-table-header {
            background: linear-gradient(135deg, #667eea, #764ba2) !important;
          }
          .gradient-table-header th {
            background: transparent !important;
            color: white !important;
            border-bottom: 2px solid rgba(255, 255, 255, 0.2) !important;
          }
        `}
      </style>
    </div>
  );
};

const headerStyle = {
  padding: "10px 15px",
  height: "50px",
  lineHeight: "30px",
  fontSize: "0.95rem",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  borderBottom: "2px solid rgba(255, 255, 255, 0.2)",
  whiteSpace: "nowrap",
  textAlign: "center",
  border: "none",
  color: "white"
};

const cellStyle = {
  padding: "10px 15px",
  height: "50px",
  lineHeight: "30px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  textAlign: "center",
  fontWeight: "500",
  color: "#1f2937",
  fontSize: "0.875rem"
};

export default ReplacementDemoLogsTable;
