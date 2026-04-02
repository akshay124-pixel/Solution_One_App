/**
 * Order Utility Functions
 * Shared utilities for order validation and completion checks
 */

/**
 * Helper function to check if a value is "empty"
 * @param {*} val - Value to check
 * @returns {boolean} - True if value is empty
 */
export const isEmpty = (val) =>
    val === undefined ||
    val === null ||
    (typeof val === "string" && val.trim() === "");

/**
 * Comprehensive order completion validation
 * An order is considered complete when ALL of the following criteria are met:
 * 1. Core fields (orderId, customer info)
 * 2. Products (valid product array)
 * 3. Accounts (Payment Received)
 * 4. Production (Fulfilled status)
 * 5. Dispatch (Delivered + Stamp Received)
 * 6. Installation (Completed if required, otherwise N/A)
 *
 * @param {Object} order - The order object to validate
 * @returns {boolean} - True if order meets ALL completion criteria
 */
export const isOrderComplete = (order) => {
    // 1. Core Sales Validation (essential fields only)
    const isCoreValid =
        !isEmpty(order.orderId) &&
        !isEmpty(order.customername) &&
        !isEmpty(order.contactNo);

    // 2. Products Validation (basic check)
    const isProductsValid =
        Array.isArray(order.products) &&
        order.products.length > 0;

    // 3. Accounts Validation
    // Payment must be received
    const isAccountsValid =
        order.paymentReceived === "Received" ||
        order.paymentReceived?.toLowerCase() === "received";

    // 4. Production Validation
    // Must be Fulfilled
    const isProductionValid =
        order.fulfillingStatus === "Fulfilled" ||
        order.fulfillingStatus?.toLowerCase() === "fulfilled";

    // 5. Dispatch Validation
    // Must be Delivered with Stamp Received
    const isDispatchValid =
        order.dispatchStatus === "Delivered" &&
        order.stamp === "Received";

    // 6. Installation Validation
    // Only required if installation is NOT "No", "N/A" or empty
    let isInstallationValid = true;
    const installReq = order.installation;
    if (
        installReq &&
        installReq !== "No" &&
        installReq !== "N/A" &&
        installReq.trim() !== ""
    ) {
        isInstallationValid =
            order.installationStatus === "Completed" ||
            order.installationStatus?.toLowerCase() === "completed";
    }

    // Calculate completion status
    const isComplete = (
        isCoreValid &&
        isProductsValid &&
        isAccountsValid &&
        isProductionValid &&
        isDispatchValid &&
        isInstallationValid
    );

    if (!isComplete) {
        // validation failed — isComplete stays false
    }

    return isComplete;
};
