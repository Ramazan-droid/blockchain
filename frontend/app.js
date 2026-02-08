
const CONTRACT_ADDRESS = "0x2b2c3ce584B510fD6213e2082E7e84a61e796F32"; 
const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111
const SEPOLIA_RPC_URL = "https://rpc.sepolia.org";

let provider, signer, account;
let crowdfundingContract;
let currentNetwork = null;

const connectBtn = document.getElementById('connectBtn');
const walletAddressEl = document.getElementById('walletAddress');
const networkInfoEl = document.getElementById('networkInfo');
const ethBalanceEl = document.getElementById('ethBalance');
const tokenBalanceEl = document.getElementById('tokenBalance');
const createBtn = document.getElementById('createBtn');
const contributeBtn = document.getElementById('contributeBtn');
const finalizeBtn = document.getElementById('finalizeBtn');
const refreshBtn = document.getElementById('refreshBtn');
const campaignsContainer = document.getElementById('campaignsContainer');

connectBtn.addEventListener('click', connectWallet);
createBtn.addEventListener('click', createEvent);
contributeBtn.addEventListener('click', contribute);
finalizeBtn.addEventListener('click', endEvent);
refreshBtn.addEventListener('click', loadCampaigns);

window.addEventListener('load', async () => {
    if (!window.ethereum) {
        showError('Please install MetaMask to use this DApp');
        disableAllButtons();
        return;
    }

    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts.length > 0) {
        await setupProvider();
        await switchToSepolia();
        await updateUI();
    }

    window.ethereum.on('accountsChanged', async (accounts) => {
        if (accounts.length > 0) {
            account = accounts[0];
            await updateUI();
        } else {
            resetUI();
        }
    });

    window.ethereum.on('chainChanged', async () => {
        window.location.reload();
    });
});

async function connectWallet() {
    try {
        if (!window.ethereum) {
            showError('MetaMask not found');
            return;
        }

        await window.ethereum.request({ method: 'eth_requestAccounts' });
        await setupProvider();
        await switchToSepolia();
        await updateUI();

        showSuccess('Wallet connected successfully!');
    } catch (error) {
        console.error('Connection error:', error);
        showError(`Connection failed: ${error.message}`);
    }
}

async function setupProvider() {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    account = await signer.getAddress();

    crowdfundingContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        crowdfundingABI,
        signer
    );
}

async function switchToSepolia() {
    try {
        currentNetwork = await window.ethereum.request({ method: 'eth_chainId' });

        if (currentNetwork !== SEPOLIA_CHAIN_ID) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: SEPOLIA_CHAIN_ID }],
                });
            } catch (switchError) {
                if (switchError.code === 4902) {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: SEPOLIA_CHAIN_ID,
                            chainName: 'Sepolia Test Network',
                            rpcUrls: [SEPOLIA_RPC_URL],
                            nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
                            blockExplorerUrls: ['https://sepolia.etherscan.io']
                        }]
                    });
                } else {
                    throw switchError;
                }
            }
        }

        currentNetwork = SEPOLIA_CHAIN_ID;
    } catch (error) {
        console.error('Network switch error:', error);
        showError('Please switch to Sepolia network manually');
    }
}

async function updateUI() {
    if (!account || !provider) return;

    walletAddressEl.textContent = `${account.substring(0, 6)}...${account.slice(-4)}`;
    walletAddressEl.title = account;

    updateNetworkInfo();
    await updateBalances();
    await loadCampaigns();

    enableButtons(true);
}

function updateNetworkInfo() {
    if (currentNetwork === SEPOLIA_CHAIN_ID) {
        networkInfoEl.textContent = 'Sepolia Testnet ✓';
        networkInfoEl.style.color = '#4CAF50';
    } else {
        networkInfoEl.textContent = 'Wrong Network ✗';
        networkInfoEl.style.color = '#f44336';
    }
}

async function updateBalances() {
    try {
        const ethBalance = await provider.getBalance(account);
        ethBalanceEl.textContent = `${ethers.utils.formatEther(ethBalance).substring(0, 8)} ETH`;

        const tokenAddress = await crowdfundingContract.getTokenAddress();
        const tokenContract = new ethers.Contract(
            tokenAddress,
            ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"],
            signer
        );

        const tokenBalance = await tokenContract.balanceOf(account);
        const decimals = await tokenContract.decimals();
        tokenBalanceEl.textContent = `${ethers.utils.formatUnits(tokenBalance, decimals).substring(0, 8)} CRWD`;
    } catch (error) {
        console.error('Balance update error:', error);
    }
}

async function createEvent() {
    try {
        const title = document.getElementById('titleInput').value.trim();
        const goal = document.getElementById('goalInput').value;
        const duration = document.getElementById('durationInput').value;

        if (!title || !goal || !duration) {
            showError('Please fill all fields');
            return;
        }

        const goalWei = ethers.utils.parseEther(goal);
        const durationSeconds = parseInt(duration) * 24 * 60 * 60;

        showLoading('Creating campaign...', 'createStatus');

        const tx = await crowdfundingContract.createEvent(title, goalWei, durationSeconds);
        await tx.wait();

        showSuccess(`Campaign "${title}" created successfully!`, 'createStatus');

        document.getElementById('titleInput').value = '';
        document.getElementById('goalInput').value = '';
        document.getElementById('durationInput').value = '';

        await loadCampaigns();
        await updateBalances();
    } catch (error) {
        console.error('Create campaign error:', error);
        showError(`Failed to create: ${error.message}`, 'createStatus');
    }
}

