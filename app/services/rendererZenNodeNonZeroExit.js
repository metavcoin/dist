import { remote, ipcRenderer } from 'electron'
import swal from 'sweetalert'

import { IPC_metavcoin_NODE_NON_ZERO_EXIT } from '../metavcoinNode'
import { BUG_BOUNTY_URL } from '../constants'

ipcRenderer.on(IPC_metavcoin_NODE_NON_ZERO_EXIT, async (evt, logs) => {
  await swal({
    title: 'There was an uncaught error in the metavcoin node',
    text: `Please copy and paste the following text and follow the steps at ${BUG_BOUNTY_URL}:\n\n ${logs.join('')}`,
    icon: 'error',
    className: 'metavcoin-node-non-zero-exit-modal',
  })
  remote.app.quit()
})
