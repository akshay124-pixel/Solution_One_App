import React, { useState, useEffect } from 'react';
import { Spinner, Alert } from 'react-bootstrap';
import styled from 'styled-components';
import soApi from '../axiosSetup';
import { toast } from 'react-toastify';

// ══════════════════════════════════════════════════════════════════════
// STYLED COMPONENTS
// ══════════════════════════════════════════════════════════════════════

const TimelineContainer = styled.div`
  max-height: 400px;
  overflow-y: auto;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #2575fc, #6a11cb);
    border-radius: 4px;
  }
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }
`;

const TimelineItem = styled.div`
  position: relative;
  padding: 0 0 2rem 3rem;
  border-left: 2px solid #e2e8f0;
  margin-bottom: 1.5rem;
  
  &:last-child {
    border-left-color: transparent;
    margin-bottom: 0;
  }
  
  &:before {
    content: "";
    position: absolute;
    left: -6px;
    top: 1.2rem;
    width: 12px;
    height: 12px;
    background: linear-gradient(135deg, #2575fc, #6a11cb);
    border-radius: 50%;
    box-shadow: 0 0 6px rgba(37, 117, 252, 0.4);
    z-index: 2;
  }
`;

const ChangeCard = styled.div`
  background: white;
  padding: 1.25rem;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #f1f5f9;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: #e0e7ff;
  }
`;

const ChangeHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #f8fafc;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #374151;
`;

const UserAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2575fc, #6a11cb);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 0.9rem;
`;

const Timestamp = styled.div`
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  
  &:before {
    content: "🕒";
    font-size: 0.8rem;
  }
`;

const RoleBadge = styled.span`
  background: linear-gradient(135deg, #f59e0b, #f97316);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ChangesGrid = styled.div`
  display: grid;
  gap: 0.75rem;
`;

const ChangeItem = styled.div`
  background: #f8fafc;
  padding: 0.75rem;
  border-radius: 8px;
  border-left: 3px solid #3b82f6;
`;

const FieldLabel = styled.div`
  font-weight: 600;
  font-size: 0.85rem;
  color: #1f2937;
  margin-bottom: 0.5rem;
  text-transform: capitalize;
`;

const ValueChange = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const ValueBox = styled.span`
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  
  ${props => props.type === 'old' ? `
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
  ` : `
    background: #f0fdf4;
    color: #16a34a;
    border: 1px solid #bbf7d0;
  `}
`;

const Arrow = styled.div`
  color: #6b7280;
  font-weight: 700;
  font-size: 1.1rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  color: #64748b;
  background: white;
  border-radius: 12px;
  border: 2px dashed #e2e8f0;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  background: white;
  border-radius: 12px;
`;

const ErrorContainer = styled.div`
  margin-bottom: 1rem;
`;

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════

const EditHistoryTimeline = ({ orderId }) => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (orderId) {
      fetchAuditLogs();
    }
  }, [orderId]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await soApi.get(`/api/orders/${orderId}/audit-logs`);
      
      if (response.data.success) {
        setAuditLogs(response.data.data || []);
      } else {
        throw new Error(response.data.message || 'Failed to fetch audit logs');
      }
      
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError(err.response?.data?.message || 'Failed to load edit history');
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'N/A';
    }
  };

  const getUserInitials = (username) => {
    if (!username) return '?';
    return username
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleRetry = () => {
    fetchAuditLogs();
  };

  // ══════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <LoadingContainer>
        <div style={{ textAlign: 'center' }}>
          <Spinner
            animation="border"
            variant="primary"
            style={{ marginBottom: '1rem' }}
          />
          <div style={{ color: '#64748b', fontWeight: 500 }}>
            Loading edit history...
          </div>
        </div>
      </LoadingContainer>
    );
  }

  if (error) {
    return (
      <ErrorContainer>
        <Alert variant="danger" className="d-flex justify-content-between align-items-center">
          <div>
            <strong>Error:</strong> {error}
          </div>
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={handleRetry}
            style={{ marginLeft: '1rem' }}
          >
            Retry
          </button>
        </Alert>
      </ErrorContainer>
    );
  }

  if (auditLogs.length === 0) {
    return (
      <EmptyState>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
        <h5 style={{ color: '#374151', marginBottom: '0.5rem' }}>No Edit History</h5>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          No changes have been made to this order's details yet.
        </p>
      </EmptyState>
    );
  }

  return (
    <TimelineContainer>
      {auditLogs.map((log, index) => (
        <TimelineItem key={log._id || index}>
          <ChangeCard>
            <ChangeHeader>
              <UserInfo>
                <UserAvatar>
                  {getUserInitials(log.editedBy?.username)}
                </UserAvatar>
                <div>
                  <div>{log.editedBy?.username || 'Unknown User'}</div>
                  <RoleBadge>{log.userRole || 'User'}</RoleBadge>
                </div>
              </UserInfo>
              <Timestamp>
                {formatTimestamp(log.timestamp)}
              </Timestamp>
            </ChangeHeader>
            
            <ChangesGrid>
              {log.changes?.map((change, changeIndex) => (
                <ChangeItem key={changeIndex}>
                  <FieldLabel>{change.fieldLabel || change.fieldName}</FieldLabel>
                  <ValueChange>
                    <ValueBox type="old" title={change.oldValue}>
                      {change.oldValue}
                    </ValueBox>
                    <Arrow>→</Arrow>
                    <ValueBox type="new" title={change.newValue}>
                      {change.newValue}
                    </ValueBox>
                  </ValueChange>
                </ChangeItem>
              ))}
            </ChangesGrid>
          </ChangeCard>
        </TimelineItem>
      ))}
    </TimelineContainer>
  );
};

export default EditHistoryTimeline;