// @flow

import React, { Component } from 'react'
import Flexbox from 'flexbox-react'
import { inject, observer } from 'mobx-react'
import cx from 'classnames'
import FontAwesomeIcon from '@fortawesome/react-fontawesome'
import { isEmpty } from 'lodash'
import { toJS, runInAction } from 'mobx'

import AuthorizedxStore from '../../stores/authorizedxStore'
import PublicAddressStore from '../../stores/publicAddressStore'
import RunContractStore from '../../stores/runContractStore'
import { isValidHex, numberWithCommas } from '../../utils/helpers'
import { ref } from '../../utils/domUtils'
import Layout from '../../components/Layout'
import Loading from '../../components/Loading'
import IsValidIcon from '../../components/IsValidIcon'
import FormResponseMessage from '../../components/FormResponseMessage'
import ExternalLink from '../../components/ExternalLink'
import { kalapasTometavcoin } from '../../utils/metavcoinUtils'
import { MAINNET } from '../../constants'
import NetworkStore from '../../stores/networkStore'
import BoxLabel from '../../components/BoxLabel/BoxLabel'
import PortfolioStore from '../../stores/portfolioStore'
import AutoSuggestCandidates from '../../components/AutoSuggestCandidates/AutoSuggestCandidates'
import PasteButton from '../../components/PasteButton'
import { protectedModals } from '../../components/Buttons/ProtectedButton'
import voteOnceModal from '../../components/VoteOnce/VoteOnceModal'


type Props = {
  authorizedxStore: AuthorizedxStore,
  publicAddressStore: PublicAddressStore,
  runContractStore: RunContractStore,
  networkStore: NetworkStore,
  portfolioStore: PortfolioStore
};

type State = {
  hasVoted: boolean,
  zeroBalance: boolean,
  isCandidate: boolean
};

@inject('authorizedxStore', 'publicAddressStore', 'runContractStore', 'networkStore', 'portfolioStore')
@observer
class Authorizedx extends Component<Props, State> {
  state = {
    inProgress: false,
    hasVoted: undefined,
    zeroBalance: undefined,
    isCandidate: undefined,
  }
  componentDidMount() {
    this.props.authorizedxStore.getVote()
      .then(bool => this.setState({ hasVoted: bool }))
      .catch(error => console.error(error))
    runInAction(async () => {
      await this.props.authorizedxStore.fetch()
      await this.props.publicAddressStore.fetch()
      await this.props.authorizedxStore.getSnapshotBalance()
      this.setState({
        zeroBalance: this.props.authorizedxStore.snapshotBalance === 0,
        isCandidate: this.props.authorizedxStore.phase === 'Candidate',
      })
      this.props.authorizedxStore.initPolling()
    })
  }

  componentWillUnmount() {
    this.props.authorizedxStore.stopPolling()
  }

  onCommitChanged = (evt: SyntheticEvent<HTMLInputElement>) => {
    const { authorizedxStore } = this.props
    authorizedxStore.updateCommitDisplay(evt.currentTarget.value.trim())
  }

  onCommitChangedSuggest = (evt) => {
    const { authorizedxStore } = this.props
    authorizedxStore.updateCommitDisplay(evt)
  }

  onReset = () => {
    this.AutoSuggestCandidates.wrappedInstance.reset()
  }

  renderCommitErrorMessage() {
    if (isEmpty(this.props.authorizedxStore.commit) ? false : !this.isCommitValid) {
      return (
        <div className="error input-message">
          <FontAwesomeIcon icon={['far', 'exclamation-circle']} />
          <span>Commit identifier is invalid, it expect 40 hex characters</span>
        </div>
      )
    }
  }
  format(balance) {
    return balance >= kalapasTometavcoin(1) ? kalapasTometavcoin(balance) : balance
  }

