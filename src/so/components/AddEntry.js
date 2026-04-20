import React, { useState, useEffect } from "react";
import soApi from "../../so/axiosSetup";
import { toast } from "react-toastify";
import { Spinner } from "react-bootstrap";
import {
  productOptions,
  statesAndCities,
  orderTypeOptions,
  companyOptions,
  paymentMethodOptions,
  paymentTermsOptions,
  salesPersonlist,
  Reportinglist,
  modelNoOptions,
  printerOptions,
  brandOptions,
  productCode,
  dispatchFromOptions,
} from "./Options";
import ConfirmModal from "./ConfirmModal";
import { getFinancialYear } from "../../shared/financialYear";
function AddEntry({ onSubmit, onClose }) {
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [poFile, setPoFile] = useState(null);
  const [pwcFile, setPwcFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const [currentProduct, setCurrentProduct] = useState({
    productType: "",
    size: "",
    spec: "",
    qty: "",
    unitPrice: "",
    gst: "18",
    modelNos: "",
    productCode: "",
    brand: "",
    warranty: "",
  });

  const [formData, setFormData] = useState({
    soDate: new Date().toISOString().split("T")[0],
    name: "",
    city: "",
    state: "",
    pinCode: "",
    contactNo: "",
    alterno: "",
    customerEmail: "",
    customername: "",
    report: "",
    freightcs: "",
    freightstatus: "Extra",
    installchargesstatus: "Extra",
    gstno: "",
    installation: "",
    remarks: "",
    salesPerson: "",
    company: "",
    shippingAddress: "",
    billingAddress: "",
    sameAddress: false,
    orderType: "B2C",
    paymentCollected: "",
    paymentMethod: "",
    paymentDue: "",
    neftTransactionId: "",
    chequeId: "",
    gemOrderNumber: "",
    deliveryDate: "",
    demoDate: "",
    paymentTerms: "",
    creditDays: "",
    pwc: "",
    dispatchFrom: "",
    fulfillingStatus: "Pending",
  });

  // Auto-save key for localStorage
  const AUTO_SAVE_KEY = "addEntryDraft";

  // Clear draft on successful submit or close
  const clearDraft = () => {
    try {
      localStorage.removeItem(AUTO_SAVE_KEY);
    } catch (error) {
      console.error("Error clearing draft:", error);
      toast.error("Failed to clear draft.");
    }
  };

  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(AUTO_SAVE_KEY);
      if (savedDraft) {
        const parsedDraft = JSON.parse(savedDraft);
        setFormData((prev) => {
          const updatedFormData = { ...prev, ...parsedDraft.formData };
          return updatedFormData;
        });
        setProducts(parsedDraft.products || []);
        setCurrentProduct(
          parsedDraft.currentProduct || {
            productType: "",
            size: "",
            spec: "",
            qty: "",
            unitPrice: "",
            gst: "",
            modelNos: "",
            productCode: "",
            brand: "",
            warranty: formData.orderType === "B2G" ? "As Per Tender" : "1 Year",
          }
        );
        setSelectedState(parsedDraft.selectedState || "");
        setSelectedCity(parsedDraft.selectedCity || "");
        setIsCustomMode(parsedDraft.isCustomMode || false);
        // toast.info("Restored draft from previous session!");
      }
    } catch (error) {
      console.error("Error loading draft:", error);
      toast.error("Failed to load draft. Please try again.");
    }
  }, []);

  // Auto-save to localStorage with debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      try {
        const draft = {
          formData,
          products,
          currentProduct,
          selectedState,
          selectedCity,
          isCustomMode,
        };
        localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(draft));
      } catch (error) {
        console.error("Error saving draft:", error);
        toast.error("Failed to save draft. Please try again.");
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [
    formData,
    products,
    currentProduct,
    selectedState,
    selectedCity,
    isCustomMode,
  ]);

  // Override onClose to clear draft if needed
  const handleClose = () => {
    const hasDraft =
      Object.values(formData).some(
        (value) => value !== "" && value !== false && value !== "Pending"
      ) ||
      products.length > 0 ||
      poFile;
    if (hasDraft) {
      setIsConfirmModalOpen(true);
    } else {
      onClose();
    }
  };
  // New handlers for ConfirmModal actions
  const handleConfirmDiscard = () => {
    clearDraft();
    setIsConfirmModalOpen(false);
    onClose();
  };

  const handleCancelDiscard = () => {
    setIsConfirmModalOpen(false);
    onClose();
  };
  // Auto Save Ends
  const gstOptions =
    formData.orderType === "B2G" ? ["18", "28", "including"] : ["18", "28"];
  const financialYear = getFinancialYear(formData.soDate);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        sameAddress: checked,
        shippingAddress: checked ? prev.billingAddress : prev.shippingAddress,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        ...(name === "billingAddress" && prev.sameAddress
          ? { shippingAddress: value }
          : {}),
        ...(name === "paymentCollected"
          ? { paymentDue: calculatePaymentDue(Number(value) || 0) }
          : {}),
        ...(name === "paymentMethod"
          ? { neftTransactionId: "", chequeId: "" }
          : {}),
        ...(name === "freightstatus" && value !== "Extra"
          ? { freightcs: "" }
          : {}),
        ...(name === "installchargesstatus" && value !== "Extra"
          ? { installation: "" }
          : {}),
        ...(name === "orderType" && value !== "B2G"
          ? { gemOrderNumber: "", deliveryDate: "" }
          : {}),
        ...(name === "paymentTerms" && value !== "Credit"
          ? { creditDays: "" }
          : {}),
      }));
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
        setFileError(
          "Invalid file type. Only PDF, PNG, JPG, DOCX, XLS, XLSX are allowed."
        );
        toast.error(
          "Invalid file type. Only PDF, PNG, JPG, DOCX, XLS, XLSX are allowed."
        );
        e.target.value = null;
        setPoFile(null);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setFileError("File size must be less than 5MB");
        toast.error("File size must be less than 5MB");
        e.target.value = null;
        setPoFile(null);
        return;
      }
      setPoFile(file);
      setFileError("");
    } else {
      setPoFile(null);
      setFileError("");
    }
  };

  const handleProductChange = (e) => {
    const { name, value } = e.target;
    if (name === "productType") {
      if (value === "Others") {
        setIsCustomMode(true); // Enter custom mode
        setCurrentProduct((prev) => ({
          ...prev,
          productType: "", // Set to empty for input
          size: "",
          spec: "",
          gst: "18",
          modelNos: "",
          brand: "",
          warranty: formData.orderType === "B2G" ? "As Per Tender" : "1 Year",
        }));
        return; // Don't proceed to general set
      } else {
        // Predefined selected, exit custom mode
        setIsCustomMode(false);
      }
    }
    setCurrentProduct((prev) => {
      const newProduct = {
        ...prev,
        [name]: value,
        ...(name === "productType"
          ? {
            size: "",
            spec: "",
            gst: "18",
            modelNos: "",
            brand: "",
            warranty:
              formData.orderType === "B2G" ? "As Per Tender" : "1 Year",
          }
          : name === "size"
            ? {
              warranty:
                formData.orderType === "B2G" ? "As Per Tender" : "1 Year",
            }
            : name === "brand" &&
              prev.productType === "IFPD" &&
              value === "Promark"
              ? { warranty: "3 Years" }
              : name === "brand" &&
                prev.productType === "IFPD" &&
                value === "White Label"
                ? { modelNos: "Standard", warranty: "1 Year" }
                : name === "brand" &&
                  prev.productType === "IFPD" &&
                  value !== "Promark" &&
                  value !== "White Label"
                  ? { modelNos: "", warranty: "1 Year" }
                  : {}),
      };
      return newProduct;
    });
  };

  const handleCustomProductChange = (e) => {
    const { name, value } = e.target;
    setCurrentProduct((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "productType"
        ? {
          warranty: formData.orderType === "B2G" ? "As Per Tender" : "1 Year",
        }
        : name === "size"
          ? {
            warranty: formData.orderType === "B2G" ? "As Per Tender" : "1 Year",
          }
          : {}),
    }));
  };

  const addProduct = () => {
    if (
      !currentProduct.productType ||
      !currentProduct.qty ||
      !currentProduct.unitPrice ||
      !currentProduct.warranty
    ) {
      toast.error(
        "Please fill all required product fields including Warranty"
      );
      return;
    }
    if (
      !isCustomMode &&
      ((currentProduct.productType === "IFPD" &&
        (!currentProduct.modelNos || !currentProduct.brand)) ||
        (currentProduct.productType === "Fujifilm-Printer" &&
          !currentProduct.modelNos))
    ) {
      toast.error(
        currentProduct.productType === "IFPD"
          ? "Model Numbers and Brand are required for IFPD products"
          : "Model Numbers are required for Fujifilm-Printer products"
      );
      return;
    }
    if (isNaN(Number(currentProduct.qty)) || Number(currentProduct.qty) <= 0) {
      toast.error("Quantity must be a positive number");
      return;
    }
    setProducts([
      ...products,
      { ...currentProduct, modelNos: currentProduct.modelNos },
    ]);
    setCurrentProduct({
      productType: "",
      size: "",
      spec: "",
      qty: "",
      unitPrice: "",
      gst: "18",
      modelNos: "",
      productCode: "",
      brand: "",
      warranty: formData.orderType === "B2G" ? "As Per Tender" : "1 Year",
    });
    setIsCustomMode(false);
    setFormData((prev) => ({
      ...prev,
      paymentDue: calculatePaymentDue(Number(prev.paymentCollected) || 0),
    }));
  };

  const removeProduct = (index) => {
    setProducts(products.filter((_, i) => i !== index));
    setFormData((prev) => ({
      ...prev,
      paymentDue: calculatePaymentDue(Number(prev.paymentCollected) || 0),
    }));
  };

  const handleStateChange = (e) => {
    const state = e.target.value;
    setSelectedState(state);
    setSelectedCity("");
    setFormData((prev) => ({
      ...prev,
      state,
      city: "",
    }));
  };

  const handleCityChange = (e) => {
    const city = e.target.value;
    setSelectedCity(city);
    setFormData((prev) => ({
      ...prev,
      city,
    }));
  };

  const calculateTotal = () => {
    const subtotalWithGST = products.reduce((sum, product) => {
      const qty = Number(product.qty) || 0;
      const unitPrice = Number(product.unitPrice) || 0;
      const gstRate =
        product.gst === "including" ? 0 : Number(product.gst) || 0;

      const base = qty * unitPrice;
      const gst = base * (gstRate / 100);

      return sum + base + gst;
    }, 0);

    const installation = Number(formData.installation) || 0;
    const freight = Number(formData.freightcs) || 0;

    return Math.round(subtotalWithGST + freight + installation);
  };

  const calculatePaymentDue = (paymentCollected) => {
    const total = calculateTotal();
    const due = total - paymentCollected;
    return Number(due.toFixed(2));
  };

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      paymentDue: calculatePaymentDue(Number(prev.paymentCollected) || 0),
    }));
  }, [products, formData.freightcs, formData.installation]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const userRole = localStorage.getItem("role");
    if (!["salesperson", "Admin", "SuperAdmin", "GlobalAdmin"].includes(userRole)) {
      toast.error("Only Sales Admin SuperAdmin users can create orders");
      return;
    }

    if (formData.orderType === "B2G" && !formData.gemOrderNumber) {
      toast.error("Please provide GEM Order Number for B2G orders");
      return;
    }

    if (formData.paymentTerms === "Credit" && !formData.pwc) {
      toast.error("Please select PWC option for Credit payment terms");
      return;
    }
    if (formData.paymentTerms === "Credit" && formData.pwc === "Yes" && !pwcFile) {
      toast.error("Please upload the PWC document");
      return;
    }

    const total = calculateTotal();
    const userId = localStorage.getItem("userId");

    const newEntry = {
      ...formData,
      createdBy: userId,
      products: products.map((p) => ({
        productType: p.productType,
        size: p.size || "N/A",
        spec: p.spec || "N/A",
        qty: Number(p.qty) || 0,
        unitPrice: Number(p.unitPrice) || 0,
        gst: p.gst === "including" ? "including" : Number(p.gst) || 0,
        serialNos: [],
        modelNos: p.modelNos ? p.modelNos.split(",").map((m) => m.trim()) : [],
        brand: p.brand || "",
        warranty:
          p.warranty ||
          (formData.orderType === "B2G" ? "As Per Tender" : "1 Year"),
      })),
      soDate: formData.soDate,
      total,
      freightcs: formData.freightcs || "",
      installation: formData.installation || "",
      orderType: formData.orderType,
      paymentCollected: String(formData.paymentCollected || ""),
      paymentMethod: formData.paymentMethod || "",
      paymentDue: String(formData.paymentDue || ""),
      neftTransactionId: formData.neftTransactionId || "",
      chequeId: formData.chequeId || "",
      remarks: formData.remarks || "",
      gemOrderNumber: formData.gemOrderNumber || "",
      deliveryDate: formData.deliveryDate || "",
      demoDate: formData.demoDate || "",
      paymentTerms: formData.paymentTerms || "",
      creditDays: formData.creditDays || "",
      dispatchFrom: formData.dispatchFrom || "",
      fulfillingStatus: formData.fulfillingStatus,
    };

    const formDataToSend = new FormData();
    for (const key in newEntry) {
      if (Array.isArray(newEntry[key])) {
        formDataToSend.append(key, JSON.stringify(newEntry[key]));
      } else {
        formDataToSend.append(key, newEntry[key]);
      }
    }
    if (poFile) {
      formDataToSend.append("poFile", poFile);
    }
    if (pwcFile) {
      formDataToSend.append("pwcFile", pwcFile);
    }

    try {
      setLoading(true);
      const response = await soApi.post(
        `/api/orders`,
        formDataToSend
      );

      clearDraft();
      onSubmit(response.data);
      onClose();
    } catch (error) {
      console.error("Error:", error);
      console.error("Error Response:", error.response?.data);

      // Handle validation errors with user-friendly messages
      if (error.response?.status === 400) {
        const errorData = error.response?.data;

        // Display the main error message
        if (errorData?.error) {
          toast.error(errorData.error);
        }

        // If there are multiple field errors, show them individually
        if (errorData?.details && Array.isArray(errorData.details)) {
          errorData.details.forEach((detail, index) => {
            // Only show first 3 detailed errors to avoid overwhelming the user
            if (index < 3) {
              setTimeout(() => toast.error(detail), index * 100);
            }
          });
        }
      } else if (error.response?.status === 403) {
        toast.error("Unauthorized: Insufficient permissions or invalid token");
      } else if (error.response?.status === 500) {
        const errorData = error.response?.data;
        const errorMessage = errorData?.error || errorData?.details || "Server error. Please try again.";
        toast.error(`Server Error: ${errorMessage}`);
      } else {
        const errorMessage =
          error.response?.data?.error ||
          error.response?.data?.message ||
          "Failed to create order. Please try again.";
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onConfirm={handleConfirmDiscard}
        onCancel={handleCancelDiscard}
        message="Do you want to discard the draft?"
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(71, 85, 105, 0.8))",
          backdropFilter: "blur(4px)",
          zIndex: 999,
          opacity: 0,
          animation: "fadeIn 0.4s ease forwards",
        }}
      ></div>

      <div
        className="modal-container"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "#ffffff",
          borderRadius: "1.25rem",
          boxShadow:
            "0 15px 40px rgba(0, 0, 0, 0.25), 0 5px 15px rgba(0, 0, 0, 0.1)",
          zIndex: 1000,
          maxHeight: "85vh",
          width: "90%",
          maxWidth: "1100px",
          fontFamily: "'Poppins', sans-serif",
          opacity: 0,
          animation: "slideUp 0.4s ease forwards",
          overflow: "visible",
        }}
      >
        <div
          className="modal-scroll-inner"
          style={{
            overflowY: "auto",
            overflowX: "visible",
            maxHeight: "85vh",
            padding: "2rem",
            borderRadius: "1.25rem",
            background: "#ffffff",
          }}
        >
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h2
            style={{
              fontSize: "2.2rem",
              fontWeight: "700",
              background: "linear-gradient(135deg, #2575fc, #6a11cb)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "1px",
              textShadow: "1px 1px 3px rgba(0, 0, 0, 0.05)",
              marginBottom: "1rem",
            }}
          >
            📝 Add Sales Order
          </h2>

          <button
            onClick={handleClose}
            style={{
              position: "absolute",
              top: "1rem",
              right: "1rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#64748b",
              zIndex: 1001,
            }}
          >
            <svg
              style={{ width: "1.75rem", height: "1.75rem" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="form-container"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "2rem",
          }}
        >
          {/* Order Details Section */}
          <div>
            <h3
              style={{
                fontSize: "1.5rem",
                background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontWeight: "700",
                marginBottom: "1rem",
                letterSpacing: "1px",
                textShadow: "1px 1px 2px rgba(0, 0, 0, 0.05)",
              }}
            >
              📋 Order Details
            </h3>
            <div
              className="grid-section"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.5rem",
              }}
            >
              {[
                {
                  label: "SO Date *",
                  name: "soDate",
                  type: "date",
                  required: true,
                  disabled: true,
                  value: formData.soDate,
                },
                {
                  label: "Financial Year",
                  name: "financialYear",
                  type: "text",
                  disabled: true,
                  value: financialYear,
                },
                {
                  label: "Order Type *",
                  name: "orderType",
                  type: "select",
                  options: orderTypeOptions,
                  required: true,
                  placeholder: "Select Order Type",
                },
                {
                  label: "Sales Person",
                  name: "salesPerson",
                  type: "select",
                  options: salesPersonlist,
                  placeholder: "Enter Sales Person's Name",
                },
                {
                  label: "Reporting Manager",
                  name: "report",
                  type: "select",
                  options: Reportinglist,
                  placeholder: "Enter Reporting Manager",
                },
                {
                  label: "Company",
                  name: "company",
                  type: "select",
                  options: companyOptions,
                  placeholder: "Select Company",
                },
                {
                  label: "Dispatch From *",
                  name: "dispatchFrom",
                  type: "select",
                  options: dispatchFromOptions,
                  required: true,
                  placeholder: "Select Dispatch Location",
                },
                ...(formData.orderType === "B2G"
                  ? [
                    {
                      label: "GEM Order Number *",
                      name: "gemOrderNumber",
                      type: "text",
                      required: true,
                      placeholder: "Enter GEM Order Number",
                    },
                    {
                      label: "Delivery Date",
                      name: "deliveryDate",
                      type: "date",
                      placeholder: "Select Delivery Date",
                    },
                  ]
                  : []),
                ...(formData.orderType === "Demo"
                  ? [
                    {
                      label: "Demo Date *",
                      name: "demoDate",
                      type: "date",
                      required: true,
                    },
                  ]
                  : []),
              ].map((field) => (
                <div
                  key={field.name}
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  <label
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      color: "#475569",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {field.label}
                    {field.required && (
                      <span style={{ color: "#f43f5e" }}>*</span>
                    )}
                  </label>
                  {field.type === "select" ? (
                    <select
                      name={field.name}
                      value={formData[field.name] || ""}
                      onChange={handleChange}
                      required={field.required}
                      disabled={field.disabled || false}
                      style={{
                        padding: "0.75rem",
                        border: "1px solid #e2e8f0",
                        borderRadius: "0.75rem",
                        backgroundColor: field.disabled ? "#e5e7eb" : "#f8fafc",
                        fontSize: "1rem",
                        color: "#1e293b",
                        cursor: field.disabled ? "not-allowed" : "pointer",
                      }}
                    >
                      <option value="">
                        Select {field.label.split(" ")[0]}
                      </option>
                      {field.options.map((option) => (
                        <option
                          key={
                            typeof option === "string" ? option : option.value
                          }
                          value={
                            typeof option === "string" ? option : option.value
                          }
                        >
                          {typeof option === "string" ? option : option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      name={field.name}
                      value={
                        field.value !== undefined
                          ? field.value
                          : formData[field.name] || ""
                      }
                      onChange={field.disabled ? undefined : handleChange}
                      required={field.required}
                      placeholder={field.placeholder}
                      disabled={field.disabled || false}
                      style={{
                        padding: "0.75rem",
                        border: "1px solid #e2e8f0",
                        borderRadius: "0.75rem",
                        backgroundColor: field.disabled ? "#e5e7eb" : "#f8fafc",
                        fontSize: "1rem",
                        color: "#1e293b",
                        cursor: field.disabled ? "not-allowed" : "text",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* Customer Details Section */}
          <div>
            <h3
              style={{
                fontSize: "1.5rem",
                background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontWeight: "700",
                marginBottom: "1rem",
                letterSpacing: "1px",
                fontFamily: "'Poppins', sans-serif",
                textShadow: "1px 1px 2px rgba(0, 0, 0, 0.05)",
              }}
            >
              👤 Customer Details
            </h3>
            <div
              className="grid-section"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.5rem",
              }}
            >
              {[
                {
                  label: "Customer Name",
                  name: "customername",
                  type: "text",
                  required: true,
                  placeholder: "Enter Customer Name",
                  maxLength: 50,
                },
                {
                  label: "Contact Person Name",
                  name: "name",
                  type: "text",
                  required: true,
                  placeholder: "Enter Contact Person Name",
                },
                {
                  label: "Contact Person No",
                  name: "contactNo",
                  type: "tel",
                  required: true,
                  inputMode: "numeric",
                  maxLength: 10,
                  placeholder: "e.g. 9876543210",
                  customOnChange: true,
                },
                {
                  label: "Alternate Contact No",
                  name: "alterno",
                  type: "tel",
                  inputMode: "numeric",
                  maxLength: 10,
                  placeholder: "e.g. 9876543210",
                  customOnChange: true,
                },
                {
                  label: "Customer Email",
                  name: "customerEmail",
                  required: true,
                  type: "email",
                  placeholder: "e.g. example@domain.com",
                },
                {
                  label: "GST NO.",
                  name: "gstno",
                  type: "text",
                  placeholder: "Enter GST NO.",
                },
              ].map((field) => (
                <div
                  key={field.name}
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  <label
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      color: "#475569",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {field.label}
                    {field.required && (
                      <span style={{ color: "#f43f5e" }}>*</span>
                    )}
                  </label>
                  <input
                    type={field.type}
                    name={field.name}
                    value={formData[field.name] || ""}
                    onChange={
                      field.customOnChange
                        ? // Hinglish: Mobile number fields ke liye special handler - sirf numbers allow karta hai, spaces nahi
                        (e) => {
                          // Hinglish: Sirf digits allow karte hain, spaces aur special characters remove kar dete hain
                          const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 10);
                          setFormData((prev) => ({
                            ...prev,
                            [field.name]: value,
                          }));
                        }
                        : handleChange
                    }
                    maxLength={field.maxLength}
                    inputMode={field.inputMode}
                    placeholder={field.placeholder}
                    required={field.required}
                    // Hinglish: Paste event ko bhi handle karte hain mobile numbers ke liye
                    onPaste={
                      field.customOnChange
                        ? (e) => {
                          e.preventDefault();
                          const paste = (e.clipboardData || window.clipboardData).getData('text');
                          // Hinglish: Paste karte waqt bhi sirf numbers allow karte hain
                          const value = paste.replace(/[^0-9]/g, "").slice(0, 10);
                          setFormData((prev) => ({
                            ...prev,
                            [field.name]: value,
                          }));
                        }
                        : undefined
                    }
                    // Hinglish: Keypress event se non-numeric characters ko block karte hain
                    onKeyPress={
                      field.customOnChange
                        ? (e) => {
                          // Hinglish: Sirf numbers, backspace, delete, arrow keys allow karte hain
                          if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }
                        : undefined
                    }
                    style={{
                      padding: "0.75rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.75rem",
                      backgroundColor: "#f8fafc",
                      fontSize: "1rem",
                      color: "#1e293b",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          {/* Address Details Section */}
          <div>
            <h3
              style={{
                fontSize: "1.5rem",
                background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontWeight: "700",
                marginBottom: "1rem",
                letterSpacing: "1px",
                fontFamily: "'Poppins', sans-serif",
                textShadow: "1px 1px 2px rgba(0, 0, 0, 0.05)",
              }}
            >
              📍 Address Details
            </h3>
            <div
              className="grid-section"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.5rem",
              }}
            >
              {[
                {
                  label: "State",
                  name: "state",
                  type: "select",
                  options: Object.keys(statesAndCities),
                  onChange: handleStateChange,
                  placeholder: "Select State",
                },
                {
                  label: "City",
                  name: "city",
                  type: "select",
                  options: selectedState ? statesAndCities[selectedState] : [],
                  onChange: handleCityChange,
                  disabled: !selectedState,
                  placeholder: "Select City",
                },
                {
                  label: "Pin Code",
                  name: "pinCode",
                  type: "tel",
                  required: true,
                  inputMode: "numeric",
                  placeholder: "e.g. 110001",
                  maxLength: 6,
                  pattern: "[0-9]*",
                },
                {
                  label: "Billing Address",
                  name: "billingAddress",
                  type: "text",
                  placeholder: "Enter Billing Address",
                },
                {
                  label: "📝 Same as Billing",
                  name: "sameAddress",
                  type: "checkbox",
                },
                {
                  label: "Shipping Address",
                  name: "shippingAddress",
                  type: "text",
                  required: true,
                  placeholder: "Enter Shipping Address",
                  disabled: formData.sameAddress,
                },
              ].map((field) => (
                <div
                  key={field.name}
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  <label
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      color: "#475569",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {field.label}
                    {field.required && (
                      <span style={{ color: "#f43f5e" }}>*</span>
                    )}
                  </label>
                  {field.type === "select" ? (
                    <select
                      name={field.name}
                      value={formData[field.name] || ""}
                      onChange={field.onChange || handleChange}
                      disabled={field.disabled}
                      style={{
                        padding: "0.75rem",
                        border: "1px solid #e2e8f0",
                        borderRadius: "0.75rem",
                        backgroundColor: field.disabled ? "#e5e7eb" : "#f8fafc",
                        fontSize: "1rem",
                        color: "#1e293b",
                      }}
                    >
                      <option value="">
                        Select {field.label.split(" ")[0]}
                      </option>
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "checkbox" ? (
                    <input
                      type="checkbox"
                      name={field.name}
                      checked={formData[field.name] || false}
                      onChange={handleChange}
                      style={{
                        width: "1.25rem",
                        height: "1.25rem",
                        accentColor: "#6366f1",
                      }}
                    />
                  ) : (
                    <input
                      type={field.type}
                      name={field.name}
                      value={formData[field.name] || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (
                          field.name === "pinCode" &&
                          value &&
                          !/^\d*$/.test(value)
                        ) {
                          return;
                        }
                        (field.onChange || handleChange)(e);
                      }}
                      disabled={field.disabled}
                      inputMode={field.inputMode}
                      placeholder={field.placeholder}
                      maxLength={field.maxLength}
                      pattern={field.pattern}
                      required={field.required}
                      style={{
                        padding: "0.75rem",
                        border: "1px solid #e2e8f0",
                        borderRadius: "0.75rem",
                        backgroundColor: field.disabled ? "#e5e7eb" : "#f8fafc",
                        fontSize: "1rem",
                        color: "#1e293b",
                        ...(formData[field.name] &&
                          field.name === "pinCode" &&
                          !/^\d{6}$/.test(formData[field.name])
                          ? { borderColor: "red" }
                          : {}),
                      }}
                    />
                  )}
                  {formData[field.name] &&
                    field.name === "pinCode" &&
                    !/^\d{6}$/.test(formData[field.name]) && (
                      <span
                        style={{
                          color: "red",
                          fontSize: "0.8rem",
                          marginTop: "0.25rem",
                        }}
                      >
                        Pin Code must be exactly 6 digits
                      </span>
                    )}
                </div>
              ))}
            </div>
          </div>
          {/* Add Products Section */}
          <div>
            <h3
              style={{
                fontSize: "1.5rem",
                background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontWeight: "700",
                marginBottom: "1rem",
                letterSpacing: "1px",
                fontFamily: "'Poppins', sans-serif",
                textShadow: "1px 1px 2px rgba(0, 0, 0, 0.05)",
              }}
            >
              ✨ Add Products
            </h3>
            <div
              className="product-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  (currentProduct.productType === "IFPD" &&
                    (isCustomMode
                      ? "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr auto" // Custom IFPD: + model text + brand select
                      : "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr  auto")) || // Predefined IFPD: same
                  (currentProduct.productType === "Fujifilm-Printer" &&
                    (isCustomMode
                      ? "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr auto" // Custom Printer: + model text + productCode select
                      : "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr auto")) || // Predefined Printer: + model + code
                  "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr auto", // Base/custom non-special
                gap: "1rem",
                marginBottom: "1rem",
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    color: "#475569",
                    marginBottom: "0.5rem",
                    display: "block",
                  }}
                >
                  Product * <span style={{ color: "#f43f5e" }}>*</span>
                </label>
                <select
                  name="productType"
                  value={isCustomMode ? "Others" : currentProduct.productType} // Force "Others" in custom mode
                  onChange={handleProductChange}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.75rem",
                    backgroundColor: "#f8fafc",
                    fontSize: "1rem",
                    color: "#1e293b",
                  }}
                  aria-label="Product Type"
                  aria-required="true"
                >
                  <option value="" disabled>
                    Select Product
                  </option>
                  {[
                    "Others",
                    ...Object.keys(productOptions)
                      .filter((type) => type !== "Others")
                      .sort(),
                  ].map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              {isCustomMode && (
                <div
                  style={{
                    animation: "fadeIn 0.3s ease-in",
                  }}
                >
                  <label
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Custom
                  </label>
                  <input
                    type="text"
                    name="productType"
                    value={currentProduct.productType}
                    onChange={handleCustomProductChange}
                    placeholder="Enter Custom Product Type"
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.75rem",
                      backgroundColor: "#f8fafc",
                      fontSize: "1rem",
                      color: "#1e293b",
                    }}
                    aria-label="Custom Product Type"
                    aria-required="true"
                  />
                </div>
              )}
              <div>
                <label
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    color: "#475569",
                  }}
                >
                  Size
                </label>
                {isCustomMode ? ( // Manual input in custom mode
                  <input
                    type="text"
                    name="size"
                    value={currentProduct.size}
                    onChange={handleCustomProductChange} // Use custom handler for resets
                    placeholder="Enter Size"
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.75rem",
                      backgroundColor: "#f8fafc",
                      fontSize: "1rem",
                      color: "#1e293b",
                    }}
                    aria-label="Custom Product Size"
                  />
                ) : (
                  <select
                    name="size"
                    value={currentProduct.size}
                    onChange={handleProductChange}
                    disabled={!currentProduct.productType}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.75rem",
                      backgroundColor: !currentProduct.productType
                        ? "#e5e7eb"
                        : "#f8fafc",
                    }}
                  >
                    <option value="">Select Size</option>
                    {currentProduct.productType &&
                      productOptions[currentProduct.productType]?.sizes.map(
                        (size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        )
                      )}
                  </select>
                )}
              </div>
              <div>
                <label
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    color: "#475569",
                  }}
                >
                  Specification
                </label>
                {isCustomMode ? ( // Manual input in custom mode
                  <input
                    type="text"
                    name="spec"
                    value={currentProduct.spec}
                    onChange={handleCustomProductChange} // Use custom handler
                    placeholder="Enter Specification"
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.75rem",
                      backgroundColor: "#f8fafc",
                      fontSize: "1rem",
                      color: "#1e293b",
                    }}
                    aria-label="Custom Product Specification"
                  />
                ) : (
                  <select
                    name="spec"
                    value={currentProduct.spec}
                    onChange={handleProductChange}
                    disabled={!currentProduct.productType}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.75rem",
                      backgroundColor: !currentProduct.productType
                        ? "#e5e7eb"
                        : "#f8fafc",
                    }}
                  >
                    <option value="">Select Spec</option>
                    {currentProduct.productType &&
                      productOptions[currentProduct.productType]?.specs.map(
                        (spec) => (
                          <option key={spec} value={spec}>
                            {spec}
                          </option>
                        )
                      )}
                  </select>
                )}
              </div>
              <div>
                <label
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    color: "#475569",
                  }}
                >
                  Quantity *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  name="qty"
                  value={currentProduct.qty}
                  placeholder="e.g. 10"
                  onChange={(e) => {
                    if (/^\d*$/.test(e.target.value)) {
                      handleProductChange(e);
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.75rem",
                    backgroundColor: "#f8fafc",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    color: "#475569",
                  }}
                >
                  Unit Price *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  name="unitPrice"
                  value={currentProduct.unitPrice}
                  placeholder="e.g. 10.00"
                  onChange={(e) => {
                    if (/^\d*\.?\d*$/.test(e.target.value)) {
                      handleProductChange(e);
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.75rem",
                    backgroundColor: "#f8fafc",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    color: "#475569",
                  }}
                >
                  GST
                </label>
                <input
                  type="text"
                  value="18%"
                  disabled
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.75rem",
                    backgroundColor: "#e5e7eb",
                    cursor: "not-allowed",
                  }}
                  aria-label="GST Rate"
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    color: "#475569",
                    display: "block",
                  }}
                >
                  Warranty *
                </label>
                <input
                  type="text"
                  name="warranty"
                  value={currentProduct.warranty}
                  onChange={handleProductChange}
                  placeholder="Enter Warranty (e.g., 1 Year)"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.75rem",
                    backgroundColor: "#f8fafc",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    color: "#475569",
                  }}
                >
                  Model No *
                </label>
                {isCustomMode ? (
                  <input
                    type="text"
                    name="modelNos"
                    value={currentProduct.modelNos}
                    onChange={handleCustomProductChange}
                    placeholder="Enter Model No"
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.75rem",
                      backgroundColor: "#f8fafc",
                      fontSize: "1rem",
                      color: "#1e293b",
                    }}
                  />
                ) : currentProduct.productType === "IFPD" ? (
                  <select
                    name="modelNos"
                    value={currentProduct.modelNos}
                    onChange={handleProductChange}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.75rem",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    <option value="">Select Model No</option>
                    {modelNoOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : currentProduct.productType === "Fujifilm-Printer" ? (
                  <select
                    name="modelNos"
                    value={currentProduct.modelNos}
                    onChange={handleProductChange}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.75rem",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    <option value="">Select Model No</option>
                    {printerOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    name="modelNos"
                    value={currentProduct.modelNos}
                    onChange={handleProductChange}
                    placeholder="Enter Model No"
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.75rem",
                      backgroundColor: "#f8fafc",
                      fontSize: "1rem",
                      color: "#1e293b",
                    }}
                  />
                )}
              </div>

              {currentProduct.productType === "IFPD" && (
                <div>
                  <label
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Brand *
                  </label>
                  <select
                    name="brand"
                    value={currentProduct.brand}
                    onChange={handleProductChange} // Keep for warranty logic
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.75rem",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    <option value="">Select Brand</option>
                    {brandOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {currentProduct.productType === "Fujifilm-Printer" && (
                <div>
                  <label
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      color: "#475569",
                      display: "block",
                    }}
                  >
                    Product Code *
                  </label>
                  <select
                    name="productCode"
                    value={currentProduct.productCode}
                    onChange={handleProductChange}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.75rem",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    <option value="">Select Product Code</option>
                    {productCode.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                type="button"
                onClick={addProduct}
                style={{
                  padding: "0.75rem 1rem",
                  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "0.75rem",
                  cursor: "pointer",
                  alignSelf: "end",
                  fontWeight: "600",
                  letterSpacing: "0.5px",
                  transition: "all 0.3s ease",
                }}
                onMouseOver={(e) =>
                (e.currentTarget.style.boxShadow =
                  "0 6px 16px rgba(101, 86, 231, 0.5)")
                }
                onMouseOut={(e) =>
                (e.currentTarget.style.boxShadow =
                  "0 4px 12px rgba(101, 86, 231, 0.3)")
                }
              >
                Add ➕
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: "1.5rem",
                marginBottom: "1rem",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    color: "#475569",
                    marginBottom: "0.5rem",
                  }}
                >
                  Remarks
                </label>
                <input
                  type="text"
                  name="remarks"
                  value={formData.remarks || ""}
                  onChange={handleChange}
                  placeholder="Enter product-related remarks"
                  style={{
                    padding: "0.75rem",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.75rem",
                    backgroundColor: "#f8fafc",
                    fontSize: "1rem",
                    color: "#1e293b",
                  }}
                />
              </div>
            </div>
            {products.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <h4 style={{ fontSize: "1rem", color: "#475569" }}>
                  Added Products:
                </h4>
                <div style={{ maxHeight: "150px", overflowY: "auto" }}>
                  {products.map((product, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1.5rem",
                        padding: "0.6rem 0.75rem",
                        background: "#f1f5f9",
                        borderRadius: "0.5rem",
                        marginBottom: "0.5rem",
                        flexWrap: "nowrap",
                        overflowX: "auto",
                      }}
                    >
                      <span style={{ fontSize: "0.9rem", color: "#1e293b", whiteSpace: "nowrap", minWidth: "120px" }}>Type: {product.productType}</span>
                      <span style={{ fontSize: "0.9rem", color: "#1e293b", whiteSpace: "nowrap" }}>Size: {product.size || "N/A"}</span>
                      <span style={{ fontSize: "0.9rem", color: "#1e293b", whiteSpace: "nowrap" }}>Spec: {product.spec || "N/A"}</span>
                      <span style={{ fontSize: "0.9rem", color: "#1e293b", whiteSpace: "nowrap" }}>Qty: {product.qty}</span>
                      <span style={{ fontSize: "0.9rem", color: "#1e293b", whiteSpace: "nowrap" }}>₹{product.unitPrice}</span>
                      <span style={{ fontSize: "0.9rem", color: "#1e293b", whiteSpace: "nowrap" }}>GST: {product.gst}</span>
                      {product.warranty && <span style={{ fontSize: "0.9rem", color: "#1e293b", whiteSpace: "nowrap" }}>Warranty: {product.warranty}</span>}
                      {product.modelNos && <span style={{ fontSize: "0.9rem", color: "#1e293b", whiteSpace: "nowrap" }}>Model: {product.modelNos}</span>}
                      {product.productType === "Fujifilm-Printer" && product.productCode && <span style={{ fontSize: "0.9rem", color: "#1e293b", whiteSpace: "nowrap" }}>Code: {product.productCode}</span>}
                      {product.productType === "IFPD" && product.brand && <span style={{ fontSize: "0.9rem", color: "#1e293b", whiteSpace: "nowrap" }}>Brand: {product.brand}</span>}
                      <button
                        type="button"
                        onClick={() => removeProduct(index)}
                        style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", whiteSpace: "nowrap", marginLeft: "auto", flexShrink: 0 }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Additional Charges Section */}
          <div>
            <h3
              style={{
                fontSize: "1.5rem",
                background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontWeight: "700",
                marginBottom: "1rem",
                letterSpacing: "1px",
                fontFamily: "'Poppins', sans-serif",
                textShadow: "1px 1px 2px rgba(0, 0, 0, 0.05)",
              }}
            >
              💸 Additional Charges
            </h3>
            <div
              className="grid-section"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.5rem",
              }}
            >
              {[
                {
                  label: "Freight Status",
                  name: "freightstatus",
                  type: "select",
                  options: ["Self-Pickup", "To Pay", "Including", "Extra"],
                  placeholder: "Select status",
                },
                {
                  label: "Installation Charges Status",
                  name: "installchargesstatus",
                  type: "select",
                  options: ["To Pay", "Including", "Extra", "Not in Scope"],
                  placeholder: "Select status",
                },
                {
                  label: "Freight Charges",
                  name: "freightcs",
                  type: "tel",
                  inputMode: "numeric",
                  pattern: "[0-9]*",
                  placeholder: "e.g. 2000",
                  disabled: formData.freightstatus !== "Extra",
                },
                {
                  label: "Installation Charges",
                  name: "installation",
                  type: "tel",
                  inputMode: "numeric",
                  pattern: "[0-9]*",
                  placeholder: "e.g. 1000",
                  disabled: formData.installchargesstatus !== "Extra",
                },
              ].map((field) => (
                <div
                  key={field.name}
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  <label
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      color: "#475569",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {field.label}
                  </label>
                  {field.type === "select" ? (
                    <select
                      name={field.name}
                      value={formData[field.name] || "Extra"}
                      onChange={handleChange}
                      style={{
                        padding: "0.75rem",
                        border: "1px solid #e2e8f0",
                        borderRadius: "0.75rem",
                        backgroundColor: "#f8fafc",
                        fontSize: "1rem",
                        color: "#1e293b",
                      }}
                    >
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      name={field.name}
                      value={formData[field.name] || ""}
                      onChange={(e) => {
                        handleChange(e);
                      }}
                      onKeyPress={(e) => {
                        if (!/[0-9]/.test(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      placeholder={field.placeholder}
                      disabled={field.disabled}
                      style={{
                        padding: "0.75rem",
                        border: "1px solid #e2e8f0",
                        borderRadius: "0.75rem",
                        backgroundColor: field.disabled ? "#e5e7eb" : "#f8fafc",
                        fontSize: "1rem",
                        color: "#1e293b",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* Payment Details Section */}
          <div>
            <h3
              style={{
                fontSize: "1.5rem",
                background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontWeight: "700",
                marginBottom: "1rem",
                letterSpacing: "1px",
                fontFamily: "'Poppins', sans-serif",
                textShadow: "1px 1px 2px rgba(0, 0, 0, 0.05)",
              }}
            >
              💰 Payment Details
            </h3>
            <div
              className="grid-section"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.5rem",
                alignItems: "start",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      color: "#475569",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Total Amount
                  </label>
                  <div
                    style={{
                      padding: "0.75rem",
                      backgroundColor: "#f1f5f9",
                      borderRadius: "0.75rem",
                      fontSize: "1rem",
                      color: "#1e293b",
                      fontWeight: "600",
                    }}
                  >
                    ₹ {calculateTotal()}
                  </div>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      color: "#475569",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Payment Collected
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    name="paymentCollected"
                    value={formData.paymentCollected}
                    onChange={handleChange}
                    // ✅ Block characters while typing
                    onKeyDown={(e) => {
                      if (
                        !/[0-9]/.test(e.key) &&
                        ![
                          "Backspace",
                          "Delete",
                          "ArrowLeft",
                          "ArrowRight",
                          "Tab",
                        ].includes(e.key)
                      ) {
                        e.preventDefault();
                      }
                    }}

                    // ✅ Block paste of non-numbers
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData("text");
                      if (!/^\d+$/.test(pasted)) {
                        e.preventDefault();
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.75rem",
                      backgroundColor: "#f8fafc",
                      fontSize: "1rem",
                      color: "#1e293b",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      color: "#475569",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Payment Due
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    name="paymentDue"
                    value={formData.paymentDue}
                    readOnly
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.75rem",
                      backgroundColor: "#e5e7eb",
                      fontSize: "1rem",
                      color: "#1e293b",
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      color: "#475569",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Payment Terms{" "}
                    {formData.orderType !== "Demo" && (
                      <span style={{ color: "#dc2626" }}>*</span>
                    )}
                  </label>
                  <select
                    name="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={handleChange}
                    required={formData.orderType !== "Demo"}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.75rem",
                      backgroundColor: "#f8fafc",
                      fontSize: "1rem",
                      color: "#1e293b",
                      appearance: "auto",
                    }}
                  >
                    <option value="" disabled>
                      Select Terms
                    </option>
                    {paymentTermsOptions.map((term) => (
                      <option key={term} value={term}>
                        {term}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      color: "#475569",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Payment Method
                  </label>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                    disabled={formData.paymentTerms === "Credit"}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.75rem",
                      backgroundColor: formData.paymentTerms === "Credit" ? "#e5e7eb" : "#f8fafc",
                      fontSize: "1rem",
                      color: "#1e293b",
                      appearance: "auto",
                      cursor: formData.paymentTerms === "Credit" ? "not-allowed" : "auto",
                    }}
                  >
                    <option value="">Select Method</option>
                    {paymentMethodOptions.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>
                {formData.paymentMethod === "NEFT" && (
                  <div>
                    <label
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: "600",
                        color: "#475569",
                        marginBottom: "0.5rem",
                      }}
                    >
                      NEFT Transaction ID
                    </label>
                    <input
                      type="text"
                      name="neftTransactionId"
                      value={formData.neftTransactionId}
                      onChange={handleChange}
                      placeholder="Enter NEFT Transaction ID"
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        border: "1px solid #e2e8f0",
                        borderRadius: "0.75rem",
                        backgroundColor: "#f8fafc",
                        fontSize: "1rem",
                        color: "#1e293b",
                      }}
                    />
                  </div>
                )}
                {formData.paymentMethod === "Cheque" && (
                  <div>
                    <label
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: "600",
                        color: "#475569",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Cheque Number
                    </label>
                    <input
                      type="text"
                      name="chequeId"
                      value={formData.chequeId}
                      onChange={handleChange}
                      placeholder="Enter Cheque Number"
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        border: "1px solid #e2e8f0",
                        borderRadius: "0.75rem",
                        backgroundColor: "#f8fafc",
                        fontSize: "1rem",
                        color: "#1e293b",
                      }}
                    />
                  </div>
                )}
                {(formData.paymentTerms === "Credit" ||
                  formData.paymentTerms === "Partial Advance") && (
                    <div>
                      <label
                        style={{
                          fontSize: "0.9rem",
                          fontWeight: "600",
                          color: "#475569",
                          marginBottom: "0.5rem",
                        }}
                      >
                        No. of Credit Days{" "}
                        <span style={{ color: "#dc2626" }}>*</span>
                      </label>
                      <select
                        name="creditDays"
                        value={formData.creditDays}
                        onChange={handleChange}
                        required
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          border: "1px solid #e2e8f0",
                          borderRadius: "0.75rem",
                          backgroundColor: "#f8fafc",
                          fontSize: "1rem",
                          color: "#1e293b",
                          appearance: "auto",
                        }}
                      >
                        <option value="" disabled>
                          -- Select Credit Days --
                        </option>
                        <option value="7">7 Days</option>
                        <option value="15">15 Days</option>
                        <option value="30">30 Days</option>
                      </select>
                    </div>
                  )}
                {formData.paymentTerms === "Credit" && (
                  <div>
                    <label style={{ fontSize: "0.9rem", fontWeight: "600", color: "#475569", marginBottom: "0.5rem", display: "block" }}>
                      PWC <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <select
                      name="pwc"
                      value={formData.pwc}
                      onChange={handleChange}
                      style={{ width: "100%", padding: "0.75rem", border: "1px solid #e2e8f0", borderRadius: "0.75rem", backgroundColor: "#f8fafc", fontSize: "1rem", color: "#1e293b", appearance: "auto" }}
                    >
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                )}
                {formData.paymentTerms === "Credit" && formData.pwc === "Yes" && (
                  <div>
                    <label style={{ fontSize: "0.9rem", fontWeight: "600", color: "#475569", marginBottom: "0.5rem", display: "block" }}>
                      Upload PWC Document <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <div style={{ display: "flex", alignItems: "center", border: `1px solid ${pwcFile ? "#22c55e" : "#e2e8f0"}`, borderRadius: "0.75rem", backgroundColor: "#f8fafc", padding: "0.5rem", width: "100%", height: "2.75rem", boxSizing: "border-box", overflow: "hidden" }}>
                      <label htmlFor="soPwcFile" style={{ flex: 1, padding: "0.5rem 0.75rem", background: "linear-gradient(135deg, #e2e8f0, #f8fafc)", borderRadius: "0.5rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.95rem", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", height: "100%" }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                          {pwcFile ? pwcFile.name : "Upload PWC (PDF, PNG, JPG, DOCX)"}
                        </span>
                      </label>
                      <input id="soPwcFile" type="file" accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.xls" onChange={(e) => setPwcFile(e.target.files[0] || null)} style={{ display: "none" }} />
                      {pwcFile && (
                        <button type="button" onClick={() => { setPwcFile(null); document.getElementById("soPwcFile").value = null; }} style={{ padding: "0.5rem", background: "none", border: "none", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }} title="Remove File">
                          <svg style={{ width: "1.25rem", height: "1.25rem" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div>
            <h3
              style={{
                fontSize: "1.5rem",
                background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontWeight: "700",
                marginBottom: "1rem",
                letterSpacing: "1px",
                fontFamily: "'Poppins', sans-serif",
                textShadow: "1px 1px 2px rgba(0, 0, 0, 0.05)",
              }}
            >
              📎 Attachment (Optional)
            </h3>
            <div
              className="grid-section"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: "1.5rem",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  className="file-upload-box"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.75rem",
                    backgroundColor: "#f8fafc",
                    padding: "0.5rem",
                    transition: "border-color 0.3s ease, box-shadow 0.3s ease",
                    width: "100%",
                    maxWidth: "300px", // Fixed width to match other fields
                    height: "2.75rem", // Fixed height to prevent expansion
                    boxSizing: "border-box",
                    overflow: "hidden",
                  }}
                >
                  <label
                    htmlFor="poFile"
                    style={{
                      flex: 1,
                      padding: "0.5rem 0.75rem",
                      background: "linear-gradient(135deg, #e2e8f0, #f8fafc)",
                      borderRadius: "0.5rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontSize: "0.95rem",
                      color: "#475569",
                      transition: "background 0.3s ease",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      height: "100%", // Ensure label fits container height
                    }}
                    onMouseOver={(e) =>
                    (e.currentTarget.style.background =
                      "linear-gradient(135deg, #d1d5db, #e5e7eb)")
                    }
                    onMouseOut={(e) =>
                    (e.currentTarget.style.background =
                      "linear-gradient(135deg, #e2e8f0, #f8fafc)")
                    }
                  >
                    <svg
                      style={{
                        width: "1.25rem",
                        height: "1.25rem",
                        color: "#6366f1",
                        flexShrink: 0, // Prevent icon shrinking
                      }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M7 16V8m0 0l-4 4m4-4l4 4m6-4v8m0 0l4-4m-4 4l-4-4"
                      />
                    </svg>
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                      }}
                    >
                      {poFile
                        ? poFile.name
                        : "Upload Attachment (PDF, PNG, JPG, DOCX, XLS, XLSX)"}
                    </span>
                  </label>
                  <input
                    id="poFile"
                    type="file"
                    name="poFile"
                    accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.xls"
                    onChange={handleFileChange}
                    style={{
                      display: "none",
                    }}
                  />
                  {poFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setPoFile(null);
                        setFileError("");
                        document.getElementById("poFile").value = null;
                      }}
                      style={{
                        padding: "0.5rem",
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        flexShrink: 0, // Prevent button shrinking
                      }}
                      title="Remove File"
                    >
                      <svg
                        style={{ width: "1.25rem", height: "1.25rem" }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
                {fileError && (
                  <span
                    style={{
                      color: "#ef4444",
                      fontSize: "0.8rem",
                      marginTop: "0.25rem",
                    }}
                  >
                    {fileError}
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Form Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "1rem",
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#e2e8f0",
                color: "#475569",
                border: "none",
                borderRadius: "0.75rem",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "0.75rem 1.5rem",
                background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
                color: "#ffffff",
                border: "none",
                borderRadius: "0.75rem",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? <Spinner animation="border" size="sm" /> : "Submit"}
            </button>
          </div>
        </form>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, -40%); }
          to   { opacity: 1; transform: translate(-50%, -50%); }
        }

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
          .product-grid { gap: 0.85rem !important; }
        }

        /* ── Tablet landscape 768px – 1023px ── */
        @media (min-width: 768px) and (max-width: 1023px) {
          .modal-container { width: 96% !important; max-width: 960px !important; max-height: 88vh !important; }
          .modal-scroll-inner { padding: 1.5rem !important; max-height: 88vh !important; }
          .grid-section { grid-template-columns: 1fr 1fr !important; gap: 1.25rem !important; }
          .product-grid { grid-template-columns: 1fr 1fr 1fr !important; gap: 0.85rem !important; }
          .product-grid > div:last-child, .product-grid > button { grid-column: span 1; }
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
          .product-grid { grid-template-columns: 1fr 1fr !important; gap: 0.75rem !important; }
          .product-grid > button { grid-column: span 2; width: 100% !important; }
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
          .product-grid { grid-template-columns: 1fr 1fr !important; gap: 0.75rem !important; }
          .product-grid > button { grid-column: span 2; width: 100% !important; align-self: center !important; }
          .modal-container h2 { font-size: 1.4rem !important; letter-spacing: 0.5px !important; }
          .modal-container h3 { font-size: 1.05rem !important; letter-spacing: 0.5px !important; }
          .modal-container label { font-size: 0.82rem !important; }
          .modal-container input, .modal-container select { font-size: 0.875rem !important; padding: 0.6rem 0.75rem !important; border-radius: 0.625rem !important; }
          .modal-container button[type="button"], .modal-container button[type="submit"] { padding: 0.6rem 1rem !important; font-size: 0.875rem !important; }
          .modal-container [style*="flexWrap: nowrap"] { flex-wrap: wrap !important; }
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
          .product-grid { grid-template-columns: 1fr !important; }
          .product-grid > button { grid-column: span 1 !important; }
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
