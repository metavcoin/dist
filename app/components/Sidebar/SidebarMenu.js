import React, { Component } from 'react'
import { observer } from 'mobx-react'
import { NavLink } from 'react-router-dom'
import { Online } from 'react-detect-offline'

import routes from '../../constants/routes'


@observer
class SidebarMenu extends Component<Props> {
  render() {
    return (
      <div className="menu">
        <ul>
          <li> <NavLink to={routes.PORTFOLIO} activeClassName="active">Portfolio</NavLink></li>
          <li> <NavLink to={routes.SEND_TX} activeClassName="active">Send</NavLink></li>
          <li> <NavLink to={routes.RECEIVE} activeClassName="active">Receive</NavLink></li>
          <li> <NavLink to={routes.TX_HISTORY} activeClassName="active">Transactions</NavLink></li>
          <Online><li> <NavLink to={routes.ACTIVE_CONTRACTS} activeClassName="active">Active Contracts</NavLink></li></Online>
          <li> <NavLink to={routes.SAVED_CONTRACTS} activeClassName="active">Saved Contracts</NavLink></li>
          <li> <NavLink to={routes.AUTHORIZED_x} activeClassName="active">Community Vote</NavLink></li>
          <li> <NavLink to={routes.CGP} activeClassName="active">Common goods pool</NavLink></li>
          <Online><li> <NavLink to={routes.BLOCKCHAIN_LOGS} activeClassName="active">Blockchain Logs</NavLink></li></Online>
          <li> <NavLink to={routes.SETTINGS} activeClassName="active">Settings</NavLink></li>
        </ul>
      </div>
    )
  }
}

export default SidebarMenu
