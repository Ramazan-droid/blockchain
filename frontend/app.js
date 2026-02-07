let provider, signer, account;

const crowdfundingAddress = "0x2b2c3ce584B510fD6213e2082E7e84a61e796F32";
const rewardTokenAddress = "0xD85B6dB05bc98f9052f3eCE645C8F275A551d073";

let crowdfundingContract, rewardTokenContract;

// Connect to MetaMask
async function connectWallet() {
  if (window.ethereum) {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    account = await signer.getAddress();
    document.getElementById("account").innerText = "Connected: " + account;

    crowdfundingContract = new ethers.Contract(crowdfundingAddress, crowdfundingABI, signer);
    rewardTokenContract = new ethers.Contract(rewardTokenAddress, rewardtokenabi, signer);

    loadCampaigns();
  } else {
    alert("MetaMask not detected!");
  }
}

// Create a new campaign
async function createCampaign() {
  const title = document.getElementById("title").value;
  const goal = ethers.utils.parseEther(document.getElementById("goal").value); 
  const duration = parseInt(document.getElementById("duration").value);

  try {
    const tx = await crowdfundingContract.createEvent(title, goal, duration);
    await tx.wait();
    document.getElementById("createStatus").innerText = "Campaign created!";
    loadCampaigns();
  } catch (err) {
    document.getElementById("createStatus").innerText = "Error: " + err.message;
  }
}

// Contribute to a campaign
async function contribute() {
  const id = parseInt(document.getElementById("campaignId").value);
  const amount = ethers.utils.parseEther(document.getElementById("amount").value); 

  try {
    const tx = await crowdfundingContract.contribute(id, { value: amount });
    await tx.wait();
    document.getElementById("contributeStatus").innerText = "Contribution successful!";
    loadCampaigns();
  } catch (err) {
    document.getElementById("contributeStatus").innerText = "Error: " + err.message;
  }
}


async function checkBalance() {
  try {
    const balance = await rewardTokenContract.balanceOf(account);
    document.getElementById("balance").innerText = "Your ETK Balance: " + ethers.utils.formatUnits(balance, 0);
  } catch(err) {
    document.getElementById("balance").innerText = "Error: " + err.message;
  }
}

// Load all campaigns and display
async function loadCampaigns() {
  if(!crowdfundingContract) return;
  const count = await crowdfundingContract.campaignCount();
  const list = document.getElementById("campaignList");
  list.innerHTML = "";
  for(let i = 0; i < count; i++){
    const c = await crowdfundingContract.campaigns(i);
    const active = await crowdfundingContract.isCampaignActive(i);
    list.innerHTML += `<div class="campaign">
      <strong>ID: ${i}</strong><br>
      Title: ${c.title}<br>
      Goal: ${ethers.utils.formatEther(c.fundingGoal)} ETH<br>
      Raised: ${ethers.utils.formatEther(c.fundsRaised)} ETH<br>
      Deadline: ${new Date(c.deadline * 1000).toLocaleString()}<br>
      Active: ${active}
    </div>`;
  }
}

// Event listeners
document.getElementById("connect").onclick = connectWallet;
document.getElementById("createCampaign").onclick = createCampaign;
document.getElementById("contribute").onclick = contribute;
document.getElementById("checkBalance").onclick = checkBalance;
