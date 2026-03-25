/**
 * Furni Delete Modal — unified portal version.
 * Uses furniApi instead of bare axios. No localStorage token reads.
 */
import React, { useState } from "react";
import furniApi from "../axiosSetup";
import { toast } from "react-toastify";

function DeleteModal({ isOpen, onClose, onDelete, itemId }) {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");

  const handleDelete = async () => {
    if (confirmationText !== "DELETE") {
      toast.error("Please type 'DELETE' to confirm!");
      return;
    }
    setIsLoading(true);
    try {
      const response = await furniApi.delete(`/api/delete/${itemId}`);
      if (response.data.success) {
        onDelete([itemId]);
        onClose();
      } else {
        throw new Error(response.data.message || "Deletion failed");
      }
    } catch (error) {
      let errorMessage = "Something went wrong while deleting.";
      if (error.response?.status === 404) errorMessage = "The entry you are trying to delete was not found.";
      else if (error.response?.status === 401) errorMessage = "Your session expired. Please log in again.";
      else if (error.response?.data?.message) errorMessage = error.response.data.message;
      toast.error(errorMessage, { position: "top-right", autoClose: 5000 });
    } finally {
      setIsLoading(false);
      setConfirmationText("");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal" style={{ display: "block", background: "rgba(0,0,0,0.5)" }} tabIndex={-1}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header" style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", color: "#fff", borderBottom: "none", boxShadow: "0 4px 15px rgba(0,0,0,0.2)", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <h1 className="modal-title fs-5">Confirm Deletion</h1>
            <button type="button" className="btn-close" onClick={() => { setConfirmationText(""); onClose(); }} disabled={isLoading} />
          </div>
          <div className="modal-body">
            <p>Are you sure you want to delete this item? This action cannot be undone.</p>
            <p>Type <strong>DELETE</strong> below to confirm:</p>
            <input type="text" className="form-control" value={confirmationText} onChange={(e) => setConfirmationText(e.target.value)} placeholder="Type DELETE" disabled={isLoading} style={{ marginTop: "10px" }} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => { setConfirmationText(""); onClose(); }} disabled={isLoading}>Cancel</button>
            <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={isLoading || confirmationText !== "DELETE"}>{isLoading ? "Deleting..." : "Delete"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeleteModal;
