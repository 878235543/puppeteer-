/**
 * 延迟函数
 * @param {number} seconds 延迟时间毫秒
 * @returns 
 */
module.exports = sleep = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds));