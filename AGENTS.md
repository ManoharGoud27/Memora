# Antigravity Agent Rules

## Code Style
- TypeScript: strict mode, no `any` type
- Python: type hints required, follow PEP 8
- React: functional components with hooks
- Components: max 200 lines, split if larger

## Testing
- Write tests BEFORE implementation (TDD)
- Run tests after every code change
- Backend: pytest with 90% coverage minimum
- Frontend: Vitest + React Testing Library

## File Paths
- ALWAYS use absolute paths in tool calls
- Never write to /tmp, .gemini, or Desktop

## Git
- Commit after each feature completion
- Use conventional commits: feat:, fix:, chore:, etc.

## Priorities
1. Type safety over speed
2. Tests over features
3. User experience over clever code
