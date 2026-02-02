# QA Test Plan - Production Launch Readiness

## Test Overview

This document outlines the comprehensive testing plan for Kaiban Markdown extension, focusing on verifying the new PRD/Task creation features and overall production readiness.

## Test Environment

- **IDE**: Cursor (latest version)
- **OS**: macOS / Linux / Windows
- **Node Version**: 18+ (for development)
- **Extension Version**: 0.2.0

## Test Cases

### 1. PRD Creation via Command Palette

**Test ID**: TC-PRD-001  
**Priority**: High  
**Steps**:
1. Open Command Palette (`Cmd+Shift+P`)
2. Run `Kaiban: Create PRD`
3. Enter title: "Test PRD"
4. Enter description: "Test description"
5. Choose "Yes" for AI generation (if provider configured)
6. Verify file created in `.agent/PRDS/`
7. Verify file opens in editor
8. Verify board refreshes automatically

**Expected Results**:
- ✅ File created with slugified name (`test-prd.md` or similar)
- ✅ File contains proper PRD structure
- ✅ If AI used: Content is generated and relevant
- ✅ Board shows new PRD if linked to a task
- ✅ No errors in console

**Status**: ⏳ Pending QA

---

### 2. Task Creation via Command Palette

**Test ID**: TC-TASK-001  
**Priority**: High  
**Steps**:
1. Open Command Palette (`Cmd+Shift+P`)
2. Run `Kaiban: Create Task`
3. Enter title: "Test Task"
4. Enter description: "Test task description"
5. Select type: "Feature"
6. Select priority: "High"
7. Select status: "To Do"
8. Choose "Yes" for AI generation (if provider configured)
9. Verify file created in `.agent/TASKS/`
10. Verify file opens in editor
11. Verify board refreshes and shows new task

**Expected Results**:
- ✅ File created with slugified name (`test-task.md`)
- ✅ File contains all metadata fields
- ✅ Task appears in correct column on board
- ✅ If AI used: Description is comprehensive
- ✅ Board auto-refreshes
- ✅ No errors

**Status**: ⏳ Pending QA

---

### 3. PRD Creation via Cursor Chat

**Test ID**: TC-PRD-002  
**Priority**: High  
**Steps**:
1. Open Cursor chat
2. Type `@kaiban.createPRD`
3. Press Enter
4. Follow prompts as in TC-PRD-001

**Expected Results**:
- ✅ Command recognized in chat
- ✅ Same behavior as Command Palette version
- ✅ All prompts appear correctly

**Status**: ⏳ Pending QA

---

### 4. Task Creation via Cursor Chat

**Test ID**: TC-TASK-002  
**Priority**: High  
**Steps**:
1. Open Cursor chat
2. Type `@kaiban.createTask`
3. Press Enter
4. Follow prompts as in TC-TASK-001

**Expected Results**:
- ✅ Command recognized in chat
- ✅ Same behavior as Command Palette version
- ✅ All prompts appear correctly

**Status**: ⏳ Pending QA

---

### 5. AI Generation (All Providers)

**Test ID**: TC-AI-001  
**Priority**: High  
**Steps**:
For each provider (Cursor, OpenAI, OpenRouter, Replicate):
1. Configure API key for provider
2. Create PRD with AI generation
3. Verify generated content
4. Create Task with AI generation
5. Verify generated description

**Expected Results**:
- ✅ All providers work correctly
- ✅ Generated content is relevant and well-formatted
- ✅ Errors handled gracefully if API fails
- ✅ Template fallback works if AI unavailable

**Status**: ⏳ Pending QA

---

### 6. Template Fallback

**Test ID**: TC-FALLBACK-001  
**Priority**: Medium  
**Steps**:
1. Disable all AI providers (or don't configure any)
2. Create PRD, choose "No" for AI
3. Verify template is created
4. Create Task, choose "No" for AI
5. Verify template is created

**Expected Results**:
- ✅ Templates are well-formatted
- ✅ All required fields present
- ✅ File structure matches expected format

**Status**: ⏳ Pending QA

---

### 7. Edge Cases

**Test ID**: TC-EDGE-001  
**Priority**: Medium  

#### 7.1 Missing Directories
**Steps**:
1. Delete `.agent/PRDS/` directory
2. Create PRD
3. Verify directory is created automatically

#### 7.2 Invalid File Names
**Steps**:
1. Try to create PRD with special characters
2. Verify slugification works
3. Verify file name is valid

#### 7.3 Duplicate File Names
**Steps**:
1. Create PRD with title "Test"
2. Create another PRD with title "Test"
3. Verify second file gets unique name (`test-1.md`)

#### 7.4 No Workspace
**Steps**:
1. Close all folders
2. Try to create PRD
3. Verify appropriate error message

**Expected Results**:
- ✅ All edge cases handled gracefully
- ✅ Clear error messages
- ✅ No crashes or unexpected behavior

**Status**: ⏳ Pending QA

---

### 8. Board Integration

**Test ID**: TC-BOARD-001  
**Priority**: High  
**Steps**:
1. Create PRD
2. Create Task linking to PRD
3. Open board
4. Click on task
5. Verify PRD preview appears
6. Drag task to different column
7. Verify status updates

**Expected Results**:
- ✅ Board shows newly created task
- ✅ PRD preview works correctly
- ✅ Drag-and-drop updates status
- ✅ Board auto-refreshes after file creation

**Status**: ⏳ Pending QA

---

### 9. Error Handling

**Test ID**: TC-ERROR-001  
**Priority**: Medium  
**Steps**:
1. Test with network errors (disable internet, create PRD with AI)
2. Test with invalid API keys
3. Test with malformed task files
4. Test with missing required fields

**Expected Results**:
- ✅ Errors are caught and displayed to user
- ✅ Extension doesn't crash
- ✅ Fallback options work
- ✅ Console shows helpful error messages

**Status**: ⏳ Pending QA

---

### 10. Performance

**Test ID**: TC-PERF-001  
**Priority**: Low  
**Steps**:
1. Create 100+ task files
2. Open board
3. Measure load time
4. Test with large PRD files
5. Test drag-and-drop with many tasks

**Expected Results**:
- ✅ Board loads in < 2 seconds
- ✅ UI remains responsive
- ✅ No memory leaks

**Status**: ⏳ Pending QA

---

## Test Execution Log

### Date: 2025-01-03
**Tester**: _(To be filled)_  
**Environment**: _(To be filled)_

| Test ID | Status | Notes | Time |
|---------|--------|-------|------|
| TC-PRD-001 | ⏳ | | |
| TC-TASK-001 | ⏳ | | |
| TC-PRD-002 | ⏳ | | |
| TC-TASK-002 | ⏳ | | |
| TC-AI-001 | ⏳ | | |
| TC-FALLBACK-001 | ⏳ | | |
| TC-EDGE-001 | ⏳ | | |
| TC-BOARD-001 | ⏳ | | |
| TC-ERROR-001 | ⏳ | | |
| TC-PERF-001 | ⏳ | | |

## Test Results Summary

**Total Tests**: 10  
**Passed**: 0  
**Failed**: 0  
**Pending**: 10  
**Blocked**: 0

## Notes

- All tests should be run in a clean workspace
- Consider automated testing for regression
- Performance tests may need adjustment based on hardware
- Some tests require manual verification of AI-generated content quality

## Sign-off

**QA Lead**: _(To be filled)_  
**Date**: _(To be filled)_  
**Status**: ⏳ Ready for Testing

