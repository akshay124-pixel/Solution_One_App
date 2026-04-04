import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import axios from "../../so/axiosSetup";
import { Button, Modal, Badge, Form, Spinner } from "react-bootstrap";
import { FaEye, FaTimes, FaDownload } from "react-icons/fa";
import { toast } from "react-toastify";
import { exportToExcel } from "../../utils/excelHelper";
import "../App.css";
import io from "socket.io-client";
import InstallationEditModal from "./InstallationEditModal";
import InstallationRow from "./InstallationRow";
import debounce from "lodash/debounce";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

function Installation() {
  const [orders, setOrders] = useState([]);
  // Optimization: specific state for input vs filtering
  const [localSearch, setLocalSearch] = useState("");
  // const [filteredOrders, setFilteredOrders] = useState([]); // Removed: derived via useMemo
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [mailingInProgress, setMailingInProgress] = useState("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const pdfRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [salesPersonFilter, setSalesPersonFilter] = useState("All");
  const [InstallationFilter, setInstallationFilter] = useState("All");
  const [orderTypeFilter, setOrderTypeFilter] = useState("");
  const fetchInstallationOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_SO_URL}/api/installation-orders`
      );
      if (response.data.success) {
        const filteredData = response.data.data.filter(
          (doc) =>
            doc.dispatchStatus === "Delivered" &&
            doc.installchargesstatus !== "Not in Scope",
        );

        setOrders(filteredData);
      } else {
        throw new Error(
          response.data.message || "Could not load installation orders",
        );
      }
    } catch (error) {
      console.error("Error fetching installation orders:", error);

      // Non-technical, user-friendly message
      let friendlyMessage = "Sorry! We couldn't load your installation orders.";
      if (error.code === "ECONNABORTED" || !navigator.onLine) {
        friendlyMessage =
          "Please check your internet connection and try again.";
      } else if (error.response?.status >= 500) {
        friendlyMessage = "Server is currently unavailable. Please try later.";
      } else if (error.response?.status === 404) {
        friendlyMessage = "No installation orders found.";
      }

      setError(friendlyMessage);
      toast.error(friendlyMessage, { position: "top-right", autoClose: 5000 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchInstallationOrders().then(() => {
      if (!isMounted) setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [fetchInstallationOrders]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    const userRole = localStorage.getItem("role");
    const baseOrigin = (() => {
      try {
        const url = new URL(
          process.env.REACT_APP_SO_URL || window.location.origin,
        );
        return `${url.protocol}//${url.host}`;
      } catch (_) {
        return window.location.origin;
      }
    })();

    const socket = io(`${baseOrigin}/sales`, {
      
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      withCredentials: true,
    });

    const meetsInstallation = (doc) =>
      doc?.dispatchStatus === "Delivered" &&
      doc?.installchargesstatus !== "Not in Scope";

    socket.on("connect", () => {
      socket.emit("join", { userId, role: userRole });
    });

    socket.on("orderUpdate", ({ operationType, fullDocument, documentId }) => {
      // Normalize createdBy when backend sends only an id (change stream)
      try {
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        const currentUserId = String(localStorage.getItem("userId") || "");
        if (
          fullDocument &&
          fullDocument.createdBy &&
          typeof fullDocument.createdBy !== "object" &&
          String(fullDocument.createdBy) === currentUserId
        ) {
          fullDocument = {
            ...fullDocument,
            createdBy: {
              _id: currentUserId,
              username: currentUser.username || currentUser.name || "You",
            },
          };
        }
      } catch (e) {
        // ignore
      }

      setOrders((prev) => {
        const id = String(documentId || fullDocument?._id || "");
        if (!id) return prev;
        const include = fullDocument && meetsInstallation(fullDocument);
        if (operationType === "delete" || !include) {
          return prev.filter((o) => String(o._id) !== id);
        }
        const idx = prev.findIndex((o) => String(o._id) === id);
        if (idx === -1) return [fullDocument, ...prev];
        const next = prev.slice();
        next[idx] = fullDocument;
        return next;
      });
    });

    return () => {
      socket.off("connect");
      socket.off("orderUpdate");
      socket.disconnect();
    };
  }, []);

  // Exprt Pdf View Modal
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
          canvasHeight - sourceY,
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
          pageCanvas.height,
        );

        const imgData = pageCanvas.toDataURL("image/jpeg", 0.98);

        if (pageIndex > 0) pdf.addPage();

        const renderedHeightMm = (pageCanvas.height * imgWidth) / canvasWidth;

        const yPosition = pageIndex === 0 ? 0 : MARGIN_TOP;

        pdf.addImage(imgData, "JPEG", 0, yPosition, imgWidth, renderedHeightMm);

        // Footer
        pdf.setFontSize(9);
        pdf.setTextColor(150);
        pdf.text(`Page ${pageIndex + 1}`, PAGE_WIDTH - 25, PAGE_HEIGHT - 8);

        sourceY += pageCanvas.height;
        pageIndex++;
      }

      pdf.save(`Installation_Order_${viewOrder.orderId || "Details"}.pdf`);
      toast.success("PDF exported successfully!");
    } catch (err) {
      console.error("PDF Export Error:", err);
      toast.error("Failed to export PDF.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Optimization: Debounced search updater
  const updateSearchQuery = useMemo(
    () => debounce((val) => setSearchQuery(val), 300),
    [],
  );

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setLocalSearch(val);
    updateSearchQuery(val);
  };

  const uniqueSalesPersons = useMemo(
    () => [
      "All",
      ...new Set(orders.map((order) => order.salesPerson).filter(Boolean)),
    ],
    [orders],
  );

  // Optimization: Pre-calculate sorting and searching fields
  const processedOrders = useMemo(() => {
    return orders.map((order) => {
      const soDateTs = order.soDate ? new Date(order.soDate).getTime() : 0;
      // Pre-build search string for faster filtering
      const searchStr = [
        order.orderId || "",
        order.name || "",
        order.contactNo || "",
        order.shippingAddress || "",
        order.installation || "",
        order.installationStatus || "",
        Array.isArray(order.products)
          ? order.products
            .map(
              (p) =>
                `${p.productType || ""} ${p.qty || ""} ${p.size || ""} ${p.spec || ""
                } ${p.serialNos?.join("") || ""} ${p.modelNos?.join("") || ""}`,
            )
            .join(" ")
          : "",
      ]
        .join(" ")
        .toLowerCase();

      return {
        ...order,
        _soDateTs: soDateTs,
        _searchStr: searchStr,
        _normalizedInstallation: String(order.installation || "")
          .trim()
          .toLowerCase(),
      };
    });
  }, [orders]);

  // Optimization: Filter logic via useMemo using processed orders
  const filteredOrders = useMemo(() => {
    let filtered = processedOrders;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((order) => order._searchStr.includes(query));
    }
    if (statusFilter !== "All") {
      filtered = filtered.filter(
        (order) => order.installationStatus === statusFilter,
      );
    }
    if (orderTypeFilter) {
      filtered = filtered.filter(
        (order) => order.orderType === orderTypeFilter,
      );
    }

    if (InstallationFilter !== "All") {
      filtered = filtered.filter((order) => {
        if (InstallationFilter === "Not Available") {
          const installation = order._normalizedInstallation;
          return (
            !installation ||
            installation === "0" ||
            installation === "n/a" ||
            installation === "null" ||
            installation === ""
          );
        }
        return order.installchargesstatus === InstallationFilter;
      });
    }

    if (salesPersonFilter !== "All") {
      filtered = filtered.filter(
        (order) => order.salesPerson === salesPersonFilter,
      );
    }
    if (startDate) {
      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.dispatchDate);
        return orderDate >= new Date(startDate);
      });
    }
    if (endDate) {
      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.dispatchDate);
        return orderDate <= new Date(endDate);
      });
    }
    return filtered;
  }, [
    processedOrders,
    searchQuery,
    statusFilter,
    orderTypeFilter,
    InstallationFilter,
    salesPersonFilter,
    startDate,
    endDate,
  ]);

  // Optimization: Separate sorting from filtering and rendering
  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      // Use pre-calculated timestamps
      if (a._soDateTs === b._soDateTs) {
        return (b._id || "").localeCompare(a._id || "");
      }
      return b._soDateTs - a._soDateTs;
    });
  }, [filteredOrders]);

  /* 
  // Removed old useEffect for filtering
  useEffect(() => { ... }, [...]); 
  */

  const isDispatchOverdue = useCallback((dispatchDate) => {
    if (!dispatchDate) return false;
    const dispatch = new Date(dispatchDate);
    const now = new Date();
    const diffInDays = (now - dispatch) / (1000 * 60 * 60 * 24);
    return diffInDays >= 15;
  }, []);

  // Calculate total pending orders (billStatus === "Pending")
  const totalPending = useMemo(
    () =>
      filteredOrders.filter((order) => order.installationStatus === "Pending")
        .length,
    [filteredOrders],
  );

  // Get unique statuses for filter dropdown
  const uniqueStatuses = useMemo(
    () => [
      "All",
      "Pending",
      "In Progress",
      "Completed",
      ...new Set(
        orders
          .map((order) => order.installationStatus || "Pending")
          .filter(
            (status) =>
              !["Pending", "In Progress", "Completed"].includes(status),
          ),
      ),
    ],
    [orders],
  );

  const handleOrderUpdate = useCallback((updatedOrder) => {
    setOrders((prevOrders) => {
      // Agar Installation Report = Yes ho gaya, turant list se hata do
      if (updatedOrder.installationStatus === "Completed") {
        return prevOrders.filter((o) => o._id !== updatedOrder._id);
      }

      // Warna normal update
      return prevOrders.map((o) =>
        o._id === updatedOrder._id ? updatedOrder : o,
      );
    });
  }, []);

  const handleView = useCallback((order) => {
    setViewOrder(order);
    setShowViewModal(true);
    setCopied(false);
  }, []);

  const handleDownload = async (filePath) => {
    if (!filePath || typeof filePath !== "string") {
      toast.error("Invalid file path!");
      return;
    }

    try {
      // Extract filename from path
      const fileName = filePath.split("/").pop();
      if (!fileName) {
        toast.error("Invalid file name!");
        return;
      }

      // ✅ Use authenticated download endpoint instead of static URL
      const fileUrl = `${process.env.REACT_APP_SO_URL}/api/download/${encodeURIComponent(fileName)}`;

      const response = await fetch(fileUrl, {
        method: "GET",
        headers: {
          Accept:
            "application/pdf,image/png,image/jpeg,image/jpg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch file");
      }

      const blob = await response.blob();
      const contentType =
        response.headers.get("content-type") || "application/octet-stream";
      const extension = contentType.split("/")[1] || "file";
      const downloadFileName = filePath.split("/").pop() || `download.${extension}`;

      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);

      toast.success("Download started!");
    } catch (err) {
      console.error(err);
      toast.error("Download failed. Check server.");
    }
  };

  const uniqueOrderTypes = [
    "",
    ...new Set(orders.map((order) => order.orderType || "N/A")),
  ];
  const handleCopy = useCallback(() => {
    if (!viewOrder) return;
    const productsText = Array.isArray(viewOrder.products)
      ? viewOrder.products
        .map(
          (p, i) =>
            `Product ${i + 1}: ${p.productType || "N/A"} (Qty: ${p.qty || "N/A"
            }, Size: ${p.size || "N/A"}, Spec: ${p.spec || "N/A"}, Brand: ${p.brand || "N/A"
            }, Serial Nos: ${p.serialNos?.join(", ") || "N/A"}, Model Nos: ${p.modelNos?.join(", ") || "N/A"
            }, Product Code: ${p.productCode?.join(", ") || "N/A"
            }, Warranty: ${p.warranty || "N/A"})`,
        )
        .join("\n")
      : "N/A";
    const orderText = `
      Order ID: ${viewOrder.orderId || "N/A"}
      Contact Person: ${viewOrder.name || "N/A"}
      Contact No: ${viewOrder.contactNo || "N/A"}
      Shipping Address: ${viewOrder.shippingAddress || "N/A"}
      Charges Status: ${viewOrder.installchargesstatus || "N/A"}
      Installation Status: ${viewOrder.installationStatus || "Pending"}
     
      Remarks: ${viewOrder.remarksByInstallation || "N/A"}
      Products:\n${productsText}
    `.trim();
    navigator.clipboard
      .writeText(orderText)
      .then(() => {
        setCopied(true);
        toast.success("Details copied to clipboard!", {
          position: "top-right",
          autoClose: 2000,
        });
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        toast.error("Failed to copy details!");
        console.error("Copy error:", err);
      });
  }, [viewOrder]);

  const handleEdit = useCallback((order) => {
    setEditOrder(order);
    setShowEditModal(true);
  }, []);

  const handleSendMail = useCallback(async (order) => {
    setMailingInProgress(order._id);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_SO_URL}/api/send-completion-mail`,
        { orderId: order._id }
      );

      if (response.data.success) {
        toast.success(`Mail sent for Order #${order.orderId || order._id}`);
      } else {
        toast.error(response.data.message || "Failed to send mail");
      }
    } catch (error) {
      console.error("Mail Error:", error);
      toast.error("Error sending mail");
    } finally {
      setMailingInProgress("");
    }
  }, []);
  const handleClearFilters = () => {
    setLocalSearch(""); // Clear local input
    updateSearchQuery(""); // Clear debounce immediately
    setOrderTypeFilter("");
    setOrderTypeFilter("");
    setStatusFilter("All");
    setSalesPersonFilter("All");
    setInstallationFilter("All");
    setStartDate("");
    setEndDate("");
  };

  const handleExportExcel = async () => {
    const exportData = filteredOrders.map((order) => {
      const productDetails = Array.isArray(order.products)
        ? order.products
          .map((p) => `${p.productType || "N/A"} (${p.qty || "N/A"})`)
          .join(", ")
        : "N/A";

      // 👇 Calculate total quantity from products array
      const totalProductQty = Array.isArray(order.products)
        ? order.products.reduce((sum, p) => sum + (Number(p.qty) || 0), 0)
        : 0;

      return {
        "Order ID": order.orderId || "N/A",
        "Order Type": order.orderType || "N/A",
        "Product Details": productDetails,
        "Total Quantity": totalProductQty,
        "Contact Person": order.name || "N/A",
        "Contact No": order.contactNo || "N/A",
        "Shipping Address": order.shippingAddress || "N/A",
        "Charges Status": order.installchargesstatus || "N/A",
        Charges: order.installation || "N/A",
        "Installation Status": order.installationStatus || "Pending",
        "Sales Person": order.salesPerson || "N/A",
        City: order.city || "N/A",
        State: order.state || "N/A",
        deliveredDate: order.deliveredDate
          ? new Date(order.deliveredDate).toLocaleDateString("en-GB")
          : "N/A",
      };
    });

    await exportToExcel(exportData, "Installation Orders", `Installation_Orders_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Optimization: Memoize the table to prevent re-renders on typing
  const tableContent = useMemo(
    () => (
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
                "SO Date",
                "Dispatch Date",
                "Product Details",
                "Contact Person",
                "Contact No",
                "Shipping Address",
                "Charges Status",
                "Installation Status",
                "Sales Person",
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
            {sortedOrders.map((order, index) => (
              <InstallationRow
                key={order._id}
                order={order}
                index={index}
                isDispatchOverdue={isDispatchOverdue}
                handleView={handleView}
                handleEdit={handleEdit}
                handleSendMail={handleSendMail}
                mailingInProgress={mailingInProgress}
              />
            ))}
          </tbody>
        </table>
      </div>
    ),
    [
      sortedOrders,
      isDispatchOverdue,
      handleView,
      handleEdit,
      handleSendMail,
      mailingInProgress,
    ],
  );

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
        <Spinner
          animation="border"
          style={{
            width: "50px",
            height: "50px",
            color: "#2575fc",
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
          Loading Installation Orders...
        </p>
      </div>
    );
  }

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
            Installation Dashboard
          </h1>
        </header>{" "}
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
                  marginLeft: "10px",
                  display: "block",
                }}
              >
                Search Orders
              </label>
              <div style={{ position: "relative" }}>
                <Form.Control
                  type="text"
                  placeholder="Order ID, Name, etc."
                  value={localSearch}
                  onChange={handleSearchChange}
                  style={{
                    borderRadius: "15px",
                    padding: "5px 30px 5px 10px",
                    border: "1px solid #ced4da",
                    fontSize: "0.9rem",
                    height: "38px",
                  }}
                />
                {searchQuery && (
                  <FaTimes
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      cursor: "pointer",
                      color: "#adb5bd",
                    }}
                    onClick={() =>
                      handleSearchChange({ target: { value: "" } })
                    }
                  />
                )}
              </div>
            </div>

            {/* Start Date */}
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
                Start Date
              </label>
              <Form.Control
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  borderRadius: "15px",
                  padding: "5px 10px",
                  border: "1px solid #ced4da",
                  fontSize: "0.9rem",
                  height: "38px",
                }}
              />
            </div>

            {/* End Date */}
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
                End Date
              </label>
              <Form.Control
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  borderRadius: "15px",
                  padding: "5px 10px",
                  border: "1px solid #ced4da",
                  fontSize: "0.9rem",
                  height: "38px",
                }}
              />
            </div>

            {/* Status Filter */}
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
                Status
              </label>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  borderRadius: "15px",
                  padding: "5px 10px",
                  border: "1px solid #ced4da",
                  fontSize: "0.9rem",
                  height: "38px",
                  cursor: "pointer",
                }}
              >
                {uniqueStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Form.Select>
            </div>

            {/* Charges Filter */}
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
                Charges
              </label>
              <Form.Select
                value={InstallationFilter}
                onChange={(e) => setInstallationFilter(e.target.value)}
                style={{
                  borderRadius: "15px",
                  padding: "5px 10px",
                  border: "1px solid #ced4da",
                  fontSize: "0.9rem",
                  height: "38px",
                  cursor: "pointer",
                }}
              >
                <option>All</option>
                <option>To Pay</option>
                <option>Including</option>
                <option>Extra</option>
                <option>Not Available</option>
              </Form.Select>
            </div>

            {/* Order Type Filter */}
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
              <Form.Select
                value={orderTypeFilter}
                onChange={(e) => setOrderTypeFilter(e.target.value)}
                style={{
                  borderRadius: "15px",
                  padding: "5px 10px",
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
              </Form.Select>
            </div>

            {/* Sales Person Filter */}
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
                  borderRadius: "15px",
                  padding: "5px 10px",
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
                onClick={handleClearFilters}
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
                <FaTimes style={{ fontSize: "0.8rem" }} /> Clear
              </Button>

              <Button
                onClick={handleExportExcel}
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
                onMouseLeave={(e) =>
                  (e.target.style.transform = "translateY(0)")
                }
              >
                Export Excel
              </Button>
            </div>
          </div>
        </div>
        <div className="total-results my-3">
          <span>Total Orders: {filteredOrders.length}</span>
          <span>Total Pending: {totalPending}</span>
        </div>
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
                onClick={fetchInstallationOrders}
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

          {filteredOrders.length === 0 && !error ? (
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
              No installation orders available at this time.
            </div>
          ) : (
            tableContent
          )}
        </div>
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
      
      /* Scrollbar Styling */
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      ::-webkit-scrollbar-track {
        background: #f1f1f1; 
      }
      ::-webkit-scrollbar-thumb {
        background: #ccc; 
        border-radius: 3px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #aaa; 
      }

      /* Modal & Layout */
      .modal-dashboard {
        font-family: 'Inter', 'Segoe UI', sans-serif;
        color: #333;
      }
      .info-card {
        background: #fff;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.06);
        border: 1px solid rgba(0,0,0,0.04);
        margin-bottom: 20px;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .info-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.06);
      }
      .section-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 2px solid #f0f2f5;
      }
      .section-title {
        font-size: 1.1rem;
        font-weight: 700;
        color: #1a1a1a;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin: 0;
      }
      .section-icon {
        color: #2575fc;
        font-size: 1.2rem;
      }

      /* Grid & Typography */
      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 20px 24px;
      }
      .info-item {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .info-label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: #8898aa;
        font-weight: 600;
      }
      .info-value {
        font-size: 0.95rem;
        font-weight: 600;
        color: #2d3748;
        line-height: 1.4;
        word-break: break-word;
      }

      /* Product Cards */
      .product-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .product-card {
        background: #f8f9fa;
        border-radius: 10px;
        border: 1px solid #e9ecef;
        padding: 20px;
        position: relative;
        overflow: hidden;
      }
      .product-card::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
        background: linear-gradient(to bottom, #2575fc, #6a11cb);
      }
      
      /* Chips & Badges */
      .chip-container {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 4px;
      }
      .chip {
        background: #e9ecef;
        color: #495057;
        font-size: 0.8rem;
        padding: 4px 10px;
        border-radius: 6px;
        font-weight: 500;
        border: 1px solid #dee2e6;
        display: inline-flex;
        align-items: center;
      }
      .status-badge-unified {
        display: inline-flex;
        align-items: center;
        padding: 6px 14px;
        border-radius: 50px;
        font-size: 0.8rem;
        font-weight: 600;
        color: white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      }

      /* Print Styles (Unchanged) */
      .pdf-print-container {
        width: 210mm;
        min-height: 297mm;
        padding: 15mm 15mm 12mm 15mm;
        background: #fff;
        color: #333;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.5;
        position: absolute;
        min-height: unset;
        height: auto;
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
        background: #f1f1f1;
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
                  Installation Details
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
              padding: "30px",
              background: "#fff",
              borderRadius: "0 0 15px 15px",
              boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              animation: "fadeIn 0.5s ease-in-out",
            }}
          >
            {viewOrder && (
              <>
                {/* Printable Template (Off-screen) */}
                <div ref={pdfRef} className="pdf-print-container">
                  <div className="pdf-header">
                    <div>
                      <h1 className="pdf-title">Installation Order</h1>
                      <div
                        style={{
                          fontSize: "14px",
                          color: "#666",
                          marginTop: "5px",
                        }}
                      >
                        Official Installation Record
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
                    <div className="pdf-section-title">Installation Info</div>
                    <div className="pdf-grid">
                      <div className="pdf-item">
                        <strong>Contact Person:</strong>{" "}
                        {viewOrder.name || "N/A"}
                      </div>
                      <div className="pdf-item">
                        <strong>Contact No:</strong>{" "}
                        {viewOrder.contactNo || "N/A"}
                      </div>
                      <div className="pdf-item">
                        <strong>Customer Email:</strong>{" "}
                        {viewOrder.customerEmail || "N/A"}
                      </div>
                      <div className="pdf-item">
                        <strong>Sales Person:</strong>{" "}
                        {viewOrder.salesPerson || "N/A"}
                      </div>
                      <div
                        className="pdf-item"
                        style={{ gridColumn: "span 2" }}
                      >
                        <strong>Shipping Address:</strong>{" "}
                        {viewOrder.shippingAddress || "N/A"}
                      </div>
                      <div className="pdf-item">
                        <strong>Installation Status:</strong>{" "}
                        {viewOrder.installationStatus || "Pending"}
                      </div>
                      <div className="pdf-item">
                        <strong>Engineer Name:</strong>{" "}
                        {viewOrder.installationeng || "N/A"}
                      </div>
                      <div className="pdf-item">
                        <strong>Charges Status:</strong>{" "}
                        {viewOrder.installchargesstatus || "N/A"}
                      </div>
                      <div className="pdf-item">
                        <strong>Dispatch Status:</strong>{" "}
                        {viewOrder.dispatchStatus || "N/A"}
                      </div>
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
                        {Array.isArray(viewOrder.products) &&
                          viewOrder.products.length > 0 ? (
                          viewOrder.products.map((p, idx) => (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td>
                                {p.productType && p.productType !== "N/A"
                                  ? p.productType
                                  : ""}
                                {p.brand && p.brand !== "N/A" && (
                                  <div
                                    style={{ fontSize: "12px", color: "#666" }}
                                  >
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
                                {p.modelNos && p.modelNos.length > 0 && (
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
                          <tr>
                            <td colSpan="5" style={{ textAlign: "center" }}>
                              No products found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {viewOrder.remarksByInstallation && (
                    <div className="pdf-section">
                      <div className="pdf-section-title">Remarks</div>
                      <div
                        className="pdf-item"
                        style={{
                          padding: "10px",
                          background: "#f8f9fa",
                          borderRadius: "5px",
                        }}
                      >
                        {viewOrder.remarksByInstallation}
                      </div>
                    </div>
                  )}
                </div>

                {/* Visible Content in Modal - Refactored UI */}
                <div className="modal-dashboard">

                  {/* Section 1: Installation Overview */}
                  <div className="info-card">
                    <div className="section-header">
                      <span className="section-icon">📌</span>
                      <h4 className="section-title">Installation Overview</h4>
                    </div>
                    <div className="info-grid">
                      <InfoItem label="Order ID" value={viewOrder.orderId || "N/A"} copyable />
                      <InfoItem
                        label="Installation Date & Time"
                        value={viewOrder.deliveredDate
                          ? new Date(viewOrder.deliveredDate).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          }).replace(",", "")
                          : "Pending Schedule"}
                      />
                      <InfoItem
                        label="Installation Status"
                        value={
                          <InstallStatusBadge status={viewOrder.installationStatus || "Pending"} />
                        }
                      />
                      <InfoItem
                        label="Charges Status"
                        value={
                          <span style={{
                            color: viewOrder.installchargesstatus === "To Pay" ? "#dc3545" : "#28a745",
                            fontWeight: "700"
                          }}>
                            {viewOrder.installchargesstatus || "N/A"}
                          </span>
                        }
                      />
                      <InfoItem
                        label="Charges Amount"
                        value={viewOrder.installation || "N/A"}
                      />
                      <InfoItem
                        label="Engineer Assigned"
                        value={viewOrder.installationeng || "Not Assigned"}
                      />
                      <InfoItem
                        label="Installation Report"
                        value={viewOrder.installationFile ? (
                          <Button
                            size="sm"
                            onClick={() => handleDownload(viewOrder.installationFile)}
                            style={{
                              padding: "4px 12px",
                              borderRadius: "20px",
                              background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                              color: "#fff",
                              border: "none",
                              fontSize: "0.8rem",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px"
                            }}
                          >
                            <FaDownload size={10} /> Download Report
                          </Button>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '0.85rem' }}>No Report</span>
                        )}
                      />
                    </div>
                  </div>

                  {/* Section 2: Contact & Shipping */}
                  <div className="info-card">
                    <div className="section-header">
                      <span className="section-icon">📍</span>
                      <h4 className="section-title">Customer & Dispatch</h4>
                    </div>
                    <div className="info-grid">
                      <InfoItem label="Contact Person" value={viewOrder.name || "N/A"} />
                      <InfoItem label="Contact Number" value={viewOrder.contactNo || "N/A"} copyable />
                      <InfoItem label="Email Address" value={viewOrder.customerEmail || "N/A"} />
                      <InfoItem label="Sales Person" value={viewOrder.salesPerson || "N/A"} />
                      <InfoItem label="Dispatch Status" value={viewOrder.dispatchStatus || "N/A"} />
                      <div className="info-item" style={{ gridColumn: "1 / -1" }}>
                        <span className="info-label">Shipping Address</span>
                        <div className="info-value">
                          {viewOrder.shippingAddress || "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Products */}
                  <div className="info-card">
                    <div className="section-header">
                      <span className="section-icon">📦</span>
                      <h4 className="section-title">Product Details</h4>
                    </div>
                    <div className="product-list">
                      {Array.isArray(viewOrder.products) && viewOrder.products.length > 0 ? (
                        viewOrder.products.map((product, index) => (
                          <ProductCard key={index} product={product} index={index} />
                        ))
                      ) : (
                        <div className="text-center text-muted p-4">No products found</div>
                      )}
                    </div>
                  </div>

                  {/* Section 4: Remarks */}
                  {viewOrder.remarksByInstallation && (
                    <div className="info-card">
                      <div className="section-header">
                        <span className="section-icon">📝</span>
                        <h4 className="section-title">Installation Remarks</h4>
                      </div>
                      <p style={{ margin: 0, color: "#555", lineHeight: 1.6 }}>
                        {viewOrder.remarksByInstallation}
                      </p>
                    </div>
                  )}

                </div>

                <div style={{ marginTop: "20px" }}>
                  <Button
                    onClick={handleCopy}
                    style={{
                      background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                      border: "none",
                      padding: "12px",
                      borderRadius: "10px",
                      color: "#fff",
                      fontWeight: "600",
                      fontSize: "1rem",
                      textTransform: "uppercase",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      width: "100%",
                      transition: "all 0.3s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.transform = "translateY(-2px)")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.transform = "translateY(0)")
                    }
                  >
                    {copied
                      ? "✅ Details Copied to Clipboard!"
                      : "📑 Copy Details to Clipboard"}
                  </Button>
                </div>
              </>
            )}
          </Modal.Body>
        </Modal>
        {/* Edit Modal */}
        <InstallationEditModal
          show={showEditModal}
          onHide={() => setShowEditModal(false)}
          order={editOrder}
          onUpdate={handleOrderUpdate}
        />
      </div>{" "}
      <footer
        style={{
          padding: "15px",
          textAlign: "center",
          background: "linear-gradient(135deg, #2575fc, #6a11cb)",
          color: "white",
          marginTop: "auto",
          boxShadow: "0 -2px 5px rgba(0, 0, 0, 0.1)",
        }}
      >
        <p style={{ margin: 0, fontSize: "0.9rem" }}>
          © 2025 Sales Order Management. All rights reserved.
        </p>
      </footer>
    </>
  );
}

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
        return { background: "linear-gradient(135deg, #f39c12, #f7c200)" };
      case "Completed":
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

const keyframes = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

document.head.insertAdjacentHTML("beforeend", `<style>${keyframes}</style>`);

export default Installation;
