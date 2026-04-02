import api from "../../api/api";
import DOMPurify from "dompurify";
import { toast } from "react-toastify";
import { exportToExcel } from "../../../utils/excelHelper";

const normalizeRole = (role) => {
  if (!role) return "Others";
  const r = role.toLowerCase();
  return r.charAt(0).toUpperCase() + r.slice(1);
};

const normalizeId = (id) => {
  if (!id) return null;
  if (typeof id === "string") return id;
  if (id._id) return id._id.toString();
  if (id.$oid) return id.$oid.toString();
  return null;
};

// NOTE: No module-level cache — caching is handled per-component via React state (cachedUsers)
// A module-level cache caused stale data when switching roles/users between sessions.

const fetchUsers = async (entries, userId, role) => {
  try {
    // Using api instance for automatic token handling and refresh
    const response = await api.get("/api/users");

    let users = Array.isArray(response.data.data) ? response.data.data : [];

    users = users
      .map((user) => ({
        _id: normalizeId(user._id),
        username: DOMPurify.sanitize(user.username || "Unknown"),
        role: normalizeRole(user.role),
      }))
      .filter((user) => user._id);

    // Fallback: build user list from entries if API returned nothing
    if (users.length === 0) {
      console.warn("No users from API, using fallback from entries");
      const userMap = new Map();
      entries.forEach((entry) => {
        const creator = entry.createdBy || {};
        const creatorId = normalizeId(creator);
        const username = DOMPurify.sanitize(
          creator.username || `User_${creatorId || "Unknown"}`
        );
        if (creatorId) {
          userMap.set(creatorId, { _id: creatorId, username, role: "Others" });
        }
      });
      users = Array.from(userMap.values());
    }

    // Always ensure the current user is in the list
    if (userId && !users.some((user) => user._id === userId)) {
      users.push({
        _id: userId,
        username: "Current User",
        role: normalizeRole(role),
      });
    }

    return users;
  } catch (err) {
    console.error("fetchUsers Error:", err.message);
    toast.error(
      err.message ||
        "Oops! Couldn't load user information. Please try again or contact support."
    );
    // Last-resort fallback: extract users directly from entries
    const userMap = new Map();
    (entries || []).forEach((entry) => {
      const creator = entry.createdBy || {};
      const creatorId = normalizeId(creator);
      const username = DOMPurify.sanitize(creator.username || `User_${creatorId || "Unknown"}`);
      if (creatorId) userMap.set(creatorId, { _id: creatorId, username, role: "Others" });
    });
    if (userId && !userMap.has(userId)) {
      userMap.set(userId, { _id: userId, username: "Current User", role: normalizeRole(role) });
    }
    return Array.from(userMap.values());
  }
};
const filterEntriesByDateRange = (entries, dateRange) => {
  if (!dateRange?.[0]?.startDate || !dateRange?.[0]?.endDate) return entries;
  const filtered = entries.filter((entry) => {
    const createdAt = new Date(entry.createdAt);
    if (isNaN(createdAt.getTime())) {
      console.warn("Invalid createdAt in entry:", entry._id);
      return false;
    }
    const startDate = new Date(dateRange[0].startDate);
    const endDate = new Date(dateRange[0].endDate);
    return createdAt >= startDate && createdAt <= endDate;
  });
  return filtered;
};

const exportAnalytics = async (data, sheetName, filePrefix, dateRange) => {
  try {
    const colWidths = Object.fromEntries(
      Object.keys(data[0]).map((key) => [key, Math.min(Math.max(key.length, 15) + 2, 50)])
    );
    const dateStr = dateRange?.[0]?.startDate
      ? `${new Date(dateRange[0].startDate).toISOString().slice(0, 10)}_to_${new Date(dateRange[0].endDate).toISOString().slice(0, 10)}`
      : new Date().toISOString().slice(0, 10);
    await exportToExcel(data, sheetName, `${filePrefix}_${dateStr}.xlsx`, colWidths);
    toast.success(`${sheetName} exported successfully!`);
  } catch (error) {
    console.error(`Error exporting ${sheetName}:`, error);
    toast.error(`Failed to export ${sheetName}!`);
  }
};

export {
  normalizeRole,
  normalizeId,
  fetchUsers,
  filterEntriesByDateRange,
  exportAnalytics,
};
