import React, { useState, useEffect, useMemo, useCallback } from "react";
import { FaEye } from "react-icons/fa";
import { Button, Badge, Popover } from "react-bootstrap";
import { FaHome, FaWrench, FaIndustry, FaTruck } from "react-icons/fa";
import { Card } from "react-bootstrap";
import FilterSection from "./FilterSection";
import "react-datepicker/dist/react-datepicker.css";
import furniApi from "../axiosSetup";
import { toast } from "react-toastify";
import { exportToExcel, readExcelFile } from "../../utils/excelHelper";
import { BarChart2, Upload, Download, Users } from "lucide-react";
// analytics icon: BarChart2 | upload icon: Upload | download icon: Download
import io from "socket.io-client";
import styled from "styled-components";
import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import Pagination from "@mui/material/Pagination";
import debounce from "lodash/debounce";
import SalesDashboardDrawer from "./Dashbords/SalesDashboardDrawer";
import TeamBuilder from "./TeamBuilder";
import { isOrderComplete } from "../utils/orderUtils";
import { FINANCIAL_YEAR_OPTIONS } from "../../shared/financialYear";
import { getCurrentFinancialYear } from "../../shared/financialYear";
const ViewEntry = React.lazy(() => import("./ViewEntry"));
const DeleteModal = React.lazy(() => import("./Delete"));
const EditEntry = React.lazy(() => import("./EditEntry"));
const AddEntry = React.lazy(() => import("./AddEntry"));

const FURNI_BASE = process.env.REACT_APP_FURNI_URL || "http://localhost:5050/api/furni";
const socketOrigin = (() => { try { return new URL(FURNI_BASE).origin; } catch { return FURNI_BASE; } })();

const NotificationPopover = styled(Popover)`
  width: 400px;
  min-width: 400px;
  max-width: 400px;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18), 0 4px 16px rgba(37, 117, 252, 0.12);
  background: #fff; border: none; overflow: hidden;
`;
const NotificationItem = styled.div`
  padding: 14px 16px; border-bottom: 1px solid #f1f5f9; display: flex;
  justify-content: space-between; align-items: flex-start;
  background: ${(props) => (props.isRead ? "#ffffff" : "linear-gradient(135deg, #f0f7ff, #f5f0ff)")};
  transition: all 0.2s ease; position: relative;
  &::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
    background: ${(props) => props.action === "created" ? "#22c55e" : props.action === "deleted" ? "#ef4444" : "#2575fc"};
    opacity: ${(props) => props.isRead ? "0.3" : "1"}; }
  &:hover { background: #f8faff; }
`;
const NotificationText = styled.div`
  font-size: 0.82rem; color: #1e293b;
  font-weight: ${(props) => (props.isRead ? "400" : "600")}; flex: 1; line-height: 1.4;
`;
const NotificationTime = styled.div`font-size: 0.72rem; color: #94a3b8; margin-left: 10px; white-space: nowrap; margin-top: 2px;`;
const NotificationActions = styled.div`
  display: flex; gap: 8px; padding: 10px 16px; border-top: 1px solid #f1f5f9; background: #fafafa;
`;
const ClearButton = styled(Button)`background: #dc3545; border: none; padding: 6px 12px; font-size: 0.78rem; border-radius: 8px; flex: 1; &:hover { background: #b02a37; }`;
const MarkReadButton = styled(Button)`background: #28a745; border: none; padding: 6px 12px; font-size: 0.78rem; border-radius: 8px; flex: 1; &:hover { background: #218838; }`;

const columnWidths = [60,120,160,140,180,180,140,200,140,150,120,120,120,100,140,250,250,250,150,100,100,80,120,100,120,140,140,140,140,140,120,120,120,140,200,140,140,140,150,120,120,120,140,120,120,140,140,140,200];
const totalTableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
const normalizeTableText = (value) =>
  typeof value === "string" ? value.replace(/^\s*[��]\s*/, "").trim() : value;

const tableStyles = `
body { overflow-x: hidden; }
.outer-container { max-width: 100vw; overflow-x: hidden; }
.sales-table-container { background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); max-height: 600px; overflow-y: auto; overflow-x: auto; scrollbar-width: thin; scrollbar-color: #2575fc #e6f0fa; position: relative; width: 100%; max-width: 100%; min-width: 0; }
.sales-table { width: 100%; min-width: ${totalTableWidth}px; table-layout: fixed; border-collapse: collapse; overflow-x: hidden; }
.sales-table thead tr { background: linear-gradient(135deg, #2575fc, #6a11cb); color: white; box-shadow: 0 2px 10px rgba(0,0,0,0.2); position: sticky; top: 0; z-index: 2; }
.sales-table th { padding: 10px 15px; height: 50px; line-height: 30px; font-size: 0.95rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid rgba(255,255,255,0.2); white-space: nowrap; text-align: center; box-sizing: border-box; overflow: hidden; text-overflow: ellipsis; cursor: pointer; }
.sales-table tbody tr { border-bottom: 1px solid #e6f0fa; transition: all 0.3s ease; }
.sales-table tbody tr:hover { background-color: #f0f7ff; }
.sales-table td { padding: 10px 15px; height: 50px; line-height: 30px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; box-sizing: border-box; text-align: center; cursor: pointer; }
.sales-table td.contact-person-name { font-weight: normal; text-align: center; list-style-type: none; padding-left: 15px; position: relative; }
.sales-table td.customer-name-cell { font-weight: normal; text-align: center; list-style-type: none; padding-left: 15px; position: relative; }
.sales-table td.contact-person-name::before, .sales-table td.contact-person-name::after, .sales-table td.customer-name-cell::before, .sales-table td.customer-name-cell::after { content: none !important; }
.sales-table .badge { padding: 6px 12px; font-size: 0.9rem; display: inline-block; width: 100%; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sales-table .actions-cell { display: flex; justify-content: center; align-items: center; gap: 10px; padding: 5px; height: 50px; overflow: visible; flex-wrap: nowrap; cursor: default; }
.sales-table .actions-cell button { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease; z-index: 1; }
.list-container { width: 100%; min-width: ${totalTableWidth}px; }
.sales-table-container .loader-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 5; transition: opacity 0.2s ease; }
.gradient-spinner { width: 48px; height: 48px; border-radius: 50%; background: conic-gradient(#2575fc, #6a11cb, #2575fc); -webkit-mask: radial-gradient(farthest-side, #0000 calc(100% - 8px), #000 0); mask: radial-gradient(farthest-side, #0000 calc(100% - 8px), #000 0); animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(1turn); } }
`;

