document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('board');
    const cells = document.querySelectorAll('.cell');
    const statusDisplay = document.getElementById('status');
    const resetButton = document.getElementById('reset');
    const laserContainer = document.getElementById('laser-container');
    
    // SVG templates
    const xTemplate = document.getElementById('x-template');
    const oTemplate = document.getElementById('o-template');

    let currentPlayer = 'X';
    let boardState = Array(9).fill(null);
    let gameActive = true;
    let activeLasers = []; // Track active lasers for cleanup

    const winningConditions = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6]
    ];

    function handleCellClick(event) {
        const clickedCell = event.target;
        const clickedCellIndex = parseInt(clickedCell.dataset.index);

        if (boardState[clickedCellIndex] !== null || !gameActive) {
            return; // Ignore click if cell is already filled or game is over
        }

        // Place the mark using SVG
        boardState[clickedCellIndex] = currentPlayer;
        placeSVGMark(clickedCell, currentPlayer);

        // Check for win or draw
        const winningLine = checkWin();
        if (winningLine) {
            statusDisplay.textContent = `Player ${currentPlayer} has won!`;
            gameActive = false;
            highlightWinningCells(winningLine);
            return;
        }

        if (checkDraw()) {
            statusDisplay.textContent = `Game ended in a draw!`;
            gameActive = false;
            return;
        }

        // Switch player
        switchPlayer();

        // Laser Activation Logic with enhanced probability
        if (gameActive && Math.random() < 0.25) { // 25% chance
            activateLaser(clickedCellIndex);
        }
    }

    function placeSVGMark(cell, player) {
        // Clear any content first
        cell.innerHTML = '';
        
        // Clone the appropriate template
        const template = player === 'X' ? xTemplate : oTemplate;
        const clone = template.cloneNode(true);
        clone.removeAttribute('id'); // Remove template id
        clone.style.display = 'block'; // Make visible
        clone.style.width = '100%';
        clone.style.height = '100%';
        
        // Add to the cell
        cell.appendChild(clone);
        cell.classList.add(player.toLowerCase()); // Keep the class for styling
        
        // Animate with GSAP
        if (player === 'X') {
            // Animate X lines drawing
            const lines = clone.querySelectorAll('line');
            gsap.set(lines, { strokeDasharray: 100, strokeDashoffset: 100 });
            gsap.to(lines, {
                strokeDashoffset: 0,
                duration: 0.5,
                stagger: 0.15,
                ease: "power2.out"
            });
        } else {
            // Animate O circle drawing
            const circle = clone.querySelector('circle');
            const circumference = 2 * Math.PI * 35; // 2πr where r=35
            gsap.set(circle, { 
                strokeDasharray: circumference,
                strokeDashoffset: circumference
            });
            gsap.to(circle, {
                strokeDashoffset: 0,
                duration: 0.7,
                ease: "power2.inOut"
            });
        }
    }

    function switchPlayer() {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        
        // Animate status text change
        gsap.to(statusDisplay, {
            opacity: 0,
            duration: 0.2,
            onComplete: () => {
                statusDisplay.textContent = `Player ${currentPlayer}'s turn`;
                gsap.to(statusDisplay, {
                    opacity: 1,
                    duration: 0.2
                });
            }
        });
    }

    function checkWin() {
        for (let i = 0; i < winningConditions.length; i++) {
            const condition = winningConditions[i];
            const [a, b, c] = condition;
            if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
                return condition; // Return the winning indices
            }
        }
        return null; // Return null if no win
    }

    function checkDraw() {
        return boardState.every(cell => cell !== null);
    }

    function activateLaser(triggerIndex) {
        console.log(`Laser activated at index ${triggerIndex}!`);
        const row = Math.floor(triggerIndex / 3);
        const col = triggerIndex % 3;

        // Visual Laser Effect with GSAP
        createLaserBeam(row, col);

        // Flash the trigger cell
        const triggerCell = cells[triggerIndex];
        gsap.fromTo(triggerCell, 
            { filter: 'brightness(1)' },
            { 
                filter: 'brightness(1.8)', 
                duration: 0.3,
                repeat: 1,
                yoyo: true
            }
        );

        // Track cells to clear
        const cellsToClear = [];
        
        // Identify cells to clear in row
        for (let i = 0; i < 3; i++) {
            const cellIndex = row * 3 + i;
            if (cellIndex !== triggerIndex && boardState[cellIndex] !== null) {
                cellsToClear.push(cellIndex);
            }
        }

        // Identify cells to clear in column
        for (let i = 0; i < 3; i++) {
            const cellIndex = i * 3 + col;
            if (cellIndex !== triggerIndex && boardState[cellIndex] !== null && !cellsToClear.includes(cellIndex)) {
                cellsToClear.push(cellIndex);
            }
        }

        // Small delay before clearing cells
        gsap.delayedCall(0.4, () => {
            // Clear cells with staggered timing
            gsap.to(cellsToClear, {
                duration: 0.1,
                onComplete: function() {
                    clearCell(this.targets()[0]);
                },
                stagger: 0.1
            });

            // Check for win/draw after all cells are cleared
            gsap.delayedCall(cellsToClear.length * 0.1 + 0.3, () => {
                if (gameActive) {
                    const winningLineAfterLaser = checkWin();
                    if (winningLineAfterLaser) {
                        statusDisplay.textContent = `Player ${currentPlayer} has won!`;
                        gameActive = false;
                        highlightWinningCells(winningLineAfterLaser);
                    } else if (checkDraw()) {
                        statusDisplay.textContent = `Game ended in a draw!`;
                        gameActive = false;
                    }
                }
            });
        });
    }

    function createLaserBeam(row, col) {
        // Clean up existing laser elements
        activeLasers.forEach(laser => laser.remove());
        activeLasers = [];
        
        const cellHeight = cells[0].offsetHeight;
        const cellWidth = cells[0].offsetWidth;
        const gap = 8;
        const boardWidth = board.offsetWidth;
        const boardHeight = board.offsetHeight;

        // Create horizontal laser
        const horizontalLaser = document.createElement('div');
        horizontalLaser.classList.add('laser', 'horizontal');
        horizontalLaser.style.top = `${row * (cellHeight + gap) + cellHeight / 2 - 3}px`;
        horizontalLaser.style.width = '0'; // Start with 0 width
        laserContainer.appendChild(horizontalLaser);
        activeLasers.push(horizontalLaser);

        // Create vertical laser
        const verticalLaser = document.createElement('div');
        verticalLaser.classList.add('laser', 'vertical');
        verticalLaser.style.left = `${col * (cellWidth + gap) + cellWidth / 2 - 3}px`;
        verticalLaser.style.height = '0'; // Start with 0 height
        laserContainer.appendChild(verticalLaser);
        activeLasers.push(verticalLaser);

        // Animate with GSAP instead of CSS classes
        gsap.to(horizontalLaser, {
            width: '100%',
            opacity: 1,
            duration: 0.3,
            ease: "power2.out"
        });

        gsap.to(verticalLaser, {
            height: '100%',
            opacity: 1,
            duration: 0.3,
            ease: "power2.out"
        });

        // Fade out after effect is complete
        gsap.to([horizontalLaser, verticalLaser], {
            opacity: 0,
            duration: 0.3,
            delay: 0.7,
            onComplete: () => {
                horizontalLaser.remove();
                verticalLaser.remove();
                activeLasers = [];
            }
        });
    }

    function clearCell(index) {
        const cell = cells[index];
        
        // Animate the clearing effect
        gsap.to(cell.firstChild, {
            scale: 1.2,
            opacity: 0,
            duration: 0.3,
            onComplete: () => {
                // Clear the cell contents and state
                cell.innerHTML = '';
                boardState[index] = null;
                cell.classList.remove('x', 'o');
            }
        });
    }

    function highlightWinningCells(winningIndices) {
        // Create a timeline for coordinated animations
        const tl = gsap.timeline();
        
        // First highlight the winning cells
        winningIndices.forEach(index => {
            const cell = cells[index];
            tl.to(cell, {
                backgroundColor: '#FFF9C4',
                duration: 0.3,
                repeat: 1,
                yoyo: true
            }, "<");
        });
        
        // Then apply the fire effect with staggered timing
        tl.call(() => {
            winningIndices.forEach((index, i) => {
                cells[index].classList.add('winning-cell');
            });
        });
        
        // Add a shake effect to the pieces
        winningIndices.forEach(index => {
            const svg = cells[index].querySelector('svg');
            if (svg) {
                tl.to(svg, {
                    rotation: "random(-5, 5)",
                    duration: 0.1,
                    repeat: 5,
                    yoyo: true,
                    ease: "none",
                    delay: 0.3
                }, "<0.1");
            }
        });
    }

    function handleReset() {
        // Fade out the board
        gsap.to(board, {
            opacity: 0.5,
            duration: 0.3,
            onComplete: () => {
                // Clear the game state
                currentPlayer = 'X';
                boardState = Array(9).fill(null);
                gameActive = true;
                
                // Update status
                statusDisplay.textContent = `Player ${currentPlayer}'s turn`;
                
                // Clear all cells and animations
                cells.forEach(cell => {
                    cell.innerHTML = '';
                    cell.classList.remove('x', 'o', 'winning-cell');
                    cell.style.backgroundColor = '';
                    cell.style.animation = '';
                });
                
                // Clear any active lasers
                activeLasers.forEach(laser => laser.remove());
                activeLasers = [];
                laserContainer.innerHTML = '';
                
                // Fade the board back in
                gsap.to(board, {
                    opacity: 1,
                    duration: 0.3
                });
            }
        });
    }

    // Add event listeners
    cells.forEach(cell => cell.addEventListener('click', handleCellClick));
    resetButton.addEventListener('click', handleReset);

    // Initialize game
    gsap.from(board, {
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: "back.out(1.4)"
    });
    
    gsap.from(resetButton, {
        y: 20,
        opacity: 0,
        duration: 0.5,
        delay: 0.3
    });
    
    statusDisplay.textContent = `Player ${currentPlayer}'s turn`;
}); 