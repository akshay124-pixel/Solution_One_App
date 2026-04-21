import React, { useState, useEffect } from "react";
import { Modal, Button, Input, Select, Collapse } from "antd";
import furniApi from "../axiosSetup";
import { toast } from "react-toastify";
const { Option } = Select;
const { Panel } = Collapse;

const OutFinishedGoodModal = ({
  visible,
  onClose,
  onSubmit,
  initialData,
  entryToEdit,
}) => {
  const [formData, setFormData] = useState({
    dispatchFrom: "",
    transporterDetails: "",
    billNumber: "",
    dispatchDate: new Date().toISOString().split("T")[0],
    stamp: "",
    actualFreight: "",
    dispatchStatus: "Not Dispatched",
    remarksBydispatch: "",
    installationReport: "No",
    products: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [stampReportFile, setStampReportFile] = useState(null);

  useEffect(() => {
    if (initialData && entryToEdit) {
      const billStatus = (entryToEdit?.billStatus || "Pending").trim().toLowerCase();
      const isBillingComplete = billStatus === "billing complete";
      const dispatchStatus = initialData.dispatchStatus || "Not Dispatched";
      const validDispatchStatus = isBillingComplete
        ? dispatchStatus
        : ["Delivered"].includes(dispatchStatus)
          ? "Not Dispatched"
          : dispatchStatus;

      const products =
        entryToEdit.products?.map((product) => ({
          productType: product.productType || "",
          modelNos: product.modelNos || [],
          unitPrice: product.unitPrice || "",
          qty: product.qty || 0,
          gst: product.gst || "0",
          size: product.size || "N/A",
          spec: product.spec || "N/A",
        })) || [];

      setFormData({
        dispatchFrom: initialData.dispatchFrom || "",
        transporterDetails: initialData.transporterDetails || "",
        billNumber: initialData.billNumber || "",
        dispatchDate: initialData.dispatchDate
          ? new Date(initialData.dispatchDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        actualFreight:
          initialData?.actualFreight !== undefined && initialData?.actualFreight !== null
            ? String(initialData.actualFreight)
            : entryToEdit?.actualFreight !== undefined && entryToEdit?.actualFreight !== null
              ? String(entryToEdit.actualFreight)
              : "",
        dispatchStatus: validDispatchStatus,
        remarksBydispatch: initialData.remarksBydispatch || "",
        installationReport: initialData.installationReport || "No",
        stamp: initialData.stamp || "Not Received",
        products,
      });
    }
  }, [initialData, entryToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "actualFreight") {
      if (value === "" || (!isNaN(value) && Number(value) >= 0)) {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleProductChange = (index, field, value) => {
    setFormData((prev) => {
      const updatedProducts = [...prev.products];
      if (field === "modelNos") {
        updatedProducts[index] = {
          ...updatedProducts[index],
          [field]: value.split(",").map((item) => item.trim()).filter(Boolean),
        };
      } else if (field === "qty" || field === "unitPrice") {
        updatedProducts[index] = {
          ...updatedProducts[index],
          [field]: value === "" ? "" : Number(value) >= 0 ? value : updatedProducts[index][field],
        };
      } else {
        updatedProducts[index] = { ...updatedProducts[index], [field]: value };
      }
      return { ...prev, products: updatedProducts };
    });
  };

  const handleDispatchFromChange = (value) => {
    setFormData((prev) => ({ ...prev, dispatchFrom: value }));
  };

  const handleDispatchStatusChange = (value) => {
    setFormData((prev) => ({ ...prev, dispatchStatus: value }));
  };

  const handleSubmit = async () => {
    if (!showConfirm) {
      if (
        formData.dispatchStatus === "Delivered" &&
        entryToEdit?.billStatus !== "Billing Complete"
      ) {
        setError("Cannot set Dispatch Status to Dispatched or Delivered until Billing Status is Billing Complete!");
        toast.error("Billing Status must be Billing Complete!");
        return;
      }
      // Require stampReport when stamp is Received
      if (formData.stamp === "Received" && !stampReportFile && !entryToEdit?.stampReport) {
        toast.error("Please upload the Stamp Signed Report before saving.");
        return;
      }
      if (formData.dispatchFrom !== "Morinda") {
        for (const product of formData.products) {
          if (!product.productType || !product.modelNos.length || !product.unitPrice || !product.qty || !product.gst || !product.size || !product.spec) {
            setError("All product fields are required!");
            toast.error("Please fill all product details!");
            return;
          }
          if (Number(product.qty) <= 0 || Number(product.unitPrice) < 0) {
            setError("Quantity must be positive and Unit Price must be non-negative!");
            toast.error("Invalid quantity or unit price!");
            return;
          }
          if (product.gst !== "including" && (isNaN(Number(product.gst)) || Number(product.gst) < 0)) {
            setError("GST must be 'including' or a non-negative number!");
            toast.error("Invalid GST value!");
            return;
          }
        }
      }
      setShowConfirm(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = new FormData();
      payload.append("dispatchFrom", formData.dispatchFrom);
      if (formData.transporterDetails) payload.append("transporterDetails", formData.transporterDetails);
      if (formData.billNumber) payload.append("billNumber", formData.billNumber);
      payload.append("dispatchDate", new Date(formData.dispatchDate).toISOString());
      if (formData.actualFreight !== "") payload.append("actualFreight", Number(formData.actualFreight));
      payload.append("dispatchStatus", formData.dispatchStatus);
      if (formData.remarksBydispatch) payload.append("remarksBydispatch", formData.remarksBydispatch);
      payload.append("installationReport", formData.installationReport);
      payload.append("stamp", formData.stamp);
      payload.append("products", JSON.stringify(formData.products.map((product) => ({
        productType: product.productType,
        modelNos: product.modelNos,
        unitPrice: Number(product.unitPrice) || undefined,
        qty: Number(product.qty) || undefined,
        gst: product.gst || undefined,
        size: product.size,
        spec: product.spec,
      }))));

      if (stampReportFile) {
        payload.append("stampReport", stampReportFile);
      }

      const response = await furniApi.put(`/api/edit/${entryToEdit._id}`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to update dispatch");
      }

      const updatedEntry = response.data.data;
      toast.success(`Dispatch updated successfully! Status: ${updatedEntry.dispatchStatus}`, {
        position: "top-right",
        autoClose: 3000,
      });
      onSubmit(updatedEntry);
      onClose();
    } catch (err) {
      console.error("Dispatch submission error:", err);
      let userFriendlyMessage = "Something went wrong while updating dispatch.";
      if (err.response) {
        if (err.response.status === 400) userFriendlyMessage = "Some details are missing or invalid. Please check and try again.";
        else if (err.response.status === 401) userFriendlyMessage = "Your session has expired. Please log in again.";
        else if (err.response.status === 404) userFriendlyMessage = "The dispatch record could not be found.";
        else if (err.response.status === 500) userFriendlyMessage = "The server is having issues. Please try again later.";
        else userFriendlyMessage = err.response.data?.message || userFriendlyMessage;
      } else if (err.request) {
        userFriendlyMessage = "Cannot connect to the server. Please check your internet connection.";
      }
      setError(userFriendlyMessage);
      toast.error(userFriendlyMessage, { position: "top-right", autoClose: 5000 });
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  const showProductFields = formData.dispatchFrom && formData.dispatchFrom !== "Morinda";

  return (
    <Modal
      title={
        <h2 style={{ textAlign: "center", fontWeight: "800", fontSize: "2.2rem", background: "linear-gradient(135deg, #2575fc, #6a11cb)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "1.5px", textShadow: "1px 1px 3px rgba(0, 0, 0, 0.05)", marginBottom: "1.5rem" }}>
          🚚 Dispatch
        </h2>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      style={{ borderRadius: "15px", overflow: "hidden" }}
      styles={{ body: { padding: "30px", background: "#fff", borderRadius: "0 0 15px 15px" } }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "15px", fontFamily: "Arial, sans-serif" }}>
        {error && <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>}
        <div>
          <label style={{ fontSize: "1rem", fontWeight: "600", color: "#333", marginBottom: "5px", display: "block" }}>Dispatch From *</label>
          <Select value={formData.dispatchFrom || undefined} onChange={handleDispatchFromChange} placeholder="Select dispatch location" style={{ width: "100%", borderRadius: "8px" }} disabled={loading}>
            <Option value="">Select Dispatch From</Option>
            <Option value="Patna">Patna</Option>
            <Option value="Bareilly">Bareilly</Option>
            <Option value="Ranchi">Ranchi</Option>
            <Option value="Morinda">Morinda</Option>
            <Option value="Lucknow">Lucknow</Option>
            <Option value="Delhi">Delhi</Option>
          </Select>
        </div>
        {[
          { key: "dispatchDate", label: "Dispatch Date", type: "date" },
          { key: "actualFreight", label: "Actual Freight", type: "text" },
          { key: "transporterDetails", label: "Transporter Details", placeholder: "Enter Driver Name, Vehicle No, and Mobile No", type: "text" },
          { key: "remarksBydispatch", label: "Dispatch Remarks", type: "text" },
        ].map((field) => (
          <div key={field.key}>
            <label style={{ fontSize: "1rem", fontWeight: "600", color: "#333", display: "block", marginBottom: "5px" }}>
              {field.label}{["dispatchFrom", "dispatchDate"].includes(field.key) && " *"}
            </label>
            <Input placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`} type={field.type} name={field.key} value={formData[field.key] || ""} onChange={handleChange} style={{ borderRadius: "8px", padding: "10px", fontSize: "1rem" }} disabled={loading} />
          </div>
        ))}
        <div>
          <label style={{ fontSize: "1rem", fontWeight: "600", color: "#333", marginBottom: "5px", display: "block" }}>Dispatch Status</label>
          <Select key={(entryToEdit?.billStatus || "Pending") + formData.dispatchStatus} value={formData.dispatchStatus || "Not Dispatched"} onChange={handleDispatchStatusChange} style={{ width: "100%", borderRadius: "8px" }} disabled={loading}>
            <Option value="Not Dispatched">Pending Dispatched</Option>
            <Option value="Hold by Salesperson">Hold by Salesperson</Option>
            <Option value="Hold by Customer">Hold by Customer</Option>
            <Option value="Order Cancelled">Order Cancelled</Option>
            <Option value="Dispatched">Dispatched</Option>
            {(entryToEdit?.billStatus || "Pending").trim().toLowerCase() === "billing complete" && (
              <Option value="Delivered">Delivered</Option>
            )}
          </Select>
        </div>
        {formData.dispatchStatus === "Delivered" && (
          <div>
            <label style={{ fontSize: "1rem", fontWeight: "600", color: "#333", marginBottom: "5px", display: "block" }}>Signed Stamp Receiving</label>
            <Select key={(entryToEdit?.stamp || "Not Received") + formData.stamp} value={formData.stamp || "Not Received"} onChange={(value) => setFormData({ ...formData, stamp: value })} style={{ width: "100%", borderRadius: "8px" }} disabled={loading}>
              <Option value="Not Received">Not Received</Option>
              <Option value="Received">Received</Option>
            </Select>
          </div>
        )}
        {formData.dispatchStatus === "Delivered" && formData.stamp === "Received" && (
          <div>
            <label style={{ fontSize: "1rem", fontWeight: "600", color: "#333", marginBottom: "5px", display: "block" }}>
              Stamp Signed Report <span style={{ color: "red" }}>*</span>
            </label>
            {entryToEdit?.stampReport && !stampReportFile && (
              <div style={{ marginBottom: "6px", fontSize: "0.85rem", color: "#555" }}>
                Current:{" "}
                <a
                  href={`${furniApi.defaults.baseURL}/download/${entryToEdit.stampReport.split("/").pop()}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#2575fc" }}
                >
                  View uploaded report
                </a>
              </div>
            )}
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              disabled={loading}
              onChange={(e) => setStampReportFile(e.target.files[0] || null)}
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #d9d9d9",
                borderRadius: "8px",
                fontSize: "0.95rem",
                background: "#fafafa",
                cursor: "pointer",
              }}
            />
            {stampReportFile && (
              <div style={{ marginTop: "4px", fontSize: "0.82rem", color: "#52c41a" }}>
                Selected: {stampReportFile.name}
              </div>
            )}
          </div>
        )}
        {showProductFields && (
          <div>
            <Collapse accordion style={{ background: "#f9f9f9", borderRadius: "8px" }}>
              <Panel header="Product Details" key="1" style={{ fontWeight: "600", fontSize: "1rem" }}>
                {formData.products.map((product, index) => (
                  <div key={index} style={{ border: "1px solid #e8e8e8", padding: "15px", borderRadius: "8px", marginBottom: "15px" }}>
                    {[
                      { field: "productType", label: "Product Type", placeholder: "Enter product type" },
                      { field: "qty", label: "Quantity", placeholder: "Enter quantity", type: "text" },
                      { field: "unitPrice", label: "Unit Price", placeholder: "Enter unit price", type: "text" },
                      { field: "gst", label: "GST", placeholder: "Enter GST (e.g., 18 or 'including')" },
                      { field: "size", label: "Size", placeholder: "Enter size" },
                      { field: "spec", label: "Specification", placeholder: "Enter specification" },
                    ].map(({ field, label, placeholder, type }) => (
                      <div key={field} style={{ marginTop: field === "productType" ? 0 : "10px" }}>
                        <label style={{ fontSize: "1rem", fontWeight: "600", color: "#333", marginBottom: "5px", display: "block" }}>{label}</label>
                        <Input placeholder={placeholder} type={type || "text"} value={product[field]} onChange={(e) => handleProductChange(index, field, e.target.value)} style={{ borderRadius: "8px", padding: "10px", fontSize: "1rem" }} disabled={loading} />
                      </div>
                    ))}
                    <div style={{ marginTop: "10px" }}>
                      <label style={{ fontSize: "1rem", fontWeight: "600", color: "#333", marginBottom: "5px", display: "block" }}>Model Numbers</label>
                      <Input placeholder="Enter model numbers (comma-separated)" value={product.modelNos.join(", ")} onChange={(e) => handleProductChange(index, "modelNos", e.target.value)} style={{ borderRadius: "8px", padding: "10px", fontSize: "1rem" }} disabled={loading} />
                    </div>
                  </div>
                ))}
              </Panel>
            </Collapse>
          </div>
        )}
        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <Button onClick={onClose} disabled={loading} style={{ padding: "14px 24px", borderRadius: "30px", color: "#fff", fontWeight: "600", fontSize: "1.1rem", textTransform: "uppercase", background: "#dc3545", border: "none" }}>Cancel</Button>
          {showConfirm ? (
            <>
              <Button onClick={() => setShowConfirm(false)} disabled={loading} style={{ padding: "14px 24px", borderRadius: "30px", color: "#fff", fontWeight: "600", fontSize: "1.1rem", textTransform: "uppercase", background: "#ffc107", border: "none" }}>Back</Button>
              <Button type="primary" onClick={handleSubmit} disabled={loading} style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", border: "none", padding: "14px 24px", borderRadius: "30px", color: "#fff", fontWeight: "600", fontSize: "1.1rem", textTransform: "uppercase" }}>
                {loading ? "Saving..." : "Confirm"}
              </Button>
            </>
          ) : (
            <Button type="primary" onClick={handleSubmit} disabled={loading} style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", border: "none", padding: "14px 24px", borderRadius: "30px", color: "#fff", fontWeight: "600", fontSize: "1.1rem", textTransform: "uppercase" }}>
              {loading ? "Submitting..." : "Save Changes"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default OutFinishedGoodModal;
