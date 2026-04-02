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

const AdminDrawer = ({ entries, isOpen, onClose, role, userId, dateRange }) => {
  const [userStats, setUserStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cachedUsers, setCachedUsers] = useState(null);

  const normalizedRole = useMemo(() => normalizeRole(role), [role]);

  useEffect(() => {
    // drawer opened
  }, [isOpen, entries?.length, role, userId, dateRange]);

  const calculateStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!entries || entries.length === 0) {
        setError("No entries provided to analyze.");
        console.warn("No entries available for analysis");
        return;
      }

      let users = cachedUsers || (await fetchUsers(entries, userId, role));
      if (!cachedUsers) setCachedUsers(users);
      let filteredUsers = users;

      if (normalizedRole !== "Superadmin" && normalizedRole !== "Admin" && normalizedRole !== "Globaladmin") {
        filteredUsers = users.filter((user) => user._id === userId);
        if (filteredUsers.length === 0) {
          filteredUsers = [
            { _id: userId, username: "Current User", role: normalizedRole },
          ];
        }
      }
      console.log("Filtered users count:", filteredUsers.length, filteredUsers);

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
        setUserStats([]);
        setError(
          (normalizedRole === "Others" || normalizedRole === "Salesperson")
            ? "No entries found for your user in the selected date range."
            : "No entries available for analysis in the selected date range."
        );
        console.warn("No entries after filtering");
        return;
      }

      const statsMap = {};
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      filteredEntries.forEach((entry) => {
        const creatorId = normalizeId(entry.createdBy);
        let creator = filteredUsers.find((user) => user._id === creatorId);

        // Fallback: if user not found in fetched list, build from entry's createdBy directly
        // This handles cases where the user was deleted or not returned by /api/users
        if (!creator && creatorId) {
          const creatorUsername = DOMPurify.sanitize(
            (typeof entry.createdBy === "object" ? entry.createdBy?.username : null) ||
            `User_${creatorId.slice(-6)}`
          );
          creator = { _id: creatorId, username: creatorUsername, role: "Others" };
        }

        if (creator) {
          if (!statsMap[creatorId]) {
            let displayName = creator.username;
            if (normalizedRole === "Superadmin" || normalizedRole === "Globaladmin") {
              if (creator.role === "Admin")
                displayName = `${creator.username} `;
              else if (creator.role === "Superadmin")
                displayName = `${creator.username} `;
              else if (creator.role === "Others")
                displayName = `${creator.username} `;
            }
            statsMap[creatorId] = {
              _id: creatorId,
              username: displayName,
              allTimeEntries: 0,
              monthEntries: 0,
              cold: 0,
              warm: 0,
              hot: 0,
              closedWon: 0,
              closedLost: 0,
              notFound: 0,
              service: 0,
              not: 0,
            };
          }

          // Count all-time entries
          statsMap[creatorId].allTimeEntries += 1;

          // Calculate monthEntries: 1 for creation + history length if created or updated this month
          const createdAt = new Date(entry.createdAt);
          const updatedAt = new Date(entry.updatedAt);
          const isCreatedThisMonth =
            createdAt.getMonth() === currentMonth &&
            createdAt.getFullYear() === currentYear;
          const isUpdatedThisMonth =
            updatedAt.getMonth() === currentMonth &&
            updatedAt.getFullYear() === currentYear;

          if (isCreatedThisMonth) {
            statsMap[creatorId].monthEntries += 1;
          }
          if ((isCreatedThisMonth || isUpdatedThisMonth) && entry.history) {
            statsMap[creatorId].monthEntries += entry.history.length;
          }

          // Count statuses
          switch (entry.status) {
            case "Not Interested":
              statsMap[creatorId].cold += 1;
              break;
            case "Maybe":
              statsMap[creatorId].warm += 1;
              break;
            case "Interested":
              statsMap[creatorId].hot += 1;
              break;
            case "Closed":
              if (entry.closetype === "Closed Won")
                statsMap[creatorId].closedWon += 1;
              else if (entry.closetype === "Closed Lost")
                statsMap[creatorId].closedLost += 1;
              break;
            case "Not Found":
              statsMap[creatorId].notFound += 1;
              break;
            case "Service":
              statsMap[creatorId].service += 1;
              break;
            case "Not":
              statsMap[creatorId].not += 1;
              break;
            default:
              console.warn("Unknown status in entry:", entry._id, entry.status);
              break;
          }
        } else {
          console.warn("No user found for entry:", {
            entryId: entry._id,
            creatorId,
          });
        }
      });

      const result = Object.values(statsMap);
      setUserStats(result);

      if (result.length === 0) {
        setError(
          "No matching data found after processing entries. Check user IDs or entry data."
        );
        console.warn("No stats generated after processing");
      }
    } catch (err) {
      console.error("calculateStats Error:", err.message);
      setError(err.message || "Failed to calculate analytics.");
      toast.error(err.message || "Failed to calculate analytics.");
    } finally {
      setLoading(false);
    }
  }, [entries, role, userId, dateRange, normalizedRole, cachedUsers]);
  const overallStats = useMemo(
    () =>
      userStats.reduce(
        (acc, user) => ({
          total: acc.total + user.allTimeEntries,
          monthTotal: acc.monthTotal + user.monthEntries,
          cold: acc.cold + user.cold,
          warm: acc.warm + user.warm,
          hot: acc.hot + user.hot,
          closedWon: acc.closedWon + user.closedWon,
          closedLost: acc.closedLost + user.closedLost,
          notFound: acc.notFound + user.notFound,
          service: acc.service + user.service,
          not: acc.not + user.not,
        }),
        {
          total: 0,
          monthTotal: 0,
          cold: 0,
          warm: 0,
          hot: 0,
          closedWon: 0,
          closedLost: 0,
          notFound: 0,
          service: 0,
          not: 0,
        }
      ),
    [userStats]
  );

  useEffect(() => {
    if (isOpen) {
      calculateStats();
    } else {
      setUserStats([]);
      setError(null);
      setCachedUsers(null); // Clear cache when drawer closes
    }
  }, [isOpen, calculateStats]);

  const handleExport = () => {
    const exportData = [
      {
        Section: "Overall Statistics",
        Username: "",
        "Total Entries": overallStats.total,
        "This Month": overallStats.monthTotal,
        "Total Pendings": overallStats.notFound,
        Cold: overallStats.cold,
        Warm: overallStats.warm,
        Hot: overallStats.hot,
        Service: overallStats.service,
        Won: overallStats.closedWon,
        Lost: overallStats.closedLost,
        "Not Connected": overallStats.not,
      },
      ...userStats.map((user) => ({
        Section: "User Statistics",
        Username: user.username,
        "Total Entries": user.allTimeEntries,
        "This Month": user.monthEntries,
        "Total Pendings": user.notFound,
        Cold: user.cold,
        Warm: user.warm,
        Hot: user.hot,
        Service: user.service,
        Won: user.closedWon,
        Lost: user.closedLost,
        "Not Connected": user.not,
      })),
    ];
    exportAnalytics(exportData, "Team Analytics", "team_analytics", dateRange);
  };
  return (
    <Drawer
      anchor="left"
      open={isOpen}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: "350px",
          background: "linear-gradient(135deg, #2575fc, #6a11cb)",
          color: "white",
          borderRadius: "0 20px 20px 0",
          boxShadow: "4px 0 30px rgba(0, 0, 0, 0.4)",
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
        }}
      >
        <Typography
          variant="h5"
          sx={{ fontWeight: "bold", fontSize: "1.6rem" }}
        >
          Team Analytics
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{ color: "white", "&:hover": { color: "#ff8e53" } }}
        >
          <FaTimes fontSize={22} />
        </IconButton>
      </Box>
      <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 4 }}>
        {loading ? (
          <Typography
            sx={{
              textAlign: "center",
              fontStyle: "italic",
              color: "rgba(255, 255, 255, 0.8)",
            }}
          >
            Loading Analytics...
          </Typography>
        ) : error ? (
          <Typography
            sx={{
              textAlign: "center",
              color: "rgba(255, 255, 255, 0.7)",
              padding: "16px",
            }}
          >
            {error}
          </Typography>
        ) : userStats.length === 0 ? (
          <Typography
            sx={{
              textAlign: "center",
              color: "rgba(255, 255, 255, 0.7)",
              padding: "16px",
            }}
          >
            No Team Data Available
          </Typography>
        ) : (
          <>
            <Box sx={{ mb: 4 }}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                sx={{
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "12px",
                  p: 3,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                    textAlign: "center",
                    mb: 2,
                  }}
                >
                  📊 Overall Statistics
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    flexWrap: "wrap",
                    justifyContent: "center",
                  }}
                >
                  {[
                    {
                      label: "Total Entries",
                      value: overallStats.total,
                      color: "orange",
                    },
                    {
                      label: "This Month",
                      value: overallStats.monthTotal,
                      color: "yellow",
                    },
                    {
                      label: "Total Pending",
                      value: overallStats.notFound,
                      color: "lightblue",
                    },
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      sx={{
                        flex: "1 1 120px",
                        background: "rgba(255, 255, 255, 0.1)",
                        borderRadius: "8px",
                        p: 1.5,
                        textAlign: "center",
                      }}
                    >
                      <Typography
                        sx={{ fontSize: "0.9rem", fontWeight: "600" }}
                      >
                        {stat.label}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "1.2rem",
                          fontWeight: "bold",
                          color: stat.color,
                        }}
                      >
                        {stat.value}
                      </Typography>
                    </motion.div>
                  ))}
                </Box>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 2,
                    mt: 2,
                  }}
                >
                  {[
                    {
                      label: "Cold",
                      value: overallStats.cold,
                      color: "orange",
                    },
                    {
                      label: "Warm",
                      value: overallStats.warm,
                      color: "lightgreen",
                    },
                    { label: "Hot", value: overallStats.hot, color: "yellow" },
                    {
                      label: "Service",
                      value: overallStats.service,
                      color: "cyan",
                    },
                    { label: "Not", value: overallStats.not, color: "purple" },
                    {
                      label: "Won",
                      value: overallStats.closedWon,
                      color: "lightgrey",
                    },
                    {
                      label: "Lost",
                      value: overallStats.closedLost,
                      color: "#e91e63",
                    },
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: (index + 3) * 0.1 }}
                      sx={{
                        background: "rgba(255, 255, 255, 0.1)",
                        borderRadius: "8px",
                        p: 1,
                        textAlign: "center",
                      }}
                    >
                      <Typography
                        sx={{ fontSize: "0.8rem", fontWeight: "600" }}
                      >
                        {stat.label}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "1rem",
                          fontWeight: "bold",
                          color: stat.color,
                        }}
                      >
                        {stat.value}
                      </Typography>
                    </motion.div>
                  ))}
                </Box>
              </motion.div>
            </Box>
            {userStats.map((user) => (
              <Box key={user._id} sx={{ mb: 3 }}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  sx={{
                    background: "rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    p: 2,
                  }}
                >
                  <Typography
                    sx={{ fontSize: "1.3rem", fontWeight: "600", mb: 1 }}
                  >
                    {user.username}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 3, mb: 2 }}>
                    <Typography sx={{ color: "lightgreen" }}>
                      Total: {user.allTimeEntries}
                    </Typography>
                    <Typography sx={{ color: "yellow" }}>
                      This Month: {user.monthEntries}
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    {[
                      {
                        label: "Total Pending",
                        value: user.notFound,
                        color: "lightblue",
                      },
                      { label: "Cold", value: user.cold, color: "orange" },
                      { label: "Warm", value: user.warm, color: "lightgreen" },
                      { label: "Hot", value: user.hot, color: "yellow" },

                      {
                        label: "Won",
                        value: user.closedWon,
                        color: "lightgrey",
                      },
                      {
                        label: "Lost",
                        value: user.closedLost,
                        color: "#e91e63",
                      },
                      { label: "Service", value: user.service, color: "cyan" },
                      {
                        label: "Not Connected",
                        value: user.not,
                        color: "purple",
                      },
                    ].map((stat) => (
                      <Box
                        key={stat.label}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "rgba(255, 255, 255, 0.05)",
                          borderRadius: "5px",
                          px: 2,
                          py: 0.5,
                        }}
                      >
                        <Typography
                          sx={{ fontSize: "0.8rem", fontWeight: "500" }}
                        >
                          {stat.label}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.9rem",
                            fontWeight: "600",
                            color: stat.color,
                          }}
                        >
                          {stat.value}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </motion.div>
              </Box>
            ))}
          </>
        )}
      </Box>
      <Box
        sx={{
          p: 3,
          borderTop: "1px solid rgba(255, 255, 255, 0.2)",
          background: "rgba(255, 255, 255, 0.05)",
        }}
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleExport}
          style={{
            width: "100%",
            padding: "12px",
            background: "linear-gradient(90deg, #34d399, #10b981)",
            color: "#ffffff",
            borderRadius: "6px",
            border: "none",
            fontSize: "1rem",
            fontWeight: "600",
            cursor: "pointer",
            marginBottom: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>⬇️</span> Export Analytics
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          style={{
            width: "100%",
            padding: "12px",
            background: "linear-gradient(90deg, #ff6b6b, #ff8e53)",
            color: "#ffffff",
            borderRadius: "6px",
            border: "none",
            fontSize: "1rem",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Close
        </motion.button>
      </Box>
    </Drawer>
  );
};

export default AdminDrawer;
