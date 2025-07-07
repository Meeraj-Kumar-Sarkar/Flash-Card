import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js';
import { getDatabase, ref, push, onValue, remove } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js';

const appSettings = {
    databaseURL: 'https://deck-f7da2-default-rtdb.asia-southeast1.firebasedatabase.app/',
};

const app = initializeApp(appSettings);
const database = getDatabase(app);
const DeckDB = ref(database, 'DeckList');

// DOM Elements
const createDeckBtn = document.getElementById('create-deck-btn');
const deckNameInput = document.getElementById('deck-name');
const deckList = document.getElementById('deck-list');
const deckSelect = document.getElementById('deck-select');
const addCardBtn = document.getElementById('add-card-btn');
const cancelCardBtn = document.getElementById('cancel-card-btn');
const showAddCardBtn = document.getElementById('show-add-card-btn');
const addCardSection = document.getElementById('add-card-section');
const filterDeckSelect = document.getElementById('filter-deck');
const loader = document.getElementById('loader');

// ===============================
// 🧠 Create New Deck
// ===============================
createDeckBtn.addEventListener('click', () => {
    const deckName = deckNameInput.value.trim();

    if (deckName === '') {
        showToast('Deck name cannot be empty.', 'error');
        return;
    }

    showLoader();
    onValue(DeckDB, (snapshot) => {
        let exists = false;
        let duplicateKey = null;

        if (snapshot.exists()) {
            for (let [key, value] of Object.entries(snapshot.val())) {
                if (value.name && value.name.toLowerCase() === deckName.toLowerCase()) {
                    exists = true;
                    duplicateKey = key;
                    break;
                }
            }
        }

        if (exists) {
            hideLoader();
            showConfirmationModal(`Deck '${deckName}' already exists. Override it?`, () => {
                showLoader();
                const targetRef = ref(database, `DeckList/${duplicateKey}`);
                remove(targetRef).then(() => {
                    push(DeckDB, { name: deckName, cards: {} });
                    deckNameInput.value = '';
                    hideLoader();
                    showToast('Deck overridden successfully!', 'success');
                });
            });
        } else {
            push(DeckDB, { name: deckName, cards: {} });
            deckNameInput.value = '';
            hideLoader();
            showToast('Deck created successfully!', 'success');
        }
    }, { onlyOnce: true });
});

// ===============================
// 🪄 Load Decks and Cards
// ===============================
showLoader();
onValue(DeckDB, (snapshot) => {
    clearDeckList();
    clearDeckDropdown();
    clearFilterDropdown();

    if (snapshot.exists()) {
        const decks = Object.entries(snapshot.val());

        for (let [deckId, deckData] of decks) {
            // Add to dropdowns
            const option = document.createElement('option');
            option.value = deckId;
            option.textContent = deckData.name;
            deckSelect.appendChild(option);

            const filterOption = document.createElement('option');
            filterOption.value = deckId;
            filterOption.textContent = deckData.name;
            filterDeckSelect.appendChild(filterOption);

            // Show cards based on filter
            if (deckData.cards && (!filterDeckSelect.value || filterDeckSelect.value === deckId)) {
                for (let [cardId, cardData] of Object.entries(deckData.cards)) {
                    if (cardData.question && cardData.answer) {
                        renderFlashCard(cardData, deckData.name, deckId, cardId);
                    }
                }
            }
        }
    } else {
        deckList.innerHTML = '<p class="empty-state">No decks available. Create one to get started!</p>';
    }
    hideLoader();
});

// ===============================
// 🔍 Filter Cards by Deck
// ===============================
filterDeckSelect.addEventListener('change', () => {
    showLoader();
    onValue(DeckDB, (snapshot) => {
        clearDeckList();

        if (snapshot.exists()) {
            const decks = Object.entries(snapshot.val());
            const selectedDeckId = filterDeckSelect.value;

            if (selectedDeckId === '') {
                // Show all cards
                for (let [deckId, deckData] of decks) {
                    if (deckData.cards) {
                        for (let [cardId, cardData] of Object.entries(deckData.cards)) {
                            if (cardData.question && cardData.answer) {
                                renderFlashCard(cardData, deckData.name, deckId, cardId);
                            }
                        }
                    }
                }
            } else {
                // Show cards from selected deck
                const deckData = decks.find(([deckId]) => deckId === selectedDeckId)?.[1];
                if (deckData?.cards) {
                    for (let [cardId, cardData] of Object.entries(deckData.cards)) {
                        if (cardData.question && cardData.answer) {
                            renderFlashCard(cardData, deckData.name, selectedDeckId, cardId);
                        }
                    }
                }
            }
        } else {
            deckList.innerHTML = '<p class="empty-state">No cards found in this deck.</p>';
        }
        hideLoader();
    }, { onlyOnce: true });
});

