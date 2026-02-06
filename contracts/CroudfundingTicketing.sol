// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./RewardToken.sol";

contract CrowdfundingTicketing {
    struct Event {
        string title;
        uint256 fundingGoal;      // in wei
        uint256 fundsRaised;      // in wei
        uint256 deadline;         // timestamp
        bool active;
    }

    mapping(uint256 => Event) public events;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    uint256 public eventCount;

    RewardToken public rewardToken;
    address public owner;

    uint256 public rewardRate = 10; // 10 ETK per 1 ETH contributed

    constructor(address _rewardToken) {
        rewardToken = RewardToken(_rewardToken);
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    modifier isActive(uint256 _eventId) {
        Event storage evt = events[_eventId];
        require(evt.active, "Event not active");
        require(block.timestamp <= evt.deadline, "Deadline passed");
        _;
    }

    // Owner creates a new crowdfunding event
    function createEvent(
        string memory _title,
        uint256 _fundingGoal,
        uint256 _durationSeconds
    ) public onlyOwner {
        events[eventCount] = Event({
            title: _title,
            fundingGoal: _fundingGoal,
            fundsRaised: 0,
            deadline: block.timestamp + _durationSeconds,
            active: true
        });
        eventCount++;
    }

    // Users contribute ETH (buy tickets)
    function contribute(uint256 _eventId) public payable isActive(_eventId) {
        Event storage evt = events[_eventId];
        require(msg.value > 0, "Contribution must be > 0");

        contributions[_eventId][msg.sender] += msg.value;
        evt.fundsRaised += msg.value;

        // Mint reward tokens proportional to ETH contributed
        uint256 tokensToMint = (msg.value * rewardRate);
        rewardToken.mint(msg.sender, tokensToMint);

        // If funding goal reached, finalize event
        if (evt.fundsRaised >= evt.fundingGoal) {
            evt.active = false;
        }
    }

    // Owner can manually end an event
    function endEvent(uint256 _eventId) public onlyOwner {
        events[_eventId].active = false;
    }

    // Users can see how much they contributed
    function getContribution(uint256 _eventId, address _user) public view returns (uint256) {
        return contributions[_eventId][_user];
    }

    // View active events
    function isEventActive(uint256 _eventId) public view returns (bool) {
        Event storage evt = events[_eventId];
        return evt.active && block.timestamp <= evt.deadline;
    }
}