  renderSuccessResponse() {
    if (!this.props.authorizedxStore.isVotingInterval) return null
    if (!this.state.hasVoted) return null
    if (this.state.zeroBalance) return null
    const vote =
      this.props.authorizedxStore.votedCommit || this.props.authorizedxStore.commit
    return (
      <MessageWithExplorerLink
        showLink
        message={
          (
            <span>
              <span> Your vote for { this.state.isCandidate ? 'the next commit ID' : 'a potential candidate' } was successfully broadcast</span>
              <br />
              <span className="devider" />
              <span> You voted for commit ID: {vote} with a vote weight of { '  ' }
                {this.props.authorizedxStore.snapshotBalance ?
                  numberWithCommas(this.format(this.props.authorizedxStore.snapshotBalance)) : 0} ZP { '  ' }
              </span>
            </span>
          )
        }
        chain={this.props.networkStore.chain}
        isVoting
        success
      />
    )
  }


  renderErrorResponse() {
    const { status, errorMessage } = this.props.runContractStore
    if (status !== 'error') {
      return null
    }
    return (
      <FormResponseMessage className="error">
        <span>There was a problem with the vote.</span>
        <span className="devider" />
        <p>Error message: {errorMessage}</p>
      </FormResponseMessage>
    )
  }

  get getLink() {
    const { networkStore } = this.props
    return networkStore.chain === MAINNET ? '' : 'testnet.'
  }

  renderIntervalEnded() {
    if (!this.props.authorizedxStore.isBetweenInterval
      && !this.props.authorizedxStore.isBeforeSnapshot
      && !this.props.authorizedxStore.isVotingInterval) {
      return (
        <MessageWithExplorerLink
          showLink
          message="Votes were already tallied."
          chain={this.props.networkStore.chain}
          isFinished
        />
      )
    }
  }

  isBSCandidateText() {
    if (this.props.authorizedxStore.isBetweenInterval) return 'next commit ID'
    return this.state.isCandidate ? 'next commit ID' : 'potential candidates'
  }

  renderBeforeSnapshot() {
    if (this.props.authorizedxStore.isVotingInterval) return null
    if (this.props.authorizedxStore.phase === undefined) return null
    if (this.props.authorizedxStore.phase === undefined) return null
    if (!this.props.authorizedxStore.isBetweenInterval
      && !this.props.authorizedxStore.isBeforeSnapshot
      && !this.props.authorizedxStore.isVotingInterval) return null
    return (
      <MessageWithExplorerLink
        showLink={
          !(this.state.isCandidate && !this.props.authorizedxStore.isBetweenInterval)
        }
        message={
          (
            <span>
              { this.props.authorizedxStore.isBetweenInterval &&
                <span> Votes of the Contestants Phase were tallied.
                  <br />
                </span>
              }
              The voting period for the { this.isBSCandidateText() } {' '}
              will begin after the snapshot block.
              <br />
              Your vote weight will consist of your total ZP at the snapshot block.
            </span>
          )
        }
        chain={this.props.networkStore.chain}
        isFinished={this.props.authorizedxStore.isBetweenInterval}
      />
    )
  }
  renderNoCandidates() {
    if (isEmpty(this.props.authorizedxStore.candidates)
        && this.state.isCandidate && this.props.authorizedxStore.isVotingInterval) {
      return (
        <MessageWithExplorerLink
          showLink
          message="There were no contestants which passed the eligibility threshold, therefore there are no eligible candidates for the community vote."
          chain={this.props.networkStore.chain}
        />
      )
    }
    return null
  }

  onSubmitButtonClicked = async () => {
    const confirmedVoteOnce = await voteOnceModal()
    if (!confirmedVoteOnce) return
    this.setState({ inProgress: true })
    // prevent enter from closing the new swal HACK
    setTimeout(async () => {
      try {
        const password = await protectedModals()
        if (password) {
          await this.props.authorizedxStore.submitVote(password)
          this.setState({ hasVoted: true })
        }
      } catch (error) {
        console.log(error.message)
      }
      this.setState({ inProgress: false })
    }, 100)
  }

  get isSubmitButtonDisabled() {
    const { inprogress } = this.props.authorizedxStore
    return inprogress || !this.isCommitValid || this.state.inProgress
  }

  get isCommitValid() {
    const { commit } = this.props.authorizedxStore
    return (commit.length === 40) && isValidHex(commit)
  }