// ===============================
// ✨ Add New Flashcard
// ===============================
addCardBtn.addEventListener('click', () => {
    const selectedDeckId = deckSelect.value;
    const question = document.getElementById('card-question').value.trim();
    const answer = document.getElementById('card-answer').value.trim();

    if (!selectedDeckId) {
        showToast('Please select a deck.', 'error');
        return;
    }

    if (!question || !answer) {
        showToast('Both question and answer are required.', 'error');
        return;
    }

    showLoader();
    const cardsRef = ref(database, `DeckList/${selectedDeckId}/cards`);
    push(cardsRef, { question, answer }).then(() => {
        hideLoader();
        showToast('Card added successfully!', 'success');
        document.getElementById('card-question').value = '';
        document.getElementById('card-answer').value = '';
        addCardSection.classList.add('hidden');
    });
});

// ===============================
// 👁️ Show/Hide Card Form
// ===============================
showAddCardBtn.addEventListener('click', () => {
    addCardSection.classList.remove('hidden');
    addCardSection.scrollIntoView({ behavior: 'smooth' });
});

cancelCardBtn.addEventListener('click', () => {
    addCardSection.classList.add('hidden');
    document.getElementById('card-question').value = '';
    document.getElementById('card-answer').value = '';
    deckSelect.selectedIndex = 0;
});

// ===============================
// 🎴 Render Flashcard (Flip Style)
// ===============================
function renderFlashCard(cardData, deckName, deckId, cardId) {
    const cardEl = document.createElement('li');
    cardEl.className = 'flash-card';

    cardEl.innerHTML = `
    <div class="deck-name">${deckName}</div>
    <div class="question">
      <strong>Q:</strong>
      <p>${cardData.question}</p>
    </div>
    <hr class="separator" />
    <div class="answer">
      <strong>A:</strong>
      <p>${cardData.answer}</p>
    </div>
  `;

    cardEl.addEventListener('dblclick', () => {
        showConfirmationModal('Do you want to delete this flashcard?', () => {
            showLoader();
            const cardRef = ref(database, `DeckList/${deckId}/cards/${cardId}`);
            remove(cardRef).then(() => {
                hideLoader();
                showToast('Flashcard deleted.', 'success');
                cardEl.remove();
            }).catch((error) => {
                hideLoader();
                showToast(`Failed to delete flashcard: ${error.message}`, 'error');
            });
        });
    });

    deckList.appendChild(cardEl);
}

// ===============================
// 🧹 Helpers
// ===============================
function clearDeckList() {
    deckList.innerHTML = '';
}

function clearDeckDropdown() {
    deckSelect.innerHTML = '<option value="">Select a deck...</option>';
}

function clearFilterDropdown() {
    filterDeckSelect.innerHTML = '<option value="">All Decks</option>';
}

function showLoader() {
    loader.style.display = 'flex';
}

function hideLoader() {
    loader.style.display = 'none';
}

// ===============================
// 🎨 Theme Switcher
// ===============================
const themeToggle = document.getElementById('theme-toggle');
const docEl = document.documentElement;

const savedTheme = localStorage.getItem('theme') || 'light';
docEl.setAttribute('data-theme', savedTheme);
themeToggle.checked = savedTheme === 'dark';

themeToggle.addEventListener('change', () => {
    if (themeToggle.checked) {
        docEl.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else {
        docEl.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    }
});

// ===============================
// 🍞 Custom Toast Notifications
// ===============================
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// ===============================
// ❓ Custom Confirmation Modal
// ===============================
function showConfirmationModal(message, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class='modal-content'>
            <p>${message}</p>
            <div class='modal-buttons'>
                <button id='confirm-btn'>Confirm</button>
                <button id='cancel-btn'>Cancel</button>
            </div>
        </div>
    `;

    const confirmBtn = modal.querySelector('#confirm-btn');
    const cancelBtn = modal.querySelector('#cancel-btn');

    confirmBtn.addEventListener('click', () => {
        onConfirm();
        document.body.removeChild(modal);
    });

    cancelBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    document.body.appendChild(modal);
}
