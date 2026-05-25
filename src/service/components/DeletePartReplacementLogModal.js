import React, { useState } from "react";
import { Modal, Button, Spinner } from "react-bootstrap";
import { Trash2, AlertTriangle, X, Check } from "lucide-react";

const DeletePartReplacementLogModal = ({ show, onHide, log, onDelete }) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    await onDelete(log);
    setLoading(false);
    onHide();
  };

  if (!log) return null;

  return (
    <Modal show={show} onHide={onHide} centered size="md" backdrop="static">
      <Modal.Header 
        closeButton 
        style={{ 
          background: "linear-gradient(135deg, #ef4444, #dc2626)", 
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
            <Trash2 size={20} color="white" />
          </div>
          Confirm Deletion
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body style={{ padding: "40px 30px", background: "#f8fafc", textAlign: "center" }}>
        <div className="mb-4 d-inline-flex p-4 rounded-circle bg-danger bg-opacity-10 text-danger">
          <AlertTriangle size={48} />
        </div>
        
        <h4 className="fw-800 text-dark mb-2">Are you sure?</h4>
        <p className="text-muted mb-4 px-4" style={{ fontSize: "0.95rem", lineHeight: "1.6" }}>
          You are about to delete the procurement log for <strong className="text-dark">{log.partName}</strong> (Ticket: {log.complaintNumber}). This action cannot be undone.
        </p>

        <div className="p-3 rounded-4 bg-white border border-danger border-opacity-20 shadow-sm mx-auto" style={{ maxWidth: "300px" }}>
          <span className="text-danger fw-700" style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px" }}>
            Customer: {log.customerName}
          </span>
        </div>
      </Modal.Body>

      <Modal.Footer style={{ border: "none", padding: "20px 30px", background: "#f8fafc", justifyContent: "center", gap: "15px" }}>
        <Button 
          variant="light" 
          onClick={onHide} 
          disabled={loading}
          style={{ borderRadius: "12px", fontWeight: "700", padding: "12px 30px", color: "#64748b", background: "white", border: "1.5px solid #e2e8f0", minWidth: "140px" }}
        >
          No, Keep it
        </Button>
        <Button 
          variant="danger" 
          onClick={handleDelete} 
          disabled={loading}
          style={{ 
            borderRadius: "12px", 
            fontWeight: "700", 
            padding: "12px 30px", 
            background: "linear-gradient(135deg, #ef4444, #dc2626)",
            border: "none",
            boxShadow: "0 4px 12px rgba(239, 68, 68, 0.2)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minWidth: "140px",
            justifyContent: "center"
          }}
        >
          {loading ? <Spinner animation="border" size="sm" /> : (
            <>
              <Check size={18} />
              Yes, Delete
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeletePartReplacementLogModal;
