import React, { useState, useEffect, useCallback } from "react";
import axios from "../../so/axiosSetup";
import { toast } from "react-toastify";
import { Button, Modal, Form, Spinner, Badge } from "react-bootstrap";
import { FaEye, FaTimes } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";
import { exportToExcel } from "../../utils/excelHelper";
import "../App.css";
import styled from "styled-components";
import DatePicker from "react-datepicker";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useRef } from "react";
import { getPortalAccessToken } from "../portal/PortalAuthContext";
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

const FilterLabel = styled(Form.Label)`
  font-weight: 700;
  font-size: 0.95rem;
  color: transparent;
  background: linear-gradient(135deg, #2575fc, #6a11cb);
  -webkit-background-clip: text;
  background-clip: text;
  letter-spacing: 0.5px;
  padding: 5px 10px;
  border-radius: 8px;
  display: inline-block;
  transition: transform 0.2s ease, opacity 0.2s ease;
  cursor: default;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: scale(1.05);
    opacity: 0.9;
  }

  span.underline {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background: linear-gradient(135deg, #2575fc, #6a11cb);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.3s ease;
  }

  &:hover span.underline {
    transform: scaleX(1);
  }
`;

const FilterInput = styled(Form.Control)`
  border-radius: 20px;
  padding: 10px 15px;
  border: 1px solid #ced4da;
  font-size: 1rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;

  &:focus {
    box-shadow: 0 0 10px rgba(37, 117, 252, 0.5);
  }
`;

const FilterSelect = styled(Form.Select)`
  border-radius: 20px;
  padding: 10px;
  border: 1px solid #ced4da;
  font-size: 1rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  background: #fff;
  transition: all 0.3s ease;

  &:focus {
    box-shadow: 0 0 10px rgba(37, 117, 252, 0.5);
  }
`;

