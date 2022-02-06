// @flow

import { ipcRenderer } from 'electron'

const TESTNET_PORT = '31567'
const LOCAL_NET_PORT = '36000'
const MAIN_NET_PORT = '11567'
const LOCALHOST = 'http://127.0.0.1'

let chain = getInitialChain()

if (ipcRenderer) {
  ipcRenderer.on('switchChain', onSwitchChain)
}

function onSwitchChain(evt, newChain) {
  console.log('setting server address for chain:', newChain)
  chain = newChain
}

export const getPort = () => {
  if (chain === 'local') {
    return LOCAL_NET_PORT
  }
  if (chain === 'test') {
    return TESTNET_PORT
  }

  return MAIN_NET_PORT
}

export const getServerAddress = () => {
  if (process.env.metavcoin_NODE_API_PORT) {
    return `${LOCALHOST}:${process.env.metavcoin_NODE_API_PORT}`
  }
  return `${LOCALHOST}:${getPort()}`
}

export const getCrowdsaleServerAddress = () => (process.env.metavcoin_LOCAL_NET === 'localhost' ? 'http://127.0.0.1:3000' : 'https://www.metavcoin.com')

function getInitialChain() {
  if (process.env.metavcoin_LOCAL_NET) {
    return 'local'
  }
  if (process.env.metavcoin_TEST_NET) {
    return 'test'
  }
  return ''
}
