#!/usr/bin/env python3
import os
from dotenv import load_dotenv
from algosdk.v2client import algod
from algokit_utils.account import get_account_from_mnemonic 

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
load_dotenv(dotenv_path=os.path.join(BASE_DIR, ".env"))

algod_client = algod.AlgodClient(
    algod_token="",
    algod_address="https://testnet-api.algonode.cloud",
    headers={"User-Agent": "algosdk"}
)

CREATOR_MNEMONIC = os.environ.get("DEPLOYER_MNEMONIC")
if not CREATOR_MNEMONIC:
    raise ValueError("❌ DEPLOYER_MNEMONIC .env dosyasında bulunamadı!")

creator = get_account_from_mnemonic(CREATOR_MNEMONIC)

info = algod_client.account_info(creator.address)
balance_algo = info["amount"] / 1_000_000

print("\n=== Testnet Account Balance ===")
print(f"Address: {creator.address}")
print(f"Balance: {balance_algo} ALGO")
print("=" * 40)