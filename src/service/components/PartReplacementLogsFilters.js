import React from "react";
import { Row, Col, Form, InputGroup } from "react-bootstrap";
import { Search, Filter, Calendar } from "lucide-react";

const PartReplacementLogsFilters = ({ 
  search, setSearch, 
  statusFilter, setStatusFilter, 
  startDate, setStartDate, 
  endDate, setEndDate 
}) => {
  return (
    <div 
      style={{
        background: "white",
        padding: "20px",
        borderRadius: "12px",
        boxShadow: "0 4px 15px rgba(0, 0, 0, 0.05)",
        marginBottom: "20px",
        border: "1px solid #eef2f7"
      }}
    >
      <Row className="g-3">
        <Col md={4}>
          <Form.Group>
            <Form.Label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#64748b", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Search size={14} /> SEARCH LOGS
            </Form.Label>
            <InputGroup>
              <Form.Control
                type="text"
                placeholder="Search Complaint ID, Customer, Part..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ borderRadius: "8px", border: "1.5px solid #e2e8f0", fontSize: "0.9rem", padding: "10px 15px" }}
              />
            </InputGroup>
          </Form.Group>
        </Col>

        <Col md={3}>
          <Form.Group>
            <Form.Label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#64748b", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Filter size={14} /> PART STATUS
            </Form.Label>
            <Form.Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ borderRadius: "8px", border: "1.5px solid #e2e8f0", fontSize: "0.9rem", padding: "10px 15px" }}
            >
              <option value="">All Logs</option>
              <option value="Pending">Pending</option>
              <option value="Out of Stock">Out of Stock</option>
              <option value="In Stock">In Stock</option>
              <option value="Partial Stock">Partial Stock</option>
              <option value="Dispatched">Dispatched</option>
            </Form.Select>
          </Form.Group>
        </Col>

        <Col md={5}>
          <Form.Group>
            <Form.Label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#64748b", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Calendar size={14} /> DATE RANGE
            </Form.Label>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <Form.Control
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ borderRadius: "8px", border: "1.5px solid #e2e8f0", fontSize: "0.9rem", padding: "10px 15px" }}
              />
              <span style={{ color: "#94a3b8" }}>to</span>
              <Form.Control
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ borderRadius: "8px", border: "1.5px solid #e2e8f0", fontSize: "0.9rem", padding: "10px 15px" }}
              />
            </div>
          </Form.Group>
        </Col>
      </Row>
    </div>
  );
};

export default PartReplacementLogsFilters;
