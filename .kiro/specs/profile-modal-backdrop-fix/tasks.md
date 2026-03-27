# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Full Screen Backdrop Coverage
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases - Edit Name modal and Edit Contact Number modal with content shorter than screen height
  - Test that when showNameModal or showPhoneModal is true, the backdrop completely covers the entire screen from top to bottom, hiding all profile page content behind a semi-transparent overlay
  - Test implementation details from Bug Condition in design: modalVisible === true AND modalType IN ['editName', 'editPhone'] AND modalContentHeight < screenHeight
  - The test assertions should verify: backdropCoversFullScreen(result) AND profileContentNotVisible(result) AND modalContentAtBottom(result)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: profile dashboard content (header, badges, sections) visible above modal backdrop, gap at top of screen showing profile content
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Modal Content and Functionality
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs: modal content interactions (input fields, save button, close button), form submission, keyboard behavior, other modal types (Contact Links, Language, Success, Company KYC Rejected)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Test that for any modal interaction NOT related to backdrop visual coverage, the behavior is unchanged: input field interactions work, save button updates profile data, close actions dismiss modal, keyboard behavior preserved
  - Test that for any modal type NOT Edit Name or Edit Contact Number, the visual and functional behavior is unchanged
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [x] 3. Fix for profile modal backdrop issue

  - [x] 3.1 Implement the fix in app/Placeholder/index.tsx
    - Restructure Edit Name modal layout to separate full-screen backdrop from bottom-positioned content
    - Restructure Edit Contact Number modal layout to separate full-screen backdrop from bottom-positioned content
    - Wrap KeyboardAvoidingView in a full-screen backdrop container with flex: 1
    - Ensure backdrop container fills entire screen with backgroundColor: "rgba(0,0,0,0.5)"
    - Keep modal content card positioned at bottom using justifyContent: "flex-end"
    - Verify KeyboardAvoidingView behavior is preserved for both modals
    - Ensure modal content (white card with rounded corners) remains at bottom with maxHeight: "80%"
    - Verify no changes affect other modal types (Contact Links, Language, Success, Company KYC Rejected)
    - _Bug_Condition: isBugCondition(input) where input.modalVisible === true AND input.modalType IN ['editName', 'editPhone'] AND modalContentHeight < screenHeight AND profileContentVisibleBehindModal === true_
    - _Expected_Behavior: Backdrop completely covers entire screen from top to bottom, hiding all profile page content behind semi-transparent overlay, while modal content remains positioned at bottom_
    - _Preservation: Modal content interactions, form submission, keyboard behavior, and other modal types must remain unchanged_
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Full Screen Backdrop Coverage
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Modal Content and Functionality
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