  renderNoZP() {
    if (!this.props.authorizedxStore.isVotingInterval) return null
    if (!this.state.zeroBalance) return null
    return (
      <MessageWithExplorerLink
        showLink
        message="You did not have any ZP at the snapshot block."
        chain={this.props.networkStore.chain}
        isVoting
      />
    )
  }

  isCandidateText() {
    if (!this.props.authorizedxStore.isVotingInterval) return ''
    return `- ${this.state.isCandidate ? 'Candidates' : 'Contestants'} Phase`
  }

  snapshotText() {
    if (this.props.authorizedxStore.phase === undefined) return ''
    return `${this.state.isCandidate ? 'Vote' : 'Proposal'}`
  }

  renderTitle() {
    const isTest = this.props.networkStore.chain !== MAINNET
    return (
      <Flexbox flexDirection="column" className="repo-vote-container">
        <Flexbox className="page-title" flexDirection="column">
          <h1>Community Vote {this.isCandidateText()}</h1>
          { isTest && <br /> }
          <h2> {isTest && <span className="orange" >You are currently casting a vote on the testnet.</span> }</h2>
          {isTest && <br /> }
          <h3 className="page-title">
            Token holders can influence x changes by simply
            taking a vote on their preferred {!this.state.isCandidate ? 'proposal' : 'commit ID'}.
            <br />
            The community vote is split into two phases, each phase has it???s own snapshot:
            <br />
            <ul className="ul-auth">
              <li>
                <span className="bold"> Proposal Phase</span>:  Proposals which received an aggregated vote
                weight of more than 3% of
                <br />
                the outstanding ZP will be considered
                eligible release candidates in the community vote.
              </li>
              <li>
                <span className="bold"> Vote Phase</span>: Vote on the eligible release candidates.
                The release candidate which wins
                <br />
                the community vote must be upgraded to prior to the version expiry.
              </li>
            </ul>
            Please visit the { ' ' }
            <ExternalLink link={`https://${this.getLink}zp.io/governance`} >
              <span className="underline" >
                Block Explorer
              </span>
            </ExternalLink>.
            to view the progress of the community vote

            <br />
          </h3>
          <Flexbox flexDirection="row" className="box-bar">
            <BoxLabel firstLine="Current Block" secondLine={numberWithCommas(this.props.networkStore.blocks)} />
            { this.props.authorizedxStore.isBeforeSnapshot && <BoxLabel secondLine={numberWithCommas(this.props.authorizedxStore.snapshotBlock)} firstLine={`${this.snapshotText()} Snapshot Block`} />}
            { this.props.authorizedxStore.isBetweenInterval && !this.props.authorizedxStore.isVotingInterval && !this.props.authorizedxStore.isBeforeSnapshot && <BoxLabel secondLine={numberWithCommas(this.props.authorizedxStore.nextSnapshotBlock)} firstLine="Vote Snapshot Block" />}
            { this.props.authorizedxStore.isVotingInterval && <BoxLabel secondLine={numberWithCommas(this.props.authorizedxStore.tallyBlock)} firstLine={`${this.snapshotText()} Tally Block`} />}
            { !this.props.authorizedxStore.isVotingInterval && <BoxLabel secondLine={`${this.props.portfolioStore.metavcoinDisplay} ZP `} firstLine="Potential Vote Weight" />}
            { this.props.authorizedxStore.isVotingInterval && <BoxLabel secondLine={`${numberWithCommas(kalapasTometavcoin(this.props.authorizedxStore.snapshotBalance))} ZP`} firstLine="Your Vote Weight" />}
          </Flexbox>
        </Flexbox>
      </Flexbox>
    )
  }

