import React, { useState, useEffect, useCallback, useMemo } from "react";
import furniApi from "../axiosSetup";
import { toast } from "react-toastify";
import { Button, Modal, Form, Spinner, Badge } from "react-bootstrap";
import { Accordion, Card } from "react-bootstrap"; import { FaEye } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";
import { exportToExcel } from "../../utils/excelHelper";
import "../../App.css";
import styled from "styled-components";
import DatePicker from "react-datepicker";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { FileText } from "lucide-react";

const DatePickerWrapper = styled.div`
  display: flex; gap: 10px; align-items: center;
  .react-datepicker-wrapper { width: 150px; }
  .react-datepicker__input-container input {
    padding: 8px 12px; border-radius: 25px; border: 1px solid #ccc;
    font-size: 1rem; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
    transition: border-color 0.3s ease; width: 100%;
    &:focus { border-color: #2575fc; outline: none; }
  }
  .react-datepicker { z-index: 1000 !important; }
  .react-datepicker-popper { z-index: 1000 !important; }
`;

const FilterLabel = styled(Form.Label)`
  font-weight: 700; font-size: 0.95rem; color: transparent;
  background: linear-gradient(135deg, #2575fc, #6a11cb);
  -webkit-background-clip: text; background-clip: text;
  letter-spacing: 0.5px; padding: 5px 10px; border-radius: 8px;
  display: inline-block; transition: transform 0.2s ease, opacity 0.2s ease;
  cursor: default; position: relative; overflow: hidden;
  &:hover { transform: scale(1.05); opacity: 0.9; }
  span.underline {
    position: absolute; bottom: 0; left: 0; width: 100%; height: 2px;
    background: linear-gradient(135deg, #2575fc, #6a11cb);
    transform: scaleX(0); transform-origin: left; transition: transform 0.3s ease;
  }
  &:hover span.underline { transform: scaleX(1); }
`;

