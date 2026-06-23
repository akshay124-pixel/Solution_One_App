import React, { useState, useEffect, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Row, Col, Card, Button, Modal, Form, Spinner } from "react-bootstrap";
import { Download, RefreshCw, TrendingUp, Clock, CheckCircle, AlertCircle, Repeat, X, Check, Package } from "lucide-react";
import SearchSection from "./SearchSection";
import SearchResultsTable from "./SearchResultsTable";
import ServiceLogsTable from "./ServiceLogsTable";
import ServiceLogsFilters from "./ServiceLogsFilters";
import CallLogModal from "./CallLogModal";
import ViewServiceLog from "./ViewServiceLog";
import EditServiceLog from "./EditServiceLog";
import DeleteServiceLogModal from "./DeleteServiceLogModal";
import ManualServiceRequestModal from "./ManualServiceRequestModal";
import CreateIncompleteOrderModal from "./CreateIncompleteOrderModal";
import ReplacementDemoLogsTable from "./ReplacementDemoLogsTable";
import ReplacementDemoLogsFilters from "./ReplacementDemoLogsFilters";
import ViewReplacementDemoLog from "./ViewReplacementDemoLog";
import EditReplacementDemoLog from "./EditReplacementDemoLog";
import DeleteReplacementDemoLogModal from "./DeleteReplacementDemoLogModal";
import IncompleteOrdersTable from "./IncompleteOrdersTable";
import IncompleteOrdersFilters from "./IncompleteOrdersFilters";
import ViewIncompleteOrderModal from "./ViewIncompleteOrderModal";
import EditIncompleteOrderModal from "./EditIncompleteOrderModal";
import DeleteIncompleteOrderModal from "./DeleteIncompleteOrderModal";
import serviceApi from "../axiosSetup";
import { toast } from "react-toastify";

// Lazy load SO ViewEntry component
const ViewEntry = React.lazy(() => import("../../so/components/ViewEntry"));