  renderContestantBox() {
    const {
      authorizedxStore: {
        commit,
      },
    } = this.props
    return (
      !this.state.zeroBalance && !this.state.hasVoted
    && this.props.authorizedxStore.isVotingInterval
    && !this.state.isCandidate &&
    <Flexbox flexDirection="column" className="form-container">
      <Flexbox flexDirection="column" className="form-row">
        <label htmlFor="commit">Propose a candidate</label>
        <Flexbox flexDirection="row" className="destination-address-input">
          <Flexbox flexDirection="column" className="full-width relative">
            <input
              id="commit"
              name="commit"
              ref={ref('commit').bind(this)}
              type="text"
              placeholder="Commit ID"
              className={cx({ 'is-valid': this.isCommitValid, error: isEmpty(commit) ? false : !this.isCommitValid })}
              onChange={this.onCommitChanged}
              value={commit}
              autoFocus
            />
            <IsValidIcon
              isValid={this.isCommitValid}
              className="input-icon"
              hasColors
              isHidden={!commit}
            />
            {this.renderCommitErrorMessage()}

          </Flexbox>
          <PasteButton className="button-on-right" onClick={this.onCommitChangedSuggest} />
        </Flexbox>
      </Flexbox>
    </Flexbox>
    )
  }
  renderCandidateBox() {
    const {
      authorizedxStore: {
        candidates,
      },
    } = this.props
    if (isEmpty(candidates)) return null
    return (
      !this.state.zeroBalance && !this.state.hasVoted
    && this.props.authorizedxStore.isVotingInterval
    && this.state.isCandidate &&
    <Flexbox flexDirection="column" className="form-container">
      <Flexbox flexDirection="column" className="form-row">
        <Flexbox flexDirection="row" className="destination-address-input">
          <Flexbox flexDirection="column" className="full-width relative">
            <AutoSuggestCandidates
              title="Vote for a candidate"
              suggestionArray={toJS(candidates)}
              onUpdateParent={this.onCommitChangedSuggest}
              ref={ref('AutoSuggest').bind(this)}
            />
          </Flexbox>
        </Flexbox>
      </Flexbox>
    </Flexbox>
    )
  }

  render() {
    const {
      authorizedxStore: {
        inprogress, candidates,
      },
    } = this.props
    if (this.state.hasVoted === undefined || this.state.zeroBalance === undefined) {
      return (
        <Layout className="repo-vote">
          { this.renderTitle() }
          <Loading />
        </Layout>
      )
    }
    return (
      <Layout className="repo-vote">
        <Flexbox flexDirection="column" className="repo-vote-container">
          { this.renderTitle() }
          { this.renderContestantBox() }
          { this.renderCandidateBox() }


          <Flexbox flexDirection="row">
            {this.state.zeroBalance && this.renderNoZP()}
            { this.renderSuccessResponse() }
            { this.renderErrorResponse() }
            { this.renderIntervalEnded() }
            { this.renderBeforeSnapshot() }
            { this.renderNoCandidates() }
            <Flexbox flexGrow={2} />
            {!this.state.zeroBalance && !this.state.hasVoted
            && this.props.authorizedxStore.isVotingInterval
            && (!this.state.isCandidate || !isEmpty(candidates)) &&
            <Flexbox flexGrow={1} justifyContent="flex-end" flexDirection="row">
              <button
                className={cx('button-on-right', { loading: inprogress })}
                disabled={this.isSubmitButtonDisabled}
                onClick={this.onSubmitButtonClicked}
              >
                {inprogress ? 'Voting' : 'Vote'}
              </button>
            </Flexbox>}
          </Flexbox>
        </Flexbox>
      </Layout>
    )
  }
}

export default Authorizedx

function MessageWithExplorerLink({
  // eslint-disable-next-line react/prop-types
  message, chain = 'mainnet', showLink = false, isVoting = false, success = false, isFinished = false,
}) {
  const link = chain === MAINNET ? '' : 'testnet.'
  return (
    <Flexbox flexGrow={2} flexDirection="row" className={cx('form-response-message', success ? 'success' : 'warning')}>
      <FontAwesomeIcon icon={['far', 'exclamation-circle']} />
      <Flexbox flexDirection="column">
        <p>{message}</p>
        {showLink &&
        <span className="devider" /> }
        {showLink && (
          <p>
            Please go to the
            <ExternalLink link={`https://${link}zp.io/governance`} >
              {' '}<span className="underline">Block Explorer</span>{' '}
            </ExternalLink>
            {/* eslint-disable-next-line no-nested-ternary */}
            {isFinished ? 'to see the winner.' : isVoting ? 'to see the ongoing results.' : 'to see the past results.'}
          </p>
        )}
      </Flexbox>
    </Flexbox>
  )
}
