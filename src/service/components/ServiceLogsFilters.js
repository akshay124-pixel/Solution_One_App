import React, { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { CALL_TYPE_OPTIONS, getCallTypeDisplay } from "../utils/callTypes";

const ServiceLogsFilters = ({
  serviceLogsSearch,
  setServiceLogsSearch,
  statusFilter,
  setStatusFilter,
  callTypeFilter,
  setCallTypeFilter,
  systemTypeFilter,
  setSystemTypeFilter,
  stateFilter,
  setStateFilter,
  availableStates,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  filteredCount,
  salespersons = [],
  salesPersonFilter,
  setSalesPersonFilter
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const hasActiveFilters = serviceLogsSearch || statusFilter || callTypeFilter || systemTypeFilter || stateFilter || salesPersonFilter || startDate || endDate;

  const clearAllFilters = () => {
    setServiceLogsSearch("");
    setStatusFilter("");
    setCallTypeFilter("");
    setSystemTypeFilter("");
    setStateFilter("");
    setStartDate("");
    setEndDate("");
    setSalesPersonFilter("");
  };

  const handleSalespersonSelect = (value) => {
    setSalesPersonFilter(value);
    setIsDropdownOpen(false);
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
            placeholder="Search by Complaint No, Order ID, Customer, Issue..."
            value={serviceLogsSearch}
            onChange={(e) => setServiceLogsSearch(e.target.value)}
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

        {/* Status Filter */}
        <div style={{ flex: "0 0 auto" }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "0.875rem",
              background: "white",
              minWidth: "120px",
              cursor: "pointer"
            }}
          >
            <option value="">All Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        {/* Call Type Filter */}
        <div style={{ flex: "0 0 auto" }}>
          <select
            value={callTypeFilter}
            onChange={(e) => setCallTypeFilter(e.target.value)}
            style={{
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "0.875rem",
              background: "white",
              minWidth: "120px",
              cursor: "pointer"
            }}
          >
            <option value="">All Types</option>
            {CALL_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
            ))}
          </select>
        </div>

        {/* System Filter */}
        <div style={{ flex: "0 0 auto" }}>
          <select
            value={systemTypeFilter}
            onChange={(e) => setSystemTypeFilter(e.target.value)}
            style={{
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "0.875rem",
              background: "white",
              minWidth: "140px",
              cursor: "pointer"
            }}
          >
            <option value="">All Systems</option>
            <option value="av&edtech">📺 AV & EdTech</option>
            <option value="furniture">🪑 Furniture</option>
          </select>
        </div>

        {/* State Filter */}
        <div style={{ flex: "0 0 auto" }}>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            style={{
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "0.875rem",
              background: "white",
              minWidth: "140px",
              cursor: "pointer"
            }}
          >
            <option value="">All States</option>
            {availableStates && availableStates.sort().map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>

        {/* Salesperson Filter */}
        <div style={{ flex: "0 0 auto", position: "relative" }}>
          <div
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "0.875rem",
              background: "white",
              minWidth: "220px",
              width: "220px",
              height: "42px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              userSelect: "none"
            }}
          >
            <span style={{ color: salesPersonFilter ? "#000" : "#6b7280" }}>
              {salesPersonFilter ? `👤 ${salesPersonFilter}` : "All Salespersons"}
            </span>
            <ChevronDown 
              size={16} 
              style={{ 
                transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease"
              }} 
            />
          </div>
          
          {isDropdownOpen && (
            <>
              <div 
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 999
                }}
                onClick={() => setIsDropdownOpen(false)}
              />
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: "white",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  zIndex: 1000,
                  maxHeight: "200px",
                  overflowY: "auto",
                  marginTop: "2px"
                }}
              >
                <div
                  onClick={() => handleSalespersonSelect("")}
                  style={{
                    padding: "10px 12px",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    borderBottom: "1px solid #f3f4f6",
                    background: !salesPersonFilter ? "#f8fafc" : "white",
                    color: !salesPersonFilter ? "#3b82f6" : "#374151"
                  }}
                  onMouseEnter={(e) => {
                    if (!salesPersonFilter) return;
                    e.target.style.background = "#f8fafc";
                  }}
                  onMouseLeave={(e) => {
                    if (!salesPersonFilter) return;
                    e.target.style.background = "white";
                  }}
                >
                  All Salespersons
                </div>
                {salespersons.map((sp) => (
                  <div
                    key={sp.name}
                    onClick={() => handleSalespersonSelect(sp.name)}
                    style={{
                      padding: "10px 12px",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      borderBottom: "1px solid #f3f4f6",
                      background: salesPersonFilter === sp.name ? "#f8fafc" : "white",
                      color: salesPersonFilter === sp.name ? "#3b82f6" : "#374151"
                    }}
                    onMouseEnter={(e) => {
                      if (salesPersonFilter === sp.name) return;
                      e.target.style.background = "#f8fafc";
                    }}
                    onMouseLeave={(e) => {
                      if (salesPersonFilter === sp.name) return;
                      e.target.style.background = "white";
                    }}
                  >
                    👤 {sp.name}
                  </div>
                ))}
              </div>
            </>
          )}
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
            {serviceLogsSearch && (
              <span style={{
                padding: "4px 10px",
                background: "#3b82f6",
                color: "white",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: "500"
              }}>
                Search: "{serviceLogsSearch.length > 20 ? serviceLogsSearch.substring(0, 20) + '...' : serviceLogsSearch}"
              </span>
            )}
            {statusFilter && (
              <span style={{
                padding: "4px 10px",
                background: "#8b5cf6",
                color: "white",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: "500"
              }}>
                Status: {statusFilter}
              </span>
            )}
            {callTypeFilter && (
              <span style={{
                padding: "4px 10px",
                background: "#10b981",
                color: "white",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: "500"
              }}>
                Type: {getCallTypeDisplay(callTypeFilter)?.text || callTypeFilter}
              </span>
            )}
            {stateFilter && (
              <span style={{
                padding: "4px 10px",
                background: "#6366f1",
                color: "white",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: "500"
              }}>
                State: {stateFilter}
              </span>
            )}
            {salesPersonFilter && (
              <span style={{
                padding: "4px 10px",
                background: "#ec4899",
                color: "white",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: "500"
              }}>
                Salesperson: {salesPersonFilter}
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

export default ServiceLogsFilters;
