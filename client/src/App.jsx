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
    const response = await newContract.approve("0x015f8afd7ccaf2e33cc8b340416f29037ff8d03620f6bd7311939b01a04eec4d", 1);
    console.log(">> response", response);
  };

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
    const response = await newContract.moveY();
    console.log(">> response", response);
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