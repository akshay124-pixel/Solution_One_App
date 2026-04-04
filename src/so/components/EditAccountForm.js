import React, { useState, useEffect, useCallback, memo } from "react";
import { getDirtyValues } from "../utils/formUtils";
import { Modal, Form, Button } from "react-bootstrap";
import soApi from "../../so/axiosSetup";
import { toast } from "react-toastify";
const MODAL_HEADER_STYLE = {
    background: "linear-gradient(135deg, #2575fc, #6a11cb)",
    color: "#fff",
    borderBottom: "none",
    padding: "20px",
};

const MODAL_TITLE_STYLE = {
    fontWeight: "700",
    fontSize: "1.5rem",
    textTransform: "uppercase",
    letterSpacing: "1px",
};

const MODAL_BODY_STYLE = {
    padding: "30px",
    background: "#fff",
    borderRadius: "0 0 15px 15px",
    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
};

const LABEL_STYLE = { fontWeight: "600", color: "#333" };
const ERROR_STYLE = { color: "red", fontSize: "0.875rem" };
const GROUP_STYLE = { marginBottom: "20px" };

// Input Styles
const BASE_INPUT_STYLE = {
    borderRadius: "10px",
    padding: "12px",
    fontSize: "1rem",
    transition: "all 0.3s ease",
};

// Button Styles
const BUTTON_CANCEL_STYLE = {
    background: "linear-gradient(135deg, #6c757d, #5a6268)",
    border: "none",
    padding: "10px 20px",
    borderRadius: "20px",
    color: "#fff",
    fontWeight: "600",
    transition: "all 0.3s ease",
};

const BUTTON_SAVE_STYLE = {
    background: "linear-gradient(135deg, #2575fc, #6a11cb)",
    border: "none",
    padding: "10px 20px",
    borderRadius: "20px",
    color: "#fff",
    fontWeight: "600",
    transition: "all 0.3s ease",
};

const handleFocus = (e) => {
    e.target.style.boxShadow = "0 0 10px rgba(37, 117, 252, 0.5)";
};
const handleBlur = (e) => {
    e.target.style.boxShadow = "none";
};

// Generic Memoized Input
const MemoizedInput = memo(({
    label,
    name,
    value,
    onChange,
    placeholder,
    error,
    type = "text",
    disabled = false,
    step,
    required = false
}) => {
    // Computed style based on error presence
    const inputStyle = {
        ...BASE_INPUT_STYLE,
        border: error ? "1px solid red" : "1px solid #ced4da",
    };

    return (
        <Form.Group style={GROUP_STYLE}>
            <Form.Label style={LABEL_STYLE}>
                {label} {required && <span style={{ color: "red" }}>*</span>}
            </Form.Label>
            <Form.Control
                type={type}
                step={step}
                name={name}
                value={value}
                onChange={(e) => onChange(name, e.target.value)}
                placeholder={placeholder}
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
                disabled={disabled}
                required={required}
            />
            {error && <Form.Text style={ERROR_STYLE}>{error}</Form.Text>}
        </Form.Group>
    );
});

// Generic Memoized Select
const MemoizedSelect = memo(({
    label,
    name,
    value,
    onChange,
    options,
    error,
    disabled = false,
    required = false
}) => {
    const inputStyle = {
        ...BASE_INPUT_STYLE,
        border: error ? "1px solid red" : "1px solid #ced4da",
    };

    return (
        <Form.Group style={GROUP_STYLE}>
            <Form.Label style={LABEL_STYLE}>
                {label} {required && <span style={{ color: "red" }}>*</span>}
            </Form.Label>
            <Form.Select
                name={name}
                value={value}
                onChange={(e) => onChange(name, e.target.value)}
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
                disabled={disabled}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </Form.Select>
            {error && <Form.Text style={ERROR_STYLE}>{error}</Form.Text>}
        </Form.Group>
    );
});

// Generic Memoized Textarea
const MemoizedTextarea = memo(({
    label,
    name,
    value,
    onChange,
    placeholder,
    error,
    rows = 3,
    required = false
}) => {
    const inputStyle = {
        ...BASE_INPUT_STYLE,
        border: error ? "1px solid red" : "1px solid #ced4da",
    };

    return (
        <Form.Group style={GROUP_STYLE}>
            <Form.Label style={LABEL_STYLE}>
                {label} {required && <span style={{ color: "red" }}>*</span>}
            </Form.Label>
            <Form.Control
                as="textarea"
                rows={rows}
                name={name}
                value={value}
                onChange={(e) => onChange(name, e.target.value)}
                placeholder={placeholder}
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
                required={required}
            />
            {error && <Form.Text style={ERROR_STYLE}>{error}</Form.Text>}
        </Form.Group>
    );
});

