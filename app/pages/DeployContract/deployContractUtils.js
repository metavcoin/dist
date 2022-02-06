import { metavcoinToKalapas } from '../../utils/metavcoinUtils'
import { metavcoin_ASSET_NAME, metavcoin_ASSET_HASH } from '../../constants'

export const replacePkHashVar = (codeFromFile, pkhash) => codeFromFile.replace(/"%PKHASH%"/g, `"${pkhash}"`)

export const isContractNameReserved = (name) => {
  const reg = new RegExp(`^(${metavcoin_ASSET_NAME}|${metavcoin_ASSET_HASH})$`, 'i')
  return !!name.match(reg)
}

export function calcMaxBlocksForContract(metavcoinBalance, codeLength) {
  if (metavcoinBalance === 0 || codeLength === 0) {
    return 0
  }
  const kalapasBalance = metavcoinToKalapas(metavcoinBalance)
  return parseInt((kalapasBalance / codeLength), 10)
}
