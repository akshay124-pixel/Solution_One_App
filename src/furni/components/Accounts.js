import React, { useEffect, useState, useCallback } from "react";
import furniApi from "../axiosSetup";
import { Button, Modal, Badge, Form, Spinner } from "react-bootstrap";
import { FaEye, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import ViewEntry from "./ViewEntry";

function Accounts() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [formData, setFormData] = useState({
    total: "",
    paymentReceived: "Not Received",
    remarksByAccounts: "",
    installationStatus: "Pending",
    paymentCollected: "",
    paymentMethod: "",
    paymentDue: "",
    neftTransactionId: "",
    chequeId: "",
  });
  const [errors, setErrors] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const fetchAccountsOrders = useCallback(async () => {
    if (orders.length === 0) {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await furniApi.get("/api/accounts-orders");

      if (response.data.success) {
        const data = Array.isArray(response.data.data) ? response.data.data : [];
        setOrders(data);
        setFilteredOrders(data);
      } else {
        throw new Error(response.data.message || "We couldn't load your orders right now.");
      }
    } catch (error) {
      console.error("Error fetching accounts orders:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      let errorMessage = "Something went wrong while loading your orders.";
      if (!navigator.onLine) {
        errorMessage = "You are offline. Please check your internet connection.";
      } else if (error.response?.status === 401) {
        errorMessage = "Your session has expired. Please log in again.";
      } else if (error.response?.status === 404) {
        errorMessage = "No orders found for your account.";
      }

      setError(errorMessage);
      toast.error(errorMessage, { position: "top-right", autoClose: 5000 });
    } finally {
      if (orders.length === 0) {
        setLoading(false);
      }
    }
  }, [orders.length]);

  useEffect(() => {
    if (formData.paymentReceived === "Received") {
      setFormData((prev) => ({
        ...prev,
        paymentDue: "0",
        paymentCollected: Number(prev.total || 0).toFixed(2),
      }));
    }
  }, [formData.paymentReceived]);

  useEffect(() => {
    fetchAccountsOrders();
  }, [fetchAccountsOrders]);

  const filterOrders = useCallback(() => {
    let filtered = [...orders];
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((order) => {
        const productDetails = Array.isArray(order.products)
          ? order.products.map((p) => `${p.productType || ""} (${p.qty || ""})`).join(", ")
          : "";
        return (
          (order.billNumber || "").toLowerCase().includes(query) ||
          (order.dispatchDate ? new Date(order.dispatchDate).toLocaleDateString() : "").toLowerCase().includes(query) ||
          (order.shippingAddress || "").toLowerCase().includes(query) ||
          (order.customerEmail || "").toLowerCase().includes(query) ||
          (order.contactNo || "").toLowerCase().includes(query) ||
          (order.total?.toString() || "").toLowerCase().includes(query) ||
          productDetails.toLowerCase().includes(query) ||
          (order.paymentReceived || "").toLowerCase().includes(query) ||
          (order.paymentMethod || "").toLowerCase().includes(query) ||
          (order.paymentCollected?.toString() || "").toLowerCase().includes(query) ||
          (order.paymentDue?.toString() || "").toLowerCase().includes(query) ||
          (order.neftTransactionId || "").toLowerCase().includes(query) ||
          (order.chequeId || "").toLowerCase().includes(query) ||
          (order.invoiceDate ? new Date(order.invoiceDate).toLocaleDateString() : "").toLowerCase().includes(query) ||
          (order.remarksByAccounts || "").toLowerCase().includes(query) ||
          (order.products?.[0]?.gst?.toString() || "").toLowerCase().includes(query) ||
          (order.products?.[0]?.serialNos?.join(", ") || "").toLowerCase().includes(query) ||
          (order.products?.[0]?.modelNos?.join(", ") || "").toLowerCase().includes(query)
        );
      });
    }
    if (statusFilter !== "All") {
      filtered = filtered.filter(
        (order) => (order.paymentReceived || "Not Received") === statusFilter
      );
    }
    setFilteredOrders(filtered);
  }, [orders, searchQuery, statusFilter]);

  useEffect(() => {
    filterOrders();
  }, [filterOrders]);

  const uniqueStatuses = [
    "All",
    "Received",
    "Not Received",
    ...new Set(
      orders
        .map((order) => order.paymentReceived || "Not Received")
        .filter((status) => !["Received", "Not Received"].includes(status))
    ),
  ];

  const handleViewClick = (order) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
  };

  const handleEdit = (order) => {
    setEditOrder(order);
    setFormData({
      total: order.total || "",
      paymentReceived: order.paymentReceived || "Not Received",
      remarksByAccounts: order.remarksByAccounts || "",
      installationStatus: order.installationStatus || "Pending",
      paymentCollected:
        order.paymentReceived === "Received"
          ? Number(order.total || 0).toFixed(2)
          : order.paymentCollected || "",
      paymentMethod: order.paymentMethod || "",
      paymentDue: order.paymentReceived === "Received" ? "0" : order.paymentDue || "",
      neftTransactionId: order.neftTransactionId || "",
      chequeId: order.chequeId || "",
    });
    setErrors({});
    setShowEditModal(true);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.remarksByAccounts || formData.remarksByAccounts.trim() === "") {
      newErrors.remarksByAccounts = "Remarks are required";
    }
    if (formData.paymentMethod && !["Cash", "NEFT", "RTGS", "Cheque", ""].includes(formData.paymentMethod)) {
      newErrors.paymentMethod = "Invalid Payment Method";
    }
    if (formData.paymentMethod === "NEFT" && (!formData.neftTransactionId || formData.neftTransactionId.trim() === "")) {
      newErrors.neftTransactionId = "NEFT Transaction ID is required for NEFT payments";
    }
    if (formData.paymentMethod === "Cheque" && (!formData.chequeId || formData.chequeId.trim() === "")) {
      newErrors.chequeId = "Cheque ID is required for Cheque payments";
    }
    if (formData.paymentReceived === "Received" && (!formData.paymentCollected || Number(formData.paymentCollected) <= 0)) {
      newErrors.paymentCollected = "Payment Collected must be greater than 0 when Payment Received is set";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const submissionData = {
        total: Number(formData.total) || undefined,
        paymentReceived: formData.paymentReceived,
        remarksByAccounts: formData.remarksByAccounts,
        paymentCollected: formData.paymentCollected ? Number(formData.paymentCollected) : undefined,
        paymentMethod: formData.paymentMethod || undefined,
        paymentDue: formData.paymentDue ? Number(formData.paymentDue) : undefined,
        neftTransactionId: formData.neftTransactionId || undefined,
        chequeId: formData.chequeId || undefined,
        installationStatus: formData.installationStatus || undefined,
      };

      const response = await furniApi.put(`/api/edit/${editOrder?._id}`, submissionData);

      if (response.data.success) {
        const updatedOrder = response.data.data;
        const shouldRemoveFromDashboard = updatedOrder.paymentReceived === "Received";

        if (shouldRemoveFromDashboard) {
          setOrders((prev) => prev.filter((o) => o._id !== updatedOrder._id));
          setFilteredOrders((prev) => prev.filter((o) => o._id !== updatedOrder._id));
        } else {
          setOrders((prev) => prev.map((o) => o._id === updatedOrder._id ? { ...o, ...updatedOrder } : o));
          setFilteredOrders((prev) => prev.map((o) => o._id === updatedOrder._id ? { ...o, ...updatedOrder } : o));
        }

        setShowEditModal(false);
        toast.success("Order updated successfully!", { position: "top-right", autoClose: 3000 });
      } else {
        throw new Error(response.data.message || "Failed to update order");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update order", {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };

  const exportToExcel = useCallback(() => {
    const exportData = filteredOrders.map((order) => {
      const productDetails = Array.isArray(order.products)
        ? order.products.map((p) => `${p.productType || "N/A"} (${p.qty || "N/A"})`).join(", ")
        : "N/A";
      return {
        "Order ID": order.orderId || "N/A",
        "Customer Name": order.customername || "N/A",
        "Bill Number": order.billNumber || "N/A",
        "PI Number": order.piNumber || "N/A",
        "Invoice Date": order.invoiceDate ? new Date(order.invoiceDate).toLocaleDateString() : "N/A",
        Total: order.total ? `₹${order.total.toFixed(2)}` : "N/A",
        "Payment Collected": order.paymentCollected ? `₹${order.paymentCollected}` : "N/A",
        "Payment Due": order.paymentDue ? `₹${order.paymentDue}` : "N/A",
        "Payment Method": order.paymentMethod || "N/A",
        "Payment Terms": order.paymentTerms || "N/A",
        "Payment Received": order.paymentReceived || "Not Received",
        Products: productDetails,
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Accounts Orders");
    XLSX.writeFile(workbook, `Accounts_Orders_${new Date().toISOString().split("T")[0]}.xlsx`);
  }, [filteredOrders]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("All");
  };

  if (loading && orders.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)" }}>
        <Spinner animation="border" style={{ width: "50px", height: "50px", color: "#2575fc", marginBottom: "15px" }} />
        <p style={{ fontSize: "1.3rem", color: "#333", fontWeight: "500" }}>Loading Payment Collection Orders...</p>
      </div>
    );
  }

  return (
    <>
      <div style={{ width: "100%", margin: "0", padding: "20px", background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } @keyframes fadeIn { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }`}</style>
        <header style={{ padding: "20px", textAlign: "center", background: "linear-gradient(135deg, #2575fc, #6a11cb)", color: "#fff", boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "2px", textShadow: "2px 2px 4px rgba(0, 0, 0, 0.2)" }}>
            Payment Collection Dashboard
          </h1>
        </header>

        <div style={{ padding: "20px", flex: 1 }}>
          {error && (
            <div style={{ background: "linear-gradient(135deg, #ff6b6b, #ff8787)", color: "#fff", padding: "15px", borderRadius: "10px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span><strong>Error:</strong> {error}</span>
              <Button onClick={fetchAccountsOrders} style={{ background: "transparent", border: "1px solid #fff", color: "#fff", padding: "5px 15px", borderRadius: "20px" }}>Retry</Button>
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "15px", marginBottom: "20px", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 300px" }}>
              <Form.Control
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ borderRadius: "20px", padding: "10px 40px 10px 15px", border: "1px solid #ced4da", fontSize: "1rem", boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)" }}
              />
              {searchQuery && (
                <FaTimes style={{ position: "absolute", right: "15px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#6c757d" }} onClick={() => setSearchQuery("")} />
              )}
            </div>
            <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ flex: "0 1 200px", borderRadius: "20px", padding: "10px", border: "1px solid #ced4da", fontSize: "1rem" }}>
              {uniqueStatuses.map((status) => (<option key={status} value={status}>{status}</option>))}
            </Form.Select>
            <Button onClick={handleClearFilters} style={{ background: "linear-gradient(135deg, #6c757d, #5a6268)", border: "none", padding: "10px 20px", borderRadius: "20px", color: "#fff", fontWeight: "600" }}>Clear Filters</Button>
            <Button onClick={exportToExcel} style={{ background: "linear-gradient(135deg, #28a745, #4cd964)", border: "none", padding: "10px 20px", borderRadius: "20px", color: "#fff", fontWeight: "600" }}>Export to Excel</Button>
          </div>

          <div style={{ overflowX: "auto", maxHeight: "550px", border: "1px solid rgba(0, 0, 0, 0.1)", borderRadius: "8px", backgroundColor: "rgba(255, 255, 255, 0.8)", boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0" }}>
              <thead style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", color: "#fff", position: "sticky", top: 0, zIndex: 2 }}>
                <tr>
                  {["Order ID", "Customer Name", "Bill Number", "PI Number", "Invoice Date", "Total", "Payment Collected", "Payment Due", "Payment Method", "Payment Terms", "Payment Received", "Actions"].map((header, index) => (
                    <th key={index} style={{ padding: "15px", textAlign: "center", fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase", borderBottom: "2px solid rgba(255, 255, 255, 0.2)", whiteSpace: "nowrap" }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="12" style={{ padding: "20px", textAlign: "center" }}><Spinner animation="border" style={{ width: "30px", height: "30px", color: "#2575fc", marginRight: "10px" }} />Loading orders...</td></tr>
                ) : filteredOrders.length === 0 ? (
                  <tr><td colSpan="12" style={{ padding: "20px", textAlign: "center", color: "#6b7280", fontStyle: "italic" }}>{searchQuery || statusFilter !== "All" ? "No orders match your search criteria." : "No Payment Collection orders available."}</td></tr>
                ) : (
                  filteredOrders.slice().sort((a, b) => {
                    const dateA = a.invoiceDate ? new Date(a.invoiceDate) : new Date(0);
                    const dateB = b.invoiceDate ? new Date(b.invoiceDate) : new Date(0);
                    if (dateA.getTime() === dateB.getTime()) return b._id.localeCompare(a._id);
                    return dateB - dateA;
                  }).map((order, index) => (
                    <tr key={order._id} style={{ background: index % 2 === 0 ? "#f8f9fa" : "#fff", transition: "all 0.3s ease", borderBottom: "1px solid #e6f0fa" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#e9ecef")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = index % 2 === 0 ? "#f8f9fa" : "#fff")}>
                      {[
                        order.orderId || "N/A",
                        order.customername || "N/A",
                        order.billNumber || "N/A",
                        order.piNumber || "N/A",
                        order.invoiceDate ? new Date(order.invoiceDate).toLocaleDateString() : "N/A",
                        order.total ? `₹${order.total.toFixed(2)}` : "N/A",
                        order.paymentCollected ? `₹${order.paymentCollected}` : "N/A",
                        order.paymentDue ? `₹${order.paymentDue}` : "N/A",
                        order.paymentMethod || "N/A",
                        order.paymentTerms || "N/A",
                      ].map((cell, i) => (
                        <td key={i} style={{ padding: "15px", textAlign: "center", color: "#2c3e50", fontSize: "1rem", height: "40px", lineHeight: "40px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "150px" }} title={String(cell)}>{cell}</td>
                      ))}
                      <td style={{ padding: "15px", textAlign: "center" }}>
                        <Badge bg={order.paymentReceived === "Received" ? "success" : "warning"} style={{ padding: "6px 12px", fontSize: "0.9rem" }}>{order.paymentReceived || "Not Received"}</Badge>
                      </td>
                      <td style={{ padding: "15px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                          <Button variant="primary" onClick={() => handleViewClick(order)} style={{ width: "40px", height: "40px", borderRadius: "50%", padding: "0", display: "flex", alignItems: "center", justifyContent: "center" }}><FaEye /></Button>
                          <button className="editBtn" onClick={() => handleEdit(order)} style={{ width: "40px", height: "40px", borderRadius: "50%", padding: "0", background: "#6b7280", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg height="1em" viewBox="0 0 512 512" fill="#ffffff"><path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", color: "#fff" }}>
          <Modal.Title>Edit Payment Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleEditSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Payment Received</Form.Label>
              <Form.Select value={formData.paymentReceived} onChange={(e) => setFormData((p) => ({ ...p, paymentReceived: e.target.value }))}>
                <option value="Not Received">Not Received</option>
                <option value="Received">Received</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Payment Collected</Form.Label>
              <Form.Control type="number" value={formData.paymentCollected} onChange={(e) => setFormData((p) => ({ ...p, paymentCollected: e.target.value }))} isInvalid={!!errors.paymentCollected} />
              <Form.Control.Feedback type="invalid">{errors.paymentCollected}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Payment Method</Form.Label>
              <Form.Select value={formData.paymentMethod} onChange={(e) => setFormData((p) => ({ ...p, paymentMethod: e.target.value }))} isInvalid={!!errors.paymentMethod}>
                <option value="">Select</option>
                {["Cash", "NEFT", "RTGS", "Cheque"].map((m) => <option key={m} value={m}>{m}</option>)}
              </Form.Select>
              <Form.Control.Feedback type="invalid">{errors.paymentMethod}</Form.Control.Feedback>
            </Form.Group>
            {formData.paymentMethod === "NEFT" && (
              <Form.Group className="mb-3">
                <Form.Label>NEFT Transaction ID</Form.Label>
                <Form.Control value={formData.neftTransactionId} onChange={(e) => setFormData((p) => ({ ...p, neftTransactionId: e.target.value }))} isInvalid={!!errors.neftTransactionId} />
                <Form.Control.Feedback type="invalid">{errors.neftTransactionId}</Form.Control.Feedback>
              </Form.Group>
            )}
            {formData.paymentMethod === "Cheque" && (
              <Form.Group className="mb-3">
                <Form.Label>Cheque ID</Form.Label>
                <Form.Control value={formData.chequeId} onChange={(e) => setFormData((p) => ({ ...p, chequeId: e.target.value }))} isInvalid={!!errors.chequeId} />
                <Form.Control.Feedback type="invalid">{errors.chequeId}</Form.Control.Feedback>
              </Form.Group>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Remarks <span style={{ color: "red" }}>*</span></Form.Label>
              <Form.Control as="textarea" rows={3} value={formData.remarksByAccounts} onChange={(e) => setFormData((p) => ({ ...p, remarksByAccounts: e.target.value }))} isInvalid={!!errors.remarksByAccounts} />
              <Form.Control.Feedback type="invalid">{errors.remarksByAccounts}</Form.Control.Feedback>
            </Form.Group>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button type="submit" style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", border: "none" }}>Save Changes</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {isViewModalOpen && (
        <ViewEntry isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} entry={selectedOrder} />
      )}
    </>
  );
}

export default Accounts;
