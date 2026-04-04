import React, { useEffect, useState, useCallback } from "react";
import furniApi from "../axiosSetup";
import { Button, Modal, Badge, Form, Spinner } from "react-bootstrap";
import { FaEye, FaTimes, FaEnvelope, FaDownload } from "react-icons/fa";
import { toast } from "react-toastify";
import { exportToExcel } from "../../utils/excelHelper";
import "../../App.css";
import { salesPersonlist } from "./Options";

const FURNI_ORIGIN = (() => {
  try { return new URL(process.env.REACT_APP_FURNI_URL || "http://localhost:5050/api/furni").origin; }
  catch { return "http://localhost:5050"; }
})();

function Installation() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [formData, setFormData] = useState({ installationStatus: "Pending", remarksByInstallation: "" });
  const [currentFile, setCurrentFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [mailingInProgress, setMailingInProgress] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [salesPersonFilter, setSalesPersonFilter] = useState("All");

  const handleDownload = async (filePath) => {
    if (!filePath || typeof filePath !== "string") { toast.error("Invalid file path!"); return; }
    try {
      let processedPath = filePath;
      if (!processedPath.includes("Uploads") && !processedPath.startsWith("http")) {
        processedPath = `/Uploads/${processedPath.startsWith("/") ? processedPath.slice(1) : processedPath}`;
      }
      const endpoint = processedPath.startsWith("/") ? processedPath : `/${processedPath}`;
      const response = await furniApi.get(endpoint, { responseType: "blob", headers: { Accept: "application/pdf,image/png,image/jpeg,image/jpg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" } });
      const blob = response.data;
      const contentType = response.headers["content-type"] || "application/octet-stream";
      const extension = contentType.split("/")[1] || "file";
      const fileName = filePath.split("/").pop() || `download.${extension}`;
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
      toast.success("Download started!");
    } catch (err) { console.error(err); toast.error("Download failed. Check server."); }
  };

  const fetchInstallationOrders = useCallback(async () => {
    setInitialLoading(true); setError(null);
    try {
      const response = await furniApi.get("/api/installation-orders");
      if (response.data.success) { setOrders(response.data.data); setFilteredOrders(response.data.data); }
      else throw new Error(response.data.message || "Failed to fetch installation orders");
    } catch (error) {
      let msg = "Something went wrong. Please try again.";
      if (error.response) {
        if (error.response.status === 404) msg = "No orders found.";
        else if (error.response.status === 401) msg = "Your session has expired. Please log in again.";
        else if (error.response.status === 500) msg = "Server is facing issues. Please try later.";
        else msg = error.response.data?.message || "Unable to load orders at this moment.";
      } else if (error.request) msg = "Unable to connect to the server. Please check your internet connection.";
      setError(msg);
      toast.error(msg, { position: "top-right", autoClose: 5000 });
    } finally { setInitialLoading(false); }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchInstallationOrders().then(() => { if (!isMounted) setInitialLoading(false); });
    return () => { isMounted = false; };
  }, [fetchInstallationOrders]);

  useEffect(() => {
    let filtered = orders;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((order) => {
        const pd = Array.isArray(order.products) ? order.products.map((p) => `${p.productType || ""} (${p.qty || ""})`).join(", ") : "";
        return (order.orderId || "").toLowerCase().includes(query) || (order.name || "").toLowerCase().includes(query) ||
          (order.contactNo || "").toLowerCase().includes(query) || (order.shippingAddress || "").toLowerCase().includes(query) ||
          (order.installation || "").toLowerCase().includes(query) || (order.installationStatus || "").toLowerCase().includes(query) ||
          pd.toLowerCase().includes(query) || (order.products?.[0]?.size || "").toLowerCase().includes(query) ||
          (order.products?.[0]?.spec || "").toLowerCase().includes(query) ||
          (order.products?.[0]?.serialNos?.join(", ") || "").toLowerCase().includes(query) ||
          (order.products?.[0]?.modelNos?.join(", ") || "").toLowerCase().includes(query);
      });
    }
    if (statusFilter !== "All") filtered = filtered.filter((o) => o.installationStatus === statusFilter);
    if (salesPersonFilter !== "All") filtered = filtered.filter((o) => o.salesPerson === salesPersonFilter);
    if (startDate) filtered = filtered.filter((o) => new Date(o.dispatchDate) >= new Date(startDate));
    if (endDate) filtered = filtered.filter((o) => new Date(o.dispatchDate) <= new Date(endDate));
    setFilteredOrders(filtered);
  }, [orders, searchQuery, statusFilter, salesPersonFilter, startDate, endDate]);

  const isDispatchOverdue = useCallback((dispatchDate) => {
    if (!dispatchDate) return false;
    return (new Date() - new Date(dispatchDate)) / (1000 * 60 * 60 * 24) >= 15;
  }, []);

  const totalPending = filteredOrders.filter((o) => o.installationStatus === "Pending").length;
  const uniqueStatuses = ["All", "Pending", "In Progress", "Completed",
    ...new Set(orders.map((o) => o.installationStatus || "Pending").filter((s) => !["Pending", "In Progress", "Completed"].includes(s)))];

  const handleView = (order) => { setViewOrder(order); setShowViewModal(true); setCopied(false); };

  const handleCopy = useCallback(() => {
    if (!viewOrder) return;
    const productsText = Array.isArray(viewOrder.products)
      ? viewOrder.products.map((p, i) => `Product ${i + 1}: ${p.productType || "N/A"} (Qty: ${p.qty || "N/A"}, Size: ${p.size || "N/A"}, Spec: ${p.spec || "N/A"}, Serial Nos: ${p.serialNos?.join(", ") || "N/A"}, Model Nos: ${p.modelNos?.join(", ") || "N/A"})`).join("\n")
      : "N/A";
    const orderText = `Order ID: ${viewOrder.orderId || "N/A"}\nContact Person: ${viewOrder.name || "N/A"}\nContact No: ${viewOrder.contactNo || "N/A"}\nShipping Address: ${viewOrder.shippingAddress || "N/A"}\nInstallation Details: ${viewOrder.installation || "N/A"}\nInstallation Status: ${viewOrder.installationStatus || "Pending"}\nRemarks: ${viewOrder.remarksByInstallation || "N/A"}\nProducts:\n${productsText}`;
    navigator.clipboard.writeText(orderText)
      .then(() => { setCopied(true); toast.success("Details copied to clipboard!", { position: "top-right", autoClose: 2000 }); setTimeout(() => setCopied(false), 2000); })
      .catch((err) => { toast.error("Failed to copy details!"); console.error("Copy error:", err); });
  }, [viewOrder]);

  const handleEdit = (order) => {
    setEditOrder(order);
    setFormData({ installationStatus: order.installationStatus || "Pending", installationReport: order.installationReport || "No", remarksByInstallation: order.remarksByInstallation || "", installationFile: null });
    setCurrentFile(order.installationFile || null);
    setErrors({});
    setShowEditModal(true);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.remarksByInstallation || formData.remarksByInstallation.trim() === "") newErrors.remarksByInstallation = "Remarks are required";
    if (formData.installationStatus === "Completed" && formData.installationReport === "Yes" && !formData.installationFile && !currentFile) {
      newErrors.installationFile = "Please upload Installation Report file. It is mandatory when report is marked Yes.";
      toast.warning("Please upload Installation Report file. It is mandatory when report is marked Yes.", { position: "top-right", autoClose: 5000 });
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("installationStatus", formData.installationStatus);
      formDataToSend.append("installationReport", formData.installationReport || "No");
      formDataToSend.append("remarksByInstallation", formData.remarksByInstallation);
      if (formData.installationFile) formDataToSend.append("installationFile", formData.installationFile);
      const response = await furniApi.put(`/api/edit/${editOrder?._id}`, formDataToSend, { headers: { "Content-Type": "multipart/form-data" } });
      if (response.data.success) {
        const updatedOrder = response.data.data;
        const shouldRemove = updatedOrder.installationStatus === "Completed" && updatedOrder.installationReport === "Yes";
        if (shouldRemove) {
          setOrders((prev) => prev.filter((o) => o._id !== editOrder._id));
          setFilteredOrders((prev) => prev.filter((o) => o._id !== editOrder._id));
        } else {
          const updated = { ...editOrder, installationStatus: updatedOrder.installationStatus, installationReport: updatedOrder.installationReport, remarksByInstallation: updatedOrder.remarksByInstallation };
          setOrders((prev) => prev.map((o) => o._id === editOrder._id ? updated : o));
          setFilteredOrders((prev) => prev.map((o) => o._id === editOrder._id ? updated : o));
        }
        setShowEditModal(false);
        toast.success("Order updated successfully!", { position: "top-right", autoClose: 3000 });
      } else throw new Error(response.data.message || "Failed to update order");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update order", { position: "top-right", autoClose: 5000 });
    }
  };

  const handleSendMail = useCallback(async (order) => {
    setMailingInProgress(order._id);
    try {
      const response = await furniApi.post("/api/send-completion-mail", { orderId: order._id });
      if (response.data.success) toast.success(`Mail sent for Order #${order.orderId || order._id}`);
      else toast.error(response.data.message || "Failed to send mail");
    } catch (error) { console.error("Mail Error:", error); toast.error("Error sending mail"); }
    finally { setMailingInProgress(""); }
  }, []);

  const handleClearFilters = () => { setSearchQuery(""); setStatusFilter("All"); setSalesPersonFilter("All"); setStartDate(""); setEndDate(""); };

  const handleExportExcel = async () => {
    const exportData = filteredOrders.map((order) => ({
      "Order ID": order.orderId || "N/A",
      "Product Details": Array.isArray(order.products) ? order.products.map((p) => `${p.productType || "N/A"} (${p.qty || "N/A"})`).join(", ") : "N/A",
      "Contact Person": order.name || "N/A", "Contact No": order.contactNo || "N/A",
      "Shipping Address": order.shippingAddress || "N/A", "Installation Details": order.installation || "N/A",
      "Installation Status": order.installationStatus || "Pending",
    }));
    await exportToExcel(exportData, "Installation Orders", `Installation_Orders_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  if (initialLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)" }}>
        <Spinner animation="border" style={{ width: "50px", height: "50px", color: "#2575fc", marginBottom: "15px" }} />
        <p style={{ fontSize: "1.3rem", color: "#333", fontWeight: "500" }}>Loading Installation Orders...</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", margin: "0", padding: "20px", background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "20px", textAlign: "center", background: "linear-gradient(135deg, #2575fc, #6a11cb)", color: "#fff", boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)" }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "2px", textShadow: "2px 2px 4px rgba(0, 0, 0, 0.2)" }}>Installation Dashboard</h1>
      </header>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "15px", marginTop: "20px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 300px" }}>
          <Form.Control type="text" placeholder="Search orders..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ borderRadius: "20px", padding: "10px 40px 10px 15px", border: "1px solid #ced4da", fontSize: "1rem", boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)" }} />
          {searchQuery && <FaTimes style={{ position: "absolute", right: "15px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#6c757d" }} onClick={() => setSearchQuery("")} />}
        </div>
        <Form.Control type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ flex: "0 1 200px", borderRadius: "20px", padding: "10px", border: "1px solid #ced4da", fontSize: "1rem", boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)" }} />
        <Form.Control type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ flex: "0 1 200px", borderRadius: "20px", padding: "10px", border: "1px solid #ced4da", fontSize: "1rem", boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)" }} />
        <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ flex: "0 1 200px", borderRadius: "20px", padding: "10px", border: "1px solid #ced4da", fontSize: "1rem", boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)" }}>
          {uniqueStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </Form.Select>
        <Form.Select value={salesPersonFilter} onChange={(e) => setSalesPersonFilter(e.target.value)} style={{ flex: "0 1 200px", borderRadius: "20px", padding: "10px", border: "1px solid #ced4da", fontSize: "1rem", boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)" }}>
          <option value="All">All Sales Persons</option>
          {salesPersonlist.map((sp) => <option key={sp} value={sp}>{sp}</option>)}
        </Form.Select>
        <Button onClick={handleExportExcel} style={{ background: "linear-gradient(135deg, #28a745, #4cd964)", border: "none", padding: "10px 20px", borderRadius: "20px", color: "#fff", fontWeight: "600", fontSize: "1rem", boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)", transition: "all 0.3s ease" }} onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")} onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}>Export to Excel</Button>
        <Button onClick={handleClearFilters} style={{ background: "linear-gradient(135deg, #28a745, #4cd964)", border: "none", padding: "10px 20px", borderRadius: "20px", color: "#fff", fontWeight: "600", fontSize: "1rem", boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)", transition: "all 0.3s ease" }} onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")} onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}>Clear Filters</Button>
      </div>
      <div className="total-results my-3">
        <span>Total Orders: {filteredOrders.length}</span>
        <span>Total Pending: {totalPending}</span>
      </div>
      <div style={{ padding: "20px", flex: 1 }}>
        {error && (
          <div style={{ background: "linear-gradient(135deg, #ff6b6b, #ff8787)", color: "#fff", padding: "15px", borderRadius: "10px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)" }}>
            <span><strong>Error:</strong> {error}</span>
            <Button onClick={fetchInstallationOrders} style={{ background: "transparent", border: "1px solid #fff", color: "#fff", padding: "5px 15px", borderRadius: "20px", fontWeight: "500", transition: "all 0.3s ease" }} onMouseEnter={(e) => (e.target.style.background = "#ffffff30")} onMouseLeave={(e) => (e.target.style.background = "transparent")}>Retry</Button>
          </div>
        )}
        {filteredOrders.length === 0 && !error ? (
          <div style={{ background: "linear-gradient(135deg, #ff6b6b, #ff8787)", color: "#fff", padding: "20px", borderRadius: "10px", textAlign: "center", boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)", fontSize: "1.3rem", fontWeight: "500" }}>
            No installation orders available at this time.
          </div>
        ) : (
          <div style={{ overflowX: "auto", maxHeight: "550px", border: "1px solid rgba(0, 0, 0, 0.1)", borderRadius: "8px", backgroundColor: "rgba(255, 255, 255, 0.8)", boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)", backdropFilter: "blur(10px)", position: "relative" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0" }}>
              <thead style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", color: "#fff", position: "sticky", top: 0, zIndex: 2 }}>
                <tr>
                  {["Order ID", "SO Date", "Dispatch Date", "Product Details", "Contact Person", "Contact No", "Shipping Address", "Installation Report", "Installation Status", "Installation", "Actions"].map((header, index) => (
                    <th key={index} style={{ padding: "15px", textAlign: "center", fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase", borderBottom: "2px solid rgba(255, 255, 255, 0.2)" }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.slice().sort((a, b) => {
                  const dateA = a.soDate ? new Date(a.soDate) : new Date(0);
                  const dateB = b.soDate ? new Date(b.soDate) : new Date(0);
                  if (dateA.getTime() === dateB.getTime()) return b._id.localeCompare(a._id);
                  return dateB - dateA;
                }).map((order, index) => {
                  const productDetails = Array.isArray(order.products) ? order.products.map((p) => `${p.productType || "N/A"} (${p.qty || "N/A"})`).join(", ") : "N/A";
                  const isOverdue = isDispatchOverdue(order.dispatchDate);
                  const baseBg = isOverdue ? "#fff3cd" : index % 2 === 0 ? "#f8f9fa" : "#fff";
                  const hoverBg = isOverdue ? "#ffeaa7" : "#e9ecef";
                  const tdStyle = { padding: "15px", textAlign: "center", color: "#2c3e50", fontSize: "1rem", borderBottom: "1px solid #eee", height: "40px", lineHeight: "40px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "150px" };
                  return (
                    <tr key={order._id} style={{ background: baseBg, transition: "all 0.3s ease" }} onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)} onMouseLeave={(e) => (e.currentTarget.style.background = baseBg)}>
                      <td style={tdStyle} title={order.orderId || "N/A"}>{order.orderId || "N/A"}</td>
                      <td style={tdStyle} title={order.soDate || "N/A"}>{order.soDate ? new Date(order.soDate).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "N/A"}</td>
                      <td style={tdStyle} title={order.dispatchDate || "N/A"}>{order.dispatchDate ? new Date(order.dispatchDate).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "N/A"}</td>
                      <td style={{ ...tdStyle, maxWidth: "200px" }} title={productDetails}>{productDetails}</td>
                      <td style={tdStyle} title={order.name || "N/A"}>{order.name || "N/A"}</td>
                      <td style={tdStyle} title={order.contactNo || "N/A"}>{order.contactNo || "N/A"}</td>
                      <td style={{ ...tdStyle, maxWidth: "200px" }} title={order.shippingAddress || "N/A"}>{order.shippingAddress || "N/A"}</td>
                      <td style={tdStyle} title={order.installationReport || "N/A"}>
                        <Badge style={{ background: order.installationReport === "Yes" ? "linear-gradient(135deg, #28a745, #4cd964)" : order.installationReport === "No" ? "linear-gradient(135deg, #ff6b6b, #ff8787)" : "linear-gradient(135deg, #6c757d, #a9a9a9)", color: "#fff", padding: "5px 10px", borderRadius: "12px", display: "inline-block", width: "100%", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{order.installationReport || "N/A"}</Badge>
                      </td>
                      <td style={tdStyle} title={order.installationStatus || "Pending"}>
                        <Badge style={{ background: order.installationStatus === "Pending" ? "linear-gradient(135deg, #ff6b6b, #ff8787)" : order.installationStatus === "In Progress" ? "linear-gradient(135deg, #f39c12, #f7c200)" : order.installationStatus === "Completed" ? "linear-gradient(135deg, #28a745, #4cd964)" : "linear-gradient(135deg, #6c757d, #a9a9a9)", color: "#fff", padding: "5px 10px", borderRadius: "12px", display: "inline-block", width: "100%", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{order.installationStatus || "Pending"}</Badge>
                      </td>
                      <td style={tdStyle} title={order.installation || "N/A"}>{order.installation || "N/A"}</td>
                      <td style={{ padding: "15px", textAlign: "center", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid #eee" }}>
                        <div style={{ display: "flex", gap: "10px", marginTop: "20px", justifyContent: "center", alignItems: "center" }}>
                          <Button variant="primary" onClick={() => handleView(order)} style={{ width: "40px", height: "40px", borderRadius: "22px", padding: "0", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="View order details"><FaEye style={{ marginBottom: "3px" }} /></Button>
                          <button className="editBtn" onClick={() => handleEdit(order)} style={{ minWidth: "40px", width: "40px", height: "40px", padding: "0", border: "none", background: "linear-gradient(135deg, #6c757d, #5a6268)", borderRadius: "22px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg height="1em" viewBox="0 0 512 512" fill="#fff"><path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z" /></svg>
                          </button>
                          <Button variant="info" onClick={() => handleSendMail(order)} disabled={mailingInProgress === order._id} style={{ width: "40px", height: "40px", borderRadius: "50%", padding: "0", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0dcaf0, #0aa2c0)", border: "none" }} title="Send Installation Assignment Mail">
                            {mailingInProgress === order._id ? <Spinner animation="border" size="sm" style={{ color: "white" }} /> : <FaEnvelope style={{ color: "white", fontSize: "16px" }} />}
                          </Button>
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
      <footer style={{ padding: "15px", textAlign: "center", background: "linear-gradient(135deg, #2575fc, #6a11cb)", color: "white", marginTop: "auto", boxShadow: "0 -2px 5px rgba(0, 0, 0, 0.1)" }}>
        <p style={{ margin: 0, fontSize: "0.9rem" }}>© 2025 Sales Order Management. All rights reserved.</p>
      </footer>

      {/* View Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} backdrop="static" keyboard={false} size="lg">
        <style>{`@keyframes fadeIn { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }`}</style>
        <Modal.Header closeButton style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", color: "#fff", padding: "20px", borderBottom: "none", boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)" }}>
          <Modal.Title style={{ fontWeight: "700", fontSize: "1.8rem", letterSpacing: "1px", textTransform: "uppercase", textShadow: "1px 1px 3px rgba(0, 0, 0, 0.2)", display: "flex", alignItems: "center" }}>
            <span style={{ marginRight: "10px", fontSize: "1.5rem" }}>📋</span>Installation Order Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: "30px", background: "#fff", borderRadius: "0 0 15px 15px", boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)", display: "flex", flexDirection: "column", gap: "20px", animation: "fadeIn 0.5s ease-in-out" }}>
          {viewOrder && (
            <>
              <div style={{ background: "#f8f9fa", borderRadius: "10px", padding: "20px", boxShadow: "0 3px 10px rgba(0, 0, 0, 0.05)" }}>
                <h3 style={{ fontSize: "1.3rem", fontWeight: "600", color: "#333", marginBottom: "15px", textTransform: "uppercase" }}>Installation Info</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" }}>
                  <span style={{ fontSize: "1rem", color: "#555" }}><strong>Order ID:</strong> {viewOrder.orderId || "N/A"}</span>
                  <span style={{ fontSize: "1rem", color: "#555" }}><strong>Contact Person:</strong> {viewOrder.name || "N/A"}</span>
                  <span style={{ fontSize: "1rem", color: "#555" }}><strong>Contact No:</strong> {viewOrder.contactNo || "N/A"}</span>
                  <span style={{ fontSize: "1rem", color: "#555" }}>
                    <strong>Installation Report:</strong>{" "}
                    {viewOrder.installationFile ? (
                      <Button size="sm" onClick={() => handleDownload(viewOrder.installationFile)} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "20px", background: "linear-gradient(135deg, #2575fc, #6a11cb)", color: "#fff", fontWeight: "600", fontSize: "0.85rem", border: "none", boxShadow: "0 3px 8px rgba(0,0,0,0.2)", transition: "all 0.3s ease" }}>
                        <FaDownload size={12} />Download Report
                      </Button>
                    ) : "N/A"}
                  </span>
                  <span style={{ fontSize: "1rem", color: "#555" }}><strong>Shipping Address:</strong> {viewOrder.shippingAddress || "N/A"}</span>
                  <span style={{ fontSize: "1rem", color: "#555" }}><strong>Installation Charges:</strong> {viewOrder.installation || "N/A"}</span>
                  <span style={{ fontSize: "1rem", color: "#555" }}><strong>Stamp Signed Received:</strong> {viewOrder.stamp || "N/A"}</span>
                  <span style={{ fontSize: "1rem", color: "#555" }}><strong>Remarks By Dispatch team:</strong> {viewOrder.remarksBydispatch || "N/A"}</span>
                  <span style={{ fontSize: "1rem", color: "#555" }}><strong>Dispatch Status:</strong> {viewOrder.dispatchStatus || "N/A"}</span>
                </div>
              </div>
              <div style={{ background: "#f8f9fa", borderRadius: "10px", padding: "20px", boxShadow: "0 3px 10px rgba(0, 0, 0, 0.05)" }}>
                <h3 style={{ fontSize: "1.3rem", fontWeight: "600", color: "#333", marginBottom: "15px", textTransform: "uppercase" }}>Product Info</h3>
                {Array.isArray(viewOrder.products) && viewOrder.products.length > 0 ? (
                  viewOrder.products.map((product, index) => (
                    <div key={index} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", padding: "10px 0", borderBottom: index < viewOrder.products.length - 1 ? "1px solid #eee" : "none", alignItems: "start" }}>
                      <span style={{ fontSize: "1rem", color: "#555" }}><strong>Product {index + 1} Type:</strong> {product.productType || "N/A"}</span>
                      <span style={{ fontSize: "1rem", color: "#555" }}><strong>Qty:</strong> {product.qty || "N/A"}</span>
                      <span style={{ fontSize: "1rem", color: "#555" }}><strong>Size:</strong> {product.size || "N/A"}</span>
                      <span style={{ fontSize: "1rem", color: "#555" }}><strong>Spec:</strong> {product.spec || "N/A"}</span>
                      <span style={{ fontSize: "1rem", color: "#555" }}><strong>Model Nos:</strong> {product.modelNos?.[0] || "N/A"}</span>
                    </div>
                  ))
                ) : (
                  <span style={{ fontSize: "1rem", color: "#555" }}><strong>Products:</strong> N/A</span>
                )}
              </div>
              <Button onClick={handleCopy} style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", border: "none", padding: "12px", borderRadius: "25px", color: "#fff", fontWeight: "600", fontSize: "1.1rem", textTransform: "uppercase", transition: "all 0.3s ease", boxShadow: "0 6px 15px rgba(0, 0, 0, 0.2)", alignSelf: "flex-end" }} onMouseEnter={(e) => (e.target.style.transform = "translateY(-3px)")} onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}>
                {copied ? "✅ Copied!" : "📑 Copy Details"}
              </Button>
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered backdrop="static">
        <Modal.Header closeButton style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", color: "#fff", borderBottom: "none", padding: "20px" }}>
          <Modal.Title style={{ fontWeight: "700", fontSize: "1.5rem", textTransform: "uppercase", letterSpacing: "1px" }}>Edit Installation Order</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: "30px", background: "#fff", borderRadius: "0 0 15px 15px", boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)" }}>
          <Form onSubmit={handleEditSubmit}>
            <Form.Group style={{ marginBottom: "20px" }}>
              <Form.Label style={{ fontWeight: "600", color: "#333" }}>Installation Status</Form.Label>
              <Form.Select value={formData.installationStatus} onChange={(e) => setFormData({ ...formData, installationStatus: e.target.value })} style={{ borderRadius: "10px", border: errors.installationStatus ? "1px solid red" : "1px solid #ced4da", padding: "12px", fontSize: "1rem", transition: "all 0.3s ease" }} onFocus={(e) => (e.target.style.boxShadow = "0 0 10px rgba(37, 117, 252, 0.5)")} onBlur={(e) => (e.target.style.boxShadow = "none")}>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Hold by Salesperson">Hold by Salesperson</option>
                <option value="Hold by Customer">Hold by Customer</option>
                <option value="Site Not Ready">Site Not Ready</option>
              </Form.Select>
              {errors.installationStatus && <Form.Text style={{ color: "red", fontSize: "0.875rem" }}>{errors.installationStatus}</Form.Text>}
            </Form.Group>
            {formData.installationStatus === "Completed" && (
              <Form.Group style={{ marginBottom: "20px" }}>
                <Form.Label style={{ fontWeight: "600", color: "#333" }}>Installation Report</Form.Label>
                <Form.Select value={formData.installationReport} onChange={(e) => setFormData({ ...formData, installationReport: e.target.value })} style={{ borderRadius: "10px", border: errors.installationReport ? "1px solid red" : "1px solid #ced4da", padding: "12px", fontSize: "1rem", transition: "all 0.3s ease" }} onFocus={(e) => (e.target.style.boxShadow = "0 0 10px rgba(37, 117, 252, 0.5)")} onBlur={(e) => (e.target.style.boxShadow = "none")}>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </Form.Select>
                {errors.installationReport && <Form.Text style={{ color: "red", fontSize: "0.875rem" }}>{errors.installationReport}</Form.Text>}
              </Form.Group>
            )}
            {formData.installationStatus === "Completed" && (
              <Form.Group style={{ marginBottom: "20px" }}>
                <Form.Label style={{ fontWeight: "600", color: "#333" }}>Upload Installation Report File <span style={{ color: "red" }}>*</span></Form.Label>
                <div style={{ border: errors.installationFile ? "2px dashed red" : "2px dashed #6a11cb", borderRadius: "12px", padding: "15px", textAlign: "center", background: "#f8f9ff", cursor: "pointer" }}>
                  <Form.Control type="file" accept=".pdf,.jpg,.png,.jpeg,.doc,.docx" onChange={(e) => setFormData({ ...formData, installationFile: e.target.files[0] })} style={{ display: "none" }} id="installationFileUpload" />
                  <label htmlFor="installationFileUpload" style={{ cursor: "pointer", width: "100%" }}>
                    <div style={{ fontSize: "0.95rem", color: "#333", fontWeight: "600" }}>{formData.installationFile ? `Selected: ${formData.installationFile.name}` : "Click to upload Installation Report (PDF / Image / Doc)"}</div>
                    <div style={{ fontSize: "0.8rem", color: "#666" }}>Max size as per server limit</div>
                  </label>
                </div>
                {errors.installationFile && <Form.Text style={{ color: "red", fontSize: "0.875rem", display: "block", marginTop: "5px" }}>{errors.installationFile}</Form.Text>}
              </Form.Group>
            )}
            {currentFile && (
              <div style={{ marginBottom: "20px", padding: "10px", background: "#eef2f7", borderRadius: "8px", borderLeft: "4px solid #2575fc", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: "600", marginRight: "10px", color: "#333" }}>Current Report:</span>
                <Button size="sm" onClick={() => handleDownload(currentFile)} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "20px", background: "linear-gradient(135deg, #2575fc, #6a11cb)", color: "#fff", fontWeight: "600", fontSize: "0.85rem", border: "none", boxShadow: "0 3px 8px rgba(0,0,0,0.2)", transition: "all 0.3s ease" }}>
                  <FaDownload size={12} />Download File
                </Button>
              </div>
            )}
            <Form.Group style={{ marginBottom: "20px" }}>
              <Form.Label style={{ fontWeight: "600", color: "#333" }}>Remarks by Installation <span style={{ color: "red" }}>*</span></Form.Label>
              <Form.Control as="textarea" rows={3} value={formData.remarksByInstallation} onChange={(e) => setFormData({ ...formData, remarksByInstallation: e.target.value })} placeholder="Enter remarks" style={{ borderRadius: "10px", border: errors.remarksByInstallation ? "1px solid red" : "1px solid #ced4da", padding: "12px", fontSize: "1rem", transition: "all 0.3s ease" }} onFocus={(e) => (e.target.style.boxShadow = "0 0 10px rgba(37, 117, 252, 0.5)")} onBlur={(e) => (e.target.style.boxShadow = "none")} required />
              {errors.remarksByInstallation && <Form.Text style={{ color: "red", fontSize: "0.875rem" }}>{errors.remarksByInstallation}</Form.Text>}
            </Form.Group>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "15px" }}>
              <Button onClick={() => setShowEditModal(false)} style={{ background: "linear-gradient(135deg, #6c757d, #5a6268)", border: "none", padding: "10px 20px", borderRadius: "20px", color: "#fff", fontWeight: "600", transition: "all 0.3s ease" }} onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")} onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}>Cancel</Button>
              <Button type="submit" style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", border: "none", padding: "10px 20px", borderRadius: "20px", color: "#fff", fontWeight: "600", transition: "all 0.3s ease" }} onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")} onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}>Save Changes</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default Installation;
