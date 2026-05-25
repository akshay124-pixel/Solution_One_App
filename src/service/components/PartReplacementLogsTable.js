import React from "react";
import { Table, Button, Badge } from "react-bootstrap";
import { FaEye, FaEdit, FaTrash } from "react-icons/fa";
import { Settings } from "lucide-react";

const PartReplacementLogsTable = ({ logs, onView, onEdit, onDelete, loading }) => {
  const userRole = localStorage.getItem("role")?.toLowerCase() || "";
  const isGlobalAdmin = userRole === "globaladmin";

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB");
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "Pending": "warning",
      "In Stock": "success",
      "Out of Stock": "danger",
    };
    return statusMap[status] || "secondary";
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
          borderTop: "3px solid #3b82f6",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          margin: "0 auto 16px",
        }}
      />
      <p style={{ color: "#6b7280", fontSize: "0.875rem", fontWeight: "500", margin: 0 }}>
        Loading logs...
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
      <td 
        colSpan="11" 
        style={{ 
          height: "550px", // Increase height to fill the scrollable container (600px - header)
          textAlign: "center", 
          verticalAlign: "middle",
          background: "white",
          border: "none",
          padding: 0
        }}
      >
        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          justifyContent: "center",
          height: "100%",
          width: "100%",
          minWidth: "1810px" 
        }}>
          <div style={{
            background: "#f8fafc",
            padding: "40px",
            borderRadius: "50%",
            marginBottom: "20px",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)"
          }}>
            <Settings size={64} style={{ color: "#9ca3af" }} />
          </div>
          <h4 style={{ color: "#1e293b", fontWeight: "700", marginBottom: "8px" }}>No Data Available</h4>
          <p style={{ color: "#64748b", fontSize: "1rem", fontWeight: "500", margin: 0 }}>
            No part replacement logs found in the system
          </p>
        </div>
      </td>
    </tr>
  );

  const getRowStyle = (log) => {
    const partStatus = log.partStatus;

    if (partStatus === "In Stock") {
      return { backgroundColor: "#eff6ff" }; // Soft Blue
    }

    if (partStatus === "Out of Stock") {
      return { backgroundColor: "#fef2f2" }; // Soft Red
    }

    if (partStatus === "Pending") {
      return { backgroundColor: "#fff7ed" }; // Soft Orange
    }

    return { backgroundColor: "transparent" };
  };

  const headerStyle = {
    color: "white",
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
    background: "transparent"
  };

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
        style={{ 
          overflowX: "auto", 
          overflowY: "auto", 
          height: "600px",
          scrollbarWidth: "thin",
          scrollbarColor: "#2575fc #e6f0fa",
          width: "100%",
          position: "relative",
          background: "white"
        }}
      >
        <Table hover style={{ margin: 0, width: "100%", minWidth: "1810px", tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0 }}>
          <thead
            className="gradient-table-header"
            style={{
              background: "linear-gradient(135deg, #2575fc, #6a11cb)",
              position: "sticky",
              top: 0,
              zIndex: 2,
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              width: "100%"
            }}
          >
            <tr style={{ background: "transparent" }}>
              <th style={{ ...headerStyle, width: "50px" }}>#</th>
              <th style={{ ...headerStyle, width: "150px" }}>Ticket ID</th>
              <th style={{ ...headerStyle, width: "200px" }}>Customer Name</th>
              <th style={{ ...headerStyle, width: "180px" }}>Product</th>
              <th style={{ ...headerStyle, width: "180px" }}>Part Name</th>
              <th style={{ ...headerStyle, width: "150px" }}>Hardware Status</th>
              <th style={{ ...headerStyle, width: "150px" }}>Part Status</th>
              <th style={{ ...headerStyle, width: "200px" }}>Issue/Reason</th>
              <th style={{ ...headerStyle, width: "200px" }}>Procurement Remarks</th>
              <th style={{ ...headerStyle, width: "150px" }}>Created Date</th>
              <th style={{ ...headerStyle, width: "150px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? renderEmptyState() : logs.map((log, index) => (
              <tr 
                key={log._id}
                style={{
                  borderBottom: "1px solid #e6f0fa",
                  transition: "all 0.3s ease",
                  ...getRowStyle(log)
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f0f7ff";
                }}
                onMouseLeave={(e) => {
                  const style = getRowStyle(log);
                  e.currentTarget.style.backgroundColor = style.backgroundColor;
                }}
              >
                <td style={{ textAlign: "center", verticalAlign: "middle", height: "50px", lineHeight: "30px", fontWeight: "500", color: "#6b7280", fontSize: "0.875rem" }}>{index + 1}</td>
                <td style={{ textAlign: "center", verticalAlign: "middle", height: "50px", lineHeight: "30px", fontWeight: "700", color: "#dc2626", fontSize: "0.9rem" }}>{log.complaintNumber}</td>
                <td style={{ textAlign: "center", verticalAlign: "middle", height: "50px", lineHeight: "30px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: "500", color: "#1f2937" }} title={log.customerName}>{log.customerName}</td>
                <td style={{ textAlign: "center", verticalAlign: "middle", height: "50px", lineHeight: "30px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: "600", color: "#1f2937" }} title={log.product}>{log.product}</td>
                <td style={{ textAlign: "center", verticalAlign: "middle", height: "50px", lineHeight: "30px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: "500", color: "#1f2937" }} title={log.partName}>{log.partName}</td>
                <td style={{ textAlign: "center", verticalAlign: "middle", height: "50px", lineHeight: "30px" }}>
                  <Badge 
                    bg={log.hardwareStatus === "In Warranty" ? "success" : "danger"}
                    style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: "600" }}
                  >
                    {log.hardwareStatus}
                  </Badge>
                </td>
                <td style={{ textAlign: "center", verticalAlign: "middle", height: "50px", lineHeight: "30px" }}>
                  <Badge 
                    bg={getStatusBadge(log.partStatus)}
                    style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: "600", minWidth: "100px" }}
                  >
                    {log.partStatus}
                  </Badge>
                </td>
                <td 
                  style={{ textAlign: "center", verticalAlign: "middle", height: "50px", lineHeight: "30px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#6b7280", fontSize: "0.875rem" }} 
                  title={log.serviceLogId?.issue || "No issue description"}
                >
                  {log.serviceLogId?.issue || "-"}
                </td>
                <td 
                  style={{ textAlign: "center", verticalAlign: "middle", height: "50px", lineHeight: "30px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#6b7280", fontSize: "0.875rem" }} 
                  title={log.remarks || "No procurement remarks"}
                >
                  {log.remarks || "-"}
                </td>
                <td style={{ textAlign: "center", verticalAlign: "middle", height: "50px", lineHeight: "30px", color: "#6b7280", fontSize: "0.875rem" }}>{formatDate(log.createdAt)}</td>
                <td style={{ textAlign: "center", verticalAlign: "middle", height: "50px" }}>
                  <div style={{ display: "flex", gap: "10px", justifyContent: "center", alignItems: "center", height: "50px" }}>
                    <Button 
                      variant="primary" 
                      onClick={() => onView(log)} 
                      style={{ width: "40px", height: "40px", borderRadius: "50%", padding: "0", display: "flex", alignItems: "center", justifyContent: "center", background: "#007bff", border: "none" }}
                      title="View"
                    >
                      <FaEye />
                    </Button>
                   
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
                        zIndex: 1
                      }}
                      title="Edit Status"
                    >
                      <svg height="1em" viewBox="0 0 512 512" fill="#ffffff">
                        <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z" />
                      </svg>
                    </button>






                    {isGlobalAdmin && (
                       <button
                        className="bin-button"
                        onClick={() => onDelete(log)}
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
                          zIndex: 1
                        }}
                        title="Delete Log"
                      >
                        <svg
                          className="bin-top"
                          viewBox="0 0 39 7"
                          fill="none"
                          style={{ width: "20px", height: "5px" }}
                        >
                          <line
                            y1="5"
                            x2="39"
                            y2="5"
                            stroke="white"
                            strokeWidth="4"
                          />
                          <line
                            x1="12"
                            y1="1.5"
                            x2="26.0357"
                            y2="1.5"
                            stroke="white"
                            strokeWidth="3"
                          />
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
            ))}
          </tbody>
        </Table>
      </div>

      {/* Table Footer */}
      <div 
        style={{ 
          background: "#f8fafc", 
          padding: "12px 24px", 
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.85rem",
          color: "#64748b",
          fontWeight: "500"
        }}
      >
        <div>
          Showing <strong>{logs.length}</strong> active hardware replacement requests
        </div>
        <div className="d-flex align-items-center gap-4">
          <div className="d-flex align-items-center gap-2">
            <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#fff7ed", border: "1px solid #ffedd5" }}></div>
            <span>Pending</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#fef2f2", border: "1px solid #fee2e2" }}></div>
            <span>Out of Stock</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartReplacementLogsTable;
