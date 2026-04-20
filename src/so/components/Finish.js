import React, { useEffect, useState, useCallback, useMemo } from "react";
import soApi from "../../so/axiosSetup";
import { Button, Modal, Badge, Form, Spinner } from "react-bootstrap";
import { FaEye, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { exportToExcel } from "../../utils/excelHelper";
import OutFinishedGoodModal from "./OutFinishedGoodModal";
import OrderRow from "./OrderRow"; // Memoized row component for performance
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import styled from "styled-components";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useRef } from "react";

// Styled Component for DatePicker
const DatePickerWrapper = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  .react-datepicker-wrapper {
    width: 150px;
  }
  .react-datepicker__input-container input {
    padding: 8px 12px;
    border-radius: 25px;
    border: 1px solid #ccc;
    font-size: 1rem;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: border-color 0.3s ease;
    width: 100%;
    &:focus {
      border-color: #2575fc;
      outline: none;
    }
  }
  .react-datepicker {
    z-index: 1000 !important;
  }
  .react-datepicker-popper {
    z-index: 1000 !important;
  }
`;

function Finish() {
  const [orders, setOrders] = useState([]);
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
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [salesPersonFilter, setSalesPersonFilter] = useState("All");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const pdfRef = useRef(null);

  // Debounce search term update
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const dispatchFromOptions = [
    "",
    "Patna",
    "Bareilly",
    "Ranchi",
    "Morinda",
    "Lucknow",
    "Delhi",
    "Jaipur",
    "Rajisthan",
  ];

  const fetchFinishedGoods = useCallback(async () => {
    try {
      const response = await soApi.get(
        `/api/finished-goods`
      );
      if (response.data.success) {
        // Map backend 'Fulfilled' to frontend 'Completed'
        const sortedData = response.data.data
          .map((order) => ({
            ...order,
            fulfillingStatus:
              order.fulfillingStatus === "Fulfilled"
                ? "Completed"
                : order.fulfillingStatus,
          }))
          .sort((a, b) => {
            const dateA = a.soDate ? new Date(a.soDate) : new Date(0);
            const dateB = b.soDate ? new Date(b.soDate) : new Date(0);
            return dateB - dateA;
          });
        setOrders(sortedData);
        // Removed setFilteredOrders(sortedData) - derived state now handles it
      } else {
        throw new Error(
          response.data.message ||
          "Unable to load finished goods. Please try again later."
        );
      }
    } catch (error) {
      console.error("Error fetching finished goods:", error);
      toast.error(
        "We couldn’t load the finished goods list. Please check your connection or try again in a moment.",
        {
          position: "top-right",
          autoClose: 5000,
        }
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFinishedGoods();
  }, [fetchFinishedGoods]);

  // PERFORMANCE: Memoize dropdown options to prevent recalculation on every render
  const uniqueSalesPersons = useMemo(() => [
    "All",
    ...new Set(orders.map((order) => order.salesPerson).filter(Boolean)),
  ], [orders]);
  // Apply filters, search, and calculate results using useMemo
  // PERFORMANCE: Pre-calculate display strings to avoid recalculating in every row render
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Apply freight status filter
    if (freightStatusFilter) {
      filtered = filtered.filter(
        (order) => order.freightstatus === freightStatusFilter
      );
    }
    if (salesPersonFilter !== "All") {
      filtered = filtered.filter(
        (order) => order.salesPerson === salesPersonFilter
      );
    }
    // Apply dispatch status filter
    if (dispatchStatusFilter) {
      filtered = filtered.filter(
        (order) => order.dispatchStatus === dispatchStatusFilter
      );
    }

    // Apply order type filter
    if (orderTypeFilter) {
      filtered = filtered.filter(
        (order) => order.orderType === orderTypeFilter
      );
    }

    // Apply dispatchFrom filter
    if (dispatchFromFilter) {
      filtered = filtered.filter(
        (order) => order.dispatchFrom === dispatchFromFilter
      );
    }

    // Apply dispatched filter
    if (dispatchedFilter) {
      filtered = filtered.filter((order) =>
        dispatchedFilter === "Dispatched"
          ? order.dispatchStatus === "Dispatched" ||
          order.dispatchStatus === "Docket Awaited Dispatched"
          : order.dispatchStatus === "Not Dispatched"
      );
    }

    // Apply production status filter
    if (productionStatusFilter) {
      filtered = filtered.filter(
        (order) => order.fulfillingStatus === productionStatusFilter
      );
    }

    // Apply date range filter
    if (startDate || endDate) {
      filtered = filtered.filter((order) => {
        const orderDate = order.soDate ? new Date(order.soDate) : null;
        const startDateAdjusted = startDate
          ? new Date(new Date(startDate).setHours(0, 0, 0, 0))
          : null;
        const endDateAdjusted = endDate
          ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
          : null;
        return (
          (!startDateAdjusted ||
            (orderDate && orderDate >= startDateAdjusted)) &&
          (!endDateAdjusted || (orderDate && orderDate <= endDateAdjusted))
        );
      });
    }

    // Apply search filter
    if (debouncedSearchTerm) {
      const lowerSearch = debouncedSearchTerm.toLowerCase().trim();
      filtered = filtered.filter((order) => {
        const productDetails = order.products
          ? order.products
            .map((p) => `${p.productType} (${p.qty})`)
            .join(", ")
            .toLowerCase()
          : "";
        const specDetails = order.products
          ? order.products
            .map((p) => p.spec || "N/A")
            .join(", ")
            .toLowerCase()
          : "";
        const sizeDetails = order.products
          ? order.products
            .map((p) => p.size || "N/A")
            .join(", ")
            .toLowerCase()
          : "";
        const totalQty = order.products
          ? order.products.reduce((sum, p) => sum + (p.qty || 0), 0).toString()
          : "N/A";
        const modelNos = order.products
          ? order.products
            .flatMap((p) => p.modelNos || [])
            .filter(Boolean)
            .join(", ")
            .toLowerCase() || "N/A"
          : "";
        const soDate = order.soDate
          ? new Date(order.soDate).toLocaleDateString().toLowerCase()
          : "N/A";
        const dispatchFrom = order.dispatchFrom
          ? order.dispatchFrom.toLowerCase()
          : "N/A";
        const productStatus = order.fulfillingStatus || "N/A";
        const orderType = order.orderType || "N/A";

        return (
          (order.orderId || "N/A").toLowerCase().includes(lowerSearch) ||
          (order.customername || "N/A").toLowerCase().includes(lowerSearch) ||
          (order.contactNo || "N/A").toLowerCase().includes(lowerSearch) ||
          (order.shippingAddress || "N/A")
            .toLowerCase()
            .includes(lowerSearch) ||
          productDetails.includes(lowerSearch) ||
          modelNos.includes(lowerSearch) ||
          sizeDetails.includes(lowerSearch) ||
          specDetails.includes(lowerSearch) ||
          totalQty.includes(lowerSearch) ||
          (order.salesPerson || "N/A").toLowerCase().includes(lowerSearch) ||
          soDate.includes(lowerSearch) ||
          dispatchFrom.includes(lowerSearch) ||
          (order.freightstatus || "To Pay")
            .toLowerCase()
            .includes(lowerSearch) ||
          productStatus.toLowerCase().includes(lowerSearch) ||
          (order.dispatchStatus || "Not Dispatched")
            .toLowerCase()
            .includes(lowerSearch) ||
          orderType.toLowerCase().includes(lowerSearch)
        );
      });
    }

    // Sort filtered orders by soDate in descending order (newest first)
    const sorted = filtered.sort((a, b) => {
      const dateA = a.soDate ? new Date(a.soDate) : new Date(0);
      const dateB = b.soDate ? new Date(b.soDate) : new Date(0);
      return dateB - dateA;
    });

    // PERFORMANCE OPTIMIZATION: Pre-calculate display strings once here
    // instead of recalculating in every row render (eliminates 2500+ operations per render)
    return sorted.map((order) => ({
      ...order,
      _displayProductDetails: order.products
        ? order.products.map((p) => `${p.productType} (${p.qty})`).join(", ")
        : "N/A",
      _displaySizeDetails: order.products
        ? order.products.map((p) => p.size || "N/A").join(", ")
        : "N/A",
      _displaySpecDetails: order.products
        ? order.products.map((p) => p.spec || "N/A").join(", ")
        : "N/A",
      _displayTotalQty: order.products
        ? order.products.reduce((sum, p) => sum + (p.qty || 0), 0).toString()
        : "N/A",
      _displayModelNos: order.products
        ? order.products
          .flatMap((p) => p.modelNos || [])
          .filter(Boolean)
          .join(", ") || "N/A"
        : "N/A",
      _displaySoDate: order.soDate
        ? new Date(order.soDate).toLocaleDateString()
        : "N/A",
      _displayDispatchDate: order.dispatchDate
        ? new Date(order.dispatchDate).toLocaleDateString()
        : "N/A",
    }));
  }, [
    freightStatusFilter,
    dispatchStatusFilter,
    orderTypeFilter,
    dispatchFromFilter,
    dispatchedFilter,
    salesPersonFilter,
    productionStatusFilter,
    debouncedSearchTerm,
    startDate,
    endDate,
    orders,
  ]);

  const totalResults = filteredOrders.length;

  // PERFORMANCE: Simplified product quantity calculation
  const productQuantity = useMemo(() => {
    return filteredOrders.reduce((sum, order) => {
      return (
        sum +
        (order.products
          ? order.products.reduce((sum, p) => sum + Math.floor(p.qty || 0), 0)
          : 0)
      );
    }, 0);
  }, [filteredOrders]);

  // PERFORMANCE: Memoize order types to prevent recalculation
  const uniqueOrderTypes = useMemo(() => [
    "",
    ...new Set(orders.map((order) => order.orderType || "N/A")),
  ], [orders]);

  const handleReset = () => {
    setSalesPersonFilter("All");
    setFreightStatusFilter("");
    setDispatchStatusFilter("");
    setOrderTypeFilter("");
    setDispatchFromFilter("");
    setDispatchedFilter("");
    setProductionStatusFilter("");
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setStartDate(null);
    setEndDate(null);

    toast.info("Filters reset!", {
      position: "top-right",
      autoClose: 3000,
    });
  };

  // PERFORMANCE: Stable callback references prevent unnecessary re-renders
  const handleEditClick = useCallback((order) => {
    setEditData({
      dispatchFrom: order.dispatchFrom || "",
      transporter: order.transporter || "",
      billNumber: order.billNumber || "",
      transporterDetails: order.transporterDetails || "",
      dispatchDate: order.dispatchDate
        ? new Date(order.dispatchDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      docketNo: order.docketNo || "",
      receiptDate: order.receiptDate
        ? new Date(order.receiptDate).toISOString().split("T")[0]
        : "",
      dispatchStatus: order.dispatchStatus || "Not Dispatched",
      _id: order._id,
    });
    setIsModalOpen(true);
  }, []);

  const handleModalSubmit = useCallback((updatedEntry) => {
    // NEW BUSINESS LOGIC: Orders now persist when marked as "Delivered"
    // They only hide from dashboard when stamp is marked as "Received"
    setOrders((prevOrders) => {
      const updatedOrders = prevOrders
        .map((order) => (order._id === updatedEntry._id ? updatedEntry : order))
        .filter((order) => order.stamp !== "Received" && order.dispatchStatus !== "Order Cancelled"); // Hide Received or Cancelled instantly
      // Sort updated orders by soDate in descending order
      return updatedOrders.sort((a, b) => {
        const dateA = a.soDate ? new Date(a.soDate) : new Date(0);
        const dateB = b.soDate ? new Date(b.soDate) : new Date(0);
        return dateB - dateA;
      });
    });
    toast.success(
      `Order updated successfully! Status: ${updatedEntry.dispatchStatus}`,
      {
        position: "top-right",
        autoClose: 3000,
      }
    );
    fetchFinishedGoods();
  }, [fetchFinishedGoods]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleExportPDF = async () => {
    if (!viewOrder) return;
    setIsGeneratingPDF(true);

    try {
      const input = pdfRef.current;
      if (!input) return;

      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF("p", "mm", "a4");

      const PAGE_WIDTH = 210;
      const PAGE_HEIGHT = 297;

      const MARGIN_TOP = 15;
      const MARGIN_BOTTOM = 15;
      const SAFE_BOTTOM = 8; // 🔥 prevents half-cut lines

      const CONTENT_HEIGHT =
        PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM - SAFE_BOTTOM;

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      const imgWidth = PAGE_WIDTH;
      const imgHeight = (canvasHeight * imgWidth) / canvasWidth;

      const pxPerMm = canvasHeight / imgHeight;
      const pageContentHeightPx = CONTENT_HEIGHT * pxPerMm;

      let sourceY = 0;
      let pageIndex = 0;

      while (sourceY < canvasHeight) {
        const pageCanvas = document.createElement("canvas");
        const ctx = pageCanvas.getContext("2d");

        pageCanvas.width = canvasWidth;
        pageCanvas.height = Math.min(
          pageContentHeightPx,
          canvasHeight - sourceY
        );

        ctx.drawImage(
          canvas,
          0,
          sourceY,
          canvasWidth,
          pageCanvas.height,
          0,
          0,
          canvasWidth,
          pageCanvas.height
        );

        const imgData = pageCanvas.toDataURL("image/jpeg", 0.98);

        if (pageIndex > 0) pdf.addPage();

        const renderedHeightMm =
          (pageCanvas.height * imgWidth) / canvasWidth;

        const yPosition = pageIndex === 0 ? 0 : MARGIN_TOP;

        pdf.addImage(
          imgData,
          "JPEG",
          0,
          yPosition,
          imgWidth,
          renderedHeightMm
        );

        // footer
        pdf.setFontSize(9);
        pdf.setTextColor(150);
        pdf.text(
          `Page ${pageIndex + 1}`,
          PAGE_WIDTH - 25,
          PAGE_HEIGHT - 8
        );

        sourceY += pageCanvas.height;
        pageIndex++;
      }

      pdf.save(`Dispatch_Order_${viewOrder.orderId || "Details"}.pdf`);
      toast.success("PDF exported successfully!");
    } catch (err) {
      console.error("PDF Export Error:", err);
      toast.error("Failed to export PDF.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };


  const handleView = useCallback((order) => {
    setViewOrder(order);
    setShowViewModal(true);
    setCopied(false);
  }, []);

  const handleCopy = () => {
    if (!viewOrder) return;
    const productsText = viewOrder.products
      ? viewOrder.products
        .map(
          (p, i) =>
            `Product ${i + 1}: ${p.productType || "N/A"} (Qty: ${p.qty || "N/A"
            }, Size: ${p.size || "N/A"}, Spec: ${p.spec || "N/A"
            }, Brand: ${p.brand || "N/A"
            }, Serial Nos: ${p.serialNos?.join(", ") || "N/A"
            }, Model Nos: ${p.modelNos?.join(", ") || "N/A"
            }, Product Code: ${p.productCode?.join(", ") || "N/A"
            }, Warranty: ${p.warranty || "N/A"
            })`
        )
        .join("\n")
      : "N/A";
    const orderText = `
      Order ID: ${viewOrder.orderId || "N/A"}
      Serial Nos: ${viewOrder.serialNos?.join(", ") || "N/A"}
      Model Nos: ${viewOrder.modelNos?.join(", ") || "N/A"}
      Bill No: ${viewOrder.billNumber || "N/A"}
      Products:\n${productsText}
      SO Date: ${viewOrder.soDate
        ? new Date(viewOrder.soDate).toLocaleDateString()
        : "N/A"
      }
      Dispatch Date: ${viewOrder.dispatchDate
        ? new Date(viewOrder.dispatchDate).toLocaleDateString()
        : "N/A"
      }
      Dispatch From: ${viewOrder.dispatchFrom || "N/A"}
      Customer: ${viewOrder.customername || "N/A"}
      Address: ${viewOrder.shippingAddress ||
      `${viewOrder.city || ""}, ${viewOrder.state || ""}` ||
      "N/A"
      }
      Dispatch Status: ${viewOrder.dispatchStatus === "Not Dispatched" ? "Pending Dispatched" : viewOrder.dispatchStatus || "Pending Dispatched"}
    `.trim();
    navigator.clipboard.writeText(orderText);
    setCopied(true);
    toast.success("Details copied to clipboard!", {
      position: "top-right",
      autoClose: 2000,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportToXLSX = async () => {
    const tableData = filteredOrders.map((order) => ({
      "Order ID": order.orderId || "N/A",
      "Customer Name": order.customername || "N/A",
      "Contact No": order.contactNo || "N/A",
      "Delivery Address": order.shippingAddress || "N/A",
      "Product Name": order.products
        ? order.products.map((p) => `${p.productType} (${p.qty})`).join(", ")
        : "N/A",
      "Model Nos": order.products
        ? order.products
          .flatMap((p) => p.modelNos || [])
          .filter(Boolean)
          .join(", ") || "N/A"
        : "N/A",
      Spec: order.products
        ? order.products.map((p) => p.spec || "N/A").join(", ")
        : "N/A",
      Size: order.products
        ? order.products.map((p) => p.size || "N/A").join(", ")
        : "N/A",
      "Serial Nos": order.products
        ? order.products
          .map((p) => {
            const serials = (p.serialNos || []).filter(Boolean);
            return serials.length > 0
              ? `${p.productType}: ${serials.join(", ")}`
              : null;
          })
          .filter(Boolean)
          .join("; ") || "N/A"
        : "N/A",
      Quantity: order.products
        ? order.products.reduce((sum, p) => sum + (p.qty || 0), 0)
        : "N/A",
      "Sales Person": order.salesPerson || "N/A",
      "Production Remarks": order.remarksByProduction || "N/A",
      "SO Date": order.soDate
        ? new Date(order.soDate).toLocaleDateString()
        : "N/A",
      "Dispatch Date": order.dispatchDate
        ? new Date(order.dispatchDate).toLocaleDateString()
        : "N/A",
      "Dispatch From": order.dispatchFrom || "N/A",
      "Stamp Signed": order.stamp || "N/A",
      "Docket No": order.docketNo || "N/A",
      Transporter: order.transporter || "N/A",
      "Billing Status": order.billStatus || "Pending",
      "Freight Status": order.freightstatus || "To Pay",
      "Product Status": order.fulfillingStatus || "N/A",
      "Dispatch Status": order.dispatchStatus || "Not Dispatched",
    }));

    await exportToExcel(tableData, "Dispatch Data", "Dispatch_Dashboard.xlsx");
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        }}
      >
        <div
          style={{
            width: "50px",
            height: "50px",
            border: "5px solid #2575fc",
            borderTop: "5px solid transparent",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            marginBottom: "15px",
          }}
        />
        <p
          style={{
            fontSize: "1.3rem",
            color: "#333",
            fontWeight: "500",
            textShadow: "1px 1px 2px rgba(0, 0, 0, 0.1)",
          }}
        >
          Loading Finished Goods...
        </p>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div
        style={{
          width: "100%",
          margin: "0",
          padding: "20px",
          background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
          borderRadius: "0",
          boxShadow: "none",
          minHeight: "100vh",
          height: "100%",
        }}
      >
        <header
          style={{
            padding: "20px",
            textAlign: "center",
            background: "linear-gradient(135deg, #2575fc, #6a11cb)",
            color: "#fff",
            boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
          }}
        >
          <h1
            style={{
              fontSize: "2.5rem",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "2px",
              textShadow: "2px 2px 4px rgba(0, 0, 0, 0.2)",
            }}
          >
            Dispatch Dashboard
          </h1>
        </header>

        <div
          style={{

            padding: "15px",
            borderRadius: "15px",

            marginBottom: "20px",
            marginTop: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              alignItems: "flex-end",
            }}
          >
            {/* Search Filter */}
            <div style={{ flex: "1 1 200px" }}>
              <label
                style={{
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  color: "#495057",
                  marginBottom: "4px",
                  marginLeft: "6px",
                  display: "block",
                }}
              >
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                style={{
                  width: "100%",
                  padding: "5px 10px",
                  borderRadius: "15px",
                  border: "1px solid #ced4da",
                  fontSize: "0.9rem",
                  height: "38px",
                  transition: "border-color 0.3s ease",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#2575fc")}
                onBlur={(e) => (e.target.style.borderColor = "#ced4da")}
              />
            </div>

            {/* Start Date */}
            <div style={{ flex: "0 1 130px" }}>
              <label
                style={{
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  color: "#495057",
                  marginBottom: "4px",
                  display: "block",
                }}
              >
                Start Date
              </label>
              <div className="custom-datepicker-wrapper">
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  placeholderText="DD/MM/YYYY"
                  dateFormat="dd/MM/yyyy"
                  isClearable
                  className="form-control"
                  customInput={
                    <input
                      style={{
                        width: "100%",
                        padding: "5px 10px",
                        borderRadius: "15px",
                        border: "1px solid #ced4da",
                        fontSize: "0.9rem",
                        height: "38px",
                      }}
                    />
                  }
                />
              </div>
            </div>

            {/* End Date */}
            <div style={{ flex: "0 1 130px" }}>
              <label
                style={{
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  color: "#495057",
                  marginBottom: "4px",
                  display: "block",
                }}
              >
                End Date
              </label>
              <div className="custom-datepicker-wrapper">
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                  placeholderText="DD/MM/YYYY"
                  dateFormat="dd/MM/yyyy"
                  isClearable
                  className="form-control"
                  customInput={
                    <input
                      style={{
                        width: "100%",
                        padding: "5px 10px",
                        borderRadius: "15px",
                        border: "1px solid #ced4da",
                        fontSize: "0.9rem",
                        height: "38px",
                      }}
                    />
                  }
                />
              </div>
            </div>

            {/* Freight Status */}
            <div style={{ flex: "0 1 140px" }}>
              <label
                style={{
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  color: "#495057",
                  marginBottom: "4px",
                  display: "block",
                }}
              >
                Freight Status
              </label>
              <select
                value={freightStatusFilter}
                onChange={(e) => setFreightStatusFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "5px 10px",
                  borderRadius: "15px",
                  border: "1px solid #ced4da",
                  fontSize: "0.9rem",
                  height: "38px",
                  cursor: "pointer",
                }}
              >
                <option value="">All</option>
                <option value="To Pay">To Pay</option>
                <option value="Including">Including</option>
                <option value="Extra">Extra</option>
              </select>
            </div>

            {/* Order Type */}
            <div style={{ flex: "0 1 140px" }}>
              <label
                style={{
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  color: "#495057",
                  marginBottom: "4px",
                  display: "block",
                }}
              >
                Order Type
              </label>
              <select
                value={orderTypeFilter}
                onChange={(e) => setOrderTypeFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "5px 10px",
                  borderRadius: "15px",
                  border: "1px solid #ced4da",
                  fontSize: "0.9rem",
                  height: "38px",
                  cursor: "pointer",
                }}
              >
                {uniqueOrderTypes.map((orderType) => (
                  <option key={orderType} value={orderType}>
                    {orderType || "All"}
                  </option>
                ))}
              </select>
            </div>

            {/* Dispatch From */}
            <div style={{ flex: "0 1 140px" }}>
              <label
                style={{
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  color: "#495057",
                  marginBottom: "4px",
                  display: "block",
                }}
              >
                Dispatch From
              </label>
              <select
                value={dispatchFromFilter}
                onChange={(e) => setDispatchFromFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "5px 10px",
                  borderRadius: "15px",
                  border: "1px solid #ced4da",
                  fontSize: "0.9rem",
                  height: "38px",
                  cursor: "pointer",
                }}
              >
                {dispatchFromOptions.map((dispatchFrom) => (
                  <option key={dispatchFrom} value={dispatchFrom}>
                    {dispatchFrom || "All"}
                  </option>
                ))}
              </select>
            </div>

            {/* Dispatch Status */}
            <div style={{ flex: "0 1 160px" }}>
              <label
                style={{
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  color: "#495057",
                  marginBottom: "4px",
                  display: "block",
                }}
              >
                Dispatch Status
              </label>
              <select
                value={dispatchStatusFilter}
                onChange={(e) => setDispatchStatusFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "5px 10px",
                  borderRadius: "15px",
                  border: "1px solid #ced4da",
                  fontSize: "0.9rem",
                  height: "38px",
                  cursor: "pointer",
                }}
              >
                <option value="">All</option>
                <option value="Not Dispatched">Pending Dispatched</option>
                <option value="Partially Shipped">Partially Shipped</option>
                <option value="Dispatched">Dispatched</option>
                <option value="Docket Awaited Dispatched">
                  Docket Awaited Dispatched
                </option>
              </select>
            </div>

            {/* Production Status */}
            <div style={{ flex: "0 1 160px" }}>
              <label
                style={{
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  color: "#495057",
                  marginBottom: "4px",
                  display: "block",
                }}
              >
                Production Status
              </label>
              <select
                value={productionStatusFilter}
                onChange={(e) => setProductionStatusFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "5px 10px",
                  borderRadius: "15px",
                  border: "1px solid #ced4da",
                  fontSize: "0.9rem",
                  height: "38px",
                  cursor: "pointer",
                }}
              >
                <option value="">All</option>
                <option value="Partial Dispatch">Partial Dispatch</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            {/* Sales Person */}
            <div style={{ flex: "0 1 160px" }}>
              <label
                style={{
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  color: "#495057",
                  marginBottom: "4px",
                  display: "block",
                }}
              >
                Sales Person
              </label>
              <Form.Select
                value={salesPersonFilter}
                onChange={(e) => setSalesPersonFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "5px 10px",
                  borderRadius: "15px",
                  border: "1px solid #ced4da",
                  fontSize: "0.9rem",
                  height: "38px",
                  cursor: "pointer",
                }}
              >
                <option value="All">All</option>
                {uniqueSalesPersons
                  .filter((salesPerson) => salesPerson !== "All")
                  .map((salesPerson) => (
                    <option key={salesPerson} value={salesPerson}>
                      {salesPerson}
                    </option>
                  ))}
              </Form.Select>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "10px", marginLeft: "auto" }}>
              <Button
                onClick={handleReset}
                style={{
                  background: "#f8f9fa",
                  border: "1px solid #dee2e6",
                  color: "#495057",
                  padding: "0 15px",
                  height: "38px",
                  borderRadius: "20px",
                  fontWeight: "600",
                  fontSize: "0.85rem",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "#e9ecef";
                  e.target.style.borderColor = "#ced4da";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "#f8f9fa";
                  e.target.style.borderColor = "#dee2e6";
                }}
              >
                <FaTimes style={{ fontSize: "0.8rem" }} /> Reset
              </Button>

              <Button
                onClick={handleExportToXLSX}
                style={{
                  background: "linear-gradient(135deg, #28a745, #20c997)",
                  border: "none",
                  padding: "0 20px",
                  height: "38px",
                  borderRadius: "20px",
                  color: "#fff",
                  fontWeight: "600",
                  fontSize: "0.85rem",
                  boxShadow: "0 4px 10px rgba(40, 167, 69, 0.2)",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                }}
                onMouseEnter={(e) =>
                  (e.target.style.transform = "translateY(-2px)")
                }
                onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
              >
                Export Excel
              </Button>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "15px",
            marginBottom: "20px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #2575fc, #6a11cb)",
              borderRadius: "25px",
              padding: "12px 20px",
              boxShadow: "0 5px 15px rgba(0, 0, 0, 0.2)",
              color: "#fff",
              fontWeight: "700",
              fontSize: "0.9rem",
            }}
            title="Total number of matching orders"
          >
            Total Orders: {totalResults}
          </div>
          <div
            style={{
              background: "linear-gradient(135deg, #28a745, #4cd964)",
              borderRadius: "25px",
              padding: "12px 20px",
              boxShadow: "0 5px 15px rgba(0, 0, 0, 0.2)",
              color: "#fff",
              fontWeight: "700",
              fontSize: "0.9rem",
            }}
            title="Total quantity of matching products"
          >
            Total Product Quantity: {Math.floor(productQuantity)}
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div
            style={{
              background: "linear-gradient(135deg, #ff6b6b, #ff8787)",
              color: "#fff",
              padding: "20px",
              borderRadius: "10px",
              textAlign: "center",
              boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
              fontSize: "1.3rem",
              fontWeight: "500",
            }}
          >
            No Dispatch available at this time.
          </div>
        ) : (
          <div
            style={{
              overflowX: "auto",
              maxHeight: "550px",
              border: "1px solid rgba(0, 0, 0, 0.1)",
              borderRadius: "8px",
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
              backdropFilter: "blur(10px)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: "0",
              }}
            >
              <thead
                style={{
                  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                  color: "#fff",
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                }}
              >
                <tr>
                  {[
                    "Order ID",
                    "Customer Name",
                    "Contact No",
                    "Delivery Address",
                    "Product Name",
                    "Model Nos",
                    "Spec",
                    "Size",
                    "Quantity",
                    "Sales Person",
                    "Production Remarks",
                    "SO Date",
                    "Dispatch Date",
                    "Dispatch From",
                    "Billing Status",
                    "Freight Status",
                    "Production Status",
                    "Dispatch Status",
                    "Stamp Signed",
                    "Actions",
                  ].map((header, index) => (
                    <th
                      key={index}
                      style={{
                        padding: "15px",
                        textAlign: "center",
                        fontWeight: "700",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        borderBottom: "2px solid rgba(255, 255, 255, 0.2)",
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* PERFORMANCE: Using memoized OrderRow component prevents 500+ unnecessary re-renders */}
                {filteredOrders.map((order, index) => (
                  <OrderRow
                    key={order._id}
                    order={order}
                    index={index}
                    onView={handleView}
                    onEdit={handleEditClick}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <footer className="footer-container">
        <p style={{ marginTop: "10px", color: "white", height: "20px" }}>
          © 2025 Sales Order Management. All rights reserved.
        </p>
      </footer>
      <Modal
        show={showViewModal}
        onHide={() => setShowViewModal(false)}
        backdrop="static"
        keyboard={false}
        size="lg"
      >
        <style>
          {`
      @keyframes fadeIn {
        0% { opacity: 0; transform: translateY(10px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      .serial-nos-container {
        max-height: 100px;
        overflow-y: auto;
        padding: 5px 10px;
        background: #fff;
        border-radius: 5px;
        border: 1px solid #eee;
      }
      .serial-nos-container ul {
        margin: 0;
        padding-left: 20px;
      }
      .serial-nos-container li {
        font-size: 0.95rem;
        color: #555;
        line-height: 1.4;
      }
      /* Print Styles */
      .pdf-print-container {
        width: 210mm;
        min-height: 297mm;
        padding: 15mm 15mm 12mm 15mm;
        background: #fff;
        color: #333;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.5;
        min-height: unset;
        height: auto;
        position: absolute;
        left: -9999px;
        top: -9999px;
      }
      .pdf-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #2575fc;
        padding-bottom: 10px;
        margin-bottom: 20px;
      }
      .pdf-title {
        color: #2575fc;
        margin: 0;
        font-size: 24px;
        text-transform: uppercase;
        font-weight: bold;
      }
      .pdf-logo {
        height: 60px;
        width: auto;
      }
      .pdf-section {
        margin-bottom: 25px;
      }
      .pdf-section-title {
        background: #f8f9fa;
        padding: 8px 12px;
        border-left: 4px solid #6a11cb;
        font-weight: bold;
        text-transform: uppercase;
        margin-bottom: 15px;
        font-size: 16px;
      }
      .pdf-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
      }
      .pdf-item {
        font-size: 14px;
        page-break-inside: avoid;
      }
      .pdf-item strong {
        color: #555;
      }
      .pdf-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
      }
      .pdf-table th {
        background: #f1f3f5;
        text-align: left;
        padding: 10px;
        border: 1px solid #dee2e6;
        font-size: 13px;
      }
      .pdf-table td {
        padding: 10px;
        border: 1px solid #dee2e6;
        font-size: 13px;
        vertical-align: top;
      }
      .serial-list {
        margin: 0;
        padding-left: 15px;
        list-style-type: disc;
      }
      .serial-list li {
        font-size: 12px;
      }
    `}
        </style>
        <Modal.Header
          style={{
            background: "linear-gradient(135deg, #2575fc, #6a11cb)",
            color: "#fff",
            padding: "15px 20px",
            borderBottom: "none",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
          }}
        >
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* LEFT – Title */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ marginRight: "10px", fontSize: "1.3rem" }}>📋</span>
              <span
                style={{
                  fontWeight: "700",
                  fontSize: "1.5rem",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  textShadow: "1px 1px 3px rgba(0, 0, 0, 0.2)",
                }}
              >
                Order Details
              </span>
            </div>

            {/* RIGHT – Export + Close */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Button
                onClick={handleExportPDF}
                disabled={isGeneratingPDF}
                size="sm"
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  border: "1px solid rgba(255, 255, 255, 0.4)",
                  padding: "6px 15px",
                  borderRadius: "20px",
                  color: "#fff",
                  fontWeight: "600",
                  fontSize: "0.85rem",
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)")
                }
              >
                {isGeneratingPDF ? (
                  <>
                    <Spinner size="sm" animation="border" /> Exporting...
                  </>
                ) : (
                  <>📄 Export PDF</>
                )}
              </Button>

              <button
                onClick={() => setShowViewModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          </div>
        </Modal.Header>
        <Modal.Body
          style={{
            padding: "0",
            background: "#f4f7f6",
            borderRadius: "0 0 15px 15px",
            display: "flex",
            flexDirection: "column",
            height: "calc(100vh - 100px)",
            overflow: "hidden"
          }}
        >
          {viewOrder && (
            <>
              {/* --- KEEP PDF TEMPLATE EXACTLY AS IS --- */}
              <div ref={pdfRef} className="pdf-print-container">
                <div className="pdf-header">
                  <div>
                    <h1 className="pdf-title">Dispatch Order</h1>
                    <div style={{ fontSize: "14px", color: "#666", marginTop: "5px" }}>
                      Official Dispatch Record
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <img src="/logo.png" alt="Company Logo" className="pdf-logo" onError={(e) => e.target.style.display = 'none'} />
                    <div style={{ marginTop: "10px", fontWeight: "bold", fontSize: "16px" }}>
                      Order ID: {viewOrder.orderId || "N/A"}
                    </div>
                  </div>
                </div>

                <div className="pdf-section">
                  <div className="pdf-section-title">Order Info</div>
                  <div className="pdf-grid">
                    <div className="pdf-item"><strong>Customer Name:</strong> {viewOrder.customername || "N/A"}</div>
                    <div className="pdf-item"><strong>Contact No:</strong> {viewOrder.contactNo || "N/A"}</div>
                    <div className="pdf-item"><strong>SO Date:</strong> {viewOrder.soDate ? new Date(viewOrder.soDate).toLocaleDateString() : "N/A"}</div>
                    <div className="pdf-item"><strong>Dispatch Date:</strong> {viewOrder.dispatchDate ? new Date(viewOrder.dispatchDate).toLocaleDateString() : "N/A"}</div>
                    <div className="pdf-item" style={{ gridColumn: "span 2" }}><strong>Shipping Address:</strong> {viewOrder.shippingAddress || "N/A"}</div>
                    <div className="pdf-item"><strong>Sales Person:</strong> {viewOrder.salesPerson || "N/A"}</div>
                    <div className="pdf-item"><strong>Dispatch From:</strong> {viewOrder.dispatchFrom || "N/A"}</div>
                    <div className="pdf-item"><strong>Transporter:</strong> {viewOrder.transporter || "N/A"}</div>
                    <div className="pdf-item"><strong>Docket No:</strong> {viewOrder.docketNo || "N/A"}</div>
                  </div>
                </div>

                <div className="pdf-section">
                  <div className="pdf-section-title">Product Info</div>
                  <table className="pdf-table">
                    <thead>
                      <tr>
                        <th style={{ width: "40px" }}>#</th>
                        <th>Product Type</th>
                        <th>Qty</th>
                        <th>Size / Spec</th>
                        <th>Serial Numbers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewOrder.products && viewOrder.products.length > 0 ? (
                        viewOrder.products.map((p, idx) => (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td>
                              {p.productType && p.productType !== "N/A"
                                ? p.productType
                                : ""}
                              {p.brand && p.brand !== "N/A" && (
                                <div style={{ fontSize: "12px", color: "#666" }}>
                                  {p.brand}
                                </div>
                              )}
                            </td>
                            <td>{p.qty && p.qty !== "N/A" ? p.qty : ""}</td>
                            <td>
                              {p.size && p.size !== "N/A" ? p.size : ""}
                              {p.size &&
                                p.size !== "N/A" &&
                                p.spec &&
                                p.spec !== "N/A"
                                ? " / "
                                : ""}
                              {p.spec && p.spec !== "N/A" ? p.spec : ""}
                            </td>
                            <td>
                              {p.serialNos && p.serialNos.length > 0 && (
                                <div>
                                  <strong>S/N:</strong>{" "}
                                  {p.serialNos.join(", ")}
                                </div>
                              )}
                              {p.modelNos && (
                                <div style={{ marginTop: "4px" }}>
                                  <strong>M/N:</strong>{" "}
                                  {p.modelNos.join(", ")}
                                </div>
                              )}
                              {p.productCode && p.productCode.length > 0 && (
                                <div style={{ marginTop: "4px" }}>
                                  <strong>Code:</strong>{" "}
                                  {p.productCode.join(", ")}
                                </div>
                              )}
                              {p.warranty && p.warranty !== "N/A" && (
                                <div style={{ marginTop: "4px" }}>
                                  <strong>Warranty:</strong> {p.warranty}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="5" style={{ textAlign: "center" }}>No products found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {viewOrder.remarksByProduction && (
                  <div className="pdf-section">
                    <div className="pdf-section-title">Production Remarks</div>
                    <div className="pdf-item" style={{ padding: "10px", background: "#f8f9fa", borderRadius: "5px" }}>
                      {viewOrder.remarksByProduction}
                    </div>
                  </div>
                )}
              </div>

              {/* --- VISIBLE MODAL CONTENT (NEW UI) --- */}
              <div className="modal-dashboard">
                <style>{`
                  .modal-dashboard {
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                    overflow-y: auto;
                    height: 100%;
                  }
                  .info-card {
                    background: #fff;
                    border-radius: 12px;
                    padding: 20px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                    border: 1px solid #eaeaea;
                  }
                  .section-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 20px;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 12px;
                  }
                  .section-title {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #2c3e50;
                    margin: 0;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                  }
                  .section-icon {
                    font-size: 1.2rem;
                    color: #2575fc;
                  }
                  .info-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 20px;
                  }
                  .info-item {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                  }
                  .info-label {
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: #8898aa;
                    font-weight: 600;
                  }
                  .info-value {
                    font-size: 0.95rem;
                    color: #32325d;
                    font-weight: 600;
                    word-break: break-word;
                  }
                  .product-card {
                    background: #fff;
                    border: 1px solid #e9ecef;
                    border-radius: 10px;
                    padding: 20px;
                    margin-bottom: 15px;
                    transition: transform 0.2s, box-shadow 0.2s;
                  }
                  .product-card:hover {
                    box-shadow: 0 5px 15px rgba(0,0,0,0.05);
                    border-color: #dee2e6;
                  }
                  .chip-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                  }
                  .chip {
                    background: #e9ecef;
                    color: #495057;
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 0.8rem;
                    font-weight: 600;
                  }
                  .status-badge-unified {
                    color: #fff;
                    padding: 6px 14px;
                    border-radius: 20px;
                    font-weight: 600;
                    font-size: 0.85rem;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                    display: inline-block;
                  }
                `}</style>

                {/* Section 1: Order Highlights */}
                <div className="info-card">
                  <div className="section-header">
                    <span className="section-icon">📌</span>
                    <h4 className="section-title">Order Overview</h4>
                  </div>
                  <div className="info-grid">
                    <InfoItem label="Order ID" value={viewOrder.orderId || "N/A"} copyable />
                    <InfoItem
                      label="SO Date"
                      value={
                        viewOrder.soDate
                          ? new Date(viewOrder.soDate).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                          : "N/A"
                      }
                    />

                    <InfoItem
                      label="Dispatch Date"
                      value={
                        viewOrder.dispatchDate
                          ? new Date(viewOrder.dispatchDate).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                          : "N/A"
                      }
                    />
                    <div className="info-item">
                      <span className="info-label">Dispatch Status</span>
                      <div className="info-value">
                        <InstallStatusBadge status={viewOrder.dispatchStatus === "Not Dispatched" ? "Pending Dispatched" : viewOrder.dispatchStatus || "Pending Dispatched"} />
                      </div>
                    </div>
                    <InfoItem label="Dispatch From" value={viewOrder.dispatchFrom || "N/A"} />
                    <InfoItem label="Sales Person" value={viewOrder.salesPerson || "N/A"} />
                  </div>
                </div>

                {/* Section 2: Customer & Shipping */}
                <div className="info-card">
                  <div className="section-header">
                    <span className="section-icon">🚚</span>
                    <h4 className="section-title">Customer & Shipping</h4>
                  </div>
                  <div className="info-grid">
                    <InfoItem label="Customer Name" value={viewOrder.customername || "N/A"} />
                    <InfoItem label="Contact No" value={viewOrder.contactNo || "N/A"} />
                    <InfoItem label="Shipping Address" value={viewOrder.shippingAddress || "N/A"} />
                    <InfoItem label="Transporter" value={viewOrder.transporter || "N/A"} />
                    <InfoItem label="Docket No" value={viewOrder.docketNo || "N/A"} />
                    {viewOrder.deliveredDate && (
                      <InfoItem label="Delivered Date" value={new Date(viewOrder.deliveredDate).toLocaleDateString("en-GB")} />
                    )}
                  </div>
                </div>

                {/* Section 3: Product Details */}
                <div className="info-card">
                  <div className="section-header">
                    <span className="section-icon">📦</span>
                    <h4 className="section-title">Product Details</h4>
                    <span style={{ marginLeft: "auto", fontSize: "0.9rem", color: "#6c757d" }}>
                      Total Items: {viewOrder.products?.length || 0}
                    </span>
                  </div>
                  {viewOrder.products && viewOrder.products.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                      {viewOrder.products.map((product, index) => (
                        <ProductCard key={index} product={product} index={index} />
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: "20px", textAlign: "center", color: "#aaa" }}>
                      No product details available.
                    </div>
                  )}
                </div>

                {/* Section 4: Remarks */}
                {(viewOrder.remarksByProduction || viewOrder.remarks) && (
                  <div className="info-card">
                    <div className="section-header">
                      <span className="section-icon">📝</span>
                      <h4 className="section-title">Remarks</h4>
                    </div>
                    <div className="info-grid">
                      <InfoItem label="Production Remarks" value={viewOrder.remarksByProduction} />
                      <InfoItem label="Order Remarks" value={viewOrder.remarks} />
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                  <Button
                    onClick={handleCopy}
                    style={{
                      background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                      border: "none",
                      padding: "10px 24px",
                      borderRadius: "25px",
                      color: "#fff",
                      fontWeight: "600",
                      fontSize: "1rem",
                      textTransform: "uppercase",
                      transition: "all 0.3s ease",
                      boxShadow: "0 4px 12px rgba(37, 117, 252, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}
                  >
                    {copied ? "✅ Copied" : "📑 Copy Details"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>

      <OutFinishedGoodModal
        visible={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleModalSubmit}
        initialData={editData}
        entryToEdit={
          editData
            ? orders.find((o) => o._id === editData._id) || editData
            : null
        }
      />
    </>
  );
}

export default Finish;

// --- REUSABLE UI COMPONENTS ---

const InfoItem = ({ label, value, copyable }) => {
  if (!value || value === "N/A" || value === "null") return null;
  return (
    <div className="info-item">
      <span className="info-label">{label}</span>
      <div
        className="info-value"
        onClick={() => {
          if (copyable) {
            navigator.clipboard.writeText(value);
            toast.info("Copied!", { autoClose: 1000, position: "bottom-center", hideProgressBar: true });
          }
        }}
        style={copyable ? { cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" } : {}}
        title={copyable ? "Click to copy" : ""}
      >
        {value}
        {copyable && <span style={{ opacity: 0.4, fontSize: "0.7em" }}>📋</span>}
      </div>
    </div>
  );
};

const InstallStatusBadge = ({ status }) => {
  const getStyle = (s) => {
    switch (s) {
      case "Pending":
        return { background: "linear-gradient(135deg, #ff6b6b, #ff8787)" };
      case "In Progress":
      case "Under Process":
      case "Partial Dispatch":
        return { background: "linear-gradient(135deg, #f39c12, #f7c200)" };
      case "Completed":
      case "Fulfilled":
      case "Dispatched":
        return { background: "linear-gradient(135deg, #28a745, #4cd964)" };
      default:
        return { background: "linear-gradient(135deg, #6c757d, #a9a9a9)" };
    }
  };
  return (
    <span className="status-badge-unified" style={getStyle(status)}>
      {status}
    </span>
  );
};

const ProductCard = ({ product, index }) => {
  return (
    <div className="product-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#333' }}>
            {product.productType || "Unknown Product"}
          </div>
          {product.brand && <div style={{ color: '#6c757d', fontSize: '0.9rem', fontWeight: '500' }}>{product.brand}</div>}
        </div>
        <span style={{
          background: '#e9ecef', color: '#495057',
          padding: '2px 8px', borderRadius: '4px',
          fontWeight: 'bold', fontSize: '0.8rem'
        }}>
          #{index + 1}
        </span>
      </div>

      <div className="info-grid" style={{ gap: '12px 20px', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
        <InfoItem label="Quantity" value={product.qty} />
        <InfoItem label="Size" value={product.size} />
        <InfoItem label="Spec" value={product.spec} />
        <InfoItem label="Warranty" value={product.warranty} />
      </div>

      {/* Chips Section */}
      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {product.modelNos?.length > 0 && (
          <div>
            <span className="info-label" style={{ display: 'block', marginBottom: '4px' }}>Model Numbers</span>
            <div className="chip-container">
              {[...new Set(product.modelNos)].map((m, i) => <span key={i} className="chip">{m}</span>)}
            </div>
          </div>
        )}

        {product.serialNos?.length > 0 && (
          <div>
            <span className="info-label" style={{ display: 'block', marginBottom: '4px' }}>Serial Numbers</span>
            <div className="chip-container">
              {product.serialNos.map((s, i) => <span key={i} className="chip">{s}</span>)}
            </div>
          </div>
        )}

        {product.productCode?.length > 0 && (
          <div>
            <span className="info-label" style={{ display: 'block', marginBottom: '4px' }}>Product Codes</span>
            <div className="chip-container">
              {[...new Set(product.productCode)].map((c, i) => <span key={i} className="chip">{c}</span>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
