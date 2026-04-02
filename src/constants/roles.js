/**
 * Frontend role constants — mirrors server/constants/roles.js.
 * Use these for all role checks in React components instead of hardcoded strings.
 *
 * The portal JWT always carries the canonical lowercase role (e.g. "globaladmin").
 * Module-specific role strings (e.g. "SuperAdmin" for SO) are stored in localStorage
 * by PortalAuthContext.syncLocalStorage — use those only for legacy module components.
 */
export const ROLES = {
  GLOBAL_ADMIN:        "globaladmin",
  SUPER_ADMIN:         "superadmin",
  ADMIN:               "admin",
  SALESPERSON:         "salesperson",

  PRODUCTION:          "Production",
  INSTALLATION:        "Installation",
  FINISH:              "Finish",
  ACCOUNTS:            "Accounts",
  VERIFICATION:        "Verification",
  BILL:                "Bill",
  PRODUCTION_APPROVAL: "ProductionApproval",
  WATCH:               "Watch",

  // Legacy aliases
  OTHERS:              "others",
  SALES:               "Sales",
  DMS_USER:            "dms_user",
};

/** Returns true if the given role is an admin-level portal role */
export const isAdminRole = (role) =>
  [ROLES.GLOBAL_ADMIN, ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(role?.toLowerCase?.() ?? role);

/** Returns true if the given role is a portal-level management role (not operational) */
export const isManagementRole = (role) =>
  [ROLES.GLOBAL_ADMIN, ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SALESPERSON].includes(
    role?.toLowerCase?.() ?? role
  );
