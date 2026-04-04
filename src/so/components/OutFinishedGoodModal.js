import React, { useState, useEffect, useCallback } from "react";
import { getDirtyValues } from "../utils/formUtils"; // Refined Diff Utility
import { Modal, Button, Input, Select, Collapse } from "antd";
import soApi from "../../so/axiosSetup";
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
    transporter: "",
    transporterDetails: "",
    billNumber: "",
    dispatchDate: "",
    stamp: "Not Received",
    deliveredDate: "",
    docketNo: "",
    actualFreight: "",
    dispatchStatus: "Not Dispatched",
    products: [],
  });
  const [originalFormData, setOriginalFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (initialData && entryToEdit) {
      const billStatus = (entryToEdit?.billStatus || "Pending").trim().toLowerCase();
      const isBillingComplete = billStatus === "billing complete";

      const dispatchStatus = initialData.dispatchStatus || entryToEdit.dispatchStatus || "Not Dispatched";
      const validDispatchStatus = isBillingComplete
        ? dispatchStatus
        : ["Dispatched", "Delivered"].includes(dispatchStatus)
          ? "Not Dispatched"
          : dispatchStatus;

      // Initialize products with ALL schema fields for backend-safe validation
      const products = (entryToEdit.products || []).map((p) => ({
        productType: p.productType || "",
        serialNos: Array.isArray(p.serialNos) ? p.serialNos : [],
        modelNos: Array.isArray(p.modelNos) ? p.modelNos : [],
        unitPrice: p.unitPrice ?? "",
        qty: p.qty ?? 1,
        gst: p.gst || "18",
        warranty: p.warranty || "1 Year",
        size: p.size || "N/A",
        spec: p.spec || "N/A",
        brand: p.brand || "",
      }));

      const initializedData = {
        dispatchFrom: initialData.dispatchFrom || entryToEdit.dispatchFrom || "",
        transporter: initialData.transporter || entryToEdit.transporter || "",
        transporterDetails: initialData.transporterDetails || entryToEdit.transporterDetails || "",
        billNumber: entryToEdit.billNumber || "", // Kept for data mapping, though not in original UI
        dispatchDate: initialData.dispatchDate
          ? new Date(initialData.dispatchDate).toISOString().split("T")[0]
          : entryToEdit.dispatchDate
            ? new Date(entryToEdit.dispatchDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
        deliveredDate: initialData.deliveredDate
          ? new Date(initialData.deliveredDate).toISOString().split("T")[0]
          : entryToEdit.deliveredDate
            ? new Date(entryToEdit.deliveredDate).toISOString().split("T")[0]
            : "",
        stamp: initialData.stamp || entryToEdit.stamp || "Not Received",
        docketNo: initialData.docketNo || entryToEdit.docketNo || "",
        actualFreight: initialData.actualFreight ?? entryToEdit.actualFreight ?? "",
        dispatchStatus: validDispatchStatus,
        products,
      };

      setFormData(initializedData);
      setOriginalFormData(initializedData);
    }
  }, [initialData, entryToEdit]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    if (name === "actualFreight") {
      if (value === "" || (!isNaN(value) && Number(value) >= 0)) {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  }, []);

  const handleProductChange = useCallback((index, field, value) => {
    setFormData((prev) => {
      const updatedProducts = [...prev.products];
      if (["serialNos", "modelNos"].includes(field)) {
        updatedProducts[index] = {
          ...updatedProducts[index],
          [field]: value.split(",").map((item) => item.trim()).filter(Boolean),
        };
      } else {
        updatedProducts[index] = { ...updatedProducts[index], [field]: value };
      }
      return { ...prev, products: updatedProducts };
    });
  }, []);

  const handleSubmit = async () => {
    if (!showConfirm) {
      if (
        (formData.dispatchStatus === "Dispatched" || formData.dispatchStatus === "Delivered") &&
        (entryToEdit?.billStatus || "").trim().toLowerCase() !== "billing complete"
      ) {
        toast.error("Billing Status must be Billing Complete before Dispatching!");
        return;
      }
      setShowConfirm(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dirtyValues = getDirtyValues(originalFormData, formData);

      if (Object.keys(dirtyValues).length === 0) {
        toast.info("No changes to save.");
        setLoading(false);
        setShowConfirm(false);
        return;
      }

      const finalPayload = {};

      Object.keys(dirtyValues).forEach((key) => {
        const value = formData[key];

        if (key === "products") {
          finalPayload.products = value.map((p) => ({
            productType: p.productType || undefined,
            qty: Number(p.qty) || 1,
            unitPrice: p.unitPrice !== "" ? Number(p.unitPrice) : 0,
            gst: p.gst || "18",
            warranty: p.warranty || "1 Year",
            serialNos: p.serialNos?.length ? p.serialNos : [],
            modelNos: p.modelNos?.length ? p.modelNos : [],
            size: p.size && p.size !== "N/A" ? p.size : undefined,
            spec: p.spec && p.spec !== "N/A" ? p.spec : undefined,
            brand: p.brand || undefined,
          }));
        } else if (key === "actualFreight") {
          finalPayload.actualFreight = value !== "" ? Number(value) : undefined;
        } else if (key.endsWith("Date")) {
          finalPayload[key] = value ? new Date(value).toISOString() : undefined;
        } else {
          // General field: Omit if empty to prevent DB overwrite with ""
          if (value !== "" && value !== null && value !== undefined) {
            finalPayload[key] = value;
          }
        }
      });

      // Avoid sending empty payload after sanitization
      if (Object.keys(finalPayload).length === 0) {
        toast.info("No modifications detected.");
        setLoading(false);
        setShowConfirm(false);
        return;
      }

      const response = await soApi.patch(
        `/api/edit/${entryToEdit._id}`,
        finalPayload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to update dispatch");
      }

      // toast.success("Dispatch updated successfully!");
      onSubmit(response.data.data);
      onClose();
    } catch (err) {
      console.error("PATCH Error:", err);
      const msg = err.response?.data?.error || err.response?.data?.message || "Something went wrong.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  const isBillingComplete = (entryToEdit?.billStatus || "").trim().toLowerCase() === "billing complete";
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
      bodyStyle={{ padding: "30px", background: "#fff", borderRadius: "0 0 15px 15px" }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "15px", fontFamily: "Arial, sans-serif" }}>
        {error && <div style={{ color: "red", textAlign: "center", fontWeight: "600", marginBottom: "10px" }}>{error}</div>}

        <div>
          <label style={{ fontSize: "1rem", fontWeight: "600", color: "#333", marginBottom: "5px", display: "block" }}>Dispatch From</label>
          <Select
            value={formData.dispatchFrom || undefined}
            onChange={(val) => setFormData(p => ({ ...p, dispatchFrom: val }))}
            placeholder="Select dispatch location"
            style={{ width: "100%", borderRadius: "8px" }}
            disabled={loading}
            allowClear
          >
            {["Patna", "Bareilly", "Ranchi", "Morinda", "Lucknow", "Delhi"].map(loc => (
              <Option key={loc} value={loc}>{loc}</Option>
            ))}
          </Select>
        </div>

        {[
          { key: "dispatchDate", label: "Dispatch Date", type: "date" },
          { key: "deliveredDate", label: "Delivery Date", type: "date" },
          { key: "docketNo", label: "Docket No", type: "text" },
          { key: "actualFreight", label: "Actual Freight", type: "text" },
          { key: "transporterDetails", label: "Transporter Remarks", type: "text" },
        ].map((field) => (
          <div key={field.key}>
            <label style={{ fontSize: "1rem", fontWeight: "600", color: "#333", display: "block", marginBottom: "5px" }}>{field.label}</label>
            <Input
              placeholder={`Enter ${field.label.toLowerCase()}`}
              type={field.type}
              name={field.key}
              value={formData[field.key] || ""}
              onChange={handleChange}
              style={{ borderRadius: "8px", padding: "10px", fontSize: "1rem" }}
              disabled={loading}
            />
          </div>
        ))}

        <div>
          <label style={{ fontSize: "1rem", fontWeight: "600", color: "#333", marginBottom: "5px", display: "block" }}>Transporter</label>
          <Select
            value={formData.transporter || undefined}
            onChange={(val) => setFormData(p => ({ ...p, transporter: val }))}
            placeholder="Select transporter"
            style={{ width: "100%", borderRadius: "8px" }}
            disabled={loading}
            allowClear
          >
            {["BlueDart", "Om Logistics", "Rivigo", "Safex", "Delhivery", "Maruti", "Self-Pickup", "By-Dedicated-Transport", "Others"].map(t => (
              <Option key={t} value={t}>{t}</Option>
            ))}
          </Select>
        </div>

        <div>
          <label style={{ fontSize: "1rem", fontWeight: "600", color: "#333", marginBottom: "5px", display: "block" }}>
            Dispatch Status
            {/* <div style={{ marginTop: "0px", paddingLeft: "0px" }}>
              <small style={{ color: "#888", fontSize: "0.85rem" }}>Delivered available after Signed Stamp received.</small>
            </div> */}
          </label>
          <Select
            value={formData.dispatchStatus || "Not Dispatched"}
            onChange={(val) => setFormData(p => ({ ...p, dispatchStatus: val }))}
            style={{ width: "100%", borderRadius: "8px" }}
            disabled={loading}
          >
            <Option value="Not Dispatched">Not Dispatched</Option>
            <Option value="Docket Awaited Dispatched">Docket-Awaited-Dispatched</Option>
            <Option value="Hold by Salesperson">Hold by Salesperson</Option>
            <Option value="Hold by Customer">Hold by Customer</Option>
            <Option value="Order Cancelled">Order Cancelled</Option>

            {isBillingComplete && (
              <>
                <Option value="Partially Shipped">Partially Shipped</Option>
                <Option value="Dispatched">Dispatched</Option>
                <Option value="Delivered">Delivered</Option>
              </>
            )}
          </Select>
        </div>

        {formData.dispatchStatus === "Delivered" && (
          <div>
            <label style={{ fontSize: "1rem", fontWeight: "600", color: "#333", marginBottom: "5px", display: "block" }}>Signed Stamp Receiving</label>
            <Select
              value={formData.stamp || "Not Received"}
              onChange={(val) => setFormData(p => ({ ...p, stamp: val }))}
              style={{ width: "100%", borderRadius: "8px" }}
              disabled={loading}
            >
              <Option value="Not Received">Not Received</Option>
              <Option value="Received">Received</Option>
            </Select>
          </div>
        )}

        {showProductFields && (
          <div>
            <Collapse accordion style={{ background: "#f9f9f9", borderRadius: "8px" }}>
              <Panel header={<span style={{ fontWeight: "600", fontSize: "1rem" }}>Product Details</span>} key="1">
                {formData.products.map((product, index) => (
                  <div key={index} style={{ border: "1px solid #e8e8e8", padding: "15px", borderRadius: "8px", marginBottom: "15px", background: "#fff" }}>
                    <div style={{ fontWeight: "700", color: "#2575fc", marginBottom: "10px" }}>{product.productType}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      {[
                        { label: "Serial Numbers", field: "serialNos", value: product.serialNos.join(", ") },
                        { label: "Model Numbers", field: "modelNos", value: product.modelNos.join(", ") },
                        { label: "Size", field: "size", value: product.size },
                        { label: "Specification", field: "spec", value: product.spec },
                      ].map((item) => (
                        <div key={item.field}>
                          <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#666", display: "block", marginBottom: "2px" }}>{item.label}</label>
                          <Input
                            placeholder={`Enter ${item.label.toLowerCase()}`}
                            value={item.value}
                            onChange={(e) => handleProductChange(index, item.field, e.target.value)}
                            style={{ borderRadius: "6px" }}
                            disabled={loading}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </Panel>
            </Collapse>
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <Button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: "14px 24px",
              borderRadius: "30px",
              color: "#fff",
              fontWeight: "600",
              fontSize: "1.1rem",
              textTransform: "uppercase",
              background: "#dc3545",
              border: "none",
            }}
          >
            Cancel
          </Button>
          {showConfirm ? (
            <>
              <Button
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                style={{
                  padding: "14px 24px",
                  borderRadius: "30px",
                  color: "#fff",
                  fontWeight: "600",
                  fontSize: "1.1rem",
                  textTransform: "uppercase",
                  background: "#ffc107",
                  border: "none",
                }}
              >
                Back
              </Button>
              <Button
                type="primary"
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                  border: "none",
                  padding: "14px 24px",
                  borderRadius: "30px",
                  color: "#fff",
                  fontWeight: "600",
                  fontSize: "1.1rem",
                  textTransform: "uppercase",
                  transition: "box-shadow 0.2s ease-in-out",
                  boxShadow: "0 4px 8px rgba(37, 117, 252, 0.2)",
                }}
                onMouseEnter={(e) =>
                (e.target.style.boxShadow =
                  "0 6px 12px rgba(37, 117, 252, 0.3)")
                }
                onMouseLeave={(e) =>
                (e.target.style.boxShadow =
                  "0 4px 8px rgba(37, 117, 252, 0.2)")
                }
              >
                {loading ? "Saving..." : "Confirm"}
              </Button>
            </>
          ) : (
            <Button
              type="primary"
              onClick={handleSubmit}
              disabled={loading}
              style={{
                background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                border: "none",
                padding: "14px 24px",
                borderRadius: "30px",
                color: "#fff",
                fontWeight: "600",
                fontSize: "1.1rem",
                textTransform: "uppercase",
                transition: "box-shadow 0.2s ease-in-out",
                boxShadow: "0 4px 8px rgba(37, 117, 252, 0.2)",
              }}
              onMouseEnter={(e) =>
              (e.target.style.boxShadow =
                "0 6px 12px rgba(37, 117, 252, 0.3)")
              }
              onMouseLeave={(e) =>
                (e.target.style.boxShadow = "0 4px 8px rgba(37, 117, 252, 0.2)")
              }
            >
              {loading ? "Submitting..." : "Save Changes"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default OutFinishedGoodModal;
