import React from "react";
import { Form, Button, Dropdown, OverlayTrigger } from "react-bootstrap";
import { FaBell } from "react-icons/fa";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ArrowRight } from "lucide-react";
import styled from "styled-components";

// Styled components
const FilterContainer = styled.div`
  background: rgb(230, 240, 250);
  padding: 0.75rem 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  border-radius: 0.75rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  font-family: "Inter", sans-serif;

  @media (min-width: 1920px) {
    padding: 0.85rem 1.2rem;
    gap: 0.85rem;
  }

  @media (max-width: 1600px) {
    padding: 0.7rem 0.95rem;
    gap: 0.7rem;
  }

  @media (max-width: 1440px) {
    padding: 0.65rem 0.85rem;
    gap: 0.65rem;
  }

  @media (max-width: 1366px) {
    padding: 0.6rem 0.8rem;
    gap: 0.6rem;
  }

  @media (max-width: 1280px) {
    padding: 0.6rem 0.75rem;
    gap: 0.55rem;
  }

  @media (max-width: 1199px) {
    padding: 0.65rem 0.8rem;
    gap: 0.6rem;
  }

  @media (max-width: 991px) {
    padding: 0.7rem 0.85rem;
    gap: 0.65rem;
  }

  @media (max-width: 767px) {
    padding: 0.75rem 0.9rem;
    gap: 0.7rem;
  }

  @media (max-width: 575px) {
    padding: 0.7rem;
    gap: 0.6rem;
  }
`;

const SearchInput = styled(Form.Control)`
  width: 100%;
  flex: 1;
  max-width: 280px;
  min-width: 180px;
  padding: 0.65rem 0.9rem;
  border-radius: 0.75rem;
  border: none;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.3s ease-in-out;

  &:focus {
    box-shadow: 0 0 12px rgba(59, 130, 246, 0.3);
    outline: none;
  }

  &::placeholder {
    color: #9ca3af;
  }

  @media (min-width: 1920px) {
    max-width: 320px;
    min-width: 220px;
    font-size: 0.95rem;
    padding: 0.75rem 1rem;
  }

  @media (max-width: 1600px) {
    max-width: 260px;
    min-width: 170px;
    font-size: 0.85rem;
    padding: 0.6rem 0.85rem;
  }

  @media (max-width: 1440px) {
    max-width: 240px;
    min-width: 160px;
    font-size: 0.825rem;
    padding: 0.6rem 0.8rem;
  }

  @media (max-width: 1366px) {
    max-width: 220px;
    min-width: 150px;
    font-size: 0.8rem;
    padding: 0.55rem 0.75rem;
  }

  @media (max-width: 1280px) {
    max-width: 200px;
    min-width: 140px;
    font-size: 0.775rem;
    padding: 0.55rem 0.7rem;
  }

  @media (max-width: 1199px) {
    max-width: 220px;
    min-width: 160px;
    font-size: 0.85rem;
    padding: 0.6rem 0.8rem;
  }

  @media (max-width: 991px) {
    max-width: 200px;
    min-width: 150px;
    font-size: 0.825rem;
    padding: 0.6rem 0.75rem;
  }

  @media (max-width: 767px) {
    max-width: 100%;
    min-width: 100%;
    flex: none;
    font-size: 0.875rem;
    padding: 0.65rem 0.85rem;
  }

  @media (max-width: 575px) {
    font-size: 0.85rem;
    padding: 0.6rem 0.8rem;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  min-width: 0;

  @media (min-width: 1920px) {
    gap: 0.85rem;
  }

  @media (max-width: 1600px) {
    gap: 0.7rem;
  }

  @media (max-width: 1440px) {
    gap: 0.65rem;
  }

  @media (max-width: 1366px) {
    gap: 0.6rem;
  }

  @media (max-width: 1280px) {
    gap: 0.55rem;
  }

  @media (max-width: 1199px) {
    gap: 0.6rem;
    justify-content: flex-start;
  }

  @media (max-width: 991px) {
    gap: 0.65rem;
  }

  @media (max-width: 767px) {
    flex-direction: column;
    width: 100%;
    gap: 0.7rem;
  }

  @media (max-width: 575px) {
    gap: 0.6rem;
  }
`;

