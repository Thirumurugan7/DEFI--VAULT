import { useEffect, useState } from "react";
import { connect, disconnect } from "@argent/get-starknet";
import { WalletDetails } from "./WalletDetails";
import { useDispatch } from "react-redux";
import { setConnectionDetails } from "../../global/connectionActions";

function Navbar() {
  const WW_URL = "https://web.argent.xyz";
  const dispatch = useDispatch();

  const [connection, setConnection] = useState();

  useEffect(() => {
    const connectToStarknet = async () => {
      const connection = await connect({
        modalMode: "neverAsk",
        webWalletUrl: WW_URL,
      });

      if (connection && connection.isConnected && connection.account) {
        setConnection(connection);

        dispatch(
          setConnectionDetails({
            provider: connection.account,
            address: connection.account.address,
          })
        );
      }
    };
    connectToStarknet();
  }, []);

  return (
    <div>
      <header>
        <nav aria-label="Global">
          <div>
            <div>
              {!connection ? (
                <>
                  <button
                    onClick={async () => {
                      const connection = await connect({
                        webWalletUrl: WW_URL,
                      });

                      if (connection && connection.isConnected) {
                        setConnection(connection);
                      }
                    }}
                  >
                    Connect wallet
                  </button>
                </>
              ) : (
                <>
                  <div className="flex">
                    <WalletDetails wallet={connection} />
                    <button
                      onClick={async () => {
                        await disconnect();
                        setConnection(undefined);
                      }}
                    >
                      Disconnect wallet
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </nav>
      </header>
    </div>
  );
}

export default Navbar;
