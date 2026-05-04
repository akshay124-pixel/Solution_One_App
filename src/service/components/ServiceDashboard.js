import React, { useState, useEffect, Suspense } from "react";
import { Container, Row, Col, Card, Button } from "react-bootstrap";
import { Download, RefreshCw, TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react";
import SearchSection from "./SearchSection";
import SearchResultsTable from "./SearchResultsTable";
import ServiceLogsTable from "./ServiceLogsTable";
import ServiceLogsFilters from "./ServiceLogsFilters";
import CallLogModal from "./CallLogModal";
import ViewServiceLog from "./ViewServiceLog";
import EditServiceLog from "./EditServiceLog";
import DeleteServiceLogModal from "./DeleteServiceLogModal";
import ManualServiceRequestModal from "./ManualServiceRequestModal";
import serviceApi from "../axiosSetup";
import { toast } from "react-toastify";

// Lazy load SO ViewEntry component
const ViewEntry = React.lazy(() => import("../../so/components/ViewEntry"));

const ServiceDashboard = () => {
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
  const [serviceLogsSearch, setServiceLogsSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [callTypeFilter, setCallTypeFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [stats, setStats] = useState({
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    total: 0,
  });

  // Filter service logs based on search, status, call type, and date range
  const filteredServiceLogs = serviceLogs.filter((log) => {
    const matchesSearch = !serviceLogsSearch || 
      log.complaintNumber?.toLowerCase().includes(serviceLogsSearch.toLowerCase()) ||
      log.orderId?.toLowerCase().includes(serviceLogsSearch.toLowerCase()) ||
      log.orderDetails?.customername?.toLowerCase().includes(serviceLogsSearch.toLowerCase()) ||
      log.orderDetails?.billNumber?.toLowerCase().includes(serviceLogsSearch.toLowerCase()) ||
      log.issue?.toLowerCase().includes(serviceLogsSearch.toLowerCase());
    
    const matchesStatus = !statusFilter || log.serviceStatus === statusFilter;
    
    const matchesCallType = !callTypeFilter || log.callType === callTypeFilter;
    
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
    
    return matchesSearch && matchesStatus && matchesCallType && matchesDateRange;
  });

  // Fetch service logs on mount
  useEffect(() => {
    fetchServiceLogs();
    fetchDashboardStats();
  }, []);

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
    toast.success("Data refreshed successfully!");
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

  const statsCards = [
    {
      title: "Total Logs",
      value: stats.total,
      icon: <TrendingUp size={24} />,
      gradient: "linear-gradient(135deg, #667eea, #764ba2)",
      color: "#667eea",
      bgColor: "#f0f4ff",
    },
    {
      title: "Open",
      value: stats.open,
      icon: <AlertCircle size={24} />,
      gradient: "linear-gradient(135deg, #f093fb, #f5576c)",
      color: "#f5576c",
      bgColor: "#fff0f3",
    },
    {
      title: "In Progress",
      value: stats.inProgress,
      icon: <Clock size={24} />,
      gradient: "linear-gradient(135deg, #ffecd2, #fcb69f)",
      color: "#fcb69f",
      bgColor: "#fff8f0",
    },
    {
      title: "Resolved",
      value: stats.resolved,
      icon: <CheckCircle size={24} />,
      gradient: "linear-gradient(135deg, #a1c4fd, #c2e9fb)",
      color: "#a1c4fd",
      bgColor: "#f0f8ff",
    },
    {
      title: "Closed",
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
          {/* Dashboard Header */}
          <Row className="mb-4">
            <Col md={12}>
             
            </Col>
          </Row>

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
