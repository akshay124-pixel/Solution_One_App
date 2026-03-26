import React, { useState, useEffect, useMemo, useCallback } from "react";
import styled from "styled-components";
import { Button, Dropdown, Spinner } from "react-bootstrap";
import { X, Download, Calendar, ArrowRight } from "lucide-react";
import furniApi from "../../axiosSetup";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const FURNI_BASE = process.env.REACT_APP_FURNI_URL || "http://localhost:5050/api/furni";
const socketOrigin = (() => {
  try {
    return new URL(FURNI_BASE).origin;
  } catch {
    return FURNI_BASE;
  }
})();

// Styled Components
const DrawerOverlay = styled.div`
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5); z-index: 999;
  display: ${(props) => (props.isOpen ? "block" : "none")};
`;
const DrawerContainer = styled.div`
  position: fixed; bottom: 0; left: 0; right: 0;
  height: 80vh; max-height: 80vh;
  background: linear-gradient(135deg, #e6f0fa, #f3e8ff);
  border-top-left-radius: 20px; border-top-right-radius: 20px;
  box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.2); z-index: 1000;
  transform: translateY(${(props) => (props.isOpen ? "0" : "100%")});
  transition: transform 0.4s ease-in-out; overflow: hidden;
  padding: 20px; font-family: "Poppins", sans-serif;
  display: flex; flex-direction: column;
  @media (max-width: 768px) { height: 90vh; max-height: 90vh; padding: 10px; }
`;
const DrawerHeader = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 20px; background: linear-gradient(135deg, #2575fc, #6a11cb);
  border-radius: 12px; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;
  @media (max-width: 768px) { flex-direction: column; align-items: flex-start; padding: 8px; gap: 8px; }
`;
const DrawerTitle = styled.h3`
  color: white; font-weight: 700; font-size: 1.2rem; margin: 0;
  @media (max-width: 768px) { font-size: 1rem; display: flex; align-items: center; justify-content: center; width: 100%; text-align: center; }
`;
const ButtonContainer = styled.div`
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  @media (max-width: 768px) { flex-direction: column; width: 100%; gap: 8px; }
`;
const CloseButton = styled(Button)`
  background: #dc3545; border: none; padding: 8px 16px; border-radius: 8px;
  display: flex; align-items: center; gap: 5px; font-size: 0.9rem;
  &:hover { background: #b02a37; }
  @media (max-width: 768px) { width: 100%; padding: 10px; font-size: 0.8rem; }
`;
const ExportButton = styled(Button)`
  background: #28a745; border: none; padding: 8px 16px; border-radius: 8px;
  display: flex; align-items: center; gap: 5px; font-size: 0.9rem;
  &:hover { background: #218838; }
  @media (max-width: 768px) { width: 100%; padding: 10px; font-size: 0.8rem; }
`;
const ResetButton = styled(Button)`
  background: #6b7280; border: none; padding: 8px 16px; border-radius: 8px;
  display: flex; align-items: center; gap: 5px; font-size: 0.9rem;
  &:hover { background: #4b5563; }
  @media (max-width: 768px) { width: 100%; padding: 10px; font-size: 0.8rem; }
`;
const DatePickerContainer = styled.div`
  position: relative; display: flex; flex-direction: column; gap: 5px; z-index: 2000;
  @media (max-width: 768px) { width: 100%; }
`;
const StyledDatePicker = styled(DatePicker)`
  padding: 8px 30px 8px 10px; border: 1px solid #d1d5db; border-radius: 6px;
  font-size: 0.9rem; width: 140px; background: white; color: #1e3a8a;
  font-family: "Poppins", sans-serif;
  &:focus { outline: none; border-color: #2575fc; box-shadow: 0 0 0 3px rgba(37, 117, 252, 0.3); }
  &::placeholder { color: #6b7280; }
  @media (max-width: 768px) { width: 100%; font-size: 0.8rem; padding: 8px; }
`;
const DatePickerIcon = styled(Calendar)`
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  color: #6b7280; width: 18px; height: 18px; pointer-events: none;
  @media (max-width: 768px) { right: 8px; width: 16px; height: 16px; }
`;
const DatePickerPopup = styled.div`
  .react-datepicker { z-index: 2000 !important; border: 1px solid #d1d5db; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); font-family: "Poppins", sans-serif; }
  .react-datepicker__triangle { display: none; }
  .react-datepicker__header { background: linear-gradient(135deg, #2575fc, #6a11cb); color: white; border-bottom: none; }
  .react-datepicker__current-month, .react-datepicker__day-name { color: white; font-weight: 500; }
  .react-datepicker__day { color: #1e3a8a; &:hover { background: #f0f7ff; } }
  .react-datepicker__day--selected, .react-datepicker__day--keyboard-selected { background: #2575fc; color: white; }
  .react-datepicker__day--outside-month { color: #6b7280; }
  @media (max-width: 768px) { .react-datepicker { width: 100%; font-size: 0.8rem; } }
`;
const StyledDropdownToggle = styled(Dropdown.Toggle)`
  background: #487fdfff; border: 1px solid rgba(255, 255, 255, 0.1); padding: 8px 16px;
  border-radius: 8px; color: white; font-weight: 600; font-size: 0.9rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); transition: all 0.3s ease-in-out;
  max-width: 135px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;
  &:hover { transform: scale(1.05); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12); opacity: 0.9; }
  @media (max-width: 768px) { width: 100%; max-width: none; font-size: 0.8rem; padding: 10px; }
`;
const StyledDropdownMenu = styled(Dropdown.Menu)`
  border-radius: 0.75rem; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  background: white; border: none; padding: 0.5rem; min-width: 180px;
  @media (max-width: 768px) { min-width: 100%; }
`;
const StyledDropdownItem = styled(Dropdown.Item)`
  padding: 0.5rem 0.75rem; color: #1e40af; font-weight: 500; font-size: 0.9rem;
  transition: background 0.3s ease-in-out;
  &:hover { background: rgba(59, 130, 246, 0.1); }
  &:focus, &:active { background: rgba(59, 130, 246, 0.2); color: #1e40af; }
`;
const TableContainer = styled.div`
  flex: 1; overflow-y: auto; border-radius: 12px; background: white;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2); max-height: calc(80vh - 100px);
  @media (max-width: 768px) { max-height: calc(90vh - 120px); overflow-x: auto; }
`;
const DashboardTable = styled.table`
  width: 100%; border-collapse: collapse; table-layout: fixed;
  @media (max-width: 768px) { min-width: 1080px; }
`;
const TotalHeaderRow = styled.tr`
  background: linear-gradient(135deg, #1e3a8a, #4b0082); position: sticky; top: 0; z-index: 11;
`;
const TableHeaderRow = styled.tr`
  background: linear-gradient(135deg, #2575fc, #6a11cb); position: sticky; top: 44px; z-index: 10;
  @media (max-width: 768px) { top: 35px; }
`;
const colWidths = { 1: "20%", 2: "12%", 3: "16%", 4: "16%", 5: "16%", 6: "12%", 7: "12%" };
const TableHeader = styled.th`
  padding: 12px 15px; color: white; font-weight: 600; font-size: 0.95rem;
  text-transform: uppercase; text-align: left;
  ${Object.entries(colWidths).map(([n, w]) => `&:nth-child(${n}) { width: ${w}; }`).join("")}
  @media (max-width: 768px) { font-size: 0.8rem; padding: 8px; }
`;
const TotalHeader = styled.th`
  padding: 12px 15px; color: white; font-weight: 700; font-size: 1rem; text-align: left;
  ${Object.entries(colWidths).map(([n, w]) => `&:nth-child(${n}) { width: ${w}; }`).join("")}
  @media (max-width: 768px) { font-size: 0.8rem; padding: 8px; }
`;
const TableCell = styled.td`
  padding: 12px 15px; border-bottom: 1px solid #e6f0fa; font-size: 0.9rem; color: #1e3a8a;
  text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  ${Object.entries(colWidths).map(([n, w]) => `&:nth-child(${n}) { width: ${w}; }`).join("")}
  @media (max-width: 768px) { font-size: 0.75rem; padding: 8px; }
`;
const TableRow = styled.tr`&:hover { background-color: #f0f7ff; }`;

const FilterDropdown = ({ id, label, value, onChange, options, tableId }) => (
  <Dropdown>
    <StyledDropdownToggle id={id} aria-controls={tableId}>
      {value === "All" ? label : value}
    </StyledDropdownToggle>
    <StyledDropdownMenu>
      {options.map((option) => (
        <StyledDropdownItem key={option} onClick={() => onChange(option)} aria-label={`Select ${label} filter: ${option}`}>
          {option}
        </StyledDropdownItem>
      ))}
    </StyledDropdownMenu>
  </Dropdown>
);

const SalesDashboardDrawer = ({ isOpen, onClose, userRole }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [productionStatusFilter, setProductionStatusFilter] = useState("All");
  const [productStatus, setProductStatusFilter] = useState("All");
  const [installStatusFilter, setInstallStatusFilter] = useState("All");
  const [accountsStatusFilter, setAccountsStatusFilter] = useState("All");
  const [dispatchFilter, setDispatchFilter] = useState("All");
  // userRole comes from props (passed by Sales.js which reads localStorage.getItem("furniRole"))

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.startDate = startDate.toISOString();
      if (endDate) params.endDate = endDate.toISOString();
      if (productionStatusFilter && productionStatusFilter !== "All") params.productionStatus = productionStatusFilter;
      if (productStatus && productStatus !== "All") params.productType = productStatus;
      if (installStatusFilter && installStatusFilter !== "All") params.installStatus = installStatusFilter;
      if (accountsStatusFilter && accountsStatusFilter !== "All") params.accountsStatus = accountsStatusFilter;
      if (dispatchFilter && dispatchFilter !== "All") params.dispatchStatus = dispatchFilter;

      const response = await furniApi.get("/api/get-analytics", { params });
      setOrders(response.data || []);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to fetch analytics data.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, productionStatusFilter, productStatus, installStatusFilter, accountsStatusFilter, dispatchFilter]);

  const overallTotals = useMemo(() => {
    return orders.reduce(
      (acc, data) => ({
        totalOrders: acc.totalOrders + (data.totalOrders || 0),
        totalAmount: acc.totalAmount + (data.totalAmount || 0),
        totalPaymentCollected: acc.totalPaymentCollected + (data.totalPaymentCollected || 0),
        totalPaymentDue: acc.totalPaymentDue + (data.totalPaymentDue || 0),
        dueOver30Days: acc.dueOver30Days + (data.dueOver30Days || 0),
        totalUnitPrice: acc.totalUnitPrice + (data.totalUnitPrice || 0),
      }),
      { totalOrders: 0, totalAmount: 0, totalPaymentCollected: 0, totalPaymentDue: 0, dueOver30Days: 0, totalUnitPrice: 0 }
    );
  }, [orders]);

  const analyticsData = orders;

  // Socket.IO — real-time updates
  useEffect(() => {
    if (isOpen) {
      fetchOrders();
      const socket = io(socketOrigin, {
        path: process.env.REACT_APP_FURNI_SOCKET_PATH || "/furni/socket.io",
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        withCredentials: true,
        transports: ["websocket", "polling"],
      });

      socket.on("connect", () => {
        const userId = localStorage.getItem("furniUserId");
        const role = localStorage.getItem("furniRole");
        socket.emit("join", { userId, role });
      });

      socket.on("orderUpdate", ({ operationType, fullDocument }) => {
        if (operationType !== "insert" || !fullDocument) return;
        const currentUserId = localStorage.getItem("furniUserId");
        const role = localStorage.getItem("furniRole");
        const ownerId =
          typeof fullDocument.createdBy === "object" && fullDocument.createdBy?._id
            ? fullDocument.createdBy._id
            : String(fullDocument.createdBy || "");
        const isAuthorized = role === "SuperAdmin" || role === "GlobalAdmin" || ownerId === currentUserId;
        if (!isAuthorized) return;
        setOrders((prev) => {
          if (prev.some((o) => o._id === fullDocument._id)) return prev;
          return [fullDocument, ...prev];
        });
      });

      socket.on("reconnect", () => { fetchOrders(); });

      return () => { socket.disconnect(); };
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) fetchOrders();
  }, [productionStatusFilter, productStatus, installStatusFilter, accountsStatusFilter, dispatchFilter, startDate, endDate, isOpen, fetchOrders]);

  const handleExportToExcel = () => {
    try {
      const exportData = [
        {
          "Created By": "Overall Totals",
          "Total Orders": overallTotals.totalOrders,
          "Total Amount (₹)": overallTotals.totalAmount.toFixed(2),
          "Payment Collected (₹)": overallTotals.totalPaymentCollected.toFixed(2),
          "Payment Due (₹)": overallTotals.totalPaymentDue.toFixed(2),
          "Due Over 30 Days (₹)": overallTotals.dueOver30Days.toFixed(2),
          "Total Unit Price (₹)": overallTotals.totalUnitPrice.toFixed(2),
        },
        {},
        ...analyticsData.map((data) => ({
          "Created By": data.createdBy,
          "Total Orders": data.totalOrders,
          "Total Amount (₹)": data.totalAmount.toFixed(2),
          "Payment Collected (₹)": data.totalPaymentCollected.toFixed(2),
          "Payment Due (₹)": data.totalPaymentDue.toFixed(2),
          "Due Over 30 Days (₹)": data.dueOver30Days.toFixed(2),
          "Total Unit Price (₹)": data.totalUnitPrice.toFixed(2),
        })),
      ];
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      worksheet["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Analytics");
      const fileBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([fileBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Sales_Analytics_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Exported sales analytics to Excel!");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("Failed to export to Excel. Please try again.");
    }
  };

  const handleReset = useCallback(() => {
    setStartDate(null);
    setEndDate(null);
    setProductionStatusFilter("All");
    setProductStatusFilter("All");
    setInstallStatusFilter("All");
    setAccountsStatusFilter("All");
    setDispatchFilter("All");
  }, []);

  return (
    <>
      <DrawerOverlay isOpen={isOpen} onClick={onClose} />
      <DrawerContainer isOpen={isOpen}>
        <DrawerHeader>
          <DrawerTitle>{userRole === "salesperson" ? "My Analytics" : "Sales Orders Analytics"}</DrawerTitle>
          <ButtonContainer>
            <FilterDropdown id="production-status-filter" label="Production Status" value={productionStatusFilter} onChange={setProductionStatusFilter} options={["All", "Pending", "Under Process", "Partial Dispatch", "Fulfilled"]} tableId="sales-analytics-table" />
            <FilterDropdown id="product-status-filter" label="Product Type" value={productStatus} onChange={setProductStatusFilter} options={["All", "Chairs", "Tables", "Sheet Metal", "Desking", "Solid Wood", "Boards", "Lab Tables", "Others"]} tableId="sales-analytics-table" />
            <FilterDropdown id="installation-status-filter" label="Installation Status" value={installStatusFilter} onChange={setInstallStatusFilter} options={["All", "Pending", "In Progress", "Completed"]} tableId="sales-analytics-table" />
            <FilterDropdown id="dispatch-status-filter" label="Dispatch Status" value={dispatchFilter} onChange={setDispatchFilter} options={["All", "Not Dispatched", "Dispatched", "Delivered"]} tableId="sales-analytics-table" />
            <FilterDropdown id="accounts-status-filter" label="Accounts Status" value={accountsStatusFilter} onChange={setAccountsStatusFilter} options={["All", "Not Received", "Received"]} tableId="sales-analytics-table" />
            <DatePickerPopup>
              <DatePickerContainer>
                <StyledDatePicker selected={startDate} onChange={(date) => setStartDate(date)} selectsStart startDate={startDate} endDate={endDate} placeholderText="Start Date" dateFormat="dd/MM/yyyy" isClearable aria-label="Select start date" />
                <DatePickerIcon size={18} />
              </DatePickerContainer>
            </DatePickerPopup>
            <DatePickerPopup>
              <DatePickerContainer>
                <StyledDatePicker selected={endDate} onChange={(date) => setEndDate(date)} selectsEnd startDate={startDate} endDate={endDate} minDate={startDate} placeholderText="End Date" dateFormat="dd/MM/yyyy" isClearable aria-label="Select end date" />
                <DatePickerIcon size={18} />
              </DatePickerContainer>
            </DatePickerPopup>
            <ResetButton onClick={handleReset}><ArrowRight size={16} />Reset</ResetButton>
            {(userRole === "GlobalAdmin") && (
              <ExportButton onClick={handleExportToExcel}><Download size={18} />Export Excel</ExportButton>
            )}
            <CloseButton onClick={onClose}><X size={18} />Close</CloseButton>
          </ButtonContainer>
        </DrawerHeader>
        <TableContainer>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 20px", background: "rgba(255, 255, 255, 0.8)", borderRadius: "16px" }}>
              <Spinner animation="border" variant="primary" style={{ width: "3.5rem", height: "3.5rem", marginBottom: "20px" }} />
              <span style={{ fontSize: "1.2rem", fontWeight: "600", color: "#2563eb" }}>Fetching Analytics Data...</span>
            </div>
          ) : (
            <DashboardTable aria-label="Sales analytics table">
              <thead>
                <TotalHeaderRow>
                  <TotalHeader>Overall Totals</TotalHeader>
                  <TotalHeader>{overallTotals.totalOrders}</TotalHeader>
                  <TotalHeader>₹{overallTotals.totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</TotalHeader>
                  <TotalHeader>₹{overallTotals.totalPaymentCollected.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</TotalHeader>
                  <TotalHeader>₹{overallTotals.totalPaymentDue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</TotalHeader>
                  <TotalHeader>₹{overallTotals.dueOver30Days.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</TotalHeader>
                  <TotalHeader>₹{overallTotals.totalUnitPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</TotalHeader>
                </TotalHeaderRow>
                <TableHeaderRow>
                  <TableHeader>Sales Persons</TableHeader>
                  <TableHeader>Total Orders</TableHeader>
                  <TableHeader>Total Amount (₹)</TableHeader>
                  <TableHeader>Payment Collected (₹)</TableHeader>
                  <TableHeader>Payment Due (₹)</TableHeader>
                  <TableHeader>Due Over 30 Days (₹)</TableHeader>
                  <TableHeader>Total Unit Price (₹)</TableHeader>
                </TableHeaderRow>
              </thead>
              <tbody>
                {analyticsData.length > 0 ? (
                  analyticsData.map((data, index) => (
                    <TableRow key={index}>
                      <TableCell>{data.createdBy}</TableCell>
                      <TableCell>{data.totalOrders}</TableCell>
                      <TableCell>₹{data.totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</TableCell>
                      <TableCell>₹{data.totalPaymentCollected.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</TableCell>
                      <TableCell>₹{data.totalPaymentDue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</TableCell>
                      <TableCell>₹{data.dueOver30Days.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</TableCell>
                      <TableCell>₹{data.totalUnitPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} style={{ textAlign: "center" }}>No data available</TableCell>
                  </TableRow>
                )}
              </tbody>
            </DashboardTable>
          )}
        </TableContainer>
      </DrawerContainer>
    </>
  );
};

export default SalesDashboardDrawer;
