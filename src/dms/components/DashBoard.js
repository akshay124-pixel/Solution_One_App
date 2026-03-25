import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { Button, Modal } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "../App.css";
import {
  FaEye,
  FaUpload,
  FaPlus,
  FaFileExport,
  FaChartBar,
  FaPhoneAlt, FaProjectDiagram, FaCalendarAlt, FaHistory
} from "react-icons/fa";
import { jwtDecode } from "jwt-decode";
import { DateRangePicker } from "react-date-range";
import { enUS } from "date-fns/locale";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { Popover } from "@mui/material";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import DisableCopy from "./DisableCopy";
import AddEntry from "./AddEntry";
import EditEntry from "./EditEntry";
import DeleteModal from "./Delete";
import ViewEntry from "./ViewEntry";
import ClickToCallButton from "./Dialer/ClickToCallButton";
import MailOptionsModal from "./MailOptionsModal";
import { AutoSizer, List } from "react-virtualized";
import debounce from "lodash/debounce";
import ValueAnalyticsDrawer from "./Analytics/ValueAnalyticsDrawer";
import AdminDrawer from "./Analytics/AdminDrawer";
import { statesAndCities } from "./Options";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Divider,
  Chip,
  TablePagination,
} from "@mui/material";
import { normalizeId } from "./Analytics/sharedUtilities";
import { motion } from "framer-motion";
import api, { getAuthData, logout, setNavigationFunction, clearNavigationFunction } from "../api/api";

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
};



// Separate Call Tracking Dashboard Component
const CallTrackingDashboard = ({
  statusCounts,
  closeTypeCounts,
  onFilterClick,
  selectedCategory,
}) => {
  const callStats = useMemo(() => {
    return {
      cold: statusCounts["Not Interested"] || 0,
      warm: statusCounts["Maybe"] || 0,
      hot: statusCounts["Interested"] || 0,
      closedWon: closeTypeCounts["Closed Won"] || 0,
      closedLost: closeTypeCounts["Closed Lost"] || 0,
      Not: statusCounts["Not"] || 0,
      Service: statusCounts["Service"] || 0,
      total: 0, // Not used in display
    };
  }, [statusCounts, closeTypeCounts]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Box sx={{ mb: { xs: 1, sm: 2 } }}>
        <Divider sx={{ mb: { xs: 1, sm: 2 } }} />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr", // 1 column on mobile
              sm: "repeat(auto-fit, minmax(200px, 1fr))", // 2-3 columns on tablet
              md: "repeat(auto-fit, minmax(160px, 1fr))", // 4-7 columns on desktop
            },
            gap: { xs: 1, sm: 2 },
            justifyItems: "center", // Center cards horizontally
            px: { xs: 1, sm: 0 }, // Add padding on mobile to avoid edge clipping
          }}
        >
          {[
            {
              title: "Hot Calls",
              value: callStats.hot,
              label: "Interested",
              color: "#00897b",
              bg: "#e0f2f1",
              border: "#00695c",
              category: "Interested",
              chipBg: "#26a69a",
            },
            {
              title: "Warm Calls",
              value: callStats.warm,
              label: "Maybe",
              color: "#ef6c00",
              bg: "#fff8e1",
              border: "#e65100",
              category: "Maybe",
              chipBg: "#fb8c00",
            },
            {
              title: "Cold Calls",
              value: callStats.cold,
              label: "Not Interested",
              color: "#00838f",
              bg: "#e0f7fa",
              border: "#006064",
              category: "Not Interested",
              chipBg: "#00acc1",
            },
            {
              title: "No Response",
              value: callStats.Not,
              label: "Not Connected",
              color: "#d32f2f",
              bg: "#ffebee",
              border: "#c62828",
              category: "Not",
              chipBg: "#ef5350",
            },
            {
              title: "Service Calls",
              value: callStats.Service,
              label: "Service Calls",
              color: "#1976d2",
              bg: "#e3f2fd",
              border: "#1565c0",
              category: "Service",
              chipBg: "#1e88e5",
            },
            {
              title: "Closed Won",
              value: callStats.closedWon,
              label: "Closed Won",
              color: "#388e3c",
              bg: "#e8f5e9",
              border: "#2e7d32",
              category: "Closed Won",
              chipBg: "#4caf50",
            },
            {
              title: "Closed Lost",
              value: callStats.closedLost,
              label: "Closed Lost",
              color: "#7b1fa2",
              bg: "#f3e5f5",
              border: "#6a1b9a",
              category: "Closed Lost",
              chipBg: "#ab47bc",
            },
          ].map((item, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
              style={{
                width: "100%",
                maxWidth: { xs: "300px", sm: "none" }, // Cap card width on mobile
              }}
            >
              <Card
                sx={{
                  backgroundColor: item.bg,
                  boxShadow: 2,
                  border:
                    selectedCategory === item.category
                      ? `2px solid ${item.border}`
                      : "none",
                  padding: { xs: 1, sm: 2 },
                  minHeight: { xs: "120px", sm: "160px" },
                  width: "100%",
                }}
                onClick={() => onFilterClick(item.category)}
              >
                <CardContent sx={{ padding: { xs: "8px !important", sm: "16px !important" } }}>
                  <Typography
                    variant="subtitle1"
                    color="textSecondary"
                    sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
                  >
                    {item.title}
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: "bold",
                      color: item.color,
                      fontSize: { xs: "1.5rem", sm: "2rem" },
                    }}
                  >
                    {item.value}
                  </Typography>
                  <Chip
                    label={item.label}
                    size="medium"
                    sx={{
                      mt: { xs: 1, sm: 2 },
                      backgroundColor: item.chipBg,
                      color: "#fff",
                      fontSize: { xs: "0.75rem", sm: "0.8125rem" },
                      height: { xs: "24px", sm: "32px" },
                    }}
                  />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </Box>
      </Box>
    </motion.div>
  );
};

