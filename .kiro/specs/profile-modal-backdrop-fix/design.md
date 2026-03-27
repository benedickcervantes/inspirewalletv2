# Profile Modal Backdrop Fix Design

## Overview

This bugfix addresses a visual defect where the Edit Name and Edit Contact Number modals fail to properly obscure the underlying profile page content. The modals use a bottom-sheet style presentation with `justifyContent: "flex-end"` in the overlay, which causes the backdrop to not fully cover the screen when modal content is shorter than the viewport. The fix will ensure the backdrop extends to cover the entire screen while maintaining the bottom-sheet positioning of the modal content itself.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when Edit Name or Edit Contact Number modals are displayed with content shorter than screen height
- **Property (P)**: The desired behavior - backdrop should completely cover and hide all profile page content behind the modal
- **Preservation**: Existing modal functionality (input handling, save actions, close behavior) and other modals (Contact Links, Language, Success, Company KYC Rejected) that must remain unchanged
- **ActivityModal**: The modal wrapper component from `app/components/ActivityModal.tsx` used to display modals
- **modalOverlay**: The style applied to the KeyboardAvoidingView that serves as the modal backdrop with `justifyContent: "flex-end"`
- **modalContent**: The style applied to the white modal card that contains the form content

## Bug Details

### Bug Condition

The bug manifests when the Edit Name or Edit Contact Number modals are opened. The `modalOverlay` style uses `justifyContent: "flex-end"` to position the modal content at the bottom of the screen (bottom-sheet style), but this causes the backdrop to not fully cover the screen when the modal content is shorter than the viewport height, leaving profile page content visible above or around the modal.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { modalType: string, modalVisible: boolean }
  OUTPUT: boolean
  
  RETURN input.modalVisible === true
         AND input.modalType IN ['editName', 'editPhone']
         AND modalContentHeight < screenHeight
         AND profileContentVisibleBehindModal === true
