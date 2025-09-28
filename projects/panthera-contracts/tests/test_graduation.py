#!/usr/bin/env python3

import os, json
from dotenv import load_dotenv
from algosdk import v2client, abi, transaction, encoding
from algosdk.atomic_transaction_composer import AtomicTransactionComposer, AccountTransactionSigner, TransactionWithSigner
from algokit_utils.account import get_account_from_mnemonic

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
load_dotenv(dotenv_path=os.path.join(BASE_DIR, ".env"))

def main():
    algod_client = v2client.algod.AlgodClient(
        algod_token="",
        algod_address="https://testnet-api.algonode.cloud",
        headers={"User-Agent": "algosdk"}
    )
    
    CREATOR_MNEMONIC = os.environ.get("DEPLOYER_MNEMONIC")
    creator = get_account_from_mnemonic(CREATOR_MNEMONIC)
    signer = AccountTransactionSigner(creator.private_key)

    app_id = 746512473
    asa_id = 746515580
    
    print("🚨 EMERGENCY GRADUATION THRESHOLD FIX")
    print("Lowering threshold to testnet-friendly amount")
    print(f"App ID: {app_id}")
    print(f"ASA ID: {asa_id}")
    
    try:
        with open('smart_contracts/artifacts/agent_factory/AgentFactory.arc56.json') as f:
            contract_spec = json.load(f)
        contract = abi.Contract.from_json(json.dumps(contract_spec))
        
        app_address = encoding.encode_address(encoding.checksum(b'appID' + (app_id).to_bytes(8, 'big')))

        # Check current status
        print("\n=== Current Status ===")
        eligibility_method = contract.get_method_by_name("check_graduation_eligibility")
        atc1 = AtomicTransactionComposer()
        atc1.add_method_call(
            app_id=app_id,
            method=eligibility_method,
            sender=creator.address,
            sp=algod_client.suggested_params(),
            signer=signer,
            method_args=[]
        )
        result1 = atc1.execute(algod_client, 4)
        eligible, current_reserve, threshold = result1.abi_results[0].return_value
        
        print(f"Current Reserve: {current_reserve/1000000:.6f} ALGO")
        print(f"Current Threshold: {threshold/1000000:.6f} ALGO")
        print(f"Currently Eligible: {'YES' if eligible else 'NO'}")

        # Try to find and call an admin method to update threshold
        # Look for methods that might update graduation threshold
        print("\n=== Available Methods ===")
        for method in contract.methods:
            print(f"  - {method.name}")

        # If there's an update_graduation_threshold method, try it
        new_threshold = 30_000_000  # 30 ALGO instead of 30,000 ALGO
        
        try:
            # Try different possible method names
            method_names = [
                "update_graduation_threshold", 
                "set_graduation_threshold",
                "admin_update_threshold",
                "emergency_update_threshold"
            ]
            
            for method_name in method_names:
                try:
                    update_method = contract.get_method_by_name(method_name)
                    print(f"\n🎯 Found method: {method_name}")
                    
                    atc_update = AtomicTransactionComposer()
                    atc_update.add_method_call(
                        app_id=app_id,
                        method=update_method,
                        sender=creator.address,
                        sp=algod_client.suggested_params(),
                        signer=signer,
                        method_args=[new_threshold]
                    )
                    result_update = atc_update.execute(algod_client, 4)
                    print(f"✅ Threshold updated to {new_threshold/1000000} ALGO")
                    break
                    
                except Exception:
                    continue
            else:
                print("❌ No threshold update method found")
                
        except Exception as e:
            print(f"⚠️ Threshold update failed: {e}")

        # Alternative: Manual approach - buy exactly what we need
        print("\n=== Alternative: Precise Purchase ===")
        
        # Calculate exact amount needed to reach current reserve = 30 ALGO
        target_reserve = 30_000_000  # 30 ALGO in microALGO
        needed_algo = target_reserve - current_reserve
        
        if needed_algo <= 0:
            print("🎉 Already have enough! Trying to trigger graduation...")
        else:
            print(f"Need exactly: {needed_algo/1000000:.6f} ALGO more")
            
            # Check if we can afford it
            account_info = algod_client.account_info(creator.address)
            balance = account_info['amount']
            
            if needed_algo < balance * 0.8:  # Can afford it
                print(f"✅ Can afford it! Buying exactly {needed_algo/1000000:.6f} ALGO worth")
                
                try:
                    buy_method = contract.get_method_by_name("buy_agent_tokens")
                    
                    sp = algod_client.suggested_params()
                    payment_txn = transaction.PaymentTxn(
                        sender=creator.address,
                        sp=sp,
                        receiver=app_address,
                        amt=needed_algo
                    )
                    
                    atc_buy = AtomicTransactionComposer()
                    atc_buy.add_transaction(TransactionWithSigner(payment_txn, signer))
                    atc_buy.add_method_call(
                        app_id=app_id,
                        method=buy_method,
                        sender=creator.address,
                        sp=algod_client.suggested_params(),
                        signer=signer,
                        method_args=[asa_id],
                        foreign_assets=[asa_id]
                    )
                    
                    result_buy = atc_buy.execute(algod_client, 4)
                    tokens_received = result_buy.abi_results[0].return_value
                    
                    print(f"✅ Precise purchase successful!")
                    print(f"✅ Tokens received: {tokens_received}")
                    print(f"🔗 TX: https://testnet.algoexplorer.io/tx/{result_buy.tx_ids[1]}")
                    
                except Exception as e:
                    print(f"❌ Precise purchase failed: {e}")
            else:
                print(f"❌ Cannot afford {needed_algo/1000000:.6f} ALGO (have {balance/1000000:.6f})")

        # Final status check
        print("\n=== Final Status Check ===")
        atc_final = AtomicTransactionComposer()
        atc_final.add_method_call(
            app_id=app_id,
            method=eligibility_method,
            sender=creator.address,
            sp=algod_client.suggested_params(),
            signer=signer,
            method_args=[]
        )
        result_final = atc_final.execute(algod_client, 4)
        eligible, current_reserve, threshold = result_final.abi_results[0].return_value
        
        print(f"Final Reserve: {current_reserve/1000000:.6f} ALGO")
        print(f"Final Threshold: {threshold/1000000:.6f} ALGO")
        print(f"Final Eligible: {'YES! 🎉' if eligible else 'NO ❌'}")
        
        if eligible:
            print("\n🚀 SUCCESS! Now eligible for graduation!")
            print("You can run the graduation process.")
        else:
            print(f"\n💭 Still need {(threshold - current_reserve)/1000000:.6f} ALGO")
            print("Consider:")
            print("1. 🚰 Get more ALGO from testnet faucet")
            print("2. 📝 Deploy contract with lower threshold")
            print("3. 🔧 Use a manual graduation trigger if available")

        # Try to check if there's a manual graduation trigger
        print("\n=== Looking for Manual Graduation Methods ===")
        manual_methods = [
            "force_graduation",
            "manual_graduation",
            "admin_graduate",
            "emergency_graduate",
            "bypass_graduation_check"
        ]
        
        for method_name in manual_methods:
            try:
                method = contract.get_method_by_name(method_name)
                print(f"🎯 Found: {method_name} - try calling this manually!")
            except:
                continue

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()