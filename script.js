/* ================= GAME LOGIC CLASSES ================= */

// This class represents a single playing card
class Card {
    constructor(suit, value) {
        this.suit = suit;   // Hearts, Spades, etc.
        this.value = value; // 2, 3, J, Q, K, A
    }

    // Converts card names into numbers so we can compare them mathematically
    getNumericValue() {
        if (this.value === "A") return 14;
        if (this.value === "K") return 13;
        if (this.value === "Q") return 12;
        if (this.value === "J") return 11;
        return parseInt(this.value); // Turns "10" (string) into 10 (number)
    }

    // Simple helper to show the card as text (e.g., "A♠")
    toString() {
        return this.value + this.suit;
    }
}

// Manages the 52-card deck
class Deck {
    constructor() {
        this.suits = ["♠","♥","♦","♣"];
        this.values = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
        this.cards = [];
        this.create(); // Build the deck as soon as we make it
    }

    // Loop through every suit and every value to fill the cards array
    create() {
        this.cards = [];
        for (let s of this.suits) {
            for (let v of this.values) {
                this.cards.push(new Card(s,v));
            }
        }
    }

    // A quick way to randomize the order of the cards
    shuffle() {
        this.cards.sort(() => Math.random() - 0.5);
    }

    // Take the top card off the deck and return it
    deal() {
        return this.cards.pop();
    }
}

// Represents either the Player or the Dealer
class Player {
    constructor(name) {
        this.name = name;
        this.hand = [];
    }

    // Adds a card from the deck to the hand
    draw(deck) {
        this.hand.push(deck.deal());
    }

    // Clears the hand for a new round
    reset() {
        this.hand = [];
    }
}

// The "Brain" of the game - handles rounds and rules
class Game {
    constructor() {
        this.deck = new Deck();
        this.player = new Player("You");
        this.dealer = new Player("Dealer");
        this.tokens = 100; // Starting money
    }

    // Sets up a fresh round
    startRound() {
        this.deck.create();
        this.deck.shuffle();
        this.player.reset();
        this.dealer.reset();

        // Give 5 cards to each
        for (let i = 0; i < 5; i++) {
            this.player.draw(this.deck);
            this.dealer.draw(this.deck);
        }
    }

    // The most complex part: identifying the poker hand
    evaluate(hand) {
        const values = hand.map(c => c.getNumericValue()).sort((a,b)=>b-a);
        const suits = hand.map(c => c.suit);

        // Count how many of each value we have (e.g., { "10": 2, "A": 1 })
        const counts = {};
        values.forEach(v => counts[v] = (counts[v]||0)+1);

        const uniqueValues = Object.keys(counts).map(Number).sort((a,b)=>b-a);
        const countValues = Object.values(counts).sort((a,b)=>b-a);

        // Check for Flush (all same suit) and Straight (sequential numbers)
        const isFlush = suits.every(s => s === suits[0]);
        const sortedAsc = [...values].sort((a,b)=>a-b);
        const isStraight = sortedAsc.every((v,i,a)=> i===0 || v===a[i-1]+1);

        // Assigning scores (10 for Royal Flush down to 1 for High Card)
        if (isFlush && sortedAsc.toString() === "10,11,12,13,14")
            return [10, values, "Royal Flush"];

        if (isFlush && isStraight)
            return [9, values, "Straight Flush"];

        if (countValues[0] === 4) return [8, uniqueValues, "Four of a Kind"];

        if (countValues[0] === 3 && countValues[1] === 2) return [7, uniqueValues, "Full House"];

        if (isFlush) return [6, values, "Flush"];
        if (isStraight) return [5, values, "Straight"];

        if (countValues[0] === 3) return [4, uniqueValues, "Three of a Kind"];

        if (countValues[0] === 2 && countValues[1] === 2) return [3, uniqueValues, "Two Pair"];

        if (countValues[0] === 2) return [2, uniqueValues, "One Pair"];

        return [1, values, "High Card"];
    }

    // Compare player vs dealer to see who won the pot
    compareHands() {
        const pEval = this.evaluate(this.player.hand);
        const dEval = this.evaluate(this.dealer.hand);

        // 1. Compare Rank (e.g., Flush beats Pair)
        if (pEval[0] > dEval[0]) return ["win", pEval[2]];
        if (pEval[0] < dEval[0]) return ["lose", dEval[2]];

        // 2. If Rank is tied, compare the actual card values (Kickers)
        for (let i = 0; i < pEval[1].length; i++) {
            if (pEval[1][i] > dEval[1][i]) return ["win", pEval[2]];
            if (pEval[1][i] < dEval[1][i]) return ["lose", dEval[2]];
        }

        return ["tie", pEval[2]];
    }
}

