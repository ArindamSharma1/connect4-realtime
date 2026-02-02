const createBot = require('../bot');
const createGameManager = require('../gameManager');

const { createEmptyBoard } = createGameManager({ io: {}, botFactory: {} });
const bot = createBot({ name: 'BOT' });

test('bot blocks immediate win', () => {
    const board = createEmptyBoard();
    board[5][2] = 2;
    board[4][2] = 2;
    board[3][2] = 2;

    const move = bot.decide(board, 1);
    expect(move).toBe(2);
});

test('bot takes immediate win', () => {
    const board = createEmptyBoard();
    board[5][0] = 1;
    board[4][0] = 1;
    board[3][0] = 1;

    const move = bot.decide(board, 1);
    expect(move).toBe(0);
});
