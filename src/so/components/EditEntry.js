import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Modal, Form, Spinner, Alert } from "react-bootstrap";
import axios from "../../so/axiosSetup";
import { toast } from "react-toastify";
import { useForm, Controller } from "react-hook-form";
import styled from "styled-components";
import debounce from "lodash/debounce";
import { FaEdit, FaSyncAlt, FaCog } from "react-icons/fa";
import { salesPersonlist } from "./Options";
import { Reportinglist } from "./Options";
import { productOptions } from "./Options";
import { printerOptions } from "./Options";
import { productCode } from "./Options";
import { getDirtyValues } from "../utils/formUtils"; // Import the Diff Utility
import { statesAndCities } from "./Options";

const StyledModal = styled(Modal)`
  .modal-content {
    border-radius: 12px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
    max-width: 600px;
    margin: auto;
  }
  .modal-header,
  .modal-footer {
    background: linear-gradient(135deg, #2575fc, #6a11cb);
    color: white;
    border: none;
  }
  .modal-body {
    padding: 2rem;
    background: #f9f9f9;
    max-height: 70vh;
    overflow-y: auto;
  }
`;

const StyledButton = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  color: white;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  background: ${(props) =>
    props.variant === "primary"
      ? "linear-gradient(135deg, #2575fc, #6a11cb)"
      : props.variant === "info"
        ? "linear-gradient(135deg, #2575fc, #6a11cb)"
        : props.variant === "danger"
          ? "#dc3545"
          : props.variant === "success"
            ? "#28a745"
            : "linear-gradient(135deg, rgb(252, 152, 11), rgb(244, 193, 10))"};
  &:hover {
    opacity: 0.9;
    transform: scale(1.05);
  }
`;

const FormSection = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
`;

const StyledNumberInput = styled(Form.Control)`
  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  -moz-appearance: textfield;
`;

const ProductContainer = styled.div`
  border: 1px solid #ced4da;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  background: #fff;
`;

const ProductHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

/**
 * Business Rule: Production Status Automation
 * Determines the production status based on the selected dispatch location.
 *
 * Rules:
 * - If dispatching from ANY location EXCEPT "Morinda" -> Status must be "Fulfilled".
 * - If dispatching from "Morinda" -> Status is user-editable (resets to "Pending" if previously auto-fulfilled).
 *
 * @param {string} dispatchFrom - The selected dispatch source.
 * @param {string} currentStatus - The current production (fulfilling) status.
 * @returns {string} The computed production status.
 */
const evaluateProductionStatus = (dispatchFrom, currentStatus) => {
  if (!dispatchFrom) return currentStatus || "Pending";

  // Rule 1: Non-Morinda locations always trigger "Fulfilled" status
  if (dispatchFrom !== "Morinda") {
    return "Fulfilled";
  }

  // Rule 2: Switching to "Morinda" from a "Fulfilled" state resets to "Pending"
  if (dispatchFrom === "Morinda" && currentStatus === "Fulfilled") {
    return "Pending";
  }

  return currentStatus || "Pending";
};

/**
 * Determines if the Production Status field should be disabled.
 * @param {string} dispatchFrom - The selected dispatch source.
 * @returns {boolean} True if the field should be read-only.
 */
const isProductionStatusDisabled = (dispatchFrom) => {
  return !!dispatchFrom && dispatchFrom !== "Morinda";
};

