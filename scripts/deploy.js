const hre = require("hardhat");

async function main() {
    console.log("Deploying Crowdfunding contract...");

    const Crowdfunding = await hre.ethers.getContractFactory("Crowdfunding");
    const crowdfunding = await Crowdfunding.deploy();

    await crowdfunding.waitForDeployment();

    const address = await crowdfunding.getAddress();
    const tokenAddress = await crowdfunding.getTokenAddress();

    console.log("Contracts deployed successfully!");
    console.log("======================================");
    console.log("Crowdfunding contract:", address);
    console.log("RewardToken contract:", tokenAddress);
    console.log("======================================");
    console.log("\nUpdate frontend/app.js with:");
    console.log(`CONTRACT_ADDRESS = "${address}";`);
    console.log("\n🚀 Frontend is ready to use!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});