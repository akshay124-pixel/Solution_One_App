import React, { useEffect, useState, useCallback, useRef } from "react";
import furniApi from "../axiosSetup";
import { Button, Modal, Badge } from "react-bootstrap";
import { Spinner } from "react-bootstrap";
import { Accordion, Card } from "react-bootstrap";
import { FaEye } from "react-icons/fa";
import { toast } from "react-toastify";
import { exportToExcel } from "../../utils/excelHelper";
import OutFinishedGoodModal from "./OutFinishedGoodModal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import styled from "styled-components";
import { isOrderComplete } from "../utils/orderUtils";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { FileText } from "lucide-react";

const ModernFilterContainer = styled.div`
  display: flex; flex-direction: row; align-items: flex-end; gap: 12px;
  padding: 20px; border-radius: 16px;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01);
  margin-bottom: 30px; overflow-x: auto; flex-wrap: nowrap;
  &::-webkit-scrollbar { height: 6px; }
  &::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
  &::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  @media (max-width: 1280px) { flex-wrap: wrap; }
`;
const FilterItem = styled.div`
  display: flex; flex-direction: column; gap: 6px; min-width: 140px; flex: 1;
  label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin: 0; }
`;
const ModernInput = styled.input`
  width: 100%; padding: 10px 14px; font-size: 0.9rem; color: #1e293b;
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;
  transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
  &:focus { outline: none; border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
  &::placeholder { color: #94a3b8; }
`;
const ModernSelect = styled.select`
  width: 100%; padding: 10px 14px; font-size: 0.9rem; color: #1e293b;
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;
  cursor: pointer; transition: all 0.2s cubic-bezier(0.4,0,0.2,1); appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2.5em;
  &:focus { outline: none; border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
`;
const ModernButton = styled.button`
  padding: 10px 20px; font-weight: 600; font-size: 0.9rem; border-radius: 10px;
  border: none; cursor: pointer; transition: all 0.2s ease; white-space: nowrap;
  ${props => props.variant === 'reset' && `background: #fee2e2; color: #ef4444; &:hover { background: #fecaca; }`}
  ${props => props.variant === 'primary' && `background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; box-shadow: 0 4px 6px -1px rgba(37,99,235,0.2); &:hover { transform: translateY(-1px); box-shadow: 0 6px 8px -1px rgba(37,99,235,0.3); }`}
`;
const StyledDatePickerWrapper = styled.div`
  display: flex; gap: 10px; width: 100%;
  .react-datepicker-wrapper { width: 100%; }
  .react-datepicker__input-container input {
    width: 100%; padding: 10px 14px; font-size: 0.9rem; color: #1e293b;
    background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; transition: all 0.2s ease;
    &:focus { outline: none; border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 4px rgba(59,130,246,0.1); }
  }
