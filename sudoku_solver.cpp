// Sudoku solver: backtracking with bitmask constraints and the
// "most constrained cell first" heuristic.
//
// Input (stdin): 9 lines of 9 characters, digits 1-9 for givens and
// 0 (or '.') for empty cells.
// Output (stdout): the solved grid in the same format.

#include <iostream>
#include <string>

class Sudoku {
public:
    // Loads the puzzle. Returns false if the input is malformed or the
    // givens already contradict each other.
    bool read(std::istream& in) {
        for (int r = 0; r < 9; ++r) {
            std::string line;
            if (!(in >> line) || line.size() != 9) return false;
            for (int c = 0; c < 9; ++c) {
                char ch = line[c];
                if (ch == '.') ch = '0';
                if (ch < '0' || ch > '9') return false;
                int d = ch - '0';
                if (d != 0 && !place(r, c, d)) return false;
            }
        }
        return true;
    }

    bool solve() {
        // Pick the empty cell with the fewest candidates.
        int bestR = -1, bestC = -1, bestCount = 10;
        unsigned bestMask = 0;
        for (int r = 0; r < 9; ++r) {
            for (int c = 0; c < 9; ++c) {
                if (grid[r][c] != 0) continue;
                unsigned mask = candidates(r, c);
                int count = popcount(mask);
                if (count == 0) return false;  // dead end
                if (count < bestCount) {
                    bestCount = count;
                    bestR = r;
                    bestC = c;
                    bestMask = mask;
                    if (count == 1) goto chosen;
                }
            }
        }
        if (bestR == -1) return true;  // no empty cells left: solved

    chosen:
        for (int d = 1; d <= 9; ++d) {
            if (!(bestMask & (1u << d))) continue;
            place(bestR, bestC, d);
            if (solve()) return true;
            remove(bestR, bestC);
        }
        return false;
    }

    void print(std::ostream& out) const {
        for (int r = 0; r < 9; ++r) {
            for (int c = 0; c < 9; ++c) out << grid[r][c];
            out << '\n';
        }
    }

private:
    int grid[9][9] = {};
    // Bit d (1-9) is set when digit d is already used in that unit.
    unsigned rowUsed[9] = {}, colUsed[9] = {}, boxUsed[9] = {};

    static int boxOf(int r, int c) { return (r / 3) * 3 + c / 3; }

    static int popcount(unsigned x) {
        int n = 0;
        for (; x; x &= x - 1) ++n;
        return n;
    }

    unsigned candidates(int r, int c) const {
        return ~(rowUsed[r] | colUsed[c] | boxUsed[boxOf(r, c)]) & 0x3FEu;
    }

    bool place(int r, int c, int d) {
        unsigned bit = 1u << d;
        int b = boxOf(r, c);
        if ((rowUsed[r] | colUsed[c] | boxUsed[b]) & bit) return false;
        grid[r][c] = d;
        rowUsed[r] |= bit;
        colUsed[c] |= bit;
        boxUsed[b] |= bit;
        return true;
    }

    void remove(int r, int c) {
        unsigned bit = 1u << grid[r][c];
        rowUsed[r] &= ~bit;
        colUsed[c] &= ~bit;
        boxUsed[boxOf(r, c)] &= ~bit;
        grid[r][c] = 0;
    }
};

int main() {
    Sudoku puzzle;
    if (!puzzle.read(std::cin)) {
        std::cerr << "Invalid puzzle: expected 9 lines of 9 digits with no "
                     "repeated digit in any row, column or box.\n";
        return 1;
    }
    if (!puzzle.solve()) {
        std::cerr << "No solution exists.\n";
        return 1;
    }
    puzzle.print(std::cout);
    return 0;
}
