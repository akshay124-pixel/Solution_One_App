import { useState, useCallback, useEffect, useMemo } from "react";
import { Modal, Form, Spinner, Alert } from "react-bootstrap";
import { toast } from "react-toastify";
import { useForm, Controller } from "react-hook-form";
import styled from "styled-components";
import { FaEdit, FaSyncAlt, FaCog } from "react-icons/fa";
import api, { getAuthData } from "../api/api";
import { statesAndCities } from "./Options";

// Styled Components
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

const formControlStyle = {
  borderRadius: "8px",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
};

function EditEntry({ isOpen, onClose, onEntryUpdated, entryToEdit }) {
  // Initial Data
  const initialFormData = useMemo(
    () => ({
      customerName: "",
      contactName: "",
      email: "",
      mobileNumber: "",
      AlterNumber: "",
      address: "",
      product: "",
      state: "",
      city: "",
      organization: "",
      category: "",

      remarks: "",
    }),
    [],
  );

  const initialUpdateData = useMemo(
    () => ({
      status: "",
      closetype: "",
      closeamount: "",
      remarks: "",
    }),
    [],
  );

  // State Management
  const [formData, setFormData] = useState(initialFormData);
  const [updateData, setUpdateData] = useState(initialUpdateData);
  const [view, setView] = useState("options");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Form Setup
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    mode: "onChange",
    defaultValues: initialFormData,
  });

  const selectedState = watch("state");

  // Effect for Initial Data Load
  useEffect(() => {
    if (isOpen && entryToEdit) {
      const newFormData = {
        customerName: entryToEdit.customerName || "",
        contactName: entryToEdit.contactName || "",
        email: entryToEdit.email || "",
        mobileNumber: entryToEdit.mobileNumber || "",
        AlterNumber: entryToEdit.AlterNumber || "",
        address: entryToEdit.address || "",
        product: entryToEdit.product || "",
        state: entryToEdit.state || "",
        city: entryToEdit.city || "",
        organization: entryToEdit.organization || "",
        category: entryToEdit.category || "",

        remarks: entryToEdit.remarks || "",
      };
      const newUpdateData = {
        status: entryToEdit.status || "",
        closeamount: entryToEdit.closeamount || "",
        closetype: entryToEdit.closetype || "",
        remarks: entryToEdit.remarks || "",
      };
      setFormData(newFormData);
      setUpdateData(newUpdateData);
      reset(newFormData);
      setView("options");
      setError(null);
      setShowConfirm(false);
    }
  }, [isOpen, entryToEdit, reset]);

  // Handlers
  const handleInputChange = useCallback(
    (name, value) => {
      // Clean mobile number input
      const processedValue =
        name === "mobileNumber" || name === "AlterNumber"
          ? value.replace(/\D/g, "").slice(0, 10)
          : value;

      // Update react-hook-form state with validation
      setValue(name, processedValue, {
        shouldValidate: true,
        shouldDirty: true,
      });

      // Update local state for any non-RHF usage
      setFormData((prev) => ({
        ...prev,
        [name]: processedValue,
      }));
    },
    [setValue],
  );

  const handleCopyPaste = useCallback((e) => {
    e.stopPropagation(); // Prevent interference with copy/paste
  }, []);
  const handleUpdateInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setUpdateData((prev) => ({
      ...prev,
      [name]: name === "closeamount" ? (value ? parseFloat(value) : "") : value,
    }));
  }, []);

  const onEditSubmit = async (data) => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }
    setLoading(true);
    try {
      const { accessToken } = getAuthData();
      if (!accessToken) {
        throw new Error("You must be logged in to update an entry.");
      }

      // Prepare payload
      const payload = {
        ...data,
        status: updateData.status,
        remarks: updateData.remarks,
      };
      if (updateData.status === "Closed") {
        if (!updateData.closetype) {
          throw new Error("Close type is required when status is 'Closed'.");
        }
        if (updateData.closetype === "Closed Won" && !updateData.closeamount) {
          throw new Error("Close amount is required when Close Type is 'Closed Won'.");
        }
        payload.closetype = updateData.closetype;
        payload.closeamount = updateData.closetype === "Closed Won"
          ? parseFloat(updateData.closeamount)
          : null;
      } else {
        payload.closetype = "";
        payload.closeamount = null;
      }

      const response = await api.put(
        `/api/editentry/${entryToEdit._id}`,
        payload,
      );
      const updatedEntry = response.data.data;
      toast.success("Entry updated successfully!");
      onEntryUpdated(updatedEntry); // Pass the updated entry to the parent
      setView("options");
      onClose();
    } catch (err) {
      console.error("Edit error:", err.response?.data);

      // Friendly error message for user
      const errorMessage =
        err.response?.data?.message ||
        "Sorry, we couldn't update your entry. Please check your details and try again.";

      // Detailed errors, if any, joined for display
      const detailedErrors = err.response?.data?.errors
        ? err.response.data.errors.join(", ")
        : null;

      setError(errorMessage);
      toast.error(
        detailedErrors ? `${errorMessage} (${detailedErrors})` : errorMessage,
      );
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
      const { accessToken } = getAuthData();
      if (!accessToken) {
        throw new Error("You must be logged in to update an entry.");
      }

      const payload = {
        status: updateData.status,
        remarks: updateData.remarks,
      };
      if (updateData.status === "Closed") {
        payload.closetype = updateData.closetype;
        payload.closeamount = updateData.closetype === "Closed Won"
          ? updateData.closeamount
          : null;
      }

      const response = await api.put(
        `/api/editentry/${entryToEdit._id}`,
        payload,
      );
      const updatedEntry = response.data.data;
      toast.success("Follow-up updated successfully!");
      onEntryUpdated(updatedEntry); // Pass the updated entry to the parent
      setView("options");
      onClose();
    } catch (err) {
      console.error("Update error:", err.response?.data);

      const errorMessage =
        err.response?.data?.message ||
        "Sorry, we couldn't update your follow-up. Please try again.";

      const detailedErrors = err.response?.data?.errors
        ? err.response.data.errors.join(", ")
        : null;

      setError(errorMessage);
      toast.error(
        detailedErrors ? `${errorMessage} (${detailedErrors})` : errorMessage,
      );
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  // Render Views
  const renderOptions = () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "1rem",
        gap: "1rem",
        "@media (min-width: 576px)": {
          flexDirection: "row",
          justifyContent: "space-around",
        },
      }}
    >
      <StyledButton
        variant="primary"
        onClick={() => setView("edit")}
        style={{ width: "100%", maxWidth: "250px" }}
      >
        Edit Full Details
      </StyledButton>
      <StyledButton
        variant="info"
        onClick={() => setView("update")}
        style={{ width: "100%", maxWidth: "250px" }}
      >
        Update Follow-up
      </StyledButton>
    </div>
  );

  const renderEditForm = () => (
    <Form onSubmit={handleSubmit(onEditSubmit)}>
      <FormSection>
        <Form.Group controlId="customerName">
          <Form.Label>👤 Customer Name</Form.Label>
          <Form.Control
            placeholder="Enter customer name"
            {...register("customerName", {})}
            onChange={(e) => handleInputChange("customerName", e.target.value)}
            onCopy={handleCopyPaste}
            onPaste={handleCopyPaste}
            isInvalid={!!errors.customerName}
            style={formControlStyle}
            aria-label="Customer Name"
          />
          <Form.Control.Feedback type="invalid">
            {errors.customerName?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="contactName">
          <Form.Label>🧑‍💼 Contact Person Name</Form.Label>
          <Form.Control
            placeholder="Enter contact person name"
            {...register("contactName", {})}
            onChange={(e) => handleInputChange("contactName", e.target.value)}
            onCopy={handleCopyPaste}
            onPaste={handleCopyPaste}
            isInvalid={!!errors.contactName}
            style={formControlStyle}
            aria-label="Contact Name"
          />
          <Form.Control.Feedback type="invalid">
            {errors.contactName?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="email">
          <Form.Label>📧 Email</Form.Label>
          <Form.Control
            placeholder="example@email.com"
            {...register("email", {
              pattern: {
                value: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                message: "Please enter a valid email address",
              },
              maxLength: {
                value: 100,
                message: "Email cannot exceed 100 characters",
              },
            })}
            onChange={(e) => handleInputChange("email", e.target.value)}
            onCopy={handleCopyPaste}
            onPaste={handleCopyPaste}
            isInvalid={!!errors.email}
            style={formControlStyle}
            aria-label="Email"
          />
          <Form.Control.Feedback type="invalid">
            {errors.email?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="mobileNumber">
          <Form.Label>📱 Mobile Number</Form.Label>
          <Form.Control
            type="tel"
            inputMode="numeric"
            placeholder="Enter 10-digit mobile number"
            maxLength={10}
            {...register("mobileNumber", {
              maxLength: {
                value: 10,
                message: "Mobile number must be exactly 10 digits",
              },
              pattern: {
                value: /^\d{10}$/,
                message: "Mobile number must be exactly 10 digits",
              },
            })}
            onChange={(e) => handleInputChange("mobileNumber", e.target.value)}
            onCopy={handleCopyPaste}
            onPaste={handleCopyPaste}
            isInvalid={!!errors.mobileNumber}
            style={formControlStyle}
            aria-label="Mobile Number"
          />
          <Form.Control.Feedback type="invalid">
            {errors.mobileNumber?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="alterNumber">
          <Form.Label>📞 Alternate Number</Form.Label>
          <Form.Control
            type="tel"
            inputMode="numeric"
            placeholder="Enter alternate mobile number"
            maxLength={10}
            {...register("AlterNumber", {
              maxLength: {
                value: 10,
                message: "Alternate number must be exactly 10 digits",
              },
              pattern: {
                value: /^\d{10}$/,
                message: "Alternate number must be exactly 10 digits",
              },
            })}
            onChange={(e) => handleInputChange("AlterNumber", e.target.value)}
            onCopy={handleCopyPaste}
            onPaste={handleCopyPaste}
            isInvalid={!!errors.AlterNumber}
            style={formControlStyle}
            aria-label="Alternate Number"
          />
          <Form.Control.Feedback type="invalid">
            {errors.AlterNumber?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="product" className="mb-3">
          <Form.Label>📦 Product</Form.Label>
          <Form.Control
            as="select"
            {...register("product")}
            onChange={(e) => handleInputChange("product", e.target.value)}
            isInvalid={!!errors.product}
            style={formControlStyle}
            aria-label="Product"
          >
            <option value="" disabled>
              -- Select Product --
            </option>
            <option value="Ed-Tech">Ed-Tech</option>
            <option value="Furniture">Furniture</option>
            <option value="AV">AV</option>
          </Form.Control>
          <Form.Control.Feedback type="invalid">
            {errors.product?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="address">
          <Form.Label>🏠 Address</Form.Label>
          <Form.Control
            as="textarea"
            {...register("address")}
            onChange={(e) => handleInputChange("address", e.target.value)}
            onCopy={handleCopyPaste}
            onPaste={handleCopyPaste}
            isInvalid={!!errors.address}
            rows={2}
            style={formControlStyle}
            placeholder="Enter complete address"
            aria-label="Address"
          />
          <Form.Control.Feedback type="invalid">
            {errors.address?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="state">
          <Form.Label>🗺️ State</Form.Label>
          <Controller
            name="state"
            control={control}
            render={({ field }) => (
              <Form.Control
                as="select"
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  setValue("city", ""); // reset district
                }}
              >
                <option value="">-- Select State --</option>
                {Object.keys(statesAndCities).map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </Form.Control>
            )}
          />
        </Form.Group>

        <Form.Group controlId="city">
          <Form.Label>🌆 District</Form.Label>
          <Controller
            name="city"
            control={control}
            render={({ field }) => (
              <Form.Control as="select" {...field} disabled={!selectedState}>
                <option value="">-- Select District --</option>
                {selectedState &&
                 statesAndCities[selectedState]?.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
              </Form.Control>
            )}
          />
        </Form.Group>

        <Form.Group controlId="organization" className="mb-3">
          <Form.Label>🏢 Organization</Form.Label>
          <Form.Control
            as="select"
            {...register("organization")}
            onChange={(e) => handleInputChange("organization", e.target.value)}
            isInvalid={!!errors.organization}
            style={formControlStyle}
            aria-label="Organization"
          >
            <option value="" disabled>
              -- Select Organization --
            </option>
            <option value="School">School</option>
            <option value="College">College</option>
            <option value="University">University</option>
            <option value="Construction Agency">Construction Agency</option>
            <option value="Corporate">Corporate</option>
            <option value="Partner">Partner</option>
            <option value="Others">Others</option>
          </Form.Control>
          <Form.Control.Feedback type="invalid">
            {errors.organization?.message}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId="category">
          <Form.Label>📁 Category</Form.Label>
          <Form.Control
            as="select"
            {...register("category")}
            onChange={(e) => handleInputChange("category", e.target.value)}
            isInvalid={!!errors.category}
            style={formControlStyle}
            aria-label="Category"
          >
            <option value="">-- Select Category --</option>
            <option value="Private">Private</option>
            <option value="Government">Government</option>
          </Form.Control>
          <Form.Control.Feedback type="invalid">
            {errors.category?.message}
          </Form.Control.Feedback>
        </Form.Group>
      </FormSection>
    </Form>
  );

  const renderUpdateForm = () => (
    <Form onSubmit={handleSubmit(onUpdateSubmit)}>
      <FormSection>
        <Form.Group controlId="status">
          <Form.Label>📊 Status</Form.Label>
          <Form.Control
            as="select"
            value={updateData.status}
            onChange={handleUpdateInputChange}
            name="status"
            style={formControlStyle}
            aria-label="Status"
          >
            <option value="">-- Select Status --</option>
            <option value="Maybe">Maybe</option>
            <option value="Interested">Interested</option>
            <option value="Not Interested">Not Interested</option>
            <option value="Not">Not Connected</option>
            <option value="Service">Service Call</option>
            <option value="Closed">Closed</option>
          </Form.Control>
        </Form.Group>
        {updateData.status === "Closed" && (
          <>
            <Form.Group controlId="closetype">
              <Form.Label>🏁 Close Type</Form.Label>
              <Form.Control
                as="select"
                name="closetype"
                value={updateData.closetype || ""}
                onChange={handleUpdateInputChange}
                style={formControlStyle}
                aria-label="Close Type"
              >
                <option value="">-- Select Close Type --</option>
                <option value="Closed Won">Won</option>
                <option value="Closed Lost">Lost</option>
              </Form.Control>
            </Form.Group>
            {updateData.closetype === "Closed Won" && (
              <Form.Group controlId="closeamount">
                <Form.Label>💰 Close Amount</Form.Label>
                <Form.Control
                  type="number"
                  name="closeamount"
                  value={updateData.closeamount || ""}
                  onChange={handleUpdateInputChange}
                  min="0"
                  step="0.01"
                  placeholder="Enter final deal amount"
                  style={formControlStyle}
                  aria-label="Close Amount"
                  onKeyDown={(e) => {
                    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                  }}
                />
              </Form.Group>
            )}
          </>
        )}
        <Form.Group controlId="remarks">
          <Form.Label>✏️ Remarks</Form.Label>
          <Form.Control
            as="textarea"
            value={updateData.remarks}
            onChange={handleUpdateInputChange}
            onCopy={handleCopyPaste}
            onPaste={handleCopyPaste}
            name="remarks"
            rows={3}
            maxLength={500}
            style={formControlStyle}
            placeholder="Enter remarks or follow-up notes (max 500 characters)"
            aria-label="Remarks"
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
              <span style={{ fontWeight: "bold" }}>Entry Management</span>
            </>
          ) : view === "edit" ? (
            <>
              <FaEdit className="me-2" />
              <span style={{ fontWeight: "bold" }}>Edit Entry</span>
            </>
          ) : (
            <>
              <FaSyncAlt className="me-2" />
              <span style={{ fontWeight: "bold" }}>Update Follow-up</span>
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
        <StyledButton
          variant="danger"
          onClick={onClose}
          disabled={loading}
          aria-label="Close Modal"
        >
          Close
        </StyledButton>
        {(view === "edit" || view === "update") &&
          (showConfirm ? (
            <>
              <StyledButton
                variant="warning"
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                aria-label="Cancel Confirmation"
              >
                Cancel
              </StyledButton>
              <StyledButton
                variant="success"
                onClick={
                  view === "edit" ? handleSubmit(onEditSubmit) : onUpdateSubmit
                }
                disabled={loading}
                aria-label="Confirm Action"
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
              disabled={
                loading || (view === "edit" && Object.keys(errors).length > 0)
              }
              aria-label={view === "edit" ? "Save Changes" : "Update Follow-up"}
            >
              {loading ? (
                <Spinner as="span" animation="border" size="sm" />
              ) : view === "edit" ? (
                "Save Changes"
              ) : (
                "Update Follow-up"
              )}
            </StyledButton>
          ))}
      </Modal.Footer>
    </StyledModal>
  );
}

export default EditEntry;
