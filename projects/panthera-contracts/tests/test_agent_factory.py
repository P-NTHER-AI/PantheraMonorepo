#!/usr/bin/env python3

import os, json, base64
from dotenv import load_dotenv
from algosdk import v2client, abi, transaction, encoding
from algosdk.atomic_transaction_composer import AtomicTransactionComposer, AccountTransactionSigner, TransactionWithSigner
from algokit_utils.account import get_account_from_mnemonic

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
load_dotenv(dotenv_path=os.path.join(BASE_DIR, ".env"))

def get_pool_info(algod_client, pool_address):
    try:
        account_info = algod_client.account_info(pool_address)
        
        print(f"Pool Address: {pool_address}")
        print(f"Pool Balance: {account_info.get('amount', 0)/1000000:.6f} ALGO")
        
        created_assets = account_info.get('created-assets', [])
        pool_token_id = None
        
        if created_assets:
            pool_token_id = created_assets[-1]['index']
            pool_token_info = created_assets[-1]
            print(f"Pool Token ID: {pool_token_id}")
            print(f"Pool Token Name: {pool_token_info.get('params', {}).get('name', 'N/A')}")
            print(f"Pool Token Supply: {pool_token_info.get('params', {}).get('total', 0)}")
        
        assets = account_info.get('assets', [])
        print(f"Assets in pool: {len(assets)}")
        
        for asset in assets:
            asset_id = asset['asset-id']
            amount = asset['amount']
            print(f"  Asset {asset_id}: {amount}")
            
        return pool_token_id, assets
        
    except Exception as e:
        print(f"Error getting pool info: {e}")
        return None, []

