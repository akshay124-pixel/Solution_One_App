import React, { useState } from "react";
import { Form, Button, Row, Col, Card } from "react-bootstrap";
import { Search, X, Filter } from "lucide-react";
import { motion } from "framer-motion";
import serviceApi from "../axiosSetup";
import { toast } from "react-toastify";

const SearchSection = ({ onSearch, onClear }) => {
  const [billNumber, setBillNumber] = useState("");
  const [orderId, setOrderId] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!billNumber && !orderId && !serialNumber) {
      toast.warning("Please enter at least one search parameter", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return;
    }

    setLoading(true);
    try {
      const params = {};
      if (billNumber) params.billNumber = billNumber;
      if (orderId) params.orderId = orderId;
      if (serialNumber) params.serialNumber = serialNumber;

      const response = await serviceApi.get("/search-orders", { params });

      if (response.data.success) {
        onSearch(response.data.orders);
        if (response.data.orders.length === 0) {
          toast.info("No orders found matching your criteria", {
            position: "top-right",
            autoClose: 3000,
          });
        } else {
          const breakdown = response.data.breakdown || {};
          const avEdtechCount = breakdown.avEdtech || 0;
          const furnitureCount = breakdown.furniture || 0;
          
          let message = `Found ${response.data.orders.length} order(s)`;
          if (avEdtechCount > 0 && furnitureCount > 0) {
            message += ` (${avEdtechCount} AV&EdTech, ${furnitureCount} Furniture)`;
          } else if (avEdtechCount > 0) {
            message += ` from AV&EdTech`;
          } else if (furnitureCount > 0) {
            message += ` from Furniture`;
          }
          
          toast.success(message, {
            position: "top-right",
            autoClose: 3000,
          });
        }
      }
    } catch (error) {
      toast.error("Search failed. Please try again.", {
        position: "top-right",
        autoClose: 3000,
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setBillNumber("");
    setOrderId("");
    setSerialNumber("");
    onClear();
    toast.info("Search cleared", {
      position: "top-right",
      autoClose: 1500,
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes slideInDown {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeInScale {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          .search-card {
            animation: slideInDown 0.6s ease-out;
            border: none;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            border-left: 5px solid #2575fc;
            overflow: hidden;
            position: relative;
          }
          .search-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #2575fc, #6a11cb, #f093fb);
          }
          .search-header {
            background: linear-gradient(135deg, #2575fc, #6a11cb);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: 800;
            font-size: 1.5rem;
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .search-input {
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            padding: 14px 16px;
            font-size: 0.95rem;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            background: #ffffff;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          }
          .search-input:focus {
            border-color: #2575fc;
            box-shadow: 0 0 0 3px rgba(37, 117, 252, 0.1), 0 4px 16px rgba(0, 0, 0, 0.08);
            transform: translateY(-1px);
          }
          .search-label {
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .search-btn {
            background: linear-gradient(135deg, #2575fc, #6a11cb);
            border: none;
            border-radius: 12px;
            padding: 14px 32px;
            font-weight: 700;
            font-size: 0.95rem;
            color: white;
            transition: all 0.3s ease;
            box-shadow: 0 4px 16px rgba(37, 117, 252, 0.3);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .search-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(37, 117, 252, 0.4);
            background: linear-gradient(135deg, #1d63ed, #5a0fcf);
          }
          .search-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
          }
          .clear-btn {
            background: linear-gradient(135deg, #64748b, #475569);
            border: none;
            border-radius: 12px;
            padding: 14px 24px;
            font-weight: 600;
            color: white;
            transition: all 0.3s ease;
            box-shadow: 0 4px 16px rgba(100, 116, 139, 0.2);
          }
          .clear-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(100, 116, 139, 0.3);
            background: linear-gradient(135deg, #475569, #334155);
          }
          .button-group {
            animation: fadeInScale 0.6s ease-out 0.2s both;
          }
          @media (max-width: 768px) {
            .search-header {
              font-size: 1.3rem;
              text-align: center;
            }
            .search-btn, .clear-btn {
              width: 100%;
              margin-bottom: 10px;
            }
            .button-group {
              flex-direction: column;
            }
          }
        `}
      </style>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="search-card" style={{ marginBottom: "32px" }}>
          <Card.Body style={{ padding: "32px" }}>
            <h4 className="search-header">
              <Filter size={24} />
              Search Orders (AV&EdTech + Furniture)
            </h4>
            <Form>
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="search-label">
                      🧾 Bill Number
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter bill number"
                      value={billNumber}
                      onChange={(e) => setBillNumber(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="search-input"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="search-label">
                      🆔 Order ID
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter order ID"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="search-input"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="search-label">
                      🔢 Serial Number
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter serial number"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="search-input"
                    />
                  </Form.Group>
                </Col>
              </Row>
              <div className="button-group" style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
                <Button
                  onClick={handleSearch}
                  disabled={loading}
                  className="search-btn"
                >
                  <Search size={18} style={{ marginRight: "8px" }} />
                  {loading ? "Searching..." : "Search All Systems"}
                </Button>
                <Button
                  onClick={handleClear}
                  className="clear-btn"
                >
                  <X size={18} style={{ marginRight: "8px" }} />
                  Clear
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </motion.div>
    </>
  );
};

export default SearchSection;
