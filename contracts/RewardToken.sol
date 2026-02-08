// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RewardToken is ERC20, Ownable {
<<<<<<< HEAD
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
=======
    constructor() ERC20("EventToken", "ETK") Ownable(msg.sender) {}
    
    // Mint function for EventTicket contract
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
>>>>>>> 4d606ad1c17cad0a723874be74c1a689fa184617
