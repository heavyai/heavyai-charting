module.exports = {
  toString: (obj) => {
    if (typeof obj.toString === "function") {
      return obj.toString();
    }
    return obj.constructor ? obj.constructor.name : typeof obj;
  }
};
