import React, { memo } from "react";
import { Badge, Button, Spinner } from "react-bootstrap";
import { FaEye, FaEnvelope } from "react-icons/fa";
import "../App.css";
// PERFORMANCE: Memoized row component to prevent re-rendering entire list on simple updates
const InstallationRow = memo(
  ({
    order,
    index,
    isDispatchOverdue,
    handleView,
    handleEdit,
    handleSendMail,
    mailingInProgress,
  }) => {
    const productDetails = Array.isArray(order.products)
      ? order.products
          .map((p) => `${p.productType || "N/A"} (${p.qty || "N/A"})`)
          .join(", ")
      : "N/A";

    const isOverdue = isDispatchOverdue(order.dispatchDate);
    const baseBg = isOverdue
      ? "#fff3cd" // Light yellow for overdue rows
      : index % 2 === 0
        ? "#f8f9fa"
        : "#fff";
    const hoverBg = isOverdue
      ? "#ffeaa7" // Darker yellow on hover
      : "#e9ecef";
    const leaveBg = baseBg;

    return (
      <tr
        style={{
          background: baseBg,
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
        onMouseLeave={(e) => (e.currentTarget.style.background = leaveBg)}
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
          title={order.orderId || "N/A"}
        >
          {order.soDate
            ? new Date(order.soDate)
                .toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })
                .replace(/\//g, "/")
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
          title={order.dispatchDate || "N/A"}
        >
          {order.dispatchDate
            ? new Date(order.dispatchDate)
                .toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })
                .replace(/\//g, "/")
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
          title={order.name || "N/A"}
        >
          {order.name || "N/A"}
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
          title={order.installchargesstatus || "N/A"}
        >
          {order.installchargesstatus || "N/A"}
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
          title={order.installationStatus || "Pending"}
        >
          <Badge
            style={{
              background:
                order.installationStatus === "Pending"
                  ? "linear-gradient(135deg, #ff6b6b, #ff8787)"
                  : order.installationStatus === "In Progress"
                    ? "linear-gradient(135deg, #f39c12, #f7c200)"
                    : order.installationStatus === "Completed"
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
            {order.installationStatus || "Pending"}
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
          title={order.salesPerson || "N/A"}
        >
          {order.salesPerson || "N/A"}
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
              marginTop: "20px",
              justifyContent: "center",
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
              aria-label="View order details"
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
                background: "linear-gradient(135deg, #6c757d, #5a6268)",
                borderRadius: "22px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg height="1em" viewBox="0 0 512 512" fill="#fff">
                <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z" />
              </svg>
            </button>
            <Button
              variant="info"
              onClick={() => handleSendMail(order)}
             disabled={String(mailingInProgress) === String(order._id)}
                        className={`mail-btn ${String(mailingInProgress) === String(order._id) ? "loading" : ""}`}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                padding: "0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #0dcaf0, #0aa2c0)",
                border: "none", 
                position: "relative",
              }}
              title="Send Installation Assignment Mail"
            >
               {String(mailingInProgress) === String(order._id) ? (
                            <div className="spinner"></div>
              ) : (
                <FaEnvelope style={{ color: "white", fontSize: "16px" }} />
              )}
            </Button>
          </div>
        </td>
      </tr>
    );
  },
);

export default InstallationRow;
