class PrefixCounter {
  constructor() {
    this.used_prefixes = new Map();
  }

  getPrefix(prefix) {
    const prefix_cnt = this.used_prefixes.get(prefix) || 0;
    this.used_prefixes.set(prefix, prefix_cnt + 1);
    if (!prefix_cnt) {
      return prefix;
    } else {
      return `${prefix}_${prefix_cnt}`;
    }
  }
}

module.exports = PrefixCounter;
