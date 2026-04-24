/**
 * Centralized error building and reporting
 * 
 * This module provides consistent error creation across all analysis phases:
 * - Parsing (future)
 * - Scope Analysis
 * - Type Checking
 * 
 * Design: All errors follow the same shape for consistency
 */

/**
 * Create a standardized error object
 * @param {string} message - Error message
 * @param {Object} location - Location info from AST node (node.loc)
 * @param {string} type - Error type: 'Scope', 'Type', 'Parse', etc.
 * @param {Object} extraProps - Additional properties specific to error type
 * @returns {Object} Standardized error object
 */
function createError(message, location, type = 'Error', extraProps = {}) {
    // fill here
}

/**
 * Normalize location info to consistent format
 * Handles various location object formats from parsers
 * @param {Object} location - Location object from parser or AST node
 * @returns {Object|null} Normalized location or null if missing
 */
function normalizeLocation(location) {
    // fill here
}

/**
 * Helper to create binary operation error
 * Used for all operator type errors (arithmetic, comparison, logical)
 * @param {string} operator - The operator being used
 * @param {string} leftDesc - Type description of left operand
 * @param {string} rightDesc - Type description of right operand
 * @param {string} reason - Why this operation is invalid
 * @returns {string} Formatted error message
 */
function formatBinaryOpError(operator, leftDesc, rightDesc, reason) {
    // fill here
}

/**
 * Helper to create type mismatch error
 * @param {string} expected - Expected type description
 * @param {string} actual - Actual type description
 * @param {string} context - Context where mismatch occurred
 * @returns {string} Formatted error message
 */
function formatTypeMismatch(expected, actual, context) {
    // fill here
}

/**
 * Standardized error collector class
 * Used by all analysis phases (Scope, Type, etc.)
 */
class ErrorCollector {
    constructor(phaseType = 'Analysis') {
        // fill here
    }

    /**
     * Add an error to the collection
     * @param {string} message - Error message
     * @param {Object} location - AST node location
     * @param {Object} extraProps - Additional properties
     */
    addError(message, location, extraProps = {}) {
        // fill here
    }

    /**
     * Check if there are any errors
     * @returns {boolean}
     */
    hasErrors() {
        // fill here
    }

    /**
     * Get all collected errors
     * @returns {Array}
     */
    getErrors() {
        // fill here
    }

    /**
     * Clear all errors
     */
    clear() {
        // fill here
    }
}

module.exports = {
    createError,
    normalizeLocation,
    formatBinaryOpError,
    formatTypeMismatch,
    ErrorCollector,
};