function EditEntry({ isOpen, onClose, onEntryUpdated, entryToEdit }) {
  const initialFormData = useMemo(
    () => ({
      soDate: "",
      dispatchFrom: "",
      dispatchDate: "",
      name: "",
      city: "",
      state: "",
      pinCode: "",
      contactNo: "",
      alterno: "",
      customerEmail: "",
      customername: "",
      gstno: "",
      products: [
        {
          productType: "",
          size: "N/A",
          spec: "N/A",
          qty: "",
          unitPrice: "",
          serialNos: "",
          modelNos: "",
          productCode: "",
          gst: "18",
          brand: "",
          warranty: "",
        },
      ],
      total: "",
      paymentCollected: "",
      paymentMethod: "",
      paymentDue: "",
      paymentTerms: "",
      creditDays: "",
      neftTransactionId: "",
      chequeId: "",
      freightcs: "",
      freightstatus: "Extra",
      actualFreight: "",
      installchargesstatus: "Extra",
      installationeng: "",
      orderType: "B2C",
      gemOrderNumber: "",
      deliveryDate: "",
      installation: "",
      installationStatus: "Pending",
      remarksByInstallation: "",
      dispatchStatus: "Not Dispatched",
      salesPerson: "",
      report: "",
      company: "Promark",
      transporter: "",
      transporterDetails: "",
      docketNo: "",
      receiptDate: "",
      shippingAddress: "",
      billingAddress: "",
      invoiceNo: "",
      invoiceDate: "",
      fulfillingStatus: "Pending",
      remarksByProduction: "",
      remarksByAccounts: "",
      paymentReceived: "Not Received",
      billNumber: "",
      piNumber: "",
      remarksByBilling: "",
      verificationRemarks: "",
      billStatus: "Pending",
      completionStatus: "In Progress",
      fulfillmentDate: "",
      remarks: "",
      stamp: "Not Received",
      installationReport: "No",
      stockStatus: "In Stock",
      sostatus: "Pending for Approval",
      createdBy: "",
      approvalTimestamp: null, // New field
      productsEditTimestamp: null, // New field
    }),
    [],
  );

  const initialUpdateData = useMemo(
    () => ({
      sostatus: "Pending for Approval",
      productno: "",
      remarks: "",
      poFilePath: "",
      installationFile: "",
    }),
    [],
  );

  const [, setFormData] = useState(initialFormData);
  const [poFile, setPoFile] = useState(null);
  const [installationFile, setInstallationFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [installationFileError, setInstallationFileError] = useState("");
  const [originalFormData, setOriginalFormData] = useState(initialFormData); // Store original state for diffing
  const [updateData, setUpdateData] = useState(initialUpdateData);
  const [view, setView] = useState("options");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [userRole, setUserRole] = useState(localStorage.getItem("role") || "");
  useEffect(() => {
    setUserRole(localStorage.getItem("role") || "");
  }, [isOpen]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
    setValue,
    getValues,
  } = useForm({
    mode: "onChange",
    defaultValues: initialFormData,
  });

  const selectedState = watch("state");
  const products = watch("products") || [];
  const paymentMethod = watch("paymentMethod");
  const dispatchFrom = watch("dispatchFrom");
  const fulfillingStatus = watch("fulfillingStatus");

  useEffect(() => {
    if (isOpen && entryToEdit) {
      const newFormData = {
        soDate: entryToEdit.soDate
          ? new Date(entryToEdit.soDate).toISOString().split("T")[0]
          : "",
        dispatchFrom: entryToEdit.dispatchFrom || "",
        dispatchDate: entryToEdit.dispatchDate
          ? new Date(entryToEdit.dispatchDate).toISOString().split("T")[0]
          : "",
        name: entryToEdit.name || "",
        city: entryToEdit.city || "",
        state: entryToEdit.state || "",
        pinCode: entryToEdit.pinCode || "",
        contactNo: entryToEdit.contactNo || "",
        alterno: entryToEdit.alterno || "",
        customerEmail: entryToEdit.customerEmail || "",
        customername: entryToEdit.customername || "",
        gstno: entryToEdit.gstno || "",
        products:
          entryToEdit.products && entryToEdit.products.length > 0
            ? entryToEdit.products.map((p) => {
                const isCustom = !Object.keys(productOptions).includes(
                  p.productType,
                );
                return {
                  productType: isCustom ? "Others" : p.productType || "",
                  customProductType: isCustom ? p.productType : "",
                  size: p.size || "N/A",
                  spec: p.spec || "N/A",
                  qty: p.qty !== undefined ? String(p.qty) : "",
                  unitPrice:
                    p.unitPrice !== undefined ? String(p.unitPrice) : "",
                  serialNos:
                    p.serialNos?.length > 0 ? p.serialNos.join(", ") : "",
                  modelNos: p.modelNos?.length > 0 ? p.modelNos.join(", ") : "",
                  productCode:
                    p.productCode?.length > 0 ? p.productCode.join(", ") : "",
                  gst: p.gst || "18",
                  brand: p.brand || "",
                  warranty: p.warranty || "",
                };
              })
            : [
                {
                  productType: "",
                  customProductType: "",
                  size: "N/A",
                  spec: "N/A",
                  qty: "",
                  unitPrice: "",
                  serialNos: "",
                  modelNos: "",
                  productCode: "",
                  gst: "18",
                  brand: "",
                  warranty: "",
                },
              ],
        total: entryToEdit.total !== undefined ? String(entryToEdit.total) : "",
        paymentCollected: entryToEdit.paymentCollected || "",
        paymentMethod: entryToEdit.paymentMethod || "",
        paymentDue: entryToEdit.paymentDue || "",
        paymentTerms: entryToEdit.paymentTerms || "",
        stamp: entryToEdit.stamp || "Not Received",
        installationReport: entryToEdit.installationReport || "No",
        installationeng: entryToEdit.installationeng || "",
        creditDays: entryToEdit.creditDays || "",
        neftTransactionId: entryToEdit.neftTransactionId || "",
        chequeId: entryToEdit.chequeId || "",
        freightcs: entryToEdit.freightcs || "",
        freightstatus: entryToEdit.freightstatus || "Extra",
        actualFreight:
          entryToEdit.actualFreight !== undefined
            ? String(entryToEdit.actualFreight)
            : "",
        installchargesstatus: entryToEdit.installchargesstatus || "Extra",
        orderType: entryToEdit.orderType || "B2C",
        gemOrderNumber: entryToEdit.gemOrderNumber || "",
        deliveryDate: entryToEdit.deliveryDate
          ? new Date(entryToEdit.deliveryDate).toISOString().split("T")[0]
          : "",
        installation: entryToEdit.installation || "",
        installationStatus: entryToEdit.installationStatus || "Pending",
        remarksByInstallation: entryToEdit.remarksByInstallation || "",
        dispatchStatus: entryToEdit.dispatchStatus || "Not Dispatched",
        salesPerson: entryToEdit.salesPerson || "",
        report: entryToEdit.report || "",
        company: entryToEdit.company || "Promark",
        transporter: entryToEdit.transporter || "",
        transporterDetails: entryToEdit.transporterDetails || "",
        docketNo: entryToEdit.docketNo || "",
        receiptDate: entryToEdit.receiptDate
          ? new Date(entryToEdit.receiptDate).toISOString().split("T")[0]
          : "",
        shippingAddress: entryToEdit.shippingAddress || "",
        billingAddress: entryToEdit.billingAddress || "",
        invoiceNo: entryToEdit.invoiceNo || "",
        invoiceDate: entryToEdit.invoiceDate
          ? new Date(entryToEdit.invoiceDate).toISOString().split("T")[0]
          : "",
        fulfillingStatus: entryToEdit.fulfillingStatus || "Pending",
        remarksByProduction: entryToEdit.remarksByProduction || "",
        remarksByAccounts: entryToEdit.remarksByAccounts || "",
        paymentReceived: entryToEdit.paymentReceived || "Not Received",
        billNumber: entryToEdit.billNumber || "",
        piNumber: entryToEdit.piNumber || "",
        remarksByBilling: entryToEdit.remarksByBilling || "",
        verificationRemarks: entryToEdit.verificationRemarks || "",
        billStatus: entryToEdit.billStatus || "Pending",
        stockStatus: entryToEdit.stockStatus || "In Stock",

        completionStatus: entryToEdit.completionStatus || "In Progress",
        fulfillmentDate: entryToEdit.fulfillmentDate
          ? new Date(entryToEdit.fulfillmentDate).toISOString().split("T")[0]
          : "",
        remarks: entryToEdit.remarks || "",
        sostatus: entryToEdit.sostatus || "Pending for Approval",

        createdBy:
          entryToEdit.createdBy && typeof entryToEdit.createdBy === "object"
            ? entryToEdit.createdBy.username || "Unknown"
            : typeof entryToEdit.createdBy === "string"
              ? entryToEdit.createdBy
              : "",
        approvalTimestamp: entryToEdit.approvalTimestamp
          ? new Date(entryToEdit.approvalTimestamp).toISOString().split("T")[0]
          : null,
        productsEditTimestamp: entryToEdit.productsEditTimestamp
          ? new Date(entryToEdit.productsEditTimestamp)
              .toISOString()
              .split("T")[0]
          : null,
      };
      setFormData(newFormData);
      setOriginalFormData(newFormData); // Capture baseline for diffing
      setUpdateData({
        sostatus: entryToEdit.sostatus || "Pending for Approval",
        productno: entryToEdit.productno || "",
        productno: entryToEdit.productno || "",
        remarks: entryToEdit.remarks || "",
        poFilePath: entryToEdit.poFilePath || "",
        installationFile: entryToEdit.installationFile || "",
      });
      reset(newFormData);
      setPoFile(null);
      setInstallationFile(null);
      setFileError("");
      setInstallationFileError("");
    }
    setView("options");
    setError(null);
    setShowConfirm(false);
  }, [isOpen, entryToEdit, reset]);

  // Business Rule: Production Status Automation removed from useEffect to prevent reset on load.
  // Logic is now handled in dispatchFrom onChange event.

  const debouncedHandleInputChange = useCallback(
    debounce((name, value, index) => {
      if (name.startsWith("products.")) {
        const [_, field, idx] = name.split(".");
        setFormData((prev) => {
          const newProducts = [...prev.products];
          newProducts[idx] = {
            ...newProducts[idx],
            [field]: value,
          };
          return { ...prev, products: newProducts };
        });
      } else {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
        }));
      }
    }, 300),
    [],
  );

  const handleUpdateInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setUpdateData((prev) => ({ ...prev, [name]: value }));
  }, []);

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
      const allowedExtensions = [
        "pdf",
        "png",
        "jpg",
        "jpeg",
        "doc",
        "docx",
        "xls",
        "xlsx",
      ];
      const fileExt = file.name.split(".").pop().toLowerCase();

      if (
        !allowedTypes.includes(file.type) &&
        !allowedExtensions.includes(fileExt)
      ) {
        setFileError(
          "Invalid file type. Only PDF, PNG, JPG, DOCX, XLS, XLSX are allowed.",
        );
        toast.error(
          "Invalid file type. Only PDF, PNG, JPG, DOCX, XLS, XLSX are allowed.",
        );
        e.target.value = null;
        setPoFile(null);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setFileError("File size must be less than 10MB");
        toast.error("File size must be less than 10MB");
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

  const handleInstallationFileChange = (e) => {
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
      const allowedExtensions = [
        "pdf",
        "png",
        "jpg",
        "jpeg",
        "doc",
        "docx",
        "xls",
        "xlsx",
      ];
      const fileExt = file.name.split(".").pop().toLowerCase();

      if (
        !allowedTypes.includes(file.type) &&
        !allowedExtensions.includes(fileExt)
      ) {
        setInstallationFileError(
          "Invalid file type. Only PDF, PNG, JPG, DOCX, XLS, XLSX are allowed.",
        );
        toast.error(
          "Invalid file type. Only PDF, PNG, JPG, DOCX, XLS, XLSX are allowed.",
        );
        e.target.value = null;
        setInstallationFile(null);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setInstallationFileError("File size must be less than 10MB");
        toast.error("File size must be less than 10MB");
        e.target.value = null;
        setInstallationFile(null);
        return;
      }
      setInstallationFile(file);
      setInstallationFileError("");
    } else {
      setInstallationFile(null);
      setInstallationFileError("");
    }
  };

  const onEditSubmit = async (data) => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }
    setLoading(true);
    try {
      const submissionData = {
        soDate: data.soDate ? new Date(data.soDate) : undefined,
        dispatchFrom: data.dispatchFrom || null,
        dispatchDate: data.dispatchDate ? new Date(data.dispatchDate) : null,
        name: data.name || null,
        city: data.city || null,
        state: data.state || null,
        pinCode: data.pinCode || null,
        contactNo: data.contactNo || null,
        alterno: data.alterno || null,
        customerEmail: data.customerEmail || null,
        customername: data.customername || null,
        gstno: data.gstno || null,
        products: data.products.map((p) => ({
          productType:
            p.productType === "Others"
              ? p.customProductType
              : p.productType || undefined,
          size: p.size || "N/A",
          spec: p.spec || "N/A",
          qty: p.qty ? Number(p.qty) : undefined,
          unitPrice:
            p.unitPrice !== undefined && p.unitPrice !== ""
              ? Number(p.unitPrice)
              : undefined,
          serialNos: p.serialNos
            ? p.serialNos
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
          modelNos: p.modelNos
            ? p.modelNos
                .split(",")
                .map((m) => m.trim())
                .filter(Boolean)
            : [],
          productCode: p.productCode,
          gst: p.gst || "18",
          brand: p.brand || null,
          warranty: p.warranty || null,
        })),
        total: data.total ? Number(data.total) : undefined,
        paymentCollected: data.paymentCollected || null,
        paymentMethod: data.paymentMethod || null,
        paymentDue: data.paymentDue || null,
        paymentTerms: data.paymentTerms || null,
        creditDays: data.creditDays || null,
        neftTransactionId: data.neftTransactionId || null,
        chequeId: data.chequeId || null,
        freightcs: data.freightcs || null,
        freightstatus: data.freightstatus || "Extra",
        actualFreight: data.actualFreight
          ? Number(data.actualFreight)
          : undefined,
        installchargesstatus: data.installchargesstatus || "Extra",
        orderType: data.orderType || "B2C",
        gemOrderNumber: data.gemOrderNumber || null,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
        installation: data.installation || null,
        installationeng: data.installationeng || null,
        installationStatus: data.installationStatus || "Pending",
        remarksByInstallation: data.remarksByInstallation || null,
        dispatchStatus: data.dispatchStatus || "Not Dispatched",
        stamp: data.stamp || null,
        installationReport: data.installationReport || null,
        salesPerson: data.salesPerson || null,
        report: data.report || null,
        company: data.company || "Promark",
        transporter: data.transporter || null,
        transporterDetails: data.transporterDetails || null,
        docketNo: data.docketNo || null,
        receiptDate: data.receiptDate ? new Date(data.receiptDate) : null,
        shippingAddress: data.shippingAddress || null,
        billingAddress: data.billingAddress || null,
        invoiceNo: data.invoiceNo || null,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
        fulfillingStatus: data.fulfillingStatus || "Pending",
        remarksByProduction: data.remarksByProduction || null,
        remarksByAccounts: data.remarksByAccounts || null,
        paymentReceived: data.paymentReceived || "Not Received",
        billNumber: data.billNumber || null,
        piNumber: data.piNumber || null,
        remarksByBilling: data.remarksByBilling || null,
        verificationRemarks: data.verificationRemarks || null,
        billStatus: data.billStatus || "Pending",
        completionStatus: data.completionStatus || "In Progress",
        fulfillmentDate: data.fulfillmentDate
          ? new Date(data.fulfillmentDate)
          : null,
        remarks: data.remarks || null,
        sostatus: data.sostatus || "Pending for Approval",

        stockStatus: data.stockStatus || "In Stock",
      };

      // ---------------------------------------------------------
      // PATCH REFACTOR: Only send changed fields
      // ---------------------------------------------------------
      const dirtyFieldsMap = getDirtyValues(originalFormData, data); // Calculate changed fields
      const dirtyKeys = Object.keys(dirtyFieldsMap);

      if (dirtyKeys.length === 0 && !poFile && !installationFile) {
        toast.info("No changes detected.");
        setLoading(false);
        setShowConfirm(false);
        return;
      }

      let response;

      if (poFile || installationFile) {
        // Use FormData if file is present
        const formDataPayload = new FormData();
        dirtyKeys.forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(submissionData, key)) {
            if (key === "products") {
              formDataPayload.append(key, JSON.stringify(submissionData[key]));
            } else {
              formDataPayload.append(key, submissionData[key]);
            }
          }
        });
        if (poFile) {
          formDataPayload.append("poFile", poFile);
        }
        if (installationFile) {
          formDataPayload.append("installationFile", installationFile);
        }

        response = await axios.patch(
          `${process.env.REACT_APP_SO_URL}/api/edit/${entryToEdit._id}`,
          formDataPayload,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
      } else {
        // Use JSON if no file (existing logic)
        // Construct final payload by picking only dirty keys from the processed submissionData
        const finalPayload = {};
        dirtyKeys.forEach((key) => {
          // If the key exists in submissionData, add it.
          // We use submissionData because it has the correct type conversions (Dates, Numbers, mapped Arrays)
          if (Object.prototype.hasOwnProperty.call(submissionData, key)) {
            finalPayload[key] = submissionData[key];
          }
        });

        response = await axios.patch(
          `${process.env.REACT_APP_SO_URL}/api/edit/${entryToEdit._id}`,
          finalPayload, // Send filtered payload
          {
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const updatedEntry = response.data.data;
      // Hinglish: Local toast hata diya; socket 'notification' se single toast aayega (no duplicate)
      onEntryUpdated(updatedEntry);
      setView("options");
      onClose();
    } catch (error) {
      console.error("Edit submission error:", error);

      let errorMessage = "Failed to update entry.";

      if (error.response) {
        // Prioritize server-sent error message
        errorMessage =
          error.response.data?.error ||
          error.response.data?.message ||
          errorMessage;

        // Fallback to status-based messages only if no specific message is returned
        if (!error.response.data?.error && !error.response.data?.message) {
          if (error.response.status === 400) {
            errorMessage = "Some required details are missing or incorrect.";
          } else if (error.response.status === 401) {
            errorMessage = "Your session has expired. Please log in again.";
          } else if (error.response.status === 403) {
            errorMessage = "You don’t have permission to update this entry.";
          } else if (error.response.status === 404) {
            errorMessage = "The entry you are trying to update was not found.";
          } else if (error.response.status === 500) {
            errorMessage = "Server error. Please try again later.";
          }
        }
      } else if (error.request) {
        errorMessage =
          "Unable to connect to the server. Please check your internet connection.";
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  const onUpdateSubmit = async () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }
    setLoading(true);
    try {
      const submissionData = {
        sostatus: updateData.sostatus || "Pending for Approval",
        productno: updateData.productno,
        remarks: updateData.remarks || null,
      };
      const response = await axios.patch(
        `${process.env.REACT_APP_SO_URL}/api/edit/${entryToEdit._id}`,
        submissionData,
        {
          headers: { "Content-Type": "application/json" },
        },
      );

      const updatedEntry = response.data.data;
      // Hinglish: Local toast hata diya; realtime notification socket se aayega
      onEntryUpdated(updatedEntry);
      setView("options");
      onClose();
    } catch (error) {
      console.error("Error updating approvals:", error);

      let errorMessage = "Something went wrong while updating approvals.";

      if (error.response) {
        if (error.response.status === 400) {
          errorMessage =
            "Some details are missing or incorrect. Please check the inputs.";
        } else if (error.response.status === 401) {
          errorMessage = "Your session has expired. Please log in again.";
        } else if (error.response.status === 403) {
          errorMessage = "You don’t have permission to update approvals.";
        } else if (error.response.status === 404) {
          errorMessage = "The entry you are trying to update was not found.";
        } else if (error.response.status === 500) {
          errorMessage = "Server error. Please try again later.";
        } else {
          errorMessage = error.response.data?.message || errorMessage;
        }
      } else if (error.request) {
        errorMessage =
          "Unable to connect to the server. Please check your internet connection.";
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  const addProduct = () => {
    const newProducts = [
      ...products,
      {
        productType: "",
        customProductType: "",
        size: "N/A",
        spec: "N/A",
        qty: "",
        unitPrice: "",
        serialNos: "",
        modelNos: "",
        productCode: "",
        gst: "18",
        brand: "",
        warranty: "",
      },
    ];
    setValue("products", newProducts);
    setFormData((prev) => ({ ...prev, products: newProducts }));
  };

  const removeProduct = (index) => {
    const newProducts = products.filter((_, i) => i !== index);
    setValue(
      "products",
      newProducts.length > 0
        ? newProducts
        : [
            {
              productType: "",
              customProductType: "",
              size: "N/A",
              spec: "N/A",
              qty: "",
              unitPrice: "",
              serialNos: "",
              modelNos: "",
              productCode: "",
              gst: "18",
              brand: "",
              warranty: "",
            },
          ],
    );
    setFormData((prev) => ({
      ...prev,
      products:
        newProducts.length > 0
          ? newProducts
          : [
              {
                productType: "",
                customProductType: "",
                size: "N/A",
                spec: "N/A",
                qty: "",
                unitPrice: "",
                serialNos: "",
                modelNos: "",
                gst: "18",
                brand: "",
                warranty: "",
              },
            ],
    }));
  };

  const renderOptions = () => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-around",
        padding: "1rem",
      }}
    >
      <StyledButton variant="primary" onClick={() => setView("edit")}>
        Edit Full Details
      </StyledButton>
      {(userRole === "Admin" || userRole === "SuperAdmin") && (
        <StyledButton variant="info" onClick={() => setView("update")}>
          Update Approvals
        </StyledButton>
      )}
    </div>
  );

  const renderEditForm = () => (
    <Form onSubmit={handleSubmit(onEditSubmit)}>
      <FormSection>
        <Form.Group controlId="createdBy">
          <Form.Label>👤 Created By</Form.Label>
          <Form.Control
            {...register("createdBy")}
            readOnly
            disabled
            isInvalid={!!errors.createdBy}
            placeholder="Auto-filled from system"
          />
        </Form.Group>
        <Form.Group controlId="soDate">
          <Form.Label>📅 SO Date *</Form.Label>
          <Form.Control
            type="date"
            {...register("soDate", { required: "SO Date is required" })}
            onChange={(e) =>
              debouncedHandleInputChange("soDate", e.target.value)
            }
            isInvalid={!!errors.soDate}
          />
          <Form.Control.Feedback type="invalid">
            {errors.soDate?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="dispatchFrom">
          <Form.Label>📍 Dispatch From</Form.Label>
          <Controller
            name="dispatchFrom"
            control={control}
            render={({ field }) => (
              <Form.Select
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  debouncedHandleInputChange("dispatchFrom", e.target.value);

                  // Business Rule: Update Production Status when Dispatch location changes
                  const newVal = e.target.value;
                  const currentStatus = getValues("fulfillingStatus");
                  const nextStatus = evaluateProductionStatus(
                    newVal,
                    currentStatus,
                  );

                  if (nextStatus !== currentStatus) {
                    setValue("fulfillingStatus", nextStatus, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                  }
                }}
                isInvalid={!!errors.dispatchFrom}
                aria-label="Dispatch From"
              >
                <option value="" disabled>
                  -- Select Dispatch Location --
                </option>
                <option value="Patna">Patna</option>
                <option value="Bareilly">Bareilly</option>
                <option value="Morinda">Morinda</option>
                <option value="Ranchi">Ranchi</option>
                <option value="Lucknow">Lucknow</option>
                <option value="Delhi">Delhi</option>
                <option value="Jaipur">Jaipur</option>
                <option value="Rajasthan">Rajasthan</option>
              </Form.Select>
            )}
          />
        </Form.Group>
        <Form.Group controlId="dispatchDate">
          <Form.Label>📅 Dispatch Date</Form.Label>
          <Form.Control
            type="date"
            {...register("dispatchDate")}
            onChange={(e) =>
              debouncedHandleInputChange("dispatchDate", e.target.value)
            }
            isInvalid={!!errors.dispatchDate}
          />
        </Form.Group>
        <Form.Group controlId="deliveryDate">
          <Form.Label>📅 Delivery Date</Form.Label>
          <Form.Control
            type="date"
            {...register("deliveryDate")}
            onChange={(e) =>
              debouncedHandleInputChange("deliveryDate", e.target.value)
            }
            isInvalid={!!errors.deliveryDate}
          />
        </Form.Group>
        <Form.Group controlId="name">
          <Form.Label>👤 Contact Person</Form.Label>
          <Form.Control
            {...register("name")}
            onChange={(e) => debouncedHandleInputChange("name", e.target.value)}
            isInvalid={!!errors.name}
            placeholder="e.g., Rahul Sharma"
          />
        </Form.Group>
        <Form.Group controlId="customername">
          <Form.Label>👤 Customer Name</Form.Label>
          <Form.Control
            {...register("customername")}
            onChange={(e) =>
              debouncedHandleInputChange("customername", e.target.value)
            }
            isInvalid={!!errors.customername}
            placeholder="e.g., ABC Enterprises Pvt Ltd"
          />
        </Form.Group>
        <Form.Group controlId="customerEmail">
          <Form.Label>📧 Customer Email</Form.Label>
          <Form.Control
            type="email"
            {...register("customerEmail", {
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Invalid email format",
              },
            })}
            onChange={(e) =>
              debouncedHandleInputChange("customerEmail", e.target.value)
            }
            isInvalid={!!errors.customerEmail}
            placeholder="e.g., customer@example.com"
          />
          <Form.Control.Feedback type="invalid">
            {errors.customerEmail?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="contactNo">
          <Form.Label>📱 Contact Number</Form.Label>
          <Form.Control
            type="tel" // Hinglish: Mobile ke liye tel type better hai
            maxLength={10} // Hinglish: Sirf 10 digits allow karte hain
            {...register("contactNo", {
              pattern: {
                value: /^\d{10}$/,
                message: "Contact number must be exactly 10 digits",
              },
            })}
            onChange={(e) => {
              // Hinglish: Sirf numbers allow karte hain, spaces aur special characters remove kar dete hain
              const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 10);
              debouncedHandleInputChange("contactNo", value);
            }}
            // Hinglish: Paste event ko handle karte hain mobile numbers ke liye
            onPaste={(e) => {
              e.preventDefault();
              const paste = (e.clipboardData || window.clipboardData).getData(
                "text",
              );
              const value = paste.replace(/[^0-9]/g, "").slice(0, 10);
              setValue("contactNo", value, { shouldValidate: true });
              debouncedHandleInputChange("contactNo", value);
            }}
            // Hinglish: Keypress event se non-numeric characters ko block karte hain
            onKeyPress={(e) => {
              // Hinglish: Sirf numbers, backspace, delete, arrow keys allow karte hain
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
            isInvalid={!!errors.contactNo}
            placeholder="Enter 10-digit contact number"
          />
          <Form.Control.Feedback type="invalid">
            {errors.contactNo?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="alterno">
          <Form.Label>📞 Alternate Contact Number</Form.Label>
          <Form.Control
            type="tel" // Hinglish: Mobile ke liye tel type better hai
            maxLength={10} // Hinglish: Sirf 10 digits allow karte hain
            {...register("alterno", {
              pattern: {
                value: /^\d{10}$/,
                message: "Alternate contact number must be exactly 10 digits",
              },
            })}
            onChange={(e) => {
              // Hinglish: Sirf numbers allow karte hain, spaces aur special characters remove kar dete hain
              const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 10);
              debouncedHandleInputChange("alterno", value);
            }}
            // Hinglish: Paste event ko handle karte hain mobile numbers ke liye
            onPaste={(e) => {
              e.preventDefault();
              const paste = (e.clipboardData || window.clipboardData).getData(
                "text",
              );
              const value = paste.replace(/[^0-9]/g, "").slice(0, 10);
              setValue("alterno", value, { shouldValidate: true });
              debouncedHandleInputChange("alterno", value);
            }}
            // Hinglish: Keypress event se non-numeric characters ko block karte hain
            onKeyPress={(e) => {
              // Hinglish: Sirf numbers, backspace, delete, arrow keys allow karte hain
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
            isInvalid={!!errors.alterno}
            placeholder="Enter 10-digit alternate number"
          />
          <Form.Control.Feedback type="invalid">
            {errors.alterno?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="gstno">
          <Form.Label>📑 GST Number</Form.Label>
          <Form.Control
            {...register("gstno")}
            onChange={(e) =>
              debouncedHandleInputChange("gstno", e.target.value)
            }
            isInvalid={!!errors.gstno}
            placeholder="e.g., 22AAAAA0000A1Z5"
          />
          <Form.Control.Feedback type="invalid">
            {errors.gstno?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="state">
          <Form.Label>🗺️ State</Form.Label>
          <Controller
            name="state"
            control={control}
            render={({ field }) => (
              <Form.Select
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  debouncedHandleInputChange("state", e.target.value);
                }}
                isInvalid={!!errors.state}
              >
                <option value="">-- Select State --</option>
                {Object.keys(statesAndCities).map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </Form.Select>
            )}
          />
        </Form.Group>
        <Form.Group controlId="city">
          <Form.Label>🌆 City</Form.Label>
          <Controller
            name="city"
            control={control}
            render={({ field }) => (
              <Form.Select
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  debouncedHandleInputChange("city", e.target.value);
                }}
                isInvalid={!!errors.city}
                disabled={!selectedState}
              >
                <option value="">-- Select City --</option>
                {selectedState &&
                  statesAndCities[selectedState]?.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
              </Form.Select>
            )}
          />
        </Form.Group>
        <Form.Group controlId="pinCode">
          <Form.Label>📮 Pin Code</Form.Label>
          <Form.Control
            type="tel"
            maxLength={6}
            {...register("pinCode", {
              pattern: {
                value: /^\d{6}$/,
                message: "Pin Code must be 6 digits",
              },
            })}
            onChange={(e) => {
              // Only allow numbers
              const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
              e.target.value = value;
              debouncedHandleInputChange("pinCode", value);
            }}
            isInvalid={!!errors.pinCode}
            placeholder="Enter 6-digit pin code"
          />
          <Form.Control.Feedback type="invalid">
            {errors.pinCode?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="shippingAddress">
          <Form.Label>📦 Shipping Address</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            {...register("shippingAddress")}
            onChange={(e) =>
              debouncedHandleInputChange("shippingAddress", e.target.value)
            }
            isInvalid={!!errors.shippingAddress}
            placeholder="e.g., 123, Industrial Area, Sector 5, Near Metro Station"
          />
        </Form.Group>
        <Form.Group controlId="billingAddress">
          <Form.Label>🏠 Billing Address</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            {...register("billingAddress")}
            onChange={(e) =>
              debouncedHandleInputChange("billingAddress", e.target.value)
            }
            isInvalid={!!errors.billingAddress}
            placeholder="e.g., 456, Commercial Complex, Main Road, City Center"
          />
        </Form.Group>
        <Form.Group controlId="orderType">
          <Form.Label>📦 Order Type</Form.Label>
          <Controller
            name="orderType"
            control={control}
            render={({ field }) => (
              <Form.Select
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  debouncedHandleInputChange("orderType", e.target.value);
                }}
                isInvalid={!!errors.orderType}
              >
                <option value="B2G">B2G</option>
                <option value="B2C">B2C</option>
                <option value="B2B">B2B</option>
                <option value="Demo">Demo</option>
                <option value="Repair">Repair</option>
                <option value="Replacement">Replacement</option>
              </Form.Select>
            )}
          />
        </Form.Group>
        <Form.Group controlId="stockStatus">
          <Form.Label>📦 Stock Status</Form.Label>
          <Controller
            name="stockStatus"
            control={control}
            render={({ field }) => (
              <Form.Select
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  debouncedHandleInputChange("stockStatus", e.target.value);
                }}
                isInvalid={!!errors.stockStatus}
              >
                <option value="">-- Select Stock Status --</option>
                <option value="In Stock">In Stock</option>
                <option value="Not in Stock">Not in Stock</option>
                <option value="Partial Stock">Partial Stock</option>
              </Form.Select>
            )}
          />
          <Form.Control.Feedback type="invalid">
            {errors.stockStatus?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="gemOrderNumber">
          <Form.Label>📄 GEM Order Number</Form.Label>
          <Form.Control
            {...register("gemOrderNumber")}
            onChange={(e) =>
              debouncedHandleInputChange("gemOrderNumber", e.target.value)
            }
            isInvalid={!!errors.gemOrderNumber}
            placeholder="e.g., GEMC-511687-123456"
          />
        </Form.Group>
        <div style={{ marginTop: "1.5rem", marginBottom: "2rem" }}>
          <Form.Label
            style={{
              fontWeight: "600",
              color: "#374151",
              marginBottom: "0.5rem",
              display: "block",
            }}
          >
            📎 Attachment
          </Form.Label>
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              overflow: "hidden",
              boxSizing: "border-box",
              border: "2px dashed",
              borderColor: poFile ? "#22c55e" : "#cbd5e1",
              borderRadius: "1rem",
              padding: "0.75rem",
              backgroundColor: poFile ? "#f0fdf4" : "#f8fafc",
              transition: "all 0.2s ease-in-out",
            }}
          >
            <label
              htmlFor="poFileEdit"
              title={poFile ? poFile.name : "Click to upload"}
              style={{
                display: "grid",
                gridTemplateColumns: "auto minmax(0, 1fr)",
                alignItems: "center",
                gap: "0.75rem",
                width: "100%",
                minHeight: "44px",
                padding: "0.6rem 0.75rem",
                borderRadius: "0.75rem",
                background: "linear-gradient(to right, #ffffff, #f1f5f9)",
                border: "1px solid #e2e8f0",
                cursor: "pointer",
                overflow: "hidden",
                boxSizing: "border-box",
                transition: "background 0.2s ease",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "#e2e8f0")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.background =
                  "linear-gradient(to right, #ffffff, #f1f5f9)")
              }
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "1.4rem",
                  height: "1.4rem",
                }}
              >
                <svg
                  style={{
                    width: "100%",
                    height: "100%",
                    color: "#4f46e5",
                  }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 16V8m0 0l-4 4m4-4l4 4"
                  />
                </svg>
              </div>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: "#1e293b",
                  fontSize: "0.9rem",
                  fontWeight: "500",
                  display: "block",
                }}
              >
                {poFile
                  ? poFile.name
                  : updateData.poFilePath
                    ? "Replace existing attachment"
                    : "Click to upload attachment"}
              </span>
            </label>

            {/* HIDDEN INPUT */}
            <input
              id="poFileEdit"
              type="file"
              name="poFile"
              accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.xls"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            {/* FILE TYPES INFO */}
            <div
              style={{
                fontSize: "0.75rem",
                color: "#64748b",
                marginTop: "0.5rem",
                textAlign: "center",
                fontWeight: "500",
              }}
            >
              Supported: PDF, JPG, PNG, DOCX, XLSX
            </div>

            {/* REMOVE BUTTON */}
            {poFile && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault(); // Prevent label trigger
                  setPoFile(null);
                  setFileError("");
                  const input = document.getElementById("poFileEdit");
                  if (input) input.value = "";
                }}
                style={{
                  marginTop: "0.75rem",
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #fecaca",
                  background: "#fee2e2",
                  color: "#b91c1c",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.35rem",
                  transition: "background 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "#fca5a5")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "#fee2e2")
                }
              >
                <span>✖</span> Remove Attachment
              </button>
            )}
          </div>

          {/* ERROR MESSAGE */}
          {fileError && (
            <div
              style={{
                color: "#ef4444",
                fontSize: "0.85rem",
                marginTop: "0.5rem",
                fontWeight: "500",
              }}
            >
              {fileError}
            </div>
          )}

          {/* EXISTING FILE LINK */}
          {updateData.poFilePath && !poFile && (
            <div
              style={{
                marginTop: "0.75rem",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span style={{ color: "#64748b" }}>Current file:</span>
              <a
                href={`${process.env.REACT_APP_SO_URL}${updateData.poFilePath}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#2563eb",
                  fontWeight: "600",
                  textDecoration: "underline",
                  textUnderlineOffset: "2px",
                }}
              >
                View Attachment
              </a>
            </div>
          )}
        </div>
        {/* Products Section */}
        <div>
          <Form.Label
            style={{
              fontSize: "1.5rem",
              background: "linear-gradient(135deg, #2575fc, #6a11cb)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontWeight: "700",
              marginBottom: "1.5rem",
              marginTop: "1.5rem",
              letterSpacing: "1px",
              textShadow: "1px 1px 2px rgba(0, 0, 0, 0.05)",
            }}
          >
            ✨ Products *
          </Form.Label>
          {products.map((product, index) => {
            const selectedProductType = watch(`products.${index}.productType`);
            const isOthers =
              selectedProductType === "Others" ||
              (selectedProductType &&
                !Object.keys(productOptions).includes(selectedProductType));
            const availableSizes = isOthers
              ? []
              : selectedProductType
                ? productOptions[selectedProductType]?.sizes || ["N/A"]
                : ["N/A"];
            const availableSpecs = isOthers
              ? []
              : selectedProductType
                ? productOptions[selectedProductType]?.specs || ["N/A"]
                : ["N/A"];

            return (
              <ProductContainer key={index}>
                <ProductHeader>
                  <h5>Product {index + 1}</h5>
                  {products.length > 1 && (
                    <StyledButton
                      type="button"
                      variant="danger"
                      onClick={() => removeProduct(index)}
                      style={{ padding: "5px 10px", fontSize: "0.9rem" }}
                    >
                      Remove
                    </StyledButton>
                  )}
                </ProductHeader>
                <div
                  className="product-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "1.5rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div style={{ gridColumn: "1 / 2" }}>
                    <Form.Group controlId={`products.${index}.productType`}>
                      <Form.Label
                        style={{
                          fontSize: "1rem",
                          fontWeight: "600",
                          color: "#475569",
                          marginBottom: "0.5rem",
                          display: "block",
                        }}
                      >
                        Product Type <span style={{ color: "#f43f5e" }}>*</span>
                      </Form.Label>
                      <Controller
                        name={`products.${index}.productType`}
                        control={control}
                        rules={{ required: "Product Type is required" }}
                        render={({ field }) => (
                          <Form.Select
                            {...field}
                            value={
                              field.value &&
                              !Object.keys(productOptions).includes(field.value)
                                ? "Others"
                                : field.value
                            }
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              debouncedHandleInputChange(
                                `products.${index}.productType`,
                                e.target.value,
                                index,
                              );
                              // Reset size and spec when product type changes
                              setValue(`products.${index}.size`, "N/A");
                              setValue(`products.${index}.spec`, "N/A");
                            }}
                            isInvalid={!!errors.products?.[index]?.productType}
                            style={{
                              width: "100%",
                              padding: "0.75rem",
                              border: "1px solid #e2e8f0",
                              borderRadius: "0.75rem",
                              backgroundColor: "#f8fafc",
                              fontSize: "1rem",
                              color: "#1e293b",
                            }}
                          >
                            <option value="">-- Select Product Type --</option>
                            {[...Object.keys(productOptions), "Others"].map(
                              (type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ),
                            )}
                          </Form.Select>
                        )}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.products?.[index]?.productType?.message}
                      </Form.Control.Feedback>
                    </Form.Group>
                    {isOthers && (
                      <Form.Group
                        controlId={`products.${index}.customProductType`}
                        style={{ marginTop: "1rem" }}
                      >
                        <Form.Label
                          style={{
                            fontSize: "1rem",
                            fontWeight: "600",
                            color: "#475569",
                            marginBottom: "0.5rem",
                            display: "block",
                          }}
                        >
                          Custom Product{" "}
                        </Form.Label>
                        <Form.Control
                          {...register(`products.${index}.customProductType`, {
                            required: isOthers
                              ? "Custom Product Type is required"
                              : false,
                          })}
                          onChange={(e) => {
                            setValue(
                              `products.${index}.customProductType`,
                              e.target.value,
                            );
                            debouncedHandleInputChange(
                              `products.${index}.customProductType`,
                              e.target.value,
                              index,
                            );
                          }}
                          isInvalid={
                            !!errors.products?.[index]?.customProductType
                          }
                          placeholder="e.g., Projector, Scanner, Webcam"
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
                        <Form.Control.Feedback type="invalid">
                          {errors.products?.[index]?.customProductType?.message}
                        </Form.Control.Feedback>
                      </Form.Group>
                    )}
                  </div>
                  <div style={{ gridColumn: "2 / 3" }}>
                    <Form.Group controlId={`products.${index}.size`}>
                      <Form.Label
                        style={{
                          fontSize: "1rem",
                          fontWeight: "600",
                          color: "#475569",
                          marginBottom: "0.5rem",
                          display: "block",
                        }}
                      >
                        Size
                      </Form.Label>
                      {isOthers ? (
                        <Form.Control
                          {...register(`products.${index}.size`)}
                          onChange={(e) =>
                            debouncedHandleInputChange(
                              `products.${index}.size`,
                              e.target.value,
                              index,
                            )
                          }
                          isInvalid={!!errors.products?.[index]?.size}
                          placeholder="e.g., 65 inch, 75 inch, A4"
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
                      ) : (
                        <Controller
                          name={`products.${index}.size`}
                          control={control}
                          render={({ field }) => (
                            <Form.Select
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                debouncedHandleInputChange(
                                  `products.${index}.size`,
                                  e.target.value,
                                  index,
                                );
                              }}
                              isInvalid={!!errors.products?.[index]?.size}
                              disabled={!selectedProductType}
                              style={{
                                width: "100%",
                                padding: "0.75rem",
                                border: "1px solid #e2e8f0",
                                borderRadius: "0.75rem",
                                backgroundColor: !selectedProductType
                                  ? "#e5e7eb"
                                  : "#f8fafc",
                                fontSize: "1rem",
                                color: "#1e293b",
                              }}
                            >
                              <option value="N/A">N/A</option>
                              {availableSizes.map((size) => (
                                <option key={size} value={size}>
                                  {size}
                                </option>
                              ))}
                            </Form.Select>
                          )}
                        />
                      )}
                      <Form.Control.Feedback type="invalid">
                        {errors.products?.[index]?.size?.message}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </div>
                  <div style={{ gridColumn: "3 / 4" }}>
                    <Form.Group controlId={`products.${index}.spec`}>
                      <Form.Label
                        style={{
                          fontSize: "1rem",
                          fontWeight: "600",
                          color: "#475569",
                          marginBottom: "0.5rem",
                          display: "block",
                        }}
                      >
                        Specification
                      </Form.Label>
                      {isOthers ? (
                        <Form.Control
                          {...register(`products.${index}.spec`)}
                          onChange={(e) =>
                            debouncedHandleInputChange(
                              `products.${index}.spec`,
                              e.target.value,
                              index,
                            )
                          }
                          isInvalid={!!errors.products?.[index]?.spec}
                          placeholder="e.g., 4K UHD, Android 11, Touch"
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
                      ) : (
                        <Controller
                          name={`products.${index}.spec`}
                          control={control}
                          render={({ field }) => (
                            <Form.Select
                              key={`${index}-${selectedProductType}`}
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                debouncedHandleInputChange(
                                  `products.${index}.spec`,
                                  e.target.value,
                                  index,
                                );
                              }}
                              isInvalid={!!errors.products?.[index]?.spec}
                              disabled={!selectedProductType}
                              style={{
                                width: "100%",
                                padding: "0.75rem",
                                border: "1px solid #e2e8f0",
                                borderRadius: "0.75rem",
                                backgroundColor: !selectedProductType
                                  ? "#e5e7eb"
                                  : "#f8fafc",
                                fontSize: "1rem",
                                color: "#1e293b",
                              }}
                            >
                              <option value="N/A">N/A</option>
                              {availableSpecs.map((spec) => (
                                <option key={spec} value={spec}>
                                  {spec}
                                </option>
                              ))}
                            </Form.Select>
                          )}
                        />
                      )}
                      <Form.Control.Feedback type="invalid">
                        {errors.products?.[index]?.spec?.message}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </div>
                  <div style={{ gridColumn: "1 / 2" }}>
                    <Form.Group controlId={`products.${index}.qty`}>
                      <Form.Label
                        style={{
                          fontSize: "1rem",
                          fontWeight: "600",
                          color: "#475569",
                          marginBottom: "0.5rem",
                          display: "block",
                        }}
                      >
                        Quantity <span style={{ color: "#f43f5e" }}>*</span>
                      </Form.Label>
                      <StyledNumberInput
                        type="text"
                        placeholder="e.g.100"
                        inputMode="numeric"
                        autoComplete="off"
                        onKeyDown={(e) => {
                          // Allow only digits & control keys
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
                        onPaste={(e) => {
                          e.preventDefault();
                          const pasted = e.clipboardData
                            .getData("text")
                            .replace(/[^0-9]/g, "");
                          debouncedHandleInputChange(
                            `products.${index}.qty`,
                            pasted,
                            index,
                          );
                        }}
                        {...register(`products.${index}.qty`, {
                          required: "Quantity is required",
                          validate: (value) =>
                            /^[1-9][0-9]*$/.test(value) ||
                            "Only positive numbers allowed",
                        })}
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          border: "1px solid #e2e8f0",
                          borderRadius: "0.75rem",
                          backgroundColor: "#f8fafc",
                          fontSize: "1rem",
                          color: "#1e293b",
                        }}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, "");
                          e.target.value = value;
                          debouncedHandleInputChange(
                            `products.${index}.qty`,
                            value,
                            index,
                          );
                        }}
                        isInvalid={!!errors.products?.[index]?.qty}
                      />

                      <Form.Control.Feedback type="invalid">
                        {errors.products?.[index]?.qty?.message}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </div>
                  <div style={{ gridColumn: "2 / 3" }}>
                    <Form.Group controlId={`products.${index}.unitPrice`}>
                      <Form.Label
                        style={{
                          fontSize: "1rem",
                          fontWeight: "600",
                          color: "#475569",
                          marginBottom: "0.5rem",
                          display: "block",
                        }}
                      >
                        Unit Price <span style={{ color: "#f43f5e" }}>*</span>
                      </Form.Label>

                      <StyledNumberInput
                        type="text"
                        placeholder="e.g.100.1234"
                        inputMode="decimal"
                        autoComplete="off"
                        onKeyDown={(e) => {
                          if (
                            !/[0-9.]/.test(e.key) &&
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
                          // Prevent multiple dots
                          if (e.key === "." && e.target.value.includes(".")) {
                            e.preventDefault();
                          }
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          let pasted = e.clipboardData.getData("text");
                          pasted = pasted.replace(/[^0-9.]/g, "");
                          if ((pasted.match(/\./g) || []).length > 1) return;

                          // allow only 4 decimals
                          if (!/^\d*\.?\d{0,4}$/.test(pasted)) return;

                          debouncedHandleInputChange(
                            `products.${index}.unitPrice`,
                            pasted,
                            index,
                          );
                        }}
                        {...register(`products.${index}.unitPrice`, {
                          required: "Unit Price is required",
                          validate: (value) =>
                            /^\d+(\.\d{1,4})?$/.test(value) ||
                            "Only numbers with up to 4 decimals allowed",
                        })}
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          border: "1px solid #e2e8f0",
                          borderRadius: "0.75rem",
                          backgroundColor: "#f8fafc",
                          fontSize: "1rem",
                          color: "#1e293b",
                        }}
                        onChange={(e) => {
                          let value = e.target.value;

                          // allow only 4 decimal places
                          if (!/^\d*\.?\d{0,4}$/.test(value)) return;

                          e.target.value = value;
                          debouncedHandleInputChange(
                            `products.${index}.unitPrice`,
                            value,
                            index,
                          );
                        }}
                        isInvalid={!!errors.products?.[index]?.unitPrice}
                      />

                      <Form.Control.Feedback type="invalid">
                        {errors.products?.[index]?.unitPrice?.message}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </div>
                  <div style={{ gridColumn: "3 / 4" }}>
                    <Form.Group controlId={`products.${index}.gst`}>
                      <Form.Label
                        style={{
                          fontSize: "1rem",
                          fontWeight: "600",
                          color: "#475569",
                          marginBottom: "0.5rem",
                          display: "block",
                        }}
                      >
                        GST <span style={{ color: "#f43f5e" }}>*</span>
                      </Form.Label>
                      <Form.Select
                        {...register(`products.${index}.gst`, {
                          required: "GST is required",
                        })}
                        onChange={(e) =>
                          debouncedHandleInputChange(
                            `products.${index}.gst`,
                            e.target.value,
                            index,
                          )
                        }
                        isInvalid={!!errors.products?.[index]?.gst}
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          border: "1px solid #e2e8f0",
                          borderRadius: "0.75rem",
                          backgroundColor: "#f8fafc",
                          fontSize: "1rem",
                          color: "#1e293b",
                        }}
                      >
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                        <option value="including">Including</option>
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {errors.products?.[index]?.gst?.message}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </div>
                  <div style={{ gridColumn: "1 / 2" }}>
                    <Form.Group controlId={`products.${index}.brand`}>
                      <Form.Label
                        style={{
                          fontSize: "1rem",
                          fontWeight: "600",
                          color: "#475569",
                          marginBottom: "0.5rem",
                          display: "block",
                        }}
                      >
                        Brand
                      </Form.Label>
                      <Form.Control
                        {...register(`products.${index}.brand`)}
                        onChange={(e) =>
                          debouncedHandleInputChange(
                            `products.${index}.brand`,
                            e.target.value,
                            index,
                          )
                        }
                        isInvalid={!!errors.products?.[index]?.brand}
                        placeholder="e.g., Samsung, Dell, HP, Promark"
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
                      <Form.Control.Feedback type="invalid">
                        {errors.products?.[index]?.brand?.message}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </div>
                  <div style={{ gridColumn: "2 / 3" }}>
                    <Form.Group controlId={`products.${index}.warranty`}>
                      <Form.Label
                        style={{
                          fontSize: "1rem",
                          fontWeight: "600",
                          color: "#475569",
                          marginBottom: "0.5rem",
                          display: "block",
                        }}
                      >
                        Warranty
                      </Form.Label>
                      <Form.Control
                        {...register(`products.${index}.warranty`)}
                        onChange={(e) =>
                          debouncedHandleInputChange(
                            `products.${index}.warranty`,
                            e.target.value,
                            index,
                          )
                        }
                        isInvalid={!!errors.products?.[index]?.warranty}
                        placeholder="e.g., 1 Year, 2 Years, 3 Years Onsite"
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
                      <Form.Control.Feedback type="invalid">
                        {errors.products?.[index]?.warranty?.message}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </div>
                  <div style={{ gridColumn: "3 / 4" }}>
                    <Form.Group controlId={`products.${index}.serialNos`}>
                      <Form.Label
                        style={{
                          fontSize: "1rem",
                          fontWeight: "600",
                          color: "#475569",
                          marginBottom: "0.5rem",
                          display: "block",
                        }}
                      >
                        Serial Nos
                      </Form.Label>
                      <Form.Control
                        {...register(`products.${index}.serialNos`)}
                        onChange={(e) =>
                          debouncedHandleInputChange(
                            `products.${index}.serialNos`,
                            e.target.value,
                            index,
                          )
                        }
                        isInvalid={!!errors.products?.[index]?.serialNos}
                        placeholder="e.g., SN001, SN002, SN003 (comma separated)"
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
                      <Form.Control.Feedback type="invalid">
                        {errors.products?.[index]?.serialNos?.message}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </div>
                  <div style={{ gridColumn: "1 / 2" }}>
                    <Form.Group controlId={`products.${index}.modelNos`}>
                      <Form.Label
                        style={{
                          fontSize: "1rem",
                          fontWeight: "600",
                          color: "#475569",
                          marginBottom: "0.5rem",
                          display: "block",
                        }}
                      >
                        Model Nos
                      </Form.Label>
                      {selectedProductType === "Fujifilm-Printer" ? (
                        <Form.Select
                          {...register(`products.${index}.modelNos`)}
                          onChange={(e) => {
                            setValue(
                              `products.${index}.modelNos`,
                              e.target.value,
                            );
                            debouncedHandleInputChange(
                              `products.${index}.modelNos`,
                              e.target.value,
                              index,
                            );
                          }}
                          isInvalid={!!errors.products?.[index]?.modelNos}
                          style={{
                            width: "100%",
                            padding: "0.75rem",
                            border: "1px solid #e2e8f0",
                            borderRadius: "0.75rem",
                            backgroundColor: "#f8fafc",
                            fontSize: "1rem",
                            color: "#1e293b",
                          }}
                        >
                          <option value="">Select Model No</option>
                          {printerOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </Form.Select>
                      ) : (
                        <Form.Control
                          {...register(`products.${index}.modelNos`)}
                          onChange={(e) =>
                            debouncedHandleInputChange(
                              `products.${index}.modelNos`,
                              e.target.value,
                              index,
                            )
                          }
                          isInvalid={!!errors.products?.[index]?.modelNos}
                          placeholder="e.g., PRO-65, IFP-75 (comma separated)"
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
                      <Form.Control.Feedback type="invalid">
                        {errors.products?.[index]?.modelNos?.message}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </div>
                  {selectedProductType === "Fujifilm-Printer" && (
                    <div style={{ gridColumn: "2 / 3" }}>
                      <Form.Group controlId={`products.${index}.productCode`}>
                        <Form.Label
                          style={{
                            fontSize: "1rem",
                            fontWeight: "600",
                            color: "#475569",
                            marginBottom: "0.5rem",
                            display: "block",
                          }}
                        >
                          Product Code
                        </Form.Label>
                        <Form.Select
                          {...register(`products.${index}.productCode`)}
                          onChange={(e) => {
                            setValue(
                              `products.${index}.productCode`,
                              e.target.value,
                            );
                            debouncedHandleInputChange(
                              `products.${index}.productCode`,
                              e.target.value,
                              index,
                            );
                          }}
                          isInvalid={!!errors.products?.[index]?.productCode}
                          style={{
                            width: "100%",
                            padding: "0.75rem",
                            border: "1px solid #e2e8f0",
                            borderRadius: "0.75rem",
                            backgroundColor: "#f8fafc",
                            fontSize: "1rem",
                            color: "#1e293b",
                          }}
                        >
                          <option value="">Select Product Code</option>
                          {productCode.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {errors.products?.[index]?.productCode?.message}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </div>
                  )}
                </div>
              </ProductContainer>
            );
          })}
          <StyledButton
            type="button"
            variant="primary"
            onClick={addProduct}
            style={{
              padding: "0.75rem 1.5rem",
              background: "linear-gradient(135deg, #2575fc, #6a11cb)",
              color: "#fff",
              border: "none",
              borderRadius: "0.75rem",
              cursor: "pointer",
              fontWeight: "600",
              letterSpacing: "0.5px",
              transition: "all 0.3s ease",
              marginTop: "1rem",
            }}
          >
            Add ➕
          </StyledButton>
        </div>
        <Form.Group controlId="total">
          <Form.Label>💵 Total *</Form.Label>
          <Form.Control
            type="tel"
            {...register("total", {
              required: "Total is required",
              pattern: {
                value: /^\d+(\.\d{1,2})?$/,
                message: "Total must be a valid number",
              },
              min: { value: 0, message: "Total cannot be negative" },
            })}
            onChange={(e) => {
              // Only allow numbers and decimal point
              const value = e.target.value.replace(/[^0-9.]/g, "");
              // Ensure only one decimal point and max 2 decimal places
              const parts = value.split(".");
              if (parts.length > 2) {
                e.target.value = parts[0] + "." + parts[1].slice(0, 2);
              } else if (parts.length === 2 && parts[1].length > 2) {
                e.target.value = parts[0] + "." + parts[1].slice(0, 2);
              } else {
                e.target.value = value;
              }
              debouncedHandleInputChange("total", e.target.value);
            }}
            isInvalid={!!errors.total}
            placeholder="e.g., 10000.50"
          />
          <Form.Control.Feedback type="invalid">
            {errors.total?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="paymentCollected">
          <Form.Label>💰 Payment Collected</Form.Label>
          <Form.Control
            type="tel"
            {...register("paymentCollected", {
              pattern: {
                value: /^\d+(\.\d{1,2})?$/,
                message: "Payment Collected must be a valid number",
              },
            })}
            onChange={(e) => {
              // Only allow numbers and decimal point
              const value = e.target.value.replace(/[^0-9.]/g, "");
              // Ensure only one decimal point
              const parts = value.split(".");
              if (parts.length > 2) {
                e.target.value = parts[0] + "." + parts.slice(1).join("");
              } else {
                e.target.value = value;
              }
              debouncedHandleInputChange("paymentCollected", e.target.value);
            }}
            isInvalid={!!errors.paymentCollected}
            placeholder="e.g., 5000"
          />
          <Form.Control.Feedback type="invalid">
            {errors.paymentCollected?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="paymentMethod">
          <Form.Label>💳 Payment Method</Form.Label>
          <Controller
            name="paymentMethod"
            control={control}
            render={({ field }) => (
              <Form.Select
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  debouncedHandleInputChange("paymentMethod", e.target.value);
                }}
                isInvalid={!!errors.paymentMethod}
              >
                <option value="">-- Select Payment Method --</option>
                <option value="Cash">Cash</option>
                <option value="NEFT">NEFT</option>
                <option value="RTGS">RTGS</option>
                <option value="Cheque">Cheque</option>
              </Form.Select>
            )}
          />
        </Form.Group>{" "}
        <Form.Group controlId="neftTransactionId">
          <Form.Label>📄 NEFT/RTGS Transaction ID</Form.Label>
          <Form.Control
            type="text"
            {...register("neftTransactionId")}
            disabled={paymentMethod !== "NEFT" && paymentMethod !== "RTGS"}
            placeholder="Enter Transaction ID"
          />
        </Form.Group>
        <Form.Group controlId="chequeId">
          <Form.Label>📄 Cheque ID</Form.Label>
          <Form.Control
            type="text"
            {...register("chequeId")}
            onChange={(e) => {
              debouncedHandleInputChange("chequeId", e.target.value);
            }}
            isInvalid={!!errors.chequeId}
            disabled={paymentMethod !== "Cheque"}
            placeholder="Enter numbers only"
          />
          <Form.Control.Feedback type="invalid">
            {errors.chequeId?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="paymentDue">
          <Form.Label>💰 Payment Due</Form.Label>
          <Form.Control
            type="tel"
            {...register("paymentDue", {
              pattern: {
                value: /^\d+(\.\d{1,2})?$/,
                message: "Payment Due must be a valid number",
              },
            })}
            onChange={(e) => {
              // Only allow numbers and decimal point
              const value = e.target.value.replace(/[^0-9.]/g, "");
              // Ensure only one decimal point
              const parts = value.split(".");
              if (parts.length > 2) {
                e.target.value = parts[0] + "." + parts.slice(1).join("");
              } else {
                e.target.value = value;
              }
              debouncedHandleInputChange("paymentDue", e.target.value);
            }}
            isInvalid={!!errors.paymentDue}
            placeholder="e.g., 2000"
          />
          <Form.Control.Feedback type="invalid">
            {errors.paymentDue?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="paymentTerms">
          <Form.Label>📝 Payment Terms</Form.Label>
          <Controller
            name="paymentTerms"
            control={control}
            render={({ field }) => (
              <Form.Select
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  debouncedHandleInputChange("paymentTerms", e.target.value);
                }}
                isInvalid={!!errors.paymentTerms}
              >
                <option value="">-- Select Payment Terms --</option>
                <option value="100% Advance">100% Advance</option>
                <option value="Partial Advance">Partial Advance</option>
                <option value="Credit">Credit</option>
              </Form.Select>
            )}
          />
        </Form.Group>
        <Form.Group controlId="creditDays">
          <Form.Label>⏳ Credit Days</Form.Label>
          <Form.Control
            type="tel"
            {...register("creditDays", {
              pattern: {
                value: /^\d+$/,
                message: "Credit Days must be a whole number",
              },
              min: {
                value: 0,
                message: "Credit Days cannot be negative",
              },
            })}
            onChange={(e) => {
              // Only allow whole numbers
              const value = e.target.value.replace(/[^0-9]/g, "");
              e.target.value = value;
              debouncedHandleInputChange("creditDays", value);
            }}
            isInvalid={!!errors.creditDays}
            placeholder="e.g., 30"
          />
          <Form.Control.Feedback type="invalid">
            {errors.creditDays?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="freightcs">
          <Form.Label>🚚 Freight Charges</Form.Label>
          <Form.Control
            type="tel"
            {...register("freightcs", {
              pattern: {
                value: /^\d+(\.\d{1,2})?$/,
                message: "Freight Charges must be a valid number",
              },
            })}
            onChange={(e) => {
              // Only allow numbers and decimal point
              const value = e.target.value.replace(/[^0-9.]/g, "");
              // Ensure only one decimal point
              const parts = value.split(".");
              if (parts.length > 2) {
                e.target.value = parts[0] + "." + parts.slice(1).join("");
              } else {
                e.target.value = value;
              }
              debouncedHandleInputChange("freightcs", e.target.value);
            }}
            isInvalid={!!errors.freightcs}
            placeholder="e.g., 1000"
          />
          <Form.Control.Feedback type="invalid">
            {errors.freightcs?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="freightstatus">
          <Form.Label>🚚 Freight Status</Form.Label>
          <Form.Select
            {...register("freightstatus")}
            onChange={(e) =>
              debouncedHandleInputChange("freightstatus", e.target.value)
            }
            isInvalid={!!errors.freightstatus}
            defaultValue="Extra"
          >
            <option value="To Pay">To Pay</option>
            <option value="Including">Including</option>
            <option value="Extra">Extra</option>
          </Form.Select>
          <Form.Control.Feedback type="invalid">
            {errors.freightstatus?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="actualFreight">
          <Form.Label>🚚 Actual Freight</Form.Label>
          <Form.Control
            type="tel"
            {...register("actualFreight", {
              pattern: {
                value: /^\d+(\.\d{1,2})?$/,
                message: "Actual Freight must be a valid number",
              },
              min: {
                value: 0,
                message: "Actual Freight cannot be negative",
              },
            })}
            onChange={(e) => {
              // Only allow numbers and decimal point
              const value = e.target.value.replace(/[^0-9.]/g, "");
              // Ensure only one decimal point and max 2 decimal places
              const parts = value.split(".");
              if (parts.length > 2) {
                e.target.value = parts[0] + "." + parts[1].slice(0, 2);
              } else if (parts.length === 2 && parts[1].length > 2) {
                e.target.value = parts[0] + "." + parts[1].slice(0, 2);
              } else {
                e.target.value = value;
              }
              debouncedHandleInputChange("actualFreight", e.target.value);
            }}
            isInvalid={!!errors.actualFreight}
            placeholder="e.g., 1500.00"
          />
          <Form.Control.Feedback type="invalid">
            {errors.actualFreight?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="installchargesstatus">
          <Form.Label>🔧 Installation Charges Status</Form.Label>
          <Form.Select
            defaultValue="Extra"
            {...register("installchargesstatus")}
            isInvalid={!!errors.installchargesstatus}
            onChange={(e) =>
              debouncedHandleInputChange("installchargesstatus", e.target.value)
            }
          >
            <option value="To Pay">To Pay</option>
            <option value="Including">Including</option>
            <option value="Extra">Extra</option>
            <option value="Not in Scope">Not in Scope</option>
          </Form.Select>

          <Form.Control.Feedback type="invalid">
            {errors.installchargesstatus?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="installationeng">
          <Form.Label>🧑‍🔧 Installation Engineer</Form.Label>
          <Form.Control
            {...register("installationeng")}
            onChange={(e) =>
              debouncedHandleInputChange("installationeng", e.target.value)
            }
            isInvalid={!!errors.installationeng}
            placeholder="e.g., Amit Kumar, Rajesh Singh"
          />
          <Form.Control.Feedback type="invalid">
            {errors.installationeng?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="installation">
          <Form.Label>🛠️ Installation Charges</Form.Label>
          <Form.Control
            type="tel"
            {...register("installation", {
              pattern: {
                value: /^\d+(\.\d{1,2})?$/,
                message: "Installation Charges must be a valid number",
              },
            })}
            onChange={(e) => {
              // Only allow numbers and decimal point
              const value = e.target.value.replace(/[^0-9.]/g, "");
              // Ensure only one decimal point
              const parts = value.split(".");
              if (parts.length > 2) {
                e.target.value = parts[0] + "." + parts.slice(1).join("");
              } else {
                e.target.value = value;
              }
              debouncedHandleInputChange("installation", e.target.value);
            }}
            isInvalid={!!errors.installation}
            placeholder="e.g., 500"
          />
          <Form.Control.Feedback type="invalid">
            {errors.installation?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="installationStatus">
          <Form.Label>🛠️ Installation Status</Form.Label>
          <Controller
            name="installationStatus"
            control={control}
            render={({ field }) => (
              <Form.Select
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  debouncedHandleInputChange(
                    "installationStatus",
                    e.target.value,
                  );
                }}
                isInvalid={!!errors.installationStatus}
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Failed">Failed</option>
              </Form.Select>
            )}
          />
        </Form.Group>
        <Form.Group controlId="installationReport">
          <Form.Label>📝 Installation Report</Form.Label>
          <Controller
            name="installationReport"
            control={control}
            render={({ field }) => (
              <Form.Select
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  debouncedHandleInputChange(
                    "installationReport",
                    e.target.value,
                  );
                }}
                isInvalid={!!errors.installationReport}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </Form.Select>
            )}
          />
          <Form.Control.Feedback type="invalid">
            {errors.installationReport?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="remarksByInstallation">
          <Form.Label>💬 Remarks by Installation</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            {...register("remarksByInstallation")}
            onChange={(e) =>
              debouncedHandleInputChange(
                "remarksByInstallation",
                e.target.value,
              )
            }
            isInvalid={!!errors.remarksByInstallation}
            placeholder="e.g., Installation completed successfully, customer trained"
          />
        </Form.Group>
        <div style={{ marginTop: "1.5rem", marginBottom: "2rem" }}>
          <Form.Label
            style={{
              fontWeight: "600",
              color: "#374151",
              marginBottom: "0.5rem",
              display: "block",
            }}
          >
            📎 Installation Report
          </Form.Label>
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              overflow: "hidden",
              boxSizing: "border-box",
              border: "2px dashed",
              borderColor: installationFile ? "#22c55e" : "#cbd5e1",
              borderRadius: "1rem",
              padding: "0.75rem",
              backgroundColor: installationFile ? "#f0fdf4" : "#f8fafc",
              transition: "all 0.2s ease-in-out",
            }}
          >
            <label
              htmlFor="installationFileEdit"
              title={
                installationFile ? installationFile.name : "Click to upload"
              }
              style={{
                display: "grid",
                gridTemplateColumns: "auto minmax(0, 1fr)",
                alignItems: "center",
                gap: "0.75rem",
                width: "100%",
                minHeight: "44px",
                padding: "0.6rem 0.75rem",
                borderRadius: "0.75rem",
                background: "linear-gradient(to right, #ffffff, #f1f5f9)",
                border: "1px solid #e2e8f0",
                cursor: "pointer",
                overflow: "hidden",
                boxSizing: "border-box",
                transition: "background 0.2s ease",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "#e2e8f0")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.background =
                  "linear-gradient(to right, #ffffff, #f1f5f9)")
              }
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "1.4rem",
                  height: "1.4rem",
                }}
              >
                <svg
                  style={{
                    width: "100%",
                    height: "100%",
                    color: "#4f46e5",
                  }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 16V8m0 0l-4 4m4-4l4 4"
                  />
                </svg>
              </div>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: "#1e293b",
                  fontSize: "0.9rem",
                  fontWeight: "500",
                  display: "block",
                }}
              >
                {installationFile
                  ? installationFile.name
                  : updateData.installationFile
                    ? "Replace existing report"
                    : "Click to upload report"}
              </span>
            </label>

            {/* HIDDEN INPUT */}
            <input
              id="installationFileEdit"
              type="file"
              name="installationFile"
              accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.xls"
              onChange={handleInstallationFileChange}
              style={{ display: "none" }}
            />

            {/* FILE TYPES INFO */}
            <div
              style={{
                fontSize: "0.75rem",
                color: "#64748b",
                marginTop: "0.5rem",
                textAlign: "center",
                fontWeight: "500",
              }}
            >
              Supported: PDF, JPG, PNG, DOCX, XLSX
            </div>

            {/* REMOVE BUTTON */}
            {installationFile && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault(); // Prevent label trigger
                  setInstallationFile(null);
                  setInstallationFileError("");
                  const input = document.getElementById("installationFileEdit");
                  if (input) input.value = "";
                }}
                style={{
                  marginTop: "0.75rem",
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #fecaca",
                  background: "#fee2e2",
                  color: "#b91c1c",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.35rem",
                  transition: "background 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "#fca5a5")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "#fee2e2")
                }
              >
                <span>✖</span> Remove Report
              </button>
            )}
          </div>

          {/* ERROR MESSAGE */}
          {installationFileError && (
            <div
              style={{
                color: "#ef4444",
                fontSize: "0.85rem",
                marginTop: "0.5rem",
                fontWeight: "500",
              }}
            >
              {installationFileError}
            </div>
          )}

          {/* EXISTING FILE LINK */}
          {updateData.installationFile && !installationFile && (
            <div
              style={{
                marginTop: "0.75rem",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span style={{ color: "#64748b" }}>Current file:</span>
              <a
                href={`${process.env.REACT_APP_SO_URL}${updateData.installationFile}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#2563eb",
                  fontWeight: "600",
                  textDecoration: "underline",
                  textUnderlineOffset: "2px",
                }}
              >
                View Report
              </a>
            </div>
          )}
        </div>
        <Form.Group controlId="dispatchStatus">
          <Form.Label>🚚 Dispatch Status</Form.Label>
          <Controller
            name="dispatchStatus"
            control={control}
            render={({ field }) => (
              <Form.Select
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  debouncedHandleInputChange("dispatchStatus", e.target.value);
                }}
                isInvalid={!!errors.dispatchStatus}
              >
                <option value="Not Dispatched">Not Dispatched</option>
                <option value="Docket Awaited Dispatched">
                  Docket Awaited Dispatched
                </option>
                <option value="Hold by Salesperson">Hold by Salesperson</option>
                <option value="Hold by Customer">Hold by Customer</option>
                <option value="Order Cancelled">Order Cancelled</option>
                <option value="Partially Shipped">Partially Shipped</option>
                <option value="Dispatched">Dispatched</option>
                <option value="Delivered">Delivered</option>
              </Form.Select>
            )}
          />
        </Form.Group>
        <Form.Group controlId="stamp">
          <Form.Label>📦 Signed Stamp Receiving</Form.Label>
          <Form.Select
            {...register("stamp")}
            onChange={(e) =>
              debouncedHandleInputChange("stamp", e.target.value)
            }
            isInvalid={!!errors.stamp}
            defaultValue="Not Received"
          >
            <option value="Received">Received</option>
            <option value="Not Received">Not Received</option>
          </Form.Select>
          <Form.Control.Feedback type="invalid">
            {errors.stamp?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="salesPerson">
          <Form.Label>👤 Sales Person</Form.Label>
          <Form.Control
            as="select"
            {...register("salesPerson")}
            onChange={(e) =>
              debouncedHandleInputChange("salesPerson", e.target.value)
            }
            isInvalid={!!errors.salesPerson}
          >
            <option value="">Select Sales Person</option>
            {salesPersonlist.map((person) => (
              <option key={person.value} value={person.value}>
                {person.label}
              </option>
            ))}
          </Form.Control>
          {errors.salesPerson && (
            <Form.Control.Feedback type="invalid">
              {errors.salesPerson.message}
            </Form.Control.Feedback>
          )}
        </Form.Group>
        <Form.Group controlId="report">
          <Form.Label>👤 Reporting Manager</Form.Label>
          <Form.Control
            as="select"
            {...register("report")}
            onChange={(e) =>
              debouncedHandleInputChange("report", e.target.value)
            }
            isInvalid={!!errors.report}
          >
            <option value="">Select Reporting Manager</option>
            {Reportinglist.map((manager) => (
              <option key={manager.value} value={manager.value}>
                {manager.label}
              </option>
            ))}
          </Form.Control>
          {errors.report && (
            <Form.Control.Feedback type="invalid">
              {errors.report.message}
            </Form.Control.Feedback>
          )}
        </Form.Group>
        <Form.Group controlId="company">
          <Form.Label>🏢 Company</Form.Label>
          <Controller
            name="company"
            control={control}
            render={({ field }) => (
              <Form.Select
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  debouncedHandleInputChange("company", e.target.value);
                }}
                isInvalid={!!errors.company}
              >
                <option value="Promark">Promark</option>
                <option value="Foxmate">Foxmate</option>
                <option value="Promine">Promine</option>
                <option value="Primus">Primus</option>
              </Form.Select>
            )}
          />
        </Form.Group>
        <Form.Group controlId="transporter">
          <Form.Label>🚛 Transporter</Form.Label>
          <Form.Control
            {...register("transporter")}
            onChange={(e) =>
              debouncedHandleInputChange("transporter", e.target.value)
            }
            isInvalid={!!errors.transporter}
            placeholder="e.g., BlueDart, DTDC, Delhivery"
          />
        </Form.Group>
        <Form.Group controlId="transporterDetails">
          <Form.Label>📋 Transporter Details</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            {...register("transporterDetails")}
            onChange={(e) =>
              debouncedHandleInputChange("transporterDetails", e.target.value)
            }
            isInvalid={!!errors.transporterDetails}
            placeholder="e.g., Contact: 9876543210, Branch: Delhi Hub"
          />
        </Form.Group>
        <Form.Group controlId="docketNo">
          <Form.Label>📄 Docket No</Form.Label>
          <Form.Control
            {...register("docketNo")}
            onChange={(e) =>
              debouncedHandleInputChange("docketNo", e.target.value)
            }
            isInvalid={!!errors.docketNo}
            placeholder="e.g., AWB123456789"
          />
        </Form.Group>
        <Form.Group controlId="receiptDate">
          <Form.Label>📅 Receipt Date</Form.Label>
          <Form.Control
            type="date"
            {...register("receiptDate")}
            onChange={(e) =>
              debouncedHandleInputChange("receiptDate", e.target.value)
            }
            isInvalid={!!errors.receiptDate}
          />
        </Form.Group>
        <Form.Group controlId="invoiceNo">
          <Form.Label>📄 Invoice No</Form.Label>
          <Form.Control
            {...register("invoiceNo")}
            onChange={(e) =>
              debouncedHandleInputChange("invoiceNo", e.target.value)
            }
            isInvalid={!!errors.invoiceNo}
            placeholder="e.g., INV-2024-001234"
          />
        </Form.Group>
        <Form.Group controlId="invoiceDate">
          <Form.Label>📅 Invoice Date</Form.Label>
          <Form.Control
            type="date"
            {...register("invoiceDate")}
            onChange={(e) =>
              debouncedHandleInputChange("invoiceDate", e.target.value)
            }
            isInvalid={!!errors.invoiceDate}
          />
        </Form.Group>
        <Form.Group controlId="piNumber">
          <Form.Label>📄 PI Number</Form.Label>
          <Form.Control
            type="tel"
            {...register("piNumber")}
            onChange={(e) => {
              debouncedHandleInputChange("piNumber", e.target.value);
            }}
            isInvalid={!!errors.piNumber}
            placeholder="Enter PI number"
          />
          <Form.Control.Feedback type="invalid">
            {errors.piNumber?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="billNumber">
          <Form.Label>📄 Bill Number</Form.Label>
          <Form.Control
            type="text"
            {...register("billNumber")}
            onChange={(e) =>
              debouncedHandleInputChange("billNumber", e.target.value)
            }
            placeholder="Enter bill number"
          />
        </Form.Group>
        <Form.Group controlId="billStatus">
          <Form.Label>📋 Bill Status</Form.Label>
          <Controller
            name="billStatus"
            control={control}
            render={({ field }) => (
              <Form.Select
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  debouncedHandleInputChange("billStatus", e.target.value);
                }}
                isInvalid={!!errors.billStatus}
              >
                <option value="Pending">Pending</option>
                <option value="Under Billing">Under Billing</option>
                <option value="Billing Complete">Billing Complete</option>
              </Form.Select>
            )}
          />
        </Form.Group>
        <Form.Group controlId="paymentReceived">
          <Form.Label>💰 Payment Received</Form.Label>
          <Controller
            name="paymentReceived"
            control={control}
            render={({ field }) => (
              <Form.Select
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  debouncedHandleInputChange("paymentReceived", e.target.value);
                }}
                isInvalid={!!errors.paymentReceived}
              >
                <option value="Not Received">Not Received</option>
                <option value="Received">Received</option>
              </Form.Select>
            )}
          />
        </Form.Group>
        {/* <Form.Group controlId="completionStatus">
          <Form.Label>📋 Completion Status</Form.Label>
          <Controller
            name="completionStatus"
            control={control}
            render={({ field }) => (
              <Form.Select
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  debouncedHandleInputChange(
                    "completionStatus",
                    e.target.value
                  );
                }}
                isInvalid={!!errors.completionStatus}
              >
                <option value="In Progress">In Progress</option>
                <option value="Complete">Complete</option>
              </Form.Select>
            )}
          />
        </Form.Group> */}
        <Form.Group controlId="fulfillingStatus">
          <Form.Label>📋 Production Status</Form.Label>
          <Controller
            name="fulfillingStatus"
            control={control}
            render={({ field }) => (
              <Form.Select
                {...field}
                disabled={isProductionStatusDisabled(dispatchFrom)}
                onChange={(e) => {
                  field.onChange(e);
                  debouncedHandleInputChange(
                    "fulfillingStatus",
                    e.target.value,
                  );
                }}
                isInvalid={!!errors.fulfillingStatus}
              >
                <option value="Pending">Pending</option>
                <option value="Under Process">Under Process</option>
                <option value="Partial Dispatch">Partial Dispatch</option>
                <option value="Fulfilled">Fulfilled</option>
              </Form.Select>
            )}
          />
        </Form.Group>
        <Form.Group controlId="fulfillmentDate">
          <Form.Label>📅 Production Date</Form.Label>
          <Form.Control
            type="date"
            {...register("fulfillmentDate")}
            onChange={(e) =>
              debouncedHandleInputChange("fulfillmentDate", e.target.value)
            }
            isInvalid={!!errors.fulfillmentDate}
          />
        </Form.Group>
        <Form.Group controlId="remarksByProduction">
          <Form.Label>✏️ Remarks by Production</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            {...register("remarksByProduction")}
            onChange={(e) =>
              debouncedHandleInputChange("remarksByProduction", e.target.value)
            }
            isInvalid={!!errors.remarksByProduction}
            placeholder="e.g., Product ready for dispatch, QC passed"
          />
        </Form.Group>
        <Form.Group controlId="remarksByAccounts">
          <Form.Label>✏️ Remarks by Accounts</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            {...register("remarksByAccounts")}
            onChange={(e) =>
              debouncedHandleInputChange("remarksByAccounts", e.target.value)
            }
            isInvalid={!!errors.remarksByAccounts}
            placeholder="e.g., Payment verified, GST reconciled"
          />
        </Form.Group>
        <Form.Group controlId="remarksByBilling">
          <Form.Label>✏️ Remarks by Billing</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            {...register("remarksByBilling")}
            onChange={(e) =>
              debouncedHandleInputChange("remarksByBilling", e.target.value)
            }
            isInvalid={!!errors.remarksByBilling}
            placeholder="e.g., Invoice generated, E-way bill created"
          />
        </Form.Group>
        <Form.Group controlId="verificationRemarks">
          <Form.Label>✏️ Verification Remarks</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            {...register("verificationRemarks")}
            onChange={(e) =>
              debouncedHandleInputChange("verificationRemarks", e.target.value)
            }
            isInvalid={!!errors.verificationRemarks}
            placeholder="e.g., Order details verified, customer confirmed"
          />
        </Form.Group>
        <Form.Group controlId="remarks">
          <Form.Label>✏️ Remarks</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            {...register("remarks")}
            onChange={(e) =>
              debouncedHandleInputChange("remarks", e.target.value)
            }
            isInvalid={!!errors.remarks}
            placeholder="e.g., Additional notes or special instructions"
          />
        </Form.Group>
      </FormSection>
    </Form>
  );

  const renderUpdateForm = () => (
    <Form onSubmit={handleSubmit(onUpdateSubmit)}>
      <FormSection>
        <Form.Group controlId="sostatus">
          <Form.Label>📊 SO Status</Form.Label>
          <Form.Select
            value={updateData.sostatus}
            onChange={handleUpdateInputChange}
            name="sostatus"
          >
            <option value="Pending for Approval">Pending for Approval</option>
            <option value="Accounts Approved">Accounts Approved</option>
            <option value="Approved">Approved</option>
            <option value="Order on Hold Due to Low Price">
              Order on Hold Due to Low Price
            </option>
            <option value="Order Cancelled">Order Cancelled</option>
          </Form.Select>
        </Form.Group>
        {(userRole === "Admin" || userRole === "SuperAdmin") && (
          <Form.Group controlId="productno">
            <Form.Label>📦 Product Code</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter Product No"
              value={updateData.productno}
              onChange={handleUpdateInputChange}
              name="productno"
            />
          </Form.Group>
        )}
        <Form.Group controlId="remarks">
          <Form.Label>✏️ Remarks</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={updateData.remarks}
            onChange={handleUpdateInputChange}
            name="remarks"
            maxLength={500}
            placeholder="Enter your remarks here..."
          />
          <Form.Text>{updateData.remarks.length}/500</Form.Text>
        </Form.Group>
      </FormSection>
    </Form>
  );

  return (
    <StyledModal
      show={isOpen}
      onHide={onClose}
      centered
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header closeButton>
        <Modal.Title className="text-center w-100 d-flex align-items-center justify-content-center">
          {view === "options" ? (
            <>
              <FaCog className="me-2" />
              Sales Order Management
            </>
          ) : view === "edit" ? (
            <>
              <FaEdit className="me-2" />
              Edit Entry
            </>
          ) : (
            <>
              <FaSyncAlt className="me-2" />
              Update Approvals
            </>
          )}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {view === "options" && renderOptions()}
        {view === "edit" && renderEditForm()}
        {view === "update" && renderUpdateForm()}
      </Modal.Body>

      <Modal.Footer>
        <StyledButton variant="danger" onClick={onClose} disabled={loading}>
          Close
        </StyledButton>
        {(view === "edit" || view === "update") &&
          (showConfirm ? (
            <>
              <StyledButton
                variant="warning"
                onClick={() => setShowConfirm(false)}
                disabled={loading}
              >
                Cancel
              </StyledButton>
              <StyledButton
                variant="success"
                onClick={
                  view === "edit" ? handleSubmit(onEditSubmit) : onUpdateSubmit
                }
                disabled={loading}
              >
                {loading ? (
                  <Spinner as="span" animation="border" size="sm" />
                ) : (
                  "Confirm"
                )}
              </StyledButton>
            </>
          ) : (
            <StyledButton
              variant="primary"
              onClick={
                view === "edit" ? handleSubmit(onEditSubmit) : onUpdateSubmit
              }
              disabled={loading}
            >
              {loading ? (
                <Spinner as="span" animation="border" size="sm" />
              ) : view === "edit" ? (
                "Save Changes"
              ) : (
                "Update"
              )}
            </StyledButton>
          ))}
      </Modal.Footer>
    </StyledModal>
  );
}

export default EditEntry;
