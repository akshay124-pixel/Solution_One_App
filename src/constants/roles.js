
export const ROLES = {
  GLOBAL_ADMIN:        "globaladmin",
  SUPER_ADMIN:         "superadmin",
  ADMIN:               "admin",
  SALESPERSON:         "salesperson",
  SERVICE:             "service",
  PART_REPLACEMENT:    "part_replacement",
  AV_EDTECH_INCOMPLETE: "av_edtech_incomplete",
  FURNITURE_INCOMPLETE: "furniture_incomplete",
   
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

/**
 * Category constants for Incomplete Orders
 */
export const CATEGORIES = {
  AV_EDTECH: "av&edtech",
  FURNITURE: "furniture"
};

/**
 * Role to Category mapping
 */
export const ROLE_CATEGORY_MAP = {
  [ROLES.AV_EDTECH_INCOMPLETE]: CATEGORIES.AV_EDTECH,
  [ROLES.FURNITURE_INCOMPLETE]: CATEGORIES.FURNITURE
};


export const getAllowedCategory = (role) => {
  if (!role) return null;
  const normalizedRole = role?.toLowerCase?.() ?? role;
  
  // Admin/service roles have full access
  const FULL_ACCESS_ROLES = [
    ROLES.GLOBAL_ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.SERVICE
  ];
  
  if (FULL_ACCESS_ROLES.includes(normalizedRole)) {
    return null;
  }
  
  return ROLE_CATEGORY_MAP[normalizedRole] || null;
};

/**
 * Check if a role is an Incomplete Order specific role
 */
export const isIncompleteOrderRole = (role) => {
  const normalizedRole = role?.toLowerCase?.() ?? role;
  return normalizedRole === ROLES.AV_EDTECH_INCOMPLETE || 
         normalizedRole === ROLES.FURNITURE_INCOMPLETE;
};