async function loadCampaigns() {
    try {
        if (!crowdfundingContract) return;

        showLoading('Loading campaigns...');
        campaignsContainer.innerHTML = '';

        const count = await crowdfundingContract.eventCount();
        if (count == 0) {
            campaignsContainer.innerHTML = `<div class="campaign-card"><div class="campaign-title">No campaigns yet</div></div>`;
            return;
        }

        for (let i = 0; i < count; i++) {
            try {
                const evt = await crowdfundingContract.events(i);
                const isActive = await crowdfundingContract.isEventActive(i);

                const progress = evt.fundingGoal > 0 ? Math.min((evt.fundsRaised * 100) / evt.fundingGoal, 100) : 0;
                const deadlineDate = new Date(evt.deadline * 1000);
                const now = new Date();
                const daysLeft = Math.max(0, Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24)));

                const card = document.createElement('div');
                card.className = 'campaign-card';
                card.innerHTML = `
                    <div class="campaign-title">${evt.title}</div>
                    <div class="campaign-stats">
                        <div><strong>ID:</strong> ${i}</div>
                        <div><strong>Goal:</strong> ${ethers.utils.formatEther(evt.fundingGoal)} ETH</div>
                        <div><strong>Raised:</strong> ${ethers.utils.formatEther(evt.fundsRaised)} ETH</div>
                        <div><strong>Status:</strong> <span class="${isActive ? 'campaign-active' : 'campaign-ended'}">${isActive ? 'Active' : 'Ended'}</span></div>
                        <div><strong>Deadline:</strong> ${deadlineDate.toLocaleDateString()}</div>
                        <div><strong>Time left:</strong> ${daysLeft} days</div>
                    </div>
                    <div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>
                    <div><strong>Progress:</strong> ${progress.toFixed(1)}%</div>
                    ${isActive ? `<button class="btn btn-warning quick-contribute" data-id="${i}">Quick Contribute</button>` : ''}
                `;
                campaignsContainer.appendChild(card);
            } catch (err) {
                console.error(`Error loading event ${i}:`, err);
            }
        }

        document.querySelectorAll('.quick-contribute').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.getAttribute('data-id'));
                const amount = prompt('Enter amount in ETH:', '0.01');
                if (amount && parseFloat(amount) > 0) {
                    document.getElementById('contributeId').value = id;
                    document.getElementById('amountInput').value = amount;
                    await contribute();
                }
            });
        });

    } catch (error) {
        console.error('Load campaigns error:', error);
        showError('Failed to load campaigns');
    }
}

async function contribute() {
    try {
        const campaignId = parseInt(document.getElementById('contributeId').value);
        const amount = document.getElementById('amountInput').value;

        if (isNaN(campaignId) || !amount) {
            showError('Please fill all fields');
            return;
        }

        const amountWei = ethers.utils.parseEther(amount);

        showLoading(`Contributing ${amount} ETH...`, 'contributeStatus');

        const tx = await crowdfundingContract.contribute(campaignId, { value: amountWei });
        await tx.wait();

        showSuccess(`Successfully contributed ${amount} ETH! Tokens minted.`, 'contributeStatus');

        await loadCampaigns();
        await updateBalances();
    } catch (error) {
        console.error('Contribute error:', error);
        showError(`Failed to contribute: ${error.message}`, 'contributeStatus');
    }
}

async function endEvent() {
    try {
        const campaignId = parseInt(document.getElementById('finalizeId').value);
        if (isNaN(campaignId)) {
            showError('Please enter a valid campaign ID');
            return;
        }

        showLoading('Finalizing campaign...', 'finalizeStatus');

        const tx = await crowdfundingContract.endEvent(campaignId);
        await tx.wait();

        showSuccess('Campaign finalized!', 'finalizeStatus');

        await loadCampaigns();
    } catch (error) {
        console.error('Finalize error:', error);
        showError(`Failed to finalize: ${error.message}`, 'finalizeStatus');
    }
}

function showLoading(message, elementId = null) {
    const el = elementId ? document.getElementById(elementId) : document.querySelector('.status');
    if (el) { el.textContent = message; el.className = 'status info'; }
}
function showSuccess(message, elementId = null) {
    const el = elementId ? document.getElementById(elementId) : document.querySelector('.status');
    if (el) { el.textContent = message; el.className = 'status success'; setTimeout(() => el.textContent = '', 5000); }
}
function showError(message, elementId = null) {
    const el = elementId ? document.getElementById(elementId) : document.querySelector('.status');
    if (el) { el.textContent = message; el.className = 'status error'; setTimeout(() => el.textContent = '', 10000); }
}

function enableButtons(enabled) {
    createBtn.disabled = !enabled;
    contributeBtn.disabled = !enabled;
    finalizeBtn.disabled = !enabled;
    refreshBtn.disabled = !enabled;
}
function disableAllButtons() {
    createBtn.disabled = true;
    contributeBtn.disabled = true;
    finalizeBtn.disabled = true;
    refreshBtn.disabled = true;
    connectBtn.disabled = true;
}
function resetUI() {
    walletAddressEl.textContent = 'Not connected';
    networkInfoEl.textContent = '-';
    ethBalanceEl.textContent = '-';
    tokenBalanceEl.textContent = '-';
    campaignsContainer.innerHTML = '';
    enableButtons(false);
}
