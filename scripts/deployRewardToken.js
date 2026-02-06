import hre from "hardhat";

async function main() {
  // Deploy the RewardToken contract
  const rewardToken = await hre.viem.deployContract("RewardToken", []);

  console.log("RewardToken deployed to:", rewardToken.address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
