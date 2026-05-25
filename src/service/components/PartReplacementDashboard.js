import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Row, Col, Card, Button, Spinner } from "react-bootstrap";
import { RefreshCw, Package, CheckCircle, AlertCircle, Clock, TrendingUp, ArrowLeft, Download } from "lucide-react";
import {
  createAuthenticatedSocket,
  teardownSocket,
  getModuleSocketPath,
} from "../../utils/moduleSocket";
import PartReplacementLogsTable from "./PartReplacementLogsTable";
import PartReplacementLogsFilters from "./PartReplacementLogsFilters";
import EditPartReplacementLog from "./EditPartReplacementLog";
import ViewPartReplacementLog from "./ViewPartReplacementLog";
import DeletePartReplacementLogModal from "./DeletePartReplacementLogModal";
import serviceApi from "../axiosSetup";
import { toast } from "react-toastify";

const PartReplacementDashboard = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user.role || "");
  }, []);
  const [stats, setStats] = useState({
    pending: 0,
    outOfStock: 0
  });

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await serviceApi.get("/part-replacements", {
        params: {
          page,
          limit,
          search,
          partStatus: statusFilter,
          startDate,
          endDate
        }
      });

      if (response.data.success) {
        setLogs(response.data.data);
        setStats(response.data.stats);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
      toast.error("Failed to load part replacement logs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, limit, search, statusFilter, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) fetchLogs();
      else setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Real-time refresh when parts are created or status changes
  useEffect(() => {
    const socketPath = getModuleSocketPath("service");
    const socket = createAuthenticatedSocket({ module: "service" });

    const refreshTable = () => fetchLogs(true);

    socket.on("newPartReplacementRequest", refreshTable);
    socket.on("partReplacementUpdate", refreshTable);

    return () => {
      socket.off("newPartReplacementRequest", refreshTable);
      socket.off("partReplacementUpdate", refreshTable);
      teardownSocket(socket, [], socketPath);
    };
  }, [fetchLogs]);

  const handleEdit = (log) => {
    setSelectedLog(log);
    setShowEditModal(true);
  };

  const handleView = (log) => {
    setSelectedLog(log);
    setShowViewModal(true);
  };

  const handleDeleteClick = (log) => {
    setSelectedLog(log);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async (log) => {
    try {
      await serviceApi.delete(`/part-replacements/${log._id}`);
      toast.success("Log deleted successfully");
      fetchLogs();
    } catch (error) {
      toast.error("Failed to delete log");
    }
  };

  const handleExport = async () => {
    if (logs.length === 0) {
      toast.info("No logs to export for the current filters.");
      return;
    }

    try {
      toast.info("Preparing export...");
      const response = await serviceApi.get("/part-replacements/export", {
        params: {
          search,
          partStatus: statusFilter,
          startDate,
          endDate
        },
        responseType: "blob",
      });

      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `part-replacement-logs-${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Logs exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export logs");
    }
  };

  return (
    <Container fluid className="py-4 px-4" style={{ background: "#f8fafc", minHeight: "calc(100vh - 60px)" }}>
      {/* Enhanced Header Section with Exact Theme Gradient */}
      <div 
        className="header-container-premium mb-5"
        style={{
          background: "linear-gradient(135deg, #2575fc 0%, #6a11cb 100%)",
          padding: "20px 32px",
          borderRadius: "20px",
          boxShadow: "0 10px 25px rgba(37, 117, 252, 0.25)",
          display: "grid",
          gridTemplateColumns: "150px 1fr 300px",
          alignItems: "center",
          position: "relative",
          overflow: "hidden",
          border: "none"
        }}
      >
        {/* Decorative Background Element */}
        <div style={{
          position: "absolute",
          top: "-30px",
          right: "-30px",
          width: "180px",
          height: "180px",
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "50%",
          zIndex: 0
        }} />

        {/* Left Section: Back Button (Fixed Width) */}
        <div style={{ zIndex: 1, display: "flex", justifyContent: "flex-start", width: "150px" }}>
          {userRole?.toLowerCase() === "globaladmin" && (
            <Button 
              variant="light"
              onClick={() => navigate("/service")}
              className="back-btn-premium-theme"
              title="Back to Service Dashboard"
            >
              <ArrowLeft size={18} />
              <span>Back</span>
            </Button>
          )}
        </div>
        
        {/* Center Section: Fixed Title Position */}
        <div style={{ zIndex: 1, textAlign: "center" }}>
          <div className="d-inline-flex align-items-center justify-content-center gap-3">
            <div className="icon-wrapper-premium-theme">
              <Package size={22} />
            </div>
            <h2 className="title-premium-theme">
              Part Replacement Dashboard
            </h2>
          </div>
        </div>

        {/* Right Section: Action Buttons */}
        <div style={{ zIndex: 1, display: "flex", justifyContent: "flex-end", width: "300px", gap: "12px" }}>
          <Button 
            variant="light" 
            onClick={() => fetchLogs(true)} 
            disabled={refreshing}
            className="refresh-btn-premium-theme"
            style={{ width: "135px", justifyContent: "center" }}
          >
            <RefreshCw size={16} className={refreshing ? "spin" : ""} />
            <span style={{ minWidth: "75px", textAlign: "center" }}>
              {refreshing ? "Updating..." : "Refresh"}
            </span>
          </Button>

          <Button 
            variant="light" 
            onClick={handleExport} 
            className="refresh-btn-premium-theme"
            style={{ width: "135px", justifyContent: "center", background: "#10b981", color: "white", border: "none" }}
          >
            <Download size={16} />
            <span style={{ minWidth: "75px", textAlign: "center" }}>
              Export
            </span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <Row className="mb-4 g-4">
        <Col md={6}>
          <Card style={{ border: "none", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)", overflow: "hidden" }}>
            <Card.Body className="p-4" style={{ borderLeft: "5px solid #f59e0b" }}>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-1 fw-bold" style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Pending Parts</p>
                  <h2 className="mb-0" style={{ fontWeight: "800", color: "#1e293b" }}>{stats.pending}</h2>
                </div>
                <div className="p-3 rounded-circle" style={{ background: "#fffbeb", color: "#f59e0b" }}>
                  <Clock size={24} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card style={{ border: "none", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)", overflow: "hidden" }}>
            <Card.Body className="p-4" style={{ borderLeft: "5px solid #ef4444" }}>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-1 fw-bold" style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Out Of Stock</p>
                  <h2 className="mb-0" style={{ fontWeight: "800", color: "#1e293b" }}>{stats.outOfStock}</h2>
                </div>
                <div className="p-3 rounded-circle" style={{ background: "#fef2f2", color: "#ef4444" }}>
                  <AlertCircle size={24} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <PartReplacementLogsFilters 
        search={search} setSearch={setSearch}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        startDate={startDate} setStartDate={setStartDate}
        endDate={endDate} setEndDate={setEndDate}
      />

      {/* Table */}
      <PartReplacementLogsTable 
        logs={logs}
        loading={loading}
        onEdit={handleEdit}
        onView={handleView}
        onDelete={handleDeleteClick}
      />

      {/* View Modal */}
      <ViewPartReplacementLog 
        show={showViewModal}
        onHide={() => setShowViewModal(false)}
        log={selectedLog}
      />

      {/* Edit Modal */}
      <EditPartReplacementLog 
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        log={selectedLog}
        onSuccess={fetchLogs}
      />

      {/* Delete Modal */}
      <DeletePartReplacementLogModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        log={selectedLog}
        onDelete={handleDeleteConfirm}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-4 mb-5">
          <div className="pagination-premium">
            <Button
              variant="light"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="pagination-btn"
            >
              Previous
            </Button>
            <div className="pagination-info">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </div>
            <Button
              variant="light"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="pagination-btn"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <style>
        {`
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

          /* Pagination Styles */
          .pagination-premium {
            background: white;
            padding: 8px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            gap: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            border: 1px solid #e2e8f0;
          }

          .pagination-btn {
            border-radius: 10px !important;
            padding: 8px 16px !important;
            font-weight: 600 !important;
            font-size: 0.9rem !important;
            transition: all 0.2s ease !important;
            border: 1px solid #e2e8f0 !important;
          }

          .pagination-btn:hover:not(:disabled) {
            background: #f8fafc !important;
            border-color: #cbd5e1 !important;
            transform: translateY(-1px);
          }

          .pagination-info {
            color: #64748b;
            font-size: 0.95rem;
          }
          
          .pagination-info strong {
            color: #0f172a;
          }

          /* Premium Header Styles with Theme Gradient */
          .title-premium-theme {
            font-weight: 800;
            color: white;
            margin: 0;
            font-size: 1.75rem;
            letter-spacing: -0.025em;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }

          .icon-wrapper-premium-theme {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            padding: 12px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }

          .back-btn-premium-theme {
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 12px;
            padding: 10px 18px;
            display: flex;
            align-items: center;
            gap: 10px;
            color: white;
            font-weight: 600;
            font-size: 0.95rem;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(5px);
          }

          .back-btn-premium-theme:hover {
            background: rgba(255, 255, 255, 0.25);
            color: white;
            border-color: white;
            transform: translateX(-4px);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          }

          .refresh-btn-premium-theme {
            background: white;
            border: none;
            border-radius: 12px;
            padding: 10px 20px;
            display: flex;
            align-items: center;
            gap: 10px;
            color: #2575fc;
            font-weight: 700;
            font-size: 0.95rem;
            transition: all 0.2s ease;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          }

          .refresh-btn-premium-theme:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
            background: #f8fafc;
            color: #6a11cb;
          }

          .refresh-btn-premium-theme:active {
            transform: translateY(0);
          }

          .hover-scale {
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }
          .hover-scale:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 20px -5px rgba(37, 99, 235, 0.3) !important;
          }
        `}
      </style>
    </Container>
  );
};

export default PartReplacementDashboard;
