export default class PropLocation {
  // NOTE: the below no-undef disabling is due to the outdated nature of
  // the babel-eslint package and its apparent inappropriate handling of.
  // static member variables

  // eslint-disable-next-line no-undef
  static kEncodingOnly = new PropLocation(1 << 0)

  // eslint-disable-next-line no-undef
  static kMarkDefOnly = new PropLocation(1 << 1)

  // eslint-disable-next-line no-undef
  static kEncodingPlusMarkDef = new PropLocation(
    PropLocation.kEncodingOnly | PropLocation.kMarkDefOnly
  )

  constructor(value) {
    this.value = value
  }

  valueOf() {
    return this.value
  }

  toString() {
    return `${this.value}`
  }
}
