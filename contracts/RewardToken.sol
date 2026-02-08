// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RewardToken is ERC20, Ownable {
    constructor() ERC20("CrowdReward", "CRWD") Ownable(msg.sender) {}
    
    // Mint function for Crowdfunding contract
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    // Set decimals (optional)
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}