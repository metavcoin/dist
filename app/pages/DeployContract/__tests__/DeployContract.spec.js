import React from 'react'
import { shallow } from 'enzyme'

import DeployContractStore from '../../../stores/deployContractStore'
import PortfolioStore from '../../../stores/portfolioStore'
import DeployContractContainer from '../DeployContract'
import { calcMaxBlocksForContract } from '../deployContractUtils'
import mockDb from '../../../../test/mockDbDefaultData'

jest.mock('electron', () => ({
  ipcRenderer: { on: jest.fn() },
}))

describe('calcMaxBlocksForContract', () => {
  let metavcoinBalance
  let codeLength
  it('should return 0 when there are no metavcoinP', () => {
    metavcoinBalance = '0'
    codeLength = 0
    expect(calcMaxBlocksForContract(metavcoinBalance, codeLength)).toEqual(0)
  })
  it('should return 0 when codeLength is 0', () => {
    metavcoinBalance = '0'
    codeLength = 0
    expect(calcMaxBlocksForContract(metavcoinBalance, codeLength)).toEqual(0)
  })
  it('should return 5', () => {
    metavcoinBalance = '10'
    codeLength = 2
    expect(calcMaxBlocksForContract(metavcoinBalance, codeLength)).toEqual(5 * 100000000)
  })
  it('should return round down', () => {
    metavcoinBalance = '10'
    codeLength = 3
    expect(calcMaxBlocksForContract(metavcoinBalance, codeLength)).toEqual(333333333)
  })
})

const DeployContract = DeployContractContainer.wrappedComponent.wrappedComponent
jest.doMock('services/db', () => mockDb)

describe.skip('DeployContract', () => {
  const contract = new DeployContractStore()
  const portfolioStore = new PortfolioStore()
  const component = shallow(<DeployContract contract={contract} portfolioStore={portfolioStore} />)

  it('renders to the dom', () => {
    expect(component.find('Layout').length).toBe(1)
  })
})