const Production = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [formData, setFormData] = useState({ fulfillingStatus: "Pending", remarksByProduction: "", productUnits: [] });
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [errors, setErrors] = useState({});
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [orderTypeFilter, setOrderTypeFilter] = useState("All");
  const [prodPdfLoading, setProdPdfLoading] = useState(false);
  const prodPdfRef = React.useRef(null);

  const clearFilters = useCallback(() => {
    setSearchQuery(""); setStartDate(null); setEndDate(null);
    setStatusFilter("All"); setOrderTypeFilter("All");
  }, []);

  const fetchOrders = async () => {
    setLoading(true); setError(null);
    try {
      const response = await furniApi.get("/api/production-orders");
      if (response.data.success) {
        const sortedOrders = response.data.data.sort((a, b) => {
          const dateA = a.soDate ? new Date(a.soDate) : new Date(0);
          const dateB = b.soDate ? new Date(b.soDate) : new Date(0);
          return dateB - dateA;
        });
        setOrders(sortedOrders);
      } else {
        throw new Error(response.data.message || "Failed to fetch orders");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      const errorMessage = error.message || "Failed to fetch production orders.";
      setError(errorMessage);
      if (!toast.isActive("fetch-error")) {
        toast.error(errorMessage, { position: "top-right", autoClose: 5000, toastId: "fetch-error" });
      }
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const filteredOrders = useMemo(() => {
    let filtered = orders.filter(
      (order) => order.fulfillingStatus !== "Fulfilled" && order.fulfillingStatus !== "Order Cancel"
    );
    if (startDate || endDate) {
      filtered = filtered.filter((order) => {
        const orderDate = order.soDate ? new Date(order.soDate) : null;
        const startDateAdjusted = startDate ? new Date(startDate.setHours(0, 0, 0, 0)) : null;
        const endDateAdjusted = endDate ? new Date(endDate.setHours(23, 59, 59, 999)) : null;
        return (!startDateAdjusted || (orderDate && orderDate >= startDateAdjusted)) &&
          (!endDateAdjusted || (orderDate && orderDate <= endDateAdjusted));
      });
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((order) => {
        const productDetails = Array.isArray(order.products)
          ? order.products.map((p) => `${p.productType || ""} (${p.qty || ""})`).join(", ") : "";
        const firstProduct = Array.isArray(order.products) && order.products.length > 0 ? order.products[0] : {};
        return (
          (order.orderId || "").toLowerCase().includes(query) ||
          (order.customername || "").toLowerCase().includes(query) ||
          (order.shippingAddress || "").toLowerCase().includes(query) ||
          (order.customerEmail || "").toLowerCase().includes(query) ||
          (order.contactNo || "").toLowerCase().includes(query) ||
          (order.orderType || "").toLowerCase().includes(query) ||
          productDetails.toLowerCase().includes(query) ||
          (firstProduct.size || "").toLowerCase().includes(query) ||
          (firstProduct.spec || "").toLowerCase().includes(query) ||
          (firstProduct.modelNos?.join(", ") || "").toLowerCase().includes(query) ||
          (order.fulfillingStatus || "").toLowerCase().includes(query)
        );
      });
    }
    if (statusFilter !== "All") {
      filtered = filtered.filter((order) => order.fulfillingStatus === statusFilter);
    }
    if (orderTypeFilter !== "All") {
      filtered = filtered.filter((order) => order.orderType === orderTypeFilter);
    }
    return filtered.sort((a, b) => {
      const dateA = a.soDate ? new Date(a.soDate) : new Date(0);
      const dateB = b.soDate ? new Date(b.soDate) : new Date(0);
      return dateB - dateA;
    });
  }, [orders, searchQuery, statusFilter, orderTypeFilter, startDate, endDate]);

  const uniqueStatuses = ["All", "Under Process", "Pending", "Hold", "Order Cancel", "Partial Dispatch", "Fulfilled",
    ...new Set(orders.map((order) => order.fulfillingStatus || "Pending").filter(
      (status) => !["Under Process", "Pending", "Hold", "Order Cancel", "Partial Dispatch", "Fulfilled"].includes(status)
    )),
  ];

  const uniqueOrderTypes = useMemo(() => ["All", ...new Set(orders.map((order) => order.orderType || "N/A"))], [orders]);

  const handleEdit = useCallback((order) => {
    setEditOrder(order);
    const products = Array.isArray(order.products) ? order.products : [];
    const productUnits = products.flatMap((product, productIndex) => {
      const qty = product.qty || 1;
      const modelNos = Array.isArray(product.modelNos) ? product.modelNos : [];
      return Array.from({ length: qty }, (_, unitIndex) => ({
        productIndex, productType: product.productType || "N/A",
        size: product.size || "N/A", spec: product.spec || "N/A",
        unitPrice: product.unitPrice || 0, gst: product.gst || "0",
        modelNo: modelNos[unitIndex] || "",
      }));
    });
    setFormData({ fulfillingStatus: order.fulfillingStatus || "Pending", remarksByProduction: order.remarksByProduction || "", productUnits });
    setErrors({});
    setShowEditModal(true);
  }, []);

  const validateForm = () => { setErrors({}); return true; };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    const productMap = formData.productUnits.reduce((acc, unit) => {
      const { productIndex, productType, size, spec, unitPrice, gst, modelNo } = unit;
      if (!acc[productIndex]) {
        acc[productIndex] = { productType, size, spec, unitPrice, qty: 0, gst, modelNos: [] };
      }
      acc[productIndex].qty += 1;
      acc[productIndex].modelNos.push(modelNo || null);
      return acc;
    }, {});
    const products = Object.values(productMap);
    const submitData = { ...formData, products };
    delete submitData.productUnits;
    try {
      const response = await furniApi.put(`/api/edit/${editOrder?._id}`, submitData);
      if (response.data.success) {
        const updatedOrder = response.data.data;
        setOrders((prevOrders) => prevOrders.map((order) => order._id === editOrder._id ? updatedOrder : order));
        setShowEditModal(false);
        toast.success("Order updated successfully!", { position: "top-right", autoClose: 3000, toastId: "update-success" });
      } else {
        throw new Error(response.data.message || "We couldn't update your order. Please try again.");
      }
    } catch (error) {
      const userFriendlyMessage = error.response?.data?.message || "❌ Something went wrong while updating your order.";
      toast.error(userFriendlyMessage, { position: "top-right", autoClose: 5000, toastId: "update-error" });
    }
  };

  const handleView = useCallback((order) => { setViewOrder(order); setShowViewModal(true); setCopied(false); }, []);

  const handleCopy = useCallback(() => {
    if (!viewOrder) return;
    const productsText = Array.isArray(viewOrder.products)
      ? viewOrder.products.map((p, i) => `Product ${i + 1}: ${p.productType || "N/A"} (Qty: ${p.qty || "N/A"}, Size: ${p.size || "N/A"}, Spec: ${p.spec || "N/A"}, Model Nos: ${p.modelNos?.length > 0 ? p.modelNos.join(", ") : "N/A"})`).join("\n")
      : "N/A";
    const textToCopy = `Order ID: ${viewOrder.orderId || "N/A"}\nCustomer Name: ${viewOrder.customername || "N/A"}\nProducts:\n${productsText}\nFulfilling Status: ${viewOrder.fulfillingStatus || "Pending"}\nRemarks by Production: ${viewOrder.remarksByProduction || "N/A"}`.trim();
    navigator.clipboard.writeText(textToCopy)
      .then(() => { setCopied(true); toast.success("Details copied to clipboard!", { toastId: "copy-success" }); setTimeout(() => setCopied(false), 2000); })
      .catch((err) => { toast.error("Failed to copy details!", { toastId: "copy-error" }); console.error("Copy error:", err); });
  }, [viewOrder]);

  const handleProdPDF = useCallback(async () => {
    if (!prodPdfRef.current) return;
    setProdPdfLoading(true);
    try {
      const canvas = await html2canvas(prodPdfRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
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
      pdf.save(`Production_${viewOrder?.orderId || "order"}.pdf`);
      toast.success("PDF exported successfully!");
    } catch (err) { toast.error("Failed to export PDF!"); console.error(err); }
    finally { setProdPdfLoading(false); }
  }, [viewOrder]);

  const handleExportExcel = useCallback(async () => {
    const exportData = filteredOrders.map((order) => {
      const firstProduct = Array.isArray(order.products) && order.products.length > 0 ? order.products[0] : {};
      const productDetails = Array.isArray(order.products) ? order.products.map((p) => `${p.productType || "N/A"} (${p.qty || "N/A"})`).join(", ") : "N/A";
      const totalQty = Array.isArray(order.products) ? order.products.reduce((sum, p) => sum + (p.qty || 0), 0) : "N/A";
      return {
        "Order ID": order.orderId || "N/A",
        "So Date": order.soDate ? new Date(order.soDate).toLocaleDateString("en-IN") : "N/A",
        "Customer Name": order.customername || "N/A",
        "Shipping Address": order.shippingAddress || "N/A",
        "Customer Email": order.customerEmail || "N/A",
        "Contact No": order.contactNo || "N/A",
        "Order Type": order.orderType || "N/A",
        "Product Details": productDetails,
        Size: firstProduct.size || "N/A",
        Spec: firstProduct.spec || "N/A",
        "Model Nos": firstProduct.modelNos?.length > 0 ? firstProduct.modelNos.join(", ") : "N/A",
        "Production Status": order.fulfillingStatus || "Pending",
        Quantity: totalQty,
      };
    });
    await exportToExcel(exportData, "Production Orders", `Production_Orders_${new Date().toISOString().split("T")[0]}.xlsx`);
  }, [filteredOrders]);

  const isValidPoFilePath = (filePath) => filePath && typeof filePath === "string" && filePath.trim() !== "" && filePath !== "N/A" && filePath !== "/";

  const handleDownload = async (filePath, label = "AV_EdTech") => {
    if (!isValidPoFilePath(filePath)) { toast.error("No valid file available to download!"); return; }
    try {
      const filename = filePath.split("/").pop();
      if (!filename) { toast.error("Invalid file path!"); return; }

      const response = await furniApi.get(`/api/download/${encodeURIComponent(filename)}`, {
        responseType: "blob",
      });

      const blob = response.data;
      const ext = filename.includes(".") ? "." + filename.split(".").pop() : "";
      const orderSlug = viewOrder?.orderId ? `Order_${viewOrder.orderId}` : "Furni";
      const downloadFilename = `${orderSlug}_Furni_${label}${ext}`;
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
      toast.success("File download started!");
    } catch (err) {
      toast.error("Failed to download file! Check server or file path.");
      console.error("Download error:", err);
    }
  };

  const totalPending = filteredOrders.filter((order) => order.fulfillingStatus === "Pending").length;
  const tdStyle = { padding: "15px", textAlign: "center", color: "#2c3e50", fontSize: "1rem", borderBottom: "1px solid #eee", height: "40px", lineHeight: "40px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "150px" };

  return (
    <>
      <div style={{ width: "100%", margin: "0", padding: "20px", background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <header style={{ padding: "20px", textAlign: "center", background: "linear-gradient(135deg, #2575fc, #6a11cb)", color: "#fff", boxShadow: "0 4px 10px rgba(0,0,0,0.2)" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "2px", textShadow: "2px 2px 4px rgba(0,0,0,0.2)" }}>Production Team Dashboard</h1>
        </header>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "15px", marginTop: "20px", marginBottom: "20px", alignItems: "flex-start" }}>
          <div style={{ position: "relative", flex: "1 1 300px" }}>
            <FilterLabel><span style={{ marginRight: "5px" }}>📊</span> Search<span className="underline" /></FilterLabel>
            <Form.Control type="text" placeholder="Search orders..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              style={{ borderRadius: "20px", maxWidth: "700px", padding: "10px 40px 10px 15px", border: "1px solid #ced4da", fontSize: "1rem", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }}
              onFocus={(e) => (e.target.style.boxShadow = "0 0 10px rgba(37,117,252,0.5)")}
              onBlur={(e) => (e.target.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)")} />
          </div>
          <div style={{ flex: "1 1 300px", maxWidth: "400px", display: "flex", gap: "10px" }}>
            <div style={{ flex: 1 }}>
              <FilterLabel><span style={{ marginRight: "5px" }}>📅</span> Start Date<span className="underline" /></FilterLabel>
              <DatePickerWrapper>
                <DatePicker selected={startDate} onChange={(date) => setStartDate(date)} selectsStart startDate={startDate} endDate={endDate} placeholderText="Start Date" dateFormat="dd/MM/yyyy" isClearable className="form-control" wrapperClassName="w-100" />
              </DatePickerWrapper>
            </div>
            <div style={{ flex: 1 }}>
              <FilterLabel><span style={{ marginRight: "5px" }}>📅</span> End Date<span className="underline" /></FilterLabel>
              <DatePickerWrapper>
                <DatePicker selected={endDate} onChange={(date) => setEndDate(date)} selectsEnd startDate={startDate} endDate={endDate} minDate={startDate} placeholderText="End Date" dateFormat="dd/MM/yyyy" isClearable className="form-control" wrapperClassName="w-100" />
              </DatePickerWrapper>
            </div>
          </div>
          <Form.Group style={{ flex: "0 1 200px" }}>
            <FilterLabel><span style={{ marginRight: "5px" }}>📊</span> Production Status<span className="underline" /></FilterLabel>
            <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ borderRadius: "20px", padding: "10px", border: "1px solid #ced4da", fontSize: "1rem", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", background: "#fff" }}>
              {uniqueStatuses.map((status) => (<option key={status} value={status}>{status}</option>))}
            </Form.Select>
          </Form.Group>
          <Form.Group style={{ flex: "0 1 200px" }}>
            <FilterLabel><span style={{ marginRight: "5px" }}>📋</span> Order Type<span className="underline" /></FilterLabel>
            <Form.Select value={orderTypeFilter} onChange={(e) => setOrderTypeFilter(e.target.value)} style={{ borderRadius: "20px", padding: "10px", border: "1px solid #ced4da", fontSize: "1rem", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", background: "#fff" }}>
              {uniqueOrderTypes.map((orderType) => (<option key={orderType} value={orderType}>{orderType}</option>))}
            </Form.Select>
          </Form.Group>
          <Button onClick={handleExportExcel} style={{ background: "linear-gradient(135deg, #28a745, #4cd964)", border: "none", padding: "10px 20px", borderRadius: "20px", color: "#fff", fontWeight: "600", marginBottom: "-45px", fontSize: "1rem", alignSelf: "center" }}
            onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")} onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}>Export to Excel</Button>
          <Button onClick={clearFilters} style={{ background: "linear-gradient(135deg,rgb(167,110,40),rgb(217,159,41))", border: "none", padding: "10px 20px", borderRadius: "20px", color: "#fff", fontWeight: "600", marginBottom: "-45px", fontSize: "1rem", alignSelf: "center" }}
            onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")} onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}>Clear Filters</Button>
        </div>
        <div style={{ padding: "20px", flex: 1 }}>
          {error && (
            <div style={{ background: "linear-gradient(135deg, #ff6b6b, #ff8787)", color: "#fff", padding: "15px", borderRadius: "10px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span><strong>Error:</strong> {error}</span>
              <Button onClick={fetchOrders} style={{ background: "transparent", border: "1px solid #fff", color: "#fff", padding: "5px 15px", borderRadius: "20px" }}>Retry</Button>
            </div>
          )}
          {loading ? (
            <div style={{ textAlign: "center", padding: "50px 0", background: "#fff", borderRadius: "10px" }}>
              <Spinner animation="border" style={{ color: "#2575fc", width: "40px", height: "40px" }} />
              <p style={{ marginTop: "10px", color: "#333", fontSize: "1.1rem", fontWeight: "500" }}>Loading orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div style={{ background: "linear-gradient(135deg, #ff6b6b, #ff8787)", color: "white", padding: "20px", borderRadius: "10px", textAlign: "center", fontSize: "1.3rem", fontWeight: "500" }}>
              No approved orders available for production.
            </div>
          ) : (
            <>
              <div className="total-results" style={{ marginBottom: "20px" }}>
                <span>Total Orders: {filteredOrders.length}</span>
                <span>Total Pending: {totalPending}</span>
              </div>
              <div style={{ overflowX: "auto", maxHeight: "550px", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.8)", boxShadow: "0 4px 8px rgba(0,0,0,0.1)", backdropFilter: "blur(10px)" }}>
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0" }}>
                  <thead style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", color: "#fff", position: "sticky", top: 0, zIndex: 2 }}>
                    <tr>
                      {["Order ID", "So Date", "Customer Name", "Shipping Address", "Customer Email", "Contact No", "Order Type", "Product Details", "Size", "Spec", "Model Nos", "Attachment", "Remarks", "Production Status", "Quantity", "Actions"].map((header, index) => (
                        <th key={index} style={{ padding: "15px", textAlign: "center", fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase", borderBottom: "2px solid rgba(255,255,255,0.2)" }}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order, index) => {
                      const firstProduct = Array.isArray(order.products) && order.products.length > 0 ? order.products[0] : {};
                      const totalQty = Array.isArray(order.products) ? order.products.reduce((sum, p) => sum + (p.qty || 0), 0) : "N/A";
                      const productDetails = Array.isArray(order.products) ? order.products.map((p) => `${p.productType || "N/A"} (${p.qty || "N/A"})`).join(", ") : "N/A";
                      return (
                        <tr key={order._id} style={{ background: index % 2 === 0 ? "#f8f9fa" : "#fff", transition: "all 0.3s ease" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#e9ecef")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = index % 2 === 0 ? "#f8f9fa" : "#fff")}>
                          <td style={tdStyle} title={order.orderId || "N/A"}>{order.orderId || "N/A"}</td>
                          <td style={tdStyle} title={order.soDate ? new Date(order.soDate).toLocaleDateString("en-IN") : "N/A"}>{order.soDate ? new Date(order.soDate).toLocaleDateString("en-IN") : "N/A"}</td>
                          <td style={tdStyle} title={order.customername || "N/A"}>{order.customername || "N/A"}</td>
                          <td style={{ ...tdStyle, maxWidth: "200px" }} title={order.shippingAddress || "N/A"}>{order.shippingAddress || "N/A"}</td>
                          <td style={tdStyle} title={order.customerEmail || "N/A"}>{order.customerEmail || "N/A"}</td>
                          <td style={tdStyle} title={order.contactNo || "N/A"}>{order.contactNo || "N/A"}</td>
                          <td style={tdStyle} title={order.orderType || "N/A"}>{order.orderType || "N/A"}</td>
                          <td style={{ ...tdStyle, maxWidth: "200px" }} title={productDetails}>{productDetails}</td>
                          <td style={tdStyle} title={firstProduct.size || "N/A"}>{firstProduct.size || "N/A"}</td>
                          <td style={tdStyle} title={firstProduct.spec || "N/A"}>{firstProduct.spec || "N/A"}</td>
                          <td style={tdStyle} title={firstProduct.modelNos?.length > 0 ? firstProduct.modelNos.join(", ") : "N/A"}>{firstProduct.modelNos?.length > 0 ? firstProduct.modelNos.join(", ") : "N/A"}</td>
                          <td style={{ ...tdStyle, maxWidth: "150px" }} title={order.poFilePath ? "Attached" : "Not Attached"}>
                            <Badge style={{ background: order.poFilePath ? "linear-gradient(135deg, #28a745, #4cd964)" : "linear-gradient(135deg, #ff6b6b, #ff8787)", color: "#fff", padding: "6px 14px", borderRadius: "20px", fontWeight: "600", fontSize: "0.9rem", boxShadow: "0 2px 5px rgba(0,0,0,0.15)" }}>
                              {order.poFilePath ? "Attached" : "Not Attached"}
                            </Badge>
                          </td>
                          <td style={tdStyle} title={order.remarks || "N/A"}>{order.remarks || "N/A"}</td>
                          <td style={tdStyle} title={order.fulfillingStatus || "Pending"}>
                            <Badge style={{ background: order.fulfillingStatus === "Under Process" ? "linear-gradient(135deg, #f39c12, #f7c200)" : order.fulfillingStatus === "Pending" ? "linear-gradient(135deg, #ff6b6b, #ff8787)" : order.fulfillingStatus === "Partial Dispatch" ? "linear-gradient(135deg, #00c6ff, #0072ff)" : order.fulfillingStatus === "Fulfilled" ? "linear-gradient(135deg, #28a745, #4cd964)" : order.fulfillingStatus === "Order Cancel" ? "linear-gradient(135deg, #8e0e00, #e52d27)" : order.fulfillingStatus === "Hold" ? "linear-gradient(135deg, #2e2e2e, #4a4a4a)" : "linear-gradient(135deg, #6c757d, #a9a9a9)", color: "#fff", padding: "5px 10px", borderRadius: "12px", display: "inline-block", width: "100%", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                              {order.fulfillingStatus || "Pending"}
                            </Badge>
                          </td>
                          <td style={{ ...tdStyle, maxWidth: "100px" }} title={totalQty}>{totalQty}</td>
                          <td style={{ padding: "15px", textAlign: "center", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid #eee" }}>
                            <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "25px", alignItems: "center" }}>
                              <Button variant="primary" onClick={() => handleView(order)} style={{ width: "40px", height: "40px", borderRadius: "22px", padding: "0", display: "flex", alignItems: "center", justifyContent: "center" }}><FaEye style={{ marginBottom: "3px" }} /></Button>
                              <button className="editBtn" onClick={() => handleEdit(order)} style={{ minWidth: "40px", width: "40px", height: "40px", padding: "0", border: "none", background: "linear-gradient(135deg, #6c757d, #5a6268)", borderRadius: "22px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
            </>
          )}
        </div>
        {/* Edit Modal */}
        <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered backdrop="static">
          <Modal.Header closeButton style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", color: "#fff", borderBottom: "none", padding: "20px" }}>
            <Modal.Title style={{ fontWeight: "700", fontSize: "1.5rem", textTransform: "uppercase", letterSpacing: "1px" }}>Edit Production Order</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding: "30px", background: "#fff", borderRadius: "0 0 15px 15px" }}>
            <Form onSubmit={handleEditSubmit}>
              <Form.Group style={{ marginBottom: "20px" }}>
                <Form.Label style={{ fontWeight: "600", color: "#333" }}>Production Status</Form.Label>
                <Form.Select value={formData.fulfillingStatus || ""} onChange={(e) => setFormData({ ...formData, fulfillingStatus: e.target.value })} style={{ borderRadius: "10px", border: "1px solid #ced4da", padding: "12px", fontSize: "1rem" }}>
                  <option value="Under Process">Under Process</option>
                  <option value="Pending">Pending</option>
                  <option value="Partial Dispatch">Partial Dispatch</option>
                  <option value="Hold">Hold</option>
                  <option value="Order Cancel">Order Cancel</option>
                  <option value="Fulfilled">Completed</option>
                </Form.Select>
              </Form.Group>
              {formData.productUnits.length > 0 ? (
                formData.productUnits.map((unit, index) => (
                  <div key={index} style={{ marginBottom: "20px", padding: "15px", background: "#f8f9fa", borderRadius: "10px" }}>
                    <h5 style={{ fontSize: "1.1rem", color: "#333" }}>{unit.productType} - Unit {index + 1}</h5>
                    <Form.Group style={{ marginBottom: "15px" }}>
                      <Form.Label style={{ fontWeight: "600", color: "#333" }}>Spec</Form.Label>
                      <Form.Control type="text" value={unit.spec || ""} onChange={(e) => { const newUnits = [...formData.productUnits]; newUnits[index].spec = e.target.value; setFormData({ ...formData, productUnits: newUnits }); }} placeholder={`Spec for ${unit.productType} Unit ${index + 1}`} style={{ borderRadius: "10px", border: "1px solid #ced4da", padding: "12px", fontSize: "1rem" }} />
                    </Form.Group>
                    <Form.Group style={{ marginBottom: "15px" }}>
                      <Form.Label style={{ fontWeight: "600", color: "#333" }}>Model Number</Form.Label>
                      <Form.Control type="text" value={unit.modelNo || ""} onChange={(e) => { const newUnits = [...formData.productUnits]; newUnits[index].modelNo = e.target.value; setFormData({ ...formData, productUnits: newUnits }); }} placeholder={`Model No for ${unit.productType} Unit ${index + 1}`} style={{ borderRadius: "10px", border: "1px solid #ced4da", padding: "12px", fontSize: "1rem" }} />
                    </Form.Group>
                  </div>
                ))
              ) : (<p style={{ color: "#555" }}>No products available to edit.</p>)}
              <Form.Group style={{ marginBottom: "20px" }}>
                <Form.Label style={{ fontWeight: "600", color: "#333" }}>Remarks by Production <span style={{ color: "red" }}>*</span></Form.Label>
                <Form.Control as="textarea" rows={3} value={formData.remarksByProduction || ""} onChange={(e) => setFormData({ ...formData, remarksByProduction: e.target.value })} placeholder="Enter production remarks" style={{ borderRadius: "10px", border: errors.remarksByProduction ? "1px solid red" : "1px solid #ced4da", padding: "12px", fontSize: "1rem" }} />
                {errors.remarksByProduction && <Form.Text style={{ color: "red", fontSize: "0.875rem" }}>{errors.remarksByProduction}</Form.Text>}
              </Form.Group>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "15px" }}>
                <Button onClick={() => setShowEditModal(false)} style={{ background: "linear-gradient(135deg, #6c757d, #5a6268)", border: "none", padding: "10px 20px", borderRadius: "20px", color: "#fff", fontWeight: "600" }}>Cancel</Button>
                <Button type="submit" style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", border: "none", padding: "10px 20px", borderRadius: "20px", color: "#fff", fontWeight: "600" }}>Save Changes</Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>
        {/* View Modal */}
        <Modal show={showViewModal} onHide={() => setShowViewModal(false)} backdrop="static" keyboard={false} size="xl" centered style={{ backdropFilter: "blur(5px)" }}>
          <Modal.Header
            style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", color: "#fff", padding: "1.5rem 2rem", border: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <Modal.Title style={{ fontWeight: "700", fontSize: "1.8rem", letterSpacing: "1.2px", textTransform: "uppercase", fontFamily: "'Poppins', sans-serif", display: "flex", alignItems: "center", gap: "10px" }}>
              <span role="img" aria-label="clipboard">📋</span>
              Production Order #{viewOrder?.orderId || "N/A"}
            </Modal.Title>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Button onClick={handleProdPDF} disabled={prodPdfLoading}
                style={{ background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.85)", borderRadius: "50px", padding: "8px 20px", fontSize: "0.95rem", fontWeight: "600", color: "#fff", display: "flex", alignItems: "center", gap: "8px", transition: "all 0.2s ease", whiteSpace: "nowrap" }}
                onMouseEnter={(e) => { if (!prodPdfLoading) e.currentTarget.style.background = "rgba(255,255,255,0.25)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}>
                {prodPdfLoading ? <><Spinner size="sm" animation="border" /> Exporting...</> : <><FileText size={16} /> Export PDF</>}
              </Button>
              <Button variant="light" onClick={() => setShowViewModal(false)} style={{ borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.2)" }}>✕</Button>
            </div>
          </Modal.Header>
          <Modal.Body style={{ padding: "2rem", background: "linear-gradient(180deg, #f8fafc, #e2e8f0)", borderRadius: "0 0 15px 15px", maxHeight: "80vh", overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "#2575fc #e6f0fa" }}>
            {viewOrder && (
              <>
                {/* ── Off-screen PDF print container ── */}
                <div ref={prodPdfRef} style={{ width: "210mm", padding: "15mm 15mm 10mm 15mm", background: "#fff", color: "#333", fontFamily: "'Segoe UI',Tahoma,Geneva,Verdana,sans-serif", lineHeight: 1.5, position: "absolute", left: "-9999px", top: "-9999px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #2575fc", paddingBottom: "10px", marginBottom: "20px" }}>
                    <div>
                      <h1 style={{ color: "#2575fc", margin: 0, fontSize: "24px", textTransform: "uppercase", fontWeight: "bold" }}>Production Order</h1>
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
                      {[["SO Date", viewOrder.soDate ? new Date(viewOrder.soDate).toLocaleDateString("en-IN") : "N/A"], ["Order Type", viewOrder.orderType || "N/A"], ["Customer Name", viewOrder.customername || "N/A"], ["Contact No", viewOrder.contactNo || "N/A"], ["Email", viewOrder.customerEmail || "N/A"], ["Dispatch From", viewOrder.dispatchFrom || "N/A"], ["SO Status", viewOrder.sostatus || "N/A"], ["Sales Remarks", viewOrder.remarks || "N/A"]].map(([label, val]) => (
                        <div key={label} style={{ fontSize: "13px" }}><strong style={{ color: "#444" }}>{label}:</strong> {val}</div>
                      ))}
                      <div style={{ fontSize: "13px", gridColumn: "span 2" }}><strong style={{ color: "#444" }}>Shipping Address:</strong> {viewOrder.shippingAddress || "N/A"}</div>
                    </div>
                  </div>
                  {/* Products */}
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ background: "#f8f9fa", padding: "6px 10px", borderLeft: "4px solid #6a11cb", fontWeight: "bold", textTransform: "uppercase", marginBottom: "10px", fontSize: "15px" }}>Product Details</div>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>{["#", "Product", "Qty", "Size / Spec", "Unit Price", "GST", "Model Nos"].map(h => <th key={h} style={{ background: "#f1f3f5", textAlign: "left", padding: "8px", border: "1px solid #dee2e6", fontSize: "12px" }}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {Array.isArray(viewOrder.products) && viewOrder.products.length > 0 ? viewOrder.products.map((p, i) => (
                          <tr key={i}>
                            <td style={{ padding: "8px", border: "1px solid #dee2e6", fontSize: "12px" }}>{i + 1}</td>
                            <td style={{ padding: "8px", border: "1px solid #dee2e6", fontSize: "12px" }}><strong>{p.productType || "N/A"}</strong></td>
                            <td style={{ padding: "8px", border: "1px solid #dee2e6", fontSize: "12px" }}>{p.qty || 0}</td>
                            <td style={{ padding: "8px", border: "1px solid #dee2e6", fontSize: "12px" }}>{[p.size, p.spec].filter(v => v && v !== "N/A").join(" / ") || "N/A"}</td>
                            <td style={{ padding: "8px", border: "1px solid #dee2e6", fontSize: "12px" }}>₹{p.unitPrice?.toFixed(2) || "0.00"}</td>
                            <td style={{ padding: "8px", border: "1px solid #dee2e6", fontSize: "12px" }}>{p.gst || 0}%</td>
                            <td style={{ padding: "8px", border: "1px solid #dee2e6", fontSize: "11px" }}>{p.modelNos?.length > 0 ? p.modelNos.join(", ") : "N/A"}</td>
                          </tr>
                        )) : <tr><td colSpan="7" style={{ padding: "8px", border: "1px solid #dee2e6", textAlign: "center", fontSize: "12px" }}>No products</td></tr>}
                      </tbody>
                    </table>
                    <div style={{ fontSize: "13px", marginTop: "8px" }}><strong>Total Unit Price:</strong> ₹{Array.isArray(viewOrder.products) ? viewOrder.products.reduce((s, p) => s + (p.unitPrice || 0) * (p.qty || 0), 0).toFixed(2) : "0.00"}</div>
                  </div>
                  {/* Production Info */}
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ background: "#f8f9fa", padding: "6px 10px", borderLeft: "4px solid #6a11cb", fontWeight: "bold", textTransform: "uppercase", marginBottom: "10px", fontSize: "15px" }}>Production Information</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      {[["Production Status", viewOrder.fulfillingStatus || "Pending"], ["Total Quantity", Array.isArray(viewOrder.products) ? viewOrder.products.reduce((s, p) => s + (p.qty || 0), 0) : "N/A"], ["Remarks (Production)", viewOrder.remarksByProduction || "N/A"]].map(([label, val]) => (
                        <div key={label} style={{ fontSize: "13px" }}><strong style={{ color: "#444" }}>{label}:</strong> {val}</div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Visible accordion UI ── */}
                <Accordion defaultActiveKey={["0", "1", "2"]} alwaysOpen>
                  <Accordion.Item eventKey="0">
                    <Accordion.Header style={{ fontWeight: "600", fontFamily: "'Poppins', sans-serif" }}>📅 Order Information</Accordion.Header>
                    <Accordion.Body style={{ background: "#fff", borderRadius: "10px", padding: "1.5rem", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                        <div><strong>Order ID:</strong> {viewOrder.orderId || "N/A"}</div>
                        <div><strong>SO Date:</strong> {viewOrder.soDate ? new Date(viewOrder.soDate).toLocaleDateString("en-IN") : "N/A"}</div>
                        <div><strong>Order Type:</strong> <Badge bg={viewOrder.orderType === "B2C" ? "success" : viewOrder.orderType === "B2B" ? "info" : viewOrder.orderType === "B2G" ? "primary" : "secondary"}>{viewOrder.orderType || "N/A"}</Badge></div>
                        <div><strong>Customer Name:</strong> {viewOrder.customername || "N/A"}</div>
                        <div><strong>Contact No:</strong> {viewOrder.contactNo || "N/A"}</div>
                        <div><strong>Email:</strong> {viewOrder.customerEmail || "N/A"}</div>
                        <div><strong>Shipping Address:</strong> {viewOrder.shippingAddress || "N/A"}</div>
                        <div><strong>Dispatch From:</strong> {viewOrder.dispatchFrom || "N/A"}</div>
                        <div><strong>Sales Remarks:</strong> {viewOrder.remarks || "N/A"}</div>
                        <div><strong>SO Status:</strong> <Badge bg={viewOrder.sostatus === "Approved" ? "success" : viewOrder.sostatus === "Accounts Approved" ? "info" : "warning"}>{viewOrder.sostatus || "N/A"}</Badge></div>
                      </div>
                      {viewOrder.poFilePath && (
                        <div style={{ marginTop: "1rem" }}>
                          <strong>📎 Attachment: </strong>
                          <Button size="sm" onClick={() => handleDownload(viewOrder.poFilePath, "AV_EdTech")} style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", border: "none", color: "white", marginLeft: "10px", borderRadius: "20px", padding: "5px 15px" }}>Download 📥</Button>
                        </div>
                      )}
                    </Accordion.Body>
                  </Accordion.Item>
                  <Accordion.Item eventKey="1">
                    <Accordion.Header style={{ fontWeight: "600", fontFamily: "'Poppins', sans-serif" }}>📦 Product Information</Accordion.Header>
                    <Accordion.Body style={{ background: "#fff", borderRadius: "10px", padding: "1.5rem", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }}>
                      {Array.isArray(viewOrder.products) && viewOrder.products.length > 0 ? viewOrder.products.map((product, index) => (
                        <Card key={index} style={{ marginBottom: "1rem", border: "none", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", borderRadius: "10px" }}>
                          <Card.Body>
                            <Card.Title style={{ fontSize: "1.1rem", fontWeight: "600", color: "#1e293b" }}>Product {index + 1}: {product.productType || "N/A"}</Card.Title>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.5rem" }}>
                              <div><strong>Quantity:</strong> {product.qty || "N/A"}</div>
                              <div><strong>Size:</strong> {product.size || "N/A"}</div>
                              <div><strong>Spec:</strong> {product.spec || "N/A"}</div>
                              <div><strong>Unit Price:</strong> ₹{product.unitPrice?.toFixed(2) || "0.00"}</div>
                              <div><strong>GST:</strong> {product.gst || "N/A"}%</div>
                              <div><strong>Model Nos:</strong> {product.modelNos?.length > 0 ? product.modelNos.join(", ") : "N/A"}</div>
                            </div>
                          </Card.Body>
                        </Card>
                      )) : <p style={{ color: "#555" }}>No products available.</p>}
                      {viewOrder.productRemarks && (
                        <div style={{ margin: "0.75rem 0", padding: "0.75rem 1rem", background: "#f1f5f9", borderRadius: "0.75rem", fontSize: "0.95rem", color: "#475569", borderLeft: "4px solid #6366f1" }}>
                          <strong>Product Remarks:</strong> {viewOrder.productRemarks}
                        </div>
                      )}
                      <div style={{ marginTop: "0.5rem" }}><strong>Total Unit Price:</strong> ₹{Array.isArray(viewOrder.products) ? viewOrder.products.reduce((sum, p) => sum + (p.unitPrice || 0) * (p.qty || 0), 0).toFixed(2) : "0.00"}</div>
                    </Accordion.Body>
                  </Accordion.Item>
                  <Accordion.Item eventKey="2">
                    <Accordion.Header style={{ fontWeight: "600", fontFamily: "'Poppins', sans-serif" }}>🛠️ Production Information</Accordion.Header>
                    <Accordion.Body style={{ background: "#fff", borderRadius: "10px", padding: "1.5rem", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                        <div><strong>Production Status:</strong>{" "}
                          <Badge style={{ background: viewOrder.fulfillingStatus === "Under Process" ? "linear-gradient(135deg, #f39c12, #f7c200)" : viewOrder.fulfillingStatus === "Pending" ? "linear-gradient(135deg, #ff6b6b, #ff8787)" : viewOrder.fulfillingStatus === "Fulfilled" ? "linear-gradient(135deg, #28a745, #4cd964)" : "linear-gradient(135deg, #6c757d, #a9a9a9)", color: "#fff", padding: "5px 10px", borderRadius: "12px" }}>
                            {viewOrder.fulfillingStatus || "Pending"}
                          </Badge>
                        </div>
                        <div><strong>Total Quantity:</strong> {Array.isArray(viewOrder.products) ? viewOrder.products.reduce((sum, p) => sum + (p.qty || 0), 0) : "N/A"}</div>
                        <div><strong>Remarks (Production):</strong> {viewOrder.remarksByProduction || "N/A"}</div>
                        <div><strong>Sales Remarks:</strong> {viewOrder.remarks || "N/A"}</div>
                      </div>
                      {viewOrder.installationFile && (
                        <div style={{ marginTop: "1rem" }}>
                          <strong>Installation Report: </strong>
                          <Button size="sm" onClick={() => handleDownload(viewOrder.installationFile, "SalesOrder_InstallationReport")} style={{ background: "linear-gradient(135deg, #17a2b8, #138496)", border: "none", color: "white", marginLeft: "10px", borderRadius: "20px", padding: "5px 15px" }}>Download Report 📥</Button>
                        </div>
                      )}
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
      </div>
      <footer className="footer-container" style={{ padding: "10px", textAlign: "center", background: "linear-gradient(135deg, #2575fc, #6a11cb)", color: "white", marginTop: "auto" }}>
        <p style={{ margin: 0, fontSize: "0.9rem" }}>© 2025 Sales Order Management. All rights reserved.</p>
      </footer>
    </>
  );
};

export default Production;
