import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

const appSettings = {
    databaseURL: "https://deck-f7da2-default-rtdb.asia-southeast1.firebasedatabase.app/",
};

const app = initializeApp(appSettings);
const database = getDatabase(app);
const DeckDB = ref(database, "DeckList");

// DOM Elements
const createDeckBtn = document.getElementById("create-deck-btn");
const deckNameInput = document.getElementById("deck-name");
const deckList = document.getElementById("deck-list");
const deckSelect = document.getElementById("deck-select");
const addCardBtn = document.getElementById("add-card-btn");
const cancelCardBtn = document.getElementById("cancel-card-btn");
const showAddCardBtn = document.getElementById("show-add-card-btn");
const addCardSection = document.getElementById("add-card-section");
const filterDeckSelect = document.getElementById("filter-deck");

// ===============================
// 🧠 Create New Deck
// ===============================
createDeckBtn.addEventListener("click", () => {
    const deckName = deckNameInput.value.trim();

    if (deckName === "") {
        alert("Deck name cannot be empty.");
        return;
    }

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
            const override = confirm(`Deck "${deckName}" already exists. Override it?`);
            if (override) {
                const targetRef = ref(database, `DeckList/${duplicateKey}`);
                remove(targetRef).then(() => {
                    push(DeckDB, { name: deckName, cards: {} });
                    deckNameInput.value = "";
                });
            } else {
                const newName = prompt("Enter a new deck name:");
                if (newName) {
                    push(DeckDB, { name: newName.trim(), cards: {} });
                    deckNameInput.value = "";
                }
            }
        } else {
            push(DeckDB, { name: deckName, cards: {} });
            deckNameInput.value = "";
        }
    }, { onlyOnce: true });
});

// ===============================
// 🪄 Load Decks and Cards
// ===============================
onValue(DeckDB, (snapshot) => {
    clearDeckList();
    clearDeckDropdown();
    clearFilterDropdown();

    if (snapshot.exists()) {
        const decks = Object.entries(snapshot.val());

        for (let [deckId, deckData] of decks) {
            // Add to dropdowns
            const option = document.createElement("option");
            option.value = deckId;
            option.textContent = deckData.name;
            deckSelect.appendChild(option);

            const filterOption = document.createElement("option");
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
        deckList.textContent = "No Content Added";
    }
});

// ===============================
// 🔍 Filter Cards by Deck
// ===============================
filterDeckSelect.addEventListener("change", () => {
    onValue(DeckDB, (snapshot) => {
        clearDeckList();

        if (snapshot.exists()) {
            const decks = Object.entries(snapshot.val());
            const selectedDeckId = filterDeckSelect.value;

            if (selectedDeckId === "") {
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
            deckList.textContent = "No Content Added";
        }
    }, { onlyOnce: true });
});

// ===============================
// ✨ Add New Flashcard
// ===============================
addCardBtn.addEventListener("click", () => {
    const selectedDeckId = deckSelect.value;
    const question = document.getElementById("card-question").value.trim();
    const answer = document.getElementById("card-answer").value.trim();

    if (!selectedDeckId) {
        alert("Please select a deck.");
        return;
    }

    if (!question || !answer) {
        alert("Both question and answer are required.");
        return;
    }

    const cardsRef = ref(database, `DeckList/${selectedDeckId}/cards`);
    push(cardsRef, { question, answer }).then(() => {
        alert("Card added.");
        document.getElementById("card-question").value = "";
        document.getElementById("card-answer").value = "";
        addCardSection.classList.add("hidden");
    });
});

// ===============================
// 👁️ Show/Hide Card Form
// ===============================
showAddCardBtn.addEventListener("click", () => {
    addCardSection.classList.remove("hidden");
});

cancelCardBtn.addEventListener("click", () => {
    addCardSection.classList.add("hidden");
    document.getElementById("card-question").value = "";
    document.getElementById("card-answer").value = "";
    deckSelect.selectedIndex = 0;
});

// ===============================
// 🎴 Render Flashcard (Flip Style)
// ===============================
function renderFlashCard(cardData, deckName, deckId, cardId) {
    const cardEl = document.createElement("li");
    cardEl.className = "flash-card";

    cardEl.innerHTML = `
    <div class="flash-card-inner">
      <div class="flash-card-front">
        <div class="deck-name">${deckName}</div>
        <strong>Q:</strong>
        <p>${cardData.question}</p>
      </div>
      <div class="flash-card-back">
        <strong>A:</strong>
        <p>${cardData.answer}</p>
      </div>
    </div>
  `;

    // 🗑️ Double-click to delete
    cardEl.addEventListener("dblclick", () => {
        const confirmDelete = confirm("Do you want to delete this flashcard?");
        if (confirmDelete) {
            const cardRef = ref(database, `DeckList/${deckId}/cards/${cardId}`);
            remove(cardRef).then(() => {
                alert("Flashcard deleted.");
                cardEl.remove(); // Also remove from UI
            })
                .catch((error) => {
                    alert("Failed to delete flashcard: " + error.message);
                });
        }
    });

    deckList.appendChild(cardEl);
}

// ===============================
// 🧹 Helpers
// ===============================
function clearDeckList() {
    deckList.innerHTML = "";
}

function clearDeckDropdown() {
    deckSelect.innerHTML = `<option value="">Select a deck...</option>`;
}

function clearFilterDropdown() {
    filterDeckSelect.innerHTML = `<option value="">All Decks</option>`;
}
