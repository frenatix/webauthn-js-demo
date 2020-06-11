const makeSelect = (columns) => {
  return columns.map(value => `${value.name} as "${value.alias}"`).join(', ')
}

module.exports = { makeSelect }