#!/usr/bin/env python3

import os, json, base64
from dotenv import load_dotenv
from algokit_utils import AlgorandClient
from algosdk import abi
from algosdk.atomic_transaction_composer import AtomicTransactionComposer, AccountTransactionSigner
from algokit_utils.account import get_account_from_mnemonic

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
load_dotenv(dotenv_path=os.path.join(BASE_DIR, ".env"))

def test_quotes_only():
    algorand = AlgorandClient.default_localnet()
    CREATOR_MNEMONIC = os.environ.get("DEPLOYER_MNEMONIC")
    creator = get_account_from_mnemonic(CREATOR_MNEMONIC)
    signer = AccountTransactionSigner(creator.private_key)
    app_id = 746512473

    with open('smart_contracts/artifacts/agent_factory/AgentFactory.arc56.json') as f:
        contract_spec = json.load(f)
    contract = abi.Contract.from_json(json.dumps(contract_spec))

    amounts_to_test = [1000, 5000, 10000, 50000]  
    
    for amount in amounts_to_test:
        print(f"\n=== Testing Buy Quote for {amount/1000000} ALGO ===")
        try:
            buy_quote_method = contract.get_method_by_name("get_buy_quote")
            atc = AtomicTransactionComposer()
            atc.add_method_call(
                app_id=app_id,
                method=buy_quote_method,
                sender=creator.address,
                sp=algorand.client.algod.suggested_params(),
                signer=signer,
                method_args=[amount]
            )
            result = atc.execute(algorand.client.algod, 4)
            tokens_out, current_price, new_price = result.abi_results[0].return_value
            print(f"✅ Tokens out: {tokens_out}")
            print(f"✅ Current price: {current_price}")
            print(f"✅ New price: {new_price}")
            
            print(f"✅ Safe amount found: {amount/1000000} ALGO")
            return amount
            
        except Exception as e:
            print(f"❌ Failed: {e}")
            continue
    
    print("❌ All amounts failed - bonding curve math needs fixing")
    return None

if __name__ == "__main__":
    test_quotes_only()