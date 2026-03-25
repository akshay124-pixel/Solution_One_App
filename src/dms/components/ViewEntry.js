import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Modal, Button, Badge } from "react-bootstrap";
import { Box } from "@mui/material";
import "bootstrap/dist/css/bootstrap.min.css";
import { toast } from "react-toastify";
import api from "../api/api";
import ClickToCallButton from "./Dialer/ClickToCallButton";
import CallLogModal from "./Dialer/CallLogModal";
import ScheduleCallModal from "./Dialer/ScheduleCallModal";

function ViewEntry({ isOpen, onClose, entry, isAdmin, onEntryUpdated }) {
  const [copied, setCopied] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [callLogOpen, setCallLogOpen] = useState(false);
  const [scheduleCallOpen, setScheduleCallOpen] = useState(false);
  const [nextScheduledCall, setNextScheduledCall] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch next scheduled call when modal opens, entry changes, or refresh triggered
  useEffect(() => {
    if (isOpen && entry?._id) {
      fetchNextScheduledCall();
    }
  }, [isOpen, entry?._id, refreshTrigger]);

  const fetchNextScheduledCall = async () => {
    if (!entry?._id) return;

    try {
      // Using api instance for automatic token handling and refresh
      const response = await api.get(`/api/dialer/scheduled-calls/${entry._id}`);

      if (response.data.success && response.data.data.length > 0) {
        // Get the next pending scheduled call (sorted by time)
        const pendingCalls = response.data.data
          .filter((call) => call.status === "pending")
          .sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));

        if (pendingCalls.length > 0) {
          setNextScheduledCall(pendingCalls[0]);
        } else {
          setNextScheduledCall(null);
        }
      } else {
        setNextScheduledCall(null);
      }
    } catch (error) {
      console.error("Fetch scheduled call error:", error);
      setNextScheduledCall(null);
    }
  };

  const handleCopy = useCallback(() => {
    if (!isAdmin) {
      toast.error("You do not have permission to copy data.");
      return;
    }

    if (!entry) {
      toast.error("No entry data available to copy.");
      return;
    }

    const productsText = Array.isArray(entry.products)
      ? entry.products
        .map(
          (product, index) =>
            `Product ${index + 1}: Name: ${product.name || "N/A"
            }, Specification: ${product.specification || "N/A"}, Size: ${product.size || "N/A"
            }, Quantity: ${product.quantity || "N/A"}`
        )
        .join("\n")
      : "N/A";

    const textToCopy = `
      Date: ${entry.createdAt
        ? new Date(entry.createdAt).toLocaleDateString("en-GB")
        : "N/A"
      }
      Customer Name: ${entry.customerName || "N/A"}
      Mobile Number: ${entry.mobileNumber || "N/A"}
      Alternate Number: ${entry.AlterNumber || "N/A"}
      Products: ${productsText}
      Address: ${entry.address || "N/A"}
      City: ${entry.city || "N/A"}
      State: ${entry.state || "N/A"}
      Organization: ${entry.organization || "N/A"}
      Category: ${entry.category || "N/A"}
      Status: ${entry.status || "Not Interested"}
      Remarks: ${entry.remarks || "N/A"}
      Updated At: ${entry.updatedAt
        ? new Date(entry.updatedAt).toLocaleDateString("en-GB")
        : "N/A"
      }
    `.trim();

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        setCopied(true);
        toast.success("Details copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        toast.error("Failed to copy details!");
        console.error("Copy error:", err);
      });
  }, [entry, isAdmin]);

  const toggleHistory = useCallback(() => {
    setHistoryVisible((prev) => !prev);
  }, []);

  const sortedHistory = useMemo(() => {
    if (!entry || !Array.isArray(entry.history)) return [];
    return [...entry.history].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  }, [entry]);

  if (!isOpen || !entry) {
    return null;
  }

  return (
    <Modal
      show={isOpen}
      onHide={onClose}
      backdrop="static"
      keyboard={false}
      size="lg"
      aria-labelledby="view-entry-modal-title"
      centered
      style={{
        animation: isOpen ? "fadeIn 0.3s ease-out" : "fadeOut 0.3s ease-in",
        backdropFilter: "blur(5px)",
      }}
    >
      <Modal.Header
        closeButton
        style={{
          background: "linear-gradient(135deg, #2575fc, #6a11cb)",
          color: "#fff",
          padding: "1.5rem",
          borderBottom: "none",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
        }}
      >
        <Modal.Title
          id="view-entry-modal-title"
          style={{
            fontFamily:
              "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            fontWeight: 700,
            fontSize: "1.75rem",
            letterSpacing: "-0.02em",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <span
            role="img"
            aria-label="Client profile icon"
            style={{ fontSize: "1.5rem" }}
          >
            👤
          </span>
          Client Profile
        </Modal.Title>
      </Modal.Header>

      <Modal.Body
        style={{
          padding: "2rem",
          background: "#f9fafb",
          maxHeight: "75vh",
          overflowY: "auto",
          borderBottomLeftRadius: "12px",
          borderBottomRightRadius: "12px",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          scrollbarWidth: "thin",
          scrollbarColor: "#2575fc #e6f0fa",
        }}
      >
        {/* Personal Info Section */}
        <Section title="Personal Information">
          <Grid>
            <DataItem label="Customer Name" value={entry.customerName} />
            <DataItem label="Contact Person" value={entry.contactName} />
            <DataItem label="Mobile Number" value={entry.mobileNumber} />
            <DataItem label="Alternate Number" value={entry.AlterNumber} />
            <DataItem label="Email" value={entry.email} />
          </Grid>
        </Section>

        {/* Location Section */}
        <Section title="Location Details">
          <Grid>
            <DataItem label="Address" value={entry.address} />
            <DataItem label="City" value={entry.city} />
            <DataItem label="State" value={entry.state} />
          </Grid>
        </Section>

        {/* Business Info Section */}
        <Section title="Business Information">
          <Grid>
            <DataItem label="Organization" value={entry.organization} />
            <DataItem label="Category" value={entry.category} />
            <DataItem label="Product" value={entry.product} />
          </Grid>
        </Section>

        {/* Products Section */}
        {Array.isArray(entry.products) && entry.products.length > 0 && (
          <Section title="Products">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {entry.products.map((product, index) => (
                <div
                  key={index}
                  style={{
                    padding: "1rem",
                    background: "#ffffff",
                    borderRadius: "8px",
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    cursor: "default",
                    borderLeft: "3px solid #6a11cb",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(0, 0, 0, 0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 2px 6px rgba(0, 0, 0, 0.1)";
                  }}
                  role="region"
                  aria-label={`Product ${index + 1}`}
                >
                  <strong style={{ color: "#1f2937", fontSize: "1rem" }}>
                    Product {index + 1}:
                  </strong>{" "}
                  <span style={{ color: "#4b5563", fontSize: "0.95rem" }}>
                    {product.name || "N/A"} | Specification:{" "}
                    {product.specification || "N/A"} | Size:{" "}
                    {product.size || "N/A"} | Quantity:{" "}
                    {product.quantity || "N/A"}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Smartflo Call Actions */}
        <Section title="Call Actions">
          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <ClickToCallButton
              leadId={entry._id}
              phoneNumber={entry.mobileNumber}
              onCallInitiated={() => {
                toast.success("Call initiated! Your phone will ring first.");
              }}
            />

            <Button
              variant="outline-primary"
              onClick={() => setCallLogOpen(true)}
              style={{
                borderRadius: "8px",
                padding: "0.6rem 1.2rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              📞 Call History
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => setScheduleCallOpen(true)}
              style={{
                borderRadius: "8px",
                padding: "0.6rem 1.2rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              📅 Schedule Callback
            </Button>
          </Box>


          {/* Call Statistics */}
          {(entry.totalCallsMade > 0 || entry.lastCallDate || nextScheduledCall) && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                background: "#ffffff",
                borderRadius: "10px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}
            >
              <Grid sx={{ gap: "0.8rem" }}>

                {/* Total Calls */}
                {entry.totalCallsMade > 0 && (
                  <DataItem
                    label="Total Calls"
                    value={
                      <Box sx={{ fontWeight: 600, color: "#111827", fontSize: "0.9rem" }}>
                        {entry.totalCallsMade}
                      </Box>
                    }
                  />
                )}

                {/* Last Call Date */}
                {entry.lastCallDate && (
                  <DataItem
                    label="Last Call"
                    value={
                      <Box
                        sx={{
                          padding: "6px 10px",
                          background: "#f6f7f9",
                          borderLeft: "3px solid #6366f1",
                          borderRadius: "6px",
                          fontWeight: 500,
                          color: "#1f2937",
                          fontSize: "0.85rem",
                        }}
                      >
                        {new Date(entry.lastCallDate).toLocaleString("en-GB")}
                      </Box>
                    }
                  />
                )}

                {/* Last Call Status */}
                {entry.lastCallStatus && (
                  <DataItem
                    label="Last Status"
                    value={
                      <Box
                        sx={{
                          padding: "6px 10px",
                          background: "#eef2ff",
                          borderLeft: "3px solid #4f46e5",
                          borderRadius: "6px",
                          fontWeight: 500,
                          fontSize: "0.85rem",
                          color: "#4338ca",
                        }}
                      >
                        {entry.lastCallStatus.replace("_", " ").toUpperCase()}
                      </Box>
                    }
                  />
                )}

                {/* Next Scheduled Call */}
                {nextScheduledCall && (
                  <DataItem
                    label="Next Scheduled Call"
                    value={
                      <Box
                        display="flex"
                        alignItems="center"
                        gap={1.2}
                        flexWrap="wrap"
                        sx={{ mt: 0.5 }}
                      >

                        {/* Time */}
                        <Box
                          sx={{
                            padding: "6px 10px",
                            background: "#f6f7f9",
                            borderLeft: "3px solid #6a11cb",
                            borderRadius: "6px",
                            fontWeight: 500,
                            fontSize: "0.85rem",
                            color: "#111827",
                          }}
                        >
                          {new Date(nextScheduledCall.scheduledTime).toLocaleString("en-GB")}
                        </Box>

                        {/* Priority */}
                        {nextScheduledCall.priority && (
                          <Box
                            sx={{
                              padding: "6px 10px",
                              background:
                                nextScheduledCall.priority === "urgent"
                                  ? "#fee2e2"
                                  : nextScheduledCall.priority === "high"
                                    ? "#ffedd5"
                                    : nextScheduledCall.priority === "medium"
                                      ? "#fef9c3"
                                      : "#dcfce7",
                              borderLeft:
                                nextScheduledCall.priority === "urgent"
                                  ? "3px solid #b91c1c"
                                  : nextScheduledCall.priority === "high"
                                    ? "3px solid #c2410c"
                                    : nextScheduledCall.priority === "medium"
                                      ? "3px solid #b45309"
                                      : "3px solid #15803d",
                              borderRadius: "6px",
                              fontSize: "0.85rem",
                              fontWeight: 600,
                              color:
                                nextScheduledCall.priority === "urgent"
                                  ? "#991b1b"
                                  : nextScheduledCall.priority === "high"
                                    ? "#9a3412"
                                    : nextScheduledCall.priority === "medium"
                                      ? "#92400e"
                                      : "#166534",
                            }}
                          >
                            {nextScheduledCall.priority.toUpperCase()}
                          </Box>
                        )}


                      </Box>
                    }
                  />
                )}

              </Grid>
            </Box>
          )}

        </Section>

        {/* Follow-up Section */}
        <Section title="Follow-up Details">
          <Grid>
            <DataItem
              label="Status"
              value={
                <Badge
                  style={{
                    background:
                      entry.status === "Interested"
                        ? "linear-gradient(135deg, #00897b, #00695c)" // Interested (Green Teal)
                        : entry.status === "Not Interested"
                          ? "linear-gradient(135deg, #00838f, #006064)" // Cold Calls (Teal Blue)
                          : entry.status === "Maybe"
                            ? "linear-gradient(135deg, #ef6c00, #d84315)" // Warm Calls (Orange)
                            : entry.status === "Closed Won"
                              ? "linear-gradient(135deg, #388e3c, #2e7d32)" // Closed Won (Green)
                              : entry.status === "Closed Lost"
                                ? "linear-gradient(135deg, #7b1fa2, #6a1b9a)" // Closed Lost (Purple)
                                : entry.status === "Service"
                                  ? "linear-gradient(135deg, #1976d2, #0d47a1)" // Service Calls (Blue)
                                  : entry.status === "Not"
                                    ? "linear-gradient(135deg, #d32f2f, #b71c1c)" // Not Connected (Red)
                                    : "linear-gradient(135deg, #6b7280, #4b5563)", // Default Grey
                    color: "#fff",
                    padding: "0.4rem 0.8rem",
                    borderRadius: "6px",
                    fontWeight: 500,
                  }}

                >
                  {entry.status && entry.status !== "Not"
                    ? entry.status
                    : "Not Connected"}
                </Badge>
              }
            />
            {entry.closetype && (
              <DataItem label="Close Type" value={entry.closetype} />
            )}
            {entry.closeamount && (
              <DataItem
                label="Closure Amount"
                value={new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                }).format(entry.closeamount)}
              />
            )}
            <DataItem label="Remarks" value={entry.remarks} />
            <DataItem
              label="Created"
              value={
                entry.createdAt
                  ? new Date(entry.createdAt).toLocaleDateString("en-GB")
                  : "N/A"
              }
            />
            <DataItem
              label="Updated"
              value={
                entry.updatedAt
                  ? new Date(entry.updatedAt).toLocaleDateString("en-GB")
                  : "N/A"
              }
            />
            <DataItem label="Created By" value={entry.createdBy?.username} />
          </Grid>
        </Section>

        {/* History Section */}
        {sortedHistory.length > 0 && (
          <Section title="History Log">
            <div
              style={{
                marginBottom: "1rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
              onClick={toggleHistory}
              onKeyDown={(e) => {
                if (e.key === "Enter") toggleHistory();
              }}
              role="button"
              tabIndex={0}
              aria-expanded={historyVisible}
              aria-controls="history-log"
              aria-label={
                historyVisible ? "Hide history log" : "Show history log"
              }
            >
              <span
                style={{
                  fontSize: "1rem",
                  transform: historyVisible ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              >
                ▶
              </span>
              <span style={{ fontWeight: 600, color: "#1f2937" }}>
                {historyVisible ? "Hide History" : "Show History"}
              </span>
            </div>
            {historyVisible && (
              <div
                id="history-log"
                style={{
                  maxHeight: "200px",
                  overflowY: "auto",
                  padding: "1rem",
                  background: "#f1f5f9",
                  borderRadius: "8px",
                  boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.05)",
                }}
                role="log"
                aria-live="polite"
              >
                {sortedHistory.map((historyItem, index) => (
                  <div
                    key={index}
                    style={{
                      padding: "0.75rem",
                      background: "#ffffff",
                      borderRadius: "6px",
                      marginBottom: "0.5rem",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                      borderLeft: "3px solid #2575fc",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.9rem",
                        color: "#1f2937",
                      }}
                    >
                      <strong>Timestamp:</strong>{" "}
                      {new Date(historyItem.timestamp).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </p>

                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.9rem",
                        color: "#4b5563",
                      }}
                    >
                      <strong>Status:</strong>{" "}
                      {historyItem.status && historyItem.status !== "Not" ? (
                        <Badge
                          style={{
                            background:
                              historyItem.status === "Interested"
                                ? "linear-gradient(135deg, #10b981, #059669)" // green
                                : historyItem.status === "Not Interested"
                                  ? "linear-gradient(135deg, #ef4444, #dc2626)" // red
                                  : historyItem.status === "Maybe"
                                    ? "linear-gradient(135deg, #f59e0b, #d97706)" // yellow
                                    : historyItem.status === "Closed"
                                      ? "linear-gradient(135deg, #6366f1, #4f46e5)" // violet-blue
                                      : historyItem.status === "Service"
                                        ? "linear-gradient(135deg, #0ea5e9, #0284c7)" // blue
                                        : historyItem.status === "Not Found"
                                          ? "linear-gradient(135deg, #f43f5e, #be123c)" // pink-red
                                          : "linear-gradient(135deg, #9ca3af, #6b7280)", // fallback gray
                            color: "#fff",
                            padding: "0.3rem 0.6rem",
                            borderRadius: "4px",
                          }}
                        >
                          {historyItem.status}
                        </Badge>
                      ) : (
                        <Badge
                          style={{
                            background:
                              "linear-gradient(135deg, #6b7280, #4b5563)", // gray
                            color: "#fff",
                            padding: "0.3rem 0.6rem",
                            borderRadius: "4px",
                          }}
                        >
                          Not Connected
                        </Badge>
                      )}
                    </p>

                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.9rem",
                        color: "#4b5563",
                      }}
                    >
                      <strong>Remarks:</strong> {historyItem.remarks || "N/A"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* Modals */}
        <CallLogModal
          open={callLogOpen}
          onClose={() => setCallLogOpen(false)}
          leadId={entry._id}
          leadName={entry.contactName || entry.customerName}
        />

        <ScheduleCallModal
          open={scheduleCallOpen}
          onClose={() => setScheduleCallOpen(false)}
          leadId={entry._id}
          leadName={entry.contactName || entry.customerName}
          leadPhone={entry.mobileNumber}
          onCallScheduled={(data) => {
            // Trigger refresh to fetch latest scheduled call
            setRefreshTrigger((prev) => prev + 1);

            toast.success("✅ Call scheduled successfully!");
            setScheduleCallOpen(false);

            if (onEntryUpdated) {
              onEntryUpdated(entry);
            }
          }}
        />

        <Button
          variant="primary"
          onClick={handleCopy}
          disabled={!isAdmin}
          style={{
            background: isAdmin
              ? "linear-gradient(135deg, #2575fc, #6a11cb)"
              : "linear-gradient(135deg, #d1d5db, #e5e7eb)",
            border: "none",
            borderRadius: "10px",
            padding: "0.85rem 2rem",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            fontSize: "1.1rem",
            width: "100%",
            transition:
              "transform 0.2s ease, box-shadow 0.2s ease, background 0.3s ease",
            boxShadow: isAdmin ? "0 4px 12px rgba(0, 0, 0, 0.15)" : "none",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
          onMouseEnter={(e) => {
            if (isAdmin) {
              e.target.style.transform = "translateY(-3px)";
              e.target.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.2)";
            }
          }}
          onMouseLeave={(e) => {
            if (isAdmin) {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
            }
          }}
          onFocus={(e) => {
            if (isAdmin) {
              e.target.style.outline = "2px solid #2575fc";
              e.target.style.outlineOffset = "2px";
            }
          }}
          onBlur={(e) => {
            e.target.style.outline = "none";
          }}
          aria-label={copied ? "Copied to clipboard" : "Copy client details"}
          tabIndex={0}
        >
          {copied ? (
            <>
              <span role="img" aria-label="Checkmark">
                ✅
              </span>{" "}
              Copied!
            </>
          ) : (
            <>
              <span role="img" aria-label="Clipboard">
                📋
              </span>{" "}
              Copy Details
            </>
          )}
        </Button>
      </Modal.Body>
    </Modal>
  );
}

// Helper Components
const Section = React.memo(({ title, children }) => (
  <section
    style={{
      background: "#ffffff",
      borderRadius: "10px",
      padding: "1.5rem",
      marginBottom: "1.5rem",
      boxShadow: "0 3px 8px rgba(0, 0, 0, 0.08)",
      borderLeft: "4px solid #2575fc",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "0 3px 8px rgba(0, 0, 0, 0.08)";
    }}
    role="region"
    aria-label={title}
  >
    <h3
      style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: "1.3rem",
        fontWeight: 700,
        color: "#1f2937",
        marginBottom: "1rem",
        borderBottom: "2px solid #2575fc",
        paddingBottom: "0.5rem",
        background: "linear-gradient(135deg, #2575fc10, #6a11cb10)",
        padding: "0.5rem 1rem",
        borderRadius: "6px",
      }}
    >
      {title}
    </h3>
    {children}
  </section>
));

const DataItem = React.memo(({ label, value }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: "0.3rem",
      padding: "0.5rem",
      minWidth: 0,
    }}
    role="region"
    aria-label={`${label}: ${value || "N/A"}`}
  >
    <strong
      style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: "0.95rem",
        fontWeight: 600,
        color: "#374151",
      }}
    >
      {label}:
    </strong>
    <span
      style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: "0.95rem",
        color: "#4b5563",
        lineHeight: "1.5",
        wordBreak: "break-word",
        overflowWrap: "anywhere",
        whiteSpace: "normal",
      }}
    >
      {value || "N/A"}
    </span>
  </div>
));

const Grid = React.memo(({ children }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "1.25rem",
      padding: "0.5rem 0",
    }}
  >
    {children}
  </div>
));

// CSS for Modal Animation and Scrollbar
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(20px); }
  }
  ::-webkit-scrollbar {
    width: 8px;
  }
  ::-webkit-scrollbar-track {
    background: #e6f0fa;
    borderRadius: 10px;
  }
  ::-webkit-scrollbar-thumb {
    background: #2575fc;
    borderRadius: 10px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #6a11cb;
  }
`;

// Inject styles
if (!document.getElementById("view-entry-styles")) {
  const styleSheet = document.createElement("style");
  styleSheet.id = "view-entry-styles";
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

export default ViewEntry;
