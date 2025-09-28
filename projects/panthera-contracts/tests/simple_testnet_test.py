#!/usr/bin/env python3

import os, json
from dotenv import load_dotenv
from algosdk import v2client, abi, transaction, encoding
from algosdk.atomic_transaction_composer import AtomicTransactionComposer, AccountTransactionSigner, TransactionWithSigner
from algokit_utils.account import get_account_from_mnemonic

load_dotenv()

def main():
    algod_client = v2client.algod.AlgodClient(
        algod_token="",
        algod_address="https://testnet-api.algonode.cloud",
        headers={"User-Agent": "algosdk"}
    )
    
    CREATOR_MNEMONIC = os.environ.get("DEPLOYER_MNEMONIC")
    creator = get_account_from_mnemonic(CREATOR_MNEMONIC)
    signer = AccountTransactionSigner(creator.private_key)

    app_id = 746512710  
    
    print("Testnet Agent Factory Test")
    print(f"App ID: {app_id}")
    print(f"Account: {creator.address}")
    
    account_info = algod_client.account_info(creator.address)
    balance = account_info['amount']
    print(f"Balance: {balance/1000000} ALGO")
    
    if balance < 5_000_000: 
        print("Insufficient balance! Testnet faucet: https://testnet.algoexplorer.io/dispenser")
        return
    
    try:
        with open('smart_contracts/artifacts/agent_factory/AgentFactory.arc56.json') as f:
            contract_spec = json.load(f)
        contract = abi.Contract.from_json(json.dumps(contract_spec))
        
        app_address = encoding.encode_address(encoding.checksum(b'appID' + (app_id).to_bytes(8, 'big')))
        print(f"App address: {app_address}")

        print("\n=== Creating Agent ===")
        create_agent_method = contract.get_method_by_name("create_agent")
        atc1 = AtomicTransactionComposer()
        atc1.add_method_call(
            app_id=app_id,
            method=create_agent_method,
            sender=creator.address,
            sp=algod_client.suggested_params(),
            signer=signer,
            method_args=["TestnetAgent", "TNA"]
        )
        result1 = atc1.execute(algod_client, 4)
        asa_id = result1.abi_results[0].return_value
        print(f"✅ ASA ID: {asa_id}")
        print(f"🔗 Explorer: https://lora.algokit.io/testnet/asset/{asa_id}")

        print("\n=== Opt-in to ASA ===")
        sp = algod_client.suggested_params()
        opt_in_txn = transaction.AssetTransferTxn(
            sender=creator.address,
            sp=sp,
            receiver=creator.address,
            amt=0,
            index=asa_id
        )
        signed_opt_in = opt_in_txn.sign(creator.private_key)
        txid = algod_client.send_transaction(signed_opt_in)
        print(f"✅ Opt-in TxID: {txid}")
        print(f"🔗 Opt-in TX: https://lora.algokit.io/testnet/tx/{txid}")

        print("\n=== Check Graduation Threshold ===")
        eligibility_method = contract.get_method_by_name("check_graduation_eligibility")
        atc3 = AtomicTransactionComposer()
        atc3.add_method_call(
            app_id=app_id,
            method=eligibility_method,
            sender=creator.address,
            sp=algod_client.suggested_params(),
            signer=signer,
            method_args=[]
        )
        result3 = atc3.execute(algod_client, 4)
        eligible, current_reserve, threshold = result3.abi_results[0].return_value
        
        print(f"Current reserve: {current_reserve/1000000} ALGO")
        print(f"Graduation threshold: {threshold/1000000} ALGO")
        
        buy_amount = 3_000_000 
        print(f"\n=== Buying {buy_amount/1000000} ALGO worth of tokens ===")
        
        buy_method = contract.get_method_by_name("buy_agent_tokens")
        payment_txn = transaction.PaymentTxn(
            sender=creator.address,
            sp=algod_client.suggested_params(),
            receiver=app_address,
            amt=buy_amount
        )
        
        atc4 = AtomicTransactionComposer()
        atc4.add_transaction(TransactionWithSigner(payment_txn, signer))
        atc4.add_method_call(
            app_id=app_id,
            method=buy_method,
            sender=creator.address,
            sp=algod_client.suggested_params(),
            signer=signer,
            method_args=[asa_id],
            foreign_assets=[asa_id]
        )
        
        result4 = atc4.execute(algod_client, 4)
        tokens = result4.abi_results[0].return_value
        print(f"✅ Tokens received: {tokens}")
        print(f"🔗 Buy TX: https://lora.algokit.io/testnet/tx/{result4.tx_ids[1]}")

        print("\n=== Final Status ===")
        atc5 = AtomicTransactionComposer()
        atc5.add_method_call(
            app_id=app_id,
            method=eligibility_method,
            sender=creator.address,
            sp=algod_client.suggested_params(),
            signer=signer,
            method_args=[]
        )
        result5 = atc5.execute(algod_client, 4)
        eligible, current_reserve, threshold = result5.abi_results[0].return_value
        
        print(f"Reserve after buy: {current_reserve/1000000} ALGO")
        print(f"Graduation eligible: {'Yes' if eligible else 'No'}")

        print("\n" + "="*60)
        print("🎉 TESTNET TEST SUCCESS!")
        print("="*60)
        print(f"ASA ID: {asa_id}")
        print(f"Token: TestnetAgent (TNA)")
        print(f"🔍 Tinyman Search: https://testnet.tinyman.org")
        print(f"🔍 Search for: {asa_id} or TNA")
        print("="*60)

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()