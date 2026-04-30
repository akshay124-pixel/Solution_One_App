import React from "react";
import { Table, Button, Badge } from "react-bootstrap";
import { FaEye } from "react-icons/fa";
import { Settings } from "lucide-react";

const ServiceLogsTable = ({ logs, onView, onEdit, onDelete, loading }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-GB");
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getSystemBadge = (systemType) => {
    if (systemType === 'furniture') {
      return {
        bg: 'warning',
        text: 'Furniture',
        icon: '🪑'
      };
    } else {
      return {
        bg: 'info',
        text: 'AV&EdTech',
        icon: '📺'
      };
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      Open: "danger",
      "In Progress": "warning",
      Resolved: "info",
      Closed: "success",
      Completed: "success",
    };
    return statusMap[status] || "secondary";
  };

  const getCallStatusBadge = (callStatus) => {
    const callStatusMap = {
      "Site Survey": { bg: "#3b82f6", icon: "🔍" }, // Blue
      "Installation": { bg: "#8b5cf6", icon: "🔧" }, // Purple
      "Inspection": { bg: "#10b981", icon: "✅" }, // Green
      "Service Request": { bg: "#f59e0b", icon: "📝" }, // Orange
    };
    return callStatusMap[callStatus] || { bg: "#6b7280", icon: "📋" };
  };

  if (loading) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px 40px",
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          border: "1px solid #e2e8f0",
        }}
      >
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
        <p style={{ 
          marginTop: "12px", 
          color: "#6b7280", 
          fontSize: "0.875rem",
          fontWeight: "500"
        }}>
          Loading service logs...
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
  }

  if (!logs || logs.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px 40px",
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          border: "1px solid #e2e8f0",
        }}
      >
        <Settings 
          size={48} 
          style={{ 
            color: "#9ca3af", 
            marginBottom: "16px"
          }} 
        />
        <p style={{ 
          color: "#6b7280", 
          fontSize: "1rem", 
          fontWeight: "500",
          margin: 0
        }}>
          No service logs found
        </p>
        <p style={{ 
          color: "#9ca3af", 
          fontSize: "0.875rem",
          margin: "8px 0 0 0"
        }}>
          Create a call log to get started with service tracking
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
        overflow: "hidden",
        border: "none",
        maxHeight: "600px", // Fixed height
      }}
    >
      <div 
        className="service-logs-table-container"
        style={{ 
          overflowX: "auto", 
          overflowY: "auto", 
          maxHeight: "600px",
          scrollbarWidth: "thin",
          scrollbarColor: "#2575fc #e6f0fa"
        }}
      >
        <Table hover responsive style={{ margin: 0 }}>
          <thead
            className="gradient-table-header"
            style={{
              color: "white",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              position: "sticky",
              top: 0,
              zIndex: 2
            }}
          >
            <tr>
              <th style={{ 
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
              }}>#</th>
              <th style={{ 
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
              }}>System</th>
              <th style={{ 
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
              }}>Order ID</th>
              <th style={{ 
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
              }}>Customer Name</th>
              <th style={{ 
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
              }}>Contact No</th>
              <th style={{ 
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
              }}>Call Status</th>
              <th style={{ 
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
              }}>Issue</th>
              <th style={{ 
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
              }}>Status</th>
              <th style={{ 
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
              }}>Follow-up Date</th>
              <th style={{ 
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
              }}>Created Date</th>
              <th style={{ 
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
              }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => (
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
                <td style={{ 
                  padding: "10px 15px", 
                  height: "50px",
                  lineHeight: "30px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                  fontWeight: "500",
                  color: "#6b7280",
                  fontSize: "0.875rem"
                }}>{index + 1}</td>
                <td style={{ 
                  padding: "10px 15px", 
                  height: "50px",
                  lineHeight: "30px",
                  textAlign: "center"
                }}>
                  <Badge 
                    bg={getSystemBadge(log.systemType || log.orderDetails?.systemType).bg}
                    style={{
                      padding: "6px 12px",
                      fontSize: "0.75rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      textAlign: "center",
                      borderRadius: "8px",
                      fontWeight: "600"
                    }}
                  >
                    <span>{getSystemBadge(log.systemType || log.orderDetails?.systemType).icon}</span>
                    {getSystemBadge(log.systemType || log.orderDetails?.systemType).text}
                  </Badge>
                </td>
                <td style={{ 
                  padding: "10px 15px", 
                  height: "50px",
                  lineHeight: "30px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                  fontWeight: "600",
                  color: "#1f2937"
                }}>
                  {log.orderId}
                </td>
                <td style={{ 
                  padding: "10px 15px", 
                  height: "50px",
                  lineHeight: "30px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                  fontWeight: "500",
                  color: "#1f2937"
                }}>
                  {log.orderDetails?.customername || "-"}
                </td>
                <td style={{ 
                  padding: "10px 15px", 
                  height: "50px",
                  lineHeight: "30px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                  fontWeight: "500",
                  color: "#1f2937"
                }}>
                  {log.orderDetails?.contactNo || "-"}
                </td>
                <td style={{ 
                  padding: "10px 15px", 
                  height: "50px",
                  lineHeight: "30px",
                  textAlign: "center"
                }}>
                  <Badge 
                    style={{
                      background: getCallStatusBadge(log.callStatus).bg,
                      color: "white",
                      border: "none",
                      padding: "6px 12px",
                      fontSize: "0.85rem",
                      fontWeight: "500",
                      borderRadius: "6px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      minWidth: "120px",
                      justifyContent: "center"
                    }}
                  >
                    <span>{getCallStatusBadge(log.callStatus).icon}</span>
                    {log.callStatus}
                  </Badge>
                </td>
                <td
                  style={{
                    padding: "10px 15px",
                    height: "50px",
                    lineHeight: "30px",
                    maxWidth: "250px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    textAlign: "center",
                    color: "#6b7280"
                  }}
                  title={log.issue}
                >
                  {log.issue || "-"}
                </td>
                <td style={{ 
                  padding: "10px 15px", 
                  height: "50px",
                  lineHeight: "30px",
                  textAlign: "center"
                }}>
                  <Badge 
                    bg={getStatusBadge(log.serviceStatus)}
                    style={{
                      padding: "6px 12px",
                      fontSize: "0.9rem",
                      display: "inline-block",
                      width: "100%",
                      textAlign: "center",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {log.serviceStatus}
                  </Badge>
                </td>
                <td style={{ 
                  padding: "10px 15px", 
                  height: "50px",
                  lineHeight: "30px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                  color: "#6b7280"
                }}>
                  {formatDate(log.followUpDate)}
                </td>
                <td style={{ 
                  padding: "10px 15px", 
                  height: "50px",
                  lineHeight: "30px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                  color: "#6b7280"
                }}>
                  {formatDateTime(log.createdAt)}
                </td>
                <td style={{ 
                  padding: "5px", 
                  height: "50px",
                  textAlign: "center"
                }}>
                  <div style={{ 
                    display: "flex", 
                    gap: "10px",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "50px",
                    overflow: "visible",
                    flexWrap: "nowrap"
                  }}>
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
                        zIndex: 1
                      }}
                      title="View Details"
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

                    {onDelete && (
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
      
      <style>
        {`
          /* Custom scrollbar styling */
          .service-logs-table-container::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .service-logs-table-container::-webkit-scrollbar-track {
            background: #e6f0fa;
            border-radius: 4px;
          }
          .service-logs-table-container::-webkit-scrollbar-thumb {
            background: #2575fc;
            border-radius: 4px;
          }
          .service-logs-table-container::-webkit-scrollbar-thumb:hover {
            background: #1d5bb8;
          }
          
          /* Gradient header styling */
          .gradient-table-header {
            background: linear-gradient(135deg, #2575fc, #6a11cb) !important;
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

export default ServiceLogsTable;
