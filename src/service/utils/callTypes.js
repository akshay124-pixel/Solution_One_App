export const CALL_TYPE_OPTIONS = [
  { value: "Software", label: "Software", icon: "💻", badge: "info" },
  { value: "Hardware", label: "Hardware", icon: "🔧", badge: "warning" },
  { value: "Replacement", label: "Replacement", icon: "🔄", badge: "danger" },
  { value: "Visit required", label: "Visit required", icon: "📍", badge: "primary" }, 
];

export const getCallTypeDisplay = (callType) => {
  const match = CALL_TYPE_OPTIONS.find((o) => o.value === callType);
  if (!match) return callType ? { label: callType, icon: "", badge: "secondary" } : null;
  return {
    label: match.label,
    icon: match.icon,
    badge: match.badge,
    text: `${match.icon} ${match.label}`.trim(),
  };
};
