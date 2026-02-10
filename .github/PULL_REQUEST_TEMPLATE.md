## Description
Clean up project documentation by removing redundant files, simplifying verbose documentation, and fixing formatting issues in prompt files.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [x] Documentation update
- [ ] Performance improvement
- [x] Code refactoring

## Related Issues
<!-- Link to related issues using #issue_number -->
N/A

## Changes Made
<!-- List the main changes -->
- Removed redundant ISSUE_TEMPLATE.md (proper templates exist in `.github/ISSUE_TEMPLATE/`)
- Fixed markdown formatting in prompt files (removed 4-backtick wrappers from all `.github/prompts/*.md` files)
- Simplified VERSION.md from 402 lines to 160 lines by removing redundancies while maintaining all essential information
- Streamlined PACKAGING.md with cleaner format and better organization
- Updated CONTRIBUTING.md with cleaner structure and fixed broken references to non-existent files
- All changes maintain essential information while improving readability

## Testing
<!-- Describe the tests you ran to verify your changes -->
- [x] All existing tests pass
- [ ] Added new tests for new functionality
- [ ] Manually tested changes in VS Code
- [ ] Tested with example assembly programs

## Checklist
- [x] My code follows the project's code style
- [x] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [x] I have updated the documentation (README.md, ISA.md, prompts)
- [x] My changes generate no new warnings or errors
- [ ] I have added tests that prove my fix is effective or that my feature works
- [x] New and existing unit tests pass locally with my changes
- [ ] I have built the extension and tested it in VS Code

## Screenshots (if applicable)
N/A - Documentation-only changes

## Additional Notes
This is a documentation and cleanup refactor with no functional changes to the codebase. All essential information has been preserved while improving readability and removing:
- 1 redundant file (ISSUE_TEMPLATE.md)
- 316 net lines of redundant/verbose documentation
- Broken references to non-existent documentation files
- Markdown formatting issues in prompt files
