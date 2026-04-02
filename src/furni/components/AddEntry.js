import React, { useState, useEffect, useCallback, useMemo } from "react";
import furniApi from "../axiosSetup";
import { toast } from "react-toastify";
import { Spinner } from "react-bootstrap";
import {
  productOptions, statesAndCities, orderTypeOptions, companyOptions,
  paymentMethodOptions, paymentTermsOptions, salesPersonlist, Reportinglist, dispatchFromOptions,
} from "./Options";
import { getFinancialYear } from "../../shared/financialYear";

function AddEntry({ onSubmit, onClose }) {
  const [selectedState, setSelectedState] = useState("");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [currentProduct, setCurrentProduct] = useState({ productType: "", size: "", spec: "", qty: "", modelNos: "", unitPrice: "", gst: "", customProduct: "" });
  const [formData, setFormData] = useState({
    soDate: new Date().toISOString().split("T")[0], name: "", city: "", state: "", pinCode: "", contactNo: "", alterno: "",
    customerEmail: "", customername: "", report: "", freightcs: "", freightstatus: "Extra", installchargesstatus: "Extra",
    gstno: "", installation: "", remarks: "", salesPerson: "", company: "", shippingAddress: "", billingAddress: "",
    sameAddress: false, orderType: "B2C", paymentCollected: "", paymentMethod: "", paymentDue: "", neftTransactionId: "",
    chequeId: "", gemOrderNumber: "", deliveryDate: "", demoDate: "", paymentTerms: "", dispatchFrom: "", fulfillingStatus: "Pending",
  });

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
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, sameAddress: checked, shippingAddress: checked ? prev.billingAddress : prev.shippingAddress }));
    } else {
      if (["pinCode", "contactNo", "alterno"].includes(name) && value && !/^\d*$/.test(value)) return;
      if (["freightcs", "installation", "paymentCollected"].includes(name) && value && Number(value) < 0) { toast.error(`${name} cannot be negative`); return; }
      setFormData((prev) => ({
        ...prev, [name]: value,
        ...(name === "billingAddress" && prev.sameAddress ? { shippingAddress: value } : {}),
        ...(name === "paymentCollected" ? { paymentDue: calculatePaymentDue(Number(value) || 0) } : {}),
        ...(name === "paymentMethod" ? { neftTransactionId: "", chequeId: "" } : {}),
        ...(name === "freightstatus" && value !== "Extra" ? { freightcs: "" } : {}),
        ...(name === "installchargesstatus" && value !== "Extra" ? { installation: "" } : {}),
        ...(name === "orderType" && value !== "B2G" ? { gemOrderNumber: "", deliveryDate: "" } : {}),
        ...(name === "dispatchFrom" ? { fulfillingStatus: value === "Morinda" ? "Pending" : "Fulfilled" } : {}),
      }));
    }
  };

  const handleProductChange = (e) => {
    const { name, value } = e.target;
    setCurrentProduct((prev) => {
      if (name === "productType") return { ...prev, productType: value, customProduct: value === "Others" ? prev.customProduct : "", size: "", spec: "", qty: "", modelNos: "", unitPrice: "", gst: "" };
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
    if (!gstOptions.includes(currentProduct.gst)) { toast.error(`GST must be one of: ${gstOptions.join(", ")}`); return; }
    const newProduct = { productType: currentProduct.productType === "Others" ? currentProduct.customProduct : currentProduct.productType, size: currentProduct.size || "N/A", spec: currentProduct.spec || "N/A", qty: Number(currentProduct.qty), unitPrice: Number(currentProduct.unitPrice), gst: currentProduct.gst, modelNos: currentProduct.modelNos || "" };
    setProducts((prev) => [...prev, newProduct]);
    setCurrentProduct({ productType: "", size: "", spec: "", qty: "", modelNos: "", unitPrice: "", gst: "", customProduct: "" });
  };

  const removeProduct = (index) => setProducts((prev) => prev.filter((_, i) => i !== index));
  const handleStateChange = (e) => { const state = e.target.value; setSelectedState(state); setFormData((prev) => ({ ...prev, state, city: "" })); };
  const handleCityChange = (e) => setFormData((prev) => ({ ...prev, city: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const userRole = localStorage.getItem("furniRole");
    if (!["salesperson", "Admin", "SuperAdmin"].includes(userRole)) { toast.error("Only Sales or Admin users can create orders"); return; }
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
    if (!formData.dispatchFrom) { toast.error("Please select a dispatch location"); return; }
    for (const product of products) {
      if (!product.productType || !product.qty || !product.unitPrice || !product.gst) { toast.error("All added products must have product type, quantity, unit price, and GST"); return; }
    }
    const userId = localStorage.getItem("furniUserId");
    const newEntry = {
      ...formData, createdBy: userId,
      products: products.map((p) => ({ productType: p.productType, size: p.size || "N/A", spec: p.spec || "N/A", qty: Number(p.qty), unitPrice: Number(p.unitPrice), gst: String(p.gst), modelNos: p.modelNos ? p.modelNos.split(",").map((s) => s.trim()) : [] })),
      soDate: formData.soDate, total: calculateTotal(), freightcs: formData.freightcs || "", installation: formData.installation || "",
      orderType: formData.orderType, paymentCollected: String(formData.paymentCollected || ""), paymentMethod: formData.paymentMethod || "",
      paymentDue: String(formData.paymentDue), neftTransactionId: String(formData.neftTransactionId || ""), chequeId: String(formData.chequeId || ""),
      remarks: String(formData.remarks || ""), gemOrderNumber: String(formData.gemOrderNumber || ""), deliveryDate: formData.deliveryDate || "",
      demoDate: formData.demoDate || "", paymentTerms: formData.paymentTerms || "", dispatchFrom: formData.dispatchFrom, fulfillingStatus: formData.fulfillingStatus,
    };
    try {
      setLoading(true);
      const response = await furniApi.post("/api/orders", newEntry);
      onSubmit(response.data);
      onClose();
    } catch (error) {
      console.error("Error submitting order:", error);
      const errorMessage = error.response?.data?.error || error.response?.data?.details?.join(", ") || "Failed to create order. Please try again.";
      toast.error(errorMessage);
      if (error.response?.status === 403) toast.error("Unauthorized: Insufficient permissions or invalid token");
      else if (error.response?.status === 400) toast.error(`Validation Error: ${JSON.stringify(error.response?.data, null, 2)}`);
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
    { label: "Freight Charges", name: "freightcs", type: "tel", inputMode: "numeric", pattern: "[0-9]*", placeholder: "e.g. 2000", disabled: formData.freightstatus !== "Extra", ariaLabel: "Freight Charges" },
    { label: "Installation Charges", name: "installation", type: "tel", inputMode: "numeric", pattern: "[0-9]*", placeholder: "e.g. 1000", disabled: formData.installchargesstatus !== "Extra", ariaLabel: "Installation Charges" },
    { label: "Freight Status", name: "freightstatus", type: "select", options: ["Self-Pickup", "To Pay", "Including", "Extra"], placeholder: "Select status", ariaLabel: "Freight Status" },
    { label: "Installation Charges Status", name: "installchargesstatus", type: "select", options: ["To Pay", "Including", "Extra", "Not in Scope"], placeholder: "Select status", ariaLabel: "Installation Charges Status" },
  ];

  const inputStyle = { padding: "0.75rem", border: "1px solid #e2e8f0", borderRadius: "0.75rem", backgroundColor: "#f8fafc", fontSize: "1rem", color: "#1e293b" };
  const disabledInputStyle = { ...inputStyle, backgroundColor: "#e5e7eb", cursor: "not-allowed" };
  const sectionHeadingStyle = { fontSize: "1.5rem", background: "linear-gradient(135deg, #2575fc, #6a11cb)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: "700", marginBottom: "1rem", letterSpacing: "1px", textShadow: "1px 1px 2px rgba(0, 0, 0, 0.05)" };
  const labelStyle = { fontSize: "0.9rem", fontWeight: "600", color: "#475569", marginBottom: "0.5rem" };
  const gridStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" };

  return (
    <>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(71, 85, 105, 0.8))", backdropFilter: "blur(4px)", zIndex: 999, opacity: 0, animation: "fadeIn 0.4s ease forwards" }} onClick={onClose} aria-label="Close modal"></div>
      <div className="modal-container" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "linear-gradient(145deg, #ffffff, #f8fafc)", padding: "2rem", borderRadius: "1.25rem", boxShadow: "0 15px 40px rgba(0, 0, 0, 0.25), 0 5px 15px rgba(0, 0, 0, 0.1)", zIndex: 1000, maxHeight: "85vh", width: "90%", maxWidth: "1100px", fontFamily: "'Poppins', sans-serif", opacity: 0, animation: "slideUp 0.4s ease forwards", overflowY: "auto" }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "2.2rem", fontWeight: "700", background: "linear-gradient(135deg, #2575fc, #6a11cb)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "1px", textShadow: "1px 1px 3px rgba(0, 0, 0, 0.05)", marginBottom: "1rem" }}>📝 Add Furniture Order</h2>
          <button onClick={onClose} style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", cursor: "pointer", color: "#64748b", zIndex: 1001 }} aria-label="Close modal">
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
                      {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
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
                <label style={{ fontSize: "calc(0.9rem + 0.2vw)", fontWeight: "600", color: "#475569", marginBottom: "0.5rem", display: "block" }}>Product * <span style={{ color: "#f43f5e" }}>*</span></label>
                <select name="productType" value={currentProduct.productType} onChange={handleProductChange} style={{ width: "100%", padding: "0.75rem", border: "1px solid #e2e8f0", borderRadius: "0.75rem", backgroundColor: "#f8fafc", fontSize: "calc(0.9rem + 0.2vw)", color: "#1e293b" }} aria-label="Product Type" aria-required="true">
                  <option value="">Select Product Type</option>
                  {productOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              {currentProduct.productType === "Others" && (
                <div>
                  <label style={{ fontSize: "calc(0.9rem + 0.2vw)", fontWeight: "600", color: "#475569", marginBottom: "0.5rem", display: "block" }}>Custom Product * <span style={{ color: "#f43f5e" }}>*</span></label>
                  <input type="text" name="customProduct" value={currentProduct.customProduct || ""} onChange={handleProductChange} placeholder="Enter Custom Product" style={{ width: "100%", padding: "0.75rem", border: "1px solid #e2e8f0", borderRadius: "0.75rem", backgroundColor: "#f8fafc", fontSize: "calc(0.9rem + 0.2vw)", color: "#1e293b" }} aria-label="Custom Product" aria-required="true" />
                </div>
              )}
              {[{ name: "size", label: "Size", placeholder: "Enter Size", ariaLabel: "Product Size" }, { name: "spec", label: "Specification", placeholder: "Enter Specification", ariaLabel: "Product Specification" }, { name: "qty", label: "Quantity *", placeholder: "", ariaLabel: "Product Quantity", required: true }, { name: "unitPrice", label: "Unit Price *", placeholder: "", ariaLabel: "Unit Price", required: true }, { name: "modelNos", label: "Model Nos", placeholder: "Enter Model Numbers", ariaLabel: "Model Numbers" }].map((f) => (
                <div key={f.name}>
                  <label style={{ fontSize: "calc(0.9rem + 0.2vw)", fontWeight: "600", color: "#475569", marginBottom: "0.5rem", display: "block" }}>{f.label}{f.required && <span style={{ color: "#f43f5e" }}>*</span>}</label>
                  <input type="text" name={f.name} value={currentProduct[f.name]} onChange={handleProductChange} placeholder={f.placeholder} style={{ width: "100%", padding: "0.75rem", border: "1px solid #e2e8f0", borderRadius: "0.75rem", backgroundColor: "#f8fafc", fontSize: "calc(0.9rem + 0.2vw)", color: "#1e293b" }} aria-label={f.ariaLabel} aria-required={f.required} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: "calc(0.9rem + 0.2vw)", fontWeight: "600", color: "#475569", marginBottom: "0.5rem", display: "block" }}>GST * <span style={{ color: "#f43f5e" }}>*</span></label>
                <select name="gst" value={currentProduct.gst} onChange={handleProductChange} style={{ width: "100%", padding: "0.75rem", border: "1px solid #e2e8f0", borderRadius: "0.75rem", backgroundColor: "#f8fafc", fontSize: "calc(0.9rem + 0.2vw)", color: "#1e293b" }} aria-label="GST Rate" aria-required="true">
                  <option value="">Select GST</option>
                  {gstOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div style={{ alignSelf: "stretch", marginTop: "32px" }}>
                <button type="button" onClick={addProduct} style={{ width: "100%", padding: "0.75rem", background: "linear-gradient(135deg, #7c3aed, #3b82f6)", color: "#ffffff", border: "none", borderRadius: "0.75rem", cursor: "pointer", fontSize: "calc(0.9rem + 0.2vw)", fontWeight: "600", transition: "transform 0.1s ease, background 0.2s ease" }} aria-label="Add Product">Add +</button>
              </div>
            </div>
            {products.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <h4 style={{ fontSize: "calc(1rem + 0.2vw)", color: "#475569", marginBottom: "0.75rem" }}>Added Products:</h4>
                <div style={{ maxHeight: "calc(40vh)", overflowY: "auto", scrollBehavior: "smooth", border: "1px solid #e2e8f0", borderRadius: "0.75rem", padding: "0.5rem", background: "#fff" }}>
                  {products.map((product, index) => (
                    <div key={index} style={{ display: "flex", flexDirection: "column", gap: "0.4rem", padding: "0.75rem", background: "#f1f5f9", borderRadius: "0.5rem", marginBottom: "0.5rem", transition: "background 0.2s ease, transform 0.1s ease" }} onMouseOver={(e) => (e.currentTarget.style.background = "#e2e8f0")} onMouseOut={(e) => (e.currentTarget.style.background = "#f1f5f9")}>
                      <span style={{ fontSize: "calc(0.85rem + 0.2vw)", color: "#1e293b" }}>Type: {product.productType}</span>
                      <span style={{ fontSize: "calc(0.85rem + 0.2vw)", color: "#1e293b" }}>Size: {product.size || "N/A"}</span>
                      <span style={{ fontSize: "calc(0.85rem + 0.2vw)", color: "#1e293b" }}>Spec: {product.spec || "N/A"}</span>
                      <span style={{ fontSize: "calc(0.85rem + 0.2vw)", color: "#1e293b" }}>Qty: {product.qty}</span>
                      <span style={{ fontSize: "calc(0.85rem + 0.2vw)", color: "#1e293b" }}>₹{product.unitPrice}</span>
                      <span style={{ fontSize: "calc(0.85rem + 0.2vw)", color: "#1e293b" }}>GST: {product.gst}</span>
                      <span style={{ fontSize: "calc(0.85rem + 0.2vw)", color: "#1e293b" }}>Model: {product.modelNos || "N/A"}</span>
                      <button type="button" onClick={() => removeProduct(index)} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: "calc(0.85rem + 0.2vw)", padding: "0.5rem 0", textAlign: "left", borderRadius: "0.25rem" }} aria-label={`Remove product ${product.productType}`}>Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <style>{`@media (min-width: 768px) { div.product-grid { display: grid !important; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important; gap: 1.5rem !important; margin-bottom: 1.5rem !important; } }`}</style>
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
                  <label style={labelStyle}>Payment Method</label>
                  <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} disabled={formData.orderType === "Demo"} style={{ width: "100%", ...(formData.orderType === "Demo" ? disabledInputStyle : inputStyle), appearance: "auto" }} aria-label="Payment Method">
                    <option value="">Select Method</option>
                    {paymentMethodOptions.map((method) => <option key={method} value={method}>{method}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Payment Terms {formData.orderType !== "Demo" && <span style={{ color: "#dc2626" }}>*</span>}</label>
                  <select name="paymentTerms" value={formData.paymentTerms} onChange={handleChange} disabled={formData.orderType === "Demo"} required={formData.orderType !== "Demo"} style={{ width: "100%", ...(formData.orderType === "Demo" ? disabledInputStyle : inputStyle), appearance: "auto" }} aria-label="Payment Terms" aria-required={formData.orderType !== "Demo"}>
                    <option value="" disabled>Select Terms</option>
                    {paymentTermsOptions.map((term) => <option key={term} value={term}>{term}</option>)}
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
                    <label style={labelStyle}>Cheque ID</label>
                    <input type="text" name="chequeId" value={formData.chequeId} onChange={handleChange} placeholder="Enter Cheque ID" disabled={formData.orderType === "Demo"} style={{ width: "100%", ...(formData.orderType === "Demo" ? disabledInputStyle : inputStyle) }} aria-label="Cheque ID" />
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Form Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
            <button type="button" onClick={onClose} style={{ padding: "0.75rem 1.5rem", backgroundColor: "#e2e8f0", color: "#475569", border: "none", borderRadius: "0.75rem", cursor: "pointer" }} aria-label="Cancel">Cancel</button>
            <button type="submit" disabled={loading} style={{ padding: "0.75rem 1.5rem", background: "linear-gradient(135deg, #7c3aed, #3b82f6)", color: "#ffffff", border: "none", borderRadius: "0.75rem", cursor: loading ? "not-allowed" : "pointer" }} aria-label="Submit Order">{loading ? <Spinner animation="border" size="sm" /> : "Submit"}</button>
          </div>
        </form>
      </div>
      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translate(-50%, -40%); } to { opacity: 1; transform: translate(-50%, -50%); } }
        @media (max-width: 768px) {
          .modal-container { width: 95%; max-width: 100%; padding: 1rem; max-height: 90vh; }
          .form-container { grid-template-columns: 1fr; gap: 1.5rem; }
          .grid-section { grid-template-columns: 1fr !important; gap: 1rem; }
          .product-grid { grid-template-columns: 1fr !important; gap: 1rem; }
          input, select { width: 100% !important; box-sizing: border-box; }
          h2 { font-size: 1.8rem; } h3 { font-size: 1.2rem; }
          label { font-size: 0.85rem; } input, select { font-size: 0.9rem; padding: 0.6rem; }
          button { padding: 0.6rem 1.2rem; font-size: 0.9rem; }
        }
      `}</style>
    </>
  );
}

export default AddEntry;
