import hre from "hardhat";

async function main() {
  const rewardTokenAddress = "0xYourDeployedRewardTokenAddress";

  const crowdfunding = await hre.viem.deployContract(
    "CrowdfundingTicketing",
    [rewardTokenAddress]
  );

  console.log("CrowdfundingTicketing deployed to:", crowdfunding.address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
