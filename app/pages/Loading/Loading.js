import React, { Component } from 'react'
import Flexbox from 'flexbox-react'

import { LOADING_GIF_SRC, LOGO_GIF_SRC } from '../../constants/imgSources'

import load from './loadUtil'

const TIME_TO_DISPLAY_LOADING = 3650

class Loading extends Component {
  state = {
    shouldDisplayLoading: false,
  }

  componentDidMount() {
    load()
    this.timeout = setTimeout(() => {
      this.setState({ shouldDisplayLoading: true })
    }, TIME_TO_DISPLAY_LOADING)
  }

  componentWillUnmount() {
    clearTimeout(this.timeout)
  }

  render() {
    const { shouldDisplayLoading } = this.state
    return (
      <Flexbox flexDirection="column" className="loading-container">
        <Flexbox flexDirection="column" className="center">
          <img className="metavcoin-logo" src={LOGO_GIF_SRC} alt="metavcoin Logo" />
          <h1>Welcome to metavcoin</h1>
          <p>Loading, please wait</p>
          {shouldDisplayLoading && <img className="loading-dots" src={LOADING_GIF_SRC} alt="Loading Gif" />}
        </Flexbox>
      </Flexbox>
    )
  }
}

export default Loading