const DatePickerWrapper = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;

  .react-datepicker-wrapper {
    width: 110px;
  }

  input {
    padding: 0.65rem 0.7rem;
    border-radius: 0.75rem;
    border: 1px solid #e5e7eb;
    background: #f9fafb;
    font-size: 0.825rem;
    width: 100%;
    transition: all 0.3s ease-in-out;

    &:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 8px rgba(59, 130, 246, 0.2);
      outline: none;
    }

    &::placeholder {
      color: #9ca3af;
    }
  }

  @media (min-width: 1920px) {
    gap: 0.6rem;
    .react-datepicker-wrapper {
      width: 135px;
    }
    input {
      font-size: 0.9rem;
      padding: 0.75rem 0.85rem;
    }
  }

  @media (max-width: 1600px) {
    gap: 0.45rem;
    .react-datepicker-wrapper {
      width: 105px;
    }
    input {
      font-size: 0.8rem;
      padding: 0.6rem 0.65rem;
    }
  }

  @media (max-width: 1440px) {
    gap: 0.4rem;
    .react-datepicker-wrapper {
      width: 100px;
    }
    input {
      font-size: 0.775rem;
      padding: 0.6rem 0.6rem;
    }
  }

  @media (max-width: 1366px) {
    gap: 0.4rem;
    .react-datepicker-wrapper {
      width: 95px;
    }
    input {
      font-size: 0.75rem;
      padding: 0.55rem 0.55rem;
    }
  }

  @media (max-width: 1280px) {
    gap: 0.35rem;
    .react-datepicker-wrapper {
      width: 92px;
    }
    input {
      font-size: 0.725rem;
      padding: 0.55rem 0.5rem;
    }
  }

  @media (max-width: 1199px) {
    gap: 0.45rem;
    .react-datepicker-wrapper {
      width: 105px;
    }
    input {
      font-size: 0.8rem;
      padding: 0.6rem 0.65rem;
    }
  }

  @media (max-width: 991px) {
    gap: 0.5rem;
    .react-datepicker-wrapper {
      width: 110px;
    }
    input {
      font-size: 0.825rem;
      padding: 0.6rem 0.7rem;
    }
  }

  @media (max-width: 767px) {
    width: 100%;
    gap: 0.6rem;
    .react-datepicker-wrapper {
      flex: 1;
    }
    input {
      font-size: 0.875rem;
      padding: 0.65rem 0.75rem;
    }
  }

  @media (max-width: 575px) {
    flex-direction: column;
    gap: 0.6rem;
    .react-datepicker-wrapper {
      width: 100%;
    }
    input {
      font-size: 0.85rem;
      padding: 0.6rem 0.7rem;
    }
  }
`;

const StyledButton = styled(Button)`
  background: linear-gradient(135deg, #2575fc, #6a11cb);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.65rem 0.9rem;
  border-radius: 0.75rem;
  color: white;
  font-weight: 600;
  font-size: 0.825rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  transition: all 0.3s ease-in-out;
  white-space: nowrap;
  min-width: 90px;

  &:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    opacity: 0.92;
  }

  &:active {
    transform: scale(0.98);
  }

  @media (min-width: 1920px) {
    font-size: 0.9rem;
    padding: 0.75rem 1rem;
    min-width: 105px;
  }

  @media (max-width: 1600px) {
    font-size: 0.8rem;
    padding: 0.6rem 0.85rem;
    min-width: 85px;
  }

  @media (max-width: 1440px) {
    font-size: 0.775rem;
    padding: 0.6rem 0.8rem;
    min-width: 82px;
  }

  @media (max-width: 1366px) {
    font-size: 0.75rem;
    padding: 0.55rem 0.75rem;
    min-width: 78px;
  }

  @media (max-width: 1280px) {
    font-size: 0.725rem;
    padding: 0.55rem 0.7rem;
    min-width: 75px;
    gap: 0.35rem;
  }

  @media (max-width: 1199px) {
    font-size: 0.8rem;
    padding: 0.6rem 0.85rem;
    min-width: 85px;
  }

  @media (max-width: 991px) {
    font-size: 0.825rem;
    padding: 0.6rem 0.9rem;
    min-width: 90px;
  }

  @media (max-width: 767px) {
    width: 100%;
    font-size: 0.875rem;
    padding: 0.65rem 0.95rem;
    min-width: auto;
  }

  @media (max-width: 575px) {
    font-size: 0.85rem;
    padding: 0.6rem 0.85rem;
  }
