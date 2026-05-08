import React, { useState, useEffect, Suspense } from "react";
import { Spinner } from "react-bootstrap";
import serviceApi from "../axiosSetup";
import { toast } from "react-toastify";

// Lazy load SO and Furni ViewEntry components
const SOViewEntry = React.lazy(() => import("../../so/components/ViewEntry"));
const FurniViewEntry = React.lazy(() => import("../../furni/components/ViewEntry"));

const ViewReplacementDemoLog = ({ isOpen, onClose, log }) => {
  const [fullOrderDetails, setFullOrderDetails] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [isFurniOrder, setIsFurniOrder] = useState(false);

  useEffect(() => {
    if (isOpen && log) {
      fetchFullOrderDetails();
    }
  }, [isOpen, log]);

  const fetchFullOrderDetails = async () => {
    setLoadingOrder(true);
    
    try {
      if (!log._id) {
        throw new Error("Log ID not found");
      }

      console.log("Fetching order for log:", log);
      
      // Fetch full order details using the new endpoint
      const response = await serviceApi.get(`/replacement-demo-logs/${log._id}/full-order`);
      
      console.log("API Response:", response.data);
      
      if (response.data.success && response.data.order) {
        setFullOrderDetails(response.data.order);
        // Use orderSource from backend to determine which ViewEntry to show
        const isFurni = response.data.orderSource === "Furni";
        setIsFurniOrder(isFurni);
        console.log("Order source:", response.data.orderSource);
      } else {
        const errorMsg = response.data.message || "Order not found";
        const details = response.data.details;
        console.error("Order fetch failed:", { errorMsg, details });
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error("Failed to fetch full order details:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to load order details";
      const errorDetails = error.response?.data?.details;
      
      if (errorDetails) {
        console.error("Error details:", errorDetails);
        toast.error(`${errorMessage}\nLog ID: ${errorDetails.logId}\nOrder ID: ${errorDetails.orderId}`);
      } else {
        toast.error(errorMessage);
      }
      
      onClose();
    } finally {
      setLoadingOrder(false);
    }
  };

  if (!log) return null;

  // Show loading spinner while fetching order
  if (loadingOrder) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}
      >
        <div
          style={{
            background: "white",
            padding: "40px",
            borderRadius: "12px",
            textAlign: "center",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
          }}
        >
          <Spinner animation="border" variant="primary" style={{ width: "50px", height: "50px" }} />
          <p style={{ marginTop: "20px", color: "#6b7280", fontSize: "1rem", fontWeight: "500" }}>
            Loading complete order details...
          </p>
        </div>
      </div>
    );
  }

  // Once order is loaded, show the appropriate ViewEntry component
  if (!fullOrderDetails) {
    return null;
  }

  return (
    <Suspense
      fallback={
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "40px",
              borderRadius: "12px",
              textAlign: "center",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
            }}
          >
            <Spinner animation="border" variant="primary" style={{ width: "50px", height: "50px" }} />
            <p style={{ marginTop: "20px", color: "#6b7280", fontSize: "1rem", fontWeight: "500" }}>
              Loading order view...
            </p>
          </div>
        </div>
      }
    >
      {isFurniOrder ? (
        <FurniViewEntry
          isOpen={isOpen}
          onClose={onClose}
          entry={fullOrderDetails}
        />
      ) : (
        <SOViewEntry
          isOpen={isOpen}
          onClose={onClose}
          entry={fullOrderDetails}
        />
      )}
    </Suspense>
  );
};

export default ViewReplacementDemoLog;
