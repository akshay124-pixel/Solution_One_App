import React, { useState, useEffect, Suspense } from "react";
import { Container, Row, Col, Card, Button } from "react-bootstrap";
import { Download, RefreshCw, TrendingUp, Clock, CheckCircle, AlertCircle, Repeat } from "lucide-react";
import SearchSection from "./SearchSection";
import SearchResultsTable from "./SearchResultsTable";
import ServiceLogsTable from "./ServiceLogsTable";
import ServiceLogsFilters from "./ServiceLogsFilters";
import CallLogModal from "./CallLogModal";
import ViewServiceLog from "./ViewServiceLog";
import EditServiceLog from "./EditServiceLog";
import DeleteServiceLogModal from "./DeleteServiceLogModal";
import ManualServiceRequestModal from "./ManualServiceRequestModal";
import ReplacementDemoLogsTable from "./ReplacementDemoLogsTable";
import ReplacementDemoLogsFilters from "./ReplacementDemoLogsFilters";
import ViewReplacementDemoLog from "./ViewReplacementDemoLog";
import EditReplacementDemoLog from "./EditReplacementDemoLog";
import DeleteReplacementDemoLogModal from "./DeleteReplacementDemoLogModal";
import serviceApi from "../axiosSetup";
import { toast } from "react-toastify";

// Lazy load SO ViewEntry component
const ViewEntry = React.lazy(() => import("../../so/components/ViewEntry"));

