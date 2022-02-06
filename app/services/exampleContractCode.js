export default `(* NAME_START:Example Token:NAME_END *)
open metavcoin.Types
open metavcoin.Base
open metavcoin.Cost
open metavcoin.Asset
open metavcoin.Data

module D = metavcoin.Dictionary
module W = metavcoin.Wallet
module RT = metavcoin.ResultT
module Tx = metavcoin.TxSkeleton
module C = metavcoin.Cost
module CR = metavcoin.ContractResult

let buy txSkeleton contractId returnAddress =
  let! contractToken = metavcoin.Asset.getDefault contractId in
  let! amount = Tx.getAvailableTokens metavcoinAsset txSkeleton in

  let! txSkeleton =
    Tx.lockToContract metavcoinAsset amount contractId txSkeleton
    >>= Tx.mint amount contractToken
    >>= Tx.lockToAddress contractToken amount returnAddress in

  CR.ofTxSkel txSkeleton

let redeem txSkeleton contractId returnAddress wallet =
  let! contractToken = metavcoin.Asset.getDefault contractId in
  let! amount = Tx.getAvailableTokens contractToken txSkeleton in

  let! txSkeleton =
    Tx.destroy amount contractToken txSkeleton
    >>= Tx.lockToAddress metavcoinAsset amount returnAddress
    >>= Tx.fromWallet metavcoinAsset amount contractId wallet in

  CR.ofOptionTxSkel "contract doesn't have enough metavcoins tokens" txSkeleton

let main txSkeleton _ contractId command sender messageBody wallet state =
  let! returnAddress =
    messageBody >!= tryDict
                >?= D.tryFind "returnAddress"
                >?= tryLock
  in
  match returnAddress with
  | Some returnAddress ->
    if command = "redeem" then
      redeem txSkeleton contractId returnAddress wallet
    else if command = "" || command = "buy" then
      buy txSkeleton contractId returnAddress
      |> autoInc
    else
      RT.autoFailw "unsupported command"
  | None ->
    RT.autoFailw "returnAddress is required"

let cf _ _ _ _ _ wallet _ =
    4 + 64 + 2 + (64 + (64 + (64 + 64 + (metavcoin.Wallet.size wallet * 128 + 192) + 3)) + 25) + 31
    |> C.ret #nat`
