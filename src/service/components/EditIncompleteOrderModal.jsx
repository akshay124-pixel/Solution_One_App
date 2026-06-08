import React, { useState, useEffect } from "react";
import { Modal, Form, Button, Alert, Badge } from "react-bootstrap";
import { toast } from "react-toastify";
import { Settings, X, Save, FileText, Package } from "lucide-react";
import serviceApi from "../axiosSetup";

const EditIncompleteOrderModal = ({ isOpen, onClose, order, onUpdate }) => {
  const [status, setStatus] = useState("");
  const [remarks, setRemarks] = useState("");
  const [transporterName, setTransporterName] = useState("");
  const [transporterDetails, setTransporterDetails] = useState("");
  const [docketNumber, setDocketNumber] = useState("");
  const [stockAvailability, setStockAvailability] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [pendingParts, setPendingParts] = useState([
    { partName: "", spec: "", quantity: "", status: "Pending" },
  ]);
  const [newAttachments, setNewAttachments] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [deletedAttachments, setDeletedAttachments] = useState([]);
  const [fileError, setFileError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState("");

  // Check if user is superadmin or admin
  const isAdminOrSuperAdmin = (role) => {
    return role === "superadmin" || role === "admin";
  };

  const handleDownloadAttachment = async (filename) => {
    if (!filename) {
      toast.error("No attachment found");
      return;
    }

    try {
      toast.info("Starting download...");
      const response = await serviceApi.get(
        `/download/${encodeURIComponent(filename)}`,
        {
          responseType: "blob",
        },
      );

      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Download completed!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error(error.response?.data?.message || "Failed to download file");
    }
  };

  const getSystemBadge = (productCategory) => {
    if (productCategory === "furniture") {
      return {
        bg: "warning",
        text: "Furniture",
        icon: "🪑",
      };
    } else {
      return {
        bg: "info",
        text: "AV&EdTech",
        icon: "📺",
      };
    }
  };

  const addPendingPart = () => {
    setPendingParts((prev) => [
      ...prev,
      { partName: "", spec: "", quantity: "", status: "Pending" },
    ]);
  };

  const removePendingPart = (index) => {
    setPendingParts((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePendingPart = (index, field, value) => {
    setPendingParts((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const allowedTypes = [
        "application/pdf",
        "image/png",
        "image/jpg",
        "image/jpeg",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ];
      const allowedExtensions = [
        "pdf",
        "png",
        "jpg",
        "jpeg",
        "docx",
        "xlsx",
        "xls",
      ];

      const validFiles = [];
      let errorMessage = "";

      files.forEach((file) => {
        const fileExt = file.name.split(".").pop().toLowerCase();

        if (
          !allowedTypes.includes(file.type) &&
          !allowedExtensions.includes(fileExt)
        ) {
          errorMessage = `Invalid file type for ${file.name}. Only PDF, PNG, JPG, DOCX, XLS, XLSX are allowed.`;
          return;
        }

        if (file.size > 10 * 1024 * 1024) {
          errorMessage = `File ${file.name} is too large. Max size is 10MB.`;
          return;
        }

        if (
          newAttachments.some(
            (a) => a.name === file.name && a.size === file.size,
          )
        ) {
          return;
        }

        validFiles.push(file);
      });

      if (errorMessage) {
        setFileError(errorMessage);
        toast.error(errorMessage);
      } else {
        setFileError("");
      }

      if (validFiles.length > 0) {
        setNewAttachments((prev) => [...prev, ...validFiles]);
      }

      e.target.value = null;
    }
  };

  const removeNewAttachment = (index) => {
    setNewAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingAttachment = (fileName) => {
    setDeletedAttachments((prev) => [...prev, fileName]);
    setExistingAttachments((prev) =>
      prev.filter((a) => a.fileName !== fileName),
    );
  };

  useEffect(() => {
    if (order) {
      setStatus(order.status || "");
      setRemarks(order.remarks || "");
      setTransporterName(order.transporterName || "");
      setTransporterDetails(order.transporterDetails || "");
      setDocketNumber(order.docketNumber || "");
      setStockAvailability(order.stockAvailability || "");
      setProductCategory(order.productCategory || "");
      setPendingParts(
        order.pendingParts?.length > 0
          ? order.pendingParts
          : [{ partName: "", spec: "", quantity: "", status: "Pending" }],
      );
      setExistingAttachments(order.attachments || []);
      setNewAttachments([]);
      setDeletedAttachments([]);
      setFileError("");
    }

    // Get user role from localStorage
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUserRole(userData.role);
      } catch (e) {
        console.error("Failed to parse user data from localStorage:", e);
      }
    }
  }, [order]);

  const handleUpdate = async () => {
    if (!status) {
      toast.warning("Please select a status");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("status", status);
      formData.append("remarks", remarks);
      formData.append("transporterName", transporterName);
      formData.append("transporterDetails", transporterDetails);
      formData.append("docketNumber", docketNumber);
      formData.append("stockAvailability", stockAvailability);
      formData.append("productCategory", productCategory);
      formData.append(
        "pendingParts",
        JSON.stringify(
          pendingParts.filter((item) => item.partName && item.partName.trim()),
        ),
      );
      formData.append("deletedAttachments", JSON.stringify(deletedAttachments));

      newAttachments.forEach((file) => {
        formData.append("attachments", file);
      });

      const response = await serviceApi.patch(
        `/incomplete-orders/${order._id}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (response.data.success) {
        toast.success("Incomplete order updated successfully");
        onUpdate();
        onClose();
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to update incomplete order",
      );
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStatus(order?.status || "");
    setRemarks(order?.remarks || "");
    setTransporterName(order?.transporterName || "");
    setTransporterDetails(order?.transporterDetails || "");
    setDocketNumber(order?.docketNumber || "");
    setStockAvailability(order?.stockAvailability || "");
    setProductCategory(order?.productCategory || "");
    setPendingParts(
      order?.pendingParts?.length > 0
        ? order.pendingParts
        : [{ partName: "", spec: "", quantity: "", status: "Pending" }],
    );
    setExistingAttachments(order?.attachments || []);
    setNewAttachments([]);
    setDeletedAttachments([]);
    setFileError("");
    onClose();
  };

  if (!order) return null;

  return (
    <Modal
      show={isOpen}
      onHide={handleClose}
      size="lg"
      centered
      backdrop="static"
    >
      <div
        style={{
          borderRadius: "1px",
          overflow: "hidden",
          border: "none",
          boxShadow: "0 20px 60px rgba(16, 185, 129, 0.3)",
        }}
      >
        <Modal.Header
          style={{
            background: "linear-gradient(135deg, #059669, #047857)",
            color: "white",
            borderBottom: "none",
            padding: "24px 28px",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              width: "100%",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(10px)",
              }}
            >
              <Settings size={24} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <Modal.Title
                  style={{
                    margin: 0,
                    fontSize: "1.5rem",
                    fontWeight: "700",
                    color: "white",
                  }}
                >
                  Edit Incomplete Order
                </Modal.Title>
                {order && (
                  <Badge
                    bg={getSystemBadge(order.productCategory).bg}
                    style={{
                      padding: "4px 8px",
                      fontSize: "0.7rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      borderRadius: "6px",
                      fontWeight: "600",
                    }}
                  >
                    <span>{getSystemBadge(order.productCategory).icon}</span>
                    {getSystemBadge(order.productCategory).text}
                  </Badge>
                )}
              </div>
              <p
                style={{
                  margin: "4px 0 0 0",
                  color: "rgba(255, 255, 255, 0.9)",
                  fontSize: "0.9rem",
                  fontWeight: "400",
                }}
              >
                Update order status and details
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                border: "none",
                borderRadius: "8px",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "white",
                backdropFilter: "blur(10px)",
                opacity: loading ? 0.5 : 1,
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (!loading)
                  e.target.style.background = "rgba(255, 255, 255, 0.3)";
              }}
              onMouseLeave={(e) => {
                if (!loading)
                  e.target.style.background = "rgba(255, 255, 255, 0.2)";
              }}
            >
              <X size={20} />
            </button>
          </div>
        </Modal.Header>

        <Modal.Body
          className="edit-incomplete-modal-body"
          style={{
            padding: "24px",
            background: "white",
            maxHeight: "70vh",
            overflowY: "auto",
            scrollbarWidth: "thin",
            scrollbarColor: "#059669 #f3f4f6",
          }}
        >
          {/* Order Information */}
          <Alert
            style={{
              marginBottom: "24px",
              background: "#dcfce7",
              border: "1px solid #166534",
              borderRadius: "8px",
              padding: "16px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              <div>
                <strong style={{ color: "#166534", fontSize: "0.875rem" }}>
                  Order #:
                </strong>
                <div style={{ color: "#1f2937", fontWeight: "700" }}>
                  {order.orderNumber}
                </div>
              </div>
              <div>
                <strong style={{ color: "#166534", fontSize: "0.875rem" }}>
                  Customer:
                </strong>
                <div style={{ color: "#1f2937", fontWeight: "500" }}>
                  {order.customerName || "-"}
                </div>
              </div>
            </div>
          </Alert>

          <Form>
            {/* Incomplete Order Details Section */}
            <div
              style={{
                marginBottom: "24px",
                padding: "16px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
            >
              <h6
                style={{
                  fontWeight: "600",
                  color: "#374151",
                  fontSize: "0.875rem",
                  marginBottom: "12px",
                }}
              >
                Order Details
              </h6>

              {isAdminOrSuperAdmin(userRole) && (
                <Form.Group style={{ marginBottom: "16px" }}>
                  <Form.Label
                    style={{
                      fontWeight: "500",
                      color: "#374151",
                      fontSize: "0.875rem",
                      marginBottom: "6px",
                    }}
                  >
                    Product Category
                  </Form.Label>
                  <Form.Select
                    value={
                      productCategory === "av_edtech"
                        ? "av&edtech"
                        : productCategory
                    }
                    onChange={(e) => setProductCategory(e.target.value)}
                    style={{
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      padding: "10px 12px",
                      fontSize: "0.875rem",
                      transition:
                        "border-color 0.15s ease, box-shadow 0.15s ease",
                      background: "white",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#059669";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(5, 150, 105, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#d1d5db";
                      e.target.style.boxShadow = "none";
                    }}
                  >
                    <option value="furniture">🪑 Furniture</option>
                    <option value="av&edtech">📺 AV & EdTech</option>
                  </Form.Select>
                </Form.Group>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  marginBottom: "16px",
                }}
              >
                <Form.Group>
                  <Form.Label
                    style={{
                      fontWeight: "500",
                      color: "#374151",
                      fontSize: "0.875rem",
                      marginBottom: "6px",
                    }}
                  >
                    Transporter Name
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={transporterName}
                    onChange={(e) => setTransporterName(e.target.value)}
                    placeholder="Enter transporter name..."
                    style={{
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      padding: "10px 12px",
                      fontSize: "0.875rem",
                      transition:
                        "border-color 0.15s ease, box-shadow 0.15s ease",
                      background: "white",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#059669";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(5, 150, 105, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#d1d5db";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </Form.Group>

                <Form.Group>
                  <Form.Label
                    style={{
                      fontWeight: "500",
                      color: "#374151",
                      fontSize: "0.875rem",
                      marginBottom: "6px",
                    }}
                  >
                    Docket Number
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={docketNumber}
                    onChange={(e) => setDocketNumber(e.target.value)}
                    placeholder="Enter docket number..."
                    style={{
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      padding: "10px 12px",
                      fontSize: "0.875rem",
                      transition:
                        "border-color 0.15s ease, box-shadow 0.15s ease",
                      background: "white",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#059669";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(5, 150, 105, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#d1d5db";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </Form.Group>
              </div>

              <Form.Group className="mb-3">
                <Form.Label
                  style={{
                    fontWeight: "500",
                    color: "#374151",
                    fontSize: "0.875rem",
                    marginBottom: "6px",
                  }}
                >
                  Transporter Details
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={transporterDetails}
                  onChange={(e) => setTransporterDetails(e.target.value)}
                  placeholder="Enter transporter details..."
                  style={{
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    padding: "10px 12px",
                    fontSize: "0.875rem",
                    transition:
                      "border-color 0.15s ease, box-shadow 0.15s ease",
                    background: "white",
                    resize: "vertical",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#059669";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(5, 150, 105, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label
                  style={{
                    fontWeight: "500",
                    color: "#374151",
                    fontSize: "0.875rem",
                    marginBottom: "6px",
                  }}
                >
                  Remarks
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter remarks..."
                  style={{
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    padding: "10px 12px",
                    fontSize: "0.875rem",
                    transition:
                      "border-color 0.15s ease, box-shadow 0.15s ease",
                    background: "white",
                    resize: "vertical",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#059669";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(5, 150, 105, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </Form.Group>
            </div>

            <Form.Group className="mb-3">
              <Form.Label
                style={{
                  fontWeight: "500",
                  color: "#374151",
                  fontSize: "0.875rem",
                  marginBottom: "6px",
                }}
              >
                Order Status <span style={{ color: "#ef4444" }}>*</span>
              </Form.Label>
              <Form.Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  padding: "10px 12px",
                  fontSize: "0.875rem",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                  background: "white",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#059669";
                  e.target.style.boxShadow = "0 0 0 3px rgba(5, 150, 105, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d1d5db";
                  e.target.style.boxShadow = "none";
                }}
              >
                <option value="Pending">Pending</option>

                {(userRole?.toLowerCase() === "av_edtech_incomplete" ||
                  userRole?.toLowerCase() === "furniture_incomplete" || userRole?.toLowerCase() === "globaladmin")  && (
                  <>
                    <option value="In Progress">In Progress</option>
                    <option value="Dispatched">Dispatched</option>
                    <option value="Delivered">Delivered</option>
                  </>
                )}
                {(userRole?.toLowerCase() === "globaladmin" ||
                  userRole?.toLowerCase() === "superadmin") && (
                    <option value="Closed">Closed</option>
                  )}
              </Form.Select>
            </Form.Group>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <Form.Group>
                <Form.Label
                  style={{
                    fontWeight: "500",
                    color: "#374151",
                    fontSize: "0.875rem",
                    marginBottom: "6px",
                  }}
                >
                  Stock Availability
                </Form.Label>
                <Form.Select
                  value={stockAvailability}
                  onChange={(e) => setStockAvailability(e.target.value)}
                  style={{
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    padding: "10px 12px",
                    fontSize: "0.875rem",
                    transition:
                      "border-color 0.15s ease, box-shadow 0.15s ease",
                    background: "white",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#059669";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(5, 150, 105, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db";
                    e.target.style.boxShadow = "none";
                  }}
                >
                  <option value="">Select Stock Status</option>
                  <option value="In Stock">✅ In Stock</option>
                  <option value="Out of Stock">❌ Out of Stock</option>
                  <option value="Partial Stock">⚠️ Partial Stock</option>
                </Form.Select>
              </Form.Group>
            </div>

            {/* Pending Parts Section */}
            <div
              style={{
                marginBottom: "24px",
                padding: "16px",
                background: "#fef3c7",
                borderRadius: "8px",
                border: "1px solid #fbbf24",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <h6
                  style={{
                    fontWeight: "600",
                    color: "#92400e",
                    fontSize: "0.875rem",
                    margin: 0,
                  }}
                >
                  <span style={{ marginRight: "8px" }}>
                    <Package size={16} />
                  </span>
                  Pending Parts
                </h6>
                <Button
                  variant="outline-warning"
                  size="sm"
                  onClick={addPendingPart}
                  style={{
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    padding: "6px 12px",
                  }}
                >
                  + Add Part
                </Button>
              </div>

              {pendingParts.map((part, index) => (
                <div
                  key={index}
                  style={{
                    background: "white",
                    border: "1px solid #fbbf24",
                    borderRadius: "8px",
                    padding: "12px",
                    marginBottom: "8px",
                    display: "grid",
                    gridTemplateColumns: "1.5fr 1.5fr 0.75fr 1fr auto",
                    gap: "12px",
                    alignItems: "center",
                  }}
                >
                  <Form.Group>
                    <Form.Label
                      style={{
                        fontWeight: "500",
                        color: "#92400e",
                        fontSize: "0.75rem",
                        marginBottom: "4px",
                      }}
                    >
                      Part Name
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={part.partName}
                      onChange={(e) =>
                        updatePendingPart(index, "partName", e.target.value)
                      }
                      placeholder="Enter part name..."
                      style={{
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                        padding: "8px 10px",
                        fontSize: "0.875rem",
                        background: "white",
                      }}
                    />
                  </Form.Group>
                  <Form.Group>
                    <Form.Label
                      style={{
                        fontWeight: "500",
                        color: "#92400e",
                        fontSize: "0.75rem",
                        marginBottom: "4px",
                      }}
                    >
                      Spec
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={part.spec}
                      onChange={(e) =>
                        updatePendingPart(index, "spec", e.target.value)
                      }
                      placeholder="Enter spec..."
                      style={{
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                        padding: "8px 10px",
                        fontSize: "0.875rem",
                        background: "white",
                      }}
                    />
                  </Form.Group>
                  <Form.Group>
                    <Form.Label
                      style={{
                        fontWeight: "500",
                        color: "#92400e",
                        fontSize: "0.75rem",
                        marginBottom: "4px",
                      }}
                    >
                      Quantity
                    </Form.Label>
                    <Form.Control
                      type="number"
                      value={part.quantity}
                      onChange={(e) =>
                        updatePendingPart(index, "quantity", e.target.value)
                      }
                      placeholder="Qty..."
                      style={{
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                        padding: "8px 10px",
                        fontSize: "0.875rem",
                        background: "white",
                      }}
                    />
                  </Form.Group>
                  <Form.Group>
                    <Form.Label
                      style={{
                        fontWeight: "500",
                        color: "#92400e",
                        fontSize: "0.75rem",
                        marginBottom: "4px",
                      }}
                    >
                      Status
                    </Form.Label>
                    <Form.Select
                      value={part.status}
                      onChange={(e) =>
                        updatePendingPart(index, "status", e.target.value)
                      }
                      style={{
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                        padding: "8px 10px",
                        fontSize: "0.875rem",
                        background: "white",
                      }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Stock">In Stock</option>
                      <option value="Out of Stock">Out of Stock</option>
                      <option value="Dispatched">Dispatched</option>
                    </Form.Select>
                  </Form.Group>
                  {pendingParts.length > 1 && (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => removePendingPart(index)}
                      style={{
                        borderRadius: "6px",
                        marginTop: "20px",
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Attachments Section */}
            <div
              style={{
                marginBottom: "24px",
                padding: "16px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
            >
              <h6
                style={{
                  fontWeight: "600",
                  color: "#374151",
                  fontSize: "0.875rem",
                  marginBottom: "12px",
                }}
              >
                <FileText size={16} style={{ marginRight: "8px" }} />
                Attachments
              </h6>

              {/* Existing Attachments */}
              {existingAttachments.length > 0 && (
                <div style={{ marginBottom: "12px" }}>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#6b7280",
                      marginBottom: "8px",
                    }}
                  >
                    Current Files:
                  </div>
                  {existingAttachments.map((file, index) => (
                    <div
                      key={index}
                      style={{
                        background: "white",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        marginBottom: "6px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "6px",
                            background: "#f3f4f6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <FileText size={16} color="#6b7280" />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: "0.875rem",
                              fontWeight: "500",
                              color: "#1f2937",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={file.originalName || file.fileName}
                          >
                            {file.originalName || file.fileName}
                          </div>
                          <div
                            style={{ fontSize: "0.75rem", color: "#6b7280" }}
                          >
                            {file.size
                              ? `${(file.size / 1024).toFixed(1)} KB`
                              : ""}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() =>
                            handleDownloadAttachment(file.fileName)
                          }
                          style={{
                            background: "none",
                            border: "none",
                            color: "#2563eb",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            cursor: "pointer",
                            padding: "4px 8px",
                            borderRadius: "4px",
                          }}
                        >
                          Download
                        </button>
                        <button
                          onClick={() =>
                            removeExistingAttachment(file.fileName)
                          }
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ef4444",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            cursor: "pointer",
                            padding: "4px 8px",
                            borderRadius: "4px",
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* New Attachments */}
              {newAttachments.length > 0 && (
                <div style={{ marginBottom: "12px" }}>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#6b7280",
                      marginBottom: "8px",
                    }}
                  >
                    New Files:
                  </div>
                  {newAttachments.map((file, index) => (
                    <div
                      key={index}
                      style={{
                        background: "#f0f9ff",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid #bfdbfe",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        marginBottom: "6px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "6px",
                            background: "#e0f2fe",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <FileText size={16} color="#1e40af" />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: "0.875rem",
                              fontWeight: "500",
                              color: "#1f2937",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={file.name}
                          >
                            {file.name}
                          </div>
                          <div
                            style={{ fontSize: "0.75rem", color: "#6b7280" }}
                          >
                            {(file.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeNewAttachment(index)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          cursor: "pointer",
                          padding: "4px 8px",
                          borderRadius: "4px",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Form.Group>
                <Form.Label
                  style={{
                    fontWeight: "500",
                    color: "#374151",
                    fontSize: "0.875rem",
                    marginBottom: "6px",
                  }}
                >
                  Upload New Attachments
                </Form.Label>
                <Form.Control
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  style={{
                    borderRadius: "8px",
                    border: "1px dashed #d1d5db",
                    padding: "12px",
                    fontSize: "0.875rem",
                    background: "white",
                  }}
                />
                {fileError && (
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#ef4444",
                      marginTop: "6px",
                    }}
                  >
                    {fileError}
                  </div>
                )}
              </Form.Group>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                marginTop: "24px",
              }}
            >
              <Button
                variant="outline-secondary"
                onClick={handleClose}
                disabled={loading}
                style={{
                  borderRadius: "8px",
                  padding: "10px 20px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                }}
              >
                Cancel
              </Button>
              <Button
                variant="success"
                onClick={handleUpdate}
                disabled={loading}
                style={{
                  borderRadius: "8px",
                  padding: "10px 20px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  background: "linear-gradient(135deg, #059669, #047857)",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Save size={16} />
                {loading ? "Updating..." : "Update Order"}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </div>
    </Modal>
  );
};

export default EditIncompleteOrderModal;
