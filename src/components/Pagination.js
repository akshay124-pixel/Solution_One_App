import React from "react";
import { Button, Form } from "react-bootstrap";
import styled from "styled-components";

const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-top: 20px;
  flex-wrap: wrap;
  gap: 15px;
`;

const PaginationInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 0.95rem;
  color: #495057;
  font-weight: 500;

  .total-count {
    font-size: 1.1rem;
    font-weight: 700;
    color: transparent;
    background: linear-gradient(135deg, #2575fc, #6a11cb);
    -webkit-background-clip: text;
    background-clip: text;
  }

  .page-info {
    font-size: 0.9rem;
    color: #6c757d;
  }
`;

const PaginationControls = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
`;

const PageButton = styled(Button)`
  background: ${(props) =>
    props.disabled
      ? "#e9ecef"
      : "linear-gradient(135deg, #2575fc, #6a11cb)"};
  border: none;
  padding: 10px 20px;
  border-radius: 25px;
  color: ${(props) => (props.disabled ? "#adb5bd" : "#fff")};
  font-weight: 600;
  font-size: 0.95rem;
  min-width: 100px;
  box-shadow: ${(props) =>
    props.disabled ? "none" : "0 4px 10px rgba(37, 117, 252, 0.3)"};
  transition: all 0.3s ease;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(37, 117, 252, 0.4);
    background: linear-gradient(135deg, #1a5fd6, #5a0fb0);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const PageSizeSelector = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  label {
    font-weight: 600;
    color: #495057;
    font-size: 0.95rem;
    white-space: nowrap;
  }

  select {
    padding: 8px 15px;
    border-radius: 20px;
    border: 2px solid #dee2e6;
    font-size: 0.95rem;
    font-weight: 500;
    color: #495057;
    background: #fff;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 80px;

    &:focus {
      outline: none;
      border-color: #2575fc;
      box-shadow: 0 0 0 3px rgba(37, 117, 252, 0.1);
    }

    &:hover {
      border-color: #2575fc;
    }
  }
`;

const PageJumper = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  label {
    font-weight: 600;
    color: #495057;
    font-size: 0.95rem;
    white-space: nowrap;
  }

  input {
    width: 70px;
    padding: 8px 12px;
    border-radius: 20px;
    border: 2px solid #dee2e6;
    font-size: 0.95rem;
    font-weight: 500;
    color: #495057;
    text-align: center;
    transition: all 0.3s ease;

    &:focus {
      outline: none;
      border-color: #2575fc;
      box-shadow: 0 0 0 3px rgba(37, 117, 252, 0.1);
    }

    &:hover {
      border-color: #2575fc;
    }
  }

  button {
    padding: 8px 16px;
    border-radius: 20px;
    border: none;
    background: linear-gradient(135deg, #28a745, #4cd964);
    color: #fff;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 10px rgba(40, 167, 69, 0.3);
    }

    &:active {
      transform: translateY(0);
    }
  }
`;

const Pagination = ({
  currentPage,
  totalPages,
  totalCount,
  limit,
  hasNextPage,
  hasPrevPage,
  onPageChange,
  onLimitChange,
  pageSizeOptions = [10, 25, 50, 100, 200],
}) => {
  const [jumpToPage, setJumpToPage] = React.useState("");

  const handleJumpToPage = () => {
    const pageNum = parseInt(jumpToPage);
    if (pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
      setJumpToPage("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleJumpToPage();
    }
  };

  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, totalCount);

  return (
    <PaginationContainer>
      <PaginationInfo>
        <div className="total-count">
          Total: {totalCount.toLocaleString()} orders
        </div>
        <div className="page-info">
          Showing {startItem.toLocaleString()} - {endItem.toLocaleString()}
        </div>
      </PaginationInfo>

      <PaginationControls>
        <PageButton
          disabled={!hasPrevPage}
          onClick={() => onPageChange(1)}
          title="First Page"
        >
          ⏮ First
        </PageButton>

        <PageButton
          disabled={!hasPrevPage}
          onClick={() => onPageChange(currentPage - 1)}
          title="Previous Page"
        >
          ← Previous
        </PageButton>

        <div
          style={{
            padding: "10px 20px",
            background: "linear-gradient(135deg, #2575fc, #6a11cb)",
            borderRadius: "25px",
            color: "#fff",
            fontWeight: "700",
            fontSize: "1rem",
            minWidth: "120px",
            textAlign: "center",
            boxShadow: "0 4px 10px rgba(37, 117, 252, 0.3)",
          }}
        >
          Page {currentPage} / {totalPages}
        </div>

        <PageButton
          disabled={!hasNextPage}
          onClick={() => onPageChange(currentPage + 1)}
          title="Next Page"
        >
          Next →
        </PageButton>

        <PageButton
          disabled={!hasNextPage}
          onClick={() => onPageChange(totalPages)}
          title="Last Page"
        >
          Last ⏭
        </PageButton>
      </PaginationControls>

      <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
        <PageSizeSelector>
          <label>Items per page:</label>
          <Form.Select
            value={limit}
            onChange={(e) => onLimitChange(parseInt(e.target.value))}
            style={{
              padding: "8px 15px",
              borderRadius: "20px",
              border: "2px solid #dee2e6",
              fontSize: "0.95rem",
              fontWeight: "500",
            }}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Form.Select>
        </PageSizeSelector>

        <PageJumper>
          <label>Go to:</label>
          <input
            type="number"
            min="1"
            max={totalPages}
            value={jumpToPage}
            onChange={(e) => setJumpToPage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={currentPage.toString()}
          />
          <button onClick={handleJumpToPage}>Go</button>
        </PageJumper>
      </div>
    </PaginationContainer>
  );
};

export default Pagination;
