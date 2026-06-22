import React from "react";
import { Modal, Button } from "react-bootstrap";
import styled from "styled-components";
import { FaUpload, FaUserCircle } from "react-icons/fa";
import { motion } from "framer-motion";

const StyledModal = styled(Modal)`
  .modal-content {
    border-radius: 15px;
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
    border: none;
  }

  .modal-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-top-left-radius: 15px;
    border-top-right-radius: 15px;
    padding: 18px 25px;
    border-bottom: none;
  }

  .modal-title {
    font-weight: 700;
    font-size: 1.4rem;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .modal-body {
    padding: 25px;
    background: #f8f9fa;
  }
`;

const OptionCard = styled(motion.div)`
  background: white;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  margin-bottom: 15px;
  border: 2px solid transparent;
  display: flex;
  align-items: center;
  gap: 15px;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
    border-color: ${props => props.color || '#667eea'};
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const OptionIcon = styled.div`
  width: 50px;
  height: 50px;
  min-width: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.gradient};
  color: white;
  font-size: 1.5rem;
`;

const OptionContent = styled.div`
  flex: 1;
`;

const OptionTitle = styled.h5`
  font-weight: 700;
  color: #333;
  margin-bottom: 5px;
  font-size: 1.1rem;
`;

const OptionDescription = styled.p`
  color: #666;
  font-size: 0.85rem;
  line-height: 1.4;
  margin: 0;
`;

const BadgeWrapper = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
`;

const Badge = styled.span`
  background: ${props => props.bg || '#e3f2fd'};
  color: ${props => props.color || '#1976d2'};
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
`;

function BulkUploadOptionsModal({ isOpen, onClose, onSelectDefault, onSelectAsUser }) {
  const handleDefaultUpload = () => {
    onSelectDefault();
    onClose();
  };

  const handleUploadAsUser = () => {
    onSelectAsUser();
    onClose();
  };

  return (
    <StyledModal 
      show={isOpen} 
      onHide={onClose} 
      size="md" 
      centered
      backdrop="static"
    >
      <Modal.Header closeButton>
        <Modal.Title>
          <FaUpload /> Choose Upload Method
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Option 1: Upload Default (as current globaladmin) */}
        <OptionCard
          color="#2196F3"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleDefaultUpload}
        >
          <OptionIcon gradient="linear-gradient(135deg, #2196F3 0%, #1976D2 100%)">
            <FaUpload />
          </OptionIcon>
          <OptionContent>
            <OptionTitle>Bulk Upload (Default)</OptionTitle>
            <OptionDescription>
              Upload as yourself. All entries created with your account as creator.
            </OptionDescription>
            <BadgeWrapper>
              <Badge bg="#e3f2fd" color="#1976d2">Fast</Badge>
              <Badge bg="#e8f5e9" color="#388e3c">Standard</Badge>
            </BadgeWrapper>
          </OptionContent>
        </OptionCard>

        {/* Option 2: Upload as User (select another user) */}
        <OptionCard
          color="#9C27B0"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleUploadAsUser}
        >
          <OptionIcon gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
            <FaUserCircle />
          </OptionIcon>
          <OptionContent>
            <OptionTitle>Upload as User</OptionTitle>
            <OptionDescription>
              Upload on behalf of another user. Select user and entries created as them.
            </OptionDescription>
            <BadgeWrapper>
              <Badge bg="#f3e5f5" color="#7b1fa2">Advanced</Badge>
              <Badge bg="#e1bee7" color="#6a1b9a">Select User</Badge>
            </BadgeWrapper>
          </OptionContent>
        </OptionCard>

        <div style={{ 
          marginTop: '15px', 
          padding: '10px 12px', 
          background: 'linear-gradient(135deg, #fff9c4 0%, #fff59d 100%)', 
          borderRadius: '8px',
          border: '2px solid #fbc02d'
        }}>
          <p style={{ 
            margin: 0, 
            fontSize: '0.8rem', 
            color: '#f57f17',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ fontSize: '1rem' }}>💡</span>
            Both methods support Excel file upload.
          </p>
        </div>
      </Modal.Body>
    </StyledModal>
  );
}

export default BulkUploadOptionsModal;
