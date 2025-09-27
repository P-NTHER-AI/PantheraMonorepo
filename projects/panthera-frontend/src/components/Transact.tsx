import { algo, AlgorandClient } from "@algorandfoundation/algokit-utils";
import { useWallet } from "../hooks/useWallet";
import { useState } from "react";
import { getAlgodConfigFromViteEnvironment } from "../utils/network/getAlgoClientConfigs";

interface TransactInterface {
  openModal: boolean;
  setModalState: (value: boolean) => void;
}

const Transact = ({ openModal, setModalState }: TransactInterface) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [receiverAddress, setReceiverAddress] = useState<string>("");

  const algodConfig = getAlgodConfigFromViteEnvironment();
  const algorand = AlgorandClient.fromConfig({ algodConfig });

  const { transactionSigner, address } = useWallet();

  const handleSubmitAlgo = async () => {
    setLoading(true);

    if (!transactionSigner || !address) {
      alert("Please connect wallet first");
      return;
    }

    try {
      alert("Sending transaction...");
      const result = await algorand.send.payment({
        signer: transactionSigner,
        sender: address,
        receiver: receiverAddress,
        amount: algo(1),
      });
      alert(`Transaction sent: ${result.txIds[0]}`);
      setReceiverAddress("");
    } catch (e) {
      alert("Failed to send transaction");
    }

    setLoading(false);
  };

  return (
    <dialog
      id="transact_modal"
      className={`modal ${openModal ? "modal-open" : ""} bg-slate-200`}
      style={{ display: openModal ? "block" : "none" }}
    >
      <form method="dialog" className="modal-box">
        <h3 className="font-bold text-lg">Send payment transaction</h3>
        <br />
        <input
          type="text"
          data-test-id="receiver-address"
          placeholder="Provide wallet address"
          className="input input-bordered w-full"
          value={receiverAddress}
          onChange={(e) => {
            setReceiverAddress(e.target.value);
          }}
        />
        <div className="modal-action grid">
          <button className="btn" onClick={() => setModalState(!openModal)}>
            Close
          </button>
          <button
            data-test-id="send-algo"
            className={`btn ${receiverAddress.length === 58 ? "" : "btn-disabled"} lo`}
            onClick={handleSubmitAlgo}
          >
            {loading ? <span className="loading loading-spinner" /> : "Send 1 Algo"}
          </button>
        </div>
      </form>
    </dialog>
  );
};

export default Transact;