END FUNCTION
```

### Examples

- **Edit Name Modal**: User opens Edit Name modal → modal appears at bottom with white content card → profile dashboard content is visible above the modal backdrop
- **Edit Contact Number Modal**: User opens Edit Contact Number modal → modal appears at bottom → profile page content shows through the top portion of the screen
- **Short Modal Content**: Modal with minimal fields (name, phone) is shorter than screen → large gap at top shows profile content
- **Expected Behavior**: Modal backdrop should extend full screen height with semi-transparent overlay, modal content positioned at bottom

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Modal content (input fields, save button, close button) must continue to display in the same bottom-sheet position and layout
- User input handling and validation must continue to work exactly as before
- Save button functionality must continue to update profile data as before
- Close button and dismiss gestures must continue to work as before
- Contact Links modal must continue to function with its existing backdrop behavior (no changes)
- Language modal must continue to function with its existing backdrop behavior (no changes)
- Success modal must continue to function with its existing backdrop behavior (no changes)
- Company KYC Rejected modal must continue to function with its existing backdrop behavior (no changes)

**Scope:**
All inputs and interactions that do NOT involve the Edit Name or Edit Contact Number modal backdrops should be completely unaffected by this fix. This includes:
- All modal content interactions (typing, button presses)
- Other modal types (Contact Links, Language, Success, Company KYC Rejected)
- Profile page scrolling and interactions when modals are closed
- Keyboard behavior and KeyboardAvoidingView functionality

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is:

1. **Flex Layout Issue**: The `modalOverlay` style uses `justifyContent: "flex-end"` which positions children at the bottom, but when combined with `flex: 1`, it doesn't force the backdrop to fill the entire screen if the content doesn't require it.

2. **KeyboardAvoidingView Behavior**: The KeyboardAvoidingView with `justifyContent: "flex-end"` is designed to push content to the bottom, but the semi-transparent backdrop effect requires the container to fill the entire screen while only the content card is positioned at the bottom.

3. **Missing Backdrop Layer**: The current implementation combines the backdrop overlay and content positioning in a single container. A proper bottom-sheet modal needs a full-screen backdrop layer with a separate content container positioned at the bottom.

4. **Style Specificity**: The `modalOverlay` style applies `backgroundColor: "rgba(0,0,0,0.5)"` but with `justifyContent: "flex-end"`, the colored area only extends as far as needed to contain the modal content, not the full screen.

## Correctness Properties

Property 1: Bug Condition - Full Screen Backdrop Coverage

_For any_ modal display where the Edit Name or Edit Contact Number modal is opened (showNameModal or showPhoneModal is true), the fixed modal implementation SHALL render a backdrop that completely covers the entire screen from top to bottom, hiding all profile page content behind a semi-transparent overlay.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Modal Content and Functionality

_For any_ modal interaction that is NOT related to the backdrop visual coverage (input field interactions, save button presses, close actions, keyboard behavior), the fixed modal implementation SHALL produce exactly the same behavior as the original implementation, preserving all existing functionality for modal content, form submission, validation, and dismissal.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

Property 3: Preservation - Other Modal Types

_For any_ modal display where the modal type is NOT Edit Name or Edit Contact Number (Contact Links, Language, Success, Company KYC Rejected modals), the fixed code SHALL produce exactly the same visual and functional behavior as the original code, preserving all existing modal implementations.

**Validates: Requirements 3.6, 3.7, 3.8, 3.9**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `app/Placeholder/index.tsx`

**Component**: Edit Name Modal and Edit Contact Number Modal

**Specific Changes**:

1. **Restructure Modal Layout**: Modify the modal overlay structure to separate the full-screen backdrop from the bottom-positioned content
   - Wrap the KeyboardAvoidingView in a full-screen backdrop container
   - Ensure the backdrop container has `flex: 1` and fills the entire screen
   - Keep the modal content card positioned at the bottom using `justifyContent: "flex-end"`

2. **Update modalOverlay Style**: Ensure the backdrop extends to full screen height
   - Verify `flex: 1` is applied to the backdrop container
   - Ensure `backgroundColor: "rgba(0,0,0,0.5)"` covers the entire screen
   - Maintain `justifyContent: "flex-end"` for bottom-sheet positioning

3. **Verify KeyboardAvoidingView**: Ensure keyboard behavior is preserved
   - Keep `behavior={Platform.OS === "ios" ? "padding" : "height"}` for Edit Name modal
   - Keep `behavior={Platform.OS === "ios" ? "padding" : "height"}` for Edit Contact Number modal
   - Ensure keyboard doesn't break the full-screen backdrop

4. **Test Modal Content Positioning**: Verify modal content remains at bottom
   - Confirm white modal card (`modalContent`) stays at bottom of screen
   - Verify rounded top corners and padding are preserved
   - Ensure `maxHeight: "80%"` constraint is respected

5. **Preserve Other Modals**: Ensure no changes affect other modal types
   - Contact Links modal uses `animationType="fade"` and different structure - no changes
   - Language modal uses custom `languageModalOverlay` style - no changes
   - Success modal uses `successOverlay` style - no changes
   - Company KYC Rejected modal uses `successOverlay` style - no changes

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write visual regression tests or manual test cases that open the Edit Name and Edit Contact Number modals and verify that profile content is visible behind/above the modal. Run these tests on the UNFIXED code to observe the visual defect and confirm the root cause.

**Test Cases**:
1. **Edit Name Modal Visual Test**: Open Edit Name modal → verify profile content is visible above modal (will fail on unfixed code - profile content should be hidden)
2. **Edit Contact Number Modal Visual Test**: Open Edit Contact Number modal → verify profile content is visible above modal (will fail on unfixed code - profile content should be hidden)
3. **Short Content Test**: Open modal with minimal fields → verify large gap at top shows profile content (will fail on unfixed code - backdrop should cover full screen)
4. **Keyboard Interaction Test**: Open modal and focus input field → verify keyboard doesn't break backdrop coverage (may fail on unfixed code)

**Expected Counterexamples**:
- Profile dashboard content (header, badges, sections) is visible above the modal backdrop
- Possible causes: `justifyContent: "flex-end"` not filling screen, missing full-screen backdrop layer, flex layout issue

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := renderModal_fixed(input)
  ASSERT backdropCoversFullScreen(result)
  ASSERT profileContentNotVisible(result)
  ASSERT modalContentAtBottom(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT renderModal_original(input) = renderModal_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for modal content interactions and other modal types, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Modal Content Preservation**: Verify input fields, save button, close button continue to work exactly as before
2. **Form Submission Preservation**: Verify save actions update profile data correctly after fix
3. **Keyboard Behavior Preservation**: Verify KeyboardAvoidingView continues to work correctly
4. **Other Modals Preservation**: Verify Contact Links, Language, Success, and Company KYC Rejected modals are completely unaffected

### Unit Tests

- Test Edit Name modal renders with full-screen backdrop
- Test Edit Contact Number modal renders with full-screen backdrop
- Test modal content remains positioned at bottom after fix
- Test keyboard interaction doesn't break backdrop coverage
- Test modal dismiss actions continue to work

### Property-Based Tests

- Generate random modal states (open/closed, with/without keyboard) and verify backdrop always covers full screen when modal is open
- Generate random input values and verify form submission behavior is unchanged
- Test that all modal interactions produce the same results as before across many scenarios

### Integration Tests

- Test full user flow: open Edit Name modal → verify backdrop covers screen → enter name → save → verify modal closes
- Test full user flow: open Edit Contact Number modal → verify backdrop covers screen → enter phone → save → verify modal closes
- Test keyboard flow: open modal → focus input → verify backdrop stays full screen → type → verify keyboard behavior unchanged
- Test other modals: open Contact Links, Language, Success modals → verify they are completely unaffected by the fix