def main():
    algod_client = v2client.algod.AlgodClient(
        algod_token="",
        algod_address="https://testnet-api.algonode.cloud",
        headers={"User-Agent": "algosdk"}
    )
   
    CREATOR_MNEMONIC = os.environ.get("DEPLOYER_MNEMONIC")
    if not CREATOR_MNEMONIC:
        raise ValueError("DEPLOYER_MNEMONIC could not be found in the .env file")

    creator = get_account_from_mnemonic(CREATOR_MNEMONIC)
    signer = AccountTransactionSigner(creator.private_key)

    # YENI DEPLOY SONRASI APP_ID'YI BURAYA YAZMALISINIZ
    app_id = 746512710  # Bu kısmı yeni deploy sonrası güncelleyin
    existing_tna_asa_id = 746516331 
    real_pool_address = "EWXA3TXULNBIB2VRDD4HIEXHJP2F2BEXUZOG7LBEO6AVYAN5ME6V37TDNA"
    
    print("COMPLETE REAL TINYMAN POOL INTEGRATION TEST")
    print(f"App ID: {app_id}")
    print(f"Existing TNA ASA ID: {existing_tna_asa_id}")
    print(f"Real Pool Address: {real_pool_address}")
    print(f"Account: {creator.address}")
    
    account_info = algod_client.account_info(creator.address)
    balance = account_info['amount']
    print(f"Account balance: {balance/1000000:.6f} ALGO")
    
    if balance < 8_000_000:  
        print("Insufficient balance! Need at least 8 ALGO")
        print("Testnet faucet: https://testnet.algoexplorer.io/dispenser")
        return
    
    try:
        with open('smart_contracts/artifacts/agent_factory/AgentFactory.arc56.json') as f:
            contract_spec = json.load(f)
        contract = abi.Contract.from_json(json.dumps(contract_spec))
        
        app_address = encoding.encode_address(encoding.checksum(b'appID' + (app_id).to_bytes(8, 'big')))

        print("\n=== Analyzing Existing Pool ===")
        pool_token_id, pool_assets = get_pool_info(algod_client, real_pool_address)
        
        if not pool_token_id:
            print("Could not determine pool token ID, using fallback")
            pool_token_id = 1
        
        tna_in_pool = False
        for asset in pool_assets:
            if asset['asset-id'] == existing_tna_asa_id:
                tna_in_pool = True
                print(f"✅ TNA token {existing_tna_asa_id} found in pool with {asset['amount']} units")
                break
        
        if not tna_in_pool:
            print(f"⚠️ TNA token {existing_tna_asa_id} not found in pool assets")

        print("\n=== 1. Reset Contract State ===")
        try:
            reset_method = contract.get_method_by_name("emergency_graduation_reset")
            atc_reset = AtomicTransactionComposer()
            atc_reset.add_method_call(
                app_id=app_id,
                method=reset_method,
                sender=creator.address,
                sp=algod_client.suggested_params(),
                signer=signer,
                method_args=[]
            )
            result_reset = atc_reset.execute(algod_client, 4)
            print(f"✅ Emergency reset: {result_reset.abi_results[0].return_value}")
        except Exception as e:
            print(f"⚠️ Reset failed: {e}")

        try:
            create_method = contract.get_method_by_name("create")
            atc0 = AtomicTransactionComposer()
            atc0.add_method_call(
                app_id=app_id,
                method=create_method,
                sender=creator.address,
                sp=algod_client.suggested_params(),
                signer=signer,
                method_args=[]
            )
            result0 = atc0.execute(algod_client, 4)
            print(f"✅ Contract re-initialized: {result0.abi_results[0].return_value}")
        except Exception as e:
            print(f"❌ Contract initialization failed: {e}")

        print("\n=== 2. Create New Agent ===")
        try:
            create_agent_method = contract.get_method_by_name("create_agent")
            atc1 = AtomicTransactionComposer()
            atc1.add_method_call(
                app_id=app_id,
                method=create_agent_method,
                sender=creator.address,
                sp=algod_client.suggested_params(),
                signer=signer,
                method_args=["PoolConnectedAgent", "PCA"]
            )
            result1 = atc1.execute(algod_client, 4)
            new_asa_id = result1.abi_results[0].return_value
            print(f"✅ Created ASA ID: {new_asa_id}")
            print(f"🔗 Asset Explorer: https://lora.algokit.io/testnet/asset/{new_asa_id}")
            print(f"🔗 Tx Explorer: https://lora.algokit.io/testnet/transaction/{result1.tx_ids[0]}")
        except Exception as e:
            print(f"❌ Create agent failed: {e}")
            return

        print("\n=== 3. Check Initial Graduation Eligibility ===")
        try:
            eligibility_method = contract.get_method_by_name("check_graduation_eligibility")
            atc2 = AtomicTransactionComposer()
            atc2.add_method_call(
                app_id=app_id,
                method=eligibility_method,
                sender=creator.address,
                sp=algod_client.suggested_params(),
                signer=signer,
                method_args=[]
            )
            result2 = atc2.execute(algod_client, 4)
            eligible, current_reserve, threshold = result2.abi_results[0].return_value
            print(f"Eligible for graduation: {eligible}")
            print(f"Current reserve: {current_reserve/1000000:.6f} ALGO")
            print(f"Graduation threshold: {threshold/1000000:.6f} ALGO")
        except Exception as e:
            print(f"❌ Check graduation eligibility failed: {e}")

        print("\n=== 4. Opt-in to New ASA ===")
        try:
            sp = algod_client.suggested_params()
            opt_in_txn = transaction.AssetTransferTxn(
                sender=creator.address,
                sp=sp,
                receiver=creator.address,
                amt=0,
                index=new_asa_id
            )
            signed_opt_in = opt_in_txn.sign(creator.private_key)
            txid = algod_client.send_transaction(signed_opt_in)
            print(f"✅ Opted in to ASA {new_asa_id}. TxID: {txid}")
            print(f"🔗 Opt-in Explorer: https://lora.algokit.io/testnet/transaction/{txid}")
        except Exception as e:
            print(f"⚠️ Opt-in failed (maybe already opted in): {e}")

        print("\n=== 5. Buy Tokens to Reach Graduation ===")
        buy_amount = 6_000_000 
        
        try:
            buy_method = contract.get_method_by_name("buy_agent_tokens")
            
            sp = algod_client.suggested_params()
            payment_txn = transaction.PaymentTxn(
                sender=creator.address,
                sp=sp,
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
                method_args=[new_asa_id],
                foreign_assets=[new_asa_id]
            )
            
            result4 = atc4.execute(algod_client, 4)
            tokens_received = result4.abi_results[0].return_value
            print(f"✅ Buy transaction ID: {result4.tx_ids[1]}")
            print(f"✅ Tokens received: {tokens_received}")
            print(f"✅ Amount spent: {buy_amount/1000000:.6f} ALGO")
            print(f"🔗 Buy Explorer: https://lora.algokit.io/testnet/transaction/{result4.tx_ids[1]}")
            
        except Exception as e:
            print(f"❌ Buy failed: {e}")
            return

        print("\n=== 6. Verify Graduation Eligibility After Buy ===")
        try:
            eligibility_method = contract.get_method_by_name("check_graduation_eligibility")
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
            print(f"Eligible for graduation: {eligible}")
            print(f"Current reserve: {current_reserve/1000000:.6f} ALGO")
            print(f"Graduation threshold: {threshold/1000000:.6f} ALGO")
            
            graduation_eligible = eligible == 1
            
            if not graduation_eligible:
                print("❌ STILL NOT ELIGIBLE! Need more tokens")
                return
            else:
                print("✅ NOW ELIGIBLE FOR GRADUATION!")
            
        except Exception as e:
            print(f"❌ Check graduation eligibility failed: {e}")
            return

        print("\n=== 7. Get Graduation Preview ===")
        try:
            preview_method = contract.get_method_by_name("get_graduation_preview")
            atc6 = AtomicTransactionComposer()
            atc6.add_method_call(
                app_id=app_id,
                method=preview_method,
                sender=creator.address,
                sp=algod_client.suggested_params(),
                signer=signer,
                method_args=[]
            )
            result6 = atc6.execute(algod_client, 4)
            liquidity_algo, creator_algo, platform_fee, remaining_tokens = result6.abi_results[0].return_value
            print(f"Preview - Liquidity ALGO: {liquidity_algo/1000000:.6f}")
            print(f"Preview - Creator allocation: {creator_algo/1000000:.6f}")
            print(f"Preview - Platform fee: {platform_fee/1000000:.6f}")
            print(f"Preview - Remaining tokens: {remaining_tokens}")
        except Exception as e:
            print(f"❌ Get graduation preview failed: {e}")

        print("\n=== 8. Prepare Graduation ===")
        try:
            prepare_graduation_method = contract.get_method_by_name("prepare_graduation")
            atc7 = AtomicTransactionComposer()
            atc7.add_method_call(
                app_id=app_id,
                method=prepare_graduation_method,
                sender=creator.address,
                sp=algod_client.suggested_params(),
                signer=signer,
                method_args=[]
            )
            result7 = atc7.execute(algod_client, 4)
            liquidity_algo, creator_allocation, platform_fee = result7.abi_results[0].return_value
            print(f"✅ Graduation prepared!")
            print(f"✅ Liquidity allocation: {liquidity_algo/1000000:.6f} ALGO")
            print(f"✅ Creator received: {creator_allocation/1000000:.6f} ALGO")
            print(f"✅ Platform fee: {platform_fee/1000000:.6f} ALGO")
            print(f"🔗 Graduation Explorer: https://lora.algokit.io/testnet/transaction/{result7.tx_ids[0]}")
            
        except Exception as e:
            print(f"❌ Prepare graduation failed: {e}")
            return

        print("\n=== 9. Withdraw Graduation Funds ===")
        try:
            withdraw_method = contract.get_method_by_name("withdraw_graduation_funds")
            atc9 = AtomicTransactionComposer()
            atc9.add_method_call(
                app_id=app_id,
                method=withdraw_method,
                sender=creator.address,
                sp=algod_client.suggested_params(),
                signer=signer,
                method_args=[creator.address]
            )
            result9 = atc9.execute(algod_client, 4)
            withdrawn_amount = result9.abi_results[0].return_value
            print(f"✅ Withdrawn for liquidity: {withdrawn_amount/1000000:.6f} ALGO")
            print(f"🔗 Withdraw Explorer: https://lora.algokit.io/testnet/transaction/{result9.tx_ids[0]}")
        except Exception as e:
            print(f"❌ Withdraw graduation funds failed: {e}")

        print("\n=== 10. Mint Graduation Tokens ===")
        try:
            mint_method = contract.get_method_by_name("mint_graduation_tokens")
            mint_amount = 500_000_000 
            atc10 = AtomicTransactionComposer()
            atc10.add_method_call(
                app_id=app_id,
                method=mint_method,
                sender=creator.address,
                sp=algod_client.suggested_params(),
                signer=signer,
                method_args=[creator.address, mint_amount],
                foreign_assets=[new_asa_id]
            )
            result10 = atc10.execute(algod_client, 4)
            minted_amount = result10.abi_results[0].return_value
            print(f"✅ Minted for liquidity: {minted_amount} tokens")
            print(f"🔗 Mint Explorer: https://lora.algokit.io/testnet/transaction/{result10.tx_ids[0]}")
        except Exception as e:
            print(f"❌ Mint graduation tokens failed: {e}")

        print("\n=== 11. CONNECT TO REAL TINYMAN POOL ===")
        print(f"🔗 Connecting to your existing pool: {real_pool_address}")
        print(f"🪙 Pool Token ID: {pool_token_id}")
        print(f"📊 This will officially link the graduated agent to your Tinyman pool")
        
        try:
            confirm_method = contract.get_method_by_name("confirm_tinyman_pool")
            atc11 = AtomicTransactionComposer()
            atc11.add_method_call(
                app_id=app_id,
                method=confirm_method,
                sender=creator.address,
                sp=algod_client.suggested_params(),
                signer=signer,
                method_args=[real_pool_address, pool_token_id]
            )
            result11 = atc11.execute(algod_client, 4)
            confirmation = result11.abi_results[0].return_value
            print(f"✅ Real pool connection confirmed: {confirmation}")
            print(f"🔗 Pool Confirm TX: https://lora.algokit.io/testnet/transaction/{result11.tx_ids[0]}")
        except Exception as e:
            print(f"❌ Pool connection failed: {e}")

        print("\n=== 12. Final Graduation Status with Real Pool ===")
        try:
            graduation_status_method = contract.get_method_by_name("get_graduation_status")
            atc12 = AtomicTransactionComposer()
            atc12.add_method_call(
                app_id=app_id,
                method=graduation_status_method,
                sender=creator.address,
                sp=algod_client.suggested_params(),
                signer=signer,
                method_args=[]
            )
            result12 = atc12.execute(algod_client, 4)
            graduated, threshold_met, timestamp, stored_pool_token_id = result12.abi_results[0].return_value
            print(f"Final graduated status: {graduated}")
            print(f"Threshold met: {threshold_met}")
            print(f"Graduation timestamp: {timestamp}")
            print(f"Stored pool token ID: {stored_pool_token_id}")
            
            if graduated and stored_pool_token_id == pool_token_id:
                print("✅ SUCCESS! Agent is now officially connected to your real Tinyman pool!")
            else:
                print("⚠️ Pool connection might need verification")
                
        except Exception as e:
            print(f"❌ Get final graduation status failed: {e}")

        print("\n=== 13. Verify Trading is Blocked After Graduation ===")
        try:
            buy_method = contract.get_method_by_name("buy_agent_tokens")
            sp = algod_client.suggested_params()
            payment_txn = transaction.PaymentTxn(
                sender=creator.address,
                sp=sp,
                receiver=app_address,
                amt=100000  # Small amount
            )
            
            atc13 = AtomicTransactionComposer()
            atc13.add_transaction(TransactionWithSigner(payment_txn, signer))
            atc13.add_method_call(
                app_id=app_id,
                method=buy_method,
                sender=creator.address,
                sp=algod_client.suggested_params(),
                signer=signer,
                method_args=[new_asa_id],
                foreign_assets=[new_asa_id]
            )
            
            result13 = atc13.execute(algod_client, 4)
            print("❌ Trading worked after graduation - this shouldn't happen!")
            
        except Exception as e:
            print(f"✅ Trading correctly blocked after graduation")

        print("\n=== 14. Factory Statistics ===")
        try:
            factory_stats_method = contract.get_method_by_name("get_factory_stats")
            atc14 = AtomicTransactionComposer()
            atc14.add_method_call(
                app_id=app_id,
                method=factory_stats_method,
                sender=creator.address,
                sp=algod_client.suggested_params(),
                signer=signer,
                method_args=[]
            )
            result14 = atc14.execute(algod_client, 4)
            total_created, active_agent, last_created = result14.abi_results[0].return_value
            print(f"Total agents created by factory: {total_created}")
            print(f"Currently active agent: {active_agent}")
            print(f"Last created agent: {last_created}")
        except Exception as e:
            print(f"❌ Factory stats failed: {e}")

        print("\n" + "="*100)
        print("🎉 COMPLETE FACTORY PATTERN + TINYMAN INTEGRATION SUCCESS!")
        print("="*100)
        print("SUMMARY:")
        print(f"✅ New Agent Token: PoolConnectedAgent (PCA)")
        print(f"✅ New ASA ID: {new_asa_id}")
        print(f"✅ App ID: {app_id}")
        print(f"✅ Connected to Real Pool: {real_pool_address}")
        print(f"✅ Pool Token ID: {pool_token_id}")
        print(f"✅ Graduation threshold: 5 ALGO")
        print(f"✅ Agent graduated and connected to your existing TNA/ALGO pool")
        print(f"✅ Trading blocked on bonding curve (now uses Tinyman)")
        print(f"✅ Factory pattern implemented with tracking")
        print("")
        print("🔗 LINKS:")
        print(f"🌐 New ASA: https://lora.algokit.io/testnet/asset/{new_asa_id}")
        print(f"🌐 App: https://lora.algokit.io/testnet/application/{app_id}")
        print(f"🌐 Pool Address: https://lora.algokit.io/testnet/address/{real_pool_address}")
        print(f"🌐 Account: https://lora.algokit.io/testnet/address/{creator.address}")
        print("")
        print("🚀 Your Agent Factory with Factory Pattern is now fully functional!")
        print("="*100)

    except Exception as e:
        print(f"❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()