const ServiceDashboard = ({ refreshTrigger, onApprovalAction }) => {
  const navigate = useNavigate();
  const [searchResults, setSearchResults] = useState([]);
  const [serviceLogs, setServiceLogs] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showCallLogModal, setShowCallLogModal] = useState(false);
  const [showViewLogModal, setShowViewLogModal] = useState(false);
  const [showEditLogModal, setShowEditLogModal] = useState(false);
  const [showDeleteLogModal, setShowDeleteLogModal] = useState(false);
  const [showViewOrderModal, setShowViewOrderModal] = useState(false);
  const [showManualRequestModal, setShowManualRequestModal] = useState(false);
  const [showCreateIncompleteOrderModal, setShowCreateIncompleteOrderModal] = useState(false);
  const [initialOrderForIncomplete, setInitialOrderForIncomplete] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingReplacementLogs, setRefreshingReplacementLogs] = useState(false);

  // Rejection states for Replacement/Demo Logs
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionRemarks, setRejectionRemarks] = useState("");
  const [logToReject, setLogToReject] = useState(null);

  const [serviceLogsSearch, setServiceLogsSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [callTypeFilter, setCallTypeFilter] = useState("");
  const [systemTypeFilter, setSystemTypeFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [partReplacementStatusFilter, setPartReplacementStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [stats, setStats] = useState({
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    total: 0,
    callTypes: {
      siteSurvey: 0,
      installation: 0,
      inspection: 0,
      serviceRequest: 0
    }
  });
  
  // Pagination State for Service Logs
  const [servicePage, setServicePage] = useState(1);
  const [serviceLimit, setServiceLimit] = useState(20);
  const [salespersons, setSalespersons] = useState([]);
  const [salesPersonFilter, setSalesPersonFilter] = useState("");
  const [serviceTotalPages, setServiceTotalPages] = useState(1);
  const [debouncedServiceLogsSearch, setDebouncedServiceLogsSearch] = useState("");

  // Replacement/Demo Logs State
  const [replacementDemoLogs, setReplacementDemoLogs] = useState([]);
  const [selectedReplacementDemoLog, setSelectedReplacementDemoLog] = useState(null);
  const [showViewReplacementDemoLog, setShowViewReplacementDemoLog] = useState(false);
  const [showEditReplacementDemoLog, setShowEditReplacementDemoLog] = useState(false);
  const [showDeleteReplacementDemoLog, setShowDeleteReplacementDemoLog] = useState(false);
  const [replacementDemoLoading, setReplacementDemoLoading] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [replacementSalespersons, setReplacementSalespersons] = useState([]);
  
  // Replacement/Demo Logs Filters
  const [replacementSearchTerm, setReplacementSearchTerm] = useState("");
  const [replacementApprovalStatusFilter, setReplacementApprovalStatusFilter] = useState("");
  const [replacementStartDate, setReplacementStartDate] = useState("");
  const [replacementEndDate, setReplacementEndDate] = useState("");
  const [replacementSalesPersonFilter, setReplacementSalesPersonFilter] = useState("");
  const [dispatchStatusFilter, setDispatchStatusFilter] = useState("");  // NEW: Dispatch Status Filter

  // Pagination State for Replacement Logs
  const [replacementPage, setReplacementPage] = useState(1);
  const [replacementLimit, setReplacementLimit] = useState(20);
  const [replacementTotalPages, setReplacementTotalPages] = useState(1);
  const [replacementTotalRecords, setReplacementTotalRecords] = useState(0);  // NEW: Track actual filtered total
  const [debouncedReplacementSearch, setDebouncedReplacementSearch] = useState("");
  const [replacementStats, setReplacementStats] = useState({
    total: 0, pending: 0, proceedForApproval: 0, approved: 0, rejected: 0, closed: 0
  });

  // Incomplete Orders State
  const [incompleteOrders, setIncompleteOrders] = useState([]);
  const [selectedIncompleteOrder, setSelectedIncompleteOrder] = useState(null);
  const [showViewIncompleteOrder, setShowViewIncompleteOrder] = useState(false);
  const [showEditIncompleteOrder, setShowEditIncompleteOrder] = useState(false);
  const [showDeleteIncompleteOrder, setShowDeleteIncompleteOrder] = useState(false);
  const [incompleteOrdersLoading, setIncompleteOrdersLoading] = useState(false);
  const [refreshingIncompleteOrders, setRefreshingIncompleteOrders] = useState(false);

  // Incomplete Orders Filters
  const [incompleteSearch, setIncompleteSearch] = useState("");
  const [incompleteStatusFilter, setIncompleteStatusFilter] = useState("");
  const [incompleteProductCategoryFilter, setIncompleteProductCategoryFilter] = useState("");
  const [incompleteStartDate, setIncompleteStartDate] = useState("");
  const [incompleteEndDate, setIncompleteEndDate] = useState("");

  // Pagination State for Incomplete Orders
  const [incompletePage, setIncompletePage] = useState(1);
  const [incompleteLimit, setIncompleteLimit] = useState(20);
  const [incompleteTotalPages, setIncompleteTotalPages] = useState(1);
  const [debouncedIncompleteSearch, setDebouncedIncompleteSearch] = useState("");
  const [incompleteStats, setIncompleteStats] = useState({
    total: 0, pending: 0, inProgress: 0, dispatched: 0, delivered: 0, closed: 0
  });

  // Debounce searches
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedServiceLogsSearch(serviceLogsSearch), 500);
    return () => clearTimeout(timer);
  }, [serviceLogsSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedReplacementSearch(replacementSearchTerm), 500);
    return () => clearTimeout(timer);
  }, [replacementSearchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedIncompleteSearch(incompleteSearch), 500);
    return () => clearTimeout(timer);
  }, [incompleteSearch]);

  // Reset pagination when filters change
  useEffect(() => {
    setServicePage(1);
  }, [debouncedServiceLogsSearch, statusFilter, callTypeFilter, systemTypeFilter, stateFilter, partReplacementStatusFilter, salesPersonFilter, vendorFilter, startDate, endDate]);

  useEffect(() => {
    setReplacementPage(1);
  }, [debouncedReplacementSearch, replacementApprovalStatusFilter, replacementStartDate, replacementEndDate, replacementSalesPersonFilter]);

  useEffect(() => {
    setIncompletePage(1);
  }, [debouncedIncompleteSearch, incompleteStatusFilter, incompleteProductCategoryFilter, incompleteStartDate, incompleteEndDate]);

  // Fetch active salespersons list on mount
  useEffect(() => {
    const fetchSalespersons = async () => {
      try {
        const response = await serviceApi.get("/salespersons");
        if (response.data.success) {
          setSalespersons(response.data.salespersons || []);
        }
      } catch (err) {
        console.error("Failed to load salespersons:", err);
      }
    };
    fetchSalespersons();
  }, []);

  // Fetch replacement salespersons list on mount
  useEffect(() => {
    const fetchReplacementSalespersons = async () => {
      try {
        const response = await serviceApi.get("/replacement-demo-logs/salespersons");
        if (response.data.success) {
          setReplacementSalespersons(response.data.salespersons || []);
        }
      } catch (err) {
        console.error("Failed to load replacement salespersons:", err);
      }
    };
    fetchReplacementSalespersons();
  }, []);

  // Fetch service logs on mount and when filters/pagination change
  useEffect(() => {
    fetchServiceLogs();
  }, [servicePage, serviceLimit, debouncedServiceLogsSearch, statusFilter, callTypeFilter, systemTypeFilter, stateFilter, partReplacementStatusFilter, salesPersonFilter, vendorFilter, startDate, endDate]);

  useEffect(() => {
    fetchReplacementDemoLogs();
  }, [replacementPage, replacementLimit, debouncedReplacementSearch, replacementApprovalStatusFilter, replacementStartDate, replacementEndDate, replacementSalesPersonFilter, dispatchStatusFilter]);

  useEffect(() => {
    fetchIncompleteOrders();
  }, [incompletePage, incompleteLimit, debouncedIncompleteSearch, incompleteStatusFilter, incompleteProductCategoryFilter, incompleteStartDate, incompleteEndDate]);

  useEffect(() => {
    fetchUserRole();
  }, []);

  // Refresh when refreshTrigger changes (from navbar approval actions)
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchReplacementDemoLogs();
    }
  }, [refreshTrigger]);

  const fetchServiceLogs = async () => {
    setLoading(true);
    try {
      const response = await serviceApi.get("/service-logs", {
        params: { 
          page: servicePage,
          limit: serviceLimit,
          search: debouncedServiceLogsSearch,
          status: statusFilter,
          callType: callTypeFilter,
          systemType: systemTypeFilter,
          state: stateFilter,
          partReplacementStatus: partReplacementStatusFilter,
          salesPerson: salesPersonFilter,
          vendor: vendorFilter,
          startDate: startDate,
          endDate: endDate
        },
      });
      if (response.data.success) {
        setServiceLogs(response.data.logs);
        if (response.data.pagination) {
          setServiceTotalPages(response.data.pagination.pages);
        }
        if (response.data.counts) {
          setStats(response.data.counts);
        }
      }
    } catch (error) {
      console.error("Failed to fetch service logs:", error);
      toast.error("Failed to load service logs");
    } finally {
      setLoading(false);
    }
  };

  const fetchReplacementDemoLogs = async () => {
    setReplacementDemoLoading(true);
    try {
      const response = await serviceApi.get("/replacement-demo-logs", {
        params: {
          page: replacementPage,
          limit: replacementLimit,
          search: debouncedReplacementSearch,
          approvalStatus: replacementApprovalStatusFilter,
          salesPerson: replacementSalesPersonFilter,
          dispatchStatus: dispatchStatusFilter,  // NEW: Dispatch Status Filter
          startDate: replacementStartDate,
          endDate: replacementEndDate
        }
      });
      if (response.data.success) {
        setReplacementDemoLogs(response.data.data || []);
        if (response.data.pagination) {
          setReplacementTotalPages(response.data.pagination.pages);
          setReplacementTotalRecords(response.data.pagination.total);  // NEW: Set actual filtered total
        }
        if (response.data.counts) {
          setReplacementStats(response.data.counts);
        }
      }
    } catch (error) {
      console.error("Failed to fetch replacement logs:", error);
      toast.error("Failed to load replacement logs");
      setReplacementDemoLogs([]); 
    } finally {
      setReplacementDemoLoading(false);
    }
  };

  const fetchIncompleteOrders = async () => {
    setIncompleteOrdersLoading(true);
    try {
      const response = await serviceApi.get("/incomplete-orders", {
        params: {
          page: incompletePage,
          limit: incompleteLimit,
          search: debouncedIncompleteSearch,
          status: incompleteStatusFilter,
          productCategory: incompleteProductCategoryFilter,
          startDate: incompleteStartDate,
          endDate: incompleteEndDate
        }
      });
      if (response.data.success) {
        setIncompleteOrders(response.data.data || []);
        if (response.data.pagination) {
          setIncompleteTotalPages(response.data.pagination.pages);
        }
        if (response.data.stats) {
          setIncompleteStats(response.data.stats);
        }
      }
    } catch (error) {
      console.error("Failed to fetch incomplete orders:", error);
      toast.error("Failed to load incomplete orders");
      setIncompleteOrders([]); 
    } finally {
      setIncompleteOrdersLoading(false);
    }
  };
  
  const fetchUserRole = () => {
    // Get user role from localStorage or context
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user.role || "");
  };

  const handleSearch = (orders) => {
    setSearchResults(orders);
  };

  const handleClearSearch = () => {
    setSearchResults([]);
  };

  const handleManualRequest = () => {
    setShowManualRequestModal(true);
  };

  const handleManualRequestSuccess = () => {
    fetchServiceLogs();
    setShowManualRequestModal(false);
  };

  const handleManualIncompleteRequest = () => {
    setInitialOrderForIncomplete(null);
    setShowCreateIncompleteOrderModal(true);
  };

  const handleIncompleteOrderSuccess = () => {
    setShowCreateIncompleteOrderModal(false);
    setInitialOrderForIncomplete(null);
    fetchIncompleteOrders();
  };

  // Incomplete Orders Handlers
  const handleViewIncompleteOrder = (order) => {
    setSelectedIncompleteOrder(order);
    setShowViewIncompleteOrder(true);
  };

  const handleEditIncompleteOrder = (order) => {
    setSelectedIncompleteOrder(order);
    setShowEditIncompleteOrder(true);
  };

  const handleIncompleteOrderUpdate = () => {
    fetchIncompleteOrders();
    setShowEditIncompleteOrder(false);
  };

  const handleDeleteIncompleteOrder = (order) => {
    setSelectedIncompleteOrder(order);
    setShowDeleteIncompleteOrder(true);
  };

  const handleConfirmDeleteIncompleteOrder = async (order) => {
    try {
      const response = await serviceApi.delete(`/incomplete-orders/${order._id}`);
      if (response.data.success) {
        fetchIncompleteOrders();
        toast.success("Incomplete order deleted successfully!");
      }
    } catch (error) {
      console.error("Failed to delete incomplete order:", error);
      toast.error("Failed to delete incomplete order");
      throw error;
    }
  };

  const handleRefreshIncompleteOrders = async () => {
    setRefreshingIncompleteOrders(true);
    await fetchIncompleteOrders();
    setRefreshingIncompleteOrders(false);
    toast.success("Incomplete orders refreshed successfully!");
  };

  const handleExportIncompleteOrders = async () => {
    try {
      toast.info("Preparing export...");
      const response = await serviceApi.get("/incomplete-orders/export", {
        params: {
          search: debouncedIncompleteSearch,
          status: incompleteStatusFilter,
          productCategory: incompleteProductCategoryFilter,
          startDate: incompleteStartDate,
          endDate: incompleteEndDate
        },
        responseType: "blob",
      });

      const blob = response.data;
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `incomplete-orders-${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);

      toast.success("Incomplete orders exported successfully!");
    } catch (error) {
      toast.error("Failed to export incomplete orders");
      console.error("Export error:", error);
    }
  };

  const handleIncompleteOrderSelectFromCallLog = (order) => {
    setShowCallLogModal(false);
    setInitialOrderForIncomplete(order);
    setShowCreateIncompleteOrderModal(true);
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowViewOrderModal(true);
  };

  const handleCallLog = (order) => {
    setSelectedOrder(order);
    setShowCallLogModal(true);
  };

  const handleCallLogSuccess = () => {
    fetchServiceLogs();
    setShowCallLogModal(false);
    // Toast is already shown in CallLogModal component
  };

  const handleViewLog = (log) => {
    setSelectedLog(log);
    setShowViewLogModal(true);
  };

  const handleEditLog = (log) => {
    setSelectedLog(log);
    setShowEditLogModal(true);
  };

  const handleLogUpdate = () => {
    fetchServiceLogs();
    setShowEditLogModal(false);
    // Toast is already shown in EditServiceLog component
  };

  const handleDeleteLog = async (log) => {
    setSelectedLog(log);
    setShowDeleteLogModal(true);
  };

  const handleConfirmDelete = async (log) => {
    try {
      const response = await serviceApi.delete(`/service-logs/${log._id}`);
      if (response.data.success) {
        fetchServiceLogs();
        toast.success("Service log deleted successfully!");
      }
    } catch (error) {
      console.error("Failed to delete service log:", error);
      toast.error("Failed to delete service log");
      throw error; // Re-throw to let modal handle loading state
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchServiceLogs();
    setRefreshing(false);
    toast.success("Service logs refreshed successfully!");
  };
  
  const handleRefreshReplacementLogs = async () => {
    setRefreshingReplacementLogs(true);
    await fetchReplacementDemoLogs();
    setRefreshingReplacementLogs(false);
    toast.success("Replacement logs refreshed successfully!");
  };
  
  // Replacement/Demo Log Handlers
  const handleViewReplacementDemoLog = (log) => {
    setSelectedReplacementDemoLog(log);
    setShowViewReplacementDemoLog(true);
  };
  
  const handleEditReplacementDemoLog = (log) => {
    setSelectedReplacementDemoLog(log);
    setShowEditReplacementDemoLog(true);
  };
  
  const handleReplacementDemoLogUpdate = () => {
    fetchReplacementDemoLogs();
    setShowEditReplacementDemoLog(false);
    // Trigger notification bell refresh (in case status changed to Approved/Rejected)
    if (onApprovalAction) {
      onApprovalAction();
    }
  };
  
  const handleDeleteReplacementDemoLog = (log) => {
    setSelectedReplacementDemoLog(log);
    setShowDeleteReplacementDemoLog(true);
  };
  
  const handleConfirmDeleteReplacementDemoLog = async (log) => {
    try {
      const response = await serviceApi.delete(`/replacement-demo-logs/${log._id}`);
      if (response.data.success) {
        fetchReplacementDemoLogs();
        toast.success("Replacement log deleted successfully!");
      }
    } catch (error) {
      console.error("Failed to delete replacement log:", error);
      toast.error("Failed to delete replacement log");
      throw error;
    }
  };
  
  const handleApproveReplacementDemoLog = async (log) => {
    try {
      const response = await serviceApi.post(`/replacement-demo-logs/${log._id}/approve`);
      if (response.data.success) {
        fetchReplacementDemoLogs();
        toast.success("Log approved successfully!");
        // Trigger notification bell refresh
        if (onApprovalAction) {
          onApprovalAction();
        }
      }
    } catch (error) {
      console.error("Failed to approve log:", error);
      toast.error(error.response?.data?.message || "Failed to approve log");
    }
  };
  
  const handleRejectReplacementDemoLog = (log) => {
    setLogToReject(log);
    setRejectionRemarks("");
    setShowRejectionModal(true);
  };

  const handleConfirmRejectReplacementDemoLog = async () => {
    if (!rejectionRemarks || rejectionRemarks.trim() === "") {
      toast.warning("Rejection reason is required");
      return;
    }
    
    try {
      const response = await serviceApi.post(`/replacement-demo-logs/${logToReject._id}/reject`, { 
        remarks: rejectionRemarks 
      });
      
      if (response.data.success) {
        fetchReplacementDemoLogs();
        toast.success("Log rejected successfully!");
        setShowRejectionModal(false);
        // Trigger notification bell refresh
        if (onApprovalAction) {
          onApprovalAction();
        }
      }
    } catch (error) {
      console.error("Failed to reject log:", error);
      toast.error(error.response?.data?.message || "Failed to reject log");
    }
  };

  const handleExport = async () => {
    try {
      toast.info("Preparing export...");
      const response = await serviceApi.get("/export-logs", {
        params: {
          search: debouncedServiceLogsSearch,
          status: statusFilter,
          callType: callTypeFilter,
          systemType: systemTypeFilter,
          state: stateFilter,
          partReplacementStatus: partReplacementStatusFilter,
          vendor: vendorFilter,
          startDate: startDate,
          endDate: endDate
        },
        responseType: "blob",
      });

      const blob = response.data;
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `service-logs-${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);

      toast.success("Service logs exported successfully!");
    } catch (error) {
      toast.error("Failed to export service logs");
      console.error(error);
    }
  };
  
  const handleExportReplacementLogs = async () => {
    try {
      toast.info("Preparing replacement logs export...");
      const response = await serviceApi.get("/replacement-demo-logs/export", {
        params: {
          search: debouncedReplacementSearch,
          approvalStatus: replacementApprovalStatusFilter,
          salesPerson: replacementSalesPersonFilter,
          dispatchStatus: dispatchStatusFilter,  // NEW: Dispatch Status Filter
          startDate: replacementStartDate,
          endDate: replacementEndDate
        },
        responseType: "blob",
      });

      const blob = response.data;
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `replacement-logs-${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);

      toast.success("Replacement logs exported successfully!");
    } catch (error) {
      toast.error("Failed to export replacement logs");
      console.error("Export error:", error);
    }
  };

  const statsCards = [
    {
      title: "Service Total Logs",
      value: stats.total,
      icon: <TrendingUp size={24} />,
      gradient: "linear-gradient(135deg, #667eea, #764ba2)",
      color: "#667eea",
      bgColor: "#f0f4ff",
    },
    {
      title: "Incomplete Orders",
      value: incompleteStats.total,
      icon: <Package size={24} />,
      gradient: "linear-gradient(135deg, #f093fb, #f5576c)",
      color: "#f5576c",
      bgColor: "#fff0f5",
    },
     {
      title: "Replacement Total Logs",
      value: replacementDemoLogs.length,
      icon: <Repeat size={24} />,
      gradient: "linear-gradient(135deg, #a1c4fd, #c2e9fb)",
      color: "#a1c4fd",
      bgColor: "#f0f8ff",
    },
    {
      title: "Service Open",
      value: stats.open,
      icon: <AlertCircle size={24} />,
      gradient: "linear-gradient(135deg, #6a11cb, #2575fc)",
      color: "#2575fc",
      bgColor: "#f0f4ff",
    },
    {
      title: "Service In Progress",
      value: stats.inProgress,
      icon: <Clock size={24} />,
      gradient: "linear-gradient(135deg, #ffecd2, #fcb69f)",
      color: "#fcb69f",
      bgColor: "#fff8f0",
    },
    {
      title: "Service Closed",
      value: stats.closed,
      icon: <CheckCircle size={24} />,
      gradient: "linear-gradient(135deg, #84fab0, #8fd3f4)",
      color: "#84fab0",
      bgColor: "#f0fff4",
    },
  ];

  return (
    <>
      <style>
        {`
          .service-dashboard {
            background: #f8fafc;
            min-height: 100vh;
          }
          .dashboard-header {
            color: #1e293b;
            font-weight: 700;
            font-size: 2rem;
            margin-bottom: 2rem;
          }
          .stats-card {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            transition: all 0.2s ease;
            overflow: hidden;
            position: relative;
            height: 100%;
            min-height: 160px;
            background: white;
          }
          .stats-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: var(--card-gradient);
          }
          .stats-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border-color: #cbd5e1;
          }
          .stats-card .card-body {
            padding: 28px 24px;
            text-align: center;
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100%;
          }
          .stats-card .stats-icon {
            width: 52px;
            height: 52px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
            color: white;
            background: var(--card-gradient);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }
          .stats-card .stats-value {
            font-size: 2.25rem;
            font-weight: 700;
            margin: 10px 0 8px;
            color: #1e293b;
          }
          .stats-card .stats-title {
            font-size: 0.9rem;
            font-weight: 500;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.025em;
          }
          .action-btn {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 20px;
            font-weight: 500;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            background: white;
            color: #374151;
          }
          .action-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            border-color: #cbd5e1;
          }
          .refresh-btn {
            background: #3b82f6;
            color: white;
            border-color: #3b82f6;
          }
          .refresh-btn:hover {
            background: #2563eb;
            border-color: #2563eb;
            color: white;
          }
          .export-btn {
            background: #10b981;
            color: white;
            border-color: #10b981;
          }
          .export-btn:hover {
            background: #059669;
            border-color: #059669;
            color: white;
          }
          .section-header {
            background: white;
            border-radius: 12px;
            padding: 20px 24px;
            margin-bottom: 24px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            border: 1px solid #e2e8f0;
            border-left: 4px solid #3b82f6;
          }
          .section-title {
            color: #1e293b;
            font-weight: 600;
            font-size: 1.25rem;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          @media (max-width: 768px) {
            .stats-card .stats-value {
              font-size: 1.875rem;
            }
            .stats-card .card-body {
              padding: 24px 20px;
            }
            .action-btn {
              padding: 8px 16px;
              font-size: 0.875rem;
            }
          }
          @media (max-width: 576px) {
            .stats-card {
              min-height: 140px;
            }
            .stats-card .card-body {
              padding: 20px 16px;
            }
            .stats-card .stats-value {
              font-size: 1.75rem;
            }
            .stats-card .stats-icon {
              width: 44px;
              height: 44px;
              margin-bottom: 12px;
            }
            .stats-card .stats-title {
              font-size: 0.8rem;
            }
          }
        `}
      </style>
      <div className="service-dashboard">
        <Container fluid style={{ padding: "30px" }}>
          
          {/* Global Admin Quick Access */}
          {userRole?.toLowerCase() === "globaladmin" && (
            <div 
              style={{ 
                background: "linear-gradient(135deg, #2575fc, #6a11cb)", 
                padding: "20px 32px", 
                borderRadius: "16px", 
                marginBottom: "30px",
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                boxShadow: "0 10px 25px rgba(37, 117, 252, 0.25)",
                color: "white"
              }}
            >
              <div>
                <h4 style={{ margin: 0, fontWeight: "800", letterSpacing: "-0.5px" }}>Welcome, Global Admin</h4>
                <p style={{ margin: "4px 0 0 0", opacity: 0.9, fontSize: "0.95rem", fontWeight: "500" }}>You have full access to all service and part replacement workflows.</p>
              </div>
              <Button 
                onClick={() => navigate("/service/part-replacement")}
                style={{ 
                  background: "white", 
                  color: "#2575fc", 
                  border: "none", 
                  padding: "12px 24px", 
                  borderRadius: "12px", 
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  transition: "all 0.2s ease",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
                }}
                className="hover-scale"
              >
                <Package size={20} />
                Go to Part Replacement Dashboard
              </Button>
            </div>
          )}

          {/* Dashboard Stats */}
          <Row className="mb-5" style={{ gap: "0", margin: "0 -10px" }}>
            {statsCards.map((card) => (
              <Col key={card.title} style={{ padding: "0 10px", marginBottom: "20px", flex: "1", minWidth: "220px" }}>
                <Card 
                  className="stats-card"
                  style={{ 
                    '--card-gradient': card.gradient,
                    width: '100%',
                    height: '100%'
                  }}
                >
                  <Card.Body>
                    <div className="stats-icon">
                      {card.icon}
                    </div>
                    <div className="stats-value">{card.value}</div>
                    <div className="stats-title">{card.title}</div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Search Section */}
          <div style={{ marginBottom: "30px" }}>
            <SearchSection 
              onSearch={handleSearch} 
              onClear={handleClearSearch}
              onManualRequest={handleManualRequest}
              onManualIncompleteRequest={handleManualIncompleteRequest}
            />
          </div>

          {/* Search Results Table */}
          {searchResults.length > 0 && (
            <div style={{ marginBottom: "40px" }}>
              <SearchResultsTable
                orders={searchResults}
                onView={handleViewOrder}
                onCallLog={handleCallLog}
              />
            </div>
          )}

          {/* Service Logs Section */}
          <div style={{ marginBottom: "40px" }}>
            <div className="section-header">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 className="section-title">
                  Service Logs
                </h4>
                <div className="action-buttons" style={{ display: "flex", gap: "12px" }}>
                  <Button
                    className="action-btn refresh-btn"
                    onClick={handleRefresh}
                    disabled={refreshing}
                  >
                    <RefreshCw size={16} className={refreshing ? "fa-spin" : ""} />
                    {refreshing ? "Refreshing..." : "Refresh"}
                  </Button>
                  <Button
                    className="action-btn export-btn"
                    onClick={handleExport}
                  >
                    <Download size={16} />
                    Export
                  </Button>
                </div>
              </div>
            </div>

            {/* Service Logs Filters */}
            <ServiceLogsFilters
              serviceLogsSearch={serviceLogsSearch}
              setServiceLogsSearch={setServiceLogsSearch}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              callTypeFilter={callTypeFilter}
              setCallTypeFilter={setCallTypeFilter}
              systemTypeFilter={systemTypeFilter}
              setSystemTypeFilter={setSystemTypeFilter}
              stateFilter={stateFilter}
              setStateFilter={setStateFilter}
              partReplacementStatusFilter={partReplacementStatusFilter}
              setPartReplacementStatusFilter={setPartReplacementStatusFilter}
              availableStates={[...new Set(serviceLogs.map(log => log.state).filter(Boolean))]}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              filteredCount={stats.total}
              salespersons={salespersons}
              salesPersonFilter={salesPersonFilter}
              setSalesPersonFilter={setSalesPersonFilter}
              vendorFilter={vendorFilter}
              setVendorFilter={setVendorFilter}
            />
            
            <ServiceLogsTable
              logs={serviceLogs}
              onView={handleViewLog}
              onEdit={handleEditLog}
              onDelete={handleDeleteLog}
              loading={loading}
              page={servicePage}
              setPage={setServicePage}
              totalPages={serviceTotalPages}
              totalRecords={stats.total}
            />
          </div>

          {/* Replacement Logs Section */}
          <div style={{ marginBottom: "40px" }}>
            <div className="section-header">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 className="section-title">
                  Replacement Order Logs
                </h4>
                <div className="action-buttons" style={{ display: "flex", gap: "12px" }}>
                  <Button
                    className="action-btn refresh-btn"
                    onClick={handleRefreshReplacementLogs}
                    disabled={refreshingReplacementLogs}
                  >
                    <RefreshCw size={16} className={refreshingReplacementLogs ? "fa-spin" : ""} />
                    {refreshingReplacementLogs ? "Refreshing..." : "Refresh"}
                  </Button>
                  <Button
                    className="action-btn export-btn"
                    onClick={handleExportReplacementLogs}
                  >
                    <Download size={16} />
                    Export
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Replacement Logs Filters */}
            <ReplacementDemoLogsFilters
              searchTerm={replacementSearchTerm}
              setSearchTerm={setReplacementSearchTerm}
              approvalStatusFilter={replacementApprovalStatusFilter}
              setApprovalStatusFilter={setReplacementApprovalStatusFilter}
              startDate={replacementStartDate}
              setStartDate={setReplacementStartDate}
              endDate={replacementEndDate}
              setEndDate={setReplacementEndDate}
              filteredCount={replacementTotalRecords}
              salespersons={replacementSalespersons}
              salesPersonFilter={replacementSalesPersonFilter}
              setSalesPersonFilter={setReplacementSalesPersonFilter}
              dispatchStatusFilter={dispatchStatusFilter}
              setDispatchStatusFilter={setDispatchStatusFilter}
            />
            
            <ReplacementDemoLogsTable
              logs={replacementDemoLogs}
              onView={handleViewReplacementDemoLog}
              onEdit={handleEditReplacementDemoLog}
              onApprove={handleApproveReplacementDemoLog}
              onReject={handleRejectReplacementDemoLog}
              onDelete={handleDeleteReplacementDemoLog}
              loading={replacementDemoLoading}
              userRole={userRole}
              page={replacementPage}
              setPage={setReplacementPage}
              totalPages={replacementTotalPages}
              totalRecords={replacementTotalRecords}
            />
          </div>

          {/* Incomplete Orders Section */}
          <div style={{ marginBottom: "40px" }}>
            <div className="section-header">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 className="section-title">
                  Incomplete Orders
                </h4>
                <div className="action-buttons" style={{ display: "flex", gap: "12px" }}>
                  <Button
                    className="action-btn refresh-btn"
                    onClick={handleRefreshIncompleteOrders}
                    disabled={refreshingIncompleteOrders}
                  >
                    <RefreshCw size={16} className={refreshingIncompleteOrders ? "fa-spin" : ""} />
                    {refreshingIncompleteOrders ? "Refreshing..." : "Refresh"}
                  </Button>
                  <Button
                    className="action-btn export-btn"
                    onClick={handleExportIncompleteOrders}
                  >
                    <Download size={16} />
                    Export
                  </Button>
                </div>
              </div>
            </div>

            {/* Incomplete Orders Filters */}
            <IncompleteOrdersFilters
              search={incompleteSearch}
              setSearch={setIncompleteSearch}
              statusFilter={incompleteStatusFilter}
              setStatusFilter={setIncompleteStatusFilter}
              productCategoryFilter={incompleteProductCategoryFilter}
              setProductCategoryFilter={setIncompleteProductCategoryFilter}
              startDate={incompleteStartDate}
              setStartDate={setIncompleteStartDate}
              endDate={incompleteEndDate}
              setEndDate={setIncompleteEndDate}
              userRole={userRole}
              filteredCount={incompleteStats.total}
            />

            <IncompleteOrdersTable
              orders={incompleteOrders}
              onView={handleViewIncompleteOrder}
              onEdit={handleEditIncompleteOrder}
              onDelete={handleDeleteIncompleteOrder}
              loading={incompleteOrdersLoading}
              page={incompletePage}
              setPage={setIncompletePage}
              totalPages={incompleteTotalPages}
              totalRecords={incompleteStats.total}
            />
          </div>

          {/* Modals */}
          <CallLogModal
            isOpen={showCallLogModal}
            onClose={() => setShowCallLogModal(false)}
            order={selectedOrder}
            onSuccess={handleCallLogSuccess}
            onIncompleteOrderSelect={handleIncompleteOrderSelectFromCallLog}
          />

          <ViewServiceLog
            isOpen={showViewLogModal}
            onClose={() => setShowViewLogModal(false)}
            log={selectedLog}
          />

          <EditServiceLog
            isOpen={showEditLogModal}
            onClose={() => setShowEditLogModal(false)}
            log={selectedLog}
            onUpdate={handleLogUpdate}
          />

          <DeleteServiceLogModal
            isOpen={showDeleteLogModal}
            onClose={() => setShowDeleteLogModal(false)}
            log={selectedLog}
            onDelete={handleConfirmDelete}
          />

          <ManualServiceRequestModal
            isOpen={showManualRequestModal}
            onClose={() => setShowManualRequestModal(false)}
            onSuccess={handleManualRequestSuccess}
          />

          <CreateIncompleteOrderModal
            isOpen={showCreateIncompleteOrderModal}
            onClose={() => {
              setShowCreateIncompleteOrderModal(false);
              setInitialOrderForIncomplete(null);
            }}
            onSuccess={handleIncompleteOrderSuccess}
            initialOrder={initialOrderForIncomplete}
            userRole={userRole}
          />

          {/* Replacement/Demo Log Modals */}
          <ViewReplacementDemoLog
            isOpen={showViewReplacementDemoLog}
            onClose={() => setShowViewReplacementDemoLog(false)}
            log={selectedReplacementDemoLog}
          />

          <EditReplacementDemoLog
            isOpen={showEditReplacementDemoLog}
            onClose={() => setShowEditReplacementDemoLog(false)}
            log={selectedReplacementDemoLog}
            onUpdate={handleReplacementDemoLogUpdate}
            userRole={userRole}
          />

          <DeleteReplacementDemoLogModal
            isOpen={showDeleteReplacementDemoLog}
            onClose={() => setShowDeleteReplacementDemoLog(false)}
            log={selectedReplacementDemoLog}
            onDelete={handleConfirmDeleteReplacementDemoLog}
          />

          {/* Incomplete Orders Modals */}
          <ViewIncompleteOrderModal
            isOpen={showViewIncompleteOrder}
            onClose={() => setShowViewIncompleteOrder(false)}
            order={selectedIncompleteOrder}
          />

          <EditIncompleteOrderModal
            isOpen={showEditIncompleteOrder}
            onClose={() => setShowEditIncompleteOrder(false)}
            order={selectedIncompleteOrder}
            onUpdate={handleIncompleteOrderUpdate}
          />

          <DeleteIncompleteOrderModal
            isOpen={showDeleteIncompleteOrder}
            onClose={() => setShowDeleteIncompleteOrder(false)}
            order={selectedIncompleteOrder}
            onDelete={handleConfirmDeleteIncompleteOrder}
          />

          {/* Rejection Reason Modal */}
          <Modal 
            show={showRejectionModal} 
            onHide={() => setShowRejectionModal(false)} 
            centered
            backdrop="static"
            size="md"
          >
            <Modal.Header 
              closeButton 
              style={{ 
                background: "linear-gradient(135deg, #ef4444, #dc2626)", 
                color: "white",
                border: "none"
              }}
            >
              <Modal.Title style={{ fontWeight: "700", display: "flex", alignItems: "center", gap: "10px" }}>
                <X size={24} />
                Rejection Reason
              </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ padding: "24px", background: "#f8fafc" }}>
              <p style={{ color: "#475569", marginBottom: "16px", fontSize: "0.95rem" }}>
                Please provide a detailed reason for rejecting this replacement order. This will be visible to the team.
              </p>
              <Form.Group>
                <Form.Control
                  as="textarea"
                  rows={4}
                  placeholder="Enter rejection reason here..."
                  value={rejectionRemarks}
                  onChange={(e) => setRejectionRemarks(e.target.value)}
                  style={{
                    borderRadius: "12px",
                    padding: "16px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.95rem",
                    boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.02)",
                    resize: "none"
                  }}
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer style={{ border: "none", padding: "16px 24px", background: "#f8fafc" }}>
              <Button 
                variant="outline-secondary" 
                onClick={() => setShowRejectionModal(false)}
                style={{ borderRadius: "10px", fontWeight: "600", padding: "10px 20px" }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmRejectReplacementDemoLog}
                disabled={!rejectionRemarks.trim()}
                style={{ 
                  background: "linear-gradient(135deg, #ef4444, #dc2626)", 
                  border: "none", 
                  borderRadius: "10px", 
                  fontWeight: "600", 
                  padding: "10px 24px",
                  boxShadow: "0 4px 12px rgba(239, 68, 68, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <Check size={18} />
                Confirm Rejection
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Reuse SO ViewEntry component */}
          <Suspense fallback={
            <div style={{ 
              display: "flex", 
              justifyContent: "center", 
              alignItems: "center", 
              height: "200px" 
            }}>
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          }>
            <ViewEntry
              isOpen={showViewOrderModal}
              onClose={() => setShowViewOrderModal(false)}
              entry={selectedOrder}
            />
          </Suspense>
        </Container>
      </div>
    </>
  );
};

export default ServiceDashboard;
