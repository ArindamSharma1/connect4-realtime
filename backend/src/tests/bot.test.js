const createBot = require('../bot');
const createGameManager = require('../gameManager');

const { createEmptyBoard } = createGameManager({ io: {}, botFactory: {} });
const bot = createBot({ name: 'BOT' });

test('bot blocks immediate win', () => {
    const board = createEmptyBoard();
    // set up board where opponent (player 2) has immediate win in column 2
    // We are player 1 (bot), opponent is player 2.
    board[5][2] = 2;
    board[4][2] = 2;
    board[3][2] = 2;
    // Bot (1) should see threat at board[2][2] and block it.

    const move = bot.decide(board, 1);
    expect(move).toBe(2);
});

test('bot takes immediate win', () => {
    const board = createEmptyBoard();
    // Bot (1) has 3 in a row at col 0
    board[5][0] = 1;
    board[4][0] = 1;
    board[3][0] = 1;

    const move = bot.decide(board, 1);
    expect(move).toBe(0);
});
