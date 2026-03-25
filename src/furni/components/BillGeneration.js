import React, { useState, useEffect, useCallback } from "react";
import { Button, Form, Badge, Spinner } from "react-bootstrap";
import { FaEye } from "react-icons/fa";
import ViewEntry from "./ViewEntry";
import EditBill from "./EditBill";
import furniApi from "../axiosSetup";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import PreviewModal from "./PreviewModal";

const BillGeneration = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await furniApi.get("/api/get-bill-orders");
      setOrders(response.data.data);
    } catch (error) {
      console.error("Error fetching bill orders:", error);
      toast.error("Failed to fetch bill orders!");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filterOrders = useCallback(() => {
    let filtered = [...orders];

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter((order) => {
        const productDetails = order.products
          ? order.products.map((p) => `${p.productType} (${p.qty})`).join(", ").toLowerCase()
          : "";
        const total = order.total ? order.total.toFixed(2).toString() : "0.00";
        const soDate = order.soDate ? new Date(order.soDate).toLocaleDateString().toLowerCase() : "";
        const invoiceDate = order.invoiceDate ? new Date(order.invoiceDate).toLocaleDateString().toLowerCase() : "";
        return (
          (order.orderId || "").toLowerCase().includes(lowerSearch) ||
          (order.customername || "").toLowerCase().includes(lowerSearch) ||
          (order.contactNo || "").toLowerCase().includes(lowerSearch) ||
          productDetails.includes(lowerSearch) ||
          total.includes(lowerSearch) ||
          soDate.includes(lowerSearch) ||
          (order.billNumber || "").toLowerCase().includes(lowerSearch) ||
          (order.piNumber || "").toLowerCase().includes(lowerSearch) ||
          invoiceDate.includes(lowerSearch) ||
          (order.billStatus || "").toLowerCase().includes(lowerSearch) ||
          (order.remarksByBilling || "").toLowerCase().includes(lowerSearch)
        );
      });
    }

    filtered.sort((a, b) => {
      const dateA = a.soDate ? new Date(a.soDate) : new Date(0);
      const dateB = b.soDate ? new Date(b.soDate) : new Date(0);
      return dateB - dateA;
    });

    setFilteredOrders(filtered);
  }, [orders, searchTerm]);

  useEffect(() => {
    filterOrders();
  }, [filterOrders]);

  const handleViewClick = (order) => { setSelectedOrder(order); setIsViewModalOpen(true); };
  const handlePreviewClick = (order) => { setSelectedOrder(order); setIsPreviewModalOpen(true); };
  const handleEditClick = (order) => { setSelectedOrder(order); setIsEditModalOpen(true); };

  const handleEntryUpdated = (updatedOrder) => {
    setOrders((prevOrders) =>
      prevOrders
        .map((order) => (order._id === updatedOrder._id ? updatedOrder : order))
        .filter((order) => order.billStatus !== "Billing Complete")
    );
    setIsEditModalOpen(false);
  };

  const handleExportToXLSX = () => {
    const tableData = filteredOrders.map((order, index) => ({
      "Seq No": index + 1,
      "Order ID": order.orderId || "-",
      "Customer Name": order.customername || "-",
      "Contact No": order.contactNo || "-",
      "SO Date": order.soDate ? new Date(order.soDate).toLocaleDateString("en-GB") : "-",
      Total: order.total ? `₹${order.total.toFixed(2)}` : "₹0.00",
      "Bill Number": order.billNumber || "-",
      "PI Number": order.piNumber || "-",
      "Invoice Date": order.invoiceDate ? new Date(order.invoiceDate).toLocaleDateString("en-GB") : "-",
      "Bill Status": order.billStatus || "-",
      "Remarks by Billing": order.remarksByBilling || "-",
      "Product Details": order.products ? order.products.map((p) => `${p.productType} (${p.qty})`).join(", ") : "-",
    }));

    const ws = XLSX.utils.json_to_sheet(tableData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bill Orders");
    XLSX.writeFile(wb, "Bill_Orders.xlsx");
  };

  const totalPending = filteredOrders.filter((order) => order.billStatus === "Pending").length;

  return (
    <>
      <style>{`.table-container { max-height: 600px; overflow-y: auto; overflow-x: auto; scrollbar-width: thin; scrollbar-color: #2575fc #e6f0fa; } table thead { position: sticky; top: 0; z-index: 2; background: linear-gradient(135deg, #2575fc, #6a11cb); color: white; box-shadow: 0 2px 10px rgba(0,0,0,0.2); } table tbody { background: white; } .total-results { font-size: 1.1rem; font-weight: 500; color: #333; margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; } .preview-btn { background: linear-gradient(135deg, #f59e0b, #facc15); border: none; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: transform 0.2s ease, box-shadow 0.2s ease; cursor: pointer; } .preview-btn:hover { transform: scale(1.1); box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4); } .table-container { position: relative; } .loader-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 5; background: rgba(255, 255, 255, 0.7); min-height: 200px; }`}</style>
      <div style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", padding: "25px 40px", display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "center", justifyContent: "space-between" }}>
        <Form.Control type="text" placeholder="Search Orders (ID, Customer, Products, etc.)..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ maxWidth: "450px", padding: "14px 25px", borderRadius: "30px", border: "none", background: "rgba(255,255,255,0.95)", boxShadow: "0 5px 15px rgba(0,0,0,0.2)", fontSize: "1.1rem", fontWeight: "500" }} />
        <Button onClick={handleExportToXLSX} style={{ background: "linear-gradient(135deg, #28a745, #4cd964)", border: "none", padding: "10px 20px", borderRadius: "5px", color: "#fff", fontWeight: "600", textTransform: "uppercase" }}>Export to XLSX</Button>
      </div>
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #e6f0fa, #f3e8ff)", padding: "30px", fontFamily: "'Poppins', sans-serif" }}>
        <div className="total-results">
          <span>Total Orders: {filteredOrders.length}</span>
          <span>Total Pending: {totalPending}</span>
        </div>
        <div className="table-container" style={{ background: "white", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", position: "relative", minHeight: "200px" }}>
          {isLoading && (<div className="loader-overlay"><Spinner animation="border" variant="primary" /></div>)}
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0", tableLayout: "fixed" }}>
            <thead>
              <tr>
                {[
                  { header: "Seq No", width: "80px" }, { header: "Order ID", width: "120px" }, { header: "Customer Name", width: "150px" },
                  { header: "Contact No", width: "120px" }, { header: "SO Date", width: "100px" }, { header: "Total", width: "100px" },
                  { header: "Bill Number", width: "120px" }, { header: "PI Number", width: "120px" }, { header: "Invoice Date", width: "100px" },
                  { header: "Bill Status", width: "120px" }, { header: "Actions", width: "150px" }, { header: "Product Details", width: "200px" },
                  { header: "Remarks by Billing", width: "150px" },
                ].map(({ header, width }) => (
                  <th key={header} style={{ padding: "18px 15px", fontSize: "0.95rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "2px solid rgba(255,255,255,0.2)", whiteSpace: "nowrap", width, minWidth: width, maxWidth: width, textOverflow: "ellipsis", overflow: "hidden" }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order, index) => (
                  <tr key={order._id || index} style={{ backgroundColor: "#ffffff", transition: "all 0.3s ease", borderBottom: "1px solid #e6f0fa" }}>
                    <td style={{ padding: "15px", textAlign: "center", width: "80px", minWidth: "80px", maxWidth: "80px" }}>{index + 1}</td>
                    <td style={{ padding: "15px", width: "120px", minWidth: "120px", maxWidth: "120px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{order.orderId || "-"}</td>
                    <td style={{ padding: "15px", width: "150px", minWidth: "150px", maxWidth: "150px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{order.customername || "-"}</td>
                    <td style={{ padding: "15px", width: "120px", minWidth: "120px", maxWidth: "120px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{order.contactNo || "-"}</td>
                    <td style={{ padding: "15px", width: "100px", minWidth: "100px", maxWidth: "100px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{order.soDate ? new Date(order.soDate).toLocaleDateString("en-GB") : "-"}</td>
                    <td style={{ padding: "15px", width: "100px", minWidth: "100px", maxWidth: "100px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>₹{order.total?.toFixed(2) || "0.00"}</td>
                    <td style={{ padding: "15px", width: "120px", minWidth: "120px", maxWidth: "120px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{order.billNumber || "-"}</td>
                    <td style={{ padding: "15px", width: "120px", minWidth: "120px", maxWidth: "120px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{order.piNumber || "-"}</td>
                    <td style={{ padding: "15px", width: "100px", minWidth: "100px", maxWidth: "100px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{order.invoiceDate ? new Date(order.invoiceDate).toLocaleDateString("en-GB") : "-"}</td>
                    <td style={{ padding: "15px", width: "120px", minWidth: "120px", maxWidth: "120px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      <Badge bg={order.billStatus === "Pending" ? "warning" : order.billStatus === "Under Billing" ? "info" : "success"} style={{ padding: "6px 12px", fontSize: "0.9rem" }}>{order.billStatus || "-"}</Badge>
                    </td>
                    <td style={{ padding: "15px", textAlign: "center", width: "150px", minWidth: "150px", maxWidth: "150px" }}>
                      <div style={{ display: "flex", gap: "5px", justifyContent: "center" }}>
                        <Button variant="primary" onClick={() => handleViewClick(order)} style={{ width: "40px", height: "40px", borderRadius: "50%", padding: "0", display: "flex", alignItems: "center", justifyContent: "center" }}><FaEye size={18} /></Button>
                        <button className="preview-btn" onClick={() => handlePreviewClick(order)} style={{ width: "40px", height: "40px", borderRadius: "50%", padding: "0", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Preview order">
                          <svg height="18px" viewBox="0 0 512 512" fill="#ffffff"><path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z" /></svg>
                        </button>
                        <button className="editBtn" onClick={() => handleEditClick(order)} style={{ width: "40px", height: "40px", borderRadius: "50%", padding: "0", background: "#6b7280", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg height="1em" viewBox="0 0 512 512" fill="#ffffff"><path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z" /></svg>
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: "15px", width: "200px", minWidth: "200px", maxWidth: "200px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{order.products ? order.products.map((p) => `${p.productType} (${p.qty})`).join(", ") : "-"}</td>
                    <td style={{ padding: "15px", width: "150px", minWidth: "150px", maxWidth: "150px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{order.remarksByBilling || "-"}</td>
                  </tr>
                ))
              ) : !isLoading ? (
                <tr><td colSpan="13" style={{ padding: "20px", textAlign: "center", fontStyle: "italic", color: "#6b7280" }}>No orders found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      <footer style={{ margin: 0, textAlign: "center", color: "white", padding: "20px", background: "linear-gradient(135deg, #2575fc, #6a11cb)", width: "100vw", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", fontSize: "1rem", fontWeight: "500", bottom: 0, left: 0, boxSizing: "border-box" }}>
        © 2025 Furni Order Management. All rights reserved.
      </footer>
      {isViewModalOpen && <ViewEntry isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} entry={selectedOrder} />}
      {isPreviewModalOpen && <PreviewModal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} entry={selectedOrder} />}
      {isEditModalOpen && <EditBill isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onEntryUpdated={handleEntryUpdated} entryToEdit={selectedOrder} />}
    </>
  );
};

export default BillGeneration;