// Button Handlers for Hover (external to avoid recreation)
const handleBtnEnter = (e) => (e.target.style.transform = "translateY(-2px)");
const handleBtnLeave = (e) => (e.target.style.transform = "translateY(0)");

// ----------------------------------------------------------------------
// 3. Main Component
// ----------------------------------------------------------------------
const EditAccountForm = ({ show, onHide, order, onOrderUpdated }) => {
    // State
    const [formData, setFormData] = useState({
        total: "",
        paymentReceived: "Not Received",
        remarksByAccounts: "",
        paymentCollected: "",
        paymentMethod: "",
        paymentDue: "",
        neftTransactionId: "",
        chequeId: "",
    });
    const [originalFormData, setOriginalFormData] = useState({});
    const [errors, setErrors] = useState({});

    // Initialization Logic
    useEffect(() => {
        if (order) {
            const initialData = {
                total: order.total || "",
                paymentReceived: order.paymentReceived || "Not Received",
                remarksByAccounts: order.remarksByAccounts || "",
                paymentCollected:
                    order.paymentReceived === "Received"
                        ? Number(order.total || 0).toFixed(2)
                        : order.paymentCollected || "",
                paymentMethod: order.paymentMethod || "",
                paymentDue:
                    order.paymentReceived === "Received" ? "0" : order.paymentDue || "",
                neftTransactionId: order.neftTransactionId || "",
                chequeId: order.chequeId || "",
            };
            setFormData(initialData);
            setOriginalFormData(initialData);
            setErrors({});
        }
    }, [order]);

    const handleChange = useCallback((name, value) => {
        setFormData((prev) => {
            const temp = { ...prev, [name]: value };
            if (name === "paymentReceived" && value === "Received") {
                temp.paymentDue = "0";
                temp.paymentCollected = Number(temp.total || 0).toFixed(2);
            }
            return temp;
        });

        // Optimization: Only triggers re-render for errors if an error existed
        setErrors((prev) => (prev[name] ? { ...prev, [name]: null } : prev));
    }, []);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.remarksByAccounts?.trim()) {
            newErrors.remarksByAccounts = "Remarks are required";
        }
        if (
            formData.paymentMethod &&
            !["Cash", "NEFT", "RTGS", "Cheque", ""].includes(formData.paymentMethod)
        ) {
            newErrors.paymentMethod = "Invalid Payment Method";
        }
        if (
            formData.paymentMethod === "NEFT" &&
            !formData.neftTransactionId?.trim()
        ) {
            newErrors.neftTransactionId = "NEFT Transaction ID is required for NEFT payments";
        }
        if (
            formData.paymentMethod === "Cheque" &&
            !formData.chequeId?.trim()
        ) {
            newErrors.chequeId = "Cheque ID is required for Cheque payments";
        }
        if (
            formData.paymentReceived === "Received" &&
            (!formData.paymentCollected || Number(formData.paymentCollected) <= 0)
        ) {
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
                paymentCollected: formData.paymentCollected
                    ? Number(formData.paymentCollected)
                    : undefined,
                paymentMethod: formData.paymentMethod || undefined,
                paymentDue: formData.paymentDue
                    ? Number(formData.paymentDue)
                    : undefined,
                neftTransactionId: formData.neftTransactionId || undefined,
                chequeId: formData.chequeId || undefined,
            };

            const dirtyValues = getDirtyValues(originalFormData, formData);
            if (Object.keys(dirtyValues).length === 0) {
                toast.info("No changes to save.");
                onHide();
                return;
            }

            const finalPayload = {};
            Object.keys(dirtyValues).forEach((key) => {
                if (Object.prototype.hasOwnProperty.call(submissionData, key)) {
                    finalPayload[key] = submissionData[key];
                }
            });

            const response = await soApi.patch(
                `/api/edit/${order._id}`,
                finalPayload
            );

            if (response.data.success) {
                toast.success("Order updated successfully!", {
                    position: "top-right",
                    autoClose: 3000,
                });
                if (onOrderUpdated) {
                    onOrderUpdated(response.data.data);
                }
                onHide();
            } else {
                throw new Error(response.data.message || "Failed to update order");
            }
        } catch (error) {
            console.error("Error updating order:", error);
            let errorMessage = "Something went wrong while updating the order.";
            if (error.response) {
                const status = error.response.status;
                if (status === 400) errorMessage = "Invalid data provided. Please check your inputs.";
                else if (status === 401) errorMessage = "Your session has expired. Please log in again.";
                else if (status === 404) errorMessage = "The order you are trying to update was not found.";
                else if (status === 500) errorMessage = "Server error. Please try again later.";
                else errorMessage = error.response.data?.message || errorMessage;
            } else if (error.request) {
                errorMessage = "Unable to connect to the server. Check your internet.";
            }

            toast.error(errorMessage, {
                position: "top-right",
                autoClose: 5000,
            });
        }
    };

    // Derived values for disabled states
    const isReceived = formData.paymentReceived === "Received";
    const isNeft = formData.paymentMethod === "NEFT";
    const isCheque = formData.paymentMethod === "Cheque";

    // Options for Selects
    const paymentMethodOptions = [
        { value: "", label: "-- Select Payment Method --" },
        { value: "Cash", label: "Cash" },
        { value: "NEFT", label: "NEFT" },
        { value: "RTGS", label: "RTGS" },
        { value: "Cheque", label: "Cheque" },
    ];

    const paymentReceivedOptions = [
        { value: "Not Received", label: "Not Received" },
        { value: "Received", label: "Received" },
    ];


    return (
        <Modal show={show} onHide={onHide} centered backdrop="static">
            <Modal.Header closeButton style={MODAL_HEADER_STYLE}>
                <Modal.Title style={MODAL_TITLE_STYLE}>Edit Payment Collection</Modal.Title>
            </Modal.Header>
            <Modal.Body style={MODAL_BODY_STYLE}>
                <Form onSubmit={handleEditSubmit}>

                    <MemoizedInput
                        label="Total Payment"
                        name="total"
                        value={formData.total}
                        onChange={handleChange}
                        placeholder="Enter total amount"
                        error={errors.total}
                        step="0.01"
                    />

                    <MemoizedInput
                        label="Payment Collected"
                        name="paymentCollected"
                        value={formData.paymentCollected}
                        onChange={handleChange}
                        placeholder="Enter payment collected"
                        error={errors.paymentCollected}
                        step="0.01"
                        disabled={isReceived}
                    />

                    <MemoizedSelect
                        label="Payment Method"
                        name="paymentMethod"
                        value={formData.paymentMethod}
                        onChange={handleChange}
                        options={paymentMethodOptions}
                        error={errors.paymentMethod}
                    />

                    <MemoizedInput
                        label="Payment Due"
                        name="paymentDue"
                        value={formData.paymentDue}
                        onChange={handleChange}
                        placeholder="Enter payment due"
                        error={errors.paymentDue}
                        step="0.01"
                        disabled={isReceived}
                    />

                    <MemoizedInput
                        label="NEFT Transaction ID"
                        name="neftTransactionId"
                        value={formData.neftTransactionId}
                        onChange={handleChange}
                        placeholder="Enter NEFT transaction ID"
                        error={errors.neftTransactionId}
                        disabled={!isNeft}
                    />

                    <MemoizedInput
                        label="Cheque ID"
                        name="chequeId"
                        value={formData.chequeId}
                        onChange={handleChange}
                        placeholder="Enter cheque ID"
                        error={errors.chequeId}
                        disabled={!isCheque}
                    />

                    <MemoizedSelect
                        label="Payment Received"
                        name="paymentReceived"
                        value={formData.paymentReceived}
                        onChange={handleChange}
                        options={paymentReceivedOptions}
                    />

                    <MemoizedTextarea
                        label="Remarks by Accounts"
                        name="remarksByAccounts"
                        value={formData.remarksByAccounts}
                        onChange={handleChange}
                        placeholder="Enter remarks"
                        error={errors.remarksByAccounts}
                        required={true}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "15px" }}>
                        <Button
                            onClick={onHide}
                            style={BUTTON_CANCEL_STYLE}
                            onMouseEnter={handleBtnEnter}
                            onMouseLeave={handleBtnLeave}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            style={BUTTON_SAVE_STYLE}
                            onMouseEnter={handleBtnEnter}
                            onMouseLeave={handleBtnLeave}
                        >
                            Save Changes
                        </Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

export default EditAccountForm;
