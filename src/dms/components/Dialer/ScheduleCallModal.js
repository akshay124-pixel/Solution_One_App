import { useState, useEffect } from "react";
import api from "../../api/api";
import { toast } from "react-toastify";
import "./ScheduleCallModal.css";

/**
 * Schedule Call Modal - ULTRA SIMPLE VERSION
 * No animations, pure HTML inputs, works perfectly in Opera
 */
const ScheduleCallModal = ({
  open,
  onClose,
  leadId,
  leadName,
  leadPhone,
  onCallScheduled,
}) => {
  const [scheduledTime, setScheduledTime] = useState("");
  const [priority, setPriority] = useState("medium");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setScheduledTime("");
      setPriority("medium");
      setPurpose("");
      setNotes("");
      setLoading(false);
    }
  }, [open]);

  // Handle close
  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  // Handle schedule
  const handleSchedule = async (e) => {
    e.preventDefault();

    if (!scheduledTime) {
      toast.error("Please select date and time");
      return;
    }

    if (!purpose) {
      toast.error("Please select call purpose");
      return;
    }

    // Validate future date
    const selectedDate = new Date(scheduledTime);
    const now = new Date();
    const minDate = new Date(now.getTime() + 5 * 60000);

    if (selectedDate < minDate) {
      toast.error("Please schedule at least 5 minutes in advance");
      return;
    }

    setLoading(true);

    try {
      // Using api instance for automatic token handling and refresh
      const response = await api.post("/api/dialer/schedule-call", {
        leadId,
        scheduledTime,
        priority,
        purpose,
        notes: notes.trim(),
      });

      if (response.data.success) {
        toast.success("Call scheduled successfully!");

        if (onCallScheduled) {
          onCallScheduled({
            ...response.data.data,
            scheduledTime,
            priority,
            purpose,
            notes,
          });
        }

        handleClose();
      }
    } catch (error) {
      console.error("Schedule call error:", error);
      toast.error(error.response?.data?.message || "Failed to schedule call");
    } finally {
      setLoading(false);
    }
  };

  // Get minimum datetime
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  if (!open) return null;

  return (
    <div className="schedule-modal-overlay" onClick={handleClose}>
      <div className="schedule-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="schedule-modal-header">
          <h2>📅 Schedule Call</h2>
          <button
            type="button"
            className="schedule-modal-close"
            onClick={handleClose}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSchedule} className="schedule-modal-form">
          {/* Lead Info */}
          <div className="schedule-lead-info">
            <div className="schedule-lead-label">Scheduling call for:</div>
            <div className="schedule-lead-name">{leadName}</div>
            <div className="schedule-lead-phone">📞 {leadPhone}</div>
          </div>

          {/* Date & Time */}
          <div className="schedule-form-group">
            <label htmlFor="scheduledTime" className="schedule-label">
              📅 Call Date & Time <span className="schedule-required">*</span>
            </label>
            <input
              type="datetime-local"
              id="scheduledTime"
              className="schedule-input"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              min={getMinDateTime()}
              required
              disabled={loading}
            />
          </div>

          {/* Priority */}
          <div className="schedule-form-group">
            <label htmlFor="priority" className="schedule-label">
              ⚡ Priority Level
            </label>
            <select
              id="priority"
              className="schedule-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={loading}
            >
              <option value="low">🟢 Low Priority</option>
              <option value="medium">🟡 Medium Priority</option>
              <option value="high">🔴 High Priority</option>
              <option value="urgent">🔴 Urgent</option>
            </select>
          </div>

          {/* Purpose */}
          <div className="schedule-form-group">
            <label htmlFor="purpose" className="schedule-label">
              🎯 Call Purpose <span className="schedule-required">*</span>
            </label>
            <select
              id="purpose"
              className="schedule-select"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              required
              disabled={loading}
            >
              <option value="">-- Select Purpose --</option>
              <option value="follow_up">📞 Follow-up Call</option>
              <option value="demo">🎯 Product Demo</option>
              <option value="negotiation">💼 Price Negotiation</option>
              <option value="closing">✅ Closing Call</option>
              <option value="support">🛠️ Technical Support</option>
              <option value="feedback">💬 Feedback Collection</option>
              <option value="renewal">🔄 Contract Renewal</option>
              <option value="upsell">📈 Upsell Opportunity</option>
              <option value="other">📋 Other</option>
            </select>
          </div>

          {/* Notes */}
          <div className="schedule-form-group">
            <label htmlFor="notes" className="schedule-label">
              📝 Call Notes / Agenda
            </label>
            <textarea
              id="notes"
              className="schedule-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any important notes, talking points, or agenda items for this call..."
              rows="4"
              maxLength="1000"
              disabled={loading}
            />
            <div className="schedule-char-count">{notes.length}/1000 characters</div>
          </div>

          {/* Tips */}
          <div className="schedule-tips">
            <div className="schedule-tips-title">💡 Quick Tips:</div>
            <ul className="schedule-tips-list">
              <li>Schedule calls at least 5 minutes in advance</li>
              <li>High priority calls appear at the top of your schedule</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="schedule-modal-actions">
            <button
              type="button"
              className="schedule-btn schedule-btn-cancel"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="schedule-btn schedule-btn-submit"
              disabled={loading || !scheduledTime || !purpose}
            >
              {loading ? "Scheduling..." : "Schedule Call"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleCallModal;
