// DO NOT MOVE THIS FILE
// This file must be in the same folder as the main.dev.js
// otherwise packing for npm breaks the path for the metavcoin node
import path from 'path'

import compare from 'semver-compare'
import _ from 'lodash'
import { ipcMain, dialog } from 'electron'
import spwanmetavcoinNodeChildProcess from '@metavcoin/metavcoin-node'

import { shout } from './utils/dev'
import db from './services/db'
import { metavcoin_NODE_VERSION, WALLET_VERSION } from './constants/versions'

export const IPC_metavcoin_NODE_NON_ZERO_EXIT = 'metavcoinNodeNonZeroExit'
export const IPC_ASK_IF_WIPED_DUE_TO_VERSION = 'askIfWipedDueToVersion'
export const IPC_ANSWER_IF_WIPED_DUE_TO_VERSION = 'answerIfWipedDueToVersion'
export const IPC_RESTART_metavcoin_NODE = 'restartmetavcoinNode'
export const IPC_BLOCKCHAIN_LOGS = 'blockchainLogs'
export const metavcoin_NODE_RESTART_SIGNAL = 'SIGKILL'

class metavcoinNode {
  static metavcoinNodeVersionRequiredWipe = doesmetavcoinNodeVersionRequiredWipe()
  ipcMessagesToSendOnFinishedLoad = []
  logs = []
  webContentsFinishedLoad = false
  node = {
    stderr: { pipe: _.noop, on: _.noop },
    stdout: { pipe: _.noop, on: _.noop },
    on: _.noop,
    kill: _.noop,
  }
  onClose = _.noop
  constructor({ webContents, onClose, onError }) {
    this.webContents = webContents
    this.onClose = onClose
    this.onError = onError
    ipcMain.once(IPC_ASK_IF_WIPED_DUE_TO_VERSION, this.answerIfWipedDueToVersion)
  }

  answerIfWipedDueToVersion = () => {
    this.webContents.send(IPC_ANSWER_IF_WIPED_DUE_TO_VERSION, metavcoinNode.metavcoinNodeVersionRequiredWipe)
  }

  config = {
    wipe: process.env.WIPE || process.argv.indexOf('--wipe') > -1 || process.argv.indexOf('wipe') > -1 || metavcoinNode.metavcoinNodeVersionRequiredWipe,
    wipeFull: process.env.WIPEFULL || process.argv.indexOf('--wipe full') > -1 || process.argv.indexOf('wipefull') > -1,
    isMining: getInitialIsMining(),
    net: getInitialNet(),
  }

  init() {
    console.log('[metavcoin NODE]: LAUNCHING metavcoin NODE')
    try {
      const node = spwanmetavcoinNodeChildProcess(this.metavcoinNodeArgs, getmetavcoinNodePath())
      this.node = node
      this.node.on('error', (err) => this.onmetavcoinNodeError('this.node.on(error)', err))
      this.node.on('message', this.onMessage)
      if (this.config.wipe || this.config.wipeFull) {
        this.updateLastWipeInDb()
      }
      // reset wipe/wipefull args in case node was restarted with them
      this.config.wipe = false
      this.config.wipeFull = false
      this.node.stderr.pipe(process.stderr)
      this.node.stderr.on('data', this.onmetavcoinNodeStderr)
      this.node.stdout.pipe(process.stdout)
      this.node.stdout.on('data', this.onBlockchainLog)
      ipcMain.once(IPC_RESTART_metavcoin_NODE, this.onRestartmetavcoinNode)
      this.node.on('exit', this.onmetavcoinNodeExit)
    } catch (err) {
      this.onmetavcoinNodeError('init catch', err)
    }
  }

  onBlockchainLog = (chunk) => {
    const log = chunk.toString('utf8')
    this.logs = [...this.logs, log].slice(-100)
    this.webContents.send(IPC_BLOCKCHAIN_LOGS, log)
  }
  onmetavcoinNodeStderr = (chunk) => {
    const log = chunk.toString('utf8')
    this.logs = [...this.logs, log].slice(-100)
    shout('metavcoin node stderr', log)
  }

  onRestartmetavcoinNode = (event, args) => {
    if ('net' in args) {
      this.webContents.send('switchChain', args.net)
      this.webContents.reloadIgnoringCache()
    }
    this.config = { ...this.config, ...args }
    this.node.kill(metavcoin_NODE_RESTART_SIGNAL)
  }

