import React, { useState, useEffect, useCallback } from "react";
import { Button, Form, Badge, InputGroup } from "react-bootstrap";
import { FaEye, FaSearch, FaFilter, FaTimes, FaFileExcel } from "react-icons/fa";
import ViewEntry from "./ViewEntry";
import EditBill from "./EditBill";
import soApi from "../../so/axiosSetup";
import { toast } from "react-toastify";
import { exportToExcel } from "../../utils/excelHelper";
import PreviewModal from "./PreviewModal";
import styled from "styled-components";
import { AnimatePresence, motion } from "framer-motion";

// Modern loader overlay styles
const LoaderOverlay = styled(motion.div)`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
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
const BillGeneration = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [billStatusFilter, setBillStatusFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await soApi.get(
        `/api/get-bill-orders`
      );
      setOrders(response.data.data);
    } catch (error) {
      console.error("Error fetching bill orders:", error);

      let errorMessage = "Something went wrong while loading bill orders.";

      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = "Your session has expired. Please log in again.";
        } else if (error.response.status === 404) {
          errorMessage = "No bill orders found.";
        } else if (error.response.status === 500) {
          errorMessage = "Server is not responding. Please try again later.";
        } else {
          errorMessage = error.response.data?.message || errorMessage;
        }
      } else if (error.request) {
        errorMessage =
          "Unable to connect to the server. Please check your internet.";
      }

      toast.error(errorMessage);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, billStatusFilter]);

  const filterOrders = () => {
    let filtered = [...orders];

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter((order) => {
        const productDetails = order.products
          ? order.products
            .map((p) => `${p.productType} (${p.qty})`)
            .join(", ")
            .toLowerCase()
          : "";
        const total = order.total ? order.total.toFixed(2).toString() : "0.00";
        const soDate = order.soDate
          ? new Date(order.soDate).toLocaleDateString().toLowerCase()
          : "";
        const invoiceDate = order.invoiceDate
          ? new Date(order.invoiceDate).toLocaleDateString().toLowerCase()
          : "";

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

    if (billStatusFilter !== "All") {
      filtered = filtered.filter((order) => order.billStatus === billStatusFilter)
    }
    // Sort in descending order by soDate to show newest orders first
    filtered.sort((a, b) => {
      const dateA = a.soDate ? new Date(a.soDate) : new Date(0);
      const dateB = b.soDate ? new Date(b.soDate) : new Date(0);
      return dateB - dateA; // Descending: newer dates first
    });


    setFilteredOrders(filtered);
  };

  const handleClearFilter = () => {
    setSearchTerm("")
    setBillStatusFilter("All")
  }

  const handleViewClick = (order) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
  };
  const handlePreviewClick = (order) => {
    setSelectedOrder(order);
    setIsPreviewModalOpen(true);
  };

  const handleEditClick = (order) => {
    setSelectedOrder(order);
    setIsEditModalOpen(true);
  };
  const getRowBackground = (order) => {
    if (order.poFilePath) return "#d4f4e6"; // PO uploaded highlight
    return "#ffffff"; // normal
  };
  const handleEntryUpdated = (updatedOrder) => {
    setOrders((prevOrders) =>
      prevOrders
        .map((order) => (order._id === updatedOrder._id ? updatedOrder : order))
        .filter((order) => order.billStatus !== "Billing Complete"),
    );
    setIsEditModalOpen(false);
    toast.success("Order updated successfully!");
  };

 const handleExportToXLSX = async () => {
  // Prepare table data
  const tableData = filteredOrders.map((order, index) => {
    const totalUnitPrice = order.products
      ? order.products.reduce(
          (sum, p) => sum + (p.unitPrice || 0) * (p.qty || 0),
          0
        )
      : 0;

    return {
      "Seq No": index + 1,
      "Order ID": order.orderId || "-",
      "Customer Name": order.customername || "-",
      "Contact No": order.contactNo || "-",
      "SO Date": order.soDate
        ? new Date(order.soDate).toLocaleDateString("en-GB")
        : "-",

      Total: order.total ? `₹${order.total.toFixed(2)}` : "₹0.00",

      // 🔥 Added field
      "Total Unit Price": `₹${totalUnitPrice.toFixed(2)}`,

      "Bill Number": order.billNumber || "-",
      "PI Number": order.piNumber || "-",
      "Invoice Date": order.invoiceDate
        ? new Date(order.invoiceDate).toLocaleDateString("en-GB")
        : "-",
      "Bill Status": order.billStatus || "-",
      "Remarks by Billing": order.remarksByBilling || "-",

      "Product Details": order.products
        ? order.products
            .map((p) => `${p.productType} (${p.qty})`)
            .join(", ")
        : "-",
    };
  });

  // 🔥 Grand Total calculation
  const grandTotal = filteredOrders.reduce((acc, order) => {
    const total = order.products
      ? order.products.reduce(
          (sum, p) => sum + (p.unitPrice || 0) * (p.qty || 0),
          0
        )
      : 0;

    return acc + total;
  }, 0);

  // 🔥 Add final total row
  tableData.push({
    "Seq No": "",
    "Order ID": "TOTAL",
    "Customer Name": "",
    "Contact No": "",
    "SO Date": "",
    Total: "",
    "Total Unit Price": `₹${grandTotal.toFixed(2)}`,
    "Bill Number": "",
    "PI Number": "",
    "Invoice Date": "",
    "Bill Status": "",
    "Remarks by Billing": "",
    "Product Details": "",
  });

  // Create Excel sheet
  await exportToExcel(tableData, "Bill Orders", "Bill_Orders.xlsx");
};

  // Calculate total pending orders (billStatus === "Pending")
  const totalPending = filteredOrders.filter(
    (order) => order.billStatus === "Pending",
  ).length;
  return (
    <>
      <style>
        {`
          .table-container {
            max-height: 600px;
            overflow-y: auto;
            overflow-x: auto;
            scrollbar-width: thin;
            scrollbar-color: #2575fc #e6f0fa;
            position: relative;
          }
          table thead {
            position: sticky;
            top: 0;
            z-index: 2;
            background: linear-gradient(135deg, #2575fc, #6a11cb);
            color: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          }
          table tbody {
            background: white;
          }
          .total-results {
            font-size: 1.1rem;
            font-weight: 500;
            color: #333;
            margin-bottom: 15px;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 15px;
          }
           .preview-btn {
            background: linear-gradient(135deg, #f59e0b, #facc15);
            border: none;
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
            cursor: pointer;
          }
          .preview-btn:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
            background: linear-gradient(135deg, #d97706, #eab308);
          }
          .preview-btn:focus {
            outline: none;
            box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.3);
          }
          .preview-btn svg {
            width: 18px;
            height: 18px;
          }
        `}
      </style>
      <div
        style={{
          background: "linear-gradient(135deg, #2575fc, #6a11cb)",
          padding: "12px 40px 16px",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          alignItems: "center",
          marginTop: "-2px",
        }}
      >
        <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "center", flex: "1 1 auto" }}>
          <InputGroup style={{ maxWidth: "450px", boxShadow: "0 5px 15px rgba(0,0,0,0.2)", borderRadius: "30px", overflow: "hidden" }}>
            <InputGroup.Text style={{ background: "rgba(255,255,255,0.95)", border: "none", paddingLeft: "20px", color: "#6b7280" }}>
              <FaSearch />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search Orders (ID, Customer, Products, etc.)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "14px 20px 14px 10px",
                border: "none",
                background: "rgba(255,255,255,0.95)",
                fontSize: "1.1rem",
                fontWeight: "500",
                boxShadow: "none",
                outline: "none",
              }}
            />
          </InputGroup>

          <div style={{ position: "relative" }}>
            <FaFilter style={{ position: "absolute", top: "50%", left: "15px", transform: "translateY(-50%)", color: "#6b7280", pointerEvents: "none" }} />
            <select
              value={billStatusFilter}
              onChange={(e) => setBillStatusFilter(e.target.value)}
              style={{
                padding: "12px 22px 12px 40px",
                borderRadius: "30px",
                border: "none",
                backgroundColor: "#fff",
                boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                fontSize: "15px",
                fontWeight: "500",
                cursor: "pointer",
                outline: "none",
                appearance: "none",
                minWidth: "180px",
              }}
            >
              <option value="All">All Bill Status</option>
              <option value="Pending">Pending</option>
              <option value="Under Billing">Under Billing</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "center" }}>
          <Button
            onClick={handleClearFilter}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.4)",
              backdropFilter: "blur(4px)",
              padding: "10px 20px",
              borderRadius: "30px",
              color: "#fff",
              fontWeight: "600",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.3)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <FaTimes /> Clear Filters
          </Button>

          <Button
            onClick={handleExportToXLSX}
            style={{
              background: "linear-gradient(135deg, #28a745, #218838)",
              border: "none",
              padding: "10px 20px",
              borderRadius: "30px",
              color: "#fff",
              fontWeight: "600",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 15px rgba(40, 167, 69, 0.4)",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(40, 167, 69, 0.6)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 15px rgba(40, 167, 69, 0.4)"; }}
          >
            <FaFileExcel /> Export to XLSX
          </Button>
        </div>
      </div>
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #e6f0fa, #f3e8ff)",
          padding: "30px",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        <div className="total-results">
          <span>Total Orders: {filteredOrders.length}</span>
          <span>Total Pending: {totalPending}</span>
        </div>
        <div
          className="table-container"
          style={{
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: "0",
              tableLayout: "fixed",
            }}
          >
            <thead>
              <tr>
                {[
                  { header: "Seq No", width: "80px" },
                  { header: "Order ID", width: "120px" },
                  { header: "Customer Name", width: "400px" },

                  { header: "SO Date", width: "110px" },
                  { header: "Total", width: "120px" },
                  { header: "Bill Number", width: "120px" },
                  { header: "PI Number", width: "120px" },
                  { header: "Invoice Date", width: "110px" },
                  { header: "Bill Status", width: "120px" },
                  {
                    header: "Actions",
                    width: "170px",
                  },
                  { header: "Product Details", width: "200px" },
                  { header: "Remarks by Billing", width: "100px" },
                ].map(({ header, width }) => (
                  <th
                    key={header}
                    style={{
                      padding: "18px 15px",
                      fontSize: "0.95rem",
                      fontWeight: "600",

                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      borderBottom: "2px solid rgba(255,255,255,0.2)",
                      whiteSpace: "nowrap",
                      width,
                      minWidth: width,
                      maxWidth: width,
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <AnimatePresence>
                  <LoaderOverlay
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key="loader-overlay"
                  >
                    <SpinnerWrap>
                      <GradientSpinner />
                      <span style={{ color: "#2575fc", fontWeight: "600" }}>
                        Loading orders...
                      </span>
                    </SpinnerWrap>
                  </LoaderOverlay>
                </AnimatePresence>
              )}

              {filteredOrders.length > 0 ? (
                filteredOrders.map((order, index) => (
                  <tr
                    key={order._id || index}
                    style={{
                      backgroundColor: getRowBackground(order),
                      transition: "all 0.3s ease",
                      borderBottom: "1px solid #e6f0fa",
                    }}
                  >
                    <td
                      style={{
                        padding: "15px",
                        textAlign: "center",
                        width: "80px",
                        minWidth: "80px",
                        maxWidth: "80px",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {index + 1}
                    </td>
                    <td
                      style={{
                        padding: "15px",
                        width: "120px",
                        minWidth: "120px",
                        maxWidth: "120px",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {order.orderId || "-"}
                    </td>
                    <td
                      title={order.customername}
                      style={{
                        padding: "15px",
                        width: "150px",
                        minWidth: "150px",
                        maxWidth: "150px",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {order.customername || "-"}
                    </td>

                    <td
                      style={{
                        padding: "15px",
                        width: "100px",
                        minWidth: "100px",
                        maxWidth: "100px",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {order.soDate
                        ? new Date(order.soDate).toLocaleDateString("en-GB")
                        : "-"}
                    </td>
                    <td
                      style={{
                        padding: "15px",
                        width: "100px",
                        minWidth: "100px",
                        maxWidth: "100px",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ₹{order.total?.toFixed(2) || "0.00"}
                    </td>
                    <td
                      style={{
                        padding: "15px",
                        width: "120px",
                        minWidth: "120px",
                        maxWidth: "120px",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {order.billNumber || "-"}
                    </td>
                    <td
                      style={{
                        padding: "15px",
                        width: "120px",
                        minWidth: "120px",
                        maxWidth: "120px",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {order.piNumber || "-"}
                    </td>
                    <td
                      style={{
                        padding: "15px",
                        width: "100px",
                        minWidth: "100px",
                        maxWidth: "100px",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {order.invoiceDate
                        ? new Date(order.invoiceDate).toLocaleDateString(
                          "en-GB",
                        )
                        : "-"}
                    </td>
                    <td
                      title={order.billStatus}
                      style={{
                        padding: "15px",
                        width: "120px",
                        minWidth: "120px",
                        maxWidth: "120px",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Badge
                        bg={
                          order.billStatus === "Pending"
                            ? "warning"
                            : order.billStatus === "Under Billing"
                              ? "info"
                              : "success"
                        }
                        style={{ padding: "6px 12px", fontSize: "0.9rem" }}
                      >
                        {order.billStatus || "-"}
                      </Badge>
                    </td>
                    <td
                      style={{
                        padding: "15px",
                        textAlign: "center",
                        width: "150px",
                        minWidth: "150px",
                        maxWidth: "150px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          justifyContent: "center",
                        }}
                      >
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
                          }}
                          aria-label="View order"
                        >
                          <FaEye size={18} />
                        </Button>
                        <button
                          className="preview-btn"
                          onClick={() => handlePreviewClick(order)}
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            padding: "0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          aria-label="Preview order"
                        >
                          <svg
                            height="18px"
                            viewBox="0 0 512 512"
                            fill="#ffffff"
                          >
                            <path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z" />
                          </svg>
                        </button>
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
                          }}
                          aria-label="Edit order"
                        >
                          <svg
                            height="18px"
                            viewBox="0 0 512 512"
                            fill="#ffffff"
                          >
                            <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td
                      title={
                        order.products
                          ? order.products
                            .map((p) => `${p.productType} (${p.qty})`)
                            .join(", ")
                          : "-"
                      }
                      style={{
                        padding: "15px",
                        width: "200px",
                        minWidth: "200px",
                        maxWidth: "200px",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {order.products
                        ? order.products
                          .map((p) => `${p.productType} (${p.qty})`)
                          .join(", ")
                        : "-"}
                    </td>
                    <td
                      title={order.remarksByBilling}
                      style={{
                        padding: "15px",
                        width: "150px",
                        minWidth: "150px",
                        maxWidth: "150px",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {order.remarksByBilling || "-"}
                    </td>
                  </tr>
                ))
              ) : !isLoading ? (
                <tr>
                  <td
                    colSpan="13"
                    style={{
                      height: "300px",
                      textAlign: "center",
                      verticalAlign: "middle",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <div style={{ fontSize: "3rem" }}>📋</div>
                      <div
                        style={{
                          fontSize: "1.2rem",
                          fontWeight: "600",
                          color: "#6b7280",
                        }}
                      >
                        No orders found.
                      </div>
                      <div style={{ color: "#9ca3af" }}>
                        Try adjusting your search or check back later.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan="13" style={{ height: "300px" }}></td>
                </tr>
              )}
            </tbody>
          </table>
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
      {isViewModalOpen && (
        <ViewEntry
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          entry={selectedOrder}
        />
      )}
      {isPreviewModalOpen && (
        <PreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          entry={selectedOrder}
        />
      )}
      {isEditModalOpen && (
        <EditBill
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onEntryUpdated={handleEntryUpdated}
          entryToEdit={selectedOrder}
        />
      )}
    </>
  );
};

export default BillGeneration;
