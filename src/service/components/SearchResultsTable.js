import React from "react";
import { Table, Button, Badge } from "react-bootstrap";
import { FaEye } from "react-icons/fa";
import { Phone } from "lucide-react";

const SearchResultsTable = ({ orders, onView, onCallLog }) => {
  if (!orders || orders.length === 0) {
    return null;
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-GB");
  };

  const getProductsSummary = (products) => {
    if (!products || products.length === 0) return "-";
    return products.map((p) => `${p.productType} (${p.qty})`).join(", ");
  };

  const getWarrantySummary = (products) => {
    if (!products || products.length === 0) return "-";
    const warranties = products.map((p) => p.warranty || "N/A");
    const uniqueWarranties = [...new Set(warranties)];
    return uniqueWarranties.join(", ");
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
      "Pending for Approval": "warning",
      "Accounts Approved": "info",
      Approved: "success",
      "Order on Hold Due to Low Price": "dark",
      "Order Cancelled": "danger",
    };
    return statusMap[status] || "secondary";
  };

  return (
    <div
      style={{
        marginBottom: "30px",
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
        overflow: "hidden",
        border: "none",
      }}
    >
      <div
        style={{
          padding: "20px 24px",
          background: "linear-gradient(135deg, #2575fc, #6a11cb)",
          color: "white",
          borderBottom: "none",
        }}
      >
        <h5 style={{ margin: 0, fontWeight: "600", fontSize: "1.125rem" }}>
          Search Results ({orders.length})
        </h5>
        <p style={{ margin: "4px 0 0 0", color: "rgba(255, 255, 255, 0.8)", fontSize: "0.875rem" }}>
          Found {orders.length} matching order{orders.length !== 1 ? 's' : ''}
        </p>
      </div>
      
      <div style={{ overflowX: "auto" }}>
        <Table hover responsive style={{ margin: 0 }}>
          <thead 
            className="gradient-table-header"
            style={{ 
              color: "white",
              boxShadow: "none",
            }}
          >
            <tr>
              <th style={{ 
                padding: "15px", 
                height: "50px",
                fontSize: "0.875rem",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                whiteSpace: "nowrap",
                textAlign: "center",
                border: "none",
                color: "white",
                verticalAlign: "middle"
              }}>#</th>
              <th style={{ 
                padding: "15px", 
                height: "50px",
                fontSize: "0.875rem",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                whiteSpace: "nowrap",
                textAlign: "center",
                border: "none",
                color: "white",
                verticalAlign: "middle"
              }}>System</th>
              <th style={{ 
                padding: "15px", 
                height: "50px",
                fontSize: "0.875rem",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                whiteSpace: "nowrap",
                textAlign: "center",
                border: "none",
                color: "white",
                verticalAlign: "middle"
              }}>Order ID</th>
              <th style={{ 
                padding: "15px", 
                height: "50px",
                fontSize: "0.875rem",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                whiteSpace: "nowrap",
                textAlign: "center",
                border: "none",
                color: "white",
                verticalAlign: "middle"
              }}>SO Date</th>
              <th style={{ 
                padding: "15px", 
                height: "50px",
                fontSize: "0.875rem",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                whiteSpace: "nowrap",
                textAlign: "center",
                border: "none",
                color: "white",
                verticalAlign: "middle"
              }}>Customer Name</th>
              <th style={{ 
                padding: "15px", 
                height: "50px",
                fontSize: "0.875rem",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                whiteSpace: "nowrap",
                textAlign: "center",
                border: "none",
                color: "white",
                verticalAlign: "middle"
              }}>Contact Person</th>
              <th style={{ 
                padding: "15px", 
                height: "50px",
                fontSize: "0.875rem",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                whiteSpace: "nowrap",
                textAlign: "center",
                border: "none",
                color: "white",
                verticalAlign: "middle"
              }}>Contact No</th>
              <th style={{ 
                padding: "15px", 
                height: "50px",
                fontSize: "0.875rem",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                whiteSpace: "nowrap",
                textAlign: "center",
                border: "none",
                color: "white",
                verticalAlign: "middle"
              }}>Products</th>
              <th style={{ 
                padding: "15px", 
                height: "50px",
                fontSize: "0.875rem",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                whiteSpace: "nowrap",
                textAlign: "center",
                border: "none",
                color: "white",
                verticalAlign: "middle"
              }}>Warranty</th>
              <th style={{ 
                padding: "15px", 
                height: "50px",
                fontSize: "0.875rem",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                whiteSpace: "nowrap",
                textAlign: "center",
                border: "none",
                color: "white",
                verticalAlign: "middle"
              }}>SO Status</th>
              <th style={{ 
                padding: "15px", 
                height: "50px",
                fontSize: "0.875rem",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                whiteSpace: "nowrap",
                textAlign: "center",
                border: "none",
                color: "white",
                verticalAlign: "middle"
              }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, index) => (
              <tr 
                key={order._id || index}
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
                  padding: "15px", 
                  height: "50px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                  fontWeight: "500",
                  color: "#6b7280",
                  fontSize: "0.875rem",
                  verticalAlign: "middle",
                  borderBottom: "1px solid #f3f4f6"
                }}>{index + 1}</td>
                <td style={{ 
                  padding: "15px", 
                  height: "50px",
                  textAlign: "center",
                  verticalAlign: "middle",
                  borderBottom: "1px solid #f3f4f6"
                }}>
                  <Badge 
                    bg={getSystemBadge(order.systemType).bg}
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
                    <span>{getSystemBadge(order.systemType).icon}</span>
                    {getSystemBadge(order.systemType).text}
                  </Badge>
                </td>
                <td style={{ 
                  padding: "15px", 
                  height: "50px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                  fontWeight: "600",
                  color: "#1f2937",
                  verticalAlign: "middle",
                  borderBottom: "1px solid #f3f4f6"
                }}>
                  {order.orderId}
                </td>
                <td style={{ 
                  padding: "15px", 
                  height: "50px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                  color: "#6b7280",
                  verticalAlign: "middle",
                  borderBottom: "1px solid #f3f4f6"
                }}>{formatDate(order.soDate)}</td>
                <td style={{ 
                  padding: "15px", 
                  height: "50px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                  fontWeight: "500",
                  color: "#1f2937",
                  verticalAlign: "middle",
                  borderBottom: "1px solid #f3f4f6"
                }}>{order.customername || "-"}</td>
                <td style={{ 
                  padding: "15px", 
                  height: "50px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                  color: "#6b7280",
                  verticalAlign: "middle",
                  borderBottom: "1px solid #f3f4f6"
                }}>{order.name || "-"}</td>
                <td style={{ 
                  padding: "15px", 
                  height: "50px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                  fontWeight: "500",
                  color: "#1f2937",
                  verticalAlign: "middle",
                  borderBottom: "1px solid #f3f4f6"
                }}>{order.contactNo || "-"}</td>
                <td
                  style={{
                    padding: "15px",
                    height: "50px",
                    maxWidth: "300px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    textAlign: "center",
                    color: "#6b7280",
                    verticalAlign: "middle",
                    borderBottom: "1px solid #f3f4f6"
                  }}
                  title={getProductsSummary(order.products)}
                >
                  {getProductsSummary(order.products)}
                </td>
                <td
                  style={{
                    padding: "15px",
                    height: "50px",
                    maxWidth: "200px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    textAlign: "center",
                    color: "#6b7280",
                    fontWeight: "500",
                    verticalAlign: "middle",
                    borderBottom: "1px solid #f3f4f6"
                  }}
                  title={getWarrantySummary(order.products)}
                >
                  {getWarrantySummary(order.products)}
                </td>
                <td style={{ 
                  padding: "15px", 
                  height: "50px",
                  textAlign: "center",
                  verticalAlign: "middle",
                  borderBottom: "1px solid #f3f4f6"
                }}>
                  <Badge 
                    bg={getStatusBadge(order.sostatus)}
                    style={{
                      padding: "6px 12px",
                      fontSize: "0.75rem",
                      display: "inline-block",
                      textAlign: "center",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {order.sostatus === "Order on Hold Due to Low Price"
                      ? "On Hold"
                      : order.sostatus || "-"}
                  </Badge>
                </td>
                <td style={{ 
                  padding: "15px", 
                  height: "50px",
                  textAlign: "center",
                  verticalAlign: "middle",
                  borderBottom: "1px solid #f3f4f6"
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
                      onClick={() => onView(order)}
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
                      onClick={() => onCallLog(order)}
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
                        zIndex: 1
                      }}
                      title="Call Log"
                    >
                      <Phone size={16} color="white" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      
      <style>
        {`
          /* Gradient header styling */
          .gradient-table-header {
            background: linear-gradient(135deg, #2575fc, #6a11cb) !important;
          }
          .gradient-table-header th {
            background: transparent !important;
            color: white !important;
            border: none !important;
          }
        `}
      </style>
    </div>
  );
};

export default SearchResultsTable;
