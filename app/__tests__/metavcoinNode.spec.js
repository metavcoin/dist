import { ipcMain } from 'electron'

import metavcoinNode, { IPC_ASK_IF_WIPED_DUE_TO_VERSION, IPC_RESTART_metavcoin_NODE, IPC_BLOCKCHAIN_LOGS } from '../metavcoinNode'

jest.mock('@metavcoin/metavcoin-node', () => () => ({
  stderr: { pipe: jest.fn(), on: jest.fn() },
  stdout: { pipe: jest.fn(), on: jest.fn() },
  kill: jest.fn(),
  on: jest.fn(),
}))
jest.mock('electron', () => ({
  ipcMain: { once: jest.fn() },
}))

jest.unmock('services/db')

jest.mock('services/db', () => ({
  get: (key) => {
    if (key === 'config.isMining') {
      return ({
        value: () => false,
      })
    }
    return ({
      value: () => undefined,
    })
  },
  set: jest.fn(() => ({
    write: jest.fn(),
  })),
}))

// mock resourcesPath for isInstalledWithInstaller function
const originalProcessResourcePath = process.resourcesPath
beforeAll(() => {
  process.resourcesPath = 'node_modules/electron/dist'
})
afterAll(() => {
  process.resourcesPath = originalProcessResourcePath
})

const mockedWebContents = { send: jest.fn() }
const mockedOnClose = jest.fn()
const mockedOnError = jest.fn()

metavcoinNode.metavcoinNodeVersionRequiredWipe = false

afterEach(() => {
  jest.clearAllMocks()
  delete process.env.WIPE
  delete process.env.WIPEFULL
  delete process.env.metavcoin_LOCAL_NET
  delete process.env.metavcoin_TEST_NET
  delete process.env.MINER
})

test('instantiates with correct args', () => {
  // action
  const metavcoinNode = getmetavcoinNode()
  // assertion
  expect(metavcoinNode.webContents).toBe(mockedWebContents)
  expect(metavcoinNode.onClose).toBe(mockedOnClose)
  expect(metavcoinNode.onError).toBe(mockedOnError)
  expect(ipcMain.once).toHaveBeenCalledWith(
    IPC_ASK_IF_WIPED_DUE_TO_VERSION,
    metavcoinNode.answerIfWipedDueToVersion,
  )
  expect(ipcMain.once).toHaveBeenCalledTimes(1)
})

test('init', () => {
  // setup
  const metavcoinNode = getmetavcoinNode()
  ipcMain.once.mockClear()
  // action
  metavcoinNode.init()
  // assertion
  expect(metavcoinNode.updateLastWipeInDb).not.toHaveBeenCalled()
  expect(metavcoinNode.node.stderr.pipe).toHaveBeenCalledTimes(1)
  expect(metavcoinNode.node.stderr.pipe).toHaveBeenCalledWith(process.stderr)
  expect(metavcoinNode.node.stdout.pipe).toHaveBeenCalledTimes(1)
  expect(metavcoinNode.node.stdout.pipe).toHaveBeenCalledWith(process.stdout)
  expect(ipcMain.once).toHaveBeenCalledTimes(1)
  expect(ipcMain.once).toHaveBeenCalledWith(IPC_RESTART_metavcoin_NODE, metavcoinNode.onRestartmetavcoinNode)
  expect(metavcoinNode.node.on).toHaveBeenCalledTimes(3)
  expect(metavcoinNode.node.on).toHaveBeenCalledWith('exit', metavcoinNode.onmetavcoinNodeExit)
})
test('init when wiping', () => {
  // setup
  const metavcoinNode = getmetavcoinNode()
  metavcoinNode.config.wipe = true
  // action
  metavcoinNode.init()
  // assertion
  expect(metavcoinNode.updateLastWipeInDb).toHaveBeenCalledTimes(1)
})
test('init when wiping full', () => {
  // setup
  const metavcoinNode = getmetavcoinNode()
  metavcoinNode.config.wipeFull = true
  // action
  metavcoinNode.init()
  // assertion
  expect(metavcoinNode.updateLastWipeInDb).toHaveBeenCalledTimes(1)
})

test('metavcoinNodeArgs empty args', () => {
  const metavcoinNode = getmetavcoinNode()
  expect(metavcoinNode.metavcoinNodeArgs).toEqual([])
})
test('metavcoinNodeArgs wipe from command line', () => {
  // setup
  process.env.WIPE = 'true'
  const metavcoinNode = getmetavcoinNode()
  // assertion
  expect(metavcoinNode.metavcoinNodeArgs).toEqual(['--wipe'])
})
test('metavcoinNodeArgs wipe full from command line', () => {
  // setup
  process.env.WIPEFULL = 'true'
  const metavcoinNode = getmetavcoinNode()
  // assertion
  expect(metavcoinNode.metavcoinNodeArgs).toEqual(['--wipe', 'full'])
})
test('metavcoinNodeArgs running testnet from command line', () => {
  // setup
  process.env.metavcoin_TEST_NET = 'true'
  const metavcoinNode = getmetavcoinNode()
  // assertion
  expect(metavcoinNode.metavcoinNodeArgs).toEqual(['--test'])
})

test('onmetavcoinNodeExit when signal is NOT restart', () => {
  // setup
  const nonRestartSignal = 'SIGINT'
  const metavcoinNode = getmetavcoinNode()
  metavcoinNode.init()
  const onCloseSpy = jest.spyOn(metavcoinNode, 'onClose')
  const initSpy = jest.spyOn(metavcoinNode, 'init')
  // action
  metavcoinNode.onmetavcoinNodeExit(null, nonRestartSignal)
  // assertion
  expect(initSpy).not.toBeCalled()
  expect(onCloseSpy).toHaveBeenCalledTimes(1)
})

test('onBlockchainLog', () => {
  // setup
  const metavcoinNode = getmetavcoinNode()
  // action
  metavcoinNode.onBlockchainLog('')
  // assertion
  expect(mockedWebContents.send).toHaveBeenCalledTimes(1)
  expect(mockedWebContents.send).toHaveBeenCalledWith(IPC_BLOCKCHAIN_LOGS, '')
})

function getmetavcoinNode() {
  const metavcoinNode = new metavcoinNode({
    webContents: mockedWebContents,
    onClose: mockedOnClose,
    onError: mockedOnError,
  })
  metavcoinNode.updateLastWipeInDb = jest.fn()
  return metavcoinNode
}