const FilterButton = styled(Button)`
  background: ${({ variant }) =>
    variant === "clear"
      ? "linear-gradient(135deg, #ff6b6b, #ff8787)"
      : "linear-gradient(135deg, #28a745, #4cd964)"};
  border: none;
  padding: 10px 20px;
  border-radius: 20px;
  color: #fff;
  font-weight: 600;
  font-size: 1rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
  }
`;
const Production = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
  const [formData, setFormData] = useState({
    fulfillingStatus: "Pending",
    remarksByProduction: "",
    productUnits: [],
  });
  const [errors, setErrors] = useState({});
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [orderTypeFilter, setOrderTypeFilter] = useState("All");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const pdfRef = useRef(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_SO_URL}/api/production-orders`
      );
      if (response.data.success) {
        const sortedOrders = response.data.data.sort((a, b) => {
          // Extract numeric part from orderId (e.g., "PMTO156" -> 156)
          const getOrderNum = (orderId) => {
            const match = orderId ? orderId.match(/(\d+)$/) : null;
            return match ? parseInt(match[1], 10) : 0;
          };

          const numA = getOrderNum(a.orderId);
          const numB = getOrderNum(b.orderId);

          // Primary: Sort by order number descending (higher number first)
          if (numB !== numA) return numB - numA;

          // Secondary: If numbers same, sort by soDate descending
          const dateA = a.soDate ? new Date(a.soDate) : new Date(0);
          const dateB = b.soDate ? new Date(b.soDate) : new Date(0);
          return dateB - dateA;
        });
        setOrders(sortedOrders);
        setFilteredOrders(sortedOrders);
      } else {
        throw new Error(response.data.message || "Failed to fetch orders");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch production orders.";
      setError(errorMessage);
      toast.error(errorMessage, { position: "top-right", autoClose: 5000 });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchOrders();
  }, []);

  // Filter orders based on search query, status, and order type
  useEffect(() => {
    let filtered = orders.filter(
      (order) => order.fulfillingStatus !== "Fulfilled"
    );
    // Apply date range filter
    if (startDate || endDate) {
      filtered = filtered.filter((order) => {
        const orderDate = order.soDate ? new Date(order.soDate) : null;
        // Clone dates to avoid mutation
        const startDateAdjusted = startDate
          ? new Date(startDate.getTime()).setHours(0, 0, 0, 0)
          : null;
        const endDateAdjusted = endDate
          ? new Date(endDate.getTime()).setHours(23, 59, 59, 999)
          : null;
        return (
          (!startDateAdjusted ||
            (orderDate && orderDate >= startDateAdjusted)) &&
          (!endDateAdjusted || (orderDate && orderDate <= endDateAdjusted))
        );
      });
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((order) => {
        const productDetails = Array.isArray(order.products)
          ? order.products
            .map((p) => `${p.productType || ""} (${p.qty || ""})`)
            .join(", ")
          : "";
        const firstProduct =
          Array.isArray(order.products) && order.products.length > 0
            ? order.products[0]
            : {};
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
          (firstProduct.serialNos?.join(", ") || "")
            .toLowerCase()
            .includes(query) ||
          (firstProduct.modelNos?.join(", ") || "")
            .toLowerCase()
            .includes(query) ||
          (order.fulfillingStatus || "").toLowerCase().includes(query)
        );
      });
    }
    if (statusFilter !== "All") {
      filtered = filtered.filter(
        (order) => order.fulfillingStatus === statusFilter
      );
    }
    if (orderTypeFilter !== "All") {
      filtered = filtered.filter(
        (order) => order.orderType === orderTypeFilter
      );
    }
    // Sort filtered orders: Primary by order number descending, secondary by soDate descending
    filtered = filtered.sort((a, b) => {
      // Extract numeric part from orderId (e.g., "PMTO156" -> 156)
      const getOrderNum = (orderId) => {
        const match = orderId ? orderId.match(/(\d+)$/) : null;
        return match ? parseInt(match[1], 10) : 0;
      };

      const numA = getOrderNum(a.orderId);
      const numB = getOrderNum(b.orderId);

      // Primary: Sort by order number descending (higher number first)
      if (numB !== numA) return numB - numA;

      // Secondary: If numbers same, sort by soDate descending
      const dateA = a.soDate ? new Date(a.soDate) : new Date(0);
      const dateB = b.soDate ? new Date(b.soDate) : new Date(0);
      return dateB - dateA;
    });
    setFilteredOrders(filtered);
  }, [orders, searchQuery, statusFilter, orderTypeFilter, startDate, endDate]);
  // Get unique statuses for filter dropdown
  const uniqueStatuses = [
    "All",
    "Under Process",
    "Pending",
    "Partial Dispatch",
    "Fulfilled",
    ...new Set(
      orders
        .map((order) => order.fulfillingStatus || "Pending")
        .filter(
          (status) =>
            ![
              "Under Process",
              "Pending",
              "Partial Dispatch",
              "Fulfilled",
            ].includes(status)
        )
    ),
  ];
  const clearFilters = () => {
    setSearchQuery("");
    setStartDate(null);
    setEndDate(null);
    setStatusFilter("All");
    setOrderTypeFilter("All");
  };
  const uniqueOrderTypes = [
    "All",
    ...new Set(orders.map((order) => order.orderType || "N/A")),
  ];
  const productTypeGroups = formData.productUnits.reduce((acc, unit) => {
    if (!acc[unit.productType]) {
      acc[unit.productType] = [];
    }
    acc[unit.productType].push(unit);
    return acc;
  }, {});

  // Download Po Fie
  const handleDownload = useCallback(async () => {
    try {
      if (!viewOrder?.poFilePath) {
        toast.error("No file available for download!");
        return;
      }

      // Extract filename from path
      const fileName = viewOrder.poFilePath.split("/").pop();
      if (!fileName) {
        toast.error("Invalid file name!");
        return;
      }

      // ✅ Use authenticated download endpoint
      const fileUrl = `${process.env.REACT_APP_SO_URL}/api/download/${encodeURIComponent(fileName)}`;

      const token = getPortalAccessToken();
      if (!token) {
        toast.error("Authentication token not found. Please log in again.");
        return;
      }

      const response = await fetch(fileUrl, {
        method: "GET",
        headers: {
          Accept:
            "application/pdf,image/png,image/jpeg,image/jpg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Server error: ${response.status} ${response.statusText}`
        );
      }

      const contentType = response.headers.get("content-type");
      const validTypes = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/jpg",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];

      if (!contentType || !validTypes.includes(contentType)) {
        throw new Error("Invalid file type returned from server!");
      }

      const blob = await response.blob();

      // ✅ FileName fix
      const extension = contentType.split("/")[1] || "file";
      const downloadFileName =
        viewOrder.poFilePath.split("/").pop() ||
        `order_${viewOrder.orderId || "unknown"}.${extension}`;

      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);

      toast.success("File download started!");
    } catch (err) {
      toast.error("Failed to download file! Check server or file path.");
      console.error("Download error:", err);
    }
  }, [viewOrder]);
  // Handle model number change for a product type
  const handleModelNoChange = (productType, value) => {
    const newUnits = formData.productUnits.map((unit) =>
      unit.productType === productType ? { ...unit, modelNo: value } : unit
    );
    setFormData({ ...formData, productUnits: newUnits });
  };
  const handleEdit = (order) => {
    setEditOrder(order);
    const products = Array.isArray(order.products) ? order.products : [];
    const productUnits = products.flatMap((product, productIndex) => {
      const qty = product.qty || 1;
      const serialNos = Array.isArray(product.serialNos)
        ? product.serialNos
        : [];
      const modelNos = Array.isArray(product.modelNos) ? product.modelNos : [];
      return Array.from({ length: qty }, (_, unitIndex) => ({
        productIndex,
        productType: product.productType || "N/A",
        size: product.size || "N/A",
        spec: product.spec || "N/A",
        unitPrice: product.unitPrice || 0,
        serialNo: serialNos[unitIndex] || "",
        modelNo: modelNos[unitIndex] || "",
      }));
    });
    setFormData({
      fulfillingStatus: order.fulfillingStatus || "Pending",
      remarksByProduction: order.remarksByProduction || "",
      productUnits,
    });
    setErrors({});
    setShowEditModal(true);
  };

  const validateForm = () => {
    const newErrors = {};
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    const productMap = formData.productUnits.reduce((acc, unit) => {
      const {
        productIndex,
        productType,
        size,
        spec,
        unitPrice,
        serialNo,
        modelNo,
      } = unit;
      if (!acc[productIndex]) {
        acc[productIndex] = {
          productType,
          size,
          spec,
          unitPrice,
          qty: 0,
          serialNos: [],
          modelNos: [],
        };
      }
      acc[productIndex].qty += 1;
      acc[productIndex].serialNos.push(serialNo || null);
      acc[productIndex].modelNos.push(modelNo || null);
      return acc;
    }, {});
    const products = Object.values(productMap);
    const submitData = { ...formData, products };
    delete submitData.productUnits;
    try {
      const response = await axios.patch(
        `${process.env.REACT_APP_SO_URL}/api/edit/${editOrder?._id}`,
        submitData
      );
      if (response.data.success) {
        setOrders((prevOrders) => {
          if (response.data.data.fulfillingStatus === "Fulfilled") {
            // Remove the order if its status is Fulfilled
            const updatedOrders = prevOrders.filter(
              (order) => order._id !== editOrder._id
            );
            return updatedOrders.sort((a, b) => {
              const dateA = a.soDate ? new Date(a.soDate) : new Date(0);
              const dateB = b.soDate ? new Date(b.soDate) : new Date(0);
              return dateB - dateA;
            });
          } else {
            // Update the order in place if not Fulfilled
            const updatedOrders = prevOrders.map((order) =>
              order._id === editOrder._id ? response.data.data : order
            );
            return updatedOrders.sort((a, b) => {
              const dateA = a.soDate ? new Date(a.soDate) : new Date(0);
              const dateB = b.soDate ? new Date(b.soDate) : new Date(0);
              return dateB - dateA;
            });
          }
        });
        setShowEditModal(false);
        toast.success("Order updated successfully!", {
          position: "top-right",
          autoClose: 3000,
        });
      } else {
        throw new Error(response.data.message || "Failed to update order");
      }
    } catch (error) {
      console.error("Error updating order:", error);

      let userFriendlyMessage = "Unable to update the order. Please try again.";

      if (error.response) {
        if (error.response.status === 400) {
          userFriendlyMessage =
            "Invalid data. Please check your input and try again.";
        } else if (error.response.status === 401) {
          userFriendlyMessage = "Your session expired. Please login again.";
        } else if (error.response.status === 403) {
          userFriendlyMessage =
            "You do not have permission to update this order.";
        } else if (error.response.status === 404) {
          userFriendlyMessage = "Order not found.";
        } else if (error.response.status >= 500) {
          userFriendlyMessage = "Server error. Please try later.";
        } else if (error.response.data?.message) {
          userFriendlyMessage = error.response.data.message;
        }
      } else if (error.request) {
        userFriendlyMessage =
          "No response from server. Check your internet connection.";
      }

      toast.error(userFriendlyMessage, {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };
  const handleView = (order) => {
    setViewOrder(order);
    setShowViewModal(true);
    setCopied(false);
  };

  const handleCopy = useCallback(() => {
    if (!viewOrder) return;
    const productsText = Array.isArray(viewOrder.products)
      ? viewOrder.products
        .map(
          (p, i) =>
            `Product ${i + 1}: ${p.productType || "N/A"} (Qty: ${p.qty || "N/A"
            }, Size: ${p.size || "N/A"}, Spec: ${p.spec || "N/A"
            }, Serial Nos: ${p.serialNos && p.serialNos.length > 0
              ? p.serialNos.join(", ")
              : "N/A"
            }, Model Nos: ${p.modelNos && p.modelNos.length > 0
              ? p.modelNos.join(", ")
              : "N/A"
            }, Product Code: ${p.productCode && p.productCode.length > 0
              ? p.productCode.join(", ")
              : "N/A"
            }, Warranty: ${p.warranty || "N/A"})`
        )
        .join("\n")
      : "N/A";
    const textToCopy = `
      Order ID: ${viewOrder.orderId || "N/A"}
      Customer Name: ${viewOrder.customername || "N/A"}
      Sales Person: ${viewOrder.salesPerson || "N/A"}
      Products:\n${productsText}
      Fulfilling Status: ${viewOrder.fulfillingStatus || "Pending"}
      Remarks by Production: ${viewOrder.remarksByProduction || "N/A"}
    `.trim();
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        setCopied(true);
        toast.success("Details copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        toast.error("Failed to copy details!");
        console.error("Copy error:", err);
      });
  }, [viewOrder]);
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
      const SAFE_BOTTOM = 8; // 🔥 prevents half-cut text

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

      pdf.save(`Production_Order_${viewOrder.orderId || "Details"}.pdf`);
      toast.success("PDF exported successfully!");
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("Failed to export PDF.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const totalPending = filteredOrders.filter(
    (order) => order.fulfillingStatus === "Pending"
  ).length;

  const handleExportExcel = useCallback(async () => {
    const exportData = filteredOrders.map((order) => {
      const firstProduct =
        Array.isArray(order.products) && order.products.length > 0
          ? order.products[0]
          : {};
      const productDetails = Array.isArray(order.products)
        ? order.products
          .map((p) => `${p.productType || "N/A"} (${p.qty || "N/A"})`)
          .join(", ")
        : "N/A";
      const totalQty = Array.isArray(order.products)
        ? order.products.reduce((sum, p) => sum + (p.qty || 0), 0)
        : "N/A";
      return {
        "Order ID": order.orderId || "N/A",
        "So Date": order.soDate
          ? new Date(order.soDate).toLocaleDateString("en-IN")
          : "N/A",
        "Customer Name": order.customername || "N/A",
        "Shipping Address": order.shippingAddress || "N/A",
        "Customer Email": order.customerEmail || "N/A",
        "Contact No": order.contactNo || "N/A",
        "Order Type": order.orderType || "N/A",
        "Product Details": productDetails,
        Size: firstProduct.size || "N/A",
        Spec: firstProduct.spec || "N/A",
        "Serial Nos":
          firstProduct.serialNos?.length > 0
            ? firstProduct.serialNos.join(", ")
            : "N/A",
        "Model Nos":
          firstProduct.modelNos?.length > 0
            ? firstProduct.modelNos.join(", ")
            : "N/A",
        "Production Status": order.fulfillingStatus || "Pending",
        "Total Quantity": totalQty,
      };
    });
    await exportToExcel(exportData, "Production Orders", `Production_Orders_${new Date().toISOString().split("T")[0]}.xlsx`);
  }, [filteredOrders]);

  return (
    <>
      <div
        style={{
          width: "100%",
          margin: "0",
          padding: "20px",
          background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
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
            Production Team Dashboard
          </h1>
        </header>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "15px",
            marginTop: "20px",
            marginBottom: "20px",
            alignItems: "flex-start",
          }}
        >
          <div style={{ position: "relative", flex: "1 1 300px" }}>
            <Form.Label
              style={{
                fontWeight: "700",
                fontSize: "0.95rem",
                color: "transparent",
                background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                letterSpacing: "0.5px",
                padding: "5px 10px",
                borderRadius: "8px",
                display: "inline-block",
                transition: "transform 0.2s ease, opacity 0.2s ease",
                cursor: "default",
                position: "relative",
                overflow: "hidden",
              }}
              title="Filter by production status"
            >
              <span style={{ marginRight: "5px" }}>📊</span> Search
              <span
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  width: "100%",
                  height: "2px",
                  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                  transform: "scaleX(0)",
                  transformOrigin: "left",
                  transition: "transform 0.3s ease",
                }}
              />
            </Form.Label>{" "}
            <Form.Label
              style={{
                fontWeight: "700",
                fontSize: "0.95rem",
                color: "transparent",
                background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                letterSpacing: "0.5px",
                padding: "5px 10px",
                borderRadius: "8px",
                display: "inline-block",
                transition: "transform 0.2s ease, opacity 0.2s ease",
                cursor: "default",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "scale(1.05)";
                e.target.style.opacity = "0.9";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "scale(1)";
                e.target.style.opacity = "1";
              }}
              title="Filter by production status"
            >
              <span style={{ marginRight: "5px" }}></span>
              <span
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  width: "80%",
                  height: "2px",
                  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                  transform: "scaleX(0)",
                  transformOrigin: "left",
                  transition: "transform 0.3s ease",
                }}
              />
            </Form.Label>
            <Form.Control
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                borderRadius: "20px",
                maxWidth: "700px",
                padding: "10px 40px 10px 15px",
                border: "1px solid #ced4da",
                fontSize: "1rem",
                boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
                transition: "all 0.3s ease",
              }}
              onFocus={(e) =>
                (e.target.style.boxShadow = "0 0 10px rgba(37, 117, 252, 0.5)")
              }
              onBlur={(e) =>
                (e.target.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.1)")
              }
            />
          </div>{" "}
          <div
            style={{
              flex: "1 1 300px",
              maxWidth: "400px",
              display: "flex",
              gap: "10px",
            }}
          >
            <div style={{ flex: 1 }}>
              <FilterLabel title="Select start date">
                <span style={{ marginRight: "5px" }}>📅</span> Start Date
                <span className="underline" />
              </FilterLabel>
              <DatePickerWrapper>
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  placeholderText="Start Date"
                  dateFormat="dd/MM/yyyy"
                  isClearable
                  className="form-control"
                  wrapperClassName="w-100"
                />{" "}
              </DatePickerWrapper>
            </div>
            <div style={{ flex: 1 }}>
              <FilterLabel title="Select end date">
                <span style={{ marginRight: "5px" }}>📅</span> End Date
                <span className="underline" />
              </FilterLabel>{" "}
              <DatePickerWrapper>
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                  placeholderText="End Date"
                  dateFormat="dd/MM/yyyy"
                  isClearable
                  className="form-control"
                  wrapperClassName="w-100"
                />{" "}
              </DatePickerWrapper>
            </div>
          </div>
          <Form.Group style={{ flex: "0 1 200px" }}>
            <Form.Label
              style={{
                fontWeight: "700",
                fontSize: "0.95rem",
                color: "transparent",
                background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                letterSpacing: "0.5px",
                padding: "5px 10px",
                borderRadius: "8px",
                display: "inline-block",
                transition: "transform 0.2s ease, opacity 0.2s ease",
                cursor: "default",
                position: "relative",
                overflow: "hidden",
              }}
              title="Filter by production status"
            >
              <span style={{ marginRight: "5px" }}>📊</span> Production Status
              <span
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  width: "100%",
                  height: "2px",
                  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                  transform: "scaleX(0)",
                  transformOrigin: "left",
                  transition: "transform 0.3s ease",
                }}
              />
            </Form.Label>
            <Form.Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                borderRadius: "20px",
                padding: "10px",
                border: "1px solid #ced4da",
                fontSize: "1rem",
                boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
                background: "#fff",
                transition: "all 0.3s ease",
              }}
              onFocus={(e) =>
                (e.target.style.boxShadow = "0 0 10px rgba(37, 117, 252, 0.5)")
              }
              onBlur={(e) =>
                (e.target.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.1)")
              }
            >
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group style={{ flex: "0 1 200px" }}>
            <Form.Label
              style={{
                fontWeight: "700",
                fontSize: "0.95rem",
                color: "transparent",
                background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                letterSpacing: "0.5px",
                padding: "5px 10px",
                borderRadius: "8px",
                display: "inline-block",
                transition: "transform 0.2s ease, opacity 0.2s ease",
                cursor: "default",
                position: "relative",
                overflow: "hidden",
              }}
              title="Filter by order type"
            >
              <span style={{ marginRight: "5px" }}>📋</span> Order Type
              <span
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  width: "100%",
                  height: "2px",
                  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                  transform: "scaleX(0)",
                  transformOrigin: "left",
                  transition: "transform 0.3s ease",
                }}
                onMouseEnter={(e) => (e.target.style.transform = "scaleX(1)")}
                onMouseLeave={(e) => (e.target.style.transform = "scaleX(0)")}
              />
            </Form.Label>
            <Form.Select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value)}
              style={{
                borderRadius: "20px",
                padding: "10px",
                border: "1px solid #ced4da",
                fontSize: "1rem",
                boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
                background: "#fff",
                transition: "all 0.3s ease",
              }}
              onFocus={(e) =>
                (e.target.style.boxShadow = "0 0 10px rgba(37, 117, 252, 0.5)")
              }
              onBlur={(e) =>
                (e.target.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.1)")
              }
            >
              {uniqueOrderTypes.map((orderType) => (
                <option key={orderType} value={orderType}>
                  {orderType}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Button
            onClick={handleExportExcel}
            style={{
              background: "linear-gradient(135deg, #28a745, #4cd964)",
              border: "none",
              padding: "10px 20px",
              borderRadius: "20px",
              color: "#fff",
              fontWeight: "600",
              marginBottom: "-45px",
              fontSize: "1rem",
              boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
              transition: "all 0.3s ease",
              alignSelf: "center",
            }}
            onMouseEnter={(e) =>
              (e.target.style.transform = "translateY(-2px)")
            }
            onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
          >
            Export to Excel
          </Button>
          {""}
          <Button
            onClick={clearFilters}
            style={{
              background:
                "linear-gradient(135deg,rgb(167, 110, 40),rgb(217, 159, 41))",
              border: "none",
              padding: "10px 20px",
              borderRadius: "20px",
              color: "#fff",
              fontWeight: "600",
              marginBottom: "-45px",
              fontSize: "1rem",
              boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
              transition: "all 0.3s ease",
              alignSelf: "center",
            }}
            onMouseEnter={(e) =>
              (e.target.style.transform = "translateY(-2px)")
            }
            onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
          >
            Clear Filters
          </Button>
        </div>{" "}
        <div style={{ padding: "20px", flex: 1 }}>
          {error && (
            <div
              style={{
                background: "linear-gradient(135deg, #ff6b6b, #ff8787)",
                color: "#fff",
                padding: "15px",
                borderRadius: "10px",
                marginBottom: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
              }}
            >
              <span>
                <strong>Error:</strong> {error}
              </span>
              <Button
                onClick={fetchOrders}
                style={{
                  background: "transparent",
                  border: "1px solid #fff",
                  color: "#fff",
                  padding: "5px 15px",
                  borderRadius: "20px",
                  fontWeight: "500",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => (e.target.style.background = "#ffffff30")}
                onMouseLeave={(e) =>
                  (e.target.style.background = "transparent")
                }
              >
                Retry
              </Button>
            </div>
          )}

          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "50px 0",
                background: "#fff",
                borderRadius: "10px",
                boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
              }}
            >
              <Spinner
                animation="border"
                style={{ color: "#2575fc", width: "40px", height: "40px" }}
              />
              <p
                style={{
                  marginTop: "10px",
                  color: "#333",
                  fontSize: "1.1rem",
                  fontWeight: "500",
                }}
              >
                Loading orders...
              </p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div
              style={{
                background: "linear-gradient(135deg, #ff6b6b, #ff8787)",
                color: "white",
                padding: "20px",
                borderRadius: "10px",
                textAlign: "center",
                boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
                fontSize: "1.3rem",
                fontWeight: "500",
              }}
            >
              No approved orders available for production.
            </div>
          ) : (
            <>
              <div className="total-results " style={{ marginBottom: "20px" }}>
                <span>Total Orders: {filteredOrders.length}</span>
                <span>Total Pending: {totalPending}</span>
              </div>
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
                        "So Date",
                        "Customer Name",
                        "Sales Person",
                        "Shipping Address",
                        "Customer Email",
                        "Contact No",
                        "Order Type",
                        "Product Details",
                        "Size",
                        "Spec",
                        "Serial Nos",
                        "Model Nos",
                        "Attachment",
                        "Remarks",
                        "Production Status",
                        "Quantity",
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
                    {filteredOrders.map((order, index) => {
                      const firstProduct =
                        Array.isArray(order.products) &&
                          order.products.length > 0
                          ? order.products[0]
                          : {};
                      const totalQty = Array.isArray(order.products)
                        ? order.products.reduce(
                          (sum, p) => sum + (p.qty || 0),
                          0
                        )
                        : "N/A";
                      const productDetails = Array.isArray(order.products)
                        ? order.products
                          .map(
                            (p) =>
                              `${p.productType || "N/A"} (${p.qty || "N/A"})`
                          )
                          .join(", ")
                        : "N/A";
                      return (
                        <tr
                          key={order._id}
                          style={{
                            background: index % 2 === 0 ? "#f8f9fa" : "#fff",
                            transition: "all 0.3s ease",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#e9ecef")
                          }
                          onMouseLeave={(e) =>
                          (e.currentTarget.style.background =
                            index % 2 === 0 ? "#f8f9fa" : "#fff")
                          }
                        >
                          <td
                            style={{
                              padding: "15px",
                              textAlign: "center",
                              color: "#2c3e50",
                              fontSize: "1rem",
                              borderBottom: "1px solid #eee",
                              height: "40px",
                              lineHeight: "40px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "150px",
                            }}
                            title={order.orderId || "N/A"}
                          >
                            {order.orderId || "N/A"}
                          </td>
                          <td
                            style={{
                              padding: "15px",
                              textAlign: "center",
                              color: "#2c3e50",
                              fontSize: "1rem",
                              borderBottom: "1px solid #eee",
                              height: "40px",
                              lineHeight: "40px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "150px",
                            }}
                            title={
                              order.soDate
                                ? new Date(order.soDate).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  }
                                )
                                : "N/A"
                            }
                          >
                            {order.soDate
                              ? new Date(order.soDate).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                }
                              )
                              : "N/A"}
                          </td>
                          <td
                            style={{
                              padding: "15px",
                              textAlign: "center",
                              color: "#2c3e50",
                              fontSize: "1rem",
                              borderBottom: "1px solid #eee",
                              height: "40px",
                              lineHeight: "40px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "150px",
                            }}
                            title={order.customername || "N/A"}
                          >
                            {order.customername || "N/A"}
                          </td>  <td
                            style={{
                              padding: "15px",
                              textAlign: "center",
                              color: "#2c3e50",
                              fontSize: "1rem",
                              borderBottom: "1px solid #eee",
                              height: "40px",
                              lineHeight: "40px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "150px",
                            }}
                            title={order.salesPerson || "N/A"}
                          >
                            {order.salesPerson || "N/A"}
                          </td>
                          <td
                            style={{
                              padding: "15px",
                              textAlign: "center",
                              color: "#2c3e50",
                              fontSize: "1rem",
                              borderBottom: "1px solid #eee",
                              height: "40px",
                              lineHeight: "40px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "200px",
                            }}
                            title={order.shippingAddress || "N/A"}
                          >
                            {order.shippingAddress || "N/A"}
                          </td>
                          <td
                            style={{
                              padding: "15px",
                              textAlign: "center",
                              color: "#2c3e50",
                              fontSize: "1rem",
                              borderBottom: "1px solid #eee",
                              height: "40px",
                              lineHeight: "40px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "150px",
                            }}
                            title={order.customerEmail || "N/A"}
                          >
                            {order.customerEmail || "N/A"}
                          </td>
                          <td
                            style={{
                              padding: "15px",
                              textAlign: "center",
                              color: "#2c3e50",
                              fontSize: "1rem",
                              borderBottom: "1px solid #eee",
                              height: "40px",
                              lineHeight: "40px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "150px",
                            }}
                            title={order.contactNo || "N/A"}
                          >
                            {order.contactNo || "N/A"}
                          </td>
                          <td
                            style={{
                              padding: "15px",
                              textAlign: "center",
                              color: "#2c3e50",
                              fontSize: "1rem",
                              borderBottom: "1px solid #eee",
                              height: "40px",
                              lineHeight: "40px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "150px",
                            }}
                            title={order.orderType || "N/A"}
                          >
                            {order.orderType || "N/A"}
                          </td>
                          <td
                            style={{
                              padding: "15px",
                              textAlign: "center",
                              color: "#2c3e50",
                              fontSize: "1rem",
                              borderBottom: "1px solid #eee",
                              height: "40px",
                              lineHeight: "40px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "200px",
                            }}
                            title={productDetails}
                          >
                            {productDetails}
                          </td>
                          <td
                            style={{
                              padding: "15px",
                              textAlign: "center",
                              color: "#2c3e50",
                              fontSize: "1rem",
                              borderBottom: "1px solid #eee",
                              height: "40px",
                              lineHeight: "40px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "150px",
                            }}
                            title={firstProduct.size || "N/A"}
                          >
                            {firstProduct.size || "N/A"}
                          </td>
                          <td
                            style={{
                              padding: "15px",
                              textAlign: "center",
                              color: "#2c3e50",
                              fontSize: "1rem",
                              borderBottom: "1px solid #eee",
                              height: "40px",
                              lineHeight: "40px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "150px",
                            }}
                            title={firstProduct.spec || "N/A"}
                          >
                            {firstProduct.spec || "N/A"}
                          </td>
                          <td
                            style={{
                              padding: "15px",
                              textAlign: "center",
                              color: "#2c3e50",
                              fontSize: "1rem",
                              borderBottom: "1px solid #eee",
                              height: "40px",
                              lineHeight: "40px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "150px",
                            }}
                            title={
                              firstProduct.serialNos?.length > 0
                                ? firstProduct.serialNos.join(", ")
                                : "N/A"
                            }
                          >
                            {firstProduct.serialNos?.length > 0
                              ? firstProduct.serialNos.join(", ")
                              : "N/A"}
                          </td>
                          <td
                            style={{
                              padding: "15px",
                              textAlign: "center",
                              color: "#2c3e50",
                              fontSize: "1rem",
                              borderBottom: "1px solid #eee",
                              height: "40px",
                              lineHeight: "40px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "150px",
                            }}
                            title={
                              firstProduct.modelNos?.length > 0
                                ? firstProduct.modelNos.join(", ")
                                : "N/A"
                            }
                          >
                            {firstProduct.modelNos?.length > 0
                              ? firstProduct.modelNos.join(", ")
                              : "N/A"}
                          </td>
                          <td
                            style={{
                              padding: "15px",
                              textAlign: "center",
                              color: "#2c3e50",
                              fontSize: "1rem",
                              borderBottom: "1px solid #eee",
                              height: "40px",
                              lineHeight: "40px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "150px",
                            }}
                            title={
                              order.poFilePath ? "Attached" : "Not Attached"
                            }
                          >
                            <Badge
                              style={{
                                background: order.poFilePath
                                  ? "linear-gradient(135deg, #28a745, #4cd964)" // Green gradient for attached
                                  : "linear-gradient(135deg, #ff6b6b, #ff8787)", // Red gradient for not attached
                                color: "#fff",
                                padding: "6px 14px",
                                borderRadius: "20px",
                                fontWeight: "600",
                                fontSize: "0.9rem",
                                boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                              }}
                            >
                              {order.poFilePath ? "Attached" : "Not Attached"}
                            </Badge>
                          </td>
                          <td
                            style={{
                              padding: "15px",
                              textAlign: "center",
                              color: "#2c3e50",
                              fontSize: "1rem",
                              borderBottom: "1px solid #eee",
                              height: "40px",
                              lineHeight: "40px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "150px",
                            }}
                            title={order.remarks || "N/A"}
                          >
                            {order.remarks || "N/A"}
                          </td>
                          <td
                            style={{
                              padding: "15px",
                              textAlign: "center",
                              color: "#2c3e50",
                              fontSize: "1rem",
                              borderBottom: "1px solid #eee",
                              height: "40px",
                              lineHeight: "40px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "150px",
                            }}
                            title={order.fulfillingStatus || "Pending"}
                          >
                            <Badge
                              style={{
                                background:
                                  order.fulfillingStatus === "Under Process"
                                    ? "linear-gradient(135deg, #f39c12, #f7c200)"
                                    : order.fulfillingStatus === "Pending"
                                      ? "linear-gradient(135deg, #ff6b6b, #ff8787)"
                                      : order.fulfillingStatus ===
                                        "Partial Dispatch"
                                        ? "linear-gradient(135deg, #00c6ff, #0072ff)"
                                        : order.fulfillingStatus === "Fulfilled"
                                          ? "linear-gradient(135deg, #28a745, #4cd964)"
                                          : "linear-gradient(135deg, #6c757d, #a9a9a9)",
                                color: "#fff",
                                padding: "5px 10px",
                                borderRadius: "12px",
                                display: "inline-block",
                                width: "100%",
                                textOverflow: "ellipsis",
                                overflow: "hidden",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {order.fulfillingStatus || "Pending"}
                            </Badge>
                          </td>
                          <td
                            style={{
                              padding: "15px",
                              textAlign: "center",
                              color: "#2c3e50",
                              fontSize: "1rem",
                              borderBottom: "1px solid #eee",
                              height: "40px",
                              lineHeight: "40px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "100px",
                            }}
                            title={totalQty}
                          >
                            {totalQty}
                          </td>
                          <td
                            style={{
                              padding: "15px",
                              textAlign: "center",
                              height: "40px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderBottom: "1px solid #eee",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: "10px",
                                justifyContent: "center",
                                marginTop: "25px",
                                alignItems: "center",
                              }}
                            >
                              <Button
                                variant="primary"
                                onClick={() => handleView(order)}
                                style={{
                                  width: "40px",
                                  height: "40px",
                                  borderRadius: "22px",
                                  padding: "0",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <FaEye style={{ marginBottom: "3px" }} />
                              </Button>
                              <button
                                className="editBtn"
                                onClick={() => handleEdit(order)}
                                style={{
                                  minWidth: "40px",
                                  width: "40px",
                                  height: "40px",
                                  padding: "0",
                                  border: "none",
                                  background:
                                    "linear-gradient(135deg, #6c757d, #5a6268)",
                                  borderRadius: "22px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <svg
                                  height="1em"
                                  viewBox="0 0 512 512"
                                  fill="#fff"
                                >
                                  <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z" />
                                </svg>
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
        <Modal
          show={showEditModal}
          onHide={() => setShowEditModal(false)}
          centered
          backdrop="static"
        >
          <Modal.Header
            closeButton
            style={{
              background: "linear-gradient(135deg, #2575fc, #6a11cb)",
              color: "#fff",
              borderBottom: "none",
              padding: "20px",
            }}
          >
            <Modal.Title
              style={{
                fontWeight: "700",
                fontSize: "1.5rem",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              Edit Production Order
            </Modal.Title>
          </Modal.Header>
          <Modal.Body
            style={{
              padding: "30px",
              background: "#fff",
              borderRadius: "0 0 15px 15px",
              boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Form onSubmit={handleEditSubmit}>
              <Form.Group style={{ marginBottom: "20px" }}>
                <Form.Label style={{ fontWeight: "600", color: "#333" }}>
                  Production Status
                </Form.Label>
                <Form.Select
                  value={formData.fulfillingStatus || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fulfillingStatus: e.target.value,
                    })
                  }
                  style={{
                    borderRadius: "10px",
                    border: "1px solid #ced4da",
                    padding: "12px",
                    fontSize: "1rem",
                    transition: "all 0.3s ease",
                  }}
                  onFocus={(e) =>
                  (e.target.style.boxShadow =
                    "0 0 10px rgba(37, 117, 252, 0.5)")
                  }
                  onBlur={(e) => (e.target.style.boxShadow = "none")}
                >
                  <option value="Under Process">Under Process</option>
                  <option value="Pending">Pending</option>
                  <option value="Partial Dispatch">Partial Dispatch</option>
                  <option value="Fulfilled">Completed</option>
                </Form.Select>
              </Form.Group>
              {Object.keys(productTypeGroups).length > 0 ? (
                Object.entries(productTypeGroups).map(
                  ([productType, units], groupIndex) => (
                    <div
                      key={groupIndex}
                      style={{
                        marginBottom: "20px",
                        padding: "15px",
                        background: "#f8f9fa",
                        borderRadius: "10px",
                      }}
                    >
                      <h5 style={{ fontSize: "1.1rem", color: "#333" }}>
                        {productType} - {units.length} Unit
                        {units.length > 1 ? "s" : ""}
                      </h5>
                      <Form.Group style={{ marginBottom: "15px" }}>
                        <Form.Label
                          style={{ fontWeight: "600", color: "#333" }}
                        >
                          Model Number
                        </Form.Label>
                        <Form.Control
                          type="text"
                          value={units[0].modelNo || ""}
                          onChange={(e) =>
                            handleModelNoChange(productType, e.target.value)
                          }
                          placeholder={`Model No for ${productType}`}
                          style={{
                            borderRadius: "10px",
                            border: "1px solid #ced4da",
                            padding: "12px",
                            fontSize: "1rem",
                            transition: "all 0.3s ease",
                          }}
                          onFocus={(e) =>
                          (e.target.style.boxShadow =
                            "0 0 10px rgba(37, 117, 252, 0.5)")
                          }
                          onBlur={(e) => (e.target.style.boxShadow = "none")}
                        />
                      </Form.Group>
                      {units.map((unit, index) => (
                        <Form.Group
                          key={index}
                          style={{ marginBottom: "15px" }}
                        >
                          <Form.Label
                            style={{ fontWeight: "600", color: "#333" }}
                          >
                            Serial Number - Unit {index + 1}
                          </Form.Label>
                          <Form.Control
                            type="text"
                            value={unit.serialNo || ""}
                            onChange={(e) => {
                              const newUnits = [...formData.productUnits];
                              const unitIndex = formData.productUnits.findIndex(
                                (u) => u === unit
                              );
                              newUnits[unitIndex].serialNo = e.target.value;
                              setFormData({
                                ...formData,
                                productUnits: newUnits,
                              });
                            }}
                            placeholder={`Serial No for ${unit.productType
                              } Unit ${index + 1}`}
                            style={{
                              borderRadius: "10px",
                              border: "1px solid #ced4da",
                              padding: "12px",
                              fontSize: "1rem",
                              transition: "all 0.3s ease",
                            }}
                            onFocus={(e) =>
                            (e.target.style.boxShadow =
                              "0 0 10px rgba(37, 117, 252, 0.5)")
                            }
                            onBlur={(e) => (e.target.style.boxShadow = "none")}
                          />
                        </Form.Group>
                      ))}
                    </div>
                  )
                )
              ) : (
                <p style={{ color: "#555" }}>No products available to edit.</p>
              )}
              <Form.Group style={{ marginBottom: "20px" }}>
                <Form.Label style={{ fontWeight: "600", color: "#333" }}>
                  Remarks by Production <span style={{ color: "red" }}>*</span>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formData.remarksByProduction || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      remarksByProduction: e.target.value,
                    })
                  }
                  placeholder="Enter production remarks"
                  style={{
                    borderRadius: "10px",
                    border: errors.remarksByProduction
                      ? "1px solid red"
                      : "1px solid #ced4da",
                    padding: "12px",
                    fontSize: "1rem",
                    transition: "all 0.3s ease",
                  }}
                  onFocus={(e) =>
                  (e.target.style.boxShadow =
                    "0 0 10px rgba(37, 117, 252, 0.5)")
                  }
                  onBlur={(e) => (e.target.style.boxShadow = "none")}
                />
                {errors.remarksByProduction && (
                  <Form.Text style={{ color: "red", fontSize: "0.875rem" }}>
                    {errors.remarksByProduction}
                  </Form.Text>
                )}
              </Form.Group>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "15px",
                }}
              >
                <Button
                  onClick={() => setShowEditModal(false)}
                  style={{
                    background: "linear-gradient(135deg, #6c757d, #5a6268)",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: "20px",
                    color: "#fff",
                    fontWeight: "600",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.target.style.transform = "translateY(-2px)")
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.transform = "translateY(0)")
                  }
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  style={{
                    background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: "20px",
                    color: "#fff",
                    fontWeight: "600",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.target.style.transform = "translateY(-2px)")
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.transform = "translateY(0)")
                  }
                >
                  Save Changes
                </Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>
        {/* View Modal */}
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
                <span style={{ marginRight: "10px", fontSize: "1.3rem" }}>
                  📋
                </span>
                <span
                  style={{
                    fontWeight: "700",
                    fontSize: "1.5rem",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    textShadow: "1px 1px 3px rgba(0, 0, 0, 0.2)",
                  }}
                >
                  Production Order Details
                </span>
              </div>

              {/* RIGHT – Export + Close */}
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
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
                  (e.currentTarget.style.background =
                    "rgba(255, 255, 255, 0.3)")
                  }
                  onMouseLeave={(e) =>
                  (e.currentTarget.style.background =
                    "rgba(255, 255, 255, 0.2)")
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
                      <h1 className="pdf-title">Production Order</h1>
                      <div
                        style={{
                          fontSize: "14px",
                          color: "#666",
                          marginTop: "5px",
                        }}
                      >
                        Official Production Record
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <img
                        src="/logo.png"
                        alt="Company Logo"
                        className="pdf-logo"
                        onError={(e) => (e.target.style.display = "none")}
                      />
                      <div
                        style={{
                          marginTop: "10px",
                          fontWeight: "bold",
                          fontSize: "16px",
                        }}
                      >
                        Order ID: {viewOrder.orderId || "N/A"}
                      </div>
                    </div>
                  </div>

                  <div className="pdf-section">
                    <div className="pdf-section-title">Order Info</div>
                    <div className="pdf-grid">
                      <div className="pdf-item">
                        <strong>Customer Name:</strong>{" "}
                        {viewOrder.customername || "N/A"}
                      </div>
                      <div className="pdf-item">
                        <strong>Sales Person:</strong>{" "}
                        {viewOrder.salesPerson || "N/A"}
                      </div>
                      <div className="pdf-item">
                        <strong>Contact No:</strong>{" "}
                        {viewOrder.contactNo || "N/A"}
                      </div>
                      <div className="pdf-item">
                        <strong>SO Date:</strong>{" "}
                        {viewOrder.soDate
                          ? new Date(viewOrder.soDate).toLocaleDateString()
                          : "N/A"}
                      </div>
                      <div className="pdf-item">
                        <strong>Order Type:</strong>{" "}
                        {viewOrder.orderType || "N/A"}
                      </div>
                      <div className="pdf-item" style={{ gridColumn: "span 2" }}>
                        <strong>Shipping Address:</strong>{" "}
                        {viewOrder.shippingAddress || "N/A"}
                      </div>
                      <div className="pdf-item">
                        <strong>Status:</strong>{" "}
                        {viewOrder.fulfillingStatus || "Pending"}
                      </div>
                      <div className="pdf-item">
                        <strong>Remarks:</strong> {viewOrder.remarks || "N/A"}
                      </div>
                    </div>
                  </div>

                  <div className="pdf-section">
                    <div className="pdf-section-title">Product Information</div>
                    <table className="pdf-table">
                      <thead>
                        <tr>
                          <th style={{ width: "40px" }}>#</th>
                          <th>Product Type</th>
                          <th>Qty</th>
                          <th>Size / Spec</th>
                          <th>Serial / Model Nos</th>
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
                                    <strong>S/N:</strong> {p.serialNos.join(", ")}
                                  </div>
                                )}
                                {p.modelNos && p.modelNos.length > 0 && (
                                  <div style={{ marginTop: "4px" }}>
                                    <strong>M/N:</strong> {p.modelNos.join(", ")}
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
                          <tr>
                            <td colSpan="5" style={{ textAlign: "center" }}>
                              No products found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="pdf-section">
                    <div className="pdf-section-title">Production Status</div>
                    <div className="pdf-grid">
                      <div className="pdf-item">
                        <strong>Current Status:</strong>{" "}
                        {viewOrder.fulfillingStatus || "Pending"}
                      </div>
                      <div className="pdf-item">
                        <strong>Production Remarks:</strong>{" "}
                        {viewOrder.remarksByProduction || "N/A"}
                      </div>
                      <div className="pdf-item">
                        <strong>Total Quantity:</strong>{" "}
                        {Array.isArray(viewOrder.products)
                          ? viewOrder.products.reduce(
                            (sum, p) => sum + (p.qty || 0),
                            0
                          )
                          : 0}
                      </div>
                    </div>
                  </div>
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

                  {/* Section 1: Order Overview */}
                  <div className="info-card">
                    <div className="section-header">
                      <span className="section-icon">📌</span>
                      <h4 className="section-title">Order Overview</h4>
                    </div>
                    <div className="info-grid">
                      <InfoItem label="Order ID" value={viewOrder.orderId || "N/A"} copyable />
                      <InfoItem label="Order Type" value={viewOrder.orderType || "N/A"} />
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
                        label="So Approval Time & Date"
                        value={
                          viewOrder.approvalTimestamp
                            ? new Date(viewOrder.approvalTimestamp).toLocaleString("en-IN", {
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
                        label="Products Edit Time & Date"
                        value={
                          viewOrder.productsEditTimestamp
                            ? new Date(viewOrder.productsEditTimestamp).toLocaleString("en-IN", {
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
                        <span className="info-label">Production Status</span>
                        <div className="info-value">
                          <InstallStatusBadge status={viewOrder.fulfillingStatus || "Pending"} />
                        </div>
                      </div>
                      {viewOrder.startDate && <InfoItem label="Start Date" value={new Date(viewOrder.startDate).toLocaleDateString()} />}
                      {viewOrder.endDate && <InfoItem label="End Date" value={new Date(viewOrder.endDate).toLocaleDateString()} />}
                      <InfoItem label="Sales Person" value={viewOrder.salesPerson || "N/A"} />
                    </div>
                  </div>

                  {/* Section 2: Customer Details */}
                  <div className="info-card">
                    <div className="section-header">
                      <span className="section-icon">👤</span>
                      <h4 className="section-title">Customer Details</h4>
                    </div>
                    <div className="info-grid">
                      <InfoItem label="Customer Name" value={viewOrder.customername || "N/A"} />
                      <InfoItem label="Contact No" value={viewOrder.contactNo || "N/A"} />
                      <InfoItem label="Shipping Address" value={viewOrder.shippingAddress || "N/A"} />
                      {viewOrder.customerEmail && <InfoItem label="Email" value={viewOrder.customerEmail} />}
                    </div>
                  </div>

                  {/* Section 3: Product Details */}
                  <div className="info-card">
                    <div className="section-header">
                      <span className="section-icon">📦</span>
                      <h4 className="section-title">Product Specifications</h4>
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
                        No products found.
                      </div>
                    )}
                  </div>

                  {/* Section 4: Remarks & Attachment */}
                  <div className="info-card">
                    <div className="section-header">
                      <span className="section-icon">📝</span>
                      <h4 className="section-title">Remarks & Attachments</h4>
                    </div>
                    <div className="info-grid">
                      <InfoItem label="Production Remarks" value={viewOrder.remarksByProduction} />
                      <InfoItem label="Order Remarks" value={viewOrder.remarks} />
                      {viewOrder.poFilePath ? (
                        <div className="info-item">
                          <span className="info-label">Attachment</span>
                          <div className="info-value">
                            <Button
                              size="sm"
                              onClick={handleDownload}
                              style={{
                                background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                                padding: "4px 10px",
                                borderRadius: "8px",
                                display: "flex", alignItems: "center", gap: "6px",
                                fontSize: "0.85rem", fontWeight: "600",
                                color: "#ffffff", border: "none", cursor: "pointer",
                                transition: "all 0.2s ease",
                                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "scale(1.05)";
                                e.currentTarget.style.boxShadow = "0 4px 12px rgba(106, 17, 203, 0.4)";
                                e.currentTarget.style.background = "linear-gradient(135deg, #3b82f6, #7e22ce)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "scale(1)";
                                e.currentTarget.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.15)";
                                e.currentTarget.style.background = "linear-gradient(135deg, #2575fc, #6a11cb)";
                              }}
                              onMouseDown={(e) => {
                                e.currentTarget.style.transform = "scale(0.95)";
                              }}
                              onMouseUp={(e) => {
                                e.currentTarget.style.transform = "scale(1.05)";
                              }}
                            >
                              ⬇ Download
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <InfoItem label="PO File" value="No Attachment" />
                      )}
                    </div>
                  </div>

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
      </div>
      <footer
        className="footer-container"
        style={{
          padding: "10px",
          textAlign: "center",
          background: "linear-gradient(135deg, #2575fc, #6a11cb)",
          color: "white",
          marginTop: "auto",
        }}
      >
        <p style={{ margin: 0, fontSize: "0.9rem" }}>
          © 2025 Sales Order Management. All rights reserved.
        </p>
      </footer>
    </>
  );
};

export default Production;

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
      case "Not Dispatched":
      case "Docket Awaited Dispatched":
        return { background: "linear-gradient(135deg, #ff6b6b, #ff8787)" };
      case "In Progress":
      case "Under Process":
        return { background: "linear-gradient(135deg, #f39c12, #f7c200)" };
      case "Partial Dispatch":
        return { background: "linear-gradient(135deg, #00c6ff, #0072ff)" }; // Blue for Partial
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
