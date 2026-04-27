import React, { useState, useEffect, useMemo, useCallback } from "react";
import { FaEye, FaHome, FaWrench, FaIndustry, FaTruck } from "react-icons/fa";
import { Button, Badge, Popover, Card } from "react-bootstrap";
import Pagination from "@mui/material/Pagination";
// TeamBuilder: Team management modal component (import)
import TeamBuilder from "./TeamBuilder";
import FilterSection from "./FilterSection";
import "react-datepicker/dist/react-datepicker.css";
import soApi from "../../so/axiosSetup";
import { toast } from "react-toastify";
import { exportToExcel, readExcelFile } from "../../utils/excelHelper";
import { BarChart2, Upload, Download,Users } from "lucide-react";
import io from "socket.io-client";
import { getPortalAccessToken } from "../../portal/PortalAuthContext";
import styled from "styled-components";
import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import debounce from "lodash/debounce";
import SalesDashboardDrawer from "./Dashbords/SalesDashboardDrawer";
import { AnimatePresence, motion } from "framer-motion";
import { FINANCIAL_YEAR_OPTIONS } from "../../shared/financialYear";
import { getCurrentFinancialYear } from "../../shared/financialYear";
// Lazy load modals
const ViewEntry = React.lazy(() => import("./ViewEntry"));
const DeleteModal = React.lazy(() => import("./Delete"));
const EditEntry = React.lazy(() => import("./EditEntry"));
const AddEntry = React.lazy(() => import("./AddEntry"));

// Styled Components
// Modern loader overlay styles (keeps layout unchanged)
const LoaderOverlay = styled(motion.div)`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
`;

const SpinnerWrap = styled.div`
  display: grid;
  place-items: center;
  gap: 10px;
`;

const GradientSpinner = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: conic-gradient(#6a11cb, #2575fc, #6a11cb);
  -webkit-mask: radial-gradient(farthest-side, #0000 calc(100% - 6px), #000 0);
  mask: radial-gradient(farthest-side, #0000 calc(100% - 6px), #000 0);
  animation: spin 0.9s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(1turn);
    }
  }
`;

const NotificationPopover = styled(Popover)`
  width: 400px;
  min-width: 400px;
  max-width: 400px;
  max-height: 520px;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18), 0 4px 16px rgba(37, 117, 252, 0.12);
  background: #fff;
  border: none;
  overflow: hidden;
`;

const NotificationItem = styled.div`
  padding: 14px 16px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: ${(props) => (props.isRead ? "#ffffff" : "linear-gradient(135deg, #f0f7ff, #f5f0ff)")};
  transition: all 0.2s ease;
  position: relative;
  &::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    background: ${(props) => props.action === "created" ? "linear-gradient(135deg, #22c55e, #16a34a)" : props.action === "deleted" ? "linear-gradient(135deg, #ef4444, #dc2626)" : "linear-gradient(135deg, #2575fc, #6a11cb)"};
    opacity: ${(props) => props.isRead ? 0.3 : 1};
  }
  &:hover {
    background: #f8faff;
  }
`;

const NotificationText = styled.div`
  font-size: 0.82rem;
  color: #1e293b;
  font-weight: ${(props) => (props.isRead ? "400" : "600")};
  flex: 1;
  line-height: 1.4;
`;

const NotificationTime = styled.div`
  font-size: 0.72rem;
  color: #94a3b8;
  margin-left: 10px;
  white-space: nowrap;
  margin-top: 2px;
`;

const NotificationActions = styled.div`
  display: flex;
  gap: 10px;
  padding: 10px;
  border-top: 1px solid #e6f0fa;
  justify-content: space-between;
`;

const ClearButton = styled(Button)`
  background: #dc3545;
  border: none;
  padding: 6px 12px;
  font-size: 0.85rem;
  border-radius: 8px;
  &:hover {
    background: #b02a37;
  }
`;

const MarkReadButton = styled(Button)`
  background: #28a745;
  border: none;
  padding: 6px 12px;
  font-size: 0.85rem;
  border-radius: 8px;
  &:hover {
    background: #218838;
  }
`;

// DatePickerWrapper was unused here and is defined in other components; removed to satisfy lint rules.

const TrackerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const TrackerCard = styled(Card)`
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
  &.active {
    box-shadow: 0 8px 25px rgba(37, 117, 252, 0.3);
    border: 2px solid #2575fc;
  }
  .card-body {
    padding: 20px;
    text-align: center;
  }
  .icon {
    font-size: 2.5rem;
    margin-bottom: 10px;
  }
  .count {
    font-size: 2rem;
    font-weight: bold;
    margin-bottom: 5px;
  }
  .title {
    font-size: 1rem;
    color: #6b7280;
  }
`;

const columnWidths = [
  80, 130, 190, 150, 200, 200, 200, 150, 150, 200, 130, 130, 130, 150, 300, 300,
  300, 150, 130, 130, 100, 150, 100, 130, 130, 150, 150, 150, 150, 150, 130,
  150, 150, 150, 150, 150, 150, 150, 150, 200, 150, 130, 150, 130, 130, 150,
  150, 150, 150, 150, 150, 160, 150, 150, 150, 150, 150,
];

const totalTableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
const normalizeTableText = (value) =>
  typeof value === "string" ? value.replace(/^\s*[•·]\s*/, "").trim() : value;

// Updated CSS for perfect table alignment
const tableStyles = `
/* Prevent horizontal page scrolling */
body {
  overflow-x: hidden;
}

/* Constrain outer container to viewport */
.outer-container {
  max-width: 100vw;
  overflow-x: hidden;
}

/* Sales table container */
.sales-table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  max-height: 600px;
  overflow-y: auto;
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: #2575fc #e6f0fa;
  position: relative;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
  touch-action: pan-x pan-y; /* Enable touch scrolling in both directions */
}

/* Sales table */
.sales-table {
  width: 100%;
  min-width: ${totalTableWidth}px;
  table-layout: fixed;
  border-collapse: collapse;
}

