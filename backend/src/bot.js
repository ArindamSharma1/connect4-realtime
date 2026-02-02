module.exports = function createBot({ name = 'BOT', delay = 300 } = {}) {
    function decide(board, botValue) {
        const opponent = botValue === 1 ? 2 : 1;
        const C = 7;

        function simulateDrop(b, col, player) {
            const nb = b.map(r => r.slice());
            for (let r = 5; r >= 0; r--) {
                if (nb[r][col] === 0) { nb[r][col] = player; return nb; }
            }
            return null;
        }

        function checkWinSim(b, player) {
            const R = 6, C = 7, needed = 4;
            for (let r = 0; r < R; r++) {
                for (let c = 0; c <= C - needed; c++) {
                    let ok = true;
                    for (let k = 0; k < needed; k++) if (b[r][c + k] !== player) { ok = false; break; }
                    if (ok) return true;
                }
            }
            for (let c = 0; c < C; c++) {
                for (let r = 0; r <= R - needed; r++) {
                    let ok = true;
                    for (let k = 0; k < needed; k++) if (b[r + k][c] !== player) { ok = false; break; }
                    if (ok) return true;
                }
            }
            for (let r = 0; r <= R - needed; r++) {
                for (let c = 0; c <= C - needed; c++) {
                    let ok = true;
                    for (let k = 0; k < needed; k++) if (b[r + k][c + k] !== player) { ok = false; break; }
                    if (ok) return true;
                }
            }
            for (let r = needed - 1; r < R; r++) {
                for (let c = 0; c <= C - needed; c++) {
                    let ok = true;
                    for (let k = 0; k < needed; k++) if (b[r - k][c + k] !== player) { ok = false; break; }
                    if (ok) return true;
                }
            }
            return false;
        }

        const validCols = [];
        for (let c = 0; c < C; c++) {
            if (board[0][c] === 0) validCols.push(c);
        }

        for (let c of validCols) {
            const nb = simulateDrop(board, c, botValue);
            if (nb && checkWinSim(nb, botValue)) return c;
        }
        for (let c of validCols) {
            const nb = simulateDrop(board, c, opponent);
            if (nb && checkWinSim(nb, opponent)) return c;
        }
        const centerPref = [3, 2, 4, 1, 5, 0, 6];
        function scoreColumn(col) {
            const nb = simulateDrop(board, col, botValue);
            if (!nb) return -Infinity;
            let score = 0;
            for (let r = 0; r < 6; r++) {
                for (let c = 0; c < 7; c++) {
                    if (nb[r][c] !== botValue) continue;
                    let cnt = 0, empties = 0;
                    for (let k = 0; k < 4; k++) {
                        const cc = c + k;
                        if (cc >= 7) break;
                        if (nb[r][cc] === botValue) cnt++; else if (nb[r][cc] === 0) empties++;
                    }
                    if (cnt === 3 && empties >= 1) score += 50;
                    if (cnt === 2 && empties >= 2) score += 10;

                    cnt = 0; empties = 0;
                    for (let k = 0; k < 4; k++) {
                        const rr = r + k;
                        if (rr >= 6) break;
                        if (nb[rr][c] === botValue) cnt++; else if (nb[rr][c] === 0) empties++;
                    }
                    if (cnt === 3 && empties >= 1) score += 40;
                    if (cnt === 2 && empties >= 2) score += 8;
                }
            }
            score -= Math.abs(3 - col);
            return score;
        }

        let bestCol = centerPref.find(c => validCols.includes(c));
        let bestScore = -Infinity;
        for (let c of validCols) {
            const s = scoreColumn(c);
            if (s > bestScore) { bestScore = s; bestCol = c; }
        }
        return bestCol === undefined ? validCols[0] : bestCol;
    }

    return { name, decide };
};