// Main Dashboard Component
function DashBoard() {
  const isMobile = useIsMobile();
  const [showDetails, setShowDetails] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [loading, setLoading] = useState(true); // Initial page load only
  const [tableLoading, setTableLoading] = useState(false); // Table-only loading
  const [entries, setEntries] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState(null);
  const [itemIdToDelete, setItemIdToDelete] = useState(null);
  const [itemIdsToDelete, setItemIdsToDelete] = useState([]);
  const [selectedStateA, setSelectedStateA] = useState("");
  const [selectedCityA, setSelectedCityA] = useState("");
  const [selectedCreatedBy, setSelectedCreatedBy] = useState("");
  const [role, setRole] = useState(localStorage.getItem("dmsRole") || localStorage.getItem("role") || "salesperson");
  const [userId, setUserId] = useState(localStorage.getItem("dmsUserId") || localStorage.getItem("userId") || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [isValueAnalyticsOpen, setIsValueAnalyticsOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  // New states to prevent drawer flicker during loading
  const [isValueAnalyticsReady, setIsValueAnalyticsReady] = useState(false);
  const [isAnalyticsReady, setIsAnalyticsReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [doubleClickInitiated, setDoubleClickInitiated] = useState(false);
  const [dashboardFilter, setDashboardFilter] = useState("total");
  const [selectedOrganization, setSelectedOrganization] = useState("");
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [selectedEntryForMail, setSelectedEntryForMail] = useState(null);
  const [dateRange, setDateRange] = useState([
    {
      startDate: null,
      endDate: null,
      key: "selection",
    },
  ]);
  const [listKey, setListKey] = useState(Date.now());
  const listRef = useRef(null);

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalEntries, setTotalEntries] = useState(0);

  // Full dataset for analytics (not paginated)
  const [allEntries, setAllEntries] = useState([]);
  const [loadingAllEntries, setLoadingAllEntries] = useState(false);

  // All users for username dropdown (never filtered)
  const [allUsers, setAllUsers] = useState([]);

  // Tracker counts state (from count-only API - ALWAYS unfiltered totals)
  const [trackerCounts, setTrackerCounts] = useState({
    totalLeads: 0,
    totalResults: 0,
    monthlyCalls: 0,
    statusCounts: {},
    closeTypeCounts: {},
  });

  const callStats = useMemo(() => {
    const stats = {
      cold: 0,
      warm: 0,
      hot: 0,
      Not: 0,
      Service: 0,
      closedWon: 0,
      closedLost: 0,
      total: entries.length,
    };

    entries.forEach((entry) => {
      switch (entry.status) {
        case "Not Interested":
          stats.cold += 1;
          break;
        case "Maybe":
          stats.warm += 1;
          break;
        case "Interested":
          stats.hot += 1;
          break;
        case "Not":
          stats.Not += 1;
          break;
        case "Service":
          stats.Service += 1;
          break;
        case "Closed":
          stats.closedWon += 1;
          break;

        default:
          break;
      }
      switch (entry.closetype) {
        case "Closed Won":
          stats.closedWon += 1;
          break;
        case "Closed Lost":
          stats.closedLost += 1;
          break;
        default:
          break;
      }
    });

    stats.total =
      stats.total -
      (stats.cold +
        stats.warm +
        stats.hot +
        stats.Not +
        stats.Service +
        stats.closedWon +
        stats.closedLost);

    return stats;
  }, [entries]);
  const navigate = useNavigate();

  // Set navigation function for API interceptors
  useEffect(() => {
    setNavigationFunction(navigate);
    return () => {
      clearNavigationFunction();
    };
  }, [navigate]);

  const handleClosed = () => setShowDetails(false);

  const debouncedSearchChange = useMemo(
    () => debounce((value) => {
      setSearchTerm(value);
      setPage(0);
    }, 300),
    []
  );

  // Filtering is now done on the backend, so we don't need client-side filtering

  // filteredData uses paginated entries (date range already applied client-side in fetchEntries)
  const filteredData = useMemo(() => {
    return entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [entries]);

  // Filtered all entries for analytics (with date range applied client-side)
  const filteredAllEntries = useMemo(() => {
    let filtered = allEntries;

    // Apply date range filter client-side - FIXED: Only filter by createdAt to prevent previous month entries
    if (dateRange[0]?.startDate && dateRange[0]?.endDate) {
      const start = new Date(dateRange[0].startDate);
      const end = new Date(dateRange[0].endDate);
      end.setHours(23, 59, 59, 999);

      filtered = filtered.filter((row) => {
        const createdAt = new Date(row.createdAt);
        return (createdAt >= start && createdAt <= end);
      });
    }

    return filtered;
  }, [allEntries, dateRange]);

  const handleCounterClick = (filterType) => {
    setDashboardFilter(filterType);
    setPage(0); // Reset to first page when filter changes
    setListKey(Date.now());
    if (listRef.current) {
      listRef.current.scrollToPosition(0);
      listRef.current.recomputeRowHeights();
      listRef.current.forceUpdateGrid();
    }
  };

  // monthlyCalls now comes from trackerCounts API
  const monthlyCalls = trackerCounts.monthlyCalls;
  const handleSearchChange = (e) => {
    debouncedSearchChange(e.target.value);
    setPage(0); // Reset to first page on search
  };

  const handleCreatedByChange = (e) => {
    setSelectedCreatedBy(e.target.value);
    setPage(0);
  };

  const handleOrganizationChange = (e) => {
    setSelectedOrganization(e.target.value);
    setPage(0);
  };

  const handleStateChangeA = (e) => {
    const state = e.target.value;
    setSelectedStateA(state);
    setSelectedCityA("");
    setPage(0);
  };

  const handleCityChangeA = (e) => {
    setSelectedCityA(e.target.value);
    setPage(0);
  };

  const handleDashboardFilterClick = (category) => {
    setDashboardFilter(category);
    setPage(0);
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleReset = () => {
    setSearchTerm("");
    setSelectedOrganization("");
    setSelectedStateA("");
    setSelectedCityA("");
    setSelectedEntries([]);
    setIsSelectionMode(false);
    setDoubleClickInitiated(false);
    setDashboardFilter("total");
    setSelectedCreatedBy("");
    setDateRange([
      {
        startDate: null,
        endDate: null,
        key: "selection",
      },
    ]);
    setPage(0);
    setListKey(Date.now());
    if (listRef.current) {
      listRef.current.recomputeRowHeights();
      listRef.current.forceUpdateGrid();
    }
  };

  const [anchorEl, setAnchorEl] = useState(null);
  // Use allUsers for username filter dropdown - always shows all users, never filtered
  // Create a deduped, case-insensitive sorted list of usernames for the dropdown
  const uniqueCreatedBy = useMemo(() => {
    const names = allUsers.map((user) => user.username).filter(Boolean).map(n => n.trim());
    const unique = Array.from(new Set(names));
    unique.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return unique;
  }, [allUsers]);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  // Fetch ALL entries with filters (for analytics drawers ONLY - optimized to fetch only when needed)
  // Note: Username dropdown now uses allUsers, not this
  // OPTIMIZATION: This should only be called when analytics drawer is opened, not on every filter change
  const fetchAllEntries = useCallback(async () => {
    setLoadingAllEntries(true);
    try {
      const params = new URLSearchParams();

      // Apply filters (but NOT date range - that will be client-side)
      // Apply username filter to full dataset
      if (selectedCreatedBy) params.append("selectedCreatedBy", selectedCreatedBy);
      if (selectedOrganization) params.append("selectedOrganization", selectedOrganization);
      if (selectedStateA) params.append("selectedStateA", selectedStateA);
      if (selectedCityA) params.append("selectedCityA", selectedCityA);
      if (searchTerm) params.append("searchTerm", searchTerm);
      // Don't send date range to backend - will filter client-side like before
      // Don't send dashboardFilter - analytics need all data

      const response = await api.get(`/api/fetch-all-entries?${params.toString()}`);

      if (response.data.success && Array.isArray(response.data.data)) {
        setAllEntries(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching all entries:", error);
      toast.error("Failed to load analytics data. Please try again.");
      setAllEntries([]);
    } finally {
      setLoadingAllEntries(false);
    }
  }, [searchTerm, selectedOrganization, selectedStateA, selectedCityA, selectedCreatedBy]);

  // Fetch all users for username dropdown (only once, never filtered)
  const fetchAllUsers = useCallback(async () => {
    try {
      const response = await api.get("/api/users");
      if (response.data.success && Array.isArray(response.data.data)) {
        setAllUsers(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setAllUsers([]);
    }
  }, []);

  // Fetch entry counts for trackers (optimized count-only query)
  // IMPORTANT: Do NOT pass dashboardFilter - tracker cards should show stable counts
  // Total Results will be calculated client-side based on dashboardFilter
  const fetchEntryCounts = useCallback(async () => {
    try {
      const params = new URLSearchParams();

      // Apply all filters to counts: date range, search, organization, state, city, user
      // BUT NOT dashboardFilter - tracker cards must show stable counts
      if (searchTerm) params.append("searchTerm", searchTerm);
      if (selectedOrganization) params.append("selectedOrganization", selectedOrganization);
      if (selectedStateA) params.append("selectedStateA", selectedStateA);
      if (selectedCityA) params.append("selectedCityA", selectedCityA);
      if (selectedCreatedBy) params.append("selectedCreatedBy", selectedCreatedBy);
      // Apply date range filter to counts
      if (dateRange[0]?.startDate && dateRange[0]?.endDate) {
        // TIMEZONE FIX: Use local date formatting instead of UTC
        const formatLocalDate = (date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        params.append("startDate", formatLocalDate(dateRange[0].startDate));
        params.append("endDate", formatLocalDate(dateRange[0].endDate));
      }
      // DO NOT pass dashboardFilter - tracker cards should always show stable counts

      const response = await api.get(`/api/entry-counts?${params.toString()}`);

      if (response.data.success) {
        setTrackerCounts({
          totalLeads: response.data.data.totalLeads || 0,
          totalResults: response.data.data.totalResults || 0, // Base total (will be computed for display)
          monthlyCalls: response.data.data.monthlyCalls || 0,
          statusCounts: response.data.data.statusCounts || {},
          closeTypeCounts: response.data.data.closeTypeCounts || {},
        });
      }
    } catch (error) {
      console.error("Error fetching entry counts:", error);
      // Don't show error toast for counts, just log it
    }
  }, [searchTerm, selectedOrganization, selectedStateA, selectedCityA, selectedCreatedBy, dateRange]);

  // Fetch entries with pagination
  // This uses tableLoading instead of loading to prevent full page refresh
  const fetchEntries = useCallback(async (isSilent = false) => {
    if (!isSilent) setTableLoading(true);
    try {
      const { accessToken } = getAuthData();
      if (!accessToken) throw new Error("No token found");

      const params = new URLSearchParams();
      params.append("page", (page + 1).toString());
      params.append("limit", rowsPerPage.toString());

      // Apply all filters including date range (for correct pagination count)
      if (searchTerm) params.append("searchTerm", searchTerm);
      if (selectedOrganization) params.append("selectedOrganization", selectedOrganization);
      if (selectedStateA) params.append("selectedStateA", selectedStateA);
      if (selectedCityA) params.append("selectedCityA", selectedCityA);
      if (selectedCreatedBy) params.append("selectedCreatedBy", selectedCreatedBy);
      // Send date range to backend for correct pagination (only if both dates are set)
      if (dateRange[0]?.startDate && dateRange[0]?.endDate) {
        // TIMEZONE FIX: Use local date formatting instead of UTC
        const formatLocalDate = (date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        params.append("startDate", formatLocalDate(dateRange[0].startDate));
        params.append("endDate", formatLocalDate(dateRange[0].endDate));
      }
      if (dashboardFilter && dashboardFilter !== "total" && dashboardFilter !== "results") {
        params.append("dashboardFilter", dashboardFilter);
      }

      const response = await api.get(`/api/fetch-entry?${params.toString()}`);

      if (!Array.isArray(response.data.data)) {
        console.error("Invalid entries data:", response.data);
        toast.error("Invalid data received from server.");
        setEntries([]);
        setTotalEntries(0);
        return;
      }

      // Data is already filtered by backend, so use directly
      setEntries(response.data.data);
      setTotalEntries(response.data.pagination?.total || 0);
    } catch (error) {
      console.error("Error fetching data:", {
        message: error.message,
        response: error.response?.data,
      });
      const friendlyMessage =
        error.response?.data?.message ||
        "Sorry, we couldn't load the entries right now. Please check your internet connection or try again later.";
      toast.error(friendlyMessage);
      setEntries([]);
      setTotalEntries(0);
    } finally {
      setTableLoading(false);
      setListKey(Date.now());
      if (listRef.current) {
        listRef.current.recomputeRowHeights();
        listRef.current.forceUpdateGrid();
      }
    }
  }, [page, rowsPerPage, searchTerm, selectedOrganization, selectedStateA, selectedCityA, selectedCreatedBy, dateRange, dashboardFilter]);

  const fetchAdmin = useCallback(async () => {
    setAuthLoading(true);
    try {
      const { accessToken } = getAuthData();
      if (!accessToken) {
        setIsAdmin(false);
        setIsSuperadmin(false);
        setRole("Others");
        setUserId("");
        toast.error("Please log in to continue.");
        navigate("/login");
        return;
      }

      const decoded = jwtDecode(accessToken);
      // Use dmsId when present (superadmin/admin have a real DMS User doc)
      const decodedUserId = decoded.dmsId || decoded.id;
      // Use dmsRole from localStorage (set by syncLocalStorage) — already DMS-style
      const dmsRole = localStorage.getItem("dmsRole") || decoded.role || "salesperson";

      const response = await api.get("/api/user-role");

      setIsAdmin(response.data.isAdmin || false);
      setIsSuperadmin(response.data.isSuperadmin || false);
      setRole(dmsRole);
      setUserId(decodedUserId);

      if (process.env.NODE_ENV === 'development') {
        console.log("Fetched user info:", { role: dmsRole });
      }
      // Write DMS-specific keys only — do NOT overwrite "role"/"userId" (used by SO)
      localStorage.setItem("dmsUserId", decodedUserId);
      localStorage.setItem("dmsRole", dmsRole);
    } catch (error) {
      console.error("Error fetching admin status:", error.message);
      setIsAdmin(false);
      setIsSuperadmin(false);
      setRole("salesperson");
      setUserId("");
      toast.error(
        "Your session has expired or there was a problem. Please log in again to continue."
      );
      navigate("/login");
    } finally {
      setAuthLoading(false);
    }
  }, [navigate]);

  // Initial data fetch (only on mount)
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      await fetchAdmin();
      if (isMounted) {
        // Fetch initial data - OPTIMIZATION: Don't fetch all entries on mount
        // Only fetch when analytics drawer is opened (prevents 17MB payload on initial load)
        await Promise.all([
          fetchEntries(),
          fetchEntryCounts(),
          fetchAllUsers()
        ]);
        setLoading(false); // Initial page load complete
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - functions are stable with useCallback

  // Refetch entries when pagination or filters change (but not on initial mount)
  // Consolidate all filter changes including date range
  useEffect(() => {
    if (!loading) { // Don't fetch if still on initial load
      // Only fetch if date range is complete (both dates set) or both cleared (not set)
      const hasStartDate = dateRange[0]?.startDate;
      const hasEndDate = dateRange[0]?.endDate;
      // Fetch if: (both dates are set) OR (both dates are not set/cleared)
      if ((hasStartDate && hasEndDate) || (!hasStartDate && !hasEndDate)) {
        fetchEntries();
      }
      // Don't fetch if only one date is set (waiting for user to select the other)
    }
  }, [page, rowsPerPage, searchTerm, selectedOrganization, selectedStateA, selectedCityA, selectedCreatedBy, dashboardFilter, dateRange, loading, fetchEntries]);

  // Refetch counts when filters change (but NOT dashboardFilter - tracker cards stay stable)
  // Total Results will be computed client-side based on dashboardFilter
  useEffect(() => {
    if (!loading) {
      // Only fetch counts if date range is complete or both cleared
      const hasStartDate = dateRange[0]?.startDate;
      const hasEndDate = dateRange[0]?.endDate;
      if ((hasStartDate && hasEndDate) || (!hasStartDate && !hasEndDate)) {
        fetchEntryCounts();
      }
    }
  }, [searchTerm, selectedOrganization, selectedStateA, selectedCityA, selectedCreatedBy, dateRange, loading, fetchEntryCounts]);

  // Calculate Total Results based on dashboardFilter (computed client-side)
  // This allows tracker cards to stay stable while Total Results fluctuates
  const computedTotalResults = useMemo(() => {
    if (!dashboardFilter || dashboardFilter === "total" || dashboardFilter === "results") {
      // No tracker selected or "total"/"results" selected - show base total
      return trackerCounts.totalResults;
    }

    // Calculate based on selected tracker
    if (dashboardFilter === "leads") {
      return trackerCounts.totalLeads;
    } else if (dashboardFilter === "Closed Won") {
      return trackerCounts.closeTypeCounts["Closed Won"] || 0;
    } else if (dashboardFilter === "Closed Lost") {
      return trackerCounts.closeTypeCounts["Closed Lost"] || 0;
    } else {
      // Status-based tracker (Interested, Maybe, Not Interested, etc.)
      return trackerCounts.statusCounts[dashboardFilter] || 0;
    }
  }, [dashboardFilter, trackerCounts]);

  // OPTIMIZATION: Only fetch all entries when analytics drawer is opened
  // This prevents the 17MB payload from being fetched on every filter change
  // Show toast notification when analytics is loading
  useEffect(() => {
    if (!loading && (isAnalyticsOpen || isValueAnalyticsOpen)) {
      // Reset ready states when starting to load
      if (isAnalyticsOpen) setIsAnalyticsReady(false);
      if (isValueAnalyticsOpen) setIsValueAnalyticsReady(false);

      // Show non-blocking toast notification for analytics loading
      const toastId = toast.info("Updating analytics, please wait...", {
        autoClose: 3000,
        hideProgressBar: false,
      });

      // Only fetch when analytics drawer is actually open
      fetchAllEntries().finally(() => {
        // Set ready states after data is loaded
        if (isAnalyticsOpen) setIsAnalyticsReady(true);
        if (isValueAnalyticsOpen) setIsValueAnalyticsReady(true);

        toast.dismiss(toastId);
        toast.success("Analytics updated successfully", { autoClose: 2000 });
      });
    }
  }, [isAnalyticsOpen, isValueAnalyticsOpen, searchTerm, selectedOrganization, selectedStateA, selectedCityA, selectedCreatedBy, loading, fetchAllEntries]);

  useEffect(() => {
    return () => {
      debouncedSearchChange.cancel();
    };
  }, [debouncedSearchChange]);

  const handleShowDetails = useCallback((entry) => {
    setSelectedEntry(entry);
    setShowDetails(true);
  }, []);

  const handleEdit = useCallback((entry) => {
    setEntryToEdit(entry);
    setEditModalOpen(true);
  }, []);

  const handleDeleteClick = useCallback((id) => {
    setItemIdToDelete(id);
    setItemIdsToDelete([]);
    setIsDeleteModalOpen(true);
  }, []);

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setItemIdToDelete(null);
    setItemIdsToDelete([]);
  };

  const handleDelete = useCallback((deletedIds) => {
    // 1. Optimistic Update - Remove deleted items immediately
    // Use functional update to ensure we work with latest state if rapid deletes happen
    // However, for complex logic below we use the dependencies 'entries'
    const nextEntries = entries.filter((entry) => !deletedIds.includes(entry._id));
    setEntries(nextEntries);

    setSelectedEntry((prev) =>
      prev && deletedIds.includes(prev._id) ? null : prev
    );
    setSelectedEntries((prev) => prev.filter((id) => !deletedIds.includes(id)));

    // 2. Update Total Count (Optimistic)
    const totalDeleted = deletedIds.length;
    const nextTotalEntries = Math.max(0, totalEntries - totalDeleted);
    setTotalEntries(nextTotalEntries);

    // 3. Smart Pagination & Refill Logic (Unified Data Controller)
    // Calculate validity of current page
    const nextMaxPage = nextTotalEntries > 0 ? Math.ceil(nextTotalEntries / rowsPerPage) - 1 : 0;
    const targetPage = Math.min(page, nextMaxPage);
    const targetPageSafe = Math.max(0, targetPage);

    if (targetPageSafe !== page) {
      // Case A: Current page became invalid (e.g. deleted all items on last page)
      // Action: Move to previous valid page.
      // This will trigger the main useEffect which calls fetchEntries() (with loading spinner)
      setPage(targetPageSafe);
    } else {
      // Case B: Current page is still valid (e.g. partial delete or not last page)
      // Action: Refill the page to maintain pageSize (Seamless Auto-fill)
      // We call fetchEntries silently so the user sees the remaining items while new ones load
      if (totalDeleted > 0 && nextTotalEntries > 0) {
        fetchEntries(true);
      }
    }

    // REAL-TIME UPDATE: Refresh tracker counts immediately after deleting entries
    fetchEntryCounts();
    if (process.env.NODE_ENV === 'development') {
      console.log("🔄 REAL-TIME: Refreshed tracker counts after entries deleted");
    }

    setListKey(Date.now());
    if (listRef.current) {
      listRef.current.recomputeRowHeights();
      listRef.current.forceUpdateGrid();
    }
  }, [entries, page, rowsPerPage, totalEntries, fetchEntries, fetchEntryCounts]);

  const handleEntryAdded = useCallback((newEntry) => {
    // Backend now returns complete populated entry, use it directly
    // Only add default values for fields that might be missing
    const completeEntry = {
      ...newEntry,
      _id: newEntry._id || Date.now().toString(),
      customerName: newEntry.customerName || "",
      contactName: newEntry.contactName || "",
      mobileNumber: newEntry.mobileNumber || "",
      product: newEntry.product || "",
      address: newEntry.address || "",
      state: newEntry.state || "",
      city: newEntry.city || "",
      organization: newEntry.organization || "",
      category: newEntry.category || "",
      createdAt: newEntry.createdAt || new Date().toISOString(),
      updatedAt: newEntry.updatedAt || new Date().toISOString(),
      status: newEntry.status || "Not Found",
      expectedClosingDate: newEntry.expectedClosingDate || "",
      followUpDate: newEntry.followUpDate || "",
      remarks: newEntry.remarks || "",
      email: newEntry.email || "",
      AlterNumber: newEntry.AlterNumber || "",
      // Use populated createdBy from backend response
      createdBy: newEntry.createdBy || {
        _id: localStorage.getItem("userId"),
        username: localStorage.getItem("username") || "Unknown",
      },
    };
    setEntries((prev) => [completeEntry, ...prev]);

    // REAL-TIME UPDATE: Refresh tracker counts immediately after adding entry
    fetchEntryCounts();
    if (process.env.NODE_ENV === 'development') {
      console.log("🔄 REAL-TIME: Refreshed tracker counts after entry added");
    }

    setListKey(Date.now());
    if (listRef.current) {
      listRef.current.scrollToPosition(0);
      listRef.current.recomputeRowHeights();
      listRef.current.forceUpdateGrid();
    }
  }, [fetchEntryCounts]);

  const handleEntryUpdated = useCallback(
    (updatedEntry) => {
      const index = entries.findIndex(
        (entry) => entry._id === updatedEntry._id
      );
      if (index !== -1) {
        setEntries((prev) =>
          prev.map((entry) =>
            entry._id === updatedEntry._id ? { ...updatedEntry } : entry
          )
        );
        setSelectedEntry((prev) =>
          prev && prev._id === updatedEntry._id ? { ...updatedEntry } : prev
        );
        setEntryToEdit((prev) =>
          prev && prev._id === updatedEntry._id ? { ...updatedEntry } : prev
        );
        setEditModalOpen(false);

        // REAL-TIME UPDATE: Refresh tracker counts immediately after updating entry
        fetchEntryCounts();
        if (process.env.NODE_ENV === 'development') {
          console.log("🔄 REAL-TIME: Refreshed tracker counts after entry updated");
        }

        setListKey(Date.now());
        if (listRef.current) {
          const scrollIndex = filteredData.findIndex(
            (entry) => entry._id === updatedEntry._id
          );
          if (scrollIndex !== -1) {
            const scrollPosition = listRef.current.getOffsetForRow({
              alignment: "start",
              index: scrollIndex,
            });
            listRef.current.scrollToPosition(scrollPosition);
          }
          listRef.current.recomputeRowHeights();
          listRef.current.forceUpdateGrid();
        }
      }
    },
    [entries, filteredData, fetchEntryCounts]
  );
  useEffect(() => {
    if (listRef.current && scrollPosition > 0) {
      listRef.current.scrollToPosition(scrollPosition);
      listRef.current.recomputeRowHeights();
      listRef.current.forceUpdateGrid();
    }
  }, [listKey, scrollPosition]);

  const handleDoubleClick = (id) => {
    if (!doubleClickInitiated && (isAdmin || isSuperadmin)) {
      setIsSelectionMode(true);
      setDoubleClickInitiated(true);
      setSelectedEntries([id]);
    }
  };

  const handleSingleClick = (id) => {
    if (isSelectionMode && (isAdmin || isSuperadmin)) {
      setSelectedEntries((prev) =>
        prev.includes(id)
          ? prev.filter((entryId) => entryId !== id)
          : [...prev, id]
      );
    }
  };

  const handleSelectAll = () => {
    if (isSelectionMode && (isAdmin || isSuperadmin)) {
      const allFilteredIds = filteredData.map((entry) => entry._id);
      setSelectedEntries(allFilteredIds);
    }
  };

  const handleCopySelected = () => {
    const selectedData = entries.filter((entry) =>
      selectedEntries.includes(entry._id)
    );
    const textToCopy = selectedData
      .map((entry) =>
        [
          entry.customerName,
          entry.mobileNumber,
          entry.product,
          entry.address,
          entry.state,
          entry.city,
          entry.organization,
          entry.category,
          entry.category,
          entry.createdAt ? new Date(entry.createdAt).toLocaleDateString("en-GB").replace(/\//g, "-") : "", // Strict DD-MM-YYYY for copy
        ].join("\t")
      )
      .join("\n");
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => toast.success("Selected entries copied to clipboard!"))
      .catch((err) => toast.error("Failed to copy: " + err.message));
  };

  const handleDeleteSelected = useCallback(() => {
    if (selectedEntries.length === 0) {
      toast.error("No entries selected!");
      return;
    }
    setItemIdsToDelete(selectedEntries);
    setItemIdToDelete(null);
    setIsDeleteModalOpen(true);
  }, [selectedEntries]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      toast.error("No file selected!");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true }); // Parse dates as objects
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const parsedData = XLSX.utils.sheet_to_json(worksheet);

        const newEntries = parsedData
          .map((item) => ({
            "Customer Name": item["Customer Name"] || "",
            "Contact Person": item["Contact Person"] || "",
            Email: item["Email"] || "",
            "Contact Number": item["Contact Number"] || "",
            "Alternate Number": item["Alternate Number"] || "",
            Product: item["Product"] || "",
            Address: item["Address"] || "",
            Organization: item["Organization"] || "",
            Category: item["Category"] || "",
            District: item["District"] || "",
            State: item["State"] || "",
            Status: item["Status"] || "Not Found",
            Remarks: item["Remarks"] || "",
            createdAt: item["Created At"] || null,
            updatedAt: item["Updated At"] || null,
          }))
          .filter((entry) =>
            Object.values(entry).some(
              (val) => val && val.toString().trim() !== ""
            )
          );
        if (newEntries.length === 0) {
          toast.error("No valid entries found in the Excel file!");
          return;
        }

        // Use 500 batch size as per spec
        const chunkSize = 500;
        const chunks = [];
        for (let i = 0; i < newEntries.length; i += chunkSize) {
          chunks.push(newEntries.slice(i, i + chunkSize));
        }

        let uploadedCount = 0;
        const errors = [];

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          try {
            const response = await api.post("/api/entries", chunk, {
              timeout: 120000, // 2 minutes timeout per batch
            });

            if (response.status === 201 || response.status === 200) {
              uploadedCount += response.data.insertedCount || chunk.length;
              toast.success(
                `Batch ${i + 1}/${chunks.length}: Uploaded ${response.data.insertedCount || chunk.length} entries`
              );
            } else if (response.status === 207) {
              const chunkUploaded = response.data.insertedCount || 0;
              uploadedCount += chunkUploaded;
              errors.push(...(response.data.errors || []));
              toast.warn(
                `Batch ${i + 1}/${chunks.length}: Partially uploaded (${chunkUploaded} entries)`
              );
            }
          } catch (error) {
            const errorMessage =
              error.response?.data?.message ||
              `Batch ${i + 1}: Failed to upload chunk`;
            errors.push(errorMessage);
            toast.error(errorMessage);
          }
        }

        // Refresh data after upload
        if (uploadedCount > 0) {
          fetchEntries();
          // REAL-TIME UPDATE: Refresh tracker counts immediately after bulk upload
          fetchEntryCounts();
          if (process.env.NODE_ENV === 'development') {
            console.log("🔄 REAL-TIME: Refreshed tracker counts after bulk upload");
          }
        }

        if (uploadedCount === newEntries.length && errors.length === 0) {
          toast.success(`Upload complete! ${uploadedCount} entries added.`);
        } else if (uploadedCount > 0) {
          toast.warn(
            `Uploaded ${uploadedCount} of ${newEntries.length} entries. ${errors.length} errors.`
          );
        } else {
          toast.error(`Failed to upload entries. ${errors.join("; ")}`);
        }
      } catch (error) {
        console.error("Error processing Excel file:", error.message);
        toast.error(`Invalid Excel file: ${error.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };
  // Mail Start
  const handleSendEmail = async (entry) => {
    const { accessToken } = getAuthData();
    if (!accessToken) {
      toast.error("Please log in to send emails.");
      navigate("/login");
      return;
    }
    // Open mail options modal
    setSelectedEntryForMail(entry);
    setIsMailModalOpen(true);
  };

  const handleMailModalClose = () => {
    setIsMailModalOpen(false);
    setSelectedEntryForMail(null);
  };
  //Mai

  //Mail End

  const handleExport = async () => {
    try {
      // Show loading toast
      const loadingToast = toast.info("Preparing export data...", { autoClose: false });

      // Build the same parameters used for fetching entries, but without pagination
      const params = new URLSearchParams();

      // Apply all current filters to get the complete filtered dataset
      if (searchTerm) params.append("searchTerm", searchTerm);
      if (selectedOrganization) params.append("selectedOrganization", selectedOrganization);
      if (selectedStateA) params.append("selectedStateA", selectedStateA);
      if (selectedCityA) params.append("selectedCityA", selectedCityA);
      if (selectedCreatedBy) params.append("selectedCreatedBy", selectedCreatedBy);

      // Apply date range filter if set
      if (dateRange[0]?.startDate && dateRange[0]?.endDate) {
        const formatLocalDate = (date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        params.append("startDate", formatLocalDate(dateRange[0].startDate));
        params.append("endDate", formatLocalDate(dateRange[0].endDate));
      }

      // Apply dashboard filter if set
      if (dashboardFilter && dashboardFilter !== "total" && dashboardFilter !== "results") {
        params.append("dashboardFilter", dashboardFilter);
      }

      // Fetch ALL filtered entries (not paginated)
      const response = await api.get(`/api/fetch-all-entries?${params.toString()}`);

      if (!response.data.success || !Array.isArray(response.data.data)) {
        toast.dismiss(loadingToast);
        toast.error("Failed to fetch export data!");
        return;
      }

      const allFilteredEntries = response.data.data;

      if (allFilteredEntries.length === 0) {
        toast.dismiss(loadingToast);
        toast.error("No entries to export with current filters!");
        return;
      }

      // Format data for export
      const exportData = allFilteredEntries.map((entry) => ({
        "Customer Name": entry.customerName || "",
        "Contact Person": entry.contactName || "",
        Email: entry.email || "",
        "Contact Number": entry.mobileNumber || "",
        "Alternate Number": entry.AlterNumber || "",
        Product: entry.product || "",
        Address: entry.address || "",
        Organization: entry.organization || "",
        Category: entry.category || "",
        District: entry.city || "",
        State: entry.state || "",
        Status: entry.status || "Not Found",
        Remarks: entry.remarks || "",
        "Created By": entry.createdBy?.username || "",
        "Created At": entry.createdAt ? new Date(entry.createdAt) : "", // Pass Date object
      }));

      // Create Excel file
      // Create Excel file with strict date formatting
      const worksheet = XLSX.utils.json_to_sheet(exportData, { dateNF: "dd-mm-yyyy" });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Entries");

      // Generate filename based on filters
      let filename = "Data";
      if (selectedStateA) filename += `_${selectedStateA}`;
      if (selectedOrganization) filename += `_${selectedOrganization}`;
      if (dashboardFilter && dashboardFilter !== "total" && dashboardFilter !== "results") {
        filename += `_${dashboardFilter}`;
      }
      if (dateRange[0]?.startDate && dateRange[0]?.endDate) {
        const startDate = dateRange[0].startDate.toLocaleDateString().replace(/\//g, '-');
        const endDate = dateRange[0].endDate.toLocaleDateString().replace(/\//g, '-');
        filename += `_${startDate}_to_${endDate}`;
      }
      filename += ".xlsx";

      XLSX.writeFile(workbook, filename);

      toast.dismiss(loadingToast);
      toast.success(`Export complete! ${allFilteredEntries.length} entries exported to ${filename}`);

    } catch (error) {
      console.error("Export error:", error);
      toast.error("Export failed. Please try again.");
    }
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleAnalyticsDrawerClose = () => {
    setIsAnalyticsOpen(false);
    setIsAnalyticsReady(false); // Reset ready state when closing
    setListKey(Date.now());
    if (listRef.current) {
      listRef.current.recomputeRowHeights();
      listRef.current.forceUpdateGrid();
      listRef.current.scrollToPosition(0);
      window.dispatchEvent(new Event("resize"));
    }
  };

  const handleValueAnalyticsDrawerClose = () => {
    setIsValueAnalyticsOpen(false);
    setIsValueAnalyticsReady(false); // Reset ready state when closing
    setListKey(Date.now());
    if (listRef.current) {
      listRef.current.recomputeRowHeights();
      listRef.current.forceUpdateGrid();
      listRef.current.scrollToPosition(0);
      window.dispatchEvent(new Event("resize"));
    }
  };
  useEffect(() => {
    if (isAnalyticsReady || isValueAnalyticsReady) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isAnalyticsReady, isValueAnalyticsReady]);
  // Helper function to get row background color based on lead status
  const getRowBackgroundColor = (status) => {
    switch (status) {
      case "Interested":
        return "#d9f4e5";
      case "Maybe":
        return "#fff8e1";
      case "Not Interested":
        return "#e0f7fa";
      case "Not": // Not Connected
        return "#f2f3f5"; // updated greyish tone
      case "Service":
        return "#e3f2fd";
      case "Closed Won":
        return "#e8f5e9";
      case "Closed Lost":
        return "#f3e5f5";
      case "Not Found":
        return "transparent";
      default:
        return "transparent";
    }
  };


  const getRowBackgroundColorcalltype = (closetype) => {
    switch (closetype) {
      case "Closed Won":
        return "#e8f5e9";
      case "Closed Lost":
        return "#f3e5f5";
      default:
        return "transparent";
    }
  };

  // Helper function to get color based on call count
  const getCallCountColor = (count) => {
    if (!count || count <= 0) return "transparent"; // Default if 0 calls
    if (count === 1) return "#fff3e0"; // Very light orange
    if (count === 2) return "#ffe0b2"; // Light orange
    if (count === 3) return "#ffcc80"; // Medium orange
    if (count === 4) return "#ffb74d"; // Dark orange
    return "#ffa726"; // Deepest orange (5+)
  };

  const handleCallInitiated = useCallback((response, leadId) => {
    if (response && response.success) {
      // Update the specific entry in the state with the new call count
      setEntries((prevEntries) =>
        prevEntries.map((entry) => {
          if (entry._id === leadId) {
            // Use the count from backend if available, otherwise increment locally
            const newCount = response.newCallCount !== undefined
              ? response.newCallCount
              : (entry.totalCallsMade || 0) + 1;
            return {
              ...entry,
              totalCallsMade: newCount,
            };
          }
          return entry;
        })
      );

      // Force grid update to reflect color change
      setListKey(Date.now());
      if (listRef.current) {
        listRef.current.forceUpdateGrid();
      }
    }
  }, []);


  const rowRenderer = ({ index, key, style }) => {
    const row = filteredData[index];
    const isSelected = selectedEntries.includes(row._id);

    const rowBgColor = getRowBackgroundColor(row.status);
    const rowBgColor1 = getRowBackgroundColorcalltype(row.closetype);

    return (
      <div
        key={key}
        style={{
          ...style,
          cursor: "pointer",
          backgroundColor: isSelected
            ? "rgba(37, 117, 252, 0.15)"
            : (rowBgColor !== "transparent" ? rowBgColor : rowBgColor1),
          transition: "background-color 0.2s ease",
        }}
        className={`virtual-row ${isSelected ? "selected" : ""}`}
        onDoubleClick={() => handleDoubleClick(row._id)}
        onClick={() => handleSingleClick(row._id)}
      >
        <div className="virtual-cell">
          {row.totalCallsMade > 0 ? (
            <span
              style={{
                backgroundColor: getCallCountColor(row.totalCallsMade),
                padding: "4px 10px",
                borderRadius: "20px",
                fontWeight: "700",
                color: "#4e342e", // Dark brown text for contrast on orange
                boxShadow: "0 2px 5px rgba(239, 108, 0, 0.25)",
                display: "inline-block",
                minWidth: "70px", // Ensure standard width
                fontSize: "0.9rem",
                border: "1px solid rgba(255, 167, 38, 0.4)",
              }}
            >
              {(page * rowsPerPage) + index + 1}
            </span>
          ) : (
            <span style={{ padding: "4px 10px", display: "inline-block", minWidth: "35px" }}>
              {(page * rowsPerPage) + index + 1}
            </span>
          )}
        </div> {/* # */}
        <div className="virtual-cell">{formatDate(row.createdAt)}</div> {/* Date */}
        <div className="virtual-cell">{row.customerName}</div> {/* Customer */}
        <div className="virtual-cell">{row.contactName}</div> {/* Person */}
        <div className="virtual-cell">{row.mobileNumber}</div> {/* Mobile */}
        <div className="virtual-cell">{row.address}</div> {/* Address */}
        <div className="virtual-cell">{row.city}</div> {/* District */}
        <div className="virtual-cell">{row.state}</div> {/* State */}
        <div className="virtual-cell">{row.createdBy?.username}</div> {/* User */}
        <div
          className="virtual-cell actions-cell"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "250px",
            padding: "0 5px",
            gap: "5px",
          }}
        >
          <Button
            variant="primary"
            onClick={() => handleShowDetails(row)}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "22px",
              padding: "0",
            }}
            title="View Details"
          >
            <FaEye style={{ marginBottom: "3px" }} />
          </Button>
          <button
            onClick={() => handleEdit(row)}
            className="editBtn"
            style={{ width: "40px", height: "40px", padding: "0" }}
            title="Edit Entry"
          >
            <svg height="1em" viewBox="0 0 512 512">
              <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"></path>
            </svg>
          </button>
          <button
            className="bin-button"
            onClick={() => handleDeleteClick(row._id)}
            style={{ width: "40px", height: "40px", padding: "0" }}
            title="Delete Entry"
          >
            <svg
              className="bin-top"
              viewBox="0 0 39 7"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <line y1="5" x2="39" y2="5" stroke="white" strokeWidth="4"></line>
              <line
                x1="12"
                y1="1.5"
                x2="26.0357"
                y2="1.5"
                stroke="white"
                strokeWidth="3"
              ></line>
            </svg>
            <svg
              className="bin-bottom"
              viewBox="0 0 33 39"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <mask id="path-1-inside-1_8_19" fill="white">
                <path d="M0 0H33V35C33 37.2091 31.2091 39 29 39H4C1.79086 39 0 37.2091 0 35V0Z"></path>
              </mask>
              <path
                d="M0 0H33H0ZM37 35C37 39.4183 33.4183 43 29 43H4C-0.418278 43 -4 39.4183 -4 35H4H29H37ZM4 43C-0.418278 43 -4 39.4183 -4 35V0H4V35V43ZM37 0V35C37 39.4183 33.4183 43 29 43V35V0H37Z"
                fill="white"
                mask="url(#path-1-inside-1_8_19)"
              ></path>
              <path d="M12 6L12 29" stroke="white" strokeWidth="4"></path>
              <path d="M21 6V29" stroke="white" strokeWidth="4"></path>
            </svg>
          </button>
          <Button
            variant="success"
            onClick={() => handleSendEmail(row)}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "22px",
              padding: "0",
              backgroundColor: "#28a745",
            }}
            title="Send Email"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 512 512"
              fill="white"
              style={{ width: "20px", height: "20px" }}
            >
              <path d="M464 64H48C21.49 64 0 85.49 0 112v288c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V112c0-26.51-21.49-48-48-48zm0 48v40.805c-22.422 18.259-58.168 46.651-134.587 106.49-16.841 13.247-50.201 45.072-73.413 44.701-23.208.375-56.579-31.459-73.413-44.701C106.18 199.465 70.425 171.067 48 152.805V112h416zM48 400V214.398c22.914 18.251 55.409 43.862 104.938 82.646 21.857 17.205 60.134 55.186 103.062 54.955 42.717.231 80.509-37.199 103.053-54.947 49.528-38.783 82.032-64.401 104.947-82.653V400H48z" />
            </svg>
          </Button>
          <ClickToCallButton
            leadId={row._id}
            phoneNumber={row.mobileNumber}
            compact={true}
            onCallInitiated={(response) => handleCallInitiated(response, row._id)}
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <div className="loading-wave">
          <div className="loading-bar"></div>
          <div className="loading-bar"></div>
          <div className="loading-bar"></div>
          <div className="loading-bar"></div>
        </div>
      </div>
    );
  }

  return (
    <>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "center", sm: "flex-start" },
          gap: { xs: 1, sm: 2 },
          px: { xs: 1, sm: 2 },
          my: { xs: 1, sm: 2 },
        }}
        className="enhanced-search-bar-container"
      >
        <input
          style={{ width: { xs: "100%", sm: "25%" }, maxWidth: { xs: "300px", sm: "none" } }}
          type="text"
          className="enhanced-search-bar allow-copy-paste"
          placeholder="🔍 Search..."
          onChange={handleSearchChange}
        />
        <select
          className="enhanced-filter-dropdown"
          value={selectedOrganization}
          onChange={handleOrganizationChange}
          style={{ width: { xs: "100%", sm: "auto" }, maxWidth: { xs: "300px", sm: "none" } }}
        >
          <option value="">-- Select Organization --</option>
          <option value="School">School</option>
          <option value="College">College</option>
          <option value="University">University</option>
          <option value="Construction Agency">Construction Agency</option>
          <option value="Corporate">Corporate</option>
          <option value="Customer">Customer</option>
          <option value="Partner">Partner</option>
          <option value="Others">Others</option>
        </select>
        {(isAdmin || isSuperadmin) && (
          <select
            className="enhanced-filter-dropdown"
            value={selectedCreatedBy}
            onChange={handleCreatedByChange}
            style={{ width: { xs: "100%", sm: "auto" }, maxWidth: { xs: "300px", sm: "none" } }}
          >
            <option value="">-- Select Usernames --</option>
            {uniqueCreatedBy.map((username) => (
              <option key={username} value={username}>
                {username}
              </option>
            ))}
          </select>
        )}
        <div  >
          <input
            type="text"
            style={{ borderRadius: "9999px" }}
            onClick={(e) => setAnchorEl(e.currentTarget)}
            value={
              dateRange[0]?.startDate && dateRange[0]?.endDate
                ? `${dateRange[0].startDate.toLocaleDateString()} - ${dateRange[0].endDate.toLocaleDateString()}`
                : ""
            }
            placeholder="-- Select date range --"
            readOnly
            className="cursor-pointer border p-2"
            aria-label="Select date range"
          />
          <Popover
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            PaperProps={{
              sx: {
                width: isMobile ? '100vw' : '600px',
                maxWidth: isMobile ? '100vw' : '600px',
                maxHeight: isMobile ? '80vh' : '500px',
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: isMobile ? '5px' : '10px',
                boxSizing: 'border-box',
                borderRadius: isMobile ? '0' : '8px',
                marginTop: isMobile ? '0' : '8px',
                background: '#fff',
              },
            }}
          >
            <DateRangePicker
              locale={enUS}
              ranges={dateRange}
              onChange={(item) => {
                // STRICT DATE CONTROL: Only use explicitly selected dates, no auto-injection
                const selection = item.selection;

                // Create new date objects to prevent any reference mutations
                let startDate = null;
                let endDate = null;

                // Only set dates if they are valid Date objects and explicitly selected
                if (selection.startDate instanceof Date && !isNaN(selection.startDate.getTime())) {
                  // Create a clean date object with only the selected date (no time mutations)
                  startDate = new Date(selection.startDate.getFullYear(), selection.startDate.getMonth(), selection.startDate.getDate());
                }

                if (selection.endDate instanceof Date && !isNaN(selection.endDate.getTime())) {
                  // Create a clean date object with only the selected date (no time mutations)
                  endDate = new Date(selection.endDate.getFullYear(), selection.endDate.getMonth(), selection.endDate.getDate());
                }

                // STRICT: Only update if we have valid dates
                // This prevents auto-injection of dates (like previous month's 31st)
                setDateRange([{
                  startDate: startDate,
                  endDate: endDate,
                  key: selection.key || 'selection',
                }]);

                // Only trigger fetch when both dates are selected (handled in useEffect)
                // This prevents page refresh when selecting start date
              }}
              moveRangeOnFirstSelection={false}
              showSelectionPreview={true}
              rangeColors={['#2575fc']}
              editableDateInputs={false}
              months={1}
              direction="vertical"
              className={isMobile ? 'mobile-date-picker' : ''}
              calendarFocus="forwards"
              maxDate={new Date()} // Prevent future dates
              staticRanges={
                isMobile
                  ? []
                  : [
                    {
                      label: 'Today',
                      range: () => ({
                        startDate: new Date(),
                        endDate: new Date(),
                        key: 'selection',
                      }),
                      isSelected: (range) => {
                        const today = new Date();
                        return (
                          range.startDate.toDateString() === today.toDateString() &&
                          range.endDate.toDateString() === today.toDateString()
                        );
                      },
                    },
                    {
                      label: 'Yesterday',
                      range: () => ({
                        startDate: new Date(new Date().setDate(new Date().getDate() - 1)),
                        endDate: new Date(new Date().setDate(new Date().getDate() - 1)),
                        key: 'selection',
                      }),
                      isSelected: (range) => {
                        const yesterday = new Date(new Date().setDate(new Date().getDate() - 1));
                        return (
                          range.startDate.toDateString() === yesterday.toDateString() &&
                          range.endDate.toDateString() === yesterday.toDateString()
                        );
                      },
                    },
                    {
                      label: 'Last 7 Days',
                      range: () => ({
                        startDate: new Date(new Date().setDate(new Date().getDate() - 7)),
                        endDate: new Date(),
                        key: 'selection',
                      }),
                      isSelected: (range) => {
                        const start = new Date(new Date().setDate(new Date().getDate() - 7));
                        const end = new Date();
                        return (
                          range.startDate.toDateString() === start.toDateString() &&
                          range.endDate.toDateString() === end.toDateString()
                        );
                      },
                    },
                    {
                      label: 'Last 30 Days',
                      range: () => ({
                        startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
                        endDate: new Date(),
                        key: 'selection',
                      }),
                      isSelected: (range) => {
                        const start = new Date(new Date().setDate(new Date().getDate() - 30));
                        const end = new Date();
                        return (
                          range.startDate.toDateString() === start.toDateString() &&
                          range.endDate.toDateString() === end.toDateString()
                        );
                      },
                    },
                  ]
              }
              inputRanges={isMobile ? [] : undefined}
              weekStartsOn={1}
            />
          </Popover>
        </div>
        <select
          className="enhanced-filter-dropdown"
          value={selectedStateA}
          onChange={handleStateChangeA}
          style={{ width: { xs: "100%", sm: "auto" }, maxWidth: { xs: "300px", sm: "none" } }}
        >
          <option value="">-- Select State --</option>
          {Object.keys(statesAndCities).map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
        <select
          className="enhanced-filter-dropdown"
          value={selectedCityA}
          onChange={handleCityChangeA}
          disabled={!selectedStateA}
          style={{ width: { xs: "100%", sm: "auto" }, maxWidth: { xs: "300px", sm: "none" } }}
        >
          <option value="">-- Select District --</option>
          {selectedStateA &&
            statesAndCities[selectedStateA].map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
        </select>
        <button
          className="reset-button"
          onClick={handleReset}
          style={{
            display: "flex",
            alignItems: "center",
            padding: { xs: "6px 12px", sm: "8px 16px" },
            borderRadius: "20px",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontSize: { xs: "0.875rem", sm: "1rem" },
            transition: "all 0.3s ease",
            width: { xs: "100%", sm: "auto" },
            maxWidth: { xs: "300px", sm: "none" },
            justifyContent: "center",
          }}
        >
          <span style={{ fontWeight: "bold" }}>Reset</span>
          <span
            className="rounded-arrow"
            style={{
              marginLeft: "8px",
              display: "inline-flex",
              alignItems: "center",
              transition: "transform 0.3s ease",
            }}
          >
            →
          </span>
        </button>
      </Box>

      <div
        className="dashboard-container"
        style={{ width: "90%", margin: "auto", padding: "20px" }}
      >


        <CallTrackingDashboard
          statusCounts={trackerCounts.statusCounts || {}}
          closeTypeCounts={trackerCounts.closeTypeCounts || {}}
          onFilterClick={handleDashboardFilterClick}
          selectedCategory={dashboardFilter}
        />
        {/* Action Buttons Row */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            mb: 3,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <button
            className="button"
            onClick={() => setIsAddModalOpen(true)}
            style={{
              padding: "12px 20px",
              background: "linear-gradient(90deg, #6a11cb, #2575fc)",
              color: "white",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "bold",
              border: "none",
              fontSize: "1rem",
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0px 6px 12px rgba(0, 0, 0, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)";
            }}
          >
            <FaPlus />
            Add Entry
          </button>



          {isSuperadmin && (
            <button
              className="button"
              onClick={handleExport}
              style={{
                padding: "12px 20px",
                background: "linear-gradient(90deg, #6a11cb, #2575fc)",
                color: "white",
                borderRadius: "12px",
                cursor: "pointer",
                fontWeight: "bold",
                border: "none",
                fontSize: "1rem",
                boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0px 6px 12px rgba(0, 0, 0, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)";
              }}
            >
              <FaFileExport />
              Export
            </button>
          )} <label
            className="button"
            style={{
              padding: "12px 20px",
              background: "linear-gradient(90deg, #6a11cb, #2575fc)",
              color: "white",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "bold",
              border: "none",
              fontSize: "1rem",
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0px 6px 12px rgba(0, 0, 0, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)";
            }}
          >
            <FaUpload />
            Bulk Upload
            <input
              type="file"
              onChange={handleFileUpload}
              accept=".xlsx, .xls"
              style={{ display: "none" }}
            />
          </label>
          <button
            className="button"
            onClick={() => setIsAnalyticsModalOpen(true)}
            style={{
              padding: "12px 20px",
              background: "linear-gradient(90deg, #6a11cb, #2575fc)",
              color: "white",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "bold",
              border: "none",
              fontSize: "1rem",
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0px 6px 12px rgba(0, 0, 0, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)";
            }}
          >
            <FaChartBar />
            Analytics
          </button>

          <button
            className="button"
            onClick={() => navigate("/dms/analytics/calls")}
            style={{
              padding: "12px 20px",
              background: "linear-gradient(90deg, #6a11cb, #2575fc)",
              color: "white",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "bold",
              border: "none",
              fontSize: "1rem",
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0px 6px 12px rgba(0, 0, 0, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)";
            }}
          >
            <FaPhoneAlt size={18} color="white" />   {role === "salesperson" || role === "Others" ? "My Calls" : "Call Analytics"}
          </button>

          <button
            className="button"
            onClick={() => navigate("/dms/scheduled-calls")}
            style={{
              padding: "12px 20px",
              background: "linear-gradient(90deg, #2575fc, #6a11cb)",
              color: "white",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "bold",
              border: "none",
              fontSize: "1rem",
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0px 6px 12px rgba(0, 0, 0, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)";
            }}
          >
            <FaCalendarAlt size={18} color="white" />
            Scheduled Calls
          </button>
          <button
            className="button"
            onClick={() => navigate("/dms/call-history")}
            style={{
              padding: "12px 20px",
              background: "linear-gradient(90deg, #6a11cb, #2575fc)",
              color: "white",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "bold",
              border: "none",
              fontSize: "1rem",
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0px 6px 12px rgba(0, 0, 0, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)";
            }}
          >
            <FaHistory size={18} color="white" />
            Call History
          </button>
          {(isAdmin || isSuperadmin) && (
            <button
              className="button"
              onClick={() => navigate("/dms/admin/smartflo-mapping")}
              style={{
                padding: "12px 20px",
                background: "linear-gradient(90deg, #6a11cb, #2575fc)",
                color: "white",
                borderRadius: "12px",
                cursor: "pointer",
                fontWeight: "bold",
                border: "none",
                fontSize: "1rem",
                boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0px 6px 12px rgba(0, 0, 0, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)";
              }}
            >
              <FaProjectDiagram size={18} color="white" />   Mapping
            </button>
          )}

        </Box>

        <div style={{ textAlign: "center" }}>
          {(isAdmin || isSuperadmin) && filteredData.length > 0 && (
            <div style={{ marginTop: "10px", marginLeft: "0px" }}>
              {isSelectionMode && (
                <Button
                  variant="info"
                  className="select mx-1"
                  onClick={handleSelectAll}
                  style={{
                    marginRight: "10px",
                    background: "linear-gradient(90deg, #6a11cb, #2575fc)",
                    border: "none",
                    color: "white",
                    padding: "10px 20px",
                    borderRadius: "12px",
                    fontWeight: "bold",
                    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = "translateY(-2px)";
                    e.target.style.boxShadow =
                      "0px 6px 12px rgba(0, 0, 0, 0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow =
                      "0px 4px 6px rgba(0, 0, 0, 0.1)";
                  }}
                >
                  Select All
                </Button>
              )}
              {selectedEntries.length > 0 && (
                <>
                  <Button
                    className="copy"
                    variant="primary"
                    onClick={handleCopySelected}
                    style={{
                      marginRight: "10px",
                      background: "linear-gradient(90deg, #6a11cb, #2575fc)",
                      border: "none",
                      padding: "10px 20px",
                      borderRadius: "12px",
                      fontWeight: "bold",
                      boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow =
                        "0px 6px 12px rgba(0, 0, 0, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow =
                        "0px 4px 6px rgba(0, 0, 0, 0.1)";
                    }}
                  >
                    Copy Selected {selectedEntries.length}
                  </Button>
                  <Button
                    variant="danger"
                    className="copy "
                    onClick={handleDeleteSelected}
                    style={{
                      background: "linear-gradient(90deg, #ff4444, #cc0000)",
                      border: "none",
                      padding: "10px 20px",
                      borderRadius: "12px",
                      fontWeight: "bold",
                      boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow =
                        "0px 6px 12px rgba(0, 0, 0, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow =
                        "0px 4px 6px rgba(0, 0, 0, 0.1)";
                    }}
                  >
                    Delete Selected {selectedEntries.length}
                  </Button>
                </>
              )}
            </div>
          )}
          <p
            style={{ fontSize: "0.9rem", color: "#6c757d", marginTop: "10px" }}
          >
            Upload a valid Excel file with columns:{" "}
            <strong>
              Customer Name, Email, Mobile Number, Product, Address,
              Organization, Category, State, District, Status, Remarks, Created
              At
            </strong>
          </p>
        </div>

        <DisableCopy isAdmin={isAdmin} />
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            flexDirection: { xs: "column", sm: "row" },
            gap: { xs: 1, sm: 2 },
            mb: { xs: 1, sm: 2 },
            justifyContent: { xs: "center", sm: "flex-start" },
            alignItems: { xs: "center", sm: "flex-start" },
            px: { xs: 1, sm: 0 },
          }}
        >
          <Box
            className="counter-badge"
            sx={{
              fontWeight: "600",
              fontSize: { xs: "0.875rem", sm: "1rem" },
              color: "#fff",
              background:
                dashboardFilter === "leads"
                  ? "linear-gradient(90deg, #ff4444, #cc0000)"
                  : "linear-gradient(90deg, #6a11cb, #2575fc)",
              padding: { xs: "4px 12px", sm: "5px 15px" },
              borderRadius: "20px",
              boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
              textAlign: "center",
              textTransform: "capitalize",
              cursor: "pointer",
              border: dashboardFilter === "leads" ? "2px solid #fff" : "none",
              width: { xs: "100%", sm: "auto" },
              maxWidth: { xs: "300px", sm: "none" },
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
              },
            }}
            onClick={() => handleCounterClick("leads")}
          >
            Total Leads: {trackerCounts.totalLeads}
          </Box>
          <Box
            className="counter-badge"
            sx={{
              fontWeight: "600",
              fontSize: { xs: "0.875rem", sm: "1rem" },
              color: "#fff",
              background:
                dashboardFilter === "results"
                  ? "linear-gradient(90deg, #ff4444, #cc0000)"
                  : "linear-gradient(90deg, #6a11cb, #2575fc)",
              padding: { xs: "4px 12px", sm: "5px 15px" },
              borderRadius: "20px",
              boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
              textAlign: "center",
              textTransform: "capitalize",
              cursor: "pointer",
              border: dashboardFilter === "results" ? "2px solid #fff" : "none",
              width: { xs: "100%", sm: "auto" },
              maxWidth: { xs: "300px", sm: "none" },
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
              },
            }}
            onClick={() => handleCounterClick("results")}
          >
            Total Results: {computedTotalResults}
          </Box>
          <Box
            className="counter-badge"
            sx={{
              fontWeight: "600",
              fontSize: { xs: "0.875rem", sm: "1rem" },
              color: "#fff",
              background:
                dashboardFilter === "monthly"
                  ? "linear-gradient(90deg, #ff4444, #cc0000)"
                  : "linear-gradient(90deg, #6a11cb, #2575fc)",
              padding: { xs: "4px 12px", sm: "5px 15px" },
              borderRadius: "20px",
              boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
              textAlign: "center",
              textTransform: "capitalize",
              cursor: "pointer",
              border: dashboardFilter === "monthly" ? "2px solid #fff" : "none",
              width: { xs: "100%", sm: "auto" },
              maxWidth: { xs: "300px", sm: "none" },
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
              },
            }}
            onClick={() => handleCounterClick("monthly")}
          >
            Monthly Calls: {monthlyCalls}
          </Box>
        </Box>
        <div
          className="table-container"
          style={{
            width: "100%",
            maxWidth: "100%", // Fit screen width
            height: "75vh",
            margin: "0 auto",
            overflowX: "auto", // Enable horizontal scrolling
            overflowY: "auto", // Enable vertical scrolling
            boxShadow: "0 6px 18px rgba(0, 0, 0, 0.1)",
            borderRadius: "15px",
            marginTop: "20px",
            backgroundColor: "#fff",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div
            className="table-header"
            style={{
              background: "linear-gradient(135deg, #2575fc, #6a11cb)",
              color: "white",
              padding: "15px 20px",
              textAlign: "center",
              position: "sticky",
              top: 0,
              zIndex: 2,
              display: "grid",
              fontWeight: "bold",
              borderBottom: "2px solid #ddd",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "1000px", // Wide enough to trigger scrolling
            }}
          >
            <div>#</div>
            <div>Date</div>
            <div>Customer</div>
            <div>Person</div>
            <div>Mobile</div>
            <div>Address</div>
            <div>District</div>
            <div>State</div>
            <div>User</div>
            <div>Actions</div>
          </div>
          {tableLoading ? (
            <div
              style={{
                height: "calc(100% - 60px)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: "1rem",
                color: "#666",
                fontWeight: "bold",
                textAlign: "center",
                padding: "20px",
                minWidth: "1190px",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                <div className="loading-wave">
                  <div className="loading-bar"></div>
                  <div className="loading-bar"></div>
                  <div className="loading-bar"></div>
                  <div className="loading-bar"></div>
                </div>
                <div>Loading data...</div>
              </div>
            </div>
          ) : filteredData.length === 0 ? (
            <div
              style={{
                height: "calc(100% - 60px)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: "1.5rem",
                color: "#666",
                fontWeight: "bold",
                textAlign: "center",
                padding: "20px",
                minWidth: "1190px",
              }}
            >
              No Entries Available
            </div>
          ) : (
            <AutoSizer>
              {({ height, width }) => (
                <List
                  ref={listRef}
                  key={listKey}
                  width={Math.max(width, 1000)}
                  height={height - 60}
                  rowCount={filteredData.length}
                  rowHeight={60}
                  rowRenderer={rowRenderer}
                  overscanRowCount={10}
                  style={{ outline: "none", minWidth: "1000px" }} // Match header minWidth
                  onScroll={({ scrollTop, scrollLeft }) => {
                    setScrollPosition(scrollTop);
                    const header = document.querySelector(".table-header");
                    if (header) header.scrollLeft = scrollLeft;
                  }}
                />
              )}
            </AutoSizer>
          )}
        </div>

        {/* Pagination Controls */}
        {filteredData.length > 0 && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2, mb: 2 }}>
            <TablePagination
              component="div"
              count={totalEntries}
              page={page}
              onPageChange={handlePageChange}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleRowsPerPageChange}
              rowsPerPageOptions={[25, 50, 100]}
              sx={{
                "& .MuiTablePagination-toolbar": {
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                },
                "& .MuiTablePagination-selectLabel": {
                  margin: 0,
                  marginRight: "6px",
                  fontWeight: 600,
                  color: "#6b7280",
                  lineHeight: "32px",
                },
                "& .MuiTablePagination-select": {
                  margin: 0,
                  padding: "4px 28px 4px 10px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  fontWeight: 600,
                  borderRadius: "8px",
                  background: "#f9fafb",
                },
                "& .MuiSelect-icon": {
                  top: "50%",
                  transform: "translateY(-50%)",
                },
                "& .MuiTablePagination-displayedRows": {
                  flexGrow: 1,
                  textAlign: "center",
                  fontWeight: 600,
                  color: "#6b7280",
                  margin: 0,
                },
                "& .MuiTablePagination-actions": {
                  marginLeft: "auto",
                },
                "& .MuiIconButton-root": {
                  color: "#2575fc",
                  borderRadius: "8px",
                  "&:hover": {
                    background: "rgba(37,117,252,0.1)",
                  },
                },
              }}
            />
          </Box>
        )}

        <AddEntry
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onEntryAdded={handleEntryAdded}
        />
        <EditEntry
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onEntryUpdated={handleEntryUpdated}
          entryToEdit={entryToEdit}
        />
        <DeleteModal
          isOpen={isDeleteModalOpen}
          onClose={handleCloseDeleteModal}
          onDelete={handleDelete}
          itemId={itemIdToDelete}
          itemIds={itemIdsToDelete}
        />
        <ViewEntry
          isOpen={showDetails}
          onClose={handleClosed}
          entry={selectedEntry}
          isAdmin={isAdmin}
          onEntryUpdated={handleEntryUpdated}
        />
        <AdminDrawer
          entries={filteredAllEntries}
          isOpen={isAnalyticsOpen && isAnalyticsReady}
          onClose={handleAnalyticsDrawerClose}
          role={role}
          userId={userId}
          dateRange={dateRange}
        />
        <ValueAnalyticsDrawer
          entries={filteredAllEntries}
          isOpen={isValueAnalyticsOpen && isValueAnalyticsReady}
          onClose={handleValueAnalyticsDrawerClose}
          role={role}
          userId={userId}
          dateRange={dateRange}
        />
        <MailOptionsModal
          isOpen={isMailModalOpen}
          onClose={handleMailModalClose}
          entryId={selectedEntryForMail?._id}
          entryData={selectedEntryForMail}
        />
        <Modal
          show={isAnalyticsModalOpen}
          onHide={() => setIsAnalyticsModalOpen(false)}
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title style={{ fontWeight: "bold" }}>
              📊 Analytics Options
            </Modal.Title>
          </Modal.Header>
          <Modal.Body
            style={{ display: "flex", justifyContent: "center", gap: "20px" }}
          >
            <Button
              variant="primary"
              onClick={() => {
                setIsAnalyticsOpen(true);
                setIsAnalyticsModalOpen(false);
              }}
              style={{
                background: "linear-gradient(90deg, #6a11cb, #2575fc)",
                border: "none",
                padding: "10px 20px",
                borderRadius: "12px",
                fontWeight: "bold",
              }}
            >
              📞 Calls Analytics
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsValueAnalyticsOpen(true);
                setIsAnalyticsModalOpen(false);
              }}
              style={{
                background: "linear-gradient(90deg, #6a11cb, #2575fc)",
                border: "none",
                padding: "10px 20px",
                borderRadius: "12px",
                fontWeight: "bold",
              }}
            >
              🚀 Value Analytics
            </Button>
          </Modal.Body>
        </Modal>
      </div>
      <footer className="footer-container">
        <p style={{ marginTop: "15px", color: "white", height: "10px" }}>
          © 2025 DataManagement. All rights reserved.
        </p>
      </footer>
      <style>
        {`
          
 
  /* Mobile Responsive Styles */
  @media (max-width: 768px) {
    .button {
      margin-top: 5px;
      margin-bottom: 8px;
      width: 250px;
    }
    
    .copy { 
      margin-bottom: 8px;
      width: 250px;
    }
    
    .select { 
      margin-bottom: 8px;
      width: 250px;
    }

    .cursor-pointer {
      width: 296px !important;
    }

    .table-container {
      max-width: 100%;
      overflow-x: auto;
      border-radius: 10px;
    }

    .table-header {
    background: linear-gradient(135deg, #2575fc, #6a11cb);
    color: white;
    padding: 15px 20px;
    text-align: center;
    position: sticky;
    top: 0;
    z-index: 2;
    display: grid;
    grid-template-columns: 80px 120px 150px 120px 120px 150px 100px 100px 100px 200px; /* Fixed widths for alignment */
    font-weight: bold;
    border-bottom: 2px solid #ddd;
    align-items: center;
    justify-content: center;
    min-width: 1000px; /* Wide enough for scrolling */
  }

    .virtual-row {
      grid-template-columns: 50px 90px 110px 90px 100px 120px 80px 80px 80px 200px !important;
      padding: 8px 15px !important;
      min-width: 1020px;
    }

    .virtual-cell {
      font-size: 0.75rem !important;
      padding: 5px !important;
      margin-left: -30px;
    }

    .actions-cell {
      width: 200px !important;
      gap: 3px !important;
      margin-left: -35px !important;
    }

    .actions-cell button,
    .actions-cell .bin-button,
    .actions-cell .editBtn {
      width: 32px !important;
      height: 32px !important;
      min-width: 32px !important;
      padding: 0 !important;
    }

    .table-container::-webkit-scrollbar {
      height: 6px;
    }

    .table-container::-webkit-scrollbar-thumb {
      background-color: #6a11cb;
      border-radius: 10px;
    }

    .table-container::-webkit-scrollbar-track {
      background-color: #f1f1f1;
    }

    .enhanced-search-bar-container { 
      flex-direction: column; 
      align-items: center; 
    }
    
    .enhanced-search-bar, 
    .enhanced-filter-dropdown, 
    .reset-button { 
      width: 100% !important; 
      max-width: 300px !important; 
      margin-bottom: 10px; 
    }
  }

  .footer-container {
    background: linear-gradient(90deg, #6a11cb, #2575fc);
    text-align: center;
    padding: 10px 0;
    margin-top: 20px;

  }

  .loading-wave {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
  }

  .loading-bar {
    width: 8px;
    height: 40px;
    background-color: #2575fc;
    animation: wave 1.2s infinite ease-in-out;
  }

  .loading-bar:nth-child(2) {
    animation-delay: -0.1s;
  }

  .loading-bar:nth-child(3) {
    animation-delay: -0.2s;
  }

  .loading-bar:nth-child(4) {
    animation-delay: -0.3s;
  }

  @keyframes wave {
    0%, 100% {
      transform: scaleY(0.4);
      background-color: #2575fc;
    }
    50% {
      transform: scaleY(1);
      background-color: #6a11cb;
    }
  }
  .select:hover, .copy:hover {
    background: linear-gradient(90deg, #6a11cb, #2575fc);
    color: white;
    border-radius: 12px;
    transition: all 0.3s ease;
  }
  .reset-button:hover {
    background: linear-gradient(90deg, #2575fc, #6a11cb);
    box-shadow: 0px 4px 15px rgba(0, 0, 0, 0.2);
    transform: translateY(-2px);
  }
  .reset-button:active {
    transform: translateY(0);
    box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .rounded-arrow {
    font-size: 1.2rem;
    transition: transform 0.3s ease;
  }
  
  .reset-button:hover .rounded-arrow {
    transform: translateX(5px);
  }
  
  .reset-button:active .rounded-arrow {
    transform: translateX(0);
  }
        `}
      </style>
    </>
  );
}

export default DashBoard;