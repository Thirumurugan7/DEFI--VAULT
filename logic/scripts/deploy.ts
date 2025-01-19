import { Account, CallData, Contract, RpcProvider, stark } from "starknet";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";  // Import path module
import { getCompiledCode } from "./utils";

dotenv.config();

async function main() {
  console.log("Deploying contract...");
  const rpcEndpoint = process.env.RPC_ENDPOINT;
  const deployerAddress = process.env.DEPLOYER_ADDRESS;
  const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;

  console.log("RPC_ENDPOINT=", rpcEndpoint);
  console.log("DEPLOYER_ADDRESS=", deployerAddress);
  console.log("DEPLOYER_PRIVATE_KEY=", deployerPrivateKey);

  if (!rpcEndpoint || !deployerAddress || !deployerPrivateKey) {
    console.error("Missing required environment variables.");
    process.exit(1);
  }

  const provider = new RpcProvider({
    nodeUrl: rpcEndpoint,
  });

  console.log("ACCOUNT_ADDRESS=", deployerAddress);

  const account0 = new Account(provider, deployerAddress, deployerPrivateKey);
  console.log("Account connected.\n");

  let sierraCode, casmCode;

  try {
    ({ sierraCode, casmCode } = await getCompiledCode(`game_SimpleVault`));
    // ({ sierraCode, casmCode } = await getCompiledCode(`game_SimpleVault`));
    console.log("sierraCode=", sierraCode);
    console.log("casmCode=", casmCode);
  } catch (error: any) {
    console.log("Failed to read contract files:", error);
    process.exit(1);
  }

  const initialOwner = deployerAddress;
  const myCallData = new CallData(sierraCode.abi);


  const constructor = myCallData.compile("constructor", {
    token:"0x36ca7e3d294a8579a515e6721f93ad0b6c007a11ba3a5e14159bef8f5bfd7f2"
  });
  // const constructor = myCallData.compile("constructor", {
  //   recipient: initialOwner,
  //   name: "Caddy",
  //   decimals: 18,
  //   initial_supply: 100000000000,
  //   symbol: "CDY"
  // });


  const deployResponse = await account0.declareAndDeploy({
    contract: sierraCode,
    casm: casmCode,
    salt: stark.randomAddress(),
    constructorCalldata: constructor,
  });

  const contractAddress = deployResponse.deploy.contract_address;
  console.log(`✅ Contract has been deployed with the address: ${contractAddress}`);

  // Log the absolute file path
  const filePath = path.resolve(__dirname, "../../client/global/constant.js");
  console.log(`Attempting to write contract address to: ${filePath}`);

  const fileContent = `export const contractAddress = "${contractAddress}";\n`;

  try {
    fs.writeFileSync(filePath, fileContent, "utf8");
    console.log(`✅ Contract address saved to ${filePath}`);
  } catch (error) {
    console.error("Failed to write contract address to file:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