`;

const StyledDropdownToggle = styled(Dropdown.Toggle)`
  background: linear-gradient(135deg, #2575fc, #6a11cb);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.65rem 0.8rem;
  border-radius: 0.75rem;
  color: white;
  font-weight: 600;
  font-size: 0.825rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease-in-out;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  min-width: 130px;

  &:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    opacity: 0.92;
  }

  &:active {
    transform: scale(0.98);
  }

  @media (min-width: 1920px) {
    min-width: 155px;
    font-size: 0.9rem;
    padding: 0.75rem 0.95rem;
  }

  @media (max-width: 1600px) {
    min-width: 125px;
    font-size: 0.8rem;
    padding: 0.6rem 0.75rem;
  }

  @media (max-width: 1440px) {
    min-width: 120px;
    font-size: 0.775rem;
    padding: 0.6rem 0.7rem;
  }

  @media (max-width: 1366px) {
    min-width: 115px;
    font-size: 0.75rem;
    padding: 0.55rem 0.65rem;
  }

  @media (max-width: 1280px) {
    min-width: 110px;
    font-size: 0.725rem;
    padding: 0.55rem 0.6rem;
  }

  @media (max-width: 1199px) {
    min-width: 125px;
    font-size: 0.8rem;
    padding: 0.6rem 0.75rem;
  }

  @media (max-width: 991px) {
    min-width: 130px;
    font-size: 0.825rem;
    padding: 0.6rem 0.8rem;
  }

  @media (max-width: 767px) {
    width: 100%;
    min-width: auto;
    font-size: 0.875rem;
    padding: 0.65rem 0.85rem;
  }

  @media (max-width: 575px) {
    font-size: 0.85rem;
    padding: 0.7rem 0.9rem;
  }
`;

const StyledDropdownMenu = styled(Dropdown.Menu)`
  border-radius: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  background: white;
  border: none;
  padding: 0.5rem;
  min-width: 180px;
  max-height: 360px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: #2575fc;
    border-radius: 4px;
  }

  @media (max-width: 768px) {
    min-width: 100%;
  }

  @media (max-width: 576px) {
    min-width: 100%;
    padding: 0.4rem;
  }
`;

const StyledDropdownItem = styled(Dropdown.Item)`
  padding: 0.5rem 0.75rem;
  color: #1e40af;
  font-weight: 500;
  font-size: 0.9rem;
  transition: background 0.3s ease-in-out;

  &:hover {
    background: rgba(59, 130, 246, 0.1);
  }

  &:focus,
  &:active {
    background: rgba(59, 130, 246, 0.2);
    color: #1e40af;
  }

  @media (max-width: 768px) {
    font-size: 0.95rem;
    padding: 0.6rem 0.8rem;
  }

  @media (max-width: 576px) {
    font-size: 0.9rem;
    padding: 0.5rem 0.7rem;
  }
`;

const NotificationWrapper = styled.div`
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0.3rem;

  @media (min-width: 1920px) {
    padding: 0.4rem;
  }

  @media (max-width: 1600px) {
    padding: 0.25rem;
  }

  @media (max-width: 1440px) {
    padding: 0.25rem;
  }

  @media (max-width: 1366px) {
    padding: 0.2rem;
  }

  @media (max-width: 1280px) {
    padding: 0.2rem;
  }

  @media (max-width: 767px) {
    padding: 0.3rem;
    justify-content: center;
  }
`;

const NotificationIcon = styled(FaBell)`
  font-size: 1.15rem;
  color: #4b5563;
  transition: all 0.3s ease-in-out;

  &:hover {
    color: #3b82f6;
    transform: scale(1.1);
  }

  @media (min-width: 1920px) {
    font-size: 1.3rem;
  }

  @media (max-width: 1600px) {
    font-size: 1.1rem;
  }

  @media (max-width: 1440px) {
    font-size: 1.08rem;
  }

  @media (max-width: 1366px) {
    font-size: 1.05rem;
  }

  @media (max-width: 1280px) {
    font-size: 1rem;
  }

  @media (max-width: 767px) {
    font-size: 1.2rem;
  }
`;

const NotificationBadge = styled.span`
  position: absolute;
  top: -2px;
  right: -2px;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  padding: 2px 5px;
  font-size: 0.65rem;
  font-weight: 600;
  line-height: 1.2;

  @media (min-width: 1920px) {
    padding: 2px 6px;
    font-size: 0.7rem;
  }

  @media (max-width: 1600px) {
    padding: 2px 5px;
    font-size: 0.63rem;
  }

  @media (max-width: 1440px) {
    padding: 1px 4px;
    font-size: 0.62rem;
  }

  @media (max-width: 1366px) {
    padding: 1px 4px;
    font-size: 0.6rem;
  }

  @media (max-width: 1280px) {
    padding: 1px 4px;
    font-size: 0.58rem;
  }

  @media (max-width: 767px) {
    padding: 2px 5px;
    font-size: 0.68rem;
  }
