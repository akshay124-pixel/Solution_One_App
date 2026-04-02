import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Drawer, Box, Typography, IconButton } from "@mui/material";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import DOMPurify from "dompurify";
import {
  normalizeRole,
  normalizeId,
  fetchUsers,
  filterEntriesByDateRange,
  exportAnalytics,
} from "./sharedUtilities";

const ValueAnalyticsDrawer = ({
  entries,
  isOpen,
  onClose,
  role,
  userId,
  dateRange,
}) => {
  const [valueStats, setValueStats] = useState([]);
  const [totalClosingAmount, setTotalClosingAmount] = useState(0);
  const [monthClosingAmount, setMonthClosingAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cachedUsers, setCachedUsers] = useState(null);

  const normalizedRole = useMemo(() => normalizeRole(role), [role]);

  useEffect(() => {
    if (isOpen && entries && entries.length > 0) {
      // drawer opened
    }
  }, [isOpen, entries?.length, role, userId, dateRange]);

  const calculateValueStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!entries || entries.length === 0) {
        setError("No entries provided to analyze.");
        console.warn("No entries available for analysis");
        return;
      }

      let filteredEntries = filterEntriesByDateRange(entries, dateRange);
      if (normalizedRole === "Others" || normalizedRole === "Salesperson") {
        filteredEntries = filteredEntries.filter((e) => {
          const creatorId = normalizeId(e.createdBy);
          return creatorId === userId;
        });
        if (
          filteredEntries.length === 0 &&
          entries.some((e) => normalizeId(e.createdBy) === userId)
        ) {
          toast.info("No entries in selected date range. Showing all entries.");
          filteredEntries = entries.filter(
            (e) => normalizeId(e.createdBy) === userId
          );
        }
      }

      if (filteredEntries.length === 0) {
        setValueStats([]);
        setTotalClosingAmount(0);
        setMonthClosingAmount(0);
        setError(
          (normalizedRole === "Others" || normalizedRole === "Salesperson")
            ? "No entries found for your user in the selected date range."
            : "No entries available for analysis in the selected date range."
        );
        console.warn("No entries after filtering");
        return;
      }

      let users = cachedUsers || (await fetchUsers(entries, userId, role));
      if (!cachedUsers) setCachedUsers(users);
      const statsMap = {};
      const totals = { totalClose: 0, monthClose: 0 };
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      filteredEntries.forEach((entry) => {
        const creatorId = normalizeId(entry.createdBy);
        let creator = users.find((u) => u._id === creatorId);

        // Fallback: if user not found in fetched list, build from entry's createdBy directly
        if (!creator && creatorId) {
          const creatorUsername = DOMPurify.sanitize(
            (typeof entry.createdBy === "object" ? entry.createdBy?.username : null) ||
            `User_${creatorId.slice(-6)}`
          );
          creator = { _id: creatorId, username: creatorUsername, role: "Others" };
        }

        if (creator) {
          const uId = creator._id;
          if (!statsMap[uId]) {
            let displayName = creator.username;
            if (normalizedRole === "Superadmin" || normalizedRole === "Globaladmin") {
              displayName = `${creator.username} `;
            }
            statsMap[uId] = {
              username: displayName,
              totalClosingAmount: 0,
              monthClosingAmount: 0,
            };
          }

          const closeAmount = parseFloat(entry.closeamount) || 0;
          if (
            entry.closetype === "Closed Won" &&
            !isNaN(closeAmount) &&
            closeAmount >= 0
          ) {
            statsMap[uId].totalClosingAmount += closeAmount;
            totals.totalClose += closeAmount;

            const entryDate = new Date(entry.createdAt);
            if (
              entryDate.getMonth() === currentMonth &&
              entryDate.getFullYear() === currentYear
            ) {
              statsMap[uId].monthClosingAmount += closeAmount;
              totals.monthClose += closeAmount;
            }
          }
        } else {
          console.warn("No user found for entry:", {
            entryId: entry._id,
            creatorId,
          });
        }
      });

      const result = Object.values(statsMap);
      setValueStats(result);
      setTotalClosingAmount(totals.totalClose);
      setMonthClosingAmount(totals.monthClose);

      if (result.length === 0) {
        setError("No matching data found after processing entries.");
        console.warn("No stats generated after processing");
      }
    } catch (err) {
      console.error("calculateValueStats Error:", err.message);
      const friendlyMessage =
        err.message ||
        "Sorry, we couldn't load the analytics. Please try again later.";
      setError(friendlyMessage);
      toast.error(friendlyMessage);
    } finally {
      setLoading(false);
    }
  }, [entries, role, userId, dateRange, normalizedRole, cachedUsers]);

  useEffect(() => {
    if (isOpen) {
      calculateValueStats();
    } else {
      setValueStats([]);
      setTotalClosingAmount(0);
      setMonthClosingAmount(0);
      setError(null);
      setCachedUsers(null);
    }
  }, [isOpen, calculateValueStats]);

  const handleExport = () => {
    const exportData = [
      {
        Section: "Overall Totals",
        Username: "",
        "Total Closing Amount (₹)": totalClosingAmount.toLocaleString("en-IN"),
        "This Month Closing Amount (₹)":
          monthClosingAmount.toLocaleString("en-IN"),
      },
      ...valueStats.map((user) => ({
        Section: "User Statistics",
        Username: user.username,
        "Total Closing Amount (₹)":
          user.totalClosingAmount.toLocaleString("en-IN"),
        "This Month Closing Amount (₹)":
          user.monthClosingAmount.toLocaleString("en-IN"),
      })),
    ];
    exportAnalytics(
      exportData,
      "Value Analytics",
      "value_analytics",
      dateRange
    );
  };

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: "350px",
          background: "linear-gradient(135deg, #2575fc, #6a11cb)",
          color: "white",
          borderRadius: "0 15px 15px 0",
          boxShadow: "2px 0 20px rgba(0, 0, 0, 0.3)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      <Box
        sx={{
          padding: "24px",
          background: "rgba(255, 255, 255, 0.1)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: "700",
            fontSize: "1.5rem",
            letterSpacing: "1px",
            textTransform: "uppercase",
          }}
        >
          Value Analytics
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{ color: "white", "&:hover": { color: "#ff8e53" } }}
          aria-label="Close value analytics drawer"
        >
          <FaTimes size={20} />
        </IconButton>
      </Box>
      <Box sx={{ flex: 1, overflowY: "auto", px: 2, py: 3 }}>
        {loading ? (
          <Typography
            sx={{
              textAlign: "center",
              color: "rgba(255, 255, 255, 0.8)",
              fontSize: "1.1rem",
              fontWeight: "400",
              fontStyle: "italic",
              py: 4,
            }}
          >
            Loading...
          </Typography>
        ) : error ? (
          <Typography
            sx={{
              textAlign: "center",
              color: "rgba(255, 255, 255, 0.8)",
              fontSize: "1.1rem",
              fontWeight: "400",
              fontStyle: "italic",
              py: 4,
            }}
          >
            {error}
          </Typography>
        ) : valueStats.length === 0 ? (
          <Typography
            sx={{
              textAlign: "center",
              color: "rgba(255, 255, 255, 0.8)",
              fontSize: "1.1rem",
              fontWeight: "400",
              fontStyle: "italic",
              py: 4,
            }}
          >
            No Value Data Available
          </Typography>
        ) : (
          <>
            <Box
              sx={{
                background: "rgba(255, 255, 255, 0.08)",
                borderRadius: "10px",
                p: 2,
                mb: 2,
              }}
            >
              <Typography
                sx={{
                  fontSize: "1.2rem",
                  fontWeight: "600",
                  mb: 1.5,
                  textTransform: "uppercase",
                }}
              >
                Overall Totals
              </Typography>
              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr", gap: 1.5 }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.95rem",
                      fontWeight: "500",
                      opacity: 0.9,
                      textTransform: "uppercase",
                    }}
                  >
                    Total Closure:
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "1rem",
                      fontWeight: "700",
                      color: "lightgreen",
                    }}
                  >
                    ₹{totalClosingAmount.toLocaleString("en-IN")}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.95rem",
                      fontWeight: "500",
                      opacity: 0.9,
                      textTransform: "uppercase",
                    }}
                  >
                    This Month Closure:
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "1rem",
                      fontWeight: "700",
                      color: "yellow",
                    }}
                  >
                    ₹{monthClosingAmount.toLocaleString("en-IN")}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Box
              sx={{
                height: "1px",
                background: "rgba(255, 255, 255, 0.2)",
                my: 1,
              }}
            />
            {valueStats.map((user, index) => (
              <Box key={`${user.username}-${index}`}>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  sx={{
                    background: "rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    p: 2,
                    mb: 2,
                    "&:hover": { background: "rgba(255, 255, 255, 0.12)" },
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "1.2rem",
                      fontWeight: "600",
                      mb: 1.5,
                      textTransform: "capitalize",
                    }}
                  >
                    {user.username}
                  </Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr",
                      gap: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.95rem",
                          fontWeight: "500",
                          opacity: 0.9,
                          textTransform: "uppercase",
                        }}
                      >
                        Total Closure:
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "1rem",
                          fontWeight: "700",
                          color: "lightgreen",
                        }}
                      >
                        ₹{user.totalClosingAmount.toLocaleString("en-IN")}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.95rem",
                          fontWeight: "500",
                          opacity: 0.9,
                          textTransform: "uppercase",
                        }}
                      >
                        This Month Closure:
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "1rem",
                          fontWeight: "700",
                          color: "yellow",
                        }}
                      >
                        ₹{user.monthClosingAmount.toLocaleString("en-IN")}
                      </Typography>
                    </Box>
                  </Box>
                </motion.div>
                {index < valueStats.length - 1 && (
                  <Box
                    sx={{
                      height: "1px",
                      background: "rgba(255, 255, 255, 0.2)",
                      my: 1,
                    }}
                  />
                )}
              </Box>
            ))}
          </>
        )}
      </Box>
      <Box sx={{ p: 2, borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleExport}
          style={{
            width: "100%",
            padding: "12px",
            background: "linear-gradient(90deg, #34d399, #10b981)",
            color: "white",
            borderRadius: "8px",
            border: "none",
            fontSize: "1.1rem",
            fontWeight: "600",
            cursor: "pointer",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
          aria-label="Export value analytics"
        >
          <span style={{ fontSize: "1.2rem" }}>⬇️</span> Export Analytics
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onClose}
          style={{
            width: "100%",
            padding: "12px",
            background: "linear-gradient(90deg, #ff6b6b, #ff8e53)",
            color: "white",
            borderRadius: "8px",
            border: "none",
            fontSize: "1.1rem",
            fontWeight: "600",
            cursor: "pointer",
          }}
          aria-label="Close value analytics dashboard"
        >
          Close Dashboard
        </motion.button>
      </Box>
    </Drawer>
  );
};

export default ValueAnalyticsDrawer;
