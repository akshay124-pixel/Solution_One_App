import React, { useState } from "react";
import { X, ChevronDown, Search, Calendar } from "lucide-react";
import { CALL_TYPE_OPTIONS, getCallTypeDisplay } from "../utils/callTypes";
import { engineersList } from "../utils/engineersList";

const SELECT_STYLE = {
  padding: "9px 10px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "0.8125rem",
  background: "white",
  cursor: "pointer",
  height: "38px",
  outline: "none",
  color: "#374151",
  width: "100%",
  boxSizing: "border-box",
};

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
  partReplacementStatusFilter,
  setPartReplacementStatusFilter,
  availableStates,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  filteredCount,
  salespersons = [],
  salesPersonFilter,
  setSalesPersonFilter,
  vendorFilter,
  setVendorFilter,
  engineerFilter,
  setEngineerFilter,
}) => {
  const [isSalespersonOpen, setIsSalespersonOpen] = useState(false);
  const [isEngineerOpen, setIsEngineerOpen] = useState(false);

  const hasActiveFilters =
    serviceLogsSearch ||
    statusFilter ||
    callTypeFilter ||
    systemTypeFilter ||
    stateFilter ||
    partReplacementStatusFilter ||
    salesPersonFilter ||
    vendorFilter ||
    engineerFilter ||
    startDate ||
    endDate;

  const clearAllFilters = () => {
    setServiceLogsSearch("");
    setStatusFilter("");
    setCallTypeFilter("");
    setSystemTypeFilter("");
    setStateFilter("");
    setPartReplacementStatusFilter("");
    setStartDate("");
    setEndDate("");
    setSalesPersonFilter("");
    if (setVendorFilter) setVendorFilter("");
    if (setEngineerFilter) setEngineerFilter("");
  };

  const selectedEngineerName = engineerFilter
    ? engineersList.find((e) => String(e.id) === String(engineerFilter))?.name || ""
    : "";

  // ── Shared custom-dropdown trigger style ────────────────────────
  const dropdownTriggerStyle = (isActive) => ({
    padding: "0 10px",
    border: `1px solid ${isActive ? "#3b82f6" : "#d1d5db"}`,
    borderRadius: "8px",
    fontSize: "0.8125rem",
    background: "white",
    height: "38px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    userSelect: "none",
    gap: "6px",
    color: isActive ? "#111827" : "#6b7280",
    width: "100%",
    boxSizing: "border-box",
  });

  return (
    <div
      style={{
        marginBottom: "20px",
        background: "white",
        padding: "16px 20px",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        border: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      {/* ── ROW 1: Search + Status + Type + System + State ─────────── */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {/* Search — grows to fill leftover space */}
        <div style={{ flex: "1 1 0", minWidth: 0, position: "relative" }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#9ca3af",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder="Search by Complaint No, Order ID, Customer, Issue…"
            value={serviceLogsSearch}
            onChange={(e) => setServiceLogsSearch(e.target.value)}
            style={{
              width: "100%",
              height: "38px",
              paddingLeft: "30px",
              paddingRight: "12px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "0.8125rem",
              background: "white",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.15s ease, box-shadow 0.15s ease",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#3b82f6";
              e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#d1d5db";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>

        {/* Status */}
        <div style={{ flex: "0 0 130px" }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ ...SELECT_STYLE, color: statusFilter ? "#111827" : "#6b7280" }}
          >
            <option value="">All Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        {/* Call Type */}
        <div style={{ flex: "0 0 130px" }}>
          <select
            value={callTypeFilter}
            onChange={(e) => setCallTypeFilter(e.target.value)}
            style={{ ...SELECT_STYLE, color: callTypeFilter ? "#111827" : "#6b7280" }}
          >
            <option value="">All Types</option>
            {CALL_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.icon} {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* System */}
        <div style={{ flex: "0 0 150px" }}>
          <select
            value={systemTypeFilter}
            onChange={(e) => setSystemTypeFilter(e.target.value)}
            style={{ ...SELECT_STYLE, color: systemTypeFilter ? "#111827" : "#6b7280" }}
          >
            <option value="">All Systems</option>
            <option value="av&edtech">📺 AV & EdTech</option>
            <option value="furniture">🪑 Furniture</option>
          </select>
        </div>

        {/* State */}
        <div style={{ flex: "0 0 150px" }}>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            style={{ ...SELECT_STYLE, color: stateFilter ? "#111827" : "#6b7280" }}
          >
            <option value="">All States</option>
            {availableStates &&
              [...availableStates].sort().map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* ── ROW 2: Part Status + Vendor + Salesperson + Engineer + Dates + Clear ── */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {/* Part Status */}
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
          <select
            value={partReplacementStatusFilter}
            onChange={(e) => setPartReplacementStatusFilter(e.target.value)}
            style={{ ...SELECT_STYLE, color: partReplacementStatusFilter ? "#111827" : "#6b7280", width: "100%" }}
          >
            <option value="">All Part Status</option>
            <option value="Pending">Pending</option>
            <option value="Out of Stock">Out of Stock</option>
            <option value="In Stock">In Stock</option>
            <option value="Partial Stock">Partial Stock</option>
            <option value="Dispatched">Dispatched</option>
          </select>
        </div>

        {/* Vendor */}
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
          <select
            value={vendorFilter || ""}
            onChange={(e) => setVendorFilter && setVendorFilter(e.target.value)}
            style={{ ...SELECT_STYLE, color: vendorFilter ? "#111827" : "#6b7280", width: "100%" }}
          >
            <option value="">All Vendors</option>
            <option value="Promark">🏭 Promark</option>
            <option value="DLS">🏭 DLS</option>
            <option value="TrueView">🏭 TrueView</option>
            <option value="Newline">🏭 Newline</option>
          </select>
        </div>

        {/* Salesperson custom dropdown */}
        <div style={{ flex: "1 1 0", minWidth: 0, position: "relative" }}>
          <div
            onClick={() => { setIsSalespersonOpen((o) => !o); setIsEngineerOpen(false); }}
            style={dropdownTriggerStyle(!!salesPersonFilter)}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              {salesPersonFilter ? `👤 ${salesPersonFilter}` : "All Salespersons"}
            </span>
            <ChevronDown
              size={14}
              style={{
                flexShrink: 0,
                transform: isSalespersonOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            />
          </div>

          {isSalespersonOpen && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 998 }}
                onClick={() => setIsSalespersonOpen(false)}
              />
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 2px)",
                  left: 0,
                  minWidth: "100%",
                  background: "white",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  zIndex: 999,
                  maxHeight: "220px",
                  overflowY: "auto",
                }}
              >
                {[{ name: "" }, ...salespersons].map((sp) => {
                  const isActive = salesPersonFilter === sp.name;
                  return (
                    <div
                      key={sp.name || "__all__"}
                      onClick={() => { setSalesPersonFilter(sp.name); setIsSalespersonOpen(false); }}
                      style={{
                        padding: "9px 12px",
                        cursor: "pointer",
                        fontSize: "0.8125rem",
                        borderBottom: "1px solid #f3f4f6",
                        background: isActive ? "#eff6ff" : "white",
                        color: isActive ? "#3b82f6" : "#374151",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#f8fafc"; }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "white"; }}
                    >
                      {sp.name ? `👤 ${sp.name}` : "All Salespersons"}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Engineer custom dropdown */}
        <div style={{ flex: "1 1 0", minWidth: 0, position: "relative" }}>
          <div
            onClick={() => { setIsEngineerOpen((o) => !o); setIsSalespersonOpen(false); }}
            style={dropdownTriggerStyle(!!engineerFilter)}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              {engineerFilter ? `🔧 ${selectedEngineerName}` : "All Engineers"}
            </span>
            <ChevronDown
              size={14}
              style={{
                flexShrink: 0,
                transform: isEngineerOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            />
          </div>

          {isEngineerOpen && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 998 }}
                onClick={() => setIsEngineerOpen(false)}
              />
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 2px)",
                  left: 0,
                  minWidth: "100%",
                  background: "white",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  zIndex: 999,
                  maxHeight: "280px",
                  overflowY: "auto",
                }}
              >
                <div
                  onClick={() => { if (setEngineerFilter) setEngineerFilter(""); setIsEngineerOpen(false); }}
                  style={{
                    padding: "9px 12px",
                    cursor: "pointer",
                    fontSize: "0.8125rem",
                    borderBottom: "1px solid #f3f4f6",
                    background: !engineerFilter ? "#eff6ff" : "white",
                    color: !engineerFilter ? "#3b82f6" : "#374151",
                  }}
                  onMouseEnter={(e) => { if (engineerFilter) e.currentTarget.style.background = "#f8fafc"; }}
                  onMouseLeave={(e) => { if (engineerFilter) e.currentTarget.style.background = "white"; }}
                >
                  All Engineers
                </div>

                {["AV", "IT", "Furniture", "Factory", "Furniture / IT"].map((spec) => {
                  const group = engineersList.filter((e) => e.specialization === spec);
                  if (!group.length) return null;
                  return (
                    <React.Fragment key={spec}>
                      <div
                        style={{
                          padding: "5px 12px",
                          fontSize: "0.7rem",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          letterSpacing: "0.6px",
                          color: "#94a3b8",
                          background: "#f8fafc",
                          borderTop: "1px solid #f1f5f9",
                          borderBottom: "1px solid #f1f5f9",
                          pointerEvents: "none",
                        }}
                      >
                        {spec}
                      </div>
                      {group.map((eng) => {
                        const isSelected = String(engineerFilter) === String(eng.id);
                        return (
                          <div
                            key={eng.id}
                            onClick={() => { if (setEngineerFilter) setEngineerFilter(String(eng.id)); setIsEngineerOpen(false); }}
                            style={{
                              padding: "8px 12px",
                              cursor: "pointer",
                              fontSize: "0.8125rem",
                              borderBottom: "1px solid #f3f4f6",
                              background: isSelected ? "#f0f9ff" : "white",
                              color: isSelected ? "#0ea5e9" : "#374151",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#f8fafc"; }}
                            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "white"; }}
                          >
                            🔧 {eng.name}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* From Date */}
        <div style={{ flex: "1 1 0", minWidth: 0, position: "relative" }}>
          <Calendar
            size={13}
            style={{
              position: "absolute",
              left: "9px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#9ca3af",
              pointerEvents: "none",
            }}
          />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              ...SELECT_STYLE,
              paddingLeft: "28px",
              width: "100%",
              boxSizing: "border-box",
              color: startDate ? "#111827" : "#6b7280",
            }}
          />
        </div>

        {/* To Date */}
        <div style={{ flex: "1 1 0", minWidth: 0, position: "relative" }}>
          <Calendar
            size={13}
            style={{
              position: "absolute",
              left: "9px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#9ca3af",
              pointerEvents: "none",
            }}
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              ...SELECT_STYLE,
              paddingLeft: "28px",
              width: "100%",
              boxSizing: "border-box",
              color: endDate ? "#111827" : "#6b7280",
            }}
          />
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            style={{
              flex: "0 0 auto",
              height: "38px",
              padding: "0 14px",
              background: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.8125rem",
              cursor: "pointer",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              whiteSpace: "nowrap",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#dc2626")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#ef4444")}
          >
            <X size={14} />
            Clear
          </button>
        )}
      </div>

      {/* ── Active Filter Tags ──────────────────────────────────────── */}
      {hasActiveFilters && (
        <div
          style={{
            padding: "10px 12px",
            background: "#f8fafc",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: "700",
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginRight: "2px",
              }}
            >
              Active:
            </span>

            {serviceLogsSearch && (
              <Tag color="#3b82f6">
                Search: &ldquo;{serviceLogsSearch.length > 18 ? serviceLogsSearch.slice(0, 18) + "…" : serviceLogsSearch}&rdquo;
              </Tag>
            )}
            {statusFilter && <Tag color="#8b5cf6">Status: {statusFilter}</Tag>}
            {callTypeFilter && (
              <Tag color="#10b981">Type: {getCallTypeDisplay(callTypeFilter)?.text || callTypeFilter}</Tag>
            )}
            {systemTypeFilter && <Tag color="#6366f1">System: {systemTypeFilter === "av&edtech" ? "AV & EdTech" : "Furniture"}</Tag>}
            {stateFilter && <Tag color="#0284c7">State: {stateFilter}</Tag>}
            {partReplacementStatusFilter && <Tag color="#0ea5e9">Part: {partReplacementStatusFilter}</Tag>}
            {vendorFilter && <Tag color="#1e293b">🏭 {vendorFilter}</Tag>}
            {salesPersonFilter && <Tag color="#ec4899">👤 {salesPersonFilter}</Tag>}
            {engineerFilter && <Tag color="#0891b2">🔧 {selectedEngineerName}</Tag>}
            {startDate && (
              <Tag color="#d97706">From: {new Date(startDate).toLocaleDateString("en-GB")}</Tag>
            )}
            {endDate && (
              <Tag color="#d97706">To: {new Date(endDate).toLocaleDateString("en-GB")}</Tag>
            )}

            <span
              style={{
                padding: "3px 10px",
                background: "#64748b",
                color: "white",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: "600",
                marginLeft: "auto",
              }}
            >
              {filteredCount} results
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Small inline tag component to keep JSX clean
const Tag = ({ color, children }) => (
  <span
    style={{
      padding: "3px 9px",
      background: color,
      color: "white",
      borderRadius: "5px",
      fontSize: "0.75rem",
      fontWeight: "500",
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

export default ServiceLogsFilters;