`;

// Reusable Dropdown Component
const FilterDropdown = ({ id, label, value, onChange, options, tableId, displayMap = {} }) => (
  <Dropdown>
    <StyledDropdownToggle id={id} aria-controls={tableId}>
      {value === "All" ? label : (displayMap[value] || value)}
    </StyledDropdownToggle>
    <StyledDropdownMenu>
      {options.map((option) => (
        <StyledDropdownItem
          key={option}
          onClick={() => onChange(option)}
          aria-label={`Select ${label} filter: ${option}`}
        >
          {displayMap[option] || option}
        </StyledDropdownItem>
      ))}
    </StyledDropdownMenu>
  </Dropdown>
);

// Filter Section Component
const FilterSection = ({
  debouncedSetSearchTerm,
  userRole,
  notificationPopover,
  notifications,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  productionStatusFilter,
  setProductionStatusFilter,
  installStatusFilter,
  setInstallStatusFilter,
  productStatus,
  setProductStatusFilter,
  accountsStatusFilter,
  setAccountsStatusFilter,
  dispatchFilter,
  setDispatchFilter,
  financialYearFilter,
  setFinancialYearFilter,
  financialYearOptions = [],
  salesPersonFilter,
  setSalesPersonFilter,
  uniqueSalesPersons = ["All"],
  handleReset,
  tableId = "orders-table",
}) => {
  return (
    <FilterContainer>
      <SearchInput
        type="text"
        placeholder="Search Orders..."
        onChange={(e) => debouncedSetSearchTerm(e.target.value)}
        aria-label="Search orders by keyword"
      />
      <FilterGroup>
        <OverlayTrigger
          trigger="click"
          placement="bottom"
          overlay={notificationPopover}
          rootClose
        >
          <NotificationWrapper aria-label="View notifications">
            <NotificationIcon />
            {notifications.filter((notif) => !notif.isRead).length > 0 && (
              <NotificationBadge>
                {notifications.filter((notif) => !notif.isRead).length}
              </NotificationBadge>
            )}
          </NotificationWrapper>
        </OverlayTrigger>
        <DatePickerWrapper>
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            placeholderText="Start Date"
            dateFormat="dd/MM/yyyy"
            isClearable
            aria-label="Select order start date"
          />
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate}
            placeholderText="End Date"
            dateFormat="dd/MM/yyyy"
            isClearable
            aria-label="Select order end date"
          />
        </DatePickerWrapper>
        <FilterDropdown
          id="financial-year-filter"
          label="Financial Year"
          value={financialYearFilter}
          onChange={setFinancialYearFilter}
          options={["All", ...financialYearOptions]}
          tableId={tableId}
        />
        {userRole !== "salesperson" && (
          <FilterDropdown
            id="salesperson-filter"
            label="All Salespersons"
            value={salesPersonFilter}
            onChange={setSalesPersonFilter}
            options={uniqueSalesPersons}
            tableId={tableId}
          />
        )}
        <FilterDropdown
          id="production-status-filter"
          label="Production Status"
          value={productionStatusFilter}
          onChange={setProductionStatusFilter}
          options={[
            "All",
            "Pending",
            "Hold",
            "Order Cancel",
            "Under Process",
            "Partial Dispatch",
            "Fulfilled",
          ]}
          displayMap={{ "Order Cancel": "Order Cancelled", "Partial Dispatch": "Partial Dispatched", "Fulfilled": "Completed" }}
          tableId={tableId}
        />
        <FilterDropdown
          id="product-status-filter"
          label="Product Type"
          value={productStatus}
          onChange={setProductStatusFilter}
          options={[
            "All",
            "Chairs",
            "Tables",
            "Sheet Metal",
            "Desking",
            "Solid Wood",
            "Boards",
            "Lab Tables",
            "Others",
          ]}
          tableId={tableId}
        />
        <FilterDropdown
          id="installation-status-filter"
          label="Installation Status"
          value={installStatusFilter}
          onChange={setInstallStatusFilter}
          options={["All", "Pending", "In Progress", "Completed"]}
          tableId={tableId}
        />
        <FilterDropdown
          id="dispatch-status-filter"
          label="Dispatch Status"
          value={dispatchFilter}
          onChange={setDispatchFilter}
          options={["All", "Not Dispatched", "Dispatched", "Delivered"]}
          tableId={tableId}
        />
        <FilterDropdown
          id="accounts-status-filter"
          label="Accounts Status"
          value={accountsStatusFilter}
          onChange={setAccountsStatusFilter}
          options={["All", "Not Received", "Received"]}
          tableId={tableId}
        />
        <StyledButton onClick={handleReset} aria-label="Reset all filters">
          Reset <ArrowRight size={16} />
        </StyledButton>
      </FilterGroup>
    </FilterContainer>
  );
};

export default FilterSection;
