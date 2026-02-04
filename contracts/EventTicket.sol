// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RewardToken.sol";

contract EventTicket {
    struct Event {
        string title;
        uint256 ticketPrice;      // in wei
        uint256 ticketsAvailable;
        uint256 ticketsSold;
        bool active;
    }

    mapping(uint256 => Event) public events;
    mapping(uint256 => mapping(address => uint256)) public ticketsOwned;
    uint256 public eventCount;

    RewardToken public rewardToken;
    address public owner;

    constructor(address _rewardToken) {
        rewardToken = RewardToken(_rewardToken);
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    function createEvent(string memory _title, uint256 _ticketPrice, uint256 _ticketsAvailable) public onlyOwner {
        events[eventCount] = Event(_title, _ticketPrice, _ticketsAvailable, 0, true);
        eventCount++;
    }

    function buyTicket(uint256 _eventId, uint256 _amount) public payable {
        Event storage evt = events[_eventId];
        require(evt.active, "Event not active");
        require(msg.value == evt.ticketPrice * _amount, "Incorrect ETH sent");
        require(evt.ticketsSold + _amount <= evt.ticketsAvailable, "Not enough tickets");

        ticketsOwned[_eventId][msg.sender] += _amount;
        evt.ticketsSold += _amount;

        // Mint reward tokens: 10 ETK per ticket
        rewardToken.mint(msg.sender, _amount * 10 * 1e18);
    }

    function endEvent(uint256 _eventId) public onlyOwner {
        events[_eventId].active = false;
    }
}
