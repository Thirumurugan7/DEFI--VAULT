import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { Contract, RpcProvider } from "starknet";
import { useSelector } from "react-redux";
import { contractAddress } from "../global/constant";
import Navbar from "./Components/Navbar";

function App() {
  const [count, setCount] = useState(0);
  const connection = useSelector((state) => state.connection);
  const movementX = async () => {
    const provider = new RpcProvider({
      nodeUrl:
        "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_7/NC_mjlIJfcEpaOhs3JB4JHcjFQhcFOrs",
    });

    const ContAbi = await provider.getClassAt(contractAddress);
    console.log(">> contract abi", ContAbi);
    const newContract = new Contract(
      ContAbi.abi,
      contractAddress,
      connection?.provider
    );
    const address = connection.address;
    console.log("wallet address", address);
    console.log("contract details", newContract);

    // Convert amount to uint256 format
    const amount = {
      low: 1n,
      high: 0n
    };

    try {
      const tx = await newContract.deposit(1000000000000);
      console.log(">> tx", tx);
      console.log(">> txHash", tx.transaction_hash);
    } catch (error) {
      console.error("Transaction failed:", error);
    }
  }

  const movementY = async () => {
    const provider = new RpcProvider({
      nodeUrl:
        "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_7/NC_mjlIJfcEpaOhs3JB4JHcjFQhcFOrs",
    });

    const ContAbi = await provider.getClassAt(contractAddress);
    console.log(">> contract abi", ContAbi);
    const newContract = new Contract(
      ContAbi.abi,
      contractAddress,
      connection?.provider
    );
    const address = connection.address;
    console.log("wallet address", address);
    console.log("contract details", newContract);

    try {
      const tx = await newContract.withdraw(1);
      console.log(">> tx", tx);
      console.log(">> txHash", tx.transaction_hash);
    } catch (error) {
      console.error("Transaction failed:", error);
    }
  };

  const getValue = async () => {
    const provider = new RpcProvider({
      nodeUrl:
        "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_7/NC_mjlIJfcEpaOhs3JB4JHcjFQhcFOrs",
    });
    const ContAbi = await provider.getClassAt(contractAddress);
    console.log(">> contract abi", ContAbi);
    const newContract = new Contract(
      ContAbi.abi,
      contractAddress,
      provider
    );
    const address = connection.address;
    console.log("wallet address", address);
    console.log("contract details",  newContract);
    // const response = await newContract.increment();
    // Call the contract function
    console.log("sdcdas",  newContract);
    
    const response =  await newContract.getX();

    console.log(">> response", response);

    // No need for .flat(), since the response is a single value
    setCount(response);
    console.log("Current value:", response);
  };

  useEffect(() => {
    if (connection.provider) {
      getValue();
    }
  }, [connection]);

  return (
    <>
      <Navbar />
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="flex gap-4 mt-5">
        <button >
          Position of the player is {parseInt(count)}
        </button>
        <button onClick={movementX}>moveX</button>
        <button onClick={movementY}>moveY</button>
      </div>
    </>
  );
}

export default App;