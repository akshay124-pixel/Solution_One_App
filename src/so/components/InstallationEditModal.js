import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { toast } from "react-toastify";
import { FaDownload } from "react-icons/fa";
import soApi from "../../so/axiosSetup";

// PERFORMANCE: Separated Edit Modal component to prevent parent re-renders on typing
const InstallationEditModal = ({ show, onHide, order, onUpdate }) => {
    const [formData, setFormData] = useState({
        installationStatus: "Pending",
        remarksByInstallation: "",
        installationReport: "",
        installationStatusDate: "",
        installationeng: "",
        installationFile: null,
    });
    const [currentFile, setCurrentFile] = useState(null);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    // Initialize form data when order changes
    useEffect(() => {
        if (order) {
            setFormData({
                installationStatus: order.installationStatus || "Pending",
                remarksByInstallation: order.remarksByInstallation || "",
                installationReport: order.installationReport || "", // <-- fixed
                installationStatusDate: order.installationStatusDate || "",
                installationeng: order.installationeng || "",
                installationFile: null,
            });
            setCurrentFile(order.installationFile || null);
            setErrors({});
        }
    }, [order]);


    const validateForm = () => {
        const newErrors = {};
        if (
            !formData.remarksByInstallation ||
            formData.remarksByInstallation.trim() === ""
        ) {
            newErrors.remarksByInstallation = "Remarks are required";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleDownload = async (filePath, label = "SalesOrder_InstallationReport") => {
        if (!filePath || typeof filePath !== "string") {
            toast.error("Invalid file path!");
            return;
        }

        try {
            const fileName = filePath.split("/").pop();
            if (!fileName) {
                toast.error("Invalid file name!");
                return;
            }

            const response = await soApi.get(`/api/download/${encodeURIComponent(fileName)}`, {
                responseType: "blob",
            });

            const blob = response.data;
            const ext = fileName.includes(".") ? "." + fileName.split(".").pop() : "";
            const orderSlug = order?.orderId ? `Order_${order.orderId}` : "SO";
            const downloadFileName = `${orderSlug}_SO_${label}${ext}`;

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

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const allowedTypes = [
                "application/pdf",
                "application/x-pdf",
                "image/png",
                "image/jpeg",
                "image/jpg",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.ms-excel",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ];
            const allowedExtensions = ["pdf", "png", "jpg", "jpeg", "doc", "docx", "xls", "xlsx"];
            const fileExt = file.name.split(".").pop().toLowerCase();

            if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExt)) {
                toast.error("Invalid file type. Only PDF, PNG, JPG, DOCX, XLS, XLSX are allowed.", {
                    position: "top-right",
                    autoClose: 5000,
                });
                e.target.value = null;
                setFormData({ ...formData, installationFile: null });
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                toast.error("File size must be less than 10MB", {
                    position: "top-right",
                    autoClose: 5000,
                });
                e.target.value = null;
                setFormData({ ...formData, installationFile: null });
                return;
            }
            setFormData({ ...formData, installationFile: file });
        } else {
            setFormData({ ...formData, installationFile: null });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (
            formData.installationReport === "Yes" &&
            !formData.installationFile &&
            !currentFile
        ) {
            toast.warning("Please upload the Installation Report file before saving.", {
                position: "top-right",
                autoClose: 4000,
            });
            return;
        }
        if (!validateForm()) return;

        setLoading(true);
        try {
            const response = await soApi.patch(
                `/api/edit/${order._id}`,
                formData,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                }
            );

            if (response.data.success) {
                onUpdate(response.data.data); // Pass updated order back to parent
                onHide(); // Close modal
                toast.success("Order updated successfully!", {
                    position: "top-right",
                    autoClose: 3000,
                });
            } else {
                throw new Error(response.data.message || "Failed to update order");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update order", {
                position: "top-right",
                autoClose: 5000,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            show={show}
            onHide={onHide}
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
                    Edit Installation Order
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
                <Form onSubmit={handleSubmit}>
                    <Form.Group style={{ marginBottom: "20px" }}>
                        <Form.Label style={{ fontWeight: "600", color: "#333" }}>
                            Installation Status
                        </Form.Label>
                        <Form.Select
                            value={formData.installationStatus}
                            onChange={(e) =>
                                setFormData({ ...formData, installationStatus: e.target.value })
                            }
                            style={{
                                borderRadius: "10px",
                                border: errors.installationStatus
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
                        >
                            <option value="Pending">Pending</option>
                            <option value="Hold">Hold</option>
                            <option value="Site Not Ready">Site Not Ready</option>
                            {formData.installationReport === "Yes" && (
                                <option value="Completed">Completed</option>
                            )}
                        </Form.Select><small style={{ color: "#888", fontSize: "0.85rem" }}>
                            Completed status is available only after Installation Report is marked as Yes.
                        </small>
                        {errors.installationStatus && (
                            <Form.Text style={{ color: "red", fontSize: "0.875rem" }}>
                                {errors.installationStatus}
                            </Form.Text>
                        )}
                    </Form.Group>

                    {formData.installationStatus === "Completed" && (
                        <>
                            <Form.Group style={{ marginBottom: "20px" }}>
                                <Form.Label style={{ fontWeight: "600", color: "#333" }}>
                                    Installation Completion Date{" "}
                                    <span style={{ color: "red" }}>*</span>
                                </Form.Label>
                                <Form.Control
                                    type="date"
                                    value={
                                        formData.installationStatusDate
                                            ? new Date(formData.installationStatusDate).toISOString().slice(0, 10)
                                            : ""
                                    }
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            installationStatusDate: e.target.value,
                                        })
                                    }
                                    style={{
                                        borderRadius: "10px",
                                        border: "1px solid #ced4da",
                                        padding: "12px",
                                        fontSize: "1rem",
                                    }}
                                    required
                                />

                            </Form.Group>

                            <Form.Group style={{ marginBottom: "20px" }}>
                                <Form.Label style={{ fontWeight: "600", color: "#333" }}>
                                    Installation Engineer Name{" "}
                                    <span style={{ color: "red" }}>*</span>
                                </Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Enter engineer name"
                                    value={formData.installationeng}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            installationeng: e.target.value,
                                        })
                                    }
                                    style={{
                                        borderRadius: "10px",
                                        border: "1px solid #ced4da",
                                        padding: "12px",
                                        fontSize: "1rem",
                                    }}
                                    required
                                />
                            </Form.Group>
                        </>
                    )}


                    <Form.Group style={{ marginBottom: "20px" }}>
                        <Form.Label style={{ fontWeight: "600", color: "#333" }}>
                            Installation Report
                        </Form.Label>
                        <Form.Select
                            value={formData.installationReport}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    installationReport: e.target.value,
                                })
                            }
                            style={{
                                borderRadius: "10px",
                                border: errors.installationReport
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
                        >
                            {" "}
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                        </Form.Select>
                        {errors.installationReport && (
                            <Form.Text style={{ color: "red", fontSize: "0.875rem" }}>
                                {errors.installationReport}
                            </Form.Text>
                        )}
                    </Form.Group>


                    <Form.Group style={{ marginBottom: "20px" }}>
                        <Form.Label style={{ fontWeight: "600", color: "#333" }}>
                            Upload Installation Report File <span style={{ color: "red" }}>*</span>
                        </Form.Label>

                        <div
                            style={{
                                border: "2px dashed #6a11cb",
                                borderRadius: "12px",
                                padding: "15px",
                                textAlign: "center",
                                background: "#f8f9ff",
                                cursor: "pointer",
                            }}
                        >
                            <Form.Control
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.xls"
                                onChange={handleFileChange}
                                style={{ display: "none" }}
                                id="installationFileUpload"
                            />

                            <label htmlFor="installationFileUpload" style={{ cursor: "pointer" }}>
                                <div style={{ fontSize: "0.95rem", color: "#333", fontWeight: "600" }}>
                                    {formData.installationFile
                                        ? `Selected: ${formData.installationFile.name}`
                                        : currentFile
                                            ? "Replace existing report"
                                            : "Click to upload Installation Report (PDF / Image / Doc / Excel)"}
                                </div>
                                <div style={{ fontSize: "0.8rem", color: "#666" }}>
                                    Supported: PDF, JPG, PNG, DOCX, XLSX (Max 10MB)
                                </div>
                            </label>
                        </div>
                    </Form.Group>


                    {currentFile && (
                        <div
                            style={{
                                marginBottom: "20px",
                                padding: "10px",
                                background: "#eef2f7",
                                borderRadius: "8px",
                                borderLeft: "4px solid #2575fc",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between"
                            }}
                        >
                            <span style={{ fontWeight: "600", marginRight: "10px", color: "#333" }}>
                                Current Report:
                            </span>
                            <Button
                                size="sm"
                                onClick={() => handleDownload(currentFile)}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "6px 14px",
                                    borderRadius: "20px",
                                    background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                                    color: "#fff",
                                    fontWeight: "600",
                                    fontSize: "0.85rem",
                                    border: "none",
                                    boxShadow: "0 3px 8px rgba(0,0,0,0.2)",
                                    transition: "all 0.3s ease",
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = "translateY(-1px) scale(1.02)";
                                    e.target.style.boxShadow = "0 5px 12px rgba(0,0,0,0.3)";
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = "translateY(0) scale(1)";
                                    e.target.style.boxShadow = "0 3px 8px rgba(0,0,0,0.2)";
                                }}
                            >
                                <FaDownload size={12} />
                                Download File
                            </Button>
                        </div>
                    )}

                    <Form.Group style={{ marginBottom: "20px" }}>
                        <Form.Label style={{ fontWeight: "600", color: "#333" }}>
                            Remarks by Installation <span style={{ color: "red" }}>*</span>
                        </Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            value={formData.remarksByInstallation}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    remarksByInstallation: e.target.value,
                                })
                            }
                            placeholder="Enter remarks"
                            style={{
                                borderRadius: "10px",
                                border: errors.remarksByInstallation
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
                            required
                        />
                        {errors.remarksByInstallation && (
                            <Form.Text style={{ color: "red", fontSize: "0.875rem" }}>
                                {errors.remarksByInstallation}
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
                            onClick={onHide}
                            disabled={loading}
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
                            disabled={loading}
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
                            {loading ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

export default InstallationEditModal;
