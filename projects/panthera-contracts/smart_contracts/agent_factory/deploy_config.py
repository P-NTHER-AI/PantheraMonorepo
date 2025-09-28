import logging
import algokit_utils
from algosdk.atomic_transaction_composer import AtomicTransactionComposer, AccountTransactionSigner
from algosdk import abi
import json

logger = logging.getLogger(__name__)

def deploy() -> None:
    from smart_contracts.artifacts.agent_factory.agent_factory_client import (
        HelloArgs,
        AgentFactoryFactory,
    )

    algorand = algokit_utils.AlgorandClient.from_environment()
    deployer_ = algorand.account.from_environment("DEPLOYER")
    factory = algorand.client.get_typed_app_factory(
        AgentFactoryFactory, default_sender=deployer_.address
    )

    app_client, result = factory.deploy(
        on_update=algokit_utils.OnUpdate.AppendApp,
        on_schema_break=algokit_utils.OnSchemaBreak.ReplaceApp,
    )

    try:
        with open('smart_contracts/artifacts/agent_factory/AgentFactory.arc56.json') as f:
            contract_spec = json.load(f)
        contract = abi.Contract.from_json(json.dumps(contract_spec))

        create_method = contract.get_method_by_name("create")
        atc = AtomicTransactionComposer()
        signer = AccountTransactionSigner(deployer_.private_key)

        atc.add_method_call(
            app_id=app_client.app_id,
            method=create_method,
            sender=deployer_.address,
            sp=algorand.client.algod.suggested_params(),
            signer=signer,
            method_args=[]
        )

        result_create = atc.execute(algorand.client.algod, 4)
        logger.info(f"✅ Contract initialized successfully. TxID: {result_create.tx_ids[0]}")

    except Exception as e:
        logger.error(f"❌ Failed to initialize contract: {e}")

    if result.operation_performed in [
        algokit_utils.OperationPerformed.Create,
        algokit_utils.OperationPerformed.Replace,
    ]:
        algorand.send.payment(
            algokit_utils.PaymentParams(
                amount=algokit_utils.AlgoAmount(algo=1),
                sender=deployer_.address,
                receiver=app_client.app_address,
            )
        )

    name = "world"
    response = app_client.send.hello(args=HelloArgs(name=name))
    logger.info(
        f"Called hello on {app_client.app_name} ({app_client.app_id}) "
        f"with name={name}, received: {response.abi_return}"
    )
