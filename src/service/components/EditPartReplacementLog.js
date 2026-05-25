import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import { Edit3, Check, Package } from "lucide-react";
import serviceApi from "../axiosSetup";

const EditPartReplacementLog = ({ show, onHide, log, onSuccess }) => {
  const [partStatus, setPartStatus] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (log) {
      setPartStatus(log.partStatus || "Pending");
      setRemarks(log.remarks || "");
    }
  }, [log]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await serviceApi.patch(`/part-replacements/${log._id}`, {
        partStatus,
        remarks
      });

      if (response.data.success) {
        toast.success("Procurement status updated");
        onSuccess();
        onHide();
      }
    } catch (error) {
      console.error("Failed to update log:", error);
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  if (!log) return null;

  return (
    <Modal show={show} onHide={onHide} centered size="md" backdrop="static">
      <Modal.Header 
        closeButton 
        style={{ 
          background: "linear-gradient(135deg, #2575fc, #6a11cb)", 
          color: "white",
          border: "none",
          padding: "20px 30px"
        }}
      >
        <Modal.Title style={{ fontWeight: "800", display: "flex", alignItems: "center", gap: "12px" }}>
          <div 
            style={{ 
              padding: "8px", 
              borderRadius: "10px", 
              backgroundColor: "rgba(255, 255, 255, 0.2)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              border: "1px solid rgba(255, 255, 255, 0.3)"
            }}
          >
            <Edit3 size={20} color="white" />
          </div>
          Update Procurement
        </Modal.Title>
      </Modal.Header>
      
      <Form onSubmit={handleSubmit}>
        <Modal.Body style={{ padding: "30px", background: "#f8fafc" }}>
          {/* Quick Context Card */}
          <div className="p-4 rounded-4 bg-white border shadow-sm mb-4">
            <div className="d-flex align-items-center gap-3 mb-2">
              <div className="p-2 rounded-3 bg-light text-primary">
                <Package size={18} />
              </div>
              <div>
                <h6 className="mb-0 fw-800 text-dark" style={{ fontSize: "1rem" }}>{log.partName}</h6>
                <p className="mb-0 text-muted" style={{ fontSize: "0.85rem" }}>Complaint Number: <span className="fw-700 text-primary">{log.complaintNumber}</span></p>
              </div>
            </div>
          </div>

          <Form.Group className="mb-4">
            <Form.Label className="fw-800 text-uppercase text-muted mb-2" style={{ fontSize: "0.75rem", letterSpacing: "1px" }}>
              Part Status
            </Form.Label>
            <Form.Select
              value={partStatus}
              onChange={(e) => setPartStatus(e.target.value)}
              required
              style={{
                borderRadius: "12px",
                padding: "12px",
                border: "1.5px solid #e2e8f0",
                fontWeight: "600",
                fontSize: "0.95rem"
              }}
            >
              <option value="Pending">🕒 Still Pending</option>
              <option value="In Stock">✅ Marked as In Stock</option>
              <option value="Out of Stock">❌ Currently Out of Stock</option>
            </Form.Select>
            <Form.Text className="text-muted mt-2 d-block px-1">
              Marking "In Stock" will notify the engineer and archive this log.
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-0">
            <Form.Label className="fw-800 text-uppercase text-muted mb-2" style={{ fontSize: "0.75rem", letterSpacing: "1px" }}>
              Procurement Remarks
            </Form.Label>
            <div className="position-relative">
              <Form.Control
                as="textarea"
                rows={4}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter procurement details, ETA, or notes..."
                style={{
                  borderRadius: "12px",
                  padding: "15px",
                  border: "1.5px solid #e2e8f0",
                  fontSize: "0.95rem",
                  resize: "none",
                  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)"
                }}
              />
            </div>
          </Form.Group>
        </Modal.Body>

        <Modal.Footer style={{ border: "none", padding: "20px 30px", background: "#f8fafc" }}>
          <Button 
            variant="light" 
            onClick={onHide} 
            disabled={loading}
            style={{ borderRadius: "12px", fontWeight: "700", padding: "12px 24px", color: "#64748b", background: "white", border: "1.5px solid #e2e8f0" }}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            type="submit" 
            disabled={loading}
            style={{ 
              borderRadius: "12px", 
              fontWeight: "700", 
              padding: "12px 30px", 
              background: "linear-gradient(135deg, #2575fc, #6a11cb)",
              border: "none",
              boxShadow: "0 4px 12px rgba(37, 117, 252, 0.2)",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            {loading ? <Spinner animation="border" size="sm" /> : (
              <>
                <Check size={18} />
                Save Updates
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default EditPartReplacementLog;
