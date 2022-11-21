/**
 * Returns true if value >= 0
 * @param {number} value
 * @returns {boolean}
 */
const is_gte_zero = value => value >= 0

/**
 * Returns true if 0 <= value <= 1
 * @param {number} value
 * @returns {boolean}
 */
const is_zero_to_one = value => value >= 0 && value <= 1

export { is_gte_zero, is_zero_to_one }
