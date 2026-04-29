import React, { useState, useEffect, useCallback, useMemo } from "react";
import furniApi from "../axiosSetup";
import { toast } from "react-toastify";
import { Spinner } from "react-bootstrap";
import {
  productOptions, statesAndCities, orderTypeOptions, companyOptions,
  ORDER_TYPE_DISPLAY,
  paymentMethodOptions, paymentTermsOptions, salesPersonlist, Reportinglist, dispatchFromOptions,
} from "./Options";
import { getFinancialYear } from "../../shared/financialYear";
import ConfirmModal from "./ConfirmModal";
import { toTitleCase } from "../../shared/textFormatUtils";

function AddEntry({ onSubmit, onClose }) {
  const [selectedState, setSelectedState] = useState("");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [poFile, setPoFile] = useState(null);
  const [pwcFile, setPwcFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState({ productType: "", size: "", spec: "", qty: "", modelNos: "", unitPrice: "", gst: "18", customProduct: "" });
  const [formData, setFormData] = useState({
    soDate: new Date().toISOString().split("T")[0], name: "", city: "", state: "", pinCode: "", contactNo: "", alterno: "",
    customerEmail: "", customername: "", report: "", freightcs: "", freightstatus: "Extra", installchargesstatus: "Extra",
    gstno: "", installation: "", remarks: "", productRemarks: "", salesPerson: "", company: "", shippingAddress: "", billingAddress: "",
    sameAddress: false, orderType: "B2C", paymentCollected: "", paymentMethod: "", paymentDue: "", neftTransactionId: "",
    chequeId: "", gemOrderNumber: "", deliveryDate: "", demoDate: "", paymentTerms: "", pwc: "", creditDays: "", dispatchFrom: "", fulfillingStatus: "Pending",
  });

  // ── Auto-Save ──────────────────────────────────────────────────────────────
  const AUTO_SAVE_KEY = "furniAddEntryDraft";

  const clearDraft = () => {
    try { localStorage.removeItem(AUTO_SAVE_KEY); }
    catch (err) { console.error("Error clearing draft:", err); }
  };

  // Restore draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTO_SAVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData) setFormData((prev) => ({ ...prev, ...parsed.formData }));
        if (parsed.products) setProducts(parsed.products);
        if (parsed.currentProduct) setCurrentProduct(parsed.currentProduct);
        if (parsed.selectedState) setSelectedState(parsed.selectedState);
      }
    } catch (err) { console.error("Error loading draft:", err); }
  }, []);

  // Auto-save with 500ms debounce — mirrors SO AddEntry exactly
  useEffect(() => {
    const handler = setTimeout(() => {
      try {
        localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify({ formData, products, currentProduct, selectedState }));
      } catch (err) { console.error("Error saving draft:", err); }
    }, 500);
    return () => clearTimeout(handler);
  }, [formData, products, currentProduct, selectedState]);

  // handleClose — shows confirm modal if form has data, otherwise closes directly
  const handleClose = () => {
    const hasDraft =
      Object.values(formData).some((v) => v !== "" && v !== false && v !== "Pending") ||
      products.length > 0 ||
      poFile;
    if (hasDraft) {
      setIsConfirmModalOpen(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    clearDraft();
    setIsConfirmModalOpen(false);
    onClose();
  };

  const handleCancelDiscard = () => {
    setIsConfirmModalOpen(false);
    onClose();
  };
  // ── End Auto-Save ──────────────────────────────────────────────────────────

  const gstOptions = useMemo(() => (formData.orderType === "B2G" ? ["18", "including"] : ["18"]), [formData.orderType]);
  const financialYear = useMemo(() => getFinancialYear(formData.soDate), [formData.soDate]);

  const calculateTotal = useCallback(() => {
    const subtotalWithGST = products.reduce((sum, product) => {
      const qty = Number(product.qty) || 0;
      const unitPrice = Number(product.unitPrice) || 0;
      const gstRate = product.gst === "including" ? 0 : Number(product.gst) || 0;
      const base = qty * unitPrice;
      return sum + base + base * (gstRate / 100);
    }, 0);
    return Math.round(subtotalWithGST + (Number(formData.installation) || 0) + (Number(formData.freightcs) || 0));
  }, [products, formData.installation, formData.freightcs]);

  const calculatePaymentDue = useCallback((paymentCollected) => {
    return Number((calculateTotal() - (Number(paymentCollected) || 0)).toFixed(2));
  }, [calculateTotal]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, paymentDue: calculatePaymentDue(Number(prev.paymentCollected) || 0) }));
  }, [products, formData.freightcs, formData.installation, calculatePaymentDue]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Fields that should be formatted to Title Case
    const titleCaseFields = ['customername', 'name', 'billingAddress', 'shippingAddress'];
    
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, sameAddress: checked, shippingAddress: checked ? prev.billingAddress : prev.shippingAddress }));
    } else {
      if (["pinCode", "contactNo", "alterno"].includes(name) && value && !/^\d*$/.test(value)) return;
      if (["freightcs", "installation", "paymentCollected"].includes(name) && value && Number(value) < 0) { toast.error(`${name} cannot be negative`); return; }
      
      // Apply title case formatting for specific fields
      const formattedValue = titleCaseFields.includes(name) ? toTitleCase(value) : value;
      
      setFormData((prev) => ({
        ...prev, [name]: formattedValue,
        ...(name === "billingAddress" && prev.sameAddress ? { shippingAddress: formattedValue } : {}),
        ...(name === "paymentCollected" ? { paymentDue: calculatePaymentDue(Number(value) || 0) } : {}),
        ...(name === "paymentMethod" ? { neftTransactionId: "", chequeId: "" } : {}),
        ...(name === "freightstatus" && value !== "Extra" ? { freightcs: "" } : {}),
        ...(name === "installchargesstatus" && value !== "Extra" ? { installation: "" } : {}),
        ...(name === "paymentTerms" && value !== "Credit" && value !== "Partial Advance" ? { creditDays: "" } : {}),
        ...(name === "paymentTerms" && value !== "Credit" ? { pwc: "" } : {}),
        ...(name === "orderType" && value !== "B2G" ? { gemOrderNumber: "", deliveryDate: "" } : {}),
        ...(name === "dispatchFrom" ? { fulfillingStatus: value === "Morinda" ? "Pending" : "Fulfilled" } : {}),
      }));
    }
  };

  const handleProductChange = (e) => {
    const { name, value } = e.target;
    setCurrentProduct((prev) => {
      if (name === "productType") return { ...prev, productType: value, customProduct: value === "Others" ? prev.customProduct : "", size: "", spec: "", qty: "", modelNos: "", unitPrice: "", gst: "18" };
      if (name === "customProduct") return { ...prev, customProduct: value };
      return { ...prev, [name]: value };
    });
  };

  const addProduct = () => {
    const requiredFields = [
      { name: "productType", value: currentProduct.productType === "Others" ? currentProduct.customProduct : currentProduct.productType, label: currentProduct.productType === "Others" ? "Custom Product" : "Product Type" },
      { name: "qty", value: currentProduct.qty, label: "Quantity" },
      { name: "unitPrice", value: currentProduct.unitPrice, label: "Unit Price" },
      { name: "gst", value: currentProduct.gst, label: "GST" },
    ];
    const missingField = requiredFields.find((field) => !field.value || field.value.toString().trim() === "");
    if (missingField) { toast.error(`Please fill ${missingField.label} field`); return; }
    if (!gstOptions.includes(currentProduct.gst)) { currentProduct.gst = "18"; }
    const newProduct = { productType: currentProduct.productType === "Others" ? currentProduct.customProduct : currentProduct.productType, size: currentProduct.size || "N/A", spec: currentProduct.spec || "N/A", qty: Number(currentProduct.qty), unitPrice: Number(currentProduct.unitPrice), gst: currentProduct.gst, modelNos: currentProduct.modelNos || "" };
    setProducts((prev) => [...prev, newProduct]);
    setCurrentProduct({ productType: "", size: "", spec: "", qty: "", modelNos: "", unitPrice: "", gst: "18", customProduct: "" });
  };

  const removeProduct = (index) => setProducts((prev) => prev.filter((_, i) => i !== index));
  const handleStateChange = (e) => { const state = e.target.value; setSelectedState(state); setFormData((prev) => ({ ...prev, state, city: "" })); };
  const handleCityChange = (e) => setFormData((prev) => ({ ...prev, city: e.target.value }));

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ["application/pdf","image/png","image/jpeg","image/jpg","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
      const allowedExtensions = ["pdf","png","jpg","jpeg","doc","docx","xls","xlsx"];
      const fileExt = file.name.split(".").pop().toLowerCase();
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExt)) {
        setFileError("Invalid file type. Only PDF, PNG, JPG, DOCX, XLS, XLSX are allowed.");
        toast.error("Invalid file type. Only PDF, PNG, JPG, DOCX, XLS, XLSX are allowed.");
        e.target.value = null; setPoFile(null); return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setFileError("File size must be less than 5MB");
        toast.error("File size must be less than 5MB");
        e.target.value = null; setPoFile(null); return;
      }
      setPoFile(file); setFileError("");
    } else {
      setPoFile(null); setFileError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const userRole = localStorage.getItem("furniRole");
    if (!["salesperson", "Admin", "SuperAdmin", "GlobalAdmin"].includes(userRole)) { toast.error("Only Sales or Admin users can create orders"); return; }
    if (!products || products.length === 0) { toast.error("Please add at least one product to the list"); return; }
    if (!formData.customername || !formData.name || !formData.contactNo || !formData.customerEmail) { toast.error("Please fill all required customer details"); return; }
    if (!/^\d{10}$/.test(formData.contactNo)) { toast.error("Contact number must be exactly 10 digits"); return; }
    if (formData.alterno && !/^\d{10}$/.test(formData.alterno)) { toast.error("Alternate contact number must be exactly 10 digits"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) { toast.error("Please enter a valid email address"); return; }
    if (!formData.state || !formData.city || !formData.pinCode) { toast.error("Please fill all required address details"); return; }
    if (!/^\d{6}$/.test(formData.pinCode)) { toast.error("Pin Code must be exactly 6 digits"); return; }
    if (!formData.shippingAddress || !formData.billingAddress) { toast.error("Please fill both billing and shipping addresses"); return; }
    if (formData.orderType === "B2G" && !formData.gemOrderNumber) { toast.error("Please provide GEM Order Number for B2G orders"); return; }
    if (formData.orderType === "Demo" && !formData.demoDate) { toast.error("Please provide Demo Date for Demo orders"); return; }
    if (formData.company === "Others" && formData.customCompany) { formData.company = formData.customCompany; delete formData.customCompany; }
    if (formData.orderType !== "Demo" && !formData.paymentTerms) { toast.error("Please select payment terms"); return; }
    if (formData.paymentTerms === "Credit" && !formData.pwc) { toast.error("Please select PWC option for Credit payment terms"); return; }
    if (formData.paymentTerms === "Credit" && formData.pwc === "Yes" && !pwcFile) { toast.error("Please upload the PWC document"); return; }
    if (!formData.dispatchFrom) { toast.error("Please select a dispatch location"); return; }
    for (const product of products) {
      if (!product.productType || !product.qty || !product.unitPrice || !product.gst) { toast.error("All added products must have product type, quantity, unit price, and GST"); return; }
    }
    const userId = localStorage.getItem("furniUserId");
    const newEntry = {
      ...formData, 
      createdBy: userId,
      products: products.map((p) => ({ productType: p.productType, size: p.size || "N/A", spec: p.spec || "N/A", qty: Number(p.qty), unitPrice: Number(p.unitPrice), gst: String(p.gst), modelNos: p.modelNos ? p.modelNos.split(",").map((s) => s.trim()) : [] })),
      soDate: formData.soDate, total: calculateTotal(), freightcs: formData.freightcs || "", installation: formData.installation || "",
      orderType: formData.orderType, paymentCollected: String(formData.paymentCollected || ""), paymentMethod: formData.paymentMethod || "",
      paymentDue: String(formData.paymentDue), neftTransactionId: String(formData.neftTransactionId || ""), chequeId: String(formData.chequeId || ""),
      remarks: String(formData.remarks || ""), gemOrderNumber: String(formData.gemOrderNumber || ""), deliveryDate: formData.deliveryDate || "",
      demoDate: formData.demoDate || "", paymentTerms: formData.paymentTerms || "", dispatchFrom: formData.dispatchFrom, fulfillingStatus: formData.fulfillingStatus,
      creditDays: formData.creditDays || "",
    };
    try {
      setLoading(true);
      const formDataToSend = new FormData();
      for (const key in newEntry) {
        if (key === "products") {
          // Send products as JSON string
          formDataToSend.append(key, JSON.stringify(newEntry[key]));
        } else if (Array.isArray(newEntry[key])) {
          formDataToSend.append(key, JSON.stringify(newEntry[key]));
        } else {
          formDataToSend.append(key, newEntry[key]);
        }
      }
      if (poFile) formDataToSend.append("poFile", poFile);
      if (pwcFile) formDataToSend.append("pwcFile", pwcFile);
      const response = await furniApi.post("/api/orders", formDataToSend);
      clearDraft();
      onSubmit(response.data);
      onClose();
    } catch (error) {
      console.error("Error submitting order:", error);
      const errorMessage = error.response?.data?.error || error.response?.data?.details?.join(", ") || error.message || "Failed to create order. Please try again.";
      toast.error(errorMessage);
      if (error.response?.status === 403) toast.error("Unauthorized: Insufficient permissions or invalid token");
      else if (error.response?.status === 400) toast.error(`Validation Error: ${JSON.stringify(error.response?.data, null, 2)}`);
      else if (error.response?.status === 413) toast.error("File size too large. Please upload a file smaller than 5MB");
      else if (error.response?.status === 500) toast.error("Server error. Please try again later");
    } finally {
      setLoading(false);
    }
  };

  const orderDetailsFields = [
    { label: "SO Date *", name: "soDate", type: "date", required: true, disabled: true, value: formData.soDate, placeholder: "Select SO Date", ariaLabel: "Sales Order Date" },
    { label: "Financial Year", name: "financialYear", type: "text", disabled: true, value: financialYear, placeholder: "Financial Year", ariaLabel: "Financial Year" },
    { label: "Order Type *", name: "orderType", type: "select", options: orderTypeOptions, required: true, placeholder: "Select Order Type", ariaLabel: "Order Type" },
    { label: "Sales Person", name: "salesPerson", type: "select", options: salesPersonlist, placeholder: "Select Sales Person", ariaLabel: "Sales Person" },
    { label: "Reporting Manager", name: "report", type: "select", options: Reportinglist, placeholder: "Select Reporting Manager", ariaLabel: "Reporting Manager" },
    { label: "Company", name: "company", type: "select", options: companyOptions, placeholder: "Select Company", ariaLabel: "Company" },
    ...(formData.company === "Others" ? [{ label: "Custom Company", name: "customCompany", type: "text", placeholder: "Enter Custom Company", ariaLabel: "Custom Company" }] : []),
    { label: "Dispatch From *", name: "dispatchFrom", type: "select", options: dispatchFromOptions, required: true, placeholder: "Select Dispatch Location", ariaLabel: "Dispatch Location" },
    ...(formData.orderType === "B2G" ? [{ label: "GEM Order Number *", name: "gemOrderNumber", type: "text", required: true, placeholder: "Enter GEM Order Number", ariaLabel: "GEM Order Number" }, { label: "Delivery Date", name: "deliveryDate", type: "date", placeholder: "Select Delivery Date", ariaLabel: "Delivery Date" }] : []),
    ...(formData.orderType === "Demo" ? [{ label: "Demo Date *", name: "demoDate", type: "date", required: true, placeholder: "Select Demo Date", ariaLabel: "Demo Date" }] : []),
  ];

  const customerDetailsFields = [
    { label: "Customer Name *", name: "customername", type: "text", required: true, placeholder: "Enter Customer Name", maxLength: 50, ariaLabel: "Customer Name" },
    { label: "Contact Person Name *", name: "name", type: "text", required: true, placeholder: "Enter Contact Person Name", ariaLabel: "Contact Person Name" },
    { label: "Contact Person No *", name: "contactNo", type: "tel", required: true, inputMode: "numeric", maxLength: 10, placeholder: "e.g. 9876543210", ariaLabel: "Contact Number" },
    { label: "Alternate Contact No", name: "alterno", type: "tel", inputMode: "numeric", maxLength: 10, placeholder: "e.g. 9876543210", ariaLabel: "Alternate Contact Number" },
    { label: "Customer Email *", name: "customerEmail", type: "email", required: true, placeholder: "e.g. example@domain.com", ariaLabel: "Customer Email" },
    { label: "GST NO.", name: "gstno", type: "text", placeholder: "Enter GST NO.", ariaLabel: "GST Number" },
  ];

  const addressDetailsFields = [
    { label: "State *", name: "state", type: "select", options: Object.keys(statesAndCities), onChange: handleStateChange, required: true, placeholder: "Select State", ariaLabel: "State" },
    { label: "City", name: "city", type: "select", options: selectedState ? statesAndCities[selectedState] : [], onChange: handleCityChange, disabled: !selectedState, required: true, placeholder: "Select City", ariaLabel: "City" },
    { label: "Pin Code *", name: "pinCode", type: "tel", required: true, inputMode: "numeric", placeholder: "e.g. 110001", maxLength: 6, pattern: "[0-9]*", ariaLabel: "Pin Code" },
    { label: "Billing Address *", name: "billingAddress", type: "text", required: true, placeholder: "Enter Billing Address", ariaLabel: "Billing Address" },
    { label: "Same as Billing", name: "sameAddress", type: "checkbox", ariaLabel: "Same as Billing Address" },
    { label: "Shipping Address *", name: "shippingAddress", disabled: formData.sameAddress, type: "text", required: true, placeholder: "Enter Shipping Address", ariaLabel: "Shipping Address" },
  ];

  const additionalChargesFields = [
    { label: "Freight Status", name: "freightstatus", type: "select", options: ["Self-Pickup", "To Pay", "Including", "Extra"], placeholder: "Select status", ariaLabel: "Freight Status" },
    { label: "Installation Charges Status", name: "installchargesstatus", type: "select", options: ["To Pay", "Including", "Extra", "Not in Scope"], placeholder: "Select status", ariaLabel: "Installation Charges Status" },
    { label: "Freight Charges", name: "freightcs", type: "tel", inputMode: "numeric", pattern: "[0-9]*", placeholder: "e.g. 2000", disabled: formData.freightstatus !== "Extra", ariaLabel: "Freight Charges" },
    { label: "Installation Charges", name: "installation", type: "tel", inputMode: "numeric", pattern: "[0-9]*", placeholder: "e.g. 1000", disabled: formData.installchargesstatus !== "Extra", ariaLabel: "Installation Charges" },
  ];

  const inputStyle = { padding: "0.75rem", border: "1px solid #e2e8f0", borderRadius: "0.75rem", backgroundColor: "#f8fafc", fontSize: "1rem", color: "#1e293b" };
  const disabledInputStyle = { ...inputStyle, backgroundColor: "#e5e7eb", cursor: "not-allowed" };
  const sectionHeadingStyle = { fontSize: "1.5rem", background: "linear-gradient(135deg, #2575fc, #6a11cb)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: "700", marginBottom: "1rem", letterSpacing: "1px", textShadow: "1px 1px 2px rgba(0, 0, 0, 0.05)" };
  const labelStyle = { fontSize: "0.9rem", fontWeight: "600", color: "#475569", marginBottom: "0.5rem" };
  const gridStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" };

  return (
    <>
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onConfirm={handleConfirmDiscard}
        onCancel={handleCancelDiscard}
        message="You have unsaved changes. Do you want to discard the draft?"
      />
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(71, 85, 105, 0.8))", backdropFilter: "blur(4px)", zIndex: 999, opacity: 0, animation: "fadeIn 0.4s ease forwards" }} onClick={handleClose} aria-label="Close modal"></div>
      <div className="modal-container" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "#ffffff", borderRadius: "1.25rem", boxShadow: "0 15px 40px rgba(0, 0, 0, 0.25), 0 5px 15px rgba(0, 0, 0, 0.1)", zIndex: 1000, maxHeight: "85vh", width: "90%", maxWidth: "1100px", fontFamily: "'Poppins', sans-serif", opacity: 0, animation: "slideUp 0.4s ease forwards", overflow: "visible" }}>
        <div className="modal-scroll-inner" style={{ overflowY: "auto", overflowX: "visible", maxHeight: "85vh", padding: "2rem", borderRadius: "1.25rem", background: "#ffffff" }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "2.2rem", fontWeight: "700", background: "linear-gradient(135deg, #2575fc, #6a11cb)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "1px", textShadow: "1px 1px 3px rgba(0, 0, 0, 0.05)", marginBottom: "1rem" }}>📝 Add Furniture Order</h2>
          <button onClick={handleClose} style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", cursor: "pointer", color: "#64748b", zIndex: 1001 }} aria-label="Close modal">
            <svg style={{ width: "1.75rem", height: "1.75rem" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="form-container" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2rem" }}>
          {/* Order Details */}
          <div>
            <h3 style={sectionHeadingStyle}>📋 Order Details</h3>
            <div className="grid-section" style={gridStyle}>
              {orderDetailsFields.map((field) => (
                <div key={field.name} style={{ display: "flex", flexDirection: "column" }}>
                  <label style={labelStyle}>{field.label}{field.required && <span style={{ color: "#f43f5e" }}>*</span>}</label>
                  {field.type === "select" ? (
                    <select name={field.name} value={formData[field.name] || ""} onChange={field.onChange || handleChange} required={field.required} disabled={field.disabled || false} style={field.disabled ? disabledInputStyle : inputStyle} aria-label={field.ariaLabel}>
                      <option value="">{field.placeholder}</option>
                      {field.options.map((option) => <option key={option} value={option}>{field.name === "orderType" ? (ORDER_TYPE_DISPLAY[option] || option) : option}</option>)}
                    </select>
                  ) : (
                    <input type={field.type} name={field.name} value={field.value || formData[field.name] || ""} onChange={field.disabled ? undefined : handleChange} required={field.required} placeholder={field.placeholder} disabled={field.disabled || false} style={field.disabled ? disabledInputStyle : inputStyle} aria-label={field.ariaLabel} aria-required={field.required} />
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* Customer Details */}
          <div>
            <h3 style={sectionHeadingStyle}>👤 Customer Details</h3>
            <div className="grid-section" style={gridStyle}>
              {customerDetailsFields.map((field) => (
                <div key={field.name} style={{ display: "flex", flexDirection: "column" }}>
                  <label style={labelStyle}>{field.label}{field.required && <span style={{ color: "#f43f5e" }}>*</span>}</label>
                  <input type={field.type} name={field.name} value={formData[field.name] || ""} onChange={handleChange} maxLength={field.maxLength} inputMode={field.inputMode} placeholder={field.placeholder} required={field.required} style={inputStyle} aria-label={field.ariaLabel} aria-required={field.required} />
                </div>
              ))}
            </div>
          </div>
          {/* Address Details */}
          <div>
            <h3 style={sectionHeadingStyle}>📍 Address Details</h3>
            <div className="grid-section" style={gridStyle}>
              {addressDetailsFields.map((field) => (
                <div key={field.name} style={{ display: "flex", flexDirection: "column" }}>
                  <label style={labelStyle}>{field.label}{field.required && <span style={{ color: "#f43f5e" }}>*</span>}</label>
                  {field.type === "select" ? (
                    <select name={field.name} value={formData[field.name] || ""} onChange={field.onChange || handleChange} disabled={field.disabled} required={field.required} style={field.disabled ? disabledInputStyle : inputStyle} aria-label={field.ariaLabel} aria-required={field.required}>
                      <option value="">{field.placeholder}</option>
                      {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : field.type === "checkbox" ? (
                    <input type="checkbox" name={field.name} checked={formData[field.name] || false} onChange={handleChange} style={{ width: "1.25rem", height: "1.25rem", accentColor: "#6366f1" }} aria-label={field.ariaLabel} />
                  ) : (
                    <input type={field.type} name={field.name} value={formData[field.name] || ""} onChange={(e) => { const value = e.target.value; if (field.name === "pinCode" && value && !/^\d*$/.test(value)) return; (field.onChange || handleChange)(e); }} disabled={field.disabled} inputMode={field.inputMode} placeholder={field.placeholder} maxLength={field.maxLength} pattern={field.pattern} required={field.required} style={{ ...inputStyle, ...(field.disabled ? { backgroundColor: "#e5e7eb" } : {}), ...(formData[field.name] && field.name === "pinCode" && !/^\d{6}$/.test(formData[field.name]) ? { borderColor: "red" } : {}) }} aria-label={field.ariaLabel} aria-required={field.required} />
                  )}
                  {formData[field.name] && field.name === "pinCode" && !/^\d{6}$/.test(formData[field.name]) && (<span style={{ color: "red", fontSize: "0.8rem", marginTop: "0.25rem" }}>Pin Code must be exactly 6 digits</span>)}
                </div>
              ))}
            </div>
          </div>
          {/* Add Products */}
          <div style={{ margin: "1rem 0.5rem", padding: "0 0.5rem" }}>
            <h3 style={{ fontSize: "calc(1.2rem + 0.5vw)", background: "linear-gradient(135deg, #2575fc, #6a11cb)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: "700", marginBottom: "1rem", letterSpacing: "1px", textShadow: "1px 1px 2px rgba(0, 0, 0, 0.05)" }}>✨ Add Products</h3>
            <div className="product-grid" style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ fontSize: "calc(0.9rem + 0.2vw)", fontWeight: "600", color: "#475569", marginBottom: "0.5rem", display: "block" }}>Product <span style={{ color: "#f43f5e" }}>*</span></label>
                <select name="productType" value={currentProduct.productType} onChange={handleProductChange} style={{ width: "100%", padding: "0.75rem", border: "1px solid #e2e8f0", borderRadius: "0.75rem", backgroundColor: "#f8fafc", fontSize: "calc(0.9rem + 0.2vw)", color: "#1e293b" }} aria-label="Product Type" aria-required="true">
                  <option value="">Select Product Type</option>
                  {productOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              {currentProduct.productType === "Others" && (
                <div>
                  <label style={{ fontSize: "calc(0.9rem + 0.2vw)", fontWeight: "600", color: "#475569", marginBottom: "0.5rem", display: "block" }}>Custom Product <span style={{ color: "#f43f5e" }}>*</span></label>
                  <input type="text" name="customProduct" value={currentProduct.customProduct || ""} onChange={handleProductChange} placeholder="Enter Custom Product" style={{ width: "100%", padding: "0.75rem", border: "1px solid #e2e8f0", borderRadius: "0.75rem", backgroundColor: "#f8fafc", fontSize: "calc(0.9rem + 0.2vw)", color: "#1e293b" }} aria-label="Custom Product" aria-required="true" />
                </div>
              )}
              {[{ name: "size", label: "Size", placeholder: "Enter Size", ariaLabel: "Product Size" }, { name: "spec", label: "Specification", placeholder: "Enter Specification", ariaLabel: "Product Specification" }, { name: "qty", label: "Quantity", placeholder: "", ariaLabel: "Product Quantity", required: true }, { name: "unitPrice", label: "Unit Price", placeholder: "", ariaLabel: "Unit Price", required: true }, { name: "modelNos", label: "Model Nos", placeholder: "Enter Model Numbers", ariaLabel: "Model Numbers" }].map((f) => (
                <div key={f.name}>
                  <label style={{ fontSize: "calc(0.9rem + 0.2vw)", fontWeight: "600", color: "#475569", marginBottom: "0.5rem", display: "block" }}>{f.label}{f.required && <span style={{ color: "#f43f5e" }}>*</span>}</label>
                  <input type="text" name={f.name} value={currentProduct[f.name]} onChange={handleProductChange} placeholder={f.placeholder} style={{ width: "100%", padding: "0.75rem", border: "1px solid #e2e8f0", borderRadius: "0.75rem", backgroundColor: "#f8fafc", fontSize: "calc(0.9rem + 0.2vw)", color: "#1e293b" }} aria-label={f.ariaLabel} aria-required={f.required} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: "calc(0.9rem + 0.2vw)", fontWeight: "600", color: "#475569", marginBottom: "0.5rem", display: "block" }}>GST</label>
                <input type="text" value="18%" disabled style={{ width: "100%", padding: "0.75rem", border: "1px solid #e2e8f0", borderRadius: "0.75rem", backgroundColor: "#e5e7eb", fontSize: "calc(0.9rem + 0.2vw)", color: "#1e293b", cursor: "not-allowed" }} aria-label="GST Rate" />
              </div>
              <div style={{ alignSelf: "stretch", marginTop: "32px" }}>
                <button type="button" onClick={addProduct} style={{ width: "100%", padding: "0.75rem", background: "linear-gradient(135deg, #7c3aed, #3b82f6)", color: "#ffffff", border: "none", borderRadius: "0.75rem", cursor: "pointer", fontSize: "calc(0.9rem + 0.2vw)", fontWeight: "600", transition: "transform 0.1s ease, background 0.2s ease" }} aria-label="Add Product">Add +</button>
              </div>
            </div>
            {/* Product Remarks — single shared field below all product inputs */}
            <div style={{ marginTop: "0.75rem" }}>
              <label style={{ fontSize: "calc(0.9rem + 0.2vw)", fontWeight: "600", color: "#475569", marginBottom: "0.5rem", display: "block" }}>Product Remarks</label>
              <textarea
                name="productRemarks"
                value={formData.productRemarks}
                onChange={handleChange}
                placeholder="Enter product-related remarks (raw material, color, specific requirements, etc.)"
                rows={3}
                style={{ width: "100%", padding: "0.75rem", border: "1px solid #e2e8f0", borderRadius: "0.75rem", backgroundColor: "#f8fafc", fontSize: "calc(0.9rem + 0.2vw)", color: "#1e293b", resize: "vertical", fontFamily: "inherit" }}
                aria-label="Product Remarks"
              />
            </div>
            {products.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <h4 style={{ fontSize: "calc(1rem + 0.2vw)", color: "#475569", marginBottom: "0.75rem" }}>Added Products:</h4>
                <div style={{ maxHeight: "calc(40vh)", overflowY: "auto", scrollBehavior: "smooth", border: "1px solid #e2e8f0", borderRadius: "0.75rem", padding: "0.5rem", background: "#fff" }}>
                  {products.map((product, index) => (
                    <div key={index} style={{ display: "flex", alignItems: "center", gap: "1.5rem", padding: "0.6rem 0.75rem", background: "#f1f5f9", borderRadius: "0.5rem", marginBottom: "0.5rem", flexWrap: "nowrap", overflowX: "auto", transition: "background 0.2s ease" }} onMouseOver={(e) => (e.currentTarget.style.background = "#e2e8f0")} onMouseOut={(e) => (e.currentTarget.style.background = "#f1f5f9")}>
                      <span style={{ fontSize: "0.9rem", color: "#1e293b", whiteSpace: "nowrap", minWidth: "120px" }}>Type: {product.productType}</span>
                      <span style={{ fontSize: "0.9rem", color: "#1e293b", whiteSpace: "nowrap" }}>Size: {product.size || "N/A"}</span>
                      <span style={{ fontSize: "0.9rem", color: "#1e293b", whiteSpace: "nowrap" }}>Spec: {product.spec || "N/A"}</span>
                      <span style={{ fontSize: "0.9rem", color: "#1e293b", whiteSpace: "nowrap" }}>Qty: {product.qty}</span>
                      <span style={{ fontSize: "0.9rem", color: "#1e293b", whiteSpace: "nowrap" }}>₹{product.unitPrice}</span>
                      <span style={{ fontSize: "0.9rem", color: "#1e293b", whiteSpace: "nowrap" }}>GST: {product.gst}</span>
                      <span style={{ fontSize: "0.9rem", color: "#1e293b", whiteSpace: "nowrap" }}>Model: {product.modelNos || "N/A"}</span>
                      <button type="button" onClick={() => removeProduct(index)} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", whiteSpace: "nowrap", marginLeft: "auto", flexShrink: 0 }} aria-label={`Remove product ${product.productType}`}>Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <style>{`
              @media (min-width: 768px) {
                div.product-grid {
                  display: grid !important;
                  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) !important;
                  gap: 1rem !important;
                  margin-bottom: 1.5rem !important;
                }
              }
              @media (min-width: 480px) and (max-width: 767px) {
                div.product-grid {
                  display: grid !important;
                  grid-template-columns: 1fr 1fr !important;
                  gap: 0.75rem !important;
                }
              }
              @media (max-width: 479px) {
                div.product-grid {
                  display: grid !important;
                  grid-template-columns: 1fr 1fr !important;
                  gap: 0.65rem !important;
                }
              }
              @media (max-width: 360px) {
                div.product-grid {
                  grid-template-columns: 1fr !important;
                }
              }
            `}</style>
          </div>
          {/* Additional Charges */}
          <div>
            <h3 style={{ fontSize: "1.5rem", background: "linear-gradient(135deg, #2575fc, #6a11cb)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: "700", marginBottom: "1rem", letterSpacing: "1px", textShadow: "1px 1px 2px rgba(0, 0, 0, 0.05)" }}>💸 Additional Charges</h3>
            <div className="grid-section" style={gridStyle}>
              {additionalChargesFields.map((field) => (
                <div key={field.name} style={{ display: "flex", flexDirection: "column" }}>
                  <label style={labelStyle}>{field.label}</label>
                  {field.type === "select" ? (
                    <select name={field.name} value={formData[field.name] || "Extra"} onChange={handleChange} style={inputStyle} aria-label={field.ariaLabel}>
                      {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : (
                    <input type={field.type} name={field.name} value={formData[field.name] || ""} onChange={(e) => { handleChange(e); if (["freightcs", "installation"].includes(field.name)) { setFormData((prev) => ({ ...prev, paymentDue: calculatePaymentDue(Number(prev.paymentCollected) || 0) })); } }} onKeyPress={(e) => { if (!/[0-9]/.test(e.key)) e.preventDefault(); }} placeholder={field.placeholder} disabled={field.disabled} style={field.disabled ? disabledInputStyle : inputStyle} aria-label={field.ariaLabel} />
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* Payment Details */}
          <div>
            <h3 style={{ fontSize: "1.5rem", background: "linear-gradient(135deg, #2575fc, #6a11cb)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: "700", marginBottom: "1rem", letterSpacing: "1px", textShadow: "1px 1px 2px rgba(0, 0, 0, 0.05)" }}>💰 Payment Details</h3>
            <div className="grid-section" style={{ ...gridStyle, alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={labelStyle}>Total Amount</label>
                  <div style={{ padding: "0.75rem", backgroundColor: "#f1f5f9", borderRadius: "0.75rem", fontSize: "1rem", color: "#1e293b", fontWeight: "600" }} aria-label="Total Amount">₹ {calculateTotal()}</div>
                </div>
                <div>
                  <label style={labelStyle}>Payment Collected</label>
                  <input type="text" name="paymentCollected" value={formData.paymentCollected} onChange={handleChange} disabled={formData.orderType === "Demo"} min="0" style={{ width: "100%", ...(formData.orderType === "Demo" ? disabledInputStyle : inputStyle) }} aria-label="Payment Collected" />
                </div>
                <div>
                  <label style={labelStyle}>Payment Due</label>
                  <input type="number" name="paymentDue" value={formData.paymentDue} readOnly disabled style={{ width: "100%", ...disabledInputStyle }} aria-label="Payment Due" />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={labelStyle}>Payment Terms {formData.orderType !== "Demo" && <span style={{ color: "#dc2626" }}>*</span>}</label>
                  <select name="paymentTerms" value={formData.paymentTerms} onChange={handleChange} disabled={formData.orderType === "Demo"} required={formData.orderType !== "Demo"} style={{ width: "100%", ...(formData.orderType === "Demo" ? disabledInputStyle : inputStyle), appearance: "auto" }} aria-label="Payment Terms" aria-required={formData.orderType !== "Demo"}>
                    <option value="" disabled>Select Terms</option>
                    {paymentTermsOptions.map((term) => <option key={term} value={term}>{term}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Payment Method</label>
                  <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} disabled={formData.orderType === "Demo" || formData.paymentTerms === "Credit"} style={{ width: "100%", ...(formData.orderType === "Demo" || formData.paymentTerms === "Credit" ? disabledInputStyle : inputStyle), appearance: "auto" }} aria-label="Payment Method">
                    <option value="">Select Method</option>
                    {paymentMethodOptions.map((method) => <option key={method} value={method}>{method}</option>)}
                  </select>
                </div>
                {formData.paymentMethod === "NEFT" && (
                  <div>
                    <label style={labelStyle}>NEFT Transaction ID</label>
                    <input type="text" name="neftTransactionId" value={formData.neftTransactionId} onChange={handleChange} placeholder="Enter NEFT Transaction ID" disabled={formData.orderType === "Demo"} style={{ width: "100%", ...(formData.orderType === "Demo" ? disabledInputStyle : inputStyle) }} aria-label="NEFT Transaction ID" />
                  </div>
                )}
                {formData.paymentMethod === "Cheque" && (
                  <div>
                    <label style={labelStyle}>Cheque Number</label>
                    <input type="text" name="chequeId" value={formData.chequeId} onChange={handleChange} placeholder="Enter Cheque Number" disabled={formData.orderType === "Demo"} style={{ width: "100%", ...(formData.orderType === "Demo" ? disabledInputStyle : inputStyle) }} aria-label="Cheque ID" />
                  </div>
                )}
                {(formData.paymentTerms === "Credit" || formData.paymentTerms === "Partial Advance") && (
                  <div>
                    <label style={labelStyle}>No. of Credit Days <span style={{ color: "#dc2626" }}>*</span></label>
                    <select name="creditDays" value={formData.creditDays} onChange={handleChange} required style={{ width: "100%", ...inputStyle, appearance: "auto" }} aria-label="Credit Days">
                      <option value="" disabled>-- Select Credit Days --</option>
                      <option value="7">7 Days</option>
                      <option value="15">15 Days</option>
                      <option value="30">30 Days</option>
                    </select>
                  </div>
                )}
                {formData.paymentTerms === "Credit" && (
                  <div>
                    <label style={labelStyle}>PWC <span style={{ color: "#dc2626" }}>*</span></label>
                    <select name="pwc" value={formData.pwc} onChange={handleChange} style={{ width: "100%", ...inputStyle, appearance: "auto" }} aria-label="PWC">
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                )}
                {formData.paymentTerms === "Credit" && formData.pwc === "Yes" && (
                  <div>
                    <label style={labelStyle}>Upload PWC Document <span style={{ color: "#dc2626" }}>*</span></label>
                    <div style={{ display: "flex", alignItems: "center", border: `1px solid ${pwcFile ? "#22c55e" : "#e2e8f0"}`, borderRadius: "0.75rem", backgroundColor: "#f8fafc", padding: "0.5rem", width: "100%", height: "2.75rem", boxSizing: "border-box", overflow: "hidden" }}>
                      <label htmlFor="furniPwcFile" style={{ flex: 1, padding: "0.5rem 0.75rem", background: "linear-gradient(135deg, #e2e8f0, #f8fafc)", borderRadius: "0.5rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.95rem", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", height: "100%" }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                          {pwcFile ? pwcFile.name : "Upload PWC (PDF, PNG, JPG, DOCX)"}
                        </span>
                      </label>
                      <input id="furniPwcFile" type="file" accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.xls" onChange={(e) => setPwcFile(e.target.files[0] || null)} style={{ display: "none" }} />
                      {pwcFile && (
                        <button type="button" onClick={() => { setPwcFile(null); document.getElementById("furniPwcFile").value = null; }} style={{ padding: "0.5rem", background: "none", border: "none", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }} title="Remove File">
                          <svg style={{ width: "1.25rem", height: "1.25rem" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* PO File Attachment */}
          <div>
            <h3 style={sectionHeadingStyle}>📎 Attachment (Optional)</h3>
            <div style={{ display: "flex", alignItems: "center", border: "1px solid #e2e8f0", borderRadius: "0.75rem", backgroundColor: "#f8fafc", padding: "0.5rem", transition: "border-color 0.3s ease", width: "100%", maxWidth: "400px", height: "2.75rem", boxSizing: "border-box", overflow: "hidden" }}>
              <label htmlFor="furniPoFile" style={{ flex: 1, padding: "0.5rem 0.75rem", background: "linear-gradient(135deg, #e2e8f0, #f8fafc)", borderRadius: "0.5rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.95rem", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", height: "100%" }}
                onMouseOver={(e) => (e.currentTarget.style.background = "linear-gradient(135deg, #d1d5db, #e5e7eb)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "linear-gradient(135deg, #e2e8f0, #f8fafc)")}>
                <svg style={{ width: "1.25rem", height: "1.25rem", color: "#6366f1", flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V8m0 0l-4 4m4-4l4 4m6-4v8m0 0l4-4m-4 4l-4-4" />
                </svg>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                  {poFile ? poFile.name : "Upload Attachment (PDF, PNG, JPG, DOCX, XLS, XLSX)"}
                </span>
              </label>
              <input id="furniPoFile" type="file" name="poFile" accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.xls" onChange={handleFileChange} style={{ display: "none" }} />
              {poFile && (
                <button type="button" onClick={() => { setPoFile(null); setFileError(""); document.getElementById("furniPoFile").value = null; }} style={{ padding: "0.5rem", background: "none", border: "none", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }} title="Remove File">
                  <svg style={{ width: "1.25rem", height: "1.25rem" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
            {fileError && <p style={{ color: "#ef4444", fontSize: "0.85rem", marginTop: "0.25rem" }}>{fileError}</p>}
          </div>
          {/* Form Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
            <button type="button" onClick={handleClose} style={{ padding: "0.75rem 1.5rem", backgroundColor: "#e2e8f0", color: "#475569", border: "none", borderRadius: "0.75rem", cursor: "pointer" }} aria-label="Cancel">Cancel</button>
            <button type="submit" disabled={loading} style={{ padding: "0.75rem 1.5rem", background: "linear-gradient(135deg, #7c3aed, #3b82f6)", color: "#ffffff", border: "none", borderRadius: "0.75rem", cursor: loading ? "not-allowed" : "pointer" }} aria-label="Submit Order">{loading ? <Spinner animation="border" size="sm" /> : "Submit"}</button>
          </div>
        </form>
        </div>
      </div>
      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translate(-50%, -40%); } to { opacity: 1; transform: translate(-50%, -50%); } }

        /* ── Scrollbar (on inner scroll wrapper) ── */
        .modal-scroll-inner::-webkit-scrollbar { width: 6px; }
        .modal-scroll-inner::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .modal-scroll-inner::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 10px; }
        .modal-scroll-inner::-webkit-scrollbar-thumb:hover { background: #64748b; }

        /* ── Base (all sizes) ── */
        .modal-container *,
        .modal-container *::before,
        .modal-container *::after { box-sizing: border-box; }

        .modal-container input,
        .modal-container select,
        .modal-container textarea { max-width: 100%; }

        /* ── Overflow: outer clips nothing, inner scrolls ── */
        .modal-container { overflow: visible; }
        .modal-scroll-inner { overflow-x: visible; overflow-y: auto; }
        .form-container { overflow: visible; }
        .grid-section { overflow: visible; padding-bottom: 4px; }
        .form-container > div { overflow: visible; }

        /* ── Large screens ≥ 1400px ── */
        @media (min-width: 1400px) {
          .modal-container { max-width: 1200px !important; }
          .modal-scroll-inner { padding: 2.5rem !important; }
          .grid-section { grid-template-columns: 1fr 1fr !important; gap: 1.75rem !important; }
        }

        /* ── Desktop 1024px – 1399px ── */
        @media (min-width: 1024px) and (max-width: 1399px) {
          .modal-container { max-width: 1100px !important; width: 92% !important; }
          .modal-scroll-inner { padding: 2rem !important; }
          .grid-section { grid-template-columns: 1fr 1fr !important; gap: 1.5rem !important; }
        }

        /* ── Tablet landscape 768px – 1023px ── */
        @media (min-width: 768px) and (max-width: 1023px) {
          .modal-container { width: 96% !important; max-width: 960px !important; max-height: 88vh !important; }
          .modal-scroll-inner { padding: 1.5rem !important; max-height: 88vh !important; }
          .grid-section { grid-template-columns: 1fr 1fr !important; gap: 1.25rem !important; }
          .modal-container h2 { font-size: 1.9rem !important; }
          .modal-container h3 { font-size: 1.3rem !important; }
          .modal-container input, .modal-container select { font-size: 0.95rem !important; padding: 0.7rem !important; }
        }

        /* ── Tablet portrait 480px – 767px ── */
        @media (min-width: 480px) and (max-width: 767px) {
          .modal-container { width: 97% !important; max-width: 100% !important; max-height: 92vh !important; border-radius: 1rem !important; }
          .modal-scroll-inner { padding: 1.25rem !important; max-height: 92vh !important; border-radius: 1rem !important; }
          .form-container { gap: 1.5rem !important; }
          .grid-section { grid-template-columns: 1fr 1fr !important; gap: 1rem !important; }
          .modal-container h2 { font-size: 1.6rem !important; }
          .modal-container h3 { font-size: 1.15rem !important; }
          .modal-container label { font-size: 0.85rem !important; }
          .modal-container input, .modal-container select { font-size: 0.9rem !important; padding: 0.65rem !important; }
          .modal-container button[type="button"], .modal-container button[type="submit"] { padding: 0.65rem 1.25rem !important; font-size: 0.9rem !important; }
        }

        /* ── Mobile ≤ 479px ── */
        @media (max-width: 479px) {
          .modal-container { width: 100% !important; max-width: 100% !important; max-height: 95vh !important; border-radius: 0.875rem !important; }
          .modal-scroll-inner { padding: 1rem 0.875rem !important; max-height: 95vh !important; border-radius: 0.875rem !important; }
          .form-container { gap: 1.25rem !important; }
          .grid-section { grid-template-columns: 1fr !important; gap: 0.875rem !important; }
          .modal-container h2 { font-size: 1.4rem !important; letter-spacing: 0.5px !important; }
          .modal-container h3 { font-size: 1.05rem !important; letter-spacing: 0.5px !important; }
          .modal-container label { font-size: 0.82rem !important; }
          .modal-container input, .modal-container select { font-size: 0.875rem !important; padding: 0.6rem 0.75rem !important; border-radius: 0.625rem !important; }
          .modal-container button[type="button"], .modal-container button[type="submit"] { padding: 0.6rem 1rem !important; font-size: 0.875rem !important; }
          .file-upload-box { max-width: 100% !important; }
          .modal-scroll-inner > form > div:last-child { flex-direction: column-reverse !important; align-items: stretch !important; }
          .modal-scroll-inner > form > div:last-child button { width: 100% !important; text-align: center !important; }
        }

        /* ── Very small phones ≤ 360px ── */
        @media (max-width: 360px) {
          .modal-scroll-inner { padding: 0.875rem 0.75rem !important; }
          .modal-container h2 { font-size: 1.25rem !important; }
          .modal-container h3 { font-size: 1rem !important; }
          .modal-container input, .modal-container select { font-size: 0.82rem !important; padding: 0.55rem 0.65rem !important; }
        }

        /* ── File upload box full-width on small screens ── */
        @media (max-width: 767px) {
          .file-upload-box { max-width: 100% !important; }
        }
      `}</style>
    </>
  );
}

export default AddEntry;
