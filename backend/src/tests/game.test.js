const createGameManager = require('../gameManager');
// Mock dependencies for testing
const ioMock = { to: () => ({ emit: () => { } }), sockets: { sockets: { get: () => { } } } };
const botFactoryMock = () => ({ decide: () => 0 });
const { createEmptyBoard, checkWin } = createGameManager({ io: ioMock, botFactory: botFactoryMock });

test('vertical four wins', () => {
    const b = createEmptyBoard();
    b[5][0] = 1; b[4][0] = 1; b[3][0] = 1; b[2][0] = 1;
    expect(checkWin(b, 1)).toBe(true);
});

test('horizontal four wins', () => {
    const b = createEmptyBoard();
    b[5][0] = 2; b[5][1] = 2; b[5][2] = 2; b[5][3] = 2;
    expect(checkWin(b, 2)).toBe(true);
});

test('diagonal down-right wins', () => {
    const b = createEmptyBoard();
    b[0][0] = 1;
    b[1][1] = 1;
    b[2][2] = 1;
    b[3][3] = 1;
    expect(checkWin(b, 1)).toBe(true);
});

test('diagonal up-right wins', () => {
    const b = createEmptyBoard();
    b[5][0] = 1;
    b[4][1] = 1;
    b[3][2] = 1;
    b[2][3] = 1;
    expect(checkWin(b, 1)).toBe(true);
});

test('no win', () => {
    const b = createEmptyBoard();
    b[5][0] = 1;
    expect(checkWin(b, 1)).toBe(false);
});