`;

function Finish() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [freightStatusFilter, setFreightStatusFilter] = useState("");
  const [dispatchStatusFilter, setDispatchStatusFilter] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState("");
  const [dispatchFromFilter, setDispatchFromFilter] = useState("");
  const [dispatchedFilter, setDispatchedFilter] = useState("");
  const [productionStatusFilter, setProductionStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [totalResults, setTotalResults] = useState(0);
  const [productQuantity, setProductQuantity] = useState(0);
  const [finishPdfLoading, setFinishPdfLoading] = useState(false);
  const finishPdfRef = useRef(null);

  const dispatchFromOptions = ["", "Patna", "Bareilly", "Ranchi", "Morinda", "Lucknow", "Delhi"];

  const fetchFinishedGoods = useCallback(async () => {
    try {
      const response = await furniApi.get("/api/finished-goods");
      if (response.data.success) {
        const sortedData = response.data.data
          .map((order) => ({ ...order, fulfillingStatus: order.fulfillingStatus === "Fulfilled" ? "Completed" : order.fulfillingStatus }))
          .sort((a, b) => { const dateA = a.soDate ? new Date(a.soDate) : new Date(0); const dateB = b.soDate ? new Date(b.soDate) : new Date(0); return dateB - dateA; });
        setOrders(sortedData);
        setFilteredOrders(sortedData);
      } else {
        throw new Error(response.data.message || "Failed to fetch finished goods data");
      }
    } catch (error) {
      console.error("Error fetching finished goods:", error);
      let userFriendlyMessage = error.response?.data?.message || error.message || "Sorry! We couldn't load the finished goods data right now.";
      if (userFriendlyMessage.includes("Network Error")) userFriendlyMessage = "Unable to connect to the server. Please check your internet connection.";
      else if (userFriendlyMessage.includes("401")) userFriendlyMessage = "Your session has expired. Please log in again to continue.";
      else if (userFriendlyMessage.includes("404")) userFriendlyMessage = "We couldn't find the finished goods data.";
      else if (userFriendlyMessage.includes("500")) userFriendlyMessage = "The server is facing some issues. Please try again later.";
      toast.error(userFriendlyMessage, { position: "top-right", autoClose: 5000 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFinishedGoods(); }, [fetchFinishedGoods]);

  useEffect(() => {
    let filtered = orders.filter((order) => !isOrderComplete(order));
    let totalProductQuantity = 0;
    if (freightStatusFilter) filtered = filtered.filter((order) => order.freightstatus === freightStatusFilter);
    if (dispatchStatusFilter) filtered = filtered.filter((order) => order.dispatchStatus === dispatchStatusFilter);
    if (orderTypeFilter) filtered = filtered.filter((order) => order.orderType === orderTypeFilter);
    if (dispatchFromFilter) filtered = filtered.filter((order) => order.dispatchFrom === dispatchFromFilter);
    if (dispatchedFilter) filtered = filtered.filter((order) => dispatchedFilter === "Dispatched" ? order.dispatchStatus === "Dispatched" || order.dispatchStatus === "Docket Awaited Dispatched" : order.dispatchStatus === "Not Dispatched");
    if (productionStatusFilter) filtered = filtered.filter((order) => order.fulfillingStatus === productionStatusFilter);
    if (startDate || endDate) {
      filtered = filtered.filter((order) => {
        const orderDate = order.soDate ? new Date(order.soDate) : null;
        const startDateAdjusted = startDate ? new Date(startDate.setHours(0, 0, 0, 0)) : null;
        const endDateAdjusted = endDate ? new Date(endDate.setHours(23, 59, 59, 999)) : null;
        return (!startDateAdjusted || (orderDate && orderDate >= startDateAdjusted)) && (!endDateAdjusted || (orderDate && orderDate <= endDateAdjusted));
      });
    }
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((order) => {
        const productDetails = order.products ? order.products.map((p) => `${p.productType} (${p.qty})`).join(", ").toLowerCase() : "";
        const specDetails = order.products ? order.products.map((p) => p.spec || "N/A").join(", ").toLowerCase() : "";
        const sizeDetails = order.products ? order.products.map((p) => p.size || "N/A").join(", ").toLowerCase() : "";
        const totalQty = order.products ? order.products.reduce((sum, p) => sum + (p.qty || 0), 0).toString() : "N/A";
        const modelNos = order.products ? order.products.flatMap((p) => p.modelNos || []).filter(Boolean).join(", ").toLowerCase() || "N/A" : "";
        const matchingProducts = (order.products || []).filter((p) => p.productType?.toLowerCase().includes(lowerSearch));
        if (matchingProducts.length > 0) totalProductQuantity += matchingProducts.reduce((sum, p) => sum + Math.floor(p.qty || 0), 0);
        return (
          (order.orderId || "N/A").toLowerCase().includes(lowerSearch) ||
          (order.customername || "N/A").toLowerCase().includes(lowerSearch) ||
          (order.contactNo || "N/A").toLowerCase().includes(lowerSearch) ||
          (order.shippingAddress || "N/A").toLowerCase().includes(lowerSearch) ||
          productDetails.includes(lowerSearch) || modelNos.includes(lowerSearch) ||
          sizeDetails.includes(lowerSearch) || specDetails.includes(lowerSearch) ||
          totalQty.includes(lowerSearch) ||
          (order.salesPerson || "N/A").toLowerCase().includes(lowerSearch) ||
          (order.freightstatus || "To Pay").toLowerCase().includes(lowerSearch) ||
          (order.fulfillingStatus || "N/A").toLowerCase().includes(lowerSearch) ||
          (order.dispatchStatus || "Not Dispatched").toLowerCase().includes(lowerSearch) ||
          (order.orderType || "N/A").toLowerCase().includes(lowerSearch)
        );
      });
    } else {
      totalProductQuantity = filtered.reduce((sum, order) => sum + (order.products ? order.products.reduce((s, p) => s + Math.floor(p.qty || 0), 0) : 0), 0);
    }
    filtered = filtered.sort((a, b) => { const dateA = a.soDate ? new Date(a.soDate) : new Date(0); const dateB = b.soDate ? new Date(b.soDate) : new Date(0); return dateB - dateA; });
    setFilteredOrders(filtered);
    setTotalResults(filtered.length);
    setProductQuantity(totalProductQuantity);
  }, [freightStatusFilter, dispatchStatusFilter, orderTypeFilter, dispatchFromFilter, dispatchedFilter, productionStatusFilter, searchTerm, startDate, endDate, orders]);

  const uniqueOrderTypes = ["", ...new Set(orders.map((order) => order.orderType || "N/A"))];

  const handleReset = () => {
    setFreightStatusFilter(""); setDispatchStatusFilter(""); setOrderTypeFilter("");
    setDispatchFromFilter(""); setDispatchedFilter(""); setProductionStatusFilter("");
    setSearchTerm(""); setStartDate(null); setEndDate(null);
    const sortedOrders = [...orders].sort((a, b) => { const dateA = a.soDate ? new Date(a.soDate) : new Date(0); const dateB = b.soDate ? new Date(b.soDate) : new Date(0); return dateB - dateA; });
    setFilteredOrders(sortedOrders);
    setTotalResults(sortedOrders.length);
    setProductQuantity(sortedOrders.reduce((sum, order) => sum + (order.products ? order.products.reduce((s, p) => s + Math.floor(p.qty || 0), 0) : 0), 0));
    toast.info("Filters reset!", { position: "top-right", autoClose: 3000 });
  };

  const handleEditClick = (order) => {
    setEditData({
      dispatchFrom: order.dispatchFrom || "",
      billNumber: order.billNumber || "",
      transporterDetails: order.transporterDetails || "",
      dispatchDate: order.dispatchDate ? new Date(order.dispatchDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      docketNo: order.docketNo || "",
      receiptDate: order.receiptDate ? new Date(order.receiptDate).toISOString().split("T")[0] : "",
      dispatchStatus: order.dispatchStatus || "Not Dispatched",
      remarksBydispatch: order.remarksBydispatch || "",
      _id: order._id,
    });
    setIsModalOpen(true);
  };

  const handleModalSubmit = (updatedEntry) => {
    setOrders((prevOrders) => {
      const updatedOrders = prevOrders.map((order) => order._id === updatedEntry._id ? updatedEntry : order).filter((order) => !isOrderComplete(order));
      return updatedOrders.sort((a, b) => { const dateA = a.soDate ? new Date(a.soDate) : new Date(0); const dateB = b.soDate ? new Date(b.soDate) : new Date(0); return dateB - dateA; });
    });
    setIsModalOpen(false);
    setTimeout(() => { fetchFinishedGoods(); }, 100);
  };

  const handleView = (order) => { setViewOrder(order); setShowViewModal(true); setCopied(false); };

  const handleCopy = () => {
    if (!viewOrder) return;
    const productsText = viewOrder.products ? viewOrder.products.map((p, i) => `Product ${i + 1}: ${p.productType || "N/A"} (Qty: ${p.qty || "N/A"}, Serial Nos: ${p.serialNos?.join(", ") || "N/A"}, Model Nos: ${p.modelNos?.join(", ") || "N/A"})`).join("\n") : "N/A";
    const orderText = `Order ID: ${viewOrder.orderId || "N/A"}\nBill No: ${viewOrder.billNumber || "N/A"}\nProducts:\n${productsText}\nSO Date: ${viewOrder.soDate ? new Date(viewOrder.soDate).toLocaleDateString() : "N/A"}\nDispatch Date: ${viewOrder.dispatchDate ? new Date(viewOrder.dispatchDate).toLocaleDateString() : "N/A"}\nDispatch From: ${viewOrder.dispatchFrom || "N/A"}\nCustomer: ${viewOrder.customername || "N/A"}\nAddress: ${viewOrder.shippingAddress || "N/A"}\nDispatch Status: ${viewOrder.dispatchStatus === "Not Dispatched" ? "Pending Dispatched" : viewOrder.dispatchStatus || "Pending Dispatched"}`.trim();
    navigator.clipboard.writeText(orderText);
    setCopied(true);
    toast.success("Details copied to clipboard!", { position: "top-right", autoClose: 2000 });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFinishPDF = useCallback(async () => {
    if (!finishPdfRef.current) return;
    setFinishPdfLoading(true);
    try {
      const canvas = await html2canvas(finishPdfRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const pdf = new jsPDF("p", "mm", "a4");
      const PAGE_WIDTH = 210, PAGE_HEIGHT = 297, MARGIN_TOP = 15, MARGIN_BOTTOM = 15;
      const CONTENT_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;
      const imgWidth = PAGE_WIDTH;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pxPerMm = canvas.height / imgHeight;
      const pageContentHeightPx = (CONTENT_HEIGHT - 8) * pxPerMm;
      let sourceY = 0, pageIndex = 0;
      while (sourceY < canvas.height) {
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.min(pageContentHeightPx, canvas.height - sourceY);
        pageCanvas.getContext("2d").drawImage(canvas, 0, sourceY, canvas.width, pageCanvas.height, 0, 0, canvas.width, pageCanvas.height);
        const imgData = pageCanvas.toDataURL("image/jpeg", 0.98);
        if (pageIndex > 0) pdf.addPage();
        const renderedH = (pageCanvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, "JPEG", 0, pageIndex === 0 ? 0 : MARGIN_TOP, imgWidth, renderedH);
        sourceY += pageCanvas.height;
        pageIndex++;
      }
      pdf.save(`Dispatch_${viewOrder?.orderId || "order"}.pdf`);
      toast.success("PDF exported successfully!");
    } catch (err) { toast.error("Failed to export PDF!"); console.error(err); }
    finally { setFinishPdfLoading(false); }
  }, [viewOrder]);

  const handleExportToXLSX = async () => {
    const tableData = filteredOrders.map((order) => ({
      "Order ID": order.orderId || "N/A", "Customer Name": order.customername || "N/A", "Contact No": order.contactNo || "N/A",
      "Delivery Address": order.shippingAddress || "N/A",
      "Product Name": order.products ? order.products.map((p) => `${p.productType} (${p.qty})`).join(", ") : "N/A",
      "Model Nos": order.products ? order.products.flatMap((p) => p.modelNos || []).filter(Boolean).join(", ") || "N/A" : "N/A",
      Spec: order.products ? order.products.map((p) => p.spec || "N/A").join(", ") : "N/A",
      Size: order.products ? order.products.map((p) => p.size || "N/A").join(", ") : "N/A",
      "Serial Nos": order.products ? order.products.map((p) => { const serials = (p.serialNos || []).filter(Boolean); return serials.length > 0 ? `${p.productType}: ${serials.join(", ")}` : null; }).filter(Boolean).join("; ") || "N/A" : "N/A",
      Quantity: order.products ? order.products.reduce((sum, p) => sum + (p.qty || 0), 0) : "N/A",
      "Sales Person": order.salesPerson || "N/A", "Production Remarks": order.remarksByProduction || "N/A",
      "SO Date": order.soDate ? new Date(order.soDate).toLocaleDateString() : "N/A",
      "Dispatch Date": order.dispatchDate ? new Date(order.dispatchDate).toLocaleDateString() : "N/A",
      "Dispatch From": order.dispatchFrom || "N/A", "Billing Status": order.billStatus || "Pending",
      "Freight Status": order.freightstatus || "To Pay", "Product Status": order.fulfillingStatus || "N/A",
      "Dispatch Status": order.dispatchStatus || "Not Dispatched", "Dispatch Remarks": order.remarksBydispatch || "N/A",
    }));
    await exportToExcel(tableData, "Dispatch Data", "Dispatch_Dashboard.xlsx");
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)" }}>
        <div style={{ width: "50px", height: "50px", border: "5px solid #2575fc", borderTop: "5px solid transparent", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "15px" }} />
        <p style={{ fontSize: "1.3rem", color: "#333", fontWeight: "500" }}>Loading Finished Goods...</p>
      </div>
    );
  }

  const tdStyle = { padding: "15px", textAlign: "center", color: "#2c3e50", fontSize: "1rem", borderBottom: "1px solid #eee", height: "40px", lineHeight: "40px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "150px" };

  return (
    <>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      <div style={{ width: "100%", margin: "0", padding: "20px", borderRadius: "0", boxShadow: "none", minHeight: "100vh", height: "100%" }}>
        <header style={{ padding: "20px", textAlign: "center", background: "linear-gradient(135deg, #2575fc, #6a11cb)", color: "#fff", boxShadow: "0 4px 10px rgba(0,0,0,0.2)" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "2px", textShadow: "2px 2px 4px rgba(0,0,0,0.2)" }}>Dispatch Dashboard</h1>
        </header>
        <div style={{ padding: "20px" }}>
          <ModernFilterContainer>
            <FilterItem style={{ flex: 1.5, minWidth: "200px" }}>
              <label>Search</label>
              <ModernInput type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search orders..." />
            </FilterItem>
            <FilterItem style={{ minWidth: "200px" }}>
              <label>Date Range</label>
              <StyledDatePickerWrapper>
                <DatePicker selected={startDate} onChange={(date) => setStartDate(date)} selectsStart startDate={startDate} endDate={endDate} placeholderText="Start" dateFormat="dd/MM/yyyy" isClearable />
                <DatePicker selected={endDate} onChange={(date) => setEndDate(date)} selectsEnd startDate={startDate} endDate={endDate} minDate={startDate} placeholderText="End" dateFormat="dd/MM/yyyy" isClearable />
              </StyledDatePickerWrapper>
            </FilterItem>
            <FilterItem>
              <label>Freight</label>
              <ModernSelect value={freightStatusFilter} onChange={(e) => setFreightStatusFilter(e.target.value)}>
                <option value="">All</option><option value="To Pay">To Pay</option><option value="Including">Including</option><option value="Extra">Extra</option>
              </ModernSelect>
            </FilterItem>
            <FilterItem>
              <label>Type</label>
              <ModernSelect value={orderTypeFilter} onChange={(e) => setOrderTypeFilter(e.target.value)}>
                {uniqueOrderTypes.map((orderType) => (<option key={orderType} value={orderType}>{orderType === "Stock Out" ? "Stock" : orderType || "All"}</option>))}
              </ModernSelect>
            </FilterItem>
            <FilterItem>
              <label>From</label>
              <ModernSelect value={dispatchFromFilter} onChange={(e) => setDispatchFromFilter(e.target.value)}>
                {dispatchFromOptions.map((d) => (<option key={d} value={d}>{d || "All"}</option>))}
              </ModernSelect>
            </FilterItem>
            <FilterItem>
              <label>Dispatch</label>
              <ModernSelect value={dispatchStatusFilter} onChange={(e) => setDispatchStatusFilter(e.target.value)}>
                <option value="">All</option><option value="Not Dispatched">Pending Dispatched</option><option value="Dispatched">Dispatched</option><option value="Delivered">Delivered</option>
              </ModernSelect>
            </FilterItem>
            <FilterItem>
              <label>Production</label>
              <ModernSelect value={productionStatusFilter} onChange={(e) => setProductionStatusFilter(e.target.value)}>
                <option value="">All</option><option value="Under Process">Under Process</option><option value="Pending">Pending</option><option value="Partial Dispatch">Partial Dispatched</option><option value="Completed">Completed</option>
              </ModernSelect>
            </FilterItem>
            <div style={{ display: "flex", gap: "8px", paddingBottom: "1px" }}>
              <ModernButton onClick={handleReset} variant="reset">Reset</ModernButton>
              <ModernButton onClick={handleExportToXLSX} variant="primary">Export</ModernButton>
            </div>
          </ModernFilterContainer>
          <div style={{ display: "flex", gap: "15px", marginBottom: "20px", flexWrap: "wrap" }}>
            <div style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", borderRadius: "25px", padding: "12px 20px", boxShadow: "0 5px 15px rgba(0,0,0,0.2)", color: "#fff", fontWeight: "700", fontSize: "0.9rem" }}>Total Orders: {totalResults}</div>
            <div style={{ background: "linear-gradient(135deg, #28a745, #4cd964)", borderRadius: "25px", padding: "12px 20px", boxShadow: "0 5px 15px rgba(0,0,0,0.2)", color: "#fff", fontWeight: "700", fontSize: "0.9rem" }}>Total Product Quantity: {Math.floor(productQuantity)}</div>
          </div>
          {filteredOrders.length === 0 ? (
            <div style={{ background: "linear-gradient(135deg, #ff6b6b, #ff8787)", color: "#fff", padding: "20px", borderRadius: "10px", textAlign: "center", fontSize: "1.3rem", fontWeight: "500" }}>No Dispatch available at this time.</div>
          ) : (
            <div style={{ overflowX: "auto", maxHeight: "550px", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.8)", boxShadow: "0 4px 8px rgba(0,0,0,0.1)", backdropFilter: "blur(10px)" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0" }}>
                <thead style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", color: "#fff", position: "sticky", top: 0, zIndex: 2 }}>
                  <tr>
                    {["Order ID", "Customer Name", "Contact No", "Delivery Address", "Product Name", "Model Nos", "Spec", "Size", "Quantity", "Sales Person", "Production Remarks", "SO Date", "Dispatch Date", "Dispatch From", "Billing Status", "Freight Status", "Production Status", "Dispatch Status", "Stamp Signed", "Actions"].map((header, index) => (
                      <th key={index} style={{ padding: "15px", textAlign: "center", fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase", borderBottom: "2px solid rgba(255,255,255,0.2)" }}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order, index) => {
                    const productDetails = order.products ? order.products.map((p) => `${p.productType} (${p.qty})`).join(", ") : "N/A";
                    const sizeDetails = order.products ? order.products.map((p) => p.size || "N/A").join(", ") : "N/A";
                    const specDetails = order.products ? order.products.map((p) => p.spec || "N/A").join(", ") : "N/A";
                    const totalQty = order.products ? order.products.reduce((sum, p) => sum + (p.qty || 0), 0) : "N/A";
                    const modelNos = order.products ? order.products.flatMap((p) => p.modelNos || []).filter(Boolean).join(", ") || "N/A" : "N/A";
                    return (
                      <tr key={order._id} style={{ background: index % 2 === 0 ? "#f8f9fa" : "#fff", transition: "all 0.3s ease" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#e9ecef")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = index % 2 === 0 ? "#f8f9fa" : "#fff")}>
                        <td style={tdStyle} title={order.orderId || "N/A"}>{order.orderId || "N/A"}</td>
                        <td style={tdStyle} title={order.customername || "N/A"}>{order.customername || "N/A"}</td>
                        <td style={tdStyle} title={order.contactNo || "N/A"}>{order.contactNo || "N/A"}</td>
                        <td style={{ ...tdStyle, maxWidth: "200px" }} title={order.shippingAddress || "N/A"}>{order.shippingAddress || "N/A"}</td>
                        <td style={{ ...tdStyle, maxWidth: "200px" }} title={productDetails}>{productDetails}</td>
                        <td style={tdStyle} title={modelNos}>{modelNos}</td>
                        <td style={tdStyle} title={specDetails}>{specDetails}</td>
                        <td style={tdStyle} title={sizeDetails}>{sizeDetails}</td>
                        <td style={{ ...tdStyle, maxWidth: "100px" }} title={totalQty}>{totalQty}</td>
                        <td style={tdStyle} title={order.salesPerson || "N/A"}>{order.salesPerson || "N/A"}</td>
                        <td style={tdStyle} title={order.remarksByProduction || "N/A"}>{order.remarksByProduction || "N/A"}</td>
                        <td style={tdStyle} title={order.soDate ? new Date(order.soDate).toLocaleDateString() : "N/A"}>{order.soDate ? new Date(order.soDate).toLocaleDateString() : "N/A"}</td>
                        <td style={tdStyle} title={order.dispatchDate ? new Date(order.dispatchDate).toLocaleDateString() : "N/A"}>{order.dispatchDate ? new Date(order.dispatchDate).toLocaleDateString() : "N/A"}</td>
                        <td style={tdStyle} title={order.dispatchFrom || "N/A"}>{order.dispatchFrom || "N/A"}</td>
                        <td style={tdStyle} title={order.billStatus || "Pending"}>
                          <Badge style={{ background: order.billStatus === "Pending" ? "linear-gradient(135deg, #ff6b6b, #ff8787)" : order.billStatus === "Under Billing" ? "linear-gradient(135deg, #ffc107, #ffca2c)" : "linear-gradient(135deg, #28a745, #4cd964)", color: "#fff", padding: "5px 10px", borderRadius: "12px", display: "inline-block", width: "100%", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{order.billStatus || "Pending"}</Badge>
                        </td>
                        <td style={tdStyle} title={order.freightstatus || "To Pay"}>
                          <Badge style={{ background: order.freightstatus === "To Pay" ? "linear-gradient(135deg, #ff6b6b, #ff8787)" : order.freightstatus === "Including" ? "linear-gradient(135deg, #28a745, #4cd964)" : "linear-gradient(135deg, #ffc107, #ffca2c)", color: "#fff", padding: "5px 10px", borderRadius: "12px", display: "inline-block", width: "100%", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{order.freightstatus || "To Pay"}</Badge>
                        </td>
                        <td style={tdStyle} title={order.fulfillingStatus}>
                          <Badge style={{ background: order.fulfillingStatus === "Under Process" ? "linear-gradient(135deg, #ff9800, #f44336)" : order.fulfillingStatus === "Pending" ? "linear-gradient(135deg, #ffeb3b, #ff9800)" : order.fulfillingStatus === "Partial Dispatch" ? "linear-gradient(135deg, #00c6ff, #0072ff)" : "linear-gradient(135deg, #28a745, #4cd964)", color: "#fff", padding: "5px 10px", borderRadius: "12px", display: "inline-block", width: "100%", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{order.fulfillingStatus === "Partial Dispatch" ? "Partial Dispatched" : order.fulfillingStatus}</Badge>
                        </td>
                        <td style={tdStyle} title={order.dispatchStatus === "Not Dispatched" ? "Pending Dispatched" : order.dispatchStatus || "Pending Dispatched"}>
                          <Badge style={{ background: order.dispatchStatus === "Not Dispatched" ? "linear-gradient(135deg, #ff6b6b, #ff8787)" : order.dispatchStatus === "Dispatched" ? "linear-gradient(135deg, #00c6ff, #0072ff)" : order.dispatchStatus === "Delivered" ? "linear-gradient(135deg, #28a745, #4cd964)" : order.dispatchStatus === "Hold by Salesperson" ? "linear-gradient(135deg, #007bff, #4dabf7)" : order.dispatchStatus === "Hold by Customer" ? "linear-gradient(135deg, #8e44ad, #be94e6)" : order.dispatchStatus === "Order Cancelled" ? "linear-gradient(135deg, #6c757d, #5a6268)" : "linear-gradient(135deg, #6c757d, #a9a9a9)", color: "#fff", padding: "5px 10px", borderRadius: "12px", display: "inline-block", width: "100%", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{order.dispatchStatus === "Not Dispatched" ? "Pending Dispatched" : order.dispatchStatus || "Pending Dispatched"}</Badge>
                        </td>
                        <td style={tdStyle} title={order.stamp || "Not Received"}>
                          <Badge style={{ background: order.stamp === "Received" ? "linear-gradient(135deg, #28a745, #4cd964)" : "linear-gradient(135deg, #ff6b6b, #ff8787)", color: "#fff", padding: "5px 10px", borderRadius: "12px", display: "inline-block", width: "100%", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{order.stamp || "Not Received"}</Badge>
                        </td>
                        <td style={{ padding: "12px", textAlign: "center", height: "40px", marginTop: "15px", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid #eee" }}>
                          <div style={{ display: "flex", gap: "10px", justifyContent: "center", alignItems: "center" }}>
                            <Button variant="primary" onClick={() => handleView(order)} style={{ width: "40px", height: "40px", borderRadius: "22px", padding: "0", display: "flex", alignItems: "center", justifyContent: "center" }}><FaEye style={{ marginBottom: "3px" }} /></Button>
                            <button className="editBtn" onClick={() => handleEditClick(order)} style={{ minWidth: "40px", width: "40px", height: "40px", padding: "0", border: "none", background: "linear-gradient(135deg, #6c757d, #5a6268)", borderRadius: "22px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <svg height="1em" viewBox="0 0 512 512" fill="#fff"><path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <footer className="footer-container">
        <p style={{ marginTop: "10px", color: "white", height: "20px" }}>© 2025 Sales Order Management. All rights reserved.</p>
      </footer>
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} backdrop="static" keyboard={false} size="xl" centered style={{ backdropFilter: "blur(5px)" }}>
        <style>{`.serial-nos-container { max-height: 100px; overflow-y: auto; padding: 5px 10px; background: #fff; border-radius: 5px; border: 1px solid #eee; } .serial-nos-container ul { margin: 0; padding-left: 20px; } .serial-nos-container li { font-size: 0.95rem; color: #555; line-height: 1.4; }`}</style>
        <Modal.Header style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", color: "#fff", padding: "1.5rem 2rem", border: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Modal.Title style={{ fontWeight: "700", fontSize: "1.8rem", letterSpacing: "1.2px", textTransform: "uppercase", fontFamily: "'Poppins', sans-serif", display: "flex", alignItems: "center", gap: "10px" }}>
            <span role="img" aria-label="clipboard">📋</span>
            Dispatch Order #{viewOrder?.orderId || "N/A"}
          </Modal.Title>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Button onClick={handleFinishPDF} disabled={finishPdfLoading}
              style={{ background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.85)", borderRadius: "50px", padding: "8px 20px", fontSize: "0.95rem", fontWeight: "600", color: "#fff", display: "flex", alignItems: "center", gap: "8px", transition: "all 0.2s ease", whiteSpace: "nowrap" }}
              onMouseEnter={(e) => { if (!finishPdfLoading) e.currentTarget.style.background = "rgba(255,255,255,0.25)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}>
              {finishPdfLoading ? <><Spinner size="sm" animation="border" /> Exporting...</> : <><FileText size={16} /> Export PDF</>}
            </Button>
            <Button variant="light" onClick={() => setShowViewModal(false)} style={{ borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.2)" }}>✕</Button>
          </div>
        </Modal.Header>
        <Modal.Body style={{ padding: "2rem", background: "linear-gradient(180deg, #f8fafc, #e2e8f0)", borderRadius: "0 0 15px 15px", maxHeight: "80vh", overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "#2575fc #e6f0fa" }}>
          {viewOrder && (
            <>
              {/* ── Off-screen PDF print container ── */}
              <div ref={finishPdfRef} style={{ width: "210mm", padding: "15mm 15mm 10mm 15mm", background: "#fff", color: "#333", fontFamily: "'Segoe UI',Tahoma,Geneva,Verdana,sans-serif", lineHeight: 1.5, position: "absolute", left: "-9999px", top: "-9999px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #2575fc", paddingBottom: "10px", marginBottom: "20px" }}>
                  <div>
                    <h1 style={{ color: "#2575fc", margin: 0, fontSize: "24px", textTransform: "uppercase", fontWeight: "bold" }}>Dispatch Order</h1>
                    <div style={{ fontSize: "14px", color: "#666", marginTop: "5px" }}>Official Business Record</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <img src="/logo.png" alt="Logo" style={{ height: "60px", width: "auto" }} onError={(e) => (e.target.style.display = "none")} />
                    <div style={{ marginTop: "10px", fontWeight: "bold", fontSize: "16px" }}>Order ID: {viewOrder.orderId || "N/A"}</div>
                  </div>
                </div>
                {/* Order Info */}
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ background: "#f8f9fa", padding: "6px 10px", borderLeft: "4px solid #6a11cb", fontWeight: "bold", textTransform: "uppercase", marginBottom: "10px", fontSize: "15px" }}>Order Information</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    {[["SO Date", viewOrder.soDate ? new Date(viewOrder.soDate).toLocaleDateString() : "N/A"], ["Dispatch Date", viewOrder.dispatchDate ? new Date(viewOrder.dispatchDate).toLocaleDateString() : "N/A"], ["Dispatch From", viewOrder.dispatchFrom || "N/A"], ["Bill Number", viewOrder.billNumber || "N/A"], ["Customer", viewOrder.customername || "N/A"], ["Contact No", viewOrder.contactNo || "N/A"], ["Sales Person", viewOrder.salesPerson || "N/A"], ["Docket No", viewOrder.docketNo || "N/A"], ["Dispatch Status", viewOrder.dispatchStatus || "Not Dispatched"], ["Freight Status", viewOrder.freightstatus || "To Pay"], ["Billing Status", viewOrder.billStatus || "Pending"], ["Stamp Signed", viewOrder.stamp || "Not Received"], ["Production Status", viewOrder.fulfillingStatus === "Partial Dispatch" ? "Partial Dispatched" : viewOrder.fulfillingStatus || "N/A"], ["Order Type", viewOrder.orderType || "N/A"]].map(([label, val]) => (
                      <div key={label} style={{ fontSize: "13px" }}><strong style={{ color: "#444" }}>{label}:</strong> {val}</div>
                    ))}
                    <div style={{ fontSize: "13px", gridColumn: "span 2" }}><strong style={{ color: "#444" }}>Shipping Address:</strong> {viewOrder.shippingAddress || "N/A"}</div>
                    {viewOrder.remarksBydispatch && <div style={{ fontSize: "13px", gridColumn: "span 2" }}><strong style={{ color: "#444" }}>Dispatch Remarks:</strong> {viewOrder.remarksBydispatch}</div>}
                    {viewOrder.remarksByProduction && <div style={{ fontSize: "13px", gridColumn: "span 2" }}><strong style={{ color: "#444" }}>Production Remarks:</strong> {viewOrder.remarksByProduction}</div>}
                  </div>
                </div>
                {/* Products */}
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ background: "#f8f9fa", padding: "6px 10px", borderLeft: "4px solid #6a11cb", fontWeight: "bold", textTransform: "uppercase", marginBottom: "10px", fontSize: "15px" }}>Product Details</div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>{["#", "Product", "Qty", "Size / Spec", "Model Nos"].map(h => <th key={h} style={{ background: "#f1f3f5", textAlign: "left", padding: "8px", border: "1px solid #dee2e6", fontSize: "12px" }}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {viewOrder.products && viewOrder.products.length > 0 ? viewOrder.products.map((p, i) => (
                        <tr key={i}>
                          <td style={{ padding: "8px", border: "1px solid #dee2e6", fontSize: "12px" }}>{i + 1}</td>
                          <td style={{ padding: "8px", border: "1px solid #dee2e6", fontSize: "12px" }}><strong>{p.productType || "N/A"}</strong></td>
                          <td style={{ padding: "8px", border: "1px solid #dee2e6", fontSize: "12px" }}>{p.qty || 0}</td>
                          <td style={{ padding: "8px", border: "1px solid #dee2e6", fontSize: "12px" }}>{[p.size, p.spec].filter(v => v && v !== "N/A").join(" / ") || "N/A"}</td>
                          <td style={{ padding: "8px", border: "1px solid #dee2e6", fontSize: "11px" }}>{p.modelNos?.filter(Boolean).join(", ") || "N/A"}</td>
                        </tr>
                      )) : <tr><td colSpan="5" style={{ padding: "8px", border: "1px solid #dee2e6", textAlign: "center", fontSize: "12px" }}>No products</td></tr>}
                    </tbody>
                  </table>
                  <div style={{ fontSize: "13px", marginTop: "8px" }}><strong>Total Quantity:</strong> {viewOrder.products ? viewOrder.products.reduce((s, p) => s + (p.qty || 0), 0) : "N/A"}</div>
                </div>
              </div>

              {/* ── Visible accordion UI ── */}
              <Accordion defaultActiveKey={["0", "1", "2"]} alwaysOpen>
                <Accordion.Item eventKey="0">
                  <Accordion.Header style={{ fontWeight: "600", fontFamily: "'Poppins', sans-serif" }}>📅 Order Information</Accordion.Header>
                  <Accordion.Body style={{ background: "#fff", borderRadius: "10px", padding: "1.5rem", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                      <div><strong>Order ID:</strong> {viewOrder.orderId || "N/A"}</div>
                      <div><strong>SO Date:</strong> {viewOrder.soDate ? new Date(viewOrder.soDate).toLocaleDateString() : "N/A"}</div>
                      <div><strong>Dispatch Date:</strong> {viewOrder.dispatchDate ? new Date(viewOrder.dispatchDate).toLocaleDateString() : "N/A"}</div>
                      <div><strong>Dispatch From:</strong> {viewOrder.dispatchFrom || "N/A"}</div>
                      <div><strong>Bill Number:</strong> {viewOrder.billNumber || "N/A"}</div>
                      <div><strong>Customer:</strong> {viewOrder.customername || "N/A"}</div>
                      <div><strong>Contact No:</strong> {viewOrder.contactNo || "N/A"}</div>
                      <div><strong>Shipping Address:</strong> {viewOrder.shippingAddress || "N/A"}</div>
                      <div><strong>Sales Person:</strong> {viewOrder.salesPerson || "N/A"}</div>
                      <div><strong>Docket No:</strong> {viewOrder.docketNo || "N/A"}</div>
                      <div><strong>Dispatch Status:</strong>{" "}<Badge style={{ background: viewOrder.dispatchStatus === "Not Dispatched" ? "linear-gradient(135deg, #ff6b6b, #ff8787)" : viewOrder.dispatchStatus === "Dispatched" ? "linear-gradient(135deg, #00c6ff, #0072ff)" : viewOrder.dispatchStatus === "Delivered" ? "linear-gradient(135deg, #28a745, #4cd964)" : "linear-gradient(135deg, #6c757d, #a9a9a9)", color: "#fff", padding: "5px 10px", borderRadius: "12px" }}>{viewOrder.dispatchStatus === "Not Dispatched" ? "Pending Dispatched" : viewOrder.dispatchStatus || "Pending Dispatched"}</Badge></div>
                      <div><strong>Freight Status:</strong>{" "}<Badge style={{ background: viewOrder.freightstatus === "To Pay" ? "linear-gradient(135deg, #ff6b6b, #ff8787)" : viewOrder.freightstatus === "Including" ? "linear-gradient(135deg, #28a745, #4cd964)" : "linear-gradient(135deg, #ffc107, #ffca2c)", color: "#fff", padding: "5px 10px", borderRadius: "12px" }}>{viewOrder.freightstatus || "To Pay"}</Badge></div>
                      <div><strong>Billing Status:</strong>{" "}<Badge style={{ background: viewOrder.billStatus === "Pending" ? "linear-gradient(135deg, #ff6b6b, #ff8787)" : viewOrder.billStatus === "Under Billing" ? "linear-gradient(135deg, #ffc107, #ffca2c)" : "linear-gradient(135deg, #28a745, #4cd964)", color: "#fff", padding: "5px 10px", borderRadius: "12px" }}>{viewOrder.billStatus || "Pending"}</Badge></div>
                      <div><strong>Stamp Signed:</strong>{" "}<Badge style={{ background: viewOrder.stamp === "Received" ? "linear-gradient(135deg, #28a745, #4cd964)" : "linear-gradient(135deg, #ff6b6b, #ff8787)", color: "#fff", padding: "5px 10px", borderRadius: "12px" }}>{viewOrder.stamp || "Not Received"}</Badge></div>
                      <div><strong>Dispatch Remarks:</strong> {viewOrder.remarksBydispatch || "N/A"}</div>
                      <div><strong>Production Remarks:</strong> {viewOrder.remarksByProduction || "N/A"}</div>
                    </div>
                  </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="1">
                  <Accordion.Header style={{ fontWeight: "600", fontFamily: "'Poppins', sans-serif" }}>📦 Product Information</Accordion.Header>
                  <Accordion.Body style={{ background: "#fff", borderRadius: "10px", padding: "1.5rem", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }}>
                    {viewOrder.products && viewOrder.products.length > 0 ? viewOrder.products.map((product, index) => (
                      <Card key={index} style={{ marginBottom: "1rem", border: "none", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", borderRadius: "10px" }}>
                        <Card.Body>
                          <Card.Title style={{ fontSize: "1.1rem", fontWeight: "600", color: "#1e293b" }}>Product {index + 1}: {product.productType || "N/A"}</Card.Title>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.5rem" }}>
                            <div><strong>Qty:</strong> {product.qty || "N/A"}</div>
                            <div><strong>Size:</strong> {product.size || "N/A"}</div>
                            <div><strong>Spec:</strong> {product.spec || "N/A"}</div>
                            <div><strong>Model Nos:</strong> {product.modelNos?.filter(Boolean).join(", ") || "N/A"}</div>
                            {product.serialNos?.filter(Boolean).length > 0 && <div><strong>Serial Nos:</strong> {product.serialNos.filter(Boolean).join(", ")}</div>}
                          </div>
                        </Card.Body>
                      </Card>
                    )) : <p style={{ color: "#555" }}>No products available.</p>}
                    <div style={{ marginTop: "0.5rem" }}><strong>Total Quantity:</strong> {viewOrder.products ? viewOrder.products.reduce((sum, p) => sum + (p.qty || 0), 0) : "N/A"}</div>
                  </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="2">
                  <Accordion.Header style={{ fontWeight: "600", fontFamily: "'Poppins', sans-serif" }}>🛠️ Production Status</Accordion.Header>
                  <Accordion.Body style={{ background: "#fff", borderRadius: "10px", padding: "1.5rem", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                      <div><strong>Production Status:</strong>{" "}<Badge style={{ background: viewOrder.fulfillingStatus === "Under Process" ? "linear-gradient(135deg, #ff9800, #f44336)" : viewOrder.fulfillingStatus === "Pending" ? "linear-gradient(135deg, #ffeb3b, #ff9800)" : viewOrder.fulfillingStatus === "Partial Dispatch" ? "linear-gradient(135deg, #00c6ff, #0072ff)" : "linear-gradient(135deg, #28a745, #4cd964)", color: "#fff", padding: "5px 10px", borderRadius: "12px" }}>{viewOrder.fulfillingStatus === "Partial Dispatch" ? "Partial Dispatched" : viewOrder.fulfillingStatus || "N/A"}</Badge></div>
                      <div><strong>Order Type:</strong> {viewOrder.orderType || "N/A"}</div>
                      <div><strong>Fulfillment Date:</strong> {viewOrder.fulfillmentDate ? new Date(viewOrder.fulfillmentDate).toLocaleDateString() : "N/A"}</div>
                    </div>
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
              <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
                <Button onClick={handleCopy}
                  style={{ flex: 1, background: "linear-gradient(135deg, #2563eb, #7e22ce)", border: "none", borderRadius: "50px", padding: "12px 24px", fontSize: "1.1rem", fontWeight: "600", color: "#fff", display: "flex", alignItems: "center", gap: "10px", justifyContent: "center", boxShadow: "0 6px 20px rgba(0,0,0,0.2)", transition: "all 0.3s ease" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.3)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.2)"; }}>
                  📑 {copied ? "Copied to Clipboard!" : "Copy Details"}
                </Button>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>
      <OutFinishedGoodModal visible={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleModalSubmit} initialData={editData} entryToEdit={editData ? orders.find((o) => o._id === editData._id) || editData : null} />
    </>
  );
}

export default Finish;
