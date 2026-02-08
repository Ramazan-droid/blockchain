// Конфигурация
const CONTRACT_ADDRESS = "0x51d4210e68fb1e3331c3f14d79e4f0051f4ba593"; // Замените на ваш адрес
const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111
const SEPOLIA_RPC_URL = "https://rpc.sepolia.org";

// Глобальные переменные
let provider, signer, account;
let crowdfundingContract;
let currentNetwork = null;

// DOM элементы
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

// События
connectBtn.addEventListener('click', connectWallet);
createBtn.addEventListener('click', createCampaign);
contributeBtn.addEventListener('click', contribute);
finalizeBtn.addEventListener('click', finalizeCampaign);
refreshBtn.addEventListener('click', loadCampaigns);

// Проверка MetaMask при загрузке
window.addEventListener('load', async() => {
    if (typeof window.ethereum === 'undefined') {
        showError('Please install MetaMask to use this DApp');
        disableAllButtons();
        return;
    }

    // Проверяем подключен ли кошелек
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts.length > 0) {
        await setupProvider();
        await checkNetwork();
        await updateUI();
    }

    // Слушаем изменения аккаунтов
    window.ethereum.on('accountsChanged', async(accounts) => {
        if (accounts.length > 0) {
            account = accounts[0];
            await updateUI();
        } else {
            resetUI();
        }
    });

    // Слушаем изменения сети
    window.ethereum.on('chainChanged', () => {
        window.location.reload();
    });
});

// Подключение кошелька
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

// Настройка провайдера
async function setupProvider() {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    account = await signer.getAddress();

    // Инициализация контракта
    crowdfundingContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        crowdfundingABI,
        signer
    );
}

// Переключение на Sepolia
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
                            nativeCurrency: {
                                name: 'Sepolia ETH',
                                symbol: 'ETH',
                                decimals: 18
                            },
                            blockExplorerUrls: ['https://sepolia.etherscan.io']
                        }]
                    });
                }
                throw switchError;
            }
        }

        currentNetwork = SEPOLIA_CHAIN_ID;
    } catch (error) {
        console.error('Network switch error:', error);
        showError('Please switch to Sepolia network manually');
    }
}

// Проверка сети
async function checkNetwork() {
    try {
        currentNetwork = await window.ethereum.request({ method: 'eth_chainId' });
        return currentNetwork === SEPOLIA_CHAIN_ID;
    } catch (error) {
        return false;
    }
}

// Обновление интерфейса
async function updateUI() {
    if (!account || !provider) return;

    // Обновляем адрес
    const shortAddress = `${account.substring(0, 6)}...${account.substring(account.length - 4)}`;
    walletAddressEl.textContent = shortAddress;
    walletAddressEl.title = account;

    // Обновляем информацию о сети
    updateNetworkInfo();

    // Обновляем балансы
    await updateBalances();

    // Загружаем кампании
    await loadCampaigns();

    // Активируем кнопки
    enableButtons(true);
}

// Обновление информации о сети
function updateNetworkInfo() {
    if (currentNetwork === SEPOLIA_CHAIN_ID) {
        networkInfoEl.textContent = 'Sepolia Testnet ✓';
        networkInfoEl.style.color = '#4CAF50';
    } else {
        networkInfoEl.textContent = 'Wrong Network ✗';
        networkInfoEl.style.color = '#f44336';
    }
}

// Обновление балансов
async function updateBalances() {
    try {
        // Баланс ETH
        const ethBalance = await provider.getBalance(account);
        ethBalanceEl.textContent = `${ethers.utils.formatEther(ethBalance).substring(0, 8)} ETH`;

        // Баланс токенов
        const tokenAddress = await crowdfundingContract.getTokenAddress();
        const tokenContract = new ethers.Contract(
            tokenAddress, [
                "function balanceOf(address) view returns (uint256)",
                "function decimals() view returns (uint8)",
                "function symbol() view returns (string)"
            ],
            signer
        );

        const tokenBalance = await tokenContract.balanceOf(account);
        const decimals = await tokenContract.decimals();
        tokenBalanceEl.textContent = `${ethers.utils.formatUnits(tokenBalance, decimals).substring(0, 8)} CRWD`;
    } catch (error) {
        console.error('Balance update error:', error);
    }
}

// Создание кампании
async function createCampaign() {
    try {
        const title = document.getElementById('titleInput').value;
        const goal = document.getElementById('goalInput').value;
        const duration = document.getElementById('durationInput').value;

        if (!title || !goal || !duration) {
            showError('Please fill all fields');
            return;
        }

        const goalWei = ethers.utils.parseEther(goal);
        const durationSeconds = parseInt(duration) * 24 * 60 * 60;

        showLoading('Creating campaign...', 'createStatus');

        const tx = await crowdfundingContract.createCampaign(title, goalWei, durationSeconds);
        await tx.wait();

        showSuccess(`Campaign "${title}" created successfully!`, 'createStatus');

        // Очистка формы
        document.getElementById('titleInput').value = '';
        document.getElementById('goalInput').value = '';
        document.getElementById('durationInput').value = '';

        // Обновление данных
        await loadCampaigns();
        await updateBalances();

    } catch (error) {
        console.error('Create campaign error:', error);
        showError(`Failed to create: ${error.message}`, 'createStatus');
    }
}