/* Table header */
.sales-table thead tr {
  background: linear-gradient(135deg, #2575fc, #6a11cb);
  color: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  position: sticky;
  top: 0;
  z-index: 2;
}

/* Table header cells */
.sales-table th {
  padding: 10px 15px;
  height: 50px;
  line-height: 30px;
  font-size: 0.95rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  white-space: nowrap;
  text-align: center !important;
  box-sizing: border-box;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
}

/* Table body rows */
.sales-table tbody tr {
  border-bottom: 1px solid #e6f0fa;
  transition: all 0.3s ease;
}

.sales-table tbody tr:hover {
  background-color: #f0f7ff;
}

/* Table body cells */
.sales-table td {
  padding: 10px 15px;
  height: 50px;
  line-height: 30px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  box-sizing: border-box;
  text-align: center;
}

/* Contact Person Name specific styling */
.sales-table td.contact-person-name {
  font-weight: normal;
  text-align: center;
  list-style-type: none;
  padding-left: 15px;
  position: relative;
}
.sales-table td.customer-name-cell {
  font-weight: normal;
  text-align: center;
  list-style-type: none;
  padding-left: 15px;
  position: relative;
}
.sales-table td.customer-name-cell::before,
.sales-table td.customer-name-cell::after,
.sales-table td.contact-person-name::before,
.sales-table td.contact-person-name::after {
  content: none !important;
}

/* Badge styling */
.sales-table .badge {
  padding: 6px 12px;
  font-size: 0.9rem;
  display: inline-block;
  width: 100%;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Actions cell */
.sales-table .actions-cell {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 5px;
  height: 50px;
  overflow: visible;
  flex-wrap: nowrap;
}

/* Action buttons */
.sales-table .actions-cell button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  z-index: 1;
}

/* Reserve space for scrollbar */
.sales-table-container thead tr th:last-child {
  padding-right: 20px;
}

/* Virtualized list container */
.list-container {
  width: 100%;
  min-width: ${totalTableWidth}px;
}

/* Mobile-specific styles */
@media (max-width: 768px) {
  .sales-table-container {
    -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
    touch-action: pan-x pan-y; /* Enable touch scrolling */
    overscroll-behavior-x: contain; /* Prevent overscroll bounce */
    max-width: 100%;
  }

  .sales-table {
    min-width: ${totalTableWidth}px; /* Ensure horizontal scroll */
  }

  .sales-table th,
  .sales-table td {
    font-size: 0.85rem; /* Slightly smaller text for mobile */
    padding: 8px 10px; /* Reduced padding for mobile */
  }

  .sales-table .actions-cell {
    gap: 5px; /* Smaller gap for buttons on mobile */
  }

  .sales-table .actions-cell button {
    width: 36px; /* Slightly smaller buttons */
    height: 36px;
  }
}
`;

const Row = React.memo(({ index, style, data }) => {
  const {
    orders,
    handleViewClick,
    handleEditClick,
    handleDeleteClick,
    userRole,
    isOrderComplete,
    columnWidths,
    currentPage,
  } = data;
  const order = orders[index];

  // ... (rest of helper variables remain same, just ensure they are inside)
  const firstProduct =
    order.products && order.products[0] ? order.products[0] : {};
  const productDetails = order.products
    ? order.products.map((p) => `${p.productType} (${p.qty})`).join(", ")
    : "-";
  const totalUnitPrice = order.products
    ? order.products.reduce(
      (sum, p) => sum + (p.unitPrice || 0) * (p.qty || 0),
      0
    )
    : 0;
  const totalQty = order.products
    ? order.products.reduce((sum, p) => sum + (p.qty || 0), 0)
    : 0;
  const gstValues = order.products
    ? order.products
      .map((p) => `${p.gst}`)
      .filter(Boolean)
      .join(", ")
    : "-";

  const getRowBackground = () => {
    if (order.dispatchStatus === "Order Cancelled") return "#ffebee";

    if (isOrderComplete(order)) return "#ffffff";

    if (order.sostatus === "Approved") {
      if (order.poFilePath) {
        return "#d4f4e6";
      }
      return "#e6ffed";
    }

    if (order.sostatus === "Accounts Approved") return "#e6f0ff";

    // Pending for Approval
    if (order.sostatus === "Pending for Approval") {
      if (order.poFilePath) {
        return "#e4d1ff"; // darker purple when PO attached
      }
      return "#f3e8ff"; // normal pending
    }

    return "#f3e8ff";
  };

  const getHoverBackground = () => {
    if (order.dispatchStatus === "Order Cancelled") return "#ffcdd2";
    if (isOrderComplete(order)) return "#f0f7ff";
    if (order.sostatus === "Approved") return "#d1f7dc";
    if (order.sostatus === "Accounts Approved") return "#d1e4ff";
    return "#ede4ff";
  };

  return (
    <tr
      style={{
        ...style,
        backgroundColor: getRowBackground(),
        display: "table-row",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.backgroundColor = getHoverBackground())
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.backgroundColor = getRowBackground())
      }
    >
      {[
        { width: columnWidths[0], content: (currentPage - 1) * 20 + index + 1, title: `${(currentPage - 1) * 20 + index + 1}` },
        {
          width: columnWidths[1],
          content: order.orderId || "-",
          title: order.orderId || "-",
        },
        // ... (rest of columns)

        {
          width: columnWidths[2],
          content: (() => {
            if (!order.soDate) return "-";

            const date = new Date(order.soDate);
            if (isNaN(date.getTime())) return "-"; // Handle invalid date

            const hours = date.getHours();
            const minutes = date.getMinutes();

            // Always show the date
            const dateStr = date.toLocaleString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            });

            // Show time only if after 5:30 AM
            if (hours < 5 || (hours === 5 && minutes <= 30)) {
              return dateStr; // Show only date
            }

            const timeStr = date.toLocaleString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            });

            return `${dateStr} ${timeStr}`; // Show date and time
          })(),
          title: (() => {
            if (!order.soDate) return "-";

            const date = new Date(order.soDate);
            if (isNaN(date.getTime())) return "-"; // Handle invalid date

            const hours = date.getHours();
            const minutes = date.getMinutes();

            // Always show the date
            const dateStr = date.toLocaleString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            });

            // Show time only if after 5:30 AM
            if (hours < 5 || (hours === 5 && minutes <= 30)) {
              return dateStr; // Show only date
            }

            const timeStr = date.toLocaleString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            });

            return `${dateStr} ${timeStr}`; // Show date and time
          })(),
        },
        {
          width: columnWidths[3],
          content: order.financialYear || "-",
          title: order.financialYear || "-",
        },
        {
          width: columnWidths[4],
          content: normalizeTableText(order.customername) || "-",
          title: normalizeTableText(order.customername) || "-",
          className: "customer-name-cell",
        },
        {
          width: columnWidths[5],
          content: order.name || "-",
          title: order.name || "-",
          className: "contact-person-name",
        },
        {
          width: columnWidths[6],
          content: order.contactNo || "-",
          title: order.contactNo || "-",
        },

        {
          width: columnWidths[10],
          content: order.customerEmail || "-",
          title: order.customerEmail || "-",
        },
        {
          width: columnWidths[8],
          content: (
            <Badge
              bg={
                order.sostatus === "Pending for Approval"
                  ? "warning"
                  : order.sostatus === "Accounts Approved"
                    ? "info"
                    : order.sostatus === "Approved"
                      ? "success"
                      : order.sostatus === "On Hold Due to Low Price"
                        ? "dark"
                        : order.sostatus === "Order Cancelled"
                          ? "danger"
                          : "secondary"
              }
            >
              {order.sostatus === "Order on Hold Due to Low Price" ? "On Hold" : order.sostatus || "-"}
            </Badge>

          ),
          title: order.sostatus === "Order on Hold Due to Low Price" ? "On Hold" : order.sostatus || "-",
        },
        {
          width: columnWidths[9],
          content: (
            <div className="actions-cell">
              <Button
                variant="primary"
                onClick={() => handleViewClick(order)}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  padding: "0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "50px",
                }}
              >
                <FaEye />
              </Button>
              {(userRole === "GlobalAdmin" || userRole === "SuperAdmin" ||
                (userRole === "Admin" &&
                  order.sostatus !== "Approved" &&
                  order.sostatus !== "Accounts Approved") ||
                (userRole === "salesperson" &&
                  order.sostatus !== "Approved" &&
                  order.sostatus !== "Accounts Approved")) && (

                  <button
                    className="editBtn"
                    onClick={() => handleEditClick(order)}
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
                      zIndex: "1",
                      marginBottom: "50px",
                    }}
                  >
                    <svg height="1em" viewBox="0 0 512 512" fill="#ffffff">
                      <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z" />
                    </svg>
                  </button>
                )}

              {(userRole === "GlobalAdmin" || userRole === "SuperAdmin") && (
                <button
                  className="bin-button"
                  onClick={() => handleDeleteClick(order)}
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
                    marginBottom: "50px",
                  }}
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
          ),
          title: "",
        },
        {
          width: columnWidths[7],
          content: order.alterno || "-",
          title: order.alterno || "-",
        },

        {
          width: columnWidths[11],
          content: order.city || "-",
          title: order.city || "-",
        },
        {
          width: columnWidths[12],
          content: order.state || "-",
          title: order.state || "-",
        },
        {
          width: columnWidths[13],
          content: order.pinCode || "-",
          title: order.pinCode || "-",
        },
        {
          width: columnWidths[14],
          content: order.gstno || "-",
          title: order.gstno || "-",
        },
        {
          width: columnWidths[15],
          content: order.shippingAddress || "-",
          title: order.shippingAddress || "-",
        },
        {
          width: columnWidths[16],
          content: order.billingAddress || "-",
          title: order.billingAddress || "-",
        },
        {
          width: columnWidths[17],
          content: productDetails,
          title: productDetails,
        },
        {
          width: columnWidths[18],
          content: firstProduct.productType || "-",
          title: firstProduct.productType || "-",
        },
        {
          width: columnWidths[19],
          content: firstProduct.size || "-",
          title: firstProduct.size || "-",
        },
        {
          width: columnWidths[20],
          content: firstProduct.spec || "-",
          title: firstProduct.spec || "-",
        },
        {
          width: columnWidths[21],
          content: totalQty || "-",
          title: totalQty || "-",
        },
        {
          width: columnWidths[22],
          content: `₹${totalUnitPrice.toFixed(2) || "0.00"}`,
          title: `₹${totalUnitPrice.toFixed(2) || "0.00"}`,
        },
        {
          width: columnWidths[23],
          content: `${gstValues}%`,
          title: gstValues,
        },
        {
          width: columnWidths[24],
          content: firstProduct.brand || "-",
          title: firstProduct.brand || "-",
        },
        {
          width: columnWidths[25],
          content: firstProduct.warranty || "-",
          title: firstProduct.warranty || "-",
        },
        {
          width: columnWidths[26],
          content: `₹${order.total?.toFixed(2) || "0.00"}`,
          title: `₹${order.total?.toFixed(2) || "0.00"}`,
        },
        {
          width: columnWidths[27],
          content: order.paymentCollected ? `₹${order.paymentCollected}` : "-",
          title: order.paymentCollected ? `₹${order.paymentCollected}` : "-",
        },
        {
          width: columnWidths[28],
          content: order.paymentMethod || "-",
          title: order.paymentMethod || "-",
        },
        {
          width: columnWidths[29],
          content: order.paymentDue ? `₹${order.paymentDue}` : "-",
          title: order.paymentDue ? `₹${order.paymentDue}` : "-",
        },
        {
          width: columnWidths[30],
          content: order.paymentTerms || "-",
          title: order.paymentTerms || "-",
        },
        {
          width: columnWidths[31],
          content: order.creditDays || "-",
          title: order.creditDays || "-",
        },
        {
          width: columnWidths[32],
          content: (
            <Badge
              bg={order.paymentReceived === "Received" ? "success" : "warning"}
            >
              {order.paymentReceived || "-"}
            </Badge>
          ),
          title: order.paymentReceived || "-",
        },
        {
          width: columnWidths[33],
          content: order.freightcs ? `₹${order.freightcs}` : "-",
          title: order.freightcs ? `₹${order.freightcs}` : "-",
        },
        {
          width: columnWidths[34],
          content: order.freightstatus || "-",
          title: order.freightstatus || "-",
        },
        {
          width: columnWidths[35],
          content: order.actualFreight
            ? `₹${order.actualFreight}`
            : "-",
          title: order.actualFreight
            ? `₹${order.actualFreight}`
            : "-",
        },
        {
          width: columnWidths[36],
          content: order.installchargesstatus || "-",
          title: order.installchargesstatus || "-",
        },
        {
          width: columnWidths[37],
          content: order.installation ? `₹${order.installation}` : "-",
          title: order.installation ? `₹${order.installation}` : "-",
        },
        {
          width: columnWidths[38],
          content: (
            <Badge
              bg={
                order.installationStatus === "Pending"
                  ? "warning" // Yellow for Pending
                  : order.installationStatus === "In Progress"
                    ? "info" // Light blue for In Progress
                    : order.installationStatus === "Completed"
                      ? "success" // Green for Completed
                      : order.installationStatus === "Failed"
                        ? "danger" // Red for Failed
                        : order.installationStatus === "Hold by Salesperson"
                          ? "primary" // Blue for Hold by Salesperson
                          : order.installationStatus === "Hold by Customer"
                            ? "dark" // Dark gray for Hold by Customer
                            : order.installationStatus === "Site Not Ready"
                              ? "light" // Light gray for Site Not Ready
                              : "secondary" // Default gray
              }
            >
              {order.installationStatus || "-"}
            </Badge>
          ),
          title: order.installationStatus || "-",
        },
        {
          width: columnWidths[39],
          content: order.transporter || "-",
          title: order.transporter || "-",
        },
        {
          width: columnWidths[40],
          content: order.transporterDetails || "-",
          title: order.transporterDetails || "-",
        },
        {
          width: columnWidths[41],
          content: order.dispatchFrom || "-",
          title: order.dispatchFrom || "-",
        },
        {
          width: columnWidths[42],
          content: order.dispatchDate
            ? new Date(order.dispatchDate).toLocaleDateString("en-GB")
            : "-",
          title: order.dispatchDate
            ? new Date(order.dispatchDate).toLocaleDateString("en-GB")
            : "-",
        },
        {
          width: columnWidths[43],
          content: (
            <Badge
              bg={
                order.dispatchStatus === "Not Dispatched"
                  ? "warning" // Yellow for Not Dispatched
                  : order.dispatchStatus === "Docket Awaited Dispatched"
                    ? "info"
                    : order.dispatchStatus === "Dispatched"
                      ? "primary" // Blue for Dispatched
                      : order.dispatchStatus === "Delivered"
                        ? "success" // Green for Delivered
                        : order.dispatchStatus === "Hold by Salesperson"
                          ? "dark" // Dark gray for Hold by Salesperson
                          : order.dispatchStatus === "Hold by Customer"
                            ? "light" // Light gray for Hold by Customer
                            : order.dispatchStatus === "Order Cancelled"
                              ? "danger" // Red for Order Cancelled
                              : "secondary" // Default gray
              }
            >
              {order.dispatchStatus === "Not Dispatched" ? "Pending Dispatched" : order.dispatchStatus || "-"}
            </Badge>
          ),
          title: order.dispatchStatus === "Not Dispatched" ? "Pending Dispatched" : order.dispatchStatus || "-",
        },
        {
          width: columnWidths[44],
          content: order.orderType === "Stock Out" ? "Stock" : order.orderType || "-",
          title: order.orderType === "Stock Out" ? "Stock" : order.orderType || "-",
        },
        {
          width: columnWidths[45],
          content: order.report || "-",
          title: order.report || "-",
        },
        {
          width: columnWidths[46],
          content: (
            <Badge
              bg={
                order.stockStatus === "In Stock"
                  ? "success"
                  : order.stockStatus === "Not in Stock"
                    ? "danger"
                    : "secondary"
              }
            >
              {order.stockStatus || "-"}
            </Badge>
          ),
          title: order.stockStatus || "-",
        },
        {
          width: columnWidths[47],
          content: (
            <Badge
              bg={
                order.billStatus === "Pending"
                  ? "warning"
                  : order.billStatus === "Under Billing"
                    ? "info"
                    : order.billStatus === "Billing Complete"
                      ? "success"
                      : "secondary"
              }
            >
              {order.billStatus || "-"}
            </Badge>
          ),
          title: order.billStatus || "-",
        },
        {
          width: columnWidths[48],
          content: (
            <Badge
              style={{
                background:
                  order.fulfillingStatus === "Under Process"
                    ? "linear-gradient(135deg, #f39c12, #f7c200)"
                    : order.fulfillingStatus === "Pending"
                      ? "linear-gradient(135deg, #ff6b6b, #ff8787)"
                      : order.fulfillingStatus === "Partial Dispatch"
                        ? "linear-gradient(135deg, #00c6ff, #0072ff)"
                        : order.fulfillingStatus === "Fulfilled"
                          ? "linear-gradient(135deg, #28a745, #4cd964)"
                          : "linear-gradient(135deg, #6c757d, #a9a9a9)",
              }}
            >
              {order.fulfillingStatus || "Pending"}
            </Badge>
          ),
          title: order.fulfillingStatus || "Pending",
        },
        {
          width: columnWidths[49],
          content: (
            <Badge
              bg={
                order.installationReport === "Yes"
                  ? "success"
                  : order.installationReport === "Installed"
                    ? "info"
                    : order.installationReport === "No"
                      ? "warning"
                      : "secondary"
              }
            >
              {order.installationReport || "No"}
            </Badge>
          ),
          title: order.installationReport || "No",
        },
        {
          width: columnWidths[50],
          content: (
            <Badge
              bg={
                order.stamp === "Received"
                  ? "success"
                  : order.stamp === "Not Received"
                    ? "warning"
                    : "secondary"
              }
            >
              {order.stamp || "Not Received"}
            </Badge>
          ),
          title: order.stamp || "Not Received",
        },
        {
          width: columnWidths[51],
          content: (
            <Badge bg={order.stampReport ? "success" : "danger"}>
              {order.stampReport ? "Attached" : "Not Attached"}
            </Badge>
          ),
          title: order.stampReport ? "Attached" : "Not Attached",
        },
        {
          width: columnWidths[52],
          content: order.billNumber || "-",
          title: order.billNumber || "-",
        },
        {
          width: columnWidths[53],
          content: order.piNumber || "-",
          title: order.piNumber || "-",
        },
        {
          width: columnWidths[54],
          content: order.salesPerson || "-",
          title: order.salesPerson || "-",
        },
        {
          width: columnWidths[55],
          content: order.company || "-",
          title: order.company || "-",
        },
        {
          width: columnWidths[56],
          content:
            order.createdBy && typeof order.createdBy === "object"
              ? order.createdBy.username || "Unknown"
              : typeof order.createdBy === "string"
                ? order.createdBy
                : "-",
          title:
            order.createdBy && typeof order.createdBy === "object"
              ? order.createdBy.username || "Unknown"
              : typeof order.createdBy === "string"
                ? order.createdBy
                : "-",
        },
       
      ].map((cell, idx) => (
        <td
          key={idx}
          className={cell.className || ""}
          style={{
            width: `${cell.width}px`,
            minWidth: `${cell.width}px`,
            maxWidth: `${cell.width}px`,
          }}
          title={cell.title}
        >
          {cell.content}
        </td>
      ))}
    </tr>
  );
});

const Sales = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [allOrdersCount, setAllOrdersCount] = useState(0); // persists when other trackers selected
  const [totalProductQty, setTotalProductQty] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [salesPersonFilter, setSalesPersonFilter] = useState("All");
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("All");
  const [dispatchFromFilter, setDispatchFromFilter] = useState("All");
  const [orderTypeFilter, setOrderTypeFilter] = useState("All");
  const [dispatchFilter, setDispatchFilter] = useState("All");
  const [financialYearFilter, setFinancialYearFilter] = useState(() => getCurrentFinancialYear());
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [dashboardCounts, setDashboardCounts] = useState({
    totalOrders: 0,
    installation: 0,
    production: 0,
    dispatch: 0,
  });
  const [trackerFilter, setTrackerFilter] = useState("all");
  // TeamBuilder: Controls open/close state of the TeamBuilder modal
  const [isTeamBuilderOpen, setIsTeamBuilderOpen] = useState(false);
  const userRole = localStorage.getItem("role");
  // TeamBuilder: Logged-in user's ID, passed to TeamBuilder for ownership checks
  const userId = localStorage.getItem("userId");
  const [loading, setLoading] = useState(false);

  // Unique Sales Persons State (populated from full dataset)
  const [uniqueSalesPersons, setUniqueSalesPersons] = useState(["All"]);

  // Fetch full list of orders once to populate filters
  useEffect(() => {
    const fetchAllOrdersForFilter = async () => {
      try {
        const response = await soApi.get(
          `/api/get-orders`
        );

        let allData = [];
        if (Array.isArray(response.data)) {
          allData = response.data;
        } else if (response.data && Array.isArray(response.data.data)) {
          allData = response.data.data;
        } else {
          console.warn("Unexpected response format for get-orders:", response.data);
        }

        // Extract unique sales persons
        const salesPersons = allData
          .map((order) => {
            // Handle case where createdBy is explicitly null or missing
            if (!order.createdBy) return "Sales Order Team";
            // Handle case where createdBy is populated (object)
            if (typeof order.createdBy === 'object' && order.createdBy.username) {
              return order.createdBy.username.trim();
            }
            // Handle case where createdBy might be just an ID string (unlikely with populate)
            if (typeof order.createdBy === 'string') {
              return "Unknown";
            }
            return "Sales Order Team";
          })
          .filter((salesPerson) => salesPerson && salesPerson.trim() !== "");

        const unique = Array.from(new Set(salesPersons));
        unique.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

        setUniqueSalesPersons(["All", ...unique]);
      } catch (error) {
        console.error("Error fetching all orders for filter:", error);
      }
    };

    fetchAllOrdersForFilter();
  }, []); // Run once on mount

  // Debounced search handler
  const debouncedSetSearchTerm = useMemo(
    () => debounce((value) => setSearchTerm(value), 300),
    []
  );

  // Debounced page change handler to fix pagination glitch
  const handlePageChange = useMemo(
    () => debounce((event, value) => setCurrentPage(value), 300),
    []
  );

  // Fetch orders with pagination
  const fetchOrders = useCallback(async (params = {}) => {
    try {
      setLoading(true);

      const {
        page = 1,
        search = "",
        approval = "All",
        orderType = "All",
        dispatch = "All",
        salesPerson = "All",
        dispatchFrom = "All",
        financialYear = "All",
        startDate = null,
        endDate = null,
        dashboardFilter = "all",
      } = params;

      const queryParams = {
        page,
        limit: 20,
      };

      // Only add filters if they're not "All" or empty
      if (search && search.trim() !== "") queryParams.search = search.trim();
      if (approval && approval !== "All") queryParams.approval = approval;
      if (orderType && orderType !== "All") queryParams.orderType = orderType;
      if (dispatch && dispatch !== "All") queryParams.dispatch = dispatch;
      if (salesPerson && salesPerson !== "All") queryParams.salesPerson = salesPerson;
      if (dispatchFrom && dispatchFrom !== "All") queryParams.dispatchFrom = dispatchFrom;
      if (financialYear && financialYear !== "All") queryParams.financialYear = financialYear;
      if (dashboardFilter && dashboardFilter !== "all") queryParams.dashboardFilter = dashboardFilter;
      if (startDate) queryParams.startDate = startDate.toISOString();
      if (endDate) queryParams.endDate = endDate.toISOString();

      const response = await soApi.get(
        `/api/get-orders-paginated`,
        {
          params: queryParams,
        }
      );

      const {
        data,
        total,
        page: currentPageRes,
        pages,
        totalProductQty,
      } = response.data;

      setOrders(data);
      setFilteredOrders(data);
      setTotalOrders(total);
      // Only update All Orders count when viewing all orders (not filtered by tracker)
      if (!queryParams.dashboardFilter || queryParams.dashboardFilter === "all") {
        setAllOrdersCount(total);
      }
      setTotalPages(pages);
      setTotalProductQty(totalProductQty || 0);
      setCurrentPage(currentPageRes);
    } catch (error) {
      console.error("Error fetching orders:", error);

      const friendlyMessage = !navigator.onLine
        ? "No internet connection. Please check your network."
        : error.response?.status >= 500
          ? "Server is temporarily unavailable. Please try again later."
          : "Unable to load orders. Please try again.";

      toast.error(friendlyMessage, { position: "top-right", autoClose: 5000 });
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch dashboard counts — "All Orders" filtered by current financial year
  const fetchDashboardCounts = useCallback(async (fy) => {
    try {
      const financialYear = fy ?? financialYearFilter;
      const response = await soApi.get(
        `/api/dashboard-counts`,
        { params: financialYear && financialYear !== "All" ? { financialYear } : {} }
      );
      setDashboardCounts(
        response.data || { totalOrders: 0, installation: 0, production: 0, dispatch: 0 }
      );
    } catch (error) {
      console.error("Error fetching dashboard counts:", error);
      toast.error("Failed to fetch dashboard counts!");
    }
  }, [financialYearFilter]);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await soApi.get(
        `/api/notifications`
      );
      setNotifications(response.data.data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Failed to fetch notifications!");
    }
  }, []);

  // Mark all notifications as read
  const markAllRead = useCallback(async () => {
    try {
      await soApi.post(
        `/api/mark-read`,
        {}
      );
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true }))
      );
      toast.success("All notifications marked as read!");
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      toast.error("Failed to mark notifications as read!");
    }
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(async () => {
    try {
      await soApi.delete(`/api/clear`);
      setNotifications([]);
      toast.success("All notifications cleared!");
    } catch (error) {
      console.error("Error clearing notifications:", error);
      toast.error("Failed to clear notifications!");
    }
  }, []);

  // WebSocket setup + initial data load
  useEffect(() => {
    const baseOrigin = (() => {
      try {
        return new URL(process.env.REACT_APP_SO_URL).origin;
      } catch {
        return process.env.REACT_APP_SO_URL;
      }
    })();

    const socket = io(baseOrigin, {
      path: "/sales/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      withCredentials: true,
      auth: { token: getPortalAccessToken() },
    });

    socket.on("connect", () => {
      console.log(`[SO Socket] Client connected — socketId=${socket.id} userId=${userId} username=${userRole}`);
      socket.emit("join", { userId, role: userRole });
    });

    socket.on("connect_error", (error) => {
      console.error("Socket.IO connection error:", error);
    });

    socket.on("disconnect", (reason) => {
      console.log(`[SO Socket] Client disconnected — socketId=${socket.id} userId=${userId} reason=${reason}`);
    });

    socket.on("deleteOrder", ({ _id, createdBy, assignedTo }) => {
      const currentUserId = userId;
      const owners = [createdBy, assignedTo].filter(Boolean);
      if (!owners.includes(currentUserId)) return;
      setOrders((prev) => prev.filter((o) => o._id !== _id));
      fetchDashboardCounts();
    });

    socket.on("notification", (notif) => {
      setNotifications((prev) => {
        if (notif?._id && prev.some((n) => n._id === notif._id)) return prev;
        const next = [notif, ...prev].slice(0, 50);
        return next;
      });
      if (notif?.message) {
        const toastMsg = notif.changes && notif.changes.length > 0
          ? `Order ${notif.orderId || ""}: ${notif.changes[0].label} changed to ${notif.changes[0].newValue}`
          : notif.message;
        toast.info(toastMsg, { autoClose: 4000 });
      }
    });

    socket.on(
      "orderUpdate",
      ({ operationType, documentId, fullDocument, createdBy, assignedTo }) => {
        const currentUserId = userId;
        const isAdmin = userRole === "GlobalAdmin" || userRole === "SuperAdmin" || userRole === "Watch";
        const owners = [createdBy, assignedTo].filter(Boolean);

        // Admins see everything, others see only owned/assigned
        if (!isAdmin && !owners.includes(currentUserId)) return;

        // Normalize createdBy when backend sends only an id (change stream)
        try {
          const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
          const localId = String(localStorage.getItem("userId") || "");
          if (
            fullDocument &&
            fullDocument.createdBy &&
            typeof fullDocument.createdBy !== "object" &&
            String(fullDocument.createdBy) === localId
          ) {
            fullDocument = {
              ...fullDocument,
              createdBy: { _id: localId, username: currentUser.username || currentUser.name || "You" },
            };
          }
        } catch (e) {
          // ignore
        }

        if (operationType === "insert" && fullDocument) {
          setOrders((prev) => {
            if (prev.some((o) => o._id === documentId)) return prev;
            return [fullDocument, ...prev];
          });
        }
        fetchDashboardCounts();
      }
    );

    (async () => {
      try {
        setLoading(true);
        const initFY = getCurrentFinancialYear();
        await Promise.all([
          fetchOrders({
            page: 1,
            financialYear: initFY,
            dashboardFilter: "all",
          }),
          fetchNotifications(),
          fetchDashboardCounts(initFY),
        ]);
      } catch (e) {
        // errors handled elsewhere
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      socket.off("connect");
      socket.off("connect_error");
      socket.off("notification");
      socket.off("orderUpdate");
      socket.off("deleteOrder");
      socket.disconnect();
    };
  }, [fetchOrders, fetchNotifications, userRole, userId, fetchDashboardCounts]);

  // Ref to skip filter effect on first render (mount effect already fetches with correct FY)
  const filterEffectMounted = React.useRef(false);

  // Removed client-side filtering logic in favor of server-side pagination.

  useEffect(() => {
    // Skip on first render — mount effect already fetched with correct initial params
    if (!filterEffectMounted.current) {
      filterEffectMounted.current = true;
      return;
    }
    
    // Reset to page 1 when any filter changes
    setCurrentPage(1);
    
    // Fetch with updated filters - always pass financialYear regardless of trackerFilter
    fetchOrders({
      page: 1,
      search: searchTerm,
      approval: approvalFilter,
      orderType: orderTypeFilter,
      dispatch: dispatchFilter,
      salesPerson: salesPersonFilter,
      dispatchFrom: dispatchFromFilter,
      financialYear: financialYearFilter, // Always use the selected financial year
      startDate,
      endDate,
      dashboardFilter: trackerFilter,
    });
    
    // Update dashboard counts with current financial year
    fetchDashboardCounts(financialYearFilter);
  }, [
    searchTerm,
    approvalFilter,
    orderTypeFilter,
    dispatchFilter,
    salesPersonFilter,
    dispatchFromFilter,
    financialYearFilter,
    startDate,
    endDate,
    trackerFilter,
    fetchOrders,
    fetchDashboardCounts,
  ]);

  useEffect(() => {
    // Only fetch when page changes (not on initial mount or filter changes)
    if (filterEffectMounted.current && currentPage !== 1) {
      fetchOrders({
        page: currentPage,
        search: searchTerm,
        approval: approvalFilter,
        orderType: orderTypeFilter,
        dispatch: dispatchFilter,
        salesPerson: salesPersonFilter,
        dispatchFrom: dispatchFromFilter,
        financialYear: financialYearFilter, // Always use the selected financial year
        startDate,
        endDate,
        dashboardFilter: trackerFilter,
      });
    }
  }, [currentPage]); // Only trigger on page change

  // NOTE: The above two effects might cause double invocation on filter change if page != 1.
  // Optimization: use a ref or single effect with internal previous state check.
  // But given "Zero Regression" on stability, simpler is better.
  // Actually, the first effect logic:
  // If filter changes:
  //   If page != 1: setPage(1). This updates state. Component renders. Second effect [currentPage] runs. Fetches page 1. Correct.
  //   If page == 1: setPage(1) does nothing. Else branch runs. Fetches page 1. Correct.
  // Double fetch risk?
  // Filter change -> setPage(1). Render. Effect 2 runs.
  // Is Effect 1 (Else) running? No.
  // So NO double fetch.
  // BUT Effect 2 runs on `[currentPage]`. If I change filter, `currentPage` doesn't change (if 1).
  // I need Effect 2 to depend on Filters too?
  // No, if Effect 2 depends on Filters, it runs on filter change.
  // If I have Effect 2 depend on Filters AND Page.
  // Filter Change -> Effect 2 runs. Fetches.
  // I also want to reset Page to 1.
  // If I setPage(1) in Effect 1...

  // Let's Simplify:
  // One Effect.
  // Inside: Check if Filters changed since last run?
  // Or just accept that we need to manually reset Page to 1 when filters change?
  // I can't easily hook into "setSearchTerm" from here.

  // Let's stick to the 2-effect logic structure which covers both cases, but carefully.
  // Refined Logic:
  // Effect 1: [currentPage]. Runs when page changes. Calls fetch.
  // Effect 2: [filters]. Runs when filters change. Sets page = 1.
  //    Problem: If page WAS 1, setPage(1) does not trigger Effect 1.
  //    Solution: In Effect 2: if (page===1) fetch() else setPage(1).



  // Event handlers
  const handleReset = useCallback(() => {
    setSearchTerm("");
    setStartDate(null);
    setSalesPersonFilter("All");
    setEndDate(null);
    setDispatchFromFilter("All");
    setApprovalFilter("All");
    setOrderTypeFilter("All");
    setDispatchFilter("All");
    setFinancialYearFilter(getCurrentFinancialYear());
    setTrackerFilter("all");

    toast.info("Filters reset!");
  }, []);

  const handleAddEntry = useCallback(
    async (newEntry) => {
      setIsAddModalOpen(false);
      await fetchOrders();
      fetchDashboardCounts(); // Refresh counts after add
    },
    [fetchOrders, fetchDashboardCounts]
  );

  const handleViewClick = useCallback((order) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
  }, []);

  const handleEditClick = useCallback((order) => {
    setSelectedOrder(order);
    setIsEditModalOpen(true);
  }, []);

  const handleDeleteClick = useCallback((order) => {
    setSelectedOrder(order);
    setIsDeleteModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    (deletedIds) => {
      setOrders((prev) => {
        return prev.filter((order) => !deletedIds.includes(order._id));
      });
      setFilteredOrders((prev) => {
        return prev.filter((order) => !deletedIds.includes(order._id));
      });
      fetchDashboardCounts(); // Refresh counts after delete
      setIsDeleteModalOpen(false);

    },
    [
      fetchDashboardCounts,
    ]
  );

  const handleEntryUpdated = useCallback(
    (updatedEntry) => {
      // Hinglish: Duplicate API call avoid - EditEntry already server pe update kar chuka hota hai
      // yahan sirf local state update karenge
      setOrders((prev) => {
        return prev.map((order) =>
          order._id === updatedEntry._id ? updatedEntry : order
        );
      });
      setFilteredOrders((prev) => {
        return prev.map((order) =>
          order._id === updatedEntry._id ? updatedEntry : order
        );
      });
      fetchDashboardCounts(); // Refresh counts after update
      setIsEditModalOpen(false);
      // Toast socket 'notification' se aayega (no duplicates)
    },
    [
      fetchDashboardCounts,
    ]
  );




  const parseExcelDate = useCallback((dateValue) => {
    if (!dateValue) return "";
    if (typeof dateValue === "number") {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(
        excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000
      );
      return isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
    }
    const date = new Date(String(dateValue).trim());
    return isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  }, []);

  const handleFileUpload = useCallback(
    async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        // readExcelFile returns array of objects keyed by header row
        const rawRows = await readExcelFile(file);

        // Normalise keys to match the original header-mapping logic
        const parsedData = rawRows.map((row) => {
          const entry = {};
          Object.entries(row).forEach(([k, v]) => {
            const normKey = k
              ? k.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "")
              : "";
            entry[normKey] = v !== null && v !== undefined ? String(v) : "";
          });
          return entry;
        });

        const newEntries = parsedData.map((entry) => {

            let products = [];
            if (entry.products) {
              try {
                products = JSON.parse(entry.products);
                if (!Array.isArray(products)) {
                  products = [products];
                }
              } catch {
                products = [
                  {
                    productType: String(entry.producttype || "Unknown").trim(),
                    size: String(entry.size || "N/A").trim(),
                    spec: String(entry.spec || "N/A").trim(),
                    qty: Number(entry.qty) || 1,
                    unitPrice: Number(entry.unitprice) || 0,
                    serialNos: entry.serialnos
                      ? String(entry.serialnos)
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                      : [],
                    modelNos: entry.modelnos
                      ? String(entry.modelnos)
                        .split(",")
                        .map((m) => m.trim())
                        .filter(Boolean)
                      : [],
                    gst: String(entry.gst || "18").trim(),
                  },
                ];
              }
            } else {
              products = [
                {
                  productType: String(entry.producttype || "Unknown").trim(),
                  size: String(entry.size || "N/A").trim(),
                  spec: String(entry.spec || "N/A").trim(),
                  qty: Number(entry.qty) || 1,
                  unitPrice: Number(entry.unitprice) || 0,
                  serialNos: entry.serialnos
                    ? String(entry.serialnos)
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                    : [],
                  modelNos: entry.modelnos
                    ? String(entry.modelnos)
                      .split(",")
                      .map((m) => m.trim())
                      .filter(Boolean)
                    : [],
                  gst: String(entry.gst || "18").trim(),
                },
              ];
            }

            return {
              soDate:
                parseExcelDate(entry.sodate) ||
                new Date().toISOString().slice(0, 10),
              dispatchFrom: String(entry.dispatchfrom || "").trim(),
              dispatchDate: parseExcelDate(entry.dispatchdate) || "",
              name: String(entry.name || "").trim(),
              city: String(entry.city || "").trim(),
              state: String(entry.state || "").trim(),
              pinCode: String(entry.pincode || "").trim(),
              contactNo: String(entry.contactno || "").trim(),
              customerEmail: String(entry.customeremail || "").trim(),
              customername: String(entry.customername || "").trim(),
              products,
              total: Number(entry.total) || 0,
              paymentCollected: String(entry.paymentcollected || "").trim(),
              paymentMethod: String(entry.paymentmethod || "").trim(),
              paymentDue: String(entry.paymentdue || "").trim(),
              paymentTerms: String(entry.paymentterms || "").trim(),
              creditDays: String(entry.creditdays || "").trim(),
              neftTransactionId: String(entry.nefttransactionid || "").trim(),
              chequeId: String(entry.chequeid || "").trim(),
              freightcs: String(entry.freightcs || "").trim(),
              freightstatus: String(entry.freightstatus || "Extra").trim(),
              installchargesstatus: String(
                entry.installchargesstatus || "Extra"
              ).trim(),
              orderType: String(entry.ordertype || "B2C").trim(),
              gemOrderNumber: String(entry.gemordernumber || "").trim(),
              deliveryDate: parseExcelDate(entry.deliverydate) || "",
              installation: String(entry.installation || "").trim(),
              installationStatus: String(
                entry.installationstatus || "Pending"
              ).trim(),
              remarksByInstallation: String(
                entry.remarksbyinstallation || ""
              ).trim(),
              dispatchStatus: String(
                entry.dispatchstatus || "Not Dispatched"
              ).trim(),
              salesPerson: String(entry.salesperson || "").trim(),
              report: String(entry.report || "").trim(),
              company: String(entry.company || "Promark").trim(),
              transporter: String(entry.transporter || "").trim(),
              transporterDetails: String(entry.transporterdetails || "").trim(),
              docketNo: String(entry.docketno || "").trim(),
              receiptDate: parseExcelDate(entry.receiptdate) || "",
              shippingAddress: String(entry.shippingaddress || "").trim(),
              billingAddress: String(entry.billingaddress || "").trim(),
              invoiceNo: String(entry.invoiceno || "").trim(),
              invoiceDate: parseExcelDate(entry.invoicedate) || "",
              fulfillingStatus: String(
                entry.fulfillingstatus || "Pending"
              ).trim(),
              remarksByProduction: String(
                entry.remarksbyproduction || ""
              ).trim(),
              remarksByAccounts: String(entry.remarksbyaccounts || "").trim(),
              paymentReceived: String(
                entry.paymentreceived || "Not Received"
              ).trim(),
              billNumber: String(entry.billnumber || "").trim(),
              piNumber: String(entry.pinumber || "").trim(),
              remarksByBilling: String(entry.remarksbybilling || "").trim(),
              verificationRemarks: String(
                entry.verificationremarks || ""
              ).trim(),
              billStatus: String(entry.billstatus || "Pending").trim(),
              completionStatus: String(
                entry.completionstatus || "In Progress"
              ).trim(),
              fulfillmentDate: parseExcelDate(entry.fulfillmentdate) || "",
              remarks: String(entry.remarks || "").trim(),
              sostatus: String(entry.sostatus || "Pending for Approval").trim(),
              gstno: String(entry.gstno || "").trim(),
            };
          });

          const response = await soApi.post(
            `/api/bulk-orders`,
            newEntries,
            {
              headers: { "Content-Type": "application/json" },
            }
          );

          await fetchOrders(); // Reload orders to reflect bulk upload properly (safest for pagination)
          /*
          setOrders((prev) => {
            const updatedOrders = [...prev, ...response.data.data];
             // we removed filterOrders, so just return
             return updatedOrders;
          });
          */
          fetchDashboardCounts(); // Refresh counts after bulk upload
          toast.success(
            `Successfully uploaded ${response.data.data.length} orders!`
          );
        } catch (error) {
          console.error("Error uploading entries:", error);

          let friendlyMessage =
            "Sorry, we couldn't upload your data. Please check your file and try again.";

          if (error.response?.data?.details) {
            friendlyMessage =
              "Please fix the following issues in your file: " +
              error.response.data.details.join(", ");
          } else if (error.response?.data?.message) {
            friendlyMessage = error.response.data.message;
          }

          toast.error(friendlyMessage, {
            position: "top-right",
            autoClose: 7000,
          });
        }
    },
    [
      parseExcelDate,
      fetchOrders,
      fetchDashboardCounts,
    ]
  );

  const handleExport = useCallback(() => {
    const downloadFile = async () => {
      try {
        const response = await soApi.get(
          `/api/export`,
          {
            params: {
              search: searchTerm,
              approval: approvalFilter,
              orderType: orderTypeFilter,
              dispatch: dispatchFilter,
              salesPerson: salesPersonFilter,
      dispatchFrom: dispatchFromFilter,
      financialYear: financialYearFilter,
      startDate: startDate ? startDate.toISOString() : undefined,
      endDate: endDate ? endDate.toISOString() : undefined,
      dashboardFilter: trackerFilter,
            },
            responseType: "blob",
          }
        );

        // Create blob link to download (response.data is already a blob with responseType: "blob")
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `orders_${new Date().toISOString().slice(0, 10)}.xlsx`
        );
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success("Orders exported successfully!");
      } catch (error) {
        console.error("Error downloading export:", error);
        toast.error("Failed to export orders.");
      }
    };
    downloadFile();
  }, [
    searchTerm,
    approvalFilter,
    orderTypeFilter,
    dispatchFilter,
    salesPersonFilter,
    dispatchFromFilter,
    financialYearFilter,
    startDate,
    endDate,
    trackerFilter,
  ]);

  const isOrderComplete = useCallback((order) => {
    // Helper to check if a value is "empty"
    const isEmpty = (val) =>
      val === undefined ||
      val === null ||
      (typeof val === "string" && val.trim() === "");

    // 1. Core Sales Validation
    const coreFields = [
      "orderId",
      "soDate",
      "customername",
      "contactNo",
      "salesPerson",
      "company",
      "orderType",
    ];
    const isCoreValid = coreFields.every((f) => !isEmpty(order[f]));

    // Products Validation
    const isProductsValid =
      Array.isArray(order.products) &&
      order.products.length > 0 &&
      order.products.every(
        (p) =>
          !isEmpty(p.productType) &&
          p.qty !== undefined &&
          p.qty > 0 &&
          p.unitPrice !== undefined &&
          p.unitPrice >= 0 &&
          !isEmpty(p.size) &&
          !isEmpty(p.spec) &&
          !isEmpty(p.gst)
      );

    // 2. Location & Contact Validation
    const locationFields = [
      "shippingAddress",
      "billingAddress",
      "city",
      "state",
      "pinCode",
    ];
    const isLocationValid = locationFields.every((f) => !isEmpty(order[f]));

    // 3. Accounts Validation
    // Bill must be complete and Payment must be received
    const isAccountsValid =
      (order.billStatus === "Billing Complete" ||
        order.billStatus?.toLowerCase() === "billing complete") &&
      !isEmpty(order.billNumber || order.invoiceNo) &&
      (order.paymentReceived === "Received" ||
        order.paymentReceived?.toLowerCase() === "received") &&
      !isEmpty(order.paymentMethod) &&
      !isEmpty(order.paymentCollected) &&
      Number(order.paymentCollected) > 0;

    // 4. Production Validation
    const isProductionValid =
      order.fulfillingStatus === "Fulfilled" ||
      order.fulfillingStatus?.toLowerCase() === "fulfilled";

    // 5. Dispatch Validation
    // Must be Delivered and have basic dispatch details
    const isDispatchValid =
      order.dispatchStatus === "Delivered" &&
      order.stamp === "Received" &&
      !isEmpty(order.dispatchFrom) &&
      !isEmpty(order.dispatchDate) &&
      !isEmpty(order.transporter) &&
      !isEmpty(order.actualFreight);


    // 6. Installation Validation
    // Only required if installation is NOT "No", "N/A" or empty
    let isInstallationValid = true;
    const installReq = order.installation;
    if (
      installReq &&
      installReq !== "No" &&
      installReq !== "N/A" &&
      installReq.trim() !== ""
    ) {
      isInstallationValid =
        (order.installationStatus === "Completed" ||
          order.installationStatus?.toLowerCase() === "completed") &&
        !isEmpty(order.installationeng);
      // NOTE: 'report' or 'installationReport' check can be added if strictly required
    }

    // Combined Check
    return (
      isCoreValid &&
      isProductsValid &&
      isLocationValid &&
      isAccountsValid &&
      isProductionValid &&
      isDispatchValid &&
      isInstallationValid
    );
  }, []);

  // billing completeness check removed (unused) to satisfy lint rules

  const formatTimestamp = useCallback((timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const renderTrackerCard = (
    title,
    count,
    icon,
    bgColor,
    filterKey,
    isActive = false
  ) => {
    const active = trackerFilter === filterKey || isActive;
    return (
      <TrackerCard
        onClick={() => {
          setTrackerFilter(filterKey);
          setCurrentPage(1); // Reset to first page when clicking tracker
        }}
        className={active ? "active" : ""}
        style={{
          background: bgColor,
        }}
      >
        <Card.Body>
          <div className="icon">{icon}</div>
          <div className="count">{count}</div>
          <div className="title">{title}</div>
        </Card.Body>
      </TrackerCard>
    );
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const notificationPopover = (
    <NotificationPopover id="notification-popover">
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #2575fc, #6a11cb)",
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.2rem" }}>🔔</span>
          <span style={{ color: "white", fontWeight: "700", fontSize: "1rem", letterSpacing: "0.3px" }}>Notifications</span>
          {unreadCount > 0 && (
            <span style={{
              background: "#ef4444",
              color: "white",
              borderRadius: "20px",
              padding: "1px 8px",
              fontSize: "0.72rem",
              fontWeight: "700",
              minWidth: "20px",
              textAlign: "center",
            }}>{unreadCount}</span>
          )}
        </div>
        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.75rem" }}>
          {notifications.length} total
        </span>
      </div>

      {/* Body */}
      <div style={{ maxHeight: "400px", overflowY: "auto" }}>
        {notifications.length > 0 ? (
          notifications.map((notif) => {
            const actionIcon = notif.action === "created" ? "✨" : notif.action === "deleted" ? "🗑️" : "✏️";
            const actionColor = notif.action === "created" ? "#22c55e" : notif.action === "deleted" ? "#ef4444" : "#2575fc";
            return (
              <NotificationItem key={notif._id} isRead={notif.isRead} action={notif.action}>
                <div style={{ flex: 1, paddingLeft: "8px" }}>
                  {/* Action badge + Order ID */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <span style={{
                      background: `${actionColor}18`,
                      color: actionColor,
                      borderRadius: "6px",
                      padding: "1px 7px",
                      fontSize: "0.7rem",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}>
                      {actionIcon} {notif.action || "updated"}
                    </span>
                    {notif.orderId && (
                      <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: "600" }}>
                        #{notif.orderId}
                      </span>
                    )}
                  </div>

                  {/* Main message — extract just the "who for whom" part */}
                  <NotificationText isRead={notif.isRead}>
                    {notif.message.split(" — ")[0]}
                  </NotificationText>

                  {/* Change pills */}
                  {notif.changes && notif.changes.length > 0 && (
                    <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "3px" }}>
                      {notif.changes.slice(0, 4).map((ch, idx) => (
                        <div key={idx} style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "0.75rem",
                          background: "#f8fafc",
                          borderRadius: "6px",
                          padding: "3px 8px",
                          border: "1px solid #e2e8f0",
                        }}>
                          <span style={{ color: "#64748b", fontWeight: "600", minWidth: "fit-content" }}>{ch.label}</span>
                          <span style={{ color: "#94a3b8", fontSize: "0.7rem" }}>·</span>
                          <span style={{
                            background: "#fee2e2",
                            color: "#dc2626",
                            borderRadius: "4px",
                            padding: "0 5px",
                            textDecoration: "line-through",
                            fontSize: "0.7rem",
                          }}>{ch.oldValue}</span>
                          <span style={{ color: "#94a3b8" }}>→</span>
                          <span style={{
                            background: "#dcfce7",
                            color: "#16a34a",
                            borderRadius: "4px",
                            padding: "0 5px",
                            fontWeight: "600",
                            fontSize: "0.7rem",
                          }}>{ch.newValue}</span>
                        </div>
                      ))}
                      {notif.changes.length > 4 && (
                        <span style={{ fontSize: "0.7rem", color: "#94a3b8", paddingLeft: "4px" }}>
                          +{notif.changes.length - 4} more changes
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <NotificationTime>
                  {formatTimestamp(notif.timestamp)}
                </NotificationTime>
              </NotificationItem>
            );
          })
        ) : (
          <div style={{
            textAlign: "center",
            padding: "40px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}>
            <div style={{ fontSize: "3rem", opacity: 0.4 }}>🔕</div>
            <div style={{ color: "#94a3b8", fontWeight: "600", fontSize: "0.9rem" }}>All caught up!</div>
            <div style={{ color: "#cbd5e1", fontSize: "0.8rem" }}>No new notifications</div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      {notifications.length > 0 && (
        <div style={{
          display: "flex",
          gap: "8px",
          padding: "10px 16px",
          borderTop: "1px solid #f1f5f9",
          background: "#fafafa",
        }}>
          <MarkReadButton onClick={markAllRead} style={{ flex: 1, fontSize: "0.78rem", padding: "6px 10px" }}>
            ✓ Mark All Read
          </MarkReadButton>
          <ClearButton onClick={clearNotifications} style={{ flex: 1, fontSize: "0.78rem", padding: "6px 10px" }}>
            🗑 Clear All
          </ClearButton>
        </div>
      )}
    </NotificationPopover>
  );

  const tableHeaders = [
    "Seq No",
    "Order ID",
    "SO Date",
    "Financial Year",
    "Customer Name",
    "Contact Person Name",
    "Contact No",
    "Customer Email",
    "SO Status",
    "Actions",
    "Alternate No",
    "City",
    "State",
    "Pin Code",
    "GST No",
    "Shipping Address",
    "Billing Address",
    "Product Details",
    "Product Type",
    "Size",
    "Spec",
    "Qty",
    "Unit Price",
    "GST",
    "Brand",
    "Warranty",
    "Total",
    "Payment Collected",
    "Payment Method",
    "Payment Due",
    "Payment Terms",
    "Credit Days",
    "Payment Received",
    "Freight Charges",
    "Freight Status",
    "Actual Freight",
    "Install Charges Status",
    "Installation",
    "Installation Status",
    "Transporter",
    "Transporter Details",
    "Dispatch From",
    "Dispatch Date",
    "Dispatch Status",
    "Order Type",
    "Report",
    "Stock Status",
    "Bill Status",
    "Production Status",
    "Install Report",
    "Stamp Signed",
    "Stamp Attach",
    "Bill Number",
    "PI Number",
    "Sales Person",
    "Company",
    "Created By",
    "Attachments",
  ];

  return (
    <>
      <style>{tableStyles}</style>
      <div
        style={{
          background: "rgb(230, 240, 250)",
          padding: "25px 40px",
          display: "flex",
          flexWrap: "wrap",
          gap: "20px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <FilterSection
          debouncedSetSearchTerm={debouncedSetSearchTerm}
          userRole={userRole}
          notificationPopover={notificationPopover}
          notifications={notifications}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          approvalFilter={approvalFilter}
          setApprovalFilter={setApprovalFilter}
          orderTypeFilter={orderTypeFilter}
          setOrderTypeFilter={setOrderTypeFilter}
          dispatchFilter={dispatchFilter}
          setDispatchFilter={setDispatchFilter}
          financialYearFilter={financialYearFilter}
          setFinancialYearFilter={setFinancialYearFilter}
          financialYearOptions={FINANCIAL_YEAR_OPTIONS}
          dispatchFromFilter={dispatchFromFilter}
          setDispatchFromFilter={setDispatchFromFilter}
          salesPersonFilter={salesPersonFilter}
          setSalesPersonFilter={setSalesPersonFilter}
          uniqueSalesPersons={uniqueSalesPersons}
          handleReset={handleReset}
        />
      </div>
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #e6f0fa, #f3e8ff)",
          padding: "30px",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        {/* {(userRole === "GlobalAdmin" || userRole === "SuperAdmin" || userRole === "Admin") && ( */}
        <TrackerGrid>
          {renderTrackerCard(
            "All Orders",
            allOrdersCount,
            <FaHome />,
            "linear-gradient(135deg, #bcd3ff 0%, #d1c4ff 100%)", // Slightly deeper blue-lavender
            "all",
            trackerFilter === "all"
          )}

          {renderTrackerCard(
            "Production Orders",
            dashboardCounts.production,
            <FaIndustry />,
            "linear-gradient(135deg, #b5ccff 0%, #c8b8ff 100%)", // Soft blue-purple blend
            "production",
            trackerFilter === "production"
          )} {renderTrackerCard(
            "Dispatch Orders",
            dashboardCounts.dispatch,
            <FaTruck />,
            "linear-gradient(135deg, #c8d9ff 0%, #dbc8ff 100%)", // Frosty blue-violet gradient
            "dispatch",
            trackerFilter === "dispatch"
          )}

          {renderTrackerCard(
            "Installation Orders",
            dashboardCounts.installation,
            <FaWrench />,
            "linear-gradient(135deg, #c0d6ff 0%, #d4c2ff 100%)",
            "installation",
            trackerFilter === "installation"
          )}


        </TrackerGrid>
        {/* )} */}
        <div
          className="my-4"
          style={{
            background: "linear-gradient(135deg, #2575fc, #6a11cb)",
            borderRadius: "20px",
            padding: "10px 16px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.18)",
            display: "inline-flex",
            alignItems: "center",
            transition: "all 0.3s ease",
          }}
        >
          <h4
            style={{
              color: "#ffffff",
              fontWeight: "700",
              fontSize: "0.85rem",
              margin: 0,
              letterSpacing: "0.4px",
            }}
            title="Total number of entries"
          >
            Total Results: {totalOrders}
          </h4>
        </div>
        <div
          className="mx-3 my-4"
          style={{
            background: "linear-gradient(135deg, #2575fc, #6a11cb)",
            borderRadius: "20px",
            padding: "10px 16px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.18)",
            display: "inline-flex",
            alignItems: "center",
            transition: "all 0.3s ease",
          }}
        >
          <h4
            style={{
              color: "#ffffff",
              fontWeight: "700",
              fontSize: "0.85rem",
              margin: 0,
              letterSpacing: "0.4px",
            }}
            title="Total quantity of products"
          >
            Total Product Qty: {Math.floor(totalProductQty)}
          </h4>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "20px",
            marginBottom: "30px",
            flexWrap: "wrap",
          }}
        >
          
          {(userRole === "Admin" || userRole === "GlobalAdmin" || userRole === "SuperAdmin" || userRole === "salesperson") && (
            <label
              style={{
                background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                color: "white",
                padding: "12px 24px",
                borderRadius: "30px",
                fontWeight: "600",
                fontSize: "1rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
                transition: "all 0.4s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "scale(1.05)";
                e.target.style.boxShadow = "0 10px 24px rgba(0,0,0,0.3)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "scale(1)";
                e.target.style.boxShadow = "0 6px 16px rgba(0,0,0,0.25)";
              }}
            >
              <Upload size={18} />
              Bulk Upload
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
            </label>
          )} {userRole === "GlobalAdmin" && (
            <Button
              onClick={handleExport}
              style={{
                background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                border: "none",
                padding: "12px 24px",
                borderRadius: "30px",
                color: "white",
                fontWeight: "600",
                fontSize: "1rem",
                boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.4s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "scale(1.05)";
                e.target.style.boxShadow = "0 10px 24px rgba(0,0,0,0.3)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "scale(1)";
                e.target.style.boxShadow = "0 6px 16px rgba(0,0,0,0.25)";
              }}
            >
              <Download size={18} />
              Export Orders
            </Button>
          )}
          {(userRole === "GlobalAdmin" || userRole === "SuperAdmin" || userRole === "Admin" || userRole === "salesperson") && (
            <Button
              onClick={() => setIsAddModalOpen(true)}
              style={{
                background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                border: "none",
                padding: "12px 24px",
                borderRadius: "30px",
                color: "white",
                fontWeight: "600",
                fontSize: "1rem",
                boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.4s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "scale(1.05)";
                e.target.style.boxShadow = "0 10px 24px rgba(0,0,0,0.3)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "scale(1)";
                e.target.style.boxShadow = "0 6px 16px rgba(0,0,0,0.25)";
              }}
            >
              <span style={{ fontSize: "1.2rem" }}>+</span>
              Add Order
            </Button>
          )}
         
          {(userRole === "Admin" ||
            userRole === "GlobalAdmin" ||
            userRole === "SuperAdmin" ||
            userRole === "salesperson") && (
              <Button
                variant="primary"
                onClick={() => setIsDashboardOpen(true)}
                style={{
                  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "30px",
                  fontSize: "1rem",
                  fontWeight: "600",
                  marginLeft: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
                onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
              >
                <BarChart2 size={18} />
                View Analytics
              </Button>
            )}{" "}
          {(userRole === "GlobalAdmin" || userRole === "SuperAdmin" || userRole === "Admin") && (
            <Button
              onClick={() => setIsTeamBuilderOpen(true)}
              style={{
                background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                border: "none",
                padding: "12px 24px",
                borderRadius: "30px",
                color: "white",
                fontWeight: "600",
                fontSize: "1rem",
                boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.4s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "scale(1.05)";
                e.target.style.boxShadow = "0 10px 24px rgba(0,0,0,0.3)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "scale(1)";
                e.target.style.boxShadow = "0 6px 16px rgba(0,0,0,0.25)";
              }}
            >
             <Users size={18} />
              Manage Team
            </Button>
          )}
        </div>

        <SalesDashboardDrawer
          isOpen={isDashboardOpen}
          onClose={() => setIsDashboardOpen(false)}
          orders={filteredOrders}
          startDate={startDate}
          endDate={endDate}
        />
        {isAddModalOpen && (
          <AddEntry
            onSubmit={handleAddEntry}
            onClose={() => setIsAddModalOpen(false)}
          />
        )}
        {isViewModalOpen && (
          <ViewEntry
            isOpen={isViewModalOpen}
            onClose={() => setIsViewModalOpen(false)}
            entry={selectedOrder}
          />
        )}
        {isDeleteModalOpen && (
          <DeleteModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onDelete={handleDelete}
            itemId={selectedOrder?._id}
          />
        )}
        {isEditModalOpen && (
          <EditEntry
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onEntryUpdated={handleEntryUpdated}
            entryToEdit={selectedOrder}
          />
        )}

        {isTeamBuilderOpen && (
          <TeamBuilder
            isOpen={isTeamBuilderOpen}
            onClose={() => setIsTeamBuilderOpen(false)}
            userId={userId}
          />
        )}
        <div className="sales-table-container">
          <table className="sales-table">
            <thead>
              <tr>
                {tableHeaders.map((header, index) => (
                  <th
                    key={index}
                    style={{
                      width: `${columnWidths[index]}px`,
                      minWidth: `${columnWidths[index]}px`,
                      maxWidth: `${columnWidths[index]}px`,
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 && !loading ? (
                <tr>
                  <td
                    colSpan={tableHeaders.length}
                    style={{
                      padding: 0,
                      border: "none",
                      height: "600px",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.8rem",
                        color: "#1f2937",
                        fontWeight: "600",
                        background: "#f9fafb",
                      }}
                    >
                      <div
                        style={{
                          textAlign: "center",
                          padding: "2rem",
                        }}
                      >
                        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
                          📋
                        </div>
                        <div>No data available</div>
                        <div
                          style={{
                            fontSize: "1rem",
                            color: "#6b7280",
                            marginTop: "0.5rem",
                            fontWeight: "400",
                          }}
                        >
                          Try adjusting your filters or add new orders
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td
                    colSpan={tableHeaders.length}
                    style={{ padding: 0, border: "none" }}
                  >
                    <div style={{ position: "relative", height: "600px", width: "100%" }}>
                      <AnimatePresence>
                        {loading ? (
                          <LoaderOverlay
                            key="loader"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{
                              background: "rgba(255,255,255,0.8)",
                              position: "absolute",
                              zIndex: 10
                            }}
                          >
                            <SpinnerWrap>
                              <GradientSpinner />
                            </SpinnerWrap>
                          </LoaderOverlay>
                        ) : (
                          <AutoSizer disableHeight>
                            {({ width }) => (
                              <List
                                className="list-container"
                                height={600}
                                itemCount={filteredOrders.length}
                                itemSize={50}
                                width={Math.max(width, totalTableWidth)}
                                itemData={{
                                  orders: filteredOrders,
                                  handleViewClick,
                                  handleEditClick,
                                  handleDeleteClick,
                                  userRole,
                                  userId,
                                  isOrderComplete,
                                  columnWidths,
                                  currentPage,
                                }}
                              >
                                {Row}
                              </List>
                            )}
                          </AutoSizer>
                        )}
                      </AnimatePresence>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <AnimatePresence>
            {loading && (
              <LoaderOverlay
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <SpinnerWrap>
                  <GradientSpinner />
                </SpinnerWrap>
              </LoaderOverlay>
            )}
          </AnimatePresence>
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: "20px", marginBottom: "20px" }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            size="large"
            sx={{
              "& .MuiPaginationItem-root": {
                color: "#6a11cb",
                borderColor: "#e0e0e0",
                "&:hover": {
                  backgroundColor: "rgba(106, 17, 203, 0.1)",
                },
              },
              "& .MuiPaginationItem-root.Mui-selected": {
                background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                color: "#fff",
                border: "none",
                "&:hover": {
                  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                }
              }
            }}
          />
        </div>
      </div>
      <footer
        style={{
          margin: 0,
          textAlign: "center",
          color: "white",
          padding: "20px",
          background: "linear-gradient(135deg, #2575fc, #6a11cb)",
          width: "100vw",
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          fontSize: "1rem",
          fontWeight: "500",
          bottom: 0,
          left: 0,
          boxSizing: "border-box",
        }}
      >
        © 2025 Sales Order Management. All rights reserved.
      </footer>
    </>
  );
};

export default Sales;
