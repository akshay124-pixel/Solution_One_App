import React from "react";
import { Button, Badge } from "react-bootstrap";
import { FaEye } from "react-icons/fa";

// Memoized OrderRow component - prevents re-renders when props don't change
const OrderRow = React.memo(({
    order,
    index,
    onView,
    onEdit
}) => {
    // All display strings are pre-calculated and passed as props
    const rowBgColor = index % 2 === 0 ? "#f8f9fa" : "#fff";

    return (
        <tr
            style={{
                background: rowBgColor,
                transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#e9ecef")}
            onMouseLeave={(e) => (e.currentTarget.style.background = rowBgColor)}
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
                title={order.customername || "N/A"}
            >
                {order.customername || "N/A"}
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
                    maxWidth: "200px",
                }}
                title={order._displayProductDetails}
            >
                {order._displayProductDetails}
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
                title={order._displayModelNos}
            >
                {order._displayModelNos}
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
                title={order._displaySpecDetails}
            >
                {order._displaySpecDetails}
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
                title={order._displaySizeDetails}
            >
                {order._displaySizeDetails}
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
                title={order._displayTotalQty}
            >
                {order._displayTotalQty}
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
                title={order.remarksByProduction || "N/A"}
            >
                {order.remarksByProduction || "N/A"}
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
                title={order._displaySoDate}
            >
                {order._displaySoDate}
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
                title={order._displayDispatchDate}
            >
                {order._displayDispatchDate}
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
                title={order.dispatchFrom || "N/A"}
            >
                {order.dispatchFrom || "N/A"}
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
                title={order.billStatus || "Pending"}
            >
                <Badge
                    style={{
                        background:
                            order.billStatus === "Pending"
                                ? "linear-gradient(135deg, #ff6b6b, #ff8787)"
                                : order.billStatus === "Under Billing"
                                    ? "linear-gradient(135deg, #ffc107, #ffca2c)"
                                    : "linear-gradient(135deg, #28a745, #4cd964)",
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
                    {order.billStatus || "Pending"}
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
                title={order.freightstatus || "To Pay"}
            >
                <Badge
                    style={{
                        background:
                            order.freightstatus === "To Pay"
                                ? "linear-gradient(135deg, #ff6b6b, #ff8787)"
                                : order.freightstatus === "Including"
                                    ? "linear-gradient(135deg, #28a745, #4cd964)"
                                    : "linear-gradient(135deg, #ffc107, #ffca2c)",
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
                    {order.freightstatus || "To Pay"}
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
                title={order.fulfillingStatus}
            >
                <Badge
                    style={{
                        background:
                            order.fulfillingStatus === "Under Process"
                                ? "linear-gradient(135deg, #ff9800, #f44336)"
                                : order.fulfillingStatus === "Pending"
                                    ? "linear-gradient(135deg, #ffeb3b, #ff9800)"
                                    : order.fulfillingStatus === "Partial Dispatch"
                                        ? "linear-gradient(135deg, #00c6ff, #0072ff)"
                                        : "linear-gradient(135deg, #28a745, #4cd964)",
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
                    {order.fulfillingStatus}
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
                title={order.dispatchStatus || "Not Dispatched"}
            >
                <Badge
                    style={{
                        background:
                            order.dispatchStatus === "Not Dispatched"
                                ? "linear-gradient(135deg, #ff6b6b, #ff8787)"
                                : order.dispatchStatus === "Docket Awaited Dispatched"
                                    ? "linear-gradient(135deg, #f39c12, #f7c200)"
                                    : order.dispatchStatus === "Dispatched"
                                        ? "linear-gradient(135deg, #00c6ff, #0072ff)"
                                        : order.dispatchStatus === "Partially Shipped"
                                            ? "linear-gradient(135deg, #ff9800, #f44336)"
                                            : order.dispatchStatus === "Delivered"
                                                ? "linear-gradient(135deg, #28a745, #4cd964)"
                                                : order.dispatchStatus === "Hold by Salesperson"
                                                    ? "linear-gradient(135deg, #007bff, #4dabf7)"
                                                    : order.dispatchStatus === "Hold by Customer"
                                                        ? "linear-gradient(135deg, #8e44ad, #be94e6)"
                                                        : order.dispatchStatus === "Order Cancelled"
                                                            ? "linear-gradient(135deg, #6c757d, #5a6268)"
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
                    {order.dispatchStatus || "Not Dispatched"}
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
                title={order.stamp || "Not Received"}
            >
                <Badge
                    style={{
                        background:
                            order.stamp === "Received"
                                ? "linear-gradient(135deg, #28a745, #4cd964)"
                                : "linear-gradient(135deg, #ff6b6b, #ff8787)",
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
                    {order.stamp || "Not Received"}
                </Badge>
            </td>
            <td
                style={{
                    padding: "12px",
                    textAlign: "center",
                    height: "40px",
                    marginTop: "15px",
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
                        alignItems: "center",
                    }}
                >
                    <Button
                        variant="primary"
                        onClick={() => onView(order)}
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
                        onClick={() => onEdit(order)}
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
                </div>
            </td>
        </tr>
    );
});

OrderRow.displayName = "OrderRow";

export default OrderRow;
