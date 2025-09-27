import { useWallet } from "../hooks/useWallet";
import Account from "./Account";

interface ConnectWalletInterface {
  openModal: boolean
  closeModal: () => void
}

const ConnectWallet = ({ openModal, closeModal }: ConnectWalletInterface) => {
  const { connectors, address, connectWallet, disconnectWallet } = useWallet();

  return (
    <dialog id="connect_wallet_modal" className={`modal ${openModal ? 'modal-open' : ''}`}style={{ display: openModal ? 'block' : 'none' }}>
      <form method="dialog" className="modal-box">
        <h3 className="font-bold text-2xl">Select wallet provider</h3>

        <div className="grid m-2 pt-5">
          {address && (
            <>
              <Account />
              <div className="divider" />
            </>
          )}

          {!address &&
            connectors?.map((connector) => {
              const icon = typeof connector.metadata?.icon === "string" ? connector.metadata.icon : undefined;
              const label = connector.name || connector.id;
              return (
              <button
                data-test-id={`${connector.id}-connect`}
                className="btn border-teal-800 border-1  m-2"
                key={`provider-${connector.id}`}
                onClick={() => {
                  connectWallet(connector.id)
                  closeModal()
                }}
              >
                {icon && (
                  <img
                    alt={`wallet_icon_${connector.id}`}
                    src={icon}
                    style={{ objectFit: 'contain', width: '30px', height: 'auto' }}
                  />
                )}
                <span>{label}</span>
              </button>
              )
            })}
        </div>

        <div className="modal-action grid">
          <button
            data-test-id="close-wallet-modal"
            className="btn"
            onClick={() => {
              closeModal()
            }}
          >
            Close
          </button>
          {address && (
            <button
              className="btn btn-warning"
              data-test-id="logout"
              onClick={async () => {
                await disconnectWallet()
                closeModal()
              }}
            >
              Logout
            </button>
          )}
        </div>
      </form>
    </dialog>
  )
}
export default ConnectWallet