  onmetavcoinNodeExit = (code, signal) => {
    if (signal === metavcoin_NODE_RESTART_SIGNAL) {
      shout('[metavcoin NODE]: Restart through GUI')
      this.init()
    } else if (code === 1) {
      shout('metavcoin node non zero exit code')
      dialog.showErrorBox(
        'metavcoin node uncaught error',
        'Non zero exit code (app will shutdown)',
      )
      if (this.webContentsFinishedLoad) {
        this.webContents.send(IPC_metavcoin_NODE_NON_ZERO_EXIT, this.logs)
      } else {
        this.ipcMessagesToSendOnFinishedLoad.push({
          signal: IPC_metavcoin_NODE_NON_ZERO_EXIT,
          data: this.logs,
        })
      }
      this.onError(new Error(`metavcoin node non zero exit code. logs: ${this.logs.join('\n')}`))
    } else {
      console.log('[metavcoin NODE]: Closed')
      this.onClose()
    }
  }
  updateLastWipeInDb() {
    db.set('lastWipe', {
      timestamp: Date.now(),
      walletVersion: WALLET_VERSION,
      metavcoinNodeVersion: metavcoin_NODE_VERSION,
    }).write()
  }
  onmetavcoinNodeError(identifier, err) {
    shout(`[metavcoin NODE]: ${identifier}\n`, err)
    dialog.showErrorBox(
      `${err.message} (Wallet will shutdown)`,
      err.stack,
    )
    this.onError(err, { errorType: `metavcoin node: ${identifier}` })
    this.onClose()
  }
  onMessage = (message) => {
    shout('[metavcoin NODE]: message:\n', message)
  }
  onWebContentsFinishLoad() {
    this.webContentsFinishedLoad = true
    this.ipcMessagesToSendOnFinishedLoad.forEach(({ signal, data }) => {
      this.webContents.send(signal, data)
    })
    // if user started the app, changed net, and hit refresh, the renderer process
    // will load the initial chain while the metavcoin node will remain on the changed net
    if (this.netChangedSinceInit) {
      this.webContents.send('switchChain', this.config.net)
    }
  }
  get netChangedSinceInit() {
    return getInitialNet() !== this.config.net
  }
  get metavcoinNodeArgs() {
    const {
      isMining, wipe, wipeFull, net,
    } = this.config
    const args = []
    if (wipe) {
      args.push('--wipe')
    } else if (wipeFull) {
      args.push('--wipe', 'full')
    }
    if (isMining) {
      args.push('--miner')
    }
    if (net === 'test') {
      args.push('--'.concat(net))
    }

    if (process.env.metavcoin_NODE_API_PORT) {
      args.push('--api', `127.0.0.1:${process.env.metavcoin_NODE_API_PORT}`)
    }

    shout('[metavcoin NODE]: metavcoin node args', args)
    return args
  }
}

export default metavcoinNode

export function getmetavcoinNodePath() {
  return isInstalledWithInstaller()
    // $FlowFixMe
    ? path.join(process.resourcesPath, 'node_modules', '@metavcoin', 'metavcoin-node')
    : path.join(__dirname, '..', 'node_modules', '@metavcoin', 'metavcoin-node')
}

function isInstalledWithInstaller() {
  return !process.resourcesPath.includes(path.join('node_modules', 'electron', 'dist'))
}

export function getInitialIsMining() {
  if (initialNetIsMainnet()) {
    return false
  }
  return !!(process.env.MINER || process.argv.indexOf('--miner') > -1 || process.argv.indexOf('miner') > -1 || db.get('config.isMining').value())
}

function getInitialNet() {
  if (process.env.metavcoin_LOCAL_NET) {
    return 'local'
  }
  if (process.env.metavcoin_TEST_NET) {
    return 'test'
  }
  return ''
}

function doesmetavcoinNodeVersionRequiredWipe() {
  let latestmetavcoinNodeVersionRequiringWipe = '1.0.0'
  if (getInitialNet() === 'test') {
    latestmetavcoinNodeVersionRequiringWipe = '1.0.1'
  }
  // first time user installs a version of the wallet with this flag feature,
  // or when user resets his local DB for any reason, we use the mocked version 0.0.0
  // to make sure wipe will happen, in case user has non valid chain
  const mockNoWipeRecordVersion = '0.0.0'
  const lastWipedOnmetavcoinNodeVersion = db.get('lastWipe.metavcoinNodeVersion').value() || mockNoWipeRecordVersion
  const isWipeNeeded = compare(latestmetavcoinNodeVersionRequiringWipe, lastWipedOnmetavcoinNodeVersion) === 1
  console.log(`
********** WIPE DUE TO metavcoin NODE VERSION NEEDED? **********
${isWipeNeeded ? 'Yes' : 'No'}
Last version requiring wipe: ${latestmetavcoinNodeVersionRequiringWipe}
Last wiped on version: ${lastWipedOnmetavcoinNodeVersion === mockNoWipeRecordVersion ? 'no local record of wiping found' : lastWipedOnmetavcoinNodeVersion}
********** WIPE DUE TO metavcoin NODE VERSION NEEDED? **********
`)
  return isWipeNeeded
}

function initialNetIsMainnet() {
  return getInitialNet() === ''
}
