// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract RewardToken is ERC20 {
    address public owner;
    
    constructor() ERC20("CrowdToken", "CRWD") {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}

contract Crowdfunding {
    struct Campaign {
        string title;
        uint256 goal;
        uint256 raised;
        uint256 deadline;
        bool active;
        address creator;
    }
    
    Campaign[] public campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    
    RewardToken public rewardToken;
    uint256 public rewardRate = 1000; // 1000 tokens per 1 ETH
    
    event CampaignCreated(uint256 id, string title, uint256 goal, uint256 deadline);
    event Contributed(uint256 campaignId, address contributor, uint256 amount);
    event TokensMinted(address recipient, uint256 amount);
    
    constructor() {
        rewardToken = new RewardToken();
    }
    
    function createCampaign(
        string memory _title,
        uint256 _goal,
        uint256 _duration
    ) public returns (uint256) {
        require(_goal > 0, "Goal must be > 0");
        require(_duration > 0, "Duration must be > 0");
        
        uint256 id = campaigns.length;
        campaigns.push(Campaign({
            title: _title,
            goal: _goal,
            raised: 0,
            deadline: block.timestamp + _duration,
            active: true,
            creator: msg.sender
        }));
        
        emit CampaignCreated(id, _title, _goal, block.timestamp + _duration);
        return id;
    }
    
    function contribute(uint256 _campaignId) public payable {
        require(_campaignId < campaigns.length, "Invalid campaign");
        Campaign storage campaign = campaigns[_campaignId];
        
        require(campaign.active, "Campaign not active");
        require(block.timestamp <= campaign.deadline, "Deadline passed");
        require(msg.value > 0, "Must send ETH");
        
        contributions[_campaignId][msg.sender] += msg.value;
        campaign.raised += msg.value;
        
        uint256 tokens = (msg.value * rewardRate) / 1e18;
        rewardToken.mint(msg.sender, tokens);
        
        emit Contributed(_campaignId, msg.sender, msg.value);
        emit TokensMinted(msg.sender, tokens);
        
        if (campaign.raised >= campaign.goal) {
            campaign.active = false;
        }
    }
    
    function finalizeCampaign(uint256 _campaignId) public {
        require(_campaignId < campaigns.length, "Invalid campaign");
        Campaign storage campaign = campaigns[_campaignId];
        
        require(campaign.active, "Already finalized");
        require(
            msg.sender == campaign.creator || block.timestamp > campaign.deadline,
            "Not authorized"
        );
        
        campaign.active = false;
    }
    
    function getCampaignCount() public view returns (uint256) {
        return campaigns.length;
    }
    
    function getCampaign(uint256 _campaignId) public view returns (
        string memory title,
        uint256 goal,
        uint256 raised,
        uint256 deadline,
        bool active,
        address creator
    ) {
        require(_campaignId < campaigns.length, "Invalid campaign");
        Campaign storage c = campaigns[_campaignId];
        return (c.title, c.goal, c.raised, c.deadline, c.active, c.creator);
    }
    
    function isActive(uint256 _campaignId) public view returns (bool) {
        if (_campaignId >= campaigns.length) return false;
        Campaign storage c = campaigns[_campaignId];
        return c.active && block.timestamp <= c.deadline;
    }
    
    function getMyContribution(uint256 _campaignId, address _user) public view returns (uint256) {
        return contributions[_campaignId][_user];
    }
    
    function getTokenAddress() public view returns (address) {
        return address(rewardToken);
    }
}