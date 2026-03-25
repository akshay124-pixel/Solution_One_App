import React, { useState } from "react";
import axios from "../../so/axiosSetup";
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
      // Single delete request
      const response = await axios.delete(
        `${process.env.REACT_APP_SO_URL}/api/delete/${itemId}`
      );

      if (response.data.success) {
        onDelete([itemId]); // Pass single ID as array for consistency with parent
        onClose(); // Close the modal
      } else {
        throw new Error(response.data.message || "Deletion failed");
      }
    } catch (error) {
      console.error("Error deleting entry:", error);

      let errorMessage = "Something went wrong while deleting the entry.";

      if (error.response) {
        if (error.response.status === 400) {
          errorMessage = "Invalid request. Please check the entry details.";
        } else if (error.response.status === 401) {
          errorMessage = "Your session has expired. Please log in again.";
        } else if (error.response.status === 403) {
          errorMessage = "You don’t have permission to delete this entry.";
        } else if (error.response.status === 404) {
          errorMessage = "The entry you are trying to delete was not found.";
        } else if (error.response.status === 500) {
          errorMessage = "Server error. Please try again later.";
        } else {
          errorMessage = error.response.data?.message || errorMessage;
        }
      } else if (error.request) {
        errorMessage =
          "Unable to connect to the server. Please check your internet connection.";
      }

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      setConfirmationText(""); // reset input
    }
  };

  const handleInputChange = (e) => {
    setConfirmationText(e.target.value);
  };

  if (!isOpen) return null; // Render nothing if not open

  return (
    <div
      className="modal"
      style={{ display: "block", background: "rgba(0, 0, 0, 0.5)" }}
      tabIndex={-1}
    >
      <div className="modal-dialog">
        <div className="modal-content">
          <div
            className="modal-header"
            style={{
              background: "linear-gradient(135deg, #2575fc, #6a11cb)",
              color: "#fff",

              borderBottom: "none",
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <h1 className="modal-title fs-5">Confirm Deletion</h1>
            <button
              type="button"
              className="btn-close"
              onClick={() => {
                setConfirmationText(""); // Reset input on close
                onClose();
              }}
              disabled={isLoading}
            />
          </div>
          <div className="modal-body">
            <p>
              Are you sure you want to delete this item? This action cannot be
              undone.
            </p>
            <p>
              Type <strong>DELETE</strong> below to confirm:
            </p>
            <input
              type="text"
              className="form-control"
              value={confirmationText}
              onChange={handleInputChange}
              placeholder="Type DELETE"
              disabled={isLoading}
              style={{ marginTop: "10px" }}
            />
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setConfirmationText(""); // Reset input on cancel
                onClose();
              }}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={isLoading || confirmationText !== "DELETE"}
            >
              {isLoading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeleteModal;