// Вклад в кампанию
async function contribute() {
    try {
        const campaignId = document.getElementById('contributeId').value;
        const amount = document.getElementById('amountInput').value;

        if (!campaignId || !amount) {
            showError('Please fill all fields');
            return;
        }

        const amountWei = ethers.utils.parseEther(amount);
        const id = parseInt(campaignId);

        showLoading(`Contributing ${amount} ETH...`, 'contributeStatus');

        const tx = await crowdfundingContract.contribute(id, { value: amountWei });
        await tx.wait();

        showSuccess(`Successfully contributed ${amount} ETH! Tokens minted.`, 'contributeStatus');

        // Обновление данных
        await loadCampaigns();
        await updateBalances();

    } catch (error) {
        console.error('Contribute error:', error);
        showError(`Failed to contribute: ${error.message}`, 'contributeStatus');
    }
}

// Завершение кампании
async function finalizeCampaign() {
    try {
        const campaignId = document.getElementById('finalizeId').value;

        if (!campaignId) {
            showError('Please enter campaign ID');
            return;
        }

        const id = parseInt(campaignId);

        showLoading('Finalizing campaign...', 'finalizeStatus');

        const tx = await crowdfundingContract.finalizeCampaign(id);
        await tx.wait();

        showSuccess('Campaign finalized!', 'finalizeStatus');

        // Обновление данных
        await loadCampaigns();

    } catch (error) {
        console.error('Finalize error:', error);
        showError(`Failed to finalize: ${error.message}`, 'finalizeStatus');
    }
}

// Загрузка кампаний
async function loadCampaigns() {
    try {
        if (!crowdfundingContract) return;

        showLoading('Loading campaigns...');
        campaignsContainer.innerHTML = '';

        // ИСПРАВЬТЕ: eventCount() вместо getCampaignCount()
        const count = await crowdfundingContract.eventCount();

        if (count == 0) {
            campaignsContainer.innerHTML = `
                <div class="campaign-card">
                    <div class="campaign-title">No campaigns yet</div>
                    <div class="campaign-stats">
                        Create the first campaign using the form above!
                    </div>
                </div>
            `;
            return;
        }

        for (let i = 0; i < count; i++) {
            try {
                // ИСПРАВЬТЕ: events(i) вместо getCampaign(i)
                const event = await crowdfundingContract.events(i);
                const [title, fundingGoal, fundsRaised, deadline, active] = event;

                // ИСПРАВЬТЕ: isEventActive(i) вместо isActive(i)
                const isActive = await crowdfundingContract.isEventActive(i);

                // Расчет прогресса
                const progress = fundingGoal > 0 ? Math.min((fundsRaised * 100) / fundingGoal, 100) : 0;

                // Форматирование времени
                const deadlineDate = new Date(deadline * 1000);
                const now = new Date();
                const timeLeft = deadlineDate - now;
                const daysLeft = Math.max(0, Math.ceil(timeLeft / (1000 * 60 * 60 * 24)));

                // Создание карточки (убрали creator - его нет в events)
                const card = document.createElement('div');
                card.className = 'campaign-card';

                card.innerHTML = `
                    <div class="campaign-title">${title}</div>
                    <div class="campaign-stats">
                        <div><strong>ID:</strong> ${i}</div>
                        <div><strong>Goal:</strong> ${ethers.utils.formatEther(fundingGoal)} ETH</div>
                        <div><strong>Raised:</strong> ${ethers.utils.formatEther(fundsRaised)} ETH</div>
                        <div><strong>Status:</strong> 
                            <span class="${isActive ? 'campaign-active' : 'campaign-ended'}">
                                ${isActive ? 'Active' : 'Ended'}
                            </span>
                        </div>
                        <div><strong>Deadline:</strong> ${deadlineDate.toLocaleDateString()}</div>
                        <div><strong>Time left:</strong> ${daysLeft} days</div>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div><strong>Progress:</strong> ${progress.toFixed(1)}%</div>
                    ${isActive ? `
                        <button onclick="quickContribute(${i})" class="btn btn-warning" style="margin-top: 10px; width: 100%;">
                            Quick Contribute
                        </button>
                    ` : ''}
                `;
                
                campaignsContainer.appendChild(card);
            } catch (error) {
                console.error(`Error loading campaign ${i}:`, error);
            }
        }
    } catch (error) {
        console.error('Load campaigns error:', error);
        showError('Failed to load campaigns');
    }
}

// Быстрый вклад
window.quickContribute = async function(campaignId) {
    const amount = prompt('Enter amount in ETH:', '0.01');
    if (amount && parseFloat(amount) > 0) {
        document.getElementById('contributeId').value = campaignId;
        document.getElementById('amountInput').value = amount;
        await contribute();
    }
};

// Вспомогательные функции
function showLoading(message, elementId = null) {
    const element = elementId ? document.getElementById(elementId) : document.querySelector('.status');
    if (element) {
        element.textContent = message;
        element.className = 'status info';
    }
}

function showSuccess(message, elementId = null) {
    const element = elementId ? document.getElementById(elementId) : document.querySelector('.status');
    if (element) {
        element.textContent = message;
        element.className = 'status success';
        setTimeout(() => element.textContent = '', 5000);
    }
}

function showError(message, elementId = null) {
    const element = elementId ? document.getElementById(elementId) : document.querySelector('.status');
    if (element) {
        element.textContent = message;
        element.className = 'status error';
        setTimeout(() => element.textContent = '', 10000);
    }
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