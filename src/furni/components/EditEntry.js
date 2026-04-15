import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Modal, Form, Spinner, Alert } from "react-bootstrap";
import furniApi from "../axiosSetup";
import { toast } from "react-toastify";
import { useForm, Controller } from "react-hook-form";
import styled from "styled-components";
import debounce from "lodash/debounce";
import { statesAndCities } from "./Options";
import { FaEdit, FaSyncAlt, FaCog, FaDownload } from "react-icons/fa";
import { salesPersonlist, Reportinglist } from "./Options";
import { getFinancialYear } from "../../shared/financialYear";

const FURNI_ORIGIN = (() => {
  try { return new URL(process.env.REACT_APP_FURNI_URL || "http://localhost:5050/api/furni").origin; }
  catch { return "http://localhost:5050"; }
})();

/**
 * Business Rule: Production Status Automation (mirrors SO EditEntry)
 * - Non-Morinda → always "Fulfilled"
 * - Morinda + was "Fulfilled" → reset to "Pending"
 * - Morinda + other status → keep current
 */
const evaluateProductionStatus = (dispatchFrom, currentStatus) => {
  if (!dispatchFrom) return currentStatus || "Pending";
  if (dispatchFrom !== "Morinda") return "Fulfilled";
  if (dispatchFrom === "Morinda" && currentStatus === "Fulfilled") return "Pending";
  return currentStatus || "Pending";
};

/** Production Status field is read-only when dispatch is from a non-Morinda location */
const isProductionStatusDisabled = (dispatchFrom) => !!dispatchFrom && dispatchFrom !== "Morinda";

const StyledModal = styled(Modal)`
  .modal-content { border-radius: 12px; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2); max-width: 600px; margin: auto; }
  .modal-header, .modal-footer { background: linear-gradient(135deg, #2575fc, #6a11cb); color: white; border: none; }
  .modal-body { padding: 2rem; background: #f9f9f9; max-height: 70vh; overflow-y: auto; }
`;
const StyledButton = styled.button`
  padding: 10px 20px; border: none; border-radius: 10px; color: white; font-weight: bold; cursor: pointer; transition: all 0.3s ease;
  background: ${(props) => props.variant === "primary" ? "linear-gradient(135deg, #2575fc, #6a11cb)" : props.variant === "info" ? "linear-gradient(135deg, #2575fc, #6a11cb)" : props.variant === "danger" ? "#dc3545" : props.variant === "success" ? "#28a745" : "linear-gradient(135deg, rgb(252, 152, 11), rgb(244, 193, 10))"};
  &:hover { opacity: 0.9; transform: scale(1.05); }
`;
const FormSection = styled.div`display: grid; grid-template-columns: 1fr; gap: 20px;`;
const ProductContainer = styled.div`border: 1px solid #ced4da; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: #fff;`;
const ProductHeader = styled.div`display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;`;