const TrackerGrid = styled.div`display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;`;
const TrackerCard = styled(Card)`
  cursor: pointer; transition: all 0.3s ease; border: none; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  &:hover { transform: translateY(-5px); box-shadow: 0 8px 25px rgba(0,0,0,0.15); }
  &.active { box-shadow: 0 8px 25px rgba(37,117,252,0.3); border: 2px solid #2575fc; }
  .card-body { padding: 20px; text-align: center; }
  .icon { font-size: 2.5rem; margin-bottom: 10px; }
  .count { font-size: 2rem; font-weight: bold; margin-bottom: 5px; }
  .title { font-size: 1rem; color: #6b7280; }
`;
const Row = React.memo(({ index, style, data }) => {
  const { orders, handleViewClick, handleEditClick, handleDeleteClick, userRole, isOrderComplete, columnWidths, openTooltipId, setOpenTooltipId, currentPage } = data;
  const order = orders[index];
  const firstProduct = order.products && order.products[0] ? order.products[0] : {};
  const productDetails = order.products ? order.products.map((p) => `${p.productType} (${p.qty})`).join(", ") : "-";
  const totalUnitPrice = order.products ? order.products.reduce((sum, p) => sum + (p.unitPrice || 0) * (p.qty || 0), 0) : 0;
  const totalQty = order.products ? order.products.reduce((sum, p) => sum + (p.qty || 0), 0) : 0;
  const gstValues = order.products ? order.products.map((p) => `${p.gst}`).filter(Boolean).join(", ") : "-";

  const getRowBackground = () => {
    if (order.sostatus === "Order Cancelled") return "#ffe5e5";
    if (isOrderComplete(order)) return "#ffffff";
    if (order.sostatus === "Approved") {
      if (order.poFilePath) return "#d4f4e6"; // Darker green when PO attached
      return "#e6ffed";
    }
    if (order.sostatus === "Accounts Approved") return "#e6f0ff";
    // Pending for Approval - highlight with darker purple when PO attached
    if (order.sostatus === "Pending for Approval") {
      if (order.poFilePath) return "#e4d1ff"; // Darker purple when PO attached
      return "#f3e8ff"; // Normal light purple
    }
    return "#f3e8ff";
  };
  const getHoverBackground = () => {
    if (order.sostatus === "Order Cancelled") return "#ffcccc";
    if (isOrderComplete(order)) return "#f0f7ff";
    if (order.sostatus === "Approved") {
      if (order.poFilePath) return "#c8ede0"; // Darker green hover
      return "#d1f7dc";
    }
    if (order.sostatus === "Accounts Approved") return "#d1e4ff";
    // Pending for Approval hover
    if (order.sostatus === "Pending for Approval") {
      if (order.poFilePath) return "#d4b8ff"; // Darker purple hover when PO attached
      return "#ede4ff"; // Normal hover
    }
    return "#ede4ff";
  };

  return (
    <tr style={{ ...style, backgroundColor: getRowBackground(), display: "table-row" }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = getHoverBackground())}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = getRowBackground())}>
      {[
        { width: columnWidths[0], content: (currentPage - 1) * 20 + index + 1, title: `${(currentPage - 1) * 20 + index + 1}` },
        { width: columnWidths[1], content: order.orderId || "-", title: order.orderId || "-" },
        { width: columnWidths[2], content: order.soDate ? new Date(order.soDate).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }) : "-", title: order.soDate ? new Date(order.soDate).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }) : "-" },
        { width: columnWidths[3], content: order.financialYear || "-", title: order.financialYear || "-" },
        { width: columnWidths[4], content: normalizeTableText(order.customername) || "-", title: normalizeTableText(order.customername) || "-", className: "customer-name-cell" },
        { width: columnWidths[5], content: order.name || "-", title: order.name || "-", className: "contact-person-name" },
        { width: columnWidths[6], content: order.contactNo || "-", title: order.contactNo || "-" },
        { width: columnWidths[7], content: order.customerEmail || "-", title: order.customerEmail || "-" },
        { width: columnWidths[8], content: (<Badge bg={order.sostatus === "Pending for Approval" ? "warning" : order.sostatus === "Accounts Approved" ? "info" : order.sostatus === "Approved" ? "success" : order.sostatus === "Order Cancelled" ? "danger" : order.sostatus === "Hold By Production" ? "dark" : "secondary"}>{order.sostatus === "Hold By Production" ? "On Hold" : order.sostatus || "-"}</Badge>), title: order.sostatus === "Hold By Production" ? "On Hold" : order.sostatus || "-" },
        { width: columnWidths[9], content: (
          <div className="actions-cell">
            <Button variant="primary" onClick={() => handleViewClick(order)} style={{ width: "40px", height: "40px", borderRadius: "50%", padding: "0", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "50px" }}><FaEye /></Button>
            {(userRole === "SuperAdmin" || userRole === "GlobalAdmin" || userRole === "Admin" || userRole === "salesperson") && 
              (userRole === "SuperAdmin" || userRole === "GlobalAdmin" || (order.sostatus !== "Approved" && order.sostatus !== "Accounts Approved")) && (<>
              <button className="editBtn" onClick={() => handleEditClick(order)} style={{ width: "40px", height: "40px", borderRadius: "50%", padding: "0", background: "#6b7280", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "1", marginBottom: "50px" }}>
                <svg height="1em" viewBox="0 0 512 512" fill="#ffffff"><path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z" /></svg>
              </button>
            </>)}
            {(userRole === "SuperAdmin" || userRole === "GlobalAdmin") && (
              <button className="bin-button" onClick={() => handleDeleteClick(order)} style={{ width: "40px", height: "40px", borderRadius: "50%", padding: "0", background: "#ef4444", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "50px" }}>
                <svg className="bin-top" viewBox="0 0 39 7" fill="none" style={{ width: "20px", height: "5px" }}><line y1="5" x2="39" y2="5" stroke="white" strokeWidth="4" /><line x1="12" y1="1.5" x2="26.0357" y2="1.5" stroke="white" strokeWidth="3" /></svg>
                <svg className="bin-bottom" viewBox="0 0 33 39" fill="none" style={{ width: "20px", height: "20px" }}><mask id="path-1-inside-1_8_19" fill="white"><path d="M0 0H33V35C33 37.2091 31.2091 39 29 39H4C1.79086 39 0 37.2091 0 35V0Z" /></mask><path d="M0 0H33H0ZM37 35C37 39.4183 33.4183 43 29 43H4C-0.418278 43 -4 39.4183 -4 35H4H29H37ZM4 43C-0.418278 43 -4 39.4183 -4 35V0H4V35V43ZM37 0V35C37 39.4183 33.4183 43 29 43V35V0H37Z" fill="white" mask="url(#path-1-inside-1_8_19)" /><path d="M12 6L12 29" stroke="white" strokeWidth="4" /><path d="M21 6V29" stroke="white" strokeWidth="4" /></svg>
              </button>
            )}
          </div>), title: "" },
        { width: columnWidths[10], content: order.alterno || "-", title: order.alterno || "-" },
        { width: columnWidths[11], content: order.city || "-", title: order.city || "-" },
        { width: columnWidths[12], content: order.state || "-", title: order.state || "-" },
        { width: columnWidths[13], content: order.pinCode || "-", title: order.pinCode || "-" },
        { width: columnWidths[14], content: order.gstno || "-", title: order.gstno || "-" },
        { width: columnWidths[15], content: order.shippingAddress || "-", title: order.shippingAddress || "-" },
        { width: columnWidths[16], content: order.billingAddress || "-", title: order.billingAddress || "-" },
        { width: columnWidths[17], content: productDetails, title: productDetails },
        { width: columnWidths[18], content: firstProduct.productType || "-", title: firstProduct.productType || "-" },
        { width: columnWidths[19], content: firstProduct.size || "-", title: firstProduct.size || "-" },
        { width: columnWidths[20], content: firstProduct.spec || "-", title: firstProduct.spec || "-" },
        { width: columnWidths[21], content: totalQty || "-", title: totalQty || "-" },
        { width: columnWidths[22], content: `\u20b9${totalUnitPrice.toFixed(2) || "0.00"}`, title: `\u20b9${totalUnitPrice.toFixed(2) || "0.00"}` },
        { width: columnWidths[23], content: `${gstValues}%`, title: gstValues },
        { width: columnWidths[24], content: `\u20b9${order.total?.toFixed(2) || "0.00"}`, title: `\u20b9${order.total?.toFixed(2) || "0.00"}` },
        { width: columnWidths[25], content: order.paymentCollected ? `\u20b9${order.paymentCollected}` : "-", title: order.paymentCollected ? `\u20b9${order.paymentCollected}` : "-" },
        { width: columnWidths[26], content: order.paymentMethod || "-", title: order.paymentMethod || "-" },
        { width: columnWidths[27], content: order.paymentDue ? `\u20b9${order.paymentDue}` : "-", title: order.paymentDue ? `\u20b9${order.paymentDue}` : "-" },
        { width: columnWidths[28], content: order.paymentTerms || "-", title: order.paymentTerms || "-" },
        { width: columnWidths[29], content: (<Badge bg={order.paymentReceived === "Received" ? "success" : "warning"}>{order.paymentReceived || "-"}</Badge>), title: order.paymentReceived || "-" },
        { width: columnWidths[30], content: order.freightcs ? `\u20b9${order.freightcs}` : "-", title: order.freightcs ? `\u20b9${order.freightcs}` : "-" },
        { width: columnWidths[31], content: order.actualFreight ? `\u20b9${order.actualFreight.toFixed(2)}` : "-", title: order.actualFreight ? `\u20b9${order.actualFreight.toFixed(2)}` : "-" },
        { width: columnWidths[32], content: (<Badge bg={order.installationStatus === "Pending" ? "warning" : order.installationStatus === "In Progress" ? "info" : order.installationStatus === "Completed" ? "success" : "secondary"}>{order.installationStatus || "-"}</Badge>), title: order.installationStatus || "-" },
        { width: columnWidths[33], content: (<Badge bg={order.installationReport === "Yes" ? "success" : "warning"}>{order.installationReport || "-"}</Badge>), title: order.installationReport || "-" },
        { width: columnWidths[34], content: order.transporterDetails || "-", title: order.transporterDetails || "-" },
        { width: columnWidths[35], content: order.dispatchFrom || "-", title: order.dispatchFrom || "-" },
        { width: columnWidths[36], content: (<Badge bg={order.dispatchStatus === "Not Dispatched" ? "warning" : order.dispatchStatus === "Docket Awaited Dispatched" ? "info" : order.dispatchStatus === "Dispatched" ? "primary" : order.dispatchStatus === "Delivered" ? "success" : order.dispatchStatus === "Hold by Salesperson" ? "dark" : order.dispatchStatus === "Hold by Customer" ? "light" : order.dispatchStatus === "Order Cancelled" ? "danger" : "secondary"}>{order.dispatchStatus === "Not Dispatched" ? "Pending Dispatched" : order.dispatchStatus || "-"}</Badge>), title: order.dispatchStatus === "Not Dispatched" ? "Pending Dispatched" : order.dispatchStatus || "-" },
        { width: columnWidths[37], content: (<Badge bg={order.stamp === "Received" ? "success" : "warning"}>{order.stamp || "-"}</Badge>), title: order.stamp || "-" },
        { width: columnWidths[38], content: (<Badge bg={order.stampReport ? "success" : "danger"}>{order.stampReport ? "Attached" : "Not Attached"}</Badge>), title: order.stampReport ? "Attached" : "Not Attached" },
        { width: columnWidths[39], content: order.orderType === "Stock Out" ? "Stock" : order.orderType || "-", title: order.orderType === "Stock Out" ? "Stock" : order.orderType || "-" },
        { width: columnWidths[40], content: order.report || "-", title: order.report || "-" },
        { width: columnWidths[41], content: (<Badge bg={order.billStatus === "Pending" ? "warning" : order.billStatus === "Under Billing" ? "info" : order.billStatus === "Billing Complete" ? "success" : "secondary"}>{order.billStatus || "-"}</Badge>), title: order.billStatus || "-" },
        { width: columnWidths[42], content: (<Badge style={{ background: order.fulfillingStatus === "Under Process" ? "linear-gradient(135deg, #f39c12, #f7c200)" : order.fulfillingStatus === "Pending" ? "linear-gradient(135deg, #ff6b6b, #ff8787)" : order.fulfillingStatus === "Partial Dispatch" ? "linear-gradient(135deg, #00c6ff, #0072ff)" : order.fulfillingStatus === "Fulfilled" ? "linear-gradient(135deg, #28a745, #4cd964)" : order.fulfillingStatus === "Order Cancel" ? "linear-gradient(135deg, #8e0e00, #e52d27)" : order.fulfillingStatus === "Hold" ? "linear-gradient(135deg, #6a11cb, #2575fc)" : "linear-gradient(135deg, #6c757d, #a9a9a9)" }}>{order.fulfillingStatus === "Order Cancel" ? "Order Cancelled" : order.fulfillingStatus === "Partial Dispatch" ? "Partial Dispatched" : order.fulfillingStatus === "Fulfilled" ? "Completed" : order.fulfillingStatus || "Pending"}</Badge>), title: order.fulfillingStatus === "Order Cancel" ? "Order Cancelled" : order.fulfillingStatus === "Partial Dispatch" ? "Partial Dispatched" : order.fulfillingStatus === "Fulfilled" ? "Completed" : order.fulfillingStatus || "Pending" },
        { width: columnWidths[43], content: order.billNumber || "-", title: order.billNumber || "-" },
        { width: columnWidths[44], content: order.piNumber || "-", title: order.piNumber || "-" },
        { width: columnWidths[45], content: order.salesPerson || "-", title: order.salesPerson || "-" },
        { width: columnWidths[46], content: order.company || "-", title: order.company || "-" },
        { width: columnWidths[47], content: order.createdBy && typeof order.createdBy === "object" ? order.createdBy.username || "Unknown" : typeof order.createdBy === "string" ? order.createdBy : "-", title: order.createdBy && typeof order.createdBy === "object" ? order.createdBy.username || "Unknown" : typeof order.createdBy === "string" ? order.createdBy : "-" },
        { width: columnWidths[48], content: order.remarks || "-", title: order.remarks || "-" },
      ].map((cell, idx) => (
        <OverlayTrigger key={idx} trigger="click" placement="top"
          show={openTooltipId === `cell-${index}-${idx}`}
          onToggle={(show) => { if (show && cell.title) { setOpenTooltipId(`cell-${index}-${idx}`); } else { setOpenTooltipId(null); } }}
          overlay={cell.title ? (<Tooltip id={`cell-tooltip-${index}-${idx}`}>{cell.title}</Tooltip>) : (<Tooltip id={`cell-tooltip-${index}-${idx}`} style={{ display: "none" }} />)}>
          <td className={cell.className || ""} style={{ width: `${cell.width}px`, minWidth: `${cell.width}px`, maxWidth: `${cell.width}px` }} title={cell.title}>{cell.content}</td>
        </OverlayTrigger>
      ))}
    </tr>
  );
});

