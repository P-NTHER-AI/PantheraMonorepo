import { useMemo } from "react";
import { useWallet } from "../hooks/useWallet";
import { ellipseAddress } from "../utils/ellipseAddress";
import { getAlgodConfigFromViteEnvironment } from "../utils/network/getAlgoClientConfigs";

const Account = () => {
  const { address } = useWallet();
  const algoConfig = getAlgodConfigFromViteEnvironment()

  const networkName = useMemo(() => {
    return algoConfig.network === '' ? 'localnet' : algoConfig.network.toLocaleLowerCase()
  }, [algoConfig.network])

  return (
    <div>
      {address ? (
        <a className="text-xl" target="_blank" href={`https://lora.algokit.io/${networkName}/account/${address}/`}>
          Address: {ellipseAddress(address)}
        </a>
      ) : (
        <span className="text-xl">No wallet connected</span>
      )}
      <div className="text-xl">Network: {networkName}</div>
    </div>
  )
}

export default Account
