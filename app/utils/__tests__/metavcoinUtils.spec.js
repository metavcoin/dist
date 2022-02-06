import { metavcoinBalanceDisplay, kalapasTometavcoin, metavcoinToKalapas } from '../metavcoinUtils'

test('kalapasTometavcoin', () => {
  // setup
  const kalapas = 100000001
  const expected = 1.00000001
  // action
  const result = kalapasTometavcoin(kalapas)
  // assertion
  expect(typeof result).toBe('number')
  expect(result).toBe(expected)
})
test('metavcoinToKalapas', () => {
  // setup
  const metavcoin = 1.00000001
  const expected = 100000001
  // action
  const result = metavcoinToKalapas(metavcoin)
  // assertion
  expect(typeof result).toBe('number')
  expect(result).toBe(expected)
})

test('metavcoinBalanceDisplay 0 kalapas', () => {
  const kalapas = 0
  const expected = '0.00'
  expect(metavcoinBalanceDisplay(kalapas)).toEqual(expected)
})
test('metavcoinBalanceDisplay 110000000 kalapas', () => {
  const kalapas = 110000000
  const expected = '1.10'
  expect(metavcoinBalanceDisplay(kalapas)).toEqual(expected)
})
test('metavcoinBalanceDisplay 100000001 kalapas', () => {
  const kalapas = 100000001
  const expected = '1.00000001'
  expect(metavcoinBalanceDisplay(kalapas)).toEqual(expected)
})
test('metavcoinBalanceDisplay 100000000000 kalapas', () => {
  const kalapas = 100000000000
  const expected = '1,000.00'
  expect(metavcoinBalanceDisplay(kalapas)).toEqual(expected)
})
test('metavcoinBalanceDisplay 100000000001 kalapas', () => {
  const kalapas = 100000000001
  const expected = '1,000.00000001'
  expect(metavcoinBalanceDisplay(kalapas)).toEqual(expected)
})
test('metavcoinBalanceDisplay 100010000001 kalapas', () => {
  const kalapas = 100010000001
  const expected = '1,000.10000001'
  expect(metavcoinBalanceDisplay(kalapas)).toEqual(expected)
})
