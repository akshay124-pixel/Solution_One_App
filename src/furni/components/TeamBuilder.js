// TeamBuilder: Modern, animated team management UI with real-time updates
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Modal, Button, Spinner, Alert, Badge } from "react-bootstrap";
import furniApi from "../axiosSetup";
import { toast } from "react-toastify";
import styled from "styled-components";
import io from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserPlus,
  UserMinus,
  Mail,
  Crown,
  Search,
  RefreshCw,
  AlertCircle,
  X,
} from "lucide-react";

const theme = {
  primary: "#2575fc",
  secondary: "#64748b",
  success: "#16a34a",
  danger: "#dc2626",
  background: "#f8fafc",
  surface: "#ffffff",
  border: "#e2e8f0",
  text: "#1e293b",
  textMuted: "#64748b",
  shadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
  shadowLg: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
};

const ModalWrapper = styled(Modal)`
  .modal-content { border-radius: 20px; box-shadow: ${theme.shadowLg}; background: ${theme.background}; border: none; overflow: hidden; }
  .modal-header { background: linear-gradient(135deg, ${theme.primary}, #6a11cb); color: white; border-radius: 20px 20px 0 0; padding: 2rem; border-bottom: none; }
  .modal-title { font-size: 1.75rem; font-weight: 700; display: flex; align-items: center; gap: 0.75rem; margin: 0; }
  .modal-body { padding: 2rem; max-height: 70vh; overflow-y: auto; &::-webkit-scrollbar { width: 6px; } &::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 3px; } }
  .modal-footer { padding: 1.5rem 2rem; border-top: 1px solid ${theme.border}; background: ${theme.surface}; }
`;
const SectionCard = styled(motion.div)`
  background: ${theme.surface}; border-radius: 16px; padding: 2rem; margin-bottom: 2rem;
  box-shadow: ${theme.shadow}; border: 1px solid ${theme.border}; position: relative; overflow: hidden;
  &::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, ${theme.primary}, #6a11cb); }
`;
const SectionHeader = styled.div`display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;`;
const SectionTitle = styled.h5`font-size: 1.375rem; font-weight: 700; color: ${theme.text}; margin: 0; display: flex; align-items: center; gap: 0.75rem;`;
const RefreshButton = styled(Button)`background: ${theme.background}; border: 1px solid ${theme.border}; color: ${theme.textMuted}; padding: 0.5rem; border-radius: 8px; transition: all 0.2s ease; &:hover { background: ${theme.primary}; color: white; border-color: ${theme.primary}; }`;
const SearchContainer = styled.div`position: relative; margin-bottom: 1.5rem;`;
const SearchInput = styled.input`width: 100%; padding: 0.875rem 1rem 0.875rem 3rem; border: 2px solid ${theme.border}; border-radius: 12px; font-size: 0.95rem; background: ${theme.surface}; color: ${theme.text}; transition: all 0.2s ease; &:focus { outline: none; border-color: ${theme.primary}; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); } &::placeholder { color: ${theme.textMuted}; }`;
const SearchIcon = styled(Search)`position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: ${theme.textMuted}; width: 1.25rem; height: 1.25rem;`;
const UserGrid = styled.div`display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; @media (max-width: 768px) { grid-template-columns: 1fr; gap: 1rem; }`;
const UserCard = styled(motion.div)`background: ${theme.surface}; border: 2px solid ${theme.border}; border-radius: 12px; padding: 1.5rem; transition: all 0.3s ease; &:hover { border-color: ${theme.primary}; box-shadow: ${theme.shadow}; transform: translateY(-2px); } &.team-member { border-color: ${theme.success}; background: linear-gradient(135deg, ${theme.surface}, #f0fdf4); }`;
const UserAvatar = styled.div`width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, ${theme.primary}, #6a11cb); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 1.25rem; margin-bottom: 1rem;`;
const UserInfo = styled.div`margin-bottom: 1rem;`;
const UserName = styled.h6`font-size: 1.125rem; font-weight: 600; color: ${theme.text}; margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.5rem;`;
const UserEmail = styled.p`font-size: 0.875rem; color: ${theme.textMuted}; margin: 0; display: flex; align-items: center; gap: 0.5rem;`;
const UserRole = styled(Badge)`background: ${theme.primary}; color: white; font-size: 0.75rem; padding: 0.25rem 0.75rem; border-radius: 20px; font-weight: 500;`;
const ActionButton = styled(Button)`padding: 0.75rem 1.5rem; font-size: 0.9rem; font-weight: 600; border-radius: 10px; transition: all 0.3s ease; border: none; display: flex; align-items: center; gap: 0.5rem; width: 100%; justify-content: center; &:hover { transform: translateY(-2px); box-shadow: ${theme.shadow}; } &.btn-success { background: linear-gradient(135deg, ${theme.success}, #22c55e); } &.btn-danger { background: linear-gradient(135deg, ${theme.danger}, #ef4444); }`;
const EmptyState = styled(motion.div)`text-align: center; padding: 3rem 2rem; color: ${theme.textMuted};`;
const EmptyIcon = styled.div`width: 64px; height: 64px; border-radius: 50%; background: ${theme.background}; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; color: ${theme.textMuted};`;
const LoadingContainer = styled.div`display: flex; justify-content: center; align-items: center; padding: 3rem; flex-direction: column; gap: 1rem;`;
const StyledAlert = styled(Alert)`border-radius: 12px; margin-bottom: 2rem; padding: 1.25rem; font-size: 0.95rem; border: none; display: flex; align-items: center; gap: 0.75rem;`;
const StatsContainer = styled.div`display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 2rem;`;
const StatCard = styled.div`background: ${theme.surface}; border: 1px solid ${theme.border}; border-radius: 12px; padding: 1.5rem; text-align: center; box-shadow: ${theme.shadow};`;
const StatNumber = styled.div`font-size: 2rem; font-weight: 700; color: ${theme.primary}; margin-bottom: 0.5rem;`;
const StatLabel = styled.div`font-size: 0.875rem; color: ${theme.textMuted}; font-weight: 500;`;
const CloseButton = styled(Button)`background: ${theme.background}; border: 2px solid ${theme.border}; color: ${theme.text}; padding: 0.75rem 2rem; border-radius: 10px; font-weight: 600; transition: all 0.3s ease; &:hover { background: ${theme.text}; color: white; border-color: ${theme.text}; }`;

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.2 } },
};
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const TeamBuilder = ({ isOpen, onClose, userId }) => {
  const [availableUsers, setAvailableUsers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  const filteredAvailableUsers = useMemo(() => {
    if (!searchTerm) return availableUsers;
    return availableUsers.filter(
      (u) => u.username.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableUsers, searchTerm]);

  const filteredTeamMembers = useMemo(() => {
    if (!searchTerm) return teamMembers;
    return teamMembers.filter(
      (u) => u.username.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [teamMembers, searchTerm]);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await furniApi.get("/api/current-user");
      setCurrentUser(res.data?.data || null);
    } catch (err) {
      console.error("Error fetching current user:", err);
    }
  }, []);

  const fetchAvailableUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await furniApi.get("/api/fetch-available-users");
      setAvailableUsers(res.data.data || []);
      setError(null);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to load available users";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeamMembers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await furniApi.get("/api/fetch-my-team");
      setTeamMembers(res.data.data || []);
      setError(null);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to load team members";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAssign = useCallback(async (targetUserId) => {
    try {
      setActionLoading(targetUserId);
      await furniApi.post("/api/assign-user", { userId: targetUserId });
      toast.success("User assigned successfully");
      await Promise.all([fetchAvailableUsers(), fetchTeamMembers()]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign user");
    } finally {
      setActionLoading(null);
    }
  }, [fetchAvailableUsers, fetchTeamMembers]);

  const handleUnassign = useCallback(async (targetUserId) => {
    try {
      setActionLoading(targetUserId);
      await furniApi.post("/api/unassign-user", { userId: targetUserId });
      toast.success("User unassigned successfully");
      await Promise.all([fetchAvailableUsers(), fetchTeamMembers()]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to unassign user");
    } finally {
      setActionLoading(null);
    }
  }, [fetchAvailableUsers, fetchTeamMembers]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchCurrentUser(), fetchAvailableUsers(), fetchTeamMembers()]);
  }, [fetchCurrentUser, fetchAvailableUsers, fetchTeamMembers]);

  useEffect(() => {
    if (isOpen) handleRefresh();
  }, [isOpen, handleRefresh]);

  // Socket.IO for live team updates
  useEffect(() => {
    if (!isOpen) return;
    const baseOrigin = (() => {
      try { return new URL(process.env.REACT_APP_FURNI_URL || "http://localhost:5050").origin; }
      catch { return "http://localhost:5050"; }
    })();
    const socket = io(baseOrigin, {
      path: "/furni/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      withCredentials: true,
    });
    socket.on("connect", () => {
      console.log(`[Furni Socket] Client connected — socketId=${socket.id} userId=${userId} username=salesperson`);
      socket.emit("join", { userId, role: "salesperson" });
    });
    socket.on("disconnect", (reason) => {
      console.log(`[Furni Socket] Client disconnected — socketId=${socket.id} userId=${userId} reason=${reason}`);
    });
    socket.on("teamUpdate", ({ leaderId }) => { if (leaderId === userId) handleRefresh(); });
    return () => socket.disconnect();
  }, [isOpen, userId, handleRefresh]);

  const getUserInitials = (username) =>
    username.split(" ").map((n) => n.charAt(0)).join("").toUpperCase().slice(0, 2);

  const renderUserCard = (user, isTeamMember = false) => (
    <UserCard key={user._id} variants={cardVariants} className={isTeamMember ? "team-member" : ""} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <UserAvatar>{getUserInitials(user.username)}</UserAvatar>
      <UserInfo>
        <UserName>{user.username}{isTeamMember && <Crown size={16} color={theme.success} />}</UserName>
        <UserEmail><Mail size={14} />{user.email}</UserEmail>
        <UserRole>{user.role || "salesperson"}</UserRole>
      </UserInfo>
      <ActionButton
        variant={isTeamMember ? "danger" : "success"}
        onClick={() => isTeamMember ? handleUnassign(user._id) : handleAssign(user._id)}
        disabled={actionLoading === user._id}
      >
        {actionLoading === user._id ? <Spinner size="sm" /> : isTeamMember ? <><UserMinus size={16} />Remove from Team</> : <><UserPlus size={16} />Add to Team</>}
      </ActionButton>
    </UserCard>
  );

  const renderEmptyState = (message, icon) => (
    <EmptyState initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <EmptyIcon>{icon}</EmptyIcon>
      <h6 style={{ margin: "0 0 0.5rem 0", color: theme.text }}>{message}</h6>
      <p style={{ margin: 0, fontSize: "0.875rem" }}>
        {message.includes("available") ? "All users are currently assigned to teams." : "Start building your team by adding available users."}
      </p>
    </EmptyState>
  );

  return (
    <ModalWrapper show={isOpen} onHide={onClose} centered size="xl">
      <Modal.Header closeButton>
        <Modal.Title><Users size={28} />Team Management Dashboard</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <StyledAlert variant="danger"><AlertCircle size={20} />{error}</StyledAlert>}
        {currentUser?.assignedToLeader ? (
          <StyledAlert variant="info">
            <AlertCircle size={20} />
            You are currently assigned to {currentUser?.assignedToLeader?.username || "a team leader"} and cannot manage your own team.
          </StyledAlert>
        ) : (
          <>
            <StatsContainer>
              <StatCard><StatNumber>{teamMembers.length}</StatNumber><StatLabel>Team Members</StatLabel></StatCard>
              <StatCard><StatNumber>{availableUsers.length}</StatNumber><StatLabel>Available Users</StatLabel></StatCard>
              <StatCard><StatNumber>{filteredAvailableUsers.length + filteredTeamMembers.length}</StatNumber><StatLabel>Total Users</StatLabel></StatCard>
            </StatsContainer>
            <SearchContainer>
              <SearchIcon />
              <SearchInput type="text" placeholder="Search users by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </SearchContainer>
            <SectionCard initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <SectionHeader>
                <SectionTitle><Users size={20} />Your Team Members</SectionTitle>
                <RefreshButton onClick={handleRefresh} disabled={loading}><RefreshCw size={16} /></RefreshButton>
              </SectionHeader>
              {loading ? (
                <LoadingContainer><Spinner animation="border" variant="primary" /><p style={{ color: theme.textMuted, margin: 0 }}>Loading team members...</p></LoadingContainer>
              ) : filteredTeamMembers.length === 0 ? renderEmptyState("No team members yet", <Users size={24} />) : (
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                  <UserGrid><AnimatePresence>{filteredTeamMembers.map((u) => renderUserCard(u, true))}</AnimatePresence></UserGrid>
                </motion.div>
              )}
            </SectionCard>
            <SectionCard initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
              <SectionHeader>
                <SectionTitle><UserPlus size={20} />Available Users</SectionTitle>
                <RefreshButton onClick={handleRefresh} disabled={loading}><RefreshCw size={16} /></RefreshButton>
              </SectionHeader>
              {loading ? (
                <LoadingContainer><Spinner animation="border" variant="primary" /><p style={{ color: theme.textMuted, margin: 0 }}>Loading available users...</p></LoadingContainer>
              ) : filteredAvailableUsers.length === 0 ? renderEmptyState("No users available", <UserPlus size={24} />) : (
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                  <UserGrid><AnimatePresence>{filteredAvailableUsers.map((u) => renderUserCard(u, false))}</AnimatePresence></UserGrid>
                </motion.div>
              )}
            </SectionCard>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <CloseButton onClick={onClose}><X size={16} />Close</CloseButton>
      </Modal.Footer>
    </ModalWrapper>
  );
};

export default TeamBuilder;
