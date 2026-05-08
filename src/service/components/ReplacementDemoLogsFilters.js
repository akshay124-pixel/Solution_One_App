import React from "react";
import { X } from "lucide-react";

const ReplacementDemoLogsFilters = ({
  searchTerm,
  setSearchTerm,
  approvalStatusFilter,
  setApprovalStatusFilter,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  filteredCount
}) => {
  const hasActiveFilters = searchTerm || approvalStatusFilter || startDate || endDate;

  const clearAllFilters = () => {
    setSearchTerm("");
    setApprovalStatusFilter("");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div style={{ 
      marginBottom: "20px",
      background: "white",
      padding: "20px",
      borderRadius: "12px",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
      border: "1px solid #e2e8f0"
    }}>
      {/* Single Row with Search and All Filters */}
      <div style={{ 
        display: "flex", 
        gap: "10px", 
        alignItems: "center", 
        flexWrap: "wrap",
        marginBottom: hasActiveFilters ? "16px" : "0"
      }}>
        {/* Search Bar - Expands to fill available space */}
        <div style={{ flex: "1 1 auto", minWidth: "200px" }}>
          <input
            type="text"
            placeholder="Search by Log No, Order ID, Customer, Sales Person..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "0.875rem",
              transition: "border-color 0.15s ease, box-shadow 0.15s ease",
              background: "white"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#3b82f6";
              e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#d1d5db";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>

        {/* Approval Status Filter */}
        <div style={{ flex: "0 0 auto" }}>
          <select
            value={approvalStatusFilter}
            onChange={(e) => setApprovalStatusFilter(e.target.value)}
            style={{
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "0.875rem",
              background: "white",
              minWidth: "150px",
              cursor: "pointer"
            }}
          >
            <option value="">All Status</option>
            <option value="Pending">⏳ Pending</option>
            <option value="Proceed For Approval">📋 Proceed For Approval</option>
            <option value="Approved">✅ Approved</option>
            <option value="Rejected">❌ Rejected</option>
            <option value="Closed">🔒 Closed</option>
          </select>
        </div>

        {/* Start Date Filter */}
        <div style={{ flex: "0 0 auto" }}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="From Date"
            style={{
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "0.875rem",
              background: "white",
              minWidth: "140px",
              cursor: "pointer"
            }}
          />
        </div>

        {/* End Date Filter */}
        <div style={{ flex: "0 0 auto" }}>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="To Date"
            style={{
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "0.875rem",
              background: "white",
              minWidth: "140px",
              cursor: "pointer"
            }}
          />
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            style={{
              padding: "10px 16px",
              background: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.875rem",
              cursor: "pointer",
              fontWeight: "600",
              transition: "background 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              whiteSpace: "nowrap"
            }}
            onMouseEnter={(e) => e.target.style.background = "#dc2626"}
            onMouseLeave={(e) => e.target.style.background = "#ef4444"}
          >
            <X size={16} />
            Clear
          </button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div style={{ 
          padding: "12px", 
          background: "#f8fafc", 
          borderRadius: "8px",
          border: "1px solid #e2e8f0"
        }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{
              fontSize: "0.75rem",
              fontWeight: "600",
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>
              Filters:
            </span>
            {searchTerm && (
              <span style={{
                padding: "4px 10px",
                background: "#3b82f6",
                color: "white",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: "500"
              }}>
                Search: "{searchTerm.length > 20 ? searchTerm.substring(0, 20) + '...' : searchTerm}"
              </span>
            )}
            {approvalStatusFilter && (
              <span style={{
                padding: "4px 10px",
                background: "#8b5cf6",
                color: "white",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: "500"
              }}>
                Status: {approvalStatusFilter}
              </span>
            )}
            {startDate && (
              <span style={{
                padding: "4px 10px",
                background: "#f59e0b",
                color: "white",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: "500"
              }}>
                From: {new Date(startDate).toLocaleDateString("en-GB")}
              </span>
            )}
            {endDate && (
              <span style={{
                padding: "4px 10px",
                background: "#f59e0b",
                color: "white",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: "500"
              }}>
                To: {new Date(endDate).toLocaleDateString("en-GB")}
              </span>
            )}
            <span style={{
              padding: "4px 10px",
              background: "#64748b",
              color: "white",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontWeight: "600"
            }}>
              {filteredCount} results
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReplacementDemoLogsFilters;
