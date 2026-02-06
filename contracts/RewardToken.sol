// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RewardToken is ERC20, Ownable {
    constructor() ERC20("EventToken", "ETK") Ownable(msg.sender) {}
    
    // Mint function for EventTicket contract
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