const ServiceDashboard = ({ refreshTrigger, onApprovalAction }) => {
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
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingReplacementLogs, setRefreshingReplacementLogs] = useState(false);
  const [serviceLogsSearch, setServiceLogsSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [callTypeFilter, setCallTypeFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [stats, setStats] = useState({
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    total: 0,
  });
  
  // Replacement/Demo Logs State
  const [replacementDemoLogs, setReplacementDemoLogs] = useState([]);
  const [selectedReplacementDemoLog, setSelectedReplacementDemoLog] = useState(null);
  const [showViewReplacementDemoLog, setShowViewReplacementDemoLog] = useState(false);
  const [showEditReplacementDemoLog, setShowEditReplacementDemoLog] = useState(false);
  const [showDeleteReplacementDemoLog, setShowDeleteReplacementDemoLog] = useState(false);
  const [replacementDemoLoading, setReplacementDemoLoading] = useState(false);
  const [userRole, setUserRole] = useState("");
  
  // Replacement/Demo Logs Filters
  const [replacementSearchTerm, setReplacementSearchTerm] = useState("");
  const [replacementApprovalStatusFilter, setReplacementApprovalStatusFilter] = useState("");
  const [replacementStartDate, setReplacementStartDate] = useState("");
  const [replacementEndDate, setReplacementEndDate] = useState("");

  // Filter service logs based on search, status, call type, state, and date range
  const filteredServiceLogs = serviceLogs.filter((log) => {
    const matchesSearch = !serviceLogsSearch || 
      log.complaintNumber?.toLowerCase().includes(serviceLogsSearch.toLowerCase()) ||
      log.orderId?.toLowerCase().includes(serviceLogsSearch.toLowerCase()) ||
      log.orderDetails?.customername?.toLowerCase().includes(serviceLogsSearch.toLowerCase()) ||
      log.orderDetails?.billNumber?.toLowerCase().includes(serviceLogsSearch.toLowerCase()) ||
      log.issue?.toLowerCase().includes(serviceLogsSearch.toLowerCase());
    
    const matchesStatus = !statusFilter || log.serviceStatus === statusFilter;
    
    const matchesCallType = !callTypeFilter || log.callType === callTypeFilter;
    
    const matchesState = !stateFilter || log.state === stateFilter;
    
    // Date range filter (based on createdAt)
    let matchesDateRange = true;
    if (startDate || endDate) {
      const logDate = new Date(log.createdAt);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        matchesDateRange = matchesDateRange && logDate >= start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesDateRange = matchesDateRange && logDate <= end;
      }
    }
    
    return matchesSearch && matchesStatus && matchesCallType && matchesState && matchesDateRange;
  });
  
  // Filter replacement/demo logs based on search, approval status, and date range
  const filteredReplacementDemoLogs = replacementDemoLogs.filter((log) => {
    const matchesSearch = !replacementSearchTerm || 
      log.logNumber?.toLowerCase().includes(replacementSearchTerm.toLowerCase()) ||
      log.orderId?.toLowerCase().includes(replacementSearchTerm.toLowerCase()) ||
      log.orderDetails?.customername?.toLowerCase().includes(replacementSearchTerm.toLowerCase()) ||
      log.orderDetails?.salesPerson?.toLowerCase().includes(replacementSearchTerm.toLowerCase());
    
    const matchesApprovalStatus = !replacementApprovalStatusFilter || log.approvalStatus === replacementApprovalStatusFilter;
    
    // Date range filter (based on createdAt)
    let matchesDateRange = true;
    if (replacementStartDate || replacementEndDate) {
      const logDate = new Date(log.createdAt);
      if (replacementStartDate) {
        const start = new Date(replacementStartDate);
        start.setHours(0, 0, 0, 0);
        matchesDateRange = matchesDateRange && logDate >= start;
      }
      if (replacementEndDate) {
        const end = new Date(replacementEndDate);
        end.setHours(23, 59, 59, 999);
        matchesDateRange = matchesDateRange && logDate <= end;
      }
    }
    
    return matchesSearch && matchesApprovalStatus && matchesDateRange;
  });

  // Fetch service logs on mount
  useEffect(() => {
    fetchServiceLogs();
    fetchDashboardStats();
    fetchReplacementDemoLogs();
    fetchUserRole();
  }, []);

  // Refresh when refreshTrigger changes (from navbar approval actions)
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchReplacementDemoLogs();
      fetchDashboardStats();
    }
  }, [refreshTrigger]);

  const fetchServiceLogs = async () => {
    setLoading(true);
    try {
      const response = await serviceApi.get("/service-logs", {
        params: { limit: 100 },
      });
      if (response.data.success) {
        setServiceLogs(response.data.logs);
      }
    } catch (error) {
      console.error("Failed to fetch service logs:", error);
      toast.error("Failed to load service logs");
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await serviceApi.get("/dashboard-stats");
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    }
  };
  
  const fetchReplacementDemoLogs = async () => {
    setReplacementDemoLoading(true);
    try {
      const response = await serviceApi.get("/replacement-demo-logs");
      if (response.data.success) {
        setReplacementDemoLogs(response.data.data || []); // API returns 'data' not 'logs'
      }
    } catch (error) {
      console.error("Failed to fetch replacement logs:", error);
      toast.error("Failed to load replacement logs");
      setReplacementDemoLogs([]); // Ensure we set an empty array on error
    } finally {
      setReplacementDemoLoading(false);
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
    fetchDashboardStats();
    setShowManualRequestModal(false);
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
    fetchDashboardStats();
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
    fetchDashboardStats();
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
        fetchDashboardStats();
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
    await Promise.all([fetchServiceLogs(), fetchDashboardStats()]);
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
  
  const handleRejectReplacementDemoLog = async (log) => {
    const remarks = prompt("Please enter rejection reason:");
    if (!remarks || remarks.trim() === "") {
      toast.warning("Rejection reason is required");
      return;
    }
    
    try {
      const response = await serviceApi.post(`/replacement-demo-logs/${log._id}/reject`, { remarks });
      if (response.data.success) {
        fetchReplacementDemoLogs();
        toast.success("Log rejected successfully!");
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
      
      // Use ExcelJS for export
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Replacement Logs");
      
      // Define columns
      worksheet.columns = [
        { header: "#", key: "index", width: 8 },
        { header: "Log Number", key: "logNumber", width: 15 },
        { header: "Order ID", key: "orderId", width: 15 },
        { header: "Order Type", key: "orderType", width: 15 },
        { header: "Customer Name", key: "customerName", width: 25 },
        { header: "Sales Person", key: "salesPerson", width: 20 },
        { header: "Approval Status", key: "approvalStatus", width: 20 },
        { header: "Created Date", key: "createdDate", width: 15 },
        { header: "Remarks", key: "remarks", width: 30 },
        { header: "Total Amount", key: "totalAmount", width: 15 },
      ];
      
      // Style header row
      worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF667eea" },
      };
      worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
      worksheet.getRow(1).height = 25;
      
      // Add data rows
      filteredReplacementDemoLogs.forEach((log, index) => {
        worksheet.addRow({
          index: index + 1,
          logNumber: log.logNumber || "N/A",
          orderId: log.orderId || "N/A",
          orderType: log.orderDetails?.orderType || "N/A",
          customerName: log.orderDetails?.customername || "N/A",
          salesPerson: log.orderDetails?.salesPerson || "N/A",
          approvalStatus: log.approvalStatus || "N/A",
          createdDate: log.createdAt 
            ? new Date(log.createdAt).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "N/A",
          remarks: log.remarks || "N/A",
          totalAmount: log.orderDetails?.total || "N/A",
        });
      });
      
      // Add borders to all cells
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
          if (rowNumber > 1) {
            cell.alignment = { vertical: "middle", horizontal: "left" };
          }
        });
      });
      
      // Generate buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
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
      console.error(error);
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
      gradient: "linear-gradient(135deg, #f093fb, #f5576c)",
      color: "#f5576c",
      bgColor: "#fff0f3",
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
              stateFilter={stateFilter}
              setStateFilter={setStateFilter}
              availableStates={[...new Set(serviceLogs.map(log => log.state).filter(Boolean))]}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              filteredCount={filteredServiceLogs.length}
            />
            
            <ServiceLogsTable
              logs={filteredServiceLogs}
              onView={handleViewLog}
              onEdit={handleEditLog}
              onDelete={handleDeleteLog}
              loading={loading}
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
              filteredCount={filteredReplacementDemoLogs.length}
            />
            
            <ReplacementDemoLogsTable
              logs={filteredReplacementDemoLogs}
              onView={handleViewReplacementDemoLog}
              onEdit={handleEditReplacementDemoLog}
              onApprove={handleApproveReplacementDemoLog}
              onReject={handleRejectReplacementDemoLog}
              onDelete={handleDeleteReplacementDemoLog}
              loading={replacementDemoLoading}
              userRole={userRole}
            />
          </div>

          {/* Modals */}
          <CallLogModal
            isOpen={showCallLogModal}
            onClose={() => setShowCallLogModal(false)}
            order={selectedOrder}
            onSuccess={handleCallLogSuccess}
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