const OrderTracker = ({ userRole, onFilterChange, initialFilter = "all", counts }) => {
  const [dashboardCounts, setDashboardCounts] = useState({ all: 0, installation: 0, production: 0, dispatch: 0 });
  const [trackerFilter, setTrackerFilter] = useState(initialFilter);
  const displayedCounts = counts || dashboardCounts;

  useEffect(() => { setTrackerFilter(initialFilter); }, [initialFilter]);

  const fetchDashboardCounts = useCallback(async () => {
    try {
      const response = await furniApi.get("/api/dashboard-counts");
      setDashboardCounts(response.data || { all: 0, installation: 0, production: 0, dispatch: 0 });
    } catch (error) {
      console.error("Error fetching dashboard counts:", error);
      toast.error("Failed to fetch dashboard counts!");
    }
  }, []);

  useEffect(() => { fetchDashboardCounts(); }, [fetchDashboardCounts]);

  const handleFilterChange = useCallback((filterKey) => {
    setTrackerFilter(filterKey);
    if (onFilterChange) onFilterChange(filterKey);
  }, [onFilterChange]);

  const renderTrackerCard = useCallback((title, count, icon, bgColor, filterKey) => {
    const active = trackerFilter === filterKey;
    return (
      <TrackerCard key={filterKey} onClick={() => handleFilterChange(filterKey)} className={active ? "active" : ""} style={{ background: bgColor }}>
        <Card.Body>
          <div className="icon">{icon}</div>
          <div className="count">{count}</div>
          <div className="title">{title}</div>
        </Card.Body>
      </TrackerCard>
    );
  }, [trackerFilter, handleFilterChange]);

  if (userRole !== "SuperAdmin" && userRole !== "GlobalAdmin" && userRole !== "Admin" && userRole !== "salesperson") return null;

  return (
    <TrackerGrid>
      {renderTrackerCard("All Orders", displayedCounts.all, <FaHome />, "linear-gradient(135deg, #bcd3ff 0%, #d1c4ff 100%)", "all")}
      {renderTrackerCard("Production Orders", displayedCounts.production, <FaIndustry />, "linear-gradient(135deg, #b5ccff 0%, #c8b8ff 100%)", "production")}
      {renderTrackerCard("Dispatch Orders", displayedCounts.dispatch, <FaTruck />, "linear-gradient(135deg, #c8d9ff 0%, #dbc8ff 100%)", "dispatch")}
      {renderTrackerCard("Installation Orders", displayedCounts.installation, <FaWrench />, "linear-gradient(135deg, #c0d6ff 0%, #d4c2ff 100%)", "installation")}
    </TrackerGrid>
  );
};

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
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isTeamBuilderOpen, setIsTeamBuilderOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [productionStatusFilter, setProductionStatusFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [installStatusFilter, setInstallStatusFilter] = useState("All");
  const [productStatus, setProductStatusFilter] = useState("All");
  const [accountsStatusFilter, setAccountsStatusFilter] = useState("All");
  const [dispatchFilter, setDispatchFilter] = useState("All");
  const [salesPersonFilter, setSalesPersonFilter] = useState("All");
  const [uniqueSalesPersons, setUniqueSalesPersons] = useState(["All"]);
  const [financialYearFilter, setFinancialYearFilter] = useState(() => getCurrentFinancialYear());
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [dashboardCounts, setDashboardCounts] = useState({ all: 0, installation: 0, production: 0, dispatch: 0 });
  const [trackerFilter, setTrackerFilter] = useState("all");
  const userRole = localStorage.getItem("furniRole");
  const userId = localStorage.getItem("furniUserId");
  const [openTooltipId, setOpenTooltipId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const tableContainer = document.querySelector(".sales-table-container");
      if (tableContainer && !tableContainer.contains(event.target)) setOpenTooltipId(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const debouncedSetSearchTerm = useMemo(() => debounce((value) => setSearchTerm(value), 300), []);

  // Fetch unique salesperson values once on mount to populate the filter dropdown.
  // Uses the Furni legacy DB user list — filter works by createdBy (username lookup),
  // same pattern as the SO/AV/EdTech module.
  useEffect(() => {
    const fetchSalesPersons = async () => {
      try {
        const res = await furniApi.get("/api/get-salespersons");
        const names = Array.isArray(res.data?.data) ? res.data.data : [];
        setUniqueSalesPersons(["All", ...names]);
      } catch (err) {
        console.error("Error fetching salesperson list:", err);
      }
    };
    fetchSalesPersons();
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await furniApi.get("/api/notifications");
      setNotifications(response.data.data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Failed to fetch notifications!");
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await furniApi.post("/api/mark-read", {});
      setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));
      toast.success("All notifications marked as read!");
    } catch (error) {
      toast.error("Failed to mark notifications as read!");
    }
  }, []);

  const clearNotifications = useCallback(async () => {
    try {
      await furniApi.delete("/api/clear");
      setNotifications([]);
      toast.success("All notifications cleared!");
    } catch (error) {
      toast.error("Failed to clear notifications!");
    }
  }, []);

  const fetchPaginatedOrders = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      const { page = 1, search = "", approval = "All", orderType = "All", dispatch = "All", salesPerson = "All", dispatchFrom = "All", financialYear = "All", startDate = null, endDate = null, dashboardFilter = "all", accountsStatus = "All", installationStatus = "All" } = params;
      const queryParams = { page, limit: 20, search, approval, orderType, dispatch, salesPerson, dispatchFrom, financialYear, dashboardFilter, accountsStatus, installationStatus };
      if (startDate) queryParams.startDate = startDate.toISOString();
      if (endDate) queryParams.endDate = endDate.toISOString();
      const response = await furniApi.get("/api/get-orders-paginated", { params: queryParams });
      const { data, total, page: currentPageRes, pages, totalProductQty } = response.data;
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
      toast.error("Failed to fetch orders!");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDashboardCounts = useCallback(async (fy) => {
    try {
      const financialYear = fy ?? financialYearFilter;
      const response = await furniApi.get("/api/dashboard-counts",
        { params: financialYear && financialYear !== "All" ? { financialYear } : {} }
      );
      setDashboardCounts(response.data || { all: 0, installation: 0, production: 0, dispatch: 0 });
    } catch (error) {
      console.error("Error fetching dashboard counts:", error);
    }
  }, [financialYearFilter]);

  useEffect(() => {
    const socket = io(`${socketOrigin}`, { path: "/furni/socket.io", transports: ["websocket", "polling"], reconnection: true, reconnectionAttempts: 5, reconnectionDelay: 1000, withCredentials: true });
    socket.on("connect", () => { 
      console.log(`[Furni Socket] Client connected — socketId=${socket.id} userId=${userId} username=${userRole}`);
      socket.emit("join", { userId, role: userRole }); 
    });
    socket.on("connect_error", (error) => {});
    socket.on("disconnect", (reason) => {
      console.log(`[Furni Socket] Client disconnected — socketId=${socket.id} userId=${userId} reason=${reason}`);
    });
    socket.on("deleteOrder", ({ _id, createdBy, assignedTo }) => {
      const owners = [createdBy, assignedTo].filter(Boolean);
      if (!owners.includes(userId)) return;
      setOrders((prev) => prev.filter((o) => o._id !== _id));
      fetchDashboardCounts();
    });    socket.on("notification", (notif) => {
      setNotifications((prev) => {
        if (notif?._id && prev.some((n) => n._id === notif._id)) return prev;
        const next = [notif, ...prev].slice(0, 50);
        if (notif?.message) {
          const toastMsg = notif.changes && notif.changes.length > 0
            ? `Order ${notif.orderId || ""}: ${notif.changes[0].label} changed to ${notif.changes[0].newValue}`
            : notif.message;
          toast.info(toastMsg, { autoClose: 4000 });
        }
        return next;
      });
    });
    socket.on("orderUpdate", ({ operationType, documentId, fullDocument, createdBy, assignedTo }) => {
      const owners = [createdBy, assignedTo].filter(Boolean);
      if (!owners.includes(userId)) return;
      if (operationType === "insert" && fullDocument) {
        setOrders((prev) => { if (prev.some((o) => o._id === documentId)) return prev; return [fullDocument, ...prev]; });
      }
      fetchDashboardCounts();
    });
    socket.on("dashboardCounts", (counts) => {
      if (counts && typeof counts === "object") {
        setDashboardCounts((prev) => ({ all: Number(counts.all) || 0, installation: Number(counts.installation) || 0, production: Number(counts.production) || 0, dispatch: Number(counts.dispatch) || 0 }));
      }
    });
    (async () => {
      try {
        const initFY = getCurrentFinancialYear();
        await Promise.all([
          fetchPaginatedOrders({ page: 1, financialYear: initFY, dashboardFilter: "all" }),
          fetchNotifications(),
          fetchDashboardCounts(initFY),
        ]);
      }
      finally { setIsLoading(false); }
    })();
    return () => {
      socket.off("connect"); socket.off("connect_error"); socket.off("notification");
      socket.off("orderUpdate"); socket.off("deleteOrder"); socket.off("dashboardCounts");
      socket.disconnect();
    };
  }, [fetchPaginatedOrders, fetchNotifications, userRole, userId, fetchDashboardCounts]);

  const calculateTotalResults = useMemo(() => totalProductQty, [totalProductQty]);

  const filterEffectMounted = React.useRef(false);

  useEffect(() => {
    // Skip on first render — mount effect already fetched with correct initial params
    if (!filterEffectMounted.current) {
      filterEffectMounted.current = true;
      return;
    }
    fetchPaginatedOrders({ page: currentPage, search: searchTerm, approval: productionStatusFilter, orderType: productStatus, dispatch: dispatchFilter, salesPerson: salesPersonFilter, dispatchFrom: "All", financialYear: trackerFilter === "all" ? financialYearFilter : "All", startDate, endDate, dashboardFilter: trackerFilter, accountsStatus: accountsStatusFilter, installationStatus: installStatusFilter });
    fetchDashboardCounts(financialYearFilter);
  }, [currentPage, searchTerm, productionStatusFilter, productStatus, dispatchFilter, salesPersonFilter, financialYearFilter, startDate, endDate, trackerFilter, accountsStatusFilter, installStatusFilter, fetchPaginatedOrders, fetchDashboardCounts]);

  const handleReset = useCallback(() => {
    setProductionStatusFilter("All"); setInstallStatusFilter("All"); setProductStatusFilter("All");
    setAccountsStatusFilter("All"); setDispatchFilter("All"); setSalesPersonFilter("All");
    setFinancialYearFilter(getCurrentFinancialYear()); setTrackerFilter("all");
    setSearchTerm(""); setStartDate(null); setEndDate(null); setCurrentPage(1);
    fetchPaginatedOrders({ page: 1, search: "", approval: "All", orderType: "All", dispatch: "All", salesPerson: "All", dispatchFrom: "All", financialYear: getCurrentFinancialYear(), startDate: null, endDate: null, dashboardFilter: "all" });
    toast.info("Filters reset!");
  }, [fetchPaginatedOrders]);

  const handleAddEntry = useCallback(async () => {
    // Re-fetch with current filters so new order appears under the right financial year
    await fetchPaginatedOrders({
      page: currentPage,
      search: searchTerm,
      approval: productionStatusFilter,
      orderType: productStatus,
      dispatch: dispatchFilter,
      salesPerson: salesPersonFilter,
      dispatchFrom: "All",
      financialYear: trackerFilter === "all" ? financialYearFilter : "All",
      startDate,
      endDate,
      dashboardFilter: trackerFilter,
      accountsStatus: accountsStatusFilter,
      installationStatus: installStatusFilter,
    });
    setIsAddModalOpen(false);
    fetchDashboardCounts();
  }, [fetchPaginatedOrders, fetchDashboardCounts, currentPage, searchTerm, productionStatusFilter, productStatus, dispatchFilter, salesPersonFilter, financialYearFilter, trackerFilter, startDate, endDate, accountsStatusFilter, installStatusFilter]);

  const handleViewClick = useCallback((order) => { setSelectedOrder(order); setIsViewModalOpen(true); }, []);
  const handleEditClick = useCallback((order) => { setSelectedOrder(order); setIsEditModalOpen(true); }, []);
  const handleDeleteClick = useCallback((order) => { setSelectedOrder(order); setIsDeleteModalOpen(true); }, []);

  const handleDelete = useCallback((deletedIds) => {
    // Local state update — no re-fetch needed, financial year filter stays intact
    const ids = Array.isArray(deletedIds) ? deletedIds : [deletedIds];
    setOrders((prev) => prev.filter((o) => !ids.includes(o._id)));
    setFilteredOrders((prev) => prev.filter((o) => !ids.includes(o._id)));
    setIsDeleteModalOpen(false);
    fetchDashboardCounts();
  }, [fetchDashboardCounts]);

  const handleEntryUpdated = useCallback((updatedEntry) => {
    // Local state update — same as SO, no re-fetch so financial year filter stays intact
    if (updatedEntry && updatedEntry._id) {
      setOrders((prev) => prev.map((o) => o._id === updatedEntry._id ? updatedEntry : o));
      setFilteredOrders((prev) => prev.map((o) => o._id === updatedEntry._id ? updatedEntry : o));
    }
    setIsEditModalOpen(false);
    fetchDashboardCounts();
  }, [fetchDashboardCounts]);

  const formatCurrency = useCallback((value) => {
    if (!value || value === "") return "\u20b90.00";
    const numericValue = parseFloat(value.toString().replace(/[^0-9.-]+/g, ""));
    if (isNaN(numericValue)) return "\u20b90.00";
    return `\u20b9${numericValue.toFixed(2)}`;
  }, []);

  const parseExcelDate = useCallback((dateValue) => {
    if (!dateValue) return "";
    if (typeof dateValue === "number") {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
      return isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
    }
    const date = new Date(String(dateValue).trim());
    return isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  }, []);

  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const rawRows = await readExcelFile(file);
      const newEntries = rawRows.map((row) => {
        const entry = {};
        Object.entries(row).forEach(([k, v]) => {
          const normKey = k ? k.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "") : "";
          entry[normKey] = v !== null && v !== undefined ? String(v) : "";
        });
        let products = [];
        if (entry.products) {
          try {
            products = JSON.parse(entry.products);
            if (!Array.isArray(products)) products = [products];
          } catch {
            products = [{ productType: String(entry.producttype || "Unknown").trim(), size: String(entry.size || "N/A").trim(), spec: String(entry.spec || "N/A").trim(), qty: Number(entry.qty) || 1, unitPrice: Number(entry.unitprice) || 0, serialNos: entry.serialnos ? String(entry.serialnos).split(",").map((s) => s.trim()).filter(Boolean) : [], modelNos: entry.modelnos ? String(entry.modelnos).split(",").map((m) => m.trim()).filter(Boolean) : [], gst: String(entry.gst || "18").trim() }];
          }
        } else {
          products = [{ productType: String(entry.producttype || "Unknown").trim(), size: String(entry.size || "N/A").trim(), spec: String(entry.spec || "N/A").trim(), qty: Number(entry.qty) || 1, unitPrice: Number(entry.unitprice) || 0, serialNos: entry.serialnos ? String(entry.serialnos).split(",").map((s) => s.trim()).filter(Boolean) : [], modelNos: entry.modelnos ? String(entry.modelnos).split(",").map((m) => m.trim()).filter(Boolean) : [], gst: String(entry.gst || "18").trim() }];
        }
        return {
          soDate: parseExcelDate(entry.sodate) || new Date().toISOString().slice(0, 10),
          dispatchFrom: String(entry.dispatchfrom || "").trim(), dispatchDate: parseExcelDate(entry.dispatchdate) || "",
          name: String(entry.name || "").trim(), city: String(entry.city || "").trim(), state: String(entry.state || "").trim(),
          pinCode: String(entry.pincode || "").trim(), contactNo: String(entry.contactno || "").trim(),
          customerEmail: String(entry.customeremail || "").trim(), customername: String(entry.customername || "").trim(),
          products, total: Number(entry.total) || 0, paymentCollected: String(entry.paymentcollected || "").trim(),
          paymentMethod: String(entry.paymentmethod || "").trim(), paymentDue: String(entry.paymentdue || "").trim(),
          paymentTerms: String(entry.paymentterms || "").trim(), neftTransactionId: String(entry.nefttransactionid || "").trim(),
          chequeId: String(entry.chequeid || "").trim(), freightcs: String(entry.freightcs || "").trim(),
          freightstatus: String(entry.freightstatus || "Extra").trim(), installchargesstatus: String(entry.installchargesstatus || "Extra").trim(),
          orderType: String(entry.ordertype || "B2C").trim(), gemOrderNumber: String(entry.gemordernumber || "").trim(),
          deliveryDate: parseExcelDate(entry.deliverydate) || "", installation: String(entry.installation || "N/A").trim(),
          installationStatus: String(entry.installationstatus || "Pending").trim(), remarksByInstallation: String(entry.remarksbyinstallation || "").trim(),
          dispatchStatus: String(entry.dispatchstatus || "Not Dispatched").trim(), salesPerson: String(entry.salesperson || "").trim(),
          report: String(entry.report || "").trim(), company: String(entry.company || "Promark").trim(),
          transporter: String(entry.transporter || "").trim(), transporterDetails: String(entry.transporterdetails || "").trim(),
          receiptDate: parseExcelDate(entry.receiptdate) || "", shippingAddress: String(entry.shippingaddress || "").trim(),
          billingAddress: String(entry.billingaddress || "").trim(), invoiceNo: String(entry.invoiceno || "").trim(),
          invoiceDate: parseExcelDate(entry.invoicedate) || "", fulfillingStatus: String(entry.fulfillingstatus || "Pending").trim(),
          remarksByProduction: String(entry.remarksbyproduction || "").trim(), remarksByAccounts: String(entry.remarksbyaccounts || "").trim(),
          paymentReceived: String(entry.paymentreceived || "Not Received").trim(), billNumber: String(entry.billnumber || "").trim(),
          piNumber: String(entry.pinumber || "").trim(), remarksByBilling: String(entry.remarksbybilling || "").trim(),
          verificationRemarks: String(entry.verificationremarks || "").trim(), billStatus: String(entry.billstatus || "Pending").trim(),
          completionStatus: String(entry.completionstatus || "In Progress").trim(), fulfillmentDate: parseExcelDate(entry.fulfillmentdate) || "",
          remarks: String(entry.remarks || "").trim(), sostatus: String(entry.sostatus || "Pending for Approval").trim(),
          gstno: String(entry.gstno || "").trim(),
        };
      });
      await furniApi.post("/api/bulk-orders", newEntries, { headers: { "Content-Type": "application/json" } });
      await fetchPaginatedOrders();
      fetchDashboardCounts();
    } catch (error) {
      console.error("Error uploading entries:", error);
      let userFriendlyMessage = "Something went wrong while uploading your file.";
      if (error.response) {
        if (error.response.status === 400) userFriendlyMessage = "The file format seems incorrect. Please check your Excel template.";
        else if (error.response.status === 413) userFriendlyMessage = "The file is too large. Please upload a smaller file.";
        else userFriendlyMessage = error.response.data?.details?.join(", ") || error.response.data?.message || userFriendlyMessage;
      } else if (error.request) { userFriendlyMessage = "Could not connect to the server. Please check your internet connection."; }
      toast.error(userFriendlyMessage, { position: "top-right", autoClose: 5000 });
    }
  }, [parseExcelDate, fetchPaginatedOrders, fetchDashboardCounts]);

  const handleExport = useCallback(async () => {
    try {
      const response = await furniApi.get("/api/export", { params: { search: searchTerm, approval: productionStatusFilter, orderType: productStatus, dispatch: dispatchFilter, salesPerson: salesPersonFilter, dispatchFrom: "All", financialYear: financialYearFilter, startDate: startDate ? startDate.toISOString() : null, endDate: endDate ? endDate.toISOString() : null, dashboardFilter: trackerFilter }, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `orders_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success("Orders exported successfully!");
    } catch (error) {
      console.error("Error exporting orders:", error);
      toast.error("Failed to export orders!");
    }
  }, [searchTerm, productionStatusFilter, productStatus, dispatchFilter, financialYearFilter, startDate, endDate, trackerFilter]);

  const formatTimestamp = useCallback((timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const notificationPopover = (
    <NotificationPopover id="notification-popover">
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.2rem" }}>🔔</span>
          <span style={{ color: "white", fontWeight: "700", fontSize: "1rem" }}>Notifications</span>
          {unreadCount > 0 && (
            <span style={{ background: "#ef4444", color: "white", borderRadius: "20px", padding: "1px 8px", fontSize: "0.72rem", fontWeight: "700" }}>{unreadCount}</span>
          )}
        </div>
        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.75rem" }}>{notifications.length} total</span>
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
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <span style={{ background: `${actionColor}18`, color: actionColor, borderRadius: "6px", padding: "1px 7px", fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      {actionIcon} {notif.action || "updated"}
                    </span>
                    {notif.orderId && (
                      <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: "600" }}>#{notif.orderId}</span>
                    )}
                  </div>
                  <NotificationText isRead={notif.isRead}>{notif.message.split(" — ")[0]}</NotificationText>
                  {notif.changes && notif.changes.length > 0 && (
                    <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "3px" }}>
                      {notif.changes.slice(0, 4).map((ch, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", background: "#f8fafc", borderRadius: "6px", padding: "3px 8px", border: "1px solid #e2e8f0" }}>
                          <span style={{ color: "#64748b", fontWeight: "600" }}>{ch.label}</span>
                          <span style={{ color: "#94a3b8", fontSize: "0.7rem" }}>·</span>
                          <span style={{ background: "#fee2e2", color: "#dc2626", borderRadius: "4px", padding: "0 5px", textDecoration: "line-through", fontSize: "0.7rem" }}>{ch.oldValue}</span>
                          <span style={{ color: "#94a3b8" }}>→</span>
                          <span style={{ background: "#dcfce7", color: "#16a34a", borderRadius: "4px", padding: "0 5px", fontWeight: "600", fontSize: "0.7rem" }}>{ch.newValue}</span>
                        </div>
                      ))}
                      {notif.changes.length > 4 && (
                        <span style={{ fontSize: "0.7rem", color: "#94a3b8", paddingLeft: "4px" }}>+{notif.changes.length - 4} more changes</span>
                      )}
                    </div>
                  )}
                </div>
                <NotificationTime>{formatTimestamp(notif.timestamp)}</NotificationTime>
              </NotificationItem>
            );
          })
        ) : (
          <div style={{ textAlign: "center", padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            <div style={{ fontSize: "3rem", opacity: 0.4 }}>🔕</div>
            <div style={{ color: "#94a3b8", fontWeight: "600", fontSize: "0.9rem" }}>All caught up!</div>
            <div style={{ color: "#cbd5e1", fontSize: "0.8rem" }}>No new notifications</div>
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <NotificationActions>
          <MarkReadButton onClick={markAllRead}>✓ Mark All Read</MarkReadButton>
          <ClearButton onClick={clearNotifications}>🗑 Clear All</ClearButton>
        </NotificationActions>
      )}
    </NotificationPopover>
  );

  const tableHeaders = ["Seq No","Order ID","SO Date","Financial Year","Customer Name","Contact Person Name","Contact No","Customer Email","SO Status","Actions","Alternate No","City","State","Pin Code","GST No","Shipping Address","Billing Address","Description of Goods","Product Category","Size","Spec","Qty","Unit Price","GST","Total","Payment Collected","Payment Method","Payment Due","Payment Terms","Payment Received","Freight Charges","Actual Freight","Installation Status","Installation Report","Transporter Details","Dispatch From","Dispatch Status","Signed Stamp Receiving","Stamp Attach","Order Type","Report","Bill Status","Production Status","Bill Number","PI Number","Sales Person","Company","Created By","Remarks"];

  return (
    <>
      <style>{tableStyles}</style>
      <div style={{ background: "rgb(230, 240, 250)", padding: "25px 40px", display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "center", justifyContent: "space-between" }}>
        <FilterSection
          debouncedSetSearchTerm={debouncedSetSearchTerm} userRole={userRole}
          notificationPopover={notificationPopover} notifications={notifications}
          startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate}
          productionStatusFilter={productionStatusFilter} setProductionStatusFilter={setProductionStatusFilter}
          installStatusFilter={installStatusFilter} setInstallStatusFilter={setInstallStatusFilter}
          productStatus={productStatus} setProductStatusFilter={setProductStatusFilter}
          accountsStatusFilter={accountsStatusFilter} setAccountsStatusFilter={setAccountsStatusFilter}
          dispatchFilter={dispatchFilter} setDispatchFilter={setDispatchFilter}
          financialYearFilter={financialYearFilter} setFinancialYearFilter={setFinancialYearFilter}
          financialYearOptions={FINANCIAL_YEAR_OPTIONS}
          salesPersonFilter={salesPersonFilter} setSalesPersonFilter={setSalesPersonFilter}
          uniqueSalesPersons={uniqueSalesPersons}
          handleReset={handleReset}
        />
      </div>
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #e6f0fa, #f3e8ff)", padding: "30px", fontFamily: "'Poppins', sans-serif" }}>
        {(userRole === "SuperAdmin" || userRole === "GlobalAdmin" || userRole === "Admin" || userRole === "salesperson") && (
          <OrderTracker userRole={userRole} onFilterChange={setTrackerFilter} initialFilter={trackerFilter} counts={{ ...dashboardCounts, all: allOrdersCount }} />
        )}
        <div className="my-4" style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", borderRadius: "20px", padding: "10px 16px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.18)", display: "inline-flex", alignItems: "center", transition: "all 0.3s ease" }}>
          <h4 style={{ color: "#ffffff", fontWeight: "700", fontSize: "0.85rem", margin: 0, letterSpacing: "0.4px" }} title="Total number of entries">Total Results: {totalOrders}</h4>
        </div>
        <div className="mx-3 my-4" style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", borderRadius: "20px", padding: "10px 16px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.18)", display: "inline-flex", alignItems: "center", transition: "all 0.3s ease" }}>
          <h4 style={{ color: "#ffffff", fontWeight: "700", fontSize: "0.85rem", margin: 0, letterSpacing: "0.4px" }} title="Total quantity of products">Total Product Qty: {calculateTotalResults}</h4>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginBottom: "30px", flexWrap: "wrap" }}>
          {(userRole === "Admin" || userRole === "SuperAdmin" || userRole === "GlobalAdmin" || userRole === "salesperson") && (
            <label style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", color: "white", padding: "12px 24px", borderRadius: "30px", fontWeight: "600", fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 6px 16px rgba(0,0,0,0.25)", transition: "all 0.4s ease" }}
              onMouseEnter={(e) => { e.target.style.transform = "scale(1.05)"; e.target.style.boxShadow = "0 10px 24px rgba(0,0,0,0.3)"; }}
              onMouseLeave={(e) => { e.target.style.transform = "scale(1)"; e.target.style.boxShadow = "0 6px 16px rgba(0,0,0,0.25)"; }}>
              <Upload size={18} /> Bulk Upload
              <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} style={{ display: "none" }} />
            </label>
          )}
        
          {userRole === "GlobalAdmin" && (
            <Button onClick={handleExport} style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", border: "none", padding: "12px 24px", borderRadius: "30px", color: "white", fontWeight: "600", fontSize: "1rem", boxShadow: "0 6px 16px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", gap: "8px", transition: "all 0.4s ease" }}
              onMouseEnter={(e) => { e.target.style.transform = "scale(1.05)"; e.target.style.boxShadow = "0 10px 24px rgba(0,0,0,0.3)"; }}
              onMouseLeave={(e) => { e.target.style.transform = "scale(1)"; e.target.style.boxShadow = "0 6px 16px rgba(0,0,0,0.25)"; }}>
              <Download size={18} /> Export Orders
            </Button>
          )}  <Button onClick={() => setIsAddModalOpen(true)} style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", border: "none", padding: "12px 24px", borderRadius: "30px", color: "white", fontWeight: "600", fontSize: "1rem", boxShadow: "0 6px 16px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", gap: "8px", transition: "all 0.4s ease" }}
            onMouseEnter={(e) => { e.target.style.transform = "scale(1.05)"; e.target.style.boxShadow = "0 10px 24px rgba(0,0,0,0.3)"; }}
            onMouseLeave={(e) => { e.target.style.transform = "scale(1)"; e.target.style.boxShadow = "0 6px 16px rgba(0,0,0,0.25)"; }}>
            <span style={{ fontSize: "1.2rem" }}>+</span> Add Order
          </Button>
          {(userRole === "Admin" || userRole === "SuperAdmin" || userRole === "GlobalAdmin" || userRole === "salesperson") && (
            <Button variant="primary" onClick={() => setIsDashboardOpen(true)} style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", border: "none", padding: "10px 20px", borderRadius: "30px", fontSize: "1rem", fontWeight: "600", marginLeft: "10px", display: "flex", alignItems: "center", gap: "8px", transition: "all 0.3s ease" }}
              onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
              onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}>
              <BarChart2 size={18} /> {userRole === "salesperson" ? "My Analytics" : "View Analytics"}
            </Button>
          )}
          {(userRole === "Admin" || userRole === "SuperAdmin" || userRole === "GlobalAdmin") && (
            <Button
              onClick={() => setIsTeamBuilderOpen(true)}
              style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", border: "none", padding: "12px 24px", borderRadius: "30px", color: "white", fontWeight: "600", fontSize: "1rem", boxShadow: "0 6px 16px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", gap: "8px", transition: "all 0.4s ease" }}
              onMouseEnter={(e) => { e.target.style.transform = "scale(1.05)"; e.target.style.boxShadow = "0 10px 24px rgba(0,0,0,0.3)"; }}
              onMouseLeave={(e) => { e.target.style.transform = "scale(1)"; e.target.style.boxShadow = "0 6px 16px rgba(0,0,0,0.25)"; }}
            >
              <Users size={18} />
              Manage Team
            </Button>
          )}
        </div>
        <SalesDashboardDrawer isOpen={isDashboardOpen} onClose={() => setIsDashboardOpen(false)} orders={orders} userRole={userRole} />
        {isTeamBuilderOpen && (
          <TeamBuilder isOpen={isTeamBuilderOpen} onClose={() => setIsTeamBuilderOpen(false)} userId={userId} />
        )}
        {isAddModalOpen && (<AddEntry onSubmit={handleAddEntry} onClose={() => setIsAddModalOpen(false)} />)}
        {isViewModalOpen && (<ViewEntry isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} entry={selectedOrder} />)}
        {isDeleteModalOpen && (<DeleteModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onDelete={handleDelete} itemId={selectedOrder?._id} />)}
        {isEditModalOpen && (<EditEntry isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onEntryUpdated={handleEntryUpdated} entryToEdit={selectedOrder} />)}
        <div className="sales-table-container">
          {isLoading && (<div className="loader-overlay"><div className="gradient-spinner" /></div>)}
          <table className="sales-table">
            <thead>
              <tr>
                {tableHeaders.map((header, index) => (
                  <OverlayTrigger key={index} trigger="click" placement="top"
                    show={openTooltipId === `header-${index}`}
                    onToggle={(show) => { if (show) { setOpenTooltipId(`header-${index}`); } else { setOpenTooltipId(null); } }}
                    overlay={<Tooltip id={`tooltip-${index}`}>{header}</Tooltip>}>
                    <th style={{ width: `${columnWidths[index]}px`, minWidth: `${columnWidths[index]}px`, maxWidth: `${columnWidths[index]}px` }}>{header}</th>
                  </OverlayTrigger>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={tableHeaders.length} style={{ padding: 0, border: "none" }}>
                  <AutoSizer disableHeight>
                    {({ width }) => (
                      <List className="list-container" height={600} itemCount={filteredOrders.length} itemSize={50} width={Math.max(width, totalTableWidth)}
                        itemData={{ orders: filteredOrders, handleViewClick, handleEditClick, handleDeleteClick, userRole, userId, isOrderComplete, columnWidths, openTooltipId, setOpenTooltipId, currentPage }}>
                        {Row}
                      </List>
                    )}
                  </AutoSizer>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: "20px", marginBottom: "20px" }}>
          <Pagination count={totalPages} page={currentPage} onChange={(event, value) => setCurrentPage(value)} color="primary" size="large"
            sx={{ "& .MuiPaginationItem-root": { color: "#6a11cb", borderColor: "#e0e0e0", "&:hover": { backgroundColor: "rgba(106, 17, 203, 0.1)" } }, "& .MuiPaginationItem-root.Mui-selected": { background: "linear-gradient(135deg, #2575fc, #6a11cb)", color: "#fff", border: "none", "&:hover": { background: "linear-gradient(135deg, #2575fc, #6a11cb)" } } }} />
        </div>
      </div>
      <footer style={{ margin: 0, textAlign: "center", color: "white", padding: "20px", background: "linear-gradient(135deg, #2575fc, #6a11cb)", width: "100vw", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", fontSize: "1rem", fontWeight: "500", bottom: 0, left: 0, boxSizing: "border-box" }}>
        \u00a9 2025 Sales Order Management. All rights reserved.
      </footer>
    </>
  );
};

export default Sales;
