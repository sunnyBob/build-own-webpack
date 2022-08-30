import sum from './sum.js'

const average = (arr) => {
  if (Array.isArray(arr) && arr.length > 0) return sum(arr) / arr.length

  throw new Error('param is invalid')
}

export default average
