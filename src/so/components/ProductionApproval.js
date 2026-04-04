import React, { useState, useEffect, useCallback } from "react";
import { Button, Form, Badge } from "react-bootstrap";
import { FaEye } from "react-icons/fa";
import io from "socket.io-client";
import ViewEntry from "./ViewEntry";
import EditProductionApproval from "./EditProductionApproval";
import soApi from "../../so/axiosSetup";
import { toast } from "react-toastify";
import { exportToExcel } from "../../utils/excelHelper";
import { getPortalAccessToken } from "../../portal/PortalAuthContext";

const ProductionApproval = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [productMatchCount, setProductMatchCount] = useState(0);
  const meetsApproval = useCallback((doc) => {
    if (!doc) return false;

    return (
      doc.sostatus === "Accounts Approved" ||

      (doc.sostatus === "Pending for Approval" &&
        doc.paymentTerms === "Credit") ||

      // ✅ NEW: Partial Stock + Approved
      (doc.sostatus === "Approved" &&
        doc.stockStatus === "Partial Stock")
    );
  }, []);


  // Socket.IO integration for real-time updates
  useEffect(() => {
    const baseOrigin = (() => {
      try {
        return new URL(process.env.REACT_APP_SO_URL).origin;
      } catch {
        return process.env.REACT_APP_SO_URL;
      }
    })();

    const socket = io(baseOrigin, {
      path: "/sales/socket.io",
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: { token: getPortalAccessToken() },
    });

    socket.on("connect", () => {
      const userId = localStorage.getItem("userId");
      const role = localStorage.getItem("role");
      console.log(`[SO Socket] Client connected — socketId=${socket.id} userId=${userId} username=${role}`);
      socket.emit("join", { userId, role });
    });

    socket.on("disconnect", (reason) => {
      const userId = localStorage.getItem("userId");
      console.log(`[SO Socket] Client disconnected — socketId=${socket.id} userId=${userId} reason=${reason}`);
    });

    // Hinglish: Backend 'orderUpdate' event use kar raha hai (change streams). Event name yahan sync kiya.
    socket.on("orderUpdate", ({ operationType, documentId, fullDocument }) => {
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
            createdBy: { _id: currentUserId, username: currentUser.username || currentUser.name || "You" },
          };
        }
      } catch (e) {
        // ignore
      }

      setOrders((prev) => {
        const id = String(documentId || fullDocument?._id || "");
        if (!id) return prev;
        const include = fullDocument && meetsApproval(fullDocument);
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

    socket.on("disconnect", () => {
    });

    return () => {
      // Hinglish: Cleanup listeners to avoid duplicates / memory leaks
      socket.off("connect");
      socket.off("orderUpdate");
      socket.off("disconnect");
      socket.disconnect();
    };
  }, [meetsApproval]);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await soApi.get(
        `/api/production-approval-orders`
      );
      setOrders(response.data.data);
    } catch (error) {
      console.error("Error fetching production approval orders:", error);

      const friendlyMessage = !navigator.onLine
        ? "No internet connection. Please check your network."
        : error.response?.status >= 500
          ? "Server is currently unreachable. Please try again later."
          : "Unable to load production approval orders. Please try again.";

      toast.error(friendlyMessage, { position: "top-right", autoClose: 5000 });
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filterOrders = useCallback(() => {
    let filtered = [...orders];
    let totalProductQuantity = 0;
    const searchLower = searchTerm.toLowerCase().trim();

    if (searchLower) {
      filtered = filtered.filter((order) => {
        const orderFields = [
          order.orderId,
          order.customername,
          order.contactNo,
          order.creditDays,
          order.remarksByProduction,
          order.sostatus,
          order.stockStatus, // Added stockStatus for search
          order.deliveryDate
            ? new Date(order.deliveryDate).toLocaleDateString("en-GB")
            : "",
        ]
          .filter(Boolean)
          .map((field) => String(field).toLowerCase());

        const productFields = (order.products || []).map((p) =>
          [
            p.productType,
            p.size,
            p.spec,
            p.gst,
            p.serialNos?.join(", "),
            p.modelNos?.join(", "),
            String(p.qty),
            String(p.unitPrice),
          ]
            .filter(Boolean)
            .map((field) => String(field).toLowerCase())
            .join(" ")
        );

        const allFields = [...orderFields, ...productFields].join(" ");

        const matchesFields = allFields.includes(searchLower);

        const matchingProducts = (order.products || []).filter((p) =>
          p.productType?.toLowerCase().includes(searchLower)
        );

        if (matchingProducts.length > 0) {
          totalProductQuantity += matchingProducts.reduce(
            (sum, p) => sum + (p.qty || 0),
            0
          );
        }

        return matchesFields || matchingProducts.length > 0;
      });
    } else {
      totalProductQuantity = filtered.reduce(
        (sum, order) =>
          sum +
          (order.products || []).reduce((qty, p) => qty + (p.qty || 0), 0),
        0
      );
    }

    filtered.sort((a, b) => {
      const dateA = a.soDate ? new Date(a.soDate) : new Date(0);
      const dateB = b.soDate ? new Date(b.soDate) : new Date(0);
      return dateB - dateA; // Descending: newer dates first
    });

    setFilteredOrders(filtered);
    setProductMatchCount(totalProductQuantity);
  }, [orders, searchTerm]);

  useEffect(() => {
    filterOrders();
  }, [filterOrders]);

  const handleViewClick = (order) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
  };

  const handleEditClick = (order) => {
    setSelectedOrder(order);
    setIsEditModalOpen(true);
  };

  const handleEntryUpdated = (updatedOrder) => {
    setOrders((prev) => {
      const id = String(updatedOrder?._id || "");
      if (!id) return prev;
      const include = meetsApproval(updatedOrder);
      const idx = prev.findIndex((o) => String(o._id) === id);
      if (!include) {
        return idx === -1 ? prev : prev.filter((o) => String(o._id) !== id);
      }
      if (idx === -1) return [updatedOrder, ...prev];
      const next = prev.slice();
      next[idx] = updatedOrder;
      return next;
    });
    setIsEditModalOpen(false);
    // Hinglish: Local success toast hata diya; realtime toast socket 'notification' se aayega (no duplicates)
  };

  const handleExportToXLSX = async () => {
    const tableData = filteredOrders.map((order) => ({
      "Order ID": order.orderId || "-",
      "Customer Name": order.customername || "-",
      "Contact No": order.contactNo || "-",
      "Product Details": order.products
        ? order.products.map((p) => `${p.productType} (${p.qty})`).join(", ")
        : "-",
      "Approval Status": order.sostatus || "-",
      "Date of Credits": order.creditDays || "-",
      "Delivery Date": order.deliveryDate
        ? new Date(order.deliveryDate).toLocaleDateString("en-GB")
        : "-",
      Remarks: order.remarksByProduction || "-",
      "Stock Status": order.stockStatus || "-", // Added stockStatus to export
    }));

    await exportToExcel(tableData, "Production Approval Orders", "Production_Approval_Orders.xlsx");
  };

  return (
    <>
      <div
        style={{
          background: "linear-gradient(135deg, #2575fc, #6a11cb)",
          padding: "25px 40px",
          display: "flex",
          flexWrap: "wrap",
          gap: "20px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Form.Control
          type="text"
          placeholder="Search Orders (ID, Customer, Products, etc.)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            maxWidth: "450px",
            padding: "14px 25px",
            borderRadius: "30px",
            border: "none",
            background: "rgba(255,255,255,0.95)",
            boxShadow: "0 5px 15px rgba(0,0,0,0.2)",
            fontSize: "1.1rem",
            fontWeight: "500",
            transition: "all 0.4s ease",
          }}
        />
        <Button
          onClick={handleExportToXLSX}
          style={{
            background: "linear-gradient(135deg, #28a745, #4cd964)",
            border: "none",
            padding: "10px 20px",
            borderRadius: "5px",
            color: "#fff",
            fontWeight: "600",
            textTransform: "uppercase",
          }}
        >
          Export to XLSX
        </Button>
      </div>
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #e6f0fa, #f3e8ff)",
          padding: "30px",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        <div
          className="total-results"
          style={{
            fontSize: "1.1rem",
            fontWeight: "500",
            color: "#333",
            marginBottom: "15px",
            padding: "10px",
            background: "#f8f9fa",
            borderRadius: "8px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
          }}
        >
          Total Orders: {productMatchCount}
        </div>

        <div
          style={{
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            maxHeight: "600px",
            overflowY: "auto",
            overflowX: "auto",
            scrollbarWidth: "thin",
            scrollbarColor: "#2575fc #e6f0fa",
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
                color: "white",
                position: "sticky",
                top: 0,
                zIndex: 2,
                boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
              }}
            >
              <tr>
                {[
                  "Order ID",
                  "Customer Name",
                  "Contact No",
                  "Product Details",
                  "Approval Status",
                  "Days of Credits",
                  "Delivery Date",
                  "Stock Status",
                  "Actions",
                ].map((header) => (
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
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr
                    key={order._id}
                    style={{
                      backgroundColor: "#ffffff",
                      transition: "all 0.3s ease",
                      borderBottom: "1px solid #e6f0fa",
                    }}
                  >
                    <td style={{ padding: "15px" }}>{order.orderId || "-"}</td>
                    <td style={{ padding: "15px" }}>
                      {order.customername || "-"}
                    </td>
                    <td style={{ padding: "15px" }}>
                      {order.contactNo || "-"}
                    </td>
                    <td style={{ padding: "15px" }}>
                      {order.products
                        ? order.products
                          .map((p) => `${p.productType} (${p.qty})`)
                          .join(", ")
                        : "-"}
                    </td>
                    <td style={{ padding: "15px" }}>
                      <Badge
                        bg={
                          order.sostatus === "Pending for Approval"
                            ? "warning"
                            : order.sostatus === "Approved"
                              ? "success"   // ✅ GREEN
                              : "info"
                        }
                        style={{ padding: "6px 12px", fontSize: "0.9rem" }}
                      >
                        {order.sostatus || "-"}
                      </Badge>
                    </td>

                    <td style={{ padding: "15px" }}>
                      {order.creditDays || "-"}
                    </td>
                    <td style={{ padding: "15px" }}>
                      {order.deliveryDate
                        ? new Date(order.deliveryDate).toLocaleDateString(
                          "en-GB"
                        )
                        : "-"}
                    </td>
                    <td style={{ padding: "15px" }}>
                      {order.stockStatus ? (
                        <Badge
                          bg={
                            order.stockStatus === "In Stock"
                              ? "success"
                              : "danger"
                          }
                          style={{ fontSize: "0.9rem", padding: "6px 12px" }}
                        >
                          {order.stockStatus}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td style={{ padding: "15px", textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "10px" }}>
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
                        >
                          <FaEye />
                        </Button>
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
                        >
                          <svg
                            height="1em"
                            viewBox="0 0 512 512"
                            fill="#ffffff"
                          >
                            <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="9"
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      fontStyle: "italic",
                      color: "#6b7280",
                    }}
                  >
                    No orders found.
                  </td>
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
      {isEditModalOpen && (
        <EditProductionApproval
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onEntryUpdated={handleEntryUpdated}
          entryToEdit={selectedOrder}
        />
      )}
    </>
  );
};

export default ProductionApproval;