/* ================= UI & CONTROLS ================= */

let game = new Game();

// Grabbing all the buttons and screens from the HTML
const startBtn = document.getElementById("startBtn");
const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const revealBtn = document.getElementById("revealBtn");
const nextBtn = document.getElementById("nextBtn");
const restartBtn = document.getElementById("restartBtn");

// UI Display areas
const playerDiv = document.getElementById("playerCards");
const dealerDiv = document.getElementById("dealerCards");
const statusDiv = document.getElementById("status");
const tokenSpan = document.getElementById("tokens");
const betInput = document.getElementById("betInput");

// Sound Effects
const winSound = new Audio('sounds/win.mp3');
const loseSound = new Audio('sounds/loser.mp3');
const coinSound = new Audio('sounds/coin.mp3');

// Help Menu Logic
const helpBtn = document.getElementById("helpBtn");
const helpOverlay = document.getElementById("helpOverlay");
const closeHelpBtn = document.getElementById("closeHelpBtn");

helpBtn.addEventListener("click", () => helpOverlay.style.display = "block");
closeHelpBtn.addEventListener("click", () => helpOverlay.style.display = "none");

// Start the game when the first "Start" button is clicked
startBtn.addEventListener("click", () => {
    startScreen.style.display = "none";
    gameScreen.style.display = "block";
    startNewRound();
});

// Cleans up the table and deals fresh cards
function startNewRound() {
    game.startRound();
    tokenSpan.textContent = game.tokens;
    betInput.value = "";
    statusDiv.textContent = "";
    nextBtn.disabled = true;
    revealBtn.disabled = false;

    displayPlayerCards();
    displayDealerHidden(); // Don't show the dealer's cards yet!
}

// The main action: Reveal cards and calculate win/loss
revealBtn.addEventListener("click", () => {
    const bet = parseInt(betInput.value);

    // Basic safety check for the bet amount
    if (!bet || bet <= 0 || bet > game.tokens) {
        alert("Invalid bet.");
        return;
    }

    displayDealerCards(); // Flip the dealer's cards over
    const result = game.compareHands();

    if (result[0] === "win") {
        game.tokens += bet;
        statusDiv.textContent = `You win with ${result[1]}!`;
        coinSound.play();

        // Check if you hit the "Total Victory" goal
        if (game.tokens >= 101) {
            const overlay = document.getElementById("victoryOverlay");
            const finalTokens = document.getElementById("finalTokenCount");
            finalTokens.textContent = `You finished with ${game.tokens} tokens!`;
            overlay.style.display = "block";
            
            winSound.currentTime = 0;
            winSound.play();

            document.getElementById("victoryRestartBtn").onclick = () => {
                overlay.style.display = "none";
                game = new Game();
                startNewRound();
            };
        }
    } else if (result[0] === "lose") {
        game.tokens -= bet;
        statusDiv.textContent = `Dealer wins with ${result[1]}!`;
        
        loseSound.currentTime = 0;
        loseSound.play().catch(e => console.log("Audio file missing or blocked"));

        // Check if you're broke
        if (game.tokens <= 0) {
            game.tokens = 0;
            const loseOverlay = document.getElementById("loseOverlay");
            loseOverlay.style.display = "block";
            
            document.getElementById("loseRestartBtn").onclick = () => {
                loseOverlay.style.display = "none";
                game = new Game();
                startNewRound();
            };
        }
    } else {
        statusDiv.textContent = `Tie with ${result[1]}!`;
    }

    tokenSpan.textContent = game.tokens;
    revealBtn.disabled = true;
    nextBtn.disabled = false;
});

// "Next Hand" button
nextBtn.addEventListener("click", startNewRound);

// Emergency restart button
restartBtn.addEventListener("click", () => {
    game = new Game();
    startNewRound();
});

/* ================= VISUALS ================= */

// Creates the HTML divs for the player's cards
function displayPlayerCards() {
    playerDiv.innerHTML = "";
    game.player.hand.forEach(card => {
        const div = document.createElement("div");
        div.classList.add("card");
        div.textContent = card.toString();
        playerDiv.appendChild(div);
    });
}

// Shows the back of the cards for the dealer
function displayDealerHidden() {
    dealerDiv.innerHTML = "";
    for (let i = 0; i < 5; i++) {
        const div = document.createElement("div");
        div.classList.add("card");
        div.textContent = "🂠"; // Card back emoji
        dealerDiv.appendChild(div);
    }
}

// Flips dealer's cards over
function displayDealerCards() {
    dealerDiv.innerHTML = "";
    game.dealer.hand.forEach(card => {
        const div = document.createElement("div");
        div.classList.add("card");
        div.textContent = card.toString();
        dealerDiv.appendChild(div);
    });
}