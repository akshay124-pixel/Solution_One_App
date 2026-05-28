import React, { useState, useEffect, useRef } from "react";
import { Modal, Button, Form, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import { Edit3, Check, Package, Clock, CheckCircle, XCircle, Truck } from "lucide-react";
import serviceApi from "../axiosSetup";

const EditPartReplacementLog = ({ show, onHide, log, onSuccess }) => {
  const [localParts, setLocalParts] = useState([]);
  const [selectedPartId, setSelectedPartId] = useState("");
  const [partStatus, setPartStatus] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  
  // To track original values and determine if a part has unsaved changes
  const originalPartsRef = useRef([]);

  useEffect(() => {
    if (log) {
      const parts = Array.isArray(log.parts) && log.parts.length > 0
        ? log.parts
        : [{
            _id: "legacy",
            partName: log.partName || "Part",
            quantity: log.quantity || 1,
            status: log.partStatus || "Pending",
            procurementRemarks: log.remarks || "",
          }];

      originalPartsRef.current = JSON.parse(JSON.stringify(parts));
      setLocalParts(parts);

      const defaultPart = parts[0];
      setSelectedPartId(defaultPart?._id || "");
      setPartStatus(defaultPart?.status || "Pending");
      setRemarks(defaultPart?.procurementRemarks || "");
    }
  }, [log]);

  // When selected part changes, load its status/remarks from local state (not original)
  useEffect(() => {
    if (!log || localParts.length === 0 || !selectedPartId) return;
    const selected = localParts.find((p) => p._id === selectedPartId);
    if (!selected) return;
    setPartStatus(selected.status || "Pending");
    setRemarks(selected.procurementRemarks || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPartId, localParts.length]);

  // Update selected part within the local array in real-time
  const handleStatusChange = (newStatus) => {
    setPartStatus(newStatus);
    setLocalParts((prev) =>
      prev.map((p) => (p._id === selectedPartId ? { ...p, status: newStatus } : p))
    );
  };

  const handleRemarksChange = (newRemarks) => {
    setRemarks(newRemarks);
    setLocalParts((prev) =>
      prev.map((p) => (p._id === selectedPartId ? { ...p, procurementRemarks: newRemarks } : p))
    );
  };

  // Check if a part has unsaved edits
  const isPartModified = (p) => {
    const original = originalPartsRef.current.find((orig) => orig._id === p._id);
    if (!original) return false;
    return original.status !== p.status || original.procurementRemarks !== p.procurementRemarks;
  };

  // Get total count of modified parts
  const getModifiedCount = () => {
    return localParts.filter(isPartModified).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await serviceApi.patch(`/part-replacements/${log._id}`, {
        parts: localParts
      });

      if (response.data.success) {
        toast.success("Procurement status updated successfully");
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

  const getStatusBadge = (status) => {
    switch (status) {
      case "In Stock":
        return {
          bg: "#dcfce7",
          color: "#15803d",
          icon: <CheckCircle size={13} className="me-1" />,
        };
      case "Out of Stock":
        return {
          bg: "#fee2e2",
          color: "#b91c1c",
          icon: <XCircle size={13} className="me-1" />,
        };
      case "Dispatched":
        return {
          bg: "#dbeafe",
          color: "#1d4ed8",
          icon: <Truck size={13} className="me-1" />,
        };
      case "Pending":
      default:
        return {
          bg: "#fef3c7",
          color: "#d97706",
          icon: <Clock size={13} className="me-1" />,
        };
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="md" backdrop="static">
      <style>
        {`
          .part-snapshot-card {
            border: 1.5px solid #e2e8f0;
            border-radius: 12px;
            padding: 12px 14px;
            background: #ffffff;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
          }
          .part-snapshot-card:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
            border-color: #cbd5e1;
          }
          .part-snapshot-card.selected {
            border-color: #2575fc;
            background: #f8fafc;
            box-shadow: 0 4px 12px rgba(37, 117, 252, 0.1);
          }
          .part-snapshot-card.selected:hover {
            transform: translateY(-1px) scale(1.005);
          }
        `}
      </style>

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
                <h6 className="mb-0 fw-800 text-dark" style={{ fontSize: "1rem" }}>
                  {Array.isArray(log.parts) && log.parts.length > 0 ? `Parts (${log.parts.length})` : log.partName}
                </h6>
                <p className="mb-0 text-muted" style={{ fontSize: "0.85rem" }}>
                  Complaint Number: <span className="fw-700 text-primary">{log.complaintNumber}</span>
                </p>
              </div>
            </div>
          </div>

          {/* All parts snapshot with current status + remarks */}
          {localParts.length > 0 && (
            <div className="p-3 rounded-4 bg-white border shadow-sm mb-4">
              <div className="fw-800 text-uppercase text-muted mb-2.5 d-flex justify-content-between align-items-center" style={{ fontSize: "0.72rem", letterSpacing: "1px" }}>
                <span>All Parts Snapshot</span>
                {getModifiedCount() > 0 && (
                  <span className="text-primary fw-800" style={{ textTransform: "none" }}>
                    {getModifiedCount()} pending save
                  </span>
                )}
              </div>
              <div style={{ display: "grid", gap: "10px", maxHeight: "200px", overflowY: "auto", padding: "2px" }}>
                {localParts.map((p) => {
                  const isSelected = selectedPartId === p._id;
                  const isModified = isPartModified(p);
                  const badge = getStatusBadge(p.status);
                  return (
                    <div
                      key={p._id}
                      className={`part-snapshot-card ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedPartId(p._id)}
                    >
                      <div className="d-flex justify-content-between align-items-start">
                        <div style={{ fontWeight: 750, fontSize: "0.92rem", color: "#1e293b" }}>
                          {p.partName} <span style={{ fontWeight: 500, color: "#64748b", fontSize: "0.8rem" }}>(Qty: {p.quantity || 1})</span>
                        </div>
                        <div className="d-flex align-items-center gap-1.5">
                          {isModified && (
                            <span 
                              style={{ 
                                fontSize: "0.68rem", 
                                fontWeight: "800", 
                                color: "#6366f1", 
                                backgroundColor: "#e0e7ff",
                                padding: "2px 6px",
                                borderRadius: "6px",
                                textTransform: "uppercase"
                              }}
                            >
                              Edited
                            </span>
                          )}
                          <span 
                            style={{ 
                              fontSize: "0.75rem", 
                              fontWeight: 700, 
                              color: badge.color,
                              backgroundColor: badge.bg,
                              padding: "3px 8px",
                              borderRadius: "20px",
                              display: "inline-flex",
                              alignItems: "center"
                            }}
                          >
                            {badge.icon}
                            {p.status || "Pending"}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#475569", marginTop: "6px", fontStyle: p.procurementRemarks ? "normal" : "italic" }}>
                        {p.procurementRemarks ? p.procurementRemarks : "No remarks added yet"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Form.Group className="mb-4">

            <Form.Label className="fw-800 text-uppercase text-muted mb-2" style={{ fontSize: "0.75rem", letterSpacing: "1px" }}>
              Part Status
            </Form.Label>
            <Form.Select
              value={partStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
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
              <option value="Dispatched">🚚 Dispatched</option>
            </Form.Select>

          </Form.Group>

          <Form.Group className="mb-0">
            <Form.Label className="fw-800 text-uppercase text-muted mb-2" style={{ fontSize: "0.75rem", letterSpacing: "1px" }}>
              Procurement Remarks
            </Form.Label>
            <div className="position-relative">
              <Form.Control
                as="textarea"
                rows={3}
                value={remarks}
                onChange={(e) => handleRemarksChange(e.target.value)}
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
                {getModifiedCount() > 0 ? `Save Updates (${getModifiedCount()})` : "Save Updates"}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default EditPartReplacementLog;