function EditEntry({ isOpen, onClose, onEntryUpdated, entryToEdit }) {
  const initialFormData = useMemo(() => ({
    soDate: "", dispatchFrom: "", dispatchDate: "", name: "", city: "", state: "", pinCode: "", contactNo: "", alterno: "",
    customerEmail: "", customername: "", gstno: "",
    products: [{ productType: "", size: "N/A", spec: "N/A", qty: "", unitPrice: "", serialNos: "", modelNos: "", gst: "18", brand: "", warranty: "" }],
    total: "", paymentCollected: "", paymentMethod: "", paymentDue: "", paymentTerms: "", neftTransactionId: "", chequeId: "",
    freightcs: "", freightstatus: "Extra", actualFreight: "", installchargesstatus: "Extra", orderType: "B2C", gemOrderNumber: "",
    deliveryDate: "", installation: "", installationStatus: "Pending", remarksByInstallation: "", dispatchStatus: "Not Dispatched",
    salesPerson: "", report: "", company: "Promark", transporterDetails: "", receiptDate: "", shippingAddress: "", billingAddress: "",
    invoiceNo: "", invoiceDate: "", fulfillingStatus: "Pending", remarksByProduction: "", remarksByAccounts: "", paymentReceived: "Not Received",
    billNumber: "", piNumber: "", remarksByBilling: "", verificationRemarks: "", billStatus: "Pending", completionStatus: "In Progress",
    fulfillmentDate: "", remarks: "", productRemarks: "", stamp: "Not Received", installationReport: "No", stockStatus: "In Stock", sostatus: "Pending for Approval", createdBy: "",
  }), []);

  const initialUpdateData = useMemo(() => ({ sostatus: "Pending for Approval", remarks: "" }), []);

  const [, setFormData] = useState(initialFormData);
  const [updateData, setUpdateData] = useState(initialUpdateData);
  const [view, setView] = useState("options");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [installationFile, setInstallationFile] = useState(null);
  const [installationFileError, setInstallationFileError] = useState("");
  const [poFile, setPoFile] = useState(null);
  const [poFileError, setPoFileError] = useState("");

  const { register, handleSubmit, control, formState: { errors }, reset, watch, setValue } = useForm({ mode: "onChange", defaultValues: initialFormData });
  const selectedState = watch("state");
  const products = watch("products") || [];
  const paymentMethod = watch("paymentMethod");
  const dispatchFrom = watch("dispatchFrom");
  const currentFinancialYear = getFinancialYear(watch("soDate"));

  useEffect(() => {
    if (isOpen && entryToEdit) {
      const newFormData = {
        soDate: entryToEdit.soDate ? new Date(entryToEdit.soDate).toISOString().split("T")[0] : "",
        dispatchFrom: entryToEdit.dispatchFrom || "", dispatchDate: entryToEdit.dispatchDate ? new Date(entryToEdit.dispatchDate).toISOString().split("T")[0] : "",
        name: entryToEdit.name || "", city: entryToEdit.city || "", state: entryToEdit.state || "", pinCode: entryToEdit.pinCode || "",
        contactNo: entryToEdit.contactNo || "", alterno: entryToEdit.alterno || "", customerEmail: entryToEdit.customerEmail || "",
        customername: entryToEdit.customername || "", gstno: entryToEdit.gstno || "",
        products: entryToEdit.products && entryToEdit.products.length > 0 ? entryToEdit.products.map((p) => ({ productType: p.productType || "", size: p.size || "", spec: p.spec || "", qty: p.qty !== undefined ? String(p.qty) : "", unitPrice: p.unitPrice !== undefined ? String(p.unitPrice) : "", modelNos: p.modelNos?.length > 0 ? p.modelNos.join(", ") : "", gst: p.gst || "18", brand: p.brand || "", warranty: p.warranty || "" })) : [{ productType: "", size: "", spec: "", qty: "", unitPrice: "", modelNos: "", gst: "18", brand: "", warranty: "" }],
        total: entryToEdit.total !== undefined ? String(entryToEdit.total) : "", paymentCollected: entryToEdit.paymentCollected || "",
        paymentMethod: entryToEdit.paymentMethod || "", paymentDue: entryToEdit.paymentDue || "", paymentTerms: entryToEdit.paymentTerms || "",
        stamp: entryToEdit.stamp || "Not Received", installationReport: entryToEdit.installationReport || "No",
        neftTransactionId: entryToEdit.neftTransactionId || "", chequeId: entryToEdit.chequeId || "", freightcs: entryToEdit.freightcs || "",
        freightstatus: entryToEdit.freightstatus || "Extra", actualFreight: entryToEdit.actualFreight !== undefined ? String(entryToEdit.actualFreight) : "",
        installchargesstatus: entryToEdit.installchargesstatus || "Extra", orderType: entryToEdit.orderType || "B2C",
        gemOrderNumber: entryToEdit.gemOrderNumber || "", deliveryDate: entryToEdit.deliveryDate ? new Date(entryToEdit.deliveryDate).toISOString().split("T")[0] : "",
        installation: entryToEdit.installation || "", installationStatus: entryToEdit.installationStatus || "Pending",
        remarksByInstallation: entryToEdit.remarksByInstallation || "", dispatchStatus: entryToEdit.dispatchStatus || "Not Dispatched",
        salesPerson: entryToEdit.salesPerson || "", report: entryToEdit.report || "", company: entryToEdit.company || "Promark",
        transporterDetails: entryToEdit.transporterDetails || "", receiptDate: entryToEdit.receiptDate ? new Date(entryToEdit.receiptDate).toISOString().split("T")[0] : "",
        shippingAddress: entryToEdit.shippingAddress || "", billingAddress: entryToEdit.billingAddress || "",
        invoiceNo: entryToEdit.invoiceNo || "", invoiceDate: entryToEdit.invoiceDate ? new Date(entryToEdit.invoiceDate).toISOString().split("T")[0] : "",
        fulfillingStatus: entryToEdit.fulfillingStatus || "Pending", remarksByProduction: entryToEdit.remarksByProduction || "",
        remarksByAccounts: entryToEdit.remarksByAccounts || "", paymentReceived: entryToEdit.paymentReceived || "Not Received",
        billNumber: entryToEdit.billNumber || "", piNumber: entryToEdit.piNumber || "", remarksByBilling: entryToEdit.remarksByBilling || "",
        verificationRemarks: entryToEdit.verificationRemarks || "", billStatus: entryToEdit.billStatus || "Pending",
        stockStatus: entryToEdit.stockStatus || "In Stock", completionStatus: entryToEdit.completionStatus || "In Progress",
        fulfillmentDate: entryToEdit.fulfillmentDate ? new Date(entryToEdit.fulfillmentDate).toISOString().split("T")[0] : "",
        remarks: entryToEdit.remarks || "", productRemarks: entryToEdit.productRemarks || "", sostatus: entryToEdit.sostatus || "Pending for Approval",
        createdBy: entryToEdit.createdBy && typeof entryToEdit.createdBy === "object" ? entryToEdit.createdBy.username || "Unknown" : typeof entryToEdit.createdBy === "string" ? entryToEdit.createdBy : "",
      };
      setFormData(newFormData);
      setUpdateData({ sostatus: entryToEdit.sostatus || "Pending for Approval", remarks: entryToEdit.remarks || "" });
      reset(newFormData);
      setView("options");
      setError(null);
      setShowConfirm(false);
    }
  }, [isOpen, entryToEdit, reset]);

  const _debouncedRef = useRef(null);
  useEffect(() => {
    _debouncedRef.current = debounce((name, value) => {
      if (name.startsWith("products.")) {
        const parts = name.split(".");
        const field = parts[1]; const idx = parts[2];
        setFormData((prev) => { const newProducts = [...prev.products]; newProducts[idx] = { ...newProducts[idx], [field]: value }; return { ...prev, products: newProducts }; });
      } else { setFormData((prev) => ({ ...prev, [name]: value })); }
    }, 300);
    return () => { if (_debouncedRef.current?.cancel) _debouncedRef.current.cancel(); };
  }, []);

  const debouncedHandleInputChange = (name, value) => { if (_debouncedRef.current) _debouncedRef.current(name, value); };
  const handleUpdateInputChange = useCallback((e) => { const { name, value } = e.target; setUpdateData((prev) => ({ ...prev, [name]: value })); }, []);

  const onEditSubmit = async (data) => {
    if (!showConfirm) { setShowConfirm(true); return; }
    setLoading(true);
    try {
      const submissionData = {
        soDate: data.soDate ? new Date(data.soDate) : undefined, dispatchFrom: data.dispatchFrom || null,
        dispatchDate: data.dispatchDate ? new Date(data.dispatchDate) : null, name: data.name || null, city: data.city || null,
        state: data.state || null, pinCode: data.pinCode || null, contactNo: data.contactNo || null, alterno: data.alterno || null,
        customerEmail: data.customerEmail || null, customername: data.customername || null, gstno: data.gstno || null,
        products: data.products.map((p) => ({ productType: p.productType || undefined, size: p.size || "N/A", spec: p.spec || "N/A", qty: p.qty ? Number(p.qty) : undefined, unitPrice: p.unitPrice ? Number(p.unitPrice) : undefined, serialNos: p.serialNos ? p.serialNos.split(",").map((s) => s.trim()).filter(Boolean) : [], modelNos: p.modelNos ? p.modelNos.split(",").map((m) => m.trim()).filter(Boolean) : [], gst: p.gst || "18", brand: p.brand || null, warranty: p.warranty || null })),
        total: data.total ? Number(data.total) : undefined, paymentCollected: data.paymentCollected || null, paymentMethod: data.paymentMethod || null,
        paymentDue: data.paymentDue || null, paymentTerms: data.paymentTerms || null, neftTransactionId: data.neftTransactionId || null,
        chequeId: data.chequeId || null, freightcs: data.freightcs || null, freightstatus: data.freightstatus || "Extra",
        actualFreight: data.actualFreight ? Number(data.actualFreight) : undefined, installchargesstatus: data.installchargesstatus || "Extra",
        orderType: data.orderType || "B2C", gemOrderNumber: data.gemOrderNumber || null, deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
        installation: data.installation || null, installationStatus: data.installationStatus || "Pending", remarksByInstallation: data.remarksByInstallation || null,
        dispatchStatus: data.dispatchStatus || "Not Dispatched", salesPerson: data.salesPerson || null, report: data.report || null,
        company: data.company || "Promark", stamp: data.stamp || null, installationReport: data.installationReport || null,
        transporterDetails: data.transporterDetails || null, receiptDate: data.receiptDate ? new Date(data.receiptDate) : null,
        shippingAddress: data.shippingAddress || null, billingAddress: data.billingAddress || null, invoiceNo: data.invoiceNo || null,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null, fulfillingStatus: data.fulfillingStatus || "Pending",
        remarksByProduction: data.remarksByProduction || null, remarksByAccounts: data.remarksByAccounts || null,
        paymentReceived: data.paymentReceived || "Not Received", billNumber: data.billNumber || null, piNumber: data.piNumber || null,
        remarksByBilling: data.remarksByBilling || null, verificationRemarks: data.verificationRemarks || null, billStatus: data.billStatus || "Pending",
        completionStatus: data.completionStatus || "In Progress", fulfillmentDate: data.fulfillmentDate ? new Date(data.fulfillmentDate) : null,
        remarks: data.remarks || null, sostatus: data.sostatus || "Pending for Approval", stockStatus: data.stockStatus || "In Stock",
      };
      const formData = new FormData();
      Object.keys(submissionData).forEach((key) => {
        if (key === "products") { formData.append("products", JSON.stringify(submissionData.products)); }
        else if (submissionData[key] !== undefined && submissionData[key] !== null) { formData.append(key, submissionData[key]); }
      });
      if (installationFile) formData.append("installationFile", installationFile);
      if (poFile) formData.append("poFile", poFile);
      const response = await furniApi.put(`/api/edit/${entryToEdit._id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      onEntryUpdated(response.data.data);
      setView("options");
      onClose();
    } catch (err) {
      console.error("Edit submission error:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to update entry.";
      const errorDetails = err.response?.data?.errors ? err.response.data.errors.join(", ") : err.response?.data?.error || "";
      setError(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
      toast.error(errorMessage);
    } finally { setLoading(false); setShowConfirm(false); }
  };

  const onUpdateSubmit = async () => {
    if (!showConfirm) { setShowConfirm(true); return; }
    setLoading(true);
    try {
      const submissionData = { sostatus: updateData.sostatus || "Pending for Approval", remarks: updateData.remarks || null };
      const response = await furniApi.put(`/api/edit/${entryToEdit._id}`, submissionData);
      toast.success("Approvals updated successfully!");
      onEntryUpdated(response.data.data);
      setView("options");
      onClose();
    } catch (err) {
      console.error("Update submission error:", err);
      const errorMessage = err.response?.data?.message || "Failed to update approvals.";
      const errorDetails = err.response?.data?.errors ? err.response.data.errors.join(", ") : err.response?.data?.error || err.message;
      setError(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
      toast.error(errorMessage);
    } finally { setLoading(false); setShowConfirm(false); }
  };

  const addProduct = () => {
    const newProducts = [...products, { productType: "", size: "N/A", spec: "N/A", qty: "", unitPrice: "", serialNos: "", modelNos: "", gst: "18", brand: "", warranty: "" }];
    setValue("products", newProducts);
    setFormData((prev) => ({ ...prev, products: newProducts }));
  };

  const removeProduct = (index) => {
    const emptyProduct = { productType: "", size: "N/A", spec: "N/A", qty: "", unitPrice: "", serialNos: "", modelNos: "", gst: "18", brand: "", warranty: "" };
    const newProducts = products.filter((_, i) => i !== index);
    const final = newProducts.length > 0 ? newProducts : [emptyProduct];
    setValue("products", final);
    setFormData((prev) => ({ ...prev, products: final }));
  };

  const handleDownload = async (filePath, label = "SalesOrder_Attachment") => {
    if (!filePath || typeof filePath !== "string") { toast.error("Invalid file path!"); return; }
    try {
      const filename = filePath.split("/").pop();
      if (!filename) { toast.error("Invalid file path!"); return; }

      const response = await furniApi.get(`/api/download/${encodeURIComponent(filename)}`, { responseType: "blob" });
      const blob = response.data;
      const ext = filename.includes(".") ? "." + filename.split(".").pop() : "";
      const orderSlug = entryToEdit?.orderId ? `Order_${entryToEdit.orderId}` : "Furni";
      const downloadFilename = `${orderSlug}_Furni_${label}${ext}`;
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
      toast.success("Download started!");
    } catch (err) { console.error(err); toast.error("Download failed. Check server."); }
  };

  const handlePoFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { setPoFileError("File size exceeds 5MB limit."); setPoFile(null); return; }
      const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
      if (!allowedTypes.includes(file.type)) { setPoFileError("Invalid file type. Only PDF, JPG, PNG, DOCX, XLSX allowed."); setPoFile(null); return; }
      setPoFile(file);
      setPoFileError("");
    }
  };

  const handleInstallationFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { setInstallationFileError("File size exceeds 5MB limit."); setInstallationFile(null); return; }
      const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
      if (!allowedTypes.includes(file.type)) { setInstallationFileError("Invalid file type. Only PDF, JPG, PNG, DOCX, XLSX allowed."); setInstallationFile(null); return; }
      setInstallationFile(file);
      setInstallationFileError("");
    }
  };

  const renderOptions = () => (
    <div style={{ display: "flex", justifyContent: "space-around", padding: "1rem" }}>
      <StyledButton variant="primary" onClick={() => setView("edit")}>Edit Full Details</StyledButton>
      <StyledButton variant="info" onClick={() => setView("update")}>Update Approvals</StyledButton>
    </div>
  );

  const renderEditForm = () => (
    <Form onSubmit={handleSubmit(onEditSubmit)}>
      <FormSection>
        <Form.Group controlId="createdBy"><Form.Label>👤 Created By</Form.Label><Form.Control {...register("createdBy")} readOnly disabled /></Form.Group>
        <Form.Group controlId="soDate"><Form.Label>📅 SO Date *</Form.Label><Form.Control type="date" {...register("soDate", { required: "SO Date is required" })} onChange={(e) => { setValue("soDate", e.target.value, { shouldDirty: true, shouldValidate: true }); debouncedHandleInputChange("soDate", e.target.value); }} isInvalid={!!errors.soDate} /><Form.Control.Feedback type="invalid">{errors.soDate?.message}</Form.Control.Feedback></Form.Group>
        <Form.Group controlId="financialYear"><Form.Label>Financial Year</Form.Label><Form.Control value={currentFinancialYear || ""} readOnly disabled /></Form.Group>
        <Form.Group controlId="dispatchFrom"><Form.Label>📍 Dispatch From</Form.Label><Form.Select {...register("dispatchFrom")} onChange={(e) => {
          const newVal = e.target.value;
          debouncedHandleInputChange("dispatchFrom", newVal);
          // Business Rule: auto-update Production Status when Dispatch location changes
          const currentStatus = watch("fulfillingStatus");
          const nextStatus = evaluateProductionStatus(newVal, currentStatus);
          if (nextStatus !== currentStatus) {
            setValue("fulfillingStatus", nextStatus, { shouldValidate: true, shouldDirty: true });
          }
        }} isInvalid={!!errors.dispatchFrom} aria-label="Dispatch From"><option value="" disabled>-- Select Dispatch Location --</option><option value="Patna">Patna</option><option value="Bareilly">Bareilly</option><option value="Morinda">Morinda</option><option value="Ranchi">Ranchi</option><option value="Lucknow">Lucknow</option><option value="Delhi">Delhi</option><option value="Jaipur">Jaipur</option><option value="Rajasthan">Rajasthan</option></Form.Select></Form.Group>
        <Form.Group controlId="dispatchDate"><Form.Label>📅 Dispatch Date</Form.Label><Form.Control type="date" {...register("dispatchDate")} onChange={(e) => debouncedHandleInputChange("dispatchDate", e.target.value)} /></Form.Group>
        <Form.Group controlId="deliveryDate"><Form.Label>📅 Delivery Date</Form.Label><Form.Control type="date" {...register("deliveryDate")} onChange={(e) => debouncedHandleInputChange("deliveryDate", e.target.value)} /></Form.Group>
        <Form.Group controlId="name"><Form.Label>👤 Contact Person</Form.Label><Form.Control {...register("name")} onChange={(e) => debouncedHandleInputChange("name", e.target.value)} isInvalid={!!errors.name} placeholder="Enter contact person name" /></Form.Group>
        <Form.Group controlId="customername"><Form.Label>👤 Customer Name</Form.Label><Form.Control {...register("customername")} onChange={(e) => debouncedHandleInputChange("customername", e.target.value)} isInvalid={!!errors.customername} placeholder="Enter customer name" /></Form.Group>
        <Form.Group controlId="customerEmail"><Form.Label>📧 Customer Email</Form.Label><Form.Control type="email" {...register("customerEmail", { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email format" } })} onChange={(e) => debouncedHandleInputChange("customerEmail", e.target.value)} isInvalid={!!errors.customerEmail} placeholder="Enter email address" /><Form.Control.Feedback type="invalid">{errors.customerEmail?.message}</Form.Control.Feedback></Form.Group>
        <Form.Group controlId="contactNo"><Form.Label>📱 Contact Number</Form.Label><Form.Control {...register("contactNo", { pattern: { value: /^\d{10}$/, message: "Contact number must be exactly 10 digits" }, maxLength: { value: 10, message: "Contact number must be exactly 10 digits" } })} onChange={(e) => { const value = e.target.value.replace(/\D/g, "").slice(0, 10); e.target.value = value; debouncedHandleInputChange("contactNo", value); }} onKeyDown={(e) => { if (e.key === " " || (!/\d/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key))) e.preventDefault(); }} maxLength={10} isInvalid={!!errors.contactNo} placeholder="Enter 10 digit number" /><Form.Control.Feedback type="invalid">{errors.contactNo?.message}</Form.Control.Feedback></Form.Group>
        <Form.Group controlId="alterno"><Form.Label>☎️ Alternate Contact Number</Form.Label><Form.Control {...register("alterno", { pattern: { value: /^\d{10}$/, message: "Alternate contact number must be exactly 10 digits" }, maxLength: { value: 10, message: "Alternate contact number must be exactly 10 digits" } })} onChange={(e) => { const value = e.target.value.replace(/\D/g, "").slice(0, 10); e.target.value = value; debouncedHandleInputChange("alterno", value); }} onKeyDown={(e) => { if (e.key === " " || (!/\d/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key))) e.preventDefault(); }} maxLength={10} isInvalid={!!errors.alterno} placeholder="Enter 10 digit number" /><Form.Control.Feedback type="invalid">{errors.alterno?.message}</Form.Control.Feedback></Form.Group>
        <Form.Group controlId="gstno"><Form.Label>📋 GST Number</Form.Label><Form.Control {...register("gstno")} onChange={(e) => debouncedHandleInputChange("gstno", e.target.value)} isInvalid={!!errors.gstno} placeholder="e.g., 22AAAAA0000A1Z5" /></Form.Group>
        <Form.Group controlId="state"><Form.Label>🗺️ State</Form.Label><Controller name="state" control={control} render={({ field }) => (<Form.Select {...field} onChange={(e) => { field.onChange(e); debouncedHandleInputChange("state", e.target.value); }} isInvalid={!!errors.state}><option value="">-- Select State --</option>{Object.keys(statesAndCities).map((state) => <option key={state} value={state}>{state}</option>)}</Form.Select>)} /></Form.Group>
        <Form.Group controlId="city"><Form.Label>🏢 City</Form.Label><Controller name="city" control={control} render={({ field }) => (<Form.Select {...field} onChange={(e) => { field.onChange(e); debouncedHandleInputChange("city", e.target.value); }} isInvalid={!!errors.city} disabled={!selectedState}><option value="">-- Select City --</option>{selectedState && statesAndCities[selectedState]?.map((city) => <option key={city} value={city}>{city}</option>)}</Form.Select>)} /></Form.Group>
        <Form.Group controlId="pinCode"><Form.Label>📮 Pin Code</Form.Label><Form.Control {...register("pinCode", { pattern: { value: /^\d{6}$/, message: "Pin Code must be exactly 6 digits" }, maxLength: { value: 6, message: "Pin Code must be exactly 6 digits" } })} onChange={(e) => { const value = e.target.value.replace(/\D/g, "").slice(0, 6); e.target.value = value; debouncedHandleInputChange("pinCode", value); }} onKeyDown={(e) => { if (e.key === " " || (!/\d/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key))) e.preventDefault(); }} maxLength={6} isInvalid={!!errors.pinCode} placeholder="Enter 6 digit pin code" /><Form.Control.Feedback type="invalid">{errors.pinCode?.message}</Form.Control.Feedback></Form.Group>
        <Form.Group controlId="shippingAddress"><Form.Label>📦 Shipping Address</Form.Label><Form.Control as="textarea" rows={2} {...register("shippingAddress")} onChange={(e) => debouncedHandleInputChange("shippingAddress", e.target.value)} placeholder="Enter shipping address" /></Form.Group>
        <Form.Group controlId="billingAddress"><Form.Label>🏠 Billing Address</Form.Label><Form.Control as="textarea" rows={2} {...register("billingAddress")} onChange={(e) => debouncedHandleInputChange("billingAddress", e.target.value)} placeholder="Enter billing address" /></Form.Group>
        <Form.Group controlId="orderType"><Form.Label>📦 Order Type</Form.Label><Controller name="orderType" control={control} render={({ field }) => (<Form.Select {...field} onChange={(e) => { field.onChange(e); debouncedHandleInputChange("orderType", e.target.value); }}><option value="B2G">B2G</option><option value="B2C">B2C</option><option value="B2B">B2B</option><option value="Demo">Demo</option><option value="Replacement">Replacement</option></Form.Select>)} /></Form.Group>
        <Form.Group controlId="stockStatus"><Form.Label>📦 Stock Status</Form.Label><Controller name="stockStatus" control={control} render={({ field }) => (<Form.Select {...field} onChange={(e) => { field.onChange(e); debouncedHandleInputChange("stockStatus", e.target.value); }}><option value="">-- Select Stock Status --</option><option value="In Stock">In Stock</option><option value="Not in Stock">Not in Stock</option></Form.Select>)} /></Form.Group>
        <Form.Group controlId="gemOrderNumber"><Form.Label>📄 GEM Order Number</Form.Label><Form.Control {...register("gemOrderNumber")} onChange={(e) => debouncedHandleInputChange("gemOrderNumber", e.target.value)} placeholder="Enter GEM order number" /></Form.Group>
        {/* Products */}
        <div>
          <h3 style={{ fontSize: "1.5rem", background: "linear-gradient(135deg, #2575fc, #6a11cb)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: "700", marginBottom: "1.5rem", letterSpacing: "1px" }}>✨ Products</h3>
          {products.map((product, index) => (
            <ProductContainer key={index}>
              <ProductHeader>
                <h5>Product {index + 1}</h5>
                {products.length > 1 && (<StyledButton variant="danger" onClick={() => removeProduct(index)} style={{ padding: "5px 10px", fontSize: "0.9rem" }}>Remove</StyledButton>)}
              </ProductHeader>
              <div className="product-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
                {[{ id: "productType", label: "Product Category *", required: true }, { id: "size", label: "Size" }, { id: "spec", label: "Specification" }, { id: "qty", label: "Quantity *", required: true }, { id: "unitPrice", label: "Unit Price *", required: true }, { id: "brand", label: "Brand" }, { id: "warranty", label: "Warranty" }, { id: "modelNos", label: "Model Nos" }].map((f) => (
                  <div key={f.id}>
                    <Form.Group controlId={`products.${index}.${f.id}`}>
                      <Form.Label style={{ fontSize: "1rem", fontWeight: "600", color: "#475569", marginBottom: "0.5rem", display: "block" }}>{f.label}{f.required && <span style={{ color: "#f43f5e" }}>*</span>}</Form.Label>
                      <Form.Control {...register(`products.${index}.${f.id}`, f.required ? { required: `${f.label.replace(" *", "")} is required` } : {})} onChange={(e) => debouncedHandleInputChange(`products.${index}.${f.id}`, e.target.value, index)} isInvalid={!!errors.products?.[index]?.[f.id]} placeholder={`Enter ${f.label.replace(" *", "")}`} style={{ width: "100%", padding: "0.75rem", border: "1px solid #e2e8f0", borderRadius: "0.75rem", backgroundColor: "#f8fafc", fontSize: "1rem", color: "#1e293b" }} />
                      <Form.Control.Feedback type="invalid">{errors.products?.[index]?.[f.id]?.message}</Form.Control.Feedback>
                    </Form.Group>
                  </div>
                ))}
                <div>
                  <Form.Group controlId={`products.${index}.gst`}>
                    <Form.Label style={{ fontSize: "1rem", fontWeight: "600", color: "#475569", marginBottom: "0.5rem", display: "block" }}>GST * <span style={{ color: "#f43f5e" }}>*</span></Form.Label>
                    <Form.Select {...register(`products.${index}.gst`, { required: "GST is required" })} onChange={(e) => debouncedHandleInputChange(`products.${index}.gst`, e.target.value, index)} isInvalid={!!errors.products?.[index]?.gst} style={{ width: "100%", padding: "0.75rem", border: "1px solid #e2e8f0", borderRadius: "0.75rem", backgroundColor: "#f8fafc", fontSize: "1rem", color: "#1e293b" }}>
                      <option value="18">18%</option><option value="28">28%</option><option value="including">Including</option>
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">{errors.products?.[index]?.gst?.message}</Form.Control.Feedback>
                  </Form.Group>
                </div>
              </div>
            </ProductContainer>
          ))}
          <StyledButton variant="primary" onClick={addProduct} style={{ padding: "0.75rem 1.5rem", background: "linear-gradient(135deg, #2575fc, #6a11cb)", color: "#fff", border: "none", borderRadius: "0.75rem", cursor: "pointer", fontWeight: "600" }}>Add Product ➕</StyledButton>
        </div>
        <Form.Group controlId="total"><Form.Label>💵 Total *</Form.Label><Form.Control {...register("total", { required: "Total is required", pattern: { value: /^\d*$/, message: "Total must be digits only" } })} onChange={(e) => { const value = e.target.value.replace(/\D/g, ""); e.target.value = value; debouncedHandleInputChange("total", value); }} onKeyDown={(e) => { if (e.key === " " || (!/\d/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key))) e.preventDefault(); }} isInvalid={!!errors.total} placeholder="Enter digits only" /><Form.Control.Feedback type="invalid">{errors.total?.message}</Form.Control.Feedback></Form.Group>
        <Form.Group controlId="paymentCollected"><Form.Label>💰 Payment Collected</Form.Label><Form.Control {...register("paymentCollected", { pattern: { value: /^\d*$/, message: "Payment Collected must be digits only" } })} onChange={(e) => { const value = e.target.value.replace(/\D/g, ""); e.target.value = value; debouncedHandleInputChange("paymentCollected", value); }} onKeyDown={(e) => { if (e.key === " " || (!/\d/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key))) e.preventDefault(); }} isInvalid={!!errors.paymentCollected} placeholder="e.g., 5000" /><Form.Control.Feedback type="invalid">{errors.paymentCollected?.message}</Form.Control.Feedback></Form.Group>
        <Form.Group controlId="paymentMethod"><Form.Label>💳 Payment Method</Form.Label><Controller name="paymentMethod" control={control} render={({ field }) => (<Form.Select {...field} onChange={(e) => { field.onChange(e); debouncedHandleInputChange("paymentMethod", e.target.value); }}><option value="">-- Select Payment Method --</option><option value="Cash">Cash</option><option value="NEFT">NEFT</option><option value="RTGS">RTGS</option><option value="Cheque">Cheque</option></Form.Select>)} /></Form.Group>
        <Form.Group controlId="neftTransactionId"><Form.Label>📄 NEFT/RTGS Transaction ID</Form.Label><Form.Control {...register("neftTransactionId")} onChange={(e) => debouncedHandleInputChange("neftTransactionId", e.target.value)} disabled={paymentMethod !== "NEFT" && paymentMethod !== "RTGS"} placeholder="Enter transaction ID" /></Form.Group>
        <Form.Group controlId="chequeId"><Form.Label>📄 Cheque ID</Form.Label><Form.Control {...register("chequeId")} onChange={(e) => debouncedHandleInputChange("chequeId", e.target.value)} disabled={paymentMethod !== "Cheque"} placeholder="Enter cheque ID" /></Form.Group>
        <Form.Group controlId="paymentDue"><Form.Label>💰 Payment Due</Form.Label><Form.Control {...register("paymentDue", { pattern: { value: /^\d*$/, message: "Payment Due must be digits only" } })} onChange={(e) => { const value = e.target.value.replace(/\D/g, ""); e.target.value = value; debouncedHandleInputChange("paymentDue", value); }} onKeyDown={(e) => { if (e.key === " " || (!/\d/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key))) e.preventDefault(); }} isInvalid={!!errors.paymentDue} placeholder="e.g., 2000" /><Form.Control.Feedback type="invalid">{errors.paymentDue?.message}</Form.Control.Feedback></Form.Group>
        <Form.Group controlId="paymentTerms"><Form.Label>📝 Payment Terms</Form.Label><Controller name="paymentTerms" control={control} render={({ field }) => (<Form.Select {...field} onChange={(e) => { field.onChange(e); debouncedHandleInputChange("paymentTerms", e.target.value); }}><option value="">-- Select Payment Terms --</option><option value="100% Advance">100% Advance</option><option value="Partial Advance">Partial Advance</option><option value="Credit">Credit</option></Form.Select>)} /></Form.Group>
        <Form.Group controlId="freightcs"><Form.Label>🚚 Freight Charges</Form.Label><Form.Control {...register("freightcs", { pattern: { value: /^\d*$/, message: "Freight Charges must be digits only" } })} onChange={(e) => { const value = e.target.value.replace(/\D/g, ""); e.target.value = value; debouncedHandleInputChange("freightcs", value); }} onKeyDown={(e) => { if (e.key === " " || (!/\d/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key))) e.preventDefault(); }} isInvalid={!!errors.freightcs} placeholder="e.g., 1000" /><Form.Control.Feedback type="invalid">{errors.freightcs?.message}</Form.Control.Feedback></Form.Group>
        <Form.Group controlId="freightstatus"><Form.Label>🚚 Freight Status</Form.Label><Form.Select {...register("freightstatus")} onChange={(e) => debouncedHandleInputChange("freightstatus", e.target.value)} defaultValue="Extra"><option value="To Pay">To Pay</option><option value="Including">Including</option><option value="Extra">Extra</option></Form.Select></Form.Group>
        <Form.Group controlId="actualFreight"><Form.Label>🚚 Actual Freight</Form.Label><Form.Control {...register("actualFreight", { pattern: { value: /^\d*$/, message: "Actual Freight must be digits only" } })} onChange={(e) => { const value = e.target.value.replace(/\D/g, ""); e.target.value = value; debouncedHandleInputChange("actualFreight", value); }} onKeyDown={(e) => { if (e.key === " " || (!/\d/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key))) e.preventDefault(); }} isInvalid={!!errors.actualFreight} placeholder="Enter digits only" /><Form.Control.Feedback type="invalid">{errors.actualFreight?.message}</Form.Control.Feedback></Form.Group>
        <Form.Group controlId="installchargesstatus"><Form.Label>🔧 Installation Charges Status</Form.Label><Form.Select {...register("installchargesstatus")} onChange={(e) => debouncedHandleInputChange("installchargesstatus", e.target.value)} defaultValue="Extra"><option value="To Pay">To Pay</option><option value="Including">Including</option><option value="Extra">Extra</option><option value="Not in Scope">Not in Scope</option></Form.Select></Form.Group>
        <Form.Group controlId="installation"><Form.Label>🔨 Installation Charges</Form.Label><Form.Control {...register("installation", { pattern: { value: /^\d*$/, message: "Installation Charges must be digits only" } })} onChange={(e) => { const value = e.target.value.replace(/\D/g, ""); e.target.value = value; debouncedHandleInputChange("installation", value); }} onKeyDown={(e) => { if (e.key === " " || (!/\d/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key))) e.preventDefault(); }} isInvalid={!!errors.installation} placeholder="e.g., 500" /><Form.Control.Feedback type="invalid">{errors.installation?.message}</Form.Control.Feedback></Form.Group>
        <Form.Group controlId="installationStatus"><Form.Label>🔨 Installation Status</Form.Label><Controller name="installationStatus" control={control} render={({ field }) => (<Form.Select {...field} onChange={(e) => { field.onChange(e); debouncedHandleInputChange("installationStatus", e.target.value); }}><option value="Pending">Pending</option><option value="In Progress">In Progress</option><option value="Completed">Completed</option></Form.Select>)} /></Form.Group>
        <Form.Group controlId="installationReport"><Form.Label>📝 Installation Report</Form.Label><Controller name="installationReport" control={control} render={({ field }) => (<Form.Select {...field} onChange={(e) => { field.onChange(e); debouncedHandleInputChange("installationReport", e.target.value); }}><option value="No">No</option><option value="Yes">Yes</option></Form.Select>)} /></Form.Group>
        <div style={{ marginTop: "1.5rem", marginBottom: "2rem" }}>
          <Form.Label style={{ fontWeight: "600", color: "#374151", marginBottom: "0.5rem", display: "block" }}>📎 Installation Report File</Form.Label>
          <div style={{ width: "100%", maxWidth: "460px", overflow: "hidden", boxSizing: "border-box", border: `2px dashed ${installationFile ? "#22c55e" : "#cbd5e1"}`, borderRadius: "1rem", padding: "0.75rem", backgroundColor: installationFile ? "#f0fdf4" : "#f8fafc", transition: "all 0.2s ease-in-out" }}>
            <label htmlFor="installationFileEdit" title={installationFile ? installationFile.name : "Click to upload"} style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", alignItems: "center", gap: "0.75rem", width: "100%", minHeight: "44px", padding: "0.6rem 0.75rem", borderRadius: "0.75rem", background: "linear-gradient(to right, #ffffff, #f1f5f9)", border: "1px solid #e2e8f0", cursor: "pointer", overflow: "hidden", boxSizing: "border-box" }} onMouseOver={(e) => (e.currentTarget.style.background = "#e2e8f0")} onMouseOut={(e) => (e.currentTarget.style.background = "linear-gradient(to right, #ffffff, #f1f5f9)")}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "1.4rem", height: "1.4rem" }}>
                <svg style={{ width: "100%", height: "100%", color: "#4f46e5" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 16V8m0 0l-4 4m4-4l4 4" /></svg>
              </div>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#1e293b", fontSize: "0.9rem", fontWeight: "500", display: "block" }}>{installationFile ? installationFile.name : entryToEdit?.installationFile ? "Replace existing report" : "Click to upload report"}</span>
            </label>
            <input id="installationFileEdit" type="file" name="installationFile" accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.xls" onChange={handleInstallationFileChange} style={{ display: "none" }} />
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.5rem", textAlign: "center", fontWeight: "500" }}>Supported: PDF, JPG, PNG, DOCX, XLSX</div>
            {installationFile && (<button type="button" onClick={(e) => { e.preventDefault(); setInstallationFile(null); setInstallationFileError(""); const input = document.getElementById("installationFileEdit"); if (input) input.value = ""; }} style={{ marginTop: "0.75rem", width: "100%", padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid #fecaca", background: "#fee2e2", color: "#b91c1c", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }} onMouseOver={(e) => (e.currentTarget.style.background = "#fca5a5")} onMouseOut={(e) => (e.currentTarget.style.background = "#fee2e2")}> Remove Report </button>)}
          </div>
          {entryToEdit?.installationFile && !installationFile && (
            <div style={{ marginTop: "0.75rem", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ color: "#64748b" }}>Current file:</span>
              <button type="button" onClick={() => handleDownload(entryToEdit.installationFile, "SalesOrder_InstallationReport")} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "20px", background: "linear-gradient(135deg, #2575fc, #6a11cb)", color: "#fff", fontWeight: "600", fontSize: "0.85rem", border: "none", boxShadow: "0 2px 5px rgba(0,0,0,0.2)", cursor: "pointer" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}><FaDownload /> Download Report</button>
            </div>
          )}
          {installationFileError && (<div style={{ color: "#ef4444", fontSize: "0.85rem", marginTop: "0.5rem", fontWeight: "500" }}>{installationFileError}</div>)}
        </div>
        {/* PO File Upload */}
        <div style={{ marginTop: "1.5rem", marginBottom: "2rem" }}>
          <Form.Label style={{ fontWeight: "600", color: "#374151", marginBottom: "0.5rem", display: "block" }}>📎File Attachment</Form.Label>
          <div style={{ width: "100%", maxWidth: "460px", overflow: "hidden", boxSizing: "border-box", border: `2px dashed ${poFile ? "#22c55e" : "#cbd5e1"}`, borderRadius: "1rem", padding: "0.75rem", backgroundColor: poFile ? "#f0fdf4" : "#f8fafc", transition: "all 0.2s ease-in-out" }}>
            <label htmlFor="poFileEdit" title={poFile ? poFile.name : "Click to upload"} style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", alignItems: "center", gap: "0.75rem", width: "100%", minHeight: "44px", padding: "0.6rem 0.75rem", borderRadius: "0.75rem", background: "linear-gradient(to right, #ffffff, #f1f5f9)", border: "1px solid #e2e8f0", cursor: "pointer", overflow: "hidden", boxSizing: "border-box" }} onMouseOver={(e) => (e.currentTarget.style.background = "#e2e8f0")} onMouseOut={(e) => (e.currentTarget.style.background = "linear-gradient(to right, #ffffff, #f1f5f9)")}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "1.4rem", height: "1.4rem" }}>
                <svg style={{ width: "100%", height: "100%", color: "#4f46e5" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 16V8m0 0l-4 4m4-4l4 4" /></svg>
              </div>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#1e293b", fontSize: "0.9rem", fontWeight: "500", display: "block" }}>{poFile ? poFile.name : entryToEdit?.poFilePath ? "Replace existing file" : "Click to upload file"}</span>
            </label>
            <input id="poFileEdit" type="file" name="poFile" accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.xls" onChange={handlePoFileChange} style={{ display: "none" }} />
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.5rem", textAlign: "center", fontWeight: "500" }}>Supported: PDF, JPG, PNG, DOCX, XLSX</div>
            {poFile && (<button type="button" onClick={(e) => { e.preventDefault(); setPoFile(null); setPoFileError(""); const input = document.getElementById("poFileEdit"); if (input) input.value = ""; }} style={{ marginTop: "0.75rem", width: "100%", padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid #fecaca", background: "#fee2e2", color: "#b91c1c", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }} onMouseOver={(e) => (e.currentTarget.style.background = "#fca5a5")} onMouseOut={(e) => (e.currentTarget.style.background = "#fee2e2")}><span>✖</span> Remove File</button>)}
          </div>
          {entryToEdit?.poFilePath && !poFile && (
            <div style={{ marginTop: "0.75rem", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ color: "#64748b" }}>Current file:</span>
              <button type="button" onClick={() => handleDownload(entryToEdit.poFilePath, "SalesOrder_POFile")} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "20px", background: "linear-gradient(135deg, #2575fc, #6a11cb)", color: "#fff", fontWeight: "600", fontSize: "0.85rem", border: "none", boxShadow: "0 2px 5px rgba(0,0,0,0.2)", cursor: "pointer" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}><FaDownload /> Download</button>
            </div>
          )}
          {poFileError && (<div style={{ color: "#ef4444", fontSize: "0.85rem", marginTop: "0.5rem", fontWeight: "500" }}>{poFileError}</div>)}
        </div>
        <Form.Group controlId="remarksByInstallation"><Form.Label>✏️ Remarks by Installation</Form.Label><Form.Control as="textarea" rows={2} {...register("remarksByInstallation")} onChange={(e) => debouncedHandleInputChange("remarksByInstallation", e.target.value)} placeholder="Enter installation remarks" /></Form.Group>
        <Form.Group controlId="dispatchStatus"><Form.Label>🚚 Dispatch Status</Form.Label><Controller name="dispatchStatus" control={control} render={({ field }) => (<Form.Select {...field} onChange={(e) => { field.onChange(e); debouncedHandleInputChange("dispatchStatus", e.target.value); }}><option value="Not Dispatched">Not Dispatched</option><option value="Hold by Salesperson">Hold by Salesperson</option><option value="Hold by Customer">Hold by Customer</option><option value="Order Cancelled">Order Cancelled</option><option value="Dispatched">Dispatched</option><option value="Delivered">Delivered</option></Form.Select>)} /></Form.Group>
        <Form.Group controlId="stamp"><Form.Label>📦 Signed Stamp Receiving</Form.Label><Form.Select {...register("stamp")} onChange={(e) => debouncedHandleInputChange("stamp", e.target.value)} defaultValue="Not Received"><option value="Received">Received</option><option value="Not Received">Not Received</option></Form.Select></Form.Group>
        <Form.Group controlId="salesPerson"><Form.Label>👤 Sales Person</Form.Label><Form.Control as="select" {...register("salesPerson")} onChange={(e) => debouncedHandleInputChange("salesPerson", e.target.value)}><option value="">Select Sales Person</option>{salesPersonlist.map((person) => <option key={person} value={person}>{person}</option>)}</Form.Control></Form.Group>
        <Form.Group controlId="report"><Form.Label>👤 Reporting Manager</Form.Label><Form.Control as="select" {...register("report")} onChange={(e) => debouncedHandleInputChange("report", e.target.value)}><option value="">Select Reporting Manager</option>{Reportinglist.map((manager) => <option key={manager} value={manager}>{manager}</option>)}</Form.Control></Form.Group>
        <Form.Group controlId="company"><Form.Label>🏢 Company</Form.Label><Controller name="company" control={control} render={({ field }) => (<Form.Select {...field} onChange={(e) => { field.onChange(e); debouncedHandleInputChange("company", e.target.value); }}><option value="Promark">Promark</option><option value="Foxmate">Foxmate</option><option value="Promine">Promine</option><option value="Primus">Primus</option></Form.Select>)} /></Form.Group>
        <Form.Group controlId="transporterDetails"><Form.Label>📋 Transporter Details</Form.Label><Form.Control as="textarea" rows={2} {...register("transporterDetails")} onChange={(e) => debouncedHandleInputChange("transporterDetails", e.target.value)} placeholder="Enter transporter details" /></Form.Group>
        <Form.Group controlId="receiptDate"><Form.Label>📅 Receipt Date</Form.Label><Form.Control type="date" {...register("receiptDate")} onChange={(e) => debouncedHandleInputChange("receiptDate", e.target.value)} /></Form.Group>
        <Form.Group controlId="invoiceDate"><Form.Label>📅 Invoice Date</Form.Label><Form.Control type="date" {...register("invoiceDate")} onChange={(e) => debouncedHandleInputChange("invoiceDate", e.target.value)} /></Form.Group>
        <Form.Group controlId="piNumber"><Form.Label>📄 PI Number</Form.Label><Form.Control {...register("piNumber", { pattern: { value: /^\d*$/, message: "PI Number must be digits only" } })} onChange={(e) => { const value = e.target.value.replace(/\D/g, ""); e.target.value = value; debouncedHandleInputChange("piNumber", value); }} onKeyDown={(e) => { if (e.key === " " || (!/\d/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key))) e.preventDefault(); }} isInvalid={!!errors.piNumber} placeholder="Enter digits only" /><Form.Control.Feedback type="invalid">{errors.piNumber?.message}</Form.Control.Feedback></Form.Group>
        <Form.Group controlId="billNumber"><Form.Label>📄 Bill Number</Form.Label><Form.Control {...register("billNumber")} onChange={(e) => debouncedHandleInputChange("billNumber", e.target.value)} placeholder="Enter bill number" /></Form.Group>
        <Form.Group controlId="billStatus"><Form.Label>📋 Bill Status</Form.Label><Controller name="billStatus" control={control} render={({ field }) => (<Form.Select {...field} onChange={(e) => { field.onChange(e); debouncedHandleInputChange("billStatus", e.target.value); }}><option value="Pending">Pending</option><option value="Under Billing">Under Billing</option><option value="Billing Complete">Billing Complete</option></Form.Select>)} /></Form.Group>
        <Form.Group controlId="paymentReceived"><Form.Label>💰 Payment Received</Form.Label><Controller name="paymentReceived" control={control} render={({ field }) => (<Form.Select {...field} onChange={(e) => { field.onChange(e); debouncedHandleInputChange("paymentReceived", e.target.value); }}><option value="Not Received">Not Received</option><option value="Received">Received</option></Form.Select>)} /></Form.Group>
        <Form.Group controlId="fulfillingStatus"><Form.Label>📋 Production Status</Form.Label><Controller name="fulfillingStatus" control={control} render={({ field }) => (<Form.Select {...field} disabled={isProductionStatusDisabled(dispatchFrom)} onChange={(e) => { field.onChange(e); debouncedHandleInputChange("fulfillingStatus", e.target.value); }}><option value="Pending">Pending</option><option value="Under Process">Under Process</option><option value="Order Cancel">Order Cancel</option><option value="Partial Dispatch">Partial Dispatch</option><option value="Fulfilled">Fulfilled</option></Form.Select>)} /></Form.Group>
        <Form.Group controlId="fulfillmentDate"><Form.Label>📅 Production Date</Form.Label><Form.Control type="date" {...register("fulfillmentDate")} onChange={(e) => debouncedHandleInputChange("fulfillmentDate", e.target.value)} /></Form.Group>
        <Form.Group controlId="remarksByProduction"><Form.Label>✏️ Remarks by Production</Form.Label><Form.Control as="textarea" rows={2} {...register("remarksByProduction")} onChange={(e) => debouncedHandleInputChange("remarksByProduction", e.target.value)} placeholder="Enter production remarks" /></Form.Group>
        <Form.Group controlId="remarksByAccounts"><Form.Label>✏️ Remarks by Accounts</Form.Label><Form.Control as="textarea" rows={2} {...register("remarksByAccounts")} onChange={(e) => debouncedHandleInputChange("remarksByAccounts", e.target.value)} placeholder="Enter accounts remarks" /></Form.Group>
        <Form.Group controlId="remarksByBilling"><Form.Label>✏️ Remarks by Billing</Form.Label><Form.Control as="textarea" rows={2} {...register("remarksByBilling")} onChange={(e) => debouncedHandleInputChange("remarksByBilling", e.target.value)} placeholder="Enter billing remarks" /></Form.Group>
        <Form.Group controlId="verificationRemarks"><Form.Label>✏️ Verification Remarks</Form.Label><Form.Control as="textarea" rows={2} {...register("verificationRemarks")} onChange={(e) => debouncedHandleInputChange("verificationRemarks", e.target.value)} placeholder="Enter verification remarks" /></Form.Group>
        <Form.Group controlId="remarks"><Form.Label>✏️ Remarks</Form.Label><Form.Control as="textarea" rows={2} {...register("remarks")} onChange={(e) => debouncedHandleInputChange("remarks", e.target.value)} placeholder="Enter remarks" /></Form.Group>
        <Form.Group controlId="productRemarks"><Form.Label>📝 Product Remarks</Form.Label><Form.Control as="textarea" rows={3} {...register("productRemarks")} onChange={(e) => debouncedHandleInputChange("productRemarks", e.target.value)} placeholder="Enter product-related remarks" /></Form.Group>
      </FormSection>
    </Form>
  );

  const renderUpdateForm = () => (
    <Form onSubmit={handleSubmit(onUpdateSubmit)}>
      <FormSection>
        <Form.Group controlId="sostatus"><Form.Label>📋 SO Status</Form.Label><Form.Select value={updateData.sostatus} onChange={handleUpdateInputChange} name="sostatus"><option value="Pending for Approval">Pending for Approval</option><option value="Order Cancelled">Order Cancel</option><option value="Accounts Approved">Accounts Approved</option><option value="Approved">Approved</option></Form.Select></Form.Group>
        <Form.Group controlId="remarks"><Form.Label>✏️ Remarks</Form.Label><Form.Control as="textarea" rows={3} value={updateData.remarks} onChange={handleUpdateInputChange} name="remarks" maxLength={500} placeholder="Enter your remarks here..." /><Form.Text>{updateData.remarks.length}/500</Form.Text></Form.Group>
      </FormSection>
    </Form>
  );

  return (
    <StyledModal show={isOpen} onHide={onClose} centered backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title className="text-center w-100 d-flex align-items-center justify-content-center">
          {view === "options" ? (<><FaCog className="me-2" />Sales Order Management</>) : view === "edit" ? (<><FaEdit className="me-2" />Edit Entry</>) : (<><FaSyncAlt className="me-2" />Update Approvals</>)}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (<Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>)}
        {view === "options" && renderOptions()}
        {view === "edit" && renderEditForm()}
        {view === "update" && renderUpdateForm()}
      </Modal.Body>
      <Modal.Footer>
        <StyledButton variant="danger" onClick={onClose} disabled={loading}>Close</StyledButton>
        {(view === "edit" || view === "update") && (showConfirm ? (
          <>
            <StyledButton variant="warning" onClick={() => setShowConfirm(false)} disabled={loading}>Cancel</StyledButton>
            <StyledButton variant="success" onClick={view === "edit" ? handleSubmit(onEditSubmit) : onUpdateSubmit} disabled={loading}>{loading ? <Spinner as="span" animation="border" size="sm" /> : "Confirm"}</StyledButton>
          </>
        ) : (
          <StyledButton variant="primary" onClick={view === "edit" ? handleSubmit(onEditSubmit) : onUpdateSubmit} disabled={loading}>{loading ? <Spinner as="span" animation="border" size="sm" /> : view === "edit" ? "Save Changes" : "Update"}</StyledButton>
        ))}
      </Modal.Footer>
    </StyledModal>
  );
}

export default EditEntry;